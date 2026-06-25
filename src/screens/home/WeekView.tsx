import type { Session } from "../../db/types";
import type { StudentMap } from "../../lib/studentColor";
import { addDays, DOW_LABELS } from "../../lib/calendar";
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
    <div className="mx-4 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
        <button aria-label="Minggu sebelumnya" onClick={() => setAnchor(addDays(anchor, -7))} className="text-gray-400 text-xl w-8 text-center">‹</button>
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-gray-700 text-sm truncate">
            {new Date(week[1] + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
            {" – "}
            {new Date(week[6] + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
          </span>
          {!week.includes(today) && (
            <button onClick={onJumpToday} className="flex-shrink-0 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-lg transition-colors">Hari Ini</button>
          )}
        </div>
        <button aria-label="Minggu berikutnya" onClick={() => setAnchor(addDays(anchor, 7))} className="text-gray-400 text-xl w-8 text-center">›</button>
      </div>
      <div className="grid grid-cols-7 border-b border-gray-100">
        {week.map((date) => {
          const isToday    = date === today;
          const isSelected = date === selectedDay;
          const isPast     = date < today;
          const isSunday   = new Date(date + "T00:00:00").getDay() === 0;
          const d          = parseInt(date.slice(8), 10);
          const label      = DOW_LABELS[new Date(date + "T00:00:00").getDay()];
          const daySess    = weekByDay.get(date) ?? [];
          const colBg      = isSelected ? "bg-indigo-50" : isToday ? "bg-blue-50" : isPast ? "bg-gray-50" : "";
          return (
            <div key={date} className={`border-r border-gray-50 last:border-r-0 ${colBg}`}>
              <button className="w-full text-center py-1.5" onClick={() => setSelectedDay(isSelected ? null : date)}>
                <p className={`text-xs ${isSunday ? "text-red-400" : "text-gray-400"}`}>{label}</p>
                <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mx-auto ${
                  isToday ? "bg-blue-600 text-white" : isPast ? "text-gray-300" : isSunday ? "text-red-500" : "text-gray-700"
                }`}>{d}</span>
              </button>
              <div className="px-0.5 pb-1 min-h-[56px]">
                {[...daySess].sort((a, b) => (a.time ?? "").localeCompare(b.time ?? "")).map((s) => {
                  const info   = studentMap.get(s.studentId);
                  const color  = info?.color ?? "#9CA3AF";
                  const isDone = s.status === "DONE";
                  return (
                    <button key={s.id} type="button"
                      className={`block w-full text-left rounded mb-0.5 px-1 py-0.5 ${!isDone ? "cursor-pointer" : "cursor-default"}`}
                      style={{ background: color + (isDone ? "20" : "35"), fontSize: 9 }}
                      onClick={() => !isDone && actions.onEdit(s)}>
                      <p className="font-bold truncate" style={{ color }}>{info?.name?.split(" ")[0] ?? "—"}</p>
                      {s.time && <p className="opacity-60" style={{ fontSize: 8 }}>{s.time}</p>}
                    </button>
                  );
                })}
                <button aria-label={`Tambah jadwal ${date}`} onClick={() => onAdd(date)} className="w-full text-center text-gray-300 hover:text-blue-500 text-sm leading-none mt-0.5 py-0.5 rounded hover:bg-blue-50 transition-colors">+</button>
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
