import Skeleton from "../components/Skeleton";
import { useState, useMemo, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  listStudents, getStudent, getSettings,
  listSessionsByStudentMonth,
  getReport, upsertReport, updateSession, saveSettings,
} from "../db/repos";
import { pickTemplate } from "../lib/rotation";
import { generateReportSummary, generateNarratives, estimateReportSummaryCost, estimateNarrativesCost } from "../lib/aiClient";
import { BEHAVIOR_TAGS, RESPONSE_TAGS } from "../lib/responseTaxonomy";
import { AiCostModal } from "../components/AiCostModal";
import { getTheme, THEMES } from "../template/themes";
import { LAYOUTS } from "../template/layouts";
import { ReportRenderer } from "../template/ReportRenderer";
import { dayLabel, monthLabel, todayWIB, monthOf } from "../lib/format";
import { exportJpeg, exportPng, exportPdf, shareFiles } from "../lib/exportReport";
import { blobToDataUrl, blobToNormalizedDataUrl } from "../lib/imageUtils";
import PaginationControls from "../components/PaginationControls";
import Breadcrumb from "../components/Breadcrumb";
import { clampPage, paginateItems } from "../lib/pagination";
import { calcEngagementScore, scoreLabel } from "../lib/engagement";
import type {
  ReportOptions, CustomTheme, Theme,
  HeaderStyle, LabelStyle, PhotoStyle, DecoKind,
} from "../template/types";
import type { NextMonthPlan, MonthlyPlanItem, PlanOwner, PlanStatus, Session } from "../db/types";

const EMPTY_SUBJECT_LABEL = "Mapel belum diisi";
const PLAN_OWNERS: Array<{ value: PlanOwner; label: string }> = [
  { value: "shared", label: "Bersama" },
  { value: "tutor", label: "Tutor" },
  { value: "student", label: "Murid" },
  { value: "parent", label: "Orang tua" },
];
const PLAN_STATUSES: Array<{ value: PlanStatus; label: string }> = [
  { value: "planned", label: "Belum dimulai" },
  { value: "in_progress", label: "Berjalan" },
  { value: "achieved", label: "Tercapai" },
];

function newPlanItem(): MonthlyPlanItem {
  return {
    id: crypto.randomUUID(),
    subject: "",
    target: "",
    owner: "shared",
    status: "planned",
  };
}

function createEmptyPlan(): NextMonthPlan {
  return { priorities: [newPlanItem()], parentSupport: "" };
}

function normaliseAiPlan(plan?: {
  priorities?: Array<Partial<Omit<MonthlyPlanItem, "id">>>;
  parentSupport?: string;
}): NextMonthPlan | undefined {
  const priorities = (plan?.priorities ?? [])
    .filter((item) => item.target?.trim())
    .slice(0, 3)
    .map((item) => ({
      id: crypto.randomUUID(),
      subject: item.subject?.trim() || EMPTY_SUBJECT_LABEL,
      evidence: item.evidence?.trim(),
      target: item.target!.trim(),
      tutorAction: item.tutorAction?.trim(),
      successMetric: item.successMetric?.trim(),
      cadence: item.cadence?.trim(),
      owner: PLAN_OWNERS.some((owner) => owner.value === item.owner) ? item.owner : "shared",
      status: "planned" as const,
    }));
  if (priorities.length === 0) return undefined;
  return { priorities, parentSupport: plan?.parentSupport?.trim(), updatedAt: new Date().toISOString() };
}

function cleanText(value?: string): string {
  return value?.trim() ?? "";
}

function formatHours(hours: number): string {
  const normalized = Number.isInteger(hours) ? String(hours) : String(hours).replace(".", ",");
  return `${normalized} jam`;
}

function sessionSubjectLabel(subjects: string[]): string {
  const cleanSubjects = subjects.map((subject) => subject.trim()).filter(Boolean);
  return cleanSubjects.length > 0 ? cleanSubjects.join(", ") : EMPTY_SUBJECT_LABEL;
}

function sessionTimeLabel(session: Session): string | undefined {
  if (session.timeIn && session.timeOut) return `${session.timeIn}-${session.timeOut}`;
  if (session.time) return `Jam ${session.time}`;
  return undefined;
}

function buildSessionDetails(session: Session): string[] {
  return [
    sessionTimeLabel(session),
    formatHours(session.durationHours),
    cleanText(session.topic) ? `Topik: ${cleanText(session.topic)}` : undefined,
    cleanText(session.needsWork) ? `Perlu perhatian: ${cleanText(session.needsWork)}` : undefined,
    cleanText(session.predictedGrade) ? `Prediksi: ${cleanText(session.predictedGrade)}` : undefined,
    cleanText(session.mood) ? `Mood: ${cleanText(session.mood)}` : undefined,
  ].filter((detail): detail is string => Boolean(detail));
}

function buildSessionNarrative(session: Session, subject: string): string {
  const baseNote = cleanText(session.narrative) || cleanText(session.shortNote);
  const extraNotes = [
    cleanText(session.topic) ? `Topik yang dibahas: ${cleanText(session.topic)}.` : undefined,
    cleanText(session.needsWork) ? `Area perhatian: ${cleanText(session.needsWork)}.` : undefined,
    cleanText(session.predictedGrade) ? `Prediksi nilai: ${cleanText(session.predictedGrade)}.` : undefined,
  ].filter((note): note is string => Boolean(note));

  if (baseNote && extraNotes.length > 0) return `${baseNote} ${extraNotes.join(" ")}`;
  if (baseNote) return baseNote;
  if (extraNotes.length > 0) return extraNotes.join(" ");
  // Fallback netral — teks ini ikut tercetak di laporan orang tua, jangan berisi instruksi untuk tutor
  return `Sesi ${subject} berlangsung selama ${formatHours(session.durationHours)}.`;
}

/**
 * MonthlyReportPage — halaman pembuatan laporan bulanan.
 * 20+ tema × 27 layout, AI narrative generation, export ke JPG/PNG/PDF,
 * pagination, dan template rotation logic.
 *
 * @component
 * @route /report/:studentId/:month
 */
