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
import { billingPolicyOf, reportStatus, type ReportStatus } from "../db/types";
import { monthRange, packageCoveredSessionIds } from "../db/repos/helpers";
import { pickTemplate } from "../lib/rotation";
import { generateReportSummary, generateNarratives, estimateReportSummaryCost, estimateNarrativesCost } from "../lib/aiClient";
import {
  buildReportAiInput,
  findBlockingReportOverlap,
  resolveReportMutationTarget,
  selectCountReportSessions,
  selectPeriodReportSessions,
  shouldUseStoredReportSnapshot,
  currentPackageSessionRange,
} from "../lib/reportSessionScope";
import { AiCostModal } from "../components/AiCostModal";
import Modal from "../components/Modal";
import { getTheme, THEMES } from "../template/themes";
import { LAYOUTS } from "../template/layouts";
import { ReportRenderer } from "../template/ReportRenderer";
import { dayLabel, monthLabel, todayWIB, monthOf, periodLabel, formatRupiah } from "../lib/format";
import { exportJpeg, exportPng, exportPdf, shareFiles } from "../lib/exportReport";
import { blobToDataUrl } from "../lib/imageUtils";
import PaginationControls from "../components/PaginationControls";
import Breadcrumb from "../components/Breadcrumb";
import { clampPage, paginateItems } from "../lib/pagination";
import { calcEngagementScore, scoreLabel } from "../lib/engagement";
import type {
  ReportOptions, CustomTheme, Theme,
  HeaderStyle, LabelStyle, PhotoStyle, DecoKind,
} from "../template/types";
import type { MonthlyReport, NextMonthPlan, MonthlyPlanItem, PlanOwner, PlanStatus, Session } from "../db/types";
import { db } from "../db/db";

const EMPTY_SUBJECT_LABEL = "Mapel belum diisi";
const PLAN_OWNERS: Array<{ value: PlanOwner; label: string }> = [
  { value: "shared", label: "Bersama" },
  { value: "tutor", label: "Tutor" },
  { value: "student", label: "Murid" },
  { value: "parent", label: "Orang tua" },
];
const PLAN_STATUSES: Array<{ value: PlanStatus; label: string }> = [
  { value: "planned", label: "Belum dimulai" },
  { value: "in_progress", label: "Berjalan" },
  { value: "achieved", label: "Tercapai" },
];

function newPlanItem(): MonthlyPlanItem {
  return {
    id: crypto.randomUUID(),
    subject: "",
    target: "",
    owner: "shared",
    status: "planned",
  };
}

function createEmptyPlan(): NextMonthPlan {
  return { priorities: [newPlanItem()], parentSupport: "" };
}

function normaliseAiPlan(plan?: {
  priorities?: Array<Partial<Omit<MonthlyPlanItem, "id">>>;
  parentSupport?: string;
}): NextMonthPlan | undefined {
  const priorities = (plan?.priorities ?? [])
    .filter((item) => item.target?.trim())
    .slice(0, 3)
    .map((item) => ({
      id: crypto.randomUUID(),
      subject: item.subject?.trim() || EMPTY_SUBJECT_LABEL,
      evidence: item.evidence?.trim(),
      target: item.target!.trim(),
      tutorAction: item.tutorAction?.trim(),
      successMetric: item.successMetric?.trim(),
      cadence: item.cadence?.trim(),
      owner: PLAN_OWNERS.some((owner) => owner.value === item.owner) ? item.owner : "shared",
      status: "planned" as const,
    }));
  if (priorities.length === 0) return undefined;
  return { priorities, parentSupport: plan?.parentSupport?.trim(), updatedAt: new Date().toISOString() };
}

function cleanText(value?: string): string {
  return value?.trim() ?? "";
}

function formatHours(hours: number): string {
  const normalized = Number.isInteger(hours) ? String(hours) : String(hours).replace(".", ",");
  return `${normalized} jam`;
}

function sessionSubjectLabel(subjects: string[]): string {
  const cleanSubjects = subjects.map((subject) => subject.trim()).filter(Boolean);
  return cleanSubjects.length > 0 ? cleanSubjects.join(", ") : EMPTY_SUBJECT_LABEL;
}

function sessionTimeLabel(session: Session): string | undefined {
  if (session.timeIn && session.timeOut) return `${session.timeIn}-${session.timeOut}`;
  if (session.time) return `Jam ${session.time}`;
  return undefined;
}

