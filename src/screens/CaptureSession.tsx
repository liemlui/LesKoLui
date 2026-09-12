import Skeleton from "../components/Skeleton";
import { TargetIcon, BookIcon, SmileIcon, ClipboardIcon, PencilIcon, CameraIcon } from "../components/icons";
import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import {
  listStudents, createSessionWithCloseoutDraft, recentShortNotes,
  createFollowUpBatch, getSettings, listDoneSessionsForDate,
  markSessionDoneWithCloseoutDraft, updateSession,
} from "../db/repos";
import Modal from "../components/Modal";
import { compressPhoto, stampPhoto } from "../lib/foto";
import SignaturePad from "../components/SignaturePad";
import { todayWIB, dayLabel } from "../lib/format";
import { toggleArrayItem } from "../lib/arrays";
import { calcEngagementScore } from "../lib/engagement";
import { IB_MYP_SUBJECTS, IB_DP_GROUPS, getSubjectGroups, CURRICULUM_META } from "../lib/ibSubjects";
import { searchTopics } from "../lib/ibTopics";
import { SESSION_TYPE_OPTIONS, generateNote, generateEngagementNarrative, generateRichNote } from "../lib/sessionTemplates";
import { BEHAVIOR_TAGS, RESPONSE_TAGS } from "../lib/responseTaxonomy";
import type { BehaviorTag, ResponseTag } from "../lib/responseTaxonomy";
import type { SessionType } from "../lib/sessionTemplates";
import { MIN_DURATION } from "../db/types";
import { draftShortNote, polishWhatsApp, estimateDraftNoteCost, estimatePolishWACost } from "../lib/aiClient";
import { DEEPSEEK_MODEL_LABEL, DEEPSEEK_COST_NOTE, DEEPSEEK_PRICING_URL, getDeepSeekPricing } from "../lib/aiConfig";
import { AiCostModal } from "../components/AiCostModal";
import { SimpleMarkdown } from "../components/SimpleMarkdown";
import Breadcrumb from "../components/Breadcrumb";
import type { Student } from "../db/types";
import PaginationControls from "../components/PaginationControls";
import { clampPage, paginateItems } from "../lib/pagination";
import { scheduleCaptureMismatch } from "../lib/scheduleCapture";
import type { ScheduleCaptureLock } from "../lib/scheduleCapture";
import useEngagement from "./captureSession/useEngagement";
import useStudentBrief from "./captureSession/useStudentBrief";
import useCaptureDraft from "./captureSession/useCaptureDraft";
import type { CaptureDraft, CaptureDraftForm } from "../db/types";

const DURATIONS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6];
const MOODS = [
  { v: "Semangat", icon: "🔥" },
  { v: "Fokus",    icon: "🎯" },
  { v: "Biasa",    icon: "😐" },
  { v: "Lelah",    icon: "😴" },
  { v: "Kesulitan",icon: "😰" },
];

/** Chips cepat "Situasi hari ini" — tap menambah frasa ke kolom bebas situasi.
 *  Murni konteks manusiawi, tidak memengaruhi skor engagement. */
const SITUASI_CHIPS = [
  { icon: "😷", label: "Habis sakit" },
  { icon: "😴", label: "Kurang tidur" },
  { icon: "🏃", label: "Habis ekskul" },
  { icon: "🍚", label: "Belum makan" },
  { icon: "📝", label: "Besok ulangan" },
  { icon: "🎉", label: "Ada acara keluarga" },
  { icon: "💭", label: "Ada masalah pribadi" },
];

