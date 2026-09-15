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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-700">IA / EE / PP Tracker</h2>
          <p className="text-xs text-gray-500 mt-0.5">IA = Internal Assessment (DP) · EE = Extended Essay (DP) · PP = Personal Project (MYP)</p>
        </div>
        <button
          onClick={() => { setShowForm((v) => !v); resetForm(); }}
          className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-semibold">
          + Proyek
        </button>
      </div>

      {/* Form proyek baru */}
      {showForm && (
        <div className="px-4 py-3 border-b border-gray-100 space-y-2 bg-blue-50">
          <div>
            <select className="input" value={type} aria-label="Jenis proyek"
              onChange={(e) => setType(e.target.value as IaEeType)}>
              <option value="IA">IA — Internal Assessment (per mapel DP)</option>
              <option value="EE">EE — Extended Essay (esai riset DP)</option>
              <option value="PP">PP — Personal Project (proyek pribadi MYP)</option>
            </select>
            <p className="text-xs text-blue-700 mt-1">
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
              className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold">Batal</button>
            <button
              disabled={saving || !title || (type !== "PP" && !subject)}
              onClick={() => void saveProject()}
              className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-50">
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </div>
      )}

      {projects.length === 0 && !showForm && (
        <p className="text-gray-500 text-sm text-center py-6">Belum ada proyek IA/EE/PP.<br /><span className="text-xs text-gray-400">Tambahkan proyek untuk melacak milestone per tahap.</span></p>
      )}

      <div className="divide-y divide-gray-100">
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
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${proj.type === "IA" ? "bg-blue-100 text-blue-700" : proj.type === "EE" ? "bg-purple-100 text-purple-700" : "bg-emerald-100 text-emerald-700"}`}>
                        {proj.type}
                      </span>
                      <span className="text-xs text-gray-500">{proj.subject}</span>
                      {daysLeft !== null && (
                        <span className={`text-xs font-semibold ${daysLeft < 0 ? "text-red-500" : daysLeft < 14 ? "text-orange-500" : "text-gray-500"}`}>
                          {daysLeft < 0 ? `${Math.abs(daysLeft)}h terlambat` : `${daysLeft}h lagi`}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-gray-800 mt-1 line-clamp-2">{proj.title}</p>
                  </div>
                  <span className="text-gray-500 flex-shrink-0">{isExpanded ? "▲" : "▼"}</span>
                </div>
                {total > 0 && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{done}/{total} milestone</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}
              </button>

              {isExpanded && (
                <div className="mt-3 space-y-2">
                  {proj.notes && <p className="text-xs text-gray-500 italic">{proj.notes}</p>}

                  {proj.milestones.map((m) => (
                    <div key={m.id} className="flex items-start gap-2 bg-gray-50 rounded-xl px-3 py-2">
                      <button
                        onClick={() => void cycleMilestone(proj.id, m)}
                        aria-label={`Ubah status milestone ${m.title}`}
                        className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs transition-colors mt-0.5 ${
                          m.status === "done" ? "bg-green-500 border-green-500 text-white" :
                          m.status === "in_progress" ? "bg-amber-400 border-amber-400 text-white" :
                          "border-gray-300 bg-white"
                        }`}>
                        {m.status === "done" ? "✓" : m.status === "in_progress" ? "…" : ""}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${m.status === "done" ? "line-through text-gray-500" : "text-gray-700"}`}>
                          {m.title}
                        </p>
                        {m.dueAt && (
                          <p className="text-xs text-gray-500 mt-0.5">Due: {m.dueAt}</p>
                        )}
                        {m.notes && <p className="text-xs text-gray-500 italic mt-0.5">{m.notes}</p>}
                      </div>
                      <button
                        onClick={async () => {
                          if (confirm(`Hapus milestone "${m.title}"?`)) await deleteMilestone(proj.id, m.id);
                        }}
                        aria-label={`Hapus milestone ${m.title}`}
                        className="text-gray-500 hover:text-red-400 p-1 flex-shrink-0">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
                      </button>
                    </div>
                  ))}

                  {msFormFor === proj.id ? (
                    <div className="space-y-2 bg-blue-50 rounded-xl px-3 py-2">
                      <input className="input text-sm" placeholder="mis. Draft proposal, Bab 1, Revisi, Submit final" value={msTitle}
                        onChange={(e) => setMsTitle(e.target.value)} autoFocus />
                      <input className="input text-sm" type="date" value={msDue}
                        aria-label="Tanggal milestone"
                        onChange={(e) => setMsDue(e.target.value)} />
                      <div className="flex gap-2">
                        <button onClick={() => { setMsFormFor(null); setMsTitle(""); setMsDue(""); }}
                          className="flex-1 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-semibold">Batal</button>
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
                          className="flex-1 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold disabled:opacity-50">
                          + Tambah
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setMsFormFor(proj.id); setMsTitle(""); setMsDue(""); }}
                      className="w-full py-2 rounded-xl border border-dashed border-gray-300 text-xs text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors">
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
                    className="w-full py-1.5 rounded-xl text-xs text-red-400 hover:bg-red-50 transition-colors">
                    🗑 Hapus Proyek
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
