import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  createManualPayment, syncReportPayment,
  markPaymentTransferredById, markPaymentUnpaidById, updatePaymentAmountById,
  listAllBillableSessions,
} from "../../db/repos";
import type { Payment, Student, Settings, Session, MonthlyReport } from "../../db/types";
import { formatRupiah, todayWIB, periodLabel } from "../../lib/format";
import Modal from "../../components/Modal";
import { MAX_PAYMENT_AMOUNT, isValidCurrencyAmount, parseCurrencyDigits } from "../../lib/money";
import { invoiceAgeDays, ageBucket, AGE_BUCKET_LABEL, type AgeBucket } from "../../lib/finance";
import { db } from "../../db/db";
import ActivityRing from "../../components/dashboard/ActivityRing";
import { ProgressBar } from "../../components/charts";
import ConfirmSheet from "../../components/ConfirmSheet";
import InvoiceModal from "./InvoiceModal";
import { ITEMS_PER_PDF_PAGE } from "../../lib/invoicePresentation";
import { useSessionCountBilling } from "./useSessionCountBilling";
import type { ConfirmState } from "./useSessionCountBilling";
import { useInvoiceFilters } from "./useInvoiceFilters";
import { useInvoiceExports } from "./useInvoiceExports";
import InvoiceRow from "./InvoiceRow";
import ManualInvoiceForm from "./ManualInvoiceForm";
import InvoicePdfPages from "./InvoicePdfPages";

interface TagihanTabProps {
  payments: Payment[];
  students: Student[];
  settings: Settings;
  reports: MonthlyReport[];
  setMessage: (message: string) => void;
  navigate: (path: string) => void;
  requestedStudentId: string;
}

