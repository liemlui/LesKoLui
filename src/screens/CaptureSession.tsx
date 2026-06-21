import { useState, useRef, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  listStudents, getStudent, createSession, recentShortNotes,
  createHomework, createFollowUp, listPendingHomework, listPendingFollowUps,
  getLastDoneSession, getSettings,
} from "../db/repos";
import { compressPhoto } from "../lib/foto";
import { todayWIB, dayLabel } from "../lib/format";
import { calcEngagementScore, scoreLabel } from "../lib/engagement";
import { MIN_DURATION } from "../db/types";
import type { Student, Session, Homework, FollowUpItem } from "../db/types";

const DURATIONS = [1, 1.5, 2, 2.5, 3, 3.5, 4];
const MOODS = [
  { v: "Semangat", icon: "🔥" },
  { v: "Fokus",    icon: "🎯" },
  { v: "Biasa",    icon: "😐" },
  { v: "Lelah",    icon: "😴" },
  { v: "Kesulitan",icon: "😰" },
];

function maxBackDate(days = 14): string {
  const [y, m, d] = todayWIB().split("-").map(Number);
  const dt = new Date(y, m - 1, d - days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

function addDaysToDate(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

function buildWaMessage(
  student: Student,
  session: { date: string; subjects: string[]; durationHours: number; shortNote: string; topic?: string; predictedGrade?: string },
  hwItems: { title: string; subject: string; dueAt: string }[],
  followUps: string[],
  tutorName: string
): string {
  const name = student.parentContact.name ? `Pak/Bu ${student.parentContact.name}` : `Orang tua ${student.name}`;
  const lines: string[] = [
    `Halo ${name}, 👋`,
    ``,
    `Sesi les *${student.name}* (${dayLabel(session.date)}) sudah selesai. 📚`,
    ``,
    session.subjects.length > 0 ? `*Mapel:* ${session.subjects.join(", ")}` : "",
    `*Durasi:* ${session.durationHours} jam`,
    session.shortNote ? `*Catatan:* ${session.shortNote}` : "",
    session.topic ? `*Topik:* ${session.topic}` : "",
    session.predictedGrade ? `*Prediksi nilai:* ${session.predictedGrade}` : "",
  ].filter((l) => l !== "");

  if (hwItems.length > 0) {
    lines.push(``, `📋 *PR yang diberikan:*`);
    hwItems.forEach((h) =>
      lines.push(`• ${h.title}${h.dueAt ? ` _(deadline: ${h.dueAt})_` : ""}`)
    );
  }

  if (followUps.length > 0) {
    lines.push(``, `🎯 *Fokus sesi berikutnya:*`);
    followUps.forEach((f) => lines.push(`• ${f}`));
  }

  lines.push(``, `Terima kasih, salam 🙏`, tutorName || "Ko Lui");
  return lines.join("\n");
}

export default function CaptureSession() {
  const students = useLiveQuery(() => listStudents(true), []);
  const allNotes = useLiveQuery(() => recentShortNotes(50), []);
  const settings = useLiveQuery(() => getSettings(), []);

  const today = todayWIB();

  // Main form
  const [studentId,      setStudentId]      = useState("");
  const [currentStudent, setCurrentStudent] = useState<Student | undefined>();
  const [studentSubjects,setStudentSubjects] = useState<string[]>([]);
  const [subjects,       setSubjects]        = useState<string[]>([]);
  const [showCustom,     setShowCustom]      = useState(false);
  const [customSubject,  setCustomSubject]   = useState("");
  const [shortNote,      setShortNote]       = useState("");
  const [photo,          setPhoto]           = useState<Blob | undefined>();
  const [photoUrl,       setPhotoUrl]        = useState<string | undefined>();
  const [duration,       setDuration]        = useState(MIN_DURATION);
  const [mood,           setMood]            = useState<string | undefined>();
  const [topic,          setTopic]           = useState("");
  const [needsWork,      setNeedsWork]       = useState("");
  const [predictedGrade, setPredictedGrade]  = useState("");
  const [sessionDate,    setSessionDate]     = useState(today);
  const [showDetail,     setShowDetail]      = useState(false);
  const [saving,         setSaving]          = useState(false);
  const [message,        setMessage]         = useState("");

  // Engagement indicators
  const [engPrepared, setEngPrepared] = useState(false);
  const [engFocused,  setEngFocused]  = useState(false);
  const [engDrowsy,   setEngDrowsy]   = useState(false);
  const [engPhone,    setEngPhone]    = useState(false);
  const engTouched = engPrepared || engFocused || engDrowsy || engPhone;

  // Brief (loaded on student change)
  const [briefLastSession, setBriefLastSession] = useState<Session | undefined>();
  const [briefHW,          setBriefHW]          = useState<Homework[]>([]);
  const [briefFollowUps,   setBriefFollowUps]   = useState<FollowUpItem[]>([]);

  // Close-out state
  const [showCloseOut,   setShowCloseOut]   = useState(false);
  const [coSessionData,  setCoSessionData]  = useState<{
    id: string; date: string; subjects: string[]; durationHours: number;
    shortNote: string; topic?: string; predictedGrade?: string;
  } | null>(null);
  const [coHWItems,      setCoHWItems]      = useState<{title:string;subject:string;dueAt:string}[]>([]);
  const [coHWTitle,      setCoHWTitle]      = useState("");
  const [coHWSubject,    setCoHWSubject]    = useState("");
  const [coHWDueAt,      setCoHWDueAt]      = useState("");
  const [coFollowUps,    setCoFollowUps]    = useState<string[]>([]);
  const [coFollowUpText, setCoFollowUpText] = useState("");
  const [coSaving,       setCoSaving]       = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  // Photo URL lifecycle
  useEffect(() => {
    if (!photo) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhotoUrl(undefined);
      return;
    }
    const url = URL.createObjectURL(photo);
    setPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  // Load student + brief on student change
  useEffect(() => {
    if (!studentId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentStudent(undefined); setStudentSubjects([]); setSubjects([]);
      setBriefLastSession(undefined); setBriefHW([]); setBriefFollowUps([]);
      return;
    }
    Promise.all([
      getStudent(studentId),
      getLastDoneSession(studentId),
      listPendingHomework(studentId),
      listPendingFollowUps(studentId),
    ]).then(([stud, lastSess, hw, fu]) => {
      setCurrentStudent(stud);
      setStudentSubjects(stud?.subjects ?? []);
      setSubjects([]);
      setBriefLastSession(lastSess);
      setBriefHW(hw);
      setBriefFollowUps(fu);
    });
  }, [studentId]);

  const suggestions = shortNote.length > 1
    ? (allNotes ?? []).filter((n) => n.toLowerCase().includes(shortNote.toLowerCase()) && n !== shortNote).slice(0, 4)
    : [];

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { setPhoto(await compressPhoto(file)); }
    catch { setMessage("Gagal kompres foto"); }
    e.target.value = "";
  };

  const toggleSubject = (s: string) =>
    setSubjects((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);

  const resetForm = () => {
    setSubjects([]); setShowCustom(false); setCustomSubject("");
    setShortNote(""); setPhoto(undefined);
    setMood(undefined); setTopic(""); setNeedsWork(""); setPredictedGrade("");
    setEngPrepared(false); setEngFocused(false); setEngDrowsy(false); setEngPhone(false);
    setDuration(MIN_DURATION); setShowDetail(false); setSessionDate(today);
  };

  const handleSave = async () => {
    if (!studentId) { setMessage("Pilih murid dulu."); return; }
    if (studentSubjects.length > 0 && subjects.length === 0) {
      setMessage("Pilih minimal 1 mata pelajaran."); return;
    }
    if (!shortNote.trim()) { setMessage("Tulis catatan singkat."); return; }
    setSaving(true);
    try {
      const newId = await createSession({
        studentId,
        date: sessionDate,
        durationHours: duration,
        subjects: subjects.length > 0 ? subjects : [],
        photo,
        shortNote: shortNote.trim(),
        mood,
        topic: topic.trim() || undefined,
        needsWork: needsWork.trim() || undefined,
        predictedGrade: predictedGrade.trim() || undefined,
        engagement: engTouched ? {
          prepared: engPrepared, focused: engFocused,
          drowsy: engDrowsy, playingPhone: engPhone,
          score: calcEngagementScore({ prepared: engPrepared, focused: engFocused, drowsy: engDrowsy, playingPhone: engPhone }),
        } : undefined,
        status: "DONE",
      });

      // Setup close-out
      setCoSessionData({
        id: newId, date: sessionDate, subjects: subjects.length > 0 ? subjects : [],
        durationHours: duration, shortNote: shortNote.trim(),
        topic: topic.trim() || undefined, predictedGrade: predictedGrade.trim() || undefined,
      });
      setCoHWItems([]);
      setCoHWTitle(""); setCoHWSubject(subjects[0] ?? studentSubjects[0] ?? "");
      setCoHWDueAt(addDaysToDate(sessionDate, 7));
      // Pre-fill carry-forward from needsWork
      setCoFollowUps(needsWork.trim() ? [needsWork.trim()] : []);
      setCoFollowUpText("");
      setShowCloseOut(true);
    } catch (e) {
      setMessage("Gagal: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const addCoHW = () => {
    if (!coHWTitle.trim()) return;
    setCoHWItems((prev) => [...prev, { title: coHWTitle.trim(), subject: coHWSubject, dueAt: coHWDueAt }]);
    setCoHWTitle(""); setCoHWDueAt(addDaysToDate(sessionDate, 7));
  };

  const addCoFollowUp = () => {
    if (!coFollowUpText.trim()) return;
    setCoFollowUps((prev) => [...prev, coFollowUpText.trim()]);
    setCoFollowUpText("");
  };

  const handleCloseOutDone = async () => {
    if (!coSessionData || !studentId) { resetForm(); setShowCloseOut(false); return; }
    setCoSaving(true);
    try {
      for (const hw of coHWItems) {
        await createHomework({
          studentId, sessionId: coSessionData.id,
          subject: hw.subject, title: hw.title,
          assignedAt: coSessionData.date, dueAt: hw.dueAt || undefined,
          status: "assigned",
        });
      }
      for (const text of coFollowUps) {
        await createFollowUp({
          studentId, sourceSessionId: coSessionData.id,
          type: "continue-topic", text,
        });
      }
    } finally {
      setCoSaving(false);
      resetForm();
      setShowCloseOut(false);
      setCoSessionData(null);
      setMessage("Sesi + PR + catatan tersimpan ✓");
    }
  };

  if (!students) return <div className="p-4 text-gray-500">Memuat...</div>;

  const tutorName = settings?.tutorProfile?.name || "Ko Lui";
  const waNumber  = currentStudent?.parentContact.phone.replace(/^0/, "62").replace(/[^0-9]/g, "") ?? "";

  return (
    <div className="p-4 space-y-4 pb-24">
      <h1 className="text-2xl font-bold">Catat Sesi</h1>

      {message && (
        <div onClick={() => setMessage("")}
          className={`p-3 rounded-xl text-sm cursor-pointer font-medium ${message.includes("✓") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
          {message}
        </div>
      )}

      {/* Murid */}
      <div>
        <label className="label">Murid</label>
        <select className="input" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
          <option value="">Pilih murid...</option>
          {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* Tanggal */}
      <div>
        <label className="label">Tanggal Sesi</label>
        <input className="input" type="date" value={sessionDate}
          min={maxBackDate(14)} max={today}
          onChange={(e) => setSessionDate(e.target.value)} />
        {sessionDate !== today && (
          <p className="text-xs text-orange-500 mt-1">Merekam sesi masa lalu</p>
        )}
      </div>

      {studentId && (
        <>
          {/* ── PERSIAPAN SESI BRIEF ── */}
          {(briefLastSession || briefHW.length > 0 || briefFollowUps.length > 0) && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-2.5">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wide flex items-center gap-1.5">
                📋 Persiapan Sesi
              </p>
              {briefLastSession && (
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-amber-600">
                    Sesi terakhir — {dayLabel(briefLastSession.date).split(",")[1]?.trim() ?? briefLastSession.date.slice(5)}
                    {briefLastSession.subjects.length > 0 && ` (${briefLastSession.subjects.join(", ")})`}
                  </p>
                  <p className="text-xs text-gray-600 leading-relaxed">"{briefLastSession.shortNote}"</p>
                  {briefLastSession.topic && (
                    <p className="text-xs text-gray-500">💡 Topik: {briefLastSession.topic}</p>
                  )}
                  {briefLastSession.predictedGrade && (
                    <p className="text-xs text-gray-500">📊 Prediksi: {briefLastSession.predictedGrade}</p>
                  )}
                </div>
              )}
              {briefHW.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-red-600 mb-1">
                    📋 PR belum selesai ({briefHW.length}):
                  </p>
                  {briefHW.map((h) => (
                    <p key={h.id} className="text-xs text-gray-600 flex items-center gap-1">
                      <span className={h.status === "overdue" ? "text-red-500" : "text-amber-500"}>•</span>
                      <span className="font-medium">{h.title}</span>
                      <span className="text-gray-400">({h.subject})</span>
                      {h.dueAt && <span className={`text-xs ml-auto ${h.status === "overdue" ? "text-red-500 font-semibold" : "text-gray-400"}`}>deadline: {h.dueAt.slice(5)}</span>}
                    </p>
                  ))}
                </div>
              )}
              {briefFollowUps.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-blue-600 mb-1">🔁 Lanjutkan dari sesi lalu:</p>
                  {briefFollowUps.map((f) => (
                    <p key={f.id} className="text-xs text-gray-600">• {f.text}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Foto */}
          <input ref={fileRef} type="file" accept="image/*" capture="environment"
            onChange={handlePhoto} className="hidden" />
          {photoUrl ? (
            <div className="relative inline-block">
              <img src={photoUrl} alt="preview" className="h-36 w-36 object-cover rounded-xl shadow" />
              <button onClick={() => setPhoto(undefined)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center shadow-md">✕</button>
              <button onClick={() => fileRef.current?.click()}
                className="absolute bottom-1.5 right-1.5 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">Ganti</button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center justify-center gap-2 w-full py-4 rounded-xl border-2 border-dashed border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors">
              <span className="text-2xl">📷</span>
              <span className="font-medium text-sm">Ambil Foto Sesi (opsional)</span>
            </button>
          )}

          {/* Mapel */}
          <div>
            <label className="label">
              Mata Pelajaran
              {studentSubjects.length > 0
                ? <span className="text-gray-400 font-normal text-xs ml-1">(pilih yang relevan)</span>
                : <span className="text-gray-400 font-normal text-xs ml-1">(opsional)</span>}
            </label>
            <div className="flex flex-wrap gap-2 mt-1">
              {studentSubjects.map((s) => (
                <button key={s} type="button"
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${subjects.includes(s) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300"}`}
                  onClick={() => toggleSubject(s)}>{s}</button>
              ))}
              {subjects.filter((s) => !studentSubjects.includes(s)).map((s) => (
                <button key={s} type="button"
                  className="px-3 py-1.5 rounded-full text-sm font-medium border bg-purple-600 text-white border-purple-600 flex items-center gap-1"
                  onClick={() => setSubjects((prev) => prev.filter((x) => x !== s))}>
                  {s} <span className="text-purple-200 text-xs">✕</span>
                </button>
              ))}
              <button type="button"
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${showCustom ? "bg-purple-100 text-purple-700 border-purple-300" : "bg-white text-gray-500 border-dashed border-gray-300"}`}
                onClick={() => setShowCustom(!showCustom)}>
                + Lainnya
              </button>
            </div>
            {showCustom && (
              <div className="flex gap-2 mt-2">
                <input className="input flex-1" placeholder="Ketik mapel lain..." value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const val = customSubject.trim();
                      if (val && !subjects.includes(val)) setSubjects((prev) => [...prev, val]);
                      setCustomSubject(""); setShowCustom(false);
                    }
                  }} />
                <button type="button"
                  className="px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-semibold disabled:opacity-40"
                  disabled={!customSubject.trim()}
                  onClick={() => {
                    const val = customSubject.trim();
                    if (val && !subjects.includes(val)) setSubjects((prev) => [...prev, val]);
                    setCustomSubject(""); setShowCustom(false);
                  }}>Tambah</button>
              </div>
            )}
          </div>

          {/* Catatan singkat */}
          <div>
            <label className="label">Catatan Singkat</label>
            <textarea className="input" rows={2} value={shortNote}
              onChange={(e) => setShortNote(e.target.value)}
              placeholder="Apa yang dibahas hari ini?" />
            {suggestions.length > 0 && (
              <div className="mt-1 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                {suggestions.map((s) => (
                  <button key={s} type="button"
                    className="block w-full text-left text-sm text-blue-600 hover:bg-blue-50 px-3 py-2 border-b border-gray-100 last:border-0"
                    onClick={() => setShortNote(s)}>{s}</button>
                ))}
              </div>
            )}
          </div>

          {/* Durasi */}
          <div>
            <label className="label">Durasi</label>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <button key={d} type="button"
                  className={`px-3 py-2 rounded-xl text-sm font-semibold border transition-colors ${duration === d ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200"}`}
                  onClick={() => setDuration(d)}>{d}j</button>
              ))}
            </div>
          </div>

          {/* Mood */}
          <div>
            <label className="label">Mood Murid <span className="text-gray-400 font-normal text-xs">(opsional)</span></label>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((m) => (
                <button key={m.v} type="button"
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${mood === m.v ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200"}`}
                  onClick={() => setMood(mood === m.v ? undefined : m.v)}>
                  {m.icon} {m.v}
                </button>
              ))}
            </div>
          </div>

          {/* Indikator Keseriusan */}
          <div>
            <label className="label">Indikator Keseriusan <span className="text-gray-400 font-normal text-xs">(opsional)</span></label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setEngPrepared(!engPrepared)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${engPrepared ? "bg-green-500 text-white border-green-500 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-green-300"}`}>
                <span>📚</span> Sudah Siap
              </button>
              <button type="button" onClick={() => setEngFocused(!engFocused)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${engFocused ? "bg-blue-500 text-white border-blue-500 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"}`}>
                <span>🎯</span> Sangat Fokus
              </button>
              <button type="button" onClick={() => setEngPhone(!engPhone)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${engPhone ? "bg-red-500 text-white border-red-500 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-red-300"}`}>
                <span>📱</span> Main HP
              </button>
              <button type="button" onClick={() => setEngDrowsy(!engDrowsy)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${engDrowsy ? "bg-orange-500 text-white border-orange-500 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-orange-300"}`}>
                <span>😴</span> Mengantuk
              </button>
            </div>
            {engTouched && (() => {
              const score = calcEngagementScore({ prepared: engPrepared, focused: engFocused, drowsy: engDrowsy, playingPhone: engPhone });
              const { text, color, bg } = scoreLabel(score);
              return (
                <div className="mt-2 flex items-center gap-3 rounded-xl p-3" style={{ background: bg }}>
                  <div className="relative w-12 h-12 flex-shrink-0">
                    <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                      <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(0,0,0,.08)" strokeWidth="4" />
                      <circle cx="18" cy="18" r="14" fill="none" stroke={color} strokeWidth="4"
                        strokeDasharray={`${(score / 10) * 100 * 0.879} 100`} strokeLinecap="round" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold" style={{ color }}>{score}</span>
                  </div>
                  <div>
                    <p className="font-bold text-sm" style={{ color }}>{text}</p>
                    <p className="text-xs opacity-70" style={{ color }}>Skor: {score}/10</p>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Detail opsional */}
          <button type="button"
            className="flex items-center justify-center gap-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-4 py-2.5 rounded-xl transition-colors w-full"
            onClick={() => setShowDetail(!showDetail)}>
            {showDetail ? "▲ Sembunyikan detail" : "▼ Tambah detail (topik, prediksi nilai, PR)"}
          </button>

          {showDetail && (
            <div className="space-y-3 bg-gray-50 rounded-xl p-4">
              <div>
                <label className="label">Topik yang dibahas</label>
                <input className="input" placeholder="mis. Paper 3, Integral, Stoikiometri" value={topic}
                  onChange={(e) => setTopic(e.target.value)} />
              </div>
              <div>
                <label className="label">Perlu perhatian lebih</label>
                <input className="input" placeholder="mis. ketelitian angka, time management" value={needsWork}
                  onChange={(e) => setNeedsWork(e.target.value)} />
              </div>
              <div>
                <label className="label">Prediksi nilai</label>
                <input className="input" placeholder="mis. 5–6/7, B+" value={predictedGrade}
                  onChange={(e) => setPredictedGrade(e.target.value)} />
              </div>
            </div>
          )}

          <button onClick={handleSave} disabled={saving}
            className="w-full py-3.5 rounded-xl text-white font-semibold text-base transition-colors disabled:opacity-50"
            style={{ background: saving ? "#93c5fd" : "#2563eb" }}>
            {saving ? "Menyimpan..." : "Simpan Sesi"}
          </button>
        </>
      )}

      {/* ── CLOSE-OUT SHEET ── */}
      {showCloseOut && coSessionData && currentStudent && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-end">
          <div className="bg-white w-full rounded-t-2xl max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-green-500 px-5 py-4 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <span className="text-2xl">✅</span>
                <div>
                  <p className="font-bold text-white text-lg">Sesi Tersimpan!</p>
                  <p className="text-green-100 text-sm">
                    {currentStudent.name} · {dayLabel(coSessionData.date)} · {coSessionData.durationHours}j
                    {coSessionData.subjects.length > 0 && ` · ${coSessionData.subjects.join(", ")}`}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Section A: PR */}
              <div>
                <p className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  📋 Tambah PR <span className="text-xs font-normal text-gray-400">(opsional)</span>
                </p>
                {/* Add HW form */}
                <div className="space-y-2 bg-gray-50 rounded-xl p-3">
                  <input className="input text-sm" placeholder="Judul PR (mis. Latihan soal Paper 2)"
                    value={coHWTitle} onChange={(e) => setCoHWTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addCoHW()} />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Mapel</p>
                      {studentSubjects.length > 0 ? (
                        <select className="input text-sm" value={coHWSubject} onChange={(e) => setCoHWSubject(e.target.value)}>
                          <option value="">Pilih mapel</option>
                          {studentSubjects.map((s) => <option key={s} value={s}>{s}</option>)}
                          {coSessionData.subjects.filter((s) => !studentSubjects.includes(s)).map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      ) : (
                        <input className="input text-sm" placeholder="Mapel" value={coHWSubject}
                          onChange={(e) => setCoHWSubject(e.target.value)} />
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Deadline</p>
                      <input className="input text-sm" type="date" value={coHWDueAt}
                        min={today} onChange={(e) => setCoHWDueAt(e.target.value)} />
                    </div>
                  </div>
                  <button type="button" onClick={addCoHW} disabled={!coHWTitle.trim()}
                    className="w-full py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-40 hover:bg-blue-700 transition-colors">
                    + Tambah PR
                  </button>
                </div>
                {/* HW list */}
                {coHWItems.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {coHWItems.map((hw, i) => (
                      <div key={i} className="flex items-center gap-2 bg-blue-50 rounded-xl px-3 py-2">
                        <span className="text-blue-400 text-sm">📋</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{hw.title}</p>
                          <p className="text-xs text-gray-400">{hw.subject}{hw.dueAt ? ` · deadline ${hw.dueAt.slice(5)}` : ""}</p>
                        </div>
                        <button onClick={() => setCoHWItems((prev) => prev.filter((_, j) => j !== i))}
                          className="text-gray-300 hover:text-red-400 flex-shrink-0">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section B: Carry-Forward */}
              <div>
                <p className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  🔁 Lanjutkan Sesi Berikutnya <span className="text-xs font-normal text-gray-400">(opsional)</span>
                </p>
                <div className="flex gap-2">
                  <input className="input flex-1 text-sm" placeholder="Topik/hal yang perlu dilanjutkan..."
                    value={coFollowUpText} onChange={(e) => setCoFollowUpText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addCoFollowUp()} />
                  <button onClick={addCoFollowUp} disabled={!coFollowUpText.trim()}
                    className="px-3 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold disabled:opacity-40">
                    +
                  </button>
                </div>
                {coFollowUps.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {coFollowUps.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 bg-amber-50 rounded-xl px-3 py-2">
                        <span className="text-amber-400 text-sm">🔁</span>
                        <p className="flex-1 text-sm text-gray-700">{f}</p>
                        <button onClick={() => setCoFollowUps((prev) => prev.filter((_, j) => j !== i))}
                          className="text-gray-300 hover:text-red-400">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section C: WA Update */}
              {waNumber && (
                <div>
                  <p className="text-sm font-bold text-gray-700 mb-2">💬 Update Orang Tua via WhatsApp</p>
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-2">
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed font-sans">
                      {buildWaMessage(currentStudent, coSessionData, coHWItems, coFollowUps, tutorName)}
                    </pre>
                  </div>
                  <a href={`https://wa.me/${waNumber}?text=${encodeURIComponent(buildWaMessage(currentStudent, coSessionData, coHWItems, coFollowUps, tutorName))}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-green-500 text-white font-semibold text-sm hover:bg-green-600 transition-colors">
                    <span className="text-lg">💬</span> Kirim via WhatsApp ke {currentStudent.parentContact.name || "Orang Tua"}
                  </a>
                </div>
              )}

              {/* Done button */}
              <button onClick={handleCloseOutDone} disabled={coSaving}
                className="w-full py-3.5 rounded-xl bg-gray-800 text-white font-bold text-base hover:bg-gray-900 disabled:opacity-50 transition-colors">
                {coSaving ? "Menyimpan..." : "Selesai"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
