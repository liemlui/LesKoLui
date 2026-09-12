import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  getMonthlyIncomeVsExpense,
  getCashSummary,
  listAllUpcomingScheduled,
  listBillableSessionsForMonth,
} from "../../db/repos";
import type { SessionCountBillingProgress } from "../../db/repos";
import type { Payment, Student, Settings, Session, MonthlyReport } from "../../db/types";
import { reportStatus } from "../../db/types";
import { formatRupiah, todayWIB, monthLabel } from "../../lib/format";
import { weekDates } from "../../lib/calendar";
import {
  generateFinancialInsights,
  estimateFinancialInsightsCost,
  type FinancialInsightOutput,
} from "../../lib/aiClient";
import { AiCostModal } from "../../components/AiCostModal";
import ActivityRing from "../../components/dashboard/ActivityRing";
import { LineChart, DonutChart, BarChart } from "../../components/charts";
import type { BarSeries, DonutSegment } from "../../components/charts";
import RatingIndicator from "../../components/charts/RatingIndicator";
import { forecastNextMonth } from "../../lib/forecast";
import { calculateFinancialHistoryAverage } from "../../lib/financialInsights";
import { buildInsightContext } from "../../lib/financialInsights";
import { formatIdrNumber, sumExpensesByCategory, EXPENSE_LABELS } from "../../lib/finance";
import { buildStudentPipeline } from "../../lib/financePipeline";
import FinancePipelineBoard from "./FinancePipelineBoard";

