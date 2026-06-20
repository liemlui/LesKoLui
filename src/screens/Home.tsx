import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  listStudents, listAllSessionsForMonth, listAllSessionsForWeek,
  cancelSeriesSessions, scheduleBatch, scheduleSession, updateSession,
  findConflicts,
} from "../db/repos";
import type { CancelMode } from "../db/repos";
import { dayLabel, monthLabel, todayWIB, monthOf } from "../lib/format";
import { MIN_DURATION } from "../db/types";
import type { Session } from "../db/types";

// ── Constants ────────────────────────────────────────────────────────────────
const STUDENT_COLORS = [
  "#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981",
  "#EF4444", "#14B8A6", "#F97316", "#6366F1", "#84CC16",
];
const DURATIONS  = [1, 1.5, 2, 2.5, 3, 3.5, 4];
const DOW_LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

// ── Pure helpers (outside component — stable references) ─────────────────────
function studentColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return STUDENT_COLORS[Math.abs(h) % STUDENT_COLORS.length];
}

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

// Fixed: find all dates for given weekdays starting from startDate, for weeksAhead weeks
function getDatesForWeekdays(startDate: string, weekdays: number[], weeksAhead = 53): string[] {
  const [sy, sm, sd] = startDate.split("-").map(Number);
  const start = new Date(sy, sm - 1, sd);
  // Find the Sunday that starts the current week
  const weekSun = new Date(start);
  weekSun.setDate(start.getDate() - start.getDay());

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

  const [view,        setView]        = useState<CalView>("month");
  const [calMonth,    setCalMonth]    = useState(() => monthOf(today));
  const [anchor,      setAnchor]      = useState(today);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Add-schedule modal
  const [showAdd,       setShowAdd]       = useState(false);
  const [addStudentId,  setAddStudentId]  = useState("");
  const [addTime,       setAddTime]       = useState("08:00");
  const [addDuration,   setAddDuration]   = useState(MIN_DURATION);
  const [addRepeat,     setAddRepeat]     = useState(false);
  const [addWeekdays,   setAddWeekdays]   = useState<number[]>([]);
  const [conflicts,     setConflicts]     = useState<{ date: string; studentName: string; time: string }[]>([]);
  const [saving,        setSaving]        = useState(false);

  // Cancel modal
  const [cancelTarget, setCancelTarget] = useState<Session | null>(null);

  // Reassign modal
  const [reassignTarget,    setReassignTarget]    = useState<Session | null>(null);
  const [reassignStudentId, setReassignStudentId] = useState("");

  const [flash, setFlash] = useState("");

  // ── Data ──────────────────────────────────────────────────────────────────
  const students = useLiveQuery(() => listStudents(true), []);

  const week = useMemo(() => weekDates(anchor), [anchor]);

  const monthSessions = useLiveQuery(
    () => listAllSessionsForMonth(calMonth),
    [calMonth]
  );
  const weekSessions = useLiveQuery(
    () => listAllSessionsForWeek(week[0], week[6]),
    [week[0], week[6]]
  );
  const daySessions = useLiveQuery(
    () => listAllSessionsForWeek(anchor, anchor),
    [anchor]
  );

  const studentMap = useMemo(
    () => new Map((students ?? []).map((s) => [s.id, { name: s.name, color: studentColor(s.id) }])),
    [students]
  );

  const monthByDay = useMemo(() => byDay(monthSessions), [monthSessions]);
  const weekByDay  = useMemo(() => byDay(weekSessions),  [weekSessions]);
  const cells      = useMemo(() => calendarCells(calMonth), [calMonth]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function msg(t: string) { setFlash(t); setTimeout(() => setFlash(""), 3000); }

  const openAdd = (date: string) => {
    const dow = new Date(date + "T00:00:00").getDay();
    setSelectedDay(date);
    setAddWeekdays([dow]);
    setConflicts([]);
    setShowAdd(true);
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

  const handleCancel = async (mode: CancelMode) => {
    if (!cancelTarget) return;
    await cancelSeriesSessions({ id: cancelTarget.id, seriesId: cancelTarget.seriesId, date: cancelTarget.date }, mode);
    setCancelTarget(null);
    msg("Jadwal dibatalkan.");
  };

  const handleReassign = async () => {
    if (!reassignTarget || !reassignStudentId) return;
    await updateSession(reassignTarget.id, { studentId: reassignStudentId });
    setReassignTarget(null); setReassignStudentId("");
    msg("Murid diganti ✓");
  };

  // ── Session pill (reusable JSX factory — NOT a React component) ───────────
  const renderSessionPill = (s: Session) => {
    const info   = studentMap.get(s.studentId);
    const color  = info?.color ?? "#9CA3AF";
    const isDone = s.status === "DONE";
    return (
      <div key={s.id} className="flex items-start gap-2 mb-2">
        <div className="w-1 self-stretch rounded-full flex-shrink-0 mt-1" style={{ background: color, minHeight: 28 }} />
        <div className="flex-1 bg-white rounded-xl px-3 py-2 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between gap-1">
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color }}>{info?.name ?? "—"}</p>
              <p className="text-xs text-gray-400">
                {s.time ? `${s.time} · ` : ""}{s.durationHours}j{isDone ? " ✓" : ""}
                {s.seriesId ? " 🔁" : ""}
              </p>
            </div>
            {!isDone && (
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => { setReassignTarget(s); setReassignStudentId(s.studentId); }}
                  className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-600">Ganti</button>
                <button onClick={() => setCancelTarget(s)}
                  className="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-500">Batal</button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderDayDetail = (date: string, sessionsForDay: Session[]) => (
    <div className="border-t border-gray-100 p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-gray-700">{dayLabel(date)}</p>
        <button onClick={() => openAdd(date)} className="text-sm text-blue-600 font-semibold">+ Jadwal</button>
      </div>
      {sessionsForDay.length === 0
        ? <p className="text-xs text-gray-400 py-2 text-center">Belum ada sesi.</p>
        : sessionsForDay.sort((a, b) => (a.time ?? "").localeCompare(b.time ?? "")).map(renderSessionPill)
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
        <Link to="/capture"
          className="bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-semibold shadow flex items-center gap-1.5">
          <span>📝</span> Rekam Sesi
        </Link>
      </div>

      {flash && (
        <div className={`mx-4 mb-2 p-2 rounded-lg text-sm text-center ${flash.includes("✓") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
          {flash}
        </div>
      )}

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
            {DOW_LABELS.map((d) => <div key={d} className="py-1.5 text-xs text-gray-400 font-medium">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((date, i) => {
              if (!date) return <div key={`e-${i}`} className="min-h-[64px] border-b border-r border-gray-50 last:border-r-0" />;
              const daySess = monthByDay.get(date) ?? [];
              const isToday    = date === today;
              const isSelected = date === selectedDay;
              const dayNum = parseInt(date.slice(8), 10);
              return (
                <button key={date}
                  onClick={() => setSelectedDay(isSelected ? null : date)}
                  className={`min-h-[64px] flex flex-col items-start p-1 border-b border-r border-gray-100 last:border-r-0 transition-colors ${isSelected ? "bg-blue-50" : "hover:bg-gray-50"}`}>
                  <span className={`text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full mb-0.5 self-center ${isToday ? "bg-blue-600 text-white" : "text-gray-600"}`}>
                    {dayNum}
                  </span>
                  <div className="w-full space-y-0.5">
                    {daySess.slice(0, 3).map((s) => {
                      const info = studentMap.get(s.studentId);
                      const color = info?.color ?? "#9CA3AF";
                      return (
                        <div key={s.id} className="w-full truncate rounded px-1 py-0.5"
                          style={{ background: color + (s.status === "DONE" ? "18" : "30"), color, fontSize: 10, fontWeight: 700, lineHeight: 1.3 }}>
                          {info?.name?.split(" ")[0] ?? "—"}
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
              const d     = parseInt(date.slice(8), 10);
              const label = DOW_LABELS[new Date(date + "T00:00:00").getDay()];
              const daySess = weekByDay.get(date) ?? [];
              return (
                <div key={date} className={`border-r border-gray-50 last:border-r-0 ${isToday ? "bg-blue-50" : ""} ${isSelected ? "bg-indigo-50" : ""}`}>
                  <button className="w-full text-center py-1.5" onClick={() => setSelectedDay(isSelected ? null : date)}>
                    <p className="text-xs text-gray-400">{label}</p>
                    <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mx-auto ${isToday ? "bg-blue-600 text-white" : "text-gray-700"}`}>{d}</span>
                  </button>
                  <div className="px-0.5 pb-1 min-h-[56px]">
                    {daySess.sort((a, b) => (a.time ?? "").localeCompare(b.time ?? "")).map((s) => {
                      const info   = studentMap.get(s.studentId);
                      const color  = info?.color ?? "#9CA3AF";
                      const isDone = s.status === "DONE";
                      return (
                        <div key={s.id} className="rounded mb-0.5 px-1 py-0.5" style={{ background: color + (isDone ? "20" : "35"), fontSize: 9 }}>
                          <p className="font-bold truncate" style={{ color }}>{info?.name?.split(" ")[0] ?? "—"}</p>
                          {s.time && <p className="opacity-60" style={{ fontSize: 8 }}>{s.time}</p>}
                        </div>
                      );
                    })}
                    <button onClick={() => openAdd(date)} className="w-full text-center text-gray-200 hover:text-blue-400 text-base leading-none mt-0.5">+</button>
                  </div>
                </div>
              );
            })}
          </div>
          {selectedDay && weekByDay.has(selectedDay) && renderDayDetail(selectedDay, weekByDay.get(selectedDay) ?? [])}
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
            {/* Nav */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
              <button onClick={() => setAnchor(addDays(anchor, -1))} className="text-gray-400 text-xl w-8 text-center">‹</button>
              <span className="font-semibold text-gray-700 text-sm">{dayLabel(anchor)}</span>
              <button onClick={() => setAnchor(addDays(anchor, 1))} className="text-gray-400 text-xl w-8 text-center">›</button>
            </div>
            <div className="px-4 py-2 flex items-center justify-between border-b border-gray-50">
              <p className="text-xs text-gray-400">{(daySessions ?? []).length} sesi</p>
              <button onClick={() => openAdd(anchor)} className="text-sm text-blue-600 font-semibold">+ Jadwal</button>
            </div>

            {/* Untimed sessions (pinned above grid) */}
            {untimed.length > 0 && (
              <div className="px-3 pt-2 pb-1 border-b border-gray-100 space-y-1">
                <p className="text-xs text-gray-400 font-medium">Tanpa waktu</p>
                {untimed.map(renderSessionPill)}
              </div>
            )}

            {/* Scrollable time grid */}
            <div className="overflow-y-auto" style={{ maxHeight: "62vh" }}>
              <div className="relative select-none" style={{ height: totalH }}>

                {/* Hour labels + solid dividers */}
                {gridHours.map((h) => (
                  <div key={h} className="absolute left-0 right-0 pointer-events-none"
                    style={{ top: (h - DAY_START) * PX_PER_HR }}>
                    <div className="flex">
                      <span className="flex-shrink-0 text-right pr-2 text-gray-300"
                        style={{ width: LABEL_W, fontSize: 10, lineHeight: 1, marginTop: -6 }}>
                        {`${String(h).padStart(2, "0")}:00`}
                      </span>
                      <div className="flex-1 border-t border-gray-200" />
                    </div>
                  </div>
                ))}

                {/* 30-min dashed half-hour lines */}
                {gridHours.slice(0, -1).map((h) => (
                  <div key={`h30-${h}`} className="absolute right-0 border-t border-dashed border-gray-100 pointer-events-none"
                    style={{ top: (h - DAY_START) * PX_PER_HR + PX_PER_HR / 2, left: LABEL_W }} />
                ))}

                {/* Timed session blocks */}
                {timed.map((s) => {
                  const info  = studentMap.get(s.studentId);
                  const color = info?.color ?? "#9CA3AF";
                  const [sh, sm] = (s.time ?? "07:00").split(":").map(Number);
                  const topPx    = (sh - DAY_START) * PX_PER_HR + (sm / 60) * PX_PER_HR;
                  const heightPx = Math.max(s.durationHours * PX_PER_HR - 2, 28);
                  const isDone   = s.status === "DONE";
                  const endH     = new Date(0, 0, 0, sh, sm + Math.round(s.durationHours * 60));
                  const endLabel = `${String(endH.getHours()).padStart(2, "0")}:${String(endH.getMinutes()).padStart(2, "0")}`;
                  return (
                    <div key={s.id}
                      className="absolute rounded-lg overflow-hidden shadow-sm cursor-pointer hover:brightness-95 transition-all"
                      style={{
                        top: topPx + 1,
                        left: LABEL_W + 4,
                        right: 6,
                        height: heightPx,
                        background: color + (isDone ? "22" : "3A"),
                        borderLeft: `3px solid ${color}`,
                      }}
                      onClick={() => !isDone && setCancelTarget(s)}>
                      <div className="px-2 py-1">
                        <p className="font-bold text-xs leading-tight truncate" style={{ color }}>
                          {info?.name ?? "—"}{isDone ? " ✓" : ""}{s.seriesId ? " 🔁" : ""}
                        </p>
                        <p className="opacity-70 truncate" style={{ color, fontSize: 10 }}>
                          {s.time} – {endLabel} · {s.durationHours}j
                        </p>
                      </div>
                      {!isDone && heightPx >= 48 && (
                        <div className="absolute bottom-1 right-1 flex gap-1">
                          <button className="text-xs px-1.5 py-0.5 rounded-md bg-white/70 text-gray-600 shadow-sm"
                            onClick={(e) => { e.stopPropagation(); setReassignTarget(s); setReassignStudentId(s.studentId); }}>
                            Ganti
                          </button>
                        </div>
                      )}
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
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-end" onClick={() => setShowAdd(false)}>
          <div className="bg-white w-full rounded-t-2xl p-5 pb-8 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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
              <input className="input" type="time" value={addTime}
                onChange={(e) => { setAddTime(e.target.value); checkConflictsAsync(addWeekdays, e.target.value, addDuration); }} />
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

            {/* Repeat toggle */}
            <div className="flex items-center gap-3">
              <button type="button"
                className={`relative w-10 h-6 rounded-full transition-colors ${addRepeat ? "bg-blue-500" : "bg-gray-300"}`}
                onClick={() => { setAddRepeat(!addRepeat); if (addRepeat) setConflicts([]); }}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${addRepeat ? "translate-x-4" : "translate-x-0.5"}`} />
              </button>
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
                        setAddWeekdays(next);
                        checkConflictsAsync(next, addTime, addDuration);
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

            <button onClick={handleSaveSchedule} disabled={saving}
              className="btn-primary w-full py-3 font-semibold">
              {saving ? "Menyimpan..." : addRepeat ? `Buat Jadwal Berulang` : "Simpan Jadwal"}
            </button>
          </div>
        </div>
      )}

      {/* ── CANCEL MODAL ── */}
      {cancelTarget && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-end" onClick={() => setCancelTarget(null)}>
          <div className="bg-white w-full rounded-t-2xl p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg">Batalkan Jadwal</h3>
            <p className="text-sm text-gray-500">
              {studentMap.get(cancelTarget.studentId)?.name ?? "—"} — {dayLabel(cancelTarget.date)}
            </p>
            {cancelTarget.seriesId ? (
              <>
                <button onClick={() => handleCancel("this")}
                  className="w-full text-left px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-sm font-medium border border-gray-200">
                  Sesi ini saja
                </button>
                <button onClick={() => handleCancel("future")}
                  className="w-full text-left px-4 py-3 rounded-xl bg-orange-50 hover:bg-orange-100 text-sm font-medium text-orange-700 border border-orange-200">
                  Hari ini dan semua sesi berikutnya
                </button>
                <button onClick={() => handleCancel("all")}
                  className="w-full text-left px-4 py-3 rounded-xl bg-red-50 hover:bg-red-100 text-sm font-medium text-red-600 border border-red-200">
                  Semua sesi dalam seri ini
                </button>
              </>
            ) : (
              <button onClick={() => handleCancel("this")}
                className="w-full px-4 py-3 rounded-xl bg-red-50 text-red-600 font-medium text-sm border border-red-200">
                Ya, batalkan sesi ini
              </button>
            )}
            <button onClick={() => setCancelTarget(null)} className="w-full text-center text-gray-400 text-sm py-1">
              Batal (kembali)
            </button>
          </div>
        </div>
      )}

      {/* ── REASSIGN MODAL ── */}
      {reassignTarget && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-end" onClick={() => setReassignTarget(null)}>
          <div className="bg-white w-full rounded-t-2xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Ganti Murid</h3>
              <button onClick={() => setReassignTarget(null)} className="text-gray-400 text-xl leading-none">✕</button>
            </div>
            <select className="input" value={reassignStudentId} onChange={(e) => setReassignStudentId(e.target.value)}>
              <option value="">Pilih murid...</option>
              {(students ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button onClick={handleReassign} className="btn-primary w-full py-3 font-semibold">Simpan</button>
          </div>
        </div>
      )}
    </div>
  );
}
