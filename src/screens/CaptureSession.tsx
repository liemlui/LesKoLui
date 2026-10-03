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
import { ENGAGEMENT_LEVELS, scoreBasisLabel } from "../lib/engagement";
import { IB_MYP_SUBJECTS, IB_DP_GROUPS, getSubjectGroups, CURRICULUM_META } from "../lib/ibSubjects";
import { generateNote, generateEngagementNarrative } from "../lib/sessionTemplates";
import { BEHAVIOR_TAGS, RESPONSE_TAGS } from "../lib/responseTaxonomy";
import type { SessionType } from "../lib/sessionTemplates";
import { MIN_DURATION } from "../db/types";
import { estimatePolishWACost } from "../lib/aiClient";
import { AiCostModal } from "../components/AiCostModal";
import { SimpleMarkdown } from "../components/SimpleMarkdown";
import Breadcrumb from "../components/Breadcrumb";
import { clampPage, paginateItems } from "../lib/pagination";
import { scheduleCaptureMismatch } from "../lib/scheduleCapture";
import type { ScheduleCaptureLock } from "../lib/scheduleCapture";
import useEngagement, { PRIMARY_ENGAGEMENT_FLAGS, SECONDARY_ENGAGEMENT_FLAGS } from "./captureSession/useEngagement";
import useStudentBrief from "./captureSession/useStudentBrief";
import useCaptureDraft from "./captureSession/useCaptureDraft";
import AiCostConfirmModal from "./captureSession/AiCostConfirmModal";
import AiTagTooltip from "./captureSession/AiTagTooltip";
import useAiFill from "./captureSession/useAiFill";
import CloseOutSheet from "./captureSession/CloseOutSheet";
import ConfirmSheet from "../components/ConfirmSheet";
import ScheduleStep from "./captureSession/ScheduleStep";
import useTopicSelection from "./captureSession/useTopicSelection";
import type { CaptureDraft, CaptureDraftForm } from "../db/types";
import { MOODS } from "../lib/moods";
import {
  SITUASI_CHIPS, ENGAGEMENT_FLAG_META, STEP_META, TASK_BAR_H, isValidStep,
} from "./captureSession/constants";
import type { StepMeta, StepNum } from "./captureSession/constants";
import {
  buildWaMessage, topicLevelHint, draftStamp, splitTopics,
  appendSituasi, hasSituasi, saveErrorMessage,
} from "./captureSession/helpers";

/** Ikon per langkah ditempelkan di sini (bukan di `constants.ts`) supaya berkas
 *  konstanta bebas dependensi UI dan bisa diimpor unit test. */
function iconForStep(name: StepMeta["icon"]) {
  switch (name) {
    case "target":    return TargetIcon;
    case "book":      return BookIcon;
    case "smile":     return SmileIcon;
    case "clipboard": return ClipboardIcon;
    case "pencil":    return PencilIcon;
    default:          return CameraIcon;
  }
}

