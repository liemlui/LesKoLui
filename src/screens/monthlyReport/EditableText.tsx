/**
 * Satu kolom teks laporan yang bisa disunting (G3-05 butir 6).
 *
 * Keadaan baca dirender sebagai `<button type="button">` sungguhan, sehingga
 * **peran tombol**, **urutan fokus**, dan **Enter/Spasi** semuanya bekerja tanpa
 * penangan tombol papan ketik buatan. Sebelumnya ini `<p onClick>`: bisa diklik
 * dengan tetikus, tetapi tidak bisa difokus dan tidak bisa dibuka dari papan ketik.
 */

import type { ReactNode } from "react";

interface EditableTextProps {
  /** id unik untuk menghubungkan label dan kolomnya. */
  fieldId: string;
  label: string;
  /** Nilai tersimpan; dipakai saat tidak menyunting. */
  value?: string;
  /** Teks pengganti saat nilai masih kosong. */
  placeholder: string;
  /** Sedang menyunting: kolomnya berupa textarea dan tombol simpan/batal tampil. */
  editing: boolean;
  draft: string;
  onDraftChange: (value: string) => void;
  onStartEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  /** Isian ini ditulis AI dan belum disunting manual (G3-05 butir 8). */
  aiMarked?: boolean;
  italic?: boolean;
  rows?: number;
  /** Kolom satu baris (mis. kutipan) memakai input, bukan textarea. */
  singleLine?: boolean;
  /** Keterangan tambahan di bawah kolom (mis. waktu simpan otomatis). */
  hint?: ReactNode;
}

export default function EditableText({
  fieldId, label, value, placeholder, editing, draft, onDraftChange,
  onStartEdit, onSave, onCancel, aiMarked = false, italic = false, rows = 3,
  singleLine = false, hint,
}: EditableTextProps) {
  const labelId = `${fieldId}-label`;
  return (
    <div>
      <div className="flex items-center gap-2">
        <label id={labelId} htmlFor={editing ? fieldId : undefined} className="label">{label}</label>
        {aiMarked && (
          <span
            className="rounded-full bg-[var(--accent-tint)] px-1.5 py-0.5 text-xs font-bold text-[var(--ink-accent)]"
            title="Isian ini ditulis AI. Menyuntingnya sendiri akan melepas penandanya."
          >
            ✨ AI
          </span>
        )}
      </div>
      {editing ? (
        <div className="space-y-2">
          {singleLine ? (
            <input
              id={fieldId}
              className="input text-sm"
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              placeholder={placeholder}
            />
          ) : (
            <textarea
              id={fieldId}
              className="input text-sm"
              rows={rows}
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              placeholder={placeholder}
            />
          )}
          <div className="flex gap-2">
            <button type="button" className="btn btn-primary text-xs" onClick={onSave}>Simpan</button>
            <button type="button" className="btn btn-secondary text-xs" onClick={onCancel}>Batal</button>
          </div>
          {hint}
        </div>
      ) : (
        <button
          type="button"
          aria-labelledby={labelId}
          onClick={onStartEdit}
          className={`min-h-[2.5rem] w-full rounded-lg bg-[var(--surface)] p-3 text-left text-sm text-[var(--ink-strong)] transition-colors hover:bg-[var(--bg-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-brand)] ${italic ? "italic" : ""}`}
        >
          {value?.trim() ? value : <span className="text-[var(--ink-muted)]">{placeholder}</span>}
        </button>
      )}
      {!editing && hint}
    </div>
  );
}
