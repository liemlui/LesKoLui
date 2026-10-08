import { useState } from "react";
import type { Student, IaEeMilestone, IaEeProject } from "../../db/types";
import type { IaEeProjectPatch } from "../../db/repos";
import {
  createIaEeProject, deleteIaEeProject, updateIaEeProject,
  addMilestone, updateMilestone, deleteMilestone,
} from "../../db/repos";
import ConfirmSheet from "../../components/ConfirmSheet";
import { TrashIcon, PencilIcon } from "../../components/icons";
import {
  PROJECT_TYPES, projectTypeMeta, presetMilestones, projectProgress,
  deadlineInfo, deadlineClass,
} from "../../lib/projectTypes";

interface IaEeTrackerProps {
  student: Student;
  projects: IaEeProject[];
  /** Notifikasi singkat (flash) dari induk. */
  notify: (text: string) => void;
}

/** Nilai awal pesan pengingat preset — dipakai formulir proyek baru. */
const PRESET_NOTE =
  "Milestone awal terisi otomatis sebagai titik mulai (susunan bantuan, bukan syarat resmi). " +
  "Boleh dihapus atau disunting satu per satu.";

/**
 * Pelacak proyek tugas panjang milik satu murid.
 *
 * Perubahan 2026-10-09 (keputusan pemilik K1, K2, K3, K4, K7):
 *
 * - **Gerbang IB dihapus.** Sebelumnya `return null` untuk murid non-IB, sehingga
 *   tab Proyek kosong total bagi mereka. Sekarang pelacak ini berguna untuk semua
 *   kurikulum; jenis proyeknya bebas (`IA` · `EE` · `PP` · proyek lain).
 * - **Empat rantai syarat diganti peta label** dari `lib/projectTypes.ts`, jadi
 *   teks, label kolom, placeholder, dan warna badge satu sumber.
 * - **Keadaan proyek diturunkan dari milestone**, bukan disimpan (K2). Proyek
 *   tanpa milestone disebut apa adanya: "Belum ada milestone".
 * - **Proyek bisa disunting** (K3) — dulu satu-satunya jalan memperbaiki judul
 *   yang salah ketik adalah menghapus proyek beserta seluruh milestone-nya.
 * - **Dialog konfirmasi memakai `ConfirmSheet` internal** (K7), menggantikan
 *   `confirm()` bawaan peramban yang melanggar keputusan `ATURAN-AI.md` §4.1.
 */
