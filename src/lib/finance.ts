import type { Expense, ExpenseCategory } from "../db/types";

/** Display label for each expense category (single source of truth). */
export const EXPENSE_LABELS: Record<ExpenseCategory, string> = {
  transport: "Transport",
  buku: "Buku",
  alat: "Alat",
  platform: "Platform",
  lainnya: "Lainnya",
};

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
