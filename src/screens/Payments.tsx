import Skeleton from "../components/Skeleton";
import { useEffect, useState, useMemo, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  listPayments, listStudents, createManualPayment, getSettings,
  listExpenses, deleteExpense,
  listBillableSessionsForMonth, listAllUpcomingScheduled,
  listScheduledForMonth, listInvoiceSessions,
  getMonthClosing, listMonthClosings, closeMonth, reopenMonth,
  getCashSummary,
  getMonthlyIncomeVsExpense,
  listAllReports,
  listSessionCountBillingProgress, createSessionCountInvoice, cancelSessionCountInvoice,
  markPaymentTransferredById, markPaymentUnpaidById, updatePaymentAmountById,
} from "../db/repos";
import type { SessionCountBillingProgress } from "../db/repos";
import type { Payment, Student, Settings, Session } from "../db/types";
import { reportStatus } from "../db/types";
import { monthRange } from "../db/repos/helpers";
import { formatRupiah, todayWIB, monthLabel, periodLabel } from "../lib/format";
import { weekDates } from "../lib/calendar";
import { usePinGate } from "../hooks/usePinGate";
import { loadHtmlToImage, loadJsPdf } from "../lib/exportDeps";
import {
  generateFinancialInsights,
  estimateFinancialInsightsCost,
  generatePaymentReminder,
  estimatePaymentReminderCost,
  type FinancialInsightOutput,
} from "../lib/aiClient";
import { AiCostModal } from "../components/AiCostModal";
import Modal from "../components/Modal";
import { buildBillingMessage, toWaNumber } from "../lib/waBilling";
import { forecastNextMonth } from "../lib/forecast";
import { calculateFinancialHistoryAverage } from "../lib/financialInsights";
import { escapeCsvCell } from "../lib/csv";
import { downloadBlob } from "../lib/download";
import { MAX_PAYMENT_AMOUNT, clampCurrencyAmount, isValidCurrencyAmount, parseCurrencyDigits } from "../lib/money";
import { buildMonthClosingProjection } from "../lib/billingPreview";
import { db } from "../db/db";
import ActivityRing from "../components/dashboard/ActivityRing";
import Breadcrumb from "../components/Breadcrumb";
import Tabs from "../components/Tabs";
import MetricCard from "../components/dashboard/MetricCard";
import {
  BarChart, LineChart, DonutChart,
} from "../components/charts";
import type { BarSeries, DonutSegment } from "../components/charts";
import RatingIndicator from "../components/charts/RatingIndicator";
import QuickExpenseModal from "../components/QuickExpenseModal";

type Tab = "ringkasan" | "tagihan" | "pengeluaran" | "audit" | "murid";

