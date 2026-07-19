import { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  listStudents,
  listAllSessionsForMonth,
  listDoneSessionsForDateRange,
  listExpenses,
  listAllPendingHomework,
  listAllHomeworkFull,
} from "../db/repos";
import { monthOf, monthLabel, todayWIB, monthsBetween } from "../lib/format";
import { prevMonth, nextMonth } from "../lib/calendar";
import { forecastNextMonth, weightedMovingAverage } from "../lib/forecast";
import Tabs from "../components/Tabs";
import Skeleton from "../components/Skeleton";
import {
  BarChart, LineChart, DonutChart, Gauge, ProgressBar,
} from "../components/charts";
import type { BarSeries, DonutSegment } from "../components/charts";
import RatingIndicator from "../components/charts/RatingIndicator";

type AnalyticsTab = "financial" | "students" | "operations";

export default function Analytics() {
  const today = todayWIB();
  const [calMonth, setCalMonth] = useState(() => monthOf(today));
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("financial");

  const students = useLiveQuery(() => listStudents(true), []);
  const monthSessions = useLiveQuery(() => listAllSessionsForMonth(calMonth), [calMonth]);
  const monthExpenses = useLiveQuery(() => listExpenses(calMonth), [calMonth]);
  const allHomework = useLiveQuery(() => listAllHomeworkFull(), []);
  const pendingHomework = useLiveQuery(() => listAllPendingHomework(), []);



  // ── Financial data ──────────────────────────────────────────────────
  const financialData = useMemo(() => {
    const sessions = monthSessions ?? [];
    const done = sessions.filter((s) => s.status === "DONE");
    const revenue = done.reduce((sum, s) => sum + (s.cost ?? 0), 0);
    const expenses = (monthExpenses ?? []).reduce((sum, e) => sum + e.amount, 0);
    const scheduledRevenue = sessions
      .filter((s) => s.status === "SCHEDULED")
      .reduce((sum, s) => sum + (s.cost ?? 0), 0);

    // Expense by category
    const catMap = new Map<string, number>();
    (monthExpenses ?? []).forEach((e) => {
      catMap.set(e.category, (catMap.get(e.category) ?? 0) + e.amount);
    });
    const expenseSegments: DonutSegment[] = Array.from(catMap.entries()).map(
      ([cat, amt]) => ({ label: cat, value: amt })
    );

    return { revenue, expenses, scheduledRevenue, expenseSegments };
  }, [monthSessions, monthExpenses]);

  // Revenue trend (monthly)
  const revenueTrend = useMemo(() => {
    // We can only show current month's data — for a real trend we'd need multi-month queries
    // For now, create a simple 2-point trend
    const prevM = prevMonth(calMonth);
    const currentRev = financialData.revenue;
    return [
      { x: prevM.slice(5), y: 0 }, // placeholder — full trend needs multi-month data
      { x: calMonth.slice(5), y: currentRev },
    ];
  }, [calMonth, financialData.revenue]);

  // Forecast
  const forecast = useMemo(() => {
    const history = [financialData.revenue]; // simplified
    return forecastNextMonth({
      scheduledNext: financialData.scheduledRevenue,
      history,
    });
  }, [financialData]);

  // ── Student data ────────────────────────────────────────────────────
  const studentData = useMemo(() => {
    if (!students || !monthSessions) return [];
    const done = monthSessions.filter((s) => s.status === "DONE");
    const map = new Map<string, { name: string; revenue: number; sessions: number; avgEngagement: number }>();
    students.forEach((s) => map.set(s.id, { name: s.name, revenue: 0, sessions: 0, avgEngagement: 0 }));

    const engScores = new Map<string, number[]>();
    done.forEach((s) => {
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

    // Compute avg engagement
    engScores.forEach((scores, id) => {
      const entry = map.get(id);
      if (entry && scores.length > 0) {
        entry.avgEngagement = scores.reduce((a, b) => a + b, 0) / scores.length;
      }
    });

    return Array.from(map.values()).filter((e) => e.sessions > 0 || e.revenue > 0);
  }, [students, monthSessions]);

  const studentBarSeries: BarSeries[] = studentData.map((s) => ({
    label: s.name.split(" ")[0],
    value: s.revenue,
  }));

  const studentLabels = studentData.map((s) => s.name.split(" ")[0]);

  // ── Operations data ─────────────────────────────────────────────────
  const opsData = useMemo(() => {
    const sessions = monthSessions ?? [];
    const done = sessions.filter((s) => s.status === "DONE");
    const noShow = sessions.filter((s) => s.status === "NO_SHOW");
    const total = sessions.length;
    const completionRate = total > 0 ? Math.round((done.length / total) * 100) : 0;
    const noShowRate = total > 0 ? Math.round((noShow.length / total) * 100) : 0;

    const avgDuration = done.length > 0
      ? done.reduce((sum, s) => sum + (s.durationHours ?? 0), 0) / done.length
      : 0;

    const hwDone = (allHomework ?? []).filter((h) => h.status === "done").length;
    const hwOverdue = (pendingHomework ?? []).filter((h) => h.status === "overdue").length;
    const hwTotal = (allHomework ?? []).length;
    const hwCompletionRate = hwTotal > 0 ? Math.round((hwDone / hwTotal) * 100) : 0;

    return { completionRate, noShowRate, avgDuration, hwDone, hwOverdue, hwTotal, hwCompletionRate };
  }, [monthSessions, allHomework, pendingHomework]);

  const isLoading = !students || !monthSessions;

  if (isLoading) {
    return (
      <div className="pb-20 px-4 pt-5 space-y-4">
        <Skeleton variant="text" lines={2} width="40%" />
        <Skeleton variant="chart" height={200} />
        <Skeleton variant="chart" height={200} />
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "'Fredoka', sans-serif" }}>Analitik</h1>
        <p className="text-gray-400 text-xs">Wawasan bisnis & operasional les privat</p>
      </div>

      {/* Month picker */}
      <div className="mx-4 mb-3 flex items-center justify-between bg-white rounded-xl border border-gray-100 px-3 py-2">
        <button aria-label="Bulan sebelumnya" onClick={() => setCalMonth(prevMonth(calMonth))} className="text-gray-400 text-xl w-8 text-center">‹</button>
        <span className="font-semibold text-gray-800 text-sm">{monthLabel(calMonth)}</span>
        <button aria-label="Bulan berikutnya" onClick={() => setCalMonth(nextMonth(calMonth))} className="text-gray-400 text-xl w-8 text-center">›</button>
      </div>

      {/* Tabs */}
      <div className="mx-4 mb-3">
        <Tabs
          tabs={[
            { key: "financial", label: "Keuangan" },
            { key: "students", label: "Murid" },
            { key: "operations", label: "Operasional" },
          ]}
          active={activeTab}
          onChange={(k) => setActiveTab(k as AnalyticsTab)}
          fullWidth
        />
      </div>

      <div className="px-4 space-y-4">
        {/* ── Financial Tab ────────────────────────────────────────── */}
        {activeTab === "financial" && (
          <>
            {/* Revenue vs Expenses bar chart */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                Pendapatan vs Pengeluaran
              </p>
              <BarChart
                series={[
                  { label: "Pendapatan", value: financialData.revenue, color: "#16a34a" },
                  { label: "Pengeluaran", value: financialData.expenses, color: "#dc2626" },
                ]}
                labels={[calMonth.slice(5)]}
                height={160}
                formatValue={(v) =>
                  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)
                }
              />
            </div>

            {/* Revenue trend */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                Tren Pendapatan
              </p>
              <LineChart
                series={[
                  {
                    label: "Pendapatan",
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

            {/* Forecast + expense donut */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col items-center">
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2 text-center">
                  Estimasi Bulan Depan
                </p>
                <p className="text-lg font-bold text-blue-700">
                  {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(forecast.estimate)}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">
                  Terjadwal: {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(forecast.scheduled)}
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col items-center">
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Pengeluaran</p>
                {financialData.expenseSegments.length > 0 ? (
                  <DonutChart
                    segments={financialData.expenseSegments}
                    size={120}
                    thickness={12}
                    centerLabel="Total"
                    centerValue={new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(financialData.expenses)}
                    showLegend={false}
                  />
                ) : (
                  <p className="text-xs text-gray-400 py-4">Belum ada pengeluaran</p>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── Students Tab ─────────────────────────────────────────── */}
        {activeTab === "students" && (
          <>
            {/* Revenue per student */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                Pendapatan per Murid — {monthLabel(calMonth)}
              </p>
              {studentBarSeries.length > 0 ? (
                <BarChart
                  series={studentBarSeries}
                  labels={studentLabels}
                  height={Math.max(120, studentData.length * 28)}
                  formatValue={(v) =>
                    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)
                  }
                />
              ) : (
                <p className="text-xs text-gray-400 text-center py-4">Belum ada sesi selesai bulan ini</p>
              )}
            </div>

            {/* Per-student detail cards */}
            {studentData.map((s) => (
              <div key={s.name} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-800 truncate">{s.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-500">{s.sessions} sesi</span>
                    <span className="text-xs font-semibold text-green-700">
                      {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(s.revenue)}
                    </span>
                  </div>
                </div>
                {s.avgEngagement > 0 && (
                  <RatingIndicator value={Math.round(s.avgEngagement)} max={10} size="sm" variant="dots" tone="blue" />
                )}
              </div>
            ))}

            {studentData.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">Belum ada data murid bulan ini</p>
            )}
          </>
        )}

        {/* ── Operations Tab ───────────────────────────────────────── */}
        {activeTab === "operations" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col items-center">
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Sesi Selesai</p>
                <Gauge
                  value={opsData.completionRate} max={100}
                  label="Completion"
                  tone={opsData.completionRate >= 80 ? "green" : opsData.completionRate >= 50 ? "amber" : "red"}
                  size="sm"
                  showTicks={false}
                />
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Metrik</p>
                <div className="space-y-2">
                  <div>
                    <p className="text-[10px] text-gray-400">No-Show Rate</p>
                    <p className={`text-sm font-bold ${opsData.noShowRate > 20 ? "text-red-600" : "text-green-600"}`}>
                      {opsData.noShowRate}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">Rata-rata Durasi</p>
                    <p className="text-sm font-bold text-gray-700">{opsData.avgDuration.toFixed(1)} jam</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Homework completion */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">PR / Homework</p>
              <ProgressBar
                value={opsData.hwDone} max={opsData.hwTotal}
                label="Tingkat penyelesaian PR"
                detail={`${opsData.hwDone} selesai dari ${opsData.hwTotal} PR${opsData.hwOverdue > 0 ? ` · ${opsData.hwOverdue} terlambat` : ""}`}
                tone="blue"
                thresholds={[
                  { pct: 80, tone: "green" },
                  { pct: 50, tone: "amber" },
                  { pct: 0, tone: "red" },
                ]}
              />
            </div>

            {/* Monthly summary */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Ringkasan {monthLabel(calMonth)}</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-green-50 rounded-xl p-2">
                  <p className="text-lg font-bold text-green-700">{(monthSessions ?? []).filter((s) => s.status === "DONE").length}</p>
                  <p className="text-[10px] text-green-600 font-semibold">Selesai</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-2">
                  <p className="text-lg font-bold text-blue-700">{(monthSessions ?? []).filter((s) => s.status === "SCHEDULED").length}</p>
                  <p className="text-[10px] text-blue-600 font-semibold">Terjadwal</p>
                </div>
                <div className="bg-red-50 rounded-xl p-2">
                  <p className="text-lg font-bold text-red-700">{(monthSessions ?? []).filter((s) => s.status === "NO_SHOW").length}</p>
                  <p className="text-[10px] text-red-600 font-semibold">No-Show</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
