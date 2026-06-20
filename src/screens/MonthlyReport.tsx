import { useState, useMemo, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  listStudents, getStudent, getSettings,
  listSessionsByStudentMonth, listSessionsForMonth, listDoneSessionsForDateRange,
  getReport, upsertReport, updateSession,
} from "../db/repos";
import { pickTemplate } from "../lib/rotation";
import { generateNarratives } from "../lib/aiClient";
import { getTheme, THEMES } from "../template/themes";
import { LAYOUTS } from "../template/layouts";
import { ReportRenderer } from "../template/ReportRenderer";
import { dayLabel, monthLabel, formatRupiah, todayWIB, monthOf } from "../lib/format";
import { exportPng, exportPdf, shareFiles } from "../lib/exportReport";

type Tab = "laporan" | "rekap";

export default function MonthlyReportPage() {
  const students = useLiveQuery(() => listStudents(true), []);
  const settings = useLiveQuery(() => getSettings(), []);

  const [activeTab, setActiveTab] = useState<Tab>("laporan");
  const [studentId, setStudentId] = useState("");
  const [month, setMonth] = useState(() => monthOf(todayWIB()));

  // PIN lock for rekap keuangan
  const [pinUnlocked,  setPinUnlocked]  = useState(false);
  const [pinInput,     setPinInput]     = useState("");
  const [pinConfirm,   setPinConfirm]   = useState("");
  const [pinError,     setPinError]     = useState("");

  const [editingNarrative, setEditingNarrative] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editingSummary, setEditingSummary] = useState(false);
  const [summaryText, setSummaryText] = useState("");
  const [editingNote, setEditingNote] = useState(false);
  const [teacherNote, setTeacherNote] = useState("");
  const [editingQuote, setEditingQuote] = useState(false);
  const [quoteText, setQuoteText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [message, setMessage] = useState("");

  const student  = useLiveQuery(() => (studentId ? getStudent(studentId) : undefined), [studentId]);
  const sessions = useLiveQuery(() => (studentId ? listSessionsByStudentMonth(studentId, month) : []), [studentId, month]);
  const report   = useLiveQuery(() => (studentId ? getReport(studentId, month) : undefined), [studentId, month]);

  // Rekap keuangan: semua sesi semua murid di bulan ini
  const rekapSessions = useLiveQuery(
    () => (activeTab === "rekap" && pinUnlocked ? listSessionsForMonth(month) : []),
    [activeTab, pinUnlocked, month]
  );

  // 6-month chart: last 6 months including current
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
      const label = new Date(m + "-01").toLocaleDateString("id-ID", { month: "short" });
      return { m, label, cost };
    });
  }, [chartSessions, chartData]);

  const totalHours = useMemo(() => sessions?.reduce((s, x) => s + x.durationHours, 0) ?? 0, [sessions]);
  const totalCost  = useMemo(() => sessions?.reduce((s, x) => s + x.cost, 0) ?? 0, [sessions]);

  const theme = report ? getTheme(report.templateKey.themeId) : THEMES[0];

  // ReportData state + blob URL lifecycle management
  const [reportData, setReportData] = useState<{
    studentName: string; period: string; tutorName: string; logoUrl?: string;
    entries: { date: string; subject: string; photoUrl?: string; narrative: string }[];
    summary: string; teacherNote?: string; quote?: string;
  } | null>(null);

  useEffect(() => {
    if (!student || !sessions) { setReportData(null); return; }
    const urls: string[] = [];

    let logoUrl: string | undefined;
    if (settings?.logo) {
      logoUrl = URL.createObjectURL(settings.logo);
      urls.push(logoUrl);
    }

    const data = {
      studentName: student.name,
      period: monthLabel(month),
      tutorName: settings?.tutorProfile?.name ?? "",
      logoUrl,
      entries: sessions.map((s) => {
        const photoUrl = s.photo ? URL.createObjectURL(s.photo) : undefined;
        if (photoUrl) urls.push(photoUrl);
        return {
          date: dayLabel(s.date).split(",")[1]?.trim() ?? s.date.slice(5),
          subject: s.subjects.join(", "),
          photoUrl,
          narrative: s.narrative ?? s.shortNote,
        };
      }),
      summary: report?.summaryText ?? "",
      teacherNote: report?.teacherNote,
      quote: report?.quote,
    };
    setReportData(data);
    return () => urls.forEach(URL.revokeObjectURL);
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

  const handleCreateOrSwitch = async (newLayoutId?: string) => {
    if (!studentId) return;
    try {
      const r = await getReport(studentId, month);
      if (!r) {
        const templateKey = newLayoutId ? { themeId: theme.id, layoutId: newLayoutId } : await pickTemplate(studentId);
        await upsertReport({
          id: crypto.randomUUID(), studentId, month,
          sessionIds: sessions?.map((s) => s.id) ?? [],
          templateKey, summaryText: "", totalHours, totalCost,
          createdAt: new Date().toISOString(),
        });
        setMessage("Laporan dibuat!");
      } else if (newLayoutId) {
        await upsertReport({ ...r, templateKey: { themeId: r.templateKey.themeId, layoutId: newLayoutId } });
        setMessage("Layout diganti!");
      } else {
        setMessage("Laporan sudah ada — klik 'Ganti Desain' untuk tema baru.");
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
      const r = await getReport(studentId, month);
      if (r) await upsertReport({ ...r, summaryText: out.summary, teacherNote: out.teacherNote, quote: out.quote });
      setMessage("Narasi AI selesai ✓");
    } catch (e) { setMessage("Gagal: " + (e as Error).message); }
    finally { setAiLoading(false); }
  };

  const doExport = async (type: "png" | "pdf") => {
    if (!student || !report) return;
    const base = `Laporan-${student.name}-${monthLabel(month)}`.replace(/\s+/g, "-");
    try {
      if (type === "png") await shareFiles(await exportPng(base), base);
      else await shareFiles([await exportPdf(base)], base);
      await upsertReport({ ...report, pdfGeneratedAt: new Date().toISOString() });
      setMessage("Diekspor ✓");
    } catch (e) { setMessage("Gagal ekspor: " + (e as Error).message); }
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
          className={`p-3 rounded-lg text-sm cursor-pointer ${message.includes("✓") ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"}`}>
          {message}
        </div>
      )}

      {/* Bulan picker — shared */}
      <div className="flex gap-3 items-center">
        <label className="text-sm text-gray-500 flex-shrink-0">Bulan:</label>
        <input className="input flex-1" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>

      {activeTab === "laporan" && (
      <div className="space-y-4">
      {/* Pilih murid */}
      <select className="input" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
        <option value="">Pilih murid...</option>
        {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>

      {/* ── PER-MURID: Laporan untuk Orang Tua ── */}
      {student && sessions && (
        <>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex justify-around text-center">
            <div><p className="text-lg font-bold">{sessions.length}</p><p className="text-xs text-gray-500">Sesi</p></div>
            <div><p className="text-lg font-bold">{totalHours}j</p><p className="text-xs text-gray-500">Jam</p></div>
          </div>

          {/* AI Button — tersedia begitu ada sesi */}
          {sessions.length > 0 && (
            <button className="w-full py-3 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
              onClick={handlePolish} disabled={aiLoading}>
              {aiLoading
                ? <><span className="animate-spin">⏳</span> Sedang memproses AI...</>
                : <><span>✨</span> Isi Narasi dengan DeepSeek AI</>}
            </button>
          )}

          <div className="flex flex-wrap gap-2">
            <button className="btn-primary text-sm" onClick={() => handleCreateOrSwitch()}>
              {report ? "Update Laporan" : "Buat Laporan"}
            </button>
            {report && (
              <>
                <select className="input w-auto text-sm" value={report.templateKey.layoutId}
                  onChange={(e) => handleCreateOrSwitch(e.target.value)}>
                  {LAYOUTS.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                <button className="btn-secondary text-sm" onClick={handleRegenerate}>Ganti Desain</button>
                <button className="btn-primary text-sm" onClick={() => doExport("png")}>Bagikan Gambar</button>
                <button className="btn-secondary text-sm" onClick={() => doExport("pdf")}>Ekspor PDF</button>
              </>
            )}
          </div>

          {report && (
            <div className="space-y-3">
              {/* Ringkasan */}
              <div>
                <label className="label">Ringkasan</label>
                {editingSummary ? (
                  <div className="space-y-2">
                    <textarea className="input" rows={3} value={summaryText} onChange={(e) => setSummaryText(e.target.value)} />
                    <div className="flex gap-2">
                      <button className="btn-primary text-sm" onClick={() => saveReportField("summaryText", summaryText)}>Simpan</button>
                      <button className="btn-secondary text-sm" onClick={() => setEditingSummary(false)}>Batal</button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 cursor-pointer hover:bg-gray-100 min-h-[2.5rem]"
                    onClick={() => { setSummaryText(report.summaryText); setEditingSummary(true); }}>
                    {report.summaryText || <span className="text-gray-400">Klik untuk tambah ringkasan...</span>}
                  </p>
                )}
              </div>

              {/* Catatan Guru */}
              <div>
                <label className="label">Catatan Guru</label>
                {editingNote ? (
                  <div className="space-y-2">
                    <textarea className="input" rows={2} value={teacherNote} onChange={(e) => setTeacherNote(e.target.value)} />
                    <div className="flex gap-2">
                      <button className="btn-primary text-sm" onClick={() => saveReportField("teacherNote", teacherNote)}>Simpan</button>
                      <button className="btn-secondary text-sm" onClick={() => setEditingNote(false)}>Batal</button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 cursor-pointer hover:bg-gray-100 min-h-[2.5rem]"
                    onClick={() => { setTeacherNote(report.teacherNote ?? ""); setEditingNote(true); }}>
                    {report.teacherNote || <span className="text-gray-400">Klik untuk tambah catatan...</span>}
                  </p>
                )}
              </div>

              {/* Kutipan */}
              <div>
                <label className="label">Kutipan</label>
                {editingQuote ? (
                  <div className="space-y-2">
                    <input className="input" value={quoteText} onChange={(e) => setQuoteText(e.target.value)} />
                    <div className="flex gap-2">
                      <button className="btn-primary text-sm" onClick={() => saveReportField("quote", quoteText)}>Simpan</button>
                      <button className="btn-secondary text-sm" onClick={() => setEditingQuote(false)}>Batal</button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 italic cursor-pointer hover:bg-gray-100 min-h-[2.5rem]"
                    onClick={() => { setQuoteText(report.quote ?? ""); setEditingQuote(true); }}>
                    {report.quote ? `"${report.quote}"` : <span className="text-gray-400 not-italic">Klik untuk tambah kutipan...</span>}
                  </p>
                )}
              </div>

              {/* Narasi per sesi */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-600">Narasi Sesi</p>
                {sessions.map((s) => (
                  <div key={s.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                    <p className="text-xs text-gray-400 mb-0.5">{dayLabel(s.date)} — {s.subjects.join(", ")}</p>
                    <p className="text-xs text-gray-400 mb-1">{s.shortNote}</p>
                    {editingNarrative === s.id ? (
                      <div className="space-y-2">
                        <textarea className="input" rows={3} value={editText} onChange={(e) => setEditText(e.target.value)} />
                        <div className="flex gap-2">
                          <button className="btn-primary text-sm" onClick={() => saveNarrative(s.id)}>Simpan</button>
                          <button className="btn-secondary text-sm" onClick={() => setEditingNarrative(null)}>Batal</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 cursor-pointer group"
                        onClick={() => { setEditText(s.narrative ?? s.shortNote); setEditingNarrative(s.id); }}>
                        <p className="text-sm text-gray-700 flex-1 group-hover:text-blue-700 transition-colors">
                          {s.narrative ?? s.shortNote}
                        </p>
                        <span className="text-gray-300 group-hover:text-blue-400 text-xs flex-shrink-0 pt-0.5 transition-colors">✏️</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {report && reportData && (
            <div className="mt-4">
              <p className="text-sm font-semibold text-gray-600 mb-2">Pratinjau</p>
              <div className="max-w-sm mx-auto">
                <ReportRenderer data={reportData} theme={theme} layoutId={report.templateKey.layoutId} />
              </div>
            </div>
          )}
        </>
      )}

      </div>
      )}

      {/* ── TAB: REKAP KEUANGAN ── */}
      {activeTab === "rekap" && (
        <div className="space-y-4">
          {/* PIN gate */}
          {!pinUnlocked ? (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center space-y-4">
              <div className="text-5xl">🔐</div>
              <p className="font-bold text-gray-800 text-lg">Rekap Keuangan</p>
              {!settings?.financialPin ? (
                <div className="space-y-3 text-left">
                  <p className="text-sm text-gray-500 text-center">Buat PIN 4 digit untuk melindungi data keuangan.</p>
                  <div>
                    <label className="label">PIN Baru</label>
                    <input className="input text-center text-xl tracking-widest font-mono" type="password"
                      inputMode="numeric" maxLength={4} placeholder="••••"
                      value={pinInput} onChange={(e) => { setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4)); setPinError(""); }} />
                  </div>
                  <div>
                    <label className="label">Konfirmasi PIN</label>
                    <input className={`input text-center text-xl tracking-widest font-mono ${pinError ? "border-red-400" : ""}`}
                      type="password" inputMode="numeric" maxLength={4} placeholder="••••"
                      value={pinConfirm} onChange={(e) => { setPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 4)); setPinError(""); }} />
                  </div>
                  {pinError && <p className="text-red-500 text-sm">{pinError}</p>}
                  <button disabled={pinInput.length !== 4 || pinConfirm.length !== 4}
                    className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold disabled:opacity-40 hover:bg-blue-700 transition-colors"
                    onClick={async () => {
                      if (pinInput !== pinConfirm) { setPinError("PIN tidak cocok, coba lagi."); return; }
                      const s = await getSettings();
                      await (await import("../db/repos")).saveSettings({ ...s, financialPin: pinInput });
                      setPinUnlocked(true); setPinInput(""); setPinConfirm(""); setPinError("");
                    }}>
                    Buat PIN & Masuk
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <input className={`input text-center text-2xl tracking-[0.5em] font-mono ${pinError ? "border-red-400" : ""}`}
                    type="password" inputMode="numeric" maxLength={4} placeholder="••••"
                    value={pinInput} onChange={(e) => { setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4)); setPinError(""); }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        if (pinInput === settings.financialPin) { setPinUnlocked(true); setPinInput(""); }
                        else { setPinError("PIN salah. Coba lagi."); setPinInput(""); }
                      }
                    }} />
                  {pinError && <p className="text-red-500 text-sm">{pinError}</p>}
                  <button disabled={pinInput.length !== 4}
                    className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold disabled:opacity-40 hover:bg-blue-700 transition-colors"
                    onClick={() => {
                      if (pinInput === settings.financialPin) { setPinUnlocked(true); setPinInput(""); }
                      else { setPinError("PIN salah. Coba lagi."); setPinInput(""); }
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
                  {/* Donut-style per-student breakdown */}
                  {rekapTotal.cost > 0 && (
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                      <p className="text-xs text-gray-400 font-medium mb-3 uppercase tracking-wide">Per Murid</p>
                      <div className="space-y-2">
                        {rekapByStudent.map((r) => {
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
