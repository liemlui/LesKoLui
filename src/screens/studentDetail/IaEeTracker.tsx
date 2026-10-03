import { TrashIcon } from "../../components/icons";
import { useState } from "react";
import type { Student, IaEeMilestone } from "../../db/types";
import type { IaEeProject, IaEeType } from "../../db/types";
import {
  createIaEeProject, deleteIaEeProject, addMilestone, updateMilestone, deleteMilestone,
} from "../../db/repos";

interface IaEeTrackerProps {
  student: Student;
  projects: IaEeProject[];
  /** Notifikasi singkat (flash) dari induk. */
  notify: (text: string) => void;
}

/**
 * IA / EE / PP Tracker — daftar proyek + milestone per tahap.
 *
 * Diekstrak dari `screens/StudentDetail.tsx` (audit utang teknis #3): ±210 baris
 * JSX. SELURUH state-nya tadinya menumpang di layar induk (11 `useState` +
 * empat fungsi repositori) padahal tidak satu pun dipakai bagian lain layar itu,
 * jadi state-nya ikut pindah ke sini — induknya jadi lebih tipis dan tidak lagi
 * memegang state yang bukan urusannya.
 */
export default function IaEeTracker({ student, projects, notify }: IaEeTrackerProps) {
  const [showForm, setShowForm] = useState(false);
  const [type, setType]         = useState<IaEeType>("IA");
  const [subject, setSubject]   = useState("");
  const [title, setTitle]       = useState("");
  const [deadline, setDeadline] = useState("");
  const [notes, setNotes]       = useState("");
  const [saving, setSaving]     = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [msFormFor, setMsFormFor] = useState<string | null>(null);
  const [msTitle, setMsTitle]   = useState("");
  const [msDue, setMsDue]       = useState("");

  const isIb = student.level === "IBDP" || student.curriculum === "IB DP" || student.curriculum === "IB MYP";
  if (!isIb) return null;

  const todayMs = new Date().setHours(0, 0, 0, 0);

  const resetForm = () => {
    setSubject(""); setTitle(""); setDeadline(""); setNotes("");
  };

  const saveProject = async () => {
    if (saving || !title || (type !== "PP" && !subject)) return;
    setSaving(true);
    try {
      await createIaEeProject({
        studentId: student.id,
        type,
        subject: type === "PP" ? (subject.trim() || "Personal Project") : subject,
        title,
        deadline: deadline || undefined,
        milestones: [],
        notes: notes || undefined,
      });
      setShowForm(false);
      resetForm();
      notify("Proyek ditambahkan ✓");
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

  return (
    <div className="bg-[var(--surface-strong)] rounded-2xl shadow-sm border border-[var(--border)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-[var(--ink-strong)]">IA / EE / PP Tracker</h2>
          <p className="text-xs text-[var(--ink-muted)] mt-0.5">IA = Internal Assessment (DP) · EE = Extended Essay (DP) · PP = Personal Project (MYP)</p>
        </div>
        <button
          onClick={() => { setShowForm((v) => !v); resetForm(); }}
          className="text-xs bg-[var(--brand-solid)] text-[var(--on-strong)] px-3 py-1.5 rounded-lg font-semibold">
          + Proyek
        </button>
      </div>

      {/* Form proyek baru */}
      {showForm && (
        <div className="px-4 py-3 border-b border-[var(--border)] space-y-2 bg-[var(--brand-tint)]">
          <div>
            <select className="input" value={type} aria-label="Jenis proyek"
              onChange={(e) => setType(e.target.value as IaEeType)}>
              <option value="IA">IA — Internal Assessment (per mapel DP)</option>
              <option value="EE">EE — Extended Essay (esai riset DP)</option>
              <option value="PP">PP — Personal Project (proyek pribadi MYP)</option>
            </select>
            <p className="text-xs text-[var(--ink-brand)] mt-1">
              {type === "IA" && "Internal Assessment: tugas resmi dari satu mapel DP, dinilai internal + moderasi IB."}
              {type === "EE" && "Extended Essay: esai riset mandiri ±4.000 kata dari salah satu mapel DP."}
              {type === "PP" && "Personal Project: proyek mandiri siswa MYP — tidak terikat satu mapel."}
            </p>
          </div>
          <input className="input" placeholder={type === "PP" ? "Mapel (opsional untuk PP)" : "Mata pelajaran"} value={subject}
            onChange={(e) => setSubject(e.target.value)} />
          <input className="input" placeholder={type === "PP" ? "Judul proyek / pertanyaan pemandu" : type === "EE" ? "Judul / research question" : "Judul / topik penelitian"} value={title}
            onChange={(e) => setTitle(e.target.value)} />
          <div className="flex gap-2">
            <input className="input flex-1" type="date" value={deadline}
              aria-label="Deadline proyek"
              onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <textarea className="input text-sm" rows={2} placeholder="Catatan (opsional)" value={notes}
            onChange={(e) => setNotes(e.target.value)} />
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)}
              className="flex-1 py-2 rounded-xl bg-[var(--bg-subtle)] text-[var(--ink-muted)] text-sm font-semibold">Batal</button>
            <button
              disabled={saving || !title || (type !== "PP" && !subject)}
              onClick={() => void saveProject()}
              className="flex-1 py-2 rounded-xl bg-[var(--brand-solid)] text-[var(--on-strong)] text-sm font-semibold disabled:opacity-50">
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </div>
      )}

      {projects.length === 0 && !showForm && (
        <p className="text-[var(--ink-muted)] text-sm text-center py-6">Belum ada proyek IA/EE/PP.<br /><span className="text-xs text-[var(--ink-muted)]">Tambahkan proyek untuk melacak milestone per tahap.</span></p>
      )}

      <div className="divide-y divide-[var(--border)]">
        {projects.map((proj) => {
          const done = proj.milestones.filter((m) => m.status === "done").length;
          const total = proj.milestones.length;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          const isExpanded = expanded === proj.id;
          const daysLeft = proj.deadline
            ? Math.ceil((new Date(proj.deadline).getTime() - todayMs) / 86400000)
            : null;
          return (
            <div key={proj.id} className="px-4 py-3">
              <button className="w-full text-left" aria-expanded={isExpanded}
                onClick={() => setExpanded(isExpanded ? null : proj.id)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${proj.type === "IA" ? "bg-[var(--brand-tint-strong)] text-[var(--ink-brand)]" : proj.type === "EE" ? "bg-[var(--accent-tint)] text-[var(--ink-purple)]" : "bg-[var(--bg-success)] text-[var(--ink-success)]"}`}>
                        {proj.type}
                      </span>
                      <span className="text-xs text-[var(--ink-muted)]">{proj.subject}</span>
                      {daysLeft !== null && (
                        <span className={`text-xs font-semibold ${daysLeft < 0 ? "text-[var(--ink-danger)]" : daysLeft < 14 ? "text-[var(--ink-attention)]" : "text-[var(--ink-muted)]"}`}>
                          {daysLeft < 0 ? `${Math.abs(daysLeft)}h terlambat` : `${daysLeft}h lagi`}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-[var(--ink-strong)] mt-1 line-clamp-2">{proj.title}</p>
                  </div>
                  <span className="text-[var(--ink-muted)] flex-shrink-0">{isExpanded ? "▲" : "▼"}</span>
                </div>
                {total > 0 && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-[var(--ink-muted)] mb-1">
                      <span>{done}/{total} milestone</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-[var(--bg-subtle)] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[var(--brand-solid)] transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}
              </button>

              {isExpanded && (
                <div className="mt-3 space-y-2">
                  {proj.notes && <p className="text-xs text-[var(--ink-muted)] italic">{proj.notes}</p>}

                  {proj.milestones.map((m) => (
                    <div key={m.id} className="flex items-start gap-2 bg-[var(--surface)] rounded-xl px-3 py-2">
                      <button
                        onClick={() => void cycleMilestone(proj.id, m)}
                        aria-label={`Ubah status milestone ${m.title}`}
                        className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs transition-colors mt-0.5 ${
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
                        {m.dueAt && (
                          <p className="text-xs text-[var(--ink-muted)] mt-0.5">Due: {m.dueAt}</p>
                        )}
                        {m.notes && <p className="text-xs text-[var(--ink-muted)] italic mt-0.5">{m.notes}</p>}
                      </div>
                      <button
                        onClick={async () => {
                          if (confirm(`Hapus milestone "${m.title}"?`)) await deleteMilestone(proj.id, m.id);
                        }}
                        aria-label={`Hapus milestone ${m.title}`}
                        className="text-[var(--ink-muted)] hover:text-[var(--ink-danger)] p-1 flex-shrink-0">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
                      </button>
                    </div>
                  ))}

                  {msFormFor === proj.id ? (
                    <div className="space-y-2 bg-[var(--brand-tint)] rounded-xl px-3 py-2">
                      <input className="input text-sm" placeholder="mis. Draft proposal, Bab 1, Revisi, Submit final" value={msTitle}
                        onChange={(e) => setMsTitle(e.target.value)} autoFocus />
                      <input className="input text-sm" type="date" value={msDue}
                        aria-label="Tanggal milestone"
                        onChange={(e) => setMsDue(e.target.value)} />
                      <div className="flex gap-2">
                        <button onClick={() => { setMsFormFor(null); setMsTitle(""); setMsDue(""); }}
                          className="flex-1 py-1.5 rounded-lg bg-[var(--bg-subtle)] text-[var(--ink-muted)] text-xs font-semibold">Batal</button>
                        <button
                          disabled={!msTitle}
                          onClick={async () => {
                            if (!msTitle) return;
                            await addMilestone(proj.id, {
                              id: crypto.randomUUID(), title: msTitle,
                              dueAt: msDue || undefined, status: "pending",
                            });
                            setMsFormFor(null); setMsTitle(""); setMsDue("");
                          }}
                          className="flex-1 py-1.5 rounded-lg bg-[var(--brand-solid)] text-[var(--on-strong)] text-xs font-semibold disabled:opacity-50">
                          + Tambah
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setMsFormFor(proj.id); setMsTitle(""); setMsDue(""); }}
                      className="w-full py-2 rounded-xl border border-dashed border-[var(--border)] text-xs text-[var(--ink-muted)] hover:border-[var(--border-brand)] hover:text-[var(--ink-brand)] transition-colors">
                      + Milestone
                    </button>
                  )}

                  <button
                    onClick={async () => {
                      if (confirm(`Hapus proyek "${proj.title}"?`)) {
                        await deleteIaEeProject(proj.id);
                        setExpanded(null);
                        notify("Proyek dihapus");
                      }
                    }}
                    className="w-full py-1.5 rounded-xl text-xs text-[var(--ink-danger)] hover:bg-[var(--bg-danger)] transition-colors">
                    <TrashIcon size={13} className="mr-1 inline align-[-2px]" /> Hapus Proyek
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
