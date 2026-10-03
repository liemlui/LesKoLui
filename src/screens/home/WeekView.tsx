import type { Session } from "../../db/types";
import type { StudentMap } from "../../lib/studentColor";
import { addDays, DOW_LABELS } from "../../lib/calendar";
import { dayLabel } from "../../lib/format";
import DayDetail from "./DayDetail";
import type { SessionActions } from "./SessionPill";

interface Props extends SessionActions {
  week: string[];
  anchor: string;
  setAnchor: (d: string) => void;
  today: string;
  selectedDay: string | null;
  setSelectedDay: (d: string | null) => void;
  weekByDay: Map<string, Session[]>;   // already student-filtered
  studentMap: StudentMap;
  onJumpToday: () => void;
  onAdd: (date: string) => void;
}

export default function WeekView({
  week, anchor, setAnchor, today, selectedDay, setSelectedDay,
  weekByDay, studentMap, onJumpToday, onAdd, ...actions
}: Props) {
  return (
    <div className="mx-4 bg-[var(--surface-strong)] rounded-2xl shadow-sm border border-[var(--border)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)]">
        <button aria-label="Minggu sebelumnya" onClick={() => setAnchor(addDays(anchor, -7))} className="text-[var(--ink-muted)] hover:text-[var(--ink-strong)] text-xl w-10 h-10 flex items-center justify-center">‹</button>
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-[var(--ink-strong)] text-sm truncate">
            {new Date(week[1] + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
            {" – "}
            {new Date(week[6] + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
          </span>
          {!week.includes(today) && (
            <button onClick={onJumpToday} className="flex-shrink-0 text-xs font-semibold text-[var(--ink-brand)] bg-[var(--brand-tint)] hover:bg-[var(--brand-tint-strong)] px-2 py-0.5 rounded-lg transition-colors">Hari Ini</button>
          )}
        </div>
        <button aria-label="Minggu berikutnya" onClick={() => setAnchor(addDays(anchor, 7))} className="text-[var(--ink-muted)] hover:text-[var(--ink-strong)] text-xl w-10 h-10 flex items-center justify-center">›</button>
      </div>
      <div className="grid grid-cols-7 border-b border-[var(--border)]">
        {week.map((date) => {
          const isToday    = date === today;
          const isSelected = date === selectedDay;
          const isPast     = date < today;
          const isSunday   = new Date(date + "T00:00:00").getDay() === 0;
          const d          = parseInt(date.slice(8), 10);
          const label      = DOW_LABELS[new Date(date + "T00:00:00").getDay()];
          const daySess    = weekByDay.get(date) ?? [];
          const colBg      = isSelected ? "bg-[var(--accent-tint)]" : isToday ? "bg-[var(--brand-tint)]" : isPast ? "bg-[var(--surface)]" : "";
          // Penanda hari terpilih (temuan B-06). Spec menulis `ring-indigo-400`,
          // tetapi kelas palet langsung dilarang kontrak K4.1 → dipakai token
          // `--border-brand` (nilai warna yang sama).
          const colRing    = isSelected ? " ring-2 ring-inset ring-[var(--border-brand)]" : "";
          return (
            <div key={date} className={`border-r border-[var(--border)] last:border-r-0 ${colBg}${colRing}`}>
              <button className="w-full text-center py-1.5" onClick={() => setSelectedDay(isSelected ? null : date)}>
                <p className={`text-xs ${isSunday ? "text-[var(--ink-danger)]" : "text-[var(--ink-muted)]"}`}>{label}</p>
                <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mx-auto ${
                  isToday ? "bg-[var(--brand-solid)] text-[var(--on-strong)]" : isPast ? "text-[var(--ink-muted)]" : isSunday ? "text-[var(--ink-danger)]" : "text-[var(--ink-strong)]"
                }`}>{d}</span>
              </button>
              <div className="px-0.5 pb-1 min-h-[56px]">
                {[...daySess].sort((a, b) => (a.time ?? "").localeCompare(b.time ?? "")).map((s) => {
                  const info   = studentMap.get(s.studentId);
                  const color  = info?.color ?? "#9CA3AF";
                  const isDone = s.status === "DONE";
                  const isEditable = s.status === "SCHEDULED";
                  return (
                    <button key={s.id} type="button"
                      className={`block w-full text-left rounded mb-0.5 px-1 py-0.5 ${isEditable ? "cursor-pointer" : "cursor-default"}`}
                      style={{ background: color + (isDone ? "20" : "35"), fontSize: 10 }}
                      onClick={() => isEditable && (s.date < today ? actions.onResolveMissed(s) : actions.onEdit(s))}>
                      <p className="font-bold truncate" style={{ color }}>{info?.name?.split(" ")[0] ?? "—"}</p>
                      {s.time && <p className="opacity-60" style={{ fontSize: 10 }}>{s.status === "NO_SHOW" ? "🚫 Tidak hadir" : s.time}</p>}
                    </button>
                  );
                })}
                <button aria-label={`Tambah jadwal ${dayLabel(date)}`} title={`Tambah jadwal ${dayLabel(date)}`}
                  onClick={() => onAdd(date)}
                  className="w-full min-h-[36px] text-center text-[var(--ink-muted)] hover:text-[var(--ink-brand)] text-sm leading-none mt-0.5 rounded hover:bg-[var(--brand-tint)] transition-colors">+</button>
              </div>
            </div>
          );
        })}
      </div>
      {selectedDay && (
        <DayDetail date={selectedDay} sessions={weekByDay.get(selectedDay) ?? []}
          studentMap={studentMap} today={today} onAdd={onAdd} {...actions} />
      )}
    </div>
  );
}
