/**
 * Shared WhatsApp billing (penagihan) message builder.
 * Used by StudentDetail (per-student billing) and the Rekap Keuangan
 * "Tutup Bulan" panel. Keeps a single source of truth for the message format.
 */
import type { Session, Settings, Student } from "../db/types";
import { dayLabel, monthLabel, formatRupiah } from "./format";

export interface BillingResult {
  text: string;
  totalHours: number;
  totalCost: number;
  count: number;
}

export interface BuildBillingArgs {
  student: Pick<Student, "name" | "hourlyRate">;
  /** A single student's sessions (any status/month) — filtered internally. */
  sessions: Session[];
  /** YYYY-MM billing period. */
  month: string;
  settings?: Pick<Settings, "bankAccounts" | "tutorProfile">;
  /** Override the headline total (e.g. an edited Payment amount). */
  amountOverride?: number;
  /** Periode bebas (tagihan laporan) — filter sesi pakai rentang ini, bukan bulan. */
  period?: { start: string; end: string };
  /** Label periode untuk baris judul pesan (mis. "20 Januari – 3 Februari 2026"). */
  periodLabelText?: string;
}

export function buildBillingMessage(args: BuildBillingArgs): BillingResult {
  const { student, sessions, month, settings, amountOverride, period, periodLabelText } = args;

  const billableSessions = sessions
    .filter((s) => (s.status === "DONE" || (s.status === "NO_SHOW" && s.noShowBillable))
      && (period ? s.date >= period.start && s.date <= period.end : s.date.startsWith(month)))
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalHours = billableSessions.reduce((sum, s) => sum + s.durationHours, 0);
  const sessionCost = billableSessions.reduce((sum, s) => sum + s.cost, 0);
  const totalCost = amountOverride ?? sessionCost;
  const bank = settings?.bankAccounts;

  const lines: string[] = [
    `NAMA MURID: ${student.name}`,
    ``,
    periodLabelText ?? monthLabel(month),
    ``,
  ];

  billableSessions.forEach((s) => {
    const dateShort = dayLabel(s.date).replace(/^\w+, /, "").replace(/ \d{4}$/, "");
    const subj = s.status === "NO_SHOW"
      ? "Tidak hadir (sesuai kebijakan)"
      : s.subjects.length > 0 ? s.subjects.join(", ") : "Sesi umum";
    lines.push(`📅 ${dateShort} — ${subj} (${s.durationHours}j)`);
  });

  lines.push(
    ``,
    `Total ${totalHours} jam — ${formatRupiah(totalCost)}`,
  );

  if (bank && (bank.bca || bank.cimb || bank.bri)) {
    lines.push(``);
    if (bank.bca)  lines.push(`BCA  ${bank.bca}`);
    if (bank.cimb) lines.push(`CIMB ${bank.cimb}`);
    if (bank.bri)  lines.push(`BRI  ${bank.bri}`);
    if (bank.accountName) lines.push(`a.n. ${bank.accountName}`);
  }

  lines.push(``, `Thank you 😇`, settings?.tutorProfile?.name || "Ko Lui");
  return { text: lines.join("\n"), totalHours, totalCost, count: billableSessions.length };
}

/** Convert a stored phone (e.g. "08xx" / "+62 8xx") to a wa.me number. */
export function toWaNumber(raw: string): string {
  return raw.replace(/^\+/, "").replace(/^0/, "62").replace(/[^0-9]/g, "");
}
