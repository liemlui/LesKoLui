import { useMemo, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  getStudent, listSessionsByStudent, listScheduledForStudent,
  cancelSeriesSessions, updateSeriesSessions,
  listRaporGrades, upsertRaporGrade, deleteRaporGrade,
  getSettings, updateStudent, getHomeworkStats,
} from "../db/repos";
import { verifyPin } from "../lib/crypto";
import { getPinLockoutDelay, recordPinFailure, resetPinLockout } from "../lib/pinLockout";
import type { CancelMode, EditMode } from "../db/repos";
import { dayLabel, monthLabel, todayWIB, formatRupiah } from "../lib/format";
import {
  scoreLabel, scoreBarColor,
  semesterOptions, semesterLabel, semesterDateRange, currentSemester,
} from "../lib/engagement";
import type { Session } from "../db/types";
import { CURRICULUM_META } from "../lib/ibSubjects";
import PaginationControls from "../components/PaginationControls";
import { clampPage, paginateItems } from "../lib/pagination";
import ClockTimePicker from "../components/ClockTimePicker";
import SignaturePad from "../components/SignaturePad";
import { analyzeStudent } from "../lib/aiClient";
import type { AiStudentInsight } from "../lib/aiClient";

const DURATIONS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6];

export default function StudentDetail() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const today    = todayWIB();

  const student       = useLiveQuery(() => (id ? getStudent(id) : undefined), [id]);
  const allSessions   = useLiveQuery(() => (id ? listSessionsByStudent(id) : []), [id]);
  const upcomingSched = useLiveQuery(() => (id ? listScheduledForStudent(id, today) : []), [id, today]);
  const raporList     = useLiveQuery(() => (id ? listRaporGrades(id) : []), [id]);
  const settings      = useLiveQuery(() => getSettings(), []);
  const hwStats       = useLiveQuery(() => (id ? getHomeworkStats(id) : undefined), [id]);

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
  const [subjectPage,    setSubjectPage]    = useState(1);
  const [raporPage,      setRaporPage]      = useState(1);
  const [upcomingPage,   setUpcomingPage]   = useState(1);
  const [historyPage,    setHistoryPage]    = useState(1);
  const [historyMonth,   setHistoryMonth]   = useState(() => today.slice(0, 7));
  const [schedMonth,     setSchedMonth]     = useState<string>("");
  const [showBilling,      setShowBilling]      = useState(false);
  const [billingMonth,     setBillingMonth]     = useState(() => today.slice(0, 7));
  const [billingUnlocked,  setBillingUnlocked]  = useState(false);
  const [billingPinInput,  setBillingPinInput]  = useState("");
  const [billingPinError,  setBillingPinError]  = useState("");

  // Session detail + delete
  const [detailSession,    setDetailSession]    = useState<import("../db/types").Session | null>(null);
  const [deletePinInput,   setDeletePinInput]   = useState("");
  const [deletePinError,   setDeletePinError]   = useState("");
  const [showDeletePin,    setShowDeletePin]     = useState(false);

  const [flash, setFlash] = useState("");
  function msg(t: string) { setFlash(t); setTimeout(() => setFlash(""), 3000); }

  // AI states
  const [aiInsightLoading, setAiInsightLoading] = useState(false);
  const [aiInsight,        setAiInsight]        = useState<AiStudentInsight | null>(null);
  const [aiInsightError,   setAiInsightError]   = useState("");

  // Tarif les (PIN-protected reveal + edit)
  const [rateUnlocked,  setRateUnlocked]  = useState(false);
  const [ratePinInput,  setRatePinInput]  = useState("");
  const [ratePinError,  setRatePinError]  = useState("");
  const [showRateEdit,  setShowRateEdit]  = useState(false);
  const [newRate,       setNewRate]       = useState(0);
  const [rateSaving,    setRateSaving]    = useState(false);

  const handleUnlockBilling = async () => {
    if (!settings?.financialPin) { setBillingUnlocked(true); setBillingPinError(""); return; }
    const delay = getPinLockoutDelay();
    if (delay > 0) { setBillingPinError(`Tunggu ${Math.ceil(delay / 1000)} detik.`); return; }
    const ok = await verifyPin(billingPinInput, settings.financialPin);
    if (!ok) { recordPinFailure(); setBillingPinError("PIN salah."); return; }
    resetPinLockout(); setBillingPinError(""); setBillingUnlocked(true); setBillingPinInput("");
  };

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
    const { deleteSession } = await import("../db/repos");
    await deleteSession(detailSession.id);
    setDetailSession(null); setShowDeletePin(false); setDeletePinInput(""); setDeletePinError("");
    msg("Sesi dihapus");
  };

  const handleUnlockRate = async () => {
    if (!settings?.financialPin) { setRateUnlocked(true); setRatePinError(""); return; }
    const delay = getPinLockoutDelay();
    if (delay > 0) { setRatePinError(`Tunggu ${Math.ceil(delay / 1000)} detik.`); return; }
    const ok = await verifyPin(ratePinInput, settings.financialPin);
    if (!ok) { recordPinFailure(); setRatePinError("PIN salah."); return; }
    resetPinLockout(); setRatePinError(""); setRateUnlocked(true); setRatePinInput("");
  };

  const handleSaveRate = async () => {
    if (!id || !newRate || newRate <= 0) return;
    setRateSaving(true);
    try { await updateStudent(id, { hourlyRate: newRate }); msg("Tarif diperbarui ✓"); setShowRateEdit(false); setRateUnlocked(false); }
    catch (e) { msg("Gagal: " + (e as Error).message); }
    finally { setRateSaving(false); }
  };

  // Edit DONE session notes
  const [editSession,     setEditSession]     = useState<Session | null>(null);
  const [editShortNote,   setEditShortNote]   = useState("");
  const [editTopic,       setEditTopic]       = useState("");
  const [editNeedsWork,   setEditNeedsWork]   = useState("");
  const [editNoteSaving,  setEditNoteSaving]  = useState(false);
  const [editSignature,   setEditSignature]   = useState<Blob | undefined>();
  const [editSigUrl,      setEditSigUrl]      = useState<string | undefined>();
  const [showEditSigPad,  setShowEditSigPad]  = useState(false);

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
    setEditSignature(s.signature);
    setShowEditSigPad(false);
  };

  const handleSaveNote = async () => {
    if (!editSession) return;
    setEditNoteSaving(true);
    try {
      const { updateSession } = await import("../db/repos");
      await updateSession(editSession.id, {
        shortNote: editShortNote.trim(),
        topic: editTopic.trim() || undefined,
        needsWork: editNeedsWork.trim() || undefined,
        signature: editSignature,
      });
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

  const SEMESTERS = semesterOptions(6);

  // ── Computed ────────────────────────────────────────────────────────
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

  const buildBillingWA = useMemo(() => {
    if (!student) return { text: "", totalHours: 0, totalCost: 0, count: 0 };
    const doneSessions = (allSessions ?? [])
      .filter((s) => s.status === "DONE" && s.date.startsWith(billingMonth))
      .sort((a, b) => a.date.localeCompare(b.date));
    const totalHours = doneSessions.reduce((sum, s) => sum + s.durationHours, 0);
    const totalCost  = doneSessions.reduce((sum, s) => sum + s.cost, 0);
    const rateStr    = formatRupiah(student.hourlyRate);
    const bank       = settings?.bankAccounts;

    const lines: string[] = [
      `Absensi ${student.name} — ${monthLabel(billingMonth)}`,
      ``,
      `Rincian sesi:`,
    ];

    doneSessions.forEach((s) => {
      const dateShort = dayLabel(s.date).replace(/^\w+, /, "").replace(/ \d{4}$/, "");
      const subj = s.subjects.length > 0 ? s.subjects.join(", ") : "Sesi umum";
      lines.push(`• ${dateShort} — ${subj} (${s.durationHours}j)`);
    });

    lines.push(
      `━━━━━━━━━━━━━━`,
      `⏱ Total: ${totalHours} jam × ${rateStr}`,
      `💵 Total: ${formatRupiah(totalCost)}`,
    );

    if (bank && (bank.bca || bank.cimb || bank.bri)) {
      lines.push(``, `🏦 Transfer ke:`);
      if (bank.bca)  lines.push(`BCA ${bank.bca}${bank.accountName ? ` a.n. ${bank.accountName}` : ""}`);
      if (bank.cimb) lines.push(`CIMB ${bank.cimb}${bank.accountName ? ` a.n. ${bank.accountName}` : ""}`);
      if (bank.bri)  lines.push(`BRI ${bank.bri}${bank.accountName ? ` a.n. ${bank.accountName}` : ""}`);
    }

    lines.push(``, `Terima kasih 🙏`, settings?.tutorProfile?.name || "Ko Lui");
    return { text: lines.join("\n"), totalHours, totalCost, count: doneSessions.length };
  }, [allSessions, billingMonth, student, settings]);

  if (!student) return <div className="p-4 text-gray-500">Memuat...</div>;

  const safeSubjectPage = clampPage(subjectPage, subjectEngStats.length);
  const paginatedSubjectEngStats = paginateItems(subjectEngStats, safeSubjectPage);
  const safeRaporPage = clampPage(raporPage, raporCorrelation.length);
  const paginatedRaporCorrelation = paginateItems(raporCorrelation, safeRaporPage);
  const upcomingList = upcomingSched ?? [];
  const safeHistoryPage = clampPage(historyPage, historySessions.length);
  const paginatedHistorySessions = paginateItems(historySessions, safeHistoryPage);

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
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {student.curriculum ? (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CURRICULUM_META[student.curriculum].color} ${CURRICULUM_META[student.curriculum].text}`}>
                {CURRICULUM_META[student.curriculum].shortLabel}
              </span>
            ) : (
              <span className="text-xs text-gray-400">{student.level}</span>
            )}
            {student.grade && <span className="text-xs text-gray-400">{student.grade}</span>}
            {student.school && <span className="text-xs text-gray-400">· {student.school}</span>}
            {student.subjects.length > 0 && (
              <span className="text-xs text-gray-400">· {student.subjects.join(", ")}</span>
            )}
          </div>
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
        <button onClick={() => navigate(`/report?studentId=${id}`)}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-50 text-indigo-700 text-sm font-semibold border border-indigo-200 hover:bg-indigo-100 transition-colors">
          <span>📊</span> Lihat Laporan
        </button>
        <button onClick={() => { setBillingMonth(today.slice(0,7)); setBillingUnlocked(false); setBillingPinInput(""); setBillingPinError(""); setShowBilling(true); }}
          className="col-span-2 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-50 text-green-700 text-sm font-semibold border border-green-200 hover:bg-green-100 transition-colors">
          <span>💬</span> Tagihan WA
        </button>
      </div>

      {/* Info card */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-2">
        <h2 className="font-semibold text-gray-700 text-sm mb-2">Info Murid</h2>
        {student.school && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400 w-28 flex-shrink-0">Sekolah</span>
            <span className="text-gray-700 font-medium">{student.school}</span>
          </div>
        )}
        {student.grade && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400 w-28 flex-shrink-0">Kelas</span>
            <span className="text-gray-700 font-medium">{student.grade}</span>
          </div>
        )}
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

        {/* Tarif les — masked, unlock with PIN to reveal or edit */}
        <div className="flex items-center gap-2 text-sm pt-1 border-t border-gray-50">
          <span className="text-gray-400 w-28 flex-shrink-0">Tarif les</span>
          {rateUnlocked ? (
            showRateEdit ? (
              <div className="flex items-center gap-2 flex-1">
                <input type="number" className="input text-sm py-1.5 flex-1" value={newRate || ""}
                  onChange={(e) => setNewRate(Number(e.target.value))} placeholder="IDR/jam" />
                <button onClick={handleSaveRate} disabled={rateSaving}
                  className="text-xs bg-blue-600 text-white px-2 py-1.5 rounded-lg font-semibold">
                  {rateSaving ? "..." : "Simpan"}
                </button>
                <button onClick={() => { setShowRateEdit(false); }}
                  className="text-xs text-gray-400 px-1.5 py-1.5">✕</button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1">
                <span className="text-gray-700 font-medium">Rp {student.hourlyRate.toLocaleString("id-ID")}/jam</span>
                <button onClick={() => { setShowRateEdit(true); setNewRate(student.hourlyRate); }}
                  className="ml-auto text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded-lg">✏️ Edit</button>
                <button onClick={() => { setRateUnlocked(false); setRatePinInput(""); }}
                  className="text-xs text-gray-300 px-1.5 py-1">🔒</button>
              </div>
            )
          ) : (
            <div className="flex items-center gap-2 flex-1">
              <span className="text-gray-400 tracking-widest text-base">•••••</span>
              {settings?.financialPin ? (
                <div className="flex items-center gap-1.5 ml-auto">
                  <input type="password" inputMode="numeric" maxLength={6} placeholder="PIN"
                    value={ratePinInput} onChange={(e) => { setRatePinInput(e.target.value); setRatePinError(""); }}
                    className="w-16 text-xs border border-gray-200 rounded-lg px-2 py-1 text-center" />
                  <button onClick={handleUnlockRate}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded-lg">🔒 Buka</button>
                </div>
              ) : (
                <button onClick={() => { setRateUnlocked(true); }}
                  className="ml-auto text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded-lg">Lihat</button>
              )}
              {ratePinError && <span className="text-xs text-red-500">{ratePinError}</span>}
            </div>
          )}
        </div>

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

      {/* ── BUKTI KEAKTIFAN ── */}
      {(hwStats || avgEngScore !== null || (raporList && raporList.length > 0)) && (() => {
        const latestRapor = raporList && raporList.length > 0
          ? [...raporList].sort((a, b) => b.semester.localeCompare(a.semester))[0]
          : null;
        const avgGradeStr = latestRapor
          ? (() => {
              const vals = latestRapor.grades
                .map((g) => parseFloat(g.grade))
                .filter((n) => !isNaN(n));
              return vals.length > 0
                ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
                : latestRapor.grades[0]?.grade ?? "—";
            })()
          : null;

        const hwRate = hwStats && (hwStats.done + hwStats.notDone) > 0 ? hwStats.completionRate : null;

        // Interpretasi
        const interpretation = (() => {
          if (hwRate === null || avgEngScore === null) return null;
          if (hwRate >= 80 && avgEngScore >= 7) return { text: "Aktif & patuh — murid terbaik!", color: "text-green-600" };
          if (hwRate >= 80 && avgEngScore < 6) return { text: "Rajin kerjakan PR tapi kurang fokus saat les.", color: "text-orange-500" };
          if (hwRate < 50 && avgEngScore >= 7) return { text: "Aktif saat les, tapi PR sering tidak dikerjakan.", color: "text-orange-500" };
          if (hwRate < 50 && avgEngScore < 5) return { text: "Perlu perhatian ekstra — kurang aktif & PR jarang dikerjakan.", color: "text-red-500" };
          return { text: "Cukup baik, masih bisa ditingkatkan.", color: "text-blue-600" };
        })();

        return (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
            <h2 className="text-base font-semibold text-gray-700">Bukti Keaktifan</h2>
            <p className="text-xs text-gray-400">Perbandingan PR, keaktifan sesi, dan nilai sekolah sebagai bukti progres.</p>

            <div className="grid grid-cols-3 gap-2">
              {/* PR Compliance */}
              <div className={`rounded-xl p-3 text-center ${hwRate === null ? "bg-gray-50" : hwRate >= 70 ? "bg-green-50" : hwRate >= 40 ? "bg-orange-50" : "bg-red-50"}`}>
                <p className={`text-xl font-bold ${hwRate === null ? "text-gray-300" : hwRate >= 70 ? "text-green-700" : hwRate >= 40 ? "text-orange-600" : "text-red-600"}`}>
                  {hwRate !== null ? `${hwRate}%` : "—"}
                </p>
                <p className="text-xs font-medium text-gray-500 mt-0.5">Kepatuhan PR</p>
                {hwStats && hwStats.done + hwStats.notDone > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">{hwStats.done}✓ {hwStats.notDone}✗</p>
                )}
              </div>

              {/* Avg Engagement */}
              <div className={`rounded-xl p-3 text-center ${avgEngScore === null ? "bg-gray-50" : avgEngScore >= 7 ? "bg-blue-50" : avgEngScore >= 5 ? "bg-yellow-50" : "bg-red-50"}`}>
                <p className={`text-xl font-bold ${avgEngScore === null ? "text-gray-300" : avgEngScore >= 7 ? "text-blue-700" : avgEngScore >= 5 ? "text-yellow-600" : "text-red-600"}`}>
                  {avgEngScore !== null ? `${avgEngScore}` : "—"}
                </p>
                <p className="text-xs font-medium text-gray-500 mt-0.5">Avg Fokus</p>
                {engSessions.length > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">{engSessions.length} sesi</p>
                )}
              </div>

              {/* Rapor */}
              <div className={`rounded-xl p-3 text-center ${!avgGradeStr ? "bg-gray-50" : "bg-indigo-50"}`}>
                <p className={`text-xl font-bold ${!avgGradeStr ? "text-gray-300" : "text-indigo-700"}`}>
                  {avgGradeStr ?? "—"}
                </p>
                <p className="text-xs font-medium text-gray-500 mt-0.5">Nilai Rapor</p>
                {latestRapor && (
                  <p className="text-xs text-gray-400 mt-0.5">{semesterLabel(latestRapor.semester)}</p>
                )}
              </div>
            </div>

            {interpretation && (
              <div className={`rounded-xl p-3 bg-gray-50 border border-gray-100`}>
                <p className={`text-xs font-semibold ${interpretation.color}`}>{interpretation.text}</p>
              </div>
            )}

            {hwStats && hwStats.total > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full bg-green-400 rounded-full transition-all"
                    style={{ width: `${hwStats.total > 0 ? (hwStats.done / hwStats.total) * 100 : 0}%` }} />
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {hwStats.done}/{hwStats.total} PR selesai
                </span>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── RIWAYAT SESI ── */}
      <div>
        <div className="flex items-center justify-between mb-2 gap-2">
          <h2 className="text-lg font-semibold">Riwayat Sesi</h2>
          <div className="flex items-center gap-2">
            {settings?.ai?.enabled && settings.ai.apiKey && (allSessions ?? []).filter(s => s.status === "DONE").length > 0 && (
              <button
                disabled={aiInsightLoading}
                onClick={async () => {
                  setAiInsightLoading(true); setAiInsightError(""); setAiInsight(null);
                  try {
                    const doneSessions = (allSessions ?? [])
                      .filter(s => s.status === "DONE")
                      .slice(-20)
                      .map(s => ({
                        date: s.date,
                        subjects: s.subjects ?? [],
                        shortNote: s.shortNote,
                        needsWork: s.needsWork,
                        mood: s.mood,
                        predictedGrade: s.predictedGrade,
                      }));
                    const res = await analyzeStudent({
                      student: { name: student?.name ?? "", level: student?.level ?? "" },
                      sessions: doneSessions,
                    });
                    setAiInsight(res);
                  } catch (e) { setAiInsightError((e as Error).message); }
                  finally { setAiInsightLoading(false); }
                }}
                className="flex items-center gap-1 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap">
                {aiInsightLoading ? "⏳..." : "✨ Analisis AI"}
              </button>
            )}
            <select
              className="input py-1 text-xs w-auto"
              value={historyMonth}
              onChange={(e) => { setHistoryMonth(e.target.value); setHistoryPage(1); }}
            >
              <option value="">Semua bulan</option>
              {historyMonthOptions.map((m) => (
                <option key={m} value={m}>{monthLabel(m)}</option>
              ))}
            </select>
          </div>
        </div>
        {aiInsightError && (
          <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-2">{aiInsightError}</p>
        )}
        {aiInsight && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 mb-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-indigo-700 uppercase tracking-wide">✨ Analisis AI</p>
              <button onClick={() => setAiInsight(null)} className="text-indigo-300 hover:text-indigo-600 text-xs">✕</button>
            </div>
            <div className="space-y-1">
              {aiInsight.patterns.map((p, i) => (
                <p key={i} className="text-xs text-gray-700 flex gap-2"><span className="text-indigo-400 flex-shrink-0">•</span>{p}</p>
              ))}
            </div>
            <div className="bg-white rounded-xl px-3 py-2 border border-indigo-100">
              <p className="text-xs font-semibold text-indigo-600 mb-0.5">Fokus sesi berikutnya</p>
              <p className="text-sm text-gray-800">{aiInsight.nextFocus}</p>
            </div>
            <p className="text-xs text-gray-500 italic">{aiInsight.encouragement}</p>
          </div>
        )}
        {historySessions.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-2xl border border-gray-100">
            <p className="text-3xl mb-2">📚</p>
            <p className="text-gray-400 text-sm">Belum ada sesi yang dicatat.</p>
            <button onClick={() => navigate("/capture")}
              className="mt-3 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold">
              Catat Sesi Pertama
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {paginatedHistorySessions.map((s) => {
              const eng      = s.engagement;
              const photoUrl = photoUrls.get(s.id);
              const sigUrl   = sigUrls.get(s.id);
              return (
                <div key={s.id} className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 cursor-pointer active:bg-gray-50"
                  onClick={() => setDetailSession(s)}>
                  <div className="flex items-start gap-2">
                    {(photoUrl || sigUrl) && (
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        {photoUrl && (
                          <img src={photoUrl} alt="foto sesi" className="w-12 h-12 rounded-lg object-cover" />
                        )}
                        {sigUrl && (
                          <div className="w-12 h-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center overflow-hidden">
                            <img src={sigUrl} alt="TTD" className="max-w-full max-h-full object-contain" />
                          </div>
                        )}
                      </div>
                    )}
                    <div className="min-w-0 flex-1 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-800">
                        {(s.subjects ?? []).join(", ") || "Sesi umum"}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {dayLabel(s.date).split(",")[1]?.trim() ?? s.date.slice(5)}
                        {s.timeIn && s.timeOut
                          ? ` · ${s.timeIn}–${s.timeOut}`
                          : s.time ? ` · ${s.time}` : ""}
                        {` · ${s.durationHours}j`}
                        {s.mood ? ` · ${s.mood}` : ""}
                      </p>
                      {s.shortNote && <p className="text-xs text-gray-500 mt-1 italic">"{s.shortNote}"</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <div className="flex items-center gap-1">
                        {s.status === "DONE" && (
                          <button onClick={() => openEditNote(s)}
                            className="text-gray-300 hover:text-blue-500 transition-colors text-xs px-1">✏️</button>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.status === "DONE" ? "bg-green-50 text-green-600" : s.status === "CANCELLED" ? "bg-red-50 text-red-500" : "bg-blue-50 text-blue-600"}`}>
                          {s.status === "DONE" ? `${s.durationHours}j` : s.status}
                        </span>
                      </div>
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
                </div>
              );
            })}
            <PaginationControls
              page={safeHistoryPage}
              total={historySessions.length}
              onPageChange={setHistoryPage}
              label="sesi"
            />
          </div>
        )}
      </div>

      {/* ── JADWAL MENDATANG ── */}
      {(() => {
        const availMonths = [...new Set((upcomingSched ?? []).map((s) => s.date.slice(0, 7)))].sort();
        const filteredList = schedMonth
          ? (upcomingSched ?? []).filter((s) => s.date.startsWith(schedMonth))
          : upcomingList;
        const safeFilteredPage = clampPage(upcomingPage, filteredList.length);
        const paginatedFiltered = paginateItems(filteredList, safeFilteredPage);
        return (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">Jadwal Mendatang</h2>
              <span className="text-xs text-gray-400 font-medium">{(upcomingSched ?? []).length} jadwal</span>
            </div>

            {/* Month filter */}
            {availMonths.length > 1 && (
              <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                <button
                  className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${schedMonth === "" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200"}`}
                  onClick={() => setSchedMonth("")}>Semua</button>
                {availMonths.map((m) => {
                  const label = new Date(m + "-01T00:00:00").toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
                  return (
                    <button key={m}
                      className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${schedMonth === m ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200"}`}
                      onClick={() => { setSchedMonth(m); setUpcomingPage(1); }}>
                      {label}
                    </button>
                  );
                })}
              </div>
            )}

            {filteredList.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-6 text-center">
                <p className="text-2xl mb-1">📅</p>
                <p className="text-sm text-gray-400">{schedMonth ? "Tidak ada jadwal di bulan ini" : "Belum ada jadwal mendatang"}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {paginatedFiltered.map((s) => (
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
                <PaginationControls
                  page={safeFilteredPage}
                  total={filteredList.length}
                  onPageChange={setUpcomingPage}
                  label="jadwal"
                />
              </div>
            )}
          </div>
        );
      })()}

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
            {paginatedRaporCorrelation.map((r) => (
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
            <PaginationControls
              page={safeRaporPage}
              total={raporCorrelation.length}
              onPageChange={setRaporPage}
              label="rapor"
            />
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
                {paginatedSubjectEngStats.map((stat) => {
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
              <PaginationControls
                page={safeSubjectPage}
                total={subjectEngStats.length}
                onPageChange={setSubjectPage}
                label="mapel"
              />
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

      {/* ── EDIT SESSION NOTES MODAL ── */}
      {editSession && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-end justify-center" onClick={() => setEditSession(null)}>
          <div className="bg-white w-full max-w-md rounded-t-2xl pb-8 max-h-[80vh] overflow-y-auto overflow-x-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-base">Edit Catatan Sesi</h3>
                <p className="text-xs text-gray-400 mt-0.5">{editSession.date} · {editSession.durationHours}j</p>
              </div>
              <button onClick={() => setEditSession(null)} className="text-gray-400 text-xl">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label">Catatan Singkat</label>
                <textarea className="input" rows={3} value={editShortNote}
                  onChange={(e) => setEditShortNote(e.target.value)}
                  placeholder="Apa yang dibahas hari ini?" />
              </div>
              <div>
                <label className="label">Topik Spesifik</label>
                <input className="input" value={editTopic}
                  onChange={(e) => setEditTopic(e.target.value)}
                  placeholder="Mis. Quadratic Functions, Essay Structure..." />
              </div>
              <div>
                <label className="label">Perlu Diulang / Follow-up</label>
                <input className="input" value={editNeedsWork}
                  onChange={(e) => setEditNeedsWork(e.target.value)}
                  placeholder="Hal yang perlu dikerjakan di sesi berikutnya..." />
              </div>

              {/* Tanda Tangan Murid */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="label !mb-0">✍️ Tanda Tangan Murid</label>
                  {editSigUrl && (
                    <button type="button" onClick={() => { setEditSignature(undefined); setShowEditSigPad(false); }}
                      className="text-xs text-red-400 hover:text-red-600">Hapus</button>
                  )}
                </div>
                {showEditSigPad ? (
                  <div className="space-y-2">
                    <SignaturePad
                      onSave={(blob) => { setEditSignature(blob); setShowEditSigPad(false); }}
                      onClear={() => setEditSignature(undefined)}
                    />
                    <button type="button" onClick={() => setShowEditSigPad(false)}
                      className="text-xs text-gray-400 w-full text-center">Tutup</button>
                  </div>
                ) : editSigUrl ? (
                  <div className="border border-gray-200 rounded-xl p-2 bg-gray-50 flex items-center gap-3">
                    <img src={editSigUrl} alt="TTD" className="h-12 max-w-[120px] object-contain" />
                    <button type="button" onClick={() => setShowEditSigPad(true)}
                      className="text-xs text-blue-500 hover:underline">Ganti</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setShowEditSigPad(true)}
                    className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-blue-300 hover:text-blue-400 transition-colors">
                    + Minta tanda tangan murid
                  </button>
                )}
              </div>

              <button onClick={handleSaveNote} disabled={editNoteSaving}
                className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {editNoteSaving ? "Menyimpan..." : "Simpan Catatan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RAPOR INPUT MODAL ── */}
      {showRapor && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-end justify-center" onClick={() => setShowRapor(false)}>
          <div className="bg-white w-full max-w-md rounded-t-2xl pb-8 max-h-[90vh] overflow-y-auto overflow-x-hidden" onClick={(e) => e.stopPropagation()}>
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
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-end justify-center" onClick={() => setEditTarget(null)}>
          <div className="bg-white w-full max-w-md rounded-t-2xl pb-8 max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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
                <ClockTimePicker value={editTime} onChange={setEditTime} />
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

      {/* ── BILLING WA BOTTOM SHEET ── */}
      {showBilling && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-end justify-center" onClick={() => setShowBilling(false)}>
          <div className="bg-white w-full max-w-md rounded-t-2xl max-h-[85vh] overflow-y-auto overflow-x-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-lg">💬 Tagihan via WA</h3>
                <p className="text-xs text-gray-400 mt-0.5">{student.name}</p>
              </div>
              <button onClick={() => setShowBilling(false)} className="text-gray-400 text-xl">✕</button>
            </div>

            {!billingUnlocked && settings?.financialPin ? (
              <div className="p-5 space-y-4">
                <p className="text-sm text-gray-600">Masukkan PIN untuk melihat tagihan</p>
                <input
                  type="password" inputMode="numeric" maxLength={6} placeholder="PIN"
                  value={billingPinInput}
                  onChange={(e) => { setBillingPinInput(e.target.value); setBillingPinError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleUnlockBilling()}
                  className="input text-center tracking-widest text-lg w-full"
                  autoFocus
                />
                {billingPinError && <p className="text-xs text-red-500">{billingPinError}</p>}
                <button onClick={handleUnlockBilling}
                  className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold">
                  Buka
                </button>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                {/* Pilih bulan */}
                <div>
                  <label className="label">Bulan Tagihan</label>
                  <input className="input" type="month" value={billingMonth}
                    onChange={(e) => setBillingMonth(e.target.value)} />
                </div>

                {/* Summary */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-blue-50 rounded-xl py-2">
                    <p className="text-lg font-bold text-blue-700">{buildBillingWA.count}</p>
                    <p className="text-xs text-blue-500">Sesi</p>
                  </div>
                  <div className="bg-indigo-50 rounded-xl py-2">
                    <p className="text-lg font-bold text-indigo-700">{buildBillingWA.totalHours}j</p>
                    <p className="text-xs text-indigo-500">Jam</p>
                  </div>
                  <div className="bg-green-50 rounded-xl py-2">
                    <p className="text-base font-bold text-green-700">{formatRupiah(buildBillingWA.totalCost)}</p>
                    <p className="text-xs text-green-500">Total</p>
                  </div>
                </div>

                {/* Preview pesan */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Preview Pesan WA</p>
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed font-sans">
                      {buildBillingWA.text}
                    </pre>
                  </div>
                </div>

                {/* Tombol kirim */}
                {buildBillingWA.count === 0 ? (
                  <p className="text-sm text-center text-gray-400 py-2">Belum ada sesi selesai di bulan ini.</p>
                ) : (
                  <div className="space-y-2">
                    {student.parentContact.phone && (
                      <a
                        href={`https://wa.me/${student.parentContact.phone.replace(/^0/,"62").replace(/[^0-9]/g,"")}?text=${encodeURIComponent(buildBillingWA.text)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-green-500 text-white font-semibold text-sm hover:bg-green-600 transition-colors">
                        <span className="text-lg">💬</span> Kirim ke {student.parentContact.name || "Orang Tua"}
                      </a>
                    )}
                    <button
                      onClick={() => navigator.clipboard?.writeText(buildBillingWA.text).then(() => msg("Pesan disalin ✓"))}
                      className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors">
                      📋 Salin Pesan
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {/* ── SESSION DETAIL MODAL ── */}
      {detailSession && (() => {
        const s = detailSession;
        const photoUrl = photoUrls.get(s.id);
        const sigUrl   = sigUrls.get(s.id);
        const eng      = s.engagement;
        return (
          <div className="fixed inset-0 bg-black/50 z-[70] flex items-end justify-center" onClick={() => { setDetailSession(null); setShowDeletePin(false); setDeletePinInput(""); setDeletePinError(""); }}>
            <div className="bg-white w-full max-w-md rounded-t-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div>
                  <h3 className="font-bold text-base">{(s.subjects ?? []).join(", ") || "Sesi umum"}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{dayLabel(s.date)}</p>
                </div>
                <button onClick={() => setDetailSession(null)} className="text-gray-400 text-xl">✕</button>
              </div>

              <div className="p-5 space-y-4">
                {/* Waktu & durasi */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-xl p-3">
                    <p className="text-xs text-blue-500 font-medium">Waktu</p>
                    <p className="text-sm font-bold text-blue-800 mt-0.5">
                      {s.timeIn && s.timeOut ? `${s.timeIn} � ${s.timeOut}` : s.time ?? "�"}
                    </p>
                  </div>
                  <div className="bg-indigo-50 rounded-xl p-3">
                    <p className="text-xs text-indigo-500 font-medium">Durasi</p>
                    <p className="text-sm font-bold text-indigo-800 mt-0.5">{s.durationHours} jam</p>
                  </div>
                </div>

                {/* Status + mood */}
                <div className="flex gap-2 flex-wrap">
                  <span className={`text-xs px-3 py-1 rounded-full font-semibold ${s.status === "DONE" ? "bg-green-50 text-green-600" : s.status === "CANCELLED" ? "bg-red-50 text-red-500" : "bg-blue-50 text-blue-600"}`}>
                    {s.status === "DONE" ? "✓ Selesai" : s.status === "CANCELLED" ? "✗ Dibatalkan" : "Terjadwal"}
                  </span>
                  {s.mood && <span className="text-xs px-3 py-1 rounded-full bg-orange-50 text-orange-600 font-medium">Mood: {s.mood}</span>}
                  {eng && <span className="text-xs px-3 py-1 rounded-full bg-purple-50 text-purple-600 font-semibold">Engagement {eng.score}/10</span>}
                </div>

                {/* Catatan */}
                {s.shortNote && (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 font-medium mb-1">Catatan</p>
                    <p className="text-sm text-gray-700 italic">"{s.shortNote}"</p>
                  </div>
                )}

                {/* Topik */}
                {s.topic && (
                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-1">Topik</p>
                    <p className="text-sm text-gray-700">{s.topic}</p>
                  </div>
                )}

                {/* Biaya */}
                {s.cost > 0 && (
                  <div className="bg-green-50 rounded-xl p-3">
                    <p className="text-xs text-green-500 font-medium">Biaya Sesi</p>
                    <p className="text-sm font-bold text-green-800 mt-0.5">{formatRupiah(s.cost)}</p>
                  </div>
                )}

                {/* Engagement detail */}
                {eng && (
                  <div className="bg-purple-50 rounded-xl p-3 space-y-1">
                    <p className="text-xs text-purple-500 font-medium">Detail Engagement</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {eng.prepared && <span className="text-xs px-2 py-0.5 rounded-full bg-white text-green-600">✓ Siap belajar</span>}
                      {eng.focused && <span className="text-xs px-2 py-0.5 rounded-full bg-white text-green-600">✓ Fokus</span>}
                      {eng.activeAsking && <span className="text-xs px-2 py-0.5 rounded-full bg-white text-green-600">✓ Aktif bertanya</span>}
                      {eng.quickLearner && <span className="text-xs px-2 py-0.5 rounded-full bg-white text-green-600">✓ Cepat paham</span>}
                      {eng.playingPhone && <span className="text-xs px-2 py-0.5 rounded-full bg-white text-orange-500">📱 Main HP</span>}
                      {eng.drowsy && <span className="text-xs px-2 py-0.5 rounded-full bg-white text-blue-400">😴 Ngantuk</span>}
                      {eng.needsRepetition && <span className="text-xs px-2 py-0.5 rounded-full bg-white text-yellow-600">↩ Perlu diulang</span>}
                      {eng.hwMissed && <span className="text-xs px-2 py-0.5 rounded-full bg-white text-red-500">✗ PR tidak dikerjakan</span>}
                    </div>
                  </div>
                )}

                {/* Foto */}
                {photoUrl && (
                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-1">Foto Sesi</p>
                    <img src={photoUrl} alt="foto sesi" className="w-full max-h-48 object-cover rounded-xl" />
                  </div>
                )}

                {/* Tanda tangan */}
                {sigUrl && (
                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-1">Tanda Tangan Murid</p>
                    <div className="border border-gray-200 rounded-xl bg-gray-50 p-3 flex items-center justify-center">
                      <img src={sigUrl} alt="TTD murid" className="max-h-20 object-contain" />
                    </div>
                  </div>
                )}

                {/* Tombol edit catatan */}
                {s.status === "DONE" && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setDetailSession(null); openEditNote(s); }}
                    className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors">
                    ✏️ Edit Catatan Sesi
                  </button>
                )}

                {/* Hapus sesi (PIN protected) */}
                {!showDeletePin ? (
                  <button
                    onClick={() => setShowDeletePin(true)}
                    className="w-full py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors">
                    🗑️ Hapus Sesi
                  </button>
                ) : (
                  <div className="space-y-2 border border-red-200 rounded-xl p-3 bg-red-50">
                    <p className="text-xs text-red-600 font-semibold">Hapus sesi ini? Tidak bisa dibatalkan.</p>
                    {settings?.financialPin && (
                      <>
                        <input
                          type="password" inputMode="numeric" maxLength={6} placeholder="PIN"
                          value={deletePinInput}
                          onChange={(e) => { setDeletePinInput(e.target.value); setDeletePinError(""); }}
                          onKeyDown={(e) => e.key === "Enter" && handleDeleteSession()}
                          className="input text-center tracking-widest text-base w-full"
                          autoFocus
                        />
                        {deletePinError && <p className="text-xs text-red-500">{deletePinError}</p>}
                      </>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => { setShowDeletePin(false); setDeletePinInput(""); setDeletePinError(""); }}
                        className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold">
                        Batal
                      </button>
                      <button onClick={handleDeleteSession}
                        className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold">
                        Hapus
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

