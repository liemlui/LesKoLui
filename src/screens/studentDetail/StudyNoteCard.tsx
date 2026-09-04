import { useState, useCallback, useRef, useEffect } from "react";
import type { StudyNote } from "../../db/types";
import { SimpleMarkdown } from "../../components/SimpleMarkdown";

interface Props {
  studentId: string;
  studyNote: StudyNote | undefined;
  onSave: (content: string) => Promise<void>;
}

/** Kartu catatan belajar — textarea dengan auto-save 1 detik setelah berhenti mengetik. */
export default function StudyNoteCard({ studentId, studyNote, onSave }: Props) {
  const [content, setContent] = useState(studyNote?.content ?? "");
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
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
      {preview ? (
        <div className="w-full min-h-[104px] text-sm rounded-xl border border-blue-200 bg-blue-50/50 p-3 overflow-auto">
          {content.trim()
            ? <SimpleMarkdown text={content} />
            : <span className="text-gray-400 text-xs">Belum ada catatan.</span>}
        </div>
      ) : (
        <textarea
          value={content}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Contoh: Minggu ini fokus ke integral & turunan untuk persiapan UTS. PR dari sekolah: latihan soal halaman 45-47..."
          rows={4}
          className="w-full text-sm rounded-xl border border-gray-200 p-3 resize-y focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none transition-colors"
        />
      )}
      <div className="flex items-center justify-between min-h-[18px]">
        <div>
          {saving && (
            <span className="text-xs text-blue-500 animate-pulse">menyimpan...</span>
          )}
          {!saving && content.trim() && studyNote?.updatedAt && (
            <span className="text-xs text-gray-500">
              Disimpan {new Date(studyNote.updatedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
        {content.trim() && (
          <button
            type="button"
            onClick={() => setPreview((v) => !v)}
            className="text-xs font-semibold text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-2 py-1 rounded-lg transition-colors">
            {preview ? "✏️ Edit" : "👁 Pratinjau"}
          </button>
        )}
      </div>
    </div>
  );
}
