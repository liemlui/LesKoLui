import Skeleton from "../components/Skeleton";
import { useState, useMemo, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  listStudents, getStudent, getSettings,
  listSessionsByStudentRange, listBillableSessionsByStudentRange,
  getReportById, findReportByPeriod, listReportsByStudent, listConfirmedReportsByStudent,
  upsertReport, createReportForPeriod, discardReport, updateSession, saveSettings,
  listMonthClosings, getPaymentByReport, syncReportPayment, listPaymentsByStudent,
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
  findBlockingReportOverlap,
  findPreviousPeriodReport,
  resolveReportMutationTarget,
  selectCountReportSessions,
  selectPeriodReportSessions,
  shouldUseStoredReportSnapshot,
  currentPackageSessionRange,
} from "../lib/reportSessionScope";
import { AiCostModal } from "../components/AiCostModal";
import Modal from "../components/Modal";
import { getTheme, THEMES } from "../template/themes";
import { LAYOUTS, gradeDelta } from "../template/layouts";
import { ReportRenderer } from "../template/ReportRenderer";
import { dayLabel, monthLabel, todayWIB, monthOf, periodLabel, formatRupiah } from "../lib/format";
import { useReportExport } from "./monthlyReport/useReportExport";
import { useReportGeneration } from "./monthlyReport/useReportGeneration";
import { blobToDataUrl } from "../lib/imageUtils";
import PaginationControls from "../components/PaginationControls";
import Breadcrumb from "../components/Breadcrumb";
import { clampPage, paginateItems } from "../lib/pagination";
import { calcEngagementScore, scoreLabel, averageEngagement } from "../lib/engagement";
import { pickDirtyNarrativeSessions } from "../lib/aiIncremental";
import type {
  ReportOptions, CustomTheme, Theme,
} from "../template/types";
import type { MonthlyReport, NextMonthPlan, Session } from "../db/types";
import { db } from "../db/db";
import {
  cleanText, formatHours, sessionSubjectLabel,
  sessionTimeLabel, buildSessionNarrative, PLAN_STATUSES,
} from "./monthlyReport/helpers";
import { NextMonthPlanEditor } from "./monthlyReport/NextMonthPlanEditor";
import { CustomThemeBuilder } from "./monthlyReport/CustomThemeBuilder";

/**
 * MonthlyReportPage — halaman pembuatan laporan perkembangan per periode.
 * 20+ tema × 27 layout, AI narrative generation, export ke JPG/PNG/PDF,
 * pagination, dan template rotation logic.
 *
 * @component
 * @route /report/:studentId/:month
 */
