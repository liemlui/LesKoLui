import Skeleton from "../components/Skeleton";
import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  listStudents, getStudent,
  listSessionsByStudentRange, listBillableSessionsByStudentRange,
  getReportById, findReportByPeriod, listReportsByStudent, listConfirmedReportsByStudent,
  listAllReports,
  upsertReport, createReportForPeriod, discardReport, updateSession, saveSettings,
  getPaymentByReport, syncReportPayment, listPaymentsByStudent,
  reportTotalsDrifted, frozenReportTotals, unlockReport,
} from "../db/repos";
import { billingPolicyOf, reportStatus, reportDisplayStatus, type ReportStatus } from "../db/types";
import {
  monthRange,
  packageCoveredSessionIds,
  protectedInvoiceReportIds,
  reportBlocksSiblingScope,
  reportIdsWithInvoice,
} from "../db/repos/helpers";
import { pickTemplate } from "../lib/rotation";
import { estimateReportSummaryCost, estimateNarrativesCost } from "../lib/aiClient";
import {
  resolveReportMutationTarget,
  selectCountReportSessions,
  selectPeriodReportSessions,
  shouldUseStoredReportSnapshot,
  currentPackageSessionRange,
} from "../lib/reportSessionScope";
import { useAiAction } from "../lib/useAiAction";
import Modal from "../components/Modal";
import ConfirmSheet from "../components/ConfirmSheet";
import PinConfirmModal from "../components/PinConfirmModal";
import { getTheme, THEMES } from "../template/themes";
import { monthLabel, todayWIB, monthOf, periodLabel } from "../lib/format";
import { formatRupiahDisplay } from "../lib/moneyDisplay";
import SettingsLoadError from "../components/SettingsLoadError";
import { useMoneyVisible } from "../hooks/useMoneyVisible";
import { TrashIcon } from "../components/icons";
import { useSettingsQuery } from "../hooks/useSettingsQuery";
import { useReportExport } from "./monthlyReport/useReportExport";
import { useReportGeneration } from "./monthlyReport/useReportGeneration";
import { useNarrativeAutosave, narrativeSavedLabel } from "./monthlyReport/useNarrativeAutosave";
import { useReportData } from "./monthlyReport/useReportData";
import Breadcrumb from "../components/Breadcrumb";
import { clampPage, paginateItems } from "../lib/pagination";
import { sessionEngagementScore, engagementAverage } from "../lib/engagement";
import { pickDirtyNarrativeSessions } from "../lib/aiIncremental";
import type {
  ReportOptions, CustomTheme, Theme,
} from "../template/types";
import type { MonthlyReport, NextMonthPlan, Session } from "../db/types";
import { db } from "../db/db";
import {
  type RecapMode,
  reportStepIndex, buildReportReadiness, scopeChipLabel,
} from "./monthlyReport/helpers";
import ReportActionBar from "./monthlyReport/ReportActionBar";
import ReportMessageBanner from "./monthlyReport/ReportMessageBanner";
import ReportAiResultPanel from "./monthlyReport/ReportAiResultPanel";
import ReportHistoryPanel from "./monthlyReport/ReportHistoryPanel";
import ReportScopeControls from "./monthlyReport/ReportScopeControls";
import ReportStatusPanel from "./monthlyReport/ReportStatusPanel";
import ReportPreviewPanel from "./monthlyReport/ReportPreviewPanel";
import DesignToolbar from "./monthlyReport/DesignToolbar";
import ReportNarrativePanel from "./monthlyReport/ReportNarrativePanel";
import ReportTextsPanel from "./monthlyReport/ReportTextsPanel";
import ReportPlanPanel from "./monthlyReport/ReportPlanPanel";
import { reportAvailabilityOf, type ReportAvailability } from "./monthlyReport/reportAvailability";
import { EXPORT_STAGE_LABEL } from "./monthlyReport/useReportExport";

/** Jumlah sesi per halaman bawaan — nilai ini ikut tersimpan ke laporan (butir 10). */
const DEFAULT_ENTRIES_PER_PAGE = 3;

/**
 * MonthlyReportPage — halaman pembuatan laporan perkembangan per periode.
 * 26 layout × 34 tema, AI narrative generation, export ke JPG/PNG/PDF,
 * pagination, dan template rotation logic.
 *
 * Sejak G3-05 halaman ini disusun dari blok-blok di `src/screens/monthlyReport/`:
 * bilah aksi tetap + penunjuk langkah, panel hasil AI, panel cakupan, panel status,
 * pratinjau, bilah desain, panel narasi, panel teks, dan panel rencana.
 *
 * @component
 * @route /report/:studentId/:month
 */
