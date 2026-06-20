import { useState } from "react";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  listStudents, listAllSessionsForMonth, listAllSessionsForWeek,
  cancelSession, scheduleSession, updateSession,
} from "../db/repos";
import { dayLabel, monthLabel, todayWIB, monthOf } from "../lib/format";
import { MIN_DURATION } from "../db/types";
import type { Session } from "../db/types";

const STUDENT_COLORS = [
  "#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981",
  "#EF4444", "#14B8A6", "#F97316", "#6366F1", "#84CC16",
];
const DURATIONS = [1, 1.5, 2, 2.5, 3, 3.5, 4];
const HOUR_SLOTS = Array.from({ length: 14 }, (_, i) => i + 7); // 07:00 – 20:00

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
  const dt = new Date(y, m - 1, d);
  const dow = dt.getDay(); // 0=Sun
  const sun = new Date(dt); sun.setDate(d - dow);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(sun); day.setDate(sun.getDate() + i);
    return day.toISOString().slice(0, 10);
  });
}
function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, m - 1, d); dt.setDate(dt.getDate() + n);
  return dt.toISOString().slice(0, 10);
}

type CalView = "month" | "week" | "day";

export default function Home() {
  const today = todayWIB();

  const [view, setView]           = useState<CalView>("month");
  const [calMonth, setCalMonth]   = useState(() => monthOf(today));
  const [anchor, setAnchor]       = useState(today); // for week/day
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showAdd, setShowAdd]     = useState(false);
  const [addStudentId, setAddStudentId] = useState("");
  const [addTime, setAddTime]     = useState("08:00");
  const [addDuration, setAddDuration] = useState(MIN_DURATION);
  const [saving, setSaving]       = useState(false);
  const [showReassign, setShowReassign] = useState<string | null>(null);
  const [reassignStudentId, setReassignStudentId] = useState("");
  const [flash, setFlash]         = useState("");

  const students = useLiveQuery(() => listStudents(true), []);

  const week = weekDates(anchor);
  const weekSessions = useLiveQuery(
    () => (view === "week" ? listAllSessionsForWeek(week[0], week[6]) : Promise.resolve([])),
    [view, week[0], week[6]]
  );
  const monthSessions = useLiveQuery(
    () => (view === "month" ? listAllSessionsForMonth(calMonth) : Promise.resolve([])),
    [view, calMonth]
  );
  const daySessions = useLiveQuery(
    () => (view === "day" ? listAllSessionsForWeek(anchor, anchor) : Promise.resolve([])),
    [view, anchor]
  );

  const studentMap = new Map(students?.map((s) => [s.id, { name: s.name, color: studentColor(s.id) }]));

  function msg(t: string) { setFlash(t); setTimeout(() => setFlash(""), 2500); }

  const handleCancel = async (id: string) => {
    if (!confirm("Batalkan sesi ini?")) return;
    await cancelSession(id);
    msg("Sesi dibatalkan.");
  };

  const handleReassign = async () => {
    if (!showReassign || !reassignStudentId) return;
    await updateSession(showReassign, { studentId: reassignStudentId });
    setShowReassign(null); setReassignStudentId("");
    msg("Murid diganti ✓");
  };

  const handleAddSchedule = async (date: string) => {
    if (!addStudentId) { msg("Pilih murid dulu."); return; }
    setSaving(true);
    try {
      await scheduleSession({ studentId: addStudentId, date, time: addTime, durationHours: addDuration });
      setShowAdd(false); setAddStudentId(""); setAddTime("08:00"); setAddDuration(MIN_DURATION);
      msg("Jadwal ditambahkan ✓");
    } catch (e) { msg("Gagal: " + (e as Error).message); }
    finally { setSaving(false); }
  };

  const openAdd = (date: string) => { setSelectedDay(date); setShowAdd(true); };

  // Group sessions by day
  function byDay(sessions: Session[] | undefined) {
    const map = new Map<string, Session[]>();
    (sessions ?? []).forEach((s) => {
      const arr = map.get(s.date) ?? []; arr.push(s); map.set(s.date, arr);
    });
    return map;
  }

  function SessionPill({ s, compact }: { s: Session; compact?: boolean }) {
    const info = studentMap.get(s.studentId);
    const isDone = s.status === "DONE";
    return (
      <div style={{ background: (info?.color ?? "#9CA3AF") + (isDone ? "22" : "18"), borderLeft: `3px solid ${info?.color ?? "#9CA3AF"}` }}
        className="rounded-r-lg px-2 py-1 mb-1">
        <p className="text-xs font-semibold truncate" style={{ color: info?.color ?? "#6B7280" }}>
          {s.time && <span className="mr-1 opacity-75">{s.time}</span>}
          {info?.name ?? "—"}
        </p>
        {!compact && (
          <p className="text-xs text-gray-400">{s.durationHours}j{isDone ? " ✓" : ""}</p>
        )}
        {!isDone && (
          <div className="flex gap-1 mt-1">
            <button onClick={() => { setShowReassign(s.id); setReassignStudentId(s.studentId); }}
              className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">Ganti</button>
            <button onClick={() => handleCancel(s.id)}
              className="text-xs px-1.5 py-0.5 rounded bg-red-50 text-red-500">Batal</button>
          </div>
        )}
      </div>
    );
  }

  // ── MONTH VIEW ───────────────────────────────────────────────────────
  const monthByDay = byDay(monthSessions);
  const cells = calendarCells(calMonth);

  const MonthView = () => (
    <>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
        <button onClick={() => setCalMonth(prevMonth(calMonth))} className="text-gray-400 hover:text-gray-700 text-xl w-8">‹</button>
        <span className="font-semibold text-gray-800">{monthLabel(calMonth)}</span>
        <button onClick={() => setCalMonth(nextMonth(calMonth))} className="text-gray-400 hover:text-gray-700 text-xl w-8">›</button>
      </div>
      <div className="grid grid-cols-7 text-center border-b border-gray-50">
        {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((d) => (
          <div key={d} className="py-1 text-xs text-gray-400 font-medium">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((date, i) => {
          if (!date) return <div key={`e${i}`} className="min-h-[56px] border-b border-r border-gray-50" />;
          const daySess = monthByDay.get(date) ?? [];
          const isToday = date === today;
          const isSelected = date === selectedDay;
          const dayNum = parseInt(date.slice(8), 10);
          return (
            <button key={date} onClick={() => setSelectedDay(isSelected ? null : date)}
              className={`min-h-[56px] flex flex-col items-start p-1 border-b border-r border-gray-50 transition-colors ${isSelected ? "bg-blue-50" : "hover:bg-gray-50"}`}>
              <span className={`text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full mb-0.5 self-center ${isToday ? "bg-blue-600 text-white" : "text-gray-600"}`}>
                {dayNum}
              </span>
              <div className="w-full space-y-0.5">
                {daySess.slice(0, 2).map((s) => {
                  const info = studentMap.get(s.studentId);
                  return (
                    <div key={s.id} className="text-xs truncate rounded px-1" style={{ background: (info?.color ?? "#9CA3AF") + "22", color: info?.color ?? "#6B7280", fontSize: 10 }}>
                      {info?.name?.split(" ")[0] ?? "—"}
                    </div>
                  );
                })}
                {daySess.length > 2 && <div className="text-xs text-gray-400" style={{ fontSize: 10 }}>+{daySess.length - 2}</div>}
              </div>
            </button>
          );
        })}
      </div>
      {/* Day detail panel */}
      {selectedDay && (
        <div className="border-t border-gray-100 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">{dayLabel(selectedDay)}</p>
            <button onClick={() => openAdd(selectedDay)} className="text-sm text-blue-600 font-medium">+ Jadwal</button>
          </div>
          {(monthByDay.get(selectedDay) ?? []).length === 0 ? (
            <p className="text-xs text-gray-400 py-2">Belum ada sesi.</p>
          ) : (
            (monthByDay.get(selectedDay) ?? [])
              .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""))
              .map((s) => <SessionPill key={s.id} s={s} />)
          )}
        </div>
      )}
    </>
  );

  // ── WEEK VIEW ────────────────────────────────────────────────────────
  const weekByDay = byDay(weekSessions);

  const WeekView = () => (
    <>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
        <button onClick={() => setAnchor(addDays(anchor, -7))} className="text-gray-400 hover:text-gray-700 text-xl w-8">‹</button>
        <span className="font-semibold text-gray-700 text-sm">
          {new Date(week[0] + "T00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
          {" – "}
          {new Date(week[6] + "T00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
        </span>
        <button onClick={() => setAnchor(addDays(anchor, 7))} className="text-gray-400 hover:text-gray-700 text-xl w-8">›</button>
      </div>
      <div className="grid grid-cols-7 border-b border-gray-50">
        {week.map((date) => {
          const isToday = date === today;
          const daySess = weekByDay.get(date) ?? [];
          const d = parseInt(date.slice(8), 10);
          const dowLabel = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"][new Date(date + "T00:00").getDay()];
          return (
            <div key={date} className={`border-r border-gray-50 last:border-r-0 ${isToday ? "bg-blue-50" : ""}`}>
              <div className="text-center py-1.5">
                <p className="text-xs text-gray-400">{dowLabel}</p>
                <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mx-auto ${isToday ? "bg-blue-600 text-white" : "text-gray-700"}`}>{d}</span>
              </div>
              <div className="px-0.5 pb-1 min-h-[60px]">
                {daySess.sort((a, b) => (a.time ?? "").localeCompare(b.time ?? "")).map((s) => {
                  const info = studentMap.get(s.studentId);
                  const isDone = s.status === "DONE";
                  return (
                    <div key={s.id} className="rounded text-center mb-0.5 px-0.5 py-0.5 cursor-pointer" style={{ background: (info?.color ?? "#9CA3AF") + (isDone ? "22" : "33"), fontSize: 9 }}
                      onClick={() => { setSelectedDay(date); }}>
                      <p className="font-semibold truncate" style={{ color: info?.color ?? "#6B7280" }}>{info?.name?.split(" ")[0] ?? "—"}</p>
                      {s.time && <p className="opacity-70">{s.time}</p>}
                    </div>
                  );
                })}
                <button onClick={() => openAdd(date)} className="w-full text-center text-gray-300 hover:text-blue-400 text-base leading-none mt-0.5">+</button>
              </div>
            </div>
          );
        })}
      </div>
      {/* Selected day detail */}
      {selectedDay && weekByDay.has(selectedDay) && (
        <div className="border-t border-gray-100 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">{dayLabel(selectedDay)}</p>
            <button onClick={() => openAdd(selectedDay)} className="text-sm text-blue-600 font-medium">+ Jadwal</button>
          </div>
          {(weekByDay.get(selectedDay) ?? [])
            .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""))
            .map((s) => <SessionPill key={s.id} s={s} />)}
        </div>
      )}
    </>
  );

  // ── DAY VIEW ─────────────────────────────────────────────────────────
  const daySessionsList = (daySessions ?? []).sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
  const untimedSessions = daySessionsList.filter((s) => !s.time);
  const timedSessions   = daySessionsList.filter((s) => !!s.time);

  const DayView = () => (
    <>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
        <button onClick={() => setAnchor(addDays(anchor, -1))} className="text-gray-400 hover:text-gray-700 text-xl w-8">‹</button>
        <span className="font-semibold text-gray-700 text-sm">{dayLabel(anchor)}</span>
        <button onClick={() => setAnchor(addDays(anchor, 1))} className="text-gray-400 hover:text-gray-700 text-xl w-8">›</button>
      </div>
      <div className="p-3 space-y-1">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-gray-400">{daySessionsList.length} sesi</p>
          <button onClick={() => openAdd(anchor)} className="text-sm text-blue-600 font-medium">+ Jadwal</button>
        </div>
        {untimedSessions.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-gray-400 mb-1">Tanpa waktu</p>
            {untimedSessions.map((s) => <SessionPill key={s.id} s={s} />)}
          </div>
        )}
        {HOUR_SLOTS.map((h) => {
          const slotStr = `${String(h).padStart(2, "0")}:`;
          const slotSessions = timedSessions.filter((s) => s.time?.startsWith(slotStr));
          return (
            <div key={h} className="flex items-start gap-2">
              <span className="text-xs text-gray-300 w-9 pt-1 flex-shrink-0">{String(h).padStart(2, "0")}:00</span>
              <div className="flex-1 min-h-[32px] border-b border-gray-50">
                {slotSessions.map((s) => <SessionPill key={s.id} s={s} />)}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Fredoka', sans-serif" }}>Les Ko Lui</h1>
          <p className="text-gray-400 text-xs">{dayLabel(today)}</p>
        </div>
        <Link to="/capture"
          className="bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-semibold shadow hover:bg-blue-700 transition-colors flex items-center gap-1.5">
          <span>📝</span> Rekam Sesi
        </Link>
      </div>

      {flash && (
        <div className={`mx-4 mb-2 p-2 rounded-lg text-sm text-center ${flash.includes("✓") ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"}`}>
          {flash}
        </div>
      )}

      {/* View toggle */}
      <div className="mx-4 mb-3 bg-gray-100 rounded-xl p-1 grid grid-cols-3">
        {(["month", "week", "day"] as CalView[]).map((v) => (
          <button key={v} onClick={() => { setView(v); if (v !== "month") setAnchor(today); }}
            className={`py-1.5 rounded-lg text-sm font-medium transition-colors ${view === v ? "bg-white shadow text-blue-700" : "text-gray-500"}`}>
            {v === "month" ? "Bulan" : v === "week" ? "Minggu" : "Hari"}
          </button>
        ))}
      </div>

      {/* Calendar container */}
      <div className="mx-4 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {view === "month" && <MonthView />}
        {view === "week" && <WeekView />}
        {view === "day"  && <DayView />}
      </div>

      {/* Add Schedule Modal */}
      {showAdd && selectedDay && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={() => setShowAdd(false)}>
          <div className="bg-white w-full rounded-t-2xl p-5 space-y-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Jadwalkan Sesi</h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <p className="text-sm text-gray-500">{dayLabel(selectedDay)}</p>
            <div>
              <label className="label">Murid</label>
              <select className="input" value={addStudentId} onChange={(e) => setAddStudentId(e.target.value)}>
                <option value="">Pilih murid...</option>
                {(students ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Jam Mulai</label>
              <input className="input" type="time" value={addTime} onChange={(e) => setAddTime(e.target.value)} />
            </div>
            <div>
              <label className="label">Durasi</label>
              <div className="flex flex-wrap gap-2">
                {DURATIONS.map((d) => (
                  <button key={d} type="button"
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${addDuration === d ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300"}`}
                    onClick={() => setAddDuration(d)}>{d}j</button>
                ))}
              </div>
            </div>
            <button onClick={() => handleAddSchedule(selectedDay)} disabled={saving}
              className="btn-primary w-full py-3 font-semibold">
              {saving ? "Menyimpan..." : "Simpan Jadwal"}
            </button>
          </div>
        </div>
      )}

      {/* Reassign Modal */}
      {showReassign && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={() => setShowReassign(null)}>
          <div className="bg-white w-full rounded-t-2xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Ganti Murid</h3>
              <button onClick={() => setShowReassign(null)} className="text-gray-400 text-xl">✕</button>
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
