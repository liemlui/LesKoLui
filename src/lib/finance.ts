import type { Expense, ExpenseCategory, Payment } from "../db/types";

/** Default tempo pembayaran untuk invoice baru (hari kalender). */
export const DEFAULT_INVOICE_PAYMENT_TERMS_DAYS = 7;

const YMD_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Validasi tanggal kalender YYYY-MM-DD tanpa bergantung pada timezone perangkat. */
export function isValidYmd(value: unknown): value is string {
  if (typeof value !== "string" || !YMD_PATTERN.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

/** Tambah hari kalender pada tanggal YYYY-MM-DD secara timezone-safe. */
export function addDaysYmd(date: string, days: number): string {
  if (!isValidYmd(date)) throw new Error("Invalid invoice issue date");
  const utc = new Date(`${date}T00:00:00.000Z`);
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

/**
 * Default jatuh tempo invoice baru: tujuh hari kalender setelah tanggal terbit.
 * `issuedAt` boleh berupa YYYY-MM-DD atau ISO timestamp; hanya bagian tanggalnya
 * yang dipakai agar hasilnya stabil lintas timezone.
 */
export function defaultInvoiceDueAt(
  issuedAt: string,
  termsDays = DEFAULT_INVOICE_PAYMENT_TERMS_DAYS,
): string {
  const issueDate = issuedAt.slice(0, 10);
  return addDaysYmd(issueDate, termsDays);
}

/** Display label for each expense category (single source of truth). */
export const EXPENSE_LABELS: Record<ExpenseCategory, string> = {
  transport: "Transport",
  buku: "Buku",
  alat: "Alat",
  platform: "Platform",
  lainnya: "Lainnya",
};

// ── Piutang aging ──────────────────────────────────────────────────────
// Umur piutang mengikuti dueAt. Data lama tetap kompatibel melalui fallback
// periodEnd, lalu akhir bulan kalender anchor.

export type AgeBucket = "0-30" | "31-60" | ">60";

/** Hari terakhir sebuah bulan kalender, YYYY-MM-DD. */
export function lastDayOfMonth(month: string): string {
  const days = new Date(+month.slice(0, 4), +month.slice(5, 7), 0).getDate();
  return `${month}-${String(days).padStart(2, "0")}`;
}

/**
 * Jatuh tempo yang dibaca sistem. `dueAt` menang untuk invoice baru; invoice
 * lama tetap mempertahankan perilaku historisnya: akhir periode sesi, lalu akhir
 * bulan anchor. Parameter longgar agar juga aman dipakai saat migrasi backup.
 */
export function invoiceDueAt(input: {
  dueAt?: unknown;
  periodEnd?: unknown;
  month?: unknown;
}): string | undefined {
  if (isValidYmd(input.dueAt)) return input.dueAt;
  if (isValidYmd(input.periodEnd)) return input.periodEnd;
  if (typeof input.month === "string" && MONTH_PATTERN.test(input.month)) {
    return lastDayOfMonth(input.month);
  }
  return undefined;
}

/**
 * Umur piutang (hari) yang sudah lewat sejak jatuh tempo invoice.
 * groundedAt harus YYYY-MM-DD (default: hari ini). Tidak pernah negatif.
 */
export function invoiceAgeDays(
  payment: Pick<Payment, "dueAt" | "periodEnd" | "month">,
  groundedAt = todayYmd(),
): number {
  const ref = invoiceDueAt(payment) ?? lastDayOfMonth(payment.month);
  const delta = Date.parse(groundedAt) - Date.parse(ref);
  return delta > 0 ? Math.floor(delta / 86400000) : 0;
}

/** Kelompok umur piutang sesuai aturan 0–30 / 31–60 / >60 hari. */
export function ageBucket(days: number): AgeBucket {
  if (days <= 30) return "0-30";
  if (days <= 60) return "31-60";
  return ">60";
}

export const AGE_BUCKET_LABEL: Record<AgeBucket, string> = {
  "0-30": "≤ 30 hari",
  "31-60": "31–60 hari",
  ">60": "> 60 hari",
};

export const AGE_BUCKET_CLASS: Record<AgeBucket, string> = {
  "0-30": "bg-gray-100 text-gray-600",
  "31-60": "bg-amber-100 text-amber-700",
  ">60": "bg-red-100 text-red-700",
};

function todayYmd(): string {
  const now = new Date();
  const tz = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return tz.toISOString().slice(0, 10);
}

/**
 * Lama hari dari jatuh tempo invoice hingga pembayaran.
 * Gunakan untuk analitik kolektibilitas dan koreksi forecast.
 */
export function daysToPayProxy(
  payment: Pick<Payment, "status" | "dueAt" | "month" | "periodEnd" | "paidAt">,
): number | undefined {
  if (payment.status !== "PAID" || !payment.paidAt) return undefined;
  const ref = invoiceDueAt(payment) ?? lastDayOfMonth(payment.month);
  const delta = Date.parse(payment.paidAt) - Date.parse(ref);
  return delta > 0 ? Math.floor(delta / 86400000) : 0;
}

/**
 * Waktu terbit invoice: createdAt jika ada, fallback ke paidAt/periodEnd/akhir bulan.
 */
export function invoiceIssuedAt(
  payment: Pick<Payment, "createdAt" | "paidAt" | "periodEnd" | "month">,
): string {
  return payment.createdAt
    ?? payment.paidAt
    ?? payment.periodEnd
    ?? lastDayOfMonth(payment.month);
}

// ── Laba bersih per murid ─────────────────────────────────────────

export interface StudentProfitRow {
  studentId: string;
  name: string;
  income: number;
  directExpense: number;
  netProfit: number;
}

/**
 * Laba bersih per murid — pengeluaran umum (tanpa studentId) tidak dialokasikan.
 * Semua angka dalam IDR.
 */
export function computeStudentProfit(
  students: readonly { id: string; name: string; active: boolean }[],
  payments: readonly { studentId: string; status: string; totalCost: number }[],
  expenses: readonly { studentId?: string; amount: number }[],
): { rows: StudentProfitRow[]; commonExpense: number } {
  const incomeByStudent = new Map<string, number>();
  for (const p of payments) {
    if (p.status !== "PAID") continue;
    incomeByStudent.set(p.studentId, (incomeByStudent.get(p.studentId) ?? 0) + p.totalCost);
  }
  const expenseByStudent = new Map<string, number>();
  let commonExpense = 0;
  for (const e of expenses) {
    if (e.studentId) {
      expenseByStudent.set(e.studentId, (expenseByStudent.get(e.studentId) ?? 0) + e.amount);
    } else {
      commonExpense += e.amount;
    }
  }
  const rows = students
    .filter((s) => s.active)
    .map((s) => {
      const income = incomeByStudent.get(s.id) ?? 0;
      const directExpense = expenseByStudent.get(s.id) ?? 0;
      return { studentId: s.id, name: s.name, income, directExpense, netProfit: income - directExpense };
    })
    .sort((a, b) => b.netProfit - a.netProfit);
  return { rows, commonExpense };
}

/**
 * Aggregate expense totals per category — the reduce logic previously
 * duplicated across the ringkasan, AI insight, and pengeluaran views.
 */
export function sumExpensesByCategory(
  expenses: readonly Expense[],
): Map<string, number> {
  return expenses.reduce((map, expense) => {
    map.set(expense.category, (map.get(expense.category) ?? 0) + expense.amount);
    return map;
  }, new Map<string, number>());
}

const idrNumberFormat = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Format a number as full IDR currency, e.g. 150000 → "Rp 150.000". */
export function formatIdrNumber(v: number): string {
  return idrNumberFormat.format(v);
}