export default function TagihanTab({
  payments, students, settings, reports, setMessage, navigate, requestedStudentId,
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
  /**
   * Baris tagihan terbuka. Daftar ditampilkan sebagai baris ringkas agar 60+
   * tagihan tidak menjadi puluhan layar; aksi & rincian hidup di panel baris.
   */
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null);
  const appliedFocusRef = useRef(false);

  // Sesi yang dirujuk laporan — dipakai baris invoice & pesan WA.
  const allReportSessions = useLiveQuery(async () => {
    const ids = [...new Set((reports ?? []).flatMap((r) => r.sessionIds))];
    if (ids.length === 0) return new Map<string, Session>();
    const rows = await db.sessions.bulkGet(ids);
    return new Map(rows.filter((s): s is Session => Boolean(s)).map((s) => [s.id, s]));
  }, [reports]);

  // ── Semua sesi billable lintas bulan (resolusi invoice legacy) ──
  const allBillableSessions = useLiveQuery(() => listAllBillableSessions(), []);

  // ── Hooks (logika diekstraksi) ──
  // Tagihan paket (per pertemuan) — antrean, terbitkan, batalkan.
  const sessionCount = useSessionCountBilling({
    requestedStudentId, students, setMessage, setConfirmState,
  });
  // Filter + derived rows daftar tagihan (memoized).
  const invoice = useInvoiceFilters({
    payments, students, reports, allBillableSessions, settings,
    allReportSessions, itemsPerPdfPage: ITEMS_PER_PDF_PAGE,
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
    }
  }, [requestedStudentId, sessionCount.sessionCountBillingProgress, students]);

  // ── Derived (dari hooks) ──
  const { studentMap, allPayments, totals, billRows } = invoice;
  const { totalBilled, totalPaid, totalUnpaid, paidCount, unpaidCount, collectionRate } = totals;
  const {
    invoiceStatusFilter, setInvoiceStatusFilter, invoiceOriginFilter, setInvoiceOriginFilter,
    filteredBillRows, readyReportRows, showReadySections, showIssuedList,
    waAllRows,
  } = invoice;
  const {
    sessionCountBillingProgress, needsActionCount,
    expandedSessionCountStudent, setExpandedSessionCountStudent,
    focusStudentId, setFocusStudentId,
    sessionCountInvoiceBusy, sessionCountCancelBusy,
    handleCreateSessionCountInvoice, handleCancelSessionCountInvoice,
  } = sessionCount;
  const readyActionCount = readyReportRows.length + needsActionCount;
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
  const exports = useInvoiceExports({
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
      ;
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
      <section aria-labelledby="collection-center-title" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-indigo-500">Semua periode</p>
            <h2 id="collection-center-title" className="mt-0.5 text-base font-bold text-slate-800">Alur tagihan</h2>
            <p className="mt-1 max-w-prose text-xs leading-relaxed text-slate-500">
              Dari laporan menjadi tagihan, lalu dibayar. Ketuk salah satu langkah untuk menyaring daftar di bawah.
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-1.5" role="group" aria-label="Filter tahap tagihan">
          {([
            {
              key: "ready" as const,
              step: "01",
              label: "Siap ditagih",
              value: `${readyActionCount} tindakan`,
              hint: "Laporan final & paket yang menunggu invoice",
              activeClass: "border-indigo-300 bg-indigo-600 text-white shadow-sm",
              idleClass: "border-indigo-100 bg-white text-indigo-800 hover:bg-indigo-50",
            },
            {
              key: "semua" as const,
              step: "02",
              label: "Sudah diterbitkan",
              value: formatRupiah(totalBilled),
              hint: `${allPayments.length} tagihan lintas periode`,
              activeClass: "border-blue-300 bg-blue-600 text-white shadow-sm",
              idleClass: "border-blue-100 bg-white text-blue-800 hover:bg-blue-50",
            },
            {
              key: "unpaid" as const,
              step: "03",
              label: "Belum dibayar",
              value: formatRupiah(totalUnpaid),
              hint: `${unpaidCount} tagihan perlu ditindaklanjuti`,
              activeClass: "border-amber-300 bg-amber-500 text-white shadow-sm",
              idleClass: "border-amber-100 bg-white text-amber-800 hover:bg-amber-50",
            },
            {
              key: "paid" as const,
              step: "04",
              label: "Lunas",
              value: formatRupiah(totalPaid),
              hint: `${paidCount} tagihan sudah selesai`,
              activeClass: "border-green-300 bg-green-600 text-white shadow-sm",
              idleClass: "border-green-100 bg-white text-green-800 hover:bg-green-50",
            },
          ]).map((stage) => {
            const active = invoiceStatusFilter === stage.key;
            return (
              <button
                key={stage.key}
                type="button"
                aria-pressed={active}
                onClick={() => selectCollectionStage(stage.key)}
                className={`rounded-lg border px-2.5 py-2 text-left transition-colors ${active ? stage.activeClass : stage.idleClass}`}
              >
                <span className="block text-xs font-bold uppercase tracking-wide opacity-80">
                  {stage.step} · {stage.label}
                </span>
                <span className="mt-0.5 block text-sm font-bold leading-tight">{stage.value}</span>
                <span className="mt-0.5 block text-xs leading-snug opacity-80">{stage.hint}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-pressed={invoiceStatusFilter === "all"}
            onClick={() => selectCollectionStage("all")}
            className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${
              invoiceStatusFilter === "all"
                ? "border-slate-400 bg-slate-700 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            Tampilkan semua langkah
          </button>
          {invoiceStatusFilter === "ready" && (
            <button
              type="button"
              onClick={() => selectCollectionStage("unpaid")}
              className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100"
            >
              Ke tagihan belum dibayar →
            </button>
          )}
        </div>

        {/* Cincin dan catatannya ditumpuk, bukan berdampingan: pada lebar kolom
            keuangan (±382px) teks penjelas hanya kebagian ~100px bila dipaksa
            satu baris dengan cincin. */}
        <div className="mt-3 rounded-xl border border-slate-100 bg-white px-3 py-2.5">
          <ActivityRing
            value={paidCount}
            total={allPayments.length}
            label="Kolektibilitas invoice"
            detail={allPayments.length > 0 ? `${unpaidCount} invoice masih menjadi piutang` : "Terbitkan invoice dari antrean yang siap"}
            size="sm"
            tone={collectionRate >= 80 ? "green" : collectionRate > 0 ? "amber" : "slate"}
          />
          <p className="mt-2 border-t border-slate-100 pt-2 text-xs leading-relaxed text-slate-500">
            <span className="font-semibold text-slate-700">Status invoice ≠ uang masuk.</span>{" "}
            Pelunasan menutup piutang; uang masuk dicatat menurut tanggal pembayaran di Ringkasan.
          </p>
        </div>

        <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3" aria-label="Umur piutang">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Umur piutang</p>
              <p className="mt-0.5 text-xs text-slate-500">Tap bar untuk menyaring daftar invoice belum dibayar pada periode ini.</p>
            </div>
            <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-amber-700 shadow-sm">
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
            <h2 id="ready-report-invoices-title" className="text-sm font-bold text-blue-900">Laporan final siap ditagih</h2>
            <p className="mt-0.5 text-xs text-blue-700">Laporan Perkembangan sudah final, tetapi belum mempunyai invoice. Terbitkan satu per satu setelah nominal diperiksa.</p>
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
                      <p className="mt-0.5 text-xs font-medium text-blue-700">Periode belajar {periodLabel(report.periodStart, report.periodEnd)}</p>
                      <p className="mt-1 text-xs font-bold text-gray-800">{formatRupiah(report.totalCost)}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700">Laporan Final</span>
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
              <p className="mt-0.5 rounded-lg bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">
                Lintas bulan — tidak dipengaruhi pilihan Bulan Keuangan. Sesi tertua ditagih lebih dahulu.
              </p>
            </div>
            <span className="flex-shrink-0 rounded-full bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700">
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
                        <p className="mt-0.5 text-xs text-gray-500">
                          {progress.unbilledCount} sesi belum ditagih
                          {ready && progress.readyBatchCount > 1 ? ` · ${progress.readyBatchCount} paket siap` : ""}
                        </p>
                        {progress.pendingBillingPolicy && (
                          <p className="mt-1 text-xs font-semibold text-amber-700">
                            Peralihan ke {pendingPolicyLabel} tertunda
                          </p>
                        )}
                      </div>
                      <span className={`flex-shrink-0 rounded-full px-2 py-1 text-xs font-bold ${ready ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"}`}>
                        {invalidTarget ? "Atur N" : ready ? "Paket siap" : `${currentCount}/${progress.targetCount}`}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      {invalidTarget ? (
                        <span className="min-w-0 flex-1 rounded-lg bg-amber-50 px-2 py-1.5 text-xs font-medium text-amber-700">
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
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-1 text-xs">
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
                            <div key={session.id} className="grid grid-cols-[46px_minmax(0,1fr)_auto] items-center gap-2 px-1 py-1 text-xs">
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


      {/* Aksi tagihan selalu tersedia, termasuk ketika bulan masih terbuka. */}
      {showIssuedList && (
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Daftar tagihan</p>
            <p className="text-xs text-gray-500 mt-0.5">Ketuk satu tagihan untuk mengubah nominal, mencatat pembayaran, mengirim WA, atau mengunduh invoice.</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowWaAll(true)}
              className="rounded-lg bg-green-500 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green-600"
            >
              Kirim WA massal
            </button>
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 rounded-full px-2 py-1">{filteredBillRows.length}/{allPayments.length}</span>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-50 px-2.5 py-1.5">
          <p className="text-xs text-gray-500">Ekspor CSV/PDF mengikuti langkah dan asal tagihan yang tersaring.</p>
          <div className="flex items-center gap-2">
            <button onClick={handleExportCsv}
              className="rounded-lg border border-green-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-green-700 transition-colors hover:bg-green-50">
              Ekspor CSV
            </button>
            <button onClick={handleExportPdf} disabled={pdfExporting}
              className="rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 disabled:opacity-50">
              {pdfExporting ? "Mengekspor..." : "Ekspor PDF"}
            </button>
          </div>
        </div>
        <div className="space-y-2 rounded-xl bg-gray-50 p-2.5">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-500">Asal invoice</p>
            <div className="flex flex-wrap gap-1" role="group" aria-label="Filter asal invoice">
              {([
                ["semua", "Semua"],
                ["monthly", "Bulanan"],
                ["package", "Paket"],
                ["report", "Laporan"],
                ["manual", "Manual"],
              ] as const).map(([filter, label]) => (
                <button key={filter} type="button" onClick={() => setInvoiceOriginFilter(filter)}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                    invoiceOriginFilter === filter ? "bg-white text-gray-800 shadow-sm ring-1 ring-gray-300" : "text-gray-500 hover:text-gray-700"
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {filteredBillRows.length === 0 ? (
          <p className="rounded-lg bg-gray-50 px-3 py-4 text-center text-sm text-gray-500">
            Tidak ada tagihan yang cocok dengan langkah dan asal ini.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {filteredBillRows.map(({ payment, report, student, sessions }) => (
              <InvoiceRow
                key={payment.id}
                invoice={payment}
                report={report}
                student={student}
                sessions={sessions}
                settings={settings}
                expanded={expandedPaymentId === payment.id}
                amount={billEdits[payment.id] ?? String(payment.totalCost)}
                cancelBusy={Boolean(sessionCountCancelBusy[payment.id])}
                onOpen={() => setExpandedPaymentId(expandedPaymentId === payment.id ? null : payment.id)}
                onAmountChange={(value) => {
                  const { raw } = parseCurrencyDigits(value, MAX_PAYMENT_AMOUNT);
                  setBillEdits((previous) => ({ ...previous, [payment.id]: raw }));
                }}
                onAmountSave={() => void saveBillAmount(payment.id, payment.totalCost)}
                onTogglePaid={() => void (payment.status === "PAID" ? markPaymentUnpaidById(payment.id) : markPaymentTransferredById(payment.id))}
                onOpenReport={() => navigate(report ? `/report?reportId=${encodeURIComponent(report.id)}` : `/report?studentId=${encodeURIComponent(payment.studentId)}`)}
                onOpenInvoice={() => student && setInvoiceTarget({ payment, student })}
                onCancelPackage={() => void handleCancelSessionCountInvoice(
                  payment, student?.name ?? "murid", report?.billingPolicyTransitionTarget ?? report?.billingPolicyAfterBatch, Boolean(report?.finalBillingBatch),
                )}
              />
            ))}
          </ul>
        )}
      </div>
      )}



      <ManualInvoiceForm
        students={students}
        open={showManual}
        selectedStudentId={selectedStudentId}
        selectedMonth={selectedMonth}
        totalCost={totalCost}
        onOpenChange={setShowManual}
        onStudentChange={setSelectedStudentId}
        onMonthChange={setSelectedMonth}
        onTotalCostChange={setTotalCost}
        onSubmit={() => void handleCreatePayment()}
      />

      <InvoicePdfPages payments={visibleBillRows.map((row) => row.payment)} studentsById={studentMap} />

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

      {showBillingHelp && (
        <Modal onClose={() => setShowBillingHelp(false)} ariaLabel="Cara kerja tagihan" showCloseButton={false}
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
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-600">Tagihan per Pertemuan (Paket)</h3>
              <ul className="mt-2 space-y-2 text-xs leading-relaxed">
                <li>Untuk murid <strong>Paket per N pertemuan</strong> (8, 10, 12, dst).</li>
                <li>Antrean lintas bulan — sesi <strong>tertua</strong> ditagih lebih dulu.</li>
                <li>Tombol <strong>Terbitkan Paket</strong> membuat invoice + laporan sekaligus untuk N sesi penuh.</li>
                <li>Sisa yang belum genap: <strong>Tagihan Penutup</strong> (muncul saat peralihan kebijakan) menagih sisa 1–N-1 sesi.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-600">Bulanan</h3>
              <ul className="mt-2 space-y-2 text-xs leading-relaxed">
                <li>Murid <strong>Bulanan</strong> — finalkan Laporan Perkembangan, lalu terbitkan invoice dari langkah <strong>Siap ditagih</strong>.</li>
                <li>Daftar tagihan lintas bulan — semua invoice tampil tanpa perlu memilih bulan.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-600">Laporan Perkembangan</h3>
              <ul className="mt-2 space-y-2 text-xs leading-relaxed">
                <li>Laporan yang sudah <strong>final</strong> tetapi belum punya invoice muncul di langkah <strong>Siap ditagih</strong>.</li>
                <li><strong>Terbitkan Invoice</strong> membuat tagihan dari nominal dan periode belajar pada laporan tersebut.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-600">Manual & Filter</h3>
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

      {/* Modal kirim tagihan WhatsApp massal */}
      {showWaAll && (
        <Modal onClose={() => setShowWaAll(false)} ariaLabel="Kirim tagihan via WhatsApp" showCloseButton={false}
          panelClassName="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl outline-none">
          <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Kirim tagihan via WhatsApp</h2>
              <p className="mt-0.5 text-xs text-gray-600">Semua tagihan belum lunas yang punya nomor HP — ketuk untuk membuka WhatsApp.</p>
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
                      <p className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">💬 WhatsApp</p>
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
