import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  listStudents, listAllSessionsForMonth, listAllSessionsForWeek,
  listAllPendingHomework, listPendingFollowUps,
  markHomeworkDone, markHomeworkNotDone, completeFollowUp,
  listPastScheduledSessions, cancelSession,
} from "../../db/repos";
import type { Session } from "../../db/types";
import { dayLabel, todayWIB, monthOf } from "../../lib/format";
import { weekDates, byDay, addDays, type CalView } from "../../lib/calendar";
import { colorForStudent, type StudentMap } from "../../lib/studentColor";
import TodayHero from "./TodayHero";
import AttentionInbox from "./AttentionInbox";
import MonthView from "./MonthView";
import WeekView from "./WeekView";
import DayView from "./DayView";
import AddScheduleModal from "./AddScheduleModal";
import EditSessionModal from "./EditSessionModal";
import type { SessionActions } from "./SessionPill";

export default function Home() {
  const today = todayWIB();
  const navigate = useNavigate();

  const [view,        setView]        = useState<CalView>("month");
  const [calMonth,    setCalMonth]    = useState(() => monthOf(today));
  const [anchor,      setAnchor]      = useState(today);
  const [selectedDay, setSelectedDay] = useState<string | null>(today);

  const [addDate,    setAddDate]    = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<Session | null>(null);
  const [filterStudentId, setFilterStudentId] = useState<string>("");

  const [flash, setFlash] = useState("");
  const [undoHwId, setUndoHwId] = useState<string | null>(null);
  const [undoTimer, setUndoTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // ── Data ──────────────────────────────────────────────────────────────────
  const students = useLiveQuery(() => listStudents(true), []);
  const week = useMemo(() => weekDates(anchor), [anchor]);

  const monthSessions = useLiveQuery(() => listAllSessionsForMonth(calMonth), [calMonth]);
  const weekSessions  = useLiveQuery(() => listAllSessionsForWeek(week[0], week[6]), [week[0], week[6]]);
  const daySessions   = useLiveQuery(() => listAllSessionsForWeek(anchor, anchor), [anchor]);
  const todaySessions = useLiveQuery(() => listAllSessionsForWeek(today, today), [today]);

  const overdueHW       = useLiveQuery(() => listAllPendingHomework(), []);
  const allFollowUps    = useLiveQuery(() => listPendingFollowUps(), []);
  const missedSchedules = useLiveQuery(() => listPastScheduledSessions(today), [today]);

  const studentMap: StudentMap = useMemo(
    () => new Map((students ?? []).map((s) => [s.id, { name: s.name, color: colorForStudent(s.id) }])),
    [students]
  );

  // ── Student filter (applied consistently everywhere) ────────────────────────
  const inFilter = (studentId: string) => !filterStudentId || studentId === filterStudentId;

  const monthByDay = useMemo(() => byDay((monthSessions ?? []).filter((s) => !filterStudentId || s.studentId === filterStudentId)), [monthSessions, filterStudentId]);
  const weekByDay  = useMemo(() => byDay((weekSessions ?? []).filter((s) => !filterStudentId || s.studentId === filterStudentId)),  [weekSessions, filterStudentId]);
  const dayList    = useMemo(() => (daySessions ?? []).filter((s) => !filterStudentId || s.studentId === filterStudentId), [daySessions, filterStudentId]);
  const todayList  = useMemo(() => (todaySessions ?? []).filter((s) => !filterStudentId || s.studentId === filterStudentId), [todaySessions, filterStudentId]);

  // ── Attention inbox data (filtered) ─────────────────────────────────────────
  const overdue      = (overdueHW ?? []).filter((h) => h.status === "overdue" && inFilter(h.studentId));
  const upcoming     = (overdueHW ?? []).filter((h) => h.status === "assigned" && inFilter(h.studentId));
  const upcomingSoon = upcoming.filter((h) => h.dueAt && h.dueAt <= addDays(today, 3));
  const follows      = (allFollowUps ?? []).filter((f) => inFilter(f.studentId));
  const missed       = (missedSchedules ?? []).filter((s) => inFilter(s.studentId));

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const msg = (t: string) => { setFlash(t); setTimeout(() => setFlash(""), 3000); };

  const handleMarkDone = async (id: string) => {
    await markHomeworkDone(id);
    setUndoHwId(id);
    if (undoTimer) clearTimeout(undoTimer);
    const t = setTimeout(() => { setUndoHwId(null); setUndoTimer(null); }, 3000);
    setUndoTimer(t);
  };

  const openAdd = (date: string) => { setSelectedDay(date); setAddDate(date); };
  const jumpToday = () => { setCalMonth(monthOf(today)); setAnchor(today); setSelectedDay(today); };

  const actions: SessionActions = {
    onEdit:    (s) => setEditTarget(s),
    onCapture: (id) => navigate(`/capture?scheduleId=${id}`),
    onCancel:  async (id) => { await cancelSession(id); msg("Dibatalkan."); },
  };

  // ── Empty state / onboarding ────────────────────────────────────────────────
  if (students && students.length === 0) {
    return (
      <div className="pb-20">
        <div className="px-4 pt-5 pb-3">
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Fredoka', sans-serif" }}>Les Ko Lui</h1>
          <p className="text-gray-400 text-xs">{dayLabel(today)}</p>
        </div>
        <div className="mx-4 mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
          <p className="text-4xl mb-3">👋</p>
          <h2 className="text-lg font-bold text-gray-800 mb-1">Selamat datang!</h2>
          <p className="text-sm text-gray-500 mb-5">Mulai dengan menambahkan murid pertamamu, lalu jadwalkan sesi les.</p>
          <button onClick={() => navigate("/students")}
            className="btn-primary w-full py-3 font-semibold">
            + Tambah murid pertama
          </button>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="pb-20">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Fredoka', sans-serif" }}>Les Ko Lui</h1>
          <p className="text-gray-400 text-xs">{dayLabel(today)}</p>
        </div>
        <button onClick={() => openAdd(today)}
          className="bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-semibold shadow flex items-center gap-1.5">
          <span>📅</span> + Jadwal
        </button>
      </div>

      {flash && (
        <div className={`mx-4 mb-2 p-2 rounded-lg text-sm text-center font-medium ${flash.includes("✓") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
          {flash}
        </div>
      )}

      {undoHwId && (
        <div className="mx-4 mb-2 p-2 rounded-lg text-sm flex items-center justify-between bg-green-50 border border-green-200">
          <span className="text-green-700 font-medium">PR ditandai selesai ✓</span>
          <button
            onClick={async () => {
              if (undoTimer) clearTimeout(undoTimer);
              await markHomeworkNotDone(undoHwId);
              setUndoHwId(null); setUndoTimer(null);
            }}
            className="text-xs font-bold text-green-600 underline ml-2">
            Undo
          </button>
        </div>
      )}

      {/* Agenda "Hari Ini" */}
      <TodayHero today={today} sessions={todayList} studentMap={studentMap} onAdd={openAdd} {...actions} />

      {/* Perlu Perhatian */}
      <AttentionInbox
        missed={missed} overdue={overdue} upcomingSoon={upcomingSoon} follows={follows}
        studentMap={studentMap}
        onCapture={actions.onCapture}
        onCancelSession={actions.onCancel}
        onMarkDone={handleMarkDone}
        onCompleteFollowUp={async (id) => { await completeFollowUp(id); msg("Tandai selesai ✓"); }}
      />

      {/* View toggle + filter murid */}
      <div className="mx-4 mb-3 mt-2 space-y-2">
        <div className="bg-gray-100 rounded-xl p-1 grid grid-cols-3">
          {(["month", "week", "day"] as CalView[]).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`py-1.5 rounded-lg text-sm font-medium transition-colors ${view === v ? "bg-white shadow text-blue-700" : "text-gray-500"}`}>
              {v === "month" ? "Bulan" : v === "week" ? "Minggu" : "Hari"}
            </button>
          ))}
        </div>
        {(students ?? []).length > 1 && (
          <div className="flex items-center gap-2">
            <select
              value={filterStudentId}
              onChange={(e) => setFilterStudentId(e.target.value)}
              aria-label="Filter murid"
              className="input py-1.5 text-sm flex-1">
              <option value="">Semua murid</option>
              {(students ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {filterStudentId && (
              <button aria-label="Hapus filter" onClick={() => setFilterStudentId("")}
                className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5 bg-gray-100 rounded-lg">✕</button>
            )}
          </div>
        )}
      </div>

      {view === "month" && (
        <MonthView
          calMonth={calMonth} setCalMonth={setCalMonth} today={today}
          selectedDay={selectedDay} setSelectedDay={setSelectedDay}
          monthByDay={monthByDay} studentMap={studentMap}
          onJumpToday={jumpToday} onAdd={openAdd} {...actions} />
      )}
      {view === "week" && (
        <WeekView
          week={week} anchor={anchor} setAnchor={setAnchor} today={today}
          selectedDay={selectedDay} setSelectedDay={setSelectedDay}
          weekByDay={weekByDay} studentMap={studentMap}
          onJumpToday={jumpToday} onAdd={openAdd} {...actions} />
      )}
      {view === "day" && (
        <DayView
          anchor={anchor} setAnchor={setAnchor} today={today}
          sessions={dayList} studentMap={studentMap}
          onJumpToday={jumpToday} onAdd={openAdd} {...actions} />
      )}

      {addDate && (
        <AddScheduleModal date={addDate} students={students ?? []}
          onClose={() => setAddDate(null)} onResult={msg} />
      )}
      {editTarget && (
        <EditSessionModal target={editTarget} students={students ?? []}
          onClose={() => setEditTarget(null)} onResult={msg} />
      )}
    </div>
  );
}
