import { LineChart, ProgressBar } from "../../components/charts";
import MetricCard from "../../components/dashboard/MetricCard";

interface Props {
  activeStudents: number;
  todayDone: number;
  todayScheduled: number;
  weekDone: number;
  weekPlanned: number;
  missedCount: number;
  attentionCount: number;
  /** Tren jumlah sesi selesai per minggu (4 minggu terakhir) untuk sparkline "Minggu Ini". */
  weeklyTrend?: number[];
  /** Fired when the alert strip is tapped — should scroll to AttentionInbox. */
  onAttentionClick?: () => void;
  /** Fired when "Sesi terlewat" card CTA is tapped. */
  onMissedClick?: () => void;
  /** Fired when "Murid aktif" card CTA is tapped. */
  onActiveStudentsClick?: () => void;
}

/** Top-of-home command center: alert strip, priority KPI grid, actionable metric cards, progress. */
export default function OperationalSnapshot({
  activeStudents, todayDone, todayScheduled, weekDone, weekPlanned,
  missedCount, attentionCount, weeklyTrend,
  onAttentionClick, onMissedClick, onActiveStudentsClick,
}: Props) {
  const todayTotal = todayDone + todayScheduled;
  const weekPct = weekPlanned > 0 ? Math.round((weekDone / weekPlanned) * 100) : 0;
  const todayPct = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0;

  // Explicit state labels with icons — never rely on color alone
  const todayStateLabel = todayTotal === 0
    ? "Belum ada sesi"
    : todayDone >= todayTotal
      ? "Semua selesai!"
      : todayDone === 0
        ? "Belum mulai"
        : `${todayDone}/${todayTotal} sesi selesai`;

  const todayStateTone: "slate" | "green" | "amber" | "blue" =
    todayTotal === 0 ? "slate"
    : todayDone >= todayTotal ? "green"
    : todayDone === 0 ? "amber"
    : "blue";

  const weekLabel = weekPlanned > 0
    ? `${weekDone}/${weekPlanned} sesi tercatat`
    : "Belum ada agenda";

  const hasUrgent = missedCount > 0 || attentionCount > 0;

  return (
    <section
      className="mx-4 mb-3 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
      aria-labelledby="operational-title"
    >
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3 border-b border-slate-100">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600">Command center</p>
          <h2 id="operational-title" className="text-base font-bold text-slate-800">Operasional hari ini</h2>
          <p className="mt-0.5 text-xs text-slate-600">Ringkasan yang bisa langsung ditindaklanjuti.</p>
        </div>
      </div>

      {/* ── Alert strip ── */}
      {hasUrgent && (
        <button
          onClick={onAttentionClick}
          className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-amber-50 border-b border-amber-100 text-left hover:bg-amber-100 transition-colors cursor-pointer"
          aria-label={`Perlu perhatian: ${attentionCount} item — ketuk untuk lihat detail`}
        >
          <span aria-hidden="true" className="text-base leading-none shrink-0">⚠️</span>
          <span className="flex-1 text-sm font-bold text-amber-800">
            Perlu perhatian
          </span>
          <span className="inline-flex items-center justify-center min-w-[24px] h-6 rounded-full bg-amber-200 text-amber-800 text-xs font-bold px-1.5">
            {attentionCount}
          </span>
          <span aria-hidden="true" className="text-amber-500 text-sm">▸</span>
        </button>
      )}

      {/* ── Priority KPI grid: full-width Hari Ini primary, then 2-col secondary cards ── */}
      <div className="p-4 space-y-3">
        {/* Hari Ini — full-width primary KPI with left-border accent */}
        <div
          className={`rounded-xl border p-4 w-full text-left ${
            todayStateTone === "green" ? "border-l-4 border-l-green-500 bg-green-50/60 border-green-100"
            : todayStateTone === "amber" ? "border-l-4 border-l-amber-500 bg-amber-50/60 border-amber-100"
            : todayStateTone === "blue" ? "border-l-4 border-l-blue-500 bg-blue-50/60 border-blue-100"
            : "border-l-4 border-l-slate-300 bg-slate-50 border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">Hari Ini</p>
              <p className="mt-1 text-[32px] font-bold leading-none text-slate-800">
                {todayTotal > 0 ? `${todayPct}%` : "—"}
              </p>
            </div>
            {/* State badge */}
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
              todayStateTone === "green" ? "bg-green-200 text-green-800"
              : todayStateTone === "amber" ? "bg-amber-200 text-amber-800"
              : todayStateTone === "blue" ? "bg-blue-200 text-blue-800"
              : "bg-slate-200 text-slate-700"
            }`}>
              {todayStateTone === "green" && "✅"}
              {todayStateTone === "amber" && "⏳"}
              {todayStateTone === "blue" && "📋"}
              {todayStateTone === "slate" && "📅"}
              {" "}{todayStateLabel}
            </span>
          </div>
          {todayTotal > 0 && (
            <div className="mt-3">
              <div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ease-out ${
                    todayPct >= 100 ? "bg-green-500" : todayPct >= 50 ? "bg-blue-500" : "bg-amber-500"
                  }`}
                  style={{ width: `${Math.max(todayPct, 3)}%`, minWidth: todayPct > 0 ? "8px" : 0 }}
                />
              </div>
              <p className="mt-1.5 text-xs font-medium text-slate-600">
                {todayDone >= todayTotal
                  ? "Semua sesi selesai! 🎉"
                  : todayDone === 0
                    ? "Belum ada sesi selesai — mulai catat sesi pertama."
                    : `${todayScheduled} sesi tersisa — lanjutkan!`}
              </p>
            </div>
          )}
          {todayTotal === 0 && (
            <p className="mt-2 text-xs text-slate-600">Tambahkan jadwal di bagian "Hari Ini" di bawah.</p>
          )}
        </div>

        {/* Secondary row: Minggu Ini + Sesi Terlewat */}
        <div className="grid grid-cols-2 gap-3">
          {/* Minggu Ini */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">Minggu ini</p>
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

          {/* Sesi Terlewat */}
          <MetricCard
            label="Sesi terlewat"
            value={missedCount}
            description={missedCount > 0 ? "Perlu dicatat atau dijadwalkan ulang." : "Tidak ada sesi tertinggal."}
            icon={missedCount > 0 ? "⏱" : "✅"}
            tone={missedCount > 0 ? "red" : "green"}
            action={missedCount > 0 ? "Buka daftar" : undefined}
            onClick={missedCount > 0 ? onMissedClick : undefined}
          />
        </div>

        {/* Bottom row: Tindak Lanjut + Murid Aktif in 2-col */}
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            label="Tindak lanjut"
            value={attentionCount}
            description="PR, follow-up, atau jadwal perlu aksi."
            icon="✓"
            tone={attentionCount > 0 ? "amber" : "slate"}
            action={attentionCount > 0 ? "Buka daftar" : undefined}
            onClick={attentionCount > 0 ? onAttentionClick : undefined}
          />
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

      {/* ── Separator ── */}
      <div className="mx-4 border-t border-slate-100" />

      {/* ── Progress sesi hari ini ── */}
      <div className="px-4 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-slate-800">Progress sesi hari ini</p>
          <span className={`text-sm font-bold ${
            todayPct >= 100 ? "text-green-700"
            : todayPct >= 50 ? "text-blue-700"
            : todayPct === 0 ? "text-slate-600"
            : "text-amber-700"
          }`}>
            {todayTotal > 0 ? `${todayPct}%` : "—"}
          </span>
        </div>

        {todayTotal > 0 ? (
          <>
            <ProgressBar
              value={todayDone}
              max={todayTotal}
              tone="blue"
              showPercent={false}
              size="lg"
              thresholds={[
                { pct: 100, tone: "green" },
                { pct: 50, tone: "blue" },
                { pct: 0, tone: "amber" },
              ]}
            />
            <p className="text-xs text-slate-600">
              {todayDone >= todayTotal
                ? "Semua sesi selesai! 🎉"
                : todayDone === 0
                  ? "Belum ada sesi selesai — mulai catat sesi pertama."
                  : `${todayScheduled} sesi tersisa`}
            </p>
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-3 text-center">
            <p className="text-xs text-slate-600">Belum ada sesi hari ini.</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Tambahkan jadwal di bagian "Hari Ini" di bawah.</p>
          </div>
        )}
      </div>
    </section>
  );
}
