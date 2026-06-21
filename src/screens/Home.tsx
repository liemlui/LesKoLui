import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  listStudents, listAllSessionsForMonth, listAllSessionsForWeek,
  cancelSeriesSessions, scheduleBatch, scheduleSession,
  findConflicts, updateSeriesSessions,
  listAllPendingHomework, listPendingFollowUps,
  markHomeworkDone, markHomeworkNotDone, completeFollowUp,
  listPastScheduledSessions, cancelSession,
} from "../db/repos";
import type { CancelMode, EditMode } from "../db/repos";
import type { Homework } from "../db/types";
import { dayLabel, monthLabel, todayWIB, monthOf } from "../lib/format";
import { MIN_DURATION } from "../db/types";
import type { Session } from "../db/types";
import PaginationControls from "../components/PaginationControls";
import { clampPage, paginateItems } from "../lib/pagination";
import ClockTimePicker from "../components/ClockTimePicker";
import Toggle from "../components/Toggle";

// ── Constants ────────────────────────────────────────────────────────────────
const STUDENT_COLORS = [
  "#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981",
  "#EF4444", "#14B8A6", "#F97316", "#6366F1", "#84CC16",
];
const DURATIONS  = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6];
const DOW_LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

// ── Pure helpers ──────────────────────────────────────────────────────────────
function prevMonth(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, "0")}`;
}
function nextMonth(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, "0")}`;
}
function calendarCells(month: string): (string | null)[] {
  const [y, m] = month.split("-").map(Number);
  const firstDow = new Date(y, m - 1, 1).getDay();
  const daysInMonth = new Date(y, m, 0).getDate();
  const cells: (string | null)[] = Array(firstDow).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(`${month}-${String(d).padStart(2, "0")}`);
  return cells;
}
function weekDates(anchor: string): string[] {
  const [y, m, d] = anchor.split("-").map(Number);
  const base = new Date(y, m - 1, d);
  const sun = new Date(base); sun.setDate(base.getDate() - base.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(sun); day.setDate(sun.getDate() + i);
    return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
  });
}
function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}
function getDatesForWeekdays(startDate: string, weekdays: number[], weeksAhead = 53): string[] {
  const [sy, sm, sd] = startDate.split("-").map(Number);
  const start = new Date(sy, sm - 1, sd);
  const weekSun = new Date(start); weekSun.setDate(start.getDate() - start.getDay());
  const results: string[] = [];
  for (let w = 0; w < weeksAhead; w++) {
    for (const dow of weekdays) {
      const target = new Date(weekSun);
      target.setDate(weekSun.getDate() + w * 7 + dow);
      const str = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(target.getDate()).padStart(2, "0")}`;
      if (str >= startDate) results.push(str);
    }
  }
  return [...new Set(results)].sort();
}
function byDay(sessions: Session[] | undefined): Map<string, Session[]> {
  const map = new Map<string, Session[]>();
  (sessions ?? []).forEach((s) => {
    const arr = map.get(s.date) ?? [];
    arr.push(s);
    map.set(s.date, arr);
  });
  return map;
}

type CalView = "month" | "week" | "day";

// ── Component ────────────────────────────────────────────────────────────────
export default function Home() {
  const today = todayWIB();
  const navigate = useNavigate();

  const [view,        setView]        = useState<CalView>("month");
  const [calMonth,    setCalMonth]    = useState(() => monthOf(today));
  const [anchor,      setAnchor]      = useState(today);
  const [selectedDay, setSelectedDay] = useState<string | null>(today);

  // Add-schedule modal
  const [showAdd,       setShowAdd]       = useState(false);
  const [addStudentId,  setAddStudentId]  = useState("");
  const [addTime,       setAddTime]       = useState("08:00");
  const [addDuration,   setAddDuration]   = useState(MIN_DURATION);
  const [addRepeat,     setAddRepeat]     = useState(false);
  const [addWeekdays,   setAddWeekdays]   = useState<number[]>([]);
  const [conflicts,     setConflicts]     = useState<{ date: string; studentName: string; time: string }[]>([]);
  const [saving,        setSaving]        = useState(false);

  // Edit-session modal (replaces separate cancel + reassign modals)
  const [editTarget,       setEditTarget]       = useState<Session | null>(null);
  const [editStudentId,    setEditStudentId]     = useState("");
  const [editDate,         setEditDate]          = useState("");
  const [editTime,         setEditTime]          = useState("");
  const [editDuration,     setEditDuration]      = useState(MIN_DURATION);
  const [editMode,         setEditMode]          = useState<EditMode>("this");
  const [editSaving,       setEditSaving]        = useState(false);
  const [showCancelInEdit, setShowCancelInEdit]  = useState(false);

  const [flash, setFlash] = useState("");
  const [undoHwId, setUndoHwId] = useState<string | null>(null);
  const [undoTimer, setUndoTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [overduePage, setOverduePage] = useState(1);
  const [upcomingHwPage, setUpcomingHwPage] = useState(1);
  const [followUpPage, setFollowUpPage] = useState(1);

  // ── Data ──────────────────────────────────────────────────────────────────
  const students = useLiveQuery(() => listStudents(true), []);
  const week = useMemo(() => weekDates(anchor), [anchor]);

  const monthSessions = useLiveQuery(() => listAllSessionsForMonth(calMonth), [calMonth]);
  const weekSessions  = useLiveQuery(() => listAllSessionsForWeek(week[0], week[6]), [week[0], week[6]]);
  const daySessions   = useLiveQuery(() => listAllSessionsForWeek(anchor, anchor), [anchor]);

  // Today Workspace data
  const overdueHW       = useLiveQuery(() => listAllPendingHomework(), []);
  const allFollowUps    = useLiveQuery(() => listPendingFollowUps(), []);
  const missedSchedules = useLiveQuery(() => listPastScheduledSessions(today), [today]);

  const studentMap = useMemo(
    () => new Map((students ?? []).map((s, idx) => [s.id, { name: s.name, color: STUDENT_COLORS[idx % STUDENT_COLORS.length] }])),
    [students]
  );

  const monthByDay = useMemo(() => byDay(monthSessions), [monthSessions]);
  const weekByDay  = useMemo(() => byDay(weekSessions),  [weekSessions]);
  const cells      = useMemo(() => calendarCells(calMonth), [calMonth]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function msg(t: string) { setFlash(t); setTimeout(() => setFlash(""), 3000); }

  const handleMarkDone = async (id: string) => {
    await markHomeworkDone(id);
    setUndoHwId(id);
    if (undoTimer) clearTimeout(undoTimer);
    const t = setTimeout(() => { setUndoHwId(null); setUndoTimer(null); }, 3000);
    setUndoTimer(t);
  };

  const openAdd = (date: string) => {
    const dow = new Date(date + "T00:00:00").getDay();
    setSelectedDay(date); setAddWeekdays([dow]); setConflicts([]); setShowAdd(true);
  };

  const openEdit = (s: Session) => {
    setEditTarget(s);
    setEditStudentId(s.studentId);
    setEditDate(s.date);
    setEditTime(s.time ?? "08:00");
    setEditDuration(s.durationHours);
    setEditMode("this");
    setShowCancelInEdit(false);
  };

  const checkConflictsAsync = async (weekdays: number[], time: string, duration: number) => {
    if (!addRepeat || !time || weekdays.length === 0) { setConflicts([]); return; }
    const dates = getDatesForWeekdays(selectedDay ?? today, weekdays).slice(0, 52);
    setConflicts(await findConflicts(dates, time, duration));
  };

  const handleSaveSchedule = async () => {
    if (!selectedDay || !addStudentId) { msg("Pilih murid dulu."); return; }
    setSaving(true);
    try {
      if (addRepeat && addWeekdays.length > 0) {
        const dates = getDatesForWeekdays(selectedDay, addWeekdays);
        const n = await scheduleBatch(
          dates.map((d) => ({ studentId: addStudentId, date: d, time: addTime, durationHours: addDuration }))
        );
        msg(`${n} jadwal dibuat ✓`);
      } else {
        await scheduleSession({ studentId: addStudentId, date: selectedDay, time: addTime, durationHours: addDuration });
        msg("Jadwal ditambahkan ✓");
      }
      setShowAdd(false); setAddStudentId(""); setAddTime("08:00"); setAddDuration(MIN_DURATION);
      setAddRepeat(false); setAddWeekdays([]); setConflicts([]);
    } catch (e) { msg("Gagal: " + (e as Error).message); }
    finally { setSaving(false); }
  };

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    setEditSaving(true);
    try {
      const patch: Parameters<typeof updateSeriesSessions>[1] = {
        studentId: editStudentId || editTarget.studentId,
        time: editTime,
        durationHours: editDuration,
      };
      // Date change only applies to "this" mode
      if (editMode === "this" && editDate !== editTarget.date) {
        (patch as Record<string, unknown>).date = editDate;
      }
      await updateSeriesSessions(
        { id: editTarget.id, seriesId: editTarget.seriesId, date: editTarget.date },
        patch, editMode
      );
      msg("Jadwal diperbarui ✓");
      setEditTarget(null);
    } catch (e) { msg("Gagal: " + (e as Error).message); }
    finally { setEditSaving(false); }
  };

  const handleCancelSession = async (mode: CancelMode) => {
    if (!editTarget) return;
    await cancelSeriesSessions({ id: editTarget.id, seriesId: editTarget.seriesId, date: editTarget.date }, mode);
    setEditTarget(null);
    msg("Jadwal dibatalkan.");
  };

  // ── Session pill (JSX factory — not a component) ──────────────────────────
  const renderSessionPill = (s: Session, dateCtx?: string) => {
    const info      = studentMap.get(s.studentId);
    const color     = info?.color ?? "#9CA3AF";
    const isDone      = s.status === "DONE";
    const sessionDate = dateCtx ?? s.date;
    const isMissed    = s.status === "SCHEDULED" && sessionDate < today;
    const isToday     = sessionDate === today;
    const isFuture    = s.status === "SCHEDULED" && sessionDate > today;
    const isScheduled = s.status === "SCHEDULED";

    return (
      <div key={s.id} className="flex items-start gap-2 mb-2">
        <div className="w-1 self-stretch rounded-full flex-shrink-0 mt-1" style={{ background: color, minHeight: 28 }} />
        <div className={`flex-1 bg-white rounded-xl px-3 py-2 shadow-sm border transition-colors ${isMissed ? "border-orange-200 bg-orange-50" : "border-gray-100 hover:border-blue-200"}`}>
          <div className="flex items-start justify-between gap-2">
            <button className="min-w-0 text-left flex-1" onClick={() => isScheduled && openEdit(s)}>
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
                <button onClick={() => navigate(`/capture?scheduleId=${s.id}`)}
                  className="text-xs bg-blue-600 text-white px-2 py-1 rounded-lg font-semibold">Catat</button>
                <button onClick={async () => { await cancelSession(s.id); msg("Dibatalkan."); }}
                  className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-lg">Batal</button>
              </div>
            ) : isFuture ? (
              <span className="text-xs text-gray-300 flex-shrink-0 pt-0.5">Menunggu</span>
            ) : (isToday || isScheduled) ? (
              <button onClick={() => navigate(`/capture?scheduleId=${s.id}`)}
                className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-semibold flex-shrink-0 hover:bg-blue-700 transition-colors">
                ✏️ Catat
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  const renderDayDetail = (date: string, sessionsForDay: Session[]) => (
    <div className="border-t border-gray-100 p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-gray-700">{dayLabel(date)}</p>
        <button onClick={() => openAdd(date)}
          className="flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors">
          + Jadwal
        </button>
      </div>
      {sessionsForDay.length === 0
        ? <p className="text-xs text-gray-400 py-2 text-center">Belum ada sesi. Tap "+ Jadwal" untuk tambah.</p>
        : sessionsForDay.sort((a, b) => (a.time ?? "").localeCompare(b.time ?? "")).map((s) => renderSessionPill(s, date))
      }
    </div>
  );

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

      {/* ── SESI TERLEWAT ── */}
      {(missedSchedules ?? []).length > 0 && (
        <div className="mx-4 mb-2 bg-orange-50 border border-orange-200 rounded-xl p-3">
          <p className="text-xs font-bold text-orange-700 mb-2 uppercase tracking-wide">
            ⚠️ Sesi Belum Dicatat ({missedSchedules!.length})
          </p>
          <div className="space-y-2">
            {missedSchedules!.slice(0, 5).map((s) => {
              const name = studentMap.get(s.studentId)?.name ?? "—";
              return (
                <div key={s.id} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{name}</p>
                    <p className="text-xs text-orange-600">{dayLabel(s.date)} · {s.durationHours}j{s.time ? ` · ${s.time}` : ""}</p>
                  </div>
                  <button
                    onClick={() => navigate(`/capture?scheduleId=${s.id}`)}
                    className="flex-shrink-0 text-xs bg-blue-600 text-white px-2.5 py-1.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                    Catat
                  </button>
                  <button
                    onClick={async () => { await cancelSession(s.id); msg("Dibatalkan."); }}
                    className="flex-shrink-0 text-xs bg-gray-100 text-gray-600 px-2 py-1.5 rounded-lg hover:bg-gray-200 transition-colors">
                    Batal
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TODAY WORKSPACE ── */}
      {(() => {
        const overdue  = (overdueHW ?? []).filter((h) => h.status === "overdue");
        const upcoming = (overdueHW ?? []).filter((h) => h.status === "assigned");
        const upcomingSoon = upcoming.filter((h) => h.dueAt && h.dueAt <= addDays(today, 3));
        const follows  = allFollowUps ?? [];
        const safeOverduePage = clampPage(overduePage, overdue.length);
        const safeUpcomingHwPage = clampPage(upcomingHwPage, upcomingSoon.length);
        const safeFollowUpPage = clampPage(followUpPage, follows.length);
        const paginatedOverdue = paginateItems(overdue, safeOverduePage);
        const paginatedUpcomingSoon = paginateItems(upcomingSoon, safeUpcomingHwPage);
        const paginatedFollowUps = paginateItems(follows, safeFollowUpPage);
        if (overdue.length === 0 && upcomingSoon.length === 0 && follows.length === 0) return null;
        return (
          <div className="mx-4 mb-2 space-y-2">
            {/* Overdue homework */}
            {overdue.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-xs font-bold text-red-600 mb-2 uppercase tracking-wide">
                  🚨 PR Terlambat ({overdue.length})
                </p>
                <div className="space-y-1.5">
                  {paginatedOverdue.map((h) => (
                    <div key={h.id} className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{h.title}</p>
                        <p className="text-xs text-red-500">{(h as Homework & {studentName?:string}).studentName} · {h.subject} · due {h.dueAt?.slice(5)}</p>
                      </div>
                      <button
                        onClick={() => handleMarkDone(h.id)}
                        className="flex-shrink-0 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg font-semibold hover:bg-green-200 transition-colors">
                        Selesai
                      </button>
                    </div>
                  ))}
                </div>
                <PaginationControls
                  page={safeOverduePage}
                  total={overdue.length}
                  onPageChange={setOverduePage}
                  label="PR"
                />
              </div>
            )}

            {/* Upcoming homework (due within 3 days) */}
            {upcomingSoon.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs font-bold text-amber-700 mb-2 uppercase tracking-wide">
                  📋 PR Segera Jatuh Tempo
                </p>
                <div className="space-y-1.5">
                  {paginatedUpcomingSoon.map((h) => (
                      <div key={h.id} className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate">{h.title}</p>
                          <p className="text-xs text-amber-600">{(h as Homework & {studentName?:string}).studentName} · {h.subject} · due {h.dueAt?.slice(5)}</p>
                        </div>
                        <button
                          onClick={() => handleMarkDone(h.id)}
                          className="flex-shrink-0 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg font-semibold hover:bg-green-200">
                          Selesai
                        </button>
                      </div>
                  ))}
                </div>
                <PaginationControls
                  page={safeUpcomingHwPage}
                  total={upcomingSoon.length}
                  onPageChange={setUpcomingHwPage}
                  label="PR"
                />
              </div>
            )}

            {/* Pending follow-ups */}
            {follows.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-xs font-bold text-blue-700 mb-2 uppercase tracking-wide">
                  🔁 Perlu Dilanjutkan ({follows.length})
                </p>
                <div className="space-y-1.5">
                  {paginatedFollowUps.map((f) => {
                    const sName = studentMap.get(f.studentId)?.name ?? "—";
                    return (
                      <div key={f.id} className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-700 truncate">{f.text}</p>
                          <p className="text-xs text-blue-500">{sName}</p>
                        </div>
                        <button
                          onClick={async () => { await completeFollowUp(f.id); msg("Tandai selesai ✓"); }}
                          className="flex-shrink-0 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-lg font-semibold hover:bg-blue-200">
                          ✓
                        </button>
                      </div>
                    );
                  })}
                </div>
                <PaginationControls
                  page={safeFollowUpPage}
                  total={follows.length}
                  onPageChange={setFollowUpPage}
                  label="follow-up"
                />
              </div>
            )}
          </div>
        );
      })()}

      {/* View toggle */}
      <div className="mx-4 mb-3 bg-gray-100 rounded-xl p-1 grid grid-cols-3">
        {(["month", "week", "day"] as CalView[]).map((v) => (
          <button key={v} onClick={() => setView(v)}
            className={`py-1.5 rounded-lg text-sm font-medium transition-colors ${view === v ? "bg-white shadow text-blue-700" : "text-gray-500"}`}>
            {v === "month" ? "Bulan" : v === "week" ? "Minggu" : "Hari"}
          </button>
        ))}
      </div>

      {/* ── MONTH VIEW ── */}
      {view === "month" && (
        <div className="mx-4 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
            <button onClick={() => setCalMonth(prevMonth(calMonth))} className="text-gray-400 text-xl w-8 text-center">‹</button>
            <span className="font-semibold text-gray-800">{monthLabel(calMonth)}</span>
            <button onClick={() => setCalMonth(nextMonth(calMonth))} className="text-gray-400 text-xl w-8 text-center">›</button>
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
              return (
                <button key={date}
                  onClick={() => setSelectedDay(isSelected ? null : date)}
                  className={`min-h-[64px] flex flex-col items-start p-1 border-b border-r border-gray-100 last:border-r-0 transition-colors ${
                    isSelected ? "bg-blue-50" : isPast ? "bg-gray-50 hover:bg-gray-100" : "hover:bg-gray-50"
                  }`}>
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
          {selectedDay && renderDayDetail(selectedDay, monthByDay.get(selectedDay) ?? [])}
        </div>
      )}

      {/* ── WEEK VIEW ── */}
      {view === "week" && (
        <div className="mx-4 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
            <button onClick={() => setAnchor(addDays(anchor, -7))} className="text-gray-400 text-xl w-8 text-center">‹</button>
            <span className="font-semibold text-gray-700 text-sm">
              {new Date(week[1] + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
              {" – "}
              {new Date(week[6] + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
            </span>
            <button onClick={() => setAnchor(addDays(anchor, 7))} className="text-gray-400 text-xl w-8 text-center">›</button>
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
                    {daySess.sort((a, b) => (a.time ?? "").localeCompare(b.time ?? "")).map((s) => {
                      const info   = studentMap.get(s.studentId);
                      const color  = info?.color ?? "#9CA3AF";
                      const isDone = s.status === "DONE";
                      return (
                        <div key={s.id}
                          className={`rounded mb-0.5 px-1 py-0.5 ${!isDone ? "cursor-pointer" : ""}`}
                          style={{ background: color + (isDone ? "20" : "35"), fontSize: 9 }}
                          onClick={() => !isDone && openEdit(s)}>
                          <p className="font-bold truncate" style={{ color }}>{info?.name?.split(" ")[0] ?? "—"}</p>
                          {s.time && <p className="opacity-60" style={{ fontSize: 8 }}>{s.time}</p>}
                        </div>
                      );
                    })}
                    <button onClick={() => openAdd(date)} className="w-full text-center text-gray-300 hover:text-blue-500 text-sm leading-none mt-0.5 py-0.5 rounded hover:bg-blue-50 transition-colors">+</button>
                  </div>
                </div>
              );
            })}
          </div>
          {selectedDay && renderDayDetail(selectedDay, weekByDay.get(selectedDay) ?? [])}
        </div>
      )}

      {/* ── DAY VIEW — Google Calendar–style time grid ── */}
      {view === "day" && (() => {
        const DAY_START = 7;
        const DAY_END   = 22;
        const PX_PER_HR = 64;
        const LABEL_W   = 44;
        const gridHours = Array.from({ length: DAY_END - DAY_START + 1 }, (_, i) => DAY_START + i);
        const totalH    = (DAY_END - DAY_START) * PX_PER_HR;
        const timed     = (daySessions ?? []).filter((s) => s.time);
        const untimed   = (daySessions ?? []).filter((s) => !s.time);

        return (
          <div className="mx-4 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
              <button onClick={() => setAnchor(addDays(anchor, -1))} className="text-gray-400 text-xl w-8 text-center">‹</button>
              <span className="font-semibold text-gray-700 text-sm">{dayLabel(anchor)}</span>
              <button onClick={() => setAnchor(addDays(anchor, 1))} className="text-gray-400 text-xl w-8 text-center">›</button>
            </div>
            <div className="px-4 py-2 flex items-center justify-between border-b border-gray-50">
              <p className="text-xs text-gray-400">{(daySessions ?? []).length} sesi</p>
              <button onClick={() => openAdd(anchor)} className="flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors">+ Jadwal</button>
            </div>
            {untimed.length > 0 && (
              <div className="px-3 pt-2 pb-1 border-b border-gray-100 space-y-1">
                <p className="text-xs text-gray-400 font-medium">Tanpa waktu</p>
                {untimed.map((s) => renderSessionPill(s, anchor))}
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
                    <div key={s.id}
                      className={`absolute rounded-lg overflow-hidden shadow-sm transition-all ${!isDone ? "cursor-pointer hover:brightness-95" : ""}`}
                      style={{ top: topPx + 1, left: LABEL_W + 4, right: 6, height: heightPx,
                        background: color + (isDone ? "22" : "3A"), borderLeft: `3px solid ${color}` }}
                      onClick={() => !isDone && openEdit(s)}>
                      <div className="px-2 py-1">
                        <p className="font-bold text-xs leading-tight truncate" style={{ color }}>
                          {info?.name ?? "—"}{isDone ? " ✓" : ""}{s.seriesId ? " 🔁" : ""}
                        </p>
                        <p className="opacity-70 truncate" style={{ color, fontSize: 10 }}>
                          {s.time} – {endLabel} · {s.durationHours}j
                        </p>
                      </div>
                      {!isDone && <span className="absolute top-1 right-1 text-xs opacity-50">✏️</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── ADD SCHEDULE MODAL ── */}
      {showAdd && selectedDay && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-end justify-center" onClick={() => setShowAdd(false)}>
          <div className="bg-white w-full max-w-md rounded-t-2xl p-5 pb-8 space-y-4 max-h-[90vh] overflow-y-auto overflow-x-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Jadwalkan Sesi</h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 text-xl leading-none">✕</button>
            </div>
            <p className="text-sm text-gray-500 -mt-2">{dayLabel(selectedDay)}</p>

            <div>
              <label className="label">Murid</label>
              <select className="input" value={addStudentId} onChange={(e) => setAddStudentId(e.target.value)}>
                <option value="">Pilih murid...</option>
                {(students ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Jam Mulai</label>
              <ClockTimePicker value={addTime}
                onChange={(v) => { setAddTime(v); checkConflictsAsync(addWeekdays, v, addDuration); }} />
            </div>
            <div>
              <label className="label">Durasi</label>
              <div className="flex flex-wrap gap-2">
                {DURATIONS.map((d) => (
                  <button key={d} type="button"
                    onClick={() => { setAddDuration(d); checkConflictsAsync(addWeekdays, addTime, d); }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${addDuration === d ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300"}`}>
                    {d}j
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Toggle checked={addRepeat} onChange={(v) => { setAddRepeat(v); if (!v) setConflicts([]); }} />
              <span className="text-sm font-medium text-gray-700">Ulangi setiap minggu (selamanya)</span>
            </div>
            {addRepeat && (
              <div>
                <label className="label">Hari yang diulang</label>
                <div className="flex gap-2 flex-wrap">
                  {DOW_LABELS.map((label, dow) => (
                    <button key={dow} type="button"
                      onClick={() => {
                        const next = addWeekdays.includes(dow) ? addWeekdays.filter((x) => x !== dow) : [...addWeekdays, dow];
                        setAddWeekdays(next); checkConflictsAsync(next, addTime, addDuration);
                      }}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${addWeekdays.includes(dow) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300"}`}>
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1.5">Jadwal otomatis dibuat ~1 tahun ke depan</p>
              </div>
            )}
            {conflicts.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                <p className="text-sm font-semibold text-orange-700 mb-1">⚠️ Berpotensi tabrakan</p>
                {conflicts.slice(0, 4).map((c, i) => (
                  <p key={i} className="text-xs text-orange-600">{c.date} {c.time} — {c.studentName}</p>
                ))}
                {conflicts.length > 4 && <p className="text-xs text-orange-400">+{conflicts.length - 4} lainnya</p>}
              </div>
            )}
            <button onClick={handleSaveSchedule} disabled={saving} className="btn-primary w-full py-3 font-semibold">
              {saving ? "Menyimpan..." : addRepeat ? "Buat Jadwal Berulang" : "Simpan Jadwal"}
            </button>
          </div>
        </div>
      )}

      {/* ── EDIT SESSION MODAL ── */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-end justify-center" onClick={() => setEditTarget(null)}>
          <div className="bg-white w-full max-w-md rounded-t-2xl pb-8 max-h-[92vh] overflow-y-auto overflow-x-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-lg">Edit Jadwal</h3>
                <p className="text-xs text-gray-400">{dayLabel(editTarget.date)}{editTarget.seriesId ? " · Sesi berulang 🔁" : ""}</p>
              </div>
              <button onClick={() => setEditTarget(null)} className="text-gray-400 text-xl leading-none">✕</button>
            </div>

            <div className="p-5 space-y-4">
              {/* Murid */}
              <div>
                <label className="label">Murid</label>
                <select className="input" value={editStudentId} onChange={(e) => setEditStudentId(e.target.value)}>
                  {(students ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              {/* Tanggal — hanya bisa edit untuk mode "this" */}
              <div>
                <label className="label">
                  Tanggal
                  {editTarget.seriesId && editMode !== "this" && (
                    <span className="ml-2 text-xs text-gray-400 font-normal">(tanggal hanya bisa diubah untuk sesi ini saja)</span>
                  )}
                </label>
                <input className="input" type="date" value={editDate}
                  disabled={!!editTarget.seriesId && editMode !== "this"}
                  onChange={(e) => setEditDate(e.target.value)} />
              </div>

              {/* Jam */}
              <div>
                <label className="label">Jam Mulai</label>
                <ClockTimePicker value={editTime} onChange={setEditTime} />
              </div>

              {/* Durasi */}
              <div>
                <label className="label">Durasi</label>
                <div className="flex flex-wrap gap-2">
                  {DURATIONS.map((d) => (
                    <button key={d} type="button"
                      onClick={() => setEditDuration(d)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${editDuration === d ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300"}`}>
                      {d}j
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode (hanya jika ada seri) */}
              {editTarget.seriesId && (
                <div>
                  <label className="label">Ubah untuk</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["this", "future", "all"] as EditMode[]).map((m) => (
                      <button key={m} onClick={() => { setEditMode(m); if (m !== "this") setEditDate(editTarget.date); }}
                        className={`py-2 rounded-xl text-xs font-semibold border transition-colors ${editMode === m ? "bg-blue-600 text-white border-blue-600" : "bg-gray-50 text-gray-600 border-gray-200"}`}>
                        {m === "this" ? "Sesi ini" : m === "future" ? "Ini & berikutnya" : "Semua seri"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Save */}
              <button onClick={handleSaveEdit} disabled={editSaving}
                className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {editSaving ? "Menyimpan..." : "Simpan Perubahan"}
              </button>

              {/* Cancel section */}
              <div className="border-t border-gray-100 pt-3">
                {!showCancelInEdit ? (
                  <button onClick={() => setShowCancelInEdit(true)}
                    className="w-full py-2.5 rounded-xl text-sm font-medium text-red-500 bg-red-50 hover:bg-red-100 transition-colors">
                    Batalkan Jadwal Ini
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-red-600 mb-2">Batalkan jadwal — pilih scope:</p>
                    {editTarget.seriesId ? (
                      <>
                        <button onClick={() => handleCancelSession("this")}
                          className="w-full text-left px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-sm font-medium border border-gray-200">
                          Sesi ini saja ({dayLabel(editTarget.date).split(",")[1]?.trim()})
                        </button>
                        <button onClick={() => handleCancelSession("future")}
                          className="w-full text-left px-4 py-3 rounded-xl bg-orange-50 text-sm font-medium text-orange-700 border border-orange-200 hover:bg-orange-100">
                          Hari ini dan semua sesi berikutnya
                        </button>
                        <button onClick={() => handleCancelSession("all")}
                          className="w-full text-left px-4 py-3 rounded-xl bg-red-50 text-sm font-medium text-red-600 border border-red-200 hover:bg-red-100">
                          Semua sesi dalam seri ini
                        </button>
                      </>
                    ) : (
                      <button onClick={() => handleCancelSession("this")}
                        className="w-full px-4 py-3 rounded-xl bg-red-50 text-red-600 font-medium text-sm border border-red-200">
                        Ya, batalkan sesi ini
                      </button>
                    )}
                    <button onClick={() => setShowCancelInEdit(false)} className="w-full text-center text-gray-400 text-sm py-1">
                      Jangan batalkan
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

