import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  getMonthlyIncomeVsExpense,
  getCashSummary,
  listAllUpcomingScheduled,
  getMonthClosing,
  listBillableSessionsForMonth,
} from "../../db/repos";
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
import MetricCard from "../../components/dashboard/MetricCard";
import { LineChart, DonutChart, BarChart } from "../../components/charts";
import type { BarSeries, DonutSegment } from "../../components/charts";
import RatingIndicator from "../../components/charts/RatingIndicator";
import { forecastNextMonth } from "../../lib/forecast";
import { calculateFinancialHistoryAverage } from "../../lib/financialInsights";
import { formatIdrNumber, sumExpensesByCategory, EXPENSE_LABELS } from "../../lib/finance";
import { db } from "../../db/db";

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
  setMonth: (month: string) => void;
  payments: Payment[];
  students: Student[];
  settings: Settings;
  reports: MonthlyReport[];
  monthSessions: Session[];
  monthExpenses: import("../../db/types").Expense[];
  setMessage: Dispatch<SetStateAction<string>>;
}

export default function RingkasanTab({
  month, setMonth, payments, students, settings, reports, monthSessions, monthExpenses, setMessage,
}: RingkasanTabProps) {
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

  // Tutup-bulan status + sesi laporan (basis rekap) — diperlukan untuk
  // banner rekonsiliasi pada ringkasan.
  const monthClosing = useLiveQuery(() => getMonthClosing(month), [month]);
  const reportSessions = useLiveQuery(async () => {
    const ids = [...new Set((reports ?? []).flatMap((r) => r.sessionIds))];
    if (ids.length === 0) return new Map<string, Session>();
    const rows = await db.sessions.bulkGet(ids);
    return new Map(rows.filter((s): s is Session => Boolean(s)).map((s) => [s.id, s]));
  }, [reports]);

  // ── Chart range toggle ──
  const [trendRange, setTrendRange] = useState<3 | 6 | 12>(6);
  const trendData = useMemo(() => (chartData ?? []).slice(-trendRange), [chartData, trendRange]);

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
  const currentWeek = useMemo(() => weekDates(todayStr), [todayStr]);
  const todayRevenue = useMemo(
    () => payments.filter((p) => p.status === "PAID" && p.paidAt === todayStr).reduce((sum, p) => sum + p.totalCost, 0),
    [payments, todayStr],
  );
  const weekRevenue = useMemo(
    () => payments.filter((p) => p.status === "PAID" && !!p.paidAt && p.paidAt >= currentWeek[0] && p.paidAt <= currentWeek[6]).reduce((sum, p) => sum + p.totalCost, 0),
    [payments, currentWeek],
  );

  // ── Rekonsiliasi sesi vs tagihan ──
  const billRows = useMemo(
    () => monthPayments.map((p) => {
      const linkedReport = p.reportId ? reports.find((report) => report.id === p.reportId) : undefined;
      return {
        payment: p,
        report: linkedReport,
        sessions: linkedReport
          ? linkedReport.sessionIds
              .map((id) => reportSessions?.get(id))
              .filter((s): s is Session => Boolean(s))
          : monthSessions.filter((s) => s.studentId === p.studentId),
      };
    }),
    [monthPayments, reports, reportSessions, monthSessions],
  );
  const reconciliationPotential = billRows.reduce((sum, row) => {
    if (row.payment.source === "manual") return sum + row.payment.totalCost;
    return sum + row.sessions.reduce((sessionSum, session) => sessionSum + session.cost, 0);
  }, 0);
  const billingGap = totalBilled - reconciliationPotential;

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

  const revenueByStudent = useMemo(
    () => monthSessions.reduce<Map<string, number>>((m, sess) => {
      m.set(sess.studentId, (m.get(sess.studentId) ?? 0) + sess.cost);
      return m;
    }, new Map()),
    [monthSessions],
  );

  const studentBarSeries: BarSeries[] = studentAnalytics.map((s) => ({
    label: s.name.split(" ")[0],
    value: s.revenue,
  }));
  const studentLabels = studentAnalytics.map((s) => s.name.split(" ")[0]);

  // ── Forecast ──
  const forecast = forecastNextMonth({
    scheduledNext: (nextSessions ?? []).filter((s) => s.date.startsWith(nextMonthStr)).reduce((s, x) => s + x.cost, 0),
    history: (histData ?? []).map((d) => d.potensi),
  });

  const piutangRows = payments
    .filter((p) => p.status === "UNPAID")
    .map((p) => ({ payment: p, student: studentMap.get(p.studentId) }))
    .sort((a, b) => a.payment.month.localeCompare(b.payment.month));

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
      <div className="flex gap-3 items-center">
        <label htmlFor="pay-bulan-ringkasan" className="text-sm text-gray-500 flex-shrink-0">Bulan:</label>
        <input id="pay-bulan-ringkasan" className="input flex-1" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>

      {/* Cash summary cards: laba hero + 2-col grid */}
      <div className="space-y-2">
        <div className="col-span-2 bg-green-50 rounded-xl p-3 border border-green-200 flex items-center justify-between">
          <p className="text-sm font-bold text-green-900">Laba (Realisasi − Pengeluaran)</p>
          <p className={`text-xl font-bold ${cash.laba >= 0 ? "text-green-700" : "text-red-600"}`}>{formatRupiah(cash.laba)}</p>
        </div>
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
        </div>
      </div>

      {reportSessions !== undefined && (monthClosing || monthPayments.length > 0) && (
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

      {/* Potensi sesi per murid (progress bars) */}
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
          <p className="text-xs text-gray-500 text-center py-4">Belum ada sesi selesai bulan ini</p>
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

      {/* Kas masuk vs pengeluaran — satu line chart dua series dengan rentang */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">
            Kas Masuk vs Pengeluaran ({trendRange} Bulan)
          </p>
          <div className="flex rounded-lg bg-gray-100 p-0.5" aria-label="Rentang grafik">
            {([3, 6, 12] as const).map((range) => (
              <button key={range} onClick={() => setTrendRange(range)}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors ${trendRange === range ? "bg-white text-blue-700 shadow-sm" : "text-gray-500"}`}>
                {range}B
              </button>
            ))}
          </div>
        </div>
        <LineChart
          series={[
            {
              label: "Kas Masuk",
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
          onCancel={() => setFinancialAiCostMonth(null)}
          onConfirm={() => {
            setFinancialAiCostMonth(null);
            void handleGenerateInsights();
          }}
        />
      )}
    </div>
  );
}
