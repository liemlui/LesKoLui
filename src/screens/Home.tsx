import { useState } from "react";
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

const STUDENT_COLORS = [
  "#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981",
  "#EF4444", "#14B8A6", "#F97316", "#6366F1", "#84CC16",
];
const DURATIONS   = [1, 1.5, 2, 2.5, 3, 3.5, 4];
const HOUR_SLOTS  = Array.from({ length: 15 }, (_, i) => i + 7); // 07–21
const DOW_LABELS  = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

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
  const dow = dt.getDay();
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
function getDatesForWeekdays(startDate: string, weekdays: number[], weeksAhead = 52): string[] {
  const results: string[] = [];
  for (let w = 0; w < weeksAhead; w++) {
    for (const dow of weekdays) {
      const [sy, sm, sd] = startDate.split("-").map(Number);
      const base = new Date(sy, sm - 1, sd);
      const baseDow = base.getDay();
      let offset = dow - baseDow;
      if (w === 0 && offset < 0) continue; // don't go before startDate in first week
      if (w === 0 && offset === 0) { results.push(startDate); continue; }
      const dt = new Date(sy, sm - 1, sd + w * 7 + (w === 0 ? offset : offset));
      const str = dt.toISOString().slice(0, 10);
      if (str >= startDate) results.push(str);
    }
  }
  return [...new Set(results)].sort();
}

type CalView = "month" | "week" | "day";

interface CancelTarget { session: Session; }

