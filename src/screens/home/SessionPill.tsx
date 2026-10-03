import type { Session } from "../../db/types";
import type { StudentMap } from "../../lib/studentColor";

export interface SessionActions {
  onEdit: (s: Session) => void;
  onCapture: (sessionId: string) => void;
  onResolveMissed: (session: Session) => void;
}

interface Props extends SessionActions {
  session: Session;
  studentMap: StudentMap;
  today: string;
  /** Date the pill is rendered under (defaults to the session's own date). */
  dateCtx?: string;
}

import { memo } from "react";

function SessionPill({ session: s, studentMap, today, dateCtx, onEdit, onCapture, onResolveMissed }: Props) {
  const info        = studentMap.get(s.studentId);
  const color       = info?.color ?? "#9CA3AF";
  const isDone      = s.status === "DONE";
  const isNoShow    = s.status === "NO_SHOW";
  const sessionDate = dateCtx ?? s.date;
  const isMissed    = s.status === "SCHEDULED" && sessionDate < today;
  const isToday     = sessionDate === today;
  const isFuture    = s.status === "SCHEDULED" && sessionDate > today;
  const isScheduled = s.status === "SCHEDULED";

  return (
    <div className="flex items-start gap-2 mb-2">
      <div className="w-1 self-stretch rounded-full flex-shrink-0 mt-1" style={{ background: color, minHeight: 28 }} />
      <div className={`flex-1 bg-[var(--surface-strong)] rounded-xl px-3 py-2 shadow-sm border transition-colors ${isMissed ? "border-[var(--border-attention)] bg-[var(--bg-attention)]" : "border-[var(--border)] hover:border-[var(--brand-tint-strong)]"}`}>
        <div className="flex items-start justify-between gap-2">
          <button className="min-w-0 text-left flex-1" onClick={() => isMissed ? onResolveMissed(s) : isScheduled && onEdit(s)}>
            <p className="text-sm font-semibold truncate" style={{ color }}>{info?.name ?? "—"}</p>
            <p className="text-xs text-[var(--ink-muted)]">
              {s.time ? `${s.time} · ` : ""}{s.durationHours}j
              {isDone ? " ✓" : ""}{s.seriesId ? " 🔁" : ""}
              {isMissed ? " ⚠️ Terlewat" : ""}
            </p>
          </button>
          {isDone ? (
            <span className="text-[var(--ink-success)] text-xs flex-shrink-0 pt-0.5 font-bold">✓ Selesai</span>
          ) : isNoShow ? (
            <span className={`text-xs flex-shrink-0 pt-0.5 font-bold ${s.noShowBillable ? "text-[var(--ink-attention)]" : "text-[var(--ink-muted)]"}`}>
              {s.noShowBillable ? "Tidak hadir · Tagih" : "Tidak hadir"}
            </span>
          ) : isMissed ? (
            <div className="flex gap-1.5 flex-shrink-0">
              <button onClick={() => onCapture(s.id)} aria-label={`Catat sesi ${info?.name ?? "murid"}`}
                className="text-xs bg-[var(--brand-solid)] text-[var(--on-strong)] px-2 py-1 rounded-lg font-semibold">Catat</button>
              <button onClick={() => onResolveMissed(s)} aria-label={`Kelola sesi terlewat ${info?.name ?? "murid"}`}
                className="text-xs bg-[var(--bg-attention)] text-[var(--ink-attention)] px-2 py-1 rounded-lg font-semibold">Atur</button>
            </div>
          ) : isFuture ? (
            <span className="text-xs text-[var(--ink-muted)] flex-shrink-0 pt-0.5">Menunggu</span>
          ) : (isToday || isScheduled) ? (
            <button onClick={() => onCapture(s.id)} aria-label={`Catat sesi ${info?.name ?? "murid"}`}
              className="text-xs bg-[var(--brand-solid)] text-[var(--on-strong)] px-3 py-1.5 rounded-lg font-semibold flex-shrink-0 hover:bg-[var(--brand-solid)] transition-colors">
              ✏️ Catat
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default memo(SessionPill);