const STEPS = [
  { id: 1, label: "Jadwal",  Icon: TargetIcon, desc: "Murid & waktu",       optional: false },
  { id: 2, label: "Materi",  Icon: BookIcon,   desc: "Mapel & topik",       optional: false },
  { id: 3, label: "Kondisi", Icon: SmileIcon,     desc: "Mood & perilaku",     optional: true  },
  { id: 4, label: "Detail",  Icon: ClipboardIcon, desc: "Respons & nilai",    optional: true  },
  { id: 5, label: "Catatan", Icon: PencilIcon,    desc: "Ringkasan sesi",      optional: false },
  { id: 6, label: "Bukti",   Icon: CameraIcon,    desc: "Foto & tanda tangan", optional: true  },
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

/** Tinggi bar aksi tetap (kelas `h-[4.25rem]`) — dipublikasikan ke CSS var agar
 *  banner/toast global mengambang di atasnya (audit C-01). Konstanta, bukan hasil
 *  pengukuran: mengukur lewat ref di dalam efek ternyata tidak andal karena efek
 *  bisa berjalan saat ref belum terpasang (render offscreen/transition). */
const TASK_BAR_H = "4.25rem";

/** "12 Sep 20.14" — penanda waktu draf terakhir disimpan. */
function draftStamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString("id-ID", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    });
  } catch { return ""; }
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
  const [studentId,      setStudentId]      = useState(() => searchParams.get("studentId") ?? "");
  const [subjects,       setSubjects]        = useState<string[]>([]);
  const { currentStudent, studentSubjects, briefLastSession, briefFollowUps } = useStudentBrief(studentId);
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
  const [predictedGrade, setPredictedGrade]  = useState("");
  const [topics,         setTopics]          = useState<string[]>([]);
  const [needsWork,      setNeedsWork]       = useState("");
  const [sessionDate,    setSessionDate]     = useState(today);
  const [saving,         setSaving]          = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  // Session type
  const [sessionType, setSessionType] = useState<SessionType | undefined>();

  // Engagement indicators
  const {
    flags: { prepared: engPrepared, focused: engFocused, drowsy: engDrowsy,
      playingPhone: engPhone, activeAsking: engActiveAsking, quickLearner: engQuickLearner,
      needsRepetition: engNeedsRepeat, hwMissed: engHwMissed, late: engLate,
      bathroomBreaks: engBathroom, restless: engRestless, offTask: engOffTask },
    mood, setMood,
    behaviorTags, setBehaviorTags,
    responseTag, setResponseTag,
    showBehavior, setShowBehavior,
    activeTooltip, setActiveTooltip,
    situasiNote, setSituasiNote,
    touched: engTouched, hasEngagementInput,
    score: engScore, scoreInfo: engScoreInfo,
    toggleFlag, applyPreset, resetEngagementFlags, resetAll, hydrate: hydrateEngagement,
    undoAvailable, undo: undoEngagement,
  } = useEngagement();
  // Situasi humanis hari ini (opsional) — konteks, bukan perilaku.

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

  // Skor keterlibatan dihitung + disimpan bila ada sinyal APAPUN: flag inti,
  // tag perilaku, respons akademik, atau mood. Jangan hanya engTouched — kalau
  // tutor hanya mencatat mood/tag, engagement (dan skornya) tetap harus tersimpan.

  // Conflict warning
  const [conflictWarn, setConflictWarn] = useState<string[]>([]);

  // Mode "menyelesaikan jadwal" (?scheduleId=): murid & tanggal mengikuti jadwal
  // dan dikunci — markSessionDone tidak menerima keduanya (audit C-02).
  const [scheduleLock, setScheduleLock] = useState<ScheduleCaptureLock | null>(null);
  const scheduledStudentRef = useRef<string | null>(null);

  // Brief (loaded on student change)
  const [briefFollowPage,  setBriefFollowPage]  = useState(1);

  // Close-out state
  const [showCloseOut,   setShowCloseOut]   = useState(false);
  const [coSessionData,  setCoSessionData]  = useState<{
    id: string; date: string; subjects: string[]; durationHours: number;
    shortNote: string; topic?: string;
  } | null>(null);
  const [coFollowUps,    setCoFollowUps]    = useState<Array<{ id: string; text: string }>>([]);
  const [coFollowUpText, setCoFollowUpText] = useState("");
  const [coSaving,       setCoSaving]       = useState(false);
  const coSavingRef = useRef(false);
  const [coFollowPage,   setCoFollowPage]   = useState(1);
  // Sesi sudah tersimpan tetapi laporan belum ditutup (mis. pengguna menutup
  // laporan) → simpan ulang harus MEMPERBARUI, bukan membuat sesi kedua.
  const [editingSavedSession, setEditingSavedSession] = useState(false);

  const draftScopeKey = scheduleId ? `schedule:${scheduleId}` : studentId ? `student:${studentId}` : "new";
  // WAJIB useMemo: `useCaptureDraft` menjadwalkan penulisan berdasarkan isi form.
  // Sebelum ini objeknya dibuat ulang tiap render → draf ditulis berulang tanpa
  // perubahan data (audit C-17: layar berkedip 2×/detik, ~108 tulis/menit).
  const draftForm: CaptureDraftForm = useMemo(() => ({
    step: currentStep,
    date: sessionDate,
    durationHours: duration,
    subjects,
    topic,
    topicSearch,
    shortNote,
    needsWork,
    predictedGrade,
    mood,
    engagementFlags: {
      prepared: engPrepared, focused: engFocused, drowsy: engDrowsy,
      playingPhone: engPhone, activeAsking: engActiveAsking, quickLearner: engQuickLearner,
      needsRepetition: engNeedsRepeat, hwMissed: engHwMissed, late: engLate,
      bathroomBreaks: engBathroom, restless: engRestless, offTask: engOffTask,
    },
    behaviorTags,
    responseTag,
    situasiNote,
    sessionType,
    photo,
    signature,
    closeout: coSessionData ? {
      session: coSessionData,
      followUps: coFollowUps,
      followUpText: coFollowUpText,
    } : undefined,
    // Dependensi sengaja primitif (bukan objek form) supaya identitas `draftForm`
    // stabil selama datanya tidak berubah.
  }), [
    currentStep, sessionDate, duration, subjects, topic, topicSearch, shortNote,
    needsWork, predictedGrade, mood, behaviorTags, responseTag, situasiNote,
    sessionType, photo, signature, coSessionData, coFollowUps, coFollowUpText,
    engPrepared, engFocused, engDrowsy, engPhone, engActiveAsking, engQuickLearner,
    engNeedsRepeat, engHwMissed, engLate, engBathroom, engRestless, engOffTask,
  ]);

  const restoreDraft = (draft: CaptureDraft) => {
    const form = draft.form;
    setCurrentStep((form.step >= 1 && form.step <= 6 ? form.step : 1) as StepNum);
    setSessionDate(form.date); setDuration(form.durationHours); setSubjects(form.subjects);
    setTopicSearch(form.topicSearch); setTopics(form.topic ? form.topic.split("; ").filter(Boolean) : []);
    setShortNote(form.shortNote); setNeedsWork(form.needsWork); setPredictedGrade(form.predictedGrade);
    setSessionType(form.sessionType as SessionType | undefined); setPhoto(form.photo); setSignature(form.signature);
    hydrateEngagement({
      flags: {
        prepared: form.engagementFlags.prepared ?? false, focused: form.engagementFlags.focused ?? false,
        activeAsking: form.engagementFlags.activeAsking ?? false, quickLearner: form.engagementFlags.quickLearner ?? false,
        drowsy: form.engagementFlags.drowsy ?? false, playingPhone: form.engagementFlags.playingPhone ?? false,
        needsRepetition: form.engagementFlags.needsRepetition ?? false, hwMissed: form.engagementFlags.hwMissed ?? false,
        late: form.engagementFlags.late ?? false, bathroomBreaks: form.engagementFlags.bathroomBreaks ?? false,
        restless: form.engagementFlags.restless ?? false, offTask: form.engagementFlags.offTask ?? false,
      }, mood: form.mood,
      behaviorTags: form.behaviorTags, responseTag: form.responseTag, situasiNote: form.situasiNote,
    });
    if (form.closeout) {
      setCoSessionData(form.closeout.session); setCoFollowUps(form.closeout.followUps);
      setCoFollowUpText(form.closeout.followUpText); setShowCloseOut(true);
    }
  };

  const draft = useCaptureDraft({
    scopeKey: draftScopeKey, studentId, scheduleId,
    phase: showCloseOut ? "closeout" : "editing", savedSessionId: coSessionData?.id,
    form: draftForm, onRestore: restoreDraft,
  });

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLDivElement>(null);

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
  // Kartu "Konteks yang dipakai AI" dilipat secara default supaya kolom wajib
  // (Catatan Singkat) tidak terdorong jauh ke bawah (audit C-16).
  const [showAiContext,    setShowAiContext]    = useState(false);

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

  // Publikasikan tinggi bar aksi ke CSS var `--task-bar-h` supaya banner
  // mingguan, flash, dan toast global mengambang DI ATAS bar ini — bukan
  // menutupi tombol "Lanjut →" (audit C-01: hit-test mengembalikan banner,
  // bukan tombolnya, sehingga wizard tidak bisa dilanjutkan).
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--task-bar-h", TASK_BAR_H);
    return () => { root.style.removeProperty("--task-bar-h"); };
  }, [draft.pending]);

  useEffect(() => {
    if (!scheduleId) { setScheduleLock(null); return; }
    (async () => {
      const session = await db.sessions.get(scheduleId);
      if (!session) return;
      // Tandai bahwa perubahan studentId berikutnya berasal dari prefill jadwal,
      // supaya efek reset di bawah tidak menghapus mapel bawaan jadwal (C-02).
      scheduledStudentRef.current = session.studentId;
      setScheduleLock({ studentId: session.studentId, date: session.date });
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
    // Murid berubah karena prefill jadwal → mapel dari jadwal harus dipertahankan.
    if (scheduledStudentRef.current === studentId) { scheduledStudentRef.current = null; return; }
    setSubjects([]);
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
      setMessage({ kind: "error", text: "File harus berupa gambar (JPG/PNG/WebP)." });
      e.target.value = ""; return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setMessage({ kind: "error", text: "Foto terlalu besar (maks 50 MB)" });
      e.target.value = ""; return;
    }
    try {
      const compressed = await compressPhoto(file);
      const stamped    = await stampPhoto(compressed, sessionDate);
      setPhoto(stamped);
    } catch { setMessage({ kind: "error", text: "Gagal kompres foto" }); }
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
    resetAll(); setPredictedGrade(""); setTopics([]); setTopicSearch(""); setTopicResults([]);
    setNeedsWork("");
    setSignature(undefined); setShowSigPad(false);
    setDuration(MIN_DURATION); setSessionDate(today);
    setSessionType(undefined); setConflictWarn([]);
    setCurrentStep(1); setMessage(null);
  };

  const handleSave = async () => {
    // Sudah tersimpan & laporan belum selesai → jangan buat sesi kedua.
    if (coSessionData && !editingSavedSession) {
      setMessage({ kind: "success", text: "Sesi ini sudah tersimpan. Selesaikan tindak lanjutnya di laporan sesi." });
      setShowCloseOut(true);
      return;
    }
    if (!studentId) { showValidationError("👤 Pilih murid dulu.", "cs-murid"); return; }
    // Jaring pengaman C-02: pada mode jadwal, murid & tanggal tidak boleh
    // menyimpang dari jadwal yang sedang diselesaikan.
    const mismatch = scheduleCaptureMismatch(scheduleLock, studentId, sessionDate);
    if (mismatch) { showValidationError(mismatch); return; }
    if (studentSubjects.length > 0 && subjects.length === 0) {
      showValidationError("📖 Pilih minimal 1 mata pelajaran."); return;
    }
    if (!shortNote.trim()) { showValidationError("✏️ Tulis catatan singkat dulu.", "cs-catatan"); return; }
    await draft.flush();
    const draftSnapshot = draft.getSnapshot();
    const initialFollowUps = needsWork.trim() ? [{ id: crypto.randomUUID(), text: needsWork.trim() }] : [];
    setSaving(true);
    const engData = hasEngagementInput ? {
      prepared: engPrepared, focused: engFocused,
      drowsy: engDrowsy, playingPhone: engPhone,
      activeAsking: engActiveAsking, quickLearner: engQuickLearner,
      needsRepetition: engNeedsRepeat, hwMissed: engHwMissed,
      late: engLate, bathroomBreaks: engBathroom, restless: engRestless, offTask: engOffTask,
      score: calcEngagementScore({
        prepared: engPrepared, focused: engFocused, drowsy: engDrowsy, playingPhone: engPhone,
        activeAsking: engActiveAsking, quickLearner: engQuickLearner,
        needsRepetition: engNeedsRepeat, hwMissed: engHwMissed,
        late: engLate, bathroomBreaks: engBathroom, restless: engRestless, offTask: engOffTask,
        behaviorValences: behaviorTags.length > 0 ? behaviorTags.map(id => BEHAVIOR_TAGS.find(t => t.id === id)?.valence).filter(Boolean) as ("positive" | "neutral" | "negative")[] : undefined,
        responseTagId: responseTag,
        mood,
      }),
    } : undefined;
    try {
      let savedSession: {
        id: string; date: string; subjects: string[]; durationHours: number;
        shortNote: string; topic?: string;
      };
      const isUpdate = Boolean(coSessionData && editingSavedSession);
      if (coSessionData && editingSavedSession) {
        // "Perbaiki catatan" → perbarui sesi yang sudah ada (updateSession juga
        // menghitung ulang biaya bila durasi berubah), bukan membuat sesi baru.
        await updateSession(coSessionData.id, {
          subjects: subjects.length > 0 ? subjects : undefined,
          photo, shortNote: shortNote.trim(), mood,
          topic: topic.trim() || undefined,
          needsWork: needsWork.trim() || undefined,
          predictedGrade: predictedGrade.trim() || undefined,
          situasiNote: situasiNote.trim() || undefined,
          engagement: engData,
          behaviorTags: behaviorTags.length > 0 ? behaviorTags : undefined,
          responseTag: responseTag || undefined,
          signature: signature || undefined,
          durationHours: duration,
        });
        savedSession = {
          id: coSessionData.id,
          date: coSessionData.date,
          subjects: subjects.length > 0 ? subjects : coSessionData.subjects,
          durationHours: duration,
          shortNote: shortNote.trim(),
          topic: topic.trim() || undefined,
        };
      } else if (scheduleId) {
        const result = await markSessionDoneWithCloseoutDraft(scheduleId, {
          subjects: subjects.length > 0 ? subjects : undefined,
          photo, shortNote: shortNote.trim(), mood,
          topic: topic.trim() || undefined,
          needsWork: needsWork.trim() || undefined,
          predictedGrade: predictedGrade.trim() || undefined,
          situasiNote: situasiNote.trim() || undefined,
          engagement: engData,
          behaviorTags: behaviorTags.length > 0 ? behaviorTags : undefined,
          responseTag: responseTag || undefined,
          signature: signature || undefined,
          durationHours: duration,
        }, draftSnapshot, initialFollowUps);
        savedSession = result.session;
      } else {
        const result = await createSessionWithCloseoutDraft({
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
          situasiNote: situasiNote.trim() || undefined,
          engagement: engData,
          behaviorTags: behaviorTags.length > 0 ? behaviorTags : undefined,
          responseTag: responseTag || undefined,
          signature: signature || undefined,
          status: "DONE",
        }, draftSnapshot, initialFollowUps);
        savedSession = result.session;
      }

      setCoSessionData(savedSession);
      // Repositori baru saja menulis fase `closeout` ke draf — selaraskan revisi
      // agar penulisan hook berikutnya tidak dianggap konflik.
      await draft.syncFromStore();
      if (isUpdate) {
        // Pertahankan tindak lanjut yang sudah ditulis di laporan; tambahkan
        // yang baru dari "Fokus perbaikan" tanpa menghapus yang lama.
        setCoFollowUps((prev) => {
          const merged = [...prev];
          for (const item of initialFollowUps) {
            if (!merged.some((existing) => existing.text === item.text)) merged.push(item);
          }
          return merged;
        });
      } else {
        setCoFollowUps(initialFollowUps);
      }
      setCoFollowUpText("");
      setEditingSavedSession(false);
      setShowCloseOut(true);
    } catch (e) {
      setMessage({ kind: "error", text: "Gagal: " + (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const addCoFollowUp = () => {
    if (!coFollowUpText.trim()) return;
    setCoFollowUps((prev) => [...prev, { id: crypto.randomUUID(), text: coFollowUpText.trim() }]);
    setCoFollowUpText("");
  };

  const handleCloseOutDone = async () => {
    if (!coSessionData || !studentId) { resetForm(); setShowCloseOut(false); return; }
    if (coSavingRef.current) return;
    coSavingRef.current = true;
    setCoSaving(true);
    try {
      await createFollowUpBatch(studentId, coSessionData.id, coFollowUps, draft.getSnapshot().draftId);
      const savedStudentId = studentId;
      await draft.remove();
      resetForm();
      setShowCloseOut(false);
      setCoSessionData(null);
      navigate("/students/" + savedStudentId);
    } catch (e) {
      setMessage({ kind: "error", text: "Sesi sudah tersimpan. Tindak lanjut belum tersimpan; coba lagi. " + (e as Error).message });
    } finally {
      coSavingRef.current = false;
      setCoSaving(false);
    }
  };

  /** Tutup laporan tanpa menyelesaikan tindak lanjut — sesi tetap tersimpan,
   *  draf tetap ada, dan wizard memberi jalan kembali ke laporan (audit C-05). */
  const closeReport = () => setShowCloseOut(false);

  /** Perbaiki catatan sesi yang sudah tersimpan → kembali ke langkah Catatan.
   *  Simpan berikutnya MEMPERBARUI sesi itu (bukan membuat sesi baru). */
  const handleFixNote = () => {
    setShowCloseOut(false);
    setEditingSavedSession(true);
    setCurrentStep(5);
  };

  // Step validation & navigation
  /** Tampilkan galat + arahkan pandangan ke sumbernya. Pesan saja tidak cukup:
   *  blok pesan berada di atas halaman, sedangkan pengguna menekan "Lanjut →"
   *  dari bawah — pada layar yang sudah digulir pesannya berada di luar viewport
   *  (audit C-03, terukur rect.top = −92 px). */
  const showValidationError = (text: string, focusId?: string) => {
    setMessage({ kind: "error", text });
    requestAnimationFrame(() => {
      const field = focusId ? document.getElementById(focusId) : null;
      if (field) {
        field.scrollIntoView({ block: "center", behavior: "smooth" });
        field.focus({ preventScroll: true });
        return;
      }
      messageRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      messageRef.current?.focus({ preventScroll: true });
    });
  };

  const validateCurrentStep = (): { text: string; focusId?: string } | null => {
    if (currentStep === 1 && !studentId) return { text: "👤 Pilih murid dulu.", focusId: "cs-murid" };
    if (currentStep === 2) {
      if (studentSubjects.length > 0 && subjects.length === 0) return { text: "📖 Pilih minimal 1 mata pelajaran." };
    }
    if (currentStep === 5 && !shortNote.trim()) return { text: "✏️ Tulis catatan singkat dulu.", focusId: "cs-catatan" };
    return null;
  };

  const goNext = async () => {
    const err = validateCurrentStep();
    if (err) { showValidationError(err.text, err.focusId); return; }
    setMessage(null);
    await draft.flush();
    if (currentStep < 6) setCurrentStep((s) => (s + 1) as StepNum);
    else handleSave();
  };

  const goBack = async () => {
    setMessage(null);
    await draft.flush();
    if (currentStep > 1) setCurrentStep((s) => (s - 1) as StepNum);
  };

  const skipStep = () => {
    setMessage(null);
    if (currentStep < 6) setCurrentStep((s) => (s + 1) as StepNum);
    else handleSave();
  };

  if (!students) return <Skeleton variant="card" lines={4} className="p-4" />;

  const tutorName    = settings?.tutorProfile?.name || "Ko Lui";
  const originalWaMessage = currentStudent && coSessionData
    ? buildWaMessage(currentStudent, coSessionData, coFollowUps.map((item) => item.text), tutorName)
    : "";
  const waNumber     = currentStudent?.parentContact.phone.replace(/^0/, "62").replace(/[^0-9]/g, "") ?? "";
  const stepMeta     = STEPS[currentStep - 1];

  // Status draf ditampilkan di header (baris tinggi tetap) — "saving" transien
  // TIDAK boleh diperlakukan sebagai galat (audit C-17 / C-07).
  const draftStatusLabel =
    draft.status === "saving"     ? "Menyimpan…"
    : draft.status === "saved"    ? "Draf tersimpan ✓"
    : draft.status === "conflict" ? "Draf bentrok"
    : draft.status === "unsaved"  ? "Draf gagal disimpan"
    : "";
  const draftTone =
    draft.status === "saved"  ? "text-green-600"
    : draft.status === "saving" ? "text-gray-500"
    : "text-red-600";

  /** Ada isian nyata di layar? Dipakai untuk memutuskan apakah draf tertunda
   *  boleh memblokir form atau cukup ditawarkan dengan label eksplisit. */
  const hasFormContent = Boolean(
    shortNote.trim() || needsWork.trim() || predictedGrade.trim() || situasiNote.trim() ||
    subjects.length > 0 || topics.length > 0 || topicSearch.trim() || sessionType ||
    photo || signature || behaviorTags.length > 0 || responseTag || mood || engTouched,
  );

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
        bathroomBreaks: engBathroom, restless: engRestless, offTask: engOffTask, score: engScore,
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

  /** Tambahkan chip situasi ke kolom bebas (pisah koma, tanpa duplikat). */
  const appendSituasiChip = (text: string) => {
    setSituasiNote((prev) => {
      const clean = text.trim();
      if (!clean) return prev;
      const parts = prev.split(",").map((p) => p.trim()).filter(Boolean);
      if (parts.includes(clean)) return prev;
      return parts.length > 0 ? `${parts.join(", ")}, ${clean}` : clean;
    });
  };

  // ── Draf tertunda (C-06) ──
  // Bila form masih KOSONG: tahan dulu dan minta keputusan — tidak ada isian
  // yang bisa hilang, dan draf justru data yang berharga.
  // Bila sudah ada isian: jangan blokir, tetapi label aksinya menyebut akibatnya
  //   ("ganti dengan draf" / "hapus draf, pakai isian layar") supaya tidak ada
  //   penimpaan senyap seperti temuan C-06.
  if (draft.pending && !hasFormContent) {
    const pendingStudent = students.find((s) => s.id === draft.pending?.studentId);
    return (
      <div className="pb-24">
        <Breadcrumb />
        <div className="px-4 pt-4 pb-3">
          <h1 className="text-2xl font-bold text-gray-800">📓 Catat Sesi</h1>
          <p className="text-xs text-gray-500 mt-0.5">Draf tersimpan menunggu keputusan</p>
        </div>
        <div className="mx-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="font-bold text-amber-900">Draf Catat Sesi tersedia</p>
          <p className="mt-1 text-sm text-amber-800">
            Draf ini tersimpan di perangkat pada {draftStamp(draft.pending.updatedAt)}. Pilih salah satu
            sebelum mengisi form.
          </p>
          <div className="mt-3 space-y-1 text-xs text-amber-800">
            <p className="font-semibold">
              Langkah {draft.pending.form.step} dari {STEPS.length}
              {pendingStudent ? ` · ${pendingStudent.name}` : ""}
            </p>
            <p>Tanggal sesi: {dayLabel(draft.pending.form.date)}</p>
            {draft.pending.form.shortNote.trim() && (
              <p className="line-clamp-2">Catatan: “{draft.pending.form.shortNote.trim()}”</p>
            )}
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <button type="button" onClick={draft.resume}
              className="w-full py-3 rounded-xl bg-amber-600 text-white font-bold text-sm hover:bg-amber-700 transition-colors">
              Lanjutkan draf
            </button>
            <button type="button" onClick={() => void draft.discard()}
              className="w-full py-2.5 rounded-xl border border-amber-300 bg-white text-amber-800 font-semibold text-sm hover:bg-amber-100 transition-colors">
              Buang draf & mulai baru
            </button>
          </div>
        </div>
        <p className="mx-4 mt-3 text-xs text-gray-500">
          Form disembunyikan sampai pilihan ini dibuat agar isian baru tidak tertimpa draf lama.
        </p>
      </div>
    );
  }

  return (
    <div className="pb-36">

      <Breadcrumb />

      {/* ── PAGE HEADER ── */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-800">📓 Catat Sesi</h1>
          <p className="text-xs text-gray-500 mt-0.5">Langkah {currentStep} dari {STEPS.length}</p>
        </div>
        {/* Status draf berada di baris ber-tinggi tetap: perubahan status tidak
            boleh menggeser tata letak form (audit C-17). */}
        <span aria-live="polite" className={`mt-1 shrink-0 text-xs font-semibold ${draftTone}`}>
          {draftStatusLabel}
        </span>
      </div>

      {/* Draf tertunda padahal form sudah terisi: jangan blokir, tetapi label
          aksinya menyebut akibatnya supaya tidak ada penimpaan senyap (C-06). */}
      {draft.pending && hasFormContent && (
        <div className="mx-4 mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <p className="font-semibold">Draf sesi tersimpan untuk murid ini</p>
          <p className="mt-0.5">
            Isian di layar ini sudah ada — memuat draf akan menimpa isian tersebut.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={draft.resume}
              className="rounded-lg bg-amber-600 px-3 py-2 font-semibold text-white hover:bg-amber-700 transition-colors">
              Ganti dengan draf
            </button>
            <button type="button" onClick={() => void draft.discard()}
              className="rounded-lg border border-amber-300 bg-white px-3 py-2 font-semibold text-amber-800 hover:bg-amber-100 transition-colors">
              Hapus draf, pakai isian layar
            </button>
          </div>
        </div>
      )}

      {/* Sesi sudah tersimpan tapi laporan belum rampung → beri jalan kembali
          tanpa menyimpan ulang (audit C-05). */}
      {coSessionData && !editingSavedSession && !showCloseOut && (
        <div className="mx-4 mb-3 rounded-xl border border-green-200 bg-green-50 p-3 text-xs text-green-800">
          <p className="font-semibold">✅ Sesi sudah tersimpan</p>
          <p className="mt-0.5">Tindak lanjut sesi berikutnya & pesan ke orang tua belum diselesaikan.</p>
          <button type="button" onClick={() => setShowCloseOut(true)}
            className="mt-2 rounded-lg bg-green-600 px-3 py-2 font-semibold text-white hover:bg-green-700 transition-colors">
            Buka laporan sesi
          </button>
        </div>
      )}

      {!draft.pending && (draft.status === "unsaved" || draft.status === "conflict") && (
        <div
          role="alert"
          className={`mx-4 mb-3 rounded-xl border p-3 text-xs ${
            draft.status === "conflict"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-amber-200 bg-amber-50 text-amber-800"}`}
        >
          <p className="font-semibold">
            {draft.status === "conflict" ? "Draf berubah di tab lain" : "Draf belum tersimpan"}
          </p>
          <p className="mt-0.5">
            {draft.status === "conflict"
              ? "Versi di penyimpanan perangkat lebih baru daripada versi di layar ini. Pilih satu untuk dilanjutkan."
              : "Isian tetap ada di layar. Coba simpan lagi; bila tetap gagal, muat ulang aplikasi lalu ulangi."}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {draft.status === "unsaved" ? (
              <button type="button" onClick={() => void draft.retry()}
                className="rounded-lg bg-amber-600 px-3 py-2 font-semibold text-white hover:bg-amber-700 transition-colors">
                Coba simpan lagi
              </button>
            ) : (
              <>
                <button type="button" onClick={() => void draft.reload()}
                  className="rounded-lg bg-red-600 px-3 py-2 font-semibold text-white hover:bg-red-700 transition-colors">
                  Pakai versi tersimpan
                </button>
                <button type="button" onClick={() => void draft.overwrite()}
                  className="rounded-lg border border-red-300 bg-white px-3 py-2 font-semibold text-red-700 hover:bg-red-50 transition-colors">
                  Pertahankan versi di layar
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── PROGRESS STEPPER ── */}
      <div className="px-4 mb-4">
        <div className="relative flex items-start justify-between">
          <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-200 z-0" />
          {STEPS.map((step) => {
            const done   = currentStep > step.id;
            const active = currentStep === step.id;
            const future = !done && !active;
            return (
              <button
                type="button"
                key={step.id}
                disabled={future}
                onClick={() => done && setCurrentStep(step.id as StepNum)}
                aria-current={active ? "step" : undefined}
                aria-label={active
                  ? `Langkah ${step.id}: ${step.label} (saat ini)`
                  : done
                    ? `Kembali ke langkah ${step.id}: ${step.label}`
                    : `Langkah ${step.id}: ${step.label} (belum aktif)`}
                className={`flex flex-col items-center gap-1.5 z-10 relative flex-1 ${done ? "cursor-pointer" : "cursor-default"}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all shadow-sm
                  ${done   ? "bg-green-500 text-white scale-95"
                  : active ? "bg-blue-600 text-white ring-4 ring-blue-100 scale-110"
                  :          "bg-white text-gray-500 border-2 border-gray-200"}`}>
                  {done ? "✓" : <step.Icon size={16} />}
                </div>
                <span className={`text-xs font-bold tracking-wide transition-colors
                  ${active ? "text-blue-600" : done ? "text-green-600" : "text-gray-500"}`}>
                  {step.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── STEP HEADER CARD ── */}
      <div className="mx-4 mb-4 rounded-2xl border border-gray-100 bg-gradient-to-r from-gray-50 to-white px-4 py-3 flex items-center gap-3 shadow-sm">
        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
          <stepMeta.Icon size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-gray-800 text-base">{stepMeta.label}</h2>
          <p className="text-xs text-gray-500">{stepMeta.desc}</p>
        </div>
        {stepMeta.optional && (
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full font-semibold uppercase tracking-wide flex-shrink-0">
            opsional
          </span>
        )}
      </div>

      {/* ── MESSAGE ── */}
      {message && (
        <div className="mx-4 mb-3">
          <div
            ref={messageRef}
            tabIndex={-1}
            role={message.kind === "error" ? "alert" : "status"}
            className={`flex items-start gap-2 rounded-xl border p-3 text-sm font-medium outline-none ${
            message.kind === "success" ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-600"}`}>
            <span className="flex-1">{message.text}</span>
            <button
              type="button"
              aria-label="Tutup pesan"
              onClick={() => setMessage(null)}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-current/80 transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          STEP 1: JADWAL — Murid, Tanggal, Durasi
          ══════════════════════════════════════════ */}
      {currentStep === 1 && (
        <div className="px-4 space-y-4">

          {/* Mode jadwal — jelaskan bahwa layar ini menyelesaikan jadwal, bukan
              membuat sesi baru, dan mengapa murid/tanggal tidak bisa diubah. */}
          {scheduleId && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3.5">
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">🗓️ Menyelesaikan jadwal</p>
              <p className="mt-1 text-sm font-bold text-blue-900">
                {currentStudent?.name ?? "Murid jadwal"}
                <span className="font-semibold text-blue-700"> · {dayLabel(sessionDate)} · {duration} jam</span>
              </p>
              <p className="mt-1 text-xs text-blue-700">
                Murid dan tanggal mengikuti jadwal ini. Salah jadwal?{" "}
                <button type="button" onClick={() => navigate("/capture")}
                  className="font-semibold underline hover:text-blue-900">Catat sesi baru</button>.
              </p>
            </div>
          )}

          {/* Murid */}
          <div>
            <label htmlFor="cs-murid" className="label">👤 Murid <span className="text-red-400">*</span></label>
            <select id="cs-murid" className="input disabled:bg-gray-100 disabled:text-gray-500"
              value={studentId} disabled={Boolean(scheduleId)}
              aria-describedby={scheduleId ? "cs-murid-hint" : undefined}
              onChange={(e) => setStudentId(e.target.value)}>
              <option value="">Pilih murid...</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {scheduleId && (
              <p id="cs-murid-hint" className="text-xs text-gray-500 mt-1">
                Terkunci karena sesi ini menyelesaikan jadwal yang sudah ada.
              </p>
            )}
          </div>

          {/* Tanggal */}
          <div>
            <label htmlFor="cs-tanggal" className="label">📅 Tanggal Sesi</label>
            <input id="cs-tanggal" className="input disabled:bg-gray-100 disabled:text-gray-500" type="date" value={sessionDate}
              max={today} disabled={Boolean(scheduleId)}
              aria-describedby={scheduleId ? "cs-tanggal-hint" : undefined}
              onChange={(e) => setSessionDate(e.target.value)} />
            {scheduleId ? (
              <p id="cs-tanggal-hint" className="text-xs text-gray-500 mt-1">
                Tanggal terkunci mengikuti jadwal.
              </p>
            ) : sessionDate !== today && (
              <p className="text-xs text-orange-600 mt-1">⏪ Merekam sesi masa lalu</p>
            )}
          </div>

          {/* Durasi */}
          <div>
            <label className="label">⏱️ Durasi</label>
            <div className="relative">
              <div className="flex gap-2 overflow-x-auto pb-1 pr-8 snap-x">
                {DURATIONS.map((d) => (
                  <button key={d} type="button"
                    className={`snap-start flex-shrink-0 px-3 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                      duration === d ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200"}`}
                    onClick={() => setDuration(d)}>{d}j</button>
                ))}
              </div>
              {/* Penanda masih ada pilihan di kanan (audit C-14) */}
              <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent" aria-hidden="true" />
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
                <button type="button" aria-label="Bersihkan pencarian topik"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { setTopicSearch(""); setTopicResults([]); }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-gray-700 transition-colors">
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
                    <button type="button"
                      onClick={() => removeTopic(t)}
                      aria-label={`Hapus topik ${t}`}
                      className="-m-1.5 p-1.5 rounded-full text-blue-500 hover:text-blue-700 transition-colors">
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
                    <span className="text-xs text-gray-500 ml-2">{t.gradeLabel} · {t.unit}</span>
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

          {/* Quick Presets — isi sekali klik (ADITIF: tidak mengosongkan indikator
              lain; audit C-04) */}
          <div>
            <label className="label">⚡ Isi cepat (kondisi) <span className="text-gray-500 font-normal text-xs">(menambah, tidak menghapus)</span></label>
            <div className="flex flex-wrap gap-2">
              <button type="button"
                onClick={() => applyPreset({ prepared: true, focused: true, activeAsking: true }, "Fokus")}
                className="px-3 py-2 rounded-full text-sm font-semibold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors">
                ✨ Lancar
              </button>
              <button type="button"
                onClick={() => applyPreset({}, "Biasa")}
                className="px-3 py-2 rounded-full text-sm font-semibold bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 transition-colors">
                😐 Biasa
              </button>
              <button type="button"
                onClick={() => applyPreset({ drowsy: true }, "Lelah")}
                className="px-3 py-2 rounded-full text-sm font-semibold bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 transition-colors">
                😴 Kurang Fit
              </button>
              <button type="button"
                onClick={resetEngagementFlags}
                className="px-3 py-2 rounded-full text-sm font-semibold bg-white text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors">
                🔄 Kosongkan
              </button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="text-xs text-gray-500">
                “Kosongkan” menghapus semua indikator &amp; mood.
              </p>
              {undoAvailable && (
                <button type="button" onClick={undoEngagement}
                  className="text-xs font-semibold text-blue-700 underline underline-offset-2 hover:text-blue-900">
                  ↩ Batalkan perubahan terakhir
                </button>
              )}
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

          {/* Situasi hari ini — konteks humanis, bukan perilaku */}
          <div>
            <label htmlFor="cs-situasi" className="label">🫶 Situasi Hari Ini <span className="text-gray-500 font-normal text-xs">(opsional — konteks saja, tidak mengurangi skor)</span></label>
            <p className="text-xs text-gray-500 mt-1 mb-2">Cerita di balik sesi hari ini — mis. habis sakit, kurang tidur, ada acara keluarga. Konteks manusiawi untuk tutor &amp; AI saja (tidak dikirim ke WA ortu).</p>
            <textarea id="cs-situasi" className="input" rows={2} maxLength={200} value={situasiNote}
              onChange={(e) => setSituasiNote(e.target.value)}
              placeholder="Contoh: habis sakit, kurang tidur tadi malam, besok ulangan…" />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {SITUASI_CHIPS.map((c) => {
                const active = situasiNote.split(",").map((s) => s.trim()).includes(c.label);
                return (
                  <button key={c.label} type="button"
                    onClick={() => appendSituasiChip(c.label)}
                    className={`px-2.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      active ? "bg-teal-500 text-white border-teal-500" : "bg-white text-gray-600 border-gray-200 hover:border-teal-300 hover:bg-teal-50"}`}>
                    {c.icon} {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Positif */}
          <div>
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">✨ Indikator Positif</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => toggleFlag("prepared")}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                  engPrepared ? "bg-green-600 text-white border-green-600 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-green-300"}`}>
                <span>📚</span> Sudah siap (+2)
              </button>
              <button type="button" onClick={() => toggleFlag("focused")}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                  engFocused ? "bg-green-600 text-white border-green-600 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-green-300"}`}>
                <span>🎯</span> Sangat fokus (+1)
              </button>
              <button type="button" onClick={() => toggleFlag("activeAsking")}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                  engActiveAsking ? "bg-green-600 text-white border-green-600 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-green-300"}`}>
                <span>🙋</span> Aktif bertanya (+1)
              </button>
              <button type="button" onClick={() => toggleFlag("quickLearner")}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                  engQuickLearner ? "bg-green-600 text-white border-green-600 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-green-300"}`}>
                <span>⚡</span> Cepat paham (+1)
              </button>
            </div>
          </div>

          {/* Perlu perhatian */}
          <div>
            <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-2">⚠️ Indikator Perlu Perhatian</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => toggleFlag("playingPhone")}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                  engPhone ? "bg-rose-600 text-white border-rose-600 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-rose-300"}`}>
                <span>📱</span> Main HP (−1)
              </button>
              <button type="button" onClick={() => toggleFlag("drowsy")}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                  engDrowsy ? "bg-rose-600 text-white border-rose-600 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-rose-300"}`}>
                <span>😴</span> Mengantuk (−1)
              </button>
              <button type="button" onClick={() => toggleFlag("needsRepetition")}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                  engNeedsRepeat ? "bg-rose-600 text-white border-rose-600 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-rose-300"}`}>
                <span>🔄</span> Perlu diulang (−1)
              </button>
              <button type="button" onClick={() => toggleFlag("hwMissed")}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                  engHwMissed ? "bg-rose-600 text-white border-rose-600 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-rose-300"}`}>
                <span>❌</span> PR tidak buat (−1)
              </button>
              <button type="button" onClick={() => toggleFlag("late")}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                  engLate ? "bg-rose-600 text-white border-rose-600 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-rose-300"}`}>
                <span>⏰</span> Telat (−1)
              </button>
              <button type="button" onClick={() => toggleFlag("bathroomBreaks")}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                  engBathroom ? "bg-rose-600 text-white border-rose-600 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-rose-300"}`}>
                <span>🚻</span> Sering ke toilet (−1)
              </button>
              <button type="button" onClick={() => toggleFlag("restless")}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                  engRestless ? "bg-rose-600 text-white border-rose-600 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-rose-300"}`}>
                <span>🦘</span> Gelisah loncat-loncat (−1)
              </button>
              <button type="button" onClick={() => toggleFlag("offTask")}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                  engOffTask ? "bg-rose-600 text-white border-rose-600 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-rose-300"}`}>
                <span>🙈</span> Sibuk sendiri (−1)
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
                <p className="text-xs mt-0.5" style={{ color: engScoreInfo.color }}>Skor keterlibatan: {engScore}/10</p>
                {/* Skor selalu dimulai dari 5/10, sementara chip di bawah
                    mencantumkan +2/+1/−1 — tanpa penjelasan ini aritmetikanya
                    tidak bisa diprediksi pengguna (audit C-10). */}
                <p className="text-xs mt-1" style={{ color: engScoreInfo.color }}>
                  Dasar 5/10: tiap indikator di bawah menambah atau mengurangi.
                </p>
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
                  <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">✨ Perilaku Positif</p>
                  <div className="flex flex-wrap gap-2">
                    {BEHAVIOR_TAGS.filter((t) => t.valence === "positive").map((tag) => (
                      <div key={tag.id} className="flex items-center gap-1">
                        <button type="button"
                          onClick={() => setBehaviorTags((prev) => prev.includes(tag.id) ? prev.filter((x) => x !== tag.id) : [...prev, tag.id])}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                            behaviorTags.includes(tag.id) ? "bg-green-500 text-white border-green-500" : "bg-white text-gray-600 border-gray-200 hover:border-green-300"}`}>
                          <span>{tag.icon}</span> {tag.label}
                        </button>
                        <button type="button"
                          aria-label={`Info ${tag.label}`}
                          onClick={(e) => { e.stopPropagation(); setActiveTooltip({ tag, type: "behavior" }); }}
                          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs border transition-all ${
                            behaviorTags.includes(tag.id) ? "bg-green-600 text-white border-green-600" : "bg-white text-gray-600 border-gray-200 hover:text-green-700 hover:border-green-300"}`}>
                          ⓘ
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">📊 Perilaku Netral</p>
                  <div className="flex flex-wrap gap-2">
                    {BEHAVIOR_TAGS.filter((t) => t.valence === "neutral").map((tag) => (
                      <div key={tag.id} className="flex items-center gap-1">
                        <button type="button"
                          onClick={() => setBehaviorTags((prev) => prev.includes(tag.id) ? prev.filter((x) => x !== tag.id) : [...prev, tag.id])}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                            behaviorTags.includes(tag.id) ? "bg-gray-600 text-white border-gray-600" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}>
                          <span>{tag.icon}</span> {tag.label}
                        </button>
                        <button type="button"
                          aria-label={`Info ${tag.label}`}
                          onClick={(e) => { e.stopPropagation(); setActiveTooltip({ tag, type: "behavior" }); }}
                          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs border transition-all ${
                            behaviorTags.includes(tag.id) ? "bg-gray-700 text-white border-gray-700" : "bg-white text-gray-600 border-gray-200 hover:text-gray-800 hover:border-gray-400"}`}>
                          ⓘ
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-2">⚠️ Perilaku Negatif</p>
                  <div className="flex flex-wrap gap-2">
                    {BEHAVIOR_TAGS.filter((t) => t.valence === "negative").map((tag) => (
                      <div key={tag.id} className="flex items-center gap-1">
                        <button type="button"
                          onClick={() => setBehaviorTags((prev) => prev.includes(tag.id) ? prev.filter((x) => x !== tag.id) : [...prev, tag.id])}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                            behaviorTags.includes(tag.id) ? "bg-orange-500 text-white border-orange-500" : "bg-white text-gray-600 border-gray-200 hover:border-orange-300"}`}>
                          <span>{tag.icon}</span> {tag.label}
                        </button>
                        <button type="button"
                          aria-label={`Info ${tag.label}`}
                          onClick={(e) => { e.stopPropagation(); setActiveTooltip({ tag, type: "behavior" }); }}
                          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs border transition-all ${
                            behaviorTags.includes(tag.id) ? "bg-orange-600 text-white border-orange-600" : "bg-white text-gray-600 border-gray-200 hover:text-orange-700 hover:border-orange-300"}`}>
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

          {/* Quick Presets — isi cepat kualitas respons (tidak menyentuh kolom
              "Fokus perbaikan"; hapus otomatis isian pengguna dihapus di sini
              karena itu kehilangan data tanpa peringatan — audit C-04) */}
          <div>
            <label className="label">⚡ Isi cepat (respons) <span className="text-gray-500 font-normal text-xs">(pilih satu)</span></label>
            <div className="flex flex-wrap gap-2">
              <button type="button"
                onClick={() => setResponseTag("correct-independent")}
                className="px-3 py-2 rounded-full text-sm font-semibold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors">
                ⭐ Lancar
              </button>
              <button type="button"
                onClick={() => setResponseTag("partial-correct")}
                className="px-3 py-2 rounded-full text-sm font-semibold bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100 transition-colors">
                🟡 Butuh Latihan
              </button>
              <button type="button"
                onClick={() => setResponseTag("misconception")}
                className="px-3 py-2 rounded-full text-sm font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors">
                🔴 Miskonsepsi
              </button>
              <button type="button"
                onClick={() => { setResponseTag(undefined); setNeedsWork(""); }}
                className="px-3 py-2 rounded-full text-sm font-semibold bg-white text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors">
                🔄 Kosongkan
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              “Kosongkan” menghapus pilihan respons sekaligus isi kolom Fokus perbaikan.
            </p>
          </div>

          {/* Kualitas Respons Akademik */}
          <div>
            <label className="label">🎓 Kualitas Respons Akademik <span className="text-gray-500 font-normal text-xs">(pilih satu)</span></label>
            <div className="space-y-3 mt-2">
              {/* ── Pemahaman Baik ── */}
              <div>
                <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1.5">✨ Pemahaman Baik</p>
                <div className="flex flex-wrap gap-1.5">
                  {RESPONSE_TAGS.filter(t => ["correct-independent","correct-with-prompt","can-explain-orally","transfer-attempt","metacognitive"].includes(t.id)).map((tag) => {
                    const score = tag.id === "correct-independent" ? "+2" : "+1";
                    return (
                      <button key={tag.id} type="button"
                        onClick={() => setResponseTag(responseTag === tag.id ? undefined : tag.id)}
                        className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          responseTag === tag.id
                            ? "bg-green-500 text-white border-green-500 shadow-sm"
                            : "bg-white text-gray-700 border-gray-200 hover:border-green-300 hover:bg-green-50"}`}>
                        <span>{tag.icon}</span> {tag.label}
                        <span className={`ml-0.5 text-xs font-bold rounded px-1 ${responseTag === tag.id ? "bg-green-300 text-green-800" : "bg-green-50 text-green-600"}`}>{score}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Perlu Pendalaman ── */}
              <div>
                <p className="text-xs font-semibold text-yellow-600 uppercase tracking-wide mb-1.5">📊 Perlu Pendalaman</p>
                <div className="flex flex-wrap gap-1.5">
                  {RESPONSE_TAGS.filter(t => ["partial-correct","can-do-procedurally","guessing"].includes(t.id)).map((tag) => {
                    const score = tag.id === "guessing" ? "−1" : "0";
                    return (
                      <button key={tag.id} type="button"
                        onClick={() => setResponseTag(responseTag === tag.id ? undefined : tag.id)}
                        className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          responseTag === tag.id
                            ? "bg-yellow-500 text-white border-yellow-500 shadow-sm"
                            : "bg-white text-gray-700 border-gray-200 hover:border-yellow-300 hover:bg-yellow-50"}`}>
                        <span>{tag.icon}</span> {tag.label}
                        <span className={`ml-0.5 text-xs font-bold rounded px-1 ${responseTag === tag.id ? "bg-yellow-300 text-yellow-800" : "bg-yellow-50 text-yellow-600"}`}>{score}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Perlu Perhatian ── */}
              <div>
                <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1.5">⚠️ Respons Perlu Perhatian</p>
                <div className="flex flex-wrap gap-1.5">
                  {RESPONSE_TAGS.filter(t => ["misconception","prerequisite-gap"].includes(t.id)).map((tag) => {
                    return (
                      <button key={tag.id} type="button"
                        onClick={() => setResponseTag(responseTag === tag.id ? undefined : tag.id)}
                        className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          responseTag === tag.id
                            ? "bg-red-500 text-white border-red-500 shadow-sm"
                            : "bg-white text-gray-700 border-gray-200 hover:border-red-300 hover:bg-red-50"}`}>
                        <span>{tag.icon}</span> {tag.label}
                        <span className={`ml-0.5 text-xs font-bold rounded px-1 ${responseTag === tag.id ? "bg-red-300 text-red-800" : "bg-red-50 text-red-600"}`}>−2</span>
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

          {/* Fokus perbaikan — jadi bahan follow-up saat nilai akhir keluar */}
          <div>
            <label htmlFor="cs-perhatian" className="label">🎯 Fokus Perbaikan Berikutnya</label>
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

          {/* Context summary — dilipat agar kolom wajib tidak tertimbun (C-16) */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl overflow-hidden">
            <button type="button" onClick={() => setShowAiContext((v) => !v)}
              aria-expanded={showAiContext}
              className="flex w-full items-center justify-between gap-2 px-3.5 py-3 text-left">
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">📊 Konteks yang dipakai AI</span>
              <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-blue-700">
                {showAiContext ? "Sembunyikan" : "Lihat"}
                <span aria-hidden="true">{showAiContext ? "▲" : "▼"}</span>
              </span>
            </button>
            {showAiContext && (
            <div className="px-3.5 pb-3 space-y-1.5">
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
            {situasiNote.trim() && (
              <p className="text-xs text-gray-600">
                <span className="font-semibold">🫶 Situasi:</span> {situasiNote.trim()}
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
                  engRestless && "gelisah loncat-loncat", engOffTask && "sibuk sendiri",
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
                <span className="font-semibold">🎯 Fokus perbaikan:</span> {needsWork}
              </p>
            )}
            {briefLastSession && (
              <p className="text-xs text-gray-600 italic">
                <span className="font-semibold not-italic text-gray-700">🔁 Sesi lalu:</span>{" "}
                "{briefLastSession.shortNote.length > 70 ? briefLastSession.shortNote.slice(0, 70) + "…" : briefLastSession.shortNote}"
              </p>
            )}
            </div>
            )}
          </div>

          {/* Catatan singkat — kolom WAJIB, diletakkan sebelum kolom opsional
              "Prediksi Nilai" agar tidak tertimbun (audit C-16) */}
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
                      className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-full px-2.5 py-1 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                      🔁 Sesi lalu
                    </button>
                  )}
                  {briefFollowUps.slice(0, 3).map((f) => (
                    <button key={f.id} type="button" onClick={() => appendNoteChip(`Fokus berikutnya: ${f.text}.`)}
                      className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1 hover:bg-amber-100 transition-colors">
                      🔁 {f.text.length > 28 ? f.text.slice(0, 28) + "…" : f.text}
                    </button>
                  ))}
                  {needsWork && (
                    <button type="button" onClick={() => appendNoteChip(`Fokus perbaikan: ${needsWork}.`)}
                      className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-full px-2.5 py-1 hover:bg-red-100 transition-colors">
                      🎯 Fokus perbaikan
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
                className="mt-1.5 text-xs text-gray-500 hover:text-indigo-600 font-semibold">
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

          {/* Prediksi nilai — jadi bahan follow-up saat nilai akhir keluar */}
          <div>
            <label htmlFor="cs-prediksi" className="label">📈 Prediksi Nilai <span className="text-gray-500 font-normal text-xs">(opsional — mis. 6, 7, A, B)</span></label>
            <input id="cs-prediksi" className="input" maxLength={10} value={predictedGrade}
              onChange={(e) => setPredictedGrade(e.target.value)}
              placeholder="Prediksi nilai akhir murid untuk materi ini" />
          </div>
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
              <p className="text-xs font-bold text-amber-800">Foto & tanda tangan bisa diisi nanti</p>
              <p className="text-xs text-amber-800 mt-0.5">Lengkapi dari profil murid setelah sesi. Simpan dulu detailnya sekarang.</p>
            </div>
          </div>
          <p className="text-xs font-semibold text-gray-600">Isi sekarang (opsional)</p>

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
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-10 h-10 text-sm flex items-center justify-center shadow-md"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              <div className="absolute bottom-2 right-2 flex gap-1.5">
                <button onClick={() => cameraRef.current?.click()}
                  className="bg-black/60 text-white text-xs px-2.5 py-1 rounded-full">📷 Kamera</button>
                <button onClick={() => galleryRef.current?.click()}
                  className="bg-black/60 text-white text-xs px-2.5 py-1 rounded-full">🖼️ Galeri</button>
              </div>
              <span className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">📅 timestamp ✓</span>
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
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-8 h-8 text-xs flex items-center justify-center"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
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
          FIXED NAVIGATION BAR
          ══════════════════════════════════════════ */}
      <div className="fixed bottom-[calc(var(--bottom-nav-h)+var(--safe-bottom))] left-0 right-0 z-50 h-[4.25rem]">
        <div className="h-full bg-white/95 backdrop-blur border-t border-gray-100 shadow-xl px-4 py-3">
          <div className="flex items-center gap-2 max-w-md mx-auto h-full">
            {currentStep > 1 ? (
              <button onClick={goBack}
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-semibold text-sm hover:bg-gray-200 transition-colors flex-shrink-0">
                ← Kembali
              </button>
            ) : (
              <div className="w-2 flex-shrink-0" />
            )}
            {stepMeta.optional && currentStep !== 6 && (
              <button onClick={skipStep}
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors flex-shrink-0">
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
        <Modal
          ariaLabel="Info tag"
          onClose={() => setActiveTooltip(null)}
          showCloseButton={false}
          panelClassName="relative bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] overflow-y-auto overscroll-contain outline-none"
        >
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
              <button onClick={() => setActiveTooltip(null)} aria-label="Tutup info"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-600 hover:bg-black/5 hover:text-gray-800 transition-colors"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
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
        </Modal>
      )}

      {/* ══════════════════════════════════════════
          SUBJECT PICKER MODAL
          ══════════════════════════════════════════ */}
      {showIBPicker && (
        <Modal
          ariaLabel="Pilih Mata Pelajaran"
          onClose={() => setShowIBPicker(false)}
          showCloseButton={false}
          panelClassName="relative bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[88vh] overflow-y-auto overscroll-contain outline-none"
        >
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
                        <button type="button" aria-label={`Hapus ${s}`}
                          onClick={() => setSubjects((prev) => prev.filter((x) => x !== s))}
                          className="-my-1 -mr-1 p-1.5 text-blue-200 hover:text-white"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
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
        </Modal>
      )}

      {/* ══════════════════════════════════════════
          CLOSE-OUT LAPORAN SESI
          ══════════════════════════════════════════ */}
      {showCloseOut && coSessionData && currentStudent && (
        <Modal
          ariaLabel="Laporan sesi"
          onClose={closeReport}
          showCloseButton={false}
          panelClassName="relative bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto overscroll-contain outline-none"
        >
          <div style={{ fontFamily: "'Nunito', sans-serif" }}>

            {/* ── REPORT HEADER ── */}
            <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)" }}>
              {/* Decorative circles */}
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white opacity-10" />
              <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white opacity-10" />
              <div className="absolute top-4 right-16 w-8 h-8 rounded-full bg-white opacity-10" />

              <div className="relative px-5 pt-6 pb-5">
                <button type="button" onClick={closeReport} aria-label="Tutup laporan"
                  className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/25 text-white backdrop-blur-sm hover:bg-white/40 transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
                <div className="flex items-center gap-4 mb-4">
                  {/* Avatar */}
                  <div className="w-16 h-16 rounded-2xl bg-white/25 backdrop-blur-sm flex items-center justify-center shadow-lg border-2 border-white/30">
                    <span className="text-2xl font-black text-white">{currentStudent.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="inline-flex items-center gap-1.5 bg-white/20 text-white/90 text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full mb-1">
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
                    <p className="text-white/70 text-xs font-bold uppercase tracking-wider">📅 Tanggal</p>
                    <p className="text-white text-sm font-black mt-0.5">{coSessionData.date.slice(5).replace("-", "/")}</p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 text-center border border-white/20">
                    <p className="text-white/70 text-xs font-bold uppercase tracking-wider">⏱️ Durasi</p>
                    <p className="text-white text-sm font-black mt-0.5">{coSessionData.durationHours} jam</p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 text-center border border-white/20">
                    <p className="text-white/70 text-xs font-bold uppercase tracking-wider">🎯 Skor</p>
                    <p className="text-white text-sm font-black mt-0.5">{engTouched ? `${engScore}/10` : "—"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── REPORT BODY ── */}
            <div className="p-5 space-y-4">

              {/* Catatan sesi */}
              <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                <p className="text-xs font-black text-blue-700 uppercase tracking-widest mb-2">📝 Catatan Sesi</p>
                <p className="text-sm text-gray-700 leading-relaxed font-semibold">{coSessionData.shortNote}</p>
                {coSessionData.topic && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-blue-600 text-xs">💡</span>
                    <p className="text-xs text-blue-700 font-semibold">Topik: {coSessionData.topic}</p>
                  </div>
                )}
              </div>

              {/* Engagement */}
              {engTouched && engScoreInfo && (
                <div className="rounded-2xl p-4 border" style={{ borderColor: engScoreInfo.color + "30", background: engScoreInfo.bg }}>
                  <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: engScoreInfo.color }}>
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
                      <p className="text-xs text-gray-700 mt-1 leading-relaxed">
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
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
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
                    {paginatedCoFollowUps.map((f) => {
                      return (
                        <div key={f.id} className="flex items-center gap-2 bg-amber-50 rounded-xl px-3 py-2.5 border border-amber-100">
                          <span className="text-amber-400">🔁</span>
                          <p className="flex-1 text-sm font-semibold text-gray-700">{f.text}</p>
                          <button onClick={() => setCoFollowUps((prev) => prev.filter((item) => item.id !== f.id))}
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
                  <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">💬 Update Orang Tua</p>
                  {aiError && (
                    <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-2">{aiError}</p>
                  )}
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-3.5 mb-2">
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed font-sans">
                      {aiWaText ?? buildWaMessage(currentStudent, coSessionData, coFollowUps.map((item) => item.text), tutorName)}
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
                  <a href={`https://wa.me/${waNumber}?text=${encodeURIComponent(aiWaText ?? buildWaMessage(currentStudent, coSessionData, coFollowUps.map((item) => item.text), tutorName))}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-green-500 text-white font-black text-sm hover:bg-green-600 transition-colors shadow-md shadow-green-200">
                    <span className="text-lg">💬</span> Kirim ke {currentStudent.parentContact.name || "Orang Tua"}
                  </a>
                </div>
              )}

              {/* Perbaiki catatan tanpa membuat sesi kedua (audit C-05) */}
              <button type="button" onClick={handleFixNote}
                className="w-full py-3 rounded-2xl border border-gray-300 bg-white text-gray-700 font-bold text-sm hover:bg-gray-50 transition-colors">
                ✏️ Perbaiki catatan sesi
              </button>

              {/* Done button */}
              <button onClick={handleCloseOutDone} disabled={coSaving}
                className="w-full py-4 rounded-2xl font-black text-base text-white transition-all disabled:opacity-50 shadow-lg"
                style={{ background: "linear-gradient(135deg, #1f2937, #374151)" }}>
                {coSaving ? "⏳ Menyimpan..." : "🏁 Selesai & Lihat Profil"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Poles WA AI modal */}
      <AiCostModal
        open={showAiWaModal}
        title="Poles WA AI"
        estimatedIDR={estimatePolishWACost(originalWaMessage.length)}
        description="Poles pesan WhatsApp jadi lebih hangat dan personal"
        dataSent="Pesan awal sesi: nama murid dan tutor, tanggal, mapel, durasi, catatan sesi, topik, dan tindak lanjut yang tercantum dalam pesan."
        onCancel={() => setShowAiWaModal(false)}
        onConfirm={async () => {
          setShowAiWaModal(false);
          if (!currentStudent || !coSessionData) return;
          setAiWaLoading(true); setAiError("");
          try {
            const res = await polishWhatsApp({ original: originalWaMessage, studentName: currentStudent.name, tutorName });
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
          <Modal
            ariaLabel="Draft Catatan dengan AI"
            onClose={() => setShowAiCostModal(false)}
            panelClassName="relative bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 pb-8 space-y-4 max-h-[92vh] overflow-y-auto overscroll-contain outline-none"
          >
              <h3 className="font-bold text-base">✨ Draft Catatan dengan AI</h3>
              <div className="bg-indigo-50 rounded-xl p-3 space-y-1">
                <p className="text-sm font-semibold text-indigo-700">Estimasi biaya DeepSeek</p>
                <p className="text-xs text-indigo-600">
                  {DEEPSEEK_MODEL_LABEL} · tarif {getDeepSeekPricing().period} · ~{est.inputTokens} token masukan + {est.outputTokens} token keluaran
                </p>
                <p className="text-sm font-bold text-indigo-800">
                  ≈ ${est.usdCost.toFixed(6)} (Rp {est.idrCost.toFixed(4)})
                </p>
                <p className="text-xs text-gray-500">{DEEPSEEK_COST_NOTE}</p>
                <a href={DEEPSEEK_PRICING_URL} target="_blank" rel="noopener noreferrer"
                  className="inline-block text-xs text-blue-600 underline">Sumber tarif resmi DeepSeek</a>
              </div>
              <p className="text-xs text-gray-500">
                {currentDraft
                  ? `Tulisan di textbox (${currentDraft.length} karakter) dikirim sebagai bahan utama, lalu dipoles AI.`
                  : "Textbox kosong — AI akan membuat catatan baru."}
              </p>
              <div className="rounded-xl border border-gray-200 p-3 space-y-1">
                <p className="text-xs font-semibold text-gray-700">Data yang dikirim ke DeepSeek</p>
                <p className="text-xs text-gray-600">
                  Nama, level dan kelas murid; mapel, topik, jenis dan durasi sesi, mood, area perhatian, prediksi nilai, Situasi Hari Ini,
                  skor dan indikator engagement, label perilaku dan respons, catatan sesi lalu, tindak lanjut,
                  isi textbox, dan gaya penulisan yang dipilih. Data opsional disertakan bila tersedia.
                </p>
              </div>
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
                        ...(engRestless      ? ["gelisah loncat-loncat"]: []),
                        ...(engOffTask       ? ["sibuk sendiri"]        : []),
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
                        situasiNote: situasiNote.trim() || undefined,
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
          </Modal>
        );
      })()}
    </div>
  );
}
