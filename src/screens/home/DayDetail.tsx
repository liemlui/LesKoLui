import type { Session } from "../../db/types";
import type { StudentMap } from "../../lib/studentColor";
import { dayLabel } from "../../lib/format";
import SessionPill, { type SessionActions } from "./SessionPill";

interface Props extends SessionActions {
  date: string;
  sessions: Session[];
  studentMap: StudentMap;
  today: string;
  onAdd: (date: string) => void;
}

export default function DayDetail({ date, sessions, studentMap, today, onAdd, ...actions }: Props) {
  return (
    <div className="border-t border-gray-100 p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-gray-700">{dayLabel(date)}</p>
        <button onClick={() => onAdd(date)}
          className="flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors">
          + Jadwal
        </button>
      </div>
      {sessions.length === 0
        ? <p className="text-xs text-gray-400 py-2 text-center">Belum ada sesi. Tap "+ Jadwal" untuk tambah.</p>
        : [...sessions]
            .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""))
            .map((s) => (
              <SessionPill key={s.id} session={s} dateCtx={date} studentMap={studentMap} today={today} {...actions} />
            ))
      }
    </div>
  );
}