function getLast12Months(endMonth: string): string[] {
  const months: string[] = [];
  const [year, month] = endMonth.split("-").map(Number);
  for (let i = 11; i >= 0; i--) {
    const d = new Date(year, month - 1 - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

interface RingkasanTabProps {
  month: string;
  payments: Payment[];
  students: Student[];
  settings: Settings;
  reports: MonthlyReport[];
  monthSessions: Session[];
  monthExpenses: import("../../db/types").Expense[];
  sessionCountBillingProgress?: SessionCountBillingProgress[];
  setMessage: Dispatch<SetStateAction<string>>;
}

export default function RingkasanTab({
  month, payments, students, settings, reports, monthSessions, monthExpenses, sessionCountBillingProgress, setMessage,
}: RingkasanTabProps) {
  const navigate = useNavigate();
  // ── Lazy analytics queries (loaded only while this tab is mounted) ──
  const chartMonths = useMemo(() => getLast12Months(month), [month]);
  const chartData = useLiveQuery(() => getMonthlyIncomeVsExpense(chartMonths), [chartMonths]);

  const histMonths = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    return [2, 1, 0].map((i) => {
      const d = new Date(y, m - 1 - i, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    });
  }, [month]);
  const histData = useLiveQuery(() => getCashSummary(histMonths), [histMonths]);

  const nextMonthStr = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const nm = new Date(y, m, 1);
    return `${nm.getFullYear()}-${String(nm.getMonth() + 1).padStart(2, "0")}`;
  }, [month]);
  const nextSessions = useLiveQuery(() => listAllUpcomingScheduled(nextMonthStr + "-01"), [nextMonthStr]);

  // ── Chart range toggle ──
  const [trendRange, setTrendRange] = useState<3 | 6 | 12>(6);
  const trendData = useMemo(() => (chartData ?? []).slice(-trendRange), [chartData, trendRange]);
  const trendPeriodLabel = useMemo(() => {
    if (trendData.length === 0) return "Belum ada periode";
    const first = trendData[0]?.month;
    const last = trendData[trendData.length - 1]?.month;
    if (!first || !last) return "Belum ada periode";
    return first === last ? monthLabel(first) : `${monthLabel(first)} – ${monthLabel(last)}`;
  }, [trendData]);

  // ── AI insight state ──
  const [aiInsightLoadingMonth, setAiInsightLoadingMonth] = useState<string | null>(null);
  const [aiInsightResult, setAiInsightResult] = useState<{ month: string; data: FinancialInsightOutput } | null>(null);
  const [financialAiCostMonth, setFinancialAiCostMonth] = useState<string | null>(null);
  const aiInsightRequestRef = useRef(0);
  const financialAiConfigured = settings.ai.enabled === true && Boolean(settings.ai.apiKey?.trim());
  const aiInsightLoading = aiInsightLoadingMonth === month;
  const aiInsights = aiInsightResult?.month === month ? aiInsightResult.data : null;
  const financialInsightDataReady = histData !== undefined && nextSessions !== undefined;

  useEffect(() => {
    // Batalkan secara logis request bulan lama. API tidak perlu selesai untuk
    // membersihkan loading/hasil pada bulan yang baru dipilih.
    aiInsightRequestRef.current += 1;
    setAiInsightLoadingMonth(null);
    setAiInsightResult(null);
    setFinancialAiCostMonth(null);
    setMessage((current) => current.startsWith("Analisis AI ") ? "" : current);
  }, [month, financialAiConfigured, setMessage]);

  // ── Derived ──
  const studentMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
  const invoiceReportIds = useMemo(
    () => new Set(payments.flatMap((payment) => payment.reportId ? [payment.reportId] : [])),
    [payments]
  );
  const readyReportCount = useMemo(() => reports.filter((report) => (
    reportStatus(report) === "confirmed"
    && report.totalCost > 0
    && report.billingMode !== "session_count"
    && !invoiceReportIds.has(report.id)
  )).length, [reports, invoiceReportIds]);
  const packageActionCount = (sessionCountBillingProgress ?? []).filter((row) => (
    row.readyBatchCount > 0
    || Boolean(row.pendingBillingPolicy && row.unbilledCount > 0 && row.unbilledCount < row.targetCount)
  )).length;

  // ── Papan pipeline per murid: Sesi → Laporan → Tagihan → Lunas → Dibagikan ──
  const pipelineRows = useMemo(
    () => buildStudentPipeline({
      students: students ?? [],
      sessions: monthSessions ?? [],
      reports: reports ?? [],
      payments: payments ?? [],
      month,
    }),
    [students, monthSessions, reports, payments, month],
  );
  const pipelineActionCount = pipelineRows.filter((row) => row.nextAction !== null).length;
  // Ringkasan menyebut jenis pekerjaannya, bukan sekadar "perlu tindakan".
  const pipelineDraftReportCount = pipelineRows.filter((row) => row.nextAction === "confirm-report").length;
  const pipelineCollectionCount = pipelineRows.filter((row) => row.nextAction === "send-wa").length;
  const pipelineShareCount = pipelineRows.filter((row) => row.nextAction === "share-report").length;
  const pipelineSummary = [
    pipelineDraftReportCount > 0 && `${pipelineDraftReportCount} laporan perlu difinalkan`,
    readyReportCount > 0 && `${readyReportCount} laporan siap ditagih`,
    packageActionCount > 0 && `${packageActionCount} antrean paket siap terbit`,
    pipelineCollectionCount > 0 && `${pipelineCollectionCount} tagihan perlu ditagih`,
    pipelineShareCount > 0 && `${pipelineShareCount} laporan perlu dibagikan`,
    pipelineActionCount === 0 && "Semua alur tagihan sinkron.",
  ].filter(Boolean).join(" · ") || "Selesaikan langkah yang tersisa agar uang masuk tidak tertunda.";
  const monthPayments = useMemo(() => payments.filter((p) => p.month === month), [payments, month]);
  const sessionPotential = monthSessions.reduce((s, x) => s + x.cost, 0);
  const totalBilled = monthPayments.reduce((s, p) => s + p.totalCost, 0);
  const invoicePaid = monthPayments.filter((p) => p.status === "PAID").reduce((s, p) => s + p.totalCost, 0);
  const cashIn = payments
    .filter((p) => p.status === "PAID" && (p.paidAt?.slice(0, 7) ?? p.month) === month)
    .reduce((sum, p) => sum + p.totalCost, 0);
  const expenseTotal = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

  const cash = {
    potensi: sessionPotential,
    tagihan: totalBilled,
    realisasi: cashIn,
    lunas: invoicePaid,
    piutang: monthPayments.filter((p) => p.status === "UNPAID").reduce((s, p) => s + p.totalCost, 0),
    pengeluaran: expenseTotal,
    hours: monthSessions.reduce((s, x) => s + x.durationHours, 0),
    laba: 0,
  };
  cash.laba = cash.realisasi - cash.pengeluaran;
  const paidCount = monthPayments.filter((p) => p.status === "PAID").length;
  const collectionRate = totalBilled > 0 ? Math.round((invoicePaid / totalBilled) * 100) : 0;

  // ── Today & week revenue ──
  const todayStr = useMemo(() => todayWIB(), []);
  const selectedMonthLabel = useMemo(() => monthLabel(month), [month]);
  const isCurrentMonth = month === todayStr.slice(0, 7);
  const currentWeek = useMemo(() => weekDates(todayStr), [todayStr]);
  const todayRevenue = useMemo(
    () => payments.filter((p) => p.status === "PAID" && p.paidAt === todayStr).reduce((sum, p) => sum + p.totalCost, 0),
    [payments, todayStr],
  );
  const weekRevenue = useMemo(
    () => payments.filter((p) => p.status === "PAID" && !!p.paidAt && p.paidAt >= currentWeek[0] && p.paidAt <= currentWeek[6]).reduce((sum, p) => sum + p.totalCost, 0),
    [payments, currentWeek],
  );

  // ── Piutang lintas bulan (total semua invoice yang belum lunas) ──
  const allUnpaidTotal = useMemo(
    () => payments.filter((p) => p.status === "UNPAID").reduce((sum, p) => sum + p.totalCost, 0),
    [payments],
  );
  const allUnpaidCount = useMemo(() => payments.filter((p) => p.status === "UNPAID").length, [payments]);

  // ── Expense categories ──
  const expenseSegments: DonutSegment[] = useMemo(() => {
    return Array.from(sumExpensesByCategory(monthExpenses).entries()).map(
      ([cat, amt]) => ({ label: EXPENSE_LABELS[cat as keyof typeof EXPENSE_LABELS] ?? cat, value: amt })
    );
  }, [monthExpenses]);

  // ── Student analytics ──
  const studentAnalytics = useMemo(() => {
    if (!students || !monthSessions) return [];
    const map = new Map<string, { name: string; id: string; revenue: number; sessions: number; avgEngagement: number; reportBilled: number; draftCount: number; confirmedCount: number }>();
    students.forEach((s) => map.set(s.id, { name: s.name, id: s.id, revenue: 0, sessions: 0, avgEngagement: 0, reportBilled: 0, draftCount: 0, confirmedCount: 0 }));
    reports.forEach((r) => {
      const entry = map.get(r.studentId);
      if (!entry) return;
      if (reportStatus(r) === "confirmed") entry.confirmedCount++;
      else entry.draftCount++;
    });
    payments.forEach((p) => {
      if (p.reportId && p.status !== "UNPAID") return;
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

  const studentBarSeries: BarSeries[] = studentAnalytics.map((s) => ({
    label: s.name.split(" ")[0],
    value: s.revenue,
  }));
  const studentLabels = studentAnalytics.map((s) => s.name.split(" ")[0]);

  // ── Forecast ──
  const forecast = forecastNextMonth({
    scheduledNext: (nextSessions ?? []).filter((s) => s.date.startsWith(nextMonthStr)).reduce((s, x) => s + x.cost, 0),
    // Riwayat memakai pendapatan akrual (per bulan sesi) — dasar forecast yang
    // lebih akurat daripada potensi mentah, terutama untuk laporan rentang.
    history: (histData ?? []).map((d) => d.pendapatan),
  });

  const piutangRows = payments
    .filter((p) => p.status === "UNPAID")
    .map((p) => ({ payment: p, student: studentMap.get(p.studentId) }))
    .sort((a, b) => a.payment.month.localeCompare(b.payment.month));

  // ── Billing split: invoice bulan terpilih vs batch paket lintas periode ──
  // A `session_count` package is anchored to the month of its LAST session, so
  // its nominal can include sessions from an earlier month. Separating the two
  // is what makes "potensi sesi" and "tagihan diterbitkan" comparable.
  const sessionCountInvoiceReportIds = useMemo(
    () => new Set(reports.filter((r) => r.billingMode === "session_count").map((r) => r.id)),
    [reports],
  );
  const crossPeriodInvoices = monthPayments.filter(
    (p) => Boolean(p.reportId) && sessionCountInvoiceReportIds.has(p.reportId!),
  );
  const crossPeriodTotal = crossPeriodInvoices.reduce((s, p) => s + p.totalCost, 0);
  const monthOnlyBilled = totalBilled - crossPeriodTotal;

  // ── AI handlers ──
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
        // potensi di sini = volume bisnis bulan tsb; pendapatan akrual mewakilinya.
        potensi: row.pendapatan,
        realisasi: row.realisasi,
        laba: row.laba,
        sessions: previousSessionGroups[index] ?? [],
      })));

      const result = await generateFinancialInsights({
        month: targetMonth, monthLabel: monthLabel(targetMonth),
        current: {
          potensi: cash.potensi, tagihan: cash.tagihan, terbayar: cash.lunas,
          piutang: cash.piutang, realisasi: cash.realisasi, pengeluaran: cash.pengeluaran,
          laba: cash.laba, jam: cash.hours, sesi: monthSessions.length,
          muridAktif: new Set(monthSessions.map((s) => s.studentId)).size,
        },
        piutangDetail: piutangRows.map((r) => ({
          nama: r.student?.name ?? "(dihapus)", nominal: r.payment.totalCost,
          umurHari: Math.round((Date.now() - new Date(r.payment.month + "-01").getTime()) / 86400000),
        })),
        murid: studentAnalytics.slice(0, 10).map((s) => {
          const stu = students.find((x) => x.id === s.id);
          return {
            nama: s.name, revenue: s.revenue, sesi: s.sessions,
            level: stu?.level, tarif: stu?.hourlyRate,
            engagementRata: s.avgEngagement,
          };
        }),
        pengeluaranKategori: monthExpenses.length > 0
          ? Array.from(sumExpensesByCategory(monthExpenses).entries()).map(([k, v]) => ({ kategori: k, nominal: v }))
          : [],
        previousAvg: avg,
        proyeksiBulanDepan: forecast.estimate,
        // Konteks turunan untuk AI: kolektibilitas, laporan belum dibagikan, piutang menua
        ...buildInsightContext({
          payments: payments ?? [],
          reports: reports ?? [],
          students: students ?? [],
          month: targetMonth,
        }),
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

  return (
    <div className="space-y-4">
      {/* ── 1. Yang perlu ditindaklanjuti: ditaruh paling atas karena ini satu-satunya
             bagian yang menuntut aksi, bukan sekadar bacaan. ── */}
      <section aria-labelledby="needs-action-title" className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-600">Perlu ditindaklanjuti</p>
        <h2 id="needs-action-title" className="text-base font-bold text-amber-950">
          {allUnpaidCount > 0
            ? `${allUnpaidCount} tagihan belum dibayar`
            : pipelineActionCount > 0
              ? `${pipelineActionCount} murid punya langkah tertunda`
              : "Tidak ada yang tertunda"}
        </h2>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-white/90 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Piutang (semua bulan)</p>
            <p className="mt-0.5 text-base font-bold text-amber-700">{formatRupiah(allUnpaidTotal)}</p>
            <p className="mt-0.5 text-xs text-amber-700">{allUnpaidCount} tagihan belum lunas</p>
          </div>
          <div className="rounded-xl bg-white/90 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Piutang dari {selectedMonthLabel}</p>
            <p className="mt-0.5 text-base font-bold text-slate-800">{formatRupiah(cash.piutang)}</p>
            <p className="mt-0.5 text-xs text-slate-500">{monthPayments.length - paidCount} tagihan bulan ini</p>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link
            to="/payments?tab=tagihan"
            className="inline-flex rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-700"
          >
            Tindak lanjuti di Tagihan
          </Link>
          {pipelineActionCount > 0 && (
            <Link
              to="/payments?tab=tagihan"
              className="inline-flex rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100"
            >
              Lihat {pipelineActionCount} murid yang tertunda
            </Link>
          )}
        </div>
      </section>

      {/* ── 2. Yang masuk rekening (kas): mengikuti tanggal pembayaran ── */}
      <section aria-labelledby="cash-flow-title" className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm">
        <div className="mb-3">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-600">Uang masuk & keluar</p>
          <h2 id="cash-flow-title" className="text-base font-bold text-emerald-950">Yang benar-benar bergerak di rekening</h2>
          <p className="mt-1 text-xs leading-relaxed text-emerald-800">
            Dihitung dari <strong>tanggal transfer diterima</strong>, bukan tanggal les. Karena itu angkanya berbeda
            dengan tagihan di bawah, yang dihitung dari periode sesi.          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-white/90 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Uang masuk · {selectedMonthLabel}</p>
            <p className="mt-1 text-lg font-bold text-emerald-700">{formatRupiah(cash.realisasi)}</p>
            <p className="mt-1 text-xs text-emerald-700">Transfer diterima bulan ini</p>
          </div>
          <div className="rounded-xl bg-white/90 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-600">Pengeluaran · {selectedMonthLabel}</p>
            <p className="mt-1 text-lg font-bold text-red-600">{formatRupiah(cash.pengeluaran)}</p>
            <p className="mt-1 text-xs text-slate-500">Transaksi keluar bulan ini</p>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-white/80 px-3 py-2.5">
          <div>
            <p className="text-xs font-bold text-emerald-950">Sisa kas bulan ini</p>
            <p className="text-xs text-emerald-700">Uang masuk dikurangi pengeluaran</p>
          </div>
          <p className={`text-xl font-bold ${cash.laba >= 0 ? "text-emerald-700" : "text-red-600"}`}>{formatRupiah(cash.laba)}</p>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-emerald-800">
          <span>Hari ini: <b>{formatRupiah(todayRevenue)}</b></span>
          <span>Minggu ini: <b>{formatRupiah(weekRevenue)}</b></span>
          {!isCurrentMonth && (
            <Link to={`/payments?tab=ringkasan&month=${todayStr.slice(0, 7)}`} className="font-semibold underline">
              Kembali ke {monthLabel(todayStr.slice(0, 7))}
            </Link>
          )}
        </div>
      </section>

      {/* ── 3. Yang ditagih (akrual): mengikuti periode sesi ── */}
      <section aria-labelledby="invoice-status-title" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Tagihan</p>
          <h2 id="invoice-status-title" className="text-base font-bold text-slate-800">
            Yang ditagih untuk {selectedMonthLabel}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Dihitung dari <strong>periode sesi</strong>: nilai sesi menjadi tagihan, lalu tagihan dibayar atau tetap
            menjadi piutang.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Potensi sesi {selectedMonthLabel}</p>
            <p className="mt-1 text-lg font-bold text-slate-800">{formatRupiah(cash.potensi)}</p>
            <p className="mt-1 text-xs text-slate-500">{cash.hours} jam · {monthSessions.length} pertemuan selesai</p>
          </div>
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Tagihan diterbitkan</p>
            <p className="mt-1 text-lg font-bold text-blue-700">{formatRupiah(cash.tagihan)}</p>
            <p className="mt-1 text-xs text-blue-600">Invoice ber-anchor {selectedMonthLabel}</p>
          </div>
          <div className="rounded-xl border border-green-100 bg-green-50/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Tagihan lunas</p>
            <p className="mt-1 text-lg font-bold text-green-700">{formatRupiah(cash.lunas)}</p>
            <p className="mt-1 text-xs text-green-700">{paidCount} dari {monthPayments.length} tagihan bulan ini</p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Piutang {selectedMonthLabel}</p>
            <p className="mt-1 text-lg font-bold text-amber-700">{formatRupiah(cash.piutang)}</p>
            <p className="mt-1 text-xs text-amber-700">Tagihan bulan ini yang belum dibayar</p>
          </div>
        </div>

        {crossPeriodTotal > 0 && (
          <div className="mt-2 rounded-xl border border-violet-200 bg-violet-50/70 px-3 py-2 text-xs leading-relaxed text-violet-800">
            <p>
              <strong>{formatRupiah(crossPeriodTotal)}</strong> dari tagihan di atas berasal dari{" "}
              <strong>paket lintas bulan</strong>
              {crossPeriodInvoices.length === 1 ? " (1 paket)" : ` (${crossPeriodInvoices.length} paket)`}
              {" "}— pertemuannya tidak semuanya di {selectedMonthLabel}
              {monthOnlyBilled > 0 && `, bukan ${formatRupiah(monthOnlyBilled)} yang murni bulan ini`}.
            </p>
            <ul className="mt-1.5 space-y-0.5">
              {crossPeriodInvoices.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate">{studentMap.get(p.studentId)?.name ?? "(dihapus)"} · paket</span>
                  <span className="shrink-0 font-semibold">{formatRupiah(p.totalCost)}</span>
                </li>
              ))}
            </ul>
            <Link to="/payments?tab=tagihan" className="mt-1.5 inline-flex font-semibold underline">
              Periksa di tab Tagihan
            </Link>
          </div>
        )}

        <p className="mt-2 border-t border-slate-100 pt-2 text-xs leading-relaxed text-slate-500">
          Semua aksi penagihan (terbitkan invoice, kirim WA, tandai lunas) ada di tab <strong>Tagihan</strong>, yang
          mencakup semua periode.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" aria-labelledby="business-health-title">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Langkah berikutnya</p>
            <h2 id="business-health-title" className="text-base font-bold text-slate-800">Kesehatan penagihan</h2>
            <p className="text-xs text-slate-500 mt-0.5">Baca angka sebagai keputusan, bukan sekadar laporan.</p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${collectionRate >= 80 ? "bg-green-100 text-green-700" : collectionRate > 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
            {monthPayments.length > 0 ? `${collectionRate}% lunas` : "Belum ada invoice"}
          </span>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
          <ActivityRing
            value={paidCount} total={monthPayments.length} label="Tagihan dilunasi"
            detail={monthPayments.length > 0 ? `${monthPayments.length - paidCount} tagihan belum dibayar` : "Buka Tagihan untuk menerbitkan invoice"}
            tone={collectionRate >= 80 ? "green" : collectionRate > 0 ? "amber" : "slate"}
          />
        </div>
        <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-600">
          <p>
            {monthPayments.length === 0
              ? `Belum ada tagihan pada ${selectedMonthLabel}. Buat laporan lalu terbitkan invoice dari tab Tagihan.`
              : collectionRate < 100
                ? `${monthPayments.length - paidCount} tagihan masih belum dibayar. Tindak lanjuti agar piutang berubah menjadi uang masuk.`
                : `Semua tagihan ${selectedMonthLabel} sudah dibayar. Pantau sisa kas dan pengeluaran agar margin tetap sehat.`}
          </p>
          <Link
            to={`/payments?tab=tagihan`}
            className="mt-2 inline-flex rounded-lg bg-blue-600 px-3 py-1.5 font-semibold text-white transition-colors hover:bg-blue-700"
          >
            {monthPayments.length === 0 ? "Buka antrean tagihan" : collectionRate < 100 ? "Lihat tagihan belum dibayar" : "Buka Tagihan"}
          </Link>
        </div>
      </section>

      {/* ── 4. Papan pantau per murid: hanya baris yang butuh tindakan ── */}
      <FinancePipelineBoard
        rows={pipelineRows}
        month={month}
        navigate={navigate}
        summary={pipelineSummary}
      />

      <details className="group rounded-2xl border border-slate-200 bg-white shadow-sm">
        <summary className="cursor-pointer list-none px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-800">Analitik lanjutan</p>
              <p className="mt-0.5 text-xs text-slate-500">Prediksi, analisis AI, rincian murid, tren, dan kategori pengeluaran.</p>
            </div>
            <span aria-hidden="true" className="text-slate-400 transition-transform group-open:rotate-90">›</span>
          </div>
        </summary>
        <div className="space-y-4 border-t border-slate-100 p-4">
      {/* ── AI: Anomali & Rekomendasi ───────────────────────── */}
      <section
        aria-disabled={!financialAiConfigured}
        className={`rounded-2xl border p-4 shadow-sm ${financialAiConfigured ? "border-indigo-200 bg-indigo-50/50" : "border-slate-200 bg-slate-50"}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div className="min-w-0">
            <p className={`text-xs font-bold uppercase tracking-[0.12em] ${financialAiConfigured ? "text-indigo-600" : "text-slate-500"}`}>AI Insight</p>
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
        <p className={`text-xs mb-3 ${financialAiConfigured ? "text-indigo-500" : "text-slate-500"}`}>
          {financialAiConfigured
            ? `AI membaca ${selectedMonthLabel} dan 3 bulan sebelumnya untuk mendeteksi anomali serta memberi rekomendasi.`
            : "Aktifkan AI dan isi DeepSeek API Key di Pengaturan untuk menggunakan fitur ini."}
        </p>
        {financialAiConfigured && aiInsights && (
          <div className="space-y-3">
            {aiInsights.anomali.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-bold uppercase text-gray-500">Anomali</p>
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
                <p className="text-xs font-bold uppercase text-gray-500">Rekomendasi</p>
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
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Prediksi {monthLabel(nextMonthStr)}</p>
        <p className="text-2xl font-bold text-amber-600 mt-1">{formatRupiah(forecast.estimate)}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
          <span>📅 Terjadwal (terkunci): <b className="text-gray-700">{formatRupiah(forecast.scheduled)}</b></span>
          <span>📈 Tren 3 bulan: <b className="text-gray-700">{formatRupiah(forecast.trend)}</b></span>
        </div>
        <p className="text-xs text-gray-500 mt-1.5">Perkiraan memakai nilai yang lebih tinggi antara jadwal yang sudah ada dan rata-rata tren 3 bulan.</p>
      </div>

      {/* Konten murid: bar chart potensi + kartu detail per murid */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
          Potensi Sesi per Murid — {monthLabel(month)}
        </p>
        {studentBarSeries.length > 0 ? (
          <BarChart
            series={studentBarSeries}
            labels={studentLabels}
            height={Math.max(120, studentAnalytics.length * 28)}
            formatValue={formatIdrNumber}
          />
        ) : (
          <p className="text-xs text-gray-500 text-center py-4">Belum ada sesi selesai pada {selectedMonthLabel}</p>
        )}
      </div>

      {studentAnalytics.map((s) => (
        <div key={s.name} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-800 truncate">{s.name}</p>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-gray-500">{s.sessions} sesi</span>
              <span className="text-xs font-semibold text-green-700">
                {formatIdrNumber(s.revenue)}
              </span>
            </div>
            {(s.confirmedCount > 0 || s.draftCount > 0) && (
              <div className="flex gap-2 mt-1 text-xs">
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
        <p className="text-xs text-gray-500 text-center py-4">Belum ada data murid pada {selectedMonthLabel}</p>
      )}

      {/* Uang masuk vs pengeluaran — satu line chart dua series dengan rentang */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">
              Tren kas masuk & pengeluaran
            </p>
            <p className="mt-0.5 text-xs text-gray-500">{trendPeriodLabel}</p>
          </div>
          <div className="flex rounded-lg bg-gray-100 p-0.5" role="group" aria-label="Rentang grafik">
            {([3, 6, 12] as const).map((range) => (
              <button key={range} type="button" aria-pressed={trendRange === range} onClick={() => setTrendRange(range)}
                className={`px-2 py-1 rounded-md text-xs font-semibold transition-colors sm:text-xs ${trendRange === range ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                {range} bulan
              </button>
            ))}
          </div>
        </div>
        <LineChart
          series={[
            {
              label: "Uang masuk",
              data: trendData.map((row) => ({ x: row.month, y: row.income })),
              areaFill: true,
              color: "#16a34a",
            },
            {
              label: "Pengeluaran",
              data: trendData.map((row) => ({ x: row.month, y: row.expense })),
              color: "#dc2626",
            },
          ]}
          height={160}
          dateXAxis
          formatY={formatIdrNumber}
        />
      </div>

      {/* Expense donut */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col items-center">
        <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Pengeluaran per Kategori</p>
        {expenseSegments.length > 0 ? (
          <DonutChart
            segments={expenseSegments}
            size={120}
            thickness={12}
            centerLabel="Total"
            centerValue={formatIdrNumber(expenseTotal)}
            showLegend={false}
          />
        ) : (
          <p className="text-xs text-gray-500 py-4">Belum ada pengeluaran</p>
        )}
      </div>

      {financialAiConfigured && financialAiCostMonth === month && (
        <AiCostModal
          open
          title="Analisis AI Keuangan"
          estimatedIDR={estimateFinancialInsightsCost()}
          description={`Analisis ${monthLabel(month)} dengan pembanding 3 bulan sebelumnya.`}
          dataSent="Periode dan ringkasan keuangan; nama murid, nominal dan umur piutang; pendapatan, jumlah sesi, level, tarif dan rata-rata engagement hingga 10 murid; pengeluaran per kategori; rata-rata 3 bulan sebelumnya, proyeksi, kolektibilitas, laporan belum dibagikan, serta indikator piutang dan pembayaran."
          onCancel={() => setFinancialAiCostMonth(null)}
          onConfirm={() => {
            setFinancialAiCostMonth(null);
            void handleGenerateInsights();
          }}
        />
      )}
        </div>
      </details>
    </div>
  );
}
