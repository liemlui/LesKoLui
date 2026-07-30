import { ProgressBar } from "../../components/charts";
import MetricCard from "../../components/dashboard/MetricCard";

interface Props {
  activeStudents: number;
  todayDone: number;
  todayScheduled: number;
  weekDone: number;
  weekPlanned: number;
  missedCount: number;
  attentionCount: number;
  /** Fired when the alert strip is tapped — should scroll to AttentionInbox. */
  onAttentionClick?: () => void;
  /** Fired when "Sesi terlewat" card CTA is tapped. */
  onMissedClick?: () => void;
  /** Fired when "Murid aktif" card CTA is tapped. */
  onActiveStudentsClick?: () => void;
}

/** Top-of-home command center: alert strip, KPIs, actionable metric cards, progress. */
export default function OperationalSnapshot({
  activeStudents, todayDone, todayScheduled, weekDone, weekPlanned,
  missedCount, attentionCount,
  onAttentionClick, onMissedClick, onActiveStudentsClick,
}: Props) {
  const todayTotal = todayDone + todayScheduled;
  const weekPct = weekPlanned > 0 ? Math.round((weekDone / weekPlanned) * 100) : 0;

  const todayPct = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0;

  // State label for today's progress
  const todayState = todayTotal === 0
    ? "Belum ada sesi hari ini"
    : todayDone >= todayTotal
      ? "Semua sesi selesai! 🎉"
      : todayDone === 0
        ? "Belum ada sesi selesai"
        : `${todayDone}/${todayTotal} sesi selesai`;

  const weekLabel = weekPlanned > 0
    ? `${weekDone}/${weekPlanned} sesi tercatat`
    : "Belum ada agenda minggu ini";

  const hasUrgent = missedCount > 0 || attentionCount > 0;

  return (
    <section
      className="mx-4 mb-3 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
      aria-labelledby="operational-title"
    >
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3 border-b border-slate-100">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Command center</p>
          <h2 id="operational-title" className="text-base font-bold text-slate-800">Operasional hari ini</h2>
          <p className="mt-0.5 text-xs text-slate-500">Ringkasan yang bisa langsung ditindaklanjuti.</p>
        </div>
      </div>

      {/* ── Alert strip (replaces the tiny badge) ── */}
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

      {/* ── Today + Week compact KPI tiles (replacing gauges) ── */}
      <div className="grid grid-cols-2 gap-3 p-4">
        {/* Today KPI */}
        <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Hari ini</p>
          <p className="mt-1 text-[26px] font-bold leading-none text-slate-800">
            {todayTotal > 0 ? `${todayPct}%` : "—"}
          </p>
          <p className="mt-1 text-xs text-slate-500">{todayState}</p>
          {todayTotal > 0 && (
            <div className="mt-2">
              <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ease-out ${todayPct >= 100 ? "bg-green-500" : todayPct >= 50 ? "bg-blue-500" : "bg-amber-500"}`}
                  style={{ width: `${Math.max(todayPct, 2)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Week KPI */}
        <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Minggu ini</p>
          <p className="mt-1 text-[26px] font-bold leading-none text-slate-800">
            {weekPlanned > 0 ? `${weekPct}%` : "—"}
          </p>
          <p className="mt-1 text-xs text-slate-500">{weekLabel}</p>
          {weekPlanned > 0 && (
            <div className="mt-2">
              <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ease-out ${weekPct >= 100 ? "bg-green-500" : weekPct >= 50 ? "bg-blue-500" : "bg-amber-500"}`}
                  style={{ width: `${Math.max(weekPct, 2)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Actionable summary cards (2+1 layout) ── */}
      <div className="px-4 pb-3 space-y-2">
        {/* Row 1: two most actionable cards */}
        <div className="grid grid-cols-2 gap-2">
          <MetricCard
            label="Sesi terlewat"
            value={missedCount}
            description={missedCount > 0 ? "Sesi perlu dicatat atau dijadwalkan ulang." : "Tidak ada sesi tertinggal."}
            icon="⏱"
            tone={missedCount > 0 ? "red" : "green"}
            action={missedCount > 0 ? "Buka daftar" : undefined}
            onClick={missedCount > 0 ? onMissedClick : undefined}
          />
          <MetricCard
            label="Tindak lanjut"
            value={attentionCount}
            description="PR, follow-up, atau jadwal perlu aksi."
            icon="✓"
            tone={attentionCount > 0 ? "amber" : "slate"}
          />
        </div>
        {/* Row 2: full-width */}
        <MetricCard
          label="Murid aktif"
          value={activeStudents}
          description="Kelola jadwal dan follow-up rutin."
          icon="👥"
          tone="blue"
          action="Lihat murid"
          onClick={onActiveStudentsClick}
        />
      </div>

      {/* ── Separator ── */}
      <div className="mx-4 border-t border-slate-100" />

      {/* ── Progress sesi hari ini ── */}
      <div className="px-4 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-slate-800">Progress sesi hari ini</p>
          <span className={`text-sm font-bold ${todayPct >= 100 ? "text-green-600" : todayPct >= 50 ? "text-blue-600" : todayPct === 0 ? "text-slate-500" : "text-amber-600"}`}>
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
            <p className="text-xs text-slate-500">
              {todayDone >= todayTotal
                ? "Semua sesi selesai! 🎉"
                : todayDone === 0
                  ? "Belum ada sesi selesai — mulai catat sesi pertama."
                  : `${todayScheduled} sesi tersisa`}
            </p>
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-3 text-center">
            <p className="text-xs text-slate-500">Belum ada sesi hari ini.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Tambahkan jadwal di bagian "Hari Ini" di bawah.</p>
          </div>
        )}
      </div>
    </section>
  );
}
