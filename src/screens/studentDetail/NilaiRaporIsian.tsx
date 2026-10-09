import { useMemo, useState } from "react";
import type { RaporGrade, Student } from "../../db/types";
import { upsertRaporGrade, deleteRaporGrade } from "../../db/repos";
import { currentSemester, semesterLabel, semesterOptions } from "../../lib/engagement";
import ConfirmSheet from "../../components/ConfirmSheet";
import NilaiRaporForm from "./NilaiRaporForm";
import { subjectsFor, gradesFromDraft, draftFromSaved, filledGradeCount } from "./raporForm";

interface NilaiRaporIsianProps {
  student: Student;
  /** Semua nilai rapor murid ini, dari `listRaporGrades`. */
  raporGrades: readonly RaporGrade[];
  /** Dipanggil sesudah data berubah supaya induk bisa memberi tahu tutor. */
  notify: (text: string) => void;
}

const SEMESTER_OPTIONS = semesterOptions(8);

/**
 * Isian nilai rapor — butir 5 G3-06.
 *
 * Lapisan datanya sudah ada sejak lama dan selalu dipakai untuk BACA: tabel
 * `raporGrades` disimpan, divalidasi saat restore backup, ikut terhapus saat murid
 * dihapus, dan `listRaporGrades` dipakai layar Daftar Murid. Yang belum pernah ada
 * adalah ANTARMUKA ISIANYA: `upsertRaporGrade` tidak dipanggil dari layar mana pun,
 * sehingga nilai rapor praktis hanya bisa masuk lewat pemulihan backup. Komponen
 * ini menutup celah itu.
 *
 * Satu hal yang harus jelas di layar: **nilai rapor disimpan PER SEMESTER**,
 * sedangkan tabel "Prediksi vs Nilai Akhir" di atasnya bekerja **PER SESI**.
 * Keduanya menjawab pertanyaan berbeda (nilai resmi sekolah vs hasil satu ujian),
 * jadi antarmuka ini menyatakannya terang-terangan.
 *
 * Berkas ini hanya mengurus KEADAAN. Aturan mapel dan nilai ada di `raporForm.ts`,
 * dan bentuk formulirnya di `NilaiRaporForm.tsx` — dua-duanya dipisah supaya bisa
 * diuji di lingkungan tanpa DOM.
 */
export default function NilaiRaporIsian({ student, raporGrades, notify }: NilaiRaporIsianProps) {
  const [open, setOpen] = useState(false);
  const [semester, setSemester] = useState(currentSemester());
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<RaporGrade | null>(null);
  const [deleting, setDeleting] = useState(false);

  /** Nilai yang sudah tersimpan untuk semester yang sedang dipilih. */
  const existing = useMemo(
    () => raporGrades.find((r) => r.semester === semester),
    [raporGrades, semester],
  );

  const subjects = useMemo(
    () => subjectsFor(student.subjects ?? [], existing),
    [student.subjects, existing],
  );

  /** Mengisi draf dari data tersimpan (atau mengosongkannya) untuk satu semester. */
  const loadSemester = (sem: string) => {
    const saved = raporGrades.find((r) => r.semester === sem);
    setSemester(sem);
    setNotes(saved?.notes ?? "");
    setDraft(draftFromSaved(saved));
    setError("");
  };

  const save = async () => {
    const grades = gradesFromDraft(subjects, draft);
    if (grades.length === 0) {
      setError("Isi minimal satu nilai sebelum menyimpan.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await upsertRaporGrade({
        studentId: student.id,
        semester,
        grades,
        notes: notes.trim() || undefined,
      });
      notify(`Nilai ${semesterLabel(semester)} tersimpan ✓`);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nilai tidak dapat disimpan.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    const removedSemester = confirmDelete.semester;
    setDeleting(true);
    try {
      await deleteRaporGrade(confirmDelete.id);
      notify(`Nilai ${semesterLabel(removedSemester)} dihapus`);
      setConfirmDelete(null);
      if (removedSemester === semester) setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nilai tidak dapat dihapus.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section
      aria-labelledby="nilai-rapor-title"
      className="bg-[var(--surface-strong)] rounded-2xl shadow-sm border border-[var(--border)] overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 id="nilai-rapor-title" className="font-semibold text-[var(--ink-strong)]">Nilai Rapor</h2>
          <p className="text-xs text-[var(--ink-muted)] mt-0.5">
            Nilai resmi sekolah per semester — berbeda dari tabel per sesi di atas.
          </p>
        </div>
        <button
          type="button"
          onClick={() => (open ? setOpen(false) : loadSemester(semester))}
          className="flex-shrink-0 text-xs bg-[var(--brand-solid)] text-[var(--on-strong)] px-3 py-2 rounded-lg font-semibold min-h-[36px]"
        >
          {open
            ? "Tutup"
            : existing
              ? `Ubah nilai ${semesterLabel(semester)}`
              : `+ Isi nilai ${semesterLabel(semester)}`}
        </button>
      </div>

      {/* ── Semester yang sudah punya nilai ── */}
      {raporGrades.length > 0 && (
        <ul className="divide-y divide-[var(--border)] list-none m-0 p-0">
          {raporGrades
            .slice()
            .sort((a, b) => b.semester.localeCompare(a.semester))
            .map((r) => {
              const filled = filledGradeCount(r);
              return (
                <li key={r.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--ink-strong)]">{semesterLabel(r.semester)}</p>
                      <p className="text-xs text-[var(--ink-muted)] mt-0.5 break-words">
                        {filled} nilai tercatat
                        {filled > 0
                          ? ` · ${r.grades
                              .filter((g) => g.grade.trim())
                              .map((g) => `${g.subject} ${g.grade}`)
                              .join(" · ")}`
                          : ""}
                      </p>
                      {r.notes && <p className="text-xs text-[var(--ink-muted)] italic mt-0.5">{r.notes}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => loadSemester(r.semester)}
                        className="text-xs text-[var(--ink-brand)] font-semibold px-2 py-1"
                      >
                        Ubah
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(r)}
                        className="text-xs text-[var(--ink-danger)] font-semibold px-2 py-1"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
        </ul>
      )}

      {raporGrades.length === 0 && !open && (
        <p className="px-4 py-6 text-sm text-[var(--ink-muted)] text-center">
          Belum ada nilai rapor yang disimpan untuk murid ini.
        </p>
      )}

      {open && (
        <NilaiRaporForm
          semester={semester}
          semesterOptions={SEMESTER_OPTIONS}
          subjects={subjects}
          draft={draft}
          notes={notes}
          saving={saving}
          error={error}
          hasExisting={Boolean(existing)}
          existingCount={filledGradeCount(existing)}
          onChangeSemester={loadSemester}
          onChangeGrade={(subject, grade) => setDraft((prev) => ({ ...prev, [subject]: grade }))}
          onChangeNotes={setNotes}
          onSave={() => void save()}
          onCancel={() => setOpen(false)}
        />
      )}

      <ConfirmSheet
        open={confirmDelete !== null}
        title="Hapus Nilai Rapor"
        message={
          confirmDelete
            ? `Hapus nilai rapor ${semesterLabel(confirmDelete.semester)}? ${filledGradeCount(confirmDelete)} nilai di dalamnya ikut terhapus.`
            : ""
        }
        confirmLabel="Hapus"
        danger
        busy={deleting}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => void remove()}
      />
    </section>
  );
}
