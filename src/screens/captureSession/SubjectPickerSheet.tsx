import Modal from "../../components/Modal";
import { IB_MYP_SUBJECTS, IB_DP_GROUPS, getSubjectGroups, CURRICULUM_META } from "../../lib/ibSubjects";
import type { Student } from "../../db/types";

interface SubjectPickerSheetProps {
  /** Murid terpilih — menentukan katalog mapel yang ditawarkan. */
  student?: Student;
  /** Mapel terpilih di draf (urutan tampil = urutan penambahan). */
  subjects: string[];
  setSubjects: (updater: (prev: string[]) => string[]) => void;
  onClose: () => void;
  /** Tab jenjang saat murid belum punya kurikulum (MYP / DP). */
  ibTab: "MYP" | "DP";
  setIbTab: (tab: "MYP" | "DP") => void;
  /** Kolom mapel bebas ("Ketik mapel lain..."). */
  ibCustom: string;
  setIbCustom: (value: string) => void;
  /** Tambah/hapus satu mapel — dipakai chip katalog, kolom bebas, dan chip "Dipilih". */
  onToggleSubject: (subject: string) => void;
}

/** Sheet "Pilih Mata Pelajaran" pada langkah 2 wizard Catat Sesi.
 *
 *  Dipindah apa adanya dari `CaptureSession.tsx` (refactor terbatas G3-01, Q9):
 *  isi dan urutannya tidak berubah; mapel terpilih tetap milik induk (ia ikut
 *  disimpan draf), komponen ini hanya menerimanya sebagai prop. */
export default function SubjectPickerSheet({
  student, subjects, setSubjects, onClose,
  ibTab, setIbTab, ibCustom, setIbCustom, onToggleSubject,
}: SubjectPickerSheetProps) {
  return (
    <Modal
      ariaLabel="Pilih Mata Pelajaran"
      onClose={onClose}
      showCloseButton={false}
      panelClassName="relative bg-[var(--surface-strong)] w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[88vh] overflow-y-auto overscroll-contain outline-none"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
        <div>
          <h3 className="font-bold text-lg">Pilih Mata Pelajaran</h3>
          {student?.curriculum && (
            <p className="text-xs text-[var(--ink-muted)] mt-0.5">{CURRICULUM_META[student.curriculum].label}</p>
          )}
        </div>
        <button aria-label="Tutup" onClick={onClose} className="text-[var(--ink-muted)] text-xl"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
      </div>

      {student?.curriculum ? (
        <div className="p-4 space-y-4">
          {getSubjectGroups(student.curriculum).map((grp) => (
            <div key={grp.group}>
              <p className="text-xs text-[var(--ink-muted)] font-semibold uppercase tracking-wide mb-2">{grp.group}</p>
              <div className="flex flex-wrap gap-2">
                {grp.subjects.map((s) => (
                  <button key={s} type="button"
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      subjects.includes(s) ? "bg-[var(--brand-solid)] text-[var(--on-strong)] border-[var(--border-brand)]" : "bg-[var(--surface-strong)] text-[var(--ink-muted)] border-[var(--border)] hover:border-[var(--border-brand)]"}`}
                    onClick={() => onToggleSubject(s)}>
                    {subjects.includes(s) ? "✓ " : ""}{s}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 bg-[var(--bg-subtle)] mx-4 mt-3 rounded-xl p-1">
            {(["MYP", "DP"] as const).map((t) => (
              <button key={t} onClick={() => setIbTab(t)}
                className={`py-2 rounded-lg text-sm font-semibold transition-colors ${ibTab === t ? "bg-[var(--surface-strong)] shadow text-[var(--ink-brand)]" : "text-[var(--ink-muted)]"}`}>
                {t === "MYP" ? "MYP (Middle Years)" : "DP (Diploma)"}
              </button>
            ))}
          </div>
          <div className="p-4 space-y-4">
            {ibTab === "MYP" ? (
              <div>
                <p className="text-xs text-[var(--ink-muted)] font-semibold uppercase tracking-wide mb-2">IB MYP Subjects</p>
                <div className="flex flex-wrap gap-2">
                  {IB_MYP_SUBJECTS.map((s) => (
                    <button key={s} type="button"
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        subjects.includes(s) ? "bg-[var(--brand-solid)] text-[var(--on-strong)] border-[var(--border-brand)]" : "bg-[var(--surface-strong)] text-[var(--ink-muted)] border-[var(--border)] hover:border-[var(--border-brand)]"}`}
                      onClick={() => onToggleSubject(s)}>
                      {subjects.includes(s) ? "✓ " : ""}{s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {IB_DP_GROUPS.map((grp) => (
                  <div key={grp.group}>
                    <p className="text-xs text-[var(--ink-muted)] font-semibold uppercase tracking-wide mb-2">{grp.group}</p>
                    <div className="flex flex-wrap gap-2">
                      {grp.subjects.map((s) => (
                        <button key={s} type="button"
                          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                            subjects.includes(s) ? "bg-[var(--brand-solid)] text-[var(--on-strong)] border-[var(--border-brand)]" : "bg-[var(--surface-strong)] text-[var(--ink-muted)] border-[var(--border)] hover:border-[var(--border-brand)]"}`}
                          onClick={() => onToggleSubject(s)}>
                          {subjects.includes(s) ? "✓ " : ""}{s}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <div className="px-4 pb-4 space-y-4">
        <div className="border-t border-[var(--border)] pt-3">
          <p className="text-xs text-[var(--ink-muted)] font-semibold uppercase tracking-wide mb-2">Custom</p>
          <div className="flex gap-2">
            <input className="input flex-1 text-sm" placeholder="Ketik mapel lain..." aria-label="Ketik mapel lain"
              value={ibCustom} onChange={(e) => setIbCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const val = ibCustom.trim();
                  if (val && !subjects.includes(val)) setSubjects((prev) => [...prev, val]);
                  setIbCustom("");
                }
              }} />
            <button type="button" disabled={!ibCustom.trim()}
              className="px-4 py-2 rounded-xl bg-[var(--accent-solid)] text-[var(--on-strong)] text-sm font-semibold disabled:opacity-40"
              onClick={() => {
                const val = ibCustom.trim();
                if (val && !subjects.includes(val)) setSubjects((prev) => [...prev, val]);
                setIbCustom("");
              }}>+</button>
          </div>
        </div>
        {subjects.length > 0 && (
          <div className="bg-[var(--brand-tint)] rounded-xl p-3">
            <p className="text-xs text-[var(--ink-brand)] font-semibold mb-1.5">Dipilih ({subjects.length}):</p>
            <div className="flex flex-wrap gap-1.5">
              {subjects.map((s) => (
                <span key={s} className="inline-flex items-center gap-1 text-xs bg-[var(--brand-solid)] text-[var(--on-strong)] px-2.5 py-1 rounded-full font-medium">
                  {s}
                  <button type="button" aria-label={`Hapus ${s}`}
                    onClick={() => setSubjects((prev) => prev.filter((x) => x !== s))}
                    className="-my-1 -mr-1 p-1.5 text-[var(--brand-tint-strong)] hover:text-[var(--on-strong)]"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
                </span>
              ))}
            </div>
          </div>
        )}
        <button onClick={onClose}
          className="w-full py-3 rounded-xl bg-[var(--brand-solid)] text-[var(--on-strong)] font-semibold hover:bg-[var(--brand-solid)] transition-colors">
          Selesai
        </button>
      </div>
    </Modal>
  );
}