export default function IaEeTracker({ student, projects, notify }: IaEeTrackerProps) {
  // ── Formulir proyek (baru atau sunting) ──
  const [formOpen, setFormOpen]   = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [type, setType]           = useState<string>("IA");
  const [subject, setSubject]     = useState("");
  const [title, setTitle]         = useState("");
  const [deadline, setDeadline]   = useState("");
  const [notes, setNotes]         = useState("");
  const [saving, setSaving]       = useState(false);

  // ── Milestone ──
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [msFormFor, setMsFormFor] = useState<string | null>(null);
  const [msTitle, setMsTitle]     = useState("");
  const [msDue, setMsDue]         = useState("");

  // ── Konfirmasi internal (K7) ──
  const [confirmState, setConfirmState] = useState<
    | { kind: "project"; project: IaEeProject }
    | { kind: "milestone"; projectId: string; milestone: IaEeMilestone }
    | null
  >(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const meta = projectTypeMeta(type);
  const canSave = title.trim().length > 0 && (!meta.subjectRequired || subject.trim().length > 0);

  const resetForm = () => {
    setType("IA"); setSubject(""); setTitle(""); setDeadline(""); setNotes("");
    setEditingId(null);
  };

  const openEdit = (project: IaEeProject) => {
    setType(project.type);
    setSubject(project.subject);
    setTitle(project.title);
    setDeadline(project.deadline ?? "");
    setNotes(project.notes ?? "");
    setEditingId(project.id);
    setFormOpen(true);
    setExpanded(project.id);
  };

  /**
   * Simpan proyek. Saat membuat proyek baru, preset milestone jenis itu ikut
   * dibuat supaya tutor tidak mulai dari nol. Saat menyunting, daftar milestone
   * TIDAK disentuh — ia punya jalurnya sendiri supaya tidak ada dua jalur yang
   * bisa saling menimpa.
   */
  const saveProject = async () => {
    if (saving || !canSave) return;
    setSaving(true);
    try {
      // Jenis bebas menyimpan mapel apa pun yang diketik, termasuk kosong.
      const subjectValue = subject.trim() || (meta.subjectRequired ? "" : meta.badgeLabel);
      if (editingId) {
        const patch: IaEeProjectPatch = {
          type: meta.code,
          subject: subjectValue,
          title: title.trim(),
          deadline: deadline || undefined,
          notes: notes.trim() || undefined,
        };
        await updateIaEeProject(editingId, patch);
        notify("Proyek diperbarui ✓");
      } else {
        const createdId = await createIaEeProject({
          studentId: student.id,
          type: meta.code,
          subject: subjectValue,
          title: title.trim(),
          deadline: deadline || undefined,
          milestones: presetMilestones(meta.code),
          notes: notes.trim() || undefined,
        });
        setExpanded(createdId);
        notify("Proyek ditambahkan ✓");
      }
      setFormOpen(false);
      resetForm();
    } catch (e) {
      notify("Gagal: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const cycleMilestone = async (projectId: string, m: IaEeMilestone) => {
    const next: IaEeMilestone["status"] =
      m.status === "pending" ? "in_progress" :
      m.status === "in_progress" ? "done" : "pending";
    await updateMilestone(projectId, m.id, {
      status: next,
      completedAt: next === "done" ? new Date().toISOString() : undefined,
    });
  };

  const runConfirmed = async () => {
    if (!confirmState || confirmBusy) return;
    setConfirmBusy(true);
    try {
      if (confirmState.kind === "project") {
        await deleteIaEeProject(confirmState.project.id);
        setExpanded(null);
        notify("Proyek dihapus");
      } else {
        await deleteMilestone(confirmState.projectId, confirmState.milestone.id);
        notify("Milestone dihapus");
      }
      setConfirmState(null);
    } finally {
      setConfirmBusy(false);
    }
  };

  const confirmMessage = (() => {
    if (!confirmState) return "";
    if (confirmState.kind === "project") {
      const count = confirmState.project.milestones.length;
      return `Hapus proyek "${confirmState.project.title}"?` +
        (count > 0 ? `\n\n${count} milestone di dalamnya ikut terhapus dan tidak bisa dikembalikan.` : "");
    }
    return `Hapus milestone "${confirmState.milestone.title}"?`;
  })();

  return (
    <div className="bg-[var(--surface-strong)] rounded-2xl shadow-sm border border-[var(--border)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold text-[var(--ink-strong)]">Proyek</h2>
          <p className="text-xs text-[var(--ink-muted)] mt-0.5">
            Tugas jangka panjang: IA · EE · PP · eksperimen · esai · tugas internal.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { resetForm(); setFormOpen((v) => !v); }}
          className="flex-shrink-0 text-xs bg-[var(--brand-solid)] text-[var(--on-strong)] px-3 py-2 rounded-lg font-semibold min-h-[36px]">
          {formOpen && !editingId ? "Tutup" : "+ Proyek"}
        </button>
      </div>

      {/* ── Formulir proyek: baru atau sunting ── */}
      {formOpen && (
        <div className="px-4 py-3 border-b border-[var(--border)] space-y-2 bg-[var(--brand-tint)]">
          <p className="text-xs font-semibold text-[var(--ink-brand)]">
            {editingId ? "Sunting proyek" : "Proyek baru"}
          </p>

          <div>
            <select
              className="input"
              value={type}
              aria-label="Jenis proyek"
              disabled={Boolean(editingId)}
              onChange={(e) => setType(e.target.value)}
            >
              {PROJECT_TYPES.map((t) => (
                <option key={t.code} value={t.code}>{t.label}</option>
              ))}
            </select>
            <p className="text-xs text-[var(--ink-brand)] mt-1">{meta.hint}</p>
            {editingId && (
              <p className="text-xs text-[var(--ink-muted)] mt-1">
                Jenis proyek tidak diubah saat menyunting — hapus lalu buat proyek baru bila jenisnya salah.
              </p>
            )}
          </div>

          <input
            className="input"
            placeholder={meta.subjectLabel}
            aria-label={meta.subjectLabel}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <input
            className="input"
            placeholder={meta.titlePlaceholder}
            aria-label="Judul proyek"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            className="input"
            type="date"
            value={deadline}
            aria-label="Tenggat proyek"
            onChange={(e) => setDeadline(e.target.value)}
          />
          <textarea
            className="input text-sm"
            rows={2}
            placeholder="Catatan (opsional)"
            aria-label="Catatan proyek"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          {!editingId && meta.preset.length > 0 && (
            <p className="text-xs text-[var(--ink-muted)]">{PRESET_NOTE}</p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setFormOpen(false); resetForm(); }}
              className="flex-1 py-2 rounded-xl bg-[var(--bg-subtle)] text-[var(--ink-muted)] text-sm font-semibold">
              Batal
            </button>
            <button
              type="button"
              disabled={saving || !canSave}
              onClick={() => void saveProject()}
              className="flex-1 py-2 rounded-xl bg-[var(--brand-solid)] text-[var(--on-strong)] text-sm font-semibold disabled:opacity-50">
              {saving ? "Menyimpan..." : editingId ? "Simpan perubahan" : "Simpan"}
            </button>
          </div>
        </div>
      )}

      {/* ── Keadaan kosong ── */}
      {projects.length === 0 && !formOpen && (
        <div className="px-4 py-6 text-center">
          <p className="text-sm text-[var(--ink-muted)]">Belum ada proyek untuk murid ini.</p>
          <p className="text-xs text-[var(--ink-muted)] mt-1">
            Contoh yang bisa dilacak: eksperimen, esai panjang, proyek pribadi, atau tugas jangka
            panjang dari sekolah. Tekan <span className="font-semibold">+ Proyek</span> untuk mulai.
          </p>
        </div>
      )}

      <div className="divide-y divide-[var(--border)]">
        {projects.map((proj) => {
          const projMeta = projectTypeMeta(proj.type);
          const progress = projectProgress(proj);
          const due = deadlineInfo(proj.deadline);
          const isExpanded = expanded === proj.id;
          return (
            <div key={proj.id} className="px-4 py-3">
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  aria-expanded={isExpanded}
                  onClick={() => setExpanded(isExpanded ? null : proj.id)}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${projMeta.badgeClass}`}>
                      {projMeta.badgeLabel}
                    </span>
                    <span className="text-xs text-[var(--ink-muted)]">{proj.subject}</span>
                    {due && (
                      <span className={`text-xs font-semibold ${deadlineClass(due.state)}`}>{due.label}</span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-[var(--ink-strong)] mt-1">{proj.title}</p>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-[var(--ink-muted)] mb-1">
                      <span>{progress.label}</span>
                      <span>{progress.percent}%</span>
                    </div>
                    <div className="h-1.5 bg-[var(--bg-subtle)] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          progress.state === "selesai" ? "bg-[var(--bg-success-strong)]" : "bg-[var(--brand-solid)]"
                        }`}
                        style={{ width: `${progress.percent}%` }}
                      />
                    </div>
                  </div>
                </button>
                <span className="text-[var(--ink-muted)] flex-shrink-0 pt-0.5">{isExpanded ? "▲" : "▼"}</span>
              </div>

              {isExpanded && (
                <div className="mt-3 space-y-2">
                  {proj.notes && <p className="text-xs text-[var(--ink-muted)] italic">{proj.notes}</p>}

                  {progress.total === 0 && (
                    <p className="text-xs text-[var(--ink-muted)]">
                      Belum ada milestone. Tambahkan tahap yang ingin dilacak — mis. draf, revisi, submit.
                    </p>
                  )}

                  {proj.milestones.map((m) => (
                    <div key={m.id} className="flex items-start gap-2 bg-[var(--surface)] rounded-xl px-3 py-2">
                      <button
                        type="button"
                        onClick={() => void cycleMilestone(proj.id, m)}
                        aria-label={`Ubah status milestone ${m.title}, sekarang ${
                          m.status === "done" ? "selesai" : m.status === "in_progress" ? "sedang dikerjakan" : "belum mulai"
                        }`}
                        className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs transition-colors mt-0.5 ${
                          m.status === "done" ? "bg-[var(--bg-success-strong)] border-[var(--border-success)] text-[var(--on-strong)]" :
                          m.status === "in_progress" ? "bg-[var(--bg-warn-strong)] border-[var(--border-warn)] text-[var(--on-strong)]" :
                          "border-[var(--border)] bg-[var(--surface-strong)]"
                        }`}>
                        {m.status === "done" ? "✓" : m.status === "in_progress" ? "…" : ""}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${m.status === "done" ? "line-through text-[var(--ink-muted)]" : "text-[var(--ink-strong)]"}`}>
                          {m.title}
                        </p>
                        {m.dueAt && <p className="text-xs text-[var(--ink-muted)] mt-0.5">Tenggat: {m.dueAt}</p>}
                        {m.notes && <p className="text-xs text-[var(--ink-muted)] italic mt-0.5">{m.notes}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => setConfirmState({ kind: "milestone", projectId: proj.id, milestone: m })}
                        aria-label={`Hapus milestone ${m.title}`}
                        className="text-[var(--ink-muted)] hover:text-[var(--ink-danger)] p-2 flex-shrink-0">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
                      </button>
                    </div>
                  ))}

                  {msFormFor === proj.id ? (
                    <div className="space-y-2 bg-[var(--brand-tint)] rounded-xl px-3 py-2">
                      <input
                        className="input text-sm"
                        placeholder="mis. Draft proposal, Bab 1, Revisi, Submit final"
                        aria-label="Judul milestone"
                        value={msTitle}
                        onChange={(e) => setMsTitle(e.target.value)}
                        autoFocus
                      />
                      <input
                        className="input text-sm"
                        type="date"
                        value={msDue}
                        aria-label="Tanggal milestone"
                        onChange={(e) => setMsDue(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => { setMsFormFor(null); setMsTitle(""); setMsDue(""); }}
                          className="flex-1 py-1.5 rounded-lg bg-[var(--bg-subtle)] text-[var(--ink-muted)] text-xs font-semibold">
                          Batal
                        </button>
                        <button
                          type="button"
                          disabled={!msTitle.trim()}
                          onClick={async () => {
                            if (!msTitle.trim()) return;
                            await addMilestone(proj.id, {
                              id: crypto.randomUUID(),
                              title: msTitle.trim(),
                              dueAt: msDue || undefined,
                              status: "pending",
                            });
                            setMsFormFor(null); setMsTitle(""); setMsDue("");
                            notify("Milestone ditambahkan ✓");
                          }}
                          className="flex-1 py-1.5 rounded-lg bg-[var(--brand-solid)] text-[var(--on-strong)] text-xs font-semibold disabled:opacity-50">
                          + Tambah
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setMsFormFor(proj.id); setMsTitle(""); setMsDue(""); }}
                      className="w-full py-2 rounded-xl border border-dashed border-[var(--border)] text-xs text-[var(--ink-muted)] hover:border-[var(--border-brand)] hover:text-[var(--ink-brand)] transition-colors">
                      + Milestone
                    </button>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => openEdit(proj)}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold text-[var(--ink-brand)] bg-[var(--brand-tint)] hover:bg-[var(--brand-tint-strong)] transition-colors">
                      <PencilIcon size={13} className="mr-1 inline align-[-2px]" /> Sunting proyek
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmState({ kind: "project", project: proj })}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold text-[var(--ink-danger)] hover:bg-[var(--bg-danger)] transition-colors">
                      <TrashIcon size={13} className="mr-1 inline align-[-2px]" /> Hapus proyek
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ConfirmSheet
        open={confirmState !== null}
        title={confirmState?.kind === "project" ? "Hapus Proyek" : "Hapus Milestone"}
        message={confirmMessage}
        confirmLabel="Hapus"
        danger
        busy={confirmBusy}
        onCancel={() => setConfirmState(null)}
        onConfirm={() => void runConfirmed()}
      />
    </div>
  );
}
