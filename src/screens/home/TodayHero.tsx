import type { Session } from "../../db/types";
import type { ReactNode } from "react";
import type { StudentMap } from "../../lib/studentColor";
import Badge from "../../components/Badge";
import EmptyState from "../../components/EmptyState";
import ProgressBar from "../../components/charts/ProgressBar";
import Skeleton from "../../components/Skeleton";
import SessionPill, { type SessionActions } from "./SessionPill";

interface Props extends SessionActions {
  today: string;
  sessions: Session[];
  studentMap: StudentMap;
  onAdd: (date: string) => void;
  /**
   * Data hari ini BELUM selesai dimuat (audit B-01).
   *
   * Tanpa ini, `sessions` kosong karena masih memuat tidak bisa dibedakan dari
   * "memang tidak ada sesi", sehingga Beranda sempat berkata "Tidak ada sesi hari
   * ini" padahal datanya belum datang. `useLiveQuery` mengembalikan `undefined`
   * selama query pertama berjalan — itulah yang diteruskan ke sini.
   */
  loading?: boolean;
  /**
   * Ringkasan minggu (B-05/Q6 = A) — disuntikkan sebagai ANAK dari blok yang sama
   * supaya Beranda punya satu blok utama "Hari Ini", bukan dua blok bersaing.
   */
  snapshot?: ReactNode;
}

/** Agenda-first hero v2: progress bar, visual separators between time blocks, badge summaries. */
export default function TodayHero({ today, sessions, studentMap, onAdd, loading = false, snapshot, ...actions }: Props) {
  const ordered = [...sessions].sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
  const done    = sessions.filter((s) => s.status === "DONE").length;
  const waiting = sessions.filter((s) => s.status === "SCHEDULED").length;
  const missed  = sessions.filter((s) => s.status === "NO_SHOW").length;

  return (
    <div className="mx-4 mb-2 bg-[var(--surface-strong)] rounded-2xl shadow-sm border border-[var(--border)] p-3">
      {/* Header with progress bar */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1 min-w-0">
          {/* Audit L-07: judul blok utama Beranda harus heading sungguhan, bukan
              <p> — kalau tidak, navigasi heading pembaca layar nyaris kosong.
              Kelasnya tidak berubah, jadi tampilannya tetap sama (preflight
              Tailwind menyetel ulang ukuran/berat huruf heading). */}
          <h2 className="text-sm font-bold text-[var(--ink-strong)]">Hari Ini</h2>
          {sessions.length > 0 && (
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-[var(--ink-muted)]">
                {sessions.length} sesi
              </p>
              <div className="flex items-center gap-1">
                <Badge tone="green" size="sm">{done} selesai</Badge>
                {waiting > 0 && <Badge tone="blue" size="sm">{waiting} menunggu</Badge>}
                {missed > 0 && <Badge tone="red" size="sm">{missed} batal</Badge>}
              </div>
            </div>
          )}
        </div>
        <button onClick={() => onAdd(today)}
          className="flex min-h-[44px] items-center gap-1 px-3 text-xs font-semibold text-[var(--on-strong)] bg-[var(--brand-solid)] hover:bg-[var(--brand-solid)] rounded-lg transition-colors">
          + Jadwal
        </button>
      </div>

      {/* Progress bar for today */}
      {sessions.length > 0 && (
        <div className="mb-3">
          <ProgressBar
            value={done} max={sessions.length}
            tone="blue"
            thresholds={[
              { pct: 100, tone: "green" },
              { pct: 50, tone: "blue" },
              { pct: 0, tone: "amber" },
            ]}
            size="sm"
          />
        </div>
      )}

      {/* Session pills with visual separation between time blocks */}
      {loading ? (
        // Audit B-01: data belum siap → SKELETON, bukan empty state "tidak ada sesi".
        <div data-loading="true" aria-busy="true" aria-label="Memuat jadwal hari ini">
          <Skeleton variant="text" lines={3} height={16} />
        </div>
      ) : ordered.length === 0 ? (
        <EmptyState icon="🎉" message="Tidak ada sesi hari ini" />
      ) : (
        <div className="space-y-0.5">
          {ordered.map((s, i) => {
            // Show time separator when hour changes
            const prevTime = i > 0 ? ordered[i - 1].time?.slice(0, 2) : null;
            const thisTime = s.time?.slice(0, 2) ?? null;
            const showSep = i > 0 && prevTime !== thisTime && thisTime != null;

            return (
              <div key={s.id}>
                {showSep && (
                  <div className="flex items-center gap-2 my-2">
                    <div className="flex-1 border-t border-[var(--border)]" />
                    <span className="text-[12px] font-semibold text-[var(--ink-muted)] uppercase tracking-wider">
                      {thisTime}:00
                    </span>
                    <div className="flex-1 border-t border-[var(--border)]" />
                  </div>
                )}
                <SessionPill session={s} dateCtx={today} studentMap={studentMap} today={today} {...actions} />
              </div>
            );
          })}
        </div>
      )}

      {/* Satu blok "Hari Ini": agenda + ringkasan minggu. Selalu terlihat. */}
      {snapshot}
    </div>
  );
}
