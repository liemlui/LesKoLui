import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  createManualPayment, syncReportPayment,
  markPaymentTransferredById, markPaymentUnpaidById, updatePaymentAmountById,
} from "../../db/repos";
import type { Payment, Student, Settings, Session, MonthlyReport } from "../../db/types";
import { reportDisplayStatus } from "../../db/types";
import { formatRupiah, todayWIB, monthLabel, periodLabel } from "../../lib/format";
import { AiCostModal } from "../../components/AiCostModal";
import Modal from "../../components/Modal";
import { buildBillingMessage, toWaNumber } from "../../lib/waBilling";
import { MAX_PAYMENT_AMOUNT, clampCurrencyAmount, isValidCurrencyAmount, parseCurrencyDigits } from "../../lib/money";
import { invoiceAgeDays, ageBucket, AGE_BUCKET_LABEL, AGE_BUCKET_CLASS, type AgeBucket } from "../../lib/finance";
import { db } from "../../db/db";
import ActivityRing from "../../components/dashboard/ActivityRing";
import { ProgressBar } from "../../components/charts";
import ConfirmSheet from "../../components/ConfirmSheet";
import InvoiceModal from "./InvoiceModal";
import {
  INVOICE_ORIGIN_CLASS, INVOICE_ORIGIN_LABEL, ITEMS_PER_PDF_PAGE,
  buildManualBillingText, groupPdfPages, invoiceOriginOf, statusPillClass, toneForPayment,
} from "../../lib/invoicePresentation";
import { useSessionCountBilling } from "./useSessionCountBilling";
import type { ConfirmState } from "./useSessionCountBilling";
import { useMonthClosing } from "./useMonthClosing";
import { useInvoiceFilters } from "./useInvoiceFilters";
import { useInvoiceExports } from "./useInvoiceExports";
import { useAiReminder } from "./useAiReminder";

interface TagihanTabProps {
  month: string;
  setMonth: (month: string) => void;
  payments: Payment[];
  students: Student[];
  settings: Settings;
  reports: MonthlyReport[];
  monthSessions: Session[];
  setMessage: (message: string) => void;
  navigate: (path: string) => void;
  requestedStudentId: string;
}

const REPORT_DISPLAY_STATUS_LABEL: Record<ReturnType<typeof reportDisplayStatus>, string> = {
  draft: "Draft",
  final: "Final",
  shared: "Sudah dibagikan",
};

const REPORT_DISPLAY_STATUS_CLASS: Record<ReturnType<typeof reportDisplayStatus>, string> = {
  draft: "bg-amber-100 text-amber-700",
  final: "bg-emerald-100 text-emerald-700",
  shared: "bg-violet-100 text-violet-700",
};

