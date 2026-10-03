import type { Session } from "../../db/types";
import type { StudentMap } from "../../lib/studentColor";
import { dayLabel } from "../../lib/format";
import EmptyState from "../../components/EmptyState";
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
    <div className="border-t border-[var(--border)] p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-[var(--ink-strong)]">{dayLabel(date)}</p>
        <button onClick={() => onAdd(date)}
          className="flex items-center gap-1 text-xs font-semibold text-[var(--ink-brand)] bg-[var(--brand-tint)] hover:bg-[var(--brand-tint-strong)] px-2.5 py-1.5 rounded-lg transition-colors">
          + Jadwal
        </button>
      </div>
      {sessions.length === 0
        ? <EmptyState message="Belum ada sesi" description='Tap "+ Jadwal" untuk menambahkan.' />
        : [...sessions]
            .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""))
            .map((s) => (
              <SessionPill key={s.id} session={s} dateCtx={date} studentMap={studentMap} today={today} {...actions} />
            ))
      }
    </div>
  );
}
