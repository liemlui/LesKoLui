import Skeleton from "../components/Skeleton";
import { useMemo, useState, useEffect, useRef, type ChangeEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  getStudent, listSessionsByStudent, listScheduledForStudent,
  cancelSeriesSessions, updateSeriesSessions,
  updateStudent,
  listIaEeProjects,
  deleteSession, updateSession,
  getStudyNote, saveStudyNote,
  countUnbilledBillableSessions,
} from "../db/repos";
import { verifyPin } from "../lib/crypto";
import { getPinLockoutDelay, recordPinFailure, resetPinLockout } from "../lib/pinLockout";
import type { CancelMode, EditMode } from "../db/repos";
import { dayLabel, todayWIB, formatRupiah } from "../lib/format";
import { isGradeLower } from "../lib/grades";
import type { Session } from "../db/types";
import { billingPolicyOf } from "../db/types";
import { CURRICULUM_META } from "../lib/ibSubjects";
import Tabs from "../components/Tabs";
import Badge from "../components/Badge";
import { clampPage, paginateItems } from "../lib/pagination";
import ClockTimePicker from "../components/ClockTimePicker";
import SignaturePad from "../components/SignaturePad";
import Modal from "../components/Modal";
import MaskedMoney from "../components/ui/MaskedMoney";
import SettingsLoadError from "../components/SettingsLoadError";
import { useMoneyVisible } from "../hooks/useMoneyVisible";
import { useSettingsQuery } from "../hooks/useSettingsQuery";
import { Z } from "../lib/zIndex";
import { compressPhoto, stampPhoto } from "../lib/foto";
import { getResponseTag } from "../lib/responseTaxonomy";
import { MAX_HOURLY_RATE, clampCurrencyAmount, isValidCurrencyAmount } from "../lib/money";
import EvidenceCard from "./studentDetail/EvidenceCard";
import StudyNoteCard from "./studentDetail/StudyNoteCard";
import UpcomingSchedule from "./studentDetail/UpcomingSchedule";
import SessionDetailModal from "./studentDetail/SessionDetailModal";
import RiwayatSesi from "./studentDetail/RiwayatSesi";
import IaEeTracker from "./studentDetail/IaEeTracker";
import NilaiRapor from "./studentDetail/NilaiRapor";
import { engagementAverage, sessionEngagementScore } from "../lib/engagement";

const DURATIONS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6];

/**
 * StudentDetail — halaman detail murid dengan 5 tab:
 * Sesi, Rapor, Penagihan, IA/EE, AI Insights.
 *
 * Mengelola: daftar sesi, nilai rapor, tagihan per bulan,
 * proyek IA/EE dengan milestone, analisis AI, PIN verification.
 *
 * @component
 * @route /student/:id
 */