/** Metadata langkah + ikonnya — dipakai stepper dan kartu judul langkah. */
const STEPS = STEP_META.map((s) => ({ ...s, Icon: iconForStep(s.icon) }));

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
  const { currentStudent, studentSubjects, briefLastSession, briefFollowUps, studentRecentSessions } = useStudentBrief(studentId);
  const {
    topics, setTopics, topicUnits, setTopicUnits, topicSearch, setTopicSearch,
    setTopicResponse, topicAllowOffLevel, setTopicAllowOffLevel,
    topicResults, topicMeta, topicOffLevel, topic, runTopicSearch,
    showBrowse, setShowBrowse, openUnit, setOpenUnit, browseSubjects, browseGroups,
    topicUnit, recentTopicChips, addTopic, addTopicsFromInput, removeTopic,
  } = useTopicSelection({
    subjects, studentSubjects, student: currentStudent,
    recentSessions: studentRecentSessions,
  });
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
  const [needsWork,      setNeedsWork]       = useState("");
  const [sessionDate,    setSessionDate]     = useState(today);
  const [saving,         setSaving]          = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string; retry: "save" | "closeout" | null } | null>(null);

  /**
   * C-05: hapus foto bukti / tanda tangan / tindak lanjut tidak bisa dikembalikan —
   * fotonya harus diambil ulang dari kamera. Karena itu ketiganya lewat satu
   * `ConfirmSheet` (satu state, tiga kemungkinan aksi) alih-alih menghapus langsung.
   */
  const [confirmDelete, setConfirmDelete] = useState<{ title: string; message: string; confirmLabel: string; onConfirm: () => void } | null>(null);

  // Session type
  const [sessionType, setSessionType] = useState<SessionType | undefined>();

  // Engagement indicators
  const {
    flags: engFlags,
    mood, setMood,
    level: engLevel, setLevel: setEngLevel,
    behaviorTags, setBehaviorTags,
    responseTag, setResponseTag,
    showBehavior, setShowBehavior,
    activeTooltip, setActiveTooltip,
    situasiNote, setSituasiNote,
    touched: engTouched, hasEngagementInput,
    basis: engBasis,
    score: engScore, scoreInfo: engScoreInfo,
    toggleFlag, resetEngagementFlags, resetAll, hydrate: hydrateEngagement,
    undoAvailable, undo: undoEngagement,
  } = useEngagement();
  const {
    prepared: engPrepared, focused: engFocused, drowsy: engDrowsy,
    playingPhone: engPhone, activeAsking: engActiveAsking, quickLearner: engQuickLearner,
    needsRepetition: engNeedsRepeat, hwMissed: engHwMissed, late: engLate,
    bathroomBreaks: engBathroom, restless: engRestless, offTask: engOffTask,
  } = engFlags;
  /** Indikator di luar 6 terdepan (audit P2 #13). */
  const [showMoreFlags, setShowMoreFlags] = useState(false);

  // ── Topik sesi (pencarian, daftar bab, chip topik lalu) ────────────────────
  // Seluruh state & aksinya tinggal di `useTopicSelection` — termasuk alasan
  // meta pencarian (cacat T-03), daftar bab (audit P1 #7), dan chip "topik sesi
  // lalu" (audit P1 #8). Draf tetap dimiliki layar ini.

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
    shortNote: string; topic?: string; topicUnit?: string;
  } | null>(null);
  const [coFollowUps,    setCoFollowUps]    = useState<Array<{ id: string; text: string }>>([]);
  const [coFollowUpText, setCoFollowUpText] = useState("");
  const [coSaving,       setCoSaving]       = useState(false);
  const coSavingRef = useRef(false);
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
    topicUnit,
    topicSearch,
    shortNote,
    needsWork,
    predictedGrade,
    mood,
    engagementLevel: engLevel,
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
    currentStep, sessionDate, duration, subjects, topic, topicUnit, topicSearch, shortNote,
    needsWork, predictedGrade, mood, engLevel, behaviorTags, responseTag, situasiNote,
    sessionType, photo, signature, coSessionData, coFollowUps, coFollowUpText,
    engPrepared, engFocused, engDrowsy, engPhone, engActiveAsking, engQuickLearner,
    engNeedsRepeat, engHwMissed, engLate, engBathroom, engRestless, engOffTask,
  ]);

  const restoreDraft = (draft: CaptureDraft) => {
    const form = draft.form;
    setCurrentStep(isValidStep(form.step) ? form.step : 1);
    setSessionDate(form.date); setDuration(form.durationHours); setSubjects(form.subjects);
    setTopicSearch(form.topicSearch); setTopics(splitTopics(form.topic));
    // Bab ikut dipulihkan (audit P1 #9). Draf lama tidak punya `topicUnit`, dan
    // itu wajar: hanya topik yang pernah dipilih dari daftar bab yang punya bab.
    // Draf menyimpan hanya bab pertama; sisanya diisi ulang saat pengguna
    // memilih lagi dari daftar bab.
    const restoredTopics = splitTopics(form.topic);
    const firstTopic = restoredTopics[0];
    setTopicUnits(form.topicUnit && firstTopic ? { [firstTopic]: form.topicUnit } : {});
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
      level: form.engagementLevel,
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

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage({ kind: "error", text: "File harus berupa gambar (JPG/PNG/WebP).", retry: null });
      e.target.value = ""; return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setMessage({ kind: "error", text: "Foto terlalu besar (maks 50 MB)", retry: null });
      e.target.value = ""; return;
    }
    try {
      const compressed = await compressPhoto(file);
      const stamped    = await stampPhoto(compressed, sessionDate);
      setPhoto(stamped);
    } catch { setMessage({ kind: "error", text: "Gagal kompres foto", retry: null }); }
    e.target.value = "";
  };

  const toggleSubject = (s: string) => setSubjects((prev) => toggleArrayItem(prev, s));

  const resetForm = () => {
    setSubjects([]); setShowIBPicker(false); setIbCustom("");
    setShortNote(""); setPhoto(undefined);
    resetAll(); setPredictedGrade(""); setTopics([]); setTopicUnits({}); setTopicSearch(""); setTopicResponse(null);
    setShowBrowse(false); setOpenUnit(null);
    setNeedsWork("");
    setSignature(undefined); setShowSigPad(false);
    setDuration(MIN_DURATION); setSessionDate(today);
    setSessionType(undefined); setConflictWarn([]);
    setCurrentStep(1); setMessage(null);
  };

  const handleSave = async () => {
    // Sudah tersimpan & laporan belum selesai → jangan buat sesi kedua.
    if (coSessionData && !editingSavedSession) {
      setMessage({ kind: "success", text: "Sesi ini sudah tersimpan. Selesaikan tindak lanjutnya di laporan sesi.", retry: null });
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
    /**
     * Data kondisi sesi (audit P2 #11/#12/#15).
     *
     * Perubahan dari versi sebelumnya:
     *  - disimpan bila ada sinyal APAPUN (`hasEngagementInput`: flag inti, tag
     *    perilaku, respons akademik, atau kondisi umum) — **jangan** kembali
     *    memakai `engTouched` saja, karena tutor yang hanya mencatat mood/tag
     *    tetap harus punya engagement tersimpan;
     *  - `level` (kondisi umum) ikut disimpan — eksplisit, tanpa mengklaim
     *    indikator apa pun;
     *  - `scoreBasis` mencatat seberapa lengkap dasar skornya;
     *  - bila TIDAK ada pengamatan sama sekali, `score` = 0 dan basis `none`,
     *    supaya sesi ini tidak masuk rata-rata sebagai "5/10" (dulu memilih mood
     *    saja sudah membuat skor 5 muncul);
     *  - `mood` tidak lagi dihitung ke dalam skor.
     */
    const engData = hasEngagementInput ? {
      prepared: engPrepared, focused: engFocused,
      drowsy: engDrowsy, playingPhone: engPhone,
      activeAsking: engActiveAsking, quickLearner: engQuickLearner,
      needsRepetition: engNeedsRepeat, hwMissed: engHwMissed,
      late: engLate, bathroomBreaks: engBathroom, restless: engRestless, offTask: engOffTask,
      level: engLevel,
      scoreBasis: engBasis,
      score: engScore,
    } : undefined;
    try {
      let savedSession: {
        id: string; date: string; subjects: string[]; durationHours: number;
        shortNote: string; topic?: string; topicUnit?: string;
      };
      const isUpdate = Boolean(coSessionData && editingSavedSession);
      if (coSessionData && editingSavedSession) {
        // "Perbaiki catatan" → perbarui sesi yang sudah ada (updateSession juga
        // menghitung ulang biaya bila durasi berubah), bukan membuat sesi baru.
        await updateSession(coSessionData.id, {
          subjects: subjects.length > 0 ? subjects : undefined,
          photo, shortNote: shortNote.trim(), mood,
          topic: topic.trim() || undefined,
          topicUnit: topicUnit || undefined,
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
          topicUnit: topicUnit || undefined,
        };
      } else if (scheduleId) {
        const result = await markSessionDoneWithCloseoutDraft(scheduleId, {
          subjects: subjects.length > 0 ? subjects : undefined,
          photo, shortNote: shortNote.trim(), mood,
          topic: topic.trim() || undefined,
          topicUnit: topicUnit || undefined,
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
          topicUnit: topicUnit || undefined,
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
      setMessage({ kind: "error", text: saveErrorMessage(e), retry: "save" });
    } finally {
      setSaving(false);
    }
  };

  const addCoFollowUp = () => {
    if (!coFollowUpText.trim()) return;
    setCoFollowUps((prev) => [...prev, { id: crypto.randomUUID(), text: coFollowUpText.trim() }]);
    setCoFollowUpText("");
  };

  /** C-05: hapus tindak lanjut minta konfirmasi dulu (teksnya tidak bisa dipulihkan). */
  const requestDeleteFollowUp = (id: string) => {
    const item = coFollowUps.find((f) => f.id === id);
    setConfirmDelete({
      title: "Hapus tindak lanjut?",
      message: item?.text
        ? `"${item.text}" akan dihapus dari fokus sesi berikutnya dan tidak bisa dikembalikan.`
        : "Tindak lanjut ini akan dihapus dan tidak bisa dikembalikan.",
      confirmLabel: "Hapus",
      onConfirm: () => { setCoFollowUps((prev) => prev.filter((f) => f.id !== id)); setConfirmDelete(null); },
    });
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
      // Sesi SUDAH tersimpan; yang gagal hanya tindak lanjutnya. Karena itu
      // tombol "Coba lagi" harus memanggil `handleCloseOutDone`, BUKAN
      // `handleSave` — memanggil ulang handleSave akan menyimpan sesi kedua kali.
      setMessage({
        kind: "error",
        text: "Sesi sudah tersimpan; tindak lanjut belum tersimpan. " + saveErrorMessage(e),
        retry: "closeout",
      });
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
    setMessage({ kind: "error", text, retry: null });
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

  const tutorName = settings?.tutorProfile?.name || "Ko Lui";
  const activeSubjects = subjects.length ? subjects : studentSubjects;
  const activeBehaviorLabels = behaviorTags.length > 0
    ? behaviorTags.map((id) => BEHAVIOR_TAGS.find((t) => t.id === id)?.label).filter(Boolean) as string[]
    : [];
  const activeResponseLabel = responseTag
    ? RESPONSE_TAGS.find((t) => t.id === responseTag)?.label
    : undefined;
  const originalWaMessage = currentStudent && coSessionData
    ? buildWaMessage(currentStudent, coSessionData, coFollowUps.map((item) => item.text), tutorName)
    : "";
  const {
    aiNoteLoading, aiWaLoading, aiWaText, setAiWaText, aiError,
    showAiCostModal, setShowAiCostModal, showAiWaModal, setShowAiWaModal,
    aiNoteDraft, setAiNoteDraft, aiNoteOriginal, setAiNoteOriginal,
    aiNoteStyle, setAiNoteStyle, showAiContext, setShowAiContext,
    handleLocalGenerate, appendNoteChip, onAiNoteConfirm, onPolishWa,
  } = useAiFill({
    student: currentStudent, sessionType, subjects: activeSubjects, topic: topic || undefined, mood,
    needsWork, predictedGrade, situasiNote, duration, behaviorLabels: activeBehaviorLabels,
    responseLabel: activeResponseLabel, previousNote: briefLastSession?.shortNote,
    followUps: briefFollowUps.map((f) => f.text),
    engagement: { prepared: engPrepared, focused: engFocused, activeAsking: engActiveAsking,
      quickLearner: engQuickLearner, drowsy: engDrowsy, playingPhone: engPhone,
      needsRepetition: engNeedsRepeat, hwMissed: engHwMissed, late: engLate,
      bathroomBreaks: engBathroom, restless: engRestless, offTask: engOffTask, score: engScore },
    hasEngagementInput: engTouched, originalWaMessage, tutorName, shortNote, setShortNote,
  });

  if (!students) return <Skeleton variant="card" lines={4} className="p-4" />;

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
    draft.status === "saved"  ? "text-[var(--ink-success)]"
    : draft.status === "saving" ? "text-[var(--ink-muted)]"
    : "text-[var(--ink-danger)]";

  /** Ada isian nyata di layar? Dipakai untuk memutuskan apakah draf tertunda
   *  boleh memblokir form atau cukup ditawarkan dengan label eksplisit. */
  const hasFormContent = Boolean(
    shortNote.trim() || needsWork.trim() || predictedGrade.trim() || situasiNote.trim() ||
    subjects.length > 0 || topics.length > 0 || topicSearch.trim() || sessionType ||
    photo || signature || behaviorTags.length > 0 || responseTag || mood || engTouched,
  );

  /** Tambahkan chip situasi ke kolom bebas (pisah koma, tanpa duplikat). */
  const appendSituasiChip = (text: string) => {
    const clean = text.trim();
    if (!clean) return;
    setSituasiNote((prev) => appendSituasi(prev, clean));
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
          <h1 className="text-2xl font-bold text-[var(--ink-strong)]">📓 Catat Sesi</h1>
          <p className="text-xs text-[var(--ink-muted)] mt-0.5">Draf tersimpan menunggu keputusan</p>
        </div>
        <div className="mx-4 rounded-2xl border border-[var(--border-warn)] bg-[var(--bg-warn)] p-4">
          <p className="font-bold text-[var(--ink-warn)]">Draf Catat Sesi tersedia</p>
          <p className="mt-1 text-sm text-[var(--ink-warn)]">
            Draf ini tersimpan di perangkat pada {draftStamp(draft.pending.updatedAt)}. Pilih salah satu
            sebelum mengisi form.
          </p>
          <div className="mt-3 space-y-1 text-xs text-[var(--ink-warn)]">
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
              className="w-full py-3 rounded-xl bg-[var(--bg-warn-strong)] text-[var(--on-strong)] font-bold text-sm hover:bg-[var(--bg-warn-strong)] transition-colors">
              Lanjutkan draf
            </button>
            <button type="button" onClick={() => void draft.discard()}
              className="w-full py-2.5 rounded-xl border border-[var(--border-warn)] bg-[var(--surface-strong)] text-[var(--ink-warn)] font-semibold text-sm hover:bg-[var(--bg-warn)] transition-colors">
              Buang draf & mulai baru
            </button>
          </div>
        </div>
        <p className="mx-4 mt-3 text-xs text-[var(--ink-muted)]">
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
          <h1 className="text-2xl font-bold text-[var(--ink-strong)]">📓 Catat Sesi</h1>
          <p className="text-xs text-[var(--ink-muted)] mt-0.5">Langkah {currentStep} dari {STEPS.length}</p>
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
        <div className="mx-4 mb-3 rounded-xl border border-[var(--border-warn)] bg-[var(--bg-warn)] p-3 text-xs text-[var(--ink-warn)]">
          <p className="font-semibold">Draf sesi tersimpan untuk murid ini</p>
          <p className="mt-0.5">
            Isian di layar ini sudah ada — memuat draf akan menimpa isian tersebut.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={draft.resume}
              className="rounded-lg bg-[var(--bg-warn-strong)] px-3 py-2 font-semibold text-[var(--on-strong)] hover:bg-[var(--bg-warn-strong)] transition-colors">
              Ganti dengan draf
            </button>
            <button type="button" onClick={() => void draft.discard()}
              className="rounded-lg border border-[var(--border-warn)] bg-[var(--surface-strong)] px-3 py-2 font-semibold text-[var(--ink-warn)] hover:bg-[var(--bg-warn)] transition-colors">
              Hapus draf, pakai isian layar
            </button>
          </div>
        </div>
      )}

      {/* Sesi sudah tersimpan tapi laporan belum rampung → beri jalan kembali
          tanpa menyimpan ulang (audit C-05). */}
      {coSessionData && !editingSavedSession && !showCloseOut && (
        <div className="mx-4 mb-3 rounded-xl border border-[var(--border-success)] bg-[var(--bg-success)] p-3 text-xs text-[var(--ink-success)]">
          <p className="font-semibold">✅ Sesi sudah tersimpan</p>
          <p className="mt-0.5">Tindak lanjut sesi berikutnya & pesan ke orang tua belum diselesaikan.</p>
          <button type="button" onClick={() => setShowCloseOut(true)}
            className="mt-2 rounded-lg bg-[var(--bg-success-strong)] px-3 py-2 font-semibold text-[var(--on-strong)] hover:bg-[var(--bg-success-strong)] transition-colors">
            Buka laporan sesi
          </button>
        </div>
      )}

      {!draft.pending && (draft.status === "unsaved" || draft.status === "conflict") && (
        <div
          role="alert"
          className={`mx-4 mb-3 rounded-xl border p-3 text-xs ${
            draft.status === "conflict"
              ? "border-[var(--border-danger)] bg-[var(--bg-danger)] text-[var(--ink-danger)]"
              : "border-[var(--border-warn)] bg-[var(--bg-warn)] text-[var(--ink-warn)]"}`}
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
                className="rounded-lg bg-[var(--bg-warn-strong)] px-3 py-2 font-semibold text-[var(--on-strong)] hover:bg-[var(--bg-warn-strong)] transition-colors">
                Coba simpan lagi
              </button>
            ) : (
              <>
                <button type="button" onClick={() => void draft.reload()}
                  className="rounded-lg bg-[var(--bg-danger-strong)] px-3 py-2 font-semibold text-[var(--on-strong)] hover:bg-[var(--bg-danger-strong)] transition-colors">
                  Pakai versi tersimpan
                </button>
                <button type="button" onClick={() => void draft.overwrite()}
                  className="rounded-lg border border-[var(--border-danger)] bg-[var(--surface-strong)] px-3 py-2 font-semibold text-[var(--ink-danger)] hover:bg-[var(--bg-danger)] transition-colors">
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
          <div className="absolute top-4 left-4 right-4 h-0.5 bg-[var(--bg-subtle)] z-0" />
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
                  ${done   ? "bg-[var(--bg-success-strong)] text-[var(--on-strong)] scale-95"
                  : active ? "bg-[var(--brand-solid)] text-[var(--on-strong)] ring-4 ring-[var(--brand-tint-strong)] scale-110"
                  :          "bg-[var(--surface-strong)] text-[var(--ink-muted)] border-2 border-[var(--border)]"}`}>
                  {done ? "✓" : <step.Icon size={16} />}
                </div>
                <span className={`text-xs font-bold tracking-wide transition-colors
                  ${active ? "text-[var(--ink-brand)]" : done ? "text-[var(--ink-success)]" : "text-[var(--ink-muted)]"}`}>
                  {step.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── STEP HEADER CARD ── */}
      <div className="mx-4 mb-4 rounded-2xl border border-[var(--border)] bg-gradient-to-r from-gray-50 to-white px-4 py-3 flex items-center gap-3 shadow-sm">
        <div className="w-10 h-10 rounded-xl bg-[var(--brand-tint-strong)] text-[var(--ink-brand)] flex items-center justify-center flex-shrink-0">
          <stepMeta.Icon size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-[var(--ink-strong)] text-base">{stepMeta.label}</h2>
          <p className="text-xs text-[var(--ink-muted)]">{stepMeta.desc}</p>
        </div>
        {stepMeta.optional && (
          <span className="text-xs bg-[var(--bg-subtle)] text-[var(--ink-muted)] px-2 py-1 rounded-full font-semibold uppercase tracking-wide flex-shrink-0">
            opsional
          </span>
        )}
      </div>

      {/* ── MESSAGE ── */}
      {/* Audit Q16d: saat laporan sesi masih terbuka, kegagalan MENYIMPAN TINDAK
          LANJUT ditampilkan di dalam modal itu (lihat prop `closeOutError` di
          bawah) — banner halaman tidak terjangkau keyboard selama fokus terkunci
          di dialog. Pesan yang sama tidak boleh tampil dua kali. */}
      {message && !(showCloseOut && message.retry === "closeout") && (
        <div className="mx-4 mb-3">
          <div
            ref={messageRef}
            tabIndex={-1}
            role={message.kind === "error" ? "alert" : "status"}
            className={`flex items-start gap-2 rounded-xl border p-3 text-sm font-medium outline-none ${
            message.kind === "success" ? "border-[var(--border-success)] bg-[var(--bg-success)] text-[var(--ink-success)]" : "border-[var(--border-danger)] bg-[var(--bg-danger)] text-[var(--ink-danger)]"}`}>
            <span className="flex-1">{message.text}</span>
            {/* Audit C-11: kegagalan simpan harus punya jalan keluar, bukan hanya
                pesan. Tombolnya memanggil handler yang SESUAI dengan kegagalannya
                (`handleSave` vs `handleCloseOutDone`) — lihat dua catch di atas. */}
            {message.kind === "error" && message.retry !== null && (
              <button
                type="button"
                disabled={saving || coSaving}
                onClick={() => {
                  const target = message.retry;
                  setMessage(null);
                  if (target === "save") handleSave();
                  else handleCloseOutDone();
                }}
                className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-lg border border-[var(--border-danger)] bg-[var(--surface-strong)] px-3 text-sm font-bold text-[var(--ink-danger)] transition hover:bg-[var(--bg-danger)] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-brand)]"
              >
                Coba lagi
              </button>
            )}
            <button
              type="button"
              aria-label="Tutup pesan"
              onClick={() => setMessage(null)}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-current/80 transition hover:bg-[var(--scrim)]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-brand)]"
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
        <ScheduleStep
          scheduleId={scheduleId}
          student={currentStudent}
          studentId={studentId}
          students={students}
          sessionDate={sessionDate}
          today={today}
          duration={duration}
          sessionType={sessionType}
          conflictCount={conflictWarn.length}
          lastSession={briefLastSession}
          followUps={briefFollowUps}
          paginatedFollowUps={paginatedBriefFollowUps}
          followUpPage={safeBriefFollowPage}
          onNavigateToNewCapture={() => navigate("/capture")}
          onStudentChange={setStudentId}
          onSessionDateChange={setSessionDate}
          onDurationChange={setDuration}
          onSessionTypeChange={(newType) => {
            setSessionType(newType);
            if (newType && !shortNote.trim()) {
              setShortNote(generateNote(newType, subjects[0] ?? studentSubjects[0], topic));
            }
          }}
          onFollowUpPageChange={setBriefFollowPage}
        />
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
                ? <span className="text-[var(--ink-danger)] ml-1">*</span>
                : <span className="text-[var(--ink-muted)] font-normal text-xs ml-1">(opsional)</span>}
            </label>
            <div className="flex flex-wrap gap-2 mt-1">
              {studentSubjects.map((s) => (
                <button key={s} type="button"
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    subjects.includes(s) ? "bg-[var(--brand-solid)] text-[var(--on-strong)] border-[var(--border-brand)]" : "bg-[var(--surface-strong)] text-[var(--ink-muted)] border-[var(--border)]"}`}
                  onClick={() => toggleSubject(s)}>{s}</button>
              ))}
              {subjects.filter((s) => !studentSubjects.includes(s)).map((s) => (
                <button key={s} type="button"
                  className="px-3 py-1.5 rounded-full text-sm font-medium border bg-[var(--accent-solid)] text-[var(--on-strong)] border-[var(--border-accent)] flex items-center gap-1"
                  onClick={() => setSubjects((prev) => prev.filter((x) => x !== s))}>
                  {s} <span className="text-[var(--ink-purple)] text-xs"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></span>
                </button>
              ))}
              <button type="button"
                className="px-3 py-1.5 rounded-full text-sm font-medium border bg-[var(--surface-strong)] text-[var(--ink-muted)] border-dashed border-[var(--border)] hover:border-[var(--border-accent)] hover:text-[var(--ink-purple)] transition-colors"
                onClick={() => { setShowIBPicker(true); setIbTab("MYP"); }}>
                + Tambah Mapel{currentStudent?.curriculum ? ` (${CURRICULUM_META[currentStudent.curriculum].shortLabel})` : ""}
              </button>
            </div>
          </div>

          {/* Topik — search + multi-select */}
          <div>
            <label htmlFor="cs-topik" className="label">🎯 Topik <span className="text-[var(--ink-muted)] font-normal text-xs">(cari topik, pilih beberapa, atau ketik bebas — pisahkan dengan ;)</span></label>
            {/* Jenjang yang sedang diprioritaskan (audit P0) — sebelumnya
                pembatasan level tidak terlihat, sehingga tutor tidak tahu
                mengapa daftar topiknya sedikit. */}
            {topicSearch.trim() && topicLevelHint(
              currentStudent?.curriculum, currentStudent?.grade, topicMeta?.targetLevel ?? null,
            ) && (
              <p className="mt-1 text-xs text-[var(--ink-muted)]">
                Menampilkan topik jenjang <span className="font-semibold text-[var(--ink-strong)]">{
                  topicLevelHint(currentStudent?.curriculum, currentStudent?.grade, topicMeta?.targetLevel ?? null)
                }</span>
                {topicOffLevel && topicAllowOffLevel ? " — mode level lain aktif" : ""}
              </p>
            )}
            <div className="relative">
              <input id="cs-topik" className="input pr-8" maxLength={150}
                placeholder="Cari topik atau ketik custom — mis. Integral substitution; Essay structure..."
                value={topicSearch}
                onChange={(e) => runTopicSearch(e.target.value)}
                onFocus={() => { if (topicSearch.trim()) runTopicSearch(topicSearch); }}
                onBlur={() => setTimeout(() => setTopicResponse(null), 150)}
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
                  onClick={() => { setTopicSearch(""); setTopicResponse(null); setTopicAllowOffLevel(false); }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-[var(--ink-muted)] hover:text-[var(--ink-strong)] transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              )}
            </div>
            {/* Chip topik terpilih — lengkap dengan babnya (audit P1 #9) */}
            {topics.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {topics.map((t) => (
                  <span key={t} className="inline-flex items-start gap-1 bg-[var(--brand-tint)] text-[var(--ink-brand)] border border-[var(--brand-tint-strong)] rounded-full px-2.5 py-1 text-xs font-medium">
                    <span>
                      {t}
                      {topicUnits[t] && (
                        <span className="block text-xs font-normal text-[var(--ink-brand)]">📚 {topicUnits[t]}</span>
                      )}
                    </span>
                    <button type="button"
                      onClick={() => removeTopic(t)}
                      aria-label={`Hapus topik ${t}`}
                      className="-m-1 p-1 rounded-full text-[var(--ink-brand)] hover:text-[var(--ink-brand)] transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
            {/* Topik sesi lalu (audit P1 #8) — 1 ketuk untuk kasus paling umum */}
            {recentTopicChips.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wide mb-1">
                  ↩ Topik sesi lalu — ketuk untuk pakai lagi
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {recentTopicChips.map((t) => (
                    <button key={t} type="button"
                      onClick={() => addTopic(t)}
                      className={`rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        topics.includes(t)
                          ? "border-[var(--border-success)] bg-[var(--bg-success-strong)] text-[var(--on-strong)]"
                          : "border-[var(--border-success)] bg-[var(--surface-strong)] text-[var(--ink-success)] hover:bg-[var(--bg-success)]"
                      }`}>
                      {topics.includes(t) ? "✓ " : ""}{t}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* Pilih dari daftar bab (audit P1 #7) — untuk tutor yang ingin
                MEMBACA pilihan, bukan mengingat kata kunci. */}
            {browseSubjects.length > 0 && currentStudent?.curriculum && (
              <div className="mt-3 rounded-xl border border-[var(--border)] overflow-hidden">
                <button type="button"
                  onClick={() => { setShowBrowse((v) => !v); setOpenUnit(null); }}
                  aria-expanded={showBrowse}
                  className="flex w-full items-center justify-between gap-2 bg-[var(--surface)] px-3.5 py-3 text-left hover:bg-[var(--bg-subtle)] transition-colors">
                  <span className="text-xs font-bold text-[var(--ink-muted)] uppercase tracking-wide">
                    📚 Pilih dari daftar bab
                  </span>
                  <span className="text-xs font-semibold text-[var(--ink-muted)]">
                    {showBrowse ? "Sembunyikan ▲" : "Lihat ▼"}
                  </span>
                </button>
                {showBrowse && (
                  <div className="divide-y divide-[var(--border)] bg-[var(--surface-strong)]">
                    {browseGroups.length === 0 ? (
                      <p className="px-3.5 py-3 text-xs text-[var(--ink-muted)]">
                        Belum ada bab untuk mapel ini pada jenjang {
                          topicLevelHint(currentStudent.curriculum, currentStudent.grade, topicMeta?.targetLevel ?? null) ?? "murid ini"
                        }. Pakai pencarian atau tulis topik sendiri di bawah.
                      </p>
                    ) : (
                      browseGroups.map((group) => {
                        const open = openUnit === group.unit;
                        const selectedCount = group.topics.filter((t) => topics.includes(t.topic)).length;
                        return (
                          <div key={group.unit}>
                            <button type="button"
                              onClick={() => setOpenUnit(open ? null : group.unit)}
                              aria-expanded={open}
                              className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left hover:bg-[var(--brand-tint)] transition-colors">
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-medium text-[var(--ink-strong)]">{group.unit}</span>
                                <span className="block text-xs text-[var(--ink-muted)]">
                                  {group.topics.length} topik · {group.topics[0]?.gradeLabel}
                                </span>
                              </span>
                              <span className="flex shrink-0 items-center gap-1.5">
                                {selectedCount > 0 && (
                                  <span className="rounded-full bg-[var(--brand-tint-strong)] px-1.5 py-0.5 text-xs font-bold text-[var(--ink-brand)]">
                                    {selectedCount}
                                  </span>
                                )}
                                <span className="text-[var(--ink-muted)]" aria-hidden="true">{open ? "▲" : "▼"}</span>
                              </span>
                            </button>
                            {open && (
                              <div className="space-y-1 px-3.5 pb-3">
                                {group.topics.map((t) => {
                                  const checked = topics.includes(t.topic);
                                  return (
                                    <label key={`${t.unit}::${t.topic}`}
                                      className={`flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors ${
                                        checked ? "bg-[var(--brand-tint)] text-[var(--ink-brand)]" : "text-[var(--ink-strong)] hover:bg-[var(--surface)]"
                                      }`}>
                                      <input type="checkbox" checked={checked} className="mt-0.5"
                                        onChange={() => (checked ? removeTopic(t.topic) : addTopic(t.topic, t.unit))} />
                                      <span className="min-w-0">{t.topic}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}
            {/* Dropdown hasil pencarian */}
            {topicResults.length > 0 && (
              <div className="mt-1">
                {topicOffLevel && topicAllowOffLevel && (
                  <p className="mb-1 rounded-lg border border-[var(--border-warn)] bg-[var(--bg-warn)] px-2.5 py-1.5 text-xs text-[var(--ink-warn)]">
                    ⚠️ Topik di bawah berasal dari <span className="font-semibold">{topicMeta?.otherLevels.join(", ")}</span> — <span className="font-semibold">bukan</span> jenjang murid ini.
                  </p>
                )}
                <div className="bg-[var(--surface-strong)] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm max-h-52 overflow-y-auto">
                  {topicResults.map((t, i) => (
                    <button key={`${t.topic}-${i}`} type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      className={`block w-full text-left px-3.5 py-2.5 border-b border-[var(--border)] last:border-0 hover:bg-[var(--brand-tint)] transition-colors ${topics.includes(t.topic) ? "bg-[var(--brand-tint)]" : ""}`}
                      onClick={() => addTopic(t.topic, t.unit)}>
                      <span className="font-semibold text-[var(--ink-strong)] text-sm">{t.topic}</span>
                      <span className={`text-xs ml-2 ${topicOffLevel ? "text-[var(--ink-warn)] font-medium" : "text-[var(--ink-muted)]"}`}>{t.gradeLabel} · {t.unit}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* Tidak ada topik pada jenjang murid — tawarkan pilihan SADAR
                (audit T-03): sebelumnya aplikasi diam-diam menampilkan topik
                level lain seolah-olah topik murid itu. */}
            {topicSearch.trim() && topicMeta && !topicMeta.inLevel && !topicAllowOffLevel && (
              <div className="mt-1.5 rounded-xl border border-[var(--border-warn)] bg-[var(--bg-warn)] p-3">
                <p className="text-xs font-semibold text-[var(--ink-warn)]">
                  Tidak ada topik jenjang {
                    topicLevelHint(currentStudent?.curriculum, currentStudent?.grade, topicMeta.targetLevel) ?? "murid ini"
                  } untuk mapel ini.
                </p>
                <p className="mt-0.5 text-xs text-[var(--ink-warn)]">
                  {topicResults.length > 0
                    ? `Ada ${topicResults.length} topik pada jenjang lain (${topicMeta.otherLevels.join(", ")}) — berbeda dari jenjang murid, jadi periksa dulu sebelum dipakai.`
                    : "Belum ada saran untuk kueri ini. Tulis sendiri lewat \"Tambah topik custom\" di bawah."}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {/* Tombol-tombol di bawah hanya muncul bila fallback benar-benar
                      menghasilkan saran — supaya tidak ada tombol yang tidak
                      melakukan apa pun (kotak kuning tetap tampil sebagai pesan). */}
                  {topicResults.length > 0 && (
                    <>
                      <button type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setTopicAllowOffLevel(true)}
                        className="rounded-lg border border-[var(--border-warn)] bg-[var(--surface-strong)] px-3 py-2 text-xs font-semibold text-[var(--ink-warn)] hover:bg-[var(--bg-warn)] transition-colors">
                        Tampilkan topik jenjang lain
                      </button>
                      <button type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={addTopicsFromInput}
                        className="rounded-lg bg-[var(--bg-warn-strong)] px-3 py-2 text-xs font-semibold text-[var(--on-strong)] hover:bg-[var(--bg-warn-strong)] transition-colors">
                        Pakai "{topicSearch.trim()}" sebagai topik
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
            {/* Indikator topik custom — hanya saat kotak kuning tidak tampil,
                supaya aksinya tidak muncul dua kali di layar. */}
            {topicSearch.trim() && topicResults.length === 0 && (topicMeta == null || topicMeta.inLevel) && (
              <button type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={addTopicsFromInput}
                className="text-xs text-[var(--ink-muted)] mt-1.5 hover:text-[var(--ink-brand)] transition-colors">
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

          {/* ══ LAPIS 1 — kondisi umum: satu ketukan, tanpa mengklaim indikator ══
              Menggantikan preset lama "✨ Lancar / 😐 Biasa / 😴 Kurang Fit" yang
              menyalakan indikator yang belum tentu diamati (mis. "aktif bertanya"
              hanya karena tutor menekan "Lancar") — audit P2 #12. */}
          <div>
            <p className="text-xs font-bold text-[var(--ink-muted)] uppercase tracking-wide mb-2">
              Kondisi les hari ini
            </p>
            <div className="grid gap-2">
              {ENGAGEMENT_LEVELS.map((opt) => {
                const active = engLevel === opt.value;
                return (
                  <button key={opt.value} type="button"
                    aria-pressed={active}
                    onClick={() => setEngLevel(active ? undefined : opt.value)}
                    className={`flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left transition-all ${
                      active ? opt.activeClass + " shadow-sm" : opt.idleClass
                    }`}>
                    <span className="text-lg">{opt.icon}</span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{opt.label}</span>
                      <span className={`block text-xs ${active ? "opacity-90" : "text-[var(--ink-muted)]"}`}>{opt.hint}</span>
                    </span>
                    {active && <span className="ml-auto text-sm font-bold">✓</span>}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-[var(--ink-muted)]">
              Kondisi tersimpan apa adanya dan <span className="font-semibold">tidak</span> menambah
              atau mengurangi skor.
            </p>
          </div>

          {/* ══ LAPIS 2 — apa yang menonjol hari ini (opsional) ══ */}
          <div className="rounded-xl border border-[var(--border)] p-3.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-[var(--ink-muted)] uppercase tracking-wide">
                Yang menonjol hari ini <span className="font-normal normal-case">(opsional)</span>
              </p>
              {undoAvailable && (
                <button type="button" onClick={undoEngagement}
                  className="text-xs font-semibold text-[var(--ink-brand)] underline underline-offset-2 hover:text-[var(--ink-brand)]">
                  ↩ Batalkan
                </button>
              )}
            </div>

            {/* Enam indikator terdepan (audit P2 #13) — urutan dari data nyata. */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PRIMARY_ENGAGEMENT_FLAGS.map((key) => {
                const meta = ENGAGEMENT_FLAG_META[key];
                const active = Boolean(engFlags[key]);
                return (
                  <button key={key} type="button" onClick={() => toggleFlag(key)}
                    aria-pressed={active}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium transition-all ${
                      active
                        ? meta.tone === "positive"
                          ? "border-[var(--border-success)] bg-[var(--bg-success-strong)] text-[var(--on-strong)]"
                          : "border-[var(--border-danger)] bg-[var(--bg-danger-strong)] text-[var(--on-strong)]"
                        : "border-[var(--border)] bg-[var(--surface-strong)] text-[var(--ink-muted)] hover:border-[var(--border-strong)]"
                    }`}>
                    <span>{meta.icon}</span> {meta.label}
                    <span className={`text-xs font-bold ${active ? "opacity-80" : "text-[var(--ink-muted)]"}`}>{meta.delta}</span>
                  </button>
                );
              })}
            </div>

            {/* Sisanya disembunyikan agar satu sesi biasa tidak melewati 22 kontrol. */}
            <button type="button"
              onClick={() => setShowMoreFlags((v) => !v)}
              aria-expanded={showMoreFlags}
              className="mt-2 text-xs font-semibold text-[var(--ink-brand)] hover:text-[var(--ink-brand)]">
              {showMoreFlags ? "▲ Sembunyikan" : `▼ ${SECONDARY_ENGAGEMENT_FLAGS.length} indikator lain`}
            </button>
            {showMoreFlags && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {SECONDARY_ENGAGEMENT_FLAGS.map((key) => {
                  const meta = ENGAGEMENT_FLAG_META[key];
                  const active = Boolean(engFlags[key]);
                  return (
                    <button key={key} type="button" onClick={() => toggleFlag(key)}
                      aria-pressed={active}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium transition-all ${
                        active
                          ? meta.tone === "positive"
                            ? "border-[var(--border-success)] bg-[var(--bg-success-strong)] text-[var(--on-strong)]"
                            : "border-[var(--border-danger)] bg-[var(--bg-danger-strong)] text-[var(--on-strong)]"
                          : "border-[var(--border)] bg-[var(--surface-strong)] text-[var(--ink-muted)] hover:border-[var(--border-strong)]"
                      }`}>
                      <span>{meta.icon}</span> {meta.label}
                      <span className={`text-xs font-bold ${active ? "opacity-80" : "text-[var(--ink-muted)]"}`}>{meta.delta}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Suasana hati — konteks, bukan penilaian (audit P2 #15). */}
            <div className="mt-3 border-t border-[var(--border)] pt-3">
              <label className="text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wide">
                Suasana hati <span className="font-normal normal-case">(opsional — tidak memengaruhi skor)</span>
              </label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {MOODS.map((m) => (
                  <button key={m.v} type="button"
                    aria-pressed={mood === m.v}
                    className={`rounded-full border px-3 py-2 text-sm transition-colors ${
                      mood === m.v ? "border-[var(--border-accent)] bg-[var(--accent-solid)] text-[var(--on-strong)]" : "border-[var(--border)] bg-[var(--surface-strong)] text-[var(--ink-muted)] hover:border-[var(--border-accent)]"
                    }`}
                    onClick={() => setMood(mood === m.v ? undefined : m.v)}>
                    {m.icon} {m.v}
                  </button>
                ))}
              </div>
            </div>

            {(engTouched || engLevel || behaviorTags.length > 0 || responseTag) && (
              <div className="mt-3 border-t border-[var(--border)] pt-2 text-right">
                <button type="button" onClick={resetEngagementFlags}
                  className="text-xs font-semibold text-[var(--ink-muted)] underline underline-offset-2 hover:text-[var(--ink-strong)]">
                  🔄 Kosongkan kondisi &amp; mood
                </button>
              </div>
            )}
          </div>

          {/* Situasi hari ini — konteks humanis, bukan perilaku */}
          <div>
            <label htmlFor="cs-situasi" className="label">🫶 Situasi Hari Ini <span className="text-[var(--ink-muted)] font-normal text-xs">(opsional — konteks saja, tidak mengurangi skor)</span></label>
            <p className="text-xs text-[var(--ink-muted)] mt-1 mb-2">Cerita di balik sesi hari ini — mis. habis sakit, kurang tidur, ada acara keluarga. Konteks manusiawi untuk tutor &amp; AI saja (tidak dikirim ke WA ortu).</p>
            <textarea id="cs-situasi" className="input" rows={2} maxLength={200} value={situasiNote}
              onChange={(e) => setSituasiNote(e.target.value)}
              placeholder="Contoh: habis sakit, kurang tidur tadi malam, besok ulangan…" />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {SITUASI_CHIPS.map((c) => {
                const active = hasSituasi(situasiNote, c.label);
                return (
                  <button key={c.label} type="button"
                    onClick={() => appendSituasiChip(c.label)}
                    className={`px-2.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      active ? "bg-[var(--bg-success-strong)] text-[var(--on-strong)] border-[var(--border-success)]" : "bg-[var(--surface-strong)] text-[var(--ink-muted)] border-[var(--border)] hover:border-[var(--border-success)] hover:bg-[var(--bg-success)]"}`}>
                    {c.icon} {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ══ LAPIS 3 — observasi lanjutan (opsional) ══ */}
          <div className="border border-[var(--border)] rounded-xl overflow-hidden">
            <button type="button"
              className="flex items-center justify-between w-full px-4 py-3 bg-[var(--surface)] text-sm font-semibold text-[var(--ink-muted)] hover:bg-[var(--bg-subtle)] transition-colors"
              aria-expanded={showBehavior}
              onClick={() => setShowBehavior(!showBehavior)}>
              <span>🧩 Observasi Lanjutan <span className="font-normal text-[var(--ink-muted)]">(opsional — buat laporan lebih kaya)</span></span>
              <div className="flex items-center gap-2">
                {behaviorTags.length > 0 && (
                  <span className="bg-[var(--accent-tint)] text-[var(--ink-purple)] text-xs font-bold px-2 py-0.5 rounded-full">{behaviorTags.length}</span>
                )}
                <span className="text-[var(--ink-muted)]">{showBehavior ? "▲" : "▼"}</span>
              </div>
            </button>
            {showBehavior && (
              <div className="p-4 space-y-4 bg-[var(--surface-strong)]">
                {([
                  ["positive", "✨ Perilaku Positif", "green"],
                  ["neutral", "📊 Perilaku Netral", "gray"],
                  ["negative", "⚠️ Perilaku Negatif", "orange"],
                ] as const).map(([valence, heading, tone]) => (
                  <div key={valence}>
                    <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${
                      tone === "green" ? "text-[var(--ink-success)]" : tone === "orange" ? "text-[var(--ink-attention)]" : "text-[var(--ink-muted)]"
                    }`}>{heading}</p>
                    <div className="flex flex-wrap gap-2">
                      {BEHAVIOR_TAGS.filter((t) => t.valence === valence).map((tag) => {
                        const active = behaviorTags.includes(tag.id);
                        const activeClass = tone === "green" ? "bg-[var(--bg-success-strong)] border-[var(--border-success)]"
                          : tone === "orange" ? "bg-[var(--bg-attention-strong)] border-[var(--border-attention)]" : "bg-[var(--surface-inverse)] border-[var(--border-strong)]";
                        return (
                          <div key={tag.id} className="flex items-center gap-1">
                            <button type="button"
                              aria-pressed={active}
                              onClick={() => setBehaviorTags((prev) => prev.includes(tag.id) ? prev.filter((x) => x !== tag.id) : [...prev, tag.id])}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                active ? `${activeClass} text-[var(--on-strong)]` : "bg-[var(--surface-strong)] text-[var(--ink-muted)] border-[var(--border)] hover:border-[var(--border-strong)]"}`}>
                              <span>{tag.icon}</span> {tag.label}
                            </button>
                            <button type="button"
                              aria-label={`Info ${tag.label}`}
                              onClick={(e) => { e.stopPropagation(); setActiveTooltip({ tag, type: "behavior" }); }}
                              className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs border transition-all ${
                                active ? "bg-[var(--surface-inverse)] text-[var(--on-strong)] border-[var(--border-strong)]" : "bg-[var(--surface-strong)] text-[var(--ink-muted)] border-[var(--border)] hover:border-[var(--border-strong)]"}`}>
                              ⓘ
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
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
            <label className="label">⚡ Isi cepat (respons) <span className="text-[var(--ink-muted)] font-normal text-xs">(pilih satu)</span></label>
            <div className="flex flex-wrap gap-2">
              <button type="button"
                onClick={() => setResponseTag("correct-independent")}
                className="px-3 py-2 rounded-full text-sm font-semibold bg-[var(--bg-success)] text-[var(--ink-success)] border border-[var(--border-success)] hover:bg-[var(--bg-success)] transition-colors">
                ⭐ Lancar
              </button>
              <button type="button"
                onClick={() => setResponseTag("partial-correct")}
                className="px-3 py-2 rounded-full text-sm font-semibold bg-[var(--bg-warn)] text-[var(--ink-warn)] border border-[var(--border-warn)] hover:bg-[var(--bg-warn)] transition-colors">
                🟡 Butuh Latihan
              </button>
              <button type="button"
                onClick={() => setResponseTag("misconception")}
                className="px-3 py-2 rounded-full text-sm font-semibold bg-[var(--bg-danger)] text-[var(--ink-danger)] border border-[var(--border-danger)] hover:bg-[var(--bg-danger)] transition-colors">
                🔴 Miskonsepsi
              </button>
              <button type="button"
                onClick={() => { setResponseTag(undefined); setNeedsWork(""); }}
                className="px-3 py-2 rounded-full text-sm font-semibold bg-[var(--surface-strong)] text-[var(--ink-muted)] border border-[var(--border)] hover:bg-[var(--surface)] transition-colors">
                🔄 Kosongkan
              </button>
            </div>
            <p className="text-xs text-[var(--ink-muted)] mt-2">
              “Kosongkan” menghapus pilihan respons sekaligus isi kolom Fokus perbaikan.
            </p>
          </div>

          {/* Kualitas Respons Akademik */}
          <div>
            <label className="label">🎓 Kualitas Respons Akademik <span className="text-[var(--ink-muted)] font-normal text-xs">(pilih satu)</span></label>
            <div className="space-y-3 mt-2">
              {/* ── Pemahaman Baik ── */}
              <div>
                <p className="text-xs font-semibold text-[var(--ink-success)] uppercase tracking-wide mb-1.5">✨ Pemahaman Baik</p>
                <div className="flex flex-wrap gap-1.5">
                  {RESPONSE_TAGS.filter(t => ["correct-independent","correct-with-prompt","can-explain-orally","transfer-attempt","metacognitive"].includes(t.id)).map((tag) => {
                    const score = tag.id === "correct-independent" ? "+2" : "+1";
                    return (
                      <button key={tag.id} type="button"
                        onClick={() => setResponseTag(responseTag === tag.id ? undefined : tag.id)}
                        className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          responseTag === tag.id
                            ? "bg-[var(--bg-success-strong)] text-[var(--on-strong)] border-[var(--border-success)] shadow-sm"
                            : "bg-[var(--surface-strong)] text-[var(--ink-strong)] border-[var(--border)] hover:border-[var(--border-success)] hover:bg-[var(--bg-success)]"}`}>
                        <span>{tag.icon}</span> {tag.label}
                        <span className={`ml-0.5 text-xs font-bold rounded px-1 ${responseTag === tag.id ? "bg-[var(--bg-success-strong)] text-[var(--ink-success)]" : "bg-[var(--bg-success)] text-[var(--ink-success)]"}`}>{score}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Perlu Pendalaman ── */}
              <div>
                <p className="text-xs font-semibold text-[var(--ink-warn)] uppercase tracking-wide mb-1.5">📊 Perlu Pendalaman</p>
                <div className="flex flex-wrap gap-1.5">
                  {RESPONSE_TAGS.filter(t => ["partial-correct","can-do-procedurally","guessing"].includes(t.id)).map((tag) => {
                    const score = tag.id === "guessing" ? "−1" : "0";
                    return (
                      <button key={tag.id} type="button"
                        onClick={() => setResponseTag(responseTag === tag.id ? undefined : tag.id)}
                        className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          responseTag === tag.id
                            ? "bg-[var(--bg-warn-strong)] text-[var(--on-strong)] border-[var(--border-warn)] shadow-sm"
                            : "bg-[var(--surface-strong)] text-[var(--ink-strong)] border-[var(--border)] hover:border-[var(--border-warn)] hover:bg-[var(--bg-warn)]"}`}>
                        <span>{tag.icon}</span> {tag.label}
                        <span className={`ml-0.5 text-xs font-bold rounded px-1 ${responseTag === tag.id ? "bg-[var(--bg-warn-strong)] text-[var(--ink-warn)]" : "bg-[var(--bg-warn)] text-[var(--ink-warn)]"}`}>{score}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Perlu Perhatian ── */}
              <div>
                <p className="text-xs font-semibold text-[var(--ink-danger)] uppercase tracking-wide mb-1.5">⚠️ Respons Perlu Perhatian</p>
                <div className="flex flex-wrap gap-1.5">
                  {RESPONSE_TAGS.filter(t => ["misconception","prerequisite-gap"].includes(t.id)).map((tag) => {
                    return (
                      <button key={tag.id} type="button"
                        onClick={() => setResponseTag(responseTag === tag.id ? undefined : tag.id)}
                        className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          responseTag === tag.id
                            ? "bg-[var(--bg-danger-strong)] text-[var(--on-strong)] border-[var(--ink-danger)] shadow-sm"
                            : "bg-[var(--surface-strong)] text-[var(--ink-strong)] border-[var(--border)] hover:border-[var(--border-danger)] hover:bg-[var(--bg-danger)]"}`}>
                        <span>{tag.icon}</span> {tag.label}
                        <span className={`ml-0.5 text-xs font-bold rounded px-1 ${responseTag === tag.id ? "bg-[var(--bg-danger-strong)] text-[var(--ink-danger)]" : "bg-[var(--bg-danger)] text-[var(--ink-danger)]"}`}>−2</span>
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
                  <div className="bg-[var(--brand-tint)] border border-[var(--brand-tint-strong)] rounded-xl px-3.5 py-2.5">
                    <p className="text-xs text-[var(--ink-strong)] leading-relaxed">
                      <span className="font-semibold">{tag.icon} {tag.label}:</span> {tag.description}
                    </p>
                    <p className="text-xs text-[var(--ink-brand)] mt-1">
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

          {/* ══ Skor akhir (audit P2 #14) ══
              Pindah ke sini dari langkah 3 supaya angka yang dilihat tutor adalah
              angka yang benar-benar disimpan — kualitas respons akademik (di atas)
              ikut menentukan skor. */}
          <div className="rounded-2xl border border-[var(--border)] p-4">
            <p className="text-xs font-bold text-[var(--ink-muted)] uppercase tracking-wide mb-2">Skor sesi</p>
            {engScoreInfo ? (
              <div className="flex items-center gap-3 rounded-xl p-3" style={{ background: engScoreInfo.bg }}>
                <div className="relative w-14 h-14 flex-shrink-0">
                  <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
                    <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(0,0,0,.08)" strokeWidth="4" />
                    <circle cx="18" cy="18" r="14" fill="none" stroke={engScoreInfo.color} strokeWidth="4"
                      strokeDasharray={`${(engScore / 10) * 100 * 0.879} 100`} strokeLinecap="round" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-bold" style={{ color: engScoreInfo.color }}>{engScore}</span>
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-base" style={{ color: engScoreInfo.color }}>{engScoreInfo.text}</p>
                  <p className="text-xs mt-0.5" style={{ color: engScoreInfo.color }}>Skor keterlibatan: {engScore}/10</p>
                  <p className="text-xs mt-1" style={{ color: engScoreInfo.color }}>
                    Dasar 5/10 · kelengkapan data: {scoreBasisLabel(engBasis)}.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[var(--ink-muted)]">
                Belum ada pengamatan pada sesi ini, jadi <span className="font-semibold">skor tidak dihitung</span> —
                sesi ini tidak akan masuk rata-rata keseriusan belajar. Kondisi yang tercatat (mis. “Seperti biasa”)
                tetap tersimpan sebagai fakta.
              </p>
            )}
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════
          STEP 5: CATATAN — Ringkasan Sesi
          ══════════════════════════════════════════ */}
      {currentStep === 5 && (
        <div className="px-4 space-y-4">

          {/* Context summary — dilipat agar kolom wajib tidak tertimbun (C-16) */}
          <div className="bg-[var(--brand-tint)] border border-[var(--brand-tint-strong)] rounded-xl overflow-hidden">
            <button type="button" onClick={() => setShowAiContext((v) => !v)}
              aria-expanded={showAiContext}
              className="flex w-full items-center justify-between gap-2 px-3.5 py-3 text-left">
              <span className="text-xs font-bold text-[var(--ink-brand)] uppercase tracking-wide">📊 Konteks yang dipakai AI</span>
              <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[var(--ink-brand)]">
                {showAiContext ? "Sembunyikan" : "Lihat"}
                <span aria-hidden="true">{showAiContext ? "▲" : "▼"}</span>
              </span>
            </button>
            {showAiContext && (
            <div className="px-3.5 pb-3 space-y-1.5">
            {(subjects.length > 0 || studentSubjects.length > 0) && (
              <p className="text-xs text-[var(--ink-muted)]">
                <span className="font-semibold">📚 Mapel:</span> {(subjects.length ? subjects : studentSubjects).join(", ")}
              </p>
            )}
            {topic && (
              <p className="text-xs text-[var(--ink-muted)]">
                <span className="font-semibold">💡 Topik:</span> {topic}
              </p>
            )}
            {predictedGrade.trim() && (
              <p className="text-xs text-[var(--ink-muted)]">
                <span className="font-semibold">📈 Prediksi Nilai:</span> {predictedGrade.trim()}
              </p>
            )}
            {mood && (
              <p className="text-xs text-[var(--ink-muted)]">
                <span className="font-semibold">🔥 Mood:</span> {mood}
              </p>
            )}
            {situasiNote.trim() && (
              <p className="text-xs text-[var(--ink-muted)]">
                <span className="font-semibold">🫶 Situasi:</span> {situasiNote.trim()}
              </p>
            )}
            {engTouched && (
              <p className="text-xs text-[var(--ink-muted)]">
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
              <p className="text-xs text-[var(--ink-muted)]">
                <span className="font-semibold">🧩 Perilaku:</span>{" "}
                {behaviorTags.map(id => BEHAVIOR_TAGS.find(t => t.id === id)?.label).filter(Boolean).join(", ")}
              </p>
            )}
            {responseTag && (
              <p className="text-xs text-[var(--ink-muted)]">
                <span className="font-semibold">🎓 Respons akademik:</span>{" "}
                {RESPONSE_TAGS.find(t => t.id === responseTag)?.label}
              </p>
            )}
            {needsWork && (
              <p className="text-xs text-[var(--ink-muted)]">
                <span className="font-semibold">🎯 Fokus perbaikan:</span> {needsWork}
              </p>
            )}
            {briefLastSession && (
              <p className="text-xs text-[var(--ink-muted)] italic">
                <span className="font-semibold not-italic text-[var(--ink-strong)]">🔁 Sesi lalu:</span>{" "}
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
              <label htmlFor="cs-catatan" className="label">✏️ Catatan Singkat <span className="text-[var(--ink-danger)]">*</span></label>
              {(activeSubjects.length > 0 || Boolean(topic) || Boolean(sessionType)) && (
                <button type="button"
                  className="text-xs text-[var(--ink-brand)] hover:text-[var(--ink-brand)] font-semibold"
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
                      className="text-xs text-[var(--ink-muted)] bg-[var(--surface)] border border-[var(--border)] rounded-full px-2.5 py-1 hover:bg-[var(--brand-tint)] hover:text-[var(--ink-brand)] transition-colors">
                      🔁 Sesi lalu
                    </button>
                  )}
                  {briefFollowUps.slice(0, 3).map((f) => (
                    <button key={f.id} type="button" onClick={() => appendNoteChip(`Fokus berikutnya: ${f.text}.`)}
                      className="text-xs text-[var(--ink-warn)] bg-[var(--bg-warn)] border border-[var(--border-warn)] rounded-full px-2.5 py-1 hover:bg-[var(--bg-warn)] transition-colors">
                      🔁 {f.text.length > 28 ? f.text.slice(0, 28) + "…" : f.text}
                    </button>
                  ))}
                  {needsWork && (
                    <button type="button" onClick={() => appendNoteChip(`Fokus perbaikan: ${needsWork}.`)}
                      className="text-xs text-[var(--ink-danger)] bg-[var(--bg-danger)] border border-[var(--border-danger)] rounded-full px-2.5 py-1 hover:bg-[var(--bg-danger)] transition-colors">
                      🎯 Fokus perbaikan
                    </button>
                  )}
                </div>
              )
            )}

            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-[var(--ink-muted)]">{shortNote.length}/300</span>
              {settings?.ai?.enabled && settings.ai.apiKey && (subjects.length > 0 || studentSubjects.length > 0) && (
                <button type="button" disabled={aiNoteLoading}
                  onClick={() => setShowAiCostModal(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ink-accent)] bg-[var(--accent-tint)] hover:bg-[var(--accent-tint)] border border-[var(--border-accent)] px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                  {aiNoteLoading ? "⏳ Draft AI..." : "✨ Draft AI"}
                </button>
              )}
            </div>

            {/* Usulan AI — tampil dulu, jangan langsung menimpa */}
            {aiNoteDraft && (
              <div className="mt-2 bg-[var(--accent-tint)] border border-[var(--border-accent)] rounded-xl p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-bold text-[var(--ink-accent)]">✨ Usulan AI ({aiNoteStyle})</p>
                  <button type="button" onClick={() => setAiNoteDraft(null)}
                    className="text-xs text-[var(--ink-accent)] hover:text-[var(--ink-accent)]">Tutup</button>
                </div>
                <div className="max-h-32 overflow-y-auto text-sm text-[var(--ink-strong)]">
                  <SimpleMarkdown text={aiNoteDraft} />
                </div>
                <div className="flex gap-2 mt-2">
                  <button type="button"
                    onClick={() => { setShortNote(aiNoteDraft); setAiNoteDraft(null); }}
                    className="flex-1 py-2 rounded-xl bg-[var(--accent-solid)] text-[var(--on-strong)] text-xs font-bold hover:bg-[var(--accent-solid)] transition-colors">
                    ✓ Terima
                  </button>
                  <button type="button"
                    onClick={() => setAiNoteDraft(null)}
                    className="flex-1 py-2 rounded-xl border border-[var(--border-accent)] text-[var(--ink-accent)] text-xs font-bold hover:bg-[var(--accent-tint)] transition-colors">
                    ✕ Tolak
                  </button>
                </div>
              </div>
            )}

            {aiNoteOriginal && shortNote !== aiNoteOriginal && (
              <button type="button"
                onClick={() => { setShortNote(aiNoteOriginal); setAiNoteOriginal(""); setAiNoteDraft(null); }}
                className="mt-1.5 text-xs text-[var(--ink-muted)] hover:text-[var(--ink-accent)] font-semibold">
                ↩ Kembalikan ke teks awal
              </button>
            )}

            {aiError && <p className="text-xs text-[var(--ink-danger)] mt-1">{aiError}</p>}
            {suggestions.length > 0 && (
              <div className="mt-1 bg-[var(--surface-strong)] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
                {suggestions.map((s) => (
                  <button key={s} type="button"
                    className="block w-full text-left text-sm text-[var(--ink-brand)] hover:bg-[var(--brand-tint)] px-3 py-2 border-b border-[var(--border)] last:border-0"
                    onClick={() => { setShortNote(s); setAiNoteDraft(null); setAiNoteOriginal(""); }}>{s}</button>
                ))}
              </div>
            )}
          </div>

          {/* Prediksi nilai — jadi bahan follow-up saat nilai akhir keluar */}
          <div>
            <label htmlFor="cs-prediksi" className="label">📈 Prediksi Nilai <span className="text-[var(--ink-muted)] font-normal text-xs">(opsional — mis. 6, 7, A, B)</span></label>
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
          <div className="bg-[var(--bg-warn)] border border-[var(--border-warn)] rounded-xl p-3 flex items-center gap-2.5">
            <span className="text-[var(--ink-warn)] text-xl">⏭️</span>
            <div className="flex-1">
              <p className="text-xs font-bold text-[var(--ink-warn)]">Foto & tanda tangan bisa diisi nanti</p>
              <p className="text-xs text-[var(--ink-warn)] mt-0.5">Lengkapi dari profil murid setelah sesi. Simpan dulu detailnya sekarang.</p>
            </div>
          </div>
          <p className="text-xs font-semibold text-[var(--ink-muted)]">Isi sekarang (opsional)</p>

          {/* Kamera — capture langsung */}
          <input ref={cameraRef} type="file" accept="image/*" capture="environment"
            onChange={handlePhoto} className="hidden" />
          {/* Galeri — browse dari gallery / file picker */}
          <input ref={galleryRef} type="file" accept="image/*"
            onChange={handlePhoto} className="hidden" />
          <p className="text-xs text-[var(--ink-muted)] text-center -mt-2">💡 Di HP, tap ⋮ atau menu Browse untuk pilih folder</p>

          {/* Foto */}
          {photoUrl ? (
            <div className="relative">
              <img src={photoUrl} alt="preview" className="w-full h-52 object-cover rounded-2xl shadow-md" />
              <button aria-label="Hapus foto" onClick={() => setConfirmDelete({
                title: "Hapus foto bukti?",
                message: "Foto bukti kehadiran akan dihapus dan tidak bisa dikembalikan — ambil ulang dari kamera bila masih diperlukan.",
                confirmLabel: "Hapus foto",
                onConfirm: () => { setPhoto(undefined); setConfirmDelete(null); },
              })}
                className="absolute -top-2 -right-2 bg-[var(--bg-danger-strong)] text-[var(--on-strong)] rounded-full w-10 h-10 text-sm flex items-center justify-center shadow-md"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              <div className="absolute bottom-2 right-2 flex gap-1.5">
                <button onClick={() => cameraRef.current?.click()}
                  className="bg-[var(--scrim)]/60 text-[var(--on-strong)] text-xs px-2.5 py-1 rounded-full">📷 Kamera</button>
                <button onClick={() => galleryRef.current?.click()}
                  className="bg-[var(--scrim)]/60 text-[var(--on-strong)] text-xs px-2.5 py-1 rounded-full">🖼️ Galeri</button>
              </div>
              <span className="absolute top-2 left-2 bg-[var(--scrim)]/50 text-[var(--on-strong)] text-xs px-2 py-0.5 rounded-full">📅 timestamp ✓</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => cameraRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 py-12 rounded-2xl border-2 border-dashed border-[var(--border)] text-[var(--ink-muted)] hover:border-[var(--border-brand)] hover:text-[var(--ink-brand)] transition-colors bg-[var(--surface)]">
                <span className="text-4xl">📷</span>
                <div className="text-center">
                  <p className="font-semibold text-sm">Ambil Foto</p>
                  <p className="text-xs mt-0.5 text-[var(--ink-muted)]">Buka kamera</p>
                </div>
              </button>
              <button onClick={() => galleryRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 py-12 rounded-2xl border-2 border-dashed border-[var(--border)] text-[var(--ink-muted)] hover:border-[var(--border-success)] hover:text-[var(--ink-success)] transition-colors bg-[var(--surface)]">
                <span className="text-4xl">🖼️</span>
                <div className="text-center">
                  <p className="font-semibold text-sm">Pilih dari Galeri</p>
                  <p className="text-xs mt-0.5 text-[var(--ink-muted)]">Cari di gallery</p>
                </div>
              </button>
            </div>
          )}

          {/* Tanda tangan */}
          {signatureUrl ? (
            <div>
              <p className="text-xs text-[var(--ink-muted)] font-medium mb-1.5">✍️ Tanda Tangan Murid</p>
              <div className="relative bg-[var(--surface-strong)] rounded-xl border border-[var(--border)] p-2">
                <img src={signatureUrl} alt="TTD" className="max-h-24 w-full object-contain" />
                <button aria-label="Hapus tanda tangan" onClick={() => setConfirmDelete({
                  title: "Hapus tanda tangan?",
                  message: "Tanda tangan murid akan dihapus dan tidak bisa dikembalikan — minta tanda tangan ulang bila masih diperlukan.",
                  confirmLabel: "Hapus tanda tangan",
                  onConfirm: () => { setSignature(undefined); setShowSigPad(false); setConfirmDelete(null); },
                })}
                  className="absolute top-1 right-1 bg-[var(--bg-danger-strong)] text-[var(--on-strong)] rounded-full w-8 h-8 text-xs flex items-center justify-center"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
            </div>
          ) : showSigPad ? (
            <div>
              <p className="text-xs text-[var(--ink-muted)] font-medium mb-1.5">✍️ Tanda Tangan Murid</p>
              <SignaturePad
                key={studentId}
                onSave={(blob) => { setSignature(blob); setShowSigPad(false); }}
                onClear={() => setSignature(undefined)}
              />
            </div>
          ) : (
            <button type="button" onClick={() => setShowSigPad(true)}
              className="flex flex-col items-center justify-center gap-3 w-full py-10 rounded-2xl border-2 border-dashed border-[var(--border)] text-[var(--ink-muted)] hover:border-[var(--border-accent)] hover:text-[var(--ink-accent)] transition-colors bg-[var(--surface)]">
              <span className="text-4xl">✍️</span>
              <div className="text-center">
                <p className="font-semibold text-sm">Tanda Tangan Murid</p>
                <p className="text-xs mt-0.5 text-[var(--ink-muted)]">Tap untuk buka signature pad</p>
              </div>
            </button>
          )}

          {(photo || signature) && (
            <div className="bg-[var(--bg-success)] border border-[var(--border-success)] rounded-xl p-3 flex items-center gap-2.5">
              <span className="text-[var(--ink-success)] text-xl">✅</span>
              <div>
                <p className="text-xs font-bold text-[var(--ink-success)]">Bukti kehadiran siap!</p>
                <p className="text-xs text-[var(--ink-success)] mt-0.5">
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
        <div className="h-full bg-[var(--surface-strong)]/95 backdrop-blur border-t border-[var(--border)] shadow-xl px-4 py-3">
          <div className="flex items-center gap-2 max-w-md mx-auto h-full">
            {currentStep > 1 ? (
              <button onClick={goBack}
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl bg-[var(--bg-subtle)] text-[var(--ink-muted)] font-semibold text-sm hover:bg-[var(--bg-subtle)] transition-colors flex-shrink-0">
                ← Kembali
              </button>
            ) : (
              <div className="w-2 flex-shrink-0" />
            )}
            {stepMeta.optional && currentStep !== 6 && (
              <button onClick={skipStep}
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-[var(--border)] text-[var(--ink-muted)] font-semibold text-sm hover:bg-[var(--surface)] transition-colors flex-shrink-0">
                Lewati
              </button>
            )}
            <button onClick={goNext} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm text-[var(--on-strong)] transition-all disabled:opacity-50 shadow-md"
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
        <AiTagTooltip
          tag={activeTooltip.tag}
          type={activeTooltip.type}
          onClose={() => setActiveTooltip(null)}
        />
      )}

      {/* ══════════════════════════════════════════
          SUBJECT PICKER MODAL
          ══════════════════════════════════════════ */}
      {showIBPicker && (
        <Modal
          ariaLabel="Pilih Mata Pelajaran"
          onClose={() => setShowIBPicker(false)}
          showCloseButton={false}
          panelClassName="relative bg-[var(--surface-strong)] w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[88vh] overflow-y-auto overscroll-contain outline-none"
        >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <div>
                <h3 className="font-bold text-lg">Pilih Mata Pelajaran</h3>
                {currentStudent?.curriculum && (
                  <p className="text-xs text-[var(--ink-muted)] mt-0.5">{CURRICULUM_META[currentStudent.curriculum].label}</p>
                )}
              </div>
              <button aria-label="Tutup" onClick={() => setShowIBPicker(false)} className="text-[var(--ink-muted)] text-xl"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>

            {currentStudent?.curriculum ? (
              <div className="p-4 space-y-4">
                {getSubjectGroups(currentStudent.curriculum).map((grp) => (
                  <div key={grp.group}>
                    <p className="text-xs text-[var(--ink-muted)] font-semibold uppercase tracking-wide mb-2">{grp.group}</p>
                    <div className="flex flex-wrap gap-2">
                      {grp.subjects.map((s) => (
                        <button key={s} type="button"
                          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                            subjects.includes(s) ? "bg-[var(--brand-solid)] text-[var(--on-strong)] border-[var(--border-brand)]" : "bg-[var(--surface-strong)] text-[var(--ink-muted)] border-[var(--border)] hover:border-[var(--border-brand)]"}`}
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
                <div className="grid grid-cols-2 bg-[var(--bg-subtle)] mx-4 mt-3 rounded-xl p-1">
                  {(["MYP", "DP"] as const).map((t) => (
                    <button key={t} onClick={() => setIbTab(t)}
                      className={`py-2 rounded-lg text-sm font-semibold transition-colors ${ibTab === t ? "bg-[var(--surface-strong)] shadow text-[var(--ink-brand)]" : "text-[var(--ink-muted)]"}`}>
                      {t === "MYP" ? "MYP (Middle Years)" : "DP (Diploma)"}
                    </button>
                  ))}
                </div>
                <div className="p-4 space-y-4">
                  {ibTab === "MYP" ? (
                    <div>
                      <p className="text-xs text-[var(--ink-muted)] font-semibold uppercase tracking-wide mb-2">IB MYP Subjects</p>
                      <div className="flex flex-wrap gap-2">
                        {IB_MYP_SUBJECTS.map((s) => (
                          <button key={s} type="button"
                            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                              subjects.includes(s) ? "bg-[var(--brand-solid)] text-[var(--on-strong)] border-[var(--border-brand)]" : "bg-[var(--surface-strong)] text-[var(--ink-muted)] border-[var(--border)] hover:border-[var(--border-brand)]"}`}
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
                          <p className="text-xs text-[var(--ink-muted)] font-semibold uppercase tracking-wide mb-2">{grp.group}</p>
                          <div className="flex flex-wrap gap-2">
                            {grp.subjects.map((s) => (
                              <button key={s} type="button"
                                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                                  subjects.includes(s) ? "bg-[var(--brand-solid)] text-[var(--on-strong)] border-[var(--border-brand)]" : "bg-[var(--surface-strong)] text-[var(--ink-muted)] border-[var(--border)] hover:border-[var(--border-brand)]"}`}
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
              <div className="border-t border-[var(--border)] pt-3">
                <p className="text-xs text-[var(--ink-muted)] font-semibold uppercase tracking-wide mb-2">Custom</p>
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
                    className="px-4 py-2 rounded-xl bg-[var(--accent-solid)] text-[var(--on-strong)] text-sm font-semibold disabled:opacity-40"
                    onClick={() => {
                      const val = ibCustom.trim();
                      if (val && !subjects.includes(val)) setSubjects((prev) => [...prev, val]);
                      setIbCustom("");
                    }}>+</button>
                </div>
              </div>
              {subjects.length > 0 && (
                <div className="bg-[var(--brand-tint)] rounded-xl p-3">
                  <p className="text-xs text-[var(--ink-brand)] font-semibold mb-1.5">Dipilih ({subjects.length}):</p>
                  <div className="flex flex-wrap gap-1.5">
                    {subjects.map((s) => (
                      <span key={s} className="inline-flex items-center gap-1 text-xs bg-[var(--brand-solid)] text-[var(--on-strong)] px-2.5 py-1 rounded-full font-medium">
                        {s}
                        <button type="button" aria-label={`Hapus ${s}`}
                          onClick={() => setSubjects((prev) => prev.filter((x) => x !== s))}
                          className="-my-1 -mr-1 p-1.5 text-[var(--brand-tint-strong)] hover:text-[var(--on-strong)]"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={() => setShowIBPicker(false)}
                className="w-full py-3 rounded-xl bg-[var(--brand-solid)] text-[var(--on-strong)] font-semibold hover:bg-[var(--brand-solid)] transition-colors">
                Selesai
              </button>
            </div>
        </Modal>
      )}

      {showCloseOut && coSessionData && currentStudent && (
        <CloseOutSheet
          studentName={currentStudent.name}
          parentName={currentStudent.parentContact.name || "Orang Tua"}
          session={coSessionData}
          followUps={coFollowUps}
          followUpText={coFollowUpText}
          setFollowUpText={setCoFollowUpText}
          saving={coSaving}
          waNumber={waNumber}
          originalWaMessage={originalWaMessage}
          aiWaText={aiWaText}
          onAddFollowUp={addCoFollowUp}
          onDeleteFollowUp={requestDeleteFollowUp}
          onDone={handleCloseOutDone}
          onClose={closeReport}
          onFixNote={handleFixNote}
          onPolishWa={() => setShowAiWaModal(true)}
          aiWaEnabled={Boolean(settings?.ai?.enabled && settings.ai.apiKey)}
          aiWaLoading={aiWaLoading}
          aiError={aiError}
          onClearAiWa={() => setAiWaText(null)}
          closeOutError={message?.retry === "closeout" ? message.text : null}
          onRetry={() => { setMessage(null); handleCloseOutDone(); }}
          engagement={engTouched && engScoreInfo ? {
            score: engScore, color: engScoreInfo.color, background: engScoreInfo.bg, text: engScoreInfo.text,
            narrative: generateEngagementNarrative(
              { prepared: engPrepared, focused: engFocused, activeAsking: engActiveAsking,
                quickLearner: engQuickLearner, drowsy: engDrowsy, playingPhone: engPhone,
                needsRepetition: engNeedsRepeat, hwMissed: engHwMissed,
                late: engLate, bathroomBreaks: engBathroom, score: engScore },
              currentStudent.name,
            ),
          } : undefined}
        />
      )}
      {/* C-05: konfirmasi hapus foto bukti / tanda tangan / tindak lanjut (semua permanen). */}
      <ConfirmSheet
        open={confirmDelete !== null}
        title={confirmDelete?.title ?? ""}
        message={confirmDelete?.message ?? ""}
        confirmLabel={confirmDelete?.confirmLabel}
        danger
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete?.onConfirm()}
      />

      {/* Poles WA AI modal */}
      <AiCostModal
        open={showAiWaModal}
        title="Poles WA AI"
        estimatedIDR={estimatePolishWACost(originalWaMessage.length)}
        description="Poles pesan WhatsApp jadi lebih hangat dan personal"
        dataSent="Pesan awal sesi: nama murid dan tutor, tanggal, mapel, durasi, catatan sesi, topik, dan tindak lanjut yang tercantum dalam pesan."
        onCancel={() => setShowAiWaModal(false)}
        onConfirm={onPolishWa}
      />

      {/* AI Cost confirm modal */}
      <AiCostConfirmModal
        open={showAiCostModal}
        subjects={activeSubjects}
        topic={topic || undefined}
        draftNote={shortNote}
        style={aiNoteStyle}
        onStyleChange={setAiNoteStyle}
        onConfirm={onAiNoteConfirm}
        onCancel={() => setShowAiCostModal(false)}
      />
    </div>
  );
}
