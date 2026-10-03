import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  createManualPayment, syncReportPayment,
  markPaymentTransferredById, markPaymentUnpaidById, updatePaymentAmountById,
  listAllBillableSessions, listInvoiceSnapshotPoints,
} from "../../db/repos";
import type { InvoiceCancellation } from "../../db/repos";
import type { Payment, Student, Settings, Session, MonthlyReport } from "../../db/types";
import { formatRupiah, todayWIB, periodLabel, monthLabel } from "../../lib/format";
import Modal from "../../components/Modal";
import { MAX_PAYMENT_AMOUNT, isValidCurrencyAmount, parseCurrencyDigits } from "../../lib/money";
import { invoiceAgeDays, ageBucket, AGE_BUCKET_LABEL, type AgeBucket } from "../../lib/finance";
import { db } from "../../db/db";
import ActivityRing from "../../components/dashboard/ActivityRing";
import { ProgressBar } from "../../components/charts";
import ConfirmSheet from "../../components/ConfirmSheet";
import { useToastCtx } from "../../components/ToastProvider";
import PinConfirmModal from "../../components/PinConfirmModal";
import InvoiceModal from "./InvoiceModal";
import { ITEMS_PER_PDF_PAGE } from "../../lib/invoicePresentation";
import { useSessionCountBilling } from "./useSessionCountBilling";
import type { ConfirmState } from "./useSessionCountBilling";
import { useInvoiceFilters } from "./useInvoiceFilters";
import { useInvoiceRecovery, invoiceKindLabel, RECOVERY_LIMITS_HINT, snapshotMomentLabel } from "./useInvoiceRecovery";

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

/**
 * Label tombol batal/hapus per baris tagihan (TASK-10 L7).
 *
 * - Invoice dari laporan final (bukan paket) → "Batalkan tagihan".
 * - Tagihan manual tanpa laporan → "Hapus tagihan manual".
 * - Paket punya tombol pembatalannya sendiri di antrean paket.
 * - `PAID`, nominal yang sudah diedit manual, dan laporan legacy tanpa status
 *   final eksplisit sengaja tidak punya tombol (guard-nya di repo).
 *
 * Label tidak boleh memuat frasa "Batalkan tagihan paket" agar locator E2E
 * untuk paket tetap unik.
 */