export default function TagihanTab({
  month, setMonth, payments, students, settings, reports, monthSessions, setMessage, navigate, requestedStudentId,
}: TagihanTabProps) {
  // ── Local UI state (form manual, edits, panel bantu) ──
  const [billEdits, setBillEdits] = useState<Record<string, string>>({});
  const [selectedMonth, setSelectedMonth] = useState(() => todayWIB().slice(0, 7));
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [totalCost, setTotalCost] = useState(0);
  const [showManual, setShowManual] = useState(false);
  const [showBillingHelp, setShowBillingHelp] = useState(false);
  const [reportInvoiceBusy, setReportInvoiceBusy] = useState<Record<string, boolean>>({});
  const [showWaAll, setShowWaAll] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [agingFilter, setAgingFilter] = useState<AgeBucket | "all">("all");
  const appliedFocusRef = useRef(false);

  // Sesi yang dirujuk laporan — dipakai baris invoice & pesan WA.
  const allReportSessions = useLiveQuery(async () => {
    const ids = [...new Set((reports ?? []).flatMap((r) => r.sessionIds))];
    if (ids.length === 0) return new Map<string, Session>();
    const rows = await db.sessions.bulkGet(ids);
    return new Map(rows.filter((s): s is Session => Boolean(s)).map((s) => [s.id, s]));
  }, [reports]);

  // ── Hooks (logika diekstraksi) ──
  // Tagihan paket (per pertemuan) — antrean, terbitkan, batalkan.
  const sessionCount = useSessionCountBilling({
    requestedStudentId, students, setMonth, setMessage, setConfirmState,
  });
  // Tutup buku bulan — preview, checklist, close/reopen.
  const closing = useMonthClosing({
    month, payments, students, reports, monthSessions, setMessage, setConfirmState,
  });
  // Filter + derived rows daftar tagihan (memoized).
  const invoice = useInvoiceFilters({
    month, payments, students, reports, monthSessions, settings,
    closings: closing.closings, allReportSessions, itemsPerPdfPage: ITEMS_PER_PDF_PAGE,
  });
  // Pengingat pembayaran AI (Reminder WA AI).
  const aiReminder = useAiReminder({
    students, tutorName: settings.tutorProfile?.name || "Ko Lui", setMessage,
  });

  // Deep-link focus lanjutan (murid non-paket) — case paket ditangani hook.
  useEffect(() => {
    if (appliedFocusRef.current) return;
    const progress = sessionCount.sessionCountBillingProgress;
    if (!requestedStudentId || progress === undefined) return;
    if (progress.some((row) => row.studentId === requestedStudentId)) return;
    appliedFocusRef.current = true;
    const requestedStudent = students.find((student) => student.id === requestedStudentId);
    if (!requestedStudent) return;
    if (requestedStudent.billingPolicy === "manual") {
      setSelectedStudentId(requestedStudentId);
      setShowManual(true);
    } else if (requestedStudent.billingPolicy !== "session_count") {
      closing.setExpandedPreview(requestedStudentId);
    }
  }, [requestedStudentId, sessionCount.sessionCountBillingProgress, students, closing.setExpandedPreview]);

  // ── Derived (dari hooks) ──
  const { studentMap, monthPayments, totals, billRows } = invoice;
  const { totalBilled, totalPaid, totalUnpaid, paidCount, unpaidCount, collectionRate } = totals;
  const {
    invoiceStatusFilter, setInvoiceStatusFilter, invoiceOriginFilter, setInvoiceOriginFilter,
    filteredBillRows, readyReportRows, showReadySections, showIssuedList,
    monthsOverview, waAllRows,
  } = invoice;
  const {
    monthClosing, previewBills, closingBusy,
    expandedPreview, setExpandedPreview,
    coveredSessionIds, skippedClosingStudents,
    closingProjection, closingChecklist, previewSessionsByStudent, canClose, closeHint,
    handleCloseMonth, handleReopenMonth,
  } = closing;
  const {
    sessionCountBillingProgress, needsActionCount,
    expandedSessionCountStudent, setExpandedSessionCountStudent,
    focusStudentId, setFocusStudentId,
    sessionCountInvoiceBusy, sessionCountCancelBusy,
    handleCreateSessionCountInvoice, handleCancelSessionCountInvoice,
  } = sessionCount;
  const {
    reminderLoading, reminderModal, setReminderModal,
    openReminderModal, confirmGenerateReminder, estimateCost: estimateReminderCost,
  } = aiReminder;

  const readyActionCount = readyReportRows.length + needsActionCount + closingProjection.rows.length;
  const agingRows = useMemo(() => {
    const buckets: Record<AgeBucket, { amount: number; count: number }> = {
      "0-30": { amount: 0, count: 0 },
      "31-60": { amount: 0, count: 0 },
      ">60": { amount: 0, count: 0 },
    };
    for (const { payment } of billRows) {
      if (payment.status !== "UNPAID") continue;
      const bucket = ageBucket(invoiceAgeDays(payment));
      buckets[bucket].amount += payment.totalCost;
      buckets[bucket].count += 1;
    }
    return (["0-30", "31-60", ">60"] as const).map((bucket) => ({
      bucket,
      ...buckets[bucket],
    }));
  }, [billRows]);
  const agingTotal = agingRows.reduce((sum, row) => sum + row.amount, 0);
  const visibleBillRows = useMemo(() => {
    const rows = filteredBillRows.filter((row) => (
      agingFilter === "all"
      || (row.payment.status === "UNPAID" && ageBucket(invoiceAgeDays(row.payment)) === agingFilter)
    ));
    if (invoiceStatusFilter === "unpaid") {
      rows.sort((a, b) => {
        const ageDifference = invoiceAgeDays(b.payment) - invoiceAgeDays(a.payment);
        return ageDifference || b.payment.totalCost - a.payment.totalCost;
      });
    }
    return rows;
  }, [agingFilter, filteredBillRows, invoiceStatusFilter]);
  const pdfPageGroups = useMemo(
    () => groupPdfPages(visibleBillRows.map((row) => row.payment), ITEMS_PER_PDF_PAGE),
    [visibleBillRows],
  );
  const exports = useInvoiceExports({
    month,
    studentMap,
    filteredBillRows: visibleBillRows,
    invoiceStatusFilter,
    invoiceOriginFilter,
    setMessage,
  });
  const {
    pdfExporting, invoiceTarget, setInvoiceTarget, invoiceExporting, invoiceRef,
    handleExportInvoicePdf, handleExportCsv, handleExportPdf,
  } = exports;

  const selectCollectionStage = (filter: typeof invoiceStatusFilter) => {
    setInvoiceStatusFilter(filter);
    if (filter !== "unpaid") setAgingFilter("all");
  };

  // ── Handlers ──
  const handleCreatePayment = async () => {
    if (!selectedStudentId || !selectedMonth || !isValidCurrencyAmount(totalCost)) { setMessage("Lengkapi semua data dengan nominal valid!"); return; }
    try {
      await createManualPayment({ studentId: selectedStudentId, month: selectedMonth, totalCost, status: "UNPAID" });
      setMonth(selectedMonth);
      setInvoiceStatusFilter("unpaid");
      setInvoiceOriginFilter("manual");
      setMessage("Tagihan manual baru dibuat ✓");
      setTotalCost(0);
    } catch (error) {
      const reason = (error as Error).message;
      setMessage(reason.includes("Manual payment already exists")
        ? "Tagihan manual untuk murid dan bulan ini sudah ada."
        : `Gagal: ${reason}`);
    }
  };

  const handleIssueReportInvoice = async (report: MonthlyReport, studentName: string) => {
    if (reportInvoiceBusy[report.id]) return;
    setReportInvoiceBusy((current) => ({ ...current, [report.id]: true }));
    try {
      await syncReportPayment(report);
      setMonth(report.month);
      setInvoiceStatusFilter("unpaid");
      setInvoiceOriginFilter(report.autoGenerated ? "monthly" : "report");
      setMessage(`Invoice dari Laporan Perkembangan ${studentName} berhasil diterbitkan ✓`);
    } catch (error) {
      setMessage(`Gagal menerbitkan invoice ${studentName}: ${(error as Error).message}`);
    } finally {
      setReportInvoiceBusy((current) => {
        const next = { ...current };
        delete next[report.id];
        return next;
      });
    }
  };

  const saveBillAmount = async (paymentId: string, fallback: number) => {
    const raw = billEdits[paymentId];
    setBillEdits((prev) => { const c = { ...prev }; delete c[paymentId]; return c; });
    if (raw == null || raw === "") return;
    const n = Number(raw);
    if (!isValidCurrencyAmount(n)) { setMessage(`Nominal harus 1 sampai ${formatRupiah(MAX_PAYMENT_AMOUNT)}.`); return; }
    if (n !== fallback) await updatePaymentAmountById(paymentId, n);
  };

  return (
    <div className="space-y-4">
      {showIssuedList && (
        <div>
          <div className="flex items-center justify-end gap-2">
            <button onClick={handleExportCsv}
              className="flex items-center gap-1.5 text-sm font-semibold bg-green-50 text-green-700 border border-green-200 px-3 py-2 rounded-xl hover:bg-green-100 transition-colors">
              📊 CSV
            </button>
            <button onClick={handleExportPdf} disabled={pdfExporting}
              className="flex items-center gap-1.5 text-sm font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-2 rounded-xl hover:bg-indigo-100 transition-colors disabled:opacity-50">
              {pdfExporting ? "⏳ Ekspor..." : "📄 PDF"}
            </button>
          </div>
          <p className="mt-1 text-right text-[10px] text-gray-500">Ekspor mengikuti filter status dan asal pada daftar Tagihan Terbit.</p>
        </div>
      )}

      <section aria-labelledby="collection-center-title" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-500">Penagihan {monthLabel(month)}</p>
            <h2 id="collection-center-title" className="mt-0.5 text-base font-bold text-slate-800">Pusat Koleksi</h2>
            <p className="mt-1 max-w-sm text-[11px] leading-relaxed text-slate-500">
              Terbitkan invoice, tindak lanjuti piutang, lalu catat pelunasan dalam satu alur.
            </p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${collectionRate >= 80 ? "bg-green-100 text-green-700" : collectionRate > 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
            {monthPayments.length > 0 ? `${collectionRate}% tertagih` : "Belum ada invoice"}
          </span>
        </div>

        <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-2" role="group" aria-label="Filter tahap penagihan">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-1">
            <button
              type="button"
              aria-pressed={invoiceStatusFilter === "ready"}
              onClick={() => selectCollectionStage("ready")}
              className={`rounded-lg border px-2.5 py-2 text-left transition-colors ${invoiceStatusFilter === "ready" ? "border-indigo-300 bg-indigo-600 text-white shadow-sm" : "border-indigo-100 bg-white text-indigo-800 hover:bg-indigo-50"}`}
            >
              <span className="block text-[10px] font-bold uppercase tracking-wide opacity-80">01 · Siap</span>
              <span className="mt-0.5 block text-sm font-bold leading-tight">{readyActionCount} tindakan</span>
              <span className="mt-0.5 block text-[10px] leading-snug opacity-80">Laporan, paket, atau tutup bulan</span>
            </button>
            <span aria-hidden="true" className="flex items-center justify-center px-0.5 text-base font-bold text-slate-400">→</span>
            <button
              type="button"
              aria-pressed={invoiceStatusFilter === "semua"}
              onClick={() => selectCollectionStage("semua")}
              className={`rounded-lg border px-2.5 py-2 text-left transition-colors ${invoiceStatusFilter === "semua" ? "border-blue-300 bg-blue-600 text-white shadow-sm" : "border-blue-100 bg-white text-blue-800 hover:bg-blue-50"}`}
            >
              <span className="block text-[10px] font-bold uppercase tracking-wide opacity-80">02 · Terbit</span>
              <span className="mt-0.5 block text-sm font-bold leading-tight">{formatRupiah(totalBilled)}</span>
              <span className="mt-0.5 block text-[10px] leading-snug opacity-80">{monthPayments.length} invoice periode ini</span>
            </button>
          </div>

          <div className="my-2 flex items-center gap-2 px-1 text-[10px] font-medium text-slate-500">
            <span className="h-px flex-1 bg-slate-200" />
            <span>Invoice terbit terbagi menurut pembayaran</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              aria-pressed={invoiceStatusFilter === "unpaid"}
              onClick={() => selectCollectionStage("unpaid")}
              className={`rounded-lg border px-2.5 py-2 text-left transition-colors ${invoiceStatusFilter === "unpaid" ? "border-amber-300 bg-amber-500 text-white shadow-sm" : "border-amber-100 bg-white text-amber-800 hover:bg-amber-50"}`}
            >
              <span className="block text-[10px] font-bold uppercase tracking-wide opacity-80">Belum dibayar</span>
              <span className="mt-0.5 block text-sm font-bold leading-tight">{formatRupiah(totalUnpaid)}</span>
              <span className="mt-0.5 block text-[10px] leading-snug opacity-80">{unpaidCount} invoice perlu tindak lanjut</span>
            </button>
            <button
              type="button"
              aria-pressed={invoiceStatusFilter === "paid"}
              onClick={() => selectCollectionStage("paid")}
              className={`rounded-lg border px-2.5 py-2 text-left transition-colors ${invoiceStatusFilter === "paid" ? "border-green-300 bg-green-600 text-white shadow-sm" : "border-green-100 bg-white text-green-800 hover:bg-green-50"}`}
            >
              <span className="block text-[10px] font-bold uppercase tracking-wide opacity-80">Lunas</span>
              <span className="mt-0.5 block text-sm font-bold leading-tight">{formatRupiah(totalPaid)}</span>
              <span className="mt-0.5 block text-[10px] leading-snug opacity-80">{paidCount} invoice sudah selesai</span>
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2.5">
          <ActivityRing
            value={paidCount}
            total={monthPayments.length}
            label="Kolektibilitas invoice"
            detail={monthPayments.length > 0 ? `${unpaidCount} invoice masih menjadi piutang` : "Terbitkan invoice dari antrean yang siap"}
            size="sm"
            tone={collectionRate >= 80 ? "green" : collectionRate > 0 ? "amber" : "slate"}
          />
          <p className="min-w-0 text-[11px] leading-relaxed text-slate-500">
            <span className="font-semibold text-slate-700">Status invoice ≠ kas masuk.</span>{" "}
            Pelunasan menutup piutang; kas dicatat menurut tanggal pembayaran di Ringkasan.
          </p>
        </div>

        {/* Kolektibilitas bulan ini — warna threshold: <70 merah, 70–89 kuning, ≥90 hijau */}
        <div className="mt-3 rounded-xl border border-slate-100 bg-white p-3" aria-label="Kolektibilitas">
          <ProgressBar
            value={collectionRate}
            max={100}
            label="Kolektibilitas"
            detail={monthPayments.length > 0
              ? `${paidCount} dari ${monthPayments.length} invoice lunas`
              : "Belum ada invoice pada periode ini"}
            showPercent
            tone="red"
            thresholds={[{ pct: 90, tone: "green" }, { pct: 70, tone: "amber" }]}
          />
        </div>

        <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3" aria-label="Umur piutang">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-600">Umur piutang</p>
              <p className="mt-0.5 text-[10px] text-slate-500">Tap bar untuk menyaring daftar invoice belum dibayar pada periode ini.</p>
            </div>
            <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-amber-700 shadow-sm">
              {agingTotal > 0 ? formatRupiah(agingTotal) : "Tidak ada piutang"}
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {agingRows.map((row) => {
              const tone = row.bucket === ">60" ? "red" : row.bucket === "31-60" ? "amber" : "slate";
              const selected = agingFilter === row.bucket && invoiceStatusFilter === "unpaid";
              return (
                <button
                  key={row.bucket}
                  type="button"
                  disabled={row.count === 0}
                  aria-pressed={selected}
                  aria-label={`Filter umur piutang ${AGE_BUCKET_LABEL[row.bucket]}: ${row.count} invoice, ${formatRupiah(row.amount)}`}
                  onClick={() => {
                    selectCollectionStage("unpaid");
                    setAgingFilter((current) => current === row.bucket ? "all" : row.bucket);
                  }}
                  className={`w-full rounded-lg px-2 py-1.5 text-left transition-colors disabled:cursor-default disabled:opacity-45 ${selected ? "bg-white shadow-sm ring-1 ring-slate-300" : "hover:bg-white"}`}
                >
                  <ProgressBar
                    value={row.amount}
                    max={Math.max(agingTotal, 1)}
                    label={AGE_BUCKET_LABEL[row.bucket]}
                    detail={`${row.count} invoice · ${formatRupiah(row.amount)}`}
                    tone={tone}
                    size="sm"
                  />
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {showReadySections && readyReportRows.length > 0 && (
        <section aria-labelledby="ready-report-invoices-title" className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/40 p-4 shadow-sm">
          <div>
            <h2 id="ready-report-invoices-title" className="text-sm font-bold text-blue-900">Laporan Final Siap Ditagih</h2>
            <p className="mt-0.5 text-[11px] text-blue-700">Laporan Perkembangan sudah final, tetapi belum mempunyai invoice. Terbitkan satu per satu setelah nominal diperiksa.</p>
          </div>
          <div className="space-y-2">
            {readyReportRows.map(({ report, student }) => {
              const studentName = student?.name ?? "Murid dihapus";
              const busy = Boolean(reportInvoiceBusy[report.id]);
              return (
                <article key={report.id} className="rounded-xl border border-blue-100 bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-800">{studentName}</p>
                      <p className="mt-0.5 text-[11px] font-medium text-blue-700">Periode belajar {periodLabel(report.periodStart, report.periodEnd)}</p>
                      <p className="mt-1 text-xs font-bold text-gray-800">{formatRupiah(report.totalCost)}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-blue-100 px-2 py-1 text-[10px] font-bold text-blue-700">Laporan Final</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/report?reportId=${encodeURIComponent(report.id)}`)}
                      className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                    >Lihat Laporan</button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleIssueReportInvoice(report, studentName)}
                      className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-50"
                    >{busy ? "Menerbitkan..." : "Terbitkan Invoice"}</button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {showReadySections && (
      <section aria-labelledby="session-count-billing-title" className="bg-white rounded-xl p-4 shadow-sm border border-indigo-100 space-y-3">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 id="session-count-billing-title" className="text-sm font-bold text-gray-800">Tagihan per Pertemuan</h2>
                <button
                  type="button"
                  onClick={() => setShowBillingHelp(true)}
                  aria-label="Bantuan cara kerja tagihan"
                  title="Cara kerja tagihan"
                  className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600 transition-colors hover:bg-indigo-100 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >?</button>
              </div>
              <p className="mt-0.5 rounded-lg bg-indigo-50 px-2 py-1 text-[11px] font-medium text-indigo-700">
                Lintas bulan — tidak dipengaruhi pilihan Bulan Keuangan. Sesi tertua ditagih lebih dahulu.
              </p>
            </div>
            <span className="flex-shrink-0 rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-700">
              {needsActionCount} perlu tindakan
            </span>
          </div>
        </div>

        {(sessionCountBillingProgress ?? []).length === 0 ? (
          <p className="rounded-lg bg-gray-50 px-3 py-4 text-center text-xs text-gray-500">
            Belum ada murid dengan aturan tagihan per pertemuan.
          </p>
        ) : (
          <div className="space-y-2">
            {(sessionCountBillingProgress ?? []).map((progress) => {
              const ready = progress.readyBatchCount > 0;
              const busy = Boolean(sessionCountInvoiceBusy[progress.studentId]);
              const expanded = expandedSessionCountStudent === progress.studentId;
              const pendingPolicyLabel = progress.pendingBillingPolicy === "manual" ? "Manual" : "Bulanan";
              const invalidTarget = progress.targetCount <= 0;
              const currentCount = Math.min(progress.unbilledCount, progress.targetCount);
              return (
                <article key={progress.studentId} className={`rounded-xl border p-3 ${focusStudentId === progress.studentId ? "ring-2 ring-indigo-400 ring-offset-1" : ""} ${ready ? "border-indigo-200 bg-indigo-50/40" : "border-gray-100"}`}>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => { setFocusStudentId(null); setExpandedSessionCountStudent(expanded ? null : progress.studentId); }}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-800">{progress.studentName}</p>
                        <p className="mt-0.5 text-[11px] text-gray-500">
                          {progress.unbilledCount} sesi belum ditagih
                          {ready && progress.readyBatchCount > 1 ? ` · ${progress.readyBatchCount} paket siap` : ""}
                        </p>
                        {progress.pendingBillingPolicy && (
                          <p className="mt-1 text-[10px] font-semibold text-amber-700">
                            Peralihan ke {pendingPolicyLabel} tertunda
                          </p>
                        )}
                      </div>
                      <span className={`flex-shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${ready ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"}`}>
                        {invalidTarget ? "Atur N" : ready ? "Paket siap" : `${currentCount}/${progress.targetCount}`}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      {invalidTarget ? (
                        <span className="min-w-0 flex-1 rounded-lg bg-amber-50 px-2 py-1.5 text-[11px] font-medium text-amber-700">
                          Jumlah pertemuan belum diatur — buka profil murid.
                        </span>
                      ) : (
                        <div className="min-w-0 flex-1">
                          <ActivityRing
                            value={currentCount}
                            total={progress.targetCount}
                            label="Sesi paket"
                            detail={formatRupiah(progress.nextBatchTotal)}
                            size="sm"
                            tone={ready ? "green" : "blue"}
                          />
                        </div>
                      )}
                      <span className="flex-shrink-0 text-xs text-gray-400">{expanded ? "▾" : "▸"}</span>
                    </div>
                  </button>

                  {expanded && (
                    <div className="mt-3 border-t border-indigo-100 pt-3">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-1 text-[11px]">
                        <span className="font-semibold text-gray-600">
                          {ready ? `${progress.targetCount} sesi paket berikutnya` : "Sesi terkumpul"}
                        </span>
                        <span className="text-gray-500">{progress.nextBatchHours}j · {formatRupiah(progress.nextBatchTotal)}</span>
                      </div>
                      {progress.nextBatchSessions.length === 0 ? (
                        <p className="rounded-lg bg-white px-3 py-2 text-xs text-gray-500">Belum ada sesi billable.</p>
                      ) : (
                        <div className="space-y-1 rounded-lg bg-white p-2">
                          {progress.nextBatchSessions.map((session) => (
                            <div key={session.id} className="grid grid-cols-[46px_minmax(0,1fr)_auto] items-center gap-2 px-1 py-1 text-[11px]">
                              <span className="font-mono text-gray-500">{session.date.slice(5).replace("-", "/")}</span>
                              <span className="truncate text-gray-600">
                                {session.status === "NO_SHOW" ? "Tidak hadir (ditagihkan)" : session.subjects.slice(0, 2).join(", ") || "—"}
                              </span>
                              <span className="text-right font-medium text-gray-700">{formatRupiah(session.cost)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={!invalidTarget && (!ready || busy)}
                    aria-label={invalidTarget
                      ? `Buka profil ${progress.studentName} untuk mengatur jumlah pertemuan`
                      : `Terbitkan paket ${progress.targetCount} pertemuan untuk ${progress.studentName}`}
                    onClick={() => invalidTarget
                      ? navigate(`/students/${encodeURIComponent(progress.studentId)}`)
                      : void handleCreateSessionCountInvoice(progress)}
                    className={`mt-3 w-full rounded-lg px-3 py-2.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500 ${invalidTarget ? "border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}
                  >
                    {busy
                      ? "Menerbitkan..."
                      : invalidTarget
                        ? "Buka Profil · Atur Jumlah Pertemuan"
                        : ready
                          ? `Terbitkan Paket ${progress.targetCount} · ${formatRupiah(progress.nextBatchTotal)}`
                          : `Belum siap · ${currentCount}/${progress.targetCount} sesi`}
                  </button>
                  {!ready
                    && progress.pendingBillingPolicy
                    && progress.targetCount > 0
                    && progress.unbilledCount > 0
                    && progress.unbilledCount < progress.targetCount && (
                    <button
                      type="button"
                      disabled={busy}
                      aria-label={`Terbitkan tagihan penutup ${progress.unbilledCount} pertemuan untuk ${progress.studentName}`}
                      onClick={() => void handleCreateSessionCountInvoice(progress, true)}
                      className="mt-2 w-full rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100 disabled:opacity-50"
                    >
                      {busy ? "Menerbitkan..." : `Tagihan Penutup ${progress.unbilledCount} Sesi · ${formatRupiah(progress.nextBatchTotal)}`}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
      )}

      {showReadySections && (<>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Penutupan periode</p>
          <p className="mt-0.5 text-sm font-semibold text-slate-700">Tagihan bulanan {monthLabel(month)}</p>
        </div>
        {monthClosing ? (
          <span className="shrink-0 rounded-full bg-green-100 px-2 py-1 text-[11px] font-semibold text-green-700">Ditutup</span>
        ) : (
          <span className="shrink-0 rounded-full bg-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600">Terbuka</span>
        )}
      </div>

      {/* Tutup Bulan panel */}
      {!monthClosing ? (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">⏳ Akan Direkap saat Tutup Bulan</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Tap nama murid untuk lihat detail sesi</p>
            <p className="text-[11px] text-blue-700 mt-1 rounded-lg bg-blue-50 px-2.5 py-2">
              Hanya murid dengan aturan Bulanan. Paket N pertemuan ditagih melalui antrean di atas; aturan Manual dilewati.
              {skippedClosingStudents > 0 ? ` ${skippedClosingStudents} murid bulan ini tidak masuk preview.` : ""}
            </p>
          </div>
          {(previewBills ?? []).length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-2">
              {monthPayments.length > 0 ? "Tidak ada sesi billable yang belum direkap untuk tutup bulan." : "Belum ada sesi yang dapat ditagihkan bulan ini."}
            </p>
          ) : (
            <div className="space-y-1">
              {closingProjection.rows.map(({ bill: b, adoptedPayment }) => {
                const isExpanded = expandedPreview === b.studentId;
                const sessions = previewSessionsByStudent.get(b.studentId) ?? [];
                return (
                  <div key={b.studentId} className={`border-b border-gray-50 last:border-0 ${focusStudentId === b.studentId ? "rounded-lg ring-2 ring-blue-400 ring-offset-1" : ""}`}>
                    <button
                      onClick={() => { setFocusStudentId(null); setExpandedPreview(isExpanded ? null : b.studentId); }}
                      className="w-full flex items-center justify-between text-sm py-2 hover:bg-gray-50 rounded-lg px-1 transition-colors">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-gray-500 text-xs transition-transform" style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>▸</span>
                        <span className="font-medium text-gray-700 truncate">{b.name}</span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs text-gray-500">{b.count} sesi · {b.hours}j</span>
                        <span className="font-semibold text-gray-700">{formatRupiah(adoptedPayment?.totalCost ?? b.cost)}</span>
                      </div>
                    </button>
                    {adoptedPayment && (
                      <p className="ml-6 mb-1 text-[10px] text-indigo-600">
                        Tagihan manual yang sudah ada akan ditautkan, bukan dibuat ulang.
                      </p>
                    )}
                    {isExpanded && sessions.length > 0 && (
                      <div className="ml-5 mb-2 space-y-1 bg-gray-50 rounded-lg p-2">
                        {sessions.sort((a, s) => a.date.localeCompare(s.date)).map((s) => (
                          <div key={s.id} className="flex items-center justify-between text-xs px-2 py-1">
                            <span className="text-gray-500 font-mono">{s.date.slice(5).replace("-", "/")}</span>
                            <span className="text-gray-600 flex-1 ml-2 truncate">{s.status === "NO_SHOW" ? "Tidak hadir (ditagihkan)" : s.subjects.slice(0, 2).join(", ") || "—"}</span>
                            <span className="text-gray-500 mx-2">{s.durationHours}j</span>
                            <span className="font-medium text-gray-700">{formatRupiah(s.cost)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="flex items-center justify-between pt-2 font-bold text-sm">
                <span className="text-gray-700">Tambahan tagihan saat ditutup</span>
                <span className="text-green-700">{formatRupiah(closingProjection.additionalTotal)}</span>
              </div>
              {coveredSessionIds.size > 0 && (
                <p className="text-[11px] text-amber-600">Sesi yang sudah masuk laporan sah tidak ditagih ulang.</p>
              )}
            </div>
          )}
          {(monthPayments.length > 0 || (previewBills ?? []).length > 0) && (
            <div className="border-t border-gray-100 pt-2 flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-600">Total Tagihan Bulan Ini</span>
              <span className="font-bold text-indigo-700">{formatRupiah(totalBilled + closingProjection.additionalTotal)}</span>
            </div>
          )}
          {closingChecklist.warnings.length > 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-2.5 space-y-1.5 text-xs">
              <p className="font-semibold text-amber-800">⚠ Periksa sebelum menutup:</p>
              {closingChecklist.warnings.map((warning, i) => (
                <p key={i} className="text-amber-800 leading-relaxed">{warning}</p>
              ))}
              {closingChecklist.draftReports.length > 0 && (
                <button
                  type="button"
                  onClick={() => navigate(`/report?studentId=${encodeURIComponent(closingChecklist.draftReports[0].studentId)}&reportId=${encodeURIComponent(closingChecklist.draftReports[0].id)}`)}
                  className="rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-indigo-700"
                >
                  Buka Draft Laporan →
                </button>
              )}
            </div>
          ) : (
            <p className="rounded-lg border border-green-200 bg-green-50 px-2.5 py-2 text-xs font-medium text-green-700">
              ✓ Siap ditutup — tidak ada draft menggantung, semua murid bulanan ter-rekap.
            </p>
          )}
          <button onClick={() => handleCloseMonth((sid) => studentMap.get(sid)?.name)} disabled={closingBusy || !canClose}
            className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold disabled:opacity-40 hover:bg-blue-700 transition-colors">
            {closingBusy ? "Memproses..." : (previewBills ?? []).length === 0 ? "🔒 Tutup Bulan (kosong)" : `🔒 Tutup Bulan ${monthLabel(month)}`}
          </button>
          {!canClose && <p className="text-xs text-amber-600 text-center">{closeHint}</p>}
        </div>
      ) : (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-green-700 font-semibold uppercase tracking-wide">Bulan sudah ditutup</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Tagihan bulanan sudah diselaraskan.</p>
            </div>
            <button onClick={handleReopenMonth}
              className="text-xs font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded-lg transition-colors">
              ↩ Buka kembali
            </button>
          </div>
        </div>
      )}
      </>)}

      {/* Aksi tagihan selalu tersedia, termasuk ketika bulan masih terbuka. */}
      {showIssuedList && (
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Tagihan Terbit</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Kelola nominal, pembayaran, WhatsApp, laporan, dan invoice.</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowWaAll(true)}
              className="rounded-lg bg-green-500 px-2.5 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-green-600"
            >
              📋 Daftar Tagihan
            </button>
            <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 rounded-full px-2 py-1">{monthPayments.length} tagihan</span>
          </div>
        </div>
        <div className="space-y-2 rounded-xl bg-gray-50 p-2.5">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-gray-500">Asal invoice</p>
            <div className="flex flex-wrap gap-1" role="group" aria-label="Filter asal invoice">
              {([
                ["semua", "Semua"],
                ["monthly", "Bulanan"],
                ["package", "Paket"],
                ["report", "Laporan"],
                ["manual", "Manual"],
              ] as const).map(([filter, label]) => (
                <button key={filter} type="button" onClick={() => setInvoiceOriginFilter(filter)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    invoiceOriginFilter === filter ? "bg-white text-gray-800 shadow-sm ring-1 ring-gray-300" : "text-gray-500 hover:text-gray-700"
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {filteredBillRows.length === 0 ? (
          <p className="rounded-lg bg-gray-50 px-3 py-4 text-center text-sm text-gray-500">Tidak ada invoice yang cocok dengan filter status dan asal ini.</p>
        ) : (
          filteredBillRows.map(({ payment, report, student, sessions }) => {
            const paid = payment.status === "PAID";
            const periodLbl = payment.periodStart && payment.periodEnd ? periodLabel(payment.periodStart, payment.periodEnd) : "";
            const amountStr = billEdits[payment.id] ?? String(payment.totalCost);
            const totalHours = sessions.reduce((s, x) => s + x.durationHours, 0);
            const phone = student?.parentContact?.phone ? toWaNumber(student.parentContact.phone) : "";
            const origin = invoiceOriginOf(payment, report);
            const standaloneManual = origin === "manual";
            const waText = student
              ? standaloneManual
                ? buildManualBillingText(student, payment, settings)
                : buildBillingMessage({
                    student, sessions, month: payment.month, settings, amountOverride: payment.totalCost,
                    period: payment.periodStart && payment.periodEnd ? { start: payment.periodStart, end: payment.periodEnd } : undefined,
                    periodLabelText: periodLbl || undefined,
                    tone: toneForPayment(payment),
                  }).text
              : "";
            return (
              <div key={payment.id} className="border border-gray-100 rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-700 text-sm">{student?.name ?? "(dihapus)"}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-bold ${INVOICE_ORIGIN_CLASS[origin]}`}>
                        {INVOICE_ORIGIN_LABEL[origin]}
                      </span>
                      {report && (
                        <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-bold ${REPORT_DISPLAY_STATUS_CLASS[reportDisplayStatus(report)]}`}>
                          Laporan: {REPORT_DISPLAY_STATUS_LABEL[reportDisplayStatus(report)]}
                        </span>
                      )}
                    </div>
                    {origin === "package" && (
                      <p className="mt-1 text-[10px] font-medium text-indigo-600">
                        {report?.finalBillingBatch ? "Paket Penutup" : `Paket ${report?.billingSessionCount ?? sessions.length} Pertemuan`}
                      </p>
                    )}
                  </div>
                  <span className={statusPillClass(paid)}>{paid ? "Lunas" : "Belum dibayar"}</span>
                  {!paid && (
                    <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-bold ${AGE_BUCKET_CLASS[ageBucket(invoiceAgeDays(payment))]}`}>
                      {AGE_BUCKET_LABEL[ageBucket(invoiceAgeDays(payment))]}
                    </span>
                  )}
                </div>
                <div className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-[10px] leading-relaxed text-slate-600">
                  <p>🗓 Periode sesi: <strong>{periodLbl || "Tanpa sesi"}</strong></p>
                  <p>🧾 Bulan tagihan: <strong>{monthLabel(payment.month)}</strong></p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Rp</span>
                  <input aria-label={`Nominal tagihan ${student?.name ?? "murid"}`} className="input flex-1 text-sm py-1.5" inputMode="numeric" value={amountStr} disabled={paid}
                    onChange={(e) => {
                      const { raw } = parseCurrencyDigits(e.target.value, MAX_PAYMENT_AMOUNT);
                      setBillEdits((prev) => ({ ...prev, [payment.id]: raw }));
                    }}
                    onBlur={() => saveBillAmount(payment.id, payment.totalCost)} />
                </div>
                <div className="flex gap-2">
                  {phone && !paid && (
                    <a href={`https://wa.me/${phone}?text=${encodeURIComponent(waText)}`} target="_blank" rel="noopener noreferrer"
                      className="flex-1 text-center py-2 rounded-lg bg-green-500 text-white text-xs font-semibold hover:bg-green-600 transition-colors">
                      💬 Tagih WA
                    </a>
                  )}
                  {!paid ? (
                    <button onClick={() => markPaymentTransferredById(payment.id)}
                      className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors">
                      ✓ Sudah Transfer
                    </button>
                  ) : (
                    <button onClick={() => markPaymentUnpaidById(payment.id)}
                      className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-500 text-xs font-medium hover:bg-gray-50 transition-colors">
                      ↩ Batalkan
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {report ? (
                    <button onClick={() => navigate(`/report?reportId=${encodeURIComponent(report.id)}`)}
                      className="min-w-[88px] flex-1 py-1.5 rounded-lg border border-blue-200 text-blue-600 text-xs font-medium hover:bg-blue-50 transition-colors">
                      📋 Buka Laporan
                    </button>
                  ) : (
                    student && (
                      <button onClick={() => navigate(`/report?studentId=${encodeURIComponent(student.id)}`)}
                        className="min-w-[88px] flex-1 py-1.5 rounded-lg border border-blue-200 text-blue-600 text-xs font-medium hover:bg-blue-50 transition-colors">
                        📋 Lengkapi Laporan Perkembangan
                      </button>
                    )
                  )}
                  {student && (
                    <button onClick={() => setInvoiceTarget({ payment, student })}
                      className="min-w-[88px] flex-1 py-1.5 rounded-lg border border-gray-200 text-gray-500 text-xs font-medium hover:bg-gray-50 transition-colors">
                      📄 Invoice
                    </button>
                  )}
                  {!paid && student && settings.ai?.enabled && settings.ai.apiKey && (
                    <button disabled={reminderLoading === payment.id}
                      onClick={() => openReminderModal(payment.id, student, periodLbl || payment.month, payment.totalCost)}
                      className="min-w-[88px] flex-1 py-1.5 rounded-lg border border-indigo-200 text-indigo-600 text-xs font-medium hover:bg-indigo-50 transition-colors disabled:opacity-50">
                      {reminderLoading === payment.id ? "⏳..." : "✨ Reminder AI"}
                    </button>
                  )}
                  {report?.billingMode === "session_count" && !paid && payment.source !== "manual" && (
                    <button
                      type="button"
                      disabled={Boolean(sessionCountCancelBusy[payment.id])}
                      onClick={() => void handleCancelSessionCountInvoice(
                        payment,
                        student?.name ?? "murid",
                        report.billingPolicyTransitionTarget ?? report.billingPolicyAfterBatch,
                        Boolean(report.finalBillingBatch),
                      )}
                      className="min-w-[128px] flex-1 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 transition-colors disabled:cursor-wait disabled:opacity-50"
                    >
                      {sessionCountCancelBusy[payment.id]
                        ? "Membatalkan..."
                        : report.finalBillingBatch
                          ? "Batalkan Tagihan Penutup"
                          : "Batalkan Tagihan Paket"}
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {standaloneManual
                    ? "Tanpa sesi · nominal manual"
                    : `${sessions.length} sesi · ${totalHours}j`}
                  {paid && payment.paidAt ? ` · dibayar ${payment.paidAt}` : ""}
                </p>
              </div>
            );
          })
        )}
      </div>
      )}

      {/* Riwayat Tutup Bulan */}
      {monthsOverview.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 font-medium mb-2 uppercase tracking-wide">Riwayat Tutup Bulan</p>
          <div className="space-y-1">
            {monthsOverview.map((m) => (
              <button key={m.month} onClick={() => setMonth(m.month)}
                className={`w-full flex items-center justify-between text-sm py-1.5 px-2 rounded-lg transition-colors ${m.month === month ? "bg-green-50" : "hover:bg-gray-50"}`}>
                <span className="font-medium text-gray-700">{monthLabel(m.month)}</span>
                <span className="text-xs flex items-center gap-2">
                  <span className="text-green-600 font-semibold">{m.paid}/{m.total} lunas</span>
                  {m.piutang > 0 && <span className="text-amber-600">piutang {formatRupiah(m.piutang)}</span>}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Manual invoice (collapsible) */}
      <div className="bg-gray-50 rounded-xl p-4">
        <button onClick={() => {
          const opening = !showManual;
          if (opening) setSelectedMonth(month);
          setShowManual(opening);
        }} className="w-full flex items-center justify-between text-sm font-semibold text-gray-600">
          <span>+ Tagihan Manual (di luar tutup bulan)</span>
          <span>{showManual ? "▾" : "▸"}</span>
        </button>
        {showManual && (
          <div className="space-y-3 mt-3">
            <select className="input" value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}>
              <option value="">Pilih murid...</option>
              {students.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <div>
              <label htmlFor="manual-invoice-month" className="mb-1 block text-xs font-medium text-gray-600">Bulan tagihan</label>
              <input id="manual-invoice-month" className="input" type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
            </div>
            <input className="input" type="number" placeholder="Total biaya (IDR)" value={totalCost || ""} min={1} max={100000000}
              onChange={(e) => setTotalCost(clampCurrencyAmount(Number(e.target.value), MAX_PAYMENT_AMOUNT))} />
            <button onClick={handleCreatePayment} className="btn-primary w-full">Buat Tagihan</button>
          </div>
        )}
      </div>

      {/* Hidden PDF pages for bulk export */}
      <div style={{ position: "absolute", left: -9999, top: 0, pointerEvents: "none" }}>
        {pdfPageGroups.map((group, pageIdx) => (
          <div key={pageIdx} data-pdf-page
            style={{ width: 400, background: "#fff", padding: "24px 20px", fontFamily: "sans-serif" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "2px solid #e5e7eb", paddingBottom: 10 }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: 18, margin: 0, color: "#1e40af" }}>Rekap Tagihan</p>
                <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>{monthLabel(month)}</p>
              </div>
              <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>Hal {pageIdx + 1}/{pdfPageGroups.length}</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {group.map((p) => {
                const sName = studentMap.get(p.studentId)?.name ?? "(dihapus)";
                return (
                  <div key={p.id} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 14px",
                    background: p.status === "PAID" ? "#f0fdf4" : "#fffbeb" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 14, margin: 0, color: "#111827" }}>{sName}</p>
                        <p style={{ fontSize: 12, color: "#6b7280", margin: "2px 0 0" }}>{p.month}</p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontWeight: 700, fontSize: 14, margin: 0, color: "#1e40af" }}>{formatRupiah(p.totalCost)}</p>
                        <span style={{ fontSize: 11, fontWeight: 600,
                          color: p.status === "PAID" ? "#16a34a" : "#d97706",
                          background: p.status === "PAID" ? "#dcfce7" : "#fef3c7",
                          padding: "2px 8px", borderRadius: 999, display: "inline-block", marginTop: 3 }}>
                          {p.status === "PAID" ? "Lunas" : "Belum dibayar"}
                        </span>
                      </div>
                    </div>
                    {p.status === "PAID" && p.paidAt && (
                      <p style={{ fontSize: 11, color: "#6b7280", margin: "6px 0 0" }}>Bayar {p.paidAt} via {p.method ?? "-"}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ── Modals ── */}
      {invoiceTarget && (
        <InvoiceModal
          payment={invoiceTarget.payment}
          student={invoiceTarget.student}
          settings={settings}
          report={invoiceTarget.payment.reportId
            ? reports.find((report) => report.id === invoiceTarget.payment.reportId)
            : undefined}
          invoiceRef={invoiceRef}
          exporting={invoiceExporting}
          onExport={handleExportInvoicePdf}
          onOpenReport={() => {
            const payment = invoiceTarget.payment;
            setInvoiceTarget(null);
            if (payment.reportId) navigate(`/report?reportId=${encodeURIComponent(payment.reportId)}`);
            else navigate(`/report?studentId=${encodeURIComponent(payment.studentId)}`);
          }}
          onSendWithReport={() => {
            const s = invoiceTarget.student;
            setInvoiceTarget(null);
            navigate(`/report?studentId=${encodeURIComponent(s.id)}`);
          }}
          onClose={() => setInvoiceTarget(null)}
        />
      )}

      {reminderModal && (
        <AiCostModal
          open={!!reminderModal}
          title="Reminder WA AI"
          estimatedIDR={estimateReminderCost()}
          description={`Pesan pengingat tagihan untuk ${reminderModal.studentName}`}
          onCancel={() => setReminderModal(null)}
          onConfirm={confirmGenerateReminder}
        />
      )}

      {showBillingHelp && (
        <Modal onClose={() => setShowBillingHelp(false)} ariaLabel="Cara kerja tagihan"
          panelClassName="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl outline-none">
          <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Cara Kerja Tagihan</h2>
              <p className="mt-0.5 text-xs text-gray-600">Cara menagih murid sesuai siklusnya.</p>
            </div>
            <button onClick={() => setShowBillingHelp(false)} aria-label="Tutup"
              className="text-xl leading-none text-gray-500 hover:text-gray-700">✕</button>
          </div>

          <div className="space-y-4 overflow-y-auto px-5 py-4 text-sm text-gray-700">
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">Tagihan per Pertemuan (Paket)</h3>
              <ul className="mt-2 space-y-2 text-xs leading-relaxed">
                <li>Untuk murid <strong>Paket per N pertemuan</strong> (8, 10, 12, dst).</li>
                <li>Antrean lintas bulan — sesi <strong>tertua</strong> ditagih lebih dulu.</li>
                <li>Tombol <strong>Terbitkan Paket</strong> membuat invoice + laporan sekaligus untuk N sesi penuh.</li>
                <li>Sisa yang belum genap: <strong>Tagihan Penutup</strong> (muncul saat peralihan kebijakan) menagih sisa 1–N-1 sesi.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">Bulanan & Tutup Bulan</h3>
              <ul className="mt-2 space-y-2 text-xs leading-relaxed">
                <li>Murid <strong>Bulanan</strong> ditagih lewat <strong>Tutup Bulan</strong> — gabungkan sesi yang dapat ditagih pada bulan terpilih.</li>
                <li>Bulan yang sudah ditutup tidak bisa digabung ke laporan/rentang baru.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">Laporan Perkembangan</h3>
              <ul className="mt-2 space-y-2 text-xs leading-relaxed">
                <li>Laporan yang sudah <strong>final</strong> tetapi belum punya invoice muncul di tahap <strong>Siap Ditagih</strong>.</li>
                <li><strong>Terbitkan Invoice</strong> membuat tagihan dari nominal dan periode belajar pada laporan tersebut.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">Manual & Filter</h3>
              <ul className="mt-2 space-y-2 text-xs leading-relaxed">
                <li><strong>Manual</strong> — buat tagihan nominal bebas tanpa mengambil atau menampilkan sesi.</li>
                <li>Filter <strong>Status</strong> dan <strong>Asal invoice</strong> menyaring daftar serta hasil ekspor CSV/PDF.</li>
              </ul>
            </section>
          </div>

          <div className="border-t border-gray-100 px-5 py-3">
            <button onClick={() => setShowBillingHelp(false)}
              className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-indigo-700">
              Mengerti
            </button>
          </div>
        </Modal>
      )}

      {/* Daftar Tagihan WA modal */}
      {showWaAll && (
        <Modal onClose={() => setShowWaAll(false)} ariaLabel="Daftar Tagihan WA"
          panelClassName="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl outline-none">
          <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Daftar Tagihan</h2>
              <p className="mt-0.5 text-xs text-gray-600">Semua tagihan belum lunas yang punya nomor HP — tap untuk buka WhatsApp.</p>
            </div>
            <button onClick={() => setShowWaAll(false)} aria-label="Tutup"
              className="text-xl leading-none text-gray-500 hover:text-gray-700">✕</button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {waAllRows.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">Belum ada tagihan belum lunas dengan nomor HP.</p>
            ) : (
              <div className="space-y-2">
                {waAllRows.map((row) => (
                  <a key={row.payment.id} href={row.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2.5 transition-colors hover:bg-green-50">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-700">{row.label}</p>
                      <p className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">💬 WhatsApp</p>
                    </div>
                    <span className="flex-shrink-0 text-sm font-semibold text-amber-700">{formatRupiah(row.payment.totalCost)}</span>
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 px-5 py-3">
            <button onClick={() => setShowWaAll(false)}
              className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-indigo-700">
              Tutup
            </button>
          </div>
        </Modal>
      )}

      <ConfirmSheet
        open={confirmState !== null}
        title={confirmState?.title ?? ""}
        message={confirmState?.message ?? ""}
        confirmLabel={confirmState?.confirmLabel}
        danger={confirmState?.danger}
        busy={false}
        onCancel={() => setConfirmState(null)}
        onConfirm={() => confirmState?.onConfirm()}
      />
    </div>
  );
}
