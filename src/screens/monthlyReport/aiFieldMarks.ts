/**
 * Penanda "isian ini dibuat AI" per isian (G3-05 butir 8).
 *
 * Aturan yang dipakai: penanda **tidak** disimpan sebagai bendera yang harus
 * dibersihkan manual, melainkan sebagai fingerprint ISI saat AI menulisnya.
 * Selama isinya identik, penandanya cocok dan tetap tampil; begitu tutor
 * menyuntingnya, fingerprint tidak lagi cocok sehingga penandanya hilang sendiri.
 * Karena itu tidak ada jalur "lupa menghapus penanda setelah disunting".
 */

import type { AiReportField, MonthlyReport, NextMonthPlan, Session } from "../../db/types";
import { contentFingerprint } from "../../lib/aiIncremental";

export const AI_REPORT_FIELDS: readonly AiReportField[] = [
  "summaryText", "teacherNote", "quote", "nextMonthPlan",
];

/** Bagian rencana yang menentukan isinya — `updatedAt` sengaja dikecualikan agar
 *  menyimpan rencana yang sama (tanpa diubah) tidak menghapus penandanya. */
export function planContent(plan?: NextMonthPlan): string {
  if (!plan) return "";
  return JSON.stringify({
    parentSupport: plan.parentSupport ?? "",
    priorities: plan.priorities.map((item) => ({
      subject: item.subject,
      target: item.target,
      evidence: item.evidence ?? "",
      tutorAction: item.tutorAction ?? "",
      successMetric: item.successMetric ?? "",
      cadence: item.cadence ?? "",
      owner: item.owner ?? "",
      status: item.status ?? "",
    })),
  });
}

/** Isi sebuah isian laporan sebagai teks — satu sumber untuk fingerprint. */
export function reportFieldContent(field: AiReportField, report?: MonthlyReport): string {
  if (!report) return "";
  switch (field) {
    case "summaryText": return report.summaryText ?? "";
    case "teacherNote": return report.teacherNote ?? "";
    case "quote": return report.quote ?? "";
    case "nextMonthPlan": return planContent(report.nextMonthPlan);
  }
}

export function contentFingerprintOfField(field: AiReportField, content: string): number {
  return content ? contentFingerprint(field, content) : 0;
}

/**
 * Penanda baru untuk isian yang baru saja ditulis AI. `contents` memuat isi BARU
 * tiap isian (untuk rencana pakai `planContent(plan)`), dan isian yang tidak
 * disebut di dalamnya dibiarkan apa adanya.
 */
export function markAiFields(
  current: MonthlyReport["aiFieldHashes"],
  contents: Partial<Record<AiReportField, string>>,
): NonNullable<MonthlyReport["aiFieldHashes"]> {
  const next = { ...(current ?? {}) };
  for (const [field, content] of Object.entries(contents) as Array<[AiReportField, string]>) {
    const fingerprint = contentFingerprintOfField(field, content);
    if (fingerprint) next[field] = fingerprint;
  }
  return next;
}

/** True bila isian ini terakhir ditulis AI dan belum disunting manual sejak itu. */
export function isAiWritten(report: MonthlyReport | undefined, field: AiReportField): boolean {
  const marked = report?.aiFieldHashes?.[field];
  if (marked === undefined || marked === 0) return false;
  return marked === contentFingerprintOfField(field, reportFieldContent(field, report));
}

/**
 * Penanda AI pada NARASI satu sesi.
 *
 * Narasi hidup di sesinya, bukan di laporan, dan hash yang sudah ada
 * (`aiNarrativeHash`) **tidak** memuat teks narasi — ia sengaja hanya memuat
 * masukan yang dibaca AI, supaya menyunting narasi tidak membuat AI menulis
 * ulang tulisan tutor. Karena itu penanda tampilan memakai field terpisah
 * (`aiNarrativeTextHash`) yang berisi fingerprint teks narasi saat AI menulisnya:
 * begitu tutor menyunting narasinya, fingerprint tidak lagi cocok dan penandanya
 * hilang sendiri.
 */
export function narrativeIsAiWritten(session: Session): boolean {
  if (session.aiNarrativeTextHash === undefined) return false;
  return session.aiNarrativeTextHash
    === contentFingerprint("narrative", session.narrative ?? "");
}
