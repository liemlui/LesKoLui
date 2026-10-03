import { LineChart } from "../../components/charts";
import MetricCard from "../../components/dashboard/MetricCard";
import { UsersIcon } from "../../components/icons";

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

  // B-05 (Q6 = A): blok ini TIDAK lagi berdiri sendiri dengan judulnya sendiri —
  // ia digabungkan ke blok "Hari Ini" (`TodayHero`) supaya Beranda punya satu blok
  // utama, bukan dua yang bersaing. Karena itu tidak ada `h2` di sini.
  return (
    <section
      className="mt-3 border-t border-[var(--border)] pt-3"
      aria-label="Ringkasan minggu ini"
    >
      {/* ── Weekly context and student shortcut ── */}
      <div className="space-y-3">
        {/* Secondary row: Minggu Ini + Murid Aktif */}
        <div className="grid grid-cols-2 gap-3">
          {/* Minggu Ini */}
          <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">Minggu ini</p>
            <p className="mt-1 text-[28px] font-bold leading-none text-[var(--ink-strong)]">
              {weekPlanned > 0 ? `${weekPct}%` : "—"}
            </p>
            <p className="mt-1 text-xs text-[var(--ink-muted)]">{weekLabel}</p>
            {weekPlanned > 0 && (
              <div className="mt-2">
                <div className="h-2.5 w-full rounded-full bg-[var(--bg-subtle)] overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ease-out ${
                      weekPct >= 100 ? "bg-[var(--bg-success-strong)]" : weekPct >= 50 ? "bg-[var(--brand-solid)]" : "bg-[var(--bg-warn-strong)]"
                    }`}
                    style={{ width: `${Math.max(weekPct, 3)}%`, minWidth: weekPct > 0 ? "8px" : 0 }}
                  />
                </div>
              </div>
            )}
            {/* Sparkline tren 4 minggu terakhir. Disembunyikan bila tidak ada satu
                pun sesi selesai — garis rata di dasar bukan informasi (B-05). */}
            {Array.isArray(weeklyTrend) && weeklyTrend.length >= 2 && weeklyTrend.some((v) => v > 0) && (
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
            icon={<UsersIcon size={14} />}
            tone="blue"
            action="Lihat murid"
            onClick={onActiveStudentsClick}
          />
        </div>
      </div>

    </section>
  );
}
