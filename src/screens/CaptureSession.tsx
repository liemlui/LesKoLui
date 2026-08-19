import Skeleton from "../components/Skeleton";
import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import {
  listStudents, getStudent, createSession, recentShortNotes,
  createFollowUp, listPendingFollowUps,
  getLastDoneSession, getSettings, listDoneSessionsForDate,
  markSessionDone,
} from "../db/repos";
import { compressPhoto, stampPhoto } from "../lib/foto";
import SignaturePad from "../components/SignaturePad";
import { todayWIB, dayLabel } from "../lib/format";
import { toggleArrayItem } from "../lib/arrays";
import { calcEngagementScore, scoreLabel } from "../lib/engagement";
import { IB_MYP_SUBJECTS, IB_DP_GROUPS, getSubjectGroups, CURRICULUM_META } from "../lib/ibSubjects";
import { searchTopics } from "../lib/ibTopics";
import { SESSION_TYPE_OPTIONS, generateNote, generateEngagementNarrative, generateRichNote } from "../lib/sessionTemplates";
import { BEHAVIOR_TAGS, RESPONSE_TAGS } from "../lib/responseTaxonomy";
import type { BehaviorTag, ResponseTag } from "../lib/responseTaxonomy";
import type { SessionType } from "../lib/sessionTemplates";
import { MIN_DURATION } from "../db/types";
import { draftShortNote, polishWhatsApp, estimateDraftNoteCost, estimatePolishWACost } from "../lib/aiClient";
import { AiCostModal } from "../components/AiCostModal";
import { SimpleMarkdown } from "../components/SimpleMarkdown";
import Breadcrumb from "../components/Breadcrumb";
import type { Student, Session, FollowUpItem } from "../db/types";
import PaginationControls from "../components/PaginationControls";
import { PAGE_SIZE, clampPage, paginateItems } from "../lib/pagination";
import { Z } from "../lib/zIndex";

const DURATIONS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6];
const MOODS = [
  { v: "Semangat", icon: "🔥" },
  { v: "Fokus",    icon: "🎯" },
  { v: "Biasa",    icon: "😐" },
  { v: "Lelah",    icon: "😴" },
  { v: "Kesulitan",icon: "😰" },
];

const STEPS = [
  { id: 1, label: "Jadwal",  icon: "🎯", desc: "Murid & waktu",       optional: false },
  { id: 2, label: "Materi",  icon: "📚", desc: "Mapel & topik",       optional: false },
  { id: 3, label: "Kondisi", icon: "😊", desc: "Mood & perilaku",     optional: true  },
  { id: 4, label: "Detail",  icon: "📋", desc: "Respons & nilai",    optional: true  },
  { id: 5, label: "Catatan", icon: "✏️", desc: "Ringkasan sesi",      optional: false },
  { id: 6, label: "Bukti",   icon: "📸", desc: "Foto & tanda tangan", optional: true  },
] as const;

type StepNum = 1 | 2 | 3 | 4 | 5 | 6;



function buildWaMessage(
  student: Student,
  session: { date: string; subjects: string[]; durationHours: number; shortNote: string; topic?: string },
  followUps: string[],
  tutorName: string
): string {
  const lines: string[] = [
    `Sesi les *${student.name}* (${dayLabel(session.date)}) sudah selesai. 📚`,
    ``,
    session.subjects.length > 0 ? `*Mapel:* ${session.subjects.join(", ")}` : "",
    `*Durasi:* ${session.durationHours} jam`,
    session.shortNote ? `*Catatan:* ${session.shortNote}` : "",
    session.topic ? `*Topik:* ${session.topic}` : "",
  ].filter((l) => l !== "");

  if (followUps.length > 0) {
    lines.push(``, `🎯 *Fokus sesi berikutnya:*`);
    followUps.forEach((f) => lines.push(`• ${f}`));
  }

  lines.push(``, `Terima kasih, salam 🙏`, tutorName || "Ko Lui");
  return lines.join("\n");
}

/**
 * CaptureSession — wizard 6 langkah untuk merekam sesi les yang selesai.
 * Step: Jadwal → Materi → Kondisi → Detail → Catatan → Bukti (foto & TTD, bisa ditunda).
 *
 * Mengintegrasikan: AI auto-fill catatan, foto kamera, tanda tangan digital,
 * PR follow-up, deteksi konflik jadwal, dan beberapa template catatan.
 *
 * @component
 * @route /capture
 */
