/**
 * Panel "Fokus & Rencana Berikutnya" (butir 8 G3-05 untuk isian rencana).
 *
 * Penanda "dibuat AI" untuk rencana dihitung dari isi rencananya (fingerprint),
 * sehingga begitu tutor menyunting prioritas atau dukungan di rumah, penandanya
 * hilang sendiri. `updatedAt` sengaja tidak ikut dihitung supaya menyimpan
 * rencana yang sama tidak menghapus penandanya.
 */

import { useEffect, useState } from "react";
import { TargetIcon } from "../../components/icons";
import { PLAN_STATUSES } from "./helpers";
import { isAiWritten } from "./aiFieldMarks";
import { NextMonthPlanEditor } from "./NextMonthPlanEditor";
import type { MonthlyReport, NextMonthPlan } from "../../db/types";

interface ReportPlanPanelProps {
  open: boolean;
  onToggle: () => void;
  report: MonthlyReport;
  /** Berubah → mode penyuntingan di dalam panel direset. */
  scopeKey: string;
  onSavePlan: (plan: NextMonthPlan) => Promise<void>;
  /** AI aktif (kunci + tombol hidup) → tampilkan petunjuk tombol AI. */
  aiEnabled: boolean;
}

export default function ReportPlanPanel({
  open, onToggle, report, scopeKey, onSavePlan, aiEnabled,
}: ReportPlanPanelProps) {
  const [editingPlan, setEditingPlan] = useState(false);
  useEffect(() => { setEditingPlan(false); }, [scopeKey]);

  const hasPlan = Boolean(report.nextMonthPlan?.priorities.some((item) => item.target.trim()));
  const aiMarked = isAiWritten(report, "nextMonthPlan");

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] shadow-sm">
      <button
        className="flex w-full items-center justify-between p-4 text-left"
        aria-expanded={open}
        onClick={onToggle}
      >
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-[var(--ink-strong)]">
              <TargetIcon size={13} className="mr-1 inline align-[-2px]" /> Fokus &amp; Rencana Berikutnya
            </p>
            {aiMarked && (
              <span className="rounded-full bg-[var(--accent-tint)] px-1.5 py-0.5 text-xs font-bold text-[var(--ink-accent)]">
                ✨ AI
              </span>
            )}
            {hasPlan && (
              <span className="rounded-full bg-[var(--bg-success)] px-1.5 py-0.5 text-xs font-bold text-[var(--ink-success)]">Siap</span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
            {hasPlan
              ? `${report.nextMonthPlan!.priorities.filter((item) => item.target.trim()).length} prioritas terukur`
              : "Tetapkan maksimal 3 prioritas yang bisa ditindaklanjuti."}
          </p>
        </div>
        <span className="text-sm text-[var(--ink-muted)]">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-[var(--border)] px-4 pb-4">
          {editingPlan ? (
            <NextMonthPlanEditor
              initialPlan={report.nextMonthPlan}
              onSave={onSavePlan}
              onCancel={() => setEditingPlan(false)}
            />
          ) : (
            <>
              {hasPlan ? (
                <div className="space-y-2 pt-3">
                  {report.nextMonthPlan!.priorities.filter((item) => item.target.trim()).slice(0, 3).map((item, index) => (
                    <div key={item.id} className="rounded-xl border border-[var(--border-accent)] bg-[var(--accent-tint)]/40 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-[var(--ink-strong)]">
                          {index + 1}. {item.subject || `Prioritas ${index + 1}`}
                        </p>
                        <span className="rounded-full bg-[var(--surface-strong)] px-2 py-0.5 text-xs font-semibold text-[var(--ink-accent)]">
                          {PLAN_STATUSES.find((status) => status.value === item.status)?.label ?? "Belum dimulai"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-[var(--ink-strong)]">{item.target}</p>
                      {item.evidence && <p className="mt-1.5 text-xs text-[var(--ink-muted)]">Dasar: {item.evidence}</p>}
                      {(item.tutorAction || item.successMetric || item.cadence) && (
                        <p className="mt-1.5 text-xs text-[var(--ink-accent)]">
                          {item.tutorAction && `Tutor: ${item.tutorAction}`}
                          {item.tutorAction && (item.successMetric || item.cadence) && " · "}
                          {item.successMetric && `Cek: ${item.successMetric}`}
                          {item.successMetric && item.cadence && " · "}
                          {item.cadence}
                        </p>
                      )}
                    </div>
                  ))}
                  {report.nextMonthPlan?.parentSupport && (
                    <p className="rounded-lg bg-[var(--bg-warn)] px-3 py-2 text-xs text-[var(--ink-warn)]">
                      <strong>Dukungan di rumah:</strong> {report.nextMonthPlan.parentSupport}
                    </p>
                  )}
                </div>
              ) : (
                <p className="pt-3 text-sm text-[var(--ink-muted)]">
                  Belum ada rencana. Mulai dari target yang spesifik, cara belajar, dan indikator keberhasilan.
                </p>
              )}
              <button className="btn btn-secondary w-full text-sm" onClick={() => setEditingPlan(true)}>
                {hasPlan ? "Edit Rencana" : "＋ Susun Rencana"}
              </button>
              {aiEnabled && (
                <p className="pt-1 text-xs text-[var(--ink-muted)]">
                  Ringkasan, catatan guru &amp; rencana depan ikut diisi oleh tombol <strong>Isi Semua dengan AI</strong> di panel atas.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
