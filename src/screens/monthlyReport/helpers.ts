/**
 * Helper murni untuk halaman Laporan Bulanan — konstanta + fungsi kecil yang
 * tidak bergantung pada React. Dipecah dari MonthlyReport.tsx agar file utama
 * lebih ramping dan mudah dibaca (serta murah token saat dibaca AI).
 */

import type { MonthlyPlanItem, PlanOwner, PlanStatus, NextMonthPlan, Session } from "../../db/types";

export const EMPTY_SUBJECT_LABEL = "Mapel belum diisi";
export const PLAN_OWNERS: Array<{ value: PlanOwner; label: string }> = [
  { value: "shared", label: "Bersama" },
  { value: "tutor", label: "Tutor" },
  { value: "student", label: "Murid" },
  { value: "parent", label: "Orang tua" },
];
export const PLAN_STATUSES: Array<{ value: PlanStatus; label: string }> = [
  { value: "planned", label: "Belum dimulai" },
  { value: "in_progress", label: "Berjalan" },
  { value: "achieved", label: "Tercapai" },
];

export function newPlanItem(): MonthlyPlanItem {
  return {
    id: crypto.randomUUID(),
    subject: "",
    target: "",
    owner: "shared",
    status: "planned",
  };
}

export function createEmptyPlan(): NextMonthPlan {
  return { priorities: [newPlanItem()], parentSupport: "" };
}

export function normaliseAiPlan(plan?: {
  priorities?: Array<Partial<Omit<MonthlyPlanItem, "id">>>;
  parentSupport?: string;
}): NextMonthPlan | undefined {
  const priorities = (plan?.priorities ?? [])
    .filter((item) => item.target?.trim())
    .slice(0, 3)
    .map((item) => ({
      id: crypto.randomUUID(),
      subject: item.subject?.trim() || EMPTY_SUBJECT_LABEL,
      evidence: item.evidence?.trim(),
      target: item.target!.trim(),
      tutorAction: item.tutorAction?.trim(),
      successMetric: item.successMetric?.trim(),
      cadence: item.cadence?.trim(),
      owner: PLAN_OWNERS.some((owner) => owner.value === item.owner) ? item.owner : "shared",
      status: "planned" as const,
    }));
  if (priorities.length === 0) return undefined;
  return { priorities, parentSupport: plan?.parentSupport?.trim(), updatedAt: new Date().toISOString() };
}

export function cleanText(value?: string): string {
  return value?.trim() ?? "";
}

export function formatHours(hours: number): string {
  const normalized = Number.isInteger(hours) ? String(hours) : String(hours).replace(".", ",");
  return `${normalized} jam`;
}

export function sessionSubjectLabel(subjects: string[]): string {
  const cleanSubjects = subjects.map((subject) => subject.trim()).filter(Boolean);
  return cleanSubjects.length > 0 ? cleanSubjects.join(", ") : EMPTY_SUBJECT_LABEL;
}

export function sessionTimeLabel(session: Session): string | undefined {
  if (session.timeIn && session.timeOut) return `${session.timeIn}-${session.timeOut}`;
  if (session.time) return `Jam ${session.time}`;
  return undefined;
}

export function buildSessionNarrative(session: Session, subject: string): string {
  const baseNote = cleanText(session.narrative) || cleanText(session.shortNote);
  const extraNotes = [
    cleanText(session.topic) ? `Topik yang dibahas: ${cleanText(session.topic)}.` : undefined,
    cleanText(session.needsWork) ? `Area perhatian: ${cleanText(session.needsWork)}.` : undefined,
  ].filter((note): note is string => Boolean(note));

  if (baseNote && extraNotes.length > 0) return `${baseNote} ${extraNotes.join(" ")}`;
  if (baseNote) return baseNote;
  if (extraNotes.length > 0) return extraNotes.join(" ");
  // Fallback netral — teks ini ikut tercetak di laporan orang tua, jangan berisi instruksi untuk tutor
  return `Sesi ${subject} berlangsung selama ${formatHours(session.durationHours)}.`;
}

/* ── Penunjuk langkah alur laporan (G3-05 butir 1) ──────────────────── */

/** Cara memilih periode laporan: bulan kalender, N sesi, atau rentang tanggal. */
export type RecapMode = "bulan" | "jumlah" | "range";

export type ReportStepId = "murid" | "periode" | "laporan" | "narasi" | "ekspor";

export interface ReportStep {
  id: ReportStepId;
  label: string;
}

/** Lima langkah yang selalu terlihat di bilah aksi tetap, berurutan. */
export const REPORT_STEPS: readonly ReportStep[] = [
  { id: "murid", label: "Pilih murid" },
  { id: "periode", label: "Pilih periode" },
  { id: "laporan", label: "Buat laporan" },
  { id: "narasi", label: "Isi narasi" },
  { id: "ekspor", label: "Ekspor" },
];

export interface ReportStepState {
  hasStudent: boolean;
  hasPeriod: boolean;
  hasReport: boolean;
  /** Semua sesi laporan sudah punya narasi. */
  allNarrativesReady: boolean;
}

/** Langkah yang sedang berjalan — indeks ke dalam `REPORT_STEPS`. */
export function reportStepIndex(state: ReportStepState): number {
  if (!state.hasStudent) return 0;
  if (!state.hasPeriod) return 1;
  if (!state.hasReport) return 2;
  if (!state.allNarrativesReady) return 3;
  return 4;
}

/* ── Kesiapan laporan (G3-05 butir 7) ───────────────────────────────── */

export interface ReportReadinessItem {
  label: string;
  complete: boolean;
}

/**
 * Kesiapan SELALU dihitung dari seluruh sesi laporan — bukan dari sesi yang
 * sedang tersaring penyaring mapel. Cakupan penyaring ditampilkan terpisah
 * sebagai chip, supaya angka kesiapan tidak pernah ikut berubah hanya karena
 * tutor menyaring tampilan.
 */
export function buildReportReadiness(input: {
  totalSessions: number;
  sessionsWithNarrative: number;
  hasSummary: boolean;
  hasTeacherNote: boolean;
  hasPlan: boolean;
}): ReportReadinessItem[] {
  return [
    {
      label: "Narasi sesi",
      complete: input.totalSessions > 0
        && input.sessionsWithNarrative === input.totalSessions,
    },
    { label: "Ringkasan", complete: input.hasSummary },
    { label: "Catatan guru", complete: input.hasTeacherNote },
    { label: "Rencana depan", complete: input.hasPlan },
  ];
}

/** Chip cakupan penyaring — hanya muncul saat penyaring benar-benar menyaring. */
export function scopeChipLabel(shown: number, total: number, filtered: boolean): string | undefined {
  if (!filtered || shown === total) return undefined;
  return `Menampilkan ${shown} dari ${total} sesi`;
}

