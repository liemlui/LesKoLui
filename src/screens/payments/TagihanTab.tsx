import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  listMonthClosings, getMonthClosing, listScheduledForMonth,
  listSessionCountBillingProgress, createSessionCountInvoice, cancelSessionCountInvoice,
  closeMonth, reopenMonth, createManualPayment,
  markPaymentTransferredById, markPaymentUnpaidById, updatePaymentAmountById,
  computeMonthBills,
} from "../../db/repos";
import type { SessionCountBillingProgress } from "../../db/repos";
import type { Payment, Student, Settings, Session, MonthlyReport } from "../../db/types";
import { reportStatus } from "../../db/types";
import { monthRange } from "../../db/repos/helpers";
import { formatRupiah, todayWIB, monthLabel, periodLabel } from "../../lib/format";
import { loadHtmlToImage, loadJsPdf } from "../../lib/exportDeps";
import { generatePaymentReminder, estimatePaymentReminderCost } from "../../lib/aiClient";
import { AiCostModal } from "../../components/AiCostModal";
import Modal from "../../components/Modal";
import { buildBillingMessage, toWaNumber } from "../../lib/waBilling";
import { escapeCsvCell } from "../../lib/csv";
import { downloadBlob } from "../../lib/download";
import { MAX_PAYMENT_AMOUNT, clampCurrencyAmount, isValidCurrencyAmount, parseCurrencyDigits } from "../../lib/money";
import { buildMonthClosingProjection } from "../../lib/billingPreview";
import { db } from "../../db/db";
import ActivityRing from "../../components/dashboard/ActivityRing";
import ConfirmSheet from "../../components/ConfirmSheet";
import InvoiceModal from "./InvoiceModal";

type ConfirmState = {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
};

interface TagihanTabProps {
  month: string;
  setMonth: (month: string) => void;
  payments: Payment[];
  students: Student[];
  settings: Settings;
  reports: MonthlyReport[];
  monthSessions: Session[];
  monthExpenses: import("../../db/types").Expense[];
  setMessage: (message: string) => void;
  navigate: (path: string) => void;
  requestedStudentId: string;
}

const ITEMS_PER_PDF_PAGE = 5;

