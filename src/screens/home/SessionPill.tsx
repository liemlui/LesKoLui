import type { Session } from "../../db/types";
import type { StudentMap } from "../../lib/studentColor";

export interface SessionActions {
  onEdit: (s: Session) => void;
  onCapture: (sessionId: string) => void;
  onCancel: (sessionId: string) => void;
}

interface Props extends SessionActions {
  session: Session;
  studentMap: StudentMap;
  today: string;
  /** Date the pill is rendered under (defaults to the session's own date). */
  dateCtx?: string;
}

import { memo } from "react";

function SessionPill({ session: s, studentMap, today, dateCtx, onEdit, onCapture, onCancel }: Props) {
  const info        = studentMap.get(s.studentId);
  const color       = info?.color ?? "#9CA3AF";
  const isDone      = s.status === "DONE";
  const sessionDate = dateCtx ?? s.date;
  const isMissed    = s.status === "SCHEDULED" && sessionDate < today;
  const isToday     = sessionDate === today;
  const isFuture    = s.status === "SCHEDULED" && sessionDate > today;
  const isScheduled = s.status === "SCHEDULED";

  return (
    <div className="flex items-start gap-2 mb-2">
      <div className="w-1 self-stretch rounded-full flex-shrink-0 mt-1" style={{ background: color, minHeight: 28 }} />
      <div className={`flex-1 bg-white rounded-xl px-3 py-2 shadow-sm border transition-colors ${isMissed ? "border-orange-200 bg-orange-50" : "border-gray-100 hover:border-blue-200"}`}>
        <div className="flex items-start justify-between gap-2">
          <button className="min-w-0 text-left flex-1" onClick={() => isScheduled && onEdit(s)}>
            <p className="text-sm font-semibold truncate" style={{ color }}>{info?.name ?? "—"}</p>
            <p className="text-xs text-gray-400">
              {s.time ? `${s.time} · ` : ""}{s.durationHours}j
              {isDone ? " ✓" : ""}{s.seriesId ? " 🔁" : ""}
              {isMissed ? " ⚠️ Terlewat" : ""}
            </p>
          </button>
          {isDone ? (
            <span className="text-green-500 text-xs flex-shrink-0 pt-0.5 font-bold">✓ Selesai</span>
          ) : isMissed ? (
            <div className="flex gap-1.5 flex-shrink-0">
              <button onClick={() => onCapture(s.id)}
                className="text-xs bg-blue-600 text-white px-2 py-1 rounded-lg font-semibold">Catat</button>
              <button onClick={() => onCancel(s.id)}
                className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-lg">Batal</button>
            </div>
          ) : isFuture ? (
            <span className="text-xs text-gray-300 flex-shrink-0 pt-0.5">Menunggu</span>
          ) : (isToday || isScheduled) ? (
            <button onClick={() => onCapture(s.id)}
              className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-semibold flex-shrink-0 hover:bg-blue-700 transition-colors">
              ✏️ Catat
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default memo(SessionPill);
