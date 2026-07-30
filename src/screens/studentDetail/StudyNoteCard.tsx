import { useState, useCallback, useRef, useEffect } from "react";
import type { StudyNote } from "../../db/types";

interface Props {
  studentId: string;
  studyNote: StudyNote | undefined;
  onSave: (content: string) => Promise<void>;
}

/** Kartu catatan belajar — textarea dengan auto-save 1 detik setelah berhenti mengetik. */
export default function StudyNoteCard({ studentId, studyNote, onSave }: Props) {
  const [content, setContent] = useState(studyNote?.content ?? "");
  const [saving, setSaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setContent(studyNote?.content ?? "");
  }, [studyNote?.content, studentId]);

  const handleChange = useCallback(
    (value: string) => {
      setContent(value);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        setSaving(true);
        try {
          await onSave(value);
        } finally {
          setSaving(false);
        }
      }, 800);
    },
    [onSave]
  );

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-2">
      <h2 className="text-base font-semibold text-gray-700">📝 Catatan Belajar</h2>
      <p className="text-xs text-gray-500">
        Topik sekolah, PR dari sekolah, progres belajar, rencana sesi berikutnya.
      </p>
      <textarea
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Contoh: Minggu ini fokus ke integral & turunan untuk persiapan UTS. PR dari sekolah: latihan soal halaman 45-47..."
        rows={4}
        className="w-full text-sm rounded-xl border border-gray-200 p-3 resize-y focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none transition-colors"
      />
      <div className="flex items-center justify-end min-h-[18px]">
        {saving && (
          <span className="text-[10px] text-blue-500 animate-pulse">menyimpan...</span>
        )}
        {!saving && content.trim() && studyNote?.updatedAt && (
          <span className="text-[10px] text-gray-400">
            Disimpan {new Date(studyNote.updatedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>
    </div>
  );
}