export default function Home() {
  const today = todayWIB();

  const [view, setView]           = useState<CalView>("month");
  const [calMonth, setCalMonth]   = useState(() => monthOf(today));
  const [anchor, setAnchor]       = useState(today);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Add schedule modal
  const [showAdd, setShowAdd]         = useState(false);
  const [addStudentId, setAddStudentId] = useState("");
  const [addTime, setAddTime]         = useState("08:00");
  const [addDuration, setAddDuration] = useState(MIN_DURATION);
  const [addRepeat, setAddRepeat]     = useState(false);
  const [addWeekdays, setAddWeekdays] = useState<number[]>([]);
  const [conflicts, setConflicts]     = useState<{ date: string; studentName: string; time: string }[]>([]);
  const [saving, setSaving]           = useState(false);

  // Cancel modal
  const [cancelTarget, setCancelTarget] = useState<CancelTarget | null>(null);

  // Reassign modal
  const [reassignTarget, setReassignTarget] = useState<Session | null>(null);
  const [reassignStudentId, setReassignStudentId] = useState("");

  const [flash, setFlash] = useState("");

  const students  = useLiveQuery(() => listStudents(true), []);
  const week      = weekDates(anchor);
  const weekSessions  = useLiveQuery(() => view === "week" ? listAllSessionsForWeek(week[0], week[6]) : Promise.resolve([]), [view, week[0]]);
  const monthSessions = useLiveQuery(() => view === "month" ? listAllSessionsForMonth(calMonth) : Promise.resolve([]), [view, calMonth]);
  const daySessions   = useLiveQuery(() => view === "day" ? listAllSessionsForWeek(anchor, anchor) : Promise.resolve([]), [view, anchor]);

  const studentMap = new Map(students?.map((s) => [s.id, { name: s.name, color: studentColor(s.id) }]));

  function msg(t: string) { setFlash(t); setTimeout(() => setFlash(""), 3000); }

  function byDay(sessions: Session[] | undefined) {
    const map = new Map<string, Session[]>();
    (sessions ?? []).forEach((s) => { const a = map.get(s.date) ?? []; a.push(s); map.set(s.date, a); });
    return map;
  }

  const openAdd = (date: string) => {
    setSelectedDay(date);
    // Pre-select the weekday of the clicked date
    const dow = new Date(date + "T00:00").getDay();
    setAddWeekdays([dow]);
    setConflicts([]);
    setShowAdd(true);
  };

  const checkConflicts = async (weekdays: number[], time: string, duration: number) => {
    if (!addRepeat || !time) { setConflicts([]); return; }
    const dates = getDatesForWeekdays(selectedDay ?? today, weekdays.length ? weekdays : [new Date((selectedDay ?? today) + "T00:00").getDay()]);
    const found = await findConflicts(dates.slice(0, 52), time, duration);
    setConflicts(found);
  };

  const handleAddSchedule = async () => {
    if (!selectedDay || !addStudentId) { msg("Pilih murid dulu."); return; }
    setSaving(true);
    try {
      if (addRepeat && addWeekdays.length > 0) {
        const dates = getDatesForWeekdays(selectedDay, addWeekdays);
        await scheduleBatch(dates.map((date) => ({ studentId: addStudentId, date, time: addTime, durationHours: addDuration })));
        msg(`${dates.length} jadwal dibuat ✓`);
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
    await cancelSeriesSessions({ id: cancelTarget.session.id, seriesId: cancelTarget.session.seriesId, date: cancelTarget.session.date }, mode);
    setCancelTarget(null);
    msg("Jadwal dibatalkan.");
  };

  const handleReassign = async () => {
    if (!reassignTarget || !reassignStudentId) return;
    await updateSession(reassignTarget.id, { studentId: reassignStudentId });
    setReassignTarget(null); setReassignStudentId("");
    msg("Murid diganti ✓");
  };

  function SessionCard({ s }: { s: Session }) {
    const info = studentMap.get(s.studentId);
    const isDone = s.status === "DONE";
    const color = info?.color ?? "#9CA3AF";
    return (
      <div className="flex items-start gap-2 mb-2">
        <div className="w-1 self-stretch rounded-full flex-shrink-0 mt-1" style={{ background: color, minHeight: 32 }} />
        <div className="flex-1 bg-white rounded-xl px-3 py-2 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between gap-1">
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color }}>{info?.name ?? "—"}</p>
              <p className="text-xs text-gray-400">
                {s.time ? `${s.time} · ` : ""}{s.durationHours}j{isDone ? " ✓" : ""}
                {s.seriesId && <span className="ml-1 opacity-60">🔁</span>}
              </p>
            </div>
            {!isDone && (
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => { setReassignTarget(s); setReassignStudentId(s.studentId); }}
                  className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-600">Ganti</button>
                <button onClick={() => setCancelTarget({ session: s })}
                  className="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-500">Batal</button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── MONTH VIEW ───────────────────────────────────────────────────────
  const monthByDay = byDay(monthSessions);
  const cells      = calendarCells(calMonth);

  function MonthView() {
    return (
      <>
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
          <button onClick={() => setCalMonth(prevMonth(calMonth))} className="text-gray-400 text-xl w-8">‹</button>
          <span className="font-semibold text-gray-800">{monthLabel(calMonth)}</span>
          <button onClick={() => setCalMonth(nextMonth(calMonth))} className="text-gray-400 text-xl w-8">›</button>
        </div>
        <div className="grid grid-cols-7 text-center border-b border-gray-50">
          {DOW_LABELS.map((d) => <div key={d} className="py-1 text-xs text-gray-400 font-medium">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((date, i) => {
            if (!date) return <div key={`e${i}`} className="min-h-[64px] border-b border-r border-gray-50" />;
            const daySess = monthByDay.get(date) ?? [];
            const isToday = date === today;
            const isSelected = date === selectedDay;
            const dayNum = parseInt(date.slice(8), 10);
            return (
              <button key={date} onClick={() => setSelectedDay(isSelected ? null : date)}
                className={`min-h-[64px] flex flex-col items-start p-1 border-b border-r border-gray-50 transition-colors ${isSelected ? "bg-blue-50" : "hover:bg-gray-50"}`}>
                <span className={`text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full mb-0.5 self-center ${isToday ? "bg-blue-600 text-white" : "text-gray-600"}`}>
                  {dayNum}
                </span>
                {daySess.slice(0, 2).map((s) => {
                  const info = studentMap.get(s.studentId);
                  return (
                    <div key={s.id} className="w-full text-left truncate rounded px-1 py-0.5 mb-0.5"
                      style={{ background: (info?.color ?? "#9CA3AF") + (s.status === "DONE" ? "18" : "30"), color: info?.color ?? "#6B7280", fontSize: 10, fontWeight: 700, lineHeight: 1.3 }}>
                      {info?.name?.split(" ")[0] ?? "—"}
                    </div>
                  );
                })}
                {daySess.length > 2 && <div className="text-gray-300 w-full text-center leading-none" style={{ fontSize: 9 }}>+{daySess.length - 2}</div>}
              </button>
            );
          })}
        </div>
        {selectedDay && (
          <div className="border-t border-gray-100 p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-700">{dayLabel(selectedDay)}</p>
              <button onClick={() => openAdd(selectedDay)} className="text-sm text-blue-600 font-semibold">+ Jadwal</button>
            </div>
            {(monthByDay.get(selectedDay) ?? []).length === 0
              ? <p className="text-xs text-gray-400 py-2 text-center">Belum ada sesi.</p>
              : (monthByDay.get(selectedDay) ?? []).sort((a, b) => (a.time ?? "").localeCompare(b.time ?? "")).map((s) => <SessionCard key={s.id} s={s} />)
            }
          </div>
        )}
      </>
    );
  }

  // ── WEEK VIEW ────────────────────────────────────────────────────────
  const weekByDay = byDay(weekSessions);

  function WeekView() {
    return (
      <>
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
          <button onClick={() => setAnchor(addDays(anchor, -7))} className="text-gray-400 text-xl w-8">‹</button>
          <span className="font-semibold text-gray-700 text-sm">
            {new Date(week[0] + "T00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
            {" – "}
            {new Date(week[6] + "T00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
          </span>
          <button onClick={() => setAnchor(addDays(anchor, 7))} className="text-gray-400 text-xl w-8">›</button>
        </div>
        <div className="grid grid-cols-7 border-b border-gray-50">
          {week.map((date) => {
            const isToday = date === today;
            const isSelected = date === selectedDay;
            const daySess = weekByDay.get(date) ?? [];
            const d = parseInt(date.slice(8), 10);
            const dowLabel = DOW_LABELS[new Date(date + "T00:00").getDay()];
            return (
              <div key={date} className={`border-r border-gray-50 last:border-r-0 ${isToday ? "bg-blue-50" : ""} ${isSelected ? "bg-indigo-50" : ""}`}>
                <button className="w-full text-center py-1.5" onClick={() => setSelectedDay(isSelected ? null : date)}>
                  <p className="text-xs text-gray-400">{dowLabel}</p>
                  <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mx-auto ${isToday ? "bg-blue-600 text-white" : "text-gray-700"}`}>{d}</span>
                </button>
                <div className="px-0.5 pb-1 min-h-[48px]">
                  {daySess.sort((a, b) => (a.time ?? "").localeCompare(b.time ?? "")).map((s) => {
                    const info = studentMap.get(s.studentId);
                    const isDone = s.status === "DONE";
                    return (
                      <div key={s.id} className="rounded mb-0.5 px-1 py-0.5" style={{ background: (info?.color ?? "#9CA3AF") + (isDone ? "20" : "33"), fontSize: 9 }}>
                        <p className="font-bold truncate" style={{ color: info?.color ?? "#6B7280" }}>{info?.name?.split(" ")[0] ?? "—"}</p>
                        {s.time && <p className="opacity-60" style={{ fontSize: 8 }}>{s.time}</p>}
                      </div>
                    );
                  })}
                  <button onClick={() => openAdd(date)} className="w-full text-center text-gray-200 hover:text-blue-400 text-sm leading-none mt-0.5">+</button>
                </div>
              </div>
            );
          })}
        </div>
        {selectedDay && (
          <div className="border-t border-gray-100 p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-700">{dayLabel(selectedDay)}</p>
              <button onClick={() => openAdd(selectedDay)} className="text-sm text-blue-600 font-semibold">+ Jadwal</button>
            </div>
            {(weekByDay.get(selectedDay) ?? []).sort((a, b) => (a.time ?? "").localeCompare(b.time ?? "")).map((s) => <SessionCard key={s.id} s={s} />)}
          </div>
        )}
      </>
    );
  }

  // ── DAY VIEW ─────────────────────────────────────────────────────────
  const dayList = (daySessions ?? []).sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
  const untimedDay = dayList.filter((s) => !s.time);
  const timedDay   = dayList.filter((s) => !!s.time);

  function DayView() {
    return (
      <>
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
          <button onClick={() => setAnchor(addDays(anchor, -1))} className="text-gray-400 text-xl w-8">‹</button>
          <span className="font-semibold text-gray-700 text-sm">{dayLabel(anchor)}</span>
          <button onClick={() => setAnchor(addDays(anchor, 1))} className="text-gray-400 text-xl w-8">›</button>
        </div>
        <div className="p-3">
          <div className="flex justify-between mb-2">
            <p className="text-xs text-gray-400">{dayList.length} sesi</p>
            <button onClick={() => openAdd(anchor)} className="text-sm text-blue-600 font-semibold">+ Jadwal</button>
          </div>
          {untimedDay.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-gray-400 mb-1">Tanpa waktu</p>
              {untimedDay.map((s) => <SessionCard key={s.id} s={s} />)}
            </div>
          )}
          {HOUR_SLOTS.map((h) => {
            const prefix = `${String(h).padStart(2, "0")}:`;
            const slotSess = timedDay.filter((s) => s.time?.startsWith(prefix));
            return (
              <div key={h} className="flex items-start gap-2 min-h-[36px]">
                <span className="text-xs text-gray-300 w-9 pt-1 flex-shrink-0">{prefix}00</span>
                <div className="flex-1 border-b border-gray-50 pb-1">
                  {slotSess.map((s) => <SessionCard key={s.id} s={s} />)}
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  }

  return (
    <div className="pb-20">
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
        <div className={`mx-4 mb-2 p-2 rounded-lg text-sm text-center ${flash.includes("✓") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
          {flash}
        </div>
      )}

      {/* View toggle */}
      <div className="mx-4 mb-3 bg-gray-100 rounded-xl p-1 grid grid-cols-3">
        {(["month", "week", "day"] as CalView[]).map((v) => (
          <button key={v} onClick={() => { setView(v); if (v !== "month") setAnchor(anchor || today); }}
            className={`py-1.5 rounded-lg text-sm font-medium transition-colors ${view === v ? "bg-white shadow text-blue-700" : "text-gray-500"}`}>
            {v === "month" ? "Bulan" : v === "week" ? "Minggu" : "Hari"}
          </button>
        ))}
      </div>

      <div className="mx-4 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {view === "month" && <MonthView />}
        {view === "week"  && <WeekView />}
        {view === "day"   && <DayView />}
      </div>

      {/* ── ADD SCHEDULE MODAL ── */}
      {showAdd && selectedDay && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-end" onClick={() => setShowAdd(false)}>
          <div className="bg-white w-full rounded-t-2xl p-5 pb-8 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Jadwalkan Sesi</h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 text-xl">✕</button>
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
                onChange={(e) => { setAddTime(e.target.value); checkConflicts(addWeekdays, e.target.value, addDuration); }} />
            </div>

            <div>
              <label className="label">Durasi</label>
              <div className="flex flex-wrap gap-2">
                {DURATIONS.map((d) => (
                  <button key={d} type="button"
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${addDuration === d ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300"}`}
                    onClick={() => { setAddDuration(d); checkConflicts(addWeekdays, addTime, d); }}>{d}j</button>
                ))}
              </div>
            </div>

            {/* Repeat toggle */}
            <label className="flex items-center gap-3 cursor-pointer">
              <div className={`w-10 h-5 rounded-full transition-colors ${addRepeat ? "bg-blue-500" : "bg-gray-300"}`}
                onClick={() => { setAddRepeat(!addRepeat); if (addRepeat) setConflicts([]); }}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${addRepeat ? "translate-x-5" : "translate-x-0"}`} />
              </div>
              <span className="text-sm font-medium text-gray-700">Ulangi setiap minggu</span>
            </label>

            {addRepeat && (
              <div>
                <label className="label">Hari yang diulang</label>
                <div className="flex gap-2 flex-wrap">
                  {DOW_LABELS.map((label, dow) => (
                    <button key={dow} type="button"
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${addWeekdays.includes(dow) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300"}`}
                      onClick={() => {
                        const next = addWeekdays.includes(dow) ? addWeekdays.filter((d) => d !== dow) : [...addWeekdays, dow];
                        setAddWeekdays(next);
                        checkConflicts(next, addTime, addDuration);
                      }}>{label}</button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">Jadwal dibuat otomatis untuk 1 tahun ke depan</p>
              </div>
            )}

            {/* Conflict warning */}
            {conflicts.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                <p className="text-sm font-semibold text-orange-700 mb-1">⚠️ Tabrakan jadwal</p>
                {conflicts.slice(0, 5).map((c, i) => (
                  <p key={i} className="text-xs text-orange-600">{c.date} {c.time} — {c.studentName}</p>
                ))}
                {conflicts.length > 5 && <p className="text-xs text-orange-500">...dan {conflicts.length - 5} lainnya</p>}
              </div>
            )}

            <button onClick={handleAddSchedule} disabled={saving}
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
              {studentMap.get(cancelTarget.session.studentId)?.name} — {dayLabel(cancelTarget.session.date)}
            </p>
            {cancelTarget.session.seriesId ? (
              <>
                <button onClick={() => handleCancel("this")}
                  className="w-full text-left px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-sm font-medium">
                  Sesi ini saja
                </button>
                <button onClick={() => handleCancel("future")}
                  className="w-full text-left px-4 py-3 rounded-xl bg-orange-50 hover:bg-orange-100 text-sm font-medium text-orange-700">
                  Hari ini dan semua sesi berikutnya
                </button>
                <button onClick={() => handleCancel("all")}
                  className="w-full text-left px-4 py-3 rounded-xl bg-red-50 hover:bg-red-100 text-sm font-medium text-red-600">
                  Semua sesi dalam seri ini
                </button>
              </>
            ) : (
              <button onClick={() => handleCancel("this")}
                className="w-full px-4 py-3 rounded-xl bg-red-50 text-red-600 font-medium text-sm">
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
              <button onClick={() => setReassignTarget(null)} className="text-gray-400 text-xl">✕</button>
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
