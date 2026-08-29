import type { Expense, ExpenseCategory, Payment } from "../db/types";

/** Display label for each expense category (single source of truth). */
export const EXPENSE_LABELS: Record<ExpenseCategory, string> = {
  transport: "Transport",
  buku: "Buku",
  alat: "Alat",
  platform: "Platform",
  lainnya: "Lainnya",
};

// ── Piutang aging ──────────────────────────────────────────────────────
// Tanpa migrasi schema: umur piutang dihitung dari akhir periode tagihan
// (periodEnd, atau akhir bulan kalender untuk yang lama). Cukup adil untuk
// siklus bulanan & paket; presisi penuh memakai Payment.createdAt (Fase 3).

export type AgeBucket = "0-30" | "31-60" | ">60";

/** Hari terakhir sebuah bulan kalender, YYYY-MM-DD. */
export function lastDayOfMonth(month: string): string {
  const days = new Date(+month.slice(0, 4), +month.slice(5, 7), 0).getDate();
  return `${month}-${String(days).padStart(2, "0")}`;
}

/**
 * Umur piutang (hari) yang sudah lewat sejak akhir periode tagihan.
 * groundedAt harus YYYY-MM-DD (default: hari ini). Tidak pernah negatif.
 */
export function invoiceAgeDays(
  payment: Pick<Payment, "periodEnd" | "month">,
  groundedAt = todayYmd(),
): number {
  const ref = payment.periodEnd ?? lastDayOfMonth(payment.month);
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
 * Lama hari dari akhir periode tagihan hingga pembayaran (proxy tanpa created_at).
 * Gunakan untuk analitik kolektibilitas dan koreksi forecast.
 */
export function daysToPayProxy(
  payment: Pick<Payment, "status" | "month" | "periodEnd" | "paidAt">,
): number | undefined {
  if (payment.status !== "PAID" || !payment.paidAt) return undefined;
  const ref = payment.periodEnd ?? lastDayOfMonth(payment.month);
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