function cancelLabelFor(payment: Payment, report?: MonthlyReport): string | null {
  if (payment.status !== "UNPAID") return null;
  if (payment.reportId) {
    if (!report || report.billingMode === "session_count") return null;
    if (report.status !== "confirmed" || payment.source !== "auto") return null;
    return "Batalkan tagihan";
  }
  return payment.source === "manual" ? "Hapus tagihan manual" : null;
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
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  /** Pesan mengambang untuk aksi krusial + tombol "Urungkan" (K-02). */
  const toast = useToastCtx();
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
  // Pembatalan/pemulihan/jatuh tempo: konfirmasi → PIN → aksi (TASK-10 L7).
  const recovery = useInvoiceRecovery({
    setMessage, setConfirmState, pinAvailable: Boolean(settings.financialPin),
  });
  // Tagihan paket (per pertemuan) — antrean, terbitkan, batalkan.
  const sessionCount = useSessionCountBilling({
    requestedStudentId, students, setMessage, setConfirmState,
    requirePin: recovery.requestPin,
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

  // ── Riwayat titik pemulihan (R1 timeline: "pulihkan ke tanggal berapa") ──
  /** Nama murid yang riwayatnya sedang dibuka — hanya untuk label modal. */
  const [historyStudentName, setHistoryStudentName] = useState("murid");
  /**
   * Jumlah titik pemulihan tiap tagihan yang dibatalkan, hanya untuk label
   * tombol "Riwayat pemulihan (N)". Titik-titiknya sendiri baru dimuat saat
   * pemilih dibuka lewat `recovery.openSnapshotHistory`.
   */
  const cancelledPaymentIds = useMemo(
    () => [...new Set((recovery.cancellations ?? []).map((item) => item.paymentId))],
    [recovery.cancellations],
  );
  const snapshotPointCounts = useLiveQuery(async () => {
    const counts = await Promise.all(cancelledPaymentIds.map(
      async (paymentId) => [paymentId, (await listInvoiceSnapshotPoints(paymentId)).length] as const,
    ));
    return new Map(counts);
  }, [cancelledPaymentIds]);
  /** Buka pemilih titik pemulihan satu tagihan yang sudah dibatalkan. */
  const openSnapshotHistory = (cancellation: InvoiceCancellation) => {
    setHistoryStudentName(studentMap.get(cancellation.studentId)?.name ?? "Murid dihapus");
    recovery.openSnapshotHistory(cancellation.paymentId);
  };
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

  /**
   * K-02: menandai lunas / membatalkan pelunasan mengubah UANG MASUK, jadi tidak boleh
   * terjadi hanya karena satu ketukan tak sengaja. Sekarang lewat `ConfirmSheet` yang
   * menyebutkan akibatnya, dan hasilnya bisa diurungkan lewat tombol di pesan.
   *
   * Aksi intinya sendiri tidak berubah: `markPaymentTransferredById` /
   * `markPaymentUnpaidById` tetap dipanggil apa adanya. Urungkan bukan operasi baru —
   * kedua fungsi itu saling membalikkan (status + `paidAt` + alokasi sesi/tagihan).
   */
  const togglePaid = async (payment: Payment, wasPaid: boolean) => {
    try {
      if (wasPaid) await markPaymentUnpaidById(payment.id);
      else await markPaymentTransferredById(payment.id);
    } catch (error) {
      setMessage(`Gagal mengubah status tagihan: ${(error as Error).message}`);
      return;
    }

    const nominal = formatRupiah(payment.totalCost);
    if (wasPaid) {
      setMessage(`Pelunasan dibatalkan · uang masuk −${nominal}, piutang +${nominal} ✓`);
      toast.show(
        `Pelunasan dibatalkan · uang masuk −${nominal}`,
        "info", 8000,
        { label: "Urungkan", onClick: () => void markPaymentTransferredById(payment.id) },
      );
    } else {
      toast.show(
        `Ditandai lunas · uang masuk +${nominal}`,
        "success", 8000,
        { label: "Urungkan", onClick: () => void markPaymentUnpaidById(payment.id) },
      );
    }
  };

  const askTogglePaid = (payment: Payment, studentName: string) => {
    if (payment.status === "PAID") {
      setConfirmState({
        title: "Tandai belum dibayar?",
        message: `Tagihan ${studentName} (${formatRupiah(payment.totalCost)}) akan kembali dihitung sebagai piutang — uang masuk berkurang dan tagihan ini kembali muncul di daftar belum dibayar.`,
        confirmLabel: "Tandai belum dibayar",
        danger: true,
        onConfirm: () => { setConfirmState(null); void togglePaid(payment, true); },
      });
      return;
    }
    setConfirmState({
      title: "Tandai sudah dibayar?",
      message: `Uang masuk +${formatRupiah(payment.totalCost)} dan piutang −${formatRupiah(payment.totalCost)} untuk tagihan ${studentName}. Tagihan ini akan berstatus lunas.`,
      confirmLabel: "Tandai lunas",
      onConfirm: () => { setConfirmState(null); void togglePaid(payment, false); },
    });
  };

  return (
    <div className="space-y-4">
      <section aria-labelledby="collection-center-title" className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--ink-accent)]">Semua periode</p>
            <h2 id="collection-center-title" className="mt-0.5 text-base font-bold text-[var(--ink-strong)]">Alur tagihan</h2>
            <p className="mt-1 max-w-prose text-xs leading-relaxed text-[var(--ink-muted)]">
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
              activeClass: "border-[var(--border-accent)] bg-[var(--accent-solid)] text-[var(--on-strong)] shadow-sm",
              idleClass: "border-[var(--border-accent)] bg-[var(--surface-strong)] text-[var(--ink-accent)] hover:bg-[var(--accent-tint)]",
            },
            {
              key: "semua" as const,
              step: "02",
              label: "Sudah diterbitkan",
              value: formatRupiah(totalBilled),
              hint: `${allPayments.length} tagihan lintas periode`,
              activeClass: "border-[var(--brand-tint-strong)] bg-[var(--brand-solid)] text-[var(--on-strong)] shadow-sm",
              idleClass: "border-[var(--brand-tint-strong)] bg-[var(--surface-strong)] text-[var(--ink-brand)] hover:bg-[var(--brand-tint)]",
            },
            {
              key: "unpaid" as const,
              step: "03",
              label: "Belum dibayar",
              value: formatRupiah(totalUnpaid),
              hint: `${unpaidCount} tagihan perlu ditindaklanjuti`,
              activeClass: "border-[var(--border-warn)] bg-[var(--bg-warn-strong)] text-[var(--on-strong)] shadow-sm",
              idleClass: "border-[var(--border-warn)] bg-[var(--surface-strong)] text-[var(--ink-warn)] hover:bg-[var(--bg-warn)]",
            },
            {
              key: "paid" as const,
              step: "04",
              label: "Lunas",
              value: formatRupiah(totalPaid),
              hint: `${paidCount} tagihan sudah selesai`,
              activeClass: "border-[var(--border-success)] bg-[var(--bg-success-strong)] text-[var(--on-strong)] shadow-sm",
              idleClass: "border-[var(--border-success)] bg-[var(--surface-strong)] text-[var(--ink-success)] hover:bg-[var(--bg-success)]",
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
                ? "border-[var(--border-strong)] bg-[var(--surface-inverse)] text-[var(--on-strong)]"
                : "border-[var(--border)] bg-[var(--surface-strong)] text-[var(--ink-muted)] hover:bg-[var(--surface)]"
            }`}
          >
            Tampilkan semua langkah
          </button>
          {invoiceStatusFilter === "ready" && (
            <button
              type="button"
              onClick={() => selectCollectionStage("unpaid")}
              className="rounded-full border border-[var(--border-warn)] bg-[var(--bg-warn)] px-2.5 py-1 text-xs font-semibold text-[var(--ink-warn)] transition-colors hover:bg-[var(--bg-warn)]"
            >
              Ke tagihan belum dibayar →
            </button>
          )}
        </div>

        {/* Cincin dan catatannya ditumpuk, bukan berdampingan: pada lebar kolom
            keuangan (±382px) teks penjelas hanya kebagian ~100px bila dipaksa
            satu baris dengan cincin. */}
        <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2.5">
          <ActivityRing
            value={paidCount}
            total={allPayments.length}
            label="Kolektibilitas invoice"
            detail={allPayments.length > 0 ? `${unpaidCount} invoice masih menjadi piutang` : "Terbitkan invoice dari antrean yang siap"}
            size="sm"
            tone={collectionRate >= 80 ? "green" : collectionRate > 0 ? "amber" : "slate"}
          />
          <p className="mt-2 border-t border-[var(--border)] pt-2 text-xs leading-relaxed text-[var(--ink-muted)]">
            <span className="font-semibold text-[var(--ink-strong)]">Status invoice ≠ uang masuk.</span>{" "}
            Pelunasan menutup piutang; uang masuk dicatat menurut tanggal pembayaran di Ringkasan.
          </p>
        </div>

        <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3" aria-label="Umur piutang">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--ink-muted)]">Umur piutang</p>
              <p className="mt-0.5 text-xs text-[var(--ink-muted)]">Tap bar untuk menyaring daftar invoice belum dibayar pada periode ini.</p>
            </div>
            <span className="rounded-full bg-[var(--surface-strong)] px-2 py-1 text-xs font-semibold text-[var(--ink-warn)] shadow-sm">
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
                  className={`w-full rounded-lg px-2 py-1.5 text-left transition-colors disabled:cursor-default disabled:opacity-45 ${selected ? "bg-[var(--surface-strong)] shadow-sm ring-1 ring-[var(--border-strong)]" : "hover:bg-[var(--surface-strong)]"}`}
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
        <section aria-labelledby="ready-report-invoices-title" className="space-y-3 rounded-xl border border-[var(--brand-tint-strong)] bg-[var(--brand-tint)]/40 p-4 shadow-sm">
          <div>
            <h2 id="ready-report-invoices-title" className="text-sm font-bold text-[var(--ink-brand)]">Laporan final siap ditagih</h2>
            <p className="mt-0.5 text-xs text-[var(--ink-brand)]">Laporan Perkembangan sudah final, tetapi belum mempunyai invoice. Terbitkan satu per satu setelah nominal diperiksa.</p>
          </div>
          <div className="space-y-2">
            {readyReportRows.map(({ report, student }) => {
              const studentName = student?.name ?? "Murid dihapus";
              const busy = Boolean(reportInvoiceBusy[report.id]);
              return (
                <article key={report.id} className="rounded-xl border border-[var(--brand-tint-strong)] bg-[var(--surface-strong)] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--ink-strong)]">{studentName}</p>
                      <p className="mt-0.5 text-xs font-medium text-[var(--ink-brand)]">Periode belajar {periodLabel(report.periodStart, report.periodEnd)}</p>
                      <p className="mt-1 text-xs font-bold text-[var(--ink-strong)]">{formatRupiah(report.totalCost)}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-[var(--brand-tint-strong)] px-2 py-1 text-xs font-bold text-[var(--ink-brand)]">Laporan Final</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/report?reportId=${encodeURIComponent(report.id)}`)}
                      className="rounded-lg border border-[var(--brand-tint-strong)] px-3 py-2 text-xs font-semibold text-[var(--ink-brand)] hover:bg-[var(--brand-tint)]"
                    >Lihat Laporan</button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleIssueReportInvoice(report, studentName)}
                      className="rounded-lg bg-[var(--brand-solid)] px-3 py-2 text-xs font-semibold text-[var(--on-strong)] hover:bg-[var(--brand-solid)] disabled:cursor-wait disabled:opacity-50"
                    >{busy ? "Menerbitkan..." : "Terbitkan Invoice"}</button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {showReadySections && (
      <section aria-labelledby="session-count-billing-title" className="bg-[var(--surface-strong)] rounded-xl p-4 shadow-sm border border-[var(--border-accent)] space-y-3">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 id="session-count-billing-title" className="text-sm font-bold text-[var(--ink-strong)]">Tagihan per Pertemuan</h2>
                <button
                  type="button"
                  onClick={() => setShowBillingHelp(true)}
                  aria-label="Bantuan cara kerja tagihan"
                  title="Cara kerja tagihan"
                  className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[var(--bg-subtle)] text-sm font-bold text-[var(--ink-muted)] transition-colors hover:bg-[var(--accent-tint)] hover:text-[var(--ink-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-accent)]"
                >?</button>
              </div>
              <p className="mt-0.5 rounded-lg bg-[var(--accent-tint)] px-2 py-1 text-xs font-medium text-[var(--ink-accent)]">
                Lintas bulan — tidak dipengaruhi pilihan Bulan Keuangan. Sesi tertua ditagih lebih dahulu.
              </p>
            </div>
            <span className="flex-shrink-0 rounded-full bg-[var(--accent-tint)] px-2 py-1 text-xs font-semibold text-[var(--ink-accent)]">
              {needsActionCount} perlu tindakan
            </span>
          </div>
        </div>

        {(sessionCountBillingProgress ?? []).length === 0 ? (
          <p className="rounded-lg bg-[var(--surface)] px-3 py-4 text-center text-xs text-[var(--ink-muted)]">
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
                <article key={progress.studentId} className={`rounded-xl border p-3 ${focusStudentId === progress.studentId ? "ring-2 ring-[var(--border-accent)] ring-offset-1" : ""} ${ready ? "border-[var(--border-accent)] bg-[var(--accent-tint)]/40" : "border-[var(--border)]"}`}>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => { setFocusStudentId(null); setExpandedSessionCountStudent(expanded ? null : progress.studentId); }}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--ink-strong)]">{progress.studentName}</p>
                        <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
                          {progress.unbilledCount} sesi belum ditagih
                          {ready && progress.readyBatchCount > 1 ? ` · ${progress.readyBatchCount} paket siap` : ""}
                        </p>
                        {progress.pendingBillingPolicy && (
                          <p className="mt-1 text-xs font-semibold text-[var(--ink-warn)]">
                            Peralihan ke {pendingPolicyLabel} tertunda
                          </p>
                        )}
                      </div>
                      <span className={`flex-shrink-0 rounded-full px-2 py-1 text-xs font-bold ${ready ? "bg-[var(--accent-solid)] text-[var(--on-strong)]" : "bg-[var(--bg-subtle)] text-[var(--ink-muted)]"}`}>
                        {invalidTarget ? "Atur N" : ready ? "Paket siap" : `${currentCount}/${progress.targetCount}`}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      {invalidTarget ? (
                        <span className="min-w-0 flex-1 rounded-lg bg-[var(--bg-warn)] px-2 py-1.5 text-xs font-medium text-[var(--ink-warn)]">
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
                      <span className="flex-shrink-0 text-xs text-[var(--ink-muted)]">{expanded ? "▾" : "▸"}</span>
                    </div>
                  </button>

                  {expanded && (
                    <div className="mt-3 border-t border-[var(--border-accent)] pt-3">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-1 text-xs">
                        <span className="font-semibold text-[var(--ink-muted)]">
                          {ready ? `${progress.targetCount} sesi paket berikutnya` : "Sesi terkumpul"}
                        </span>
                        <span className="text-[var(--ink-muted)]">{progress.nextBatchHours}j · {formatRupiah(progress.nextBatchTotal)}</span>
                      </div>
                      {progress.nextBatchSessions.length === 0 ? (
                        <p className="rounded-lg bg-[var(--surface-strong)] px-3 py-2 text-xs text-[var(--ink-muted)]">Belum ada sesi billable.</p>
                      ) : (
                        <div className="space-y-1 rounded-lg bg-[var(--surface-strong)] p-2">
                          {progress.nextBatchSessions.map((session) => (
                            <div key={session.id} className="grid grid-cols-[46px_minmax(0,1fr)_auto] items-center gap-2 px-1 py-1 text-xs">
                              <span className="font-mono text-[var(--ink-muted)]">{session.date.slice(5).replace("-", "/")}</span>
                              <span className="truncate text-[var(--ink-muted)]">
                                {session.status === "NO_SHOW" ? "Tidak hadir (ditagihkan)" : session.subjects.slice(0, 2).join(", ") || "—"}
                              </span>
                              <span className="text-right font-medium text-[var(--ink-strong)]">{formatRupiah(session.cost)}</span>
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
                    className={`mt-3 w-full rounded-lg px-3 py-2.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:bg-[var(--bg-subtle)] disabled:text-[var(--ink-muted)] ${invalidTarget ? "border border-[var(--border-warn)] bg-[var(--bg-warn)] text-[var(--ink-warn)] hover:bg-[var(--bg-warn)]" : "bg-[var(--accent-solid)] text-[var(--on-strong)] hover:bg-[var(--accent-solid)]"}`}
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
                      className="mt-2 w-full rounded-lg border border-[var(--border-warn)] bg-[var(--bg-warn)] px-3 py-2.5 text-xs font-semibold text-[var(--ink-warn)] transition-colors hover:bg-[var(--bg-warn)] disabled:opacity-50"
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
      <div className="bg-[var(--surface-strong)] rounded-xl p-4 shadow-sm border border-[var(--border)] space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs text-[var(--ink-muted)] font-medium uppercase tracking-wide">Daftar tagihan</p>
            <p className="text-xs text-[var(--ink-muted)] mt-0.5">Ketuk satu tagihan untuk mengubah nominal, mencatat pembayaran, mengirim WA, atau mengunduh invoice.</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs font-semibold text-[var(--ink-muted)] bg-[var(--bg-subtle)] rounded-full px-2 py-1">{filteredBillRows.length}/{allPayments.length}</span>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--surface)] px-2.5 py-1.5">
          <p className="text-xs text-[var(--ink-muted)]">Ekspor CSV/PDF mengikuti langkah dan asal tagihan yang tersaring.</p>
          <div className="flex items-center gap-2">
            <button onClick={handleExportCsv}
              className="rounded-lg border border-[var(--border-success)] bg-[var(--surface-strong)] px-2.5 py-1.5 text-xs font-semibold text-[var(--ink-success)] transition-colors hover:bg-[var(--bg-success)]">
              Ekspor CSV
            </button>
            <button onClick={handleExportPdf} disabled={pdfExporting}
              className="rounded-lg border border-[var(--border-accent)] bg-[var(--surface-strong)] px-2.5 py-1.5 text-xs font-semibold text-[var(--ink-accent)] transition-colors hover:bg-[var(--accent-tint)] disabled:opacity-50">
              {pdfExporting ? "Mengekspor..." : "Ekspor PDF"}
            </button>
          </div>
        </div>
        <div className="space-y-2 rounded-xl bg-[var(--surface)] p-2.5">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-[var(--ink-muted)]">Asal invoice</p>
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
                    invoiceOriginFilter === filter ? "bg-[var(--surface-strong)] text-[var(--ink-strong)] shadow-sm ring-1 ring-[var(--border-strong)]" : "text-[var(--ink-muted)] hover:text-[var(--ink-strong)]"
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {filteredBillRows.length === 0 ? (
          <p className="rounded-lg bg-[var(--surface)] px-3 py-4 text-center text-sm text-[var(--ink-muted)]">
            Tidak ada tagihan yang cocok dengan langkah dan asal ini.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
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
                onTogglePaid={() => askTogglePaid(payment, student?.name ?? "murid")}
                onOpenReport={() => navigate(report ? `/report?reportId=${encodeURIComponent(report.id)}` : `/report?studentId=${encodeURIComponent(payment.studentId)}`)}
                onOpenInvoice={() => student && setInvoiceTarget({ payment, student })}
                onCancelPackage={() => void handleCancelSessionCountInvoice(
                  payment, student?.name ?? "murid", report?.billingPolicyTransitionTarget ?? report?.billingPolicyAfterBatch, Boolean(report?.finalBillingBatch),
                )}
                recovery={{
                  cancelLabel: cancelLabelFor(payment, report),
                  cancelBusy: Boolean(recovery.busyKeys[`cancel-${payment.id}`]),
                  onCancel: () => (payment.reportId
                    ? recovery.askCancelReportInvoice(payment, student?.name ?? "murid")
                    : recovery.askDeleteManualPayment(payment, student?.name ?? "murid")),
                  dueAtSaving: Boolean(recovery.busyKeys[`due-${payment.id}`]),
                  onSaveDueAt: (dueAt) => recovery.askUpdateDueAt(payment, student?.name ?? "murid", dueAt),
                }}
              />
            ))}
          </ul>
        )}
      </div>
      )}



      {/* ── Tagihan dibatalkan (R1) — pemulihan lokal per perangkat ── */}
      {(recovery.cancellations ?? []).length > 0 && (
        <section aria-labelledby="cancelled-invoices-title" className="space-y-3 rounded-xl border border-[var(--border-warn)] bg-[var(--bg-warn)]/40 p-4 shadow-sm">
          <div>
            <h2 id="cancelled-invoices-title" className="text-sm font-bold text-[var(--ink-warn)]">Tagihan dibatalkan — bisa dipulihkan</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-[var(--ink-warn)]">
              {RECOVERY_LIMITS_HINT} Pemulihan ditolak bila sesi, laporan, atau siklus murid sudah berubah.
            </p>
          </div>
          <div className="space-y-2">
            {(recovery.cancellations ?? []).map((cancellation) => {
              const studentName = studentMap.get(cancellation.studentId)?.name ?? "Murid dihapus";
              const busy = Boolean(recovery.busyKeys[`restore-${cancellation.snapshotId}`]);
              const discarding = Boolean(recovery.busyKeys[`discard-${cancellation.snapshotId}`]);
              return (
                <article key={cancellation.snapshotId} className="rounded-xl border border-[var(--border-warn)] bg-[var(--surface-strong)] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--ink-strong)]">{studentName}</p>
                      <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
                        {invoiceKindLabel(cancellation.kind)} · {monthLabel(cancellation.month)} · {cancellation.sessionCount} sesi
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-[var(--ink-strong)]">{formatRupiah(cancellation.totalCost)}</span>
                  </div>
                  <div className="mt-3 flex items-stretch gap-2">
                    <button
                      type="button"
                      disabled={busy || discarding}
                      onClick={() => recovery.askRestoreCancellation(cancellation, studentName)}
                      className="flex-1 rounded-lg border border-[var(--border-warn)] py-2 text-xs font-semibold text-[var(--ink-warn)] transition-colors hover:bg-[var(--bg-warn)] disabled:cursor-wait disabled:opacity-50"
                    >
                      {busy ? "Memulihkan..." : "Pulihkan tagihan"}
                    </button>
                    {/* Sekunder: hanya membuang salinan pemulihannya, tagihan tetap dibatalkan. */}
                    <button
                      type="button"
                      disabled={busy || discarding}
                      aria-label={`Hapus entri pemulihan tagihan ${studentName}`}
                      onClick={() => recovery.askDiscardCancellation(cancellation, studentName)}
                      className="shrink-0 rounded-lg border border-[var(--border-danger)] px-3 py-2 text-xs font-semibold text-[var(--ink-danger)] transition-colors hover:bg-[var(--bg-danger)] disabled:cursor-wait disabled:opacity-50"
                    >
                      {discarding ? "Menghapus..." : "Hapus"}
                    </button>
                  </div>
                  {/* Sekunder: pemilih titik waktu — semua titik pemulihan tagihan ini. */}
                  <button
                    type="button"
                    disabled={busy || discarding}
                    aria-label={`Riwayat pemulihan tagihan ${studentName}`}
                    onClick={() => openSnapshotHistory(cancellation)}
                    className="mt-2 w-full rounded-lg border border-[var(--border-warn)] py-2 text-xs font-semibold text-[var(--ink-warn)] transition-colors hover:bg-[var(--bg-warn)] disabled:cursor-wait disabled:opacity-50"
                  >
                    Riwayat pemulihan ({snapshotPointCounts?.get(cancellation.paymentId) ?? 1})
                  </button>
                </article>
              );
            })}
          </div>
        </section>
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
          onClose={() => setInvoiceTarget(null)}
        />
      )}

      {showBillingHelp && (
        <Modal onClose={() => setShowBillingHelp(false)} ariaLabel="Cara kerja tagihan" showCloseButton={false}
          panelClassName="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-[var(--surface-strong)] shadow-xl sm:rounded-2xl outline-none">
          <div className="flex items-start justify-between border-b border-[var(--border)] px-5 py-4">
            <div>
              <h2 className="text-lg font-bold text-[var(--ink-strong)]">Cara Kerja Tagihan</h2>
              <p className="mt-0.5 text-xs text-[var(--ink-muted)]">Cara menagih murid sesuai siklusnya.</p>
            </div>
            <button onClick={() => setShowBillingHelp(false)} aria-label="Tutup"
              className="text-xl leading-none text-[var(--ink-muted)] hover:text-[var(--ink-strong)]">✕</button>
          </div>

          <div className="space-y-4 overflow-y-auto px-5 py-4 text-sm text-[var(--ink-strong)]">
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">Tagihan per Pertemuan (Paket)</h3>
              <ul className="mt-2 space-y-2 text-xs leading-relaxed">
                <li>Untuk murid <strong>Paket per N pertemuan</strong> (8, 10, 12, dst).</li>
                <li>Antrean lintas bulan — sesi <strong>tertua</strong> ditagih lebih dulu.</li>
                <li>Tombol <strong>Terbitkan Paket</strong> membuat invoice + laporan sekaligus untuk N sesi penuh.</li>
                <li>Sisa yang belum genap: <strong>Tagihan Penutup</strong> (muncul saat peralihan kebijakan) menagih sisa 1–N-1 sesi.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">Bulanan</h3>
              <ul className="mt-2 space-y-2 text-xs leading-relaxed">
                <li>Murid <strong>Bulanan</strong> — finalkan Laporan Perkembangan, lalu terbitkan invoice dari langkah <strong>Siap ditagih</strong>.</li>
                <li>Daftar tagihan lintas bulan — semua invoice tampil tanpa perlu memilih bulan.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">Laporan Perkembangan</h3>
              <ul className="mt-2 space-y-2 text-xs leading-relaxed">
                <li>Laporan yang sudah <strong>final</strong> tetapi belum punya invoice muncul di langkah <strong>Siap ditagih</strong>.</li>
                <li><strong>Terbitkan Invoice</strong> membuat tagihan dari nominal dan periode belajar pada laporan tersebut.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">Manual & Filter</h3>
              <ul className="mt-2 space-y-2 text-xs leading-relaxed">
                <li><strong>Manual</strong> — buat tagihan nominal bebas tanpa mengambil atau menampilkan sesi.</li>
                <li>Filter <strong>Status</strong> dan <strong>Asal invoice</strong> menyaring daftar serta hasil ekspor CSV/PDF.</li>
              </ul>
            </section>
          </div>

          <div className="border-t border-[var(--border)] px-5 py-3">
            <button onClick={() => setShowBillingHelp(false)}
              className="w-full rounded-xl bg-[var(--accent-solid)] py-2.5 text-sm font-bold text-[var(--on-strong)] transition-colors hover:bg-[var(--accent-solid)]">
              Mengerti
            </button>
          </div>
        </Modal>
      )}

      {/* ── Pemilih titik pemulihan (R1 timeline): pilih tanggal mana yang dipulihkan ── */}
      {recovery.snapshotPaymentId !== null && (
        <Modal
          onClose={recovery.closeSnapshotHistory}
          ariaLabel={`Riwayat pemulihan tagihan ${historyStudentName}`}
          showCloseButton={false}
          panelClassName="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-[var(--surface-strong)] shadow-xl sm:rounded-2xl outline-none"
        >
          <div className="flex items-start justify-between border-b border-[var(--border)] px-5 py-4">
            <div>
              <h2 className="text-lg font-bold text-[var(--ink-strong)]">Riwayat pemulihan</h2>
              <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
                Tagihan {historyStudentName} — pilih satu titik waktu untuk dipulihkan persis seperti keadaannya saat itu.
              </p>
            </div>
            <button onClick={recovery.closeSnapshotHistory} aria-label="Tutup"
              className="text-xl leading-none text-[var(--ink-muted)] hover:text-[var(--ink-strong)]">✕</button>
          </div>

          <div className="space-y-3 overflow-y-auto px-5 py-4">
            <p className="text-xs leading-relaxed text-[var(--ink-warn)]">{RECOVERY_LIMITS_HINT}</p>
            {recovery.snapshotPoints === undefined ? (
              <p className="text-sm text-[var(--ink-muted)]">Memuat riwayat pemulihan…</p>
            ) : recovery.snapshotPoints.length === 0 ? (
              <p className="text-sm text-[var(--ink-muted)]">Belum ada titik pemulihan untuk tagihan ini di perangkat ini.</p>
            ) : (
              <ol className="space-y-2">
                {[...recovery.snapshotPoints]
                  .sort((a, b) => b.cancelAt.localeCompare(a.cancelAt))
                  .map((point, index) => {
                    const pointBusy = Boolean(recovery.busyKeys[`restore-${point.snapshotId}`]);
                    const hasDetails = point.month !== "";
                    // Hanya titik yang salinannya SUDAH DIHAPUS yang tidak bisa
                    // dipakai lagi. Titik yang pernah dipulihkan tetap bisa
                    // dipilih → inilah jalan kembali kalau pemulihan sebelumnya
                    // salah. `spent` hanya jadi penanda riwayat.
                    const unavailable = Boolean(point.discardedAt);
                    const reason = point.discardedAt
                      ? `salinan sudah dihapus ${snapshotMomentLabel(point.discardedAt)}`
                      : undefined;
                    return (
                      <li key={point.snapshotId} className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[var(--ink-strong)]">
                              Dibatalkan {snapshotMomentLabel(point.cancelAt)}
                              {index === 0 && (
                                <span className="ml-2 rounded-full bg-[var(--bg-warn)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--ink-warn)]">
                                  terbaru
                                </span>
                              )}
                            </p>
                            <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
                              {invoiceKindLabel(point.kind)} · {hasDetails
                                ? `${monthLabel(point.month)} · ${point.sessionCount} sesi`
                                : "rincian nominal sudah tidak tersimpan"}
                            </p>
                            {!unavailable && !point.restoredAt && (
                              <p className="mt-1 text-[11px] font-semibold text-[var(--ink-success)]">Masih bisa dipulihkan</p>
                            )}
                            {point.restoredAt && (
                              <p className="mt-1 text-[11px] font-semibold text-[var(--ink-accent)]">
                                Pernah dipulihkan {snapshotMomentLabel(point.restoredAt)} — bisa dipilih lagi untuk kembali ke titik ini
                              </p>
                            )}
                          </div>
                          {hasDetails && (
                            <span className="shrink-0 text-sm font-bold text-[var(--ink-strong)]">{formatRupiah(point.totalCost)}</span>
                          )}
                        </div>
                        <div className="mt-2">
                          <button
                            type="button"
                            disabled={unavailable || pointBusy}
                            onClick={() => recovery.askRestoreSnapshot(point, historyStudentName)}
                            className="w-full rounded-lg border border-[var(--border-warn)] py-2 text-xs font-semibold text-[var(--ink-warn)] transition-colors hover:bg-[var(--bg-warn)] disabled:cursor-not-allowed disabled:border-[var(--border)] disabled:text-[var(--ink-muted)]"
                          >
                            {pointBusy ? "Memulihkan..." : point.restoredAt ? "Kembalikan ke titik ini" : "Pulihkan titik ini"}
                          </button>
                          {reason && (
                            <p className="mt-1.5 text-[11px] text-[var(--ink-muted)]">Tidak bisa dipulihkan: {reason}.</p>
                          )}
                        </div>
                      </li>
                    );
                  })}
              </ol>
            )}
          </div>

          <div className="border-t border-[var(--border)] px-5 py-3">
            <button onClick={recovery.closeSnapshotHistory}
              className="w-full rounded-xl bg-[var(--accent-solid)] py-2.5 text-sm font-bold text-[var(--on-strong)] transition-colors hover:bg-[var(--accent-solid)]">
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

      {/* D4: PIN Keuangan wajib untuk batal, pulihkan, dan ubah jatuh tempo. */}
      {recovery.pinAction && settings.financialPin && (
        <PinConfirmModal
          storedPin={settings.financialPin}
          title={recovery.pinAction.title}
          description={recovery.pinAction.description}
          confirmLabel={recovery.pinAction.confirmLabel}
          onCancel={recovery.cancelPinAction}
          onConfirm={recovery.pinAction.onConfirm}
        />
      )}
    </div>
  );
}
