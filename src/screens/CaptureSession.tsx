import { useState, useRef, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { listStudents, getStudent, createSession, recentShortNotes } from "../db/repos";
import { compressPhoto, blobUrl } from "../lib/foto";
import { todayWIB, formatRupiah } from "../lib/format";
import { MIN_DURATION, DURATION_STEP } from "../db/types";
import CaptureChips from "../components/CaptureChips";

export default function CaptureSession() {
  const students = useLiveQuery(() => listStudents(true), []);
  const allNotes = useLiveQuery(() => recentShortNotes(50), []);

  const [studentId, setStudentId] = useState("");
  const [subject, setSubject] = useState("");
  const [shortNote, setShortNote] = useState("");
  const [photo, setPhoto] = useState<Blob | undefined>();
  const [duration, setDuration] = useState(MIN_DURATION);
  const [mood, setMood] = useState<string | undefined>();
  const [topic, setTopic] = useState("");
  const [needsWork, setNeedsWork] = useState("");
  const [predictedGrade, setPredictedGrade] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [studentSubjects, setStudentSubjects] = useState<string[]>([]);

  useEffect(() => {
    if (studentId) {
      getStudent(studentId).then((s) => setStudentSubjects(s?.subjects ?? []));
    }
  }, [studentId]);

  const suggestions = (allNotes ?? [])
    .filter((n) => n.toLowerCase().includes(shortNote.toLowerCase()) && n !== shortNote)
    .slice(0, 5);

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressPhoto(file);
        setPhoto(compressed);
      } catch {
        setMessage("Gagal kompres foto");
      }
    }
  };

  const handleSave = async () => {
    if (!studentId || !subject || !shortNote.trim()) {
      setMessage("Lengkapi murid, mapel, dan catatan.");
      return;
    }
    setSaving(true);
    try {
      await createSession({
        studentId,
        date: todayWIB(),
        durationHours: duration,
        subject,
        photo,
        shortNote: shortNote.trim(),
        mood,
        topic: topic.trim() || undefined,
        needsWork: needsWork.trim() || undefined,
        predictedGrade: predictedGrade.trim() || undefined,
        status: "DONE",
      });
      setMessage("Sesi tersimpan ✓");
      // Reset
      setShortNote("");
      setPhoto(undefined);
      setMood(undefined);
      setTopic("");
      setNeedsWork("");
      setPredictedGrade("");
      setDuration(MIN_DURATION);
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      setMessage("Gagal: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const photoUrl = blobUrl(photo);

  if (!students) return <div className="p-4 text-gray-500">Memuat...</div>;

  const cost = duration * (students.find((s) => s.id === studentId)?.hourlyRate ?? 0);

  return (
    <div className="p-4 space-y-4 pb-20">
      <h1 className="text-2xl font-bold">Catat Sesi</h1>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.includes("✓") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
          {message}
        </div>
      )}

      {/* Student */}
      <div>
        <label className="label">Murid</label>
        <select className="input" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
          <option value="">Pilih murid...</option>
          {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* Subject */}
      <div>
        <label className="label">Mata Pelajaran</label>
        <select className="input" value={subject} onChange={(e) => setSubject(e.target.value)} disabled={!studentId}>
          <option value="">Pilih mapel...</option>
          {studentSubjects.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Photo */}
      <div>
        <label className="label">Foto (opsional)</label>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="text-sm" />
        {photoUrl && <img src={photoUrl} alt="preview" className="mt-2 h-32 w-32 object-cover rounded-lg" />}
      </div>

      {/* Short Note */}
      <div>
        <label className="label">Catatan</label>
        <textarea className="input" rows={3} value={shortNote} onChange={(e) => setShortNote(e.target.value)} placeholder="Apa yang dibahas hari ini?" required />
        {suggestions.length > 0 && (
          <div className="mt-1 space-y-1">
            {suggestions.map((s) => (
              <button key={s} type="button" className="block text-left text-sm text-blue-600 hover:bg-blue-50 w-full px-2 py-1 rounded"
                onClick={() => setShortNote(s)}>{s}</button>
            ))}
          </div>
        )}
      </div>

      {/* Chips */}
      <CaptureChips
        mood={mood} topic={topic} needsWork={needsWork} predictedGrade={predictedGrade}
        onMoodChange={setMood} onTopicChange={setTopic} onNeedsWorkChange={setNeedsWork} onGradeChange={setPredictedGrade}
      />

      {/* Duration */}
      <div>
        <label className="label">Durasi ({duration} jam)</label>
        <input type="range" min={MIN_DURATION} max={5} step={DURATION_STEP} value={duration}
          onChange={(e) => setDuration(Number(e.target.value))} className="w-full" />
        <div className="flex justify-between text-xs text-gray-400">
          <span>{MIN_DURATION} jam</span>
          <span>5 jam</span>
        </div>
        <p className="text-sm text-gray-600 mt-1">Biaya: {formatRupiah(cost)}</p>
      </div>

      {/* Save */}
      <button onClick={handleSave} disabled={saving} className="btn-primary w-full py-3">
        {saving ? "Menyimpan..." : "Simpan Sesi"}
      </button>
    </div>
  );
}
