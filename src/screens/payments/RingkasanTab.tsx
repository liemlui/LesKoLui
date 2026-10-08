import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { RefreshIcon, SparkleIcon } from "../../components/icons";
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
import { useAiAction } from "../../lib/useAiAction";
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
  // G3-04: satu jalur panggilan AI berbiaya. Hook ini memegang modal biayanya,
  // jadi analisis keuangan tidak bisa berjalan tanpa tutor melihat harganya.
  const ai = useAiAction();
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
  /**
   * G3-04: tombol ini tidak lagi membuka state lokal, melainkan menyerahkan
   * seluruh urutannya ke `useAiAction` — perkiraan dihitung di sini, ditampilkan
   * di modal, dan angka yang sama itu yang dicatat ke riwayat biaya.
   */
  const handleRequestFinancialInsights = () => {
    if (!financialAiConfigured) {
      setMessage("Aktifkan AI dan masukkan DeepSeek API Key di Pengaturan.");
      return;
    }
    // B4: batas belanja yang sudah terlampaui menolak dengan alasan, bukan gagal diam.
    if (ai.alasanNonaktif) {
      setMessage(ai.alasanNonaktif);
      return;
    }
    if (!financialInsightDataReady) {
      setMessage("Data keuangan masih dimuat. Coba lagi sebentar.");
      return;
    }
    const perkiraan = estimateFinancialInsightsCost();
    ai.jalankan({
      title: "Analisis AI Keuangan",
      fitur: "Ringkasan keuangan",
      estimatedIDR: perkiraan,
      description: `Analisis ${monthLabel(month)} dengan pembanding 3 bulan sebelumnya.`,
      dataSent: "Periode dan ringkasan keuangan; nama murid, nominal dan umur piutang; pendapatan, jumlah sesi, level, tarif dan rata-rata engagement hingga 10 murid; pengeluaran per kategori; rata-rata 3 bulan sebelumnya, proyeksi, kolektibilitas, laporan belum dibagikan, serta indikator piutang dan pembayaran.",
      aksi: () => handleGenerateInsights(),
    });
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
      <section aria-labelledby="needs-action-title" className="rounded-2xl border border-[var(--border-warn)] bg-[var(--bg-warn)]/60 p-4 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--ink-warn)]">Perlu ditindaklanjuti</p>
        <h2 id="needs-action-title" className="text-base font-bold text-[var(--ink-warn)]">
          {allUnpaidCount > 0
            ? `${allUnpaidCount} tagihan belum dibayar`
            : pipelineActionCount > 0
              ? `${pipelineActionCount} murid punya langkah tertunda`
              : "Tidak ada yang tertunda"}
        </h2>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-[var(--surface-strong)]/90 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-warn)]">Piutang (semua bulan)</p>
            <p className="mt-0.5 text-base font-bold text-[var(--ink-warn)]">{formatRupiah(allUnpaidTotal)}</p>
            <p className="mt-0.5 text-xs text-[var(--ink-warn)]">{allUnpaidCount} tagihan belum lunas</p>
          </div>
          <div className="rounded-xl bg-[var(--surface-strong)]/90 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">Piutang dari {selectedMonthLabel}</p>
            <p className="mt-0.5 text-base font-bold text-[var(--ink-strong)]">{formatRupiah(cash.piutang)}</p>
            <p className="mt-0.5 text-xs text-[var(--ink-muted)]">{monthPayments.length - paidCount} tagihan bulan ini</p>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link
            to="/payments?tab=tagihan"
            className="inline-flex rounded-lg bg-[var(--bg-warn-strong)] px-3 py-1.5 text-xs font-semibold text-[var(--on-strong)] transition-colors hover:bg-[var(--bg-warn-strong)]"
          >
            Tindak lanjuti di Tagihan
          </Link>
          {pipelineActionCount > 0 && (
            <Link
              to="/payments?tab=tagihan"
              className="inline-flex rounded-lg border border-[var(--border-warn)] bg-[var(--surface-strong)] px-3 py-1.5 text-xs font-semibold text-[var(--ink-warn)] transition-colors hover:bg-[var(--bg-warn)]"
            >
              Lihat {pipelineActionCount} murid yang tertunda
            </Link>
          )}
        </div>
      </section>

      {/* ── 2. Yang masuk rekening (kas): mengikuti tanggal pembayaran ── */}
      <section aria-labelledby="cash-flow-title" className="rounded-2xl border border-[var(--border-success)] bg-[var(--bg-success)]/60 p-4 shadow-sm">
        <div className="mb-3">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--ink-success)]">Uang masuk & keluar</p>
          <h2 id="cash-flow-title" className="text-base font-bold text-[var(--ink-success)]">Yang benar-benar bergerak di rekening</h2>
          <p className="mt-1 text-xs leading-relaxed text-[var(--ink-success)]">
            Dihitung dari <strong>tanggal transfer diterima</strong>, bukan tanggal les. Karena itu angkanya berbeda
            dengan tagihan di bawah, yang dihitung dari periode sesi.          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-[var(--surface-strong)]/90 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-success)]">Uang masuk · {selectedMonthLabel}</p>
            <p className="mt-1 text-lg font-bold text-[var(--ink-success)]">{formatRupiah(cash.realisasi)}</p>
            <p className="mt-1 text-xs text-[var(--ink-success)]">Transfer diterima bulan ini</p>
          </div>
          <div className="rounded-xl bg-[var(--surface-strong)]/90 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-danger)]">Pengeluaran · {selectedMonthLabel}</p>
            <p className="mt-1 text-lg font-bold text-[var(--ink-danger)]">{formatRupiah(cash.pengeluaran)}</p>
            <p className="mt-1 text-xs text-[var(--ink-muted)]">Transaksi keluar bulan ini</p>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-[var(--border-success)] bg-[var(--surface-strong)]/80 px-3 py-2.5">
          <div>
            <p className="text-xs font-bold text-[var(--ink-success)]">Sisa kas bulan ini</p>
            <p className="text-xs text-[var(--ink-success)]">Uang masuk dikurangi pengeluaran</p>
          </div>
          <p className={`text-xl font-bold ${cash.laba >= 0 ? "text-[var(--ink-success)]" : "text-[var(--ink-danger)]"}`}>{formatRupiah(cash.laba)}</p>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--ink-success)]">
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
      <section aria-labelledby="invoice-status-title" className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-4 shadow-sm">
        <div className="mb-3">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--ink-muted)]">Tagihan</p>
          <h2 id="invoice-status-title" className="text-base font-bold text-[var(--ink-strong)]">
            Yang ditagih untuk {selectedMonthLabel}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-[var(--ink-muted)]">
            Dihitung dari <strong>periode sesi</strong>: nilai sesi menjadi tagihan, lalu tagihan dibayar atau tetap
            menjadi piutang.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">Potensi sesi {selectedMonthLabel}</p>
            <p className="mt-1 text-lg font-bold text-[var(--ink-strong)]">{formatRupiah(cash.potensi)}</p>
            <p className="mt-1 text-xs text-[var(--ink-muted)]">{cash.hours} jam · {monthSessions.length} pertemuan selesai</p>
          </div>
          <div className="rounded-xl border border-[var(--brand-tint-strong)] bg-[var(--brand-tint)]/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-brand)]">Tagihan diterbitkan</p>
            <p className="mt-1 text-lg font-bold text-[var(--ink-brand)]">{formatRupiah(cash.tagihan)}</p>
            <p className="mt-1 text-xs text-[var(--ink-brand)]">Invoice ber-anchor {selectedMonthLabel}</p>
          </div>
          <div className="rounded-xl border border-[var(--border-success)] bg-[var(--bg-success)]/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-success)]">Tagihan lunas</p>
            <p className="mt-1 text-lg font-bold text-[var(--ink-success)]">{formatRupiah(cash.lunas)}</p>
            <p className="mt-1 text-xs text-[var(--ink-success)]">{paidCount} dari {monthPayments.length} tagihan bulan ini</p>
          </div>
          <div className="rounded-xl border border-[var(--border-warn)] bg-[var(--bg-warn)]/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-warn)]">Piutang {selectedMonthLabel}</p>
            <p className="mt-1 text-lg font-bold text-[var(--ink-warn)]">{formatRupiah(cash.piutang)}</p>
            <p className="mt-1 text-xs text-[var(--ink-warn)]">Tagihan bulan ini yang belum dibayar</p>
          </div>
        </div>

        {crossPeriodTotal > 0 && (
          <div className="mt-2 rounded-xl border border-[var(--border-accent)] bg-[var(--accent-tint)]/70 px-3 py-2 text-xs leading-relaxed text-[var(--ink-accent)]">
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

        <p className="mt-2 border-t border-[var(--border)] pt-2 text-xs leading-relaxed text-[var(--ink-muted)]">
          Semua aksi penagihan (terbitkan invoice, kirim WA, tandai lunas) ada di tab <strong>Tagihan</strong>, yang
          mencakup semua periode.
        </p>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-4 shadow-sm" aria-labelledby="business-health-title">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--ink-muted)]">Langkah berikutnya</p>
            <h2 id="business-health-title" className="text-base font-bold text-[var(--ink-strong)]">Kesehatan penagihan</h2>
            <p className="text-xs text-[var(--ink-muted)] mt-0.5">Baca angka sebagai keputusan, bukan sekadar laporan.</p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${collectionRate >= 80 ? "bg-[var(--bg-success)] text-[var(--ink-success)]" : collectionRate > 0 ? "bg-[var(--bg-warn)] text-[var(--ink-warn)]" : "bg-[var(--bg-subtle)] text-[var(--ink-muted)]"}`}>
            {monthPayments.length > 0 ? `${collectionRate}% lunas` : "Belum ada invoice"}
          </span>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
          <ActivityRing
            value={paidCount} total={monthPayments.length} label="Tagihan dilunasi"
            detail={monthPayments.length > 0 ? `${monthPayments.length - paidCount} tagihan belum dibayar` : "Buka Tagihan untuk menerbitkan invoice"}
            tone={collectionRate >= 80 ? "green" : collectionRate > 0 ? "amber" : "slate"}
          />
        </div>
        <div className="mt-3 rounded-xl bg-[var(--surface)] px-3 py-2.5 text-xs leading-relaxed text-[var(--ink-muted)]">
          <p>
            {monthPayments.length === 0
              ? `Belum ada tagihan pada ${selectedMonthLabel}. Buat laporan lalu terbitkan invoice dari tab Tagihan.`
              : collectionRate < 100
                ? `${monthPayments.length - paidCount} tagihan masih belum dibayar. Tindak lanjuti agar piutang berubah menjadi uang masuk.`
                : `Semua tagihan ${selectedMonthLabel} sudah dibayar. Pantau sisa kas dan pengeluaran agar margin tetap sehat.`}
          </p>
          <Link
            to={`/payments?tab=tagihan`}
            className="mt-2 inline-flex rounded-lg bg-[var(--brand-solid)] px-3 py-1.5 font-semibold text-[var(--on-strong)] transition-colors hover:bg-[var(--brand-solid)]"
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

      <details className="group rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] shadow-sm">
        <summary className="cursor-pointer list-none px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-brand)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-[var(--ink-strong)]">Analitik lanjutan</p>
              <p className="mt-0.5 text-xs text-[var(--ink-muted)]">Prediksi, analisis AI, rincian murid, tren, dan kategori pengeluaran.</p>
            </div>
            <span aria-hidden="true" className="text-[var(--ink-muted)] transition-transform group-open:rotate-90">›</span>
          </div>
        </summary>
        <div className="space-y-4 border-t border-[var(--border)] p-4">
      {/* ── AI: Anomali & Rekomendasi ───────────────────────── */}
      <section
        aria-disabled={!financialAiConfigured}
        className={`rounded-2xl border p-4 shadow-sm ${financialAiConfigured ? "border-[var(--border-accent)] bg-[var(--accent-tint)]/50" : "border-[var(--border)] bg-[var(--surface)]"}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div className="min-w-0">
            <p className={`text-xs font-bold uppercase tracking-[0.12em] ${financialAiConfigured ? "text-[var(--ink-accent)]" : "text-[var(--ink-muted)]"}`}>AI Insight</p>
            <h2 className={`text-sm font-bold ${financialAiConfigured ? "text-[var(--ink-accent)]" : "text-[var(--ink-muted)]"}`}>Anomali & Rekomendasi</h2>
          </div>
          <button
            onClick={handleRequestFinancialInsights}
            disabled={!financialAiConfigured || !financialInsightDataReady || aiInsightLoading}
            className="max-w-full shrink-0 px-3 py-1.5 rounded-lg bg-[var(--accent-solid)] text-[var(--on-strong)] text-xs font-semibold hover:bg-[var(--accent-solid)] disabled:bg-[var(--bg-subtle)] disabled:text-[var(--ink-muted)] disabled:cursor-not-allowed transition-colors"
          >
            {!financialAiConfigured
              ? "AI belum aktif"
              : !financialInsightDataReady
                ? "Menyiapkan..."
                : aiInsightLoading
                  ? "Menganalisis..."
                  : aiInsights
                    ? <><RefreshIcon size={13} className="mr-1 inline align-[-2px]" /> Analisis Ulang</>
                    : <><SparkleIcon size={13} className="mr-1 inline align-[-2px]" /> Analisis AI</>}
          </button>
        </div>
        <p className={`text-xs mb-3 ${financialAiConfigured ? "text-[var(--ink-accent)]" : "text-[var(--ink-muted)]"}`}>
          {financialAiConfigured
            ? `AI membaca ${selectedMonthLabel} dan 3 bulan sebelumnya untuk mendeteksi anomali serta memberi rekomendasi.`
            : "Aktifkan AI dan isi DeepSeek API Key di Pengaturan untuk menggunakan fitur ini."}
        </p>
        {financialAiConfigured && aiInsights && (
          <div className="space-y-3">
            {aiInsights.anomali.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-bold uppercase text-[var(--ink-muted)]">Anomali</p>
                {aiInsights.anomali.map((a, i) => (
                  <div key={i} className={`flex items-start gap-2 text-xs rounded-lg px-2.5 py-1.5 ${
                    a.level === "warning" ? "bg-[var(--bg-warn)] text-[var(--ink-warn)]" :
                    a.level === "good" ? "bg-[var(--bg-success)] text-[var(--ink-success)]" :
                    "bg-[var(--surface-strong)] text-[var(--ink-strong)]"
                  }`}>
                    <span className="mt-0.5 shrink-0">{a.level === "warning" ? "⚠️" : a.level === "good" ? "✅" : "ℹ️"}</span>
                    <span>{a.text}</span>
                  </div>
                ))}
              </div>
            )}
            {aiInsights.rekomendasi.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-bold uppercase text-[var(--ink-muted)]">Rekomendasi</p>
                {aiInsights.rekomendasi.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs bg-[var(--surface-strong)] rounded-lg px-2.5 py-1.5 text-[var(--ink-strong)]">
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
      <div className="bg-[var(--surface-strong)] rounded-xl p-4 shadow-sm border border-[var(--border)]">
        <p className="text-xs text-[var(--ink-muted)] font-medium uppercase tracking-wide">Prediksi {monthLabel(nextMonthStr)}</p>
        <p className="text-2xl font-bold text-[var(--ink-warn)] mt-1">{formatRupiah(forecast.estimate)}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-[var(--ink-muted)]">
          <span>📅 Terjadwal (terkunci): <b className="text-[var(--ink-strong)]">{formatRupiah(forecast.scheduled)}</b></span>
          <span>📈 Tren 3 bulan: <b className="text-[var(--ink-strong)]">{formatRupiah(forecast.trend)}</b></span>
        </div>
        <p className="text-xs text-[var(--ink-muted)] mt-1.5">Perkiraan memakai nilai yang lebih tinggi antara jadwal yang sudah ada dan rata-rata tren 3 bulan.</p>
      </div>

      {/* Konten murid: bar chart potensi + kartu detail per murid */}
      <div className="bg-[var(--surface-strong)] rounded-2xl border border-[var(--border)] p-4">
        <p className="text-xs font-bold text-[var(--ink-strong)] uppercase tracking-wide mb-2">
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
          <p className="text-xs text-[var(--ink-muted)] text-center py-4">Belum ada sesi selesai pada {selectedMonthLabel}</p>
        )}
      </div>

      {studentAnalytics.map((s) => (
        <div key={s.name} className="bg-[var(--surface-strong)] rounded-xl border border-[var(--border)] p-3 flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[var(--ink-strong)] truncate">{s.name}</p>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-[var(--ink-muted)]">{s.sessions} sesi</span>
              <span className="text-xs font-semibold text-[var(--ink-success)]">
                {formatIdrNumber(s.revenue)}
              </span>
            </div>
            {(s.confirmedCount > 0 || s.draftCount > 0) && (
              <div className="flex gap-2 mt-1 text-xs">
                {s.confirmedCount > 0 && <span className="text-[var(--ink-accent)]">🏷 {s.confirmedCount} laporan sah</span>}
                {s.draftCount > 0 && <span className="text-[var(--ink-warn)]">📋 {s.draftCount} draft</span>}
              </div>
            )}
          </div>
          {s.avgEngagement > 0 && (
            <RatingIndicator value={Math.round(s.avgEngagement)} max={10} size="sm" variant="dots" tone="blue" />
          )}
        </div>
      ))}

      {studentAnalytics.length === 0 && (
        <p className="text-xs text-[var(--ink-muted)] text-center py-4">Belum ada data murid pada {selectedMonthLabel}</p>
      )}

      {/* Uang masuk vs pengeluaran — satu line chart dua series dengan rentang */}
      <div className="bg-[var(--surface-strong)] rounded-2xl border border-[var(--border)] p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-[var(--ink-strong)] uppercase tracking-wide">
              Tren kas masuk & pengeluaran
            </p>
            <p className="mt-0.5 text-xs text-[var(--ink-muted)]">{trendPeriodLabel}</p>
          </div>
          <div className="flex rounded-lg bg-[var(--bg-subtle)] p-0.5" role="group" aria-label="Rentang grafik">
            {([3, 6, 12] as const).map((range) => (
              <button key={range} type="button" aria-pressed={trendRange === range} onClick={() => setTrendRange(range)}
                className={`px-2 py-1 rounded-md text-xs font-semibold transition-colors sm:text-xs ${trendRange === range ? "bg-[var(--surface-strong)] text-[var(--ink-brand)] shadow-sm" : "text-[var(--ink-muted)] hover:text-[var(--ink-strong)]"}`}>
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
      <div className="bg-[var(--surface-strong)] rounded-2xl border border-[var(--border)] p-4 flex flex-col items-center">
        <p className="text-xs font-bold text-[var(--ink-strong)] uppercase tracking-wide mb-2">Pengeluaran per Kategori</p>
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
          <p className="text-xs text-[var(--ink-muted)] py-4">Belum ada pengeluaran</p>
        )}
      </div>

      {/* G3-04: satu jalur `useAiAction` untuk seluruh aplikasi. Modal biaya
          analisis keuangan datang dari hook itu, bukan dipasang sendiri di sini,
          supaya tidak ada panggilan AI yang bisa lolos tanpa tutor melihat
          harganya — dan supaya biayanya ikut tercatat di riwayat. */}
      {ai.modal}
        </div>
      </details>
    </div>
  );
}