export default function MonthlyReportPage() {
  const [searchParams] = useSearchParams();
  const students = useLiveQuery(() => listStudents(true), []);
  const settings = useLiveQuery(() => getSettings(), []);

  const [studentId, setStudentId] = useState(searchParams.get("studentId") ?? "");
  const [month, setMonth] = useState(() => monthOf(todayWIB()));

  const [editingNarrative, setEditingNarrative] = useState<string | null>(null);
  const [editText,         setEditText]         = useState("");
  const [editingSummary,   setEditingSummary]   = useState(false);
  const [summaryText,      setSummaryText]      = useState("");
  const [editingTeacherNote, setEditingTeacherNote] = useState(false);
  const [teacherNoteText,    setTeacherNoteText]    = useState("");
  const [editingQuote,     setEditingQuote]     = useState(false);
  const [showPolishModal,  setShowPolishModal]  = useState(false);
  const [showNarrativesModal, setShowNarrativesModal] = useState(false);
  const [prevTexts,        setPrevTexts]        = useState<{
    summaryText: string;
    teacherNote?: string;
    quote?: string;
    nextMonthPlan?: NextMonthPlan;
    /** Narasi per sesi sebelum ditimpa AI — untuk Undo penuh. */
    narratives?: Array<{ id: string; narrative?: string }>;
  } | null>(null);
  const [quoteText,        setQuoteText]        = useState("");
  const [aiLoading,        setAiLoading]        = useState(false);
  const [message,          setMessage]          = useState("");
  const [exporting,        setExporting]        = useState<"jpg" | "png" | "pdf" | null>(null);
  const reportExportRef = useRef<HTMLDivElement>(null);
  const [openNarasi,       setOpenNarasi]       = useState(false);
  const [openTeks,         setOpenTeks]         = useState(false);
  const [openPlan,         setOpenPlan]         = useState(false);
  const [editingPlan,      setEditingPlan]      = useState(false);
  const [narrativePage,    setNarrativePage]    = useState(1);
  const [subjectFilter,    setSubjectFilter]    = useState<string>("");

  const student  = useLiveQuery(() => (studentId ? getStudent(studentId) : undefined), [studentId]);
  const sessions = useLiveQuery(() => (studentId ? listSessionsByStudentMonth(studentId, month) : []), [studentId, month]);
  const report   = useLiveQuery(() => (studentId ? getReport(studentId, month) : undefined), [studentId, month]);

  const totalHours = useMemo(() => sessions?.reduce((s, x) => s + x.durationHours, 0) ?? 0, [sessions]);
  const totalCost  = useMemo(() => sessions?.reduce((s, x) => s + x.cost, 0) ?? 0, [sessions]);
  const reportSessions         = useMemo(() => sessions ?? [], [sessions]);
  const uniqueSubjects         = useMemo(() => {
    const set = new Set<string>();
    (sessions ?? []).forEach((s) => s.subjects.forEach((subj) => { if (subj.trim()) set.add(subj.trim()); }));
    return [...set].sort();
  }, [sessions]);
  const filteredSessions = useMemo(() =>
    subjectFilter ? reportSessions.filter((s) => s.subjects.some((subj) => subj.trim() === subjectFilter)) : reportSessions,
  [reportSessions, subjectFilter]);
  const sessionsWithNarrative  = filteredSessions.filter((s) => Boolean(s.narrative?.trim())).length;
  const engagementScores = useMemo(() => reportSessions
    .map((s) => s.engagement?.score ?? (s.engagement ? calcEngagementScore(s.engagement) : undefined))
    .filter((score): score is number => score != null), [reportSessions]);
  const avgEngagement = useMemo(() => engagementScores.length > 0
    ? Math.round(engagementScores.reduce((sum, score) => sum + score, 0) / engagementScores.length)
    : undefined, [engagementScores]);
  const engagementTrend = useMemo(() => {
    if (engagementScores.length < 2) return undefined;
    const split = Math.ceil(engagementScores.length / 2);
    const start = engagementScores.slice(0, split);
    const end = engagementScores.slice(split);
    const startAvg = start.reduce((sum, score) => sum + score, 0) / start.length;
    const endAvg = end.reduce((sum, score) => sum + score, 0) / end.length;
    if (endAvg - startAvg >= 1) return "Meningkat";
    if (startAvg - endAvg >= 1) return "Perlu perhatian";
    return "Stabil";
  }, [engagementScores]);
  const hasPlan = Boolean(report?.nextMonthPlan?.priorities.some((item) => item.target.trim()));
  const reportReadinessItems = [
    { label: "Narasi sesi", complete: reportSessions.length > 0 && sessionsWithNarrative === reportSessions.length },
    { label: "Ringkasan", complete: Boolean(report?.summaryText.trim()) },
    { label: "Catatan guru", complete: Boolean(report?.teacherNote?.trim()) },
    { label: "Rencana depan", complete: hasPlan },
  ];
  const reportReadiness = reportReadinessItems.filter((item) => item.complete).length;
  const reportReadinessPercent = Math.round((reportReadiness / reportReadinessItems.length) * 100);

  // Clear stale message when student or month changes
  useEffect(() => { setMessage(""); setPrevTexts(null); }, [studentId, month]);

  // Resolve theme: built-in or custom
  const theme: Theme = useMemo(() => {
    if (!report) return THEMES[0];
    const customThemes = settings?.templatePref?.customThemes ?? [];
    const custom = customThemes.find((ct) => ct.id === report.templateKey.themeId);
    if (custom) return custom as Theme;
    return getTheme(report.templateKey.themeId);
  }, [report, settings]);

  const allThemes = useMemo(() => {
    const customThemes = (settings?.templatePref?.customThemes ?? []) as Theme[];
    const excluded = settings?.templatePref?.excludedThemeIds ?? [];
    return [...THEMES.filter((t) => !excluded.includes(t.id)), ...customThemes];
  }, [settings]);

  // Per-session signature data URLs
  const [sessionSigUrls, setSessionSigUrls] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    const list = sessions ?? [];
    const withSig = list.filter((s) => s.signature);
    if (withSig.length === 0) { setSessionSigUrls(new Map()); return; }
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        withSig.map(async (s) => [s.id, await blobToDataUrl(s.signature!)] as const)
      );
      if (!cancelled) setSessionSigUrls(new Map(entries));
    })();
    return () => { cancelled = true; };
  }, [sessions]);

  // ── Undo stack for theme/layout changes ─────────────────────────────
  const [undoStack, setUndoStack] = useState<Array<{ themeId: string; layoutId: string }>>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [compareThemeId, setCompareThemeId] = useState<string | null>(null);
  const [coverPage, setCoverPage] = useState(false);
  const [showCustomBuilder, setShowCustomBuilder] = useState(false);

  const reportOptions: ReportOptions = { coverPage, showEngagement: true };

  // ReportData — async photo normalization + engagement
  const [reportData, setReportData] = useState<import("../template/types").ReportData | null>(null);

  useEffect(() => {
    if (!student || !sessions) { setReportData(null); return; }
    let cancelled = false;
    (async () => {
      const logoUrl = settings?.logo ? await blobToDataUrl(settings.logo) : undefined;
      // KRONOLOGIS (awal→akhir bulan): orang tua membaca laporan sebagai cerita perkembangan.
      // Semua visual tren (sparkline, growth, compare) mengandalkan urutan ini.
      const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
      const entries = await Promise.all(
        sorted.map(async (s) => {
          const engScore = s.engagement?.score ?? (s.engagement ? calcEngagementScore(s.engagement) : undefined);
          const engLabel = engScore != null ? scoreLabel(engScore).text : undefined;
          const subject = sessionSubjectLabel(s.subjects);
          const details = buildSessionDetails(s);
          return {
            date: dayLabel(s.date).split(",")[1]?.trim() ?? s.date.slice(5),
            subject,
            photoUrl: s.photo ? await blobToNormalizedDataUrl(s.photo) : undefined,
            narrative: buildSessionNarrative(s, subject),
            details,
            engagementScore: engScore,
            engagementLabel: engLabel,
          };
        })
      );
      const scores = entries.filter((e) => e.engagementScore != null).map((e) => e.engagementScore!);
      const avgEngagement = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : undefined;
      const photoUrls = entries.filter((e) => e.photoUrl).map((e) => e.photoUrl!);
      // Agregat sebulan penuh untuk layout infografis (akurat lintas halaman).
      const distMap = new Map<string, number>();
      sessions.forEach((s) => s.subjects.map((x) => x.trim()).filter(Boolean)
        .forEach((sub) => distMap.set(sub, (distMap.get(sub) ?? 0) + 1)));
      const subjectDist = [...distMap.entries()]
        .map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
      if (cancelled) return;
      setReportData({
        studentName: student.name,
        period: monthLabel(month),
        tutorName: settings?.tutorProfile?.name ?? "",
        logoUrl,
        entries,
        summary: report?.summaryText ?? "",
        teacherNote: report?.teacherNote,
        quote: report?.quote,
        nextMonthPlan: report?.nextMonthPlan,
        avgEngagement,
        photoUrls,
        totalHours,
        totalSessions: entries.length,
        subjectDist,
        // entries sudah kronologis → seri fokus langsung searah waktu
        engagementSeries: scores,
      });
    })();
    return () => { cancelled = true; };
  }, [student, sessions, month, report, settings, totalHours]);

  const safeNarrativePage      = clampPage(narrativePage, filteredSessions.length);
  const paginatedNarrativeSessions = paginateItems(filteredSessions, safeNarrativePage);

  const ensureReport = async () => {
    if (!studentId) return undefined;
    let current = await getReport(studentId, month);
    if (current) {
      const refreshed = { ...current, sessionIds: reportSessions.map((s) => s.id), totalHours, totalCost };
      await upsertReport(refreshed);
      return refreshed;
    }
    const templateKey = await pickTemplate(studentId);
    await upsertReport({
      id: crypto.randomUUID(), studentId, month,
      sessionIds: reportSessions.map((s) => s.id),
      templateKey, summaryText: "", totalHours, totalCost,
      createdAt: new Date().toISOString(),
    });
    current = await getReport(studentId, month);
    return current;
  };

  const handleCreateOrSwitch = async (newLayoutId?: string) => {
    if (!studentId || reportSessions.length === 0) return;
    try {
      const r = await getReport(studentId, month);
      if (!r) {
        const picked = await pickTemplate(studentId);
        const templateKey = newLayoutId ? { ...picked, layoutId: newLayoutId } : picked;
        await upsertReport({
          id: crypto.randomUUID(), studentId, month,
          sessionIds: reportSessions.map((s) => s.id),
          templateKey, summaryText: "", totalHours, totalCost,
          createdAt: new Date().toISOString(),
        });
        setMessage("Laporan dibuat!");
      } else if (newLayoutId) {
        await upsertReport({
          ...r,
          sessionIds: reportSessions.map((s) => s.id),
          totalHours, totalCost,
          templateKey: { themeId: r.templateKey.themeId, layoutId: newLayoutId },
        });
        setMessage("Layout diganti!");
      } else {
        await upsertReport({ ...r, sessionIds: reportSessions.map((s) => s.id), totalHours, totalCost });
        setMessage("Data laporan diperbarui ✓");
      }
    } catch (e) { setMessage("Error: " + (e as Error).message); }
  };

  const handleRegenerate = async () => {
    if (!report) return;
    setUndoStack((s) => [...s, { themeId: report.templateKey.themeId, layoutId: report.templateKey.layoutId }]);
    await upsertReport({ ...report, templateKey: await pickTemplate(studentId) });
    setMessage("Desain diganti!");
  };

  /** Payload sesi untuk AI — dipakai Poles AI (ringkasan) dan Narasi AI. */
  const buildAiInput = () => ({
    student: { name: student!.name, level: student!.level },
    month: monthLabel(month),
    sessions: (sessions ?? []).map((s) => ({
      id: s.id, date: dayLabel(s.date), subject: s.subjects.join(", "),
      shortNote: s.shortNote, mood: s.mood, topic: s.topic,
      needsWork: s.needsWork, predictedGrade: s.predictedGrade,
      engagementScore: s.engagement?.score,
      behaviorLabels: s.behaviorTags?.map(id => BEHAVIOR_TAGS.find(t => t.id === id)?.label).filter(Boolean) as string[] | undefined,
      responseLabel: s.responseTag ? RESPONSE_TAGS.find(t => t.id === s.responseTag)?.label : undefined,
    })),
  });

  const handlePolish = async () => {
    if (!student || !sessions?.length) return;
    if (!navigator.onLine) { setMessage("Offline."); return; }
    setAiLoading(true);
    try {
      const draft = await ensureReport();
      const out = await generateReportSummary(buildAiInput());
      if (draft) {
        const prev = { summaryText: draft.summaryText, quote: draft.quote };
        await upsertReport({ ...draft, summaryText: out.summary ?? "", quote: out.quote });
        setPrevTexts(prev);
      }
      setMessage("Poles AI selesai ✓ Ringkasan & kutipan terisi");
      setOpenTeks(true);
    } catch (e) { setMessage("Gagal: " + (e as Error).message); }
    finally { setAiLoading(false); }
  };

  /** Narasi AI penuh: perluas shortNote tiap sesi jadi narasi 40–60 kata,
   *  plus ringkasan, catatan guru, dan kutipan. Semua bisa di-Undo. */
  const handleGenerateNarratives = async () => {
    if (!student || !sessions?.length) return;
    if (!navigator.onLine) { setMessage("Offline."); return; }
    setAiLoading(true);
    try {
      const draft = await ensureReport();
      const out = await generateNarratives(buildAiInput());

      // Simpan versi lama SEBELUM menimpa — untuk Undo penuh
      const prevNarratives = sessions.map((s) => ({ id: s.id, narrative: s.narrative }));

      const validIds = new Set(sessions.map((s) => s.id));
      let applied = 0;
      for (const entry of out.entries ?? []) {
        if (validIds.has(entry.id) && entry.narrative?.trim()) {
          await updateSession(entry.id, { narrative: entry.narrative.trim() });
          applied++;
        }
      }
      if (draft) {
        setPrevTexts({
          summaryText: draft.summaryText, teacherNote: draft.teacherNote,
          quote: draft.quote, nextMonthPlan: draft.nextMonthPlan, narratives: prevNarratives,
        });
        const aiPlan = normaliseAiPlan(out.nextMonthPlan);
        await upsertReport({
          ...draft,
          summaryText: out.summary?.trim() || draft.summaryText,
          teacherNote: out.teacherNote?.trim() || draft.teacherNote,
          quote: out.quote?.trim() || draft.quote,
          nextMonthPlan: aiPlan ?? draft.nextMonthPlan,
        });
      }
      setMessage(`Narasi AI selesai ✓ ${applied} narasi sesi + ringkasan & kutipan terisi`);
      setOpenNarasi(true);
      setOpenPlan(true);
    } catch (e) { setMessage("Gagal: " + (e as Error).message); }
    finally { setAiLoading(false); }
  };

  const doExport = async (type: "jpg" | "png" | "pdf") => {
    if (!student || !report || !reportData || exporting) return;
    setExporting(type);
    setMessage("");
    const base = `Laporan-${student.name}-${monthLabel(month)}`.replace(/\s+/g, "-");
    const exportRoot = reportExportRef.current ?? document;
    try {
      if (type === "jpg") await shareFiles(await exportJpeg(base, exportRoot), base);
      else if (type === "png") await shareFiles(await exportPng(base, exportRoot), base);
      else await shareFiles([await exportPdf(base, exportRoot)], base);
      await upsertReport({ ...report, pdfGeneratedAt: new Date().toISOString() });
      setMessage(`✓ File ${type.toUpperCase()} diunduh`);
    } catch (e) {
      setMessage("Gagal ekspor: " + (e as Error).message);
    } finally {
      setExporting(null);
    }
  };

  const saveNarrative   = async (sid: string) => { await updateSession(sid, { narrative: editText }); setEditingNarrative(null); };
  const saveReportField = async (field: "summaryText" | "teacherNote" | "quote", value: string) => {
    if (!report) return;
    await upsertReport({ ...report, [field]: value });
    setEditingSummary(false); setEditingTeacherNote(false); setEditingQuote(false);
  };
  const saveNextMonthPlan = async (nextMonthPlan: NextMonthPlan) => {
    if (!report) return;
    await upsertReport({ ...report, nextMonthPlan: { ...nextMonthPlan, updatedAt: new Date().toISOString() } });
    setEditingPlan(false);
    setMessage("Rencana bulan depan disimpan ✓");
  };

  if (!students) return <Skeleton variant="card" lines={4} className="p-4" />;

  return (
    <div className="pb-20">
      <Breadcrumb />
      <div className="p-4 space-y-4">
        {message && (
          <div className="space-y-1.5">
            <div onClick={() => setMessage("")}
              className={`p-3 rounded-lg text-sm cursor-pointer ${message.includes("✓") ? "bg-green-50 text-green-700" : message.startsWith("Gagal") || message.startsWith("Error") ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}>
              {message}
            </div>
            {prevTexts && (
              <button
                onClick={async () => {
                  if (!report) return;
                  await upsertReport({
                    ...report,
                    summaryText: prevTexts.summaryText,
                    teacherNote: prevTexts.teacherNote,
                    quote: prevTexts.quote,
                    nextMonthPlan: prevTexts.nextMonthPlan,
                  });
                  // Kembalikan juga narasi per sesi bila Narasi AI yang menimpanya
                  for (const n of prevTexts.narratives ?? []) {
                    await updateSession(n.id, { narrative: n.narrative });
                  }
                  setPrevTexts(null);
                  setMessage("Undo berhasil ✓");
                }}
                className="w-full text-xs text-indigo-600 font-semibold bg-indigo-50 border border-indigo-200 rounded-lg py-2 hover:bg-indigo-100 transition-colors">
                ↩ Undo Hasil AI
              </button>
            )}
          </div>
        )}

        {/* ── LAPORAN MURID ── */}
        <div className="space-y-3">

            {/* CARD 1: Murid + Bulan + Stats + Actions */}
            <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Murid</label>
                  <select className="input" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                    <option value="">Pilih murid...</option>
                    {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Bulan</label>
                  <input className="input" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
                </div>
              </div>

              {uniqueSubjects.length > 1 && studentId && (
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setSubjectFilter("")}
                    className={`text-[11px] font-semibold rounded-full px-2.5 py-1 transition-colors ${!subjectFilter ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                    Semua
                  </button>
                  {uniqueSubjects.map((subj) => (
                    <button key={subj}
                      onClick={() => setSubjectFilter(subj === subjectFilter ? "" : subj)}
                      className={`text-[11px] font-semibold rounded-full px-2.5 py-1 transition-colors ${subj === subjectFilter ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                      {subj}
                    </button>
                  ))}
                </div>
              )}

              {!studentId && (
                <p className="text-sm text-gray-500 text-center py-1">Pilih murid untuk mulai menyusun laporan.</p>
              )}

              {studentId && sessions && sessions.length === 0 && (
                <div className="text-center py-2 space-y-2">
                  <p className="text-sm text-gray-500">Belum ada sesi di {monthLabel(month)}.</p>
                  <Link to="/capture" className="btn btn-primary w-full text-sm">Rekam Sesi Sekarang</Link>
                </div>
              )}

              {studentId && sessions && sessions.length > 0 && (
                <>
                  {/* Ringkasan yang langsung menjawab kondisi belajar bulan ini. */}
                  <div className="grid grid-cols-4 gap-1.5">
                    <div className="bg-blue-50 rounded-xl py-2 text-center">
                      <p className="text-lg font-bold text-blue-700">{sessions.length}</p>
                      <p className="text-[11px] text-blue-500">Sesi</p>
                    </div>
                    <div className="bg-indigo-50 rounded-xl py-2 text-center">
                      <p className="text-lg font-bold text-indigo-700">{totalHours}j</p>
                      <p className="text-[11px] text-indigo-500">Jam</p>
                    </div>
                    <div className="bg-purple-50 rounded-xl py-2 text-center">
                      <p className="text-lg font-bold text-purple-700">{avgEngagement != null ? `${avgEngagement}/10` : "—"}</p>
                      <p className="text-[11px] text-purple-500">Fokus rata²</p>
                    </div>
                    <div className={`rounded-xl py-2 text-center ${reportReadiness === 4 ? "bg-green-50" : "bg-amber-50"}`}>
                      <p className={`text-base font-bold leading-tight ${reportReadiness === 4 ? "text-green-700" : "text-amber-700"}`}>
                        {report ? `${reportReadiness}/4` : "—"}
                      </p>
                      <p className={`text-[11px] ${reportReadiness === 4 ? "text-green-500" : "text-amber-500"}`}>Siap kirim</p>
                    </div>
                  </div>
                  {engagementTrend && (
                    <p className={`text-xs rounded-lg px-2.5 py-2 ${engagementTrend === "Meningkat" ? "bg-green-50 text-green-700" : engagementTrend === "Perlu perhatian" ? "bg-amber-50 text-amber-700" : "bg-gray-50 text-gray-600"}`}>
                      Tren fokus: <strong>{engagementTrend}</strong> dibandingkan awal bulan.
                    </p>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <button className="btn btn-primary flex-1 text-sm" onClick={() => handleCreateOrSwitch()}>
                      {report ? "🔄 Update Laporan" : "📝 Buat Laporan"}
                    </button>
                  </div>
                  {settings?.ai?.enabled && settings.ai.apiKey && (
                    <div className="flex gap-2">
                      <button className="flex-1 btn text-sm bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                        onClick={() => setShowNarrativesModal(true)} disabled={aiLoading}
                        title="Tulis narasi 40–60 kata per sesi dari shortNote + ringkasan + kutipan">
                        {aiLoading ? "⏳ AI..." : "📖 Narasi AI"}
                      </button>
                      <button className="flex-1 btn text-sm bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 disabled:opacity-50"
                        onClick={() => setShowPolishModal(true)} disabled={aiLoading}
                        title="Hanya ringkasan bulan + kutipan (lebih murah)">
                        {aiLoading ? "⏳ AI..." : "✨ Ringkasan AI"}
                      </button>
                    </div>
                  )}

                  {/* Kesiapan laporan, bukan hanya jumlah narasi. */}
                  {report && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Kesiapan laporan</span>
                        <span className={reportReadiness === 4 ? "text-green-600 font-semibold" : ""}>{reportReadinessPercent}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${reportReadiness === 4 ? "bg-green-500" : "bg-blue-500"}`}
                          style={{ width: `${reportReadinessPercent}%` }} />
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {reportReadinessItems.map((item) => (
                          <span key={item.label} className={`text-[11px] rounded-md px-2 py-1 ${item.complete ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-500"}`}>
                            {item.complete ? "✓" : "○"} {item.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>

            {/* CARD 2 (hero): Design toolbar + Preview + Export */}
            {report && reportData && (
              <section className="space-y-3">

                {/* Design toolbar */}
                <details className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 space-y-2.5 group" open={false}>
                  <summary className="flex items-center justify-between cursor-pointer select-none">
                    <span className="text-sm font-semibold text-gray-700">
                      🎨 Tema: {allThemes.find((t) => t.id === report.templateKey.themeId)?.name ?? "—"}
                      {" · "}{LAYOUTS.find((l) => l.id === report.templateKey.layoutId)?.name ?? "—"}
                    </span>
                    <span className="text-xs text-blue-600 font-semibold group-open:hidden">Ubah tema & layout ▸</span>
                    <span className="text-xs text-gray-400 font-semibold hidden group-open:inline">▾</span>
                  </summary>
                  {/* Row 1: Random + Layout + Cover toggle */}
                  <div className="flex items-center gap-2">
                    <button className="btn btn-secondary text-sm py-1.5 px-2 flex-shrink-0 whitespace-nowrap"
                      onClick={handleRegenerate}>🎲 Acak</button>
                    {undoStack.length > 0 && (
                      <button className="btn btn-secondary text-sm py-1.5 px-2 flex-shrink-0"
                        onClick={async () => {
                          const prev = undoStack[undoStack.length - 1];
                          setUndoStack((s) => s.slice(0, -1));
                          await upsertReport({ ...report, templateKey: { themeId: prev.themeId, layoutId: prev.layoutId } });
                        }}>↩ Undo</button>
                    )}
                    <select className="input flex-1 text-sm" value={report.templateKey.layoutId}
                      onChange={(e) => { setUndoStack((s) => [...s, { themeId: report.templateKey.themeId, layoutId: report.templateKey.layoutId }]); handleCreateOrSwitch(e.target.value); }}>
                      {LAYOUTS.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                    <button onClick={() => setCoverPage((v) => !v)}
                      className={`text-sm py-1.5 px-2 rounded-lg border transition-colors whitespace-nowrap ${coverPage ? "bg-blue-600 text-white border-blue-600" : "bg-gray-50 text-gray-600 border-gray-200"}`}>
                      {coverPage ? "📄 Cover ✓" : "📄 Cover"}
                    </button>
                  </div>

                  {/* Row 2: Compare + Custom Theme Builder */}
                  <div className="flex gap-2">
                    <button className="btn btn-secondary text-xs py-1 px-2 flex-1"
                      onClick={() => { setShowCompare((v) => !v); setCompareThemeId(null); }}>
                      {showCompare ? "❌ Tutup" : "🔍 Bandingkan"}
                    </button>
                    <button className="btn btn-secondary text-xs py-1 px-2 flex-1"
                      onClick={() => setShowCustomBuilder((v) => !v)}>
                      {showCustomBuilder ? "❌ Tutup" : "🎨 Custom Theme"}
                    </button>
                  </div>

                  {/* Thumbnail grid */}
                  <div className="grid grid-cols-6 gap-1.5 max-h-[200px] overflow-y-auto">
                    {allThemes.map((t) => {
                      const isActive = report.templateKey.themeId === t.id;
                      const isCompare = compareThemeId === t.id;
                      const bgColor = t.bg.includes("gradient") ? t.accent : t.bg;
                      return (
                        <button key={t.id} title={t.name}
                          onClick={async () => {
                            if (showCompare) { setCompareThemeId(t.id); return; }
                            setUndoStack((s) => [...s, { themeId: report.templateKey.themeId, layoutId: report.templateKey.layoutId }]);
                            await upsertReport({ ...report, templateKey: { ...report.templateKey, themeId: t.id } });
                          }}
                          className={`rounded-lg border-2 transition-all overflow-hidden ${isActive ? "border-gray-800 ring-2 ring-offset-1 ring-blue-400" : isCompare ? "border-dashed border-blue-400" : "border-gray-200 hover:border-gray-400"}`}>
                          <div style={{ background: bgColor, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontFamily: t.fontDisplay, fontSize: 10, color: t.ink, fontWeight: 700, lineHeight: 1, textAlign: "center", padding: "0 2px" }}>
                              {t.headerText.slice(0, 4)}
                            </span>
                          </div>
                          <div style={{ padding: "2px 3px", fontSize: 10, color: "#6b7280", textAlign: "center", background: "#fff" }}>
                            {t.name.length > 10 ? t.name.slice(0, 9) + "…" : t.name}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-500">
                    {allThemes.find((t) => t.id === report.templateKey.themeId)?.name ?? "—"}
                    {showCompare && " • Klik tema untuk bandingkan, klik lagi untuk pilih"}
                  </p>
                </div>

                {/* Comparison mode */}
                {showCompare && compareThemeId && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-gray-500 text-center mb-1">Current: {allThemes.find((t) => t.id === report.templateKey.themeId)?.name}</p>
                      <div className="scale-[0.6] origin-top-left" style={{ width: "167%" }}>
                        <ReportRenderer data={reportData} theme={theme} layoutId={report.templateKey.layoutId} options={reportOptions} />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 text-center mb-1">Compare: {allThemes.find((t) => t.id === compareThemeId)?.name}</p>
                      <div className="scale-[0.6] origin-top-left" style={{ width: "167%" }}>
                        <ReportRenderer data={reportData} theme={allThemes.find((t) => t.id === compareThemeId) ?? getTheme(compareThemeId)} layoutId={report.templateKey.layoutId} options={reportOptions} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Custom Theme Builder */}
                {showCustomBuilder && (
                  <CustomThemeBuilder
                    onSave={async (ct: CustomTheme) => {
                      const currentCustoms = settings?.templatePref?.customThemes ?? [];
                      const updated = currentCustoms.some((c) => c.id === ct.id)
                        ? currentCustoms.map((c) => c.id === ct.id ? ct : c)
                        : [...currentCustoms, ct];
                      await saveSettings({ templatePref: { ...settings?.templatePref, customThemes: updated } });
                      await upsertReport({ ...report, templateKey: { ...report.templateKey, themeId: ct.id } });
                      setShowCustomBuilder(false);
                      setMessage("Tema kustom disimpan ✓");
                    }}
                  />
                )}

                </details>

                <div ref={reportExportRef}>
                {/* Preview */}
                <div className="max-w-sm lg:max-w-2xl mx-auto">
                  <ReportRenderer data={reportData} theme={theme} layoutId={report.templateKey.layoutId} options={reportOptions} />
                </div>

                {/* Rekap tanda tangan */}
                {sessionSigUrls.size > 0 && (
                  <div data-report-page className="bg-white rounded-xl border border-gray-100 p-4 max-w-sm lg:max-w-2xl mx-auto">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">✍️ Rekap Tanda Tangan</p>
                    <div className="space-y-2">
                      {(sessions ?? []).filter((s) => sessionSigUrls.has(s.id)).map((s) => (
                        <div key={s.id} className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-700">{dayLabel(s.date).split(",")[1]?.trim() ?? s.date.slice(5)}</p>
                            <p className="text-xs text-gray-500">{s.subjects.join(", ")}</p>
                          </div>
                          <img src={sessionSigUrls.get(s.id)} alt="TTD"
                            className="h-10 max-w-[100px] object-contain border border-gray-100 rounded bg-gray-50 p-1" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                </div>

                {/* Export */}
                <div className="grid grid-cols-3 gap-2">
                  <button className="btn btn-primary text-sm" onClick={() => doExport("jpg")} disabled={!!exporting || !reportData}>
                    {exporting === "jpg" ? "⏳" : "🖼️"} JPG
                  </button>
                  <button className="btn text-sm bg-purple-600 text-white hover:bg-purple-700" onClick={() => doExport("png")} disabled={!!exporting || !reportData}>
                    {exporting === "png" ? "⏳" : "📋"} PNG
                  </button>
                  <button className="btn btn-secondary text-sm" onClick={() => doExport("pdf")} disabled={!!exporting || !reportData}>
                    {exporting === "pdf" ? "⏳" : "📄"} PDF
                  </button>
                </div>
              </section>
            )}

            {/* EDIT (accordion) */}
            {report && (
              <div className="space-y-2">

                {/* Narasi sesi */}
                <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <button className="w-full flex items-center justify-between p-4 text-left"
                    onClick={() => setOpenNarasi((v) => !v)}>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">✏️ Narasi Sesi</p>
                      <p className="text-xs text-gray-500 mt-0.5">{sessionsWithNarrative}/{filteredSessions.length} narasi siap</p>
                    </div>
                    <span className="text-gray-500 text-sm">{openNarasi ? "▲" : "▼"}</span>
                  </button>
                  {openNarasi && (
                    <div className="px-4 pb-4 space-y-2 border-t border-gray-100">
                      {paginatedNarrativeSessions.map((s) => (
                        <div key={s.id} className="bg-gray-50 rounded-xl p-3 mt-2">
                          <p className="text-xs text-gray-500 mb-1">{dayLabel(s.date)} — {s.subjects.join(", ")}</p>
                          {editingNarrative === s.id ? (
                            <div className="space-y-2">
                              <textarea className="input text-sm" rows={3} value={editText}
                                onChange={(e) => setEditText(e.target.value)} />
                              <div className="flex gap-2">
                                <button className="btn btn-primary text-xs" onClick={() => saveNarrative(s.id)}>Simpan</button>
                                <button className="btn btn-secondary text-xs" onClick={() => setEditingNarrative(null)}>Batal</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start gap-2 cursor-pointer group"
                              onClick={() => { setEditText(s.narrative ?? s.shortNote); setEditingNarrative(s.id); }}>
                              <p className="text-sm text-gray-700 flex-1 group-hover:text-blue-700 transition-colors line-clamp-2">
                                {s.narrative ?? s.shortNote}
                              </p>
                              <span className={`text-xs flex-shrink-0 font-semibold px-1.5 py-0.5 rounded-full ${s.narrative ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"}`}>
                                {s.narrative ? "✓" : "Edit"}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                      <PaginationControls page={safeNarrativePage} total={filteredSessions.length}
                        onPageChange={setNarrativePage} label="narasi" />
                    </div>
                  )}
                </section>

                {/* Teks laporan */}
                <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <button className="w-full flex items-center justify-between p-4 text-left"
                    onClick={() => setOpenTeks((v) => !v)}>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-800 text-sm">📝 Teks Laporan</p>
                        {(report.summaryText || report.quote) && (
                          <span className="text-[10px] bg-indigo-50 text-indigo-500 font-bold px-1.5 py-0.5 rounded-full">✨ AI</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">Ringkasan · Catatan guru · Kutipan</p>
                    </div>
                    <span className="text-gray-500 text-sm">{openTeks ? "▲" : "▼"}</span>
                  </button>
                  {openTeks && (
                    <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
                      <div className="pt-3">
                        <label className="label">Ringkasan</label>
                        {editingSummary ? (
                          <div className="space-y-2">
                            <textarea className="input text-sm" rows={3} value={summaryText}
                              onChange={(e) => setSummaryText(e.target.value)} />
                            <div className="flex gap-2">
                              <button className="btn btn-primary text-xs" onClick={() => saveReportField("summaryText", summaryText)}>Simpan</button>
                              <button className="btn btn-secondary text-xs" onClick={() => setEditingSummary(false)}>Batal</button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 cursor-pointer hover:bg-gray-100 min-h-[2.5rem]"
                            onClick={() => { setSummaryText(report.summaryText); setEditingSummary(true); }}>
                            {report.summaryText || <span className="text-gray-500">Klik untuk tambah ringkasan...</span>}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="label">Catatan Guru</label>
                        {editingTeacherNote ? (
                          <div className="space-y-2">
                            <textarea className="input text-sm" rows={3} value={teacherNoteText}
                              onChange={(e) => setTeacherNoteText(e.target.value)}
                              placeholder="Kemajuan terbesar bulan ini dan fokus prioritas bulan depan..." />
                            <div className="flex gap-2">
                              <button className="btn btn-primary text-xs" onClick={() => saveReportField("teacherNote", teacherNoteText)}>Simpan</button>
                              <button className="btn btn-secondary text-xs" onClick={() => setEditingTeacherNote(false)}>Batal</button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 cursor-pointer hover:bg-gray-100 min-h-[2.5rem]"
                            onClick={() => { setTeacherNoteText(report.teacherNote ?? ""); setEditingTeacherNote(true); }}>
                            {report.teacherNote || <span className="text-gray-500">Klik untuk menambahkan kemajuan dan fokus prioritas...</span>}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="label">Kutipan</label>
                        {editingQuote ? (
                          <div className="space-y-2">
                            <input className="input text-sm" value={quoteText}
                              onChange={(e) => setQuoteText(e.target.value)} />
                            <div className="flex gap-2">
                              <button className="btn btn-primary text-xs" onClick={() => saveReportField("quote", quoteText)}>Simpan</button>
                              <button className="btn btn-secondary text-xs" onClick={() => setEditingQuote(false)}>Batal</button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 italic cursor-pointer hover:bg-gray-100 min-h-[2.5rem]"
                            onClick={() => { setQuoteText(report.quote ?? ""); setEditingQuote(true); }}>
                            {report.quote ? `"${report.quote}"` : <span className="text-gray-500 not-italic">Klik untuk tambah kutipan...</span>}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </section>

                <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <button className="w-full flex items-center justify-between p-4 text-left"
                    onClick={() => setOpenPlan((value) => !value)}>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-800 text-sm">🎯 Fokus & Rencana Bulan Depan</p>
                        {hasPlan && <span className="text-[10px] bg-green-50 text-green-600 font-bold px-1.5 py-0.5 rounded-full">Siap</span>}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {hasPlan ? `${report.nextMonthPlan!.priorities.filter((item) => item.target.trim()).length} prioritas terukur` : "Tetapkan maksimal 3 prioritas yang bisa ditindaklanjuti."}
                      </p>
                    </div>
                    <span className="text-gray-500 text-sm">{openPlan ? "▲" : "▼"}</span>
                  </button>
                  {openPlan && (
                    <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
                      {editingPlan ? (
                        <NextMonthPlanEditor
                          initialPlan={report.nextMonthPlan}
                          onSave={saveNextMonthPlan}
                          onCancel={() => setEditingPlan(false)}
                        />
                      ) : (
                        <>
                          {hasPlan ? (
                            <div className="space-y-2 pt-3">
                              {report.nextMonthPlan!.priorities.filter((item) => item.target.trim()).slice(0, 3).map((item, index) => (
                                <div key={item.id} className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-sm font-semibold text-gray-800">{index + 1}. {item.subject || `Prioritas ${index + 1}`}</p>
                                    <span className="text-[10px] font-semibold rounded-full bg-white text-indigo-600 px-2 py-0.5">
                                      {PLAN_STATUSES.find((status) => status.value === item.status)?.label ?? "Belum dimulai"}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-700 mt-1">{item.target}</p>
                                  {item.evidence && <p className="text-xs text-gray-500 mt-1.5">Dasar: {item.evidence}</p>}
                                  {(item.tutorAction || item.successMetric || item.cadence) && (
                                    <p className="text-xs text-indigo-700 mt-1.5">
                                      {item.tutorAction && `Tutor: ${item.tutorAction}`}
                                      {item.tutorAction && (item.successMetric || item.cadence) && " · "}
                                      {item.successMetric && `Cek: ${item.successMetric}`}
                                      {item.successMetric && item.cadence && " · "}
                                      {item.cadence}
                                    </p>
                                  )}
                                </div>
                              ))}
                              {report.nextMonthPlan?.parentSupport && (
                                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                                  <strong>Dukungan di rumah:</strong> {report.nextMonthPlan.parentSupport}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="pt-3 text-sm text-gray-500">Belum ada rencana. Mulai dari target yang spesifik, cara belajar, dan indikator keberhasilan.</p>
                          )}
                          <button className="btn btn-secondary w-full text-sm" onClick={() => setEditingPlan(true)}>
                            {hasPlan ? "✏️ Edit Rencana" : "＋ Susun Rencana"}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </section>

              </div>
            )}
          </div>

      </div>

      {/* Ringkasan AI cost modal */}
      <AiCostModal
        open={showPolishModal}
        title="Ringkasan AI — Ringkasan & Kutipan"
        estimatedIDR={estimateReportSummaryCost(sessions?.length ?? 0)}
        description={`${sessions?.length ?? 0} sesi · ringkasan bulan + kutipan untuk ${student?.name ?? "murid"}`}
        onCancel={() => setShowPolishModal(false)}
        onConfirm={() => { setShowPolishModal(false); handlePolish(); }}
      />

      {/* Narasi AI cost modal */}
      <AiCostModal
        open={showNarrativesModal}
        title="Narasi AI — Semua Sesi"
        estimatedIDR={estimateNarrativesCost(sessions?.length ?? 0)}
        description={`Perluas shortNote jadi narasi 40–60 kata untuk ${sessions?.length ?? 0} sesi + ringkasan, catatan guru & kutipan. Narasi lama ditimpa (bisa di-Undo).`}
        onCancel={() => setShowNarrativesModal(false)}
        onConfirm={() => { setShowNarrativesModal(false); handleGenerateNarratives(); }}
      />
    </div>
  );
}

// ── Custom Theme Builder ─────────────────────────────────────────────

function NextMonthPlanEditor({ initialPlan, onSave, onCancel }: {
  initialPlan?: NextMonthPlan;
  onSave: (plan: NextMonthPlan) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<NextMonthPlan>(() => initialPlan
    ? {
      priorities: initialPlan.priorities.length > 0 ? initialPlan.priorities.map((item) => ({ ...item })) : [newPlanItem()],
      parentSupport: initialPlan.parentSupport ?? "",
      updatedAt: initialPlan.updatedAt,
    }
    : createEmptyPlan());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const updateItem = (id: string, patch: Partial<MonthlyPlanItem>) => {
    setDraft((plan) => ({
      ...plan,
      priorities: plan.priorities.map((item) => item.id === id ? { ...item, ...patch } : item),
    }));
  };

  const removeItem = (id: string) => {
    setDraft((plan) => ({
      ...plan,
      priorities: plan.priorities.length === 1 ? plan.priorities : plan.priorities.filter((item) => item.id !== id),
    }));
  };

  const save = async () => {
    const priorities = draft.priorities
      .map((item) => ({
        ...item,
        subject: item.subject.trim(),
        evidence: item.evidence?.trim(),
        target: item.target.trim(),
        tutorAction: item.tutorAction?.trim(),
        successMetric: item.successMetric?.trim(),
        cadence: item.cadence?.trim(),
      }))
      .filter((item) => item.target);
    if (priorities.length === 0) {
      setError("Isi minimal satu target belajar yang spesifik.");
      return;
    }
    setSaving(true);
    try {
      await onSave({ priorities, parentSupport: draft.parentSupport?.trim() });
    } catch (e) {
      setError("Gagal menyimpan: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 pt-3">
      <div className="rounded-xl bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
        Pilih maksimal tiga prioritas. Buat target yang dapat dilihat hasilnya, bukan hanya “lebih memahami materi”.
      </div>
      {draft.priorities.map((item, index) => (
        <div key={item.id} className="rounded-xl border border-gray-200 p-3 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-gray-700">Prioritas {index + 1}</p>
            {draft.priorities.length > 1 && (
              <button type="button" className="text-xs font-semibold text-red-500" onClick={() => removeItem(item.id)}>Hapus</button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Mapel / area</label>
              <input className="input text-sm" value={item.subject}
                placeholder="Contoh: Matematika AA"
                onChange={(event) => updateItem(item.id, { subject: event.target.value })} />
            </div>
            <div>
              <label className="label">Penanggung jawab</label>
              <select className="input text-sm" value={item.owner ?? "shared"}
                onChange={(event) => updateItem(item.id, { owner: event.target.value as PlanOwner })}>
                {PLAN_OWNERS.map((owner) => <option key={owner.value} value={owner.value}>{owner.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Target terukur *</label>
            <textarea className="input text-sm" rows={2} value={item.target}
              placeholder="Contoh: Menyelesaikan 8 dari 10 soal fungsi kuadrat dengan langkah lengkap."
              onChange={(event) => updateItem(item.id, { target: event.target.value })} />
          </div>
          <div>
            <label className="label">Dasar dari bulan ini</label>
            <textarea className="input text-sm" rows={2} value={item.evidence ?? ""}
              placeholder="Contoh: Masih keliru pada operasi tanda negatif di soal cerita."
              onChange={(event) => updateItem(item.id, { evidence: event.target.value })} />
          </div>
          <div>
            <label className="label">Langkah tutor</label>
            <textarea className="input text-sm" rows={2} value={item.tutorAction ?? ""}
              placeholder="Contoh: Latihan bertahap, cek langkah, lalu soal aplikasi."
              onChange={(event) => updateItem(item.id, { tutorAction: event.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Indikator berhasil</label>
              <input className="input text-sm" value={item.successMetric ?? ""}
                placeholder="8/10 soal tepat"
                onChange={(event) => updateItem(item.id, { successMetric: event.target.value })} />
            </div>
            <div>
              <label className="label">Frekuensi / waktu</label>
              <input className="input text-sm" value={item.cadence ?? ""}
                placeholder="2 sesi per minggu"
                onChange={(event) => updateItem(item.id, { cadence: event.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input text-sm" value={item.status ?? "planned"}
              onChange={(event) => updateItem(item.id, { status: event.target.value as PlanStatus })}>
              {PLAN_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
            </select>
          </div>
        </div>
      ))}
      {draft.priorities.length < 3 && (
        <button type="button" className="w-full rounded-xl border border-dashed border-indigo-300 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50"
          onClick={() => setDraft((plan) => ({ ...plan, priorities: [...plan.priorities, newPlanItem()] }))}>
          ＋ Tambah Prioritas
        </button>
      )}
      <div>
        <label className="label">Dukungan di rumah (opsional)</label>
        <textarea className="input text-sm" rows={2} value={draft.parentSupport ?? ""}
          placeholder="Contoh: Sediakan 10 menit latihan mandiri dua kali seminggu."
          onChange={(event) => setDraft((plan) => ({ ...plan, parentSupport: event.target.value }))} />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button className="btn btn-secondary flex-1 text-sm" onClick={onCancel} disabled={saving}>Batal</button>
        <button className="btn btn-primary flex-1 text-sm" onClick={save} disabled={saving}>
          {saving ? "Menyimpan..." : "Simpan Rencana"}
        </button>
      </div>
    </div>
  );
}

const FONTS = [
  { id: "'Fredoka', sans-serif", name: "Fredoka" },
  { id: "'Baloo 2', sans-serif", name: "Baloo 2" },
  { id: "'Pacifico', cursive", name: "Pacifico" },
  { id: "'Poppins', sans-serif", name: "Poppins" },
  { id: "'Nunito', sans-serif", name: "Nunito" },
  { id: "'Quicksand', sans-serif", name: "Quicksand" },
  { id: "'Comfortaa', sans-serif", name: "Comfortaa" },
  { id: "'Caveat', cursive", name: "Caveat" },
];

const HEADER_STYLES: Array<{ id: import("../template/types").HeaderStyle; name: string }> = [
  { id: "bubble", name: "Bubble" }, { id: "script", name: "Script" }, { id: "plain", name: "Plain" },
  { id: "frame", name: "Frame" }, { id: "minimal", name: "Minimal" }, { id: "badge", name: "Badge" }, { id: "watercolor", name: "Watercolor" },
];
const LABEL_STYLES: Array<{ id: import("../template/types").LabelStyle; name: string }> = [
  { id: "pill", name: "Pill" }, { id: "rounded", name: "Rounded" }, { id: "flag", name: "Flag" },
  { id: "tag", name: "Tag" }, { id: "underline", name: "Underline" }, { id: "ribbon-label", name: "Ribbon" },
];
const PHOTO_STYLES: Array<{ id: import("../template/types").PhotoStyle; name: string }> = [
  { id: "round", name: "Round" }, { id: "circle", name: "Circle" }, { id: "polaroid", name: "Polaroid" },
  { id: "shadow", name: "Shadow" }, { id: "frame", name: "Frame" }, { id: "vintage", name: "Vintage" }, { id: "duotone", name: "Duotone" },
];
const DECO_KINDS: Array<{ id: import("../template/types").DecoKind; name: string }> = [
  { id: "none", name: "None" }, { id: "snow", name: "Snow" }, { id: "leaf", name: "Leaf" }, { id: "petal", name: "Petal" },
  { id: "sparkle", name: "Sparkle" }, { id: "star", name: "Star" }, { id: "wave", name: "Wave" }, { id: "sun", name: "Sun" },
  { id: "geometric", name: "Geometric" }, { id: "dots", name: "Dots" },
  { id: "confetti", name: "Confetti" },
  { id: "ribbon", name: "Ribbon" }, { id: "zigzag", name: "Zigzag" },
];

function CustomThemeBuilder({ onSave }: {
  onSave: (ct: import("../template/types").CustomTheme) => void;
}) {
  const [name, setName] = useState("TemaKu");
  const [bg, setBg] = useState("#f0f4ff");
  const [ink, setInk] = useState("#1a2a4a");
  const [muted, setMuted] = useState("#6b7a99");
  const [accent, setAccent] = useState("#4d7fd0");
  const [palette, setPalette] = useState(["#4d7fd0", "#e0892f", "#54b08a", "#d9605f"]);
  const [fontDisplay, setFontDisplay] = useState("'Fredoka', sans-serif");
  const [fontBody, setFontBody] = useState("'Nunito', sans-serif");
  const [header, setHeader] = useState<import("../template/types").HeaderStyle>("bubble");
  const [label, setLabel] = useState<import("../template/types").LabelStyle>("pill");
  const [photo, setPhoto] = useState<import("../template/types").PhotoStyle>("round");
  const [deco, setDeco] = useState<import("../template/types").DecoKind>("none");
  const [headerText, setHeaderText] = useState("ABSENSI");

  const save = () => {
    onSave({
      id: `custom-${Date.now()}`, name: name || "TemaKu", bg, ink, muted, accent, palette,
      fontDisplay, fontBody, header, label, photo, deco, headerText,
    });
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
      <p className="font-bold text-gray-800 text-sm">🎨 Custom Theme Builder</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Nama Tema</label>
          <input className="input text-sm" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">Header Text</label>
          <input className="input text-sm" value={headerText} onChange={(e) => setHeaderText(e.target.value)} />
        </div>
        <div>
          <label className="label">Background</label>
          <input type="color" className="w-full h-8 rounded cursor-pointer" value={bg} onChange={(e) => setBg(e.target.value)} />
        </div>
        <div>
          <label className="label">Accent</label>
          <input type="color" className="w-full h-8 rounded cursor-pointer" value={accent} onChange={(e) => setAccent(e.target.value)} />
        </div>
        <div>
          <label className="label">Ink (teks)</label>
          <input type="color" className="w-full h-8 rounded cursor-pointer" value={ink} onChange={(e) => setInk(e.target.value)} />
        </div>
        <div>
          <label className="label">Muted (sekunder)</label>
          <input type="color" className="w-full h-8 rounded cursor-pointer" value={muted} onChange={(e) => setMuted(e.target.value)} />
        </div>
      </div>

      {/* Style selectors */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Header Style</label>
          <select className="input text-sm" value={header} onChange={(e) => setHeader(e.target.value as HeaderStyle)}>
            {HEADER_STYLES.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Label Style</label>
          <select className="input text-sm" value={label} onChange={(e) => setLabel(e.target.value as LabelStyle)}>
            {LABEL_STYLES.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Photo Style</label>
          <select className="input text-sm" value={photo} onChange={(e) => setPhoto(e.target.value as PhotoStyle)}>
            {PHOTO_STYLES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Decoration</label>
          <select className="input text-sm" value={deco} onChange={(e) => setDeco(e.target.value as DecoKind)}>
            {DECO_KINDS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Display Font</label>
          <select className="input text-sm" value={fontDisplay} onChange={(e) => setFontDisplay(e.target.value)}>
            {FONTS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Body Font</label>
          <select className="input text-sm" value={fontBody} onChange={(e) => setFontBody(e.target.value)}>
            {FONTS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
      </div>

      {/* Palette */}
      <div>
        <label className="label">Palette (4 warna)</label>
        <div className="flex gap-2">
          {palette.map((c, i) => (
            <input key={i} type="color" className="w-full h-8 rounded cursor-pointer" value={c}
              onChange={(e) => { const p = [...palette]; p[i] = e.target.value; setPalette(p); }} />
          ))}
        </div>
      </div>

      {/* Preview mini */}
      <div className="rounded-xl overflow-hidden border border-gray-200">
        <div style={{ background: bg, padding: "12px 10px", fontFamily: fontBody, color: ink }}>
          <div style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 18, color: accent, textAlign: "center" }}>
            {headerText}
          </div>
          <div style={{ textAlign: "center", fontSize: 11, marginTop: 2, color: muted }}>
            Preview · {name}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            {palette.map((c, i) => (
              <div key={i} style={{ flex: 1, height: 20, borderRadius: 6, background: c }} />
            ))}
          </div>
        </div>
      </div>

      <button className="btn btn-primary w-full text-sm" onClick={save}>💾 Simpan Tema Kustom</button>
    </div>
  );
}
