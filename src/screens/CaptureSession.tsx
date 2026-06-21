import { useState, useRef, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { listStudents, getStudent, createSession, recentShortNotes } from "../db/repos";
import { compressPhoto } from "../lib/foto";
import { todayWIB } from "../lib/format";
import { MIN_DURATION } from "../db/types";

const DURATIONS = [1, 1.5, 2, 2.5, 3, 3.5, 4];
const MOODS = [
  { v: "Semangat", icon: "🔥" },
  { v: "Fokus",    icon: "🎯" },
  { v: "Biasa",    icon: "😐" },
  { v: "Lelah",    icon: "😴" },
  { v: "Kesulitan",icon: "😰" },
];

function maxBackDate(days = 14): string {
  const [y, m, d] = todayWIB().split("-").map(Number);
  const dt = new Date(y, m - 1, d - days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

export default function CaptureSession() {
  const students = useLiveQuery(() => listStudents(true), []);
  const allNotes = useLiveQuery(() => recentShortNotes(50), []);

  const today = todayWIB();

  const [studentId,       setStudentId]       = useState("");
  const [studentSubjects, setStudentSubjects]  = useState<string[]>([]);
  const [subjects,        setSubjects]         = useState<string[]>([]);
  const [showCustom,      setShowCustom]       = useState(false);
  const [customSubject,   setCustomSubject]    = useState("");
  const [shortNote,       setShortNote]        = useState("");
  const [photo,           setPhoto]            = useState<Blob | undefined>();
  const [photoUrl,        setPhotoUrl]         = useState<string | undefined>();
  const [duration,        setDuration]         = useState(MIN_DURATION);
  const [mood,            setMood]             = useState<string | undefined>();
  const [topic,           setTopic]            = useState("");
  const [needsWork,       setNeedsWork]        = useState("");
  const [predictedGrade,  setPredictedGrade]   = useState("");
  const [sessionDate,     setSessionDate]      = useState(today);
  const [showDetail,      setShowDetail]       = useState(false);
  const [saving,          setSaving]           = useState(false);
  const [message,         setMessage]          = useState("");

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!photo) { setPhotoUrl(undefined); return; }
    const url = URL.createObjectURL(photo);
    setPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  useEffect(() => {
    if (!studentId) { setStudentSubjects([]); setSubjects([]); return; }
    getStudent(studentId).then((s) => {
      setStudentSubjects(s?.subjects ?? []);
      setSubjects([]);
    });
  }, [studentId]);

  const suggestions = shortNote.length > 1
    ? (allNotes ?? []).filter((n) => n.toLowerCase().includes(shortNote.toLowerCase()) && n !== shortNote).slice(0, 4)
    : [];

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { setPhoto(await compressPhoto(file)); }
    catch { setMessage("Gagal kompres foto"); }
    e.target.value = "";
  };

  const toggleSubject = (s: string) =>
    setSubjects((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);

  const reset = () => {
    setSubjects([]); setShowCustom(false); setCustomSubject(""); setShortNote(""); setPhoto(undefined);
    setMood(undefined); setTopic(""); setNeedsWork(""); setPredictedGrade("");
    setDuration(MIN_DURATION); setShowDetail(false); setSessionDate(today);
  };

  const handleSave = async () => {
    if (!studentId) { setMessage("Pilih murid dulu."); return; }
    if (studentSubjects.length > 0 && subjects.length === 0) {
      setMessage("Pilih minimal 1 mata pelajaran."); return;
    }
    if (!shortNote.trim()) { setMessage("Tulis catatan singkat."); return; }
    setSaving(true);
    try {
      await createSession({
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
        status: "DONE",
      });
      setMessage("Sesi tersimpan ✓");
      reset();
    } catch (e) {
      setMessage("Gagal: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (!students) return <div className="p-4 text-gray-500">Memuat...</div>;

  return (
    <div className="p-4 space-y-4 pb-24">
      <h1 className="text-2xl font-bold">Catat Sesi</h1>

      {message && (
        <div onClick={() => setMessage("")}
          className={`p-3 rounded-xl text-sm cursor-pointer font-medium ${message.includes("✓") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
          {message}
        </div>
      )}

      {/* Murid */}
      <div>
        <label className="label">Murid</label>
        <select className="input" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
          <option value="">Pilih murid...</option>
          {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* Tanggal sesi */}
      <div>
        <label className="label">Tanggal Sesi</label>
        <input className="input" type="date" value={sessionDate}
          min={maxBackDate(14)} max={today}
          onChange={(e) => setSessionDate(e.target.value)} />
        {sessionDate !== today && (
          <p className="text-xs text-orange-500 mt-1">Merekam sesi masa lalu</p>
        )}
      </div>

      {studentId && (
        <>
          {/* Foto sesi */}
          <input ref={fileRef} type="file" accept="image/*" capture="environment"
            onChange={handlePhoto} className="hidden" />

          {photoUrl ? (
            <div className="relative inline-block">
              <img src={photoUrl} alt="preview" className="h-36 w-36 object-cover rounded-xl shadow" />
              <button onClick={() => setPhoto(undefined)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center shadow-md">✕</button>
              <button onClick={() => fileRef.current?.click()}
                className="absolute bottom-1.5 right-1.5 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">Ganti</button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center justify-center gap-2 w-full py-4 rounded-xl border-2 border-dashed border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors">
              <span className="text-2xl">📷</span>
              <span className="font-medium text-sm">Ambil Foto Sesi (opsional)</span>
            </button>
          )}

          {/* Mapel */}
          <div>
            <label className="label">
              Mata Pelajaran
              {studentSubjects.length > 0
                ? <span className="text-gray-400 font-normal text-xs ml-1">(pilih yang relevan)</span>
                : <span className="text-gray-400 font-normal text-xs ml-1">(opsional)</span>}
            </label>
            <div className="flex flex-wrap gap-2 mt-1">
              {/* Registered subjects */}
              {studentSubjects.map((s) => (
                <button key={s} type="button"
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    subjects.includes(s) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300"
                  }`}
                  onClick={() => toggleSubject(s)}>{s}</button>
              ))}
              {/* Custom subjects added this session */}
              {subjects.filter((s) => !studentSubjects.includes(s)).map((s) => (
                <button key={s} type="button"
                  className="px-3 py-1.5 rounded-full text-sm font-medium border bg-purple-600 text-white border-purple-600 flex items-center gap-1"
                  onClick={() => setSubjects((prev) => prev.filter((x) => x !== s))}>
                  {s} <span className="text-purple-200 text-xs">✕</span>
                </button>
              ))}
              {/* Lainnya chip */}
              <button type="button"
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  showCustom ? "bg-purple-100 text-purple-700 border-purple-300" : "bg-white text-gray-500 border-dashed border-gray-300"
                }`}
                onClick={() => setShowCustom(!showCustom)}>
                + Lainnya
              </button>
            </div>
            {showCustom && (
              <div className="flex gap-2 mt-2">
                <input className="input flex-1" placeholder="Ketik mapel lain..." value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const val = customSubject.trim();
                      if (val && !subjects.includes(val)) setSubjects((prev) => [...prev, val]);
                      setCustomSubject(""); setShowCustom(false);
                    }
                  }} />
                <button type="button"
                  className="px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-semibold disabled:opacity-40"
                  disabled={!customSubject.trim()}
                  onClick={() => {
                    const val = customSubject.trim();
                    if (val && !subjects.includes(val)) setSubjects((prev) => [...prev, val]);
                    setCustomSubject(""); setShowCustom(false);
                  }}>Tambah</button>
              </div>
            )}
          </div>

          {/* Catatan singkat */}
          <div>
            <label className="label">Catatan Singkat</label>
            <textarea className="input" rows={2} value={shortNote}
              onChange={(e) => setShortNote(e.target.value)}
              placeholder="Apa yang dibahas hari ini?" />
            {suggestions.length > 0 && (
              <div className="mt-1 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                {suggestions.map((s) => (
                  <button key={s} type="button"
                    className="block w-full text-left text-sm text-blue-600 hover:bg-blue-50 px-3 py-2 border-b border-gray-100 last:border-0"
                    onClick={() => setShortNote(s)}>{s}</button>
                ))}
              </div>
            )}
          </div>

          {/* Durasi */}
          <div>
            <label className="label">Durasi</label>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <button key={d} type="button"
                  className={`px-3 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                    duration === d ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200"
                  }`}
                  onClick={() => setDuration(d)}>{d}j</button>
              ))}
            </div>
          </div>

          {/* Mood */}
          <div>
            <label className="label">Mood Murid (opsional)</label>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((m) => (
                <button key={m.v} type="button"
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    mood === m.v ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200"
                  }`}
                  onClick={() => setMood(mood === m.v ? undefined : m.v)}>
                  {m.icon} {m.v}
                </button>
              ))}
            </div>
          </div>

          {/* Detail opsional */}
          <button type="button"
            className="flex items-center justify-center gap-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-4 py-2.5 rounded-xl transition-colors w-full"
            onClick={() => setShowDetail(!showDetail)}>
            {showDetail ? "▲ Sembunyikan detail" : "▼ Tambah detail (topik, prediksi nilai, catatan PR)"}
          </button>

          {showDetail && (
            <div className="space-y-3 bg-gray-50 rounded-xl p-4">
              <div>
                <label className="label">Topik yang dibahas</label>
                <input className="input" placeholder="mis. Paper 3, Integral, Stoikiometri" value={topic}
                  onChange={(e) => setTopic(e.target.value)} />
              </div>
              <div>
                <label className="label">Perlu perhatian lebih</label>
                <input className="input" placeholder="mis. ketelitian angka, time management" value={needsWork}
                  onChange={(e) => setNeedsWork(e.target.value)} />
              </div>
              <div>
                <label className="label">Prediksi nilai</label>
                <input className="input" placeholder="mis. 5–6/7, B+" value={predictedGrade}
                  onChange={(e) => setPredictedGrade(e.target.value)} />
              </div>
            </div>
          )}

          <button onClick={handleSave} disabled={saving}
            className="w-full py-3.5 rounded-xl text-white font-semibold text-base transition-colors disabled:opacity-50"
            style={{ background: saving ? "#93c5fd" : "#2563eb" }}>
            {saving ? "Menyimpan..." : "Simpan Sesi"}
          </button>
        </>
      )}
    </div>
  );
}
