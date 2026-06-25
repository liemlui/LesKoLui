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
}

export function buildBillingMessage(args: BuildBillingArgs): BillingResult {
  const { student, sessions, month, settings, amountOverride } = args;

  const doneSessions = sessions
    .filter((s) => s.status === "DONE" && s.date.startsWith(month))
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalHours = doneSessions.reduce((sum, s) => sum + s.durationHours, 0);
  const sessionCost = doneSessions.reduce((sum, s) => sum + s.cost, 0);
  const totalCost = amountOverride ?? sessionCost;
  const rateStr = formatRupiah(student.hourlyRate);
  const bank = settings?.bankAccounts;

  const lines: string[] = [
    `LES KO LUI`,
    `${monthLabel(month)}`,
    ``,
    `NAMA MURID: ${student.name}`,
    ``,
    `Rincian sesi:`,
  ];

  doneSessions.forEach((s) => {
    const dateShort = dayLabel(s.date).replace(/^\w+, /, "").replace(/ \d{4}$/, "");
    const subj = s.subjects.length > 0 ? s.subjects.join(", ") : "Sesi umum";
    lines.push(`• ${dateShort} — ${subj} (${s.durationHours}j)`);
  });

  lines.push(
    `━━━━━━━━━━━━━━`,
    `⏱ Total: ${totalHours} jam × ${rateStr}`,
    `💵 Total: ${formatRupiah(totalCost)}`,
  );

  if (bank && (bank.bca || bank.cimb || bank.bri)) {
    lines.push(``, `🏦 Transfer ke:`);
    if (bank.bca)  lines.push(`BCA ${bank.bca}${bank.accountName ? ` a.n. ${bank.accountName}` : ""}`);
    if (bank.cimb) lines.push(`CIMB ${bank.cimb}${bank.accountName ? ` a.n. ${bank.accountName}` : ""}`);
    if (bank.bri)  lines.push(`BRI ${bank.bri}${bank.accountName ? ` a.n. ${bank.accountName}` : ""}`);
  }

  lines.push(``, `Thank you 😇`, settings?.tutorProfile?.name || "Ko Lui");
  return { text: lines.join("\n"), totalHours, totalCost, count: doneSessions.length };
}

/** Convert a stored phone (e.g. "08xx" / "+62 8xx") to a wa.me number. */
export function toWaNumber(raw: string): string {
  return raw.replace(/^\+/, "").replace(/^0/, "62").replace(/[^0-9]/g, "");
}
