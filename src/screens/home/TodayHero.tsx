import type { Session } from "../../db/types";
import type { StudentMap } from "../../lib/studentColor";
import SessionPill, { type SessionActions } from "./SessionPill";

interface Props extends SessionActions {
  today: string;
  sessions: Session[];     // today's sessions, already student-filtered
  studentMap: StudentMap;
  onAdd: (date: string) => void;
}

/** Agenda-first hero: what the tutor needs the moment they open the app. */
export default function TodayHero({ today, sessions, studentMap, onAdd, ...actions }: Props) {
  const ordered = [...sessions].sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
  const done    = sessions.filter((s) => s.status === "DONE").length;
  const waiting = sessions.filter((s) => s.status === "SCHEDULED").length;

  return (
    <div className="mx-4 mb-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm font-bold text-gray-800">Hari Ini</p>
          {sessions.length > 0 && (
            <p className="text-xs text-gray-400">
              {sessions.length} sesi · {done} selesai · {waiting} menunggu
            </p>
          )}
        </div>
        <button onClick={() => onAdd(today)}
          className="flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors">
          + Jadwal
        </button>
      </div>
      {ordered.length === 0 ? (
        <p className="text-xs text-gray-400 py-3 text-center">Tidak ada sesi hari ini 🎉</p>
      ) : (
        ordered.map((s) => (
          <SessionPill key={s.id} session={s} dateCtx={today} studentMap={studentMap} today={today} {...actions} />
        ))
      )}
    </div>
  );
}
