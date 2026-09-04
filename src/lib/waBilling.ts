/**
 * Shared WhatsApp billing (penagihan) message builder.
 * Used by StudentDetail (per-student billing) and the Rekap Keuangan
 * "Tutup Bulan" panel. Keeps a single source of truth for the message format.
 */
import type { Session, Settings, Student } from "../db/types";
import { billingPolicyOf } from "../db/types";
import { dayLabel, monthLabel, formatRupiah } from "./format";

export interface BillingResult {
  text: string;
  totalHours: number;
  totalCost: number;
  count: number;
}

/** Nada pesan tagihan — dipilih otomatis dari umur piutang bila tidak di-set. */
export type BillingTone = "normal" | "gentle" | "firm";

export interface BuildBillingArgs {
  student: Pick<Student, "name" | "hourlyRate" | "billingPolicy">;
  /** A single student's sessions (any status/month) — filtered internally. */
  sessions: Session[];
  /** YYYY-MM billing period. */
  month: string;
  settings?: Pick<Settings, "tutorProfile">;
  /** Override the headline total (e.g. an edited Payment amount). */
  amountOverride?: number;
  /** Periode bebas (tagihan laporan) — filter sesi pakai rentang ini, bukan bulan. */
  period?: { start: string; end: string };
  /** Label periode untuk baris judul pesan (mis. "20 Januari – 3 Februari 2026"). */
  periodLabelText?: string;
  /** Nada pesan. Default "normal" tidak menambah baris apa pun. */
  tone?: BillingTone;
}

const TONE_PREAMBLE: Record<BillingTone, string> = {
  normal: "",
  gentle: "Semoga sehat selalu 🙏",
  firm: "Salam hangat,",
};

const TONE_CLOSING: Record<BillingTone, string> = {
  normal: "Thank you 😇",
  gentle: "Thank you 😇",
  firm: "Thank you 😇",
};

export function buildBillingMessage(args: BuildBillingArgs): BillingResult {
  const { student, sessions, month, settings, amountOverride, period, periodLabelText, tone = "normal" } = args;

  const isSessionCount = billingPolicyOf(student) === "session_count";

  const billableSessions = sessions
    .filter((s) => (s.status === "DONE" || (s.status === "NO_SHOW" && s.noShowBillable))
      && (period ? s.date >= period.start && s.date <= period.end : s.date.startsWith(month)))
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalHours = billableSessions.reduce((sum, s) => sum + s.durationHours, 0);
  const sessionCost = billableSessions.reduce((sum, s) => sum + s.cost, 0);
  const totalCost = amountOverride ?? sessionCost;
  const lines: string[] = [
    `NAMA MURID: ${student.name}`,
    ``,
    periodLabelText ?? monthLabel(month),
    ``,
  ];

  // Preamble nada (baris pembuka opsional) disisipkan setelah judul.
  const preamble = TONE_PREAMBLE[tone];
  if (preamble) lines.splice(3, 0, preamble, "");

  // Pemisah antara judul (nama + rentang sesi) dan detail sesi.
  if (billableSessions.length > 0) {
    lines.push(`──────────────────`, ``);
  }

  billableSessions.forEach((s, index) => {
    const subj = s.status === "NO_SHOW"
      ? "Tidak hadir (sesuai kebijakan)"
      : s.subjects.length > 0 ? s.subjects.join(", ") : "Sesi umum";
    if (isSessionCount) {
      const dateShort = dayLabel(s.date).replace(/^\w+, /, "").replace(/ \d{4}$/, "");
      lines.push(`📌 ${dateShort} — ${subj} — Pertemuan ke-${index + 1}`);
    } else {
      const dateShort = dayLabel(s.date).replace(/^\w+, /, "").replace(/ \d{4}$/, "");
      lines.push(`📌 ${dateShort} — ${subj} (${s.durationHours}j)`);
    }
  });

  lines.push(
    ``,
    isSessionCount
      ? `Total ${billableSessions.length} pertemuan — ${formatRupiah(totalCost)}`
      : `Total ${totalHours} jam — ${formatRupiah(totalCost)}`,
  );

  lines.push(``, TONE_CLOSING[tone], settings?.tutorProfile?.name || "Ko Lui");
  return { text: lines.join("\n"), totalHours, totalCost, count: billableSessions.length };
}

/** Convert a stored phone (e.g. "08xx" / "+62 8xx") to a wa.me number. */
export function toWaNumber(raw: string): string {
  return raw.replace(/^\+/, "").replace(/^0/, "62").replace(/[^0-9]/g, "");
}
