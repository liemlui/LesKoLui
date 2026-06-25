import { useEffect, useState } from "react";
import type { Session } from "../../db/types";
import type { StudentMap } from "../../lib/studentColor";
import { dayLabel } from "../../lib/format";
import { addDays } from "../../lib/calendar";
import SessionPill, { type SessionActions } from "./SessionPill";

interface Props extends SessionActions {
  anchor: string;
  setAnchor: (d: string) => void;
  today: string;
  sessions: Session[];   // this day's sessions, already student-filtered
  studentMap: StudentMap;
  onJumpToday: () => void;
  onAdd: (date: string) => void;
}

const PX_PER_HR = 64;
const LABEL_W   = 44;

export default function DayView({
  anchor, setAnchor, today, sessions, studentMap, onJumpToday, onAdd, ...actions
}: Props) {
  const timed   = sessions.filter((s) => s.time);
  const untimed = sessions.filter((s) => !s.time);

  // Dynamic grid range: default 07:00–22:00, expand to fit out-of-range sessions.
  let minH = 7, maxH = 22;
  for (const s of timed) {
    const [sh, sm] = (s.time ?? "07:00").split(":").map(Number);
    minH = Math.min(minH, sh);
    const endMin = sh * 60 + sm + Math.round(s.durationHours * 60);
    maxH = Math.max(maxH, Math.ceil(endMin / 60));
  }
  const DAY_START = Math.max(0, Math.min(7, minH));
  const DAY_END   = Math.min(24, Math.max(22, maxH));
  const gridHours = Array.from({ length: DAY_END - DAY_START + 1 }, (_, i) => DAY_START + i);
  const totalH    = (DAY_END - DAY_START) * PX_PER_HR;

  // "Now" line — only on today's column, within the visible range.
  // Snapshot at mount, refresh each minute (kept out of render to stay pure).
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const nowWib = new Date(nowMs + 7 * 60 * 60 * 1000);
  const nowH   = nowWib.getUTCHours() + nowWib.getUTCMinutes() / 60;
  const showNow = anchor === today && nowH >= DAY_START && nowH <= DAY_END;
  const nowTop  = (nowH - DAY_START) * PX_PER_HR;

  return (
    <div className="mx-4 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
        <button aria-label="Hari sebelumnya" onClick={() => setAnchor(addDays(anchor, -1))} className="text-gray-400 text-xl w-8 text-center">‹</button>
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-gray-700 text-sm truncate">{dayLabel(anchor)}</span>
          {anchor !== today && (
            <button onClick={onJumpToday} className="flex-shrink-0 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-lg transition-colors">Hari Ini</button>
          )}
        </div>
        <button aria-label="Hari berikutnya" onClick={() => setAnchor(addDays(anchor, 1))} className="text-gray-400 text-xl w-8 text-center">›</button>
      </div>
      <div className="px-4 py-2 flex items-center justify-between border-b border-gray-50">
        <p className="text-xs text-gray-400">{sessions.length} sesi</p>
        <button onClick={() => onAdd(anchor)} className="flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors">+ Jadwal</button>
      </div>
      {untimed.length > 0 && (
        <div className="px-3 pt-2 pb-1 border-b border-gray-100 space-y-1">
          <p className="text-xs text-gray-400 font-medium">Tanpa waktu</p>
          {untimed.map((s) => (
            <SessionPill key={s.id} session={s} dateCtx={anchor} studentMap={studentMap} today={today} {...actions} />
          ))}
        </div>
      )}
      <div className="overflow-y-auto" style={{ maxHeight: "62vh" }}>
        <div className="relative select-none" style={{ height: totalH }}>
          {gridHours.map((h) => (
            <div key={h} className="absolute left-0 right-0 pointer-events-none" style={{ top: (h - DAY_START) * PX_PER_HR }}>
              <div className="flex">
                <span className="flex-shrink-0 text-right pr-2 text-gray-300"
                  style={{ width: LABEL_W, fontSize: 10, lineHeight: 1, marginTop: -6 }}>
                  {`${String(h).padStart(2, "0")}:00`}
                </span>
                <div className="flex-1 border-t border-gray-200" />
              </div>
            </div>
          ))}
          {gridHours.slice(0, -1).map((h) => (
            <div key={`h30-${h}`} className="absolute right-0 border-t border-dashed border-gray-100 pointer-events-none"
              style={{ top: (h - DAY_START) * PX_PER_HR + PX_PER_HR / 2, left: LABEL_W }} />
          ))}
          {showNow && (
            <div className="absolute right-0 pointer-events-none z-10" style={{ top: nowTop, left: LABEL_W }}>
              <div className="relative border-t-2 border-red-500">
                <span className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-red-500" />
              </div>
            </div>
          )}
          {timed.map((s) => {
            const info   = studentMap.get(s.studentId);
            const color  = info?.color ?? "#9CA3AF";
            const [sh, sm] = (s.time ?? "07:00").split(":").map(Number);
            const topPx    = (sh - DAY_START) * PX_PER_HR + (sm / 60) * PX_PER_HR;
            const heightPx = Math.max(s.durationHours * PX_PER_HR - 2, 28);
            const isDone   = s.status === "DONE";
            const endH     = new Date(0, 0, 0, sh, sm + Math.round(s.durationHours * 60));
            const endLabel = `${String(endH.getHours()).padStart(2, "0")}:${String(endH.getMinutes()).padStart(2, "0")}`;
            return (
              <button key={s.id} type="button"
                className={`absolute rounded-lg overflow-hidden shadow-sm text-left transition-all ${!isDone ? "cursor-pointer hover:brightness-95" : "cursor-default"}`}
                style={{ top: topPx + 1, left: LABEL_W + 4, right: 6, height: heightPx,
                  background: color + (isDone ? "22" : "3A"), borderLeft: `3px solid ${color}` }}
                onClick={() => !isDone && actions.onEdit(s)}>
                <div className="px-2 py-1">
                  <p className="font-bold text-xs leading-tight truncate" style={{ color }}>
                    {info?.name ?? "—"}{isDone ? " ✓" : ""}{s.seriesId ? " 🔁" : ""}
                  </p>
                  <p className="opacity-70 truncate" style={{ color, fontSize: 10 }}>
                    {s.time} – {endLabel} · {s.durationHours}j
                  </p>
                </div>
                {!isDone && <span className="absolute top-1 right-1 text-xs opacity-50">✏️</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