function buildSessionNarrative(session: Session, subject: string): string {
  const baseNote = cleanText(session.narrative) || cleanText(session.shortNote);
  const extraNotes = [
    cleanText(session.topic) ? `Topik yang dibahas: ${cleanText(session.topic)}.` : undefined,
    cleanText(session.needsWork) ? `Area perhatian: ${cleanText(session.needsWork)}.` : undefined,
  ].filter((note): note is string => Boolean(note));

  if (baseNote && extraNotes.length > 0) return `${baseNote} ${extraNotes.join(" ")}`;
  if (baseNote) return baseNote;
  if (extraNotes.length > 0) return extraNotes.join(" ");
  // Fallback netral — teks ini ikut tercetak di laporan orang tua, jangan berisi instruksi untuk tutor
  return `Sesi ${subject} berlangsung selama ${formatHours(session.durationHours)}.`;
}

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
  const [showBillingHelp,   setShowBillingHelp]   = useState(false);
  const [prevTexts,        setPrevTexts]        = useState<{
    summaryText: string;
    teacherNote?: string;
    quote?: string;
    nextMonthPlan?: NextMonthPlan;
    /** Narasi per sesi sebelum ditimpa AI — untuk Undo penuh. */
    narratives?: Array<{ id: string; narrative?: string }>;
  } | null>(null);
  const [quoteText,        setQuoteText]        = useState("");
  const [aiLoading,        setAiLoading]        = useState(false);
  const aiRequestRef = useRef(0);
  const [reportMutationBusy, setReportMutationBusy] = useState(false);
  const reportMutationBusyRef = useRef(false);
  const [message,          setMessage]          = useState("");
  const [exporting,        setExporting]        = useState<"jpg" | "png" | "pdf" | null>(null);
  const reportExportRef = useRef<HTMLDivElement>(null);
  const [openNarasi,       setOpenNarasi]       = useState(false);
  const [openTeks,         setOpenTeks]         = useState(false);
  const [openPlan,         setOpenPlan]         = useState(false);
  const [editingPlan,      setEditingPlan]      = useState(false);
  const [narrativePage,    setNarrativePage]    = useState(1);
  const [subjectFilter,    setSubjectFilter]    = useState<string>("");

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
  const scopePaymentQuery = useLiveQuery(async () => ({
    reportId: scopeReport?.id ?? "",
    payment: scopeReport ? await getPaymentByReport(scopeReport.id) : undefined,
  }), [scopeReport?.id]);
  const scopePaymentLookupReady = !scopeReport || scopePaymentQuery?.reportId === scopeReport.id;
  const scopePayment = scopePaymentLookupReady ? scopePaymentQuery?.payment : undefined;
  const scopeHasProtectedInvoice = Boolean(
    scopeReport
    && reportStatus(scopeReport) === "confirmed"
    && scopePayment
    && (scopePayment.status === "PAID" || scopePayment.source === "manual")
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
  const blockedSessionIds = useMemo(() => {
    const otherConfirmedReports = (confirmedReports ?? [])
      .filter((candidate) => candidate.id !== scopeReport?.id);
    if (sessionCountPackage) {
      return packageCoveredSessionIds(otherConfirmedReports, studentPayments ?? []);
    }
    return new Set(otherConfirmedReports.flatMap((candidate) => candidate.sessionIds));
  }, [sessionCountPackage, confirmedReports, studentPayments, scopeReport]);

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
  const invalidReportLink = Boolean(editingReportId && editingReportLookupReady && !editingReport);
  const reportScopeDataReady = sessions !== undefined
    && confirmedReports !== undefined
    && (!sessionCountPackage || studentPayments !== undefined)
    && closings !== undefined
    && fixedPeriodLookupReady
    && periodReportLookupReady
    && scopePaymentLookupReady
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
      confirmedReports ?? [],
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
  }, [studentId, periodStart, periodEnd, invalidReportLink, reportScopeDataReady, confirmedReports, closings, report, mode, rangeStart, rangeEnd, reportSessions.length, reportSessionIds, reportTargetCount, student]);

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
  // Kontrol export: jumlah sesi per halaman + rasio halaman.
  // Default 3:4 potret agar gambar tidak terpotong di WhatsApp.
  // Default 3 sesi/halaman agar konten muat dalam rasio 3:4 tanpa terpotong.
  const [entriesPerPage, setEntriesPerPage] = useState(3);
  const [pageRatio, setPageRatio] = useState<"3:4" | "auto">("3:4");

  const reportOptions: ReportOptions = { coverPage, showEngagement: true, entriesPerPage, pageRatio };

  // ReportData — async photo normalization + engagement
  const [reportData, setReportData] = useState<import("../template/types").ReportData | null>(null);

  // Every report scope owns its own preview, edit buffers, undo data, and AI
  // request. Changing student/month/mode/count cannot leak results from the
  // previous selection into the newly-visible report.
  useEffect(() => {
    aiRequestRef.current += 1;
    setAiLoading(false);
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
  }, [reportScopeKey]);

  useEffect(() => {
    if (!student || reportSessions.length === 0) { setReportData(null); return; }
    setReportData(null);
    let cancelled = false;
    (async () => {
      const logoUrl = settings?.logo ? await blobToDataUrl(settings.logo) : undefined;
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
            signatureUrl: s.signature ? await blobToDataUrl(s.signature) : undefined,
            engagementScore: engScore,
            engagementLabel: engLabel,
          };
        })
      );
      const scores = entries.filter((e) => e.engagementScore != null).map((e) => e.engagementScore!);
      const avgEngagement = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : undefined;
      const photoUrls = entries.filter((e) => e.photoUrl).map((e) => e.photoUrl!);
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
        photoUrls,
        totalHours,
        totalSessions: entries.length,
        subjectDist,
        // entries sudah kronologis → seri fokus langsung searah waktu
        engagementSeries: scores,
      });
    })();
    return () => { cancelled = true; };
  }, [student, reportSessions, month, periodStart, periodEnd, report, reportBillingMode, settings, totalHours]);

  const safeNarrativePage      = clampPage(narrativePage, filteredSessions.length);
  const paginatedNarrativeSessions = paginateItems(filteredSessions, safeNarrativePage);

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
      // Kalau sudah disahkan, tagihan ikut disesuaikan.
      if (reportStatus(current) === "confirmed") await syncReportPayment(refreshed);
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
    // Draft belum terbitkan tagihan — baru setelah ditekan Sahkan.
    current = await getReportById(result.reportId);
    return current;
  };

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
          ? "Laporan draft dibuat. Tekan Sahkan bila sudah yakin — tagihan akan terbit di Keuangan."
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
        if (isConfirmed) await syncReportPayment(updated);
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
        if (isConfirmed) await syncReportPayment(updated);
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
    aiRequestRef.current += 1;
    setAiLoading(false);
    leaveEditingReport();
  };

  const handleConfirm = async () => {
    if (!report) return;
    if (!availability.ok) { setMessage("Gagal: " + availability.reason); return; }
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
      await syncReportPayment(refreshed);
      lockReportSnapshot(refreshed);
      setMessage("Laporan disahkan! Tagihan sudah terbit di Keuangan. ✅");
    } catch (e) { setMessage("Error: " + (e as Error).message); }
  };

  const handleDiscard = async () => {
    if (!report) return;
    if (reportStatus(report) === "confirmed") {
      setMessage("Gagal: Laporan yang sudah disahkan tidak bisa dibatalkan begitu saja. Kalau perlu, hapus tagihannya dulu dari Keuangan.");
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

  const handlePolish = async () => {
    if (!student || reportSessions.length === 0) return;
    if (!navigator.onLine) { setMessage("Offline."); return; }
    const requestId = ++aiRequestRef.current;
    const selectedSessions = reportSessions;
    setAiLoading(true);
    try {
      const draft = await ensureReport();
      if (!draft || requestId !== aiRequestRef.current) return;
      const out = await generateReportSummary(buildReportAiInput(
        student,
        periodLabel(periodStart, periodEnd) || monthLabel(month),
        selectedSessions,
      ));
      if (requestId !== aiRequestRef.current) return;
      const prev = { summaryText: draft.summaryText, quote: draft.quote, nextMonthPlan: draft.nextMonthPlan };
      const aiPlan = normaliseAiPlan(out.nextMonthPlan);
      await upsertReport({
        ...draft,
        summaryText: out.summary ?? "",
        quote: out.quote,
        nextMonthPlan: aiPlan ?? draft.nextMonthPlan,
      });
      if (requestId !== aiRequestRef.current) return;
      setPrevTexts(prev);
      setMessage("Poles AI selesai ✓ Ringkasan, kutipan & rencana depan terisi");
      setOpenTeks(true);
      setOpenPlan(true);
    } catch (e) {
      if (requestId === aiRequestRef.current) setMessage("Gagal: " + (e as Error).message);
    } finally {
      if (requestId === aiRequestRef.current) setAiLoading(false);
    }
  };

  /** Narasi AI penuh: perluas shortNote tiap sesi jadi narasi 40–60 kata,
   *  plus ringkasan, catatan guru, dan kutipan. Semua bisa di-Undo. */
  const handleGenerateNarratives = async () => {
    if (!student || reportSessions.length === 0) return;
    if (!navigator.onLine) { setMessage("Offline."); return; }
    const requestId = ++aiRequestRef.current;
    const selectedSessions = reportSessions;
    setAiLoading(true);
    try {
      const draft = await ensureReport();
      if (!draft || requestId !== aiRequestRef.current) return;
      const out = await generateNarratives(buildReportAiInput(
        student,
        periodLabel(periodStart, periodEnd) || monthLabel(month),
        selectedSessions,
      ));
      if (requestId !== aiRequestRef.current) return;

      // Simpan versi lama SEBELUM menimpa — untuk Undo penuh
      const prevNarratives = selectedSessions.map((s) => ({ id: s.id, narrative: s.narrative }));

      const validIds = new Set(selectedSessions.map((s) => s.id));
      let applied = 0;
      for (const entry of out.entries ?? []) {
        if (requestId !== aiRequestRef.current) return;
        if (validIds.has(entry.id) && entry.narrative?.trim()) {
          await updateSession(entry.id, { narrative: entry.narrative.trim() });
          if (requestId !== aiRequestRef.current) return;
          applied++;
        }
      }
      if (requestId !== aiRequestRef.current) return;
      const aiPlan = normaliseAiPlan(out.nextMonthPlan);
      await upsertReport({
        ...draft,
        summaryText: out.summary?.trim() || draft.summaryText,
        teacherNote: out.teacherNote?.trim() || draft.teacherNote,
        quote: out.quote?.trim() || draft.quote,
        nextMonthPlan: aiPlan ?? draft.nextMonthPlan,
      });
      if (requestId !== aiRequestRef.current) return;
      setPrevTexts({
        summaryText: draft.summaryText, teacherNote: draft.teacherNote,
        quote: draft.quote, nextMonthPlan: draft.nextMonthPlan, narratives: prevNarratives,
      });
      setMessage(`Narasi AI selesai ✓ ${applied} narasi sesi + ringkasan & kutipan terisi`);
      setOpenNarasi(true);
      setOpenPlan(true);
    } catch (e) {
      if (requestId === aiRequestRef.current) setMessage("Gagal: " + (e as Error).message);
    } finally {
      if (requestId === aiRequestRef.current) setAiLoading(false);
    }
  };

  /** Generate narasi sesi GRATIS dari data yang sudah ada (tanpa AI). */
  const handleGenerateLocalNarratives = async () => {
    if (!report || reportSessions.length === 0) return;
    let applied = 0;
    for (const s of reportSessions) {
      if (s.narrative?.trim()) continue;
      const narrative = buildSessionNarrative(s, sessionSubjectLabel(s.subjects)).trim();
      if (narrative) {
        await updateSession(s.id, { narrative });
        applied++;
      }
    }
    setMessage(`⚡ ${applied} narasi sesi dibuat otomatis (gratis) ✓`);
    setOpenNarasi(true);
  };

  /** Generate ringkasan/catatan guru/kutipan GRATIS dari data sesi (tanpa AI). */
  const handleGenerateLocalTexts = async () => {
    if (!student || !report || reportSessions.length === 0) return;
    const draft = await ensureReport();
    if (!draft) return;

    const subjects = [...new Set(reportSessions.flatMap((s) => s.subjects.map((x) => x.trim()).filter(Boolean)))];
    const topics = reportSessions.map((s) => cleanText(s.topic)).filter(Boolean).slice(0, 3);
    const needs = reportSessions.map((s) => cleanText(s.needsWork)).filter(Boolean).slice(0, 3);
    const period = periodLabel(periodStart, periodEnd) || monthLabel(month);

    const summary = [
      `Periode ${period} berisi ${reportSessions.length} sesi (${totalHours} jam) untuk ${subjects.join(", ") || "materi yang dipelajari"}.`,
      topics.length > 0 ? `Topik yang dibahas antara lain ${topics.join(", ")}.` : undefined,
      avgEngagement != null ? `Rata-rata fokus ${avgEngagement}/10.` : undefined,
      needs.length > 0 ? `Area yang masih perlu perhatian: ${needs.join("; ")}.` : undefined,
    ].filter((line): line is string => Boolean(line)).join(" ");

    const teacherNote = [
      `Kemajuan terbesar terlihat dari konsistensi ${reportSessions.length} sesi pada periode ini.`,
      needs.length > 0 ? `Fokus berikutnya: ${needs[0]}.` : "Lanjutkan latihan topik yang sudah dibahas.",
    ].join(" ");

    const quote = `Terus semangat, ${student.name}! Setiap sesi membawa kamu selangkah lebih dekat ke targetmu.`;

    await upsertReport({
      ...draft,
      summaryText: draft.summaryText?.trim() || summary,
      teacherNote: draft.teacherNote?.trim() || teacherNote,
      quote: draft.quote?.trim() || quote,
    });
    setMessage("⚡ Teks laporan dibuat otomatis (gratis) ✓");
    setOpenTeks(true);
  };

  const doExport = async (type: "jpg" | "png" | "pdf") => {
    if (!student || !report || !reportData || exporting) return;
    setExporting(type);
    setMessage("");
    const base = `Laporan-${student.name}-${periodLabel(periodStart, periodEnd) || monthLabel(month)}`.replace(/\s+/g, "-");
    const exportRoot = reportExportRef.current ?? document;
    // PDF memakai tinggi otomatis (auto) — sudah cukup oke. JPG/PNG memakai
    // rasio yang dipilih (default 3:4) agar tidak terpotong di WhatsApp.
    const prevRatio = pageRatio;
    if (type === "pdf" && prevRatio !== "auto") setPageRatio("auto");
    try {
      // Tunggu re-render bila rasio diubah untuk PDF.
      if (type === "pdf" && prevRatio !== "auto") {
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
      }
      if (type === "jpg") await shareFiles(await exportJpeg(base, exportRoot), base);
      else if (type === "png") await shareFiles(await exportPng(base, exportRoot), base);
      else await shareFiles([await exportPdf(base, exportRoot)], base);
      await upsertReport({ ...report, pdfGeneratedAt: new Date().toISOString() });
      setMessage(`✓ File ${type.toUpperCase()} diunduh`);
    } catch (e) {
      setMessage("Gagal ekspor: " + (e as Error).message);
    } finally {
      if (type === "pdf" && prevRatio !== "auto") setPageRatio(prevRatio);
      setExporting(null);
    }
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
                    <p className="text-[11px] font-semibold text-amber-700">📋 {drafts.length} laporan draft — belum disahkan</p>
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
                    <label className="label">Mode Rekap</label>
                    <button
                      type="button"
                      onClick={() => setShowBillingHelp(true)}
                      aria-label="Bantuan cara kerja laporan dan tagihan"
                      title="Cara kerja laporan & tagihan"
                      className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600 transition-colors hover:bg-blue-100 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >?</button>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {([["bulan", "🗓 Bulan"], ["jumlah", "🔢 Jumlah"], ["range", "📅 Rentang"]] as const).map(([m, label]) => (
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
                        className={`text-xs font-semibold rounded-lg py-2 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${mode === m ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  {mode === "bulan" && (
                    <>
                      <label htmlFor="mr-bulan" className="label">Bulan</label>
                      <input id="mr-bulan" className="input" type="month" value={month} onChange={(e) => {
                        beginControlScopeChange();
                        setMonth(e.target.value);
                      }} />
                    </>
                  )}
                  {mode === "jumlah" && (
                    <>
                      <label htmlFor="mr-jumlah" className="label">Jumlah Pertemuan</label>
                      <input id="mr-jumlah" className="input" type="number" min={1} max={20} value={reportTargetCount}
                        disabled={Boolean(student && billingPolicyOf(student) === "session_count")}
                        onChange={(e) => {
                          beginControlScopeChange();
                          setCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)));
                        }} />
                      <p className="text-[11px] text-gray-500 mt-1">
                        {student && billingPolicyOf(student) === "session_count"
                          ? "Mengambil N pertemuan tertua yang belum ditagih. Tagihan baru dapat disahkan setelah kuota lengkap."
                          : "Mengambil N pertemuan tertua yang belum direkap sebagai laporan periode."}
                      </p>
                      {student && billingPolicyOf(student) === "session_count" && (
                        <div className="mt-1 space-y-1.5">
                          <p className="text-[11px] font-semibold text-indigo-600">
                            Siklus murid dikunci pada {student.billingSessionCount ?? 8} pertemuan. Terbitkan tagihan paket melalui Keuangan agar sesi diklaim secara atomik.
                          </p>
                          {(!report || reportStatus(report) !== "confirmed") && (
                            <Link
                              to={`/payments?tab=tagihan&studentId=${encodeURIComponent(student.id)}`}
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
                  Periode: <strong>{periodLabel(periodStart, periodEnd)}</strong>
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

                  {/* Status tagihan / laporan */}
                  {report && reportStatus(report) === "draft" && (
                    <div className="rounded-lg px-3 py-2 text-sm bg-blue-50 text-blue-700 flex items-center justify-between">
                      <span className="font-semibold">
                        📋 Draft{report.billingMode === "session_count" ? ` Paket ${reportSessions.length}/${reportTargetCount} sesi` : ""} — belum disahkan
                      </span>
                      <span className="font-bold">{formatRupiah(totalCost)}</span>
                    </div>
                  )}
                  {report && reportStatus(report) === "confirmed" && payment && (
                    <div className={`rounded-lg px-3 py-2 text-sm flex items-center justify-between ${payment.status === "PAID" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                      <span className="font-semibold">
                        {payment.status === "PAID" ? "✓ Tagihan Lunas" : "💳 Tagihan Belum Dibayar"}
                        {report.billingMode === "session_count" ? ` · Paket ${report.billingSessionCount ?? report.sessionIds.length}` : ""}
                      </span>
                      <span className="font-bold">{formatRupiah(payment.totalCost)}</span>
                    </div>
                  )}
                  {report && reportStatus(report) === "confirmed" && !payment && (
                    <p className="text-[11px] text-gray-400">Tagihan tidak ditemukan — coba Sahkan ulang atau hubungi dukungan.</p>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2 flex-wrap">
                    <button className="btn btn-primary flex-1 text-sm disabled:opacity-40" disabled={!availability.ok || reportMutationBusy}
                      onClick={() => handleCreateOrSwitch()}>
                      {reportMutationBusy ? "Memproses..." : report ? (reportStatus(report) === "confirmed" ? "🔄 Update Laporan" : "✏️ Update Draft") : "📝 Buat Laporan"}
                    </button>
                    {report && reportStatus(report) === "draft" && (
                      <button className="btn flex-1 text-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40" disabled={!availability.ok}
                        onClick={handleConfirm}>
                        ✅ Sahkan & Terbitkan Tagihan
                      </button>
                    )}
                  </div>
                  {report && reportStatus(report) === "draft" && (
                    <p className="text-[11px] text-gray-500">
                      Sahkan = kunci periode & terbitkan tagihan di Keuangan. <strong>Belum</strong> mengirim ke orang tua dan <strong>belum</strong> menandai dibayar.
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
                        title="Perkuat narasi 40–60 kata per sesi dengan AI (setelah laporan dibuat)">
                        {aiLoading ? "⏳ AI..." : "📖 Perkuat Narasi AI"}
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
                <details className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 space-y-2.5 group" open={false}>
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
                      ? "Rasio 3:4 membuat gambar tidak terlalu tinggi sehingga tidak terpotong saat dikirim ke WhatsApp."
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

      {/* Bantuan cara kerja laporan & tagihan */}
      {showBillingHelp && (
        <Modal onClose={() => setShowBillingHelp(false)} ariaLabel="Cara kerja laporan dan tagihan"
          panelClassName="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl outline-none">
          <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Cara Kerja Laporan & Tagihan</h2>
              <p className="mt-0.5 text-xs text-gray-600">Pahami mode rekap dan siklus tagihan murid.</p>
            </div>
            <button onClick={() => setShowBillingHelp(false)} aria-label="Tutup"
              className="text-xl leading-none text-gray-500 hover:text-gray-700">✕</button>
          </div>

          <div className="space-y-4 overflow-y-auto px-5 py-4 text-sm text-gray-700">
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">Mode Rekap</h3>
              <ul className="mt-2 space-y-2 text-xs leading-relaxed">
                <li><strong>🗓 Bulan</strong> — rekap satu bulan kalender penuh. Untuk murid Bulanan, tagihan terbit lewat <em>Tutup Bulan</em> di Keuangan.</li>
                <li><strong>🔢 Jumlah</strong> — N pertemuan tertua. Untuk murid <em>Paket per N pertemuan</em>, ini pratinjau paket (pengesahan &amp; invoice dilakukan dari Keuangan). Untuk murid Bulanan/Manual, ini menjadi laporan rentang tanggal.</li>
                <li><strong>📅 Rentang</strong> — pilih tanggal awal–akhir bebas, mis. minggu ke-4 September s/d akhir Oktober.</li>
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
                <li><strong>Draft</strong> belum sah dan bisa dihapus. <strong>Sahkan</strong> = tagihan langsung terbit di Keuangan.</li>
                <li>Bulan yang sudah <strong>Tutup Buku</strong> tidak bisa masuk laporan baru.</li>
                <li>Sesi yang sudah masuk laporan sah tidak akan ditagih dua kali.</li>
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
        description={`${reportSessions.length} sesi · ringkasan periode + kutipan + rencana depan untuk ${student?.name ?? "murid"}`}
        onCancel={() => setShowPolishModal(false)}
        onConfirm={() => { setShowPolishModal(false); handlePolish(); }}
      />

      {/* Narasi AI cost modal */}
      <AiCostModal
        open={showNarrativesModal}
        title="Narasi AI — Semua Sesi"
        estimatedIDR={estimateNarrativesCost(reportSessions.length)}
        description={`Perluas shortNote jadi narasi 40–60 kata untuk ${reportSessions.length} sesi + ringkasan, catatan guru, kutipan & rencana depan. Narasi lama ditimpa (bisa di-Undo).`}
        onCancel={() => setShowNarrativesModal(false)}
        onConfirm={() => { setShowNarrativesModal(false); handleGenerateNarratives(); }}
      />
    </div>
  );
}

// ── Custom Theme Builder ─────────────────────────────────────────────

function NextMonthPlanEditor({ initialPlan, onSave, onCancel }: {
  initialPlan?: NextMonthPlan;
  onSave: (plan: NextMonthPlan) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<NextMonthPlan>(() => initialPlan
    ? {
      priorities: initialPlan.priorities.length > 0 ? initialPlan.priorities.map((item) => ({ ...item })) : [newPlanItem()],
      parentSupport: initialPlan.parentSupport ?? "",
      updatedAt: initialPlan.updatedAt,
    }
    : createEmptyPlan());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const updateItem = (id: string, patch: Partial<MonthlyPlanItem>) => {
    setDraft((plan) => ({
      ...plan,
      priorities: plan.priorities.map((item) => item.id === id ? { ...item, ...patch } : item),
    }));
  };

  const removeItem = (id: string) => {
    setDraft((plan) => ({
      ...plan,
      priorities: plan.priorities.length === 1 ? plan.priorities : plan.priorities.filter((item) => item.id !== id),
    }));
  };

  const save = async () => {
    const priorities = draft.priorities
      .map((item) => ({
        ...item,
        subject: item.subject.trim(),
        evidence: item.evidence?.trim(),
        target: item.target.trim(),
        tutorAction: item.tutorAction?.trim(),
        successMetric: item.successMetric?.trim(),
        cadence: item.cadence?.trim(),
      }))
      .filter((item) => item.target);
    if (priorities.length === 0) {
      setError("Isi minimal satu target belajar yang spesifik.");
      return;
    }
    setSaving(true);
    try {
      await onSave({ priorities, parentSupport: draft.parentSupport?.trim() });
    } catch (e) {
      setError("Gagal menyimpan: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 pt-3">
      <div className="rounded-xl bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
        Pilih maksimal tiga prioritas. Buat target yang dapat dilihat hasilnya, bukan hanya “lebih memahami materi”.
      </div>
      {draft.priorities.map((item, index) => (
        <div key={item.id} className="rounded-xl border border-gray-200 p-3 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-gray-700">Prioritas {index + 1}</p>
            {draft.priorities.length > 1 && (
              <button type="button" className="text-xs font-semibold text-red-500" onClick={() => removeItem(item.id)}>Hapus</button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor={`mr-mapel-${item.id}`} className="label">Mapel / area</label>
              <input id={`mr-mapel-${item.id}`} className="input text-sm" value={item.subject}
                placeholder="Contoh: Matematika AA"
                onChange={(event) => updateItem(item.id, { subject: event.target.value })} />
            </div>
            <div>
              <label htmlFor={`mr-penanggung-jawab-${item.id}`} className="label">Penanggung jawab</label>
              <select id={`mr-penanggung-jawab-${item.id}`} className="input text-sm" value={item.owner ?? "shared"}
                onChange={(event) => updateItem(item.id, { owner: event.target.value as PlanOwner })}>
                {PLAN_OWNERS.map((owner) => <option key={owner.value} value={owner.value}>{owner.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor={`mr-target-${item.id}`} className="label">Target terukur *</label>
            <textarea id={`mr-target-${item.id}`} className="input text-sm" rows={2} value={item.target}
              placeholder="Contoh: Menyelesaikan 8 dari 10 soal fungsi kuadrat dengan langkah lengkap."
              onChange={(event) => updateItem(item.id, { target: event.target.value })} />
          </div>
          <div>
            <label htmlFor={`mr-dasar-${item.id}`} className="label">Dasar dari periode ini</label>
            <textarea id={`mr-dasar-${item.id}`} className="input text-sm" rows={2} value={item.evidence ?? ""}
              placeholder="Contoh: Masih keliru pada operasi tanda negatif di soal cerita."
              onChange={(event) => updateItem(item.id, { evidence: event.target.value })} />
          </div>
          <div>
            <label htmlFor={`mr-langkah-tutor-${item.id}`} className="label">Langkah tutor</label>
            <textarea id={`mr-langkah-tutor-${item.id}`} className="input text-sm" rows={2} value={item.tutorAction ?? ""}
              placeholder="Contoh: Latihan bertahap, cek langkah, lalu soal aplikasi."
              onChange={(event) => updateItem(item.id, { tutorAction: event.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor={`mr-indikator-${item.id}`} className="label">Indikator berhasil</label>
              <input id={`mr-indikator-${item.id}`} className="input text-sm" value={item.successMetric ?? ""}
                placeholder="8/10 soal tepat"
                onChange={(event) => updateItem(item.id, { successMetric: event.target.value })} />
            </div>
            <div>
              <label htmlFor={`mr-frekuensi-${item.id}`} className="label">Frekuensi / waktu</label>
              <input id={`mr-frekuensi-${item.id}`} className="input text-sm" value={item.cadence ?? ""}
                placeholder="2 sesi per minggu"
                onChange={(event) => updateItem(item.id, { cadence: event.target.value })} />
            </div>
          </div>
          <div>
            <label htmlFor={`mr-status-${item.id}`} className="label">Status</label>
            <select id={`mr-status-${item.id}`} className="input text-sm" value={item.status ?? "planned"}
              onChange={(event) => updateItem(item.id, { status: event.target.value as PlanStatus })}>
              {PLAN_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
            </select>
          </div>
        </div>
      ))}
      {draft.priorities.length < 3 && (
        <button type="button" className="w-full rounded-xl border border-dashed border-indigo-300 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50"
          onClick={() => setDraft((plan) => ({ ...plan, priorities: [...plan.priorities, newPlanItem()] }))}>
          ＋ Tambah Prioritas
        </button>
      )}
      <div>
        <label htmlFor="mr-dukungan" className="label">Dukungan di rumah (opsional)</label>
        <textarea id="mr-dukungan" className="input text-sm" rows={2} value={draft.parentSupport ?? ""}
          placeholder="Contoh: Sediakan 10 menit latihan mandiri dua kali seminggu."
          onChange={(event) => setDraft((plan) => ({ ...plan, parentSupport: event.target.value }))} />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button className="btn btn-secondary flex-1 text-sm" onClick={onCancel} disabled={saving}>Batal</button>
        <button className="btn btn-primary flex-1 text-sm" onClick={save} disabled={saving}>
          {saving ? "Menyimpan..." : "Simpan Rencana"}
        </button>
      </div>
    </div>
  );
}

const FONTS = [
  { id: "'Fredoka', sans-serif", name: "Fredoka" },
  { id: "'Baloo 2', sans-serif", name: "Baloo 2" },
  { id: "'Pacifico', cursive", name: "Pacifico" },
  { id: "'Poppins', sans-serif", name: "Poppins" },
  { id: "'Nunito', sans-serif", name: "Nunito" },
  { id: "'Quicksand', sans-serif", name: "Quicksand" },
  { id: "'Comfortaa', sans-serif", name: "Comfortaa" },
  { id: "'Caveat', cursive", name: "Caveat" },
];

const HEADER_STYLES: Array<{ id: import("../template/types").HeaderStyle; name: string }> = [
  { id: "bubble", name: "Bubble" }, { id: "script", name: "Script" }, { id: "plain", name: "Plain" },
  { id: "frame", name: "Frame" }, { id: "minimal", name: "Minimal" }, { id: "badge", name: "Badge" }, { id: "watercolor", name: "Watercolor" },
];
const LABEL_STYLES: Array<{ id: import("../template/types").LabelStyle; name: string }> = [
  { id: "pill", name: "Pill" }, { id: "rounded", name: "Rounded" }, { id: "flag", name: "Flag" },
  { id: "tag", name: "Tag" }, { id: "underline", name: "Underline" }, { id: "ribbon-label", name: "Ribbon" },
];
const PHOTO_STYLES: Array<{ id: import("../template/types").PhotoStyle; name: string }> = [
  { id: "round", name: "Round" }, { id: "circle", name: "Circle" }, { id: "polaroid", name: "Polaroid" },
  { id: "shadow", name: "Shadow" }, { id: "frame", name: "Frame" }, { id: "vintage", name: "Vintage" }, { id: "duotone", name: "Duotone" },
];
const DECO_KINDS: Array<{ id: import("../template/types").DecoKind; name: string }> = [
  { id: "none", name: "None" }, { id: "snow", name: "Snow" }, { id: "leaf", name: "Leaf" }, { id: "petal", name: "Petal" },
  { id: "sparkle", name: "Sparkle" }, { id: "star", name: "Star" }, { id: "wave", name: "Wave" }, { id: "sun", name: "Sun" },
  { id: "geometric", name: "Geometric" }, { id: "dots", name: "Dots" },
  { id: "confetti", name: "Confetti" },
  { id: "ribbon", name: "Ribbon" }, { id: "zigzag", name: "Zigzag" },
];

function CustomThemeBuilder({ onSave }: {
  onSave: (ct: import("../template/types").CustomTheme) => void;
}) {
  const [name, setName] = useState("TemaKu");
  const [bg, setBg] = useState("#f0f4ff");
  const [ink, setInk] = useState("#1a2a4a");
  const [muted, setMuted] = useState("#6b7a99");
  const [accent, setAccent] = useState("#4d7fd0");
  const [palette, setPalette] = useState(["#4d7fd0", "#e0892f", "#54b08a", "#d9605f"]);
  const [fontDisplay, setFontDisplay] = useState("'Fredoka', sans-serif");
  const [fontBody, setFontBody] = useState("'Nunito', sans-serif");
  const [header, setHeader] = useState<import("../template/types").HeaderStyle>("bubble");
  const [label, setLabel] = useState<import("../template/types").LabelStyle>("pill");
  const [photo, setPhoto] = useState<import("../template/types").PhotoStyle>("round");
  const [deco, setDeco] = useState<import("../template/types").DecoKind>("none");
  const [headerText, setHeaderText] = useState("ABSENSI");

  const save = () => {
    onSave({
      id: `custom-${Date.now()}`, name: name || "TemaKu", bg, ink, muted, accent, palette,
      fontDisplay, fontBody, header, label, photo, deco, headerText,
    });
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
      <p className="font-bold text-gray-800 text-sm">🎨 Custom Theme Builder</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="mr-nama-tema" className="label">Nama Tema</label>
          <input id="mr-nama-tema" className="input text-sm" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label htmlFor="mr-header-text" className="label">Header Text</label>
          <input id="mr-header-text" className="input text-sm" value={headerText} onChange={(e) => setHeaderText(e.target.value)} />
        </div>
        <div>
          <label htmlFor="mr-bg" className="label">Background</label>
          <input id="mr-bg" type="color" className="w-full h-8 rounded cursor-pointer" value={bg} onChange={(e) => setBg(e.target.value)} />
        </div>
        <div>
          <label htmlFor="mr-accent" className="label">Accent</label>
          <input id="mr-accent" type="color" className="w-full h-8 rounded cursor-pointer" value={accent} onChange={(e) => setAccent(e.target.value)} />
        </div>
        <div>
          <label htmlFor="mr-ink" className="label">Ink (teks)</label>
          <input id="mr-ink" type="color" className="w-full h-8 rounded cursor-pointer" value={ink} onChange={(e) => setInk(e.target.value)} />
        </div>
        <div>
          <label htmlFor="mr-muted" className="label">Muted (sekunder)</label>
          <input id="mr-muted" type="color" className="w-full h-8 rounded cursor-pointer" value={muted} onChange={(e) => setMuted(e.target.value)} />
        </div>
      </div>

      {/* Style selectors */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="mr-header-style" className="label">Header Style</label>
          <select id="mr-header-style" className="input text-sm" value={header} onChange={(e) => setHeader(e.target.value as HeaderStyle)}>
            {HEADER_STYLES.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="mr-label-style" className="label">Label Style</label>
          <select id="mr-label-style" className="input text-sm" value={label} onChange={(e) => setLabel(e.target.value as LabelStyle)}>
            {LABEL_STYLES.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="mr-photo-style" className="label">Photo Style</label>
          <select id="mr-photo-style" className="input text-sm" value={photo} onChange={(e) => setPhoto(e.target.value as PhotoStyle)}>
            {PHOTO_STYLES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="mr-deco" className="label">Decoration</label>
          <select id="mr-deco" className="input text-sm" value={deco} onChange={(e) => setDeco(e.target.value as DecoKind)}>
            {DECO_KINDS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="mr-font-display" className="label">Display Font</label>
          <select id="mr-font-display" className="input text-sm" value={fontDisplay} onChange={(e) => setFontDisplay(e.target.value)}>
            {FONTS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="mr-font-body" className="label">Body Font</label>
          <select id="mr-font-body" className="input text-sm" value={fontBody} onChange={(e) => setFontBody(e.target.value)}>
            {FONTS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
      </div>

      {/* Palette */}
      <div>
        <label className="label">Palette (4 warna)</label>
        <div className="flex gap-2">
          {palette.map((c, i) => (
            <input key={i} type="color" aria-label={`Warna palet ${i + 1}`} className="w-full h-8 rounded cursor-pointer" value={c}
              onChange={(e) => { const p = [...palette]; p[i] = e.target.value; setPalette(p); }} />
          ))}
        </div>
      </div>

      {/* Preview mini */}
      <div className="rounded-xl overflow-hidden border border-gray-200">
        <div style={{ background: bg, padding: "12px 10px", fontFamily: fontBody, color: ink }}>
          <div style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 18, color: accent, textAlign: "center" }}>
            {headerText}
          </div>
          <div style={{ textAlign: "center", fontSize: 11, marginTop: 2, color: muted }}>
            Preview · {name}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            {palette.map((c, i) => (
              <div key={i} style={{ flex: 1, height: 20, borderRadius: 6, background: c }} />
            ))}
          </div>
        </div>
      </div>

      <button className="btn btn-primary w-full text-sm" onClick={save}>💾 Simpan Tema Kustom</button>
    </div>
  );
}
