import { useState, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  listStudents, getStudent, getSettings,
  listSessionsByStudentMonth, listSessionsForMonth, listDoneSessionsForDateRange,
  getReport, upsertReport, updateSession, saveSettings,
} from "../db/repos";
import { pickTemplate } from "../lib/rotation";
import { generateNarratives } from "../lib/aiClient";
import { getTheme, THEMES } from "../template/themes";
import { LAYOUTS } from "../template/layouts";
import { ReportRenderer } from "../template/ReportRenderer";
import { dayLabel, monthLabel, formatRupiah, todayWIB, monthOf } from "../lib/format";
import { exportJpeg, exportPdf, shareFiles } from "../lib/exportReport";
import { blobToDataUrl, blobToNormalizedDataUrl } from "../lib/imageUtils";
import { hashPin, verifyPin } from "../lib/crypto";
import { getPinLockoutDelay, recordPinFailure, resetPinLockout } from "../lib/pinLockout";
import PaginationControls from "../components/PaginationControls";
import { clampPage, paginateItems } from "../lib/pagination";

type Tab = "laporan" | "rekap";

export default function MonthlyReportPage() {
  const [searchParams] = useSearchParams();
  const students = useLiveQuery(() => listStudents(true), []);
  const settings = useLiveQuery(() => getSettings(), []);

  const [activeTab, setActiveTab] = useState<Tab>("laporan");
  const [studentId, setStudentId] = useState(searchParams.get("studentId") ?? "");
  const [month, setMonth] = useState(() => monthOf(todayWIB()));

  // PIN lock for rekap keuangan
  const [pinUnlocked,  setPinUnlocked]  = useState(false);
  const [pinInput,     setPinInput]     = useState("");
  const [pinConfirm,   setPinConfirm]   = useState("");
  const [pinError,     setPinError]     = useState("");

  const [editingNarrative, setEditingNarrative] = useState<string | null>(null);
  const [editText,         setEditText]         = useState("");
  const [editingSummary,   setEditingSummary]   = useState(false);
  const [summaryText,      setSummaryText]      = useState("");
  const [editingNote,      setEditingNote]      = useState(false);
  const [teacherNote,      setTeacherNote]      = useState("");
  const [editingQuote,     setEditingQuote]     = useState(false);
  const [quoteText,        setQuoteText]        = useState("");
  const [aiLoading,        setAiLoading]        = useState(false);
  const [message,          setMessage]          = useState("");
  const [exporting,        setExporting]        = useState<"jpg" | "pdf" | null>(null);
  const [openNarasi,       setOpenNarasi]       = useState(false);
  const [openTeks,         setOpenTeks]         = useState(false);
  const [narrativePage,    setNarrativePage]    = useState(1);
  const [rekapStudentPage, setRekapStudentPage] = useState(1);

  const student  = useLiveQuery(() => (studentId ? getStudent(studentId) : undefined), [studentId]);
  const sessions = useLiveQuery(() => (studentId ? listSessionsByStudentMonth(studentId, month) : []), [studentId, month]);
  const report   = useLiveQuery(() => (studentId ? getReport(studentId, month) : undefined), [studentId, month]);

  // Rekap keuangan: semua sesi semua murid di bulan ini
  const rekapSessions = useLiveQuery(
    () => (activeTab === "rekap" && pinUnlocked ? listSessionsForMonth(month) : []),
    [activeTab, pinUnlocked, month]
  );

  // 6-month chart
  const chartData = useMemo(() => {
    const months: string[] = [];
    const [cy, cm] = month.split("-").map(Number);
    for (let i = 5; i >= 0; i--) {
      const d = new Date(cy, cm - 1 - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    return months;
  }, [month]);

  const chartSessions = useLiveQuery(async () => {
    if (!pinUnlocked) return [];
    const start = chartData[0] + "-01";
    const end   = month + "-31";
    return listDoneSessionsForDateRange(start, end);
  }, [pinUnlocked, chartData, month]);

  const chartBars = useMemo(() => {
    if (!chartSessions) return [];
    return chartData.map((m) => {
      const cost = (chartSessions ?? []).filter((s) => s.date.startsWith(m)).reduce((sum, s) => sum + s.cost, 0);
      const label = new Date(m + "-01T00:00:00").toLocaleDateString("id-ID", { month: "short" });
      return { m, label, cost };
    });
  }, [chartSessions, chartData]);

  const totalHours = useMemo(() => sessions?.reduce((s, x) => s + x.durationHours, 0) ?? 0, [sessions]);
  const totalCost  = useMemo(() => sessions?.reduce((s, x) => s + x.cost, 0) ?? 0, [sessions]);
  const reportSessions         = sessions ?? [];
  const sessionsWithNarrative  = reportSessions.filter((s) => Boolean(s.narrative?.trim())).length;
  const sessionsWithPhotos     = reportSessions.filter((s) => Boolean(s.photo)).length;
  const reportCompletion       = reportSessions.length > 0 ? Math.round((sessionsWithNarrative / reportSessions.length) * 100) : 0;

  const theme = report ? getTheme(report.templateKey.themeId) : THEMES[0];

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

  // ReportData — async photo normalization (4:3, data URL, no blob)
  const [reportData, setReportData] = useState<{
    studentName: string; period: string; tutorName: string; logoUrl?: string;
    entries: { date: string; subject: string; photoUrl?: string; narrative: string }[];
    summary: string; teacherNote?: string; quote?: string;
  } | null>(null);

  useEffect(() => {
    if (!student || !sessions) { setReportData(null); return; }
    let cancelled = false;
    (async () => {
      const logoUrl = settings?.logo ? await blobToDataUrl(settings.logo) : undefined;
      const entries = await Promise.all(
        sessions.map(async (s) => ({
          date: dayLabel(s.date).split(",")[1]?.trim() ?? s.date.slice(5),
          subject: s.subjects.join(", "),
          photoUrl: s.photo ? await blobToNormalizedDataUrl(s.photo) : undefined,
          narrative: s.narrative ?? s.shortNote,
        }))
      );
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
      });
    })();
    return () => { cancelled = true; };
  }, [student, sessions, month, report, settings]);

  // Rekap: group by student
  const rekapByStudent = useMemo(() => {
    if (!rekapSessions || !students) return [];
    const map = new Map<string, { count: number; hours: number; cost: number }>();
    rekapSessions.forEach((s) => {
      const curr = map.get(s.studentId) ?? { count: 0, hours: 0, cost: 0 };
      map.set(s.studentId, { count: curr.count + 1, hours: curr.hours + s.durationHours, cost: curr.cost + s.cost });
    });
    const studentMap = new Map(students.map((s) => [s.id, s.name]));
    return [...map.entries()]
      .map(([sid, data]) => ({ name: studentMap.get(sid) ?? "(dihapus)", ...data }))
      .sort((a, b) => b.cost - a.cost);
  }, [rekapSessions, students]);

  const rekapTotal = useMemo(() =>
    rekapByStudent.reduce((sum, r) => ({ cost: sum.cost + r.cost, hours: sum.hours + r.hours, count: sum.count + r.count }),
      { cost: 0, hours: 0, count: 0 }),
    [rekapByStudent]);

  const safeNarrativePage      = clampPage(narrativePage, reportSessions.length);
  const paginatedNarrativeSessions = paginateItems(reportSessions, safeNarrativePage);
  const safeRekapStudentPage   = clampPage(rekapStudentPage, rekapByStudent.length);
  const paginatedRekapByStudent = paginateItems(rekapByStudent, safeRekapStudentPage);

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
      const out = await generateNarratives({
        student: { name: student.name, level: student.level },
        month: monthLabel(month),
        sessions: sessions.map((s) => ({
          id: s.id, date: dayLabel(s.date), subject: s.subjects.join(", "),
          shortNote: s.shortNote, mood: s.mood, topic: s.topic,
          needsWork: s.needsWork, predictedGrade: s.predictedGrade,
        })),
      });
      for (const e of out.entries) await updateSession(e.id, { narrative: e.narrative });
      if (draft) await upsertReport({ ...draft, summaryText: out.summary, teacherNote: out.teacherNote, quote: out.quote });
      setMessage("Narasi AI selesai ✓");
    } catch (e) { setMessage("Gagal: " + (e as Error).message); }
    finally { setAiLoading(false); }
  };

  const doExport = async (type: "png" | "pdf") => {
    if (!student || !report || exporting) return;
    const key = type === "png" ? "jpg" : "pdf";
    setExporting(key);
    setMessage("");
    const base = `Laporan-${student.name}-${monthLabel(month)}`.replace(/\s+/g, "-");
    try {
      if (type === "png") await shareFiles(await exportJpeg(base), base);
      else await shareFiles([await exportPdf(base)], base);
      await upsertReport({ ...report, pdfGeneratedAt: new Date().toISOString() });
      setMessage(`✓ File ${key.toUpperCase()} diunduh`);
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
    setEditingSummary(false); setEditingNote(false); setEditingQuote(false);
  };

  if (!students) return <div className="p-4 text-gray-500">Memuat...</div>;

  return (
    <div className="pb-20">
      {/* Tabs */}
      <div className="grid grid-cols-2 bg-gray-100 mx-4 mt-4 rounded-xl p-1">
        <button onClick={() => setActiveTab("laporan")}
          className={`py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === "laporan" ? "bg-white shadow text-blue-700" : "text-gray-500"}`}>
          Laporan Murid
        </button>
        <button onClick={() => setActiveTab("rekap")}
          className={`py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === "rekap" ? "bg-white shadow text-green-700" : "text-gray-500"}`}>
          Rekap Keuangan
        </button>
      </div>

      <div className="p-4 space-y-4">
        {message && (
          <div onClick={() => setMessage("")}
            className={`p-3 rounded-lg text-sm cursor-pointer ${message.includes("✓") ? "bg-green-50 text-green-700" : message.startsWith("Gagal") || message.startsWith("Error") ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}>
            {message}
          </div>
        )}

        {/* ── TAB: LAPORAN MURID ── */}
        {activeTab === "laporan" && (
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
                        onClick={handlePolish} disabled={aiLoading}>
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
                  <div className="flex items-center gap-2">
                    <button className="btn btn-secondary text-sm py-1.5 px-3 flex-shrink-0 whitespace-nowrap"
                      onClick={handleRegenerate}>🎲 Acak</button>
                    <select className="input flex-1 text-sm" value={report.templateKey.layoutId}
                      onChange={(e) => handleCreateOrSwitch(e.target.value)}>
                      {LAYOUTS.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {THEMES.map((t) => {
                      const isActive = report.templateKey.themeId === t.id;
                      const bg = t.bg.includes("gradient") ? t.accent : t.bg;
                      return (
                        <button key={t.id} title={t.name}
                          className={`w-7 h-7 rounded-full border-2 transition-all ${isActive ? "border-gray-800 scale-125 shadow" : "border-transparent hover:border-gray-400"}`}
                          style={{ background: bg }}
                          onClick={async () => {
                            await upsertReport({ ...report, templateKey: { ...report.templateKey, themeId: t.id } });
                          }}
                        />
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-400">{THEMES.find((t) => t.id === report.templateKey.themeId)?.name ?? "—"}</p>
                </div>

                {/* Preview */}
                <div className="max-w-sm mx-auto">
                  <ReportRenderer data={reportData} theme={theme} layoutId={report.templateKey.layoutId} />
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
                <div className="grid grid-cols-2 gap-2">
                  <button className="btn btn-primary text-sm" onClick={() => doExport("png")} disabled={!!exporting}>
                    {exporting === "jpg" ? "⏳ Memproses..." : "⬇️ Unduh JPG"}
                  </button>
                  <button className="btn btn-secondary text-sm" onClick={() => doExport("pdf")} disabled={!!exporting}>
                    {exporting === "pdf" ? "⏳ Memproses..." : "⬇️ Unduh PDF"}
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
                      <p className="font-semibold text-gray-800 text-sm">📝 Teks Laporan</p>
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
                        <label className="label">Catatan Guru</label>
                        {editingNote ? (
                          <div className="space-y-2">
                            <textarea className="input text-sm" rows={2} value={teacherNote}
                              onChange={(e) => setTeacherNote(e.target.value)} />
                            <div className="flex gap-2">
                              <button className="btn btn-primary text-xs" onClick={() => saveReportField("teacherNote", teacherNote)}>Simpan</button>
                              <button className="btn btn-secondary text-xs" onClick={() => setEditingNote(false)}>Batal</button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 cursor-pointer hover:bg-gray-100 min-h-[2.5rem]"
                            onClick={() => { setTeacherNote(report.teacherNote ?? ""); setEditingNote(true); }}>
                            {report.teacherNote || <span className="text-gray-400">Klik untuk tambah catatan...</span>}
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
        )}

        {/* ── TAB: REKAP KEUANGAN ── */}
        {activeTab === "rekap" && (
          <div className="space-y-4">
            {/* Bulan picker */}
            <div className="flex gap-3 items-center">
              <label className="text-sm text-gray-500 flex-shrink-0">Bulan:</label>
              <input className="input flex-1" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            </div>

            {/* PIN gate */}
            {!pinUnlocked ? (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center space-y-4">
                <div className="text-5xl">🔐</div>
                <p className="font-bold text-gray-800 text-lg">Rekap Keuangan</p>
                {!settings?.financialPin ? (
                  <div className="space-y-3 text-left">
                    <p className="text-sm text-gray-500 text-center">Buat PIN 6 digit untuk melindungi data keuangan.</p>
                    <div>
                      <label className="label">PIN Baru</label>
                      <input className="input text-center text-xl tracking-widest font-mono" type="password"
                        inputMode="numeric" maxLength={6} placeholder="••••••"
                        value={pinInput} onChange={(e) => { setPinInput(e.target.value.replace(/\D/g, "").slice(0, 6)); setPinError(""); }} />
                    </div>
                    <div>
                      <label className="label">Konfirmasi PIN</label>
                      <input className={`input text-center text-xl tracking-widest font-mono ${pinError ? "border-red-400" : ""}`}
                        type="password" inputMode="numeric" maxLength={6} placeholder="••••••"
                        value={pinConfirm} onChange={(e) => { setPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 6)); setPinError(""); }} />
                    </div>
                    {pinError && <p className="text-red-500 text-sm">{pinError}</p>}
                    <button disabled={pinInput.length !== 6 || pinConfirm.length !== 6}
                      className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold disabled:opacity-40 hover:bg-blue-700 transition-colors"
                      onClick={async () => {
                        if (pinInput !== pinConfirm) { setPinError("PIN tidak cocok, coba lagi."); return; }
                        const hashedPin = await hashPin(pinInput);
                        await saveSettings({ financialPin: hashedPin });
                        setPinUnlocked(true); setPinInput(""); setPinConfirm(""); setPinError("");
                      }}>
                      Buat PIN & Masuk
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <input className={`input text-center text-2xl tracking-[0.5em] font-mono ${pinError ? "border-red-400" : ""}`}
                      type="password" inputMode="numeric" maxLength={6} placeholder="••••••"
                      value={pinInput} onChange={(e) => { setPinInput(e.target.value.replace(/\D/g, "").slice(0, 6)); setPinError(""); }}
                      onKeyDown={async (e) => {
                        if (e.key !== "Enter") return;
                        const delay = getPinLockoutDelay();
                        if (delay > 0) { setPinError(`Tunggu ${Math.ceil(delay / 1000)} detik.`); return; }
                        const ok = await verifyPin(pinInput, settings.financialPin!);
                        if (ok) { resetPinLockout(); setPinUnlocked(true); setPinInput(""); }
                        else { recordPinFailure(); setPinError("PIN salah. Coba lagi."); setPinInput(""); }
                      }} />
                    {pinError && <p className="text-red-500 text-sm">{pinError}</p>}
                    <button disabled={pinInput.length < 4}
                      className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold disabled:opacity-40 hover:bg-blue-700 transition-colors"
                      onClick={async () => {
                        const delay = getPinLockoutDelay();
                        if (delay > 0) { setPinError(`Tunggu ${Math.ceil(delay / 1000)} detik.`); return; }
                        const ok = await verifyPin(pinInput, settings.financialPin!);
                        if (ok) { resetPinLockout(); setPinUnlocked(true); setPinInput(""); }
                        else { recordPinFailure(); setPinError("PIN salah. Coba lagi."); setPinInput(""); }
                      }}>
                      Masuk
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-gray-700">{monthLabel(month)}</p>
                  <button onClick={() => setPinUnlocked(false)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors">
                    🔒 Kunci
                  </button>
                </div>

                {/* 6-month bar chart */}
                {chartBars.length > 0 && (() => {
                  const maxCost = Math.max(...chartBars.map((b) => b.cost), 1);
                  return (
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                      <p className="text-xs text-gray-400 font-medium mb-3 uppercase tracking-wide">Trend 6 Bulan</p>
                      <div className="flex items-end gap-1.5 h-28">
                        {chartBars.map((b) => {
                          const pct = (b.cost / maxCost) * 100;
                          const isSelected = b.m === month;
                          return (
                            <div key={b.m} className="flex-1 flex flex-col items-center gap-1">
                              <p className="text-xs font-semibold text-green-700" style={{ fontSize: 8 }}>
                                {b.cost > 0 ? formatRupiah(b.cost) : ""}
                              </p>
                              <div className="w-full rounded-t-md transition-all" style={{
                                height: `${Math.max(pct, 4)}%`,
                                background: isSelected ? "#10B981" : "#D1FAE5",
                              }} />
                              <p className="text-xs text-gray-400" style={{ fontSize: 9 }}>{b.label}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Per-student this month */}
                {!rekapSessions ? (
                  <p className="text-gray-400 text-sm">Memuat...</p>
                ) : rekapByStudent.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-3xl mb-2">📭</p>
                    <p className="text-gray-400 text-sm">Belum ada sesi di {monthLabel(month)}.</p>
                  </div>
                ) : (
                  <>
                    {rekapTotal.cost > 0 && (
                      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <p className="text-xs text-gray-400 font-medium mb-3 uppercase tracking-wide">Per Murid</p>
                        <div className="space-y-2">
                          {paginatedRekapByStudent.map((r) => {
                            const pct = Math.round((r.cost / rekapTotal.cost) * 100);
                            return (
                              <div key={r.name}>
                                <div className="flex justify-between text-sm mb-0.5">
                                  <span className="font-medium text-gray-700">{r.name}</span>
                                  <span className="text-green-700 font-semibold">{formatRupiah(r.cost)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                                    <div className="h-2 rounded-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
                                  </div>
                                  <span className="text-xs text-gray-400 w-8 text-right">{pct}%</span>
                                </div>
                                <p className="text-xs text-gray-400">{r.count} sesi · {r.hours}j</p>
                              </div>
                            );
                          })}
                        </div>
                        <PaginationControls
                          page={safeRekapStudentPage}
                          total={rekapByStudent.length}
                          onPageChange={setRekapStudentPage}
                          label="murid"
                        />
                      </div>
                    )}

                    <div className="bg-green-50 rounded-xl px-4 py-4 flex items-center justify-between border border-green-200">
                      <div>
                        <p className="font-bold text-green-900">Total Pemasukan</p>
                        <p className="text-xs text-green-700">{rekapTotal.count} sesi · {rekapTotal.hours}j</p>
                      </div>
                      <p className="text-2xl font-bold text-green-700">{formatRupiah(rekapTotal.cost)}</p>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
