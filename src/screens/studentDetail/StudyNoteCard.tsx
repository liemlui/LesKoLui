import { useState, useCallback, useRef, useEffect } from "react";
import type { StudyNote } from "../../db/types";
import { SimpleMarkdown } from "../../components/SimpleMarkdown";
import Card from "../../components/ui/Card";
import SectionHeader from "../../components/ui/SectionHeader";

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
    <Card className="space-y-2">
      <SectionHeader title="📝 Catatan Belajar" />
      <p className="text-xs text-[var(--ink-muted)]">
        Topik sekolah, PR dari sekolah, progres belajar, rencana sesi berikutnya.
      </p>
      {preview ? (
        <div className="w-full min-h-[104px] text-sm rounded-xl border border-[var(--brand-tint-strong)] bg-[var(--brand-tint)]/50 p-3 overflow-auto">
          {content.trim()
            ? <SimpleMarkdown text={content} />
            : <span className="text-[var(--ink-muted)] text-xs">Belum ada catatan.</span>}
        </div>
      ) : (
        <textarea
          value={content}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Contoh: Minggu ini fokus ke integral & turunan untuk persiapan UTS. PR dari sekolah: latihan soal halaman 45-47..."
          rows={4}
          className="w-full text-sm rounded-xl border border-[var(--border)] p-3 resize-y focus:border-[var(--border-brand)] focus:ring-1 focus:ring-[var(--border-brand)] outline-none transition-colors"
        />
      )}
      <div className="flex items-center justify-between min-h-[18px]">
        <div>
          {saving && (
            <span className="text-xs text-[var(--ink-brand)] animate-pulse">menyimpan...</span>
          )}
          {!saving && content.trim() && studyNote?.updatedAt && (
            <span className="text-xs text-[var(--ink-muted)]">
              Disimpan {new Date(studyNote.updatedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
        {content.trim() && (
          <button
            type="button"
            onClick={() => setPreview((v) => !v)}
            className="text-xs font-semibold text-[var(--ink-muted)] bg-[var(--surface)] hover:bg-[var(--bg-subtle)] border border-[var(--border)] px-2 py-1 rounded-lg transition-colors">
            {preview ? "Edit" : "Pratinjau"}
          </button>
        )}
      </div>
    </Card>
  );
}