export default function MonthlyReportPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const students = useLiveQuery(() => listStudents(true), []);
  const settings = useLiveQuery(() => getSettings(), []);

  // ── Mode rekap: bulan kalender / paket N pertemuan tertua / rentang tanggal ──
  type RecapMode = "bulan" | "jumlah" | "range";
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

  const [editingNarrative, setEditingNarrative] = useState<string | null>(null);
  const [editText,         setEditText]         = useState("");
  const [editingSummary,   setEditingSummary]   = useState(false);
  const [summaryText,      setSummaryText]      = useState("");
  const [editingTeacherNote, setEditingTeacherNote] = useState(false);
  const [teacherNoteText,    setTeacherNoteText]    = useState("");
  const [editingQuote,     setEditingQuote]     = useState(false);
  const [showPolishModal,  setShowPolishModal]  = useState(false);
  const [showNarrativesModal, setShowNarrativesModal] = useState(false);
  const [forceSummary,   setForceSummary]   = useState(false);
  const [forceNarratives, setForceNarratives] = useState(false);
  const [showBillingHelp,   setShowBillingHelp]   = useState(false);
  const [quoteText,        setQuoteText]        = useState("");
  const [reportMutationBusy, setReportMutationBusy] = useState(false);
  const reportMutationBusyRef = useRef(false);
  const [invoiceBusy, setInvoiceBusy] = useState(false);
  const [message,          setMessage]          = useState("");
  const [openNarasi,       setOpenNarasi]       = useState(false);
  const [openTeks,         setOpenTeks]         = useState(false);
  const [openPlan,         setOpenPlan]         = useState(false);
  const [editingPlan,      setEditingPlan]      = useState(false);
  const [narrativePage,    setNarrativePage]    = useState(1);
  const [subjectFilter,    setSubjectFilter]    = useState<string>("");
  const [prevAvgEngagement, setPrevAvgEngagement] = useState<number | undefined>(undefined);

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

  // Semua laporan murid — untuk daftar draft yang belum disahkan.
  const allReports = useLiveQuery(() => (studentId ? listReportsByStudent(studentId) : []), [studentId]);
  const drafts = useMemo(() => (allReports ?? []).filter((r) => reportStatus(r) === "draft"), [allReports]);
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
  const closings = useLiveQuery(() => listMonthClosings(), []);

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

  // Periode rekap efektif + sesi yang masuk laporan.
  const { periodStart, periodEnd, reportSessions } = useMemo(() => {
    if (!studentId) return { periodStart: "", periodEnd: "", reportSessions: [] as Session[] };
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
  // bertumpuk atau bulan yang sudah tutup buku → periode TIDAK bisa digenerate.
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
  const billingParams = new URLSearchParams({ tab: "tagihan" });
  if (studentId) billingParams.set("studentId", studentId);
  if (report?.id) billingParams.set("reportId", report.id);
  if (report?.month || month) billingParams.set("month", report?.month ?? month);
  const billingHref = `/payments?${billingParams.toString()}`;
  const invalidReportLink = Boolean(editingReportId && editingReportLookupReady && !editingReport);
  const reportScopeDataReady = sessions !== undefined
    && confirmedReports !== undefined
    && studentPayments !== undefined
    && closings !== undefined
    && fixedPeriodLookupReady
    && periodReportLookupReady
    && (!editingReportId || (
      editingReportLookupReady
      && (!useStoredEditingSnapshot || editingReportSessionsReady)
    ));

  const availability = useMemo(() => {
    if (!studentId || !periodStart || !periodEnd) return { ok: false, reason: "" };
    if (invalidReportLink) return { ok: false, reason: "Tautan laporan tidak ditemukan." };
    if (!reportScopeDataReady) return { ok: false, reason: "Data laporan masih dimuat." };
    if (mode === "range" && rangeStart > rangeEnd) {
      return { ok: false, reason: "Tanggal awal harus lebih dulu dari tanggal akhir." };
    }
    // Paket (session_count) beridentitas per-snapshot sesi, bukan rentang tanggal,
    // sehingga cek tumpang-tindih kalender dan bulan tertutup dilewati. Laporan
    // "jumlah" untuk murid bulanan/manual tetap laporan periode biasa.
    const sessionCountCycle = mode === "jumlah"
      && ((student && billingPolicyOf(student) === "session_count") || report?.billingMode === "session_count");
    if (sessionCountCycle && reportSessions.length !== reportTargetCount) {
      return {
        ok: false,
        reason: `Paket harus berisi tepat ${reportTargetCount} pertemuan. Saat ini tersedia ${reportSessions.length}/${reportTargetCount}.`,
      };
    }
    if (
      student
      && billingPolicyOf(student) === "session_count"
      && (
        !report
        || reportStatus(report) !== "confirmed"
        || (
          report.billingMode !== "session_count"
          && (
            report.sessionIds.length !== reportSessionIds.length
            || report.sessionIds.some((id) => !reportSessionIds.includes(id))
          )
        )
      )
    ) {
      return {
        ok: false,
        reason: mode === "jumlah"
          ? "Paket pertemuan diterbitkan dari Keuangan agar kuota dan invoice dikunci dalam satu transaksi."
          : "Murid ini memakai paket pertemuan. Buat tagihannya dari Keuangan agar sesi tidak keluar dari antrean paket.",
      };
    }
    if (
      mode === "jumlah"
      && student
      && billingPolicyOf(student) === "session_count"
      && report
      && reportStatus(report) === "confirmed"
      && report.billingMode !== "session_count"
    ) {
      return {
        ok: false,
        reason: "Laporan non-paket lama tidak dapat diubah menjadi tagihan paket. Gunakan antrean Keuangan.",
      };
    }
    const overlap = sessionCountCycle ? undefined : findBlockingReportOverlap(
      blockingConfirmedReports,
      periodStart,
      periodEnd,
      report ? {
        id: report.id,
        supplementalForReportId: report.supplementalForReportId,
      } : undefined,
      reportSessionIds,
    );
    if (overlap) {
      return {
        ok: false,
        reason: `Tanggal ${dayLabel(overlap.periodStart)} s/d ${dayLabel(overlap.periodEnd)} sudah pernah direkap (laporan ${periodLabel(overlap.periodStart, overlap.periodEnd)}). Pilih periode lain.`,
      };
    }
    const closed = sessionCountCycle ? undefined : (closings ?? []).find((c) => {
      // Laporan untuk periode ini sendiri dikecualikan: memperbarui laporan yang
      // sudah ada bukan "generate lagi" — sesi di dalamnya sudah ter-rekap.
      if (report?.id && report.periodStart === periodStart && report.periodEnd === periodEnd) return false;
      const { start, end } = monthRange(c.month);
      return periodStart <= end && periodEnd >= start;
    });
    if (closed) {
      return {
        ok: false,
        reason: `Bulan ${monthLabel(closed.month)} sudah ditutup (tutup buku keuangan) — tanggal dalam periode ini tidak bisa direkap lagi.`,
      };
    }
    return { ok: true, reason: "" };
  }, [studentId, periodStart, periodEnd, invalidReportLink, reportScopeDataReady, blockingConfirmedReports, closings, report, mode, rangeStart, rangeEnd, reportSessions.length, reportSessionIds, reportTargetCount, student]);

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
  const sessionsWithNarrative  = filteredSessions.filter((s) => Boolean(s.narrative?.trim() || s.shortNote?.trim())).length;
  const narrativeDirtyCount = useMemo(() => pickDirtyNarrativeSessions(reportSessions).dirty.length, [reportSessions]);
  const engagementScores = useMemo(() => reportSessions
    .map((s) => s.engagement?.score ?? (s.engagement ? calcEngagementScore(s.engagement) : undefined))
    .filter((score): score is number => score != null), [reportSessions]);
  const avgEngagement = useMemo(() => engagementScores.length > 0
    ? Math.round(engagementScores.reduce((sum, score) => sum + score, 0) / engagementScores.length)
    : undefined, [engagementScores]);
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
  const reportReadinessItems = [
    { label: "Narasi sesi", complete: reportSessions.length > 0 && sessionsWithNarrative === reportSessions.length },
    { label: "Ringkasan", complete: Boolean(report?.summaryText.trim()) },
    { label: "Catatan guru", complete: Boolean(report?.teacherNote?.trim()) },
    { label: "Rencana depan", complete: hasPlan },
  ];
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
  const [showCompare, setShowCompare] = useState(false);
  const [compareThemeId, setCompareThemeId] = useState<string | null>(null);
  const [coverPage, setCoverPage] = useState(false);
  const [showCustomBuilder, setShowCustomBuilder] = useState(false);
  // Toolbar desain di-state (bukan open={false} statis) agar tetap terbuka
  // saat pratinjau di-remount setelah ganti tema/layout.
  const [designOpen, setDesignOpen] = useState(false);
  // Kontrol export: jumlah sesi per halaman + rasio halaman.
  // Default 3:4 potret agar gambar tidak terlalu tinggi di WhatsApp.
  // Sesi per halaman = target awal; entri otomatis dipindah ke halaman
  // berikutnya bila catatan panjang melebihi kotak 3:4 (tidak terpotong).
  const [entriesPerPage, setEntriesPerPage] = useState(3);
  const [pageRatio, setPageRatio] = useState<"3:4" | "auto">("3:4");

  const reportOptions: ReportOptions = { coverPage, showEngagement: true, entriesPerPage, pageRatio };

  // ReportData — async photo normalization + engagement
  const [reportData, setReportData] = useState<import("../template/types").ReportData | null>(null);

  // Export (JPG/PNG/PDF) + tandai sudah dibagikan — di-extract ke hook tersendiri.
  const { exporting, reportExportRef, doExport, handleMarkReportShared } = useReportExport({
    student,
    report,
    reportData,
    periodLabel: periodLabel(periodStart, periodEnd) || monthLabel(month),
    setMessage,
    pageRatio,
    setPageRatio,
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
      const refreshed = {
        ...current,
        ...reportBillingFields,
        month: monthOf(periodEnd),
        periodStart, periodEnd,
        sessionIds: reportSessions.map((s) => s.id),
        totalHours, totalCost,
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
      createdAt: new Date().toISOString(),
    };
    const result = await createReportForPeriod(created);
    // Draft hanya menyimpan laporan. Penagihan selalu dikelola dari Keuangan.
    current = await getReportById(result.reportId);
    return current;
  };

  // Generasi AI (narasi/ringkasan + fallback gratis) — di-extract ke hook tersendiri.
  const {
    aiLoading, prevTexts, setPrevTexts, invalidateAiRequests,
    handlePolish, handleGenerateNarratives,
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

  // Every report scope owns its own preview, edit buffers, undo data, and AI
  // request. Changing student/month/mode/count cannot leak results from the
  // previous selection into the newly-visible report.
  useEffect(() => {
    invalidateAiRequests();
    setMessage("");
    setPrevTexts(null);
    setShowPolishModal(false);
    setShowNarrativesModal(false);
    setEditingNarrative(null);
    setEditText("");
    setEditingSummary(false);
    setSummaryText("");
    setEditingTeacherNote(false);
    setTeacherNoteText("");
    setEditingQuote(false);
    setQuoteText("");
    setEditingPlan(false);
    setSubjectFilter("");
    setNarrativePage(1);
    setOpenNarasi(false);
    setOpenTeks(false);
    setOpenPlan(false);
    setUndoStack([]);
    setShowCompare(false);
    setCompareThemeId(null);
    setCoverPage(false);
    setShowCustomBuilder(false);
    setReportData(null);
  }, [reportScopeKey, invalidateAiRequests, setPrevTexts]);

  useEffect(() => {
    if (!student || reportSessions.length === 0) { setReportData(null); setPrevAvgEngagement(undefined); return; }
    setReportData(null);
    let cancelled = false;
    (async () => {
      const logoUrl = settings?.logo ? await blobToDataUrl(settings.logo) : undefined;
      // Rata-rata engagement periode SEBELUMNYA (tren bulan-ke-bulan). Best-effort:
      // gagal membaca laporan lama tidak boleh menggagalkan pratinjau.
      const prevAvg = await (async () => {
        try {
          const confirmed = await listConfirmedReportsByStudent(student.id);
          const prev = findPreviousPeriodReport(confirmed, periodStart);
          if (!prev) return undefined;
          const rows = await db.sessions.bulkGet(prev.sessionIds);
          return averageEngagement(rows.filter((s): s is Session => Boolean(s)));
        } catch {
          return undefined;
        }
      })();
      if (cancelled) return;
      setPrevAvgEngagement(prevAvg);
      // KRONOLOGIS (awal→akhir periode): orang tua membaca laporan sebagai cerita perkembangan.
      // Semua visual tren (sparkline, growth, compare) mengandalkan urutan ini.
      const sorted = [...reportSessions].sort((a, b) => a.date.localeCompare(b.date));
      const entries = await Promise.all(
        sorted.map(async (s) => {
          const engScore = s.engagement?.score ?? (s.engagement ? calcEngagementScore(s.engagement) : undefined);
          const engLabel = engScore != null ? scoreLabel(engScore).text : undefined;
          const subject = sessionSubjectLabel(s.subjects);
          return {
            date: dayLabel(s.date).split(",")[1]?.trim() ?? s.date.slice(5),
            subject,
            // Pakai foto tersimpan langsung. Normalisasi lama melakukan center-crop
            // permanen ke 360x270 lalu export memperbesarnya lagi, sehingga wajah
            // mudah terpotong dan foto tampak buram di JPG/PDF.
            photoUrl: s.photo ? await blobToDataUrl(s.photo) : undefined,
            narrative: buildSessionNarrative(s, subject),
            topic: cleanText(s.topic) || undefined,
            mood: cleanText(s.mood) || undefined,
            timeLabel: reportBillingMode === "session_count" ? undefined : sessionTimeLabel(s),
            durationLabel: reportBillingMode === "session_count" ? undefined : formatHours(s.durationHours),
            needsWork: cleanText(s.needsWork) || undefined,
            predictedGrade: cleanText(s.predictedGrade) || undefined,
            actualGrade: cleanText(s.actualGrade) || undefined,
            signatureUrl: s.signature ? await blobToDataUrl(s.signature) : undefined,
            engagementScore: engScore,
            engagementLabel: engLabel,
          };
        })
      );
      const scores = entries.filter((e) => e.engagementScore != null).map((e) => e.engagementScore!);
      const avgEngagement = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : undefined;
      const photoUrls = entries.filter((e) => e.photoUrl).map((e) => e.photoUrl!);
      // Tabel prediksi vs nilai aktual — konteks ujian jelas (topik/mapel).
      const gradeComparison = sorted
        .filter((s) => cleanText(s.predictedGrade) || cleanText(s.actualGrade))
        .map((s) => {
          const fullDate = dayLabel(s.date).split(",")[1]?.trim() ?? s.date.slice(5);
          return {
            date: fullDate.split(" ").slice(0, 2).join(" "),
            exam: cleanText(s.topic) || sessionSubjectLabel(s.subjects) || "Ujian",
            predicted: cleanText(s.predictedGrade) || undefined,
            actual: cleanText(s.actualGrade) || undefined,
            delta: gradeDelta(s.predictedGrade, s.actualGrade),
          };
        });
      // Agregat periode penuh untuk layout infografis (akurat lintas halaman).
      const distMap = new Map<string, number>();
      reportSessions.forEach((s) => s.subjects.map((x) => x.trim()).filter(Boolean)
        .forEach((sub) => distMap.set(sub, (distMap.get(sub) ?? 0) + 1)));
      const subjectDist = [...distMap.entries()]
        .map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
      if (cancelled) return;
      setReportData({
        studentName: student.name,
        period: periodLabel(periodStart, periodEnd) || monthLabel(month),
        tutorName: settings?.tutorProfile?.name ?? "",
        logoUrl,
        entries,
        summary: report?.summaryText ?? "",
        teacherNote: report?.teacherNote,
        quote: report?.quote,
        nextMonthPlan: report?.nextMonthPlan,
        avgEngagement,
        prevAvgEngagement: prevAvg,
        photoUrls,
        totalHours,
        totalSessions: entries.length,
        subjectDist,
        // entries sudah kronologis → seri fokus langsung searah waktu
        engagementSeries: scores,
        gradeComparison,
      });
    })();
    return () => { cancelled = true; };
  }, [student, reportSessions, month, periodStart, periodEnd, report, reportBillingMode, settings, totalHours]);

  const safeNarrativePage      = clampPage(narrativePage, filteredSessions.length);
  const paginatedNarrativeSessions = paginateItems(filteredSessions, safeNarrativePage);

  const handleCreateOrSwitch = async (newLayoutId?: string) => {
    if (!studentId || reportSessions.length === 0 || reportMutationBusyRef.current) return;
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
          sessionIds: reportSessions.map((s) => s.id),
          totalHours, totalCost,
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
          sessionIds: reportSessions.map((s) => s.id),
          totalHours, totalCost,
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

  const beginControlScopeChange = () => {
    invalidateAiRequests();
    leaveEditingReport();
  };

  const handleFinalize = async () => {
    if (!report || reportMutationBusyRef.current) return;
    if (!availability.ok) { setMessage("Gagal: " + availability.reason); return; }
    reportMutationBusyRef.current = true;
    setReportMutationBusy(true);
    try {
      const refreshed = {
        ...report,
        ...reportBillingFields,
        status: "confirmed" as ReportStatus,
        month: monthOf(periodEnd), periodStart, periodEnd,
        sessionIds: reportSessions.map((s) => s.id),
        totalHours, totalCost,
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

  

  const handleDiscard = async () => {
    if (!report) return;
    if (reportStatus(report) === "confirmed") {
      setMessage("Gagal: Laporan yang sudah final tidak bisa dibatalkan sebagai draft.");
      return;
    }
    try {
      await discardReport(report.id);
      if (editingReportId === report.id) leaveEditingReport();
      setMessage("Laporan draft dibatalkan.");
    } catch (e) { setMessage("Error: " + (e as Error).message); }
  };

  /** Buka laporan draft yang sudah ada — isi mode & periode sesuai draft tersebut. */
  const jumpToDraft = (r: MonthlyReport) => {
    lockReportSnapshot(r);
  };

  const handleRegenerate = async () => {
    if (!report) return;
    setUndoStack((s) => [...s, { themeId: report.templateKey.themeId, layoutId: report.templateKey.layoutId }]);
    await upsertReport({ ...report, templateKey: await pickTemplate(studentId) });
    setMessage("Desain diganti!");
  };

  const saveNarrative   = async (sid: string) => { await updateSession(sid, { narrative: editText }); setEditingNarrative(null); };
  const saveReportField = async (field: "summaryText" | "teacherNote" | "quote", value: string) => {
    if (!report) return;
    await upsertReport({ ...report, [field]: value });
    setEditingSummary(false); setEditingTeacherNote(false); setEditingQuote(false);
  };
  const saveNextMonthPlan = async (nextMonthPlan: NextMonthPlan) => {
    if (!report) return;
    await upsertReport({ ...report, nextMonthPlan: { ...nextMonthPlan, updatedAt: new Date().toISOString() } });
    setEditingPlan(false);
    setMessage("Rencana berikutnya disimpan ✓");
  };

  if (!students) return <Skeleton variant="card" lines={4} className="p-4" />;
  const studentOptions = student && !students.some((candidate) => candidate.id === student.id)
    ? [...students, student].sort((a, b) => a.name.localeCompare(b.name))
    : students;

  return (
    <div className="pb-20">
      <Breadcrumb />
      <div className="p-4 space-y-4">
        <header>
          <h1 className="text-2xl font-bold text-gray-900">Laporan Perkembangan</h1>
          <p className="mt-1 text-sm leading-relaxed text-gray-600">
            Susun perkembangan belajar untuk murid dan orang tua. Finalisasi laporan tidak menerbitkan invoice;
            penagihan dikelola terpisah melalui menu Keuangan.
          </p>
        </header>
        {invalidReportLink && (
          <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <p className="font-semibold">Laporan tidak ditemukan</p>
            <p className="mt-0.5 text-xs">Tautan mungkin sudah lama atau laporan telah dihapus.</p>
            <button onClick={leaveEditingReport} className="mt-2 rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-200">
              Pilih laporan lain
            </button>
          </div>
        )}
        {message && (
          <div className="space-y-1.5">
            <div onClick={() => setMessage("")}
              className={`p-3 rounded-lg text-sm cursor-pointer ${message.includes("✓") ? "bg-green-50 text-green-700" : message.startsWith("Gagal") || message.startsWith("Error") ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}>
              {message}
            </div>
            {prevTexts && (
              <button
                onClick={async () => {
                  if (!report) return;
                  await upsertReport({
                    ...report,
                    summaryText: prevTexts.summaryText,
                    teacherNote: prevTexts.teacherNote,
                    quote: prevTexts.quote,
                    nextMonthPlan: prevTexts.nextMonthPlan,
                  });
                  // Kembalikan juga narasi per sesi bila Narasi AI yang menimpanya
                  for (const n of prevTexts.narratives ?? []) {
                    await updateSession(n.id, { narrative: n.narrative });
                  }
                  setPrevTexts(null);
                  setMessage("Undo berhasil ✓");
                }}
                className="w-full text-xs text-indigo-600 font-semibold bg-indigo-50 border border-indigo-200 rounded-lg py-2 hover:bg-indigo-100 transition-colors">
                ↩ Undo Hasil AI
              </button>
            )}
          </div>
        )}

        {/* ── LAPORAN MURID ── */}
        <div className="space-y-3">

            {/* CARD 1: Murid + Periode + Stats + Actions */}
            <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
              <div className="grid grid-cols-1 gap-2">
                <div>
                  <label htmlFor="mr-murid" className="label">Murid</label>
                  <select id="mr-murid" className="input" value={studentId} onChange={(e) => {
                    beginControlScopeChange();
                    setStudentId(e.target.value);
                  }}>
                    <option value="">Pilih murid...</option>
                    {studentOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                {drafts.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 space-y-1.5">
                    <p className="text-[11px] font-semibold text-amber-700">📋 {drafts.length} laporan draft — belum final</p>
                    {drafts.map((d) => (
                      <div key={d.id} className="flex items-center justify-between gap-1 text-xs">
                        <span className="text-gray-700 truncate font-medium">{periodLabel(d.periodStart, d.periodEnd)}</span>
                        <span className="text-gray-400">{formatRupiah(d.totalCost)}</span>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => jumpToDraft(d)}
                            className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-[11px] font-medium hover:bg-blue-200 transition-colors">
                            Buka
                          </button>
                          <button onClick={async () => { if (confirm("Hapus draft ini?")) { await discardReport(d.id); } }}
                            className="px-2 py-0.5 rounded text-red-500 text-[11px] hover:bg-red-50 transition-colors">
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="label">Periode belajar</label>
                    <button
                      type="button"
                      onClick={() => setShowBillingHelp(true)}
                      aria-label="Bantuan memilih periode belajar dan memahami penagihan"
                      title="Periode belajar & penagihan"
                      className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600 transition-colors hover:bg-blue-100 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >?</button>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {([["bulan", "Bulan Kalender"], ["jumlah", "Jumlah Sesi"], ["range", "Rentang Tanggal"]] as const).map(([m, label]) => (
                      <button key={m} onClick={() => {
                        beginControlScopeChange();
                        setMode(m);
                      }}
                        disabled={Boolean(
                          student
                          && billingPolicyOf(student) === "session_count"
                          && (
                            !report
                            || reportStatus(report) !== "confirmed"
                            || (
                              report.billingMode !== "session_count"
                              && (
                                report.sessionIds.length !== reportSessionIds.length
                                || report.sessionIds.some((id) => !reportSessionIds.includes(id))
                              )
                            )
                          )
                          && m !== "jumlah"
                        )}
                        className={`rounded-lg px-1 py-2 text-[11px] font-semibold leading-tight transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${mode === m ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  {mode === "bulan" && (
                    <>
                      <label htmlFor="mr-bulan" className="label">Bulan belajar</label>
                      <input id="mr-bulan" className="input" type="month" value={month} onChange={(e) => {
                        beginControlScopeChange();
                        setMonth(e.target.value);
                      }} />
                    </>
                  )}
                  {mode === "jumlah" && (
                    <>
                      <label htmlFor="mr-jumlah" className="label">Jumlah sesi</label>
                      <input id="mr-jumlah" className="input" type="number" min={1} max={20} value={reportTargetCount}
                        disabled={Boolean(student && billingPolicyOf(student) === "session_count")}
                        onChange={(e) => {
                          beginControlScopeChange();
                          setCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)));
                        }} />
                      <p className="text-[11px] text-gray-500 mt-1">
                        {student && billingPolicyOf(student) === "session_count"
                          ? "Mengambil N sesi tertua sesuai siklus murid. Invoice paket tetap diterbitkan dari Keuangan."
                          : "Mengambil N sesi tertua yang belum masuk laporan final."}
                      </p>
                      {student && billingPolicyOf(student) === "session_count" && (
                        <div className="mt-1 space-y-1.5">
                          <p className="text-[11px] font-semibold text-indigo-600">
                            Siklus murid dikunci pada {student.billingSessionCount ?? 8} pertemuan. Terbitkan tagihan paket melalui Keuangan agar sesi diklaim secara atomik.
                          </p>
                          {(!report || reportStatus(report) !== "confirmed") && (
                            <Link
                              to={billingHref}
                              className="inline-flex rounded-lg bg-indigo-50 px-2.5 py-1.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100"
                            >
                              Buka Antrean Tagihan
                            </Link>
                          )}
                        </div>
                      )}
                    </>
                  )}
                  {mode === "range" && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label htmlFor="mr-tanggal-awal" className="label">Tanggal awal</label>
                        <input id="mr-tanggal-awal" className="input" type="date" value={rangeStart} onChange={(e) => {
                          beginControlScopeChange();
                          setRangeStart(e.target.value);
                        }} />
                      </div>
                      <div>
                        <label htmlFor="mr-tanggal-akhir" className="label">Tanggal akhir</label>
                        <input id="mr-tanggal-akhir" className="input" type="date" value={rangeEnd} onChange={(e) => {
                          beginControlScopeChange();
                          setRangeEnd(e.target.value);
                        }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {studentId && periodStart && periodEnd && (
                <p className="text-xs text-gray-500">
                  Periode belajar: <strong>{periodLabel(periodStart, periodEnd)}</strong>
                  {mode === "jumlah" && ` · ${reportSessions.length}/${reportTargetCount} pertemuan`}
                </p>
              )}

              {uniqueSubjects.length > 1 && studentId && (
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setSubjectFilter("")}
                    className={`text-[11px] font-semibold rounded-full px-2.5 py-1 transition-colors ${!subjectFilter ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                    Semua
                  </button>
                  {uniqueSubjects.map((subj) => (
                    <button key={subj}
                      onClick={() => setSubjectFilter(subj === subjectFilter ? "" : subj)}
                      className={`text-[11px] font-semibold rounded-full px-2.5 py-1 transition-colors ${subj === subjectFilter ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                      {subj}
                    </button>
                  ))}
                </div>
              )}

              {!studentId && (
                <p className="text-sm text-gray-500 text-center py-1">Pilih murid untuk mulai menyusun laporan.</p>
              )}

              {studentId && sessions && sessions.length === 0 && (
                <div className="text-center py-2 space-y-2">
                  <p className="text-sm text-gray-500">Belum ada sesi di {periodLabel(periodStart, periodEnd) || monthLabel(month)}.</p>
                  <Link to="/capture" className="btn btn-primary w-full text-sm">Rekam Sesi Sekarang</Link>
                </div>
              )}

              {studentId && sessions && sessions.length > 0 && reportSessions.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-1">
                  {mode === "jumlah"
                    ? "Belum ada pertemuan yang siap dimasukkan ke paket ini."
                    : "Semua sesi di periode ini sudah pernah direkap — pilih periode lain."}
                </p>
              )}

              {studentId && periodStart && periodEnd && reportSessions.length > 0 && (
                availability.ok ? (
                  <p className="text-[11px] text-green-700 bg-green-50 border border-green-100 rounded-lg px-2.5 py-1.5">
                    {report
                      ? "✓ Laporan ini dapat diperbarui."
                      : mode === "jumlah"
                        ? "✓ Paket tersedia — seluruh pertemuan belum pernah ditagih."
                        : "✓ Periode tersedia — tanggal belum pernah direkap dan belum tutup buku."}
                  </p>
                ) : (
                  <p className="text-[11px] text-red-700 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">
                    ⛔ {availability.reason}
                  </p>
                )
              )}
              {protectedNewSessionCount > 0 && (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                  🔒 {protectedNewSessionCount} sesi baru tidak dimasukkan ke invoice yang sudah manual/lunas. {((student && billingPolicyOf(student) === "session_count") || report?.billingMode === "session_count")
                    ? "Sesi tersebut tetap masuk antrean Tagihan untuk paket berikutnya."
                    : student && billingPolicyOf(student) === "manual"
                      ? "Buat laporan susulan secara manual dari sesi tersebut."
                      : "Gunakan Tutup Bulan untuk membuat laporan susulan."}
                </p>
              )}

              {studentId && sessions && sessions.length > 0 && reportSessions.length > 0 && (
                <>
                  {/* Ringkasan yang langsung menjawab kondisi belajar periode ini. */}
                  <div className="grid grid-cols-4 gap-1.5">
                    <div className="bg-blue-50 rounded-xl py-2 text-center">
                      <p className="text-lg font-bold text-blue-700">{reportSessions.length}</p>
                      <p className="text-[11px] text-blue-500">Sesi</p>
                    </div>
                    <div className="bg-indigo-50 rounded-xl py-2 text-center">
                      <p className="text-lg font-bold text-indigo-700">{totalHours}j</p>
                      <p className="text-[11px] text-indigo-500">Jam</p>
                    </div>
                    <div className="bg-purple-50 rounded-xl py-2 text-center">
                      <p className="text-lg font-bold text-purple-700">{avgEngagement != null ? `${avgEngagement}/10` : "—"}</p>
                      <p className="text-[11px] text-purple-500">Fokus rata²</p>
                    </div>
                    <div className={`rounded-xl py-2 text-center ${reportReadiness === 4 ? "bg-green-50" : "bg-amber-50"}`}>
                      <p className={`text-base font-bold leading-tight ${reportReadiness === 4 ? "text-green-700" : "text-amber-700"}`}>
                        {report ? `${reportReadiness}/4` : "—"}
                      </p>
                      <p className={`text-[11px] ${reportReadiness === 4 ? "text-green-500" : "text-amber-500"}`}>Siap kirim</p>
                    </div>
                  </div>
                  {engagementTrend && (
                    <p className={`text-xs rounded-lg px-2.5 py-2 ${engagementTrend === "Meningkat" ? "bg-green-50 text-green-700" : engagementTrend === "Perlu perhatian" ? "bg-amber-50 text-amber-700" : "bg-gray-50 text-gray-600"}`}>
                      Tren fokus: <strong>{engagementTrend}</strong> dibandingkan awal periode.
                    </p>
                  )}

                  {/* Status laporan dan penagihan sengaja dipisah. */}
                  {report && reportStatus(report) === "draft" && (
                    <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                      <p className="font-semibold">
                        Laporan: Draft{report.billingMode === "session_count" ? ` · ${reportSessions.length}/${reportTargetCount} sesi` : ""}
                      </p>
                      <p className="mt-0.5 text-[11px] text-blue-700">Masih dapat diedit dan dibatalkan sebelum difinalkan.</p>
                    </div>
                  )}
                  {report && reportStatus(report) === "confirmed" && (
                    <div className="space-y-2">
                      <div className={`rounded-lg border px-3 py-2 text-sm ${
                        reportDisplayStatus(report) === "shared"
                          ? "border-violet-100 bg-violet-50 text-violet-800"
                          : "border-emerald-100 bg-emerald-50 text-emerald-800"
                      }`}>
                        <p className="font-semibold">
                          ✓ Laporan: {reportDisplayStatus(report) === "shared" ? "Sudah dibagikan" : "Final"}
                        </p>
                        <p className="mt-0.5 text-[11px] opacity-80">
                          {reportDisplayStatus(report) === "shared"
                            ? `Periode belajar dikunci dan laporan sudah dibagikan ${report.pdfGeneratedAt ? `pada ${dayLabel(report.pdfGeneratedAt.slice(0, 10))}` : ""}.`
                            : "Periode belajar sudah dikunci sebagai laporan final. Setelah dibagikan ke orang tua, tandai agar statusnya jelas."}
                        </p>
                        {reportDisplayStatus(report) !== "shared" && (
                          <button
                            onClick={handleMarkReportShared}
                            className="mt-2 rounded-lg bg-violet-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-violet-700"
                          >
                            Tandai Sudah Dibagikan
                          </button>
                        )}
                      </div>
                      <div className={`rounded-lg border px-3 py-2 text-sm ${payment?.status === "PAID"
                        ? "border-green-100 bg-green-50 text-green-800"
                        : payment
                          ? "border-amber-100 bg-amber-50 text-amber-800"
                          : "border-gray-200 bg-gray-50 text-gray-700"}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">
                              Penagihan: {payment?.status === "PAID" ? "Lunas" : payment ? "Belum dibayar" : "Belum diterbitkan"}
                            </p>
                            <p className="mt-0.5 text-[11px] opacity-80">
                              {payment
                                ? `Bulan tagihan ${monthLabel(payment.month)} · ${formatRupiah(payment.totalCost)}`
                                : "Finalisasi laporan tidak otomatis membuat invoice. Buat tagihannya dari tombol di bawah."}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {payment ? (
                            <Link
                              to={billingHref}
                              className="inline-flex rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold shadow-sm ring-1 ring-black/5 hover:bg-gray-50"
                            >
                              Lihat Tagihan →
                            </Link>
                          ) : (
                            <button
                              onClick={handleCreateInvoiceFromReport}
                              disabled={invoiceBusy}
                              className="inline-flex rounded-lg bg-blue-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                              {invoiceBusy ? "Membuat..." : "Buat Tagihan dari Sesi Ini"}
                            </button>
                          )}
                          <Link
                            to={billingHref}
                            className="inline-flex rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold shadow-sm ring-1 ring-black/5 hover:bg-gray-50"
                          >
                            Buka Penagihan →
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2 flex-wrap">
                    <button className="btn btn-primary flex-1 text-sm disabled:opacity-40" disabled={!availability.ok || reportMutationBusy}
                      onClick={() => handleCreateOrSwitch()}>
                      {reportMutationBusy ? "Memproses..." : report ? (reportStatus(report) === "confirmed" ? "🔄 Update Laporan" : "✏️ Update Draft") : "📝 Buat Laporan"}
                    </button>
                    {report && reportStatus(report) === "draft" && (
                      <button className="btn flex-1 text-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40" disabled={!availability.ok || reportMutationBusy}
                        onClick={handleFinalize}>
                        {reportMutationBusy ? "Memproses..." : "Finalkan Laporan"}
                      </button>
                    )}
                  </div>
                  {report && reportStatus(report) === "draft" && (
                    <p className="text-[11px] text-gray-500">
                      Final = kunci periode laporan agar tidak berubah. Tindakan ini <strong>tidak membuat invoice</strong>; lanjutkan penagihan dari Keuangan.
                    </p>
                  )}
                  {report && reportStatus(report) === "draft" && (
                    <button className="w-full py-2 text-xs text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      onClick={handleDiscard}>
                      🗑 Batalkan Draft
                    </button>
                  )}
                  {report && settings?.ai?.enabled && settings.ai.apiKey && (
                    <div className="flex gap-2">
                      <button className="flex-1 btn text-sm bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                        onClick={() => setShowNarrativesModal(true)} disabled={aiLoading || !availability.ok}
                        title="Perkuat narasi 40–60 kata per sesi dengan AI (hanya sesi yang berubah)">
                        {aiLoading ? "⏳ AI..." : narrativeDirtyCount === 0 ? "📖 Perkuat Narasi AI" : `📖 Perkuat Narasi AI (${narrativeDirtyCount})`}
                      </button>
                      <button className="flex-1 btn text-sm bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 disabled:opacity-50"
                        onClick={() => setShowPolishModal(true)} disabled={aiLoading || !availability.ok}
                        title="Perkuat ringkasan periode + kutipan dengan AI (lebih murah)">
                        {aiLoading ? "⏳ AI..." : "✨ Perkuat Teks AI"}
                      </button>
                    </div>
                  )}

                  {/* Kesiapan laporan, bukan hanya jumlah narasi. */}
                  {report && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Kesiapan laporan</span>
                        <span className={reportReadiness === 4 ? "text-green-600 font-semibold" : ""}>{reportReadinessPercent}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${reportReadiness === 4 ? "bg-green-500" : "bg-blue-500"}`}
                          style={{ width: `${reportReadinessPercent}%` }} />
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {reportReadinessItems.map((item) => (
                          <span key={item.label} className={`text-[11px] rounded-md px-2 py-1 ${item.complete ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-500"}`}>
                            {item.complete ? "✓" : "○"} {item.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>

            {/* CARD 2 (hero): Design toolbar + Preview + Export */}
            {report && reportData && (
              <section className="space-y-3">

                {/* Design toolbar */}
                <details className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 space-y-2.5 group"
                  open={designOpen}
                  onToggle={(e) => setDesignOpen(e.currentTarget.open)}>
                  <summary className="flex flex-wrap items-center justify-between gap-1 cursor-pointer select-none">
                    <span className="min-w-0 text-sm font-semibold text-gray-700">
                      🎨 Tema: {allThemes.find((t) => t.id === report.templateKey.themeId)?.name ?? "—"}
                      {" · "}{LAYOUTS.find((l) => l.id === report.templateKey.layoutId)?.name ?? "—"}
                    </span>
                    <span className="text-xs text-blue-600 font-semibold group-open:hidden">Ubah tema & layout ▸</span>
                    <span className="text-xs text-gray-400 font-semibold hidden group-open:inline">▾</span>
                  </summary>
                  {/* Row 1: Random + Layout + Cover toggle */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button className="btn btn-secondary text-sm py-1.5 px-2 flex-shrink-0 whitespace-nowrap"
                      onClick={handleRegenerate}>🎲 Acak</button>
                    {undoStack.length > 0 && (
                      <button className="btn btn-secondary text-sm py-1.5 px-2 flex-shrink-0"
                        onClick={async () => {
                          const prev = undoStack[undoStack.length - 1];
                          setUndoStack((s) => s.slice(0, -1));
                          await upsertReport({ ...report, templateKey: { themeId: prev.themeId, layoutId: prev.layoutId } });
                        }}>↩ Undo</button>
                    )}
                    <select className="input min-w-0 basis-[140px] flex-1 text-sm" value={report.templateKey.layoutId}
                      onChange={(e) => { setUndoStack((s) => [...s, { themeId: report.templateKey.themeId, layoutId: report.templateKey.layoutId }]); handleCreateOrSwitch(e.target.value); }}>
                      {LAYOUTS.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                    <button onClick={() => setCoverPage((v) => !v)}
                      className={`text-sm py-1.5 px-2 rounded-lg border transition-colors whitespace-nowrap ${coverPage ? "bg-blue-600 text-white border-blue-600" : "bg-gray-50 text-gray-600 border-gray-200"}`}>
                      {coverPage ? "📄 Cover ✓" : "📄 Cover"}
                    </button>
                  </div>

                  {/* Row 2: Compare + Custom Theme Builder */}
                  <div className="flex gap-2">
                    <button className="btn btn-secondary text-xs py-1 px-2 flex-1"
                      onClick={() => { setShowCompare((v) => !v); setCompareThemeId(null); }}>
                      {showCompare ? "❌ Tutup" : "🔍 Bandingkan"}
                    </button>
                    <button className="btn btn-secondary text-xs py-1 px-2 flex-1"
                      onClick={() => setShowCustomBuilder((v) => !v)}>
                      {showCustomBuilder ? "❌ Tutup" : "🎨 Custom Theme"}
                    </button>
                  </div>

                  {/* Thumbnail grid */}
                  <div className="grid grid-cols-6 gap-1.5 max-h-[200px] overflow-y-auto">
                    {allThemes.map((t) => {
                      const isActive = report.templateKey.themeId === t.id;
                      const isCompare = compareThemeId === t.id;
                      const bgColor = t.bg.includes("gradient") ? t.accent : t.bg;
                      return (
                        <button key={t.id} title={t.name}
                          onClick={async () => {
                            if (showCompare) { setCompareThemeId(t.id); return; }
                            setUndoStack((s) => [...s, { themeId: report.templateKey.themeId, layoutId: report.templateKey.layoutId }]);
                            await upsertReport({ ...report, templateKey: { ...report.templateKey, themeId: t.id } });
                          }}
                          className={`rounded-lg border-2 transition-all overflow-hidden ${isActive ? "border-gray-800 ring-2 ring-offset-1 ring-blue-400" : isCompare ? "border-dashed border-blue-400" : "border-gray-200 hover:border-gray-400"}`}>
                          <div style={{ background: bgColor, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontFamily: t.fontDisplay, fontSize: 10, color: t.ink, fontWeight: 700, lineHeight: 1, textAlign: "center", padding: "0 2px" }}>
                              {t.headerText.slice(0, 4)}
                            </span>
                          </div>
                          <div style={{ padding: "2px 3px", fontSize: 10, color: "#6b7280", textAlign: "center", background: "#fff" }}>
                            {t.name.length > 10 ? t.name.slice(0, 9) + "…" : t.name}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-500">
                    {allThemes.find((t) => t.id === report.templateKey.themeId)?.name ?? "—"}
                    {showCompare && " • Klik tema untuk bandingkan, klik lagi untuk pilih"}
                  </p>

                {/* Comparison mode */}
                {showCompare && compareThemeId && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-gray-500 text-center mb-1">Current: {allThemes.find((t) => t.id === report.templateKey.themeId)?.name}</p>
                      <div className="scale-[0.6] origin-top-left" style={{ width: "167%" }}>
                        <ReportRenderer data={reportData} theme={theme} layoutId={report.templateKey.layoutId} options={reportOptions} />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 text-center mb-1">Compare: {allThemes.find((t) => t.id === compareThemeId)?.name}</p>
                      <div className="scale-[0.6] origin-top-left" style={{ width: "167%" }}>
                        <ReportRenderer data={reportData} theme={allThemes.find((t) => t.id === compareThemeId) ?? getTheme(compareThemeId)} layoutId={report.templateKey.layoutId} options={reportOptions} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Custom Theme Builder */}
                {showCustomBuilder && (
                  <CustomThemeBuilder
                    onSave={async (ct: CustomTheme) => {
                      const currentCustoms = settings?.templatePref?.customThemes ?? [];
                      const updated = currentCustoms.some((c) => c.id === ct.id)
                        ? currentCustoms.map((c) => c.id === ct.id ? ct : c)
                        : [...currentCustoms, ct];
                      await saveSettings({ templatePref: { ...settings?.templatePref, customThemes: updated } });
                      await upsertReport({ ...report, templateKey: { ...report.templateKey, themeId: ct.id } });
                      setShowCustomBuilder(false);
                      setMessage("Tema kustom disimpan ✓");
                    }}
                  />
                )}

                </details>

                {/* Preview sekaligus sumber export supaya komposisi JPG/PDF persis
                    sama dengan yang dilihat pengguna pada ukuran layar aktif. */}
                <div ref={reportExportRef} data-report-export-root className="max-w-sm lg:max-w-2xl mx-auto">
                  <ReportRenderer data={reportData} theme={theme} layoutId={report.templateKey.layoutId} options={reportOptions} />
                </div>

                {/* Kontrol export: jumlah sesi per halaman + rasio halaman */}
                <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-semibold text-gray-600">Sesi per halaman</label>
                    <div className="flex gap-1">
                      {[2, 3, 4, 6].map((n) => (
                        <button key={n}
                          onClick={() => setEntriesPerPage(n)}
                          className={`text-xs font-semibold rounded-lg px-2.5 py-1 transition-colors ${entriesPerPage === n ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-semibold text-gray-600">Rasio halaman</label>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setPageRatio("3:4")}
                        className={`text-xs font-semibold rounded-lg px-2.5 py-1 transition-colors ${pageRatio === "3:4" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                        title="Rasio 3:4 potret — ramah WhatsApp, tidak terpotong">
                        3:4
                      </button>
                      <button
                        onClick={() => setPageRatio("auto")}
                        className={`text-xs font-semibold rounded-lg px-2.5 py-1 transition-colors ${pageRatio === "auto" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                        title="Tinggi otomatis — dipakai PDF">
                        Auto
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    {pageRatio === "3:4"
                      ? "Rasio 3:4 membuat gambar tidak terlalu tinggi sehingga tidak terpotong saat dikirim ke WhatsApp. Sesi otomatis dipindah ke halaman berikutnya bila catatan panjang."
                      : "Tinggi otomatis mengikuti isi halaman (cocok untuk PDF)."}
                  </p>
                </div>

                {/* Export */}
                <div className="grid grid-cols-3 gap-2">
                  <button className="btn btn-primary text-sm" onClick={() => doExport("jpg")} disabled={!!exporting || !reportData}>
                    {exporting === "jpg" ? "⏳" : "🖼️"} JPG
                  </button>
                  <button className="btn text-sm bg-purple-600 text-white hover:bg-purple-700" onClick={() => doExport("png")} disabled={!!exporting || !reportData}>
                    {exporting === "png" ? "⏳" : "📋"} PNG
                  </button>
                  <button className="btn btn-secondary text-sm" onClick={() => doExport("pdf")} disabled={!!exporting || !reportData}>
                    {exporting === "pdf" ? "⏳" : "📄"} PDF
                  </button>
                </div>
              </section>
            )}

            {/* EDIT (accordion) */}
            {report && (
              <div className="space-y-2">

                {/* Narasi sesi */}
                <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <button className="w-full flex items-center justify-between p-4 text-left"
                    onClick={() => setOpenNarasi((v) => !v)}>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">✏️ Narasi Sesi</p>
                      <p className="text-xs text-gray-500 mt-0.5">{sessionsWithNarrative}/{filteredSessions.length} narasi siap</p>
                    </div>
                    <span className="text-gray-500 text-sm">{openNarasi ? "▲" : "▼"}</span>
                  </button>
                  {openNarasi && (
                    <div className="px-4 pb-4 space-y-2 border-t border-gray-100">
                      <div className="pt-3 flex gap-2">
                        <button className="btn btn-secondary text-xs"
                          onClick={handleGenerateLocalNarratives}>
                          ⚡ Generate Narasi Gratis
                        </button>
                        <span className="text-[11px] text-gray-500 self-center">
                          Isi narasi kosong dari catatan singkat/topik/perhatian tanpa AI.
                        </span>
                      </div>
                      {paginatedNarrativeSessions.map((s) => (
                        <div key={s.id} className="bg-gray-50 rounded-xl p-3 mt-2">
                          <p className="text-xs text-gray-500 mb-1">{dayLabel(s.date)} — {s.subjects.join(", ")}</p>
                          {editingNarrative === s.id ? (
                            <div className="space-y-2">
                              <textarea className="input text-sm" rows={3} value={editText}
                                onChange={(e) => setEditText(e.target.value)} />
                              <div className="flex gap-2">
                                <button className="btn btn-primary text-xs" onClick={() => saveNarrative(s.id)}>Simpan</button>
                                <button className="btn btn-secondary text-xs" onClick={() => setEditingNarrative(null)}>Batal</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start gap-2 cursor-pointer group"
                              onClick={() => { setEditText(s.narrative ?? s.shortNote); setEditingNarrative(s.id); }}>
                              <p className="text-sm text-gray-700 flex-1 group-hover:text-blue-700 transition-colors line-clamp-2">
                                {s.narrative ?? s.shortNote}
                              </p>
                              <span className={`text-xs flex-shrink-0 font-semibold px-1.5 py-0.5 rounded-full ${s.narrative ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"}`}>
                                {s.narrative ? "✓" : "Edit"}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                      <PaginationControls page={safeNarrativePage} total={filteredSessions.length}
                        onPageChange={setNarrativePage} label="narasi" />
                    </div>
                  )}
                </section>

                {/* Teks laporan */}
                <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <button className="w-full flex items-center justify-between p-4 text-left"
                    onClick={() => setOpenTeks((v) => !v)}>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-800 text-sm">📝 Teks Laporan</p>
                        {(report.summaryText || report.quote) && (
                          <span className="text-[10px] bg-indigo-50 text-indigo-500 font-bold px-1.5 py-0.5 rounded-full">✨ AI</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">Ringkasan · Catatan guru · Kutipan</p>
                    </div>
                    <span className="text-gray-500 text-sm">{openTeks ? "▲" : "▼"}</span>
                  </button>
                  {openTeks && (
                    <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
                      <div className="pt-3 flex gap-2">
                        <button className="btn btn-secondary text-xs"
                          onClick={handleGenerateLocalTexts}>
                          ⚡ Generate Teks Gratis
                        </button>
                        <span className="text-[11px] text-gray-500 self-center">
                          Isi ringkasan, catatan guru & kutipan dari data sesi tanpa AI.
                        </span>
                      </div>
                      <div className="pt-3">
                        <label htmlFor="mr-ringkasan" className="label">Ringkasan</label>
                        {editingSummary ? (
                          <div className="space-y-2">
                            <textarea id="mr-ringkasan" className="input text-sm" rows={3} value={summaryText}
                              onChange={(e) => setSummaryText(e.target.value)} />
                            <div className="flex gap-2">
                              <button className="btn btn-primary text-xs" onClick={() => saveReportField("summaryText", summaryText)}>Simpan</button>
                              <button className="btn btn-secondary text-xs" onClick={() => setEditingSummary(false)}>Batal</button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 cursor-pointer hover:bg-gray-100 min-h-[2.5rem]"
                            onClick={() => { setSummaryText(report.summaryText); setEditingSummary(true); }}>
                            {report.summaryText || <span className="text-gray-500">Klik untuk tambah ringkasan...</span>}
                          </p>
                        )}
                      </div>
                      <div>
                        <label htmlFor="mr-catatan-guru" className="label">Catatan Guru</label>
                        {editingTeacherNote ? (
                          <div className="space-y-2">
                            <textarea id="mr-catatan-guru" className="input text-sm" rows={3} value={teacherNoteText}
                              onChange={(e) => setTeacherNoteText(e.target.value)}
                              placeholder="Kemajuan terbesar periode ini dan fokus prioritas berikutnya..." />
                            <div className="flex gap-2">
                              <button className="btn btn-primary text-xs" onClick={() => saveReportField("teacherNote", teacherNoteText)}>Simpan</button>
                              <button className="btn btn-secondary text-xs" onClick={() => setEditingTeacherNote(false)}>Batal</button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 cursor-pointer hover:bg-gray-100 min-h-[2.5rem]"
                            onClick={() => { setTeacherNoteText(report.teacherNote ?? ""); setEditingTeacherNote(true); }}>
                            {report.teacherNote || <span className="text-gray-500">Klik untuk menambahkan kemajuan dan fokus prioritas...</span>}
                          </p>
                        )}
                      </div>
                      <div>
                        <label htmlFor="mr-kutipan" className="label">Kutipan</label>
                        {editingQuote ? (
                          <div className="space-y-2">
                            <input id="mr-kutipan" className="input text-sm" value={quoteText}
                              onChange={(e) => setQuoteText(e.target.value)} />
                            <div className="flex gap-2">
                              <button className="btn btn-primary text-xs" onClick={() => saveReportField("quote", quoteText)}>Simpan</button>
                              <button className="btn btn-secondary text-xs" onClick={() => setEditingQuote(false)}>Batal</button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 italic cursor-pointer hover:bg-gray-100 min-h-[2.5rem]"
                            onClick={() => { setQuoteText(report.quote ?? ""); setEditingQuote(true); }}>
                            {report.quote ? `"${report.quote}"` : <span className="text-gray-500 not-italic">Klik untuk tambah kutipan...</span>}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </section>

                <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <button className="w-full flex items-center justify-between p-4 text-left"
                    onClick={() => setOpenPlan((value) => !value)}>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-800 text-sm">🎯 Fokus & Rencana Berikutnya</p>
                        {hasPlan && <span className="text-[10px] bg-green-50 text-green-600 font-bold px-1.5 py-0.5 rounded-full">Siap</span>}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {hasPlan ? `${report.nextMonthPlan!.priorities.filter((item) => item.target.trim()).length} prioritas terukur` : "Tetapkan maksimal 3 prioritas yang bisa ditindaklanjuti."}
                      </p>
                    </div>
                    <span className="text-gray-500 text-sm">{openPlan ? "▲" : "▼"}</span>
                  </button>
                  {openPlan && (
                    <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
                      {editingPlan ? (
                        <NextMonthPlanEditor
                          initialPlan={report.nextMonthPlan}
                          onSave={saveNextMonthPlan}
                          onCancel={() => setEditingPlan(false)}
                        />
                      ) : (
                        <>
                          {hasPlan ? (
                            <div className="space-y-2 pt-3">
                              {report.nextMonthPlan!.priorities.filter((item) => item.target.trim()).slice(0, 3).map((item, index) => (
                                <div key={item.id} className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-sm font-semibold text-gray-800">{index + 1}. {item.subject || `Prioritas ${index + 1}`}</p>
                                    <span className="text-[10px] font-semibold rounded-full bg-white text-indigo-600 px-2 py-0.5">
                                      {PLAN_STATUSES.find((status) => status.value === item.status)?.label ?? "Belum dimulai"}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-700 mt-1">{item.target}</p>
                                  {item.evidence && <p className="text-xs text-gray-500 mt-1.5">Dasar: {item.evidence}</p>}
                                  {(item.tutorAction || item.successMetric || item.cadence) && (
                                    <p className="text-xs text-indigo-700 mt-1.5">
                                      {item.tutorAction && `Tutor: ${item.tutorAction}`}
                                      {item.tutorAction && (item.successMetric || item.cadence) && " · "}
                                      {item.successMetric && `Cek: ${item.successMetric}`}
                                      {item.successMetric && item.cadence && " · "}
                                      {item.cadence}
                                    </p>
                                  )}
                                </div>
                              ))}
                              {report.nextMonthPlan?.parentSupport && (
                                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                                  <strong>Dukungan di rumah:</strong> {report.nextMonthPlan.parentSupport}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="pt-3 text-sm text-gray-500">Belum ada rencana. Mulai dari target yang spesifik, cara belajar, dan indikator keberhasilan.</p>
                          )}
                          <button className="btn btn-secondary w-full text-sm" onClick={() => setEditingPlan(true)}>
                            {hasPlan ? "✏️ Edit Rencana" : "＋ Susun Rencana"}
                          </button>
                          {settings?.ai?.enabled && settings.ai.apiKey && (
                            <button className="btn w-full text-sm bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 disabled:opacity-50"
                              onClick={() => setShowPolishModal(true)} disabled={aiLoading || !availability.ok}
                              title="AI akan buatkan ringkasan + kutipan + rencana depan">
                              {aiLoading ? "⏳ AI..." : "🤖 Generate AI"}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </section>

              </div>
            )}
          </div>

      </div>

      {/* Bantuan hubungan laporan perkembangan dan penagihan */}
      {showBillingHelp && (
        <Modal onClose={() => setShowBillingHelp(false)} ariaLabel="Hubungan laporan perkembangan dan penagihan"
          panelClassName="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl outline-none">
          <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Laporan dan Penagihan</h2>
              <p className="mt-0.5 text-xs text-gray-600">Dua proses terpisah yang menggunakan sesi belajar yang sama.</p>
            </div>
            <button onClick={() => setShowBillingHelp(false)} aria-label="Tutup"
              className="text-xl leading-none text-gray-500 hover:text-gray-700">✕</button>
          </div>

          <div className="space-y-4 overflow-y-auto px-5 py-4 text-sm text-gray-700">
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">Pilihan Periode Belajar</h3>
              <ul className="mt-2 space-y-2 text-xs leading-relaxed">
                <li><strong>Bulan Kalender</strong> — semua sesi dalam satu bulan, misalnya Oktober 2026.</li>
                <li><strong>Jumlah Sesi</strong> — sejumlah sesi tertua yang belum masuk laporan final.</li>
                <li><strong>Rentang Tanggal</strong> — tanggal awal–akhir bebas, termasuk periode yang melewati pergantian bulan.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">Siklus Tagihan Murid</h3>
              <ul className="mt-2 space-y-2 text-xs leading-relaxed">
                <li><strong>Bulanan</strong> — gabung sesi yang dapat ditagih lewat Tutup Bulan.</li>
                <li><strong>Paket per N pertemuan</strong> — tagihan setiap N pertemuan (8, 10, 12, dst). Sesi tertua ditagih lebih dulu; sisa yang belum genap ditagih lewat <em>Tagihan Penutup</em>.</li>
                <li><strong>Manual</strong> — buat tagihan nominal bebas tanpa mengambil sesi otomatis.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">Penting</h3>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-relaxed">
                <li><strong>Draft</strong> masih bisa diubah atau dihapus. <strong>Final</strong> mengunci periode laporan.</li>
                <li>Finalisasi laporan <strong>tidak membuat invoice</strong>. Buka Keuangan → Penagihan untuk menerbitkan atau memeriksa tagihan.</li>
                <li>Bulan yang sudah <strong>Tutup Buku</strong> tidak bisa masuk laporan baru.</li>
                <li>Sesi yang sudah masuk laporan final tidak akan dipakai ulang oleh laporan lain.</li>
              </ul>
            </section>
          </div>

          <div className="border-t border-gray-100 px-5 py-3">
            <button onClick={() => setShowBillingHelp(false)}
              className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-700">
              Mengerti
            </button>
          </div>
        </Modal>
      )}

      {/* Ringkasan AI cost modal */}
      <AiCostModal
        open={showPolishModal}
        title="✨ Ringkasan AI — Ringkasan, Kutipan & Rencana Depan"
        estimatedIDR={estimateReportSummaryCost(reportSessions.length)}
        description={`${reportSessions.length} sesi · ringkasan periode + kutipan + rencana depan untuk ${student?.name ?? "murid"}. Bila tidak ada perubahan sesi, akan dilewati otomatis.`}
        extraContent={
          <label className="flex items-start gap-2 mt-3 text-xs text-gray-600 cursor-pointer select-none">
            <input type="checkbox" checked={forceSummary} onChange={(e) => setForceSummary(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-indigo-600" />
            <span>Tulis ulang paksa ringkasan (abaikan hemat token)</span>
          </label>
        }
        onCancel={() => { setShowPolishModal(false); setForceSummary(false); }}
        onConfirm={() => { setShowPolishModal(false); const f = forceSummary; setForceSummary(false); handlePolish(f); }}
      />

      {/* Narasi AI cost modal */}
      <AiCostModal
        open={showNarrativesModal}
        title={forceNarratives
          ? "Narasi AI — Tulis Ulang Semua Sesi"
          : narrativeDirtyCount === 0
            ? "Narasi AI — Semua Sudah Terbaru"
            : `Narasi AI — ${narrativeDirtyCount} Sesi Berubah`}
        estimatedIDR={estimateNarrativesCost(forceNarratives ? reportSessions.length : narrativeDirtyCount)}
        description={forceNarratives
          ? `Perluas shortNote jadi narasi 40–60 kata untuk SEMUA ${reportSessions.length} sesi + ringkasan, catatan guru, kutipan & rencana depan.`
          : `${narrativeDirtyCount} dari ${reportSessions.length} sesi akan dikirim ulang · ${reportSessions.length - narrativeDirtyCount} narasi lain (termasuk edit manual tutor) dipertahankan. Ringkasan tidak diubah.`}
        extraContent={
          <label className="flex items-start gap-2 mt-3 text-xs text-gray-600 cursor-pointer select-none">
            <input type="checkbox" checked={forceNarratives} onChange={(e) => setForceNarratives(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-indigo-600" />
            <span>Tulis ulang paksa semua narasi (lewati hemat token)</span>
          </label>
        }
        onCancel={() => { setShowNarrativesModal(false); setForceNarratives(false); }}
        onConfirm={() => { setShowNarrativesModal(false); const f = forceNarratives; setForceNarratives(false); handleGenerateNarratives(f); }}
      />
    </div>
  );
}

