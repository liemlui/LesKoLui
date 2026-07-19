import { Gauge, BarChart, ProgressBar } from "../../components/charts";
import type { BarSeries } from "../../components/charts";
import MetricCard from "../../components/dashboard/MetricCard";
import Badge from "../../components/Badge";

interface Props {
  activeStudents: number;
  todayDone: number;
  todayScheduled: number;
  weekDone: number;
  weekPlanned: number;
  missedCount: number;
  attentionCount: number;
  /** Optional: today's revenue in IDR */
  todayRevenue?: number;
  /** Optional: week-to-date revenue in IDR */
  weekRevenue?: number;
}

/** Top-of-home command center v2: gauges, mini chart, KanBan zones, financial glance. */
export default function OperationalSnapshot({
  activeStudents, todayDone, todayScheduled, weekDone, weekPlanned, missedCount, attentionCount,
  todayRevenue, weekRevenue,
}: Props) {
  const todayTotal = todayDone + todayScheduled;
  const weekPct = weekPlanned > 0 ? Math.round((weekDone / weekPlanned) * 100) : 0;

  const focus = missedCount > 0
    ? `Prioritas: selesaikan ${missedCount} sesi terlewat agar catatan dan tagihan tetap akurat.`
    : attentionCount > 0
      ? `Ada ${attentionCount} item yang perlu ditindaklanjuti sebelum agenda berikutnya.`
      : todayScheduled > 0
        ? "Agenda hari ini siap. Buka sesi berikutnya lalu catat hasilnya segera setelah selesai."
        : "Agenda terkendali. Gunakan waktu kosong untuk menyiapkan materi atau follow-up murid.";

  // Weekly session distribution for mini bar chart
  const weekBarSeries: BarSeries[] = [
    { label: "Selesai", value: weekDone, color: "#16a34a" },
    { label: "Dijadwalkan", value: Math.max(0, weekPlanned - weekDone), color: "#2563eb" },
  ];

  const weekLabels = ["Minggu Ini"];

  return (
    <section className="mx-4 mb-3 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden" aria-labelledby="operational-title">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3 border-b border-slate-100">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Command center</p>
          <h2 id="operational-title" className="text-base font-bold text-slate-800">Operasional hari ini</h2>
          <p className="mt-0.5 text-xs text-slate-500">Ringkasan yang bisa langsung ditindaklanjuti.</p>
        </div>
        <Badge tone={attentionCount > 0 ? "amber" : "green"} count={attentionCount > 0 ? attentionCount : undefined}>
          {attentionCount > 0 ? "Perlu perhatian" : "Terkendali"}
        </Badge>
      </div>

      {/* Gauges row: today + week */}
      <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50/70">
        <div className="rounded-xl bg-white border border-slate-100 p-3 flex flex-col items-center">
          <Gauge
            value={todayDone} max={todayTotal}
            label="Hari ini"
            detail={todayTotal > 0 ? `${todayScheduled} menunggu` : "Belum ada agenda"}
            tone={todayScheduled > 0 ? "blue" : "green"}
            size="sm"
          />
        </div>
        <div className="rounded-xl bg-white border border-slate-100 p-3 flex flex-col items-center">
          <Gauge
            value={weekDone} max={weekPlanned}
            label="Minggu ini"
            detail={`${weekDone}/${weekPlanned} sesi tercatat`}
            tone={weekPlanned > 0 && weekPct < 50 ? "amber" : "green"}
            size="sm"
          />
        </div>
      </div>

      {/* Mini bar chart — weekly distribution */}
      {weekPlanned > 0 && (
        <div className="px-4 pt-1 pb-3">
          <BarChart
            series={weekBarSeries}
            labels={weekLabels}
            height={80}
            showAxes={false}
            showSeparators={true}
            emptyLabel=""
          />
        </div>
      )}

      {/* KanBan-style zone cards */}
      <div className="grid grid-cols-3 gap-2 px-4 pb-3">
        <MetricCard label="Murid aktif" value={activeStudents} description="Perlu jadwal dan follow-up rutin." icon="👥" tone="blue" />
        <MetricCard label="Sesi terlewat" value={missedCount} description={missedCount > 0 ? "Kelola dengan wizard sesi." : "Tidak ada sesi tertinggal."} icon="⏱" tone={missedCount > 0 ? "red" : "green"} />
        <MetricCard label="Tindak lanjut" value={attentionCount} description="PR, follow-up, atau jadwal perlu aksi." icon="✓" tone={attentionCount > 0 ? "amber" : "slate"} />
      </div>

      {/* Visual separator between zones */}
      <div className="mx-4 border-t border-slate-100" />

      {/* Financial glance + progress */}
      <div className="px-4 py-3 space-y-3">
        {(todayRevenue != null || weekRevenue != null) && (
          <div className="flex items-center gap-3 text-xs">
            {todayRevenue != null && (
              <div className="flex-1 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2">
                <p className="text-blue-500 font-semibold uppercase tracking-wide text-[10px]">Pendapatan Hari Ini</p>
                <p className="text-blue-700 font-bold text-sm">
                  {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(todayRevenue)}
                </p>
              </div>
            )}
            {weekRevenue != null && (
              <div className="flex-1 rounded-lg bg-green-50 border border-green-100 px-3 py-2">
                <p className="text-green-500 font-semibold uppercase tracking-wide text-[10px]">Minggu Ini</p>
                <p className="text-green-700 font-bold text-sm">
                  {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(weekRevenue)}
                </p>
              </div>
            )}
          </div>
        )}

        {todayTotal > 0 && (
          <ProgressBar
            value={todayDone} max={todayTotal}
            label="Progress sesi hari ini"
            detail={todayDone >= todayTotal ? "Semua sesi selesai! 🎉" : `${todayScheduled} sesi tersisa`}
            tone="blue"
            thresholds={[
              { pct: 100, tone: "green" },
              { pct: 50, tone: "blue" },
              { pct: 0, tone: "amber" },
            ]}
          />
        )}
      </div>

      {/* Focus callout */}
      <div className={`mx-4 mb-4 rounded-xl border px-3 py-2.5 text-xs leading-relaxed ${missedCount > 0 ? "border-orange-200 bg-orange-50 text-orange-800" : "border-blue-100 bg-blue-50 text-blue-800"}`}>
        <span className="font-bold">Fokus berikutnya: </span>{focus}
      </div>
    </section>
  );
}