export default function TagihanTab({
  month, setMonth, payments, students, settings, reports, monthSessions, setMessage, navigate, requestedStudentId,
}: TagihanTabProps) {
  // ── Lazy data (loaded only while this tab is mounted) ──
  const closings = useLiveQuery(() => listMonthClosings(), []);
  const sessionCountBillingProgress = useLiveQuery(() => listSessionCountBillingProgress(), []);
  const monthClosing = useLiveQuery(() => getMonthClosing(month), [month]);
  // Preview tutup bulan dari satu sumber kebenaran (computeMonthBills).
  const previewBills = useLiveQuery(() => computeMonthBills(month, { excludeReportCovered: true }), [month]);
  const allReportSessions = useLiveQuery(async () => {
    const ids = [...new Set((reports ?? []).flatMap((r) => r.sessionIds))];
    if (ids.length === 0) return new Map<string, Session>();
    const rows = await db.sessions.bulkGet(ids);
    return new Map(rows.filter((s): s is Session => Boolean(s)).map((s) => [s.id, s]));
  }, [reports]);

  // ── Local UI state ──
  const [billEdits, setBillEdits] = useState<Record<string, string>>({});
  const [closingBusy, setClosingBusy] = useState(false);
  const [expandedPreview, setExpandedPreview] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => todayWIB().slice(0, 7));
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [totalCost, setTotalCost] = useState(0);
  const [showManual, setShowManual] = useState(false);
  const [billFilter, setBillFilter] = useState<"semua" | "bulan" | "periode">("semua");
  const [showBillingHelp, setShowBillingHelp] = useState(false);
  const [expandedSessionCountStudent, setExpandedSessionCountStudent] = useState<string | null>(() => requestedStudentId || null);
  const [focusStudentId, setFocusStudentId] = useState<string | null>(() => requestedStudentId || null);
  const [sessionCountInvoiceBusy, setSessionCountInvoiceBusy] = useState<Record<string, boolean>>({});
  const [sessionCountCancelBusy, setSessionCountCancelBusy] = useState<Record<string, boolean>>({});
  const appliedFocusRef = useRef(false);

  const [pdfExporting, setPdfExporting] = useState(false);
  const [reminderLoading, setReminderLoading] = useState<string | null>(null);
  const [reminderModal, setReminderModal] = useState<{ paymentId: string; studentName: string; parentName?: string; month: string; amount: number } | null>(null);
  const [invoiceTarget, setInvoiceTarget] = useState<{ payment: Payment; student: Student } | null>(null);
  const [invoiceExporting, setInvoiceExporting] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [showWaAll, setShowWaAll] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  // Deep-link focus (searchParams studentId) → buka baris/panel yang relevan.
  useEffect(() => {
    if (appliedFocusRef.current) return;
    if (!requestedStudentId || sessionCountBillingProgress === undefined || students === undefined) return;
    appliedFocusRef.current = true;
    if (sessionCountBillingProgress.some((row) => row.studentId === requestedStudentId)) {
      setExpandedSessionCountStudent(requestedStudentId);
      return;
    }
    const requestedStudent = students.find((student) => student.id === requestedStudentId);
    if (!requestedStudent) return;
    if (requestedStudent.billingPolicy === "manual") {
      setSelectedStudentId(requestedStudentId);
      setShowManual(true);
    } else if (requestedStudent.billingPolicy !== "session_count") {
      setExpandedPreview(requestedStudentId);
    }
  }, [requestedStudentId, sessionCountBillingProgress, students]);

  // ── Derived ──
  const studentMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
  const monthPayments = useMemo(() => payments.filter((p) => p.month === month), [payments, month]);
  const totalBilled = monthPayments.reduce((s, p) => s + p.totalCost, 0);

  const coveredSessionIds = useMemo(
    () => new Set(reports.filter((r) => reportStatus(r) === "confirmed").flatMap((r) => r.sessionIds)),
    [reports]
  );
  const closingSessions = useMemo(
    () => monthSessions.filter((session) => {
      if (coveredSessionIds.has(session.id)) return false;
      const student = students.find((row) => row.id === session.studentId);
      return (student?.billingPolicy ?? "monthly") === "monthly";
    }),
    [monthSessions, coveredSessionIds, students]
  );
  const skippedClosingStudents = new Set(
    monthSessions
      .filter((session) => {
        if (coveredSessionIds.has(session.id)) return false;
        const policy = studentMap.get(session.studentId)?.billingPolicy ?? "monthly";
        return policy !== "monthly";
      })
      .map((session) => session.studentId)
  ).size;

  const closingProjection = buildMonthClosingProjection(previewBills ?? [], monthPayments);
  const previewSessionsByStudent = closingSessions.reduce<Map<string, Session[]>>((m, s) => {
    const arr = m.get(s.studentId) ?? [];
    arr.push(s);
    m.set(s.studentId, arr);
    return m;
  }, new Map());

  const billRows = monthPayments
    .map((p) => {
      const linkedReport = p.reportId ? reports.find((report) => report.id === p.reportId) : undefined;
      return {
        payment: p,
        report: linkedReport,
        student: studentMap.get(p.studentId),
        sessions: linkedReport
          ? linkedReport.sessionIds
              .map((id) => allReportSessions?.get(id))
              .filter((s): s is Session => Boolean(s))
          : monthSessions.filter((s) => s.studentId === p.studentId),
      };
    })
    .sort((a, b) => b.payment.totalCost - a.payment.totalCost);

  const filteredBillRows = billFilter === "bulan"
    ? billRows.filter((r) => {
        const p = r.payment;
        return r.report?.billingMode !== "session_count"
          && p.periodStart && p.periodEnd
          && p.periodStart === `${p.month}-01`
          && p.periodEnd === monthRange(p.month).end;
      })
    : billFilter === "periode"
      ? billRows.filter((r) => {
          const p = r.payment;
          return r.report?.billingMode === "session_count"
            || Boolean(p.periodStart && p.periodEnd && !(p.periodStart === `${p.month}-01` && p.periodEnd === monthRange(p.month).end));
        })
      : billRows;

  const monthsOverview = (closings ?? []).map((c) => {
    const ps = payments.filter((p) => p.month === c.month);
    return {
      month: c.month,
      total: ps.length,
      paid: ps.filter((p) => p.status === "PAID").length,
      piutang: ps.filter((p) => p.status === "UNPAID").reduce((s, p) => s + p.totalCost, 0),
    };
  });

  // ── Availability tutup bulan ──
  const _today = todayWIB();
  const curMonth = _today.slice(0, 7);
  const curDay = Number(_today.slice(8, 10));
  const canClose = month < curMonth || (month === curMonth && curDay >= 28);
  const closeHint = month > curMonth
    ? "Bulan belum berjalan."
    : "Tutup bulan berjalan tersedia mulai tanggal 28.";

  const needsActionCount = (sessionCountBillingProgress ?? []).filter((row) => (
    row.readyBatchCount > 0
    || Boolean(row.pendingBillingPolicy && row.unbilledCount > 0 && row.unbilledCount < row.targetCount)
  )).length;

  const pdfPageGroups: Payment[][] = [];
  for (let i = 0; i < monthPayments.length; i += ITEMS_PER_PDF_PAGE)
    pdfPageGroups.push(monthPayments.slice(i, i + ITEMS_PER_PDF_PAGE));

  const pill = (paid: boolean) =>
    `text-[11px] font-semibold px-2 py-0.5 rounded-full ${paid ? "text-green-700 bg-green-100" : "text-amber-700 bg-amber-100"}`;

  // ── Handlers ──
  const handleCreatePayment = async () => {
    if (!selectedStudentId || !selectedMonth || !isValidCurrencyAmount(totalCost)) { setMessage("Lengkapi semua data dengan nominal valid!"); return; }
    try {
      await createManualPayment({ studentId: selectedStudentId, month: selectedMonth, totalCost, status: "UNPAID" });
      setMessage("Tagihan manual baru dibuat ✓");
      setTotalCost(0);
    } catch (error) {
      const reason = (error as Error).message;
      setMessage(reason.includes("Manual payment already exists")
        ? "Tagihan manual untuk murid dan bulan ini sudah ada."
        : `Gagal: ${reason}`);
    }
  };

  const doCreateSessionCountInvoice = async (
    progress: SessionCountBillingProgress,
    finalBatch: boolean,
  ) => {
    setSessionCountInvoiceBusy((current) => ({ ...current, [progress.studentId]: true }));
    try {
      const result = await createSessionCountInvoice(progress.studentId, { finalBatch });
      setMonth(result.month);
      setFocusStudentId(null);
      setExpandedSessionCountStudent(null);
      setMessage(
        `Tagihan ${result.finalBatch ? "penutup" : "paket"} ${result.sessionCount} pertemuan untuk ${progress.studentName} berhasil diterbitkan (${formatRupiah(result.totalCost)}) ✓`
        + (result.activatedBillingPolicy
          ? ` Siklus tagihan kini ${result.activatedBillingPolicy === "manual" ? "Manual" : "Bulanan"}.`
          : "")
      );
    } catch (error) {
      setMessage(`Gagal menerbitkan tagihan ${progress.studentName}: ${(error as Error).message}`);
    } finally {
      setSessionCountInvoiceBusy((current) => {
        const next = { ...current };
        delete next[progress.studentId];
        return next;
      });
    }
  };

  const handleCreateSessionCountInvoice = (
    progress: SessionCountBillingProgress,
    finalBatch = false,
  ) => {
    const canIssue = finalBatch
      ? Boolean(progress.pendingBillingPolicy)
        && progress.unbilledCount > 0
        && progress.unbilledCount < progress.targetCount
      : progress.readyBatchCount > 0;
    if (!canIssue || sessionCountInvoiceBusy[progress.studentId]) return;
    const sessionCount = finalBatch ? progress.unbilledCount : progress.targetCount;
    const pendingPolicyLabel = progress.pendingBillingPolicy === "manual" ? "Manual" : "Bulanan";
    setConfirmState({
      title: finalBatch ? "Terbitkan Tagihan Penutup" : "Terbitkan Tagihan Paket",
      message:
        `Terbitkan tagihan ${finalBatch ? "penutup" : "paket"} ${sessionCount} pertemuan untuk ${progress.studentName}?\n\n`
        + `Nominal ${formatRupiah(progress.nextBatchTotal)} akan langsung dibuat sebagai invoice belum lunas.`
        + (progress.pendingBillingPolicy
          ? ` Jika antrean menjadi kosong, siklus tagihan otomatis beralih ke ${pendingPolicyLabel}.`
          : ""),
      confirmLabel: "Terbitkan",
      onConfirm: () => {
        setConfirmState(null);
        void doCreateSessionCountInvoice(progress, finalBatch);
      },
    });
  };

  const doCancelSessionCountInvoice = async (
    payment: Payment,
    studentName: string,
    effectiveRestoredPolicy: "monthly" | "manual",
    finalBatch: boolean,
  ) => {
    setSessionCountCancelBusy((current) => ({ ...current, [payment.id]: true }));
    try {
      await cancelSessionCountInvoice(payment.id);
      setMessage(
        `${finalBatch ? "Tagihan penutup" : "Tagihan paket"} ${studentName} dibatalkan; sesi dikembalikan ke antrean ✓`
        + (effectiveRestoredPolicy ? ` Siklus kembali ke paket; peralihan ke ${effectiveRestoredPolicy === "manual" ? "Manual" : "Bulanan"} ditunda.` : ""),
      );
    } catch (error) {
      setMessage(`Gagal membatalkan tagihan ${studentName}: ${(error as Error).message}`);
    } finally {
      setSessionCountCancelBusy((current) => {
        const next = { ...current };
        delete next[payment.id];
        return next;
      });
    }
  };

  const handleCancelSessionCountInvoice = (
    payment: Payment,
    studentName: string,
    restoresPolicy?: "monthly" | "manual",
    finalBatch = false,
  ) => {
    const invoiceKind = finalBatch ? "tagihan penutup" : "tagihan paket";
    if (sessionCountCancelBusy[payment.id]) return;
    const currentPolicy = students.find((student) => student.id === payment.studentId)?.billingPolicy ?? "monthly";
    const effectiveRestoredPolicy = currentPolicy === "session_count" ? restoresPolicy : currentPolicy;
    const restoredPolicyLabel = effectiveRestoredPolicy === "manual" ? "Manual" : "Bulanan";
    setConfirmState({
      title: `Batalkan ${invoiceKind}?`,
      message:
        `Batalkan ${invoiceKind} ${studentName}?\n\nInvoice dan laporan ${finalBatch ? "penutup" : "paket"} yang belum lunas akan dihapus. Semua sesinya kembali ke antrean dan dapat diterbitkan ulang.`
        + (effectiveRestoredPolicy ? ` Siklus kembali ke paket, lalu peralihan ke ${restoredPolicyLabel} ditunda sampai antrean diselesaikan.` : ""),
      confirmLabel: "Batalkan",
      danger: true,
      onConfirm: () => {
        setConfirmState(null);
        void doCancelSessionCountInvoice(payment, studentName, effectiveRestoredPolicy ?? "monthly", finalBatch);
      },
    });
  };

  const doCloseMonth = async () => {
    setClosingBusy(true);
    try {
      await closeMonth(month);
      setMessage(`Bulan ${monthLabel(month)} ditutup ✓ Laporan dan tagihan diselaraskan.`);
    } catch (e) { setMessage("Gagal: " + (e as Error).message); }
    finally { setClosingBusy(false); }
  };

  const handleCloseMonth = async () => {
    const scheduled = await listScheduledForMonth(month);
    if (scheduled.length > 0) {
      const names = scheduled.map((s) => studentMap.get(s.studentId)?.name ?? "(dihapus)");
      const unique = [...new Set(names)];
      setConfirmState({
        title: "Tutup Bulan",
        message: `⚠️ Masih ada ${scheduled.length} sesi terjadwal yang BELUM diajar:\n${unique.join(", ")}\n\nTetap tutup bulan?`,
        confirmLabel: "Tutup Bulan",
        danger: true,
        onConfirm: () => {
          setConfirmState(null);
          void doCloseMonth();
        },
      });
      return;
    }
    void doCloseMonth();
  };

  const doReopenMonth = async () => {
    await reopenMonth(month);
    setMessage(`Bulan ${monthLabel(month)} dibuka kembali.`);
  };

  const handleReopenMonth = () => {
    setConfirmState({
      title: "Buka Kembali Bulan",
      message: `Buka kembali ${monthLabel(month)}? Tagihan otomatis yang belum lunas akan dihapus (tagihan manual dan yang sudah lunas tetap).`,
      confirmLabel: "Buka Kembali",
      danger: true,
      onConfirm: () => {
        setConfirmState(null);
        void doReopenMonth();
      },
    });
  };

  const saveBillAmount = async (paymentId: string, fallback: number) => {
    const raw = billEdits[paymentId];
    setBillEdits((prev) => { const c = { ...prev }; delete c[paymentId]; return c; });
    if (raw == null || raw === "") return;
    const n = Number(raw);
    if (!isValidCurrencyAmount(n)) { setMessage(`Nominal harus 1 sampai ${formatRupiah(MAX_PAYMENT_AMOUNT)}.`); return; }
    if (n !== fallback) await updatePaymentAmountById(paymentId, n);
  };

  const handleExportInvoicePdf = async () => {
    if (!invoiceRef.current || !invoiceTarget) return;
    setInvoiceExporting(true);
    try {
      const [{ toPng }, { jsPDF }] = await Promise.all([loadHtmlToImage(), loadJsPdf()]);
      await document.fonts.ready;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
      const el = invoiceRef.current;
      el.scrollIntoView({ block: "nearest" });
      const dataUrl = await toPng(el, { pixelRatio: 2, cacheBust: true, style: { overflow: "visible" } });
      const w = el.offsetWidth; const h = el.offsetHeight;
      const pdf = new jsPDF({ orientation: "p", unit: "px", format: [w, h] });
      pdf.addImage(dataUrl, "PNG", 0, 0, w, h);
      const blob = pdf.output("blob");
      downloadBlob(blob, `invoice-${invoiceTarget.student.name.replace(/\s+/g, "-")}-${invoiceTarget.payment.month}.pdf`);
    } catch (e) { setMessage("Gagal ekspor: " + (e as Error).message); }
    finally { setInvoiceExporting(false); }
  };

  const handleExportCsv = () => {
    const rows = [
      ["Murid", "Bulan", "Periode", "Total (IDR)", "Status", "Bayar Tgl", "Metode"],
      ...monthPayments.map((p) => [
        studentMap.get(p.studentId)?.name ?? "(dihapus)",
        p.month,
        p.periodStart && p.periodEnd ? `${p.periodStart} s/d ${p.periodEnd}` : "",
        String(p.totalCost),
        p.status === "PAID" ? "Lunas" : "Belum Bayar",
        p.paidAt ?? "", p.method ?? "",
      ]),
    ];
    const csv = rows.map((r) => r.map(escapeCsvCell).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    downloadBlob(blob, `tagihan-${month}.csv`);
  };

  const handleExportPdf = async () => {
    setPdfExporting(true);
    try {
      const [{ toPng }, { jsPDF }] = await Promise.all([loadHtmlToImage(), loadJsPdf()]);
      await document.fonts.ready;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
      const pages = Array.from(document.querySelectorAll<HTMLElement>("[data-pdf-page]"));
      if (pages.length === 0) { setMessage("Tidak ada tagihan untuk diekspor."); return; }
      let pdf: InstanceType<typeof jsPDF> | null = null;
      for (let i = 0; i < pages.length; i++) {
        pages[i].scrollIntoView({ block: "nearest" });
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        const dataUrl = await toPng(pages[i], { pixelRatio: 2, cacheBust: true, style: { overflow: "visible" } });
        const w = pages[i].offsetWidth; const h = pages[i].offsetHeight;
        if (!pdf) { pdf = new jsPDF({ orientation: "p", unit: "px", format: [w, h] }); }
        else { pdf.addPage([w, h], "p"); }
        pdf.addImage(dataUrl, "PNG", 0, 0, w, h);
      }
      if (!pdf) return;
      const blob = pdf.output("blob");
      downloadBlob(blob, `tagihan-${month}.pdf`);
    } catch (e) { setMessage("Gagal ekspor PDF: " + (e as Error).message); }
    finally { setPdfExporting(false); }
  };

  // ── Daftar Tagihan WA ──
  const waAllRows = useMemo(() => {
    return payments
      .filter((p) => p.status === "UNPAID")
      .map((p) => {
        const student = studentMap.get(p.studentId);
        if (!student) return null;
        const phone = student.parentContact?.phone ? toWaNumber(student.parentContact.phone) : "";
        if (!phone) return null;
        const report = p.reportId ? reports.find((r) => r.id === p.reportId) : undefined;
        const sessions = report
          ? report.sessionIds.map((id) => allReportSessions?.get(id)).filter((s): s is Session => Boolean(s))
          : p.month === month
            ? monthSessions.filter((s) => s.studentId === p.studentId)
            : [];
        const periodLbl = p.periodStart && p.periodEnd ? periodLabel(p.periodStart, p.periodEnd) : "";
        const text = buildBillingMessage({
          student,
          sessions,
          month: p.month,
          settings,
          amountOverride: p.totalCost,
          period: p.periodStart && p.periodEnd ? { start: p.periodStart, end: p.periodEnd } : undefined,
          periodLabelText: periodLbl || undefined,
        }).text;
        return {
          payment: p,
          student,
          phone,
          url: `https://wa.me/${phone}?text=${encodeURIComponent(text)}`,
          label: `${student.name} · ${periodLbl || monthLabel(p.month)}`,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);
  }, [payments, studentMap, reports, allReportSessions, monthSessions, month, settings]);

  return (
    <div className="space-y-4">
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
              <p className="text-[11px] text-gray-500 mt-0.5">Tidak mengikuti periode laporan · antrean lintas bulan, sesi tertua ditagih lebih dahulu</p>
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
                    disabled={!ready || busy}
                    aria-label={`Terbitkan paket ${progress.targetCount} pertemuan untuk ${progress.studentName}`}
                    onClick={() => void handleCreateSessionCountInvoice(progress)}
                    className="mt-3 w-full rounded-lg bg-indigo-600 px-3 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
                  >
                    {busy
                      ? "Menerbitkan..."
                      : invalidTarget
                        ? "Atur jumlah pertemuan di profil murid"
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
          <button onClick={handleCloseMonth} disabled={closingBusy || !canClose}
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

      {/* Aksi tagihan selalu tersedia, termasuk ketika bulan masih terbuka. */}
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
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {(["semua", "bulan", "periode"] as const).map((f) => (
            <button key={f} onClick={() => setBillFilter(f)}
              className={`flex-1 text-[11px] font-semibold rounded-md py-1.5 transition-colors ${
                billFilter === f ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}>
              {f === "semua" ? "Semua" : f === "bulan" ? "📅 Bulanan" : "🏷 Periode / Paket"}
            </button>
          ))}
        </div>
        {filteredBillRows.length === 0 ? (
          <p className="text-sm text-gray-500">{billFilter === "bulan" ? "Belum ada tagihan bulanan." : billFilter === "periode" ? "Belum ada tagihan periode atau paket." : "Belum ada tagihan untuk bulan ini."}</p>
        ) : (
          filteredBillRows.map(({ payment, report, student, sessions }) => {
            const paid = payment.status === "PAID";
            const periodLbl = payment.periodStart && payment.periodEnd ? periodLabel(payment.periodStart, payment.periodEnd) : "";
            const amountStr = billEdits[payment.id] ?? String(payment.totalCost);
            const totalHours = sessions.reduce((s, x) => s + x.durationHours, 0);
            const phone = student?.parentContact?.phone ? toWaNumber(student.parentContact.phone) : "";
            const waText = student ? buildBillingMessage({
              student, sessions, month, settings, amountOverride: payment.totalCost,
              period: payment.periodStart && payment.periodEnd ? { start: payment.periodStart, end: payment.periodEnd } : undefined,
              periodLabelText: periodLbl || undefined,
            }).text : "";
            return (
              <div key={payment.id} className="border border-gray-100 rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-700 text-sm">{student?.name ?? "(dihapus)"}</p>
                    <span className={`mt-1 inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-bold ${report?.billingMode === "session_count" ? "bg-indigo-100 text-indigo-700" : payment.reportId ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                      {report?.billingMode === "session_count"
                        ? report.finalBillingBatch
                          ? `Paket Penutup ${report.billingSessionCount ?? sessions.length} Pertemuan`
                          : `Paket ${report.billingSessionCount ?? sessions.length} Pertemuan`
                        : payment.reportId ? "Laporan Bulanan/Periode" : "Manual"}
                    </span>
                  </div>
                  <span className={pill(paid)}>{paid ? "Lunas" : "Belum"}</span>
                </div>
                {periodLbl && (
                  <p className="text-[11px] text-indigo-600 font-semibold">
                    🗓 Periode {periodLbl}
                    {report?.supplementalForReportId && (
                      <span className="ml-1.5 rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-700">Susulan</span>
                    )}
                  </p>
                )}
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
                  {report && (
                    <button onClick={() => navigate(`/report?reportId=${encodeURIComponent(report.id)}`)}
                      className="min-w-[88px] flex-1 py-1.5 rounded-lg border border-blue-200 text-blue-600 text-xs font-medium hover:bg-blue-50 transition-colors">
                      📋 Laporan
                    </button>
                  )}
                  {student && (
                    <button onClick={() => setInvoiceTarget({ payment, student })}
                      className="min-w-[88px] flex-1 py-1.5 rounded-lg border border-gray-200 text-gray-500 text-xs font-medium hover:bg-gray-50 transition-colors">
                      📄 Invoice
                    </button>
                  )}
                  {!paid && student && settings.ai?.enabled && settings.ai.apiKey && (
                    <button disabled={reminderLoading === payment.id}
                      onClick={() => setReminderModal({ paymentId: payment.id, studentName: student.name, parentName: student.parentContact?.name, month: periodLbl || payment.month, amount: payment.totalCost })}
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
                  {periodLbl ? `Periode ${periodLbl} · ` : ""}{sessions.length} sesi · {totalHours}j{paid && payment.paidAt ? ` · dibayar ${payment.paidAt}` : ""}
                </p>
              </div>
            );
          })
        )}
      </div>

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
                          {p.status === "PAID" ? "Lunas" : "Belum Bayar"}
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
          invoiceRef={invoiceRef}
          exporting={invoiceExporting}
          onExport={handleExportInvoicePdf}
          onClose={() => setInvoiceTarget(null)}
        />
      )}

      {reminderModal && (
        <AiCostModal
          open={!!reminderModal}
          title="Reminder WA AI"
          estimatedIDR={estimatePaymentReminderCost()}
          description={`Pesan pengingat tagihan untuk ${reminderModal.studentName}`}
          onCancel={() => setReminderModal(null)}
          onConfirm={async () => {
            const m = reminderModal;
            setReminderModal(null);
            setReminderLoading(m.paymentId);
            try {
              const res = await generatePaymentReminder({
                studentName: m.studentName,
                parentName: m.parentName,
                month: m.month,
                amount: m.amount,
                tutorName: settings.tutorProfile?.name || "Ko Lui",
              });
              if (res.message) {
                const found = students.find((s) => s.name === m.studentName);
                const phone = found?.parentContact?.phone ? toWaNumber(found.parentContact.phone) : "";
                const url = phone
                  ? `https://wa.me/${phone}?text=${encodeURIComponent(res.message)}`
                  : `https://wa.me/?text=${encodeURIComponent(res.message)}`;
                window.open(url, "_blank", "noopener,noreferrer");
              }
            } catch (e) { setMessage("AI error: " + (e as Error).message); }
            finally { setReminderLoading(null); }
          }}
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
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">Manual & Filter</h3>
              <ul className="mt-2 space-y-2 text-xs leading-relaxed">
                <li><strong>Manual</strong> — buat tagihan nominal bebas tanpa mengambil sesi.</li>
                <li>Filter <strong>Semua / Bulanan / Periode &amp; Paket</strong> menyaring daftar tagihan terbit.</li>
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