export default function CaptureSession() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const scheduleId = searchParams.get("scheduleId") ?? undefined;

  const students = useLiveQuery(() => listStudents(true), []);
  const allNotes = useLiveQuery(() => recentShortNotes(50), []);
  const settings = useLiveQuery(() => getSettings(), []);

  const today = todayWIB();

  // Wizard step
  const [currentStep, setCurrentStep] = useState<StepNum>(1);

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
  const [predictedGrade, setPredictedGrade]  = useState("");
  const [topics,         setTopics]          = useState<string[]>([]);
  const [needsWork,      setNeedsWork]       = useState("");
  const [sessionDate,    setSessionDate]     = useState(today);
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
  const [engLate,           setEngLate]           = useState(false);
  const [engBathroom,       setEngBathroom]       = useState(false);
  const engTouched = engPrepared || engFocused || engDrowsy || engPhone ||
    engActiveAsking || engQuickLearner || engNeedsRepeat || engHwMissed || engLate || engBathroom;

  // Topic search
  const [topicSearch,    setTopicSearch]    = useState("");
  const [topicResults,   setTopicResults]   = useState<ReturnType<typeof searchTopics>>([]);
  // Topik bisa lebih dari satu: gabungan topik yang sudah dipilih (chips) +
  // teks pencarian yang belum di-commit, dipisah dengan "; ".
  const pendingTopicParts = topicSearch.split(";").map((p) => p.trim()).filter(Boolean);
  const allTopics = [...topics];
  for (const p of pendingTopicParts) if (!allTopics.includes(p)) allTopics.push(p);
  const topic = allTopics.join("; ");
  // Kalau mapel terpilih lebih dari satu, jangan bias pencarian ke satu mapel saja.
  const topicSearchSubject = subjects.length >= 2 ? undefined : subjects[0] ?? studentSubjects[0];

  // Behavior & response taxonomy tags
  const [behaviorTags,   setBehaviorTags]   = useState<string[]>([]);
  const [responseTag,    setResponseTag]    = useState<string | undefined>();
  const [showBehavior,   setShowBehavior]   = useState(false);
  const [activeTooltip,  setActiveTooltip]  = useState<{ tag: BehaviorTag | ResponseTag; type: "behavior" | "response" } | null>(null);

  // Skor keterlibatan dihitung + disimpan bila ada sinyal APAPUN: flag inti,
  // tag perilaku, respons akademik, atau mood. Jangan hanya engTouched — kalau
  // tutor hanya mencatat mood/tag, engagement (dan skornya) tetap harus tersimpan.
  const hasEngagementInput =
    engTouched || behaviorTags.length > 0 || Boolean(responseTag) || Boolean(mood);

  // Conflict warning
  const [conflictWarn, setConflictWarn] = useState<string[]>([]);

  // Brief (loaded on student change)
  const [briefLastSession, setBriefLastSession] = useState<Session | undefined>();
  const [briefFollowUps,   setBriefFollowUps]   = useState<FollowUpItem[]>([]);
  const [briefFollowPage,  setBriefFollowPage]  = useState(1);

  // Close-out state
  const [showCloseOut,   setShowCloseOut]   = useState(false);
  const [coSessionData,  setCoSessionData]  = useState<{
    id: string; date: string; subjects: string[]; durationHours: number;
    shortNote: string; topic?: string;
  } | null>(null);
  const [coFollowUps,    setCoFollowUps]    = useState<string[]>([]);
  const [coFollowUpText, setCoFollowUpText] = useState("");
  const [coSaving,       setCoSaving]       = useState(false);
  const [coFollowPage,   setCoFollowPage]   = useState(1);

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  // AI states
  const [aiNoteLoading,    setAiNoteLoading]    = useState(false);
  const [aiWaLoading,      setAiWaLoading]      = useState(false);
  const [aiWaText,         setAiWaText]         = useState<string | null>(null);
  const [aiError,          setAiError]          = useState("");
  const [showAiCostModal,  setShowAiCostModal]  = useState(false);
  const [showAiWaModal,    setShowAiWaModal]    = useState(false);
  // Draft AI tidak langsung menimpa catatan — tampil sebagai usulan dulu.
  const [aiNoteDraft,      setAiNoteDraft]      = useState<string | null>(null);
  const [aiNoteOriginal,   setAiNoteOriginal]   = useState("");
  const [aiNoteStyle,      setAiNoteStyle]      = useState<"rapikan" | "perluas" | "ringkas">("rapikan");

  useEffect(() => {
    if (!photo) { setPhotoUrl(undefined); return; }
    const url = URL.createObjectURL(photo);
    setPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  useEffect(() => {
    if (!signature) { setSignatureUrl(undefined); return; }
    const url = URL.createObjectURL(signature);
    setSignatureUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [signature]);

  useEffect(() => {
    if (!scheduleId) return;
    (async () => {
      const session = await db.sessions.get(scheduleId);
      if (!session) return;
      setStudentId(session.studentId);
      setSessionDate(session.date);
      setDuration(session.durationHours);
      if (session.subjects?.length) setSubjects(session.subjects);
    })();
  }, [scheduleId]);

  useEffect(() => {
    if (!studentId || !sessionDate) { setConflictWarn([]); return; }
    let cancelled = false;
    listDoneSessionsForDate(sessionDate).then((sessions) => {
      if (cancelled) return;
      const others = sessions.filter((s) => s.studentId !== studentId);
      setConflictWarn(others.length > 0 ? others.map((s) => s.studentId) : []);
    });
    return () => { cancelled = true; };
  }, [studentId, sessionDate]);

  useEffect(() => {
    if (!studentId) {
      setCurrentStudent(undefined); setStudentSubjects([]); setSubjects([]);
      setBriefLastSession(undefined); setBriefFollowUps([]);
      return;
    }
    Promise.all([
      getStudent(studentId),
      getLastDoneSession(studentId),
      listPendingFollowUps(studentId),
    ]).then(([stud, lastSess, fu]) => {
      setCurrentStudent(stud);
      setStudentSubjects(stud?.subjects ?? []);
      setSubjects([]);
      setBriefLastSession(lastSess);
      setBriefFollowUps(fu);
    });
  }, [studentId]);

  const suggestions = shortNote.length > 1
    ? (allNotes ?? []).filter((n) => n.toLowerCase().includes(shortNote.toLowerCase()) && n !== shortNote).slice(0, 4)
    : [];

  const safeBriefFollowPage = clampPage(briefFollowPage, briefFollowUps.length);
  const paginatedBriefFollowUps = paginateItems(briefFollowUps, safeBriefFollowPage);
  const safeCoFollowPage    = clampPage(coFollowPage, coFollowUps.length);
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
      e.target.value = ""; return;
    }
    try {
      const compressed = await compressPhoto(file);
      const stamped    = await stampPhoto(compressed, sessionDate);
      setPhoto(stamped);
    } catch { setMessage("Gagal kompres foto"); }
    e.target.value = "";
  };

  const toggleSubject = (s: string) => setSubjects((prev) => toggleArrayItem(prev, s));

  const addTopic = (raw: string) => {
    const clean = raw.trim();
    if (!clean) return;
    setTopics((prev) => (prev.includes(clean) ? prev : [...prev, clean]));
    setTopicSearch("");
    setTopicResults([]);
  };

  /** Tambah semua bagian dari input (pisahkan dengan ";") sebagai topik. */
  const addTopicsFromInput = () => {
    const parts = topicSearch.split(";").map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) return;
    setTopics((prev) => {
      const next = [...prev];
      for (const p of parts) if (!next.includes(p)) next.push(p);
      return next;
    });
    setTopicSearch("");
    setTopicResults([]);
  };

  const removeTopic = (t: string) => setTopics((prev) => prev.filter((x) => x !== t));

  const resetForm = () => {
    setSubjects([]); setShowIBPicker(false); setIbCustom("");
    setShortNote(""); setPhoto(undefined);
    setMood(undefined); setPredictedGrade(""); setTopics([]); setTopicSearch(""); setTopicResults([]);
    setNeedsWork("");
    setEngPrepared(false); setEngFocused(false); setEngDrowsy(false); setEngPhone(false);
    setEngLate(false); setEngBathroom(false);
    setEngActiveAsking(false); setEngQuickLearner(false); setEngNeedsRepeat(false); setEngHwMissed(false);
    setBehaviorTags([]); setResponseTag(undefined); setShowBehavior(false); setActiveTooltip(null);
    setSignature(undefined); setShowSigPad(false);
    setDuration(MIN_DURATION); setSessionDate(today);
    setSessionType(undefined); setConflictWarn([]);
    setCurrentStep(1); setMessage("");
  };

  const handleSave = async () => {
    if (!studentId) { setMessage("Pilih murid dulu."); return; }
    if (studentSubjects.length > 0 && subjects.length === 0) {
      setMessage("Pilih minimal 1 mata pelajaran."); return;
    }
    if (!shortNote.trim()) { setMessage("Tulis catatan singkat."); return; }
    setSaving(true);
    const engData = hasEngagementInput ? {
      prepared: engPrepared, focused: engFocused,
      drowsy: engDrowsy, playingPhone: engPhone,
      activeAsking: engActiveAsking, quickLearner: engQuickLearner,
      needsRepetition: engNeedsRepeat, hwMissed: engHwMissed,
      late: engLate, bathroomBreaks: engBathroom,
      score: calcEngagementScore({
        prepared: engPrepared, focused: engFocused, drowsy: engDrowsy, playingPhone: engPhone,
        activeAsking: engActiveAsking, quickLearner: engQuickLearner,
        needsRepetition: engNeedsRepeat, hwMissed: engHwMissed,
        late: engLate, bathroomBreaks: engBathroom,
        behaviorValences: behaviorTags.length > 0 ? behaviorTags.map(id => BEHAVIOR_TAGS.find(t => t.id === id)?.valence).filter(Boolean) as ("positive" | "neutral" | "negative")[] : undefined,
        responseTagId: responseTag,
        mood,
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

      setCoSessionData({
        id: newId, date: sessionDate, subjects: subjects.length > 0 ? subjects : [],
        durationHours: duration, shortNote: shortNote.trim(),
        topic: topic.trim() || undefined,
      });
      setCoFollowUps(needsWork.trim() ? [needsWork.trim()] : []);
      setCoFollowUpText("");
      setShowCloseOut(true);
    } catch (e) {
      setMessage("Gagal: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
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

  // Step validation & navigation
  const validateCurrentStep = (): string | null => {
    if (currentStep === 1 && !studentId) return "👤 Pilih murid dulu.";
    if (currentStep === 2) {
      if (studentSubjects.length > 0 && subjects.length === 0) return "📖 Pilih minimal 1 mata pelajaran.";
    }
    if (currentStep === 5 && !shortNote.trim()) return "✏️ Tulis catatan singkat dulu.";
    return null;
  };

  const goNext = () => {
    const err = validateCurrentStep();
    if (err) { setMessage(err); return; }
    setMessage("");
    if (currentStep < 6) setCurrentStep((s) => (s + 1) as StepNum);
    else handleSave();
  };

  const goBack = () => {
    setMessage("");
    if (currentStep > 1) setCurrentStep((s) => (s - 1) as StepNum);
  };

  const skipStep = () => {
    setMessage("");
    if (currentStep < 6) setCurrentStep((s) => (s + 1) as StepNum);
    else handleSave();
  };

  if (!students) return <Skeleton variant="card" lines={4} className="p-4" />;

  const tutorName    = settings?.tutorProfile?.name || "Ko Lui";
  const waNumber     = currentStudent?.parentContact.phone.replace(/^0/, "62").replace(/[^0-9]/g, "") ?? "";
  const stepMeta     = STEPS[currentStep - 1];
  const engScore     = hasEngagementInput ? calcEngagementScore({
    prepared: engPrepared, focused: engFocused, drowsy: engDrowsy, playingPhone: engPhone,
    activeAsking: engActiveAsking, quickLearner: engQuickLearner,
    needsRepetition: engNeedsRepeat, hwMissed: engHwMissed,
    late: engLate, bathroomBreaks: engBathroom,
    behaviorValences: behaviorTags.length > 0 ? behaviorTags.map(id => BEHAVIOR_TAGS.find(t => t.id === id)?.valence).filter(Boolean) as ("positive" | "neutral" | "negative")[] : undefined,
    responseTagId: responseTag,
    mood,
  }) : 0;
  const engScoreInfo = engScore > 0 ? scoreLabel(engScore) : null;

  const activeSubjects      = subjects.length ? subjects : studentSubjects;
  const activeBehaviorLabels = behaviorTags.length > 0
    ? behaviorTags.map((id) => BEHAVIOR_TAGS.find((t) => t.id === id)?.label).filter(Boolean) as string[]
    : [];
  const activeResponseLabel = responseTag
    ? RESPONSE_TAGS.find((t) => t.id === responseTag)?.label
    : undefined;

  /** Rangkum Cepat: rangkai semua data wizard jadi catatan gratis (tanpa AI). */
  const handleLocalGenerate = () => {
    setShortNote(generateRichNote({
      studentName: currentStudent?.name,
      sessionType,
      subjects: activeSubjects,
      topic: topic || undefined,
      mood,
      needsWork: needsWork || undefined,
      behaviorLabels: activeBehaviorLabels.length > 0 ? activeBehaviorLabels : undefined,
      responseLabel: activeResponseLabel,
      previousNote: briefLastSession?.shortNote,
      followUps: briefFollowUps.map((f) => f.text),
      engagement: {
        prepared: engPrepared, focused: engFocused, activeAsking: engActiveAsking,
        quickLearner: engQuickLearner, drowsy: engDrowsy, playingPhone: engPhone,
        needsRepetition: engNeedsRepeat, hwMissed: engHwMissed, late: engLate,
        bathroomBreaks: engBathroom, score: engScore,
      },
    }));
    setAiNoteDraft(null);
    setAiNoteOriginal("");
  };

  /** Tambahkan chip saran ke textbox (tidak menimpa ketikan yang sudah ada). */
  const appendNoteChip = (text: string) => {
    setShortNote((prev) => {
      const clean = text.trim();
      if (!clean) return prev;
      const next = prev.trim();
      return next ? `${next} ${clean}` : clean;
    });
    setAiNoteDraft(null);
    setAiNoteOriginal("");
  };

  return (
    <div className="pb-36">

      <Breadcrumb />

      {/* ── PAGE HEADER ── */}
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-2xl font-bold text-gray-800">📓 Catat Sesi</h1>
        <p className="text-xs text-gray-500 mt-0.5">Langkah {currentStep} dari {STEPS.length}</p>
      </div>

      {/* ── PROGRESS STEPPER ── */}
      <div className="px-4 mb-4">
        <div className="relative flex items-start justify-between">
          <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-200 z-0" />
          {STEPS.map((step) => {
            const done   = currentStep > step.id;
            const active = currentStep === step.id;
            return (
              <div key={step.id} className="flex flex-col items-center gap-1.5 z-10 relative flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all shadow-sm
                  ${done   ? "bg-green-500 text-white scale-95"
                  : active ? "bg-blue-600 text-white ring-4 ring-blue-100 scale-110"
                  :          "bg-white text-gray-500 border-2 border-gray-200"}`}>
                  {done ? "✓" : step.icon}
                </div>
                <span className={`text-[10px] font-bold tracking-wide transition-colors
                  ${active ? "text-blue-600" : done ? "text-green-600" : "text-gray-500"}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%`,
              background: "linear-gradient(90deg, #3b82f6, #60a5fa)",
            }}
          />
        </div>
      </div>

      {/* ── STEP HEADER CARD ── */}
      <div className="mx-4 mb-4 rounded-2xl border border-gray-100 bg-gradient-to-r from-gray-50 to-white px-4 py-3 flex items-center gap-3 shadow-sm">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-xl flex-shrink-0">
          {stepMeta.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-gray-800 text-base">{stepMeta.label}</h2>
          <p className="text-xs text-gray-500">{stepMeta.desc}</p>
        </div>
        {stepMeta.optional && (
          <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded-full font-semibold uppercase tracking-wide flex-shrink-0">
            opsional
          </span>
        )}
      </div>

      {/* ── MESSAGE ── */}
      {message && (
        <div className="mx-4 mb-3" onClick={() => setMessage("")}>
          <div className={`p-3 rounded-xl text-sm cursor-pointer font-medium ${
            message.includes("✓") ? "bg-green-50 text-green-700 border border-green-200"
            : "bg-red-50 text-red-600 border border-red-200"}`}>
            {message}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          STEP 1: JADWAL — Murid, Tanggal, Durasi
          ══════════════════════════════════════════ */}
      {currentStep === 1 && (
        <div className="px-4 space-y-4">

          {/* Murid */}
          <div>
            <label htmlFor="cs-murid" className="label">👤 Murid <span className="text-red-400">*</span></label>
            <select id="cs-murid" className="input" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              <option value="">Pilih murid...</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {/* Tanggal */}
          <div>
            <label htmlFor="cs-tanggal" className="label">📅 Tanggal Sesi</label>
            <input id="cs-tanggal" className="input" type="date" value={sessionDate}
              max={today}
              onChange={(e) => setSessionDate(e.target.value)} />
            {sessionDate !== today && (
              <p className="text-xs text-orange-500 mt-1">⏪ Merekam sesi masa lalu</p>
            )}
          </div>

          {/* Durasi */}
          <div>
            <label className="label">⏱️ Durasi</label>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <button key={d} type="button"
                  className={`px-3 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                    duration === d ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200"}`}
                  onClick={() => setDuration(d)}>{d}j</button>
              ))}
            </div>
          </div>

          {/* Tipe sesi */}
          <div>
            <label className="label">🗂️ Tipe Sesi <span className="text-gray-500 font-normal text-xs">(opsional)</span></label>
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
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    sessionType === opt.value ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"}`}>
                  <span>{opt.icon}</span> {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conflict warning */}
          {conflictWarn.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
              <p className="text-sm font-semibold text-orange-700">⚠️ Perhatian</p>
              <p className="text-xs text-orange-600 mt-0.5">
                Tanggal ini sudah ada sesi DONE untuk murid lain ({conflictWarn.length} sesi). Pastikan jadwal tidak bentrok.
              </p>
            </div>
          )}

          {/* Brief persiapan */}
          {studentId && (briefLastSession || briefFollowUps.length > 0) && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-2.5">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">📋 Persiapan Sesi</p>
              {briefLastSession && (
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-amber-600">
                    Sesi terakhir — {dayLabel(briefLastSession.date).split(",")[1]?.trim() ?? briefLastSession.date.slice(5)}
                    {briefLastSession.subjects.length > 0 && ` (${briefLastSession.subjects.join(", ")})`}
                  </p>
                  <p className="text-xs text-gray-600 leading-relaxed">"{briefLastSession.shortNote}"</p>
                  {briefLastSession.topic && <p className="text-xs text-gray-500">💡 Topik: {briefLastSession.topic}</p>}
                </div>
              )}
              {briefFollowUps.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-blue-600 mb-1">🔁 Lanjutkan dari sesi lalu:</p>
                  {paginatedBriefFollowUps.map((f) => <p key={f.id} className="text-xs text-gray-600">• {f.text}</p>)}
                  <PaginationControls page={safeBriefFollowPage} total={briefFollowUps.length} onPageChange={setBriefFollowPage} label="follow-up" />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════
          STEP 6: BUKTI — Foto & Tanda Tangan
          ══════════════════════════════════════════ */}
      {currentStep === 6 && (
        <div className="px-4 space-y-3">
          {/* Info: bisa diisi nanti */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2.5">
            <span className="text-amber-500 text-xl">⏭️</span>
            <div className="flex-1">
              <p className="text-xs font-bold text-amber-700">Foto & tanda tangan bisa diisi nanti</p>
              <p className="text-xs text-amber-600 mt-0.5">Lengkapi dari profil murid setelah sesi. Simpan dulu detailnya sekarang.</p>
            </div>
          </div>
          <button type="button" onClick={handleSave}
            className="w-full py-3 rounded-xl bg-amber-500 text-white font-bold text-sm hover:bg-amber-600 transition-colors shadow-sm">
            ⏭️ Nanti Saja — Simpan Tanpa Foto
          </button>

          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-500 font-medium">atau isi sekarang</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Kamera — capture langsung */}
          <input ref={cameraRef} type="file" accept="image/*" capture="environment"
            onChange={handlePhoto} className="hidden" />
          {/* Galeri — browse dari gallery / file picker */}
          <input ref={galleryRef} type="file" accept="image/*"
            onChange={handlePhoto} className="hidden" />
          <p className="text-xs text-gray-500 text-center -mt-2">💡 Di HP, tap ⋮ atau menu Browse untuk pilih folder</p>

          {/* Foto */}
          {photoUrl ? (
            <div className="relative">
              <img src={photoUrl} alt="preview" className="w-full h-52 object-cover rounded-2xl shadow-md" />
              <button aria-label="Hapus foto" onClick={() => setPhoto(undefined)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-7 h-7 text-sm flex items-center justify-center shadow-md"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              <div className="absolute bottom-2 right-2 flex gap-1.5">
                <button onClick={() => cameraRef.current?.click()}
                  className="bg-black/60 text-white text-xs px-2.5 py-1 rounded-full">📷 Kamera</button>
                <button onClick={() => galleryRef.current?.click()}
                  className="bg-black/60 text-white text-xs px-2.5 py-1 rounded-full">🖼️ Galeri</button>
              </div>
              <span className="absolute top-2 left-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full">📅 timestamp ✓</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => cameraRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 py-12 rounded-2xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors bg-gray-50">
                <span className="text-4xl">📷</span>
                <div className="text-center">
                  <p className="font-semibold text-sm">Ambil Foto</p>
                  <p className="text-xs mt-0.5 text-gray-500">Buka kamera</p>
                </div>
              </button>
              <button onClick={() => galleryRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 py-12 rounded-2xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-green-400 hover:text-green-500 transition-colors bg-gray-50">
                <span className="text-4xl">🖼️</span>
                <div className="text-center">
                  <p className="font-semibold text-sm">Pilih dari Galeri</p>
                  <p className="text-xs mt-0.5 text-gray-500">Cari di gallery</p>
                </div>
              </button>
            </div>
          )}

          {/* Tanda tangan */}
          {signatureUrl ? (
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1.5">✍️ Tanda Tangan Murid</p>
              <div className="relative bg-white rounded-xl border border-gray-200 p-2">
                <img src={signatureUrl} alt="TTD" className="max-h-24 w-full object-contain" />
                <button aria-label="Hapus tanda tangan" onClick={() => { setSignature(undefined); setShowSigPad(false); }}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
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
              className="flex flex-col items-center justify-center gap-3 w-full py-10 rounded-2xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-indigo-400 hover:text-indigo-500 transition-colors bg-gray-50">
              <span className="text-4xl">✍️</span>
              <div className="text-center">
                <p className="font-semibold text-sm">Tanda Tangan Murid</p>
                <p className="text-xs mt-0.5 text-gray-500">Tap untuk buka signature pad</p>
              </div>
            </button>
          )}

          {(photo || signature) && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2.5">
              <span className="text-green-500 text-xl">✅</span>
              <div>
                <p className="text-xs font-bold text-green-700">Bukti kehadiran siap!</p>
                <p className="text-xs text-green-600 mt-0.5">
                  {[photo ? "📷 Foto tersimpan" : null, signature ? "✍️ TTD tersimpan" : null].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════
          STEP 2: MATERI — Mapel & Topik
          ══════════════════════════════════════════ */}
      {currentStep === 2 && (
        <div className="px-4 space-y-4">

          {/* Mapel */}
          <div>
            <label className="label">
              📖 Mata Pelajaran
              {studentSubjects.length > 0
                ? <span className="text-red-400 ml-1">*</span>
                : <span className="text-gray-500 font-normal text-xs ml-1">(opsional)</span>}
            </label>
            <div className="flex flex-wrap gap-2 mt-1">
              {studentSubjects.map((s) => (
                <button key={s} type="button"
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    subjects.includes(s) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300"}`}
                  onClick={() => toggleSubject(s)}>{s}</button>
              ))}
              {subjects.filter((s) => !studentSubjects.includes(s)).map((s) => (
                <button key={s} type="button"
                  className="px-3 py-1.5 rounded-full text-sm font-medium border bg-purple-600 text-white border-purple-600 flex items-center gap-1"
                  onClick={() => setSubjects((prev) => prev.filter((x) => x !== s))}>
                  {s} <span className="text-purple-200 text-xs"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></span>
                </button>
              ))}
              <button type="button"
                className="px-3 py-1.5 rounded-full text-sm font-medium border bg-white text-gray-500 border-dashed border-gray-300 hover:border-purple-400 hover:text-purple-600 transition-colors"
                onClick={() => { setShowIBPicker(true); setIbTab("MYP"); }}>
                + Tambah Mapel{currentStudent?.curriculum ? ` (${CURRICULUM_META[currentStudent.curriculum].shortLabel})` : ""}
              </button>
            </div>
          </div>

          {/* Topik — search + multi-select */}
          <div>
            <label htmlFor="cs-topik" className="label">🎯 Topik <span className="text-gray-500 font-normal text-xs">(cari topik, pilih beberapa, atau ketik bebas — pisahkan dengan ;)</span></label>
            <div className="relative">
              <input id="cs-topik" className="input pr-8" maxLength={150}
                placeholder="Cari topik atau ketik custom — mis. Integral substitution; Essay structure..."
                value={topicSearch}
                onChange={(e) => {
                  const q = e.target.value;
                  setTopicSearch(q);
                  setTopicResults(searchTopics(q, {
                    subject: topicSearchSubject,
                    grade: currentStudent?.grade,
                    curriculum: currentStudent?.curriculum,
                  }));
                }}
                onFocus={() => {
                  if (topicSearch.trim()) setTopicResults(searchTopics(topicSearch, {
                    subject: topicSearchSubject,
                    grade: currentStudent?.grade,
                    curriculum: currentStudent?.curriculum,
                  }));
                }}
                onBlur={() => setTimeout(() => setTopicResults([]), 150)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTopicsFromInput();
                  }
                }}
              />
              {topicSearch && (
                <button type="button" tabIndex={-1}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { setTopicSearch(""); setTopicResults([]); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              )}
            </div>
            {/* Chip topik terpilih */}
            {topics.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {topics.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2.5 py-1 text-xs font-medium">
                    {t}
                    <button type="button" tabIndex={-1}
                      onClick={() => removeTopic(t)}
                      aria-label={`Hapus topik ${t}`}
                      className="text-blue-400 hover:text-blue-700 transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
            {/* Dropdown hasil pencarian */}
            {topicResults.length > 0 && (
              <div className="mt-1 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm max-h-52 overflow-y-auto">
                {topicResults.map((t, i) => (
                  <button key={`${t.topic}-${i}`} type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    className={`block w-full text-left px-3.5 py-2.5 border-b border-gray-50 last:border-0 hover:bg-blue-50 transition-colors ${topics.includes(t.topic) ? "bg-blue-50" : ""}`}
                    onClick={() => addTopic(t.topic)}>
                    <span className="font-semibold text-gray-800 text-sm">{t.topic}</span>
                    <span className="text-[11px] text-gray-500 ml-2">{t.gradeLabel} · {t.unit}</span>
                  </button>
                ))}
              </div>
            )}
            {/* Indikator topik custom */}
            {topicSearch.trim() && topicResults.length === 0 && (
              <button type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={addTopicsFromInput}
                className="text-xs text-gray-500 mt-1.5 hover:text-blue-600 transition-colors">
                ✏️ Tambah topik custom: "{topicSearch.trim()}" ↵
              </button>
            )}
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════
          STEP 3: KONDISI — Mood & Engagement
          ══════════════════════════════════════════ */}
      {currentStep === 3 && (
        <div className="px-4 space-y-4">

          {/* Quick Presets — isi sekali klik */}
          <div>
            <label className="label">⚡ Cepat <span className="text-gray-500 font-normal text-xs">(isi 1 detik)</span></label>
            <div className="flex flex-wrap gap-2">
              <button type="button"
                onClick={() => {
                  setMood("Fokus"); setEngPrepared(true); setEngFocused(true); setEngActiveAsking(true); setEngQuickLearner(false);
                  setEngDrowsy(false); setEngPhone(false); setEngNeedsRepeat(false); setEngHwMissed(false);
                  setEngLate(false); setEngBathroom(false);
                }}
                className="px-3 py-2 rounded-full text-sm font-semibold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors">
                ✨ Lancar
              </button>
              <button type="button"
                onClick={() => {
                  setMood("Biasa"); setEngPrepared(false); setEngFocused(false); setEngActiveAsking(false);
                  setEngQuickLearner(false); setEngDrowsy(false); setEngPhone(false); setEngNeedsRepeat(false); setEngHwMissed(false);
                  setEngLate(false); setEngBathroom(false);
                }}
                className="px-3 py-2 rounded-full text-sm font-semibold bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 transition-colors">
                😐 Biasa
              </button>
              <button type="button"
                onClick={() => {
                  setMood("Lelah"); setEngPrepared(false); setEngFocused(false); setEngActiveAsking(false);
                  setEngQuickLearner(false); setEngDrowsy(true); setEngPhone(false); setEngNeedsRepeat(false); setEngHwMissed(false);
                  setEngLate(false); setEngBathroom(false);
                }}
                className="px-3 py-2 rounded-full text-sm font-semibold bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 transition-colors">
                😴 Kurang Fit
              </button>
              <button type="button"
                onClick={() => {
                  setMood(undefined); setEngPrepared(false); setEngFocused(false); setEngActiveAsking(false);
                  setEngQuickLearner(false); setEngDrowsy(false); setEngPhone(false); setEngNeedsRepeat(false); setEngHwMissed(false);
                  setEngLate(false); setEngBathroom(false);
                  setBehaviorTags([]);
                }}
                className="px-3 py-2 rounded-full text-sm font-semibold bg-white text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors">
                🔄 Reset
              </button>
            </div>
          </div>

          {/* Mood */}
          <div>
            <label className="label">🔥 Semangat Hari Ini</label>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((m) => (
                <button key={m.v} type="button"
                  className={`px-3 py-2 rounded-full text-sm border transition-colors ${
                    mood === m.v ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200"}`}
                  onClick={() => setMood(mood === m.v ? undefined : m.v)}>
                  {m.icon} {m.v}
                </button>
              ))}
            </div>
          </div>

          {/* Positif */}
          <div>
            <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2">✨ Positif</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setEngPrepared(!engPrepared)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                  engPrepared ? "bg-green-500 text-white border-green-500 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-green-300"}`}>
                <span>📚</span> Sudah siap (+2)
              </button>
              <button type="button" onClick={() => setEngFocused(!engFocused)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                  engFocused ? "bg-blue-500 text-white border-blue-500 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"}`}>
                <span>🎯</span> Sangat fokus (+1)
              </button>
              <button type="button" onClick={() => setEngActiveAsking(!engActiveAsking)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                  engActiveAsking ? "bg-teal-500 text-white border-teal-500 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-teal-300"}`}>
                <span>🙋</span> Aktif bertanya (+1)
              </button>
              <button type="button" onClick={() => setEngQuickLearner(!engQuickLearner)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                  engQuickLearner ? "bg-purple-500 text-white border-purple-500 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-purple-300"}`}>
                <span>⚡</span> Cepat paham (+1)
              </button>
            </div>
          </div>

          {/* Perlu perhatian */}
          <div>
            <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-2">⚠️ Perlu Perhatian</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setEngPhone(!engPhone)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                  engPhone ? "bg-red-500 text-white border-red-500 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-red-300"}`}>
                <span>📱</span> Main HP (−1)
              </button>
              <button type="button" onClick={() => setEngDrowsy(!engDrowsy)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                  engDrowsy ? "bg-orange-500 text-white border-orange-500 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-orange-300"}`}>
                <span>😴</span> Mengantuk (−1)
              </button>
              <button type="button" onClick={() => setEngNeedsRepeat(!engNeedsRepeat)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                  engNeedsRepeat ? "bg-yellow-500 text-white border-yellow-500 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-yellow-300"}`}>
                <span>🔄</span> Perlu diulang (−1)
              </button>
              <button type="button" onClick={() => setEngHwMissed(!engHwMissed)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                  engHwMissed ? "bg-rose-500 text-white border-rose-500 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-rose-300"}`}>
                <span>❌</span> PR tidak buat (−1)
              </button>
              <button type="button" onClick={() => setEngLate(!engLate)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                  engLate ? "bg-red-500 text-white border-red-500 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-red-300"}`}>
                <span>⏰</span> Telat (−1)
              </button>
              <button type="button" onClick={() => setEngBathroom(!engBathroom)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                  engBathroom ? "bg-pink-500 text-white border-pink-500 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-pink-300"}`}>
                <span>🚻</span> Sering ke toilet (−1)
              </button>
            </div>
          </div>

          {/* Score gauge */}
          {engScoreInfo && (
            <div className="flex items-center gap-3 rounded-2xl p-4 shadow-sm" style={{ background: engScoreInfo.bg }}>
              <div className="relative w-14 h-14 flex-shrink-0">
                <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(0,0,0,.08)" strokeWidth="4" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke={engScoreInfo.color} strokeWidth="4"
                    strokeDasharray={`${(engScore / 10) * 100 * 0.879} 100`} strokeLinecap="round" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold" style={{ color: engScoreInfo.color }}>{engScore}</span>
              </div>
              <div>
                <p className="font-bold text-base" style={{ color: engScoreInfo.color }}>{engScoreInfo.text}</p>
                <p className="text-xs mt-0.5" style={{ color: engScoreInfo.color, opacity: 0.75 }}>Skor keterlibatan: {engScore}/10</p>
              </div>
            </div>
          )}

          {/* Observasi perilaku lanjutan */}
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <button type="button"
              className="flex items-center justify-between w-full px-4 py-3 bg-gray-50 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
              onClick={() => setShowBehavior(!showBehavior)}>
              <span>🧩 Observasi Lanjutan <span className="font-normal text-gray-500">(opsional)</span></span>
              <div className="flex items-center gap-2">
                {behaviorTags.length > 0 && (
                  <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full">{behaviorTags.length}</span>
                )}
                <span className="text-gray-500">{showBehavior ? "▲" : "▼"}</span>
              </div>
            </button>
            {showBehavior && (
              <div className="p-4 space-y-4 bg-white">
                <div>
                  <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2">✨ Positif</p>
                  <div className="flex flex-wrap gap-2">
                    {BEHAVIOR_TAGS.filter((t) => t.valence === "positive").map((tag) => (
                      <div key={tag.id} className="flex items-center">
                        <button type="button"
                          onClick={() => setBehaviorTags((prev) => prev.includes(tag.id) ? prev.filter((x) => x !== tag.id) : [...prev, tag.id])}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-l-full text-xs font-medium border-y border-l transition-all ${
                            behaviorTags.includes(tag.id) ? "bg-green-500 text-white border-green-500" : "bg-white text-gray-600 border-gray-200 hover:border-green-300"}`}>
                          <span>{tag.icon}</span> {tag.label}
                        </button>
                        <button type="button"
                          onClick={(e) => { e.stopPropagation(); setActiveTooltip({ tag, type: "behavior" }); }}
                          className={`px-1.5 py-1.5 rounded-r-full text-xs border-y border-r transition-all ${
                            behaviorTags.includes(tag.id) ? "bg-green-400 text-white border-green-400" : "bg-gray-50 text-gray-500 border-gray-200 hover:text-green-500"}`}>
                          ⓘ
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">📊 Netral</p>
                  <div className="flex flex-wrap gap-2">
                    {BEHAVIOR_TAGS.filter((t) => t.valence === "neutral").map((tag) => (
                      <div key={tag.id} className="flex items-center">
                        <button type="button"
                          onClick={() => setBehaviorTags((prev) => prev.includes(tag.id) ? prev.filter((x) => x !== tag.id) : [...prev, tag.id])}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-l-full text-xs font-medium border-y border-l transition-all ${
                            behaviorTags.includes(tag.id) ? "bg-gray-600 text-white border-gray-600" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}>
                          <span>{tag.icon}</span> {tag.label}
                        </button>
                        <button type="button"
                          onClick={(e) => { e.stopPropagation(); setActiveTooltip({ tag, type: "behavior" }); }}
                          className={`px-1.5 py-1.5 rounded-r-full text-xs border-y border-r transition-all ${
                            behaviorTags.includes(tag.id) ? "bg-gray-500 text-white border-gray-500" : "bg-gray-50 text-gray-500 border-gray-200 hover:text-gray-500"}`}>
                          ⓘ
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-2">⚠️ Negatif lanjutan</p>
                  <div className="flex flex-wrap gap-2">
                    {BEHAVIOR_TAGS.filter((t) => t.valence === "negative").map((tag) => (
                      <div key={tag.id} className="flex items-center">
                        <button type="button"
                          onClick={() => setBehaviorTags((prev) => prev.includes(tag.id) ? prev.filter((x) => x !== tag.id) : [...prev, tag.id])}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-l-full text-xs font-medium border-y border-l transition-all ${
                            behaviorTags.includes(tag.id) ? "bg-orange-500 text-white border-orange-500" : "bg-white text-gray-600 border-gray-200 hover:border-orange-300"}`}>
                          <span>{tag.icon}</span> {tag.label}
                        </button>
                        <button type="button"
                          onClick={(e) => { e.stopPropagation(); setActiveTooltip({ tag, type: "behavior" }); }}
                          className={`px-1.5 py-1.5 rounded-r-full text-xs border-y border-r transition-all ${
                            behaviorTags.includes(tag.id) ? "bg-orange-400 text-white border-orange-400" : "bg-gray-50 text-gray-500 border-gray-200 hover:text-orange-500"}`}>
                          ⓘ
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          STEP 4: DETAIL — Respons & Nilai
          ══════════════════════════════════════════ */}
      {currentStep === 4 && (
        <div className="px-4 space-y-4">

          {/* Quick Presets */}
          <div>
            <label className="label">⚡ Cepat <span className="text-gray-500 font-normal text-xs">(isi 1 detik)</span></label>
            <div className="flex flex-wrap gap-2">
              <button type="button"
                onClick={() => {
                  setResponseTag("correct-independent"); setNeedsWork("");
                }}
                className="px-3 py-2 rounded-full text-sm font-semibold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors">
                ⭐ Lancar
              </button>
              <button type="button"
                onClick={() => {
                  setResponseTag("partial-correct"); setNeedsWork("");
                }}
                className="px-3 py-2 rounded-full text-sm font-semibold bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100 transition-colors">
                🟡 Butuh Latihan
              </button>
              <button type="button"
                onClick={() => {
                  setResponseTag("misconception"); setNeedsWork("");
                }}
                className="px-3 py-2 rounded-full text-sm font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors">
                🔴 Miskonsepsi
              </button>
              <button type="button"
                onClick={() => {
                  setResponseTag(undefined); setNeedsWork("");
                }}
                className="px-3 py-2 rounded-full text-sm font-semibold bg-white text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors">
                🔄 Reset
              </button>
            </div>
          </div>

          {/* Kualitas Respons Akademik */}
          <div>
            <label className="label">🎓 Kualitas Respons Akademik <span className="text-gray-500 font-normal text-xs">(pilih satu)</span></label>
            <div className="space-y-3 mt-2">
              {/* ── Pemahaman Baik ── */}
              <div>
                <p className="text-[11px] font-semibold text-green-600 uppercase tracking-wide mb-1.5">✨ Pemahaman Baik</p>
                <div className="flex flex-wrap gap-1.5">
                  {RESPONSE_TAGS.filter(t => ["correct-independent","correct-with-prompt","can-explain-orally","transfer-attempt","metacognitive"].includes(t.id)).map((tag) => {
                    const score = tag.id === "correct-independent" ? "+2" : "+1";
                    return (
                      <button key={tag.id} type="button"
                        onClick={() => setResponseTag(responseTag === tag.id ? undefined : tag.id)}
                        className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                          responseTag === tag.id
                            ? "bg-green-500 text-white border-green-500 shadow-sm"
                            : "bg-white text-gray-700 border-gray-200 hover:border-green-300 hover:bg-green-50"}`}>
                        <span>{tag.icon}</span> {tag.label}
                        <span className={`ml-0.5 text-[9px] font-bold rounded px-1 ${responseTag === tag.id ? "bg-green-300 text-green-800" : "bg-green-50 text-green-600"}`}>{score}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Perlu Pendalaman ── */}
              <div>
                <p className="text-[11px] font-semibold text-yellow-600 uppercase tracking-wide mb-1.5">📊 Perlu Pendalaman</p>
                <div className="flex flex-wrap gap-1.5">
                  {RESPONSE_TAGS.filter(t => ["partial-correct","can-do-procedurally","guessing"].includes(t.id)).map((tag) => {
                    const score = tag.id === "guessing" ? "−1" : "0";
                    return (
                      <button key={tag.id} type="button"
                        onClick={() => setResponseTag(responseTag === tag.id ? undefined : tag.id)}
                        className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                          responseTag === tag.id
                            ? "bg-yellow-500 text-white border-yellow-500 shadow-sm"
                            : "bg-white text-gray-700 border-gray-200 hover:border-yellow-300 hover:bg-yellow-50"}`}>
                        <span>{tag.icon}</span> {tag.label}
                        <span className={`ml-0.5 text-[9px] font-bold rounded px-1 ${responseTag === tag.id ? "bg-yellow-300 text-yellow-800" : "bg-yellow-50 text-yellow-600"}`}>{score}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Perlu Perhatian ── */}
              <div>
                <p className="text-[11px] font-semibold text-red-600 uppercase tracking-wide mb-1.5">⚠️ Perlu Perhatian</p>
                <div className="flex flex-wrap gap-1.5">
                  {RESPONSE_TAGS.filter(t => ["misconception","prerequisite-gap"].includes(t.id)).map((tag) => {
                    return (
                      <button key={tag.id} type="button"
                        onClick={() => setResponseTag(responseTag === tag.id ? undefined : tag.id)}
                        className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                          responseTag === tag.id
                            ? "bg-red-500 text-white border-red-500 shadow-sm"
                            : "bg-white text-gray-700 border-gray-200 hover:border-red-300 hover:bg-red-50"}`}>
                        <span>{tag.icon}</span> {tag.label}
                        <span className={`ml-0.5 text-[9px] font-bold rounded px-1 ${responseTag === tag.id ? "bg-red-300 text-red-800" : "bg-red-50 text-red-600"}`}>−2</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected tag description */}
              {responseTag && (() => {
                const tag = RESPONSE_TAGS.find(t => t.id === responseTag);
                if (!tag) return null;
                return (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl px-3.5 py-2.5">
                    <p className="text-xs text-gray-700 leading-relaxed">
                      <span className="font-semibold">{tag.icon} {tag.label}:</span> {tag.description}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      💡 {tag.teacherNote}
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Perlu perhatian */}
          <div>
            <label htmlFor="cs-perhatian" className="label">⚠️ Perlu Perhatian Lebih</label>
            <input id="cs-perhatian" className="input" maxLength={150} placeholder="mis. ketelitian angka, time management" value={needsWork}
              onChange={(e) => setNeedsWork(e.target.value)} />
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════
          STEP 5: CATATAN — Ringkasan Sesi
          ══════════════════════════════════════════ */}
      {currentStep === 5 && (
        <div className="px-4 space-y-4">

          {/* Context summary — what AI will use */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5 space-y-1.5">
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wide mb-1.5">📊 Konteks yang dipakai AI</p>
            {(subjects.length > 0 || studentSubjects.length > 0) && (
              <p className="text-xs text-gray-600">
                <span className="font-semibold">📚 Mapel:</span> {(subjects.length ? subjects : studentSubjects).join(", ")}
              </p>
            )}
            {topic && (
              <p className="text-xs text-gray-600">
                <span className="font-semibold">💡 Topik:</span> {topic}
              </p>
            )}
            {predictedGrade.trim() && (
              <p className="text-xs text-gray-600">
                <span className="font-semibold">📈 Prediksi Nilai:</span> {predictedGrade.trim()}
              </p>
            )}
            {mood && (
              <p className="text-xs text-gray-600">
                <span className="font-semibold">🔥 Mood:</span> {mood}
              </p>
            )}
            {engTouched && (
              <p className="text-xs text-gray-600">
                <span className="font-semibold">🎯 Engagement {engScore}/10:</span>{" "}
                {[
                  engPrepared && "sudah siap", engFocused && "sangat fokus",
                  engActiveAsking && "aktif bertanya", engQuickLearner && "cepat paham",
                  engDrowsy && "mengantuk", engPhone && "main HP",
                  engNeedsRepeat && "perlu diulang", engHwMissed && "PR tidak buat",
                  engLate && "telat", engBathroom && "sering ke toilet",
                ].filter(Boolean).join(", ")}
              </p>
            )}
            {behaviorTags.length > 0 && (
              <p className="text-xs text-gray-600">
                <span className="font-semibold">🧩 Perilaku:</span>{" "}
                {behaviorTags.map(id => BEHAVIOR_TAGS.find(t => t.id === id)?.label).filter(Boolean).join(", ")}
              </p>
            )}
            {responseTag && (
              <p className="text-xs text-gray-600">
                <span className="font-semibold">🎓 Respons akademik:</span>{" "}
                {RESPONSE_TAGS.find(t => t.id === responseTag)?.label}
              </p>
            )}
            {needsWork && (
              <p className="text-xs text-gray-600">
                <span className="font-semibold">⚠️ Perlu perhatian:</span> {needsWork}
              </p>
            )}
            {briefLastSession && (
              <p className="text-xs text-gray-500 italic">
                <span className="font-semibold not-italic text-gray-600">🔁 Sesi lalu:</span>{" "}
                "{briefLastSession.shortNote.length > 70 ? briefLastSession.shortNote.slice(0, 70) + "…" : briefLastSession.shortNote}"
              </p>
            )}
          </div>

          {/* Prediksi nilai — jadi bahan follow-up saat nilai akhir keluar */}
          <div>
            <label htmlFor="cs-prediksi" className="label">📈 Prediksi Nilai <span className="text-gray-500 font-normal text-xs">(opsional — mis. 6, 7, A, B)</span></label>
            <input id="cs-prediksi" className="input" maxLength={10} value={predictedGrade}
              onChange={(e) => setPredictedGrade(e.target.value)}
              placeholder="Prediksi nilai akhir murid untuk materi ini" />
          </div>

          {/* Catatan singkat */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="cs-catatan" className="label">✏️ Catatan Singkat <span className="text-red-400">*</span></label>
              {(activeSubjects.length > 0 || Boolean(topic) || Boolean(sessionType)) && (
                <button type="button"
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                  onClick={handleLocalGenerate}>
                  ⚡ Rangkum Cepat
                </button>
              )}
            </div>
            <textarea id="cs-catatan" className="input" rows={4} value={shortNote} maxLength={300}
              onChange={(e) => { setShortNote(e.target.value); setAiNoteDraft(null); setAiNoteOriginal(""); }}
              placeholder="Apa yang dibahas hari ini? Ketik manual, klik saran di bawah, atau pakai ⚡ Rangkum Cepat / ✨ Draft AI..." />

            {/* Chips saran — tampil sebelum ketik agar catatan bisa diisi 1 klik */}
            {!shortNote.trim() && (
              (briefLastSession?.shortNote || briefFollowUps.length > 0 || Boolean(needsWork)) && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {briefLastSession?.shortNote && (
                    <button type="button" onClick={() => appendNoteChip(`Melanjutkan sesi lalu: ${briefLastSession.shortNote}.`)}
                      className="text-[11px] text-gray-600 bg-gray-50 border border-gray-200 rounded-full px-2.5 py-1 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                      🔁 Sesi lalu
                    </button>
                  )}
                  {briefFollowUps.slice(0, 3).map((f) => (
                    <button key={f.id} type="button" onClick={() => appendNoteChip(`Fokus berikutnya: ${f.text}.`)}
                      className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1 hover:bg-amber-100 transition-colors">
                      🔁 {f.text.length > 28 ? f.text.slice(0, 28) + "…" : f.text}
                    </button>
                  ))}
                  {needsWork && (
                    <button type="button" onClick={() => appendNoteChip(`Perlu perhatian: ${needsWork}.`)}
                      className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-full px-2.5 py-1 hover:bg-red-100 transition-colors">
                      ⚠️ Perlu perhatian
                    </button>
                  )}
                </div>
              )
            )}

            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-gray-500">{shortNote.length}/300</span>
              {settings?.ai?.enabled && settings.ai.apiKey && (subjects.length > 0 || studentSubjects.length > 0) && (
                <button type="button" disabled={aiNoteLoading}
                  onClick={() => setShowAiCostModal(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                  {aiNoteLoading ? "⏳ Draft AI..." : "✨ Draft AI"}
                </button>
              )}
            </div>

            {/* Usulan AI — tampil dulu, jangan langsung menimpa */}
            {aiNoteDraft && (
              <div className="mt-2 bg-indigo-50 border border-indigo-200 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-bold text-indigo-700">✨ Usulan AI ({aiNoteStyle})</p>
                  <button type="button" onClick={() => setAiNoteDraft(null)}
                    className="text-xs text-indigo-400 hover:text-indigo-600">Tutup</button>
                </div>
                <div className="max-h-32 overflow-y-auto text-sm text-gray-800">
                  <SimpleMarkdown text={aiNoteDraft} />
                </div>
                <div className="flex gap-2 mt-2">
                  <button type="button"
                    onClick={() => { setShortNote(aiNoteDraft); setAiNoteDraft(null); }}
                    className="flex-1 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors">
                    ✓ Terima
                  </button>
                  <button type="button"
                    onClick={() => setAiNoteDraft(null)}
                    className="flex-1 py-2 rounded-xl border border-indigo-200 text-indigo-600 text-xs font-bold hover:bg-indigo-100 transition-colors">
                    ✕ Tolak
                  </button>
                </div>
              </div>
            )}

            {aiNoteOriginal && shortNote !== aiNoteOriginal && (
              <button type="button"
                onClick={() => { setShortNote(aiNoteOriginal); setAiNoteOriginal(""); setAiNoteDraft(null); }}
                className="mt-1.5 text-[11px] text-gray-500 hover:text-indigo-600 font-semibold">
                ↩ Kembalikan ke teks awal
              </button>
            )}

            {aiError && <p className="text-xs text-red-500 mt-1">{aiError}</p>}
            {suggestions.length > 0 && (
              <div className="mt-1 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                {suggestions.map((s) => (
                  <button key={s} type="button"
                    className="block w-full text-left text-sm text-blue-600 hover:bg-blue-50 px-3 py-2 border-b border-gray-100 last:border-0"
                    onClick={() => { setShortNote(s); setAiNoteDraft(null); setAiNoteOriginal(""); }}>{s}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          FIXED NAVIGATION BAR
          ══════════════════════════════════════════ */}
      <div className="fixed bottom-16 left-0 right-0 z-50">
        <div className="bg-white/95 backdrop-blur border-t border-gray-100 shadow-xl px-4 py-3">
          <div className="flex items-center gap-2 max-w-md mx-auto">
            {currentStep > 1 ? (
              <button onClick={goBack}
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-semibold text-sm hover:bg-gray-200 transition-colors flex-shrink-0">
                ← Kembali
              </button>
            ) : (
              <div className="w-2 flex-shrink-0" />
            )}
            {stepMeta.optional && (
              <button onClick={skipStep}
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-500 font-semibold text-sm hover:bg-gray-50 transition-colors flex-shrink-0">
                Lewati
              </button>
            )}
            <button onClick={goNext} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-50 shadow-md"
              style={{ background: saving ? "#93c5fd" : currentStep === 6 ? "linear-gradient(135deg,#16a34a,#15803d)" : "linear-gradient(135deg,#2563eb,#1d4ed8)" }}>
              {saving ? "⏳ Menyimpan..." : currentStep === 6 ? "✅ Simpan Sesi" : "Lanjut →"}
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          TOOLTIP OVERLAY
          ══════════════════════════════════════════ */}
      {activeTooltip && (
        <div role="dialog" aria-modal="true" aria-label="Info tag" className={`fixed inset-0 ${Z.tooltip}`} onClick={() => setActiveTooltip(null)}>
          <div className="absolute bottom-24 left-4 right-4 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
            onClick={(e) => e.stopPropagation()}>
            <div className={`px-4 py-3 flex items-center gap-3 ${
              activeTooltip.type === "response" ? "bg-blue-50"
              : (activeTooltip.tag as BehaviorTag).valence === "positive" ? "bg-green-50"
              : (activeTooltip.tag as BehaviorTag).valence === "neutral"  ? "bg-gray-50"
              : "bg-orange-50"}`}>
              <span className="text-2xl">{activeTooltip.tag.icon}</span>
              <div className="flex-1">
                <p className="font-bold text-sm text-gray-800">{activeTooltip.tag.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {activeTooltip.type === "behavior" ? "Observasi perilaku" : "Kualitas respons akademik"}
                </p>
              </div>
              <button onClick={() => setActiveTooltip(null)} className="text-gray-500 hover:text-gray-600 text-xl w-7 h-7 flex items-center justify-center"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>
            <div className="px-4 py-3 space-y-3">
              <p className="text-sm text-gray-700 leading-relaxed">{activeTooltip.tag.description}</p>
              <div className={`rounded-xl px-3 py-2.5 text-xs leading-relaxed ${
                activeTooltip.type === "response" ? "bg-blue-50 text-blue-800" : "bg-amber-50 text-amber-800"}`}>
                <span className="font-semibold">
                  {activeTooltip.type === "behavior" ? "💡 Yang bisa dikatakan:" : "📌 Implikasi untuk tutor:"}
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

      {/* ══════════════════════════════════════════
          SUBJECT PICKER MODAL
          ══════════════════════════════════════════ */}
      {showIBPicker && (
        <div role="dialog" aria-modal="true" aria-label="Pilih Mata Pelajaran" className={`fixed inset-0 bg-black/50 ${Z.picker} flex items-end justify-center`} onClick={() => setShowIBPicker(false)}>
          <div className="bg-white w-full max-w-md rounded-t-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-lg">Pilih Mata Pelajaran</h3>
                {currentStudent?.curriculum && (
                  <p className="text-xs text-gray-500 mt-0.5">{CURRICULUM_META[currentStudent.curriculum].label}</p>
                )}
              </div>
              <button aria-label="Tutup" onClick={() => setShowIBPicker(false)} className="text-gray-500 text-xl"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>

            {currentStudent?.curriculum ? (
              <div className="p-4 space-y-4">
                {getSubjectGroups(currentStudent.curriculum).map((grp) => (
                  <div key={grp.group}>
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">{grp.group}</p>
                    <div className="flex flex-wrap gap-2">
                      {grp.subjects.map((s) => (
                        <button key={s} type="button"
                          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                            subjects.includes(s) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"}`}
                          onClick={() => toggleSubject(s)}>
                          {subjects.includes(s) ? "✓ " : ""}{s}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
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
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">IB MYP Subjects</p>
                      <div className="flex flex-wrap gap-2">
                        {IB_MYP_SUBJECTS.map((s) => (
                          <button key={s} type="button"
                            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                              subjects.includes(s) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"}`}
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
                          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">{grp.group}</p>
                          <div className="flex flex-wrap gap-2">
                            {grp.subjects.map((s) => (
                              <button key={s} type="button"
                                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                                  subjects.includes(s) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"}`}
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

            <div className="px-4 pb-4 space-y-4">
              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">Custom</p>
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
                          className="text-blue-200 hover:text-white ml-0.5"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
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

      {/* ══════════════════════════════════════════
          CLOSE-OUT LAPORAN SESI
          ══════════════════════════════════════════ */}
      {showCloseOut && coSessionData && currentStudent && (
        <div role="dialog" aria-modal="true" aria-label="Laporan sesi" className={`fixed inset-0 bg-black/60 ${Z.picker} flex items-center justify-center p-3 overflow-y-auto`}>
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden my-auto"
            style={{ fontFamily: "'Nunito', sans-serif" }}>

            {/* ── REPORT HEADER ── */}
            <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)" }}>
              {/* Decorative circles */}
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white opacity-10" />
              <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white opacity-10" />
              <div className="absolute top-4 right-16 w-8 h-8 rounded-full bg-white opacity-10" />

              <div className="relative px-5 pt-6 pb-5">
                <div className="flex items-center gap-4 mb-4">
                  {/* Avatar */}
                  <div className="w-16 h-16 rounded-2xl bg-white/25 backdrop-blur-sm flex items-center justify-center shadow-lg border-2 border-white/30">
                    <span className="text-2xl font-black text-white">{currentStudent.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="inline-flex items-center gap-1.5 bg-white/20 text-white/90 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full mb-1">
                      ✅ Sesi Selesai!
                    </div>
                    <h2 className="text-white text-xl font-black truncate">{currentStudent.name}</h2>
                    <p className="text-white/80 text-sm mt-0.5">
                      {dayLabel(coSessionData.date).split(",")[0]}
                      {coSessionData.subjects.length > 0 && <span> · {coSessionData.subjects.join(", ")}</span>}
                    </p>
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 text-center border border-white/20">
                    <p className="text-white/70 text-[10px] font-bold uppercase tracking-wider">📅 Tanggal</p>
                    <p className="text-white text-sm font-black mt-0.5">{coSessionData.date.slice(5).replace("-", "/")}</p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 text-center border border-white/20">
                    <p className="text-white/70 text-[10px] font-bold uppercase tracking-wider">⏱️ Durasi</p>
                    <p className="text-white text-sm font-black mt-0.5">{coSessionData.durationHours} jam</p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 text-center border border-white/20">
                    <p className="text-white/70 text-[10px] font-bold uppercase tracking-wider">🎯 Skor</p>
                    <p className="text-white text-sm font-black mt-0.5">{engTouched ? `${engScore}/10` : "—"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── REPORT BODY ── */}
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">

              {/* Catatan sesi */}
              <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">📝 Catatan Sesi</p>
                <p className="text-sm text-gray-700 leading-relaxed font-semibold">{coSessionData.shortNote}</p>
                {coSessionData.topic && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-blue-400 text-xs">💡</span>
                    <p className="text-xs text-blue-600 font-semibold">Topik: {coSessionData.topic}</p>
                  </div>
                )}
              </div>

              {/* Engagement */}
              {engTouched && engScoreInfo && (
                <div className="rounded-2xl p-4 border" style={{ borderColor: engScoreInfo.color + "30", background: engScoreInfo.bg }}>
                  <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: engScoreInfo.color }}>
                    😊 Kondisi Belajar
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="relative w-16 h-16 flex-shrink-0">
                      <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                        <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(0,0,0,.06)" strokeWidth="3.5" />
                        <circle cx="18" cy="18" r="14" fill="none" stroke={engScoreInfo.color} strokeWidth="3.5"
                          strokeDasharray={`${(engScore / 10) * 100 * 0.879} 100`} strokeLinecap="round" />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center font-black text-base" style={{ color: engScoreInfo.color }}>{engScore}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-black text-base" style={{ color: engScoreInfo.color }}>{engScoreInfo.text}</p>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                        {generateEngagementNarrative(
                          { prepared: engPrepared, focused: engFocused, activeAsking: engActiveAsking,
                            quickLearner: engQuickLearner, drowsy: engDrowsy, playingPhone: engPhone,
                            needsRepetition: engNeedsRepeat, hwMissed: engHwMissed,
                            late: engLate, bathroomBreaks: engBathroom, score: engScore },
                          currentStudent.name,
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Follow-up */}
              <div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                  🔁 Fokus Sesi Berikutnya <span className="font-normal normal-case text-gray-500">(opsional)</span>
                </p>
                <div className="flex gap-2">
                  <input className="input flex-1 text-sm" placeholder="Topik/hal yang perlu dilanjutkan..."
                    value={coFollowUpText} onChange={(e) => setCoFollowUpText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addCoFollowUp()} />
                  <button onClick={addCoFollowUp} disabled={!coFollowUpText.trim()}
                    className="px-3 py-2 rounded-xl bg-amber-500 text-white text-sm font-bold disabled:opacity-40 hover:bg-amber-600 transition-colors">+</button>
                </div>
                {coFollowUps.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {paginatedCoFollowUps.map((f, i) => {
                      const absIdx = (safeCoFollowPage - 1) * PAGE_SIZE + i;
                      return (
                        <div key={absIdx} className="flex items-center gap-2 bg-amber-50 rounded-xl px-3 py-2.5 border border-amber-100">
                          <span className="text-amber-400">🔁</span>
                          <p className="flex-1 text-sm font-semibold text-gray-700">{f}</p>
                          <button onClick={() => setCoFollowUps((prev) => prev.filter((_, j) => j !== absIdx))}
                            className="text-gray-500 hover:text-red-400"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
                        </div>
                      );
                    })}
                    <PaginationControls page={safeCoFollowPage} total={coFollowUps.length} onPageChange={setCoFollowPage} label="follow-up" />
                  </div>
                )}
              </div>

              {/* WhatsApp */}
              {waNumber && (
                <div>
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">💬 Update Orang Tua</p>
                  {aiError && (
                    <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-2">{aiError}</p>
                  )}
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-3.5 mb-2">
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed font-sans">
                      {aiWaText ?? buildWaMessage(currentStudent, coSessionData, coFollowUps, tutorName)}
                    </pre>
                  </div>
                  {settings?.ai?.enabled && settings.ai.apiKey && (
                    <div className="flex gap-2 mb-2">
                      <button type="button" disabled={aiWaLoading}
                        onClick={() => setShowAiWaModal(true)}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-2.5 rounded-xl transition-colors disabled:opacity-50">
                        {aiWaLoading ? "⏳ Poles AI..." : "✨ Poles AI"}
                      </button>
                      {aiWaText && (
                        <button type="button" onClick={() => setAiWaText(null)}
                          className="text-xs text-gray-500 hover:text-gray-600 px-3 py-2 rounded-xl border border-gray-200 bg-white font-semibold">
                          ↩ Original
                        </button>
                      )}
                    </div>
                  )}
                  <a href={`https://wa.me/${waNumber}?text=${encodeURIComponent(aiWaText ?? buildWaMessage(currentStudent, coSessionData, coFollowUps, tutorName))}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-green-500 text-white font-black text-sm hover:bg-green-600 transition-colors shadow-md shadow-green-200">
                    <span className="text-lg">💬</span> Kirim ke {currentStudent.parentContact.name || "Orang Tua"}
                  </a>
                </div>
              )}

              {/* Done button */}
              <button onClick={handleCloseOutDone} disabled={coSaving}
                className="w-full py-4 rounded-2xl font-black text-base text-white transition-all disabled:opacity-50 shadow-lg"
                style={{ background: "linear-gradient(135deg, #1f2937, #374151)" }}>
                {coSaving ? "⏳ Menyimpan..." : "🏁 Selesai & Lihat Profil"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Poles WA AI modal */}
      <AiCostModal
        open={showAiWaModal}
        title="Poles WA AI"
        estimatedIDR={estimatePolishWACost(300)}
        description="Poles pesan WhatsApp jadi lebih hangat dan personal"
        onCancel={() => setShowAiWaModal(false)}
        onConfirm={async () => {
          setShowAiWaModal(false);
          if (!currentStudent || !coSessionData) return;
          setAiWaLoading(true); setAiError("");
          try {
            const original = buildWaMessage(currentStudent, coSessionData, coFollowUps, tutorName ?? "");
            const res = await polishWhatsApp({ original, studentName: currentStudent.name, tutorName: tutorName ?? "" });
            if (res.message) setAiWaText(res.message);
          } catch (e) { setAiError((e as Error).message); }
          finally { setAiWaLoading(false); }
        }}
      />

      {/* AI Cost confirm modal */}
      {showAiCostModal && (() => {
        const currentDraft = shortNote.trim() || undefined;
        const est = estimateDraftNoteCost(activeSubjects, topic || undefined, currentDraft);
        return (
          <div role="dialog" aria-modal="true" aria-label="Draft Catatan dengan AI" className={`fixed inset-0 bg-black/50 ${Z.dialog} flex items-end justify-center`}
            onClick={() => setShowAiCostModal(false)}>
            <div className="bg-white w-full max-w-md rounded-t-2xl p-5 pb-8 space-y-4"
              onClick={(e) => e.stopPropagation()}>
              <h3 className="font-bold text-base">✨ Draft Catatan dengan AI</h3>
              <div className="bg-indigo-50 rounded-xl p-3 space-y-1">
                <p className="text-sm font-semibold text-indigo-700">Estimasi biaya DeepSeek</p>
                <p className="text-xs text-indigo-600">
                  deepseek-v4-flash (off-peak) · ~{est.inputTokens} input + {est.outputTokens} output token
                </p>
                <p className="text-sm font-bold text-indigo-800">
                  ≈ ${est.usdCost.toFixed(6)} (Rp {est.idrCost.toFixed(4)})
                </p>
              </div>
              <p className="text-xs text-gray-500">
                {currentDraft
                  ? `Tulisan di textbox (${currentDraft.length} karakter) dikirim sebagai bahan utama, lalu dipoles AI.`
                  : "Textbox kosong — AI akan membuat catatan baru."}{" "}
                Berdasarkan mapel{topic ? `, topik (${topic})` : ""}{engTouched ? `, engagement (${engScore}/10)` : ""}{needsWork ? `, area perhatian` : ""}{briefLastSession ? `, dan konteks sesi lalu` : ""}.
              </p>
              <div>
                <label className="label">Gaya penulisan</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["rapikan", "perluas", "ringkas"] as const).map((style) => (
                    <button key={style} type="button"
                      onClick={() => setAiNoteStyle(style)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-colors ${aiNoteStyle === style ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"}`}>
                      {style === "rapikan" ? "✍️ Rapikan" : style === "perluas" ? "📖 Perluas" : "✂️ Ringkas"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowAiCostModal(false)}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 font-semibold text-sm">
                  Batal
                </button>
                <button
                  onClick={async () => {
                    setShowAiCostModal(false);
                    setAiNoteLoading(true); setAiError("");
                    setAiNoteDraft(null); setAiNoteOriginal(shortNote);
                    try {
                      const engagementLabels = engTouched ? [
                        ...(engPrepared      ? ["sudah siap bahan"]     : []),
                        ...(engFocused       ? ["sangat fokus"]         : []),
                        ...(engActiveAsking  ? ["aktif bertanya"]       : []),
                        ...(engQuickLearner  ? ["cepat memahami"]       : []),
                        ...(engDrowsy        ? ["mengantuk"]            : []),
                        ...(engPhone         ? ["main HP"]              : []),
                        ...(engNeedsRepeat   ? ["perlu pengulangan"]    : []),
                        ...(engHwMissed      ? ["PR tidak dikerjakan"]  : []),
                        ...(engLate          ? ["telat"]                : []),
                        ...(engBathroom      ? ["sering ke toilet"]     : []),
                      ] : undefined;
                      const res = await draftShortNote({
                        student: { name: currentStudent?.name ?? "", level: currentStudent?.level ?? "" },
                        subjects: activeSubjects,
                        topic: topic || undefined,
                        mood,
                        sessionType,
                        grade: currentStudent?.grade,
                        needsWork: needsWork || undefined,
                        predictedGrade: predictedGrade.trim() || undefined,
                        engagementScore: engTouched ? engScore : undefined,
                        engagementLabels,
                        behaviorLabels: activeBehaviorLabels.length > 0 ? activeBehaviorLabels : undefined,
                        responseLabel: activeResponseLabel,
                        previousNote: briefLastSession?.shortNote,
                        draftText: currentDraft,
                        style: aiNoteStyle,
                        followUps: briefFollowUps.map((f) => f.text),
                        durationHours: duration,
                      });
                      if (res.note) setAiNoteDraft(res.note);
                    } catch (e) { setAiError((e as Error).message); }
                    finally { setAiNoteLoading(false); }
                  }}
                  className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm">
                  OK, Generate
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