function getLast12Months(endMonth: string): string[] {
  const months: string[] = [];
  const [year, month] = endMonth.split("-").map(Number);
  for (let i = 11; i >= 0; i--) {
    const d = new Date(year, month - 1 - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

const EXPENSE_LABELS: Record<string, string> = {
  transport: "Transport",
  buku: "Buku",
  alat: "Alat",
  platform: "Platform",
  lainnya: "Lainnya",
};

const monthsBetween = (a: string, b: string): number => {
  const [ay, am] = a.split("-").map(Number);
  const [by, bm] = b.split("-").map(Number);
  return (by - ay) * 12 + (bm - am);
};

/**
 * PaymentsPage — halaman keuangan dengan 4 tab:
 * Ringkasan, Tagihan, Pengeluaran, Audit.
 *
 * Fitur: tutup bulan otomatis, tagihan manual, tracking pengeluaran,
 * export PDF/CSV, forecasting, WhatsApp billing, dan audit trail.
 *
 * @component
 * @route /payments
 */
export default function PaymentsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const payments  = useLiveQuery(() => listPayments(), []);
  // Historical invoices must retain their student names even after a student
  // becomes inactive, so finance intentionally loads active + inactive rows.
  const students  = useLiveQuery(() => listStudents(), []);
  const settings  = useLiveQuery(() => getSettings(), []);
  const pin = usePinGate();
  const requestedStudentId = searchParams.get("studentId") ?? "";

  const [activeTab, setActiveTab] = useState<Tab>(() =>
    searchParams.get("tab") === "tagihan" ? "tagihan" : "ringkasan"
  );
  const [message, setMessage] = useState("");

  // Shared month for Ringkasan + Tagihan/Tutup Bulan
  const [month, setMonth] = useState(() => todayWIB().slice(0, 7));

  // ── Analytics query ────────────────────────────────────────────────
  // Tutup Bulan workflow
  const [billEdits, setBillEdits] = useState<Record<string, string>>({});
  const [closingBusy, setClosingBusy] = useState(false);
  const [expandedPreview, setExpandedPreview] = useState<string | null>(null);

  // Manual invoice
  const [selectedMonth, setSelectedMonth] = useState(() => todayWIB().slice(0, 7));
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [totalCost, setTotalCost] = useState(0);
  const [showManual, setShowManual] = useState(false);
  const [billFilter, setBillFilter] = useState<"semua" | "bulan" | "periode">("semua");
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showBillingHelp, setShowBillingHelp] = useState(false);
  const [expandedSessionCountStudent, setExpandedSessionCountStudent] = useState<string | null>(() => searchParams.get("studentId"));
  const [focusStudentId, setFocusStudentId] = useState<string | null>(() => searchParams.get("studentId"));
  const [sessionCountInvoiceBusy, setSessionCountInvoiceBusy] = useState<Record<string, boolean>>({});
  const [sessionCountCancelBusy, setSessionCountCancelBusy] = useState<Record<string, boolean>>({});
  const appliedFocusRef = useRef(false);

  // Invoice / reminder
  const [pdfExporting, setPdfExporting] = useState(false);
  const [reminderLoading, setReminderLoading] = useState<string | null>(null);
  const [reminderModal,   setReminderModal]   = useState<{ paymentId: string; studentName: string; parentName?: string; month: string; amount: number } | null>(null);
  const [invoiceTarget, setInvoiceTarget] = useState<{ payment: Payment; student: Student } | null>(null);
  const [invoiceExporting, setInvoiceExporting] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  // Audit
  const [auditYear, setAuditYear] = useState(() => Number(todayWIB().slice(0, 4)));
  const [trendRange, setTrendRange] = useState<3 | 6 | 12>(6);
  const [aiInsightLoadingMonth, setAiInsightLoadingMonth] = useState<string | null>(null);
  const [aiInsightResult, setAiInsightResult] = useState<{ month: string; data: FinancialInsightOutput } | null>(null);
  const [financialAiCostMonth, setFinancialAiCostMonth] = useState<string | null>(null);
  const aiInsightRequestRef = useRef(0);
  const financialAiConfigured = settings?.ai.enabled === true && Boolean(settings.ai.apiKey?.trim());
  const aiInsightLoading = aiInsightLoadingMonth === month;
  const aiInsights = aiInsightResult?.month === month ? aiInsightResult.data : null;

  useEffect(() => {
    // Batalkan secara logis request bulan lama. API tidak perlu selesai untuk
    // membersihkan loading/hasil pada bulan yang baru dipilih.
    aiInsightRequestRef.current += 1;
    setAiInsightLoadingMonth(null);
    setAiInsightResult(null);
    setFinancialAiCostMonth(null);
    setMessage((current) => current.startsWith("Analisis AI ") ? "" : current);
  }, [month, financialAiConfigured]);

  // ── Data for the selected month ──
  const monthSessions = useLiveQuery(() => listBillableSessionsForMonth(month), [month]);
  const monthExpenses = useLiveQuery(() => listExpenses(month), [month]);
  const closings = useLiveQuery(() => listMonthClosings(), []);
  const monthClosingQuery = useLiveQuery(async () => ({
    month,
    closing: await getMonthClosing(month),
  }), [month]);
  const monthClosingQueryReady = monthClosingQuery?.month === month;
  const monthClosing = monthClosingQueryReady ? monthClosingQuery?.closing : undefined;
  // Semua laporan periode — sesi yang sudah direkap tidak boleh ditagih ulang.
  const reports = useLiveQuery(() => listAllReports(), []);
  // A package may span calendar months, so this queue intentionally does not
  // depend on the month picker used by the rest of the finance dashboard.
  const sessionCountBillingProgress = useLiveQuery(() => listSessionCountBillingProgress(), []);
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
      // Murid Bulanan — sorot barisnya di preview "Akan Direkap" (bulan aktif).
      setExpandedPreview(requestedStudentId);
    }
  }, [requestedStudentId, sessionCountBillingProgress, students]);
  const coveredSessionIds = useMemo(
    () => new Set((reports ?? []).filter((r) => reportStatus(r) === "confirmed").flatMap((r) => r.sessionIds)),
    [reports]
  );
  // Sesi billable bulan ini yang BELUM masuk laporan — dasar preview & tutup bulan.
  const closingSessions = useMemo(
    () => (monthSessions ?? []).filter((session) => {
      if (coveredSessionIds.has(session.id)) return false;
      const student = students?.find((row) => row.id === session.studentId);
      return (student?.billingPolicy ?? "monthly") === "monthly";
    }),
    [monthSessions, coveredSessionIds, students]
  );
  // Semua sesi yang pernah masuk laporan, untuk baris tagihan laporan (akurat lintas bulan).
  const allReportSessions = useLiveQuery(async () => {
    const ids = [...new Set((reports ?? []).flatMap((r) => r.sessionIds))];
    if (ids.length === 0) return new Map<string, Session>();
    const rows = await db.sessions.bulkGet(ids);
    return new Map(rows.filter((s): s is Session => Boolean(s)).map((s) => [s.id, s]));
  }, [reports]);

  const chartMonths = useMemo(() => getLast12Months(month), [month]);
  const chartData = useLiveQuery(() => getMonthlyIncomeVsExpense(chartMonths), [chartMonths]);
  const trendData = useMemo(() => (chartData ?? []).slice(-trendRange), [chartData, trendRange]);

  const nextMonthStr = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const nm = new Date(y, m, 1);
    return `${nm.getFullYear()}-${String(nm.getMonth() + 1).padStart(2, "0")}`;
  }, [month]);
  const nextSessions = useLiveQuery(() => listAllUpcomingScheduled(nextMonthStr + "-01"), [nextMonthStr]);

  const histMonths = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    return [2, 1, 0].map((i) => {
      const d = new Date(y, m - 1 - i, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    });
  }, [month]);
  const histData = useLiveQuery(() => getCashSummary(histMonths), [histMonths]);
  const financialInsightDataReady = monthSessions !== undefined
    && monthExpenses !== undefined
    && reports !== undefined
    && histData !== undefined
    && nextSessions !== undefined;

  const auditMonths = useMemo(
    () => Array.from({ length: 12 }, (_, i) => `${auditYear}-${String(i + 1).padStart(2, "0")}`),
    [auditYear]
  );
  const auditData = useLiveQuery(() => getCashSummary(auditMonths), [auditMonths]);

  // ── Today & week revenue (for Ringkasan) ──
  const todayStr = useMemo(() => todayWIB(), []);
  const currentWeek = useMemo(() => weekDates(todayStr), [todayStr]);
  const todayRevenue = useMemo(
    () => (payments ?? []).filter((p) => p.status === "PAID" && p.paidAt === todayStr).reduce((sum, p) => sum + p.totalCost, 0),
    [payments, todayStr],
  );
  const weekRevenue = useMemo(
    () => (payments ?? []).filter((p) => p.status === "PAID" && !!p.paidAt && p.paidAt >= currentWeek[0] && p.paidAt <= currentWeek[6]).reduce((sum, p) => sum + p.totalCost, 0),
    [payments, currentWeek],
  );

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

  const handleCreateSessionCountInvoice = async (
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
    const confirmed = window.confirm(
      `${finalBatch ? "Terbitkan tagihan penutup" : "Terbitkan tagihan paket"} ${sessionCount} pertemuan untuk ${progress.studentName}?\n\n`
      + `Nominal ${formatRupiah(progress.nextBatchTotal)} akan langsung dibuat sebagai invoice belum lunas.`
      + (progress.pendingBillingPolicy
        ? ` Jika antrean menjadi kosong, siklus tagihan otomatis beralih ke ${pendingPolicyLabel}.`
        : ""),
    );
    if (!confirmed) return;
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

  const handleCancelSessionCountInvoice = async (
    payment: Payment,
    studentName: string,
    restoresPolicy?: "monthly" | "manual",
    finalBatch = false,
  ) => {
    const invoiceKind = finalBatch ? "tagihan penutup" : "tagihan paket";
    if (sessionCountCancelBusy[payment.id]) return;
    const currentPolicy = students?.find((student) => student.id === payment.studentId)?.billingPolicy ?? "monthly";
    const effectiveRestoredPolicy = currentPolicy === "session_count" ? restoresPolicy : currentPolicy;
    const restoredPolicyLabel = effectiveRestoredPolicy === "manual" ? "Manual" : "Bulanan";
    if (!window.confirm(
      `Batalkan ${invoiceKind} ${studentName}?\n\nInvoice dan laporan ${finalBatch ? "penutup" : "paket"} yang belum lunas akan dihapus. Semua sesinya kembali ke antrean dan dapat diterbitkan ulang.`
      + (effectiveRestoredPolicy ? ` Siklus kembali ke paket, lalu peralihan ke ${restoredPolicyLabel} ditunda sampai antrean diselesaikan.` : ""),
    )) return;
    setSessionCountCancelBusy((current) => ({ ...current, [payment.id]: true }));
    try {
      await cancelSessionCountInvoice(payment.id);
      setMessage(
        `${finalBatch ? "Tagihan penutup" : "Tagihan paket"} ${studentName} dibatalkan; sesi dikembalikan ke antrean ✓`
        + (effectiveRestoredPolicy ? ` Siklus kembali ke paket; peralihan ke ${restoredPolicyLabel} ditunda.` : ""),
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

  const handleDeleteExpense = async (id: string, description: string) => {
    if (!window.confirm(`Hapus pengeluaran "${description}"?`)) return;
    try {
      await deleteExpense(id);
      setMessage("Pengeluaran dihapus ✓");
    } catch (e) {
      setMessage("Gagal: " + (e as Error).message);
    }
  };

  const handleRequestFinancialInsights = () => {
    if (!financialAiConfigured) {
      setMessage("Aktifkan AI dan masukkan DeepSeek API Key di Pengaturan.");
      return;
    }
    if (!financialInsightDataReady) {
      setMessage("Data keuangan masih dimuat. Coba lagi sebentar.");
      return;
    }
    setFinancialAiCostMonth(month);
  };

  const handleGenerateInsights = async () => {
    if (!financialAiConfigured) {
      setMessage("Aktifkan AI dan masukkan DeepSeek API Key di Pengaturan.");
      return;
    }
    if (!financialInsightDataReady || aiInsightLoading) return;
    if (!navigator.onLine) { setMessage("Offline."); return; }

    const targetMonth = month;
    const requestId = ++aiInsightRequestRef.current;
    setAiInsightResult(null);
    setAiInsightLoadingMonth(targetMonth);
    try {
      const prevMonths = getLast12Months(targetMonth)
        .filter((previousMonth) => previousMonth < targetMonth)
        .slice(-3);
      const [prev, previousSessionGroups] = await Promise.all([
        getCashSummary(prevMonths),
        Promise.all(prevMonths.map((previousMonth) => listBillableSessionsForMonth(previousMonth))),
      ]);
      const avg = calculateFinancialHistoryAverage(prev.map((row, index) => ({
        potensi: row.potensi,
        realisasi: row.realisasi,
        laba: row.laba,
        sessions: previousSessionGroups[index] ?? [],
      })));

      const result = await generateFinancialInsights({
        month: targetMonth, monthLabel: monthLabel(targetMonth),
        current: {
          potensi: cash.potensi, tagihan: cash.tagihan, terbayar: cash.lunas,
          piutang: cash.piutang, realisasi: cash.realisasi, pengeluaran: cash.pengeluaran,
          laba: cash.laba, jam: cash.hours, sesi: (monthSessions ?? []).length,
          muridAktif: new Set((monthSessions ?? []).map((s) => s.studentId)).size,
        },
        piutangDetail: piutangRows.map((r) => ({
          nama: r.student?.name ?? "(dihapus)", nominal: r.payment.totalCost,
          umurHari: Math.round((Date.now() - new Date(r.payment.month + "-01").getTime()) / 86400000),
        })),
        murid: studentAnalytics.slice(0, 10).map((s) => {
          const stu = students?.find((x) => x.id === s.id);
          return {
            nama: s.name, revenue: s.revenue, sesi: s.sessions,
            level: stu?.level, tarif: stu?.hourlyRate,
            engagementRata: s.avgEngagement,
          };
        }),
        pengeluaranKategori: (monthExpenses ?? []).length > 0
          ? [...(monthExpenses ?? []).reduce((m, e) => { m.set(e.category, (m.get(e.category) ?? 0) + e.amount); return m; }, new Map<string, number>()).entries()].map(([k, v]) => ({ kategori: k, nominal: v }))
          : [],
        previousAvg: avg,
        proyeksiBulanDepan: forecast.estimate,
      });
      if (aiInsightRequestRef.current !== requestId) return;
      setAiInsightResult({ month: targetMonth, data: result });
      setMessage(`Analisis AI ${monthLabel(targetMonth)} selesai ✓`);
    } catch (e) {
      if (aiInsightRequestRef.current === requestId) {
        setMessage("Gagal: " + (e as Error).message);
      }
    } finally {
      if (aiInsightRequestRef.current === requestId) {
        setAiInsightLoadingMonth(null);
      }
    }
  };

  const handleCloseMonth = async () => {
    // Cek apakah masih ada sesi SCHEDULED yang belum diajar
    const scheduled = await listScheduledForMonth(month);
    if (scheduled.length > 0) {
      const names = scheduled.map((s) => studentMap.get(s.studentId)?.name ?? "(dihapus)");
      const unique = [...new Set(names)];
      const ok = window.confirm(
        `⚠️ Masih ada ${scheduled.length} sesi terjadwal yang BELUM diajar:\n${unique.join(", ")}\n\nTetap tutup bulan?`
      );
      if (!ok) { setClosingBusy(false); return; }
    }
    setClosingBusy(true);
    try {
      await closeMonth(month);
      setMessage(`Bulan ${monthLabel(month)} ditutup ✓ Laporan dan tagihan diselaraskan.`);
    } catch (e) { setMessage("Gagal: " + (e as Error).message); }
    finally { setClosingBusy(false); }
  };

  const handleReopenMonth = async () => {
    if (!window.confirm(`Buka kembali ${monthLabel(month)}? Tagihan otomatis yang belum lunas akan dihapus (tagihan manual dan yang sudah lunas tetap).`)) return;
    await reopenMonth(month);
    setMessage(`Bulan ${monthLabel(month)} dibuka kembali.`);
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

  // Bulk export for the selected month's bills
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

  const exportAuditCsv = () => {
    const rows = auditData ?? [];
    const header = "Bulan,Potensi Sesi,Kas Masuk,Piutang,Pengeluaran,Laba Kas,Status";
    const body = rows.map((r) => `${r.month},${r.potensi},${r.realisasi},${r.piutang},${r.pengeluaran},${r.laba},${r.closed ? "Ditutup" : "Terbuka"}`);
    const total = `Total ${auditYear},${auditTotals.potensi},${auditTotals.realisasi},${auditTotals.piutang},${auditTotals.pengeluaran},${auditTotals.laba},`;
    const csv = [header, ...body, total].join("\n");
    downloadBlob(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }), `Audit-Keuangan-${auditYear}.csv`);
  };


  // ── Analytics: financial chart data ──────────────────────────────────
  const analyticsFinancial = useMemo(() => {
    const cashIn = (payments ?? [])
      .filter((p) => p.status === "PAID" && (p.paidAt?.slice(0, 7) ?? p.month) === month)
      .reduce((sum, p) => sum + p.totalCost, 0);
    const expenses = (monthExpenses ?? []).reduce((sum, e) => sum + e.amount, 0);
    const catMap = new Map<string, number>();
    (monthExpenses ?? []).forEach((e) => {
      catMap.set(e.category, (catMap.get(e.category) ?? 0) + e.amount);
    });
    const expenseSegments: DonutSegment[] = Array.from(catMap.entries()).map(
      ([cat, amt]) => ({ label: EXPENSE_LABELS[cat] ?? cat, value: amt })
    );
    return { cashIn, expenses, expenseSegments };
  }, [payments, month, monthExpenses]);

  const revenueTrend = useMemo(
    () => trendData.map((row) => ({ x: row.month, y: row.income })),
    [trendData],
  );

  // ── Analytics: student data ─────────────────────────────────────────
  const studentAnalytics = useMemo(() => {
    if (!students || !monthSessions) return [];
    const map = new Map<string, { name: string; id: string; revenue: number; sessions: number; avgEngagement: number; reportBilled: number; draftCount: number; confirmedCount: number }>();
    students.forEach((s) => map.set(s.id, { name: s.name, id: s.id, revenue: 0, sessions: 0, avgEngagement: 0, reportBilled: 0, draftCount: 0, confirmedCount: 0 }));
    // Laporan rekap per murid
    (reports ?? []).forEach((r) => {
      const entry = map.get(r.studentId);
      if (!entry) return;
      if (reportStatus(r) === "confirmed") entry.confirmedCount++;
      else entry.draftCount++;
    });
    // Tagihan dari laporan yang sudah sah
    (payments ?? []).forEach((p) => {
      if (p.reportId && p.status !== "UNPAID") return; // hanya tagihan aktif
      const entry = map.get(p.studentId);
      if (entry && p.reportId) entry.reportBilled += p.totalCost;
    });
    const engScores = new Map<string, number[]>();
    monthSessions.forEach((s) => {
      const entry = map.get(s.studentId);
      if (entry) {
        entry.revenue += s.cost ?? 0;
        entry.sessions += 1;
      }
      if (s.engagement?.score != null) {
        const arr = engScores.get(s.studentId) ?? [];
        arr.push(s.engagement.score);
        engScores.set(s.studentId, arr);
      }
    });
    engScores.forEach((scores, id) => {
      const entry = map.get(id);
      if (entry && scores.length > 0) {
        entry.avgEngagement = scores.reduce((a, b) => a + b, 0) / scores.length;
      }
    });
    return Array.from(map.values()).filter((e) => e.sessions > 0 || e.revenue > 0);
  }, [students, monthSessions, reports, payments]);

  if (!payments || !students || !settings
    || monthSessions === undefined || monthExpenses === undefined
    || closings === undefined || reports === undefined
    || allReportSessions === undefined || sessionCountBillingProgress === undefined
    || !monthClosingQueryReady
  ) return <Skeleton variant="card" lines={4} className="p-4" />;

  if (!settings.financialPin) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-4xl">ðŸ”</p>
        <p className="font-bold text-lg text-gray-800">PIN Keuangan Belum Aktif</p>
        <p className="text-sm text-gray-500 text-center">Buat PIN dulu sebelum membuka data keuangan, tagihan, dan audit.</p>
        <button
          onClick={() => navigate("/settings")}
          className="px-8 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors">
          Buka Pengaturan
        </button>
        <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-600">â† Kembali</button>
      </div>
    );
  }

  if (settings.financialPin && !pin.unlocked) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-4xl">🔐</p>
        <p className="font-bold text-lg text-gray-800">Data Keuangan</p>
        <p className="text-sm text-gray-500 text-center">Masukkan PIN untuk mengakses keuangan</p>
        <input type="password" inputMode="numeric" maxLength={6} placeholder="PIN (6 digit)"
          value={pin.pinInput} onChange={(e) => pin.setPinInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
          className="input text-center tracking-widest text-xl w-40" autoFocus />
        {pin.pinError && <p className="text-sm text-red-500">{pin.pinError}</p>}
        <button
          onClick={async () => { await pin.attemptPin(settings.financialPin!); }}
          className="px-8 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors">
          Buka
        </button>
        <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-600">← Kembali</button>
      </div>
    );
  }

  // ── Derived ──
  const studentMap = new Map(students.map((s) => [s.id, s]));
  const monthPayments = payments.filter((p) => p.month === month);
  // Potensi kalender tetap berguna untuk kapasitas sesi. Rekonsiliasi invoice
  // memakai snapshot report agar paket lintas bulan dibandingkan pada scope yang sama.
  const sessionPotential = (monthSessions ?? []).reduce((s, x) => s + x.cost, 0);
  const totalBilled = monthPayments.reduce((s, p) => s + p.totalCost, 0);
  const invoicePaid = monthPayments.filter((p) => p.status === "PAID").reduce((s, p) => s + p.totalCost, 0);

  const cash = {
    potensi: sessionPotential,
    tagihan: totalBilled,
    realisasi: analyticsFinancial.cashIn,
    lunas: invoicePaid,
    piutang: monthPayments.filter((p) => p.status === "UNPAID").reduce((s, p) => s + p.totalCost, 0),
    pengeluaran: (monthExpenses ?? []).reduce((s, e) => s + e.amount, 0),
    hours: (monthSessions ?? []).reduce((s, x) => s + x.durationHours, 0),
    laba: 0,
  };
  cash.laba = cash.realisasi - cash.pengeluaran;
  const paidCount = monthPayments.filter((p) => p.status === "PAID").length;
  const collectionRate = totalBilled > 0 ? Math.round((invoicePaid / totalBilled) * 100) : 0;
  // Tutup Bulan availability: current month only from the 28th; past months always; future never.
  const _today = todayWIB();
  const curMonth = _today.slice(0, 7);
  const curDay = Number(_today.slice(8, 10));
  const canClose = month < curMonth || (month === curMonth && curDay >= 28);
  const closeHint = month > curMonth
    ? "Bulan belum berjalan."
    : "Tutup bulan berjalan tersedia mulai tanggal 28.";

  // Per-student preview (completed sessions + chargeable no-shows) before closing.
  // Sesi yang sudah masuk laporan periode TIDAK ditagih ulang oleh tutup bulan.
  const previewBills = Array.from(
    closingSessions.reduce((m, s) => {
      const cur = m.get(s.studentId) ?? { count: 0, hours: 0, cost: 0 };
      m.set(s.studentId, { count: cur.count + 1, hours: cur.hours + s.durationHours, cost: cur.cost + s.cost });
      return m;
    }, new Map<string, { count: number; hours: number; cost: number }>())
  ).map(([studentId, d]) => ({ studentId, name: studentMap.get(studentId)?.name ?? "(dihapus)", ...d }))
   .sort((a, b) => b.cost - a.cost);

  const skippedClosingStudents = new Set(
    (monthSessions ?? [])
      .filter((session) => {
        if (coveredSessionIds.has(session.id)) return false;
        const policy = studentMap.get(session.studentId)?.billingPolicy ?? "monthly";
        return policy !== "monthly";
      })
      .map((session) => session.studentId)
  ).size;

  const closingProjection = buildMonthClosingProjection(previewBills, monthPayments);

  // Sessions grouped by student for expandable preview detail
  const previewSessionsByStudent = closingSessions.reduce<Map<string, Session[]>>((m, s) => {
    const arr = m.get(s.studentId) ?? [];
    arr.push(s);
    m.set(s.studentId, arr);
    return m;
  }, new Map());

  const billRows = monthPayments
    .map((p) => {
      const linkedReport = p.reportId ? reports?.find((report) => report.id === p.reportId) : undefined;
      return {
        payment: p,
        report: linkedReport,
        student: studentMap.get(p.studentId),
        // Tagihan laporan: sesi sesuai snapshot report (bisa lintas bulan).
        sessions: linkedReport
          ? linkedReport.sessionIds
              .map((id) => allReportSessions?.get(id))
              .filter((s): s is Session => Boolean(s))
          : (monthSessions ?? []).filter((s) => s.studentId === p.studentId),
      };
    })
    .sort((a, b) => b.payment.totalCost - a.payment.totalCost);

  const reconciliationPotential = billRows.reduce((sum, row) => {
    if (row.payment.source === "manual") return sum + row.payment.totalCost;
    return sum + row.sessions.reduce((sessionSum, session) => sessionSum + session.cost, 0);
  }, 0);
  const billingGap = totalBilled - reconciliationPotential;

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

  const piutangRows = payments
    .filter((p) => p.status === "UNPAID")
    .map((p) => ({ payment: p, student: studentMap.get(p.studentId) }))
    .sort((a, b) => a.payment.month.localeCompare(b.payment.month));

  const forecast = forecastNextMonth({
    scheduledNext: (nextSessions ?? []).filter((s) => s.date.startsWith(nextMonthStr)).reduce((s, x) => s + x.cost, 0),
    history: (histData ?? []).map((d) => d.potensi),
  });

  const auditTotals = {
    potensi: (auditData ?? []).reduce((s, r) => s + r.potensi, 0),
    realisasi: (auditData ?? []).reduce((s, r) => s + r.realisasi, 0),
    piutang: (auditData ?? []).reduce((s, r) => s + r.piutang, 0),
    pengeluaran: (auditData ?? []).reduce((s, r) => s + r.pengeluaran, 0),
    laba: (auditData ?? []).reduce((s, r) => s + r.laba, 0),
  };

  const studentBarSeries: BarSeries[] = studentAnalytics.map((s) => ({
    label: s.name.split(" ")[0],
    value: s.revenue,
  }));
  const studentLabels = studentAnalytics.map((s) => s.name.split(" ")[0]);

  const revenueByStudent = (monthSessions ?? []).reduce<Map<string, number>>((m, sess) => {
    m.set(sess.studentId, (m.get(sess.studentId) ?? 0) + sess.cost);
    return m;
  }, new Map());

  const chartMax = Math.max(...trendData.map((d) => Math.max(d.income, d.expense, 1)));

  const ITEMS_PER_PDF_PAGE = 5;
  const pdfPageGroups: Payment[][] = [];
  for (let i = 0; i < monthPayments.length; i += ITEMS_PER_PDF_PAGE)
    pdfPageGroups.push(monthPayments.slice(i, i + ITEMS_PER_PDF_PAGE));

  const pill = (paid: boolean) =>
    `text-[11px] font-semibold px-2 py-0.5 rounded-full ${paid ? "text-green-700 bg-green-100" : "text-amber-700 bg-amber-100"}`;

  return (
    <div className="p-4 pb-24 space-y-4">
      <Breadcrumb />
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Keuangan</h1>
        {activeTab === "tagihan" && (
          <div className="flex gap-2">
            <button onClick={handleExportCsv}
              className="flex items-center gap-1.5 text-sm font-semibold bg-green-50 text-green-700 border border-green-200 px-3 py-2 rounded-xl hover:bg-green-100 transition-colors">
              📊 CSV
            </button>
            <button onClick={handleExportPdf} disabled={pdfExporting}
              className="flex items-center gap-1.5 text-sm font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-2 rounded-xl hover:bg-indigo-100 transition-colors disabled:opacity-50">
              {pdfExporting ? "⏳ Ekspor..." : "📄 PDF"}
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { key: "ringkasan", label: "Ringkasan", compactLabel: "Ringkas" },
          { key: "tagihan", label: "Tagihan", compactLabel: "Tagih" },
          { key: "pengeluaran", label: "Pengeluaran", compactLabel: "Keluar" },
          { key: "audit", label: "Audit" },
          { key: "murid", label: "Murid" },
        ]}
        active={activeTab}
        onChange={(k) => setActiveTab(k as Tab)}
        fullWidth
      />

      {message && (
        <div
          role={message.startsWith("Gagal") ? "alert" : "status"}
          aria-live={message.startsWith("Gagal") ? "assertive" : "polite"}
          onClick={() => setMessage("")}
          className={`p-3 rounded-lg text-sm cursor-pointer ${message.includes("✓") ? "bg-green-50 text-green-700" : message.startsWith("Gagal") ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-700"}`}>
          {message}
        </div>
      )}

      {/* ── RINGKASAN TAB ─────────────────────────────────── */}
      {activeTab === "ringkasan" && (
        <div className="space-y-4">
          <div className="flex gap-3 items-center">
            <label htmlFor="pay-bulan-ringkasan" className="text-sm text-gray-500 flex-shrink-0">Bulan:</label>
            <input id="pay-bulan-ringkasan" className="input flex-1" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>

          {/* Cash summary cards */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
              <p className="text-[11px] text-gray-500 uppercase tracking-wide">Potensi (sesi)</p>
              <p className="text-lg font-bold text-gray-700">{formatRupiah(cash.potensi)}</p>
              <p className="text-[11px] text-gray-500">{cash.hours} jam ditagihkan</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
              <p className="text-[11px] text-gray-500 uppercase tracking-wide">Tagihan Terbit</p>
              <p className="text-lg font-bold text-blue-700">{formatRupiah(cash.tagihan)}</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
              <p className="text-[11px] text-gray-500 uppercase tracking-wide">Tagihan Terbayar</p>
              <p className="text-lg font-bold text-green-700">{formatRupiah(cash.lunas)}</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
              <p className="text-[11px] text-gray-500 uppercase tracking-wide">Piutang Bulan Ini</p>
              <p className="text-lg font-bold text-amber-600">{formatRupiah(cash.piutang)}</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
              <p className="text-[11px] text-gray-500 uppercase tracking-wide">Kas Masuk Bulan Ini</p>
              <p className="text-lg font-bold text-green-700">{formatRupiah(cash.realisasi)}</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
              <p className="text-[11px] text-gray-500 uppercase tracking-wide">Pengeluaran</p>
              <p className="text-lg font-bold text-red-600">{formatRupiah(cash.pengeluaran)}</p>
            </div>
            <div className="col-span-2 bg-green-50 rounded-xl p-3 border border-green-200 flex items-center justify-between">
              <p className="text-sm font-bold text-green-900">Laba (Realisasi − Pengeluaran)</p>
              <p className={`text-xl font-bold ${cash.laba >= 0 ? "text-green-700" : "text-red-600"}`}>{formatRupiah(cash.laba)}</p>
            </div>
          </div>

          {(monthClosing || monthPayments.length > 0) && (
            <div className={`rounded-xl border px-3 py-2.5 text-xs ${billingGap === 0 ? "border-green-200 bg-green-50 text-green-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
              <div className="flex items-center justify-between gap-3 font-semibold">
                <span>Rekonsiliasi sesi dan tagihan</span>
                <span>{billingGap === 0 ? "Sinkron" : `Selisih ${formatRupiah(Math.abs(billingGap))}`}</span>
              </div>
              {billingGap !== 0 && (
                <p className="mt-1 leading-relaxed">Total tagihan berbeda dari nilai sesi. Periksa penyesuaian nominal, tagihan manual, atau sesi yang berubah setelah tutup bulan.</p>
              )}
            </div>
          )}

          {/* Today & week revenue glance */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex-1 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2">
              <p className="text-blue-500 font-semibold uppercase tracking-wide text-[10px]">Kas Masuk Hari Ini</p>
              <p className="text-blue-700 font-bold text-sm">
                {formatRupiah(todayRevenue)}
              </p>
            </div>
            <div className="flex-1 rounded-lg bg-green-50 border border-green-100 px-3 py-2">
              <p className="text-green-500 font-semibold uppercase tracking-wide text-[10px]">Kas Masuk Minggu Ini</p>
              <p className="text-green-700 font-bold text-sm">
                {formatRupiah(weekRevenue)}
              </p>
            </div>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" aria-labelledby="business-health-title">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Business health</p>
                <h2 id="business-health-title" className="text-base font-bold text-slate-800">Kesehatan bisnis</h2>
                <p className="text-xs text-slate-500 mt-0.5">Baca angka sebagai keputusan, bukan sekadar laporan.</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${collectionRate >= 80 ? "bg-green-100 text-green-700" : collectionRate > 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                {monthPayments.length > 0 ? `${collectionRate}% tertagih` : "Belum ada tagihan"}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 items-stretch min-[380px]:grid-cols-[1fr_auto]">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 flex items-center">
                <ActivityRing
                  value={paidCount} total={monthPayments.length} label="Tagihan dilunasi"
                  detail={monthPayments.length > 0 ? `${monthPayments.length - paidCount} tagihan masih terbuka` : "Tutup bulan untuk membuat tagihan"}
                  tone={collectionRate >= 80 ? "green" : collectionRate > 0 ? "amber" : "slate"}
                />
              </div>
              <div className="grid gap-2 w-full min-[380px]:w-[148px]">
                <MetricCard label="Tagihan tertagih" value={`${collectionRate}%`} description="Porsi nominal tagihan bulan ini yang sudah lunas." icon="↗" tone={collectionRate >= 80 ? "green" : "amber"} />
                <MetricCard label="Laba kas" value={formatRupiah(cash.laba)} description="Kas masuk dikurangi pengeluaran bulan ini." icon="◎" tone={cash.laba >= 0 ? "blue" : "red"} />
              </div>
            </div>
            <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
              {monthPayments.length === 0
                ? "Belum ada tagihan bulan ini. Setelah sesi selesai, gunakan Tutup Bulan untuk mengubah potensi menjadi tagihan yang bisa ditagih."
                : collectionRate < 100
                  ? "Fokus berikutnya: follow-up tagihan terbuka agar potensi pendapatan berubah menjadi kas masuk."
                  : "Penagihan bulan ini sudah lengkap. Pantau laba kas dan pengeluaran agar margin tetap sehat."}
            </p>
          </section>

          {/* ── AI: Anomali & Rekomendasi ───────────────────────── */}
          <section
            aria-disabled={!financialAiConfigured}
            className={`rounded-2xl border p-4 shadow-sm ${financialAiConfigured ? "border-indigo-200 bg-indigo-50/50" : "border-slate-200 bg-slate-50"}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <div className="min-w-0">
                <p className={`text-[11px] font-bold uppercase tracking-[0.12em] ${financialAiConfigured ? "text-indigo-400" : "text-slate-400"}`}>AI Insight</p>
                <h2 className={`text-sm font-bold ${financialAiConfigured ? "text-indigo-800" : "text-slate-600"}`}>Anomali & Rekomendasi</h2>
              </div>
              <button
                onClick={handleRequestFinancialInsights}
                disabled={!financialAiConfigured || !financialInsightDataReady || aiInsightLoading}
                className="max-w-full shrink-0 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
              >
                {!financialAiConfigured
                  ? "AI belum aktif"
                  : !financialInsightDataReady
                    ? "Menyiapkan..."
                    : aiInsightLoading
                      ? "Menganalisis..."
                      : aiInsights
                        ? "🔄 Analisis Ulang"
                        : "✨ Analisis AI"}
              </button>
            </div>
            <p className={`text-[11px] mb-3 ${financialAiConfigured ? "text-indigo-500" : "text-slate-500"}`}>
              {financialAiConfigured
                ? "AI membaca data keuangan bulan ini + 3 bulan sebelumnya untuk mendeteksi anomali & memberi rekomendasi."
                : "Aktifkan AI dan isi DeepSeek API Key di Pengaturan untuk menggunakan fitur ini."}
            </p>
            {financialAiConfigured && aiInsights && (
              <div className="space-y-3">
                {aiInsights.anomali.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase text-gray-500">Anomali</p>
                    {aiInsights.anomali.map((a, i) => (
                      <div key={i} className={`flex items-start gap-2 text-xs rounded-lg px-2.5 py-1.5 ${
                        a.level === "warning" ? "bg-amber-100 text-amber-800" :
                        a.level === "good" ? "bg-green-100 text-green-800" :
                        "bg-white text-gray-700"
                      }`}>
                        <span className="mt-0.5 shrink-0">{a.level === "warning" ? "⚠️" : a.level === "good" ? "✅" : "ℹ️"}</span>
                        <span>{a.text}</span>
                      </div>
                    ))}
                  </div>
                )}
                {aiInsights.rekomendasi.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase text-gray-500">Rekomendasi</p>
                    {aiInsights.rekomendasi.map((r, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs bg-white rounded-lg px-2.5 py-1.5 text-gray-700">
                        <span className="mt-0.5 shrink-0">💡</span>
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Forecast */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Prediksi Bulan Depan ({nextMonthStr})</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{formatRupiah(forecast.estimate)}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
              <span>📅 Terjadwal (terkunci): <b className="text-gray-700">{formatRupiah(forecast.scheduled)}</b></span>
              <span>📈 Tren 3 bln: <b className="text-gray-700">{formatRupiah(forecast.trend)}</b></span>
            </div>
            <p className="text-[11px] text-gray-500 mt-1.5">Estimasi = nilai tertinggi antara jadwal terkunci & tren (weighted moving average).</p>
          </div>

          {/* Revenue per student */}
          {revenueByStudent.size > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-500">Potensi Sesi per Murid</p>
              {Array.from(revenueByStudent.entries()).sort((a, b) => b[1] - a[1]).map(([sid, rev]) => {
                const pct = cash.potensi > 0 ? Math.round((rev / cash.potensi) * 100) : 0;
                return (
                  <div key={sid}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">{studentMap.get(sid)?.name ?? "—"}</span>
                      <span className="text-gray-500">{formatRupiah(rev)} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Income vs expense bar chart (analytics) */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
              Kas Masuk vs Pengeluaran
            </p>
            <BarChart
              series={[
                { label: "Kas Masuk", value: analyticsFinancial.cashIn, color: "#16a34a" },
                { label: "Pengeluaran", value: analyticsFinancial.expenses, color: "#dc2626" },
              ]}
              labels={[month.slice(5)]}
              height={160}
              formatValue={(v) =>
                new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)
              }
            />
          </div>

          {/* Revenue trend line chart */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
              Tren Kas Masuk
            </p>
            <LineChart
              series={[
                {
                  label: "Kas Masuk",
                  data: revenueTrend,
                  areaFill: true,
                  color: "#2563eb",
                },
              ]}
              height={160}
              dateXAxis
              formatY={(v) =>
                new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)
              }
            />
          </div>

          {/* Expense donut + forecast mini */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col items-center">
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2 text-center">
                Estimasi Bulan Depan
              </p>
              <p className="text-lg font-bold text-blue-700">
                {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(forecast.estimate)}
              </p>
              <p className="text-[10px] text-gray-500 mt-1">
                Terjadwal: {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(forecast.scheduled)}
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col items-center">
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Pengeluaran per Kategori</p>
              {analyticsFinancial.expenseSegments.length > 0 ? (
                <DonutChart
                  segments={analyticsFinancial.expenseSegments}
                  size={120}
                  thickness={12}
                  centerLabel="Total"
                  centerValue={new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(analyticsFinancial.expenses)}
                  showLegend={false}
                />
              ) : (
                <p className="text-xs text-gray-500 py-4">Belum ada pengeluaran</p>
              )}
            </div>
          </div>

          {/* Income vs expense trend with range control */}
          {trendData.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-gray-500">Kas Masuk vs Pengeluaran ({trendRange} Bulan)</p>
                <div className="flex rounded-lg bg-gray-100 p-0.5" aria-label="Rentang grafik">
                  {([3, 6, 12] as const).map((range) => (
                    <button key={range} onClick={() => setTrendRange(range)}
                      className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors ${trendRange === range ? "bg-white text-blue-700 shadow-sm" : "text-gray-500"}`}>
                      {range}B
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-gray-500 -mt-1">Skala sumbu menyesuaikan rentang {trendRange} bulan agar perubahan lebih mudah terbaca.</p>
              <div className="overflow-x-auto">
                <svg width={Math.max(300, trendData.length * 36)} height={120} className="block">
                  {trendData.map((d, i) => {
                    const barW = 10; const gap = 28; const x = i * gap + 4;
                    const incH = chartMax > 0 ? Math.round((d.income / chartMax) * 90) : 0;
                    const expH = chartMax > 0 ? Math.round((d.expense / chartMax) * 90) : 0;
                    return (
                      <g key={d.month}>
                        <rect x={x} y={100 - incH} width={barW} height={incH} fill="#3b82f6" rx={2} opacity={0.85} />
                        <rect x={x + barW + 1} y={100 - expH} width={barW} height={expH} fill="#ef4444" rx={2} opacity={0.75} />
                        <text x={x + barW} y={116} fontSize={7} textAnchor="middle" fill="#9ca3af">{d.month.slice(5)}</text>
                      </g>
                    );
                  })}
                </svg>
              </div>
              <div className="flex gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-blue-500 inline-block" /> Kas Masuk</span>
                <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-red-400 inline-block" /> Pengeluaran</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tagihan: paket per pertemuan, invoice terbit, manual, dan tutup bulan. */}
      {activeTab === "tagihan" && (
        <div className="space-y-4">
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
                  <p className="text-[11px] text-gray-500 mt-0.5">Antrean global lintas bulan · sesi tertua ditagih lebih dahulu</p>
                </div>
                <span className="flex-shrink-0 rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-700">
                  {sessionCountBillingProgress.filter((row) => (
                    row.readyBatchCount > 0
                    || Boolean(row.pendingBillingPolicy && row.unbilledCount > 0 && row.unbilledCount < row.targetCount)
                  )).length} perlu tindakan
                </span>
              </div>
            </div>

            {sessionCountBillingProgress.length === 0 ? (
              <p className="rounded-lg bg-gray-50 px-3 py-4 text-center text-xs text-gray-500">
                Belum ada murid dengan aturan tagihan per pertemuan.
              </p>
            ) : (
              <div className="space-y-2">
                {sessionCountBillingProgress.map((progress) => {
                  const ready = progress.readyBatchCount > 0;
                  const busy = Boolean(sessionCountInvoiceBusy[progress.studentId]);
                  const expanded = expandedSessionCountStudent === progress.studentId;
                  const pendingPolicyLabel = progress.pendingBillingPolicy === "manual" ? "Manual" : "Bulanan";
                  const invalidTarget = progress.targetCount <= 0;
                  const currentCount = Math.min(progress.unbilledCount, progress.targetCount);
                  const percentage = progress.targetCount > 0
                    ? Math.min(100, Math.round((currentCount / progress.targetCount) * 100))
                    : 0;
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
                            <>
                              <div
                                role="progressbar"
                                aria-label={`Progres paket ${progress.studentName}`}
                                aria-valuemin={0}
                                aria-valuemax={progress.targetCount}
                                aria-valuenow={currentCount}
                                className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-200"
                              >
                                <div className={`h-full rounded-full ${ready ? "bg-indigo-600" : "bg-blue-500"}`} style={{ width: `${percentage}%` }} />
                              </div>
                              <span className="flex-shrink-0 text-xs font-bold text-gray-700">{currentCount}/{progress.targetCount}</span>
                            </>
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

          <div className="flex gap-3 items-center">
            <label htmlFor="pay-bulan-tagihan" className="text-sm text-gray-500 flex-shrink-0">Bulan:</label>
            <input id="pay-bulan-tagihan" className="input flex-1" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            {monthClosing ? (
              <span className="text-[11px] font-semibold text-green-700 bg-green-100 px-2 py-1 rounded-full flex-shrink-0">🔒 Ditutup</span>
            ) : (
              <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-full flex-shrink-0">Terbuka</span>
            )}
          </div>

          {/* Tutup Bulan panel */}
          {!monthClosing ? (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
              {/* Preview sesi yang belum ditagih */}
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">⏳ Akan Direkap saat Tutup Bulan</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Tap nama murid untuk lihat detail sesi</p>
                <p className="text-[11px] text-blue-700 mt-1 rounded-lg bg-blue-50 px-2.5 py-2">
                  Hanya murid dengan aturan Bulanan. Paket N pertemuan ditagih melalui antrean di atas; aturan Manual dilewati.
                  {skippedClosingStudents > 0 ? ` ${skippedClosingStudents} murid bulan ini tidak masuk preview.` : ""}
                </p>
              </div>
              {previewBills.length === 0 ? (
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
              {/* Summary: total tagihan (laporan + tutup buku) */}
              {(monthPayments.length > 0 || previewBills.length > 0) && (
                <div className="border-t border-gray-100 pt-2 flex items-center justify-between text-xs">
                  <span className="font-semibold text-gray-600">Total Tagihan Bulan Ini</span>
                  <span className="font-bold text-indigo-700">{formatRupiah(cash.tagihan + closingProjection.additionalTotal)}</span>
                </div>
              )}
              <button onClick={handleCloseMonth} disabled={closingBusy || !canClose}
                className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold disabled:opacity-40 hover:bg-blue-700 transition-colors">
                {closingBusy ? "Memproses..." : previewBills.length === 0 ? "🔒 Tutup Bulan (kosong)" : `🔒 Tutup Bulan ${monthLabel(month)}`}
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
                <span className="flex-shrink-0 text-[10px] font-semibold text-gray-500 bg-gray-100 rounded-full px-2 py-1">{monthPayments.length} tagihan</span>
              </div>
              {/* Filter: Semua / Periode Rekap / Bulanan */}
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
            <button onClick={() => setShowManual((v) => !v)} className="w-full flex items-center justify-between text-sm font-semibold text-gray-600">
              <span>+ Tagihan Manual (di luar tutup bulan)</span>
              <span>{showManual ? "▾" : "▸"}</span>
            </button>
            {showManual && (
              <div className="space-y-3 mt-3">
                <select className="input" value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}>
                  <option value="">Pilih murid...</option>
                  {students.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <input className="input" type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
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
        </div>
      )}

      {/* ── PENGELUARAN TAB ───────────────────────────────── */}
      {activeTab === "pengeluaran" && (
        <div className="space-y-4">
          <div className="flex gap-3 items-center">
            <label htmlFor="pay-bulan-pengeluaran" className="text-sm text-gray-500 flex-shrink-0">Bulan:</label>
            <input id="pay-bulan-pengeluaran" className="input flex-1" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            <button onClick={() => setShowExpenseModal(true)}
              className="px-3 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors">
              + Catat
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
              <p className="text-[11px] text-gray-500 uppercase tracking-wide">Total Pengeluaran</p>
              <p className="text-lg font-bold text-red-600">{formatRupiah(cash.pengeluaran)}</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
              <p className="text-[11px] text-gray-500 uppercase tracking-wide">Jumlah Transaksi</p>
              <p className="text-lg font-bold text-gray-700">{monthExpenses?.length ?? 0}</p>
            </div>
          </div>
          {/* Kategori */}
          {(monthExpenses ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {(() => {
                const cats = (monthExpenses ?? []).reduce((m, e) => {
                  m.set(e.category, (m.get(e.category) ?? 0) + e.amount);
                  return m;
                }, new Map<string, number>());
                return [...cats.entries()].sort((a, b) => b[1] - a[1]).map(([cat, total]) => (
                  <span key={cat} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {EXPENSE_LABELS[cat] ?? cat}: {formatRupiah(total)}
                  </span>
                ));
              })()}
            </div>
          )}

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Rincian {monthLabel(month)}</p>
              <span className="text-[11px] text-gray-400">Terbaru di atas</span>
            </div>
            {!monthExpenses ? (
              <Skeleton variant="text" lines={3} />
            ) : monthExpenses.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-gray-500">Belum ada pengeluaran bulan ini.</p>
                <button onClick={() => setShowExpenseModal(true)} className="mt-2 text-sm font-semibold text-blue-600">Catat pengeluaran pertama</button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {[...monthExpenses].reverse().map((expense) => (
                  <div key={expense.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          {EXPENSE_LABELS[expense.category] ?? expense.category}
                        </span>
                        <span className="text-[11px] text-gray-400">{expense.date}</span>
                      </div>
                      <p className="mt-1 text-sm font-medium text-gray-700 break-words">{expense.description}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-sm font-bold text-red-600">{formatRupiah(expense.amount)}</p>
                      <button onClick={() => handleDeleteExpense(expense.id, expense.description)}
                        className="mt-1 text-[11px] text-gray-400 hover:text-red-600">Hapus</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── AUDIT TAB ─────────────────────────────────────── */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Audit Tahunan</p>
              <div className="flex items-center gap-3">
                <button aria-label="Tahun sebelumnya" onClick={() => setAuditYear((y) => y - 1)} className="text-gray-500 hover:text-gray-700 text-lg leading-none">‹</button>
                <span className="font-semibold text-gray-700">{auditYear}</span>
                <button aria-label="Tahun berikutnya" onClick={() => setAuditYear((y) => y + 1)} className="text-gray-500 hover:text-gray-700 text-lg leading-none">›</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-xs">
                <thead>
                  <tr className="text-gray-500 text-left">
                    <th className="font-medium pb-1">Bln</th>
                    <th className="font-medium pb-1 text-right">Potensi</th>
                    <th className="font-medium pb-1 text-right">Kas Masuk</th>
                    <th className="font-medium pb-1 text-right">Piutang</th>
                    <th className="font-medium pb-1 text-right">Keluar</th>
                    <th className="font-medium pb-1 text-right">Laba</th>
                    <th className="font-medium pb-1 text-center"></th>
                  </tr>
                </thead>
                <tbody>
                  {(auditData ?? []).map((r) => {
                    const has = r.potensi || r.realisasi || r.piutang || r.pengeluaran;
                    return (
                      <tr key={r.month} className="border-t border-gray-50">
                        <td className="py-1 text-gray-600">{r.month.slice(5)}</td>
                        <td className="py-1 text-right text-gray-600">{r.potensi ? formatRupiah(r.potensi) : "–"}</td>
                        <td className="py-1 text-right text-green-700">{r.realisasi ? formatRupiah(r.realisasi) : "–"}</td>
                        <td className="py-1 text-right text-amber-600">{r.piutang ? formatRupiah(r.piutang) : "–"}</td>
                        <td className="py-1 text-right text-red-600">{r.pengeluaran ? formatRupiah(r.pengeluaran) : "–"}</td>
                        <td className={`py-1 text-right font-semibold ${r.laba >= 0 ? "text-green-700" : "text-red-600"}`}>{has ? formatRupiah(r.laba) : "–"}</td>
                        <td className="py-1 text-center">{r.closed ? "🔒" : ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-100 font-bold">
                    <td className="py-1 text-gray-700">Total</td>
                    <td className="py-1 text-right text-gray-700">{formatRupiah(auditTotals.potensi)}</td>
                    <td className="py-1 text-right text-green-700">{formatRupiah(auditTotals.realisasi)}</td>
                    <td className="py-1 text-right text-amber-600">{formatRupiah(auditTotals.piutang)}</td>
                    <td className="py-1 text-right text-red-600">{formatRupiah(auditTotals.pengeluaran)}</td>
                    <td className={`py-1 text-right ${auditTotals.laba >= 0 ? "text-green-700" : "text-red-600"}`}>{formatRupiah(auditTotals.laba)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <button onClick={exportAuditCsv}
              className="w-full py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors">
              ⬇ Export CSV {auditYear}
            </button>

            {piutangRows.length > 0 && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-amber-600 font-semibold mb-2 uppercase tracking-wide">Piutang Belum Tertagih</p>
                <div className="space-y-1">
                  {piutangRows.map(({ payment, student }) => {
                    const age = monthsBetween(payment.month, todayWIB().slice(0, 7));
                    const periodLbl = payment.periodStart && payment.periodEnd ? ` · ${periodLabel(payment.periodStart, payment.periodEnd)}` : "";
                    return (
                      <div key={payment.id} className="flex items-center justify-between text-xs">
                        <span className="text-gray-700 min-w-0 truncate">{student?.name ?? "(dihapus)"} · {monthLabel(payment.month)}{periodLbl}</span>
                        <span className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-amber-700 font-semibold">{formatRupiah(payment.totalCost)}</span>
                          {age > 0 && <span className="text-red-500">{age} bln</span>}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MURID TAB (Analitik) ────────────────────────────── */}
      {activeTab === "murid" && (
        <div className="space-y-4">
          {/* Revenue per student */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
              Potensi Sesi per Murid — {monthLabel(month)}
            </p>
            {studentBarSeries.length > 0 ? (
              <BarChart
                series={studentBarSeries}
                labels={studentLabels}
                height={Math.max(120, studentAnalytics.length * 28)}
                formatValue={(v) =>
                  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)
                }
              />
            ) : (
              <p className="text-xs text-gray-500 text-center py-4">Belum ada sesi selesai bulan ini</p>
            )}
          </div>

          {/* Per-student detail cards */}
          {studentAnalytics.map((s) => (
            <div key={s.name} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-800 truncate">{s.name}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-gray-500">{s.sessions} sesi</span>
                  <span className="text-xs font-semibold text-green-700">
                    {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(s.revenue)}
                  </span>
                </div>
                {(s.confirmedCount > 0 || s.draftCount > 0) && (
                  <div className="flex gap-2 mt-1 text-[10px]">
                    {s.confirmedCount > 0 && <span className="text-indigo-600">🏷 {s.confirmedCount} laporan sah</span>}
                    {s.draftCount > 0 && <span className="text-amber-600">📋 {s.draftCount} draft</span>}
                  </div>
                )}
              </div>
              {s.avgEngagement > 0 && (
                <RatingIndicator value={Math.round(s.avgEngagement)} max={10} size="sm" variant="dots" tone="blue" />
              )}
            </div>
          ))}

          {studentAnalytics.length === 0 && (
            <p className="text-xs text-gray-500 text-center py-4">Belum ada data murid bulan ini</p>
          )}
        </div>
      )}

      {/* ── INVOICE MODAL ── */}
      {showExpenseModal && (
        <QuickExpenseModal
          onClose={() => setShowExpenseModal(false)}
          onSaved={(msg) => setMessage(msg)}
          initialDate={month === todayStr.slice(0, 7) ? todayStr : `${month}-01`}
        />
      )}

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

      {financialAiConfigured && financialAiCostMonth === month && (
        <AiCostModal
          open
          title="Analisis AI Keuangan"
          estimatedIDR={estimateFinancialInsightsCost()}
          description={`Analisis ${monthLabel(month)} dengan pembanding 3 bulan sebelumnya.`}
          onCancel={() => setFinancialAiCostMonth(null)}
          onConfirm={() => {
            setFinancialAiCostMonth(null);
            void handleGenerateInsights();
          }}
        />
      )}

      {/* Reminder WA AI cost modal */}
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
                tutorName: settings?.tutorProfile?.name || "Ko Lui",
              });
              if (res.message) {
                const found = students?.find((s) => s.name === m.studentName);
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

      {/* Bantuan cara kerja tagihan */}
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
    </div>
  );
}

function InvoiceModal({
  payment, student, settings, invoiceRef, exporting, onExport, onClose,
}: {
  payment: Payment;
  student: Student;
  settings: Settings;
  invoiceRef: React.RefObject<HTMLDivElement | null>;
  exporting: boolean;
  onExport: () => void;
  onClose: () => void;
}) {
  const sessions = useLiveQuery(
    () => listInvoiceSessions(payment),
    [payment.studentId, payment.month, payment.reportId, payment.periodStart, payment.periodEnd]
  );
  const sessionsLoading = sessions === undefined;

  const bank = settings.bankAccounts;
  const tutor = settings.tutorProfile;
  const MONTH_NAMES = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
  const periodLbl = payment.periodStart && payment.periodEnd ? periodLabel(payment.periodStart, payment.periodEnd) : "";
  const [y, mo] = payment.month.split("-").map(Number);
  const monthStr = periodLbl || `${MONTH_NAMES[mo - 1]} ${y}`;

  return (
    <div role="dialog" aria-modal="true" aria-label="Invoice Profesional" className="fixed inset-0 bg-black/60 z-[100] flex items-end justify-center px-0">
      <div className="w-full max-w-md bg-white rounded-t-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="font-bold text-base">Invoice Profesional</h3>
          <div className="flex gap-2">
            <button onClick={onExport} disabled={exporting || sessionsLoading}
              className="bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50">
              {sessionsLoading ? "Memuat..." : exporting ? "Ekspor..." : "📥 PDF"}
            </button>
            <button aria-label="Tutup" onClick={onClose} className="text-gray-500 hover:text-gray-600 text-lg w-10 h-10 flex items-center justify-center"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[75vh] p-4">
          {sessionsLoading ? (
            <p role="status" className="py-12 text-center text-sm text-gray-500">Memuat sesi invoice...</p>
          ) : (
            <>
              <div style={{ position: "absolute", left: -9999, top: 0, pointerEvents: "none" }}>
                <InvoiceContent
                  refProp={invoiceRef}
                  payment={payment} student={student} sessions={sessions}
                  tutor={tutor} bank={bank} monthStr={monthStr} />
              </div>
              <InvoiceContent
                payment={payment} student={student} sessions={sessions}
                tutor={tutor} bank={bank} monthStr={monthStr} responsive />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function InvoiceContent({
  payment, student, sessions, tutor, bank, monthStr, refProp, responsive = false,
}: {
  payment: Payment;
  student: Student;
  sessions: import("../db/types").Session[];
  tutor: Settings["tutorProfile"];
  bank: Settings["bankAccounts"];
  monthStr: string;
  refProp?: React.RefObject<HTMLDivElement | null>;
  responsive?: boolean;
}) {
  const totalHours = sessions.reduce((s, x) => s + x.durationHours, 0);

  return (
    <div ref={refProp} style={{ width: responsive ? "100%" : 360, maxWidth: 360, boxSizing: "border-box", margin: responsive ? "0 auto" : undefined, background: "#fff", padding: "24px 20px", fontFamily: "sans-serif", fontSize: 12, color: "#111827" }}>
      <div style={{ borderBottom: "2px solid #1e40af", paddingBottom: 12, marginBottom: 14 }}>
        <p style={{ fontSize: 18, fontWeight: 800, color: "#1e40af", margin: 0 }}>LES KO LUI</p>
        <p style={{ fontSize: 12, color: "#6b7280", margin: "2px 0 0" }}>{monthStr}</p>
        {tutor.name && <p style={{ fontSize: 12, fontWeight: 700, margin: "6px 0 0" }}>{tutor.name}</p>}
        {tutor.phone && <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>{tutor.phone}</p>}
        {tutor.email && <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>{tutor.email}</p>}
      </div>

      <div style={{ marginBottom: 14 }}>
        <p style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700, letterSpacing: 1, margin: "0 0 4px" }}>NAMA MURID</p>
        <p style={{ fontWeight: 700, margin: 0 }}>{student.name}</p>
        {student.school && <p style={{ color: "#6b7280", margin: "2px 0 0" }}>{student.school}</p>}
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
        <thead>
          <tr style={{ background: "#eff6ff" }}>
            {["Tanggal","Mapel","Jam","Rincian"].map((h, i) => (
              <th key={h} style={{ padding: "6px 8px", textAlign: i > 1 ? "right" : "left", fontSize: 10, color: "#1e40af", fontWeight: 700 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sessions.length === 0 ? (
            payment.reportId ? (
              <tr><td colSpan={4} style={{ padding: "10px 8px", color: "#9ca3af", textAlign: "center", fontSize: 11 }}>Sesi laporan tidak tersedia</td></tr>
            ) : (
              <tr>
                <td style={{ padding: "8px", color: "#6b7280" }}>â€”</td>
                <td colSpan={2} style={{ padding: "8px", color: "#374151", fontWeight: 600 }}>Tagihan manual (di luar laporan sesi)</td>
                <td style={{ padding: "8px", textAlign: "right", fontWeight: 700 }}>{formatRupiah(payment.totalCost)}</td>
              </tr>
            )
          ) : (
            sessions.map((s, i) => (
              <tr key={s.id} style={{ background: i % 2 === 0 ? "#fff" : "#f9fafb", borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "5px 8px" }}>{s.date.slice(5).replace("-", "/")}</td>
                <td style={{ padding: "5px 8px" }}>{s.status === "NO_SHOW" ? "Tidak hadir" : s.subjects.slice(0, 2).join(", ") || "—"}</td>
                <td style={{ padding: "5px 8px", textAlign: "right" }}>{s.durationHours}j</td>
                <td style={{ padding: "5px 8px", textAlign: "right" }}>{formatRupiah(s.cost)}</td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: "2px solid #e5e7eb" }}>
            <td colSpan={2} style={{ padding: "8px 8px", fontWeight: 700 }}>Total</td>
            <td style={{ padding: "8px 8px", textAlign: "right", fontWeight: 700 }}>{totalHours}j</td>
            <td style={{ padding: "8px 8px", textAlign: "right", fontWeight: 800, color: "#1e40af", fontSize: 13 }}>{formatRupiah(payment.totalCost)}</td>
          </tr>
        </tfoot>
      </table>

      <div style={{ background: payment.status === "PAID" ? "#f0fdf4" : "#fffbeb", borderRadius: 8, padding: "10px 12px", marginBottom: 14 }}>
        <p style={{ fontWeight: 700, color: payment.status === "PAID" ? "#16a34a" : "#d97706", margin: 0 }}>
          Status: {payment.status === "PAID" ? "✓ Lunas" : "Menunggu Pembayaran"}
        </p>
        {payment.status === "PAID" && payment.paidAt && (
          <p style={{ color: "#6b7280", margin: "3px 0 0", fontSize: 11 }}>Dibayar {payment.paidAt} via {payment.method ?? "—"}</p>
        )}
      </div>

      {bank && (bank.bca || bank.cimb || bank.bri || bank.mandiri || bank.bsi || bank.ewallet) && (
        <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 10 }}>
          {bank.bca     && <p style={{ margin: "2px 0", fontSize: 11 }}>BCA {bank.bca}</p>}
          {bank.cimb    && <p style={{ margin: "2px 0", fontSize: 11 }}>CIMB {bank.cimb}</p>}
          {bank.bri     && <p style={{ margin: "2px 0", fontSize: 11 }}>BRI {bank.bri}</p>}
          {bank.mandiri && <p style={{ margin: "2px 0", fontSize: 11 }}>Mandiri {bank.mandiri}</p>}
          {bank.bsi     && <p style={{ margin: "2px 0", fontSize: 11 }}>BSI {bank.bsi}</p>}
          {bank.ewallet && <p style={{ margin: "2px 0", fontSize: 11 }}>E-wallet {bank.ewallet}</p>}
          {bank.accountName && <p style={{ margin: "2px 0", fontSize: 11, color: "#9ca3af" }}>a.n. {bank.accountName}</p>}
        </div>
      )}

      <p style={{ textAlign: "center", color: "#9ca3af", fontSize: 10, marginTop: 16 }}>Thank you 😇</p>
    </div>
  );
}
