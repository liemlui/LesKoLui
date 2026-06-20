import { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { listStudents, getStudent, listSessionsByStudentMonth, getReport, upsertReport, updateSession } from "../db/repos";
import { pickTemplate } from "../lib/rotation";
import { generateNarratives } from "../lib/aiClient";
import { getTheme, THEMES } from "../template/themes";
import { LAYOUTS } from "../template/layouts";
import { ReportRenderer } from "../template/ReportRenderer";
import { dayLabel, monthLabel, formatRupiah } from "../lib/format";
import { exportPng, exportPdf, shareFiles } from "../lib/exportReport";

export default function MonthlyReportPage() {
  const students = useLiveQuery(() => listStudents(true), []);

  const [studentId, setStudentId] = useState("");
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
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

  const student = useLiveQuery(() => (studentId ? getStudent(studentId) : undefined), [studentId]);
  const sessions = useLiveQuery(() => (studentId ? listSessionsByStudentMonth(studentId, month) : []), [studentId, month]);
  const report = useLiveQuery(() => (studentId ? getReport(studentId, month) : undefined), [studentId, month]);

  const totalHours = useMemo(() => sessions?.reduce((s, x) => s + x.durationHours, 0) ?? 0, [sessions]);
  const totalCost = useMemo(() => sessions?.reduce((s, x) => s + x.cost, 0) ?? 0, [sessions]);

  const theme = report ? getTheme(report.templateKey.themeId) : THEMES[0];

  const reportData = useMemo(() => {
    if (!student || !sessions) return null;
    return {
      studentName: student.name,
      period: monthLabel(month),
      tutorName: "",
      entries: sessions.map((s) => ({
        date: dayLabel(s.date).split(",")[1]?.trim() ?? s.date.slice(5),
        subject: s.subject,
        photoUrl: s.photo ? URL.createObjectURL(s.photo) : undefined,
        narrative: s.narrative ?? s.shortNote,
      })),
      summary: report?.summaryText ?? "",
      teacherNote: report?.teacherNote,
      quote: report?.quote,
    };
  }, [student, sessions, month, report]);

  const handleCreateOrSwitch = async (newLayoutId?: string) => {
    if (!studentId) return;
    try {
      let r = await getReport(studentId, month);
      if (!r) {
        const templateKey = newLayoutId
          ? { themeId: theme.id, layoutId: newLayoutId }
          : await pickTemplate(studentId);
        const id = crypto.randomUUID();
        await upsertReport({
          id, studentId, month, sessionIds: sessions?.map((s) => s.id) ?? [],
          templateKey, summaryText: "", totalHours, totalCost,
          createdAt: new Date().toISOString(),
        });
        setMessage("Laporan baru dibuat!");
      } else if (newLayoutId) {
        await upsertReport({
          ...r, templateKey: { themeId: r.templateKey.themeId, layoutId: newLayoutId },
        });
        setMessage("Desain diganti!");
      } else {
        setMessage("Laporan sudah ada untuk bulan ini.");
      }
    } catch (e) {
      setMessage("Error: " + (e as Error).message);
    }
  };

  const handleRegenerate = async () => {
    if (!studentId || !report) return;
    const newKey = await pickTemplate(studentId);
    await upsertReport({ ...report, templateKey: newKey });
    setMessage("Desain diganti!");
  };

  const handlePolish = async () => {
    if (!student || !sessions || sessions.length === 0) return;
    if (!navigator.onLine) { setMessage("Offline — narasi akan dibuat saat online."); return; }
    setAiLoading(true);
    try {
      const out = await generateNarratives({
        student: { name: student.name, level: student.level },
        month: monthLabel(month),
        sessions: sessions.map((s) => ({
          id: s.id, date: dayLabel(s.date), subject: s.subject,
          shortNote: s.shortNote, mood: s.mood, topic: s.topic,
          needsWork: s.needsWork, predictedGrade: s.predictedGrade,
        })),
      });
      for (const e of out.entries) await updateSession(e.id, { narrative: e.narrative });
      const r = await getReport(studentId, month);
      if (r) await upsertReport({
        ...r, summaryText: out.summary, teacherNote: out.teacherNote, quote: out.quote,
      });
      setMessage("Narasi berhasil dibuat ✓");
    } catch (e) {
      setMessage("Gagal: " + (e as Error).message);
    } finally {
      setAiLoading(false);
    }
  };

  const saveNarrative = async (sessionId: string) => {
    await updateSession(sessionId, { narrative: editText });
    setEditingNarrative(null);
  };

  const saveReportField = async (field: "summaryText" | "teacherNote" | "quote", value: string) => {
    if (!report) return;
    await upsertReport({ ...report, [field]: value });
    setEditingSummary(false);
    setEditingNote(false);
    setEditingQuote(false);
  };

  if (!students) return <div className="p-4 text-gray-500">Memuat...</div>;

  return (
    <div className="p-4 space-y-4 pb-20">
      <h1 className="text-2xl font-bold">Laporan Bulanan</h1>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.includes("✓") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
          {message}
        </div>
      )}

      {/* Student + Month picker */}
      <div className="flex gap-3">
        <select className="input flex-1" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
          <option value="">Pilih murid...</option>
          {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input className="input w-40" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>

      {!studentId && <p className="text-gray-400 text-center py-8">Pilih murid dan bulan untuk memulai.</p>}

      {student && sessions && (
        <>
          {/* Stats */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex justify-around text-center">
            <div><p className="text-lg font-bold">{sessions.length}</p><p className="text-xs text-gray-500">Sesi</p></div>
            <div><p className="text-lg font-bold">{totalHours}j</p><p className="text-xs text-gray-500">Jam</p></div>
            <div><p className="text-lg font-bold">{formatRupiah(totalCost)}</p><p className="text-xs text-gray-500">Biaya</p></div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary text-sm" onClick={() => handleCreateOrSwitch()}>
              {report ? "Update Laporan" : "Buat Laporan"}
            </button>
            {report && (
              <>
                {/* Layout switcher */}
                <select className="input w-auto text-sm" value={report.templateKey.layoutId}
                  onChange={(e) => handleCreateOrSwitch(e.target.value)}>
                  {LAYOUTS.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                <button className="btn-secondary text-sm" onClick={handleRegenerate}>Ganti Desain</button>
                <button className="btn-secondary text-sm" onClick={handlePolish} disabled={aiLoading}>
                  {aiLoading ? "Memproses AI..." : "Polish AI"}
                </button>
                <button className="btn-primary text-sm" onClick={async () => {
                  if (!student) return;
                  const base = `Laporan-${student.name}-${monthLabel(month)}`.replace(/\s+/g, "-");
                  try { await shareFiles(await exportPng(base), base); setMessage("Diekspor ✓"); }
                  catch (e) { setMessage("Gagal: " + (e as Error).message); }
                }}>Bagikan Gambar</button>
                <button className="btn-secondary text-sm" onClick={async () => {
                  if (!student) return;
                  const base = `Laporan-${student.name}-${monthLabel(month)}`.replace(/\s+/g, "-");
                  try { await shareFiles([await exportPdf(base)], base); setMessage("PDF diekspor ✓"); }
                  catch (e) { setMessage("Gagal: " + (e as Error).message); }
                }}>Ekspor PDF</button>
              </>
            )}
          </div>

          {/* AI / Editable fields */}
          {report && (
            <div className="space-y-3">
              {/* Summary */}
              <div>
                <label className="label">Ringkasan (Absensi)</label>
                {editingSummary ? (
                  <div className="space-y-2">
                    <textarea className="input" rows={3} value={summaryText} onChange={(e) => setSummaryText(e.target.value)} />
                    <div className="flex gap-2">
                      <button className="btn-primary text-sm" onClick={() => saveReportField("summaryText", summaryText)}>Simpan</button>
                      <button className="btn-secondary text-sm" onClick={() => setEditingSummary(false)}>Batal</button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 cursor-pointer hover:bg-gray-100"
                    onClick={() => { setSummaryText(report.summaryText); setEditingSummary(true); }}>
                    {report.summaryText || "Klik untuk tambah ringkasan..."}
                  </p>
                )}
              </div>

              {/* Teacher Note */}
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
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 cursor-pointer hover:bg-gray-100"
                    onClick={() => { setTeacherNote(report.teacherNote ?? ""); setEditingNote(true); }}>
                    {report.teacherNote || "Klik untuk tambah catatan..."}
                  </p>
                )}
              </div>

              {/* Quote */}
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
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 italic cursor-pointer hover:bg-gray-100"
                    onClick={() => { setQuoteText(report.quote ?? ""); setEditingQuote(true); }}>
                    {report.quote ? `"${report.quote}"` : "Klik untuk tambah kutipan..."}
                  </p>
                )}
              </div>

              {/* Session narratives */}
              {sessions.map((s) => (
                <div key={s.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                  <p className="text-xs text-gray-400 mb-1">{dayLabel(s.date)} — {s.subject}</p>
                  <p className="text-xs text-gray-500 mb-1">Catatan: {s.shortNote}</p>
                  {editingNarrative === s.id ? (
                    <div className="space-y-2">
                      <textarea className="input" rows={3} value={editText} onChange={(e) => setEditText(e.target.value)} />
                      <div className="flex gap-2">
                        <button className="btn-primary text-sm" onClick={() => saveNarrative(s.id)}>Simpan</button>
                        <button className="btn-secondary text-sm" onClick={() => setEditingNarrative(null)}>Batal</button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700 cursor-pointer hover:text-blue-600"
                      onClick={() => { setEditText(s.narrative ?? s.shortNote); setEditingNarrative(s.id); }}>
                      {s.narrative ?? s.shortNote}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Report Preview */}
          {report && reportData && (
            <div className="mt-4">
              <h2 className="text-lg font-semibold mb-2">Pratinjau</h2>
              <div className="max-w-sm mx-auto">
                <ReportRenderer data={reportData} theme={theme} layoutId={report.templateKey.layoutId} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
