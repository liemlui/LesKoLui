import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  getStudent, listSessionsByStudent, listScheduledForStudent,
  cancelSeriesSessions, updateSeriesSessions,
  listRaporGrades, upsertRaporGrade, deleteRaporGrade,
} from "../db/repos";
import type { CancelMode, EditMode } from "../db/repos";
import { dayLabel, monthLabel, monthOf, todayWIB } from "../lib/format";
import {
  scoreLabel, scoreBarColor,
  semesterOptions, semesterLabel, semesterDateRange, currentSemester,
} from "../lib/engagement";
import type { Session } from "../db/types";

const DURATIONS = [1, 1.5, 2, 2.5, 3, 3.5, 4];

export default function StudentDetail() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const today    = todayWIB();

  const student       = useLiveQuery(() => (id ? getStudent(id) : undefined), [id]);
  const allSessions   = useLiveQuery(() => (id ? listSessionsByStudent(id) : []), [id]);
  const upcomingSched = useLiveQuery(() => (id ? listScheduledForStudent(id, today) : []), [id, today]);
  const raporList     = useLiveQuery(() => (id ? listRaporGrades(id) : []), [id]);

  // Edit scheduled session modal
  const [editTarget,     setEditTarget]     = useState<Session | null>(null);
  const [editDate,       setEditDate]       = useState("");
  const [editTime,       setEditTime]       = useState("");
  const [editDuration,   setEditDuration]   = useState(1);
  const [editMode,       setEditMode]       = useState<EditMode>("this");
  const [editSaving,     setEditSaving]     = useState(false);
  const [showCancelSect, setShowCancelSect] = useState(false);

  // Rapor modal
  const [showRapor,      setShowRapor]      = useState(false);
  const [raporSem,       setRaporSem]       = useState(currentSemester());
  const [raporGrades,    setRaporGrades]    = useState<{ subject: string; grade: string }[]>([]);
  const [raporNotes,     setRaporNotes]     = useState("");
  const [raporSaving,    setRaporSaving]    = useState(false);

  const [flash, setFlash] = useState("");
  function msg(t: string) { setFlash(t); setTimeout(() => setFlash(""), 3000); }

  const SEMESTERS = semesterOptions(6);

  // ── Computed ────────────────────────────────────────────────────────
  const byMonth = useMemo(() => {
    const map = new Map<string, { sessions: Session[]; totalHours: number }>();
    (allSessions ?? []).forEach((s) => {
      const m    = monthOf(s.date);
      const curr = map.get(m) ?? { sessions: [], totalHours: 0 };
      curr.sessions.push(s);
      curr.totalHours += s.durationHours;
      map.set(m, curr);
    });
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [allSessions]);

  const totalSessions = allSessions?.length ?? 0;
  const totalHours    = useMemo(() => (allSessions ?? []).reduce((s, x) => s + x.durationHours, 0), [allSessions]);

  // Sessions with engagement data
  const engSessions = useMemo(
    () => (allSessions ?? []).filter((s) => s.engagement != null).sort((a, b) => a.date.localeCompare(b.date)),
    [allSessions]
  );

  // Last 15 engagement sessions for trend chart
  const recentEng = useMemo(() => engSessions.slice(-15), [engSessions]);

  // Overall avg engagement score
  const avgEngScore = useMemo(() => {
    if (engSessions.length === 0) return null;
    const sum = engSessions.reduce((s, x) => s + (x.engagement!.score), 0);
    return Math.round((sum / engSessions.length) * 10) / 10;
  }, [engSessions]);

  // Trend: compare last 5 vs previous 5
  const engTrend = useMemo((): "up" | "down" | "stable" | null => {
    if (engSessions.length < 6) return null;
    const recent = engSessions.slice(-5);
    const prev   = engSessions.slice(-10, -5);
    if (prev.length === 0) return null;
    const rAvg = recent.reduce((s, x) => s + x.engagement!.score, 0) / recent.length;
    const pAvg = prev.reduce((s, x)   => s + x.engagement!.score, 0) / prev.length;
    if (rAvg - pAvg > 0.5) return "up";
    if (pAvg - rAvg > 0.5) return "down";
    return "stable";
  }, [engSessions]);

  // Per-subject engagement breakdown
  const subjectEngStats = useMemo(() => {
    const map = new Map<string, { scores: number[]; phoneCount: number; drowsyCount: number; prepCount: number }>();
    engSessions.forEach((s) => {
      s.subjects.forEach((sub) => {
        const curr = map.get(sub) ?? { scores: [], phoneCount: 0, drowsyCount: 0, prepCount: 0 };
        curr.scores.push(s.engagement!.score);
        if (s.engagement!.playingPhone) curr.phoneCount++;
        if (s.engagement!.drowsy)       curr.drowsyCount++;
        if (s.engagement!.prepared)     curr.prepCount++;
        map.set(sub, curr);
      });
    });
    return [...map.entries()]
      .map(([sub, d]) => ({
        subject:    sub,
        count:      d.scores.length,
        avgScore:   Math.round((d.scores.reduce((a, b) => a + b, 0) / d.scores.length) * 10) / 10,
        phoneRate:  Math.round((d.phoneCount / d.scores.length) * 100),
        drowsyRate: Math.round((d.drowsyCount / d.scores.length) * 100),
        prepRate:   Math.round((d.prepCount / d.scores.length) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [engSessions]);

  // Rapor ↔ engagement correlation per semester
  const raporCorrelation = useMemo(() => {
    return (raporList ?? []).map((r) => {
      const { start, end } = semesterDateRange(r.semester);
      const sessInSem = engSessions.filter((s) => s.date >= start && s.date <= end);
      const avgEng    = sessInSem.length > 0
        ? Math.round((sessInSem.reduce((s, x) => s + x.engagement!.score, 0) / sessInSem.length) * 10) / 10
        : null;
      return { ...r, avgEng, sessionCount: sessInSem.length };
    }).sort((a, b) => b.semester.localeCompare(a.semester));
  }, [raporList, engSessions]);

  // ── Handlers ────────────────────────────────────────────────────────
  const openEditSched = (s: Session) => {
    setEditTarget(s); setEditDate(s.date); setEditTime(s.time ?? "08:00");
    setEditDuration(s.durationHours); setEditMode("this"); setShowCancelSect(false);
  };

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    setEditSaving(true);
    try {
      const patch: Parameters<typeof updateSeriesSessions>[1] = { time: editTime, durationHours: editDuration };
      if (editMode === "this" && editDate !== editTarget.date) (patch as Record<string, unknown>).date = editDate;
      await updateSeriesSessions({ id: editTarget.id, seriesId: editTarget.seriesId, date: editTarget.date }, patch, editMode);
      msg("Jadwal diperbarui ✓"); setEditTarget(null);
    } catch (e) { msg("Gagal: " + (e as Error).message); }
    finally { setEditSaving(false); }
  };

  const handleCancel = async (mode: CancelMode) => {
    if (!editTarget) return;
    await cancelSeriesSessions({ id: editTarget.id, seriesId: editTarget.seriesId, date: editTarget.date }, mode);
    setEditTarget(null); msg("Jadwal dibatalkan.");
  };

  const openRapor = (sem?: string) => {
    const s = sem ?? currentSemester();
    setRaporSem(s);
    const existing = (raporList ?? []).find((r) => r.semester === s);
    setRaporGrades(existing?.grades ?? (student?.subjects ?? []).map((sub) => ({ subject: sub, grade: "" })));
    setRaporNotes(existing?.notes ?? "");
    setShowRapor(true);
  };

  const handleSaveRapor = async () => {
    if (!id) return;
    setRaporSaving(true);
    try {
      await upsertRaporGrade({
        studentId: id, semester: raporSem,
        grades: raporGrades.filter((g) => g.grade.trim()),
        notes: raporNotes.trim() || undefined,
      });
      msg("Nilai rapor disimpan ✓"); setShowRapor(false);
    } catch (e) { msg("Gagal: " + (e as Error).message); }
    finally { setRaporSaving(false); }
  };

  if (!student) return <div className="p-4 text-gray-500">Memuat...</div>;

  return (
    <div className="p-4 space-y-4 pb-24">

      {/* Back */}
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-xl transition-colors">
        ‹ Kembali ke Daftar Murid
      </button>

      {flash && (
        <div className={`p-2 rounded-lg text-sm text-center font-medium ${flash.includes("✓") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
          {flash}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{student.name}</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {student.level}{student.subjects.length > 0 ? ` · ${student.subjects.join(", ")}` : ""}
          </p>
        </div>
        <span className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${student.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
          {student.active ? "Aktif" : "Nonaktif"}
        </span>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => navigate("/capture")}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow-sm hover:bg-blue-700 transition-colors">
          <span>📝</span> Catat Sesi
        </button>
        <button onClick={() => navigate("/report")}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-50 text-indigo-700 text-sm font-semibold border border-indigo-200 hover:bg-indigo-100 transition-colors">
          <span>📊</span> Lihat Laporan
        </button>
      </div>

      {/* Info card */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-2">
        <h2 className="font-semibold text-gray-700 text-sm mb-2">Info Murid</h2>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400 w-28 flex-shrink-0">Orang Tua</span>
          <span className="text-gray-700 font-medium">{student.parentContact.name || "—"}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400 w-28 flex-shrink-0">WA Ortu</span>
          <a href={`https://wa.me/${student.parentContact.phone.replace(/^0/, "62").replace(/[^0-9]/g, "")}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-green-600 font-medium hover:text-green-700">
            <span>💬</span>{student.parentContact.phone}
          </a>
        </div>
        {student.studentPhone && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400 w-28 flex-shrink-0">WA Murid</span>
            <a href={`https://wa.me/${student.studentPhone.replace(/^0/, "62").replace(/[^0-9]/g, "")}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-blue-600 font-medium hover:text-blue-700">
              <span>💬</span>{student.studentPhone}
            </a>
          </div>
        )}
        {student.notes && (
          <div className="flex items-start gap-2 text-sm">
            <span className="text-gray-400 w-28 flex-shrink-0">Catatan</span>
            <span className="text-gray-700">{student.notes}</span>
          </div>
        )}
        {totalSessions > 0 && (
          <div className="pt-3 mt-1 border-t border-gray-100 grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-blue-700">{totalSessions}</p>
              <p className="text-xs text-blue-500 font-medium">Total Sesi</p>
            </div>
            <div className="bg-indigo-50 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-indigo-700">{totalHours}j</p>
              <p className="text-xs text-indigo-500 font-medium">Total Jam</p>
            </div>
          </div>
        )}
      </div>

      {/* ── KESERIUSAN BELAJAR ── */}
      {engSessions.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-700">Keseriusan Belajar</h2>
            <span className="text-xs text-gray-400">{engSessions.length} sesi tercatat</span>
          </div>

          {/* Summary row */}
          <div className="grid grid-cols-3 divide-x divide-gray-100">
            <div className="p-3 text-center">
              {avgEngScore !== null && (() => {
                const { text, color } = scoreLabel(avgEngScore);
                return (
                  <>
                    <p className="text-2xl font-bold" style={{ color }}>{avgEngScore}</p>
                    <p className="text-xs font-medium mt-0.5" style={{ color }}>{text}</p>
                    <p className="text-xs text-gray-400">rata-rata</p>
                  </>
                );
              })()}
            </div>
            <div className="p-3 text-center">
              <p className="text-2xl">
                {engTrend === "up" ? "📈" : engTrend === "down" ? "📉" : "➡️"}
              </p>
              <p className="text-xs font-medium text-gray-600">
                {engTrend === "up" ? "Membaik" : engTrend === "down" ? "Menurun" : engTrend === "stable" ? "Stabil" : "—"}
              </p>
              <p className="text-xs text-gray-400">trend</p>
            </div>
            <div className="p-3 text-center">
              <p className="text-2xl font-bold text-red-500">
                {Math.round((engSessions.filter((s) => s.engagement?.playingPhone).length / engSessions.length) * 100)}%
              </p>
              <p className="text-xs font-medium text-red-400">Main HP</p>
              <p className="text-xs text-gray-400">dari sesi</p>
            </div>
          </div>

          {/* Trend chart — last 15 sessions */}
          {recentEng.length > 0 && (
            <div className="px-4 pb-3">
              <p className="text-xs text-gray-400 mb-2 font-medium">Trend {recentEng.length} sesi terakhir</p>
              <div className="flex items-end gap-1 h-16">
                {recentEng.map((s) => {
                  const score = s.engagement!.score;
                  const color = scoreBarColor(score);
                  const pct   = (score / 10) * 100;
                  return (
                    <div key={s.id} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                      <div className="w-full rounded-t-sm transition-all" style={{ height: `${pct}%`, background: color }} />
                      <span className="text-gray-300 group-hover:text-gray-500 transition-colors" style={{ fontSize: 8 }}>
                        {score}
                      </span>
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                        {s.date.slice(5)} · {score}/10
                        {s.engagement!.playingPhone ? " 📱" : ""}
                        {s.engagement!.drowsy ? " 😴" : ""}
                        {s.engagement!.prepared ? " 📚" : ""}
                        {s.engagement!.focused ? " 🎯" : ""}
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Score axis labels */}
              <div className="flex justify-between mt-1">
                <span className="text-gray-300" style={{ fontSize: 8 }}>lama</span>
                <span className="text-gray-300" style={{ fontSize: 8 }}>terbaru</span>
              </div>
            </div>
          )}

          {/* Per-subject breakdown */}
          {subjectEngStats.length > 0 && (
            <div className="border-t border-gray-100 px-4 py-3">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">Per Mata Pelajaran</p>
              <div className="space-y-2.5">
                {subjectEngStats.map((stat) => {
                  const { color, bg } = scoreLabel(stat.avgScore);
                  return (
                    <div key={stat.subject}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm font-medium text-gray-700">{stat.subject}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ color, background: bg }}>
                            {stat.avgScore}/10
                          </span>
                          <span className="text-xs text-gray-400">{stat.count}×</span>
                        </div>
                      </div>
                      {/* Mini indicator bar */}
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${(stat.avgScore / 10) * 100}%`, background: color }} />
                      </div>
                      <div className="flex gap-3 mt-1">
                        {stat.prepRate > 0 && <span className="text-xs text-green-600">📚 Siap {stat.prepRate}%</span>}
                        {stat.phoneRate > 0 && <span className="text-xs text-red-500">📱 Main HP {stat.phoneRate}%</span>}
                        {stat.drowsyRate > 0 && <span className="text-xs text-orange-500">😴 Ngantuk {stat.drowsyRate}%</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI summary insight */}
          {engSessions.length >= 5 && avgEngScore !== null && (
            <div className="mx-4 mb-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-xs text-gray-600 leading-relaxed">
                <span className="font-semibold">📊 Insight: </span>
                Dari {engSessions.length} sesi yang tercatat, {student.name.split(" ")[0]} rata-rata{" "}
                mendapat skor <span className="font-semibold">{avgEngScore}/10</span>{" "}
                ({scoreLabel(avgEngScore).text.toLowerCase()}).
                {engSessions.filter((s) => s.engagement?.playingPhone).length > 0 && (
                  ` Main HP tercatat di ${engSessions.filter((s) => s.engagement?.playingPhone).length} sesi (${Math.round(engSessions.filter((s) => s.engagement?.playingPhone).length / engSessions.length * 100)}%).`
                )}
                {engTrend === "up" && " Tren terbaru menunjukkan peningkatan keseriusan."}
                {engTrend === "down" && " Perlu perhatian — tren terbaru menurun."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── NILAI RAPOR ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Nilai Rapor</h2>
          <button onClick={() => openRapor()}
            className="text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
            + Input Rapor
          </button>
        </div>

        {raporCorrelation.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-5 text-center">
            <p className="text-xl mb-1">📋</p>
            <p className="text-sm text-gray-400">Belum ada nilai rapor.</p>
            <p className="text-xs text-gray-300 mt-0.5">Tap "+ Input Rapor" untuk catat nilai dari sekolah</p>
          </div>
        ) : (
          <div className="space-y-3">
            {raporCorrelation.map((r) => (
              <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                  <p className="font-semibold text-sm">{semesterLabel(r.semester)}</p>
                  <div className="flex items-center gap-2">
                    {r.avgEng !== null && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ color: scoreLabel(r.avgEng).color, background: scoreLabel(r.avgEng).bg }}>
                        Skor les: {r.avgEng}/10
                      </span>
                    )}
                    <button onClick={() => openRapor(r.semester)} className="text-xs text-gray-400 hover:text-blue-500">✏️</button>
                    <button onClick={async () => { await deleteRaporGrade(r.id); msg("Dihapus."); }}
                      className="text-xs text-gray-300 hover:text-red-400">✕</button>
                  </div>
                </div>
                <div className="p-3 space-y-1.5">
                  {r.grades.map((g) => {
                    // Find avg engagement for this subject in this semester
                    const { start, end } = semesterDateRange(r.semester);
                    const sessForSub = engSessions.filter((s) =>
                      s.date >= start && s.date <= end && s.subjects.includes(g.subject)
                    );
                    const subEng = sessForSub.length > 0
                      ? Math.round(sessForSub.reduce((s, x) => s + x.engagement!.score, 0) / sessForSub.length * 10) / 10
                      : null;
                    return (
                      <div key={g.subject} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">{g.subject}</span>
                        <div className="flex items-center gap-2">
                          {subEng !== null && (
                            <span className="text-xs text-gray-400">Les: {subEng}/10</span>
                          )}
                          <span className="text-sm font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg">
                            {g.grade}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {r.notes && <p className="text-xs text-gray-400 italic mt-1 pt-1 border-t border-gray-100">"{r.notes}"</p>}
                  {r.avgEng !== null && r.sessionCount > 0 && (
                    <p className="text-xs text-gray-400 mt-1 pt-1 border-t border-gray-100">
                      {r.sessionCount} sesi les tercatat · rata-rata skor {r.avgEng}/10 ({scoreLabel(r.avgEng).text})
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── JADWAL MENDATANG ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Jadwal Mendatang</h2>
          <span className="text-xs text-gray-400 font-medium">{(upcomingSched ?? []).length} jadwal</span>
        </div>
        {(upcomingSched ?? []).length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-6 text-center">
            <p className="text-2xl mb-1">📅</p>
            <p className="text-sm text-gray-400">Belum ada jadwal mendatang</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(upcomingSched ?? []).map((s) => (
              <div key={s.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center justify-between gap-3 cursor-pointer hover:border-blue-200 transition-colors"
                onClick={() => openEditSched(s)}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {s.date === today && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">Hari ini</span>}
                    {s.seriesId && <span className="text-xs text-gray-400">🔁 Rutin</span>}
                  </div>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">{dayLabel(s.date)}</p>
                  <p className="text-xs text-gray-400">{s.time ? `${s.time} · ` : ""}{s.durationHours} jam</p>
                </div>
                <span className="text-gray-300 text-xs flex-shrink-0">✏️ Edit</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── RIWAYAT SESI ── */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Riwayat Sesi</h2>
        {byMonth.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-2xl border border-gray-100">
            <p className="text-3xl mb-2">📚</p>
            <p className="text-gray-400 text-sm">Belum ada sesi yang dicatat.</p>
            <button onClick={() => navigate("/capture")}
              className="mt-3 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold">
              Catat Sesi Pertama
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {byMonth.map(([month, data]) => (
              <div key={month} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <p className="font-semibold text-sm">{monthLabel(month)}</p>
                  <p className="text-xs text-gray-500 font-medium">{data.sessions.length} sesi · {data.totalHours}j</p>
                </div>
                <div className="divide-y divide-gray-50">
                  {data.sessions.map((s) => {
                    const eng = s.engagement;
                    return (
                      <div key={s.id} className="px-4 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-800">
                              {(s.subjects ?? []).join(", ") || "Sesi umum"}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {dayLabel(s.date).split(",")[1]?.trim() ?? s.date.slice(5)}
                              {s.time ? ` · ${s.time}` : ""}
                              {` · ${s.durationHours}j`}
                              {s.mood ? ` · ${s.mood}` : ""}
                            </p>
                            {s.shortNote && <p className="text-xs text-gray-500 mt-1 italic">"{s.shortNote}"</p>}
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-medium">
                              {s.durationHours}j
                            </span>
                            {eng && (() => {
                              const { color, bg } = scoreLabel(eng.score);
                              return (
                                <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold" style={{ color, background: bg }}>
                                  {eng.score}/10
                                  {eng.playingPhone ? " 📱" : ""}
                                  {eng.drowsy ? " 😴" : ""}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── RAPOR INPUT MODAL ── */}
      {showRapor && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-end" onClick={() => setShowRapor(false)}>
          <div className="bg-white w-full rounded-t-2xl pb-8 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-lg">Input Nilai Rapor</h3>
              <button onClick={() => setShowRapor(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label">Semester</label>
                <select className="input" value={raporSem} onChange={(e) => setRaporSem(e.target.value)}>
                  {SEMESTERS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">Nilai per Mapel</label>
                  <button type="button"
                    onClick={() => setRaporGrades((prev) => [...prev, { subject: "", grade: "" }])}
                    className="text-xs text-blue-600 font-semibold">+ Tambah Mapel</button>
                </div>
                <div className="space-y-2">
                  {raporGrades.map((g, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input className="input flex-1 text-sm" placeholder="Mata pelajaran"
                        value={g.subject}
                        onChange={(e) => setRaporGrades((prev) => prev.map((x, j) => j === i ? { ...x, subject: e.target.value } : x))} />
                      <input className="input w-24 text-sm text-center font-bold" placeholder="Nilai"
                        value={g.grade}
                        onChange={(e) => setRaporGrades((prev) => prev.map((x, j) => j === i ? { ...x, grade: e.target.value } : x))} />
                      <button type="button" onClick={() => setRaporGrades((prev) => prev.filter((_, j) => j !== i))}
                        className="text-gray-300 hover:text-red-400 text-lg leading-none flex-shrink-0">✕</button>
                    </div>
                  ))}
                  {raporGrades.length === 0 && (
                    <button type="button"
                      onClick={() => setRaporGrades([{ subject: "", grade: "" }])}
                      className="w-full py-2 border border-dashed border-gray-300 rounded-xl text-sm text-gray-400 hover:border-blue-300 hover:text-blue-400 transition-colors">
                      + Tambah nilai
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="label">Catatan <span className="text-gray-400 font-normal">(opsional)</span></label>
                <textarea className="input" rows={2} placeholder="Catatan dari guru sekolah, komentar umum..."
                  value={raporNotes} onChange={(e) => setRaporNotes(e.target.value)} />
              </div>

              <button onClick={handleSaveRapor} disabled={raporSaving}
                className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {raporSaving ? "Menyimpan..." : "Simpan Nilai Rapor"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT SCHEDULE MODAL ── */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-end" onClick={() => setEditTarget(null)}>
          <div className="bg-white w-full rounded-t-2xl pb-8 max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-lg">Edit Jadwal</h3>
                <p className="text-xs text-gray-400">{dayLabel(editTarget.date)}{editTarget.seriesId ? " · Sesi berulang 🔁" : ""}</p>
              </div>
              <button onClick={() => setEditTarget(null)} className="text-gray-400 text-xl">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label">Tanggal{editTarget.seriesId && editMode !== "this" && <span className="ml-2 text-xs text-gray-400 font-normal">(hanya bisa diubah untuk sesi ini saja)</span>}</label>
                <input className="input" type="date" value={editDate}
                  disabled={!!editTarget.seriesId && editMode !== "this"}
                  onChange={(e) => setEditDate(e.target.value)} />
              </div>
              <div>
                <label className="label">Jam Mulai</label>
                <input className="input" type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} />
              </div>
              <div>
                <label className="label">Durasi</label>
                <div className="flex flex-wrap gap-2">
                  {DURATIONS.map((d) => (
                    <button key={d} type="button" onClick={() => setEditDuration(d)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${editDuration === d ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300"}`}>
                      {d}j
                    </button>
                  ))}
                </div>
              </div>
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
              <button onClick={handleSaveEdit} disabled={editSaving}
                className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {editSaving ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
              <div className="border-t border-gray-100 pt-3">
                {!showCancelSect ? (
                  <button onClick={() => setShowCancelSect(true)}
                    className="w-full py-2.5 rounded-xl text-sm font-medium text-red-500 bg-red-50 hover:bg-red-100 transition-colors">
                    Batalkan Jadwal Ini
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-red-600 mb-2">Batalkan — pilih scope:</p>
                    {editTarget.seriesId ? (
                      <>
                        <button onClick={() => handleCancel("this")} className="w-full text-left px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-sm font-medium border border-gray-200">Sesi ini saja</button>
                        <button onClick={() => handleCancel("future")} className="w-full text-left px-4 py-3 rounded-xl bg-orange-50 text-sm font-medium text-orange-700 border border-orange-200">Hari ini dan semua sesi berikutnya</button>
                        <button onClick={() => handleCancel("all")} className="w-full text-left px-4 py-3 rounded-xl bg-red-50 text-sm font-medium text-red-600 border border-red-200">Semua sesi dalam seri ini</button>
                      </>
                    ) : (
                      <button onClick={() => handleCancel("this")} className="w-full px-4 py-3 rounded-xl bg-red-50 text-red-600 font-medium text-sm border border-red-200">Ya, batalkan sesi ini</button>
                    )}
                    <button onClick={() => setShowCancelSect(false)} className="w-full text-center text-gray-400 text-sm py-1">Jangan batalkan</button>
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
