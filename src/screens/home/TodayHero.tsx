import type { Session } from "../../db/types";
import type { StudentMap } from "../../lib/studentColor";
import Badge from "../../components/Badge";
import ProgressBar from "../../components/charts/ProgressBar";
import SessionPill, { type SessionActions } from "./SessionPill";

interface Props extends SessionActions {
  today: string;
  sessions: Session[];
  studentMap: StudentMap;
  onAdd: (date: string) => void;
}

/** Agenda-first hero v2: progress bar, visual separators between time blocks, badge summaries. */
export default function TodayHero({ today, sessions, studentMap, onAdd, ...actions }: Props) {
  const ordered = [...sessions].sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
  const done    = sessions.filter((s) => s.status === "DONE").length;
  const waiting = sessions.filter((s) => s.status === "SCHEDULED").length;
  const missed  = sessions.filter((s) => s.status === "NO_SHOW").length;

  return (
    <div className="mx-4 mb-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-3">
      {/* Header with progress bar */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-800">Hari Ini</p>
          {sessions.length > 0 && (
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-gray-400">
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
          className="flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors">
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
      {ordered.length === 0 ? (
        <p className="text-xs text-gray-400 py-3 text-center">Tidak ada sesi hari ini 🎉</p>
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
                    <div className="flex-1 border-t border-slate-100" />
                    <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">
                      {thisTime}:00
                    </span>
                    <div className="flex-1 border-t border-slate-100" />
                  </div>
                )}
                <SessionPill session={s} dateCtx={today} studentMap={studentMap} today={today} {...actions} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
