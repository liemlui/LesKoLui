import { useState, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  listStudents, getStudent, getSettings,
  listSessionsByStudentMonth,
  getReport, upsertReport, updateSession, saveSettings,
} from "../db/repos";
import { pickTemplate } from "../lib/rotation";
import { generateReportSummary, estimateReportSummaryCost } from "../lib/aiClient";
import { BEHAVIOR_TAGS, RESPONSE_TAGS } from "../lib/responseTaxonomy";
import { AiCostModal } from "../components/AiCostModal";
import { getTheme, THEMES } from "../template/themes";
import { LAYOUTS } from "../template/layouts";
import { ReportRenderer } from "../template/ReportRenderer";
import { dayLabel, monthLabel, todayWIB, monthOf } from "../lib/format";
import { exportJpeg, exportPng, exportPdf, shareFiles } from "../lib/exportReport";
import { blobToDataUrl, blobToNormalizedDataUrl } from "../lib/imageUtils";
import PaginationControls from "../components/PaginationControls";
import { clampPage, paginateItems } from "../lib/pagination";
import { calcEngagementScore, scoreLabel } from "../lib/engagement";
import type { ReportOptions, CustomTheme, Theme } from "../template/types";

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
  const [editingQuote,     setEditingQuote]     = useState(false);
  const [showPolishModal,  setShowPolishModal]  = useState(false);
  const [prevTexts,        setPrevTexts]        = useState<{ summaryText: string; quote?: string } | null>(null);
  const [quoteText,        setQuoteText]        = useState("");
  const [aiLoading,        setAiLoading]        = useState(false);
  const [message,          setMessage]          = useState("");
  const [exporting,        setExporting]        = useState<"jpg" | "png" | "pdf" | null>(null);
  const [openNarasi,       setOpenNarasi]       = useState(false);
  const [openTeks,         setOpenTeks]         = useState(false);
  const [narrativePage,    setNarrativePage]    = useState(1);

  const student  = useLiveQuery(() => (studentId ? getStudent(studentId) : undefined), [studentId]);
  const sessions = useLiveQuery(() => (studentId ? listSessionsByStudentMonth(studentId, month) : []), [studentId, month]);
  const report   = useLiveQuery(() => (studentId ? getReport(studentId, month) : undefined), [studentId, month]);

  const totalHours = useMemo(() => sessions?.reduce((s, x) => s + x.durationHours, 0) ?? 0, [sessions]);
  const totalCost  = useMemo(() => sessions?.reduce((s, x) => s + x.cost, 0) ?? 0, [sessions]);
  const reportSessions         = sessions ?? [];
  const sessionsWithNarrative  = reportSessions.filter((s) => Boolean(s.narrative?.trim())).length;
  const sessionsWithPhotos     = reportSessions.filter((s) => Boolean(s.photo)).length;
  const reportCompletion       = reportSessions.length > 0 ? Math.round((sessionsWithNarrative / reportSessions.length) * 100) : 0;

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
      const entries = await Promise.all(
        sessions.map(async (s) => {
          const engScore = s.engagement?.score ?? (s.engagement ? calcEngagementScore(s.engagement) : undefined);
          const engLabel = engScore != null ? scoreLabel(engScore).text : undefined;
          return {
            date: dayLabel(s.date).split(",")[1]?.trim() ?? s.date.slice(5),
            subject: s.subjects.join(", "),
            photoUrl: s.photo ? await blobToNormalizedDataUrl(s.photo) : undefined,
            narrative: s.narrative ?? s.shortNote,
            engagementScore: engScore,
            engagementLabel: engLabel,
          };
        })
      );
      const scores = entries.filter((e) => e.engagementScore != null).map((e) => e.engagementScore!);
      const avgEngagement = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : undefined;
      const photoUrls = entries.filter((e) => e.photoUrl).map((e) => e.photoUrl!);
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
        avgEngagement,
        photoUrls,
      });
    })();
    return () => { cancelled = true; };
  }, [student, sessions, month, report, settings]);

  const safeNarrativePage      = clampPage(narrativePage, reportSessions.length);
  const paginatedNarrativeSessions = paginateItems(reportSessions, safeNarrativePage);

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
    await upsertReport({ ...report, templateKey: await pickTemplate(studentId) });
    setMessage("Desain diganti!");
  };

  const handlePolish = async () => {
    if (!student || !sessions?.length) return;
    if (!navigator.onLine) { setMessage("Offline."); return; }
    setAiLoading(true);
    try {
      const draft = await ensureReport();
      const out = await generateReportSummary({
        student: { name: student.name, level: student.level },
        month: monthLabel(month),
        sessions: sessions.map((s) => ({
          id: s.id, date: dayLabel(s.date), subject: s.subjects.join(", "),
          shortNote: s.shortNote, mood: s.mood, topic: s.topic,
          needsWork: s.needsWork, predictedGrade: s.predictedGrade,
          engagementScore: s.engagement?.score,
          behaviorLabels: s.behaviorTags?.map(id => BEHAVIOR_TAGS.find(t => t.id === id)?.label).filter(Boolean) as string[] | undefined,
          responseLabel: s.responseTag ? RESPONSE_TAGS.find(t => t.id === s.responseTag)?.label : undefined,
        })),
      });
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

  const doExport = async (type: "jpg" | "png" | "pdf") => {
    if (!student || !report || exporting) return;
    setExporting(type);
    setMessage("");
    const base = `Laporan-${student.name}-${monthLabel(month)}`.replace(/\s+/g, "-");
    try {
      if (type === "jpg") await shareFiles(await exportJpeg(base), base);
      else if (type === "png") await shareFiles(await exportPng(base), base);
      else await shareFiles([await exportPdf(base)], base);
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
    setEditingSummary(false); setEditingQuote(false);
  };

  if (!students) return <div className="p-4 text-gray-500">Memuat...</div>;

  return (
    <div className="pb-20">
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
                  await upsertReport({ ...report, summaryText: prevTexts.summaryText, quote: prevTexts.quote });
                  setPrevTexts(null);
                  setMessage("Undo berhasil ✓");
                }}
                className="w-full text-xs text-indigo-600 font-semibold bg-indigo-50 border border-indigo-200 rounded-lg py-2 hover:bg-indigo-100 transition-colors">
                ↩ Undo Poles AI
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

              {!studentId && (
                <p className="text-sm text-gray-400 text-center py-1">Pilih murid untuk mulai menyusun laporan.</p>
              )}

              {studentId && sessions && sessions.length === 0 && (
                <div className="text-center py-2 space-y-2">
                  <p className="text-sm text-gray-500">Belum ada sesi di {monthLabel(month)}.</p>
                  <Link to="/capture" className="btn btn-primary w-full text-sm">Rekam Sesi Sekarang</Link>
                </div>
              )}

              {studentId && sessions && sessions.length > 0 && (
                <>
                  {/* 4 stat chips */}
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
                      <p className="text-lg font-bold text-purple-700">{sessionsWithPhotos}</p>
                      <p className="text-[11px] text-purple-500">Foto</p>
                    </div>
                    <div className={`rounded-xl py-2 text-center ${reportCompletion === 100 ? "bg-green-50" : "bg-amber-50"}`}>
                      <p className={`text-base font-bold leading-tight ${reportCompletion === 100 ? "text-green-700" : "text-amber-700"}`}>
                        {sessionsWithNarrative}/{reportSessions.length}
                      </p>
                      <p className={`text-[11px] ${reportCompletion === 100 ? "text-green-500" : "text-amber-500"}`}>Narasi</p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <button className="btn btn-primary flex-1 text-sm" onClick={() => handleCreateOrSwitch()}>
                      {report ? "🔄 Update Laporan" : "📝 Buat Laporan"}
                    </button>
                    {settings?.ai?.enabled && settings.ai.apiKey && (
                      <button className="flex-1 btn text-sm bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                        onClick={() => setShowPolishModal(true)} disabled={aiLoading}>
                        {aiLoading ? "⏳ AI..." : "✨ Poles AI"}
                      </button>
                    )}
                  </div>

                  {/* Progress bar */}
                  {report && (
                    <div>
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Kelengkapan narasi</span>
                        <span className={reportCompletion === 100 ? "text-green-600 font-semibold" : ""}>{reportCompletion}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${reportCompletion === 100 ? "bg-green-500" : "bg-blue-500"}`}
                          style={{ width: `${reportCompletion}%` }} />
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
                <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 space-y-2.5">
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
                      {coverPage ? "📄 Cover" : "📄 Cover"}
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
                            <span style={{ fontFamily: t.fontDisplay, fontSize: 8, color: t.ink, fontWeight: 700, lineHeight: 1, textAlign: "center", padding: "0 2px" }}>
                              {t.headerText.slice(0, 4)}
                            </span>
                          </div>
                          <div style={{ padding: "2px 3px", fontSize: 8, color: "#6b7280", textAlign: "center", background: "#fff" }}>
                            {t.name.length > 10 ? t.name.slice(0, 9) + "…" : t.name}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-400">
                    {allThemes.find((t) => t.id === report.templateKey.themeId)?.name ?? "—"}
                    {showCompare && " • Klik tema untuk bandingkan, klik lagi untuk pilih"}
                  </p>
                </div>

                {/* Comparison mode */}
                {showCompare && compareThemeId && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-gray-400 text-center mb-1">Current: {allThemes.find((t) => t.id === report.templateKey.themeId)?.name}</p>
                      <div className="scale-[0.6] origin-top-left" style={{ width: "167%" }}>
                        <ReportRenderer data={reportData} theme={theme} layoutId={report.templateKey.layoutId} options={reportOptions} />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 text-center mb-1">Compare: {allThemes.find((t) => t.id === compareThemeId)?.name}</p>
                      <div className="scale-[0.6] origin-top-left" style={{ width: "167%" }}>
                        <ReportRenderer data={reportData} theme={getTheme(compareThemeId)} layoutId={report.templateKey.layoutId} options={reportOptions} />
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
                      await saveSettings({ templatePref: { ...settings?.templatePref, customThemes: updated } } as any);
                      await upsertReport({ ...report, templateKey: { ...report.templateKey, themeId: ct.id } });
                      setShowCustomBuilder(false);
                      setMessage("Tema kustom disimpan ✓");
                    }}
                  />
                )}

                {/* Preview */}
                <div className="max-w-sm mx-auto">
                  <ReportRenderer data={reportData} theme={theme} layoutId={report.templateKey.layoutId} options={reportOptions} />
                </div>

                {/* Rekap tanda tangan */}
                {sessionSigUrls.size > 0 && (
                  <div data-report-page className="bg-white rounded-xl border border-gray-100 p-4 max-w-sm mx-auto">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">✍️ Rekap Tanda Tangan</p>
                    <div className="space-y-2">
                      {(sessions ?? []).filter((s) => sessionSigUrls.has(s.id)).map((s) => (
                        <div key={s.id} className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-700">{dayLabel(s.date).split(",")[1]?.trim() ?? s.date.slice(5)}</p>
                            <p className="text-xs text-gray-400">{s.subjects.join(", ")}</p>
                          </div>
                          <img src={sessionSigUrls.get(s.id)} alt="TTD"
                            className="h-10 max-w-[100px] object-contain border border-gray-100 rounded bg-gray-50 p-1" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Export */}
                <div className="grid grid-cols-3 gap-2">
                  <button className="btn btn-primary text-sm" onClick={() => doExport("jpg")} disabled={!!exporting}>
                    {exporting === "jpg" ? "⏳" : "🖼️"} JPG
                  </button>
                  <button className="btn text-sm bg-purple-600 text-white hover:bg-purple-700" onClick={() => doExport("png")} disabled={!!exporting}>
                    {exporting === "png" ? "⏳" : "📋"} PNG
                  </button>
                  <button className="btn btn-secondary text-sm" onClick={() => doExport("pdf")} disabled={!!exporting}>
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
                      <p className="text-xs text-gray-400 mt-0.5">{sessionsWithNarrative}/{reportSessions.length} narasi siap</p>
                    </div>
                    <span className="text-gray-400 text-sm">{openNarasi ? "▲" : "▼"}</span>
                  </button>
                  {openNarasi && (
                    <div className="px-4 pb-4 space-y-2 border-t border-gray-100">
                      {paginatedNarrativeSessions.map((s) => (
                        <div key={s.id} className="bg-gray-50 rounded-xl p-3 mt-2">
                          <p className="text-xs text-gray-400 mb-1">{dayLabel(s.date)} — {s.subjects.join(", ")}</p>
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
                      <PaginationControls page={safeNarrativePage} total={reportSessions.length}
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
                      <p className="text-xs text-gray-400 mt-0.5">Ringkasan · Catatan guru · Kutipan</p>
                    </div>
                    <span className="text-gray-400 text-sm">{openTeks ? "▲" : "▼"}</span>
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
                            {report.summaryText || <span className="text-gray-400">Klik untuk tambah ringkasan...</span>}
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
                            {report.quote ? `"${report.quote}"` : <span className="text-gray-400 not-italic">Klik untuk tambah kutipan...</span>}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </section>

              </div>
            )}
          </div>

      </div>

      {/* Poles AI cost modal */}
      <AiCostModal
        open={showPolishModal}
        title="Poles AI — Ringkasan & Kutipan"
        estimatedIDR={estimateReportSummaryCost(sessions?.length ?? 0)}
        description={`${sessions?.length ?? 0} sesi · ringkasan bulan + kutipan untuk ${student?.name ?? "murid"}`}
        onCancel={() => setShowPolishModal(false)}
        onConfirm={() => { setShowPolishModal(false); handlePolish(); }}
      />
    </div>
  );
}

// ── Custom Theme Builder ─────────────────────────────────────────────

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
          <select className="input text-sm" value={header} onChange={(e) => setHeader(e.target.value as any)}>
            {HEADER_STYLES.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Label Style</label>
          <select className="input text-sm" value={label} onChange={(e) => setLabel(e.target.value as any)}>
            {LABEL_STYLES.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Photo Style</label>
          <select className="input text-sm" value={photo} onChange={(e) => setPhoto(e.target.value as any)}>
            {PHOTO_STYLES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Decoration</label>
          <select className="input text-sm" value={deco} onChange={(e) => setDeco(e.target.value as any)}>
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
