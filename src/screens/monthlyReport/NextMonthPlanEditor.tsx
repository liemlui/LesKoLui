/**
 * Editor rencana bulan berikutnya (max 3 prioritas) — dipakai di halaman
 * Laporan Bulanan. Dipecah dari MonthlyReport.tsx.
 */

import { useState } from "react";
import { PLAN_OWNERS, PLAN_STATUSES, newPlanItem, createEmptyPlan } from "./helpers";
import type { NextMonthPlan, MonthlyPlanItem, PlanOwner, PlanStatus } from "../../db/types";

export function NextMonthPlanEditor({ initialPlan, onSave, onCancel }: {
  initialPlan?: NextMonthPlan;
  onSave: (plan: NextMonthPlan) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<NextMonthPlan>(() => initialPlan
    ? {
      priorities: initialPlan.priorities.length > 0 ? initialPlan.priorities.map((item) => ({ ...item })) : [newPlanItem()],
      parentSupport: initialPlan.parentSupport ?? "",
      updatedAt: initialPlan.updatedAt,
    }
    : createEmptyPlan());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const updateItem = (id: string, patch: Partial<MonthlyPlanItem>) => {
    setDraft((plan) => ({
      ...plan,
      priorities: plan.priorities.map((item) => item.id === id ? { ...item, ...patch } : item),
    }));
  };

  const removeItem = (id: string) => {
    setDraft((plan) => ({
      ...plan,
      priorities: plan.priorities.length === 1 ? plan.priorities : plan.priorities.filter((item) => item.id !== id),
    }));
  };

  const save = async () => {
    const priorities = draft.priorities
      .map((item) => ({
        ...item,
        subject: item.subject.trim(),
        evidence: item.evidence?.trim(),
        target: item.target.trim(),
        tutorAction: item.tutorAction?.trim(),
        successMetric: item.successMetric?.trim(),
        cadence: item.cadence?.trim(),
      }))
      .filter((item) => item.target);
    if (priorities.length === 0) {
      setError("Isi minimal satu target belajar yang spesifik.");
      return;
    }
    setSaving(true);
    try {
      await onSave({ priorities, parentSupport: draft.parentSupport?.trim() });
    } catch (e) {
      setError("Gagal menyimpan: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 pt-3">
      <div className="rounded-xl bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
        Pilih maksimal tiga prioritas. Buat target yang dapat dilihat hasilnya, bukan hanya “lebih memahami materi”.
      </div>
      {draft.priorities.map((item, index) => (
        <div key={item.id} className="rounded-xl border border-gray-200 p-3 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-gray-700">Prioritas {index + 1}</p>
            {draft.priorities.length > 1 && (
              <button type="button" className="text-xs font-semibold text-red-500" onClick={() => removeItem(item.id)}>Hapus</button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor={`mr-mapel-${item.id}`} className="label">Mapel / area</label>
              <input id={`mr-mapel-${item.id}`} className="input text-sm" value={item.subject}
                placeholder="Contoh: Matematika AA"
                onChange={(event) => updateItem(item.id, { subject: event.target.value })} />
            </div>
            <div>
              <label htmlFor={`mr-penanggung-jawab-${item.id}`} className="label">Penanggung jawab</label>
              <select id={`mr-penanggung-jawab-${item.id}`} className="input text-sm" value={item.owner ?? "shared"}
                onChange={(event) => updateItem(item.id, { owner: event.target.value as PlanOwner })}>
                {PLAN_OWNERS.map((owner) => <option key={owner.value} value={owner.value}>{owner.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor={`mr-target-${item.id}`} className="label">Target terukur *</label>
            <textarea id={`mr-target-${item.id}`} className="input text-sm" rows={2} value={item.target}
              placeholder="Contoh: Menyelesaikan 8 dari 10 soal fungsi kuadrat dengan langkah lengkap."
              onChange={(event) => updateItem(item.id, { target: event.target.value })} />
          </div>
          <div>
            <label htmlFor={`mr-dasar-${item.id}`} className="label">Dasar dari periode ini</label>
            <textarea id={`mr-dasar-${item.id}`} className="input text-sm" rows={2} value={item.evidence ?? ""}
              placeholder="Contoh: Masih keliru pada operasi tanda negatif di soal cerita."
              onChange={(event) => updateItem(item.id, { evidence: event.target.value })} />
          </div>
          <div>
            <label htmlFor={`mr-langkah-tutor-${item.id}`} className="label">Langkah tutor</label>
            <textarea id={`mr-langkah-tutor-${item.id}`} className="input text-sm" rows={2} value={item.tutorAction ?? ""}
              placeholder="Contoh: Latihan bertahap, cek langkah, lalu soal aplikasi."
              onChange={(event) => updateItem(item.id, { tutorAction: event.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor={`mr-indikator-${item.id}`} className="label">Indikator berhasil</label>
              <input id={`mr-indikator-${item.id}`} className="input text-sm" value={item.successMetric ?? ""}
                placeholder="8/10 soal tepat"
                onChange={(event) => updateItem(item.id, { successMetric: event.target.value })} />
            </div>
            <div>
              <label htmlFor={`mr-frekuensi-${item.id}`} className="label">Frekuensi / waktu</label>
              <input id={`mr-frekuensi-${item.id}`} className="input text-sm" value={item.cadence ?? ""}
                placeholder="2 sesi per minggu"
                onChange={(event) => updateItem(item.id, { cadence: event.target.value })} />
            </div>
          </div>
          <div>
            <label htmlFor={`mr-status-${item.id}`} className="label">Status</label>
            <select id={`mr-status-${item.id}`} className="input text-sm" value={item.status ?? "planned"}
              onChange={(event) => updateItem(item.id, { status: event.target.value as PlanStatus })}>
              {PLAN_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
            </select>
          </div>
        </div>
      ))}
      {draft.priorities.length < 3 && (
        <button type="button" className="w-full rounded-xl border border-dashed border-indigo-300 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50"
          onClick={() => setDraft((plan) => ({ ...plan, priorities: [...plan.priorities, newPlanItem()] }))}>
          ＋ Tambah Prioritas
        </button>
      )}
      <div>
        <label htmlFor="mr-dukungan" className="label">Dukungan di rumah (opsional)</label>
        <textarea id="mr-dukungan" className="input text-sm" rows={2} value={draft.parentSupport ?? ""}
          placeholder="Contoh: Sediakan 10 menit latihan mandiri dua kali seminggu."
          onChange={(event) => setDraft((plan) => ({ ...plan, parentSupport: event.target.value }))} />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button className="btn btn-secondary flex-1 text-sm" onClick={onCancel} disabled={saving}>Batal</button>
        <button className="btn btn-primary flex-1 text-sm" onClick={save} disabled={saving}>
          {saving ? "Menyimpan..." : "Simpan Rencana"}
        </button>
      </div>
    </div>
  );
}
