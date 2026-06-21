import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  listStudents, getStudent, createSession, recentShortNotes,
  createHomework, createFollowUp, listPendingHomework, listPendingFollowUps,
  getLastDoneSession, getSettings, listDoneSessionsForDate,
  markSessionDone,
} from "../db/repos";
import { compressPhoto, stampPhoto } from "../lib/foto";
import SignaturePad from "../components/SignaturePad";
import { todayWIB, dayLabel } from "../lib/format";
import { calcEngagementScore, scoreLabel } from "../lib/engagement";
import { IB_MYP_SUBJECTS, IB_DP_GROUPS, getSubjectGroups, CURRICULUM_META } from "../lib/ibSubjects";
import { searchTopics } from "../lib/ibTopics";
import { SESSION_TYPE_OPTIONS, generateNote, generateEngagementNarrative } from "../lib/sessionTemplates";
import { BEHAVIOR_TAGS, RESPONSE_TAGS } from "../lib/responseTaxonomy";
import type { BehaviorTag, ResponseTag } from "../lib/responseTaxonomy";
import type { SessionType } from "../lib/sessionTemplates";
import { MIN_DURATION } from "../db/types";
import type { Student, Session, Homework, FollowUpItem } from "../db/types";
import PaginationControls from "../components/PaginationControls";
import { PAGE_SIZE, clampPage, paginateItems } from "../lib/pagination";