export default function StudentDetail() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const today    = todayWIB();

  const student       = useLiveQuery(() => (id ? getStudent(id) : undefined), [id]);
  const allSessions   = useLiveQuery(() => (id ? listSessionsByStudent(id) : []), [id]);
  const upcomingSched = useLiveQuery(() => (id ? listScheduledForStudent(id, today) : []), [id, today]);
  const settingsQuery = useSettingsQuery();
  const settings      = settingsQuery.settings;
  const studyNote      = useLiveQuery(() => (id ? getStudyNote(id) : undefined), [id]);
  const iaeeProjects  = useLiveQuery(() => (id ? listIaEeProjects(id) : []), [id]);
  // Sesi lama yang belum ditagih — menentukan apakah pilihan retroaktif perlu
  // ditawarkan pada edit tarif inline. Tarif historis beku secara default (D1(c)).
  const unbilledCount = useLiveQuery(() => (id ? countUnbilledBillableSessions(id) : 0), [id]);

  // Edit scheduled session modal
  const [editTarget,     setEditTarget]     = useState<Session | null>(null);
  const [editDate,       setEditDate]       = useState("");
  const [editTime,       setEditTime]       = useState("");
  const [editDuration,   setEditDuration]   = useState(1);
  const [editMode,       setEditMode]       = useState<EditMode>("this");
  const [editSaving,     setEditSaving]     = useState(false);
  const [showCancelSect, setShowCancelSect] = useState(false);
  const [cancelReason,   setCancelReason]   = useState("");

  const [showBillingHelp, setShowBillingHelp] = useState(false);
  const [subjectPage,    setSubjectPage]    = useState(1);
  const [upcomingPage,   setUpcomingPage]   = useState(1);
  const [historyPage,    setHistoryPage]    = useState(1);
  const [detailTab,      setDetailTab]      = useState("ringkasan");
  // Default "Semua bulan" ("") — default bulan-berjalan menipu: kalau bulan ini
  // belum ada sesi, option-nya tak ada di dropdown → browser MENAMPILKAN
  // "Semua bulan" padahal filter aktif bulan ini → riwayat tampak kosong.
  const [historyMonth,   setHistoryMonth]   = useState("");
  const [schedMonth,     setSchedMonth]     = useState<string>("");

  // Session detail + delete
  const [detailSession,    setDetailSession]    = useState<import("../db/types").Session | null>(null);
  const [deletePinInput,   setDeletePinInput]   = useState("");
  const [deletePinError,   setDeletePinError]   = useState("");
  const [showDeletePin,    setShowDeletePin]     = useState(false);

  const [flash, setFlash] = useState("");
  function msg(t: string) { setFlash(t); setTimeout(() => setFlash(""), 3000); }

  // Catatan: state IA/EE/PP (11 useState + form milestone) TIDAK lagi di sini —
  // seluruhnya pindah ke `studentDetail/IaEeTracker.tsx` karena tidak ada bagian
  // lain layar ini yang memakainya (audit utang teknis #3).

  // Tarif les — visibilitas uang lewat SATU hook (kontrak K3.1/K3.6), bukan state
  // lokal per layar. Gerbang PIN untuk aksi (ganti tarif, hapus sesi) tetap ada.
  const money = useMoneyVisible();
  const [showRateEdit,  setShowRateEdit]  = useState(false);
  const [newRate,       setNewRate]       = useState(0);
  const [rateSaving,    setRateSaving]    = useState(false);
  /** D1(c): retroaktif HANYA setelah tutor mencentang, tidak pernah otomatis. */
  const [repriceUnbilledSessions, setRepriceUnbilledSessions] = useState(false);

  const handleDeleteSession = async () => {
    if (!detailSession) return;
    if (!settings?.financialPin) {
      alert("Set PIN Keuangan di Pengaturan sebelum menghapus sesi.");
      return;
    }
    const delay = getPinLockoutDelay();
    if (delay > 0) { setDeletePinError(`Tunggu ${Math.ceil(delay / 1000)} detik.`); return; }
    const ok = await verifyPin(deletePinInput, settings.financialPin);
    if (!ok) { recordPinFailure(); setDeletePinError("PIN salah."); return; }
    resetPinLockout();
    try {
      await deleteSession(detailSession.id);
    } catch (error) {
      setDeletePinError(error instanceof Error ? error.message : "Sesi tidak dapat dihapus.");
      return;
    }
    setDetailSession(null); setShowDeletePin(false); setDeletePinInput(""); setDeletePinError("");
    msg("Sesi dihapus");
  };

  const handleSaveRate = async () => {
    if (!id || !isValidCurrencyAmount(newRate, MAX_HOURLY_RATE)) { msg(`Tarif harus 1 sampai ${formatRupiah(MAX_HOURLY_RATE)}.`); return; }
    const rateChanged = newRate !== student?.hourlyRate;
    const applyRetroactive = repriceUnbilledSessions && rateChanged;
    setRateSaving(true);
    try {
      // D1(c): tanpa centang, sesi lama tidak tersentuh — hanya sesi berikutnya
      // yang memakai tarif baru.
      await updateStudent(id, { hourlyRate: newRate }, { repriceUnbilledSessions: applyRetroactive });
      msg(applyRetroactive ? "Tarif & sesi lama diperbarui ✓" : "Tarif diperbarui ✓");
      setShowRateEdit(false); setRepriceUnbilledSessions(false);
    }
    catch (e) { msg("Gagal: " + (e as Error).message); }
    finally { setRateSaving(false); }
  };

  // Edit DONE session notes
  const [editSession,     setEditSession]     = useState<Session | null>(null);
  const [editShortNote,   setEditShortNote]   = useState("");
  const [editTopic,       setEditTopic]       = useState("");
  const [editNeedsWork,   setEditNeedsWork]   = useState("");
  const [editPredictedGrade, setEditPredictedGrade] = useState("");
  const [editActualGrade,   setEditActualGrade]     = useState("");
  const [editGradeReflection, setEditGradeReflection] = useState("");
  const [editGradeError,  setEditGradeError]  = useState("");
  const [editNoteSaving,  setEditNoteSaving]  = useState(false);
  const [editPhoto,       setEditPhoto]       = useState<Blob | undefined>();
  const [editPhotoUrl,    setEditPhotoUrl]    = useState<string | undefined>();
  const [editPhotoError,  setEditPhotoError]  = useState("");
  const [editSignature,   setEditSignature]   = useState<Blob | undefined>();
  const [editSigUrl,      setEditSigUrl]      = useState<string | undefined>();
  const [showEditSigPad,  setShowEditSigPad]  = useState(false);
  const [editCost,         setEditCost]         = useState(0);
  const [editCostOverride, setEditCostOverride] = useState<number | null>(null);
  const [editNoteDuration, setEditNoteDuration] = useState(1.5);
  const [isEditingCost,    setIsEditingCost]    = useState(false);
  const editCameraRef = useRef<HTMLInputElement>(null);
  const editGalleryRef = useRef<HTMLInputElement>(null);

  // Keep photo URL in sync with the image selected while editing.
  useEffect(() => {
    if (!editPhoto) { setEditPhotoUrl(undefined); return; }
    const url = URL.createObjectURL(editPhoto);
    setEditPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [editPhoto]);

  // Keep sig URL in sync with blob
  useEffect(() => {
    if (!editSignature) { setEditSigUrl(undefined); return; }
    const url = URL.createObjectURL(editSignature);
    setEditSigUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [editSignature]);

  const openEditNote = (s: Session) => {
    setEditSession(s);
    setEditShortNote(s.shortNote ?? "");
    setEditTopic(s.topic ?? "");
    setEditNeedsWork(s.needsWork ?? "");
    setEditPredictedGrade(s.predictedGrade ?? "");
    setEditActualGrade(s.actualGrade ?? "");
    setEditGradeReflection(s.gradeReflection ?? "");
    setEditGradeError("");
    setEditPhoto(s.photo);
    setEditPhotoError("");
    setEditSignature(s.signature);
    setShowEditSigPad(false);
    setEditCost(s.cost);
    setEditCostOverride(s.costOverride ?? null);
    setEditNoteDuration(s.durationHours);
    setIsEditingCost(false);
  };

  const handleEditPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const sessionDate = editSession?.date;
    if (!file || !sessionDate) return;
    if (!file.type.startsWith("image/")) {
      setEditPhotoError("File harus berupa gambar (JPG/PNG/WebP).");
      e.target.value = "";
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setEditPhotoError("Foto terlalu besar (maks. 50 MB).");
      e.target.value = "";
      return;
    }
    try {
      const compressed = await compressPhoto(file);
      setEditPhoto(await stampPhoto(compressed, sessionDate));
      setEditPhotoError("");
    } catch {
      setEditPhotoError("Foto tidak dapat diproses. Coba pilih file lain.");
    }
    e.target.value = "";
  };

  const handleSaveNote = async () => {
    if (!editSession) return;
    if (isGradeLower(editActualGrade, editPredictedGrade) && !editGradeReflection.trim()) {
      setEditGradeError("Nilai akhir lebih rendah dari prediksi — tulis refleksi kenapa.");
      return;
    }
    setEditGradeError("");
    setEditNoteSaving(true);
    try {
      const patch: Partial<Session> = {
        shortNote: editShortNote.trim(),
        topic: editTopic.trim() || undefined,
        needsWork: editNeedsWork.trim() || undefined,
        predictedGrade: editPredictedGrade.trim() || undefined,
        actualGrade: editActualGrade.trim() || undefined,
        gradeReflection: editGradeReflection.trim() || undefined,
        photo: editPhoto,
        signature: editSignature,
      };
      // Include cost override if tutor manually changed it
      if (editCostOverride !== null && editCostOverride !== editSession.costOverride) {
        patch.costOverride = editCostOverride;
        patch.cost = editCostOverride;
      } else if (editCostOverride === null && editSession.costOverride != null) {
        // Tutor reset: clear override → auto-recalculate via null
        patch.costOverride = null;
      }
      // Include duration if changed
      if (editNoteDuration !== editSession.durationHours) {
        patch.durationHours = editNoteDuration;
      }
      await updateSession(editSession.id, patch);
      msg("Catatan diperbarui ✓");
      setEditSession(null);
    } catch (e) { msg("Gagal: " + (e as Error).message); }
    finally { setEditNoteSaving(false); }
  };

  // Photo + signature URLs for session history
  const [photoUrls, setPhotoUrls] = useState<Map<string, string>>(new Map());
  const [sigUrls,   setSigUrls]   = useState<Map<string, string>>(new Map());
  useEffect(() => {
    const sessions = allSessions ?? [];
    const pUrls = new Map<string, string>();
    const sUrls = new Map<string, string>();
    sessions.forEach((s) => {
      if (s.photo)     pUrls.set(s.id, URL.createObjectURL(s.photo));
      if (s.signature) sUrls.set(s.id, URL.createObjectURL(s.signature));
    });
    setPhotoUrls(pUrls);
    setSigUrls(sUrls);
    return () => {
      pUrls.forEach((u) => URL.revokeObjectURL(u));
      sUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [allSessions]);

  // ── Computed ────────────────────────────────────────────────────────
  const totalSessions = allSessions?.length ?? 0;
  const totalHours    = useMemo(() => (allSessions ?? []).reduce((s, x) => s + x.durationHours, 0), [allSessions]);

  // Sessions with engagement data
  const engSessions = useMemo(
    () => (allSessions ?? []).filter((s) => s.engagement != null).sort((a, b) => a.date.localeCompare(b.date)),
    [allSessions]
  );
  /** Hanya sesi yang benar-benar punya DASAR skor (audit P2 #11 / P3 #17).
   *  Sebelumnya sesi ber-`engagement` tetapi tanpa pengamatan ikut terhitung
   *  sebagai "5/10" — merusak rata-rata. */
  const scoredEngSessions = useMemo(
    () => engSessions.filter((s) => sessionEngagementScore(s) != null),
    [engSessions],
  );

  // Last 15 engagement sessions for trend chart
  const recentEng = useMemo(() => scoredEngSessions.slice(-15), [scoredEngSessions]);

  /** Rata-rata + cakupan data: penyebutnya wajib ditampilkan. */
  const engCoverage = useMemo(() => engagementAverage(engSessions), [engSessions]);
  const avgEngScore = engCoverage.average != null
    ? Math.round(engCoverage.average * 10) / 10
    : null;

  // Trend: compare last 5 vs previous 5
  const engTrend = useMemo((): "up" | "down" | "stable" | null => {
    if (scoredEngSessions.length < 6) return null;
    const recent = scoredEngSessions.slice(-5);
    const prev   = scoredEngSessions.slice(-10, -5);
    if (prev.length === 0) return null;
    const rAvg = recent.reduce((s, x) => s + (sessionEngagementScore(x) ?? 0), 0) / recent.length;
    const pAvg = prev.reduce((s, x)   => s + (sessionEngagementScore(x) ?? 0), 0) / prev.length;
    if (rAvg - pAvg > 0.5) return "up";
    if (pAvg - rAvg > 0.5) return "down";
    return "stable";
  }, [scoredEngSessions]);

  /** Sebaran kualitas respons akademik — sumbu kedua (audit P3 #17). */
  const responseStats = useMemo(() => {
    const counts = new Map<string, number>();
    let answered = 0;
    for (const s of engSessions) {
      if (!s.responseTag) continue;
      const tag = getResponseTag(s.responseTag);
      if (!tag) continue;
      counts.set(tag.label, (counts.get(tag.label) ?? 0) + 1);
      answered += 1;
    }
    return {
      answered,
      rows: [...counts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
    };
  }, [engSessions]);

  // Per-subject engagement breakdown
  const subjectEngStats = useMemo(() => {
    const map = new Map<string, { scores: number[]; phoneCount: number; drowsyCount: number; prepCount: number }>();
    scoredEngSessions.forEach((s) => {
      const score = sessionEngagementScore(s);
      if (score == null) return;
      s.subjects.forEach((sub) => {
        const curr = map.get(sub) ?? { scores: [], phoneCount: 0, drowsyCount: 0, prepCount: 0 };
        curr.scores.push(score);
        if (s.engagement!.playingPhone) curr.phoneCount++;
        if (s.engagement!.drowsy)       curr.drowsyCount++;
        if (s.engagement!.prepared)     curr.prepCount++;
        map.set(sub, curr);
      });
    });
    return [...map.entries()]
      .filter(([, d]) => d.scores.length > 0)
      .map(([sub, d]) => ({
        subject:    sub,
        count:      d.scores.length,
        avgScore:   Math.round((d.scores.reduce((a, b) => a + b, 0) / d.scores.length) * 10) / 10,
        phoneRate:  Math.round((d.phoneCount / d.scores.length) * 100),
        drowsyRate: Math.round((d.drowsyCount / d.scores.length) * 100),
        prepRate:   Math.round((d.prepCount / d.scores.length) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [scoredEngSessions]);

  // ── Handlers ────────────────────────────────────────────────────────
  const openEditSched = (s: Session) => {
    setEditTarget(s); setEditDate(s.date); setEditTime(s.time ?? "08:00");
    setEditDuration(s.durationHours); setEditMode("this"); setShowCancelSect(false); setCancelReason("");
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
    await cancelSeriesSessions({ id: editTarget.id, seriesId: editTarget.seriesId, date: editTarget.date }, mode, cancelReason);
    setEditTarget(null); msg("Jadwal dibatalkan.");
  };

  // These useMemos MUST be before the early return to satisfy the Rules of Hooks
  const historyMonthOptions = useMemo(() => {
    const months = new Set<string>();
    (allSessions ?? []).forEach((s) => months.add(s.date.slice(0, 7)));
    return [...months].sort((a, b) => b.localeCompare(a));
  }, [allSessions]);

  const historySessions = useMemo(() =>
    [...(allSessions ?? [])]
      .filter((s) => !historyMonth || s.date.startsWith(historyMonth))
      .sort((a, b) => b.date.localeCompare(a.date) || (b.time ?? "").localeCompare(a.time ?? "")),
    [allSessions, historyMonth]
  );

  // G2-10: kegagalan baca pengaturan punya jalan keluar yang sama di semua layar.
  if (settingsQuery.error || settingsQuery.timedOut) {
    return <SettingsLoadError screen="Detail murid" busy={settingsQuery.retrying} onRetry={settingsQuery.retry} />;
  }

  if (!student) return <Skeleton variant="card" lines={4} className="p-4" />;
  const studentBillingPolicy = billingPolicyOf(student);

  const safeHistoryPage = clampPage(historyPage, historySessions.length);
  const paginatedHistorySessions = paginateItems(historySessions, safeHistoryPage);

  return (
    <div className="p-4 space-y-4 pb-24">

      {/* Back — label menyebut tujuan spesifik, jadi arahkan eksplisit ke daftar
          murid (bukan history-back generik) agar cocok dibuka dari mana pun. */}
      <button onClick={() => navigate("/students")}
        className="flex items-center gap-1.5 text-sm font-medium text-[var(--ink-muted)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle)] px-3 py-2 rounded-xl transition-colors">
        ‹ Kembali ke Daftar Murid
      </button>

      {flash && (
        <div className={`p-2 rounded-lg text-sm text-center font-medium ${flash.includes("✓") ? "bg-[var(--bg-success)] text-[var(--ink-success)]" : "bg-[var(--bg-danger)] text-[var(--ink-danger)]"}`}>
          {flash}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{student.name}</h1>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {student.curriculum ? (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CURRICULUM_META[student.curriculum].color} ${CURRICULUM_META[student.curriculum].text}`}>
                {CURRICULUM_META[student.curriculum].shortLabel}
              </span>
            ) : (
              <span className="text-xs text-[var(--ink-muted)]">{student.level}</span>
            )}
          </div>
        </div>
        <Badge tone={student.active ? "green" : "slate"}>
          {student.active ? "Aktif" : "Nonaktif"}
        </Badge>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => navigate(`/capture?studentId=${encodeURIComponent(id ?? "")}`)}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--brand-solid)] text-[var(--on-strong)] text-sm font-semibold shadow-sm hover:bg-[var(--brand-solid)] transition-colors">
          <span>📝</span> Catat Sesi
        </button>
        <button onClick={() => navigate(`/report?studentId=${id}`)}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--accent-tint)] text-[var(--ink-accent)] text-sm font-semibold border border-[var(--border-accent)] hover:bg-[var(--accent-tint)] transition-colors">
          <span>📊</span> Lihat Laporan
        </button>
        <button onClick={() => navigate(`/payments?tab=tagihan&studentId=${encodeURIComponent(id ?? "")}`)}
          className="col-span-2 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--bg-success)] text-[var(--ink-success)] text-sm font-semibold border border-[var(--border-success)] hover:bg-[var(--bg-success)] transition-colors">
          <span>{studentBillingPolicy === "session_count" ? "🧾" : "💸"}</span>
          {studentBillingPolicy === "monthly"
            ? "Kelola Penagihan Bulanan"
            : studentBillingPolicy === "session_count"
              ? "Kelola Tagihan Paket"
              : "Buat Tagihan Manual"}
        </button>
        {studentBillingPolicy === "monthly" && (
          <p className="col-span-2 text-xs text-[var(--ink-muted)] -mt-1">
            💡 Laporan perkembangan difinalkan di menu Laporan. Tagihan bulanan diterbitkan dan diperiksa terpisah melalui <strong>Keuangan → Penagihan</strong>.
          </p>
        )}
      </div>

      {/* Tabs navigasi */}
      <Tabs
        tabs={[
          { key: "ringkasan", label: "Ringkasan" },
          { key: "sesi", label: "Sesi & Jadwal" },
          { key: "nilai", label: "Progres" },
          { key: "iaee", label: "IA/EE/PP" },
        ]}
        active={detailTab}
        onChange={setDetailTab}
        idPrefix="student"
        fullWidth
      />

      {/* Audit L-06: panel per tab SELALU ada di DOM supaya `aria-controls` setiap
          tab menunjuk elemen nyata; isi panel tetap hanya dirender saat tabnya
          aktif (pekerjaan/query tetap lazy). */}
      <div role="tabpanel" id="student-panel-ringkasan" aria-labelledby="student-tab-ringkasan" hidden={detailTab !== "ringkasan"}>
      {detailTab === "ringkasan" && (<>
      {/* Info card */}
      <div className="bg-[var(--surface-strong)] rounded-2xl p-4 shadow-sm border border-[var(--border)] space-y-2">
        <h2 className="font-semibold text-[var(--ink-strong)] text-sm mb-2">Info Murid</h2>
        {student.school && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[var(--ink-muted)] w-28 flex-shrink-0">Sekolah</span>
            <span className="text-[var(--ink-strong)] font-medium">{student.school}</span>
          </div>
        )}
        {student.grade && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[var(--ink-muted)] w-28 flex-shrink-0">Kelas</span>
            <span className="text-[var(--ink-strong)] font-medium">{student.grade}</span>
          </div>
        )}
        {student.subjects.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[var(--ink-muted)] w-28 flex-shrink-0">Mapel</span>
            <span className="text-[var(--ink-strong)] font-medium">{student.subjects.join(", ")}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-[var(--ink-muted)] w-28 flex-shrink-0">Orang Tua</span>
          <span className="text-[var(--ink-strong)] font-medium">{student.parentContact.name || "—"}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-[var(--ink-muted)] w-28 flex-shrink-0">WA Ortu</span>
          <a href={`https://wa.me/${student.parentContact.phone.replace(/^0/, "62").replace(/[^0-9]/g, "")}`}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center gap-1.5 text-[var(--ink-success)] font-medium hover:text-[var(--ink-success)]">
            <span>💬</span>{student.parentContact.phone}
          </a>
        </div>
        {student.studentPhone && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[var(--ink-muted)] w-28 flex-shrink-0">WA Murid</span>
            <a href={`https://wa.me/${student.studentPhone.replace(/^0/, "62").replace(/[^0-9]/g, "")}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center gap-1.5 text-[var(--ink-brand)] font-medium hover:text-[var(--ink-brand)]">
              <span>💬</span>{student.studentPhone}
            </a>
          </div>
        )}
        {student.notes && (
          <div className="flex items-start gap-2 text-sm">
            <span className="text-[var(--ink-muted)] w-28 flex-shrink-0">Catatan</span>
            <span className="text-[var(--ink-strong)]">{student.notes}</span>
          </div>
        )}

        {/* Tarif les — satu bentuk terkunci `Rp ••••••` + gembok (K3.2/K3.6) */}
        <div className="flex items-center gap-2 text-sm pt-1 border-t border-[var(--border)]">
          <span className="text-[var(--ink-muted)] w-28 flex-shrink-0">Tarif les</span>
          {money.visible ? (
            showRateEdit ? (
              <div className="flex flex-1 flex-col gap-2">
                <div className="flex items-center gap-2">
                  <input type="number" className="input text-sm py-1.5 flex-1" value={newRate || ""}
                    onChange={(e) => setNewRate(clampCurrencyAmount(Number(e.target.value), MAX_HOURLY_RATE))}
                    placeholder={studentBillingPolicy === "session_count" ? "IDR/pertemuan" : "IDR/jam"} />
                  <button onClick={handleSaveRate} disabled={rateSaving}
                    className="text-xs bg-[var(--brand-solid)] text-[var(--on-strong)] px-2 py-1.5 rounded-lg font-semibold">
                    {rateSaving ? "..." : "Simpan"}
                  </button>
                  <button onClick={() => { setShowRateEdit(false); setRepriceUnbilledSessions(false); }}
                    className="text-xs text-[var(--ink-muted)] px-1.5 py-1.5"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
                </div>
                {newRate !== student.hourlyRate && (unbilledCount ?? 0) > 0 && (
                  <label className="flex items-start gap-2 rounded-lg border border-[var(--border-warn)] bg-[var(--bg-warn)] p-2 text-xs leading-relaxed text-[var(--ink-warn)]">
                    <input
                      type="checkbox"
                      checked={repriceUnbilledSessions}
                      onChange={(event) => setRepriceUnbilledSessions(event.target.checked)}
                      className="mt-0.5 h-4 w-4 flex-none accent-[var(--border-warn)]"
                    />
                    <span>
                      Terapkan tarif baru ke {unbilledCount} sesi lama yang belum ditagih (retroaktif).
                      Tanpa centang ini, sesi lama tetap memakai tarif historisnya dan hanya sesi
                      berikutnya yang memakai tarif baru. Tindakan retroaktif tercatat di Riwayat Aktivitas.
                    </span>
                  </label>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1">
                <span className="text-[var(--ink-strong)] font-medium"><MaskedMoney amount={student.hourlyRate} />/{studentBillingPolicy === "session_count" ? "pertemuan" : "jam"}</span>
                <button onClick={() => { setShowRateEdit(true); setNewRate(student.hourlyRate); }}
                  className="ml-auto text-xs bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle)] text-[var(--ink-muted)] px-2 py-1 rounded-lg">✏️ Edit</button>
                <button onClick={money.lock} aria-label="Kunci angka uang"
                  className="inline-flex h-8 w-8 items-center justify-center text-xs text-[var(--ink-muted)] px-1.5 py-1">🔒</button>
              </div>
            )
          ) : (
            <div className="flex items-center gap-2 flex-1">
              <MaskedMoney amount={student.hourlyRate} className="text-base" hideUnlock={money.needsSetup} />
              {money.needsSetup && (
                <button onClick={() => navigate("/settings")}
                  className="ml-auto text-xs bg-[var(--bg-danger)] hover:bg-[var(--bg-danger)] text-[var(--ink-danger)] px-2 py-1 rounded-lg">Buat PIN</button>
              )}
              {money.locked && (
                <span className="ml-auto text-xs text-[var(--ink-muted)]">Tarif dikunci</span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-start gap-2 border-t border-[var(--border)] pt-2 text-sm">
          <span className="w-28 flex-shrink-0 text-[var(--ink-muted)]">Siklus tagihan</span>
          <span className="min-w-0 flex-1 font-medium text-[var(--ink-strong)]">
            {studentBillingPolicy === "session_count"
              ? `Setiap ${student.billingSessionCount ?? 8} pertemuan yang dapat ditagih${
                  student.pendingBillingPolicy
                    ? ` · akan beralih ke ${student.pendingBillingPolicy === "monthly" ? "Bulanan" : "Manual"} setelah antrean selesai`
                    : ""
                }`
              : studentBillingPolicy === "manual"
                ? "Manual"
                : "Bulanan (Laporan → Tagihan)"}
          </span>
          <button
            type="button"
            onClick={() => setShowBillingHelp(true)}
            aria-label="Bantuan siklus tagihan"
            title="Cara kerja siklus tagihan"
            className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[var(--bg-subtle)] text-xs font-bold text-[var(--ink-muted)] transition-colors hover:bg-[var(--brand-tint-strong)] hover:text-[var(--ink-brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-brand)]"
          >?</button>
        </div>

        {totalSessions > 0 && (
          <div className="pt-3 mt-1 border-t border-[var(--border)] grid grid-cols-2 gap-3">
            <div className="bg-[var(--brand-tint)] rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-[var(--ink-brand)]">{totalSessions}</p>
              <p className="text-xs text-[var(--ink-brand)] font-medium">Total Sesi</p>
            </div>
            <div className="bg-[var(--accent-tint)] rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-[var(--ink-accent)]">{totalHours}j</p>
              <p className="text-xs text-[var(--ink-accent)] font-medium">Total Jam</p>
            </div>
          </div>
        )}
      </div>
      {student && (
        <StudyNoteCard
          studentId={student.id}
          studyNote={studyNote}
          onSave={async (content) => { await saveStudyNote(student.id, content); }}
        />
      )}
      </>)}
      </div>

      <div role="tabpanel" id="student-panel-sesi" aria-labelledby="student-tab-sesi" hidden={detailTab !== "sesi"}>
      {detailTab === "sesi" && (<>

      {/* ── BUKTI KEAKTIFAN ── */}
      {avgEngScore !== null && (
        <EvidenceCard
          avgEngScore={avgEngScore}
          engSessions={engSessions}
        />
      )}

      {/* ── RIWAYAT SESI (diektrak ke studentDetail/RiwayatSesi.tsx) ── */}
      <RiwayatSesi
        allSessions={allSessions ?? []}
        paginatedHistorySessions={paginatedHistorySessions}
        historySessions={historySessions}
        historyMonth={historyMonth}
        historyMonthOptions={historyMonthOptions}
        setHistoryMonth={setHistoryMonth}
        safeHistoryPage={safeHistoryPage}
        setHistoryPage={setHistoryPage}
        photoUrls={photoUrls}
        sigUrls={sigUrls}
        setDetailSession={setDetailSession}
        openEditNote={openEditNote}
        onCaptureFirst={() => navigate("/capture")}
      />

      {/* ── JADWAL MENDATANG ── */}
      <UpcomingSchedule
        upcomingSched={upcomingSched}
        schedMonth={schedMonth}
        setSchedMonth={setSchedMonth}
        upcomingPage={upcomingPage}
        setUpcomingPage={setUpcomingPage}
        today={today}
        openEditSched={openEditSched}
      />
      </>
      )}
      </div>

      <div role="tabpanel" id="student-panel-iaee" aria-labelledby="student-tab-iaee" hidden={detailTab !== "iaee"}>
      {detailTab === "iaee" && (<>

      {/* ── IA / EE / PP TRACKER (diekstrak ke studentDetail/IaEeTracker.tsx) ── */}
      <IaEeTracker student={student!} projects={iaeeProjects ?? []} notify={msg} />
      </>)}
      </div>

      <div role="tabpanel" id="student-panel-nilai" aria-labelledby="student-tab-nilai" hidden={detailTab !== "nilai"}>
      {detailTab === "nilai" && (
        <NilaiRapor
          engSessions={engSessions}
          avgEngScore={avgEngScore}
          engTrend={engTrend}
          recentEng={recentEng}
          subjectEngStats={subjectEngStats}
          subjectPage={subjectPage}
          setSubjectPage={setSubjectPage}
          student={student!}
          responseStats={responseStats}
        />
      )}
      </div>
      {/* Modals — always render regardless of tab */}

      {/* ── EDIT SESSION NOTES MODAL ── */}
      {editSession && (
        <div role="dialog" aria-modal="true" aria-label="Edit catatan sesi" className={`fixed inset-0 bg-[var(--scrim)]/40 ${Z.modal} flex items-end justify-center`} onClick={() => setEditSession(null)}>
          <div className="bg-[var(--surface-strong)] w-full max-w-md rounded-t-2xl pb-8 max-h-[80vh] overflow-y-auto overflow-x-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <div>
                <h3 className="font-bold text-base">Edit Catatan Sesi</h3>
                <p className="text-xs text-[var(--ink-muted)] mt-0.5">{editSession.date} · {editSession.durationHours}j</p>
              </div>
              <button onClick={() => setEditSession(null)} aria-label="Tutup" className="text-[var(--ink-muted)] text-xl"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>
            <div className="p-5 space-y-4">
              {/* ── Durasi & Biaya ── */}
              <div className="bg-[var(--surface)] rounded-xl p-4 space-y-3">
                <div>
                  <label className="label">⏱️ Durasi</label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {DURATIONS.filter((d) => d <= 3).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => { setEditNoteDuration(d); if (editCostOverride === null) setEditCost(d * editSession.rateSnapshot); }}
                        className={`py-1.5 px-3 rounded-lg text-xs font-semibold border transition-colors ${
                          editNoteDuration === d
                            ? "bg-[var(--brand-solid)] text-[var(--on-strong)] border-[var(--border-brand)]"
                            : "bg-[var(--surface-strong)] text-[var(--ink-muted)] border-[var(--border)]"
                        }`}
                      >
                        {d}j
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label">💰 Biaya</label>
                  {money.visible && isEditingCost ? (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[var(--ink-muted)] text-sm font-medium">Rp</span>
                      <input
                        type="number"
                        className="input flex-1"
                        value={editCostOverride ?? editCost}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10);
                          if (!isNaN(v) && v >= 0) setEditCostOverride(v);
                          else if (e.target.value === "") setEditCostOverride(0);
                        }}
                        placeholder="300000"
                        min={0}
                        step={500}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setIsEditingCost(false)}
                        className="text-xs text-[var(--ink-muted)] hover:text-[var(--ink-muted)] px-2 py-1"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <MaskedMoney amount={editCostOverride ?? editCost} className="text-base font-bold text-[var(--ink-strong)]" />
                      {money.visible && editCostOverride !== null && (
                        <span className="text-xs bg-[var(--bg-warn)] text-[var(--ink-warn)] px-1.5 py-0.5 rounded-full font-medium">
                          Manual
                        </span>
                      )}
                      {money.visible && editCostOverride !== null && (
                        <button
                          type="button"
                          onClick={() => setEditCostOverride(null)}
                          className="text-xs text-[var(--ink-danger)] hover:text-[var(--ink-danger)] ml-1"
                          title="Kembalikan ke hitungan otomatis"
                        >
                          ↺ Reset
                        </button>
                      )}
                      {money.visible && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingCost(true);
                            if (editCostOverride === null) setEditCostOverride(editCost);
                          }}
                          className="text-xs text-[var(--ink-brand)] hover:text-[var(--ink-brand)] ml-auto"
                          title="Edit biaya manual"
                        >
                          ✏️ Edit
                        </button>
                      )}
                    </div>
                  )}
                  {money.visible && editCostOverride === null && (
                    <p className="text-xs text-[var(--ink-muted)] mt-0.5">
                      <MaskedMoney amount={editSession.rateSnapshot} />/jam × {editNoteDuration}j
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label htmlFor="sd-catatan-singkat" className="label">Catatan Singkat</label>
                <textarea id="sd-catatan-singkat" className="input" rows={3} value={editShortNote}
                  onChange={(e) => setEditShortNote(e.target.value)}
                  placeholder="Apa yang dibahas hari ini?" />
              </div>
              <div>
                <label htmlFor="sd-topik" className="label">Topik Spesifik</label>
                <input id="sd-topik" className="input" value={editTopic}
                  onChange={(e) => setEditTopic(e.target.value)}
                  placeholder="Mis. Quadratic Functions, Essay Structure..." />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="sd-prediksi" className="label">📈 Prediksi Nilai</label>
                  <input id="sd-prediksi" className="input" maxLength={10} value={editPredictedGrade}
                    onChange={(e) => setEditPredictedGrade(e.target.value)}
                    placeholder="mis. 6, 7, A" />
                </div>
                <div>
                  <label htmlFor="sd-aktual" className="label">✅ Nilai Akhir</label>
                  <input id="sd-aktual" className="input" maxLength={10} value={editActualGrade}
                    onChange={(e) => { setEditActualGrade(e.target.value); setEditGradeError(""); }}
                    placeholder="mis. 5, B" />
                </div>
              </div>
              {isGradeLower(editActualGrade, editPredictedGrade) && (
                <div>
                  <label htmlFor="sd-refleksi" className="label">💭 Refleksi Nilai <span className="text-[var(--ink-danger)]">*</span></label>
                  <textarea id="sd-refleksi" className="input text-sm" rows={2} value={editGradeReflection}
                    onChange={(e) => { setEditGradeReflection(e.target.value); setEditGradeError(""); }}
                    placeholder="Kenapa nilai akhir lebih rendah dari prediksi? (mis. soal ujian lebih sulit, materi belum dikuasai, kondisi murid...)" />
                  <p className="text-xs text-[var(--ink-attention)] mt-1">Prediksi ({editPredictedGrade}) lebih tinggi dari nilai akhir ({editActualGrade}) — refleksi wajib diisi.</p>
                  {editGradeError && <p className="text-xs text-[var(--ink-danger)] mt-1">{editGradeError}</p>}
                </div>
              )}
              <div>
                <label htmlFor="sd-followup" className="label">Perlu Diulang / Follow-up</label>
                <input id="sd-followup" className="input" value={editNeedsWork}
                  onChange={(e) => setEditNeedsWork(e.target.value)}
                  placeholder="Hal yang perlu dikerjakan di sesi berikutnya..." />
              </div>

              {/* Foto sesi */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="label !mb-0">📸 Foto Sesi</label>
                  {editPhotoUrl && (
                    <button type="button" onClick={() => { setEditPhoto(undefined); setEditPhotoError(""); }}
                      className="text-xs text-[var(--ink-danger)] hover:text-[var(--ink-danger)]">Hapus</button>
                  )}
                </div>
                <input ref={editCameraRef} type="file" accept="image/*" capture="environment"
                  onChange={handleEditPhoto} className="hidden" />
                <input ref={editGalleryRef} type="file" accept="image/*"
                  onChange={handleEditPhoto} className="hidden" />
                {editPhotoUrl ? (
                  <div className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                    <img src={editPhotoUrl} alt="Foto sesi" className="h-44 w-full object-cover" />
                    <div className="absolute bottom-2 right-2 flex gap-1.5">
                      <button type="button" onClick={() => editCameraRef.current?.click()}
                        className="rounded-full bg-[var(--scrim)]/65 px-2.5 py-1 text-xs text-[var(--on-strong)]">📷 Kamera</button>
                      <button type="button" onClick={() => editGalleryRef.current?.click()}
                        className="rounded-full bg-[var(--scrim)]/65 px-2.5 py-1 text-xs text-[var(--on-strong)]">🖼️ Galeri</button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => editCameraRef.current?.click()}
                      className="rounded-xl border-2 border-dashed border-[var(--border)] py-5 text-sm text-[var(--ink-muted)] transition-colors hover:border-[var(--brand-tint-strong)] hover:text-[var(--ink-brand)]">
                      📷 Ambil Foto
                    </button>
                    <button type="button" onClick={() => editGalleryRef.current?.click()}
                      className="rounded-xl border-2 border-dashed border-[var(--border)] py-5 text-sm text-[var(--ink-muted)] transition-colors hover:border-[var(--border-success)] hover:text-[var(--ink-success)]">
                      🖼️ Pilih Galeri
                    </button>
                  </div>
                )}
                {editPhotoError && <p className="mt-1 text-xs text-[var(--ink-danger)]">{editPhotoError}</p>}
                <p className="mt-1.5 text-xs text-[var(--ink-muted)]">Foto akan dikompres dan diberi tanggal sesi.</p>
              </div>

              {/* Tanda Tangan Murid */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="label !mb-0">✍️ Tanda Tangan Murid</label>
                  {editSigUrl && (
                    <button type="button" onClick={() => { setEditSignature(undefined); setShowEditSigPad(false); }}
                      className="text-xs text-[var(--ink-danger)] hover:text-[var(--ink-danger)]">Hapus</button>
                  )}
                </div>
                {showEditSigPad ? (
                  <div className="space-y-2">
                    <SignaturePad
                      onSave={(blob) => { setEditSignature(blob); setShowEditSigPad(false); }}
                      onClear={() => setEditSignature(undefined)}
                    />
                    <button type="button" onClick={() => setShowEditSigPad(false)}
                      className="text-xs text-[var(--ink-muted)] w-full text-center">Tutup</button>
                  </div>
                ) : editSigUrl ? (
                  <div className="border border-[var(--border)] rounded-xl p-2 bg-[var(--surface)] flex items-center gap-3">
                    <img src={editSigUrl} alt="TTD" className="h-12 max-w-[120px] object-contain" />
                    <button type="button" onClick={() => setShowEditSigPad(true)}
                      className="text-xs text-[var(--ink-brand)] hover:underline">Ganti</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setShowEditSigPad(true)}
                    className="w-full py-2.5 border-2 border-dashed border-[var(--border)] rounded-xl text-sm text-[var(--ink-muted)] hover:border-[var(--brand-tint-strong)] hover:text-[var(--ink-brand)] transition-colors">
                    + Minta tanda tangan murid
                  </button>
                )}
              </div>

              <button onClick={handleSaveNote} disabled={editNoteSaving}
                className="w-full py-3 rounded-xl bg-[var(--brand-solid)] text-[var(--on-strong)] font-bold text-sm hover:bg-[var(--brand-solid)] disabled:opacity-50 transition-colors">
                {editNoteSaving ? "Menyimpan..." : "Simpan Catatan"}
              </button>
              <button type="button" onClick={() => { setDetailSession(editSession); setEditSession(null); }}
                className="w-full py-2.5 rounded-xl border border-[var(--border-danger)] text-[var(--ink-danger)] text-sm font-medium hover:bg-[var(--bg-danger)] transition-colors">
                Kelola / Hapus Sesi
              </button>
              <p className="text-center text-xs text-[var(--ink-muted)]">Penghapusan sesi memerlukan PIN Keuangan.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT SCHEDULE MODAL ── */}
      {editTarget && (
        <div role="dialog" aria-modal="true" aria-label="Edit jadwal" className={`fixed inset-0 bg-[var(--scrim)]/40 ${Z.modal} flex items-end justify-center`} onClick={() => setEditTarget(null)}>
          <div className="bg-[var(--surface-strong)] w-full max-w-md rounded-t-2xl pb-8 max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <div>
                <h3 className="font-bold text-lg">Edit Jadwal</h3>
                <p className="text-xs text-[var(--ink-muted)]">{dayLabel(editTarget.date)}{editTarget.seriesId ? " · Sesi berulang 🔁" : ""}</p>
              </div>
              <button onClick={() => setEditTarget(null)} aria-label="Tutup" className="text-[var(--ink-muted)] text-xl"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label htmlFor="sd-tanggal" className="label">Tanggal{editTarget.seriesId && editMode !== "this" && <span className="ml-2 text-xs text-[var(--ink-muted)] font-normal">(hanya bisa diubah untuk sesi ini saja)</span>}</label>
                <input id="sd-tanggal" className="input" type="date" value={editDate}
                  disabled={!!editTarget.seriesId && editMode !== "this"}
                  onChange={(e) => setEditDate(e.target.value)} />
              </div>
              <div>
                <label className="label">Jam Mulai</label>
                <ClockTimePicker value={editTime} onChange={setEditTime} />
              </div>
              <div>
                <label className="label">Durasi</label>
                <div className="flex flex-wrap gap-2">
                  {DURATIONS.map((d) => (
                    <button key={d} type="button" onClick={() => setEditDuration(d)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${editDuration === d ? "bg-[var(--brand-solid)] text-[var(--on-strong)] border-[var(--border-brand)]" : "bg-[var(--surface-strong)] text-[var(--ink-muted)] border-[var(--border)]"}`}>
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
                        className={`py-2 rounded-xl text-xs font-semibold border transition-colors ${editMode === m ? "bg-[var(--brand-solid)] text-[var(--on-strong)] border-[var(--border-brand)]" : "bg-[var(--surface)] text-[var(--ink-muted)] border-[var(--border)]"}`}>
                        {m === "this" ? "Sesi ini" : m === "future" ? "Ini & berikutnya" : "Semua seri"}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={handleSaveEdit} disabled={editSaving}
                className="w-full py-3 rounded-xl bg-[var(--brand-solid)] text-[var(--on-strong)] font-semibold hover:bg-[var(--brand-solid)] disabled:opacity-50 transition-colors">
                {editSaving ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
              <div className="border-t border-[var(--border)] pt-3">
                {!showCancelSect ? (
                  <button onClick={() => setShowCancelSect(true)}
                    className="w-full py-2.5 rounded-xl text-sm font-medium text-[var(--ink-danger)] bg-[var(--bg-danger)] hover:bg-[var(--bg-danger)] transition-colors">
                    Batalkan Jadwal Ini
                  </button>
                ) : (
                  <div className="space-y-2">
                    <label htmlFor="sd-alasan" className="text-sm font-semibold text-[var(--ink-danger)] mb-2 block">Batalkan — pilih scope:</label>
                    <textarea id="sd-alasan" className="input min-h-20 resize-y text-sm" value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)} placeholder="Alasan pembatalan (opsional)" />
                    {editTarget.seriesId ? (
                      <>
                        <button onClick={() => handleCancel("this")} className="w-full text-left px-4 py-3 rounded-xl bg-[var(--surface)] hover:bg-[var(--bg-subtle)] text-sm font-medium border border-[var(--border)]">Sesi ini saja</button>
                        <button onClick={() => handleCancel("future")} className="w-full text-left px-4 py-3 rounded-xl bg-[var(--bg-attention)] text-sm font-medium text-[var(--ink-attention)] border border-[var(--border-attention)]">Hari ini dan semua sesi berikutnya</button>
                        <button onClick={() => handleCancel("all")} className="w-full text-left px-4 py-3 rounded-xl bg-[var(--bg-danger)] text-sm font-medium text-[var(--ink-danger)] border border-[var(--border-danger)]">Semua sesi dalam seri ini</button>
                      </>
                    ) : (
                      <button onClick={() => handleCancel("this")} className="w-full px-4 py-3 rounded-xl bg-[var(--bg-danger)] text-[var(--ink-danger)] font-medium text-sm border border-[var(--border-danger)]">Ya, batalkan sesi ini</button>
                    )}
                    <button onClick={() => setShowCancelSect(false)} className="w-full text-center text-[var(--ink-muted)] text-sm py-1">Jangan batalkan</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SESSION DETAIL MODAL ── */}
      <SessionDetailModal
        detailSession={detailSession}
        photoUrls={photoUrls}
        sigUrls={sigUrls}
        setDetailSession={setDetailSession}
        settings={settings}
        showDeletePin={showDeletePin}
        setShowDeletePin={setShowDeletePin}
        deletePinInput={deletePinInput}
        setDeletePinInput={setDeletePinInput}
        deletePinError={deletePinError}
        setDeletePinError={setDeletePinError}
        handleDeleteSession={handleDeleteSession}
        openEditNote={openEditNote}
        openSettings={() => { setDetailSession(null); navigate("/settings"); }}
        // Koreksi kondisi sesi (audit P2 #16): tanpa jalur ini, indikator yang
        // salah tetap tersimpan selamanya dan tidak pernah bisa dibersihkan.
        onUpdateSession={async (patch) => {
          await updateSession(detailSession!.id, patch);
          setDetailSession((prev) => (prev ? { ...prev, ...patch } : prev));
          msg("Kondisi sesi diperbarui.");
        }}
      />

      {/* Bantuan siklus tagihan */}
      {showBillingHelp && (
        <Modal onClose={() => setShowBillingHelp(false)} ariaLabel="Cara kerja siklus tagihan">
          <h3 className="font-bold text-base">Siklus Tagihan</h3>
          <p className="text-xs leading-relaxed text-[var(--ink-muted)]">
            Cara murid ini ditagih. Ubah lewat <strong>Edit Profil → Siklus Tagihan</strong>; perubahan hanya memengaruhi sesi yang belum ditagih.
          </p>
          <ul className="space-y-2 text-xs leading-relaxed text-[var(--ink-strong)]">
            <li><strong>Bulanan (Tutup Bulan)</strong> — sesi yang dapat ditagih digabung per bulan lewat Tutup Bulan di Keuangan.</li>
            <li><strong>Paket per N pertemuan</strong> — tagihan dibuat setiap N pertemuan (sesi tertua lebih dulu); sisa yang belum genap ditagih lewat Tagihan Penutup.</li>
            <li><strong>Manual</strong> — buat tagihan nominal bebas tanpa mengambil sesi otomatis.</li>
          </ul>
          <div className="flex gap-3">
            <button onClick={() => setShowBillingHelp(false)}
              className="flex-1 py-3 rounded-xl bg-[var(--brand-solid)] text-[var(--on-strong)] font-bold text-sm">
              Mengerti
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
