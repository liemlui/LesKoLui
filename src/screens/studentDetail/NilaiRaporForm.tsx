import { semesterLabel } from "../../lib/engagement";

export interface NilaiRaporFormProps {
  semester: string;
  semesterOptions: readonly { value: string; label: string }[];
  subjects: readonly string[];
  draft: Readonly<Record<string, string>>;
  notes: string;
  saving: boolean;
  error: string;
  /** Apakah semester ini sudah punya nilai tersimpan — mengubah label tombol. */
  hasExisting: boolean;
  existingCount: number;
  onChangeSemester: (semester: string) => void;
  onChangeGrade: (subject: string, grade: string) => void;
  onChangeNotes: (notes: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

/**
 * Formulir isian nilai rapor — bagian presentasional, tanpa state.
 *
 * Dipisah dari wadahnya (`NilaiRaporIsian`) supaya markupnya bisa diperiksa tanpa
 * DOM: repo ini tidak memasang `jsdom` maupun `@testing-library/*`, jadi satu-satunya
 * cara menguji bentuk formulir adalah membuatnya bisa dirender apa adanya.
 * Seluruh keadaan hidup di wadahnya.
 */
export default function NilaiRaporForm({
  semester, semesterOptions, subjects, draft, notes, saving, error,
  hasExisting, existingCount, onChangeSemester, onChangeGrade, onChangeNotes, onSave, onCancel,
}: NilaiRaporFormProps) {
  return (
    <div className="px-4 py-3 border-t border-[var(--border)] bg-[var(--brand-tint)] space-y-3">
      <div>
        <label htmlFor="rapor-semester" className="label">Semester</label>
        <select
          id="rapor-semester"
          className="input"
          value={semester}
          onChange={(e) => onChangeSemester(e.target.value)}
        >
          {semesterOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {hasExisting && (
          <p className="text-xs text-[var(--ink-brand)] mt-1">
            {semesterLabel(semester)} sudah punya {existingCount} nilai — menyimpan akan memperbaruinya,
            bukan menambah baris baru.
          </p>
        )}
      </div>

      {subjects.length === 0 ? (
        <p className="text-xs text-[var(--ink-muted)]">
          Murid ini belum punya mata pelajaran di profilnya. Tambahkan mapelnya lebih dulu lewat
          Edit Profil, lalu isi nilai rapornya di sini.
        </p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[var(--ink-brand)]">Nilai per mata pelajaran</p>
          {subjects.map((subject) => (
            <div key={subject} className="flex items-center gap-2">
              <label
                htmlFor={`rapor-${subject}`}
                className="text-sm text-[var(--ink-strong)] flex-1 min-w-0 truncate"
              >
                {subject}
              </label>
              <input
                id={`rapor-${subject}`}
                className="input w-24 text-center"
                maxLength={10}
                value={draft[subject] ?? ""}
                onChange={(e) => onChangeGrade(subject, e.target.value)}
                placeholder="mis. 6, A"
              />
            </div>
          ))}
        </div>
      )}

      <div>
        <label htmlFor="rapor-catatan" className="label">Catatan (opsional)</label>
        <textarea
          id="rapor-catatan"
          className="input text-sm"
          rows={2}
          value={notes}
          onChange={(e) => onChangeNotes(e.target.value)}
          placeholder="mis. nilai rapor semester ini dari sekolah"
        />
      </div>

      {error && <p className="text-xs text-[var(--ink-danger)]" role="alert">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 rounded-xl bg-[var(--bg-subtle)] text-[var(--ink-muted)] text-sm font-semibold"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || subjects.length === 0}
          className="flex-1 py-2 rounded-xl bg-[var(--brand-solid)] text-[var(--on-strong)] text-sm font-semibold disabled:opacity-50"
        >
          {saving ? "Menyimpan..." : hasExisting ? "Perbarui nilai" : "Simpan nilai"}
        </button>
      </div>
    </div>
  );
}
