// ── Payments + Month Closing + Expenses Repository ─────────────────

import { db } from "../db";
import type { Payment, MonthClosing, Expense, ExpenseCategory, IaEeMilestone } from "../types";
import { timestamp, monthRange } from "./helpers";
import { todayWIB } from "../../lib/format";
import { logAudit } from "./auditRepo";
import { isBillableSession } from "./sessionRepo";
import { isValidCurrencyAmount } from "../../lib/money";

// Re-export types for convenience
export type { ExpenseCategory, IaEeMilestone };

// ── Payments ───────────────────────────────────────────────────────

export async function getPayment(
  studentId: string, month: string
): Promise<Payment | undefined> {
  return db.payments
    .where("[studentId+month]")
    .equals([studentId, month])
    .first();
}

export async function upsertPayment(payment: Omit<Payment, "id">): Promise<void> {
  if (!isValidCurrencyAmount(payment.totalCost)) throw new Error("Invalid payment amount");
  const normalized: Omit<Payment, "id"> = {
    source: "manual",
    ...payment,
    paidAt: payment.status === "PAID" ? (payment.paidAt ?? todayWIB()) : undefined,
    method: payment.status === "PAID" ? payment.method : undefined,
  };
  await db.transaction("rw", db.payments, async () => {
    const existing = await getPayment(payment.studentId, payment.month);
    if (existing) {
      await db.payments.update(existing.id, normalized);
    } else {
      await db.payments.add({ ...normalized, id: crypto.randomUUID() });
    }
  });
}

export async function listPayments(month?: string): Promise<Payment[]> {
  if (month) {
    return db.payments
      .filter((p) => p.month === month)
      .toArray();
  }
  return db.payments.toArray();
}

/** Set a payment as transferred (cash received). */
export async function markPaymentTransferred(
  studentId: string, month: string, method = "transfer", paidAt = todayWIB()
): Promise<void> {
  await db.transaction("rw", db.payments, async () => {
    const existing = await getPayment(studentId, month);
    if (!existing) throw new Error("Payment not found");
    await db.payments.update(existing.id, { status: "PAID", paidAt, method });
  });
  await logAudit("payment.paid", "payment", studentId, `${month} paid ${paidAt} via ${method}`);
}

/** Mark a payment back to unpaid (undo "Sudah Transfer"). */
export async function markPaymentUnpaid(studentId: string, month: string): Promise<void> {
  await db.transaction("rw", db.payments, async () => {
    const existing = await getPayment(studentId, month);
    if (existing) {
      await db.payments.update(existing.id, { status: "UNPAID", paidAt: undefined, method: undefined });
    }
  });
  await logAudit("payment.unpaid", "payment", studentId, month);
}

/** Update only the billed amount of an existing payment (edit before sending). */
export async function updatePaymentAmount(
  studentId: string, month: string, totalCost: number
): Promise<void> {
  if (!isValidCurrencyAmount(totalCost)) throw new Error("Invalid payment amount");
  await db.transaction("rw", db.payments, async () => {
    const existing = await getPayment(studentId, month);
    if (!existing) throw new Error("Payment not found");
    await db.payments.update(existing.id, { totalCost });
  });
  await logAudit("payment.amount", "payment", studentId, `${month}: ${totalCost}`);
}

// ── Month Closing (Tutup Bulan) ────────────────────────────────────

export async function getMonthClosing(month: string): Promise<MonthClosing | undefined> {
  return db.monthClosings.where("month").equals(month).first();
}

export async function listMonthClosings(): Promise<MonthClosing[]> {
  return db.monthClosings.orderBy("month").reverse().toArray();
}

export interface StudentBill {
  studentId: string; name: string; count: number; hours: number; cost: number;
}

/** Compute per-student bill from completed sessions and chargeable no-shows. No DB writes. */
export async function computeMonthBills(month: string): Promise<StudentBill[]> {
  const { start, end } = monthRange(month);
  const sessions = await db.sessions
    .filter((s) => isBillableSession(s) && s.date >= start && s.date <= end)
    .toArray();
  const map = new Map<string, { count: number; hours: number; cost: number }>();
  for (const s of sessions) {
    const cur = map.get(s.studentId) ?? { count: 0, hours: 0, cost: 0 };
    map.set(s.studentId, {
      count: cur.count + 1,
      hours: cur.hours + s.durationHours,
      cost: cur.cost + s.cost,
    });
  }
  const bills = await Promise.all(
    [...map.entries()].map(async ([studentId, data]) => ({
      studentId,
      name: (await db.students.get(studentId))?.name ?? "(dihapus)",
      ...data,
    }))
  );
  return bills.sort((a, b) => b.cost - a.cost);
}

/** Close a month: auto-create a Payment (UNPAID) from completed sessions and chargeable no-shows. Idempotent. */
export async function closeMonth(month: string): Promise<void> {
  const bills = await computeMonthBills(month);
  await db.transaction("rw", db.payments, db.monthClosings, async () => {
    for (const b of bills) {
      const existing = await db.payments
        .where({ studentId: b.studentId })
        .filter((p) => p.month === month)
        .first();
      if (existing) continue;
      await db.payments.add({
        id: crypto.randomUUID(),
        studentId: b.studentId,
        month,
        totalCost: b.cost,
        status: "UNPAID",
        source: "auto",
      });
    }
    const existingClosing = await db.monthClosings.where("month").equals(month).first();
    await db.monthClosings.put({
      id: existingClosing?.id ?? crypto.randomUUID(),
      month,
      closedAt: timestamp(),
      totalPotensi: bills.reduce((s, b) => s + b.cost, 0),
      totalHours: bills.reduce((s, b) => s + b.hours, 0),
      studentCount: bills.length,
    });
  });
  await logAudit("month.close", "data", month, `${bills.length} tagihan dibuat`);
}