export default function MonthlyReportPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const students = useLiveQuery(() => listStudents(true), []);
  const settingsQuery = useSettingsQuery();
  const settings = settingsQuery.settings;
  // G2-04 (K3.3/K3.6): laporan bulanan kini ikut gerbang uang yang sama.
  const money = useMoneyVisible();

  // ── Mode rekap: bulan kalender / paket N pertemuan tertua / rentang tanggal ──
  const [mode, setMode] = useState<RecapMode>("bulan");
  const [studentId, setStudentId] = useState(searchParams.get("studentId") ?? "");
  const [month, setMonth] = useState(() => monthOf(todayWIB()));
  const [count, setCount] = useState(4);
  const [rangeStart, setRangeStart] = useState(() => todayWIB());
  const [rangeEnd, setRangeEnd] = useState(() => todayWIB());
  const reportIdParam = searchParams.get("reportId") ?? "";
  const [editingReportId, setEditingReportId] = useState(reportIdParam);
  const [snapshotLocked, setSnapshotLocked] = useState(Boolean(reportIdParam));
  const appliedReportIdRef = useRef("");
  const dismissedReportIdRef = useRef("");
  const appliedStudentBillingRef = useRef("");

  // Narasi yang sedang disunting + penyimpanan otomatisnya (G3-05 butir 9).
  // Draf ringkasan/catatan guru/kutipan hidup di dalam ReportTextsPanel.
  const [narrativeEdit, setNarrativeEdit] = useState<{ id: string; text: string } | null>(null);
  const [forceNarratives, setForceNarratives] = useState(false);
  // G3-04: satu jalur panggilan AI berbiaya. Modal biayanya datang dari hook ini.
  const ai = useAiAction();
  // Buka kunci laporan final → draft (konfirmasi → PIN → aksi).
  const [unlockConfirmOpen, setUnlockConfirmOpen] = useState(false);
  const [unlockPinOpen, setUnlockPinOpen] = useState(false);
  const [unlockBusy, setUnlockBusy] = useState(false);
  const [showBillingHelp,   setShowBillingHelp]   = useState(false);
  const [reportMutationBusy, setReportMutationBusy] = useState(false);
  const reportMutationBusyRef = useRef(false);
  const [invoiceBusy, setInvoiceBusy] = useState(false);
  const [message,          setMessage]          = useState("");
  const [openNarasi,       setOpenNarasi]       = useState(false);
  const [openTeks,         setOpenTeks]         = useState(false);
  const [openPlan,         setOpenPlan]         = useState(false);
  const [narrativePage,    setNarrativePage]    = useState(1);
  const [subjectFilter,    setSubjectFilter]    = useState<string>("");
  // Perpindahan cakupan yang tertunda karena ada narasi belum tersimpan.
  const pendingScopeChangeRef = useRef<(() => void) | null>(null);
  const [unsavedConfirmOpen, setUnsavedConfirmOpen] = useState(false);

  const student  = useLiveQuery(() => (studentId ? getStudent(studentId) : undefined), [studentId]);

  // Opening a student starts in the billing scope configured on their profile.
  // Keep manual choices intact, but reapply a package quota when it changes:
  // the package count input itself is deliberately read-only.
  useEffect(() => {
    if (!student || student.id !== studentId || editingReportId) return;
    const billingScopeKey = `${student.id}|${billingPolicyOf(student)}|${student.billingSessionCount ?? ""}`;
    if (appliedStudentBillingRef.current === billingScopeKey) return;
    appliedStudentBillingRef.current = billingScopeKey;
    if (billingPolicyOf(student) === "session_count") {
      setMode("jumlah");
      setCount(Math.max(1, Math.min(20, student.billingSessionCount ?? 8)));
    } else {
      setMode("bulan");
    }
  }, [student, studentId, editingReportId]);
  const editingReportQuery = useLiveQuery(
    async () => ({
      reportId: editingReportId,
      report: editingReportId ? await getReportById(editingReportId) : undefined,
    }),
    [editingReportId],
  );
  const editingReportLookupReady = editingReportQuery?.reportId === editingReportId;
  const editingReport = editingReportLookupReady ? editingReportQuery.report : undefined;
  const editingReportSessionKey = editingReport?.sessionIds.join("|") ?? "";
  const editingReportSessionsQuery = useLiveQuery(async () => {
    const reportId = editingReport?.id ?? "";
    if (!editingReport) return { reportId, sessions: [] as Session[] };
    const rows = await db.sessions.bulkGet(editingReport.sessionIds);
    return {
      reportId,
      sessions: rows.filter((session): session is Session => session !== undefined),
    };
  }, [editingReport?.id, editingReportSessionKey]);
  const editingReportSessionsReady = editingReportSessionsQuery?.reportId === (editingReport?.id ?? "");
  const editingReportSessions = editingReportSessionsReady
    ? editingReportSessionsQuery?.sessions
    : undefined;

  // A reportId deep-link initializes its controls once. Paid/manual reports
  // use their stored session snapshot; drafts and unpaid automatic invoices
  // continue to follow live sessions.
  useEffect(() => {
    if (!editingReport || appliedReportIdRef.current === editingReport.id) return;
    appliedReportIdRef.current = editingReport.id;
    setStudentId(editingReport.studentId);
    setMonth(editingReport.month);
    setCount(Math.max(1, Math.min(20, editingReport.sessionIds.length || 1)));
    setRangeStart(editingReport.periodStart);
    setRangeEnd(editingReport.periodEnd);
    const fullMonth = editingReport.periodStart === `${editingReport.month}-01`
      && editingReport.periodEnd === monthRange(editingReport.month).end;
    setMode(editingReport.billingMode === "session_count"
      ? "jumlah"
      : editingReport.billingMode === "range"
        ? "range"
        : fullMonth ? "bulan" : "range");
    if (editingReport.billingMode === "session_count") {
      setCount(Math.max(1, Math.min(20, editingReport.billingSessionCount ?? (editingReport.sessionIds.length || 1))));
    }
    setSnapshotLocked(true);
  }, [editingReport]);

  // A draft opened from an old version can be confirmed later by the billing
  // queue. Once that happens, show the confirmed invoice quota immediately.
  useEffect(() => {
    if (
      !editingReport
      || editingReport.billingMode !== "session_count"
      || reportStatus(editingReport) !== "confirmed"
    ) return;
    setCount(Math.max(1, Math.min(20, editingReport.billingSessionCount ?? (editingReport.sessionIds.length || 1))));
  }, [editingReport]);

  useEffect(() => {
    if (!reportIdParam) {
      dismissedReportIdRef.current = "";
      return;
    }
    if (reportIdParam === dismissedReportIdRef.current || reportIdParam === editingReportId) return;
    appliedReportIdRef.current = "";
    setEditingReportId(reportIdParam);
    setSnapshotLocked(true);
  }, [reportIdParam, editingReportId]);

  // Daftar laporan tersimpan: dibuka → memuat SEMUA laporan (semua murid) dan
  // mengurutkan yang terbaru. Tanpa ini menu Laporan tidak bisa dipakai untuk
  // membuka laporan yang sudah pernah dibuat (keputusan pemilik 2026-10-01).
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [historyStudentId, setHistoryStudentId] = useState("");

  // Semua laporan murid — untuk daftar draft yang belum disahkan.
  const allReports = useLiveQuery(() => (studentId ? listReportsByStudent(studentId) : []), [studentId]);
  const drafts = useMemo(() => (allReports ?? []).filter((r) => reportStatus(r) === "draft"), [allReports]);
  // Riwayat laporan lintas murid — hanya dimuat saat panel riwayat dibuka.
  const everyReport = useLiveQuery(
    () => (historyOpen ? listAllReports() : []),
    [historyOpen],
  );
  const reportHistory = useMemo(() => {
    const rows = [...(everyReport ?? [])];
    rows.sort((a, b) => (b.periodStart ?? "").localeCompare(a.periodStart ?? "")
      || (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    return rows;
  }, [everyReport]);
  const reportHistoryFiltered = useMemo(
    () => reportHistory.filter((r) => !historyStudentId || r.studentId === historyStudentId),
    [reportHistory, historyStudentId],
  );
  const historyVisible = historyExpanded ? reportHistoryFiltered : reportHistoryFiltered.slice(0, 6);
  // Hanya laporan yang sudah SAH yang mengunci tanggal (overlap guard).
  const confirmedReports = useLiveQuery(() => (studentId ? listConfirmedReportsByStudent(studentId) : []), [studentId]);
  const studentPayments = useLiveQuery(
    () => (studentId ? listPaymentsByStudent(studentId) : []),
    [studentId],
  );
  const invoiceReportIds = useMemo(
    () => reportIdsWithInvoice(studentPayments ?? []),
    [studentPayments],
  );
  const protectedReportIds = useMemo(
    () => protectedInvoiceReportIds(confirmedReports ?? [], studentPayments ?? []),
    [confirmedReports, studentPayments],
  );

  // Batas periode per mode
  const monthStart = useMemo(() => (month ? `${month}-01` : ""), [month]);
  const monthEnd = useMemo(() => (month ? monthRange(month).end : ""), [month]);

  // Mode jumlah is a billing scope, so explicitly billable no-shows count too.
  // Academic month/range reports continue to use completed lessons only.
  const sessions = useLiveQuery(() => {
    if (!studentId) return [];
    if (mode === "bulan") return listSessionsByStudentRange(studentId, monthStart, monthEnd);
    if (mode === "range") return listSessionsByStudentRange(studentId, rangeStart, rangeEnd);
    const { start, end } = currentPackageSessionRange();
    return listBillableSessionsByStudentRange(studentId, start, end);
  }, [studentId, mode, monthStart, monthEnd, rangeStart, rangeEnd]);

  // Month/range modes know their identity before loading session rows. Resolve
  // that report early so its own confirmed sessions are not mistaken for a
  // sibling's covered sessions after confirmation.
  const fixedPeriodStart = mode === "bulan" ? monthStart : mode === "range" ? rangeStart : "";
  const fixedPeriodEnd = mode === "bulan" ? monthEnd : mode === "range" ? rangeEnd : "";
  const fixedPeriodKey = `${studentId}|${fixedPeriodStart}|${fixedPeriodEnd}`;
  const fixedPeriodReportQuery = useLiveQuery(
    async () => ({
      key: fixedPeriodKey,
      report: studentId && fixedPeriodStart && fixedPeriodEnd
        ? await findReportByPeriod(studentId, fixedPeriodStart, fixedPeriodEnd)
        : undefined,
    }),
    [studentId, fixedPeriodStart, fixedPeriodEnd],
  );
  const fixedPeriodLookupReady = fixedPeriodReportQuery?.key === fixedPeriodKey;
  const fixedPeriodReport = fixedPeriodLookupReady ? fixedPeriodReportQuery.report : undefined;
  const scopeReport = editingReport ?? fixedPeriodReport;
  const scopeHasProtectedInvoice = Boolean(
    scopeReport
    && protectedReportIds.has(scopeReport.id)
  );
  const useStoredEditingSnapshot = shouldUseStoredReportSnapshot(
    editingReport,
    snapshotLocked,
    scopeHasProtectedInvoice,
  );
  const configuredPackageCount = student && billingPolicyOf(student) === "session_count"
    ? Math.max(1, Math.min(20, student.billingSessionCount ?? 8))
    : undefined;
  // The live profile quota governs drafts and automatic unpaid reports, so a
  // historical session recorded later can complete the same package. A
  // paid/manual invoice keeps its recorded quota and session snapshot.
  const reportTargetCount = mode === "jumlah"
    && configuredPackageCount !== undefined
    && !(useStoredEditingSnapshot && editingReport?.billingMode === "session_count")
    ? configuredPackageCount
    : count;

  // Only confirmed reports own a session snapshot. A draft never reserves its
  // old ids, so it cannot hide newly added sessions or bypass a sibling invoice.
  const ownedSessionIds = useMemo(
    () => new Set(
      scopeReport && reportStatus(scopeReport) === "confirmed"
        ? scopeReport.sessionIds
        : [],
    ),
    [scopeReport],
  );
  const sessionCountPackage = mode === "jumlah"
    && Boolean(student && billingPolicyOf(student) === "session_count");
  const blockingConfirmedReports = useMemo(
    () => (confirmedReports ?? []).filter((candidate) =>
      candidate.billingMode === "session_count"
        ? candidate.status === "confirmed" || invoiceReportIds.has(candidate.id)
        : reportBlocksSiblingScope(candidate, protectedReportIds.has(candidate.id))
    ),
    [confirmedReports, invoiceReportIds, protectedReportIds],
  );
  const blockedSessionIds = useMemo(() => {
    // Package coverage is governed by its existing payment-aware FIFO helper.
    // Month/range reports additionally let an unprotected statusless legacy
    // snapshot refresh rather than hiding sessions it happened to store.
    const reportsOwningSiblingSessions = sessionCountPackage
      ? (confirmedReports ?? [])
      : blockingConfirmedReports;
    const otherConfirmedReports = reportsOwningSiblingSessions
      .filter((candidate) => candidate.id !== scopeReport?.id);
    if (sessionCountPackage) {
      return packageCoveredSessionIds(otherConfirmedReports, studentPayments ?? []);
    }
    return new Set(otherConfirmedReports.flatMap((candidate) => candidate.sessionIds));
  }, [sessionCountPackage, confirmedReports, blockingConfirmedReports, studentPayments, scopeReport]);

  // Sesi yang benar-benar ADA di jendela tanggal terpilih — dasar kunci periode
  // per sesi. Untuk mode "jumlah"/paket cakupannya adalah snapshot terpilih
  // sendiri, sehingga kunci tetap berbasis id sesi.
  const sessionWindowIds = useMemo(
    () => new Set((sessions ?? []).map((session) => session.id)),
    [sessions],
  );

  // Periode rekap efektif + sesi yang masuk laporan.
  const { periodStart, periodEnd, reportSessions } = useMemo(() => {    if (!studentId) return { periodStart: "", periodEnd: "", reportSessions: [] as Session[] };
    if (editingReport && useStoredEditingSnapshot) {
      return {
        periodStart: editingReport.periodStart,
        periodEnd: editingReport.periodEnd,
        reportSessions: editingReportSessions ?? [],
      };
    }
    if (mode === "jumlah") {
      const chosen = selectCountReportSessions(
        sessions ?? [],
        blockedSessionIds,
        reportTargetCount,
        ownedSessionIds,
      );
      return {
        periodStart: chosen[0]?.date ?? "",
        periodEnd: chosen[chosen.length - 1]?.date ?? "",
        reportSessions: chosen,
      };
    }
    const allowed = selectPeriodReportSessions(
      sessions ?? [],
      blockedSessionIds,
      ownedSessionIds,
      scopeHasProtectedInvoice,
    );
    return {
      periodStart: mode === "bulan" ? monthStart : rangeStart,
      periodEnd: mode === "bulan" ? monthEnd : rangeEnd,
      reportSessions: allowed,
    };
  }, [
    studentId, editingReport, useStoredEditingSnapshot, editingReportSessions,
    mode, sessions, blockedSessionIds, ownedSessionIds, scopeHasProtectedInvoice, reportTargetCount,
    monthStart, monthEnd, rangeStart, rangeEnd,
  ]);

  // Laporan identik periode = laporan yang sama (basis edit); periode lain yang
  // mengklaim SESI yang sama → periode TIDAK bisa digenerate. Tumpang-tindih
  // tanggal saja tidak lagi memblokir (kunci periode mengikuti sesi).
  const reportSessionIds = useMemo(
    () => reportSessions.map((session) => session.id),
    [reportSessions],
  );
  const countSessionKey = reportSessionIds.join("|");
  const countReport = mode === "jumlah" && allReports
    ? [...allReports]
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
      .find((candidate) =>
        !candidate.supplementalForReportId
        && candidate.sessionIds.join("|") === countSessionKey
      )
    : undefined;
  const periodReportKey = `${studentId}|${mode}|${periodStart}|${periodEnd}|${countSessionKey}`;
  const periodReportQuery = useLiveQuery(
    async () => ({
      key: periodReportKey,
      report: mode !== "jumlah" && studentId && periodStart && periodEnd
        ? await findReportByPeriod(studentId, periodStart, periodEnd)
        : undefined,
    }),
    [studentId, mode, periodStart, periodEnd, countSessionKey]
  );
  const periodReportLookupReady = mode === "jumlah"
    ? allReports !== undefined
    : periodReportQuery?.key === periodReportKey;
  const periodReport = mode === "jumlah"
    ? countReport
    : periodReportLookupReady ? periodReportQuery?.report : undefined;
  const report = editingReportId ? editingReport : periodReport;
  const payment = useLiveQuery(() => (report ? getPaymentByReport(report.id) : undefined), [report]);
  // Tunggakan dari bulan-bulan sebelumnya — sinyal risiko yang terlihat langsung
  // dari halaman Laporan tanpa harus membuka Menu Keuangan (integrasi dua arah
  // laporan ⇄ keuangan).
  const olderUnpaidPayments = useMemo(
    () => (studentPayments ?? [])
      .filter((p) => p.status === "UNPAID" && report && p.month < report.month),
    [studentPayments, report],
  );
  const olderUnpaidTotal = olderUnpaidPayments.reduce((sum, p) => sum + p.totalCost, 0);
  const billingParams = new URLSearchParams({ tab: "tagihan" });
  if (studentId) billingParams.set("studentId", studentId);
  if (report?.id) billingParams.set("reportId", report.id);
  if (report?.month || month) billingParams.set("month", report?.month ?? month);
  const billingHref = `/payments?${billingParams.toString()}`;
  const invalidReportLink = Boolean(editingReportId && editingReportLookupReady && !editingReport);
  const reportScopeDataReady = sessions !== undefined
    && confirmedReports !== undefined
    && studentPayments !== undefined
    && fixedPeriodLookupReady
    && periodReportLookupReady
    && (!editingReportId || (
      editingReportLookupReady
      && (!useStoredEditingSnapshot || editingReportSessionsReady)
    ));

  const availability = useMemo<ReportAvailability>(() => reportAvailabilityOf({
    studentId, periodStart, periodEnd, mode, rangeStart, rangeEnd,
    invalidReportLink, dataReady: reportScopeDataReady, report,
    scopeHasProtectedInvoice, reportSessionsCount: reportSessions.length,
    reportTargetCount, reportSessionIds, student,
    blockingConfirmedReports, sessionWindowIds,
  }), [
    studentId, periodStart, periodEnd, mode, rangeStart, rangeEnd,
    invalidReportLink, reportScopeDataReady, report, scopeHasProtectedInvoice,
    reportSessions.length, reportTargetCount, reportSessionIds, student,
    blockingConfirmedReports, sessionWindowIds,
  ]);

  const totalHours = useMemo(() => reportSessions.reduce((s, x) => s + x.durationHours, 0), [reportSessions]);
  const totalCost  = useMemo(() => reportSessions.reduce((s, x) => s + x.cost, 0), [reportSessions]);
  // Mode "jumlah" hanya menjadi paket (session_count) bila murid memang memakai
  // siklus per pertemuan, atau sedang mengedit paket lama yang sudah sah. Murid
  // bulanan/manual yang memakai "jumlah" tetap menghasilkan laporan periode
  // biasa agar invoice tidak menyimpang dari siklus penagihannya.
  const isPackageBilling = Boolean(student && billingPolicyOf(student) === "session_count");
  const editingPackage = report?.billingMode === "session_count";
  const reportBillingMode: NonNullable<MonthlyReport["billingMode"]> = mode === "jumlah"
    ? (isPackageBilling || editingPackage ? "session_count" : "range")
    : mode === "range" ? "range" : "monthly";
  const reportBillingFields = {
    billingMode: reportBillingMode,
    billingSessionCount: reportBillingMode === "session_count" ? reportTargetCount : undefined,
  };
  const protectedNewSessionCount = useMemo(() => scopeHasProtectedInvoice
    ? (sessions ?? []).filter((session) =>
        !ownedSessionIds.has(session.id) && !blockedSessionIds.has(session.id)
      ).length
    : 0,
  [scopeHasProtectedInvoice, sessions, ownedSessionIds, blockedSessionIds]);
  const reportScopeKey = useMemo(() => [
    studentId, month, mode, reportTargetCount, rangeStart, rangeEnd,
    editingReportId, snapshotLocked ? "snapshot" : "editable",
    periodStart, periodEnd, reportSessions.map((session) => session.id).join(","),
  ].join("|"), [
    studentId, month, mode, reportTargetCount, rangeStart, rangeEnd,
    editingReportId, snapshotLocked, periodStart, periodEnd, reportSessions,
  ]);
  const uniqueSubjects         = useMemo(() => {
    const set = new Set<string>();
    reportSessions.forEach((s) => s.subjects.forEach((subj) => { if (subj.trim()) set.add(subj.trim()); }));
    return [...set].sort();
  }, [reportSessions]);
  const filteredSessions = useMemo(() =>
    subjectFilter ? reportSessions.filter((s) => s.subjects.some((subj) => subj.trim() === subjectFilter)) : reportSessions,
  [reportSessions, subjectFilter]);
  // Butir 7 G3-05: kesiapan dihitung dari SELURUH sesi laporan, bukan dari sesi
  // yang sedang tersaring. Cakupan penyaringnya ditampilkan sebagai chip.
  const sessionsWithNarrativeAll = reportSessions
    .filter((s) => Boolean(s.narrative?.trim() || s.shortNote?.trim())).length;
  const narrativeDirtyCount = useMemo(() => pickDirtyNarrativeSessions(reportSessions).dirty.length, [reportSessions]);
  // Cakupan data kondisi (audit P3 #17): rata-rata skor WAJIB punya penyebut,
  // supaya "7/10" tidak dibaca sebagai penilaian atas SEMUA sesi padahal hanya
  // sebagian sesi yang mencatat kondisi. `sessionEngagementScore` mengembalikan
  // undefined untuk sesi tanpa pengamatan (dulu menjadi "5/10" semu).
  const engagementCoverage = useMemo(
    () => engagementAverage(reportSessions),
    [reportSessions],
  );
  const engagementScores = useMemo(() => reportSessions
    .map((s) => sessionEngagementScore(s))
    .filter((score): score is number => score != null), [reportSessions]);
  const avgEngagement = engagementCoverage.average;
  const engagementTrend = useMemo(() => {
    if (engagementScores.length < 2) return undefined;
    const split = Math.ceil(engagementScores.length / 2);
    const start = engagementScores.slice(0, split);
    const end = engagementScores.slice(split);
    const startAvg = start.reduce((sum, score) => sum + score, 0) / start.length;
    const endAvg = end.reduce((sum, score) => sum + score, 0) / end.length;
    if (endAvg - startAvg >= 1) return "Meningkat";
    if (startAvg - endAvg >= 1) return "Perlu perhatian";
    return "Stabil";
  }, [engagementScores]);
  const hasPlan = Boolean(report?.nextMonthPlan?.priorities.some((item) => item.target.trim()));
  const reportReadinessItems = buildReportReadiness({
    totalSessions: reportSessions.length,
    sessionsWithNarrative: sessionsWithNarrativeAll,
    hasSummary: Boolean(report?.summaryText.trim()),
    hasTeacherNote: Boolean(report?.teacherNote?.trim()),
    hasPlan,
  });
  const reportReadiness = reportReadinessItems.filter((item) => item.complete).length;
  const reportReadinessPercent = Math.round((reportReadiness / reportReadinessItems.length) * 100);

  // Resolve theme: built-in or custom
  const theme: Theme = useMemo(() => {
    if (!report) return THEMES[0];
    const customThemes = settings?.templatePref?.customThemes ?? [];
    const custom = customThemes.find((ct) => ct.id === report.templateKey.themeId);
    if (custom) return custom as Theme;
    return getTheme(report.templateKey.themeId);
  }, [report, settings]);

  const allThemes = useMemo(() => {
    const customThemes = (settings?.templatePref?.customThemes ?? []) as Theme[];
    const excluded = settings?.templatePref?.excludedThemeIds ?? [];
    return [...THEMES.filter((t) => !excluded.includes(t.id)), ...customThemes];
  }, [settings]);

  // ── Undo stack for theme/layout changes ─────────────────────────────
  const [undoStack, setUndoStack] = useState<Array<{ themeId: string; layoutId: string }>>([]);
  const [coverPage, setCoverPage] = useState(false);
  const [showCustomBuilder, setShowCustomBuilder] = useState(false);
  // Toolbar desain di-state (bukan open={false} statis) agar tetap terbuka
  // saat pratinjau di-remount setelah ganti tema/layout.
  const [designOpen, setDesignOpen] = useState(false);
  // Daftar tema lengkap disembunyikan (keputusan pemilik: "Saat memilih tema,
  // jangan tampilkan semua list, cukup acak saja"). Tombol "🎲 Acak" memilih
  // tema + layout untuk pengguna; galeri hanya dibuka bila benar-benar diminta.
  const [showThemeList, setShowThemeList] = useState(false);
  // Daftar layout juga di balik tombol sendiri. Filter kategori
  // (Classic/Modern/Visual/Analytic/Formal/Playful) DIHAPUS atas permintaan
  // pemilik — kategori hanya menambah langkah memilih tanpa membantu.
  const [showLayoutList, setShowLayoutList] = useState(false);
  // C-2: preview on-demand per kombinasi layout yang diklik (bukan render
  // seluruh galeri sekaligus). Preview memakai SAMPLE_REPORT_DATA — tanpa AI.
  const [previewLayoutId, setPreviewLayoutId] = useState<string | null>(null);

  // Kontrol export: cukup jumlah sesi per halaman. Tinggi halaman selalu
  // otomatis (pilihan rasio 3:4/Auto dihapus atas permintaan pemilik).
  // G3-05 butir 10: nilainya dibaca dari laporan, bukan dari keadaan sementara.
  const entriesPerPage = report?.entriesPerPage ?? DEFAULT_ENTRIES_PER_PAGE;
  const reportOptions: ReportOptions = { coverPage, showEngagement: true, entriesPerPage };

  // ReportData pratinjau + ekspor: foto apa adanya, urutan kronologis.
  const { reportData, prevAvgEngagement } = useReportData({
    student,
    report,
    reportSessions,
    settings,
    periodStart,
    periodEnd,
    month,
    billingMode: reportBillingMode,
    totalHours,
  });

  // Export (JPG/PNG/PDF) + tahap ekspornya — di-extract ke hook tersendiri.
  const {
    exporting, exportStage, reportExportRef, doExport, handleMarkReportShared,
    pendingFiles, downloadPendingFile, clearPendingFiles,
  } = useReportExport({
    student,
    report,
    reportData,
    periodLabel: periodLabel(periodStart, periodEnd) || monthLabel(month),
    setMessage,
  });

  // Pastikan laporan untuk scope saat ini sudah ada sebelum AI menulis.
  const ensureReport = async () => {
    if (!studentId) return undefined;
    if (!availability.ok) { setMessage("Gagal: " + availability.reason); return undefined; }
    let current = await resolveReportMutationTarget(
      editingReportId,
      getReportById,
      () => findReportByPeriod(studentId, periodStart, periodEnd),
    );
    if (current) {
      // D6: laporan yang sudah final membekukan total & cakupan sesinya.
      const totals = frozenReportTotals(current, {
        sessionIds: reportSessions.map((s) => s.id),
        totalHours, totalCost,
      });
      const refreshed = {
        ...current,
        ...reportBillingFields,
        month: monthOf(periodEnd),
        periodStart, periodEnd,
        ...totals,
      };
      await upsertReport(refreshed);
      // Perubahan laporan tidak boleh membuat invoice baru. Jika invoice sudah
      // ada, nominal dan periodenya tetap diselaraskan dengan laporan terkait.
      const existingPayment = reportStatus(current) === "confirmed"
        ? await getPaymentByReport(current.id)
        : undefined;
      if (existingPayment) await syncReportPayment(refreshed);
      return refreshed;
    }
    const templateKey = await pickTemplate(studentId);
    const created = {
      id: crypto.randomUUID(), studentId,
      ...reportBillingFields,
      month: monthOf(periodEnd), periodStart, periodEnd,
      sessionIds: reportSessions.map((s) => s.id),
      templateKey, summaryText: "", totalHours, totalCost,
      status: "draft" as ReportStatus,
      entriesPerPage: DEFAULT_ENTRIES_PER_PAGE,
      createdAt: new Date().toISOString(),
    };
    const result = await createReportForPeriod(created);
    // Draft hanya menyimpan laporan. Penagihan selalu dikelola dari Keuangan.
    current = await getReportById(result.reportId);
    return current;
  };

  // Generasi AI (narasi/ringkasan + fallback gratis) — di-extract ke hook tersendiri.
  const {
    aiLoading, aiProgress, aiResult, clearAiResult, prevTexts, setPrevTexts, invalidateAiRequests,
    handleGenerateAll,
    pickFailedSessions, retryFailedAi,
    handleGenerateLocalNarratives, handleGenerateLocalTexts,
  } = useReportGeneration({
    student,
    report,
    reportSessions,
    periodStart,
    periodEnd,
    month,
    prevAvgEngagement,
    totalHours,
    avgEngagement,
    ensureReport,
    setMessage,
    setOpenNarasi,
    setOpenTeks,
    setOpenPlan,
  });

  // Penyimpanan narasi otomatis: status "sedang menyimpan" dan waktu tersimpan.
  const storedNarrative = useMemo(
    () => (narrativeEdit ? reportSessions.find((s) => s.id === narrativeEdit.id)?.narrative : undefined),
    [narrativeEdit, reportSessions],
  );
  const narrativeAutosave = useNarrativeAutosave({
    draft: narrativeEdit,
    storedText: storedNarrative,
    onSave: async (id, text) => { await updateSession(id, { narrative: text }); },
  });

  // Every report scope owns its own preview, edit buffers, undo data, and AI
  // request. Changing student/month/mode/count cannot leak results from the
  // previous selection into the newly-visible report.
  //
  // Catatan G3-05 butir 2: ringkasan HASIL AI (`aiResult`) sengaja TIDAK ikut
  // dibersihkan di sini — ia melaporkan apa yang sudah terjadi pada sesi mana
  // pun, bukan keadaan sementara layar ini.
  useEffect(() => {
    invalidateAiRequests();
    setMessage("");
    setPrevTexts(null);
    setNarrativeEdit(null);
    setSubjectFilter("");
    setNarrativePage(1);
    setOpenNarasi(false);
    setOpenTeks(false);
    setOpenPlan(false);
    setUndoStack([]);
    setCoverPage(false);
    setShowCustomBuilder(false);
    setShowThemeList(false);
    setShowLayoutList(false);
    // Pratinjau (reportData) dibersihkan oleh useReportData saat cakupannya berubah.
  }, [reportScopeKey, invalidateAiRequests, setPrevTexts]);

  const safeNarrativePage      = clampPage(narrativePage, filteredSessions.length);
  const paginatedNarrativeSessions = paginateItems(filteredSessions, safeNarrativePage);

  const handleCreateOrSwitch = async (newLayoutId?: string) => {
    if (!studentId || reportMutationBusyRef.current) return;
    // Jalan keluar lebih awal SELALU memberi pesan + langkah berikutnya (butir 4).
    if (reportSessions.length === 0) { setMessage("Gagal: " + noReportSessionsReason); return; }
    reportMutationBusyRef.current = true;
    setReportMutationBusy(true);
    try {
      if (!availability.ok) { setMessage("Gagal: " + availability.reason); return; }
      const r = await resolveReportMutationTarget(
        editingReportId,
        getReportById,
        () => findReportByPeriod(studentId, periodStart, periodEnd),
      );
      const isConfirmed = r && reportStatus(r) === "confirmed";
      if (!r) {
        const picked = await pickTemplate(studentId);
        const templateKey = newLayoutId ? { ...picked, layoutId: newLayoutId } : picked;
        const created = {
          id: crypto.randomUUID(), studentId,
          ...reportBillingFields,
          month: monthOf(periodEnd), periodStart, periodEnd,
          sessionIds: reportSessions.map((s) => s.id),
          templateKey, summaryText: "", totalHours, totalCost,
          status: "draft" as ReportStatus,
          entriesPerPage: DEFAULT_ENTRIES_PER_PAGE,
          createdAt: new Date().toISOString(),
        };
        const result = await createReportForPeriod(created);
        setMessage(result.created
          ? "Laporan draft dibuat. Lengkapi isinya, lalu finalkan bila sudah siap."
          : "Laporan untuk periode ini sudah tersedia.");
      } else if (newLayoutId) {
        const updated = {
          ...r,
          ...reportBillingFields,
          month: monthOf(periodEnd), periodStart, periodEnd,
          // D6: laporan final tidak dihitung ulang; layout boleh diganti.
          ...frozenReportTotals(r, {
            sessionIds: reportSessions.map((s) => s.id),
            totalHours, totalCost,
          }),
          templateKey: { themeId: r.templateKey.themeId, layoutId: newLayoutId },
        };
        await upsertReport(updated);
        const existingPayment = isConfirmed ? await getPaymentByReport(r.id) : undefined;
        if (existingPayment) await syncReportPayment(updated);
        setMessage("Layout diganti!");
      } else {
        const updated = {
          ...r,
          ...reportBillingFields,
          month: monthOf(periodEnd), periodStart, periodEnd,
          ...frozenReportTotals(r, {
            sessionIds: reportSessions.map((s) => s.id),
            totalHours, totalCost,
          }),
        };
        await upsertReport(updated);
        const existingPayment = isConfirmed ? await getPaymentByReport(r.id) : undefined;
        if (existingPayment) await syncReportPayment(updated);
        setMessage(isConfirmed ? "Data laporan diperbarui ✓" : "Draft diperbarui.");
      }
    } catch (e) {
      setMessage("Error: " + (e as Error).message);
    } finally {
      reportMutationBusyRef.current = false;
      setReportMutationBusy(false);
    }
  };

  const replaceReportParam = (reportId?: string) => {
    const next = new URLSearchParams(searchParams);
    if (reportId) next.set("reportId", reportId);
    else next.delete("reportId");
    setSearchParams(next, { replace: true });
  };

  const lockReportSnapshot = (selectedReport: MonthlyReport) => {
    dismissedReportIdRef.current = "";
    appliedReportIdRef.current = selectedReport.id;
    setEditingReportId(selectedReport.id);
    setStudentId(selectedReport.studentId);
    setMonth(selectedReport.month);
    setCount(Math.max(1, Math.min(20, selectedReport.billingSessionCount ?? (selectedReport.sessionIds.length || 1))));
    setRangeStart(selectedReport.periodStart);
    setRangeEnd(selectedReport.periodEnd);
    const fullMonth = selectedReport.periodStart === `${selectedReport.month}-01`
      && selectedReport.periodEnd === monthRange(selectedReport.month).end;
    setMode(selectedReport.billingMode === "session_count"
      ? "jumlah"
      : selectedReport.billingMode === "range"
        ? "range"
        : fullMonth ? "bulan" : "range");
    setSnapshotLocked(true);
    replaceReportParam(selectedReport.id);
  };

  const leaveEditingReport = () => {
    if (!editingReportId && !reportIdParam) return;
    dismissedReportIdRef.current = reportIdParam || editingReportId;
    appliedReportIdRef.current = "";
    setEditingReportId("");
    setSnapshotLocked(false);
    replaceReportParam();
  };

  /**
   * Ganti cakupan laporan (murid/periode/mode/draft yang dibuka).
   *
   * G3-05 butir 9: kalau masih ada narasi yang belum tersimpan, perpindahan itu
   * dikonfirmasi dulu — bukan diam-diam membuang ketikan terakhir. `apply` berisi
   * perubahan yang tertunda supaya ia hanya dijalankan setelah jawabannya jelas.
   */
  const applyScopeChange = (apply: () => void) => {
    const proceed = () => { invalidateAiRequests(); leaveEditingReport(); apply(); };
    if (narrativeAutosave.unsaved) {
      pendingScopeChangeRef.current = proceed;
      setUnsavedConfirmOpen(true);
      return;
    }
    proceed();
  };

  const confirmUnsavedScopeChange = async () => {
    await narrativeAutosave.flush();
    setUnsavedConfirmOpen(false);
    const action = pendingScopeChangeRef.current;
    pendingScopeChangeRef.current = null;
    action?.();
  };

  const handleFinalize = async () => {
    if (!report || reportMutationBusyRef.current) return;
    if (!availability.ok) { setMessage("Gagal: " + availability.reason); return; }
    reportMutationBusyRef.current = true;
    setReportMutationBusy(true);
    try {
      // D6: pembekuan berlaku tepat pada saat difinalkan. Laporan yang SUDAH
      // final tidak boleh berubah totalnya hanya karena dibuka ulang.
      const totals = frozenReportTotals(report, {
        sessionIds: reportSessions.map((s) => s.id),
        totalHours, totalCost,
      });
      const refreshed = {
        ...report,
        ...reportBillingFields,
        status: "confirmed" as ReportStatus,
        month: monthOf(periodEnd), periodStart, periodEnd,
        ...totals,
      };
      await upsertReport(refreshed);
      lockReportSnapshot(refreshed);
      setMessage("Laporan berhasil difinalkan ✓ Penagihan tetap dikelola dari Keuangan.");
    } catch (e) {
      setMessage("Error: " + (e as Error).message);
    } finally {
      reportMutationBusyRef.current = false;
      setReportMutationBusy(false);
    }
  };

  const handleCreateInvoiceFromReport = async () => {
    if (!report || reportStatus(report) !== "confirmed" || invoiceBusy) return;
    setInvoiceBusy(true);
    try {
      await syncReportPayment({
        id: report.id,
        studentId: report.studentId,
        month: report.month,
        periodStart: report.periodStart,
        periodEnd: report.periodEnd,
        totalCost: report.totalCost,
        billingMode: report.billingMode,
      });
      setMessage("Tagihan berhasil dibuat dari laporan ini ✓ Cek pembayarannya di Keuangan → Penagihan.");
    } catch (e) {
      setMessage("Gagal membuat tagihan: " + (e as Error).message);
    } finally {
      setInvoiceBusy(false);
    }
  };

  // SATU aksi penagihan saja (keputusan pemilik: "ada Lihat tagihan dan Buka
  // Penagihan dan kirim laporan + penagihan. Hal yang sama, lebih baik 1 saja").
  const handleOpenBilling = () => {
    if (!student) return;
    if (payment) { navigate(billingHref); return; }
    if (invoiceBusy) return;
    void handleCreateInvoiceFromReport();
  };

  const handleDiscard = async () => {
    if (!report) return;
    if (reportStatus(report) === "confirmed") {
      setMessage("Gagal: Laporan yang sudah final tidak bisa dibatalkan sebagai draft. Pakai “Buka kunci laporan” bila laporannya perlu diperbaiki.");
      return;
    }
    try {
      await discardReport(report.id);
      if (editingReportId === report.id) leaveEditingReport();
      setMessage("Laporan draft dibatalkan.");
    } catch (e) { setMessage("Error: " + (e as Error).message); }
  };

  // ── Buka kunci laporan final (kasus: laporannya yang salah, bukan tagihannya) ──
  // Membatalkan tagihan saja akan menghasilkan tagihan identik karena laporan
  // final membekukan totalnya — jadi kuncinya harus bisa dibuka. Guard lengkap
  // (tagihan lunas/manual, paket, laporan susulan, sudah dibagikan) ada di repo.
  const askUnlockReport = () => {
    if (!report) return;
    if (!settings?.financialPin) {
      setMessage("Gagal: Buat PIN Keuangan di Pengaturan dulu sebelum membuka kunci laporan.");
      return;
    }
    setUnlockConfirmOpen(true);
  };

  const confirmUnlockReport = async () => {
    if (!report) return;
    setUnlockConfirmOpen(false);
    setUnlockPinOpen(true);
  };

  const runUnlockReport = async () => {
    if (!report) return;
    setUnlockPinOpen(false);
    setUnlockBusy(true);
    try {
      const result = await unlockReport(report.id, {
        confirmShared: reportDisplayStatus(report) === "shared",
      });
      setMessage(result.wasShared
        ? "Kunci laporan dibuka ✓ Laporan kembali draft dan tanda “sudah dibagikan” dilepas — perbaiki lalu finalkan lagi, dan kirim ulang versi barunya."
        : "Kunci laporan dibuka ✓ Laporan kembali draft dan bisa diperbaiki.");
    } catch (e) {
      setMessage("Gagal: " + (e as Error).message);
    } finally {
      setUnlockBusy(false);
    }
  };

  const handleRegenerate = async () => {
    if (!report) return;
    setUndoStack((s) => [...s, { themeId: report.templateKey.themeId, layoutId: report.templateKey.layoutId }]);
    await upsertReport({ ...report, templateKey: await pickTemplate(studentId) });
    setMessage("Desain diganti!");
  };

  const handleUndoDesign = async () => {
    if (!report) return;
    const previous = undoStack[undoStack.length - 1];
    if (!previous) return;
    setUndoStack((state) => state.slice(0, -1));
    await upsertReport({ ...report, templateKey: { themeId: previous.themeId, layoutId: previous.layoutId } });
  };

  const handleSelectTheme = async (themeId: string) => {
    if (!report) return;
    setUndoStack((s) => [...s, { themeId: report.templateKey.themeId, layoutId: report.templateKey.layoutId }]);
    await upsertReport({ ...report, templateKey: { ...report.templateKey, themeId } });
  };

  const handleSelectLayout = (layoutId: string) => {
    if (!report) return;
    setUndoStack((s) => [...s, { themeId: report.templateKey.themeId, layoutId: report.templateKey.layoutId }]);
    void handleCreateOrSwitch(layoutId);
  };

  const handleSaveCustomTheme = async (customTheme: CustomTheme) => {
    if (!report) return;
    const currentCustoms = settings?.templatePref?.customThemes ?? [];
    const updated = currentCustoms.some((c) => c.id === customTheme.id)
      ? currentCustoms.map((c) => c.id === customTheme.id ? customTheme : c)
      : [...currentCustoms, customTheme];
    await saveSettings({ templatePref: { ...settings?.templatePref, customThemes: updated } });
    await upsertReport({ ...report, templateKey: { ...report.templateKey, themeId: customTheme.id } });
    setShowCustomBuilder(false);
    setMessage("Tema kustom disimpan ✓");
  };

  /** Jumlah sesi per halaman disimpan ke laporan (butir 10), bukan keadaan sementara. */
  const handleEntriesPerPageChange = async (value: number) => {
    if (!report) return;
    await upsertReport({ ...report, entriesPerPage: value });
    setMessage(`${value} sesi per halaman disimpan ke laporan ini ✓`);
  };

  /** Undo hasil AI (ringkasan, catatan guru, kutipan, rencana, narasi per sesi). */
  const handleUndoAi = async () => {
    if (!report || !prevTexts) return;
    await upsertReport({
      ...report,
      summaryText: prevTexts.summaryText,
      teacherNote: prevTexts.teacherNote,
      quote: prevTexts.quote,
      nextMonthPlan: prevTexts.nextMonthPlan,
    });
    for (const entry of prevTexts.narratives ?? []) {
      await updateSession(entry.id, { narrative: entry.narrative });
    }
    setPrevTexts(null);
    setMessage("Undo berhasil ✓");
  };

  const saveReportField = async (field: "summaryText" | "teacherNote" | "quote", value: string) => {
    if (!report) return;
    await upsertReport({ ...report, [field]: value });
  };
  const saveNextMonthPlan = async (nextMonthPlan: NextMonthPlan) => {
    if (!report) return;
    await upsertReport({ ...report, nextMonthPlan: { ...nextMonthPlan, updatedAt: new Date().toISOString() } });
    setMessage("Rencana berikutnya disimpan ✓");
  };

  // G2-10: laporan butuh pengaturan (tema, profil, rekening) — galat baca punya jalan keluar.
  if (settingsQuery.error || settingsQuery.timedOut) {
    return <SettingsLoadError screen="Laporan bulanan" busy={settingsQuery.retrying} onRetry={settingsQuery.retry} />;
  }

  if (!students) return <Skeleton variant="card" lines={4} className="p-4" />;
  const studentOptions = student && !students.some((candidate) => candidate.id === student.id)
    ? [...students, student].sort((a, b) => a.name.localeCompare(b.name))
    : students;

  const packageStudent = Boolean(student && billingPolicyOf(student) === "session_count");
  const modeLocked = packageStudent && (
    !report
    || reportStatus(report) !== "confirmed"
    || (
      report.billingMode !== "session_count"
      && (
        report.sessionIds.length !== reportSessionIds.length
        || report.sessionIds.some((id) => !reportSessionIds.includes(id))
      )
    )
  );
  const activeStep = reportStepIndex({
    hasStudent: Boolean(studentId),
    hasPeriod: Boolean(periodStart && periodEnd),
    hasReport: Boolean(report),
    allNarrativesReady: reportSessions.length > 0 && sessionsWithNarrativeAll === reportSessions.length,
  });
  const scopeChip = scopeChipLabel(filteredSessions.length, reportSessions.length, Boolean(subjectFilter));
  const aiAvailable = Boolean(settings?.ai?.enabled && settings.ai.apiKey);
  const showExport = Boolean(report && reportData);
  // Tombol laporan mati menyebut alasannya di bilah tetap (G3-05 butir 1 & 4):
  // belum ada sesi yang bisa direkap ≠ periode tidak tersedia.
  const noReportSessionsReason = mode === "jumlah"
    ? "Belum ada pertemuan yang siap dimasukkan ke paket ini. Lengkapi pertemuannya, atau terbitkan paket lewat Keuangan."
    : "Semua sesi di periode ini sudah pernah direkap — pilih periode lain, atau geser tanggalnya ke periode yang belum direkap.";
  const canCreateReport = Boolean(studentId) && availability.ok && reportSessions.length > 0;
  const createDisabledReason = !availability.ok
    ? availability.reason
    : reportSessions.length === 0
      ? noReportSessionsReason
      : undefined;

  return (
    <div className="pb-20">
      <Breadcrumb />
      <div className="px-4 pt-4">
        <header>
          <h1 className="text-2xl font-bold text-[var(--ink-strong)]">Laporan Perkembangan</h1>
          {/* Audit L-07 / Q22(b): layar ini dulu hanya punya `h1` (h2 hanya muncul di
              dalam modal), jadi hierarki heading dan ambang guard G1-11 gagal. */}
          <h2 className="sr-only">Periode dan pratinjau laporan</h2>
          <p className="mt-1 text-sm leading-relaxed text-[var(--ink-muted)]">
            Susun perkembangan belajar untuk murid dan orang tua. Finalisasi laporan tidak menerbitkan invoice;
            penagihan dikelola terpisah melalui menu Keuangan.
          </p>
        </header>
      </div>

      {/* Bilah aksi tetap: penunjuk langkah + aksi utama + banner hasil aksi. */}
      <ReportActionBar
        activeStep={activeStep}
        hasReport={Boolean(report)}
        reportConfirmed={Boolean(report && reportStatus(report) === "confirmed")}
        canCreate={canCreateReport}
        createReason={createDisabledReason}
        busy={reportMutationBusy}
        onCreateOrUpdate={() => void handleCreateOrSwitch()}
        onFinalize={() => void handleFinalize()}
        showExport={showExport}
        exporting={exporting}
        exportStage={exportStage}
        exportStageLabel={exportStage ? EXPORT_STAGE_LABEL[exportStage] : undefined}
        onExport={(format) => void doExport(format)}
        showUndoAi={Boolean(prevTexts)}
        onUndoAi={() => void handleUndoAi()}
        banner={<ReportMessageBanner message={message} onDismiss={() => setMessage("")} />}
      />

      <div className="space-y-4 p-4">
        {invalidReportLink && (
          <div role="alert" className="rounded-xl border border-[var(--border-warn)] bg-[var(--bg-warn)] p-3 text-sm text-[var(--ink-warn)]">
            <p className="font-semibold">Laporan tidak ditemukan</p>
            <p className="mt-0.5 text-xs">Tautan mungkin sudah lama atau laporan telah dihapus.</p>
            <button
              onClick={() => applyScopeChange(() => {})}
              className="mt-2 inline-flex min-h-[36px] items-center rounded-lg bg-[var(--bg-warn)] px-3 py-1.5 text-xs font-semibold text-[var(--ink-warn)] hover:bg-[var(--bg-warn-strong)]"
            >
              Pilih laporan lain
            </button>
          </div>
        )}

        <ReportHistoryPanel
          open={historyOpen}
          onToggle={() => setHistoryOpen((v) => !v)}
          history={reportHistory}
          visible={historyVisible}
          filteredCount={reportHistoryFiltered.length}
          expanded={historyExpanded}
          onToggleExpanded={() => setHistoryExpanded((v) => !v)}
          studentOptions={studentOptions}
          filterStudentId={historyStudentId}
          onFilterStudent={setHistoryStudentId}
          currentReportId={report?.id}
          onOpen={(row) => applyScopeChange(() => { setStudentId(row.studentId); lockReportSnapshot(row); })}
        />

        <ReportScopeControls
          studentId={studentId}
          studentOptions={studentOptions}
          student={student}
          onStudentChange={setStudentId}
          onScopeChange={applyScopeChange}
          drafts={drafts}
          onOpenDraft={(row) => applyScopeChange(() => lockReportSnapshot(row))}
          onDeleteDraft={async (row) => { await discardReport(row.id); }}
          mode={mode}
          onModeChange={setMode}
          modeLocked={modeLocked}
          month={month}
          onMonthChange={setMonth}
          sessions={sessions ?? []}
          reportSessionCount={reportSessions.length}
          reportTargetCount={reportTargetCount}
          onCountChange={setCount}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          onRangeChange={({ start, end }) => {
            if (start !== undefined) setRangeStart(start);
            if (end !== undefined) setRangeEnd(end);
          }}
          periodStart={periodStart}
          periodEnd={periodEnd}
          confirmedReports={confirmedReports ?? []}
          uniqueSubjects={uniqueSubjects}
          subjectFilter={subjectFilter}
          onSubjectFilter={setSubjectFilter}
          scopeChip={scopeChip}
          availability={availability}
          protectedNewSessionCount={protectedNewSessionCount}
          packageStudent={packageStudent}
          report={report}
          billingHref={billingHref}
          onShowBillingHelp={() => setShowBillingHelp(true)}
        />

        {studentId && sessions && sessions.length > 0 && reportSessions.length > 0 && (
          <section className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-4 shadow-sm">
            <ReportStatusPanel
              report={report}
              reportSessionCount={reportSessions.length}
              reportTargetCount={reportTargetCount}
              totalHours={totalHours}
              avgEngagement={avgEngagement}
              engagementCounted={engagementCoverage.counted}
              engagementTrend={engagementTrend}
              readiness={report ? reportReadiness : null}
              readinessItems={reportReadinessItems}
              readinessPercent={reportReadinessPercent}
              payment={payment}
              moneyVisible={money.visible}
              totalsDrifted={Boolean(report && reportTotalsDrifted(report, {
                sessionIds: reportSessions.map((s) => s.id),
                totalHours, totalCost,
              }))}
              olderUnpaidCount={olderUnpaidPayments.length}
              olderUnpaidTotal={olderUnpaidTotal}
              onMarkShared={() => void handleMarkReportShared()}
              onUnlockReport={askUnlockReport}
              unlockBusy={unlockBusy}
              onOpenBilling={handleOpenBilling}
              invoiceBusy={invoiceBusy}
            />

            {report && reportStatus(report) === "draft" && (
              <p className="text-xs text-[var(--ink-muted)]">
                Final = kunci periode laporan agar tidak berubah. Tindakan ini <strong>tidak membuat invoice</strong>; lanjutkan penagihan dari Keuangan.
              </p>
            )}
            {report && reportStatus(report) === "draft" && (
              <button
                className="w-full rounded-lg py-2 text-xs text-[var(--ink-danger)] transition-colors hover:bg-[var(--bg-danger)]"
                onClick={() => void handleDiscard()}
              >
                <TrashIcon size={13} className="mr-1 inline align-[-2px]" />Batalkan Draft
              </button>
            )}

            {aiAvailable && (
              <button
                className="btn w-full bg-[var(--accent-solid)] text-sm text-[var(--on-strong)] hover:bg-[var(--accent-solid)] disabled:opacity-50"
                onClick={() => {
                  // G3-04: perkiraan dihitung sekali di sini, lalu angka yang sama
                  // dipakai untuk modal sekaligus catatan biaya.
                  const perkiraan = estimateNarrativesCost(forceNarratives ? reportSessions.length : narrativeDirtyCount)
                    + estimateReportSummaryCost(reportSessions.length);
                  ai.jalankan({
                    title: "Isi Semua dengan AI",
                    fitur: "Ringkasan laporan",
                    estimatedIDR: perkiraan,
                    description: `Narasi ${forceNarratives ? reportSessions.length : narrativeDirtyCount} sesi ditulis dalam batch kecil (maks 8 sesi per panggilan) supaya laporan panjang tidak lagi gagal karena batas token, lalu satu panggilan ringkasan mengisi ringkasan, catatan guru, kutipan & rencana depan untuk ${student?.name ?? "murid"}.${!forceNarratives && narrativeDirtyCount === 0 ? " Semua narasi sudah terbaru — ringkasan, catatan guru & rencana depan tetap diisi." : ""}`,
                    dataSent: "Nama dan level murid, periode laporan, serta ID, tanggal, mapel dan catatan sesi yang dipilih. Bila tersedia: mood, topik, area perhatian, prediksi dan nilai akhir, refleksi nilai, skor engagement, label perilaku dan respons, serta rata-rata engagement periode sebelumnya.",
                    extraContent: (
                      <label className="mt-3 flex cursor-pointer select-none items-start gap-2 text-xs text-[var(--ink-muted)]">
                        <input
                          type="checkbox"
                          checked={forceNarratives}
                          onChange={(e) => setForceNarratives(e.target.checked)}
                          className="mt-0.5 h-4 w-4 accent-[var(--border-accent)]"
                        />
                        <span>Tulis ulang paksa semua narasi (lewati hemat token)</span>
                      </label>
                    ),
                    aksi: () => handleGenerateAll(forceNarratives),
                  });
                }}
                disabled={aiLoading || !availability.ok || Boolean(ai.alasanNonaktif)}
                title={ai.alasanNonaktif || "AI mengisi semua isian: narasi tiap sesi (per batch kecil) + ringkasan, catatan guru, kutipan & rencana depan"}
              >
                {aiLoading ? `AI ${aiProgress?.step ?? "…"}` : "Isi Semua dengan AI"}
              </button>
            )}
            {ai.alasanNonaktif && (
              <p className="text-xs font-semibold text-[var(--ink-danger)]">{ai.alasanNonaktif}</p>
            )}

            {/* Butir 2: daftar sesi yang berhasil/gagal + tombol ulangi yang gagal. */}
            <ReportAiResultPanel
              result={aiResult}
              loading={aiLoading}
              progress={aiProgress}
              onDismiss={clearAiResult}
              retryDisabled={aiLoading || Boolean(ai.alasanNonaktif)}
              retryDisabledReason={ai.alasanNonaktif || undefined}
              onRetry={() => {
                const targets = pickFailedSessions();
                const summaryRetry = aiResult?.summary.ok === false;
                ai.jalankan({
                  title: "Ulangi sesi yang gagal",
                  fitur: "Ringkasan laporan",
                  estimatedIDR: estimateNarrativesCost(targets.length)
                    + (summaryRetry ? estimateReportSummaryCost(reportSessions.length) : 0),
                  description: `Menulis ulang narasi ${targets.length} sesi yang gagal pada putaran terakhir${summaryRetry ? ", ditambah satu panggilan ringkasan yang juga gagal" : ""} untuk ${student?.name ?? "murid"}.`,
                  dataSent: "Hanya sesi yang gagal pada putaran terakhir — tanggal, mapel, dan catatan sesinya.",
                  aksi: () => retryFailedAi(),
                });
              }}
            />
          </section>
        )}

        {report && reportData && (
          <div className="space-y-3">
            <DesignToolbar
              report={report}
              themes={allThemes}
              open={designOpen}
              onToggleOpen={setDesignOpen}
              showThemeList={showThemeList}
              onToggleThemeList={() => setShowThemeList((v) => !v)}
              showLayoutList={showLayoutList}
              onToggleLayoutList={() => setShowLayoutList((v) => !v)}
              showCustomBuilder={showCustomBuilder}
              onToggleCustomBuilder={() => setShowCustomBuilder((v) => !v)}
              coverPage={coverPage}
              onToggleCover={() => setCoverPage((v) => !v)}
              onRandomize={() => void handleRegenerate()}
              undoCount={undoStack.length}
              onUndoDesign={() => void handleUndoDesign()}
              onSelectTheme={(themeId) => void handleSelectTheme(themeId)}
              onSelectLayout={handleSelectLayout}
              previewLayoutId={previewLayoutId}
              onPreviewLayout={setPreviewLayoutId}
              activeTheme={theme}
              onSaveCustomTheme={(customTheme) => void handleSaveCustomTheme(customTheme)}
            />

            <ReportPreviewPanel
              exportRef={reportExportRef}
              reportData={reportData}
              theme={theme}
              layoutId={report.templateKey.layoutId}
              options={reportOptions}
              entriesPerPage={entriesPerPage}
              onEntriesPerPageChange={(value) => void handleEntriesPerPageChange(value)}
              entryPageChoices={[2, 3, 4, 6]}
              pendingFiles={pendingFiles}
              onDownloadPending={downloadPendingFile}
              onClearPending={clearPendingFiles}
            />
          </div>
        )}

        {/* Panel penyuntingan isi laporan. */}
        {report && (
          <div className="space-y-2">
            <ReportNarrativePanel
              open={openNarasi}
              onToggle={() => setOpenNarasi((v) => !v)}
              sessions={paginatedNarrativeSessions}
              totalSessions={reportSessions.length}
              sessionsWithNarrative={sessionsWithNarrativeAll}
              filteredTotal={filteredSessions.length}
              scopeChip={scopeChip}
              editingId={narrativeEdit?.id ?? null}
              draftText={narrativeEdit?.text ?? ""}
              onStartEdit={(session) => setNarrativeEdit({ id: session.id, text: session.narrative ?? session.shortNote ?? "" })}
              onDraftChange={(text) => setNarrativeEdit((current) => (current ? { ...current, text } : current))}
              onFinishEdit={() => { void narrativeAutosave.flush(); setNarrativeEdit(null); }}
              saveState={narrativeAutosave.state}
              savedLabel={narrativeSavedLabel(narrativeAutosave.savedAt)}
              onGenerateFree={() => void handleGenerateLocalNarratives()}
              page={safeNarrativePage}
              onPageChange={setNarrativePage}
            />

            <ReportTextsPanel
              open={openTeks}
              onToggle={() => setOpenTeks((v) => !v)}
              report={report}
              scopeKey={reportScopeKey}
              onSaveField={saveReportField}
              onGenerateFree={() => void handleGenerateLocalTexts()}
            />

            <ReportPlanPanel
              open={openPlan}
              onToggle={() => setOpenPlan((v) => !v)}
              report={report}
              scopeKey={reportScopeKey}
              onSavePlan={saveNextMonthPlan}
              aiEnabled={aiAvailable}
            />
          </div>
        )}
      </div>

      {/* Bantuan hubungan laporan perkembangan dan penagihan */}
      {showBillingHelp && (
        <Modal onClose={() => setShowBillingHelp(false)} ariaLabel="Hubungan laporan perkembangan dan penagihan" showCloseButton={false}
          panelClassName="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-[var(--surface-strong)] shadow-xl sm:rounded-2xl outline-none">
          <div className="flex items-start justify-between border-b border-[var(--border)] px-5 py-4">
            <div>
              <h2 className="text-lg font-bold text-[var(--ink-strong)]">Laporan dan Penagihan</h2>
              <p className="mt-0.5 text-xs text-[var(--ink-muted)]">Dua proses terpisah yang menggunakan sesi belajar yang sama.</p>
            </div>
            <button onClick={() => setShowBillingHelp(false)} aria-label="Tutup"
              className="text-xl leading-none text-[var(--ink-muted)] hover:text-[var(--ink-strong)]">✕</button>
          </div>

          <div className="space-y-4 overflow-y-auto px-5 py-4 text-sm text-[var(--ink-strong)]">
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">Pilihan Periode Belajar</h3>
              <ul className="mt-2 space-y-2 text-xs leading-relaxed">
                <li><strong>Bulan Kalender</strong> — semua sesi dalam satu bulan, misalnya Oktober 2026.</li>
                <li><strong>Jumlah Sesi</strong> — sejumlah sesi tertua yang belum masuk laporan final.</li>
                <li><strong>Rentang Tanggal</strong> — tanggal awal–akhir bebas, termasuk periode yang melewati pergantian bulan.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">Siklus Tagihan Murid</h3>
              <ul className="mt-2 space-y-2 text-xs leading-relaxed">
                <li><strong>Bulanan</strong> — gabung sesi yang dapat ditagih lewat Tutup Bulan.</li>
                <li><strong>Paket per N pertemuan</strong> — tagihan setiap N pertemuan (8, 10, 12, dst). Sesi tertua ditagih lebih dulu; sisa yang belum genap ditagih lewat <em>Tagihan Penutup</em>.</li>
                <li><strong>Manual</strong> — buat tagihan nominal bebas tanpa mengambil sesi otomatis.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">Penting</h3>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-relaxed">
                <li><strong>Draft</strong> masih bisa diubah atau dihapus. <strong>Final</strong> mengunci periode laporan.</li>
                <li>Finalisasi laporan <strong>tidak membuat invoice</strong>. Buka Keuangan → Penagihan untuk menerbitkan atau memeriksa tagihan.</li>
                <li>Bulan yang sudah <strong>Tutup Buku</strong> tidak bisa masuk laporan baru.</li>
                <li>Sesi yang sudah masuk laporan final tidak akan dipakai ulang oleh laporan lain.</li>
              </ul>
            </section>
          </div>

          <div className="border-t border-[var(--border)] px-5 py-3">
            <button onClick={() => setShowBillingHelp(false)}
              className="w-full rounded-xl bg-[var(--brand-solid)] py-2.5 text-sm font-bold text-[var(--on-strong)] transition-colors hover:bg-[var(--brand-solid)]">
              Mengerti
            </button>
          </div>
        </Modal>
      )}

      {/* G3-04: modal biaya dari satu jalur `useAiAction`, bukan dipasang di sini. */}
      {ai.modal}

      {/* G3-05 butir 9: cakupan berpindah padahal narasi belum tersimpan. */}
      <ConfirmSheet
        open={unsavedConfirmOpen}
        title="Narasi terakhir belum tersimpan"
        message={"Ketikan terakhir pada narasi sesi belum tersimpan. Cakupan laporan akan berpindah ke murid/periode lain.\n\nPilih “Simpan & lanjut” untuk menyimpannya lebih dulu, atau “Batal” untuk tetap di sini."}
        confirmLabel="Simpan & lanjut"
        onCancel={() => { pendingScopeChangeRef.current = null; setUnsavedConfirmOpen(false); }}
        onConfirm={() => void confirmUnsavedScopeChange()}
      />

      {/* Buka kunci laporan final: konfirmasi → PIN Keuangan → aksi (D4). */}
      <ConfirmSheet
        open={unlockConfirmOpen}
        title="Buka kunci laporan final ini?"
        message={
          `Laporan ${student?.name ?? "murid"} periode ${periodLabel(periodStart, periodEnd) || monthLabel(month)} `
          + `(${formatRupiahDisplay(report?.totalCost ?? 0, money.visible)}) kembali menjadi draft sehingga sesi, periode, dan nominalnya bisa diperbaiki.\n\n`
          + "Perbaikannya: perbaiki lalu finalkan lagi, kemudian terbitkan tagihan baru dari Keuangan → Tagihan. "
          + "Angka yang sudah dikirim ke orang tua tidak bisa ditarik — kirim ulang versi barunya."
          + (report && reportDisplayStatus(report) === "shared"
            ? "\n\nLaporan ini sudah ditandai dibagikan; tanda itu akan dilepas supaya tidak terbaca sebagai versi yang sudah dikirim."
            : "")
        }
        confirmLabel="Buka kunci"
        danger
        busy={unlockBusy}
        onCancel={() => setUnlockConfirmOpen(false)}
        onConfirm={() => void confirmUnlockReport()}
      />

      {unlockPinOpen && settings?.financialPin && (
        <PinConfirmModal
          storedPin={settings.financialPin}
          title="Buka kunci laporan final?"
          description="Masukkan PIN Keuangan untuk membuka kunci laporan ini."
          confirmLabel="Buka kunci"
          onCancel={() => setUnlockPinOpen(false)}
          onConfirm={() => void runUnlockReport()}
        />
      )}
    </div>
  );
}
