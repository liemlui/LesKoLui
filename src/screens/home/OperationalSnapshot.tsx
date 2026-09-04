import { LineChart } from "../../components/charts";
import MetricCard from "../../components/dashboard/MetricCard";

interface Props {
  activeStudents: number;
  weekDone: number;
  weekPlanned: number;
  /** Tren jumlah sesi selesai per minggu (4 minggu terakhir) untuk sparkline "Minggu Ini". */
  weeklyTrend?: number[];
  /** Fired when "Murid aktif" card CTA is tapped. */
  onActiveStudentsClick?: () => void;
}

/** Top-of-home command center: weekly context and active-student shortcut. */
export default function OperationalSnapshot({
  activeStudents, weekDone, weekPlanned, weeklyTrend, onActiveStudentsClick,
}: Props) {
  const weekPct = weekPlanned > 0 ? Math.round((weekDone / weekPlanned) * 100) : 0;

  const weekLabel = weekPlanned > 0
    ? `${weekDone}/${weekPlanned} sesi tercatat`
    : "Belum ada agenda";

  return (
    <section
      className="mx-4 mb-3 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
      aria-labelledby="operational-title"
    >
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3 border-b border-slate-100">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-600">Command center</p>
          <h2 id="operational-title" className="text-base font-bold text-slate-800">Operasional hari ini</h2>
          <p className="mt-0.5 text-xs text-slate-600">Ringkasan yang bisa langsung ditindaklanjuti.</p>
        </div>
      </div>

      {/* ── Weekly context and student shortcut ── */}
      <div className="p-4 space-y-3">
        {/* Secondary row: Minggu Ini + Murid Aktif */}
        <div className="grid grid-cols-2 gap-3">
          {/* Minggu Ini */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Minggu ini</p>
            <p className="mt-1 text-[28px] font-bold leading-none text-slate-800">
              {weekPlanned > 0 ? `${weekPct}%` : "—"}
            </p>
            <p className="mt-1 text-xs text-slate-600">{weekLabel}</p>
            {weekPlanned > 0 && (
              <div className="mt-2">
                <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ease-out ${
                      weekPct >= 100 ? "bg-green-500" : weekPct >= 50 ? "bg-blue-500" : "bg-amber-500"
                    }`}
                    style={{ width: `${Math.max(weekPct, 3)}%`, minWidth: weekPct > 0 ? "8px" : 0 }}
                  />
                </div>
              </div>
            )}
            {/* Sparkline tren 4 minggu terakhir — konteks historis di card Minggu Ini */}
            {Array.isArray(weeklyTrend) && weeklyTrend.length >= 2 && (
              <div className="mt-2" aria-label="Tren sesi selesai 4 minggu terakhir">
                <LineChart
                  series={[{
                    label: "Sesi selesai",
                    data: weeklyTrend.map((y, i) => ({ x: String(i + 1), y })),
                    areaFill: true,
                    color: "#2563eb",
                  }]}
                  height={36}
                  showAxes={false}
                  dateXAxis={false}
                  formatY={(v) => `${v}`}
                />
              </div>
            )}
          </div>

          <MetricCard
            label="Murid aktif"
            value={activeStudents}
            description="Kelola jadwal & follow-up."
            icon="👥"
            tone="blue"
            action="Lihat murid"
            onClick={onActiveStudentsClick}
          />
        </div>
      </div>

    </section>
  );
}