const DURATIONS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6];
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const scheduleId = searchParams.get("scheduleId") ?? undefined;

  const students = useLiveQuery(() => listStudents(true), []);
  const allNotes = useLiveQuery(() => recentShortNotes(50), []);
  const settings = useLiveQuery(() => getSettings(), []);

  const today = todayWIB();

  // Main form
  const [studentId,      setStudentId]      = useState("");
  const [currentStudent, setCurrentStudent] = useState<Student | undefined>();
  const [studentSubjects,setStudentSubjects] = useState<string[]>([]);
  const [subjects,       setSubjects]        = useState<string[]>([]);
  const [showIBPicker,   setShowIBPicker]    = useState(false);
  const [ibTab,          setIbTab]           = useState<"MYP" | "DP">("MYP");
  const [ibCustom,       setIbCustom]        = useState("");
  const [shortNote,      setShortNote]       = useState("");
  const [photo,          setPhoto]           = useState<Blob | undefined>();
  const [photoUrl,       setPhotoUrl]        = useState<string | undefined>();
  const [signature,      setSignature]       = useState<Blob | undefined>();
  const [signatureUrl,   setSignatureUrl]    = useState<string | undefined>();
  const [showSigPad,     setShowSigPad]      = useState(false);
  const [duration,       setDuration]        = useState(MIN_DURATION);
  const [mood,           setMood]            = useState<string | undefined>();
  const [topic,          setTopic]           = useState("");
  const [needsWork,      setNeedsWork]       = useState("");
  const [predictedGrade, setPredictedGrade]  = useState("");
  const [sessionDate,    setSessionDate]     = useState(today);
  const [showDetail,     setShowDetail]      = useState(false);
  const [saving,         setSaving]          = useState(false);
  const [message,        setMessage]         = useState("");

  // Session type
  const [sessionType, setSessionType] = useState<SessionType | undefined>();

  // Engagement indicators
  const [engPrepared,       setEngPrepared]       = useState(false);
  const [engFocused,        setEngFocused]        = useState(false);
  const [engDrowsy,         setEngDrowsy]         = useState(false);
  const [engPhone,          setEngPhone]          = useState(false);
  const [engActiveAsking,   setEngActiveAsking]   = useState(false);
  const [engQuickLearner,   setEngQuickLearner]   = useState(false);
  const [engNeedsRepeat,    setEngNeedsRepeat]    = useState(false);
  const [engHwMissed,       setEngHwMissed]       = useState(false);
  const engTouched = engPrepared || engFocused || engDrowsy || engPhone ||
    engActiveAsking || engQuickLearner || engNeedsRepeat || engHwMissed;

  // Topic search
  const [topicSearch,    setTopicSearch]    = useState("");
  const [topicResults,   setTopicResults]   = useState<ReturnType<typeof searchTopics>>([]);

  // Behavior & response taxonomy tags
  const [behaviorTags,   setBehaviorTags]   = useState<string[]>([]);
  const [responseTag,    setResponseTag]    = useState<string | undefined>();
  const [showBehavior,   setShowBehavior]   = useState(false);
  const [activeTooltip,  setActiveTooltip]  = useState<{ tag: BehaviorTag | ResponseTag; type: "behavior" | "response" } | null>(null);

  // Conflict warning
  const [conflictWarn, setConflictWarn] = useState<string[]>([]);

  // Brief (loaded on student change)
  const [briefLastSession, setBriefLastSession] = useState<Session | undefined>();
  const [briefHW,          setBriefHW]          = useState<Homework[]>([]);
  const [briefFollowUps,   setBriefFollowUps]   = useState<FollowUpItem[]>([]);
  const [briefHwPage,      setBriefHwPage]      = useState(1);
  const [briefFollowPage,  setBriefFollowPage]  = useState(1);

  // Close-out state
  const [showCloseOut,   setShowCloseOut]   = useState(false);
  const [coSessionData,  setCoSessionData]  = useState<{
    id: string; date: string; subjects: string[]; durationHours: number;
    shortNote: string; topic?: string; predictedGrade?: string;
  } | null>(null);
  const [noHW,           setNoHW]           = useState(false);
  const [coHWItems,      setCoHWItems]      = useState<{title:string;subject:string;dueAt:string}[]>([]);
  const [coHWTitle,      setCoHWTitle]      = useState("");
  const [coHWSubject,    setCoHWSubject]    = useState("");
  const [coHWDueAt,      setCoHWDueAt]      = useState("");
  const [coFollowUps,    setCoFollowUps]    = useState<string[]>([]);
  const [coFollowUpText, setCoFollowUpText] = useState("");
  const [coSaving,       setCoSaving]       = useState(false);
  const [coHwPage,       setCoHwPage]       = useState(1);
  const [coFollowPage,   setCoFollowPage]   = useState(1);

  const fileRef = useRef<HTMLInputElement>(null);

  // Photo URL lifecycle
  useEffect(() => {
    if (!photo) { setPhotoUrl(undefined); return; }
    const url = URL.createObjectURL(photo);
    setPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  // Signature URL lifecycle
  useEffect(() => {
    if (!signature) { setSignatureUrl(undefined); return; }
    const url = URL.createObjectURL(signature);
    setSignatureUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [signature]);

  // Load scheduled session to pre-fill form
  useEffect(() => {
    if (!scheduleId) return;
    // Use the existing getStudent flow by importing db directly
    (async () => {
      const { db } = await import("../db/db");
      const session = await db.sessions.get(scheduleId);
      if (!session) return;
      setStudentId(session.studentId);
      setSessionDate(session.date);
      setDuration(session.durationHours);
      if (session.subjects?.length) setSubjects(session.subjects);
    })();
  }, [scheduleId]);

  // Conflict detection: check if another student already has a DONE session on the same date
  useEffect(() => {
    if (!studentId || !sessionDate) { setConflictWarn([]); return; }
    listDoneSessionsForDate(sessionDate).then((sessions) => {
      const others = sessions.filter((s) => s.studentId !== studentId);
      if (others.length > 0) {
        setConflictWarn(others.map((s) => s.studentId));
      } else {
        setConflictWarn([]);
      }
    });
  }, [studentId, sessionDate]);

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
  const safeBriefHwPage = clampPage(briefHwPage, briefHW.length);
  const paginatedBriefHW = paginateItems(briefHW, safeBriefHwPage);
  const safeBriefFollowPage = clampPage(briefFollowPage, briefFollowUps.length);
  const paginatedBriefFollowUps = paginateItems(briefFollowUps, safeBriefFollowPage);
  const safeCoHwPage = clampPage(coHwPage, coHWItems.length);
  const paginatedCoHWItems = paginateItems(coHWItems, safeCoHwPage);
  const safeCoFollowPage = clampPage(coFollowPage, coFollowUps.length);
  const paginatedCoFollowUps = paginateItems(coFollowUps, safeCoFollowPage);

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("File harus berupa gambar (JPG/PNG/WebP).");
      e.target.value = ""; return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setMessage("Foto terlalu besar (maks 50 MB)");
      e.target.value = "";
      return;
    }
    try {
      const compressed = await compressPhoto(file);
      const stamped    = await stampPhoto(compressed, sessionDate);
      setPhoto(stamped);
    } catch { setMessage("Gagal kompres foto"); }
    e.target.value = "";
  };

  const toggleSubject = (s: string) =>
    setSubjects((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);

  const resetForm = () => {
    setSubjects([]); setShowIBPicker(false); setIbCustom("");
    setShortNote(""); setPhoto(undefined);
    setMood(undefined); setTopic(""); setTopicSearch(""); setTopicResults([]);
    setNeedsWork(""); setPredictedGrade("");
    setEngPrepared(false); setEngFocused(false); setEngDrowsy(false); setEngPhone(false);
    setEngActiveAsking(false); setEngQuickLearner(false); setEngNeedsRepeat(false); setEngHwMissed(false);
    setBehaviorTags([]); setResponseTag(undefined); setShowBehavior(false); setActiveTooltip(null);
    setSignature(undefined); setShowSigPad(false);
    setDuration(MIN_DURATION); setShowDetail(false); setSessionDate(today);
    setSessionType(undefined); setConflictWarn([]);
    setNoHW(false);
    setCoHWItems([]); setCoHWTitle(""); setCoHWSubject(""); setCoHWDueAt("");
  };

  const handleSave = async () => {
    if (!studentId) { setMessage("Pilih murid dulu."); return; }
    if (studentSubjects.length > 0 && subjects.length === 0) {
      setMessage("Pilih minimal 1 mata pelajaran."); return;
    }
    if (!shortNote.trim()) { setMessage("Tulis catatan singkat."); return; }
    setSaving(true);
    const engData = engTouched ? {
      prepared: engPrepared, focused: engFocused,
      drowsy: engDrowsy, playingPhone: engPhone,
      activeAsking: engActiveAsking, quickLearner: engQuickLearner,
      needsRepetition: engNeedsRepeat, hwMissed: engHwMissed,
      score: calcEngagementScore({
        prepared: engPrepared, focused: engFocused, drowsy: engDrowsy, playingPhone: engPhone,
        activeAsking: engActiveAsking, quickLearner: engQuickLearner,
        needsRepetition: engNeedsRepeat, hwMissed: engHwMissed,
      }),
    } : undefined;
    try {
      let newId: string;
      if (scheduleId) {
        await markSessionDone(scheduleId, {
          subjects: subjects.length > 0 ? subjects : undefined,
          photo, shortNote: shortNote.trim(), mood,
          topic: topic.trim() || undefined,
          needsWork: needsWork.trim() || undefined,
          predictedGrade: predictedGrade.trim() || undefined,
          engagement: engData,
          behaviorTags: behaviorTags.length > 0 ? behaviorTags : undefined,
          responseTag: responseTag || undefined,
          signature: signature || undefined,
          durationHours: duration,
        });
        newId = scheduleId;
      } else {
        newId = await createSession({
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
          engagement: engData,
          behaviorTags: behaviorTags.length > 0 ? behaviorTags : undefined,
          responseTag: responseTag || undefined,
          signature: signature || undefined,
          status: "DONE",
        });
      }

      // Save PR items immediately (unless user explicitly said no PR)
      if (!noHW) {
        for (const hw of coHWItems) {
          await createHomework({
            studentId, sessionId: newId,
            subject: hw.subject, title: hw.title,
            assignedAt: sessionDate, dueAt: hw.dueAt || undefined,
            status: "assigned",
          });
        }
      }

      // Setup close-out (keep coHWItems for WA preview, don't reset)
      setCoSessionData({
        id: newId, date: sessionDate, subjects: subjects.length > 0 ? subjects : [],
        durationHours: duration, shortNote: shortNote.trim(),
        topic: topic.trim() || undefined, predictedGrade: predictedGrade.trim() || undefined,
      });
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
      // PR already saved in handleSave — only save follow-ups here
      for (const text of coFollowUps) {
        await createFollowUp({
          studentId, sourceSessionId: coSessionData.id,
          type: "continue-topic", text,
        });
      }
    } finally {
      setCoSaving(false);
      const savedStudentId = studentId;
      resetForm();
      setShowCloseOut(false);
      setCoSessionData(null);
      navigate("/students/" + savedStudentId);
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

      {/* Conflict warning */}
      {conflictWarn.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
          <p className="text-sm font-semibold text-orange-700">⚠️ Perhatian</p>
          <p className="text-xs text-orange-600 mt-0.5">
            Pada tanggal ini sudah ada sesi DONE untuk murid lain ({conflictWarn.length} sesi). Pastikan jadwal tidak bentrok.
          </p>
        </div>
      )}

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
                  {paginatedBriefHW.map((h) => (
                    <p key={h.id} className="text-xs text-gray-600 flex items-center gap-1">
                      <span className={h.status === "overdue" ? "text-red-500" : "text-amber-500"}>•</span>
                      <span className="font-medium">{h.title}</span>
                      <span className="text-gray-400">({h.subject})</span>
                      {h.dueAt && <span className={`text-xs ml-auto ${h.status === "overdue" ? "text-red-500 font-semibold" : "text-gray-400"}`}>deadline: {h.dueAt.slice(5)}</span>}
                    </p>
                  ))}
                  <PaginationControls
                    page={safeBriefHwPage}
                    total={briefHW.length}
                    onPageChange={setBriefHwPage}
                    label="PR"
                  />
                </div>
              )}
              {briefFollowUps.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-blue-600 mb-1">🔁 Lanjutkan dari sesi lalu:</p>
                  {paginatedBriefFollowUps.map((f) => (
                    <p key={f.id} className="text-xs text-gray-600">• {f.text}</p>
                  ))}
                  <PaginationControls
                    page={safeBriefFollowPage}
                    total={briefFollowUps.length}
                    onPageChange={setBriefFollowPage}
                    label="follow-up"
                  />
                </div>
              )}
            </div>
          )}

          {/* ── BUKTI KEHADIRAN: Foto + Tanda Tangan ── */}
          <div className="bg-gray-50 rounded-xl border border-gray-100 p-3.5 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">📋 Bukti Kehadiran <span className="font-normal normal-case">(opsional)</span></p>

            {/* Foto dengan timestamp otomatis */}
            <input ref={fileRef} type="file" accept="image/*" capture="environment"
              onChange={handlePhoto} className="hidden" />
            {photoUrl ? (
              <div className="relative inline-block">
                <img src={photoUrl} alt="preview" className="h-36 w-36 object-cover rounded-xl shadow" />
                <button onClick={() => setPhoto(undefined)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center shadow-md">✕</button>
                <button onClick={() => fileRef.current?.click()}
                  className="absolute bottom-1.5 right-1.5 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">Ganti</button>
                <span className="absolute top-1.5 left-1.5 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-full">📅 timestamp ✓</span>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()}
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl border-2 border-dashed border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors">
                <span className="text-xl">📷</span>
                <span className="font-medium text-sm">Foto Sesi <span className="text-xs">(timestamp otomatis)</span></span>
              </button>
            )}

            {/* Tanda tangan murid */}
            {signatureUrl ? (
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1.5">✍️ Tanda Tangan Murid</p>
                <div className="relative bg-white rounded-xl border border-gray-200 p-2">
                  <img src={signatureUrl} alt="TTD" className="max-h-20 w-full object-contain" />
                  <button onClick={() => { setSignature(undefined); setShowSigPad(false); }}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">✕</button>
                </div>
              </div>
            ) : showSigPad ? (
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1.5">✍️ Tanda Tangan Murid</p>
                <SignaturePad
                  key={studentId}
                  onSave={(blob) => { setSignature(blob); setShowSigPad(false); }}
                  onClear={() => setSignature(undefined)}
                />
              </div>
            ) : (
              <button type="button" onClick={() => setShowSigPad(true)}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors">
                <span className="text-lg">✍️</span>
                <span className="font-medium text-sm">Tanda Tangan Murid</span>
              </button>
            )}
          </div>

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
                className="px-3 py-1.5 rounded-full text-sm font-medium border bg-white text-gray-500 border-dashed border-gray-300 hover:border-purple-400 hover:text-purple-600 transition-colors"
                onClick={() => { setShowIBPicker(true); setIbTab("MYP"); }}>
                + Lainnya{currentStudent?.curriculum ? ` (${CURRICULUM_META[currentStudent.curriculum].shortLabel})` : ""}
              </button>
            </div>
          </div>

          {/* Tipe sesi */}
          <div>
            <label className="label">Tipe Sesi <span className="text-gray-400 font-normal text-xs">(opsional, untuk generate catatan)</span></label>
            <div className="flex flex-wrap gap-2 mt-1">
              {SESSION_TYPE_OPTIONS.map((opt) => (
                <button key={opt.value} type="button"
                  onClick={() => {
                    const newType = sessionType === opt.value ? undefined : opt.value;
                    setSessionType(newType);
                    if (newType && !shortNote.trim()) {
                      setShortNote(generateNote(newType, subjects[0] ?? studentSubjects[0], topic));
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${sessionType === opt.value ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"}`}>
                  <span>{opt.icon}</span> {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Catatan singkat */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label">Catatan Singkat</label>
              {sessionType && (
                <button type="button"
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  onClick={() => setShortNote(generateNote(sessionType, subjects[0] ?? studentSubjects[0], topic))}>
                  ⚡ Generate
                </button>
              )}
            </div>
            <textarea className="input" rows={2} value={shortNote} maxLength={300}
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

          {/* Kondisi Belajar — mood + engagement unified */}
          <div className="bg-gray-50 rounded-xl p-3.5 space-y-3 border border-gray-100">
            <p className="text-sm font-semibold text-gray-700">
              Kondisi Belajar <span className="text-gray-400 font-normal text-xs">(opsional)</span>
            </p>

            {/* Semangat / energy */}
            <div>
              <p className="text-xs text-gray-400 font-medium mb-1.5">Semangat</p>
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

            {/* Observasi perilaku */}
            <div>
              <p className="text-xs text-gray-400 font-medium mb-1.5">Positif ✨</p>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button type="button" onClick={() => setEngPrepared(!engPrepared)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${engPrepared ? "bg-green-500 text-white border-green-500 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-green-300"}`}>
                  <span>📚</span> Sudah siap (+2)
                </button>
                <button type="button" onClick={() => setEngFocused(!engFocused)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${engFocused ? "bg-blue-500 text-white border-blue-500 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"}`}>
                  <span>🎯</span> Sangat fokus (+1)
                </button>
                <button type="button" onClick={() => setEngActiveAsking(!engActiveAsking)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${engActiveAsking ? "bg-teal-500 text-white border-teal-500 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-teal-300"}`}>
                  <span>🙋</span> Aktif bertanya (+1)
                </button>
                <button type="button" onClick={() => setEngQuickLearner(!engQuickLearner)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${engQuickLearner ? "bg-purple-500 text-white border-purple-500 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-purple-300"}`}>
                  <span>⚡</span> Cepat paham (+1)
                </button>
              </div>
              <p className="text-xs text-gray-400 font-medium mb-1.5">Perlu perhatian ⚠️</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setEngPhone(!engPhone)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${engPhone ? "bg-red-500 text-white border-red-500 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-red-300"}`}>
                  <span>📱</span> Main HP (−3)
                </button>
                <button type="button" onClick={() => setEngDrowsy(!engDrowsy)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${engDrowsy ? "bg-orange-500 text-white border-orange-500 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-orange-300"}`}>
                  <span>😴</span> Mengantuk (−2)
                </button>
                <button type="button" onClick={() => setEngNeedsRepeat(!engNeedsRepeat)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${engNeedsRepeat ? "bg-yellow-500 text-white border-yellow-500 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-yellow-300"}`}>
                  <span>🔄</span> Perlu diulang (−1)
                </button>
                <button type="button" onClick={() => setEngHwMissed(!engHwMissed)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${engHwMissed ? "bg-rose-500 text-white border-rose-500 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-rose-300"}`}>
                  <span>❌</span> PR tidak buat (−1)
                </button>
              </div>
            </div>

            {/* Skor */}
            {engTouched && (() => {
              const score = calcEngagementScore({
                prepared: engPrepared, focused: engFocused, drowsy: engDrowsy, playingPhone: engPhone,
                activeAsking: engActiveAsking, quickLearner: engQuickLearner,
                needsRepetition: engNeedsRepeat, hwMissed: engHwMissed,
              });
              const { text, color, bg } = scoreLabel(score);
              return (
                <div className="flex items-center gap-3 rounded-xl p-3" style={{ background: bg }}>
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
                    <p className="text-xs opacity-70" style={{ color }}>Skor keseriusan: {score}/10</p>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* ── OBSERVASI PERILAKU LANJUTAN ── */}
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <button type="button"
              className="flex items-center justify-between w-full px-4 py-3 bg-gray-50 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
              onClick={() => setShowBehavior(!showBehavior)}>
              <span>🧩 Observasi Perilaku Lanjutan <span className="font-normal text-gray-400">(opsional)</span></span>
              <div className="flex items-center gap-2">
                {behaviorTags.length > 0 && (
                  <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    {behaviorTags.length} dipilih
                  </span>
                )}
                <span className="text-gray-400">{showBehavior ? "▲" : "▼"}</span>
              </div>
            </button>

            {showBehavior && (
              <div className="p-4 space-y-4 bg-white">
                {/* Positive */}
                <div>
                  <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2">✨ Positif</p>
                  <div className="flex flex-wrap gap-2">
                    {BEHAVIOR_TAGS.filter(t => t.valence === "positive").map(tag => (
                      <div key={tag.id} className="flex items-center">
                        <button type="button"
                          onClick={() => setBehaviorTags(prev =>
                            prev.includes(tag.id) ? prev.filter(x => x !== tag.id) : [...prev, tag.id]
                          )}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-l-full text-xs font-medium border-y border-l transition-all ${
                            behaviorTags.includes(tag.id)
                              ? "bg-green-500 text-white border-green-500"
                              : "bg-white text-gray-600 border-gray-200 hover:border-green-300"
                          }`}>
                          <span>{tag.icon}</span> {tag.label}
                        </button>
                        <button type="button"
                          onClick={(e) => { e.stopPropagation(); setActiveTooltip({ tag, type: "behavior" }); }}
                          className={`px-1.5 py-1.5 rounded-r-full text-xs border-y border-r transition-all ${
                            behaviorTags.includes(tag.id)
                              ? "bg-green-400 text-white border-green-400"
                              : "bg-gray-50 text-gray-300 border-gray-200 hover:text-green-500"
                          }`}>
                          ⓘ
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Neutral */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">📊 Netral</p>
                  <div className="flex flex-wrap gap-2">
                    {BEHAVIOR_TAGS.filter(t => t.valence === "neutral").map(tag => (
                      <div key={tag.id} className="flex items-center">
                        <button type="button"
                          onClick={() => setBehaviorTags(prev =>
                            prev.includes(tag.id) ? prev.filter(x => x !== tag.id) : [...prev, tag.id]
                          )}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-l-full text-xs font-medium border-y border-l transition-all ${
                            behaviorTags.includes(tag.id)
                              ? "bg-gray-600 text-white border-gray-600"
                              : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                          }`}>
                          <span>{tag.icon}</span> {tag.label}
                        </button>
                        <button type="button"
                          onClick={(e) => { e.stopPropagation(); setActiveTooltip({ tag, type: "behavior" }); }}
                          className={`px-1.5 py-1.5 rounded-r-full text-xs border-y border-r transition-all ${
                            behaviorTags.includes(tag.id)
                              ? "bg-gray-500 text-white border-gray-500"
                              : "bg-gray-50 text-gray-300 border-gray-200 hover:text-gray-500"
                          }`}>
                          ⓘ
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Negative */}
                <div>
                  <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-2">⚠️ Negatif lanjutan</p>
                  <div className="flex flex-wrap gap-2">
                    {BEHAVIOR_TAGS.filter(t => t.valence === "negative").map(tag => (
                      <div key={tag.id} className="flex items-center">
                        <button type="button"
                          onClick={() => setBehaviorTags(prev =>
                            prev.includes(tag.id) ? prev.filter(x => x !== tag.id) : [...prev, tag.id]
                          )}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-l-full text-xs font-medium border-y border-l transition-all ${
                            behaviorTags.includes(tag.id)
                              ? "bg-orange-500 text-white border-orange-500"
                              : "bg-white text-gray-600 border-gray-200 hover:border-orange-300"
                          }`}>
                          <span>{tag.icon}</span> {tag.label}
                        </button>
                        <button type="button"
                          onClick={(e) => { e.stopPropagation(); setActiveTooltip({ tag, type: "behavior" }); }}
                          className={`px-1.5 py-1.5 rounded-r-full text-xs border-y border-r transition-all ${
                            behaviorTags.includes(tag.id)
                              ? "bg-orange-400 text-white border-orange-400"
                              : "bg-gray-50 text-gray-300 border-gray-200 hover:text-orange-500"
                          }`}>
                          ⓘ
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Detail opsional */}
          <button type="button"
            className="flex items-center justify-center gap-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-4 py-2.5 rounded-xl transition-colors w-full"
            onClick={() => setShowDetail(!showDetail)}>
            {showDetail ? "▲ Sembunyikan detail" : "▼ Tambah detail (topik, prediksi nilai, PR)"}
          </button>

          {showDetail && (
            <div className="space-y-3 bg-gray-50 rounded-xl p-4">

              {/* Kualitas Respons Akademik */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="label mb-0">Kualitas Respons Akademik</label>
                  <span className="text-xs text-gray-400">(pilih satu yang paling mewakili sesi ini)</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {RESPONSE_TAGS.map(tag => (
                    <div key={tag.id} className="flex items-center">
                      <button type="button"
                        onClick={() => setResponseTag(responseTag === tag.id ? undefined : tag.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-l-full text-xs font-medium border-y border-l transition-all ${
                          responseTag === tag.id
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                        }`}>
                        <span>{tag.icon}</span> {tag.label}
                      </button>
                      <button type="button"
                        onClick={(e) => { e.stopPropagation(); setActiveTooltip({ tag, type: "response" }); }}
                        className={`px-1.5 py-1.5 rounded-r-full text-xs border-y border-r transition-all ${
                          responseTag === tag.id
                            ? "bg-blue-500 text-white border-blue-500"
                            : "bg-gray-50 text-gray-300 border-gray-200 hover:text-blue-500"
                        }`}>
                        ⓘ
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Topik yang dibahas</label>
                <input className="input" maxLength={150} placeholder="Cari topik IB atau ketik bebas..." value={topicSearch}
                  onChange={(e) => {
                    const q = e.target.value;
                    setTopicSearch(q);
                    setTopic(q);
                    setTopicResults(searchTopics(q, subjects[0] ?? studentSubjects[0]));
                  }} />
                {topicResults.length > 0 && (
                  <div className="mt-1 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm max-h-40 overflow-y-auto">
                    {topicResults.map((t, i) => (
                      <button key={i} type="button"
                        className="block w-full text-left px-3 py-2 text-xs hover:bg-blue-50 border-b border-gray-50 last:border-0"
                        onClick={() => { setTopic(t.topic); setTopicSearch(t.topic); setTopicResults([]); }}>
                        <span className="font-semibold text-gray-700">{t.topic}</span>
                        <span className="text-gray-400 ml-2">{t.unit} · {t.subject}</span>
                      </button>
                    ))}
                  </div>
                )}
                {topic && topicResults.length === 0 && topicSearch.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1">✏️ Topik custom: "{topic}"</p>
                )}
              </div>
              <div>
                <label className="label">Perlu perhatian lebih</label>
                <input className="input" maxLength={150} placeholder="mis. ketelitian angka, time management" value={needsWork}
                  onChange={(e) => setNeedsWork(e.target.value)} />
              </div>
              <div>
                <label className="label">Prediksi nilai</label>
                <input className="input" placeholder="mis. 5–6/7, B+" value={predictedGrade}
                  onChange={(e) => setPredictedGrade(e.target.value)} />
              </div>
            </div>
          )}

          {/* ── PEKERJAAN RUMAH ── always visible */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-bold text-gray-700">📋 Pekerjaan Rumah</p>
              <button type="button"
                onClick={() => { setNoHW(!noHW); if (!noHW) setCoHWItems([]); }}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                  noHW
                    ? "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    : "bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100"
                }`}>
                {noHW ? "↩ Ada PR" : "📭 Tidak ada PR"}
              </button>
            </div>

            {noHW ? (
              <p className="text-xs text-gray-400 text-center py-3">Tidak ada PR untuk sesi ini</p>
            ) : (
              <div className="p-3 space-y-2">
                <input className="input text-sm" placeholder="Judul PR (mis. Latihan soal Paper 2)"
                  value={coHWTitle} onChange={(e) => setCoHWTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCoHW()} />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    {studentSubjects.length > 0 ? (
                      <select className="input text-sm" value={coHWSubject}
                        onChange={(e) => setCoHWSubject(e.target.value)}>
                        <option value="">Pilih mapel</option>
                        {studentSubjects.map((s) => <option key={s} value={s}>{s}</option>)}
                        {subjects.filter((s) => !studentSubjects.includes(s)).map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    ) : (
                      <input className="input text-sm" placeholder="Mapel" value={coHWSubject}
                        onChange={(e) => setCoHWSubject(e.target.value)} />
                    )}
                  </div>
                  <div>
                    <input className="input text-sm" type="date" value={coHWDueAt}
                      min={today} onChange={(e) => setCoHWDueAt(e.target.value)} />
                  </div>
                </div>
                <button type="button" onClick={addCoHW} disabled={!coHWTitle.trim()}
                  className="w-full py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-40 hover:bg-blue-700 transition-colors">
                  + Tambah PR
                </button>
                {coHWItems.length > 0 && (
                  <div className="space-y-1.5">
                    {paginatedCoHWItems.map((hw, i) => {
                      const idx = (safeCoHwPage - 1) * PAGE_SIZE + i;
                      return (
                        <div key={idx} className="flex items-center gap-2 bg-blue-50 rounded-xl px-3 py-2">
                          <span className="text-blue-400 text-sm">📋</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{hw.title}</p>
                            <p className="text-xs text-gray-400">{hw.subject}{hw.dueAt ? ` · deadline ${hw.dueAt.slice(5)}` : ""}</p>
                          </div>
                          <button onClick={() => setCoHWItems((prev) => prev.filter((_, j) => j !== idx))}
                            className="text-gray-300 hover:text-red-400 flex-shrink-0">✕</button>
                        </div>
                      );
                    })}
                    <PaginationControls
                      page={safeCoHwPage} total={coHWItems.length}
                      onPageChange={setCoHwPage} label="PR" />
                  </div>
                )}
              </div>
            )}
          </div>

          <button onClick={handleSave} disabled={saving}
            className="w-full py-3.5 rounded-xl text-white font-semibold text-base transition-colors disabled:opacity-50"
            style={{ background: saving ? "#93c5fd" : "#2563eb" }}>
            {saving ? "Menyimpan..." : "Simpan Sesi"}
          </button>
        </>
      )}

      {/* ── BEHAVIOR/RESPONSE TOOLTIP OVERLAY ── */}
      {activeTooltip && (
        <div
          className="fixed inset-0 z-[80]"
          onClick={() => setActiveTooltip(null)}>
          <div
            className="absolute bottom-24 left-4 right-4 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
            onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className={`px-4 py-3 flex items-center gap-3 ${
              activeTooltip.type === "response"
                ? "bg-blue-50"
                : (activeTooltip.tag as BehaviorTag).valence === "positive"
                  ? "bg-green-50"
                  : (activeTooltip.tag as BehaviorTag).valence === "neutral"
                    ? "bg-gray-50"
                    : "bg-orange-50"
            }`}>
              <span className="text-2xl">{activeTooltip.tag.icon}</span>
              <div className="flex-1">
                <p className="font-bold text-sm text-gray-800">{activeTooltip.tag.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {activeTooltip.type === "behavior" ? "Observasi perilaku" : "Kualitas respons akademik"}
                </p>
              </div>
              <button
                onClick={() => setActiveTooltip(null)}
                className="text-gray-300 hover:text-gray-600 text-xl w-7 h-7 flex items-center justify-center">
                ✕
              </button>
            </div>
            {/* Body */}
            <div className="px-4 py-3 space-y-3">
              <p className="text-sm text-gray-700 leading-relaxed">
                {activeTooltip.tag.description}
              </p>
              <div className={`rounded-xl px-3 py-2.5 text-xs leading-relaxed ${
                activeTooltip.type === "response"
                  ? "bg-blue-50 text-blue-800"
                  : "bg-amber-50 text-amber-800"
              }`}>
                <span className="font-semibold">
                  {activeTooltip.type === "behavior" ? "💡 Apa yang bisa dikatakan:" : "📌 Implikasi untuk tutor:"}
                </span>
                <br />
                {activeTooltip.type === "behavior"
                  ? (activeTooltip.tag as BehaviorTag).prompt
                  : (activeTooltip.tag as ResponseTag).teacherNote}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SUBJECT PICKER MODAL ── */}
      {showIBPicker && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-end justify-center" onClick={() => setShowIBPicker(false)}>
          <div className="bg-white w-full max-w-md rounded-t-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-lg">Pilih Mata Pelajaran</h3>
                {currentStudent?.curriculum && (
                  <p className="text-xs text-gray-400 mt-0.5">{CURRICULUM_META[currentStudent.curriculum].label}</p>
                )}
              </div>
              <button onClick={() => setShowIBPicker(false)} className="text-gray-400 text-xl">✕</button>
            </div>

            {currentStudent?.curriculum ? (
              /* ── Curriculum-aware groups (no tabs) ── */
              <div className="p-4 space-y-4">
                {getSubjectGroups(currentStudent.curriculum).map((grp) => (
                  <div key={grp.group}>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">{grp.group}</p>
                    <div className="flex flex-wrap gap-2">
                      {grp.subjects.map((s) => (
                        <button key={s} type="button"
                          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${subjects.includes(s) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"}`}
                          onClick={() => toggleSubject(s)}>
                          {subjects.includes(s) ? "✓ " : ""}{s}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* ── Fallback: MYP / DP tabs for students without curriculum ── */
              <>
                <div className="grid grid-cols-2 bg-gray-100 mx-4 mt-3 rounded-xl p-1">
                  {(["MYP", "DP"] as const).map((t) => (
                    <button key={t} onClick={() => setIbTab(t)}
                      className={`py-2 rounded-lg text-sm font-semibold transition-colors ${ibTab === t ? "bg-white shadow text-blue-700" : "text-gray-500"}`}>
                      {t === "MYP" ? "MYP (Middle Years)" : "DP (Diploma)"}
                    </button>
                  ))}
                </div>
                <div className="p-4 space-y-4">
                  {ibTab === "MYP" ? (
                    <div>
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">IB MYP Subjects</p>
                      <div className="flex flex-wrap gap-2">
                        {IB_MYP_SUBJECTS.map((s) => (
                          <button key={s} type="button"
                            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${subjects.includes(s) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"}`}
                            onClick={() => toggleSubject(s)}>
                            {subjects.includes(s) ? "✓ " : ""}{s}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {IB_DP_GROUPS.map((grp) => (
                        <div key={grp.group}>
                          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">{grp.group}</p>
                          <div className="flex flex-wrap gap-2">
                            {grp.subjects.map((s) => (
                              <button key={s} type="button"
                                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${subjects.includes(s) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"}`}
                                onClick={() => toggleSubject(s)}>
                                {subjects.includes(s) ? "✓ " : ""}{s}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Custom entry + selected summary + done — shared */}
            <div className="px-4 pb-4 space-y-4">
              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">Custom (tidak ada di daftar)</p>
                <div className="flex gap-2">
                  <input className="input flex-1 text-sm" placeholder="Ketik mapel lain..."
                    value={ibCustom} onChange={(e) => setIbCustom(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const val = ibCustom.trim();
                        if (val && !subjects.includes(val)) setSubjects((prev) => [...prev, val]);
                        setIbCustom("");
                      }
                    }} />
                  <button type="button" disabled={!ibCustom.trim()}
                    className="px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-semibold disabled:opacity-40"
                    onClick={() => {
                      const val = ibCustom.trim();
                      if (val && !subjects.includes(val)) setSubjects((prev) => [...prev, val]);
                      setIbCustom("");
                    }}>+</button>
                </div>
              </div>

              {subjects.length > 0 && (
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-xs text-blue-600 font-semibold mb-1.5">Dipilih ({subjects.length}):</p>
                  <div className="flex flex-wrap gap-1.5">
                    {subjects.map((s) => (
                      <span key={s} className="inline-flex items-center gap-1 text-xs bg-blue-600 text-white px-2.5 py-1 rounded-full font-medium">
                        {s}
                        <button onClick={() => setSubjects((prev) => prev.filter((x) => x !== s))}
                          className="text-blue-200 hover:text-white ml-0.5">✕</button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={() => setShowIBPicker(false)}
                className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors">
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CLOSE-OUT SHEET ── */}
      {showCloseOut && coSessionData && currentStudent && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-end justify-center">
          <div className="bg-white w-full max-w-md rounded-t-2xl max-h-[92vh] overflow-y-auto">
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

            {/* Narasi sesi */}
            {engTouched && (
              <div className="px-5 pt-4 pb-1">
                <p className="text-sm text-gray-600 italic leading-relaxed bg-gray-50 rounded-xl px-4 py-3">
                  {generateEngagementNarrative(
                    { prepared: engPrepared, focused: engFocused, activeAsking: engActiveAsking,
                      quickLearner: engQuickLearner, drowsy: engDrowsy, playingPhone: engPhone,
                      needsRepetition: engNeedsRepeat, hwMissed: engHwMissed,
                      score: calcEngagementScore({ prepared: engPrepared, focused: engFocused,
                        drowsy: engDrowsy, playingPhone: engPhone, activeAsking: engActiveAsking,
                        quickLearner: engQuickLearner, needsRepetition: engNeedsRepeat, hwMissed: engHwMissed }),
                    },
                    currentStudent.name,
                  )}
                </p>
              </div>
            )}

            <div className="p-5 space-y-5">
              {/* PR already saved at session save — show read-only summary if any */}
              {coHWItems.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">PR Diberikan ({coHWItems.length})</p>
                  <div className="space-y-1">
                    {coHWItems.map((hw, i) => (
                      <div key={i} className="flex items-center gap-2 bg-blue-50 rounded-xl px-3 py-2">
                        <span className="text-blue-400 text-xs">📋</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{hw.title}</p>
                          {hw.subject && <p className="text-xs text-gray-400">{hw.subject}{hw.dueAt ? ` · deadline ${hw.dueAt.slice(5)}` : ""}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                    {paginatedCoFollowUps.map((f, i) => {
                      const absoluteIndex = (safeCoFollowPage - 1) * PAGE_SIZE + i;
                      return (
                      <div key={absoluteIndex} className="flex items-center gap-2 bg-amber-50 rounded-xl px-3 py-2">
                        <span className="text-amber-400 text-sm">🔁</span>
                        <p className="flex-1 text-sm text-gray-700">{f}</p>
                        <button onClick={() => setCoFollowUps((prev) => prev.filter((_, j) => j !== absoluteIndex))}
                          className="text-gray-300 hover:text-red-400">✕</button>
                      </div>
                      );
                    })}
                    <PaginationControls
                      page={safeCoFollowPage}
                      total={coFollowUps.length}
                      onPageChange={setCoFollowPage}
                      label="follow-up"
                    />
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
