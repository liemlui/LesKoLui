import type { Session } from "../../db/types";
import type { StudentMap } from "../../lib/studentColor";
import { monthLabel, monthOf } from "../../lib/format";
import { prevMonth, nextMonth, calendarCells, DOW_LABELS } from "../../lib/calendar";
import DayDetail from "./DayDetail";
import type { SessionActions } from "./SessionPill";

interface Props extends SessionActions {
  calMonth: string;
  setCalMonth: (m: string) => void;
  today: string;
  selectedDay: string | null;
  setSelectedDay: (d: string | null) => void;
  monthByDay: Map<string, Session[]>;   // already student-filtered
  studentMap: StudentMap;
  onJumpToday: () => void;
  onAdd: (date: string) => void;
}

export default function MonthView({
  calMonth, setCalMonth, today, selectedDay, setSelectedDay,
  monthByDay, studentMap, onJumpToday, onAdd, ...actions
}: Props) {
  const cells = calendarCells(calMonth);

  return (
    <div className="mx-4 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
        <button aria-label="Bulan sebelumnya" onClick={() => setCalMonth(prevMonth(calMonth))} className="text-gray-400 text-xl w-8 text-center">‹</button>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-800">{monthLabel(calMonth)}</span>
          {calMonth !== monthOf(today) && (
            <button onClick={onJumpToday} className="text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-lg transition-colors">Hari Ini</button>
          )}
        </div>
        <button aria-label="Bulan berikutnya" onClick={() => setCalMonth(nextMonth(calMonth))} className="text-gray-400 text-xl w-8 text-center">›</button>
      </div>
      <div className="grid grid-cols-7 text-center border-b border-gray-100">
        {DOW_LABELS.map((d, i) => <div key={d} className={`py-1.5 text-xs font-medium ${i === 0 ? "text-red-400" : "text-gray-400"}`}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((date, i) => {
          if (!date) return <div key={`e-${i}`} className="min-h-[64px] border-b border-r border-gray-50 last:border-r-0" />;
          const daySess    = monthByDay.get(date) ?? [];
          const isToday    = date === today;
          const isSelected = date === selectedDay;
          const isPast     = date < today;
          const isSunday   = new Date(date + "T00:00:00").getDay() === 0;
          const dayNum     = parseInt(date.slice(8), 10);
          // Heatmap: avg engagement score of DONE sessions
          const doneSess   = daySess.filter(s => s.status === "DONE" && s.engagement?.score != null);
          const avgScore   = doneSess.length > 0 ? doneSess.reduce((sum, s) => sum + (s.engagement?.score ?? 0), 0) / doneSess.length : null;
          const heatBg     = avgScore === null ? "" : avgScore >= 7 ? "rgba(34,197,94,0.08)" : avgScore >= 4 ? "rgba(234,179,8,0.10)" : "rgba(239,68,68,0.08)";
          return (
            <button key={date}
              onClick={() => setSelectedDay(isSelected ? null : date)}
              className={`min-h-[64px] flex flex-col items-start p-1 border-b border-r border-gray-100 last:border-r-0 transition-colors ${
                isSelected ? "bg-blue-50" : isPast ? "bg-gray-50 hover:bg-gray-100" : "hover:bg-gray-50"
              }`}
              style={heatBg && !isSelected ? { background: heatBg } : undefined}>
              <span className={`text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full mb-0.5 self-center ${
                isToday ? "bg-blue-600 text-white"
                : isPast ? "text-gray-300"
                : isSunday ? "text-red-500"
                : "text-gray-600"
              }`}>
                {dayNum}
              </span>
              <div className="w-full space-y-0.5">
                {daySess.slice(0, 3).map((s) => {
                  const info  = studentMap.get(s.studentId);
                  const color = info?.color ?? "#9CA3AF";
                  return (
                    <div key={s.id} className="w-full truncate rounded px-1 py-0.5 flex items-center gap-0.5"
                      style={{ background: color + (s.status === "DONE" ? "18" : "30"), color, fontSize: 10, fontWeight: 700, lineHeight: 1.3 }}>
                      {s.status === "DONE" && <span style={{ fontSize: 8 }}>✓</span>}
                      <span className="truncate">{info?.name?.split(" ")[0] ?? "—"}</span>
                    </div>
                  );
                })}
                {daySess.length > 3 && (
                  <div className="text-center text-gray-300 font-medium" style={{ fontSize: 9 }}>+{daySess.length - 3}</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
      {selectedDay && (
        <DayDetail date={selectedDay} sessions={monthByDay.get(selectedDay) ?? []}
          studentMap={studentMap} today={today} onAdd={onAdd} {...actions} />
      )}
    </div>
  );
}