/** Reopen a month: drop the closing + any still-UNPAID auto-generated bills. */
export async function reopenMonth(month: string): Promise<void> {
  await db.transaction("rw", db.payments, db.monthClosings, async () => {
    const unpaid = await db.payments
      .filter((p) => p.month === month && p.status === "UNPAID" && p.source === "auto")
      .toArray();
    for (const p of unpaid) await db.payments.delete(p.id);
    const closing = await db.monthClosings.where("month").equals(month).first();
    if (closing) await db.monthClosings.delete(closing.id);
  });
}

// ── Cash Summary ───────────────────────────────────────────────────

export interface MonthCashSummary {
  month: string;
  potensi: number;
  realisasi: number;
  piutang: number;
  pengeluaran: number;
  laba: number;
  closed: boolean;
}

export async function getCashSummary(months: string[]): Promise<MonthCashSummary[]> {
  if (months.length === 0) return [];
  const { start: s1 } = monthRange(months[0]);
  const { end: eN } = monthRange(months[months.length - 1]);
  const sessions = await db.sessions
    .filter((s) => isBillableSession(s) && s.date >= s1 && s.date <= eN)
    .toArray();
  const payments = await listPayments();
  const expenses = await db.expenses
    .where("date").between(s1, eN, true, true)
    .toArray();
  const closings = await db.monthClosings.toArray();
  const closedSet = new Set(closings.map((c) => c.month));

  return months.map((month) => {
    const { start, end } = monthRange(month);
    const potensi = sessions.filter((s) => s.date >= start && s.date <= end).reduce((sum, s) => sum + s.cost, 0);
    // Cash follows the actual payment date. Legacy PAID rows without paidAt fall
    // back to their invoice month so old data does not disappear from reports.
    const realisasi = payments
      .filter((p) => p.status === "PAID" && (p.paidAt?.slice(0, 7) ?? p.month) === month)
      .reduce((sum, p) => sum + p.totalCost, 0);
    const piutang = payments.filter((p) => p.status === "UNPAID" && p.month === month).reduce((sum, p) => sum + p.totalCost, 0);
    const pengeluaran = expenses.filter((e) => e.date >= start && e.date <= end).reduce((sum, e) => sum + e.amount, 0);
    return { month, potensi, realisasi, piutang, pengeluaran, laba: realisasi - pengeluaran, closed: closedSet.has(month) };
  });
}

// ── Expenses ────────────────────────────────────────────────────────

export async function createExpense(
  input: Omit<Expense, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error("Invalid expense date");
  if (!input.description.trim()) throw new Error("Expense description is required");
  if (!isValidCurrencyAmount(input.amount)) throw new Error("Invalid expense amount");
  const id = crypto.randomUUID();
  const now = timestamp();
  await db.expenses.add({ ...input, description: input.description.trim(), id, createdAt: now, updatedAt: now });
  await logAudit("expense.create", "expense", id, `${input.date}: ${input.amount}`);
  return id;
}

export async function listExpenses(month?: string): Promise<Expense[]> {
  if (month) {
    const { start, end } = monthRange(month);
    return db.expenses
      .where("date").between(start, end, true, true)
      .sortBy("date");
  }
  return db.expenses.orderBy("date").reverse().toArray();
}

export async function listExpensesByCategory(category: ExpenseCategory): Promise<Expense[]> {
  return db.expenses.where("category").equals(category).sortBy("date");
}

export async function deleteExpense(id: string): Promise<void> {
  const expense = await db.expenses.get(id);
  if (!expense) return;
  await db.expenses.delete(id);
  await logAudit("expense.delete", "expense", id, `${expense.date}: ${expense.amount}`);
}

export async function getExpenseTotals(month: string): Promise<Record<string, number>> {
  const expenses = await listExpenses(month);
  const totals: Record<string, number> = {};
  for (const e of expenses) {
    totals[e.category] = (totals[e.category] ?? 0) + e.amount;
  }
  return totals;
}

export async function getMonthlyIncomeVsExpense(
  months: string[]
): Promise<{ month: string; income: number; expense: number; net: number }[]> {
  if (months.length === 0) return [];
  const { start: s1 } = monthRange(months[0]);
  const { end: eN } = monthRange(months[months.length - 1]);
  const payments = await db.payments.filter((p) => {
    if (p.status !== "PAID") return false;
    const cashDate = p.paidAt ?? `${p.month}-01`;
    return cashDate >= s1 && cashDate <= eN;
  }).toArray();
  const expenses = await db.expenses
    .where("date").between(s1, eN, true, true)
    .toArray();

  return months.map((month) => {
    const { start, end } = monthRange(month);
    const income = payments
      .filter((p) => {
        const cashDate = p.paidAt ?? `${p.month}-01`;
        return cashDate >= start && cashDate <= end;
      })
      .reduce((sum, payment) => sum + payment.totalCost, 0);
    const expense = expenses.filter((e) => e.date >= start && e.date <= end).reduce((sum, e) => sum + e.amount, 0);
    return { month, income, expense, net: income - expense };
  });
}
