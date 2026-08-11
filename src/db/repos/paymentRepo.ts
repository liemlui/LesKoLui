// ── Payments + Month Closing + Expenses Repository ─────────────────

import { db } from "../db";
import type { Payment, MonthClosing, Expense, ExpenseCategory, IaEeMilestone, MonthlyReport, ReportStatus } from "../types";
import { reportStatus } from "../types";
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
  const payments = await db.payments
    .where("[studentId+month]")
    .equals([studentId, month])
    .toArray();
  // Legacy student+month actions mean the standalone/manual invoice when it
  // coexists with report invoices. Fall back deterministically for old callers.
  return payments.find((payment) => !payment.reportId)
    ?? payments.sort((a, b) => a.id.localeCompare(b.id))[0];
}

async function getUnlinkedMonthPayment(
  studentId: string,
  month: string
): Promise<Payment | undefined> {
  return db.payments
    .where("[studentId+month]")
    .equals([studentId, month])
    .filter((payment) => !payment.reportId)
    .first();
}

export type ManualPaymentInput = Omit<
  Payment,
  "id" | "source" | "reportId" | "periodStart" | "periodEnd"
>;

function normalizeManualPayment(payment: ManualPaymentInput): Omit<Payment, "id"> {
  return {
    ...payment,
    source: "manual",
    paidAt: payment.status === "PAID" ? (payment.paidAt ?? todayWIB()) : undefined,
    method: payment.status === "PAID" ? payment.method : undefined,
  };
}

/**
 * Create exactly one unlinked manual invoice for a student/month. Report-tied
 * invoices are deliberately ignored, so a manual invoice may coexist beside
 * them without ever overwriting their immutable accounting state.
 */
export async function createManualPayment(payment: ManualPaymentInput): Promise<string> {
  if (!isValidCurrencyAmount(payment.totalCost)) throw new Error("Invalid payment amount");
  return db.transaction("rw", db.payments, async () => {
    if (await getUnlinkedMonthPayment(payment.studentId, payment.month)) {
      throw new Error("Manual payment already exists for this student and month");
    }
    const id = crypto.randomUUID();
    await db.payments.add({ ...normalizeManualPayment(payment), id });
    return id;
  });
}

export async function upsertPayment(payment: Omit<Payment, "id">): Promise<void> {
  if (!isValidCurrencyAmount(payment.totalCost)) throw new Error("Invalid payment amount");
  const normalized: Omit<Payment, "id"> = {
    ...payment,
    source: payment.reportId ? (payment.source ?? "auto") : "manual",
    paidAt: payment.status === "PAID" ? (payment.paidAt ?? todayWIB()) : undefined,
    method: payment.status === "PAID" ? payment.method : undefined,
  };
  await db.transaction("rw", db.payments, async () => {
    const existing = payment.reportId
      ? await getPaymentByReport(payment.reportId)
      : await getUnlinkedMonthPayment(payment.studentId, payment.month);
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
    // Nominal diubah manual → tagihan bukan lagi "auto" dari sesi; sesi yang
    // dihapus setelah ini tidak boleh mengubah nominal yang sudah disepakati.
    await db.payments.update(existing.id, { totalCost, source: "manual" });
  });
  await logAudit("payment.amount", "payment", studentId, `${month}: ${totalCost}`);
}

// ── Tagihan per Laporan (rekap periode) ────────────────────────────

export async function getPaymentByReport(reportId: string): Promise<Payment | undefined> {
  return db.payments.where("reportId").equals(reportId).first();
}

type ReportPaymentInput = Pick<
  MonthlyReport,
  "id" | "studentId" | "month" | "periodStart" | "periodEnd" | "totalCost"
>;

/** Reconcile one report payment inside the caller's transaction. */
async function syncReportPaymentRecord(report: ReportPaymentInput): Promise<void> {
  const byReport = await getPaymentByReport(report.id);
  if (byReport) {
    if (report.totalCost <= 0) {
      if (byReport.status === "UNPAID" && byReport.source !== "manual") {
        await db.payments.delete(byReport.id);
      }
      return;
    }
    const patch: Partial<Payment> = {
      month: report.month,
      periodStart: report.periodStart,
      periodEnd: report.periodEnd,
    };
    if (byReport.status === "UNPAID" && byReport.source !== "manual") {
      patch.totalCost = report.totalCost;
    }
    await db.payments.update(byReport.id, patch);
    return;
  }

  if (report.totalCost <= 0) return;

  // The compound index is not unique. Find the unlinked row explicitly instead
  // of accepting getPayment()'s first (possibly report-linked) match.
  const unlinkedMonthPayment = await getUnlinkedMonthPayment(report.studentId, report.month);
  const fullMonth = report.periodStart === `${report.month}-01`
    && report.periodEnd === monthRange(report.month).end;
  if (unlinkedMonthPayment && fullMonth) {
    // Adoption is metadata-only: keep manual amount, status, source, paidAt,
    // and method exactly as the user recorded them.
    await db.payments.update(unlinkedMonthPayment.id, {
      reportId: report.id,
      periodStart: report.periodStart,
      periodEnd: report.periodEnd,
    });
    return;
  }

  await db.payments.add({
    id: crypto.randomUUID(),
    studentId: report.studentId,
    month: report.month,
    totalCost: report.totalCost,
    status: "UNPAID",
    source: "auto",
    reportId: report.id,
    periodStart: report.periodStart,
    periodEnd: report.periodEnd,
  });
}

/**
 * Terbitkan / selaraskan tagihan dari laporan periode. Idempoten per laporan:
 * - Laporan tanpa nilai (0) → hapus tagihan laporan lama yang masih UNPAID otomatis.
 * - Sudah ada tagihan laporan ini → perbarui periode; nominal mengikuti laporan
 *   hanya selama belum lunas dan belum diedit manual.
 * - Ada tagihan bulanan lama (tutup bulan/manual) TANPA laporan DAN laporan
 *   mencakup bulan penuh → diadopsi sebagai tagihan laporan (nominal dipertahankan).
 *   Periode parsial TIDAK mengadopsi — tagihan lama itu punya cakupan berbeda,
 *   menerbitkan baris sendiri mencegah sesi ditagih dua kali.
 * - Lainnya → tagihan baru UNPAID otomatis.
 */
export async function syncReportPayment(
  report: ReportPaymentInput
): Promise<void> {
  await db.transaction("rw", db.payments, () => syncReportPaymentRecord(report));
}

/** Set a payment as transferred, by its row id (aman walau ada 2+ tagihan per murid-bulan). */
export async function markPaymentTransferredById(
  id: string, method = "transfer", paidAt = todayWIB()
): Promise<void> {
  const existing = await db.payments.get(id);
  if (!existing) throw new Error("Payment not found");
  await db.payments.update(id, { status: "PAID", paidAt, method });
  await logAudit("payment.paid", "payment", id, `${existing.month} paid ${paidAt} via ${method}`);
}

/** Set a payment back to unpaid (undo "Sudah Transfer"), by its row id. */
export async function markPaymentUnpaidById(id: string): Promise<void> {
  const existing = await db.payments.get(id);
  if (!existing) return;
  await db.payments.update(id, { status: "UNPAID", paidAt: undefined, method: undefined });
  await logAudit("payment.unpaid", "payment", id, existing.month);
}

/** Update only the billed amount of a payment, by its row id. */
export async function updatePaymentAmountById(id: string, totalCost: number): Promise<void> {
  if (!isValidCurrencyAmount(totalCost)) throw new Error("Invalid payment amount");
  const existing = await db.payments.get(id);
  if (!existing) throw new Error("Payment not found");
  await db.payments.update(id, { totalCost, source: "manual" });
  await logAudit("payment.amount", "payment", id, `${existing.month}: ${totalCost}`);
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
export async function computeMonthBills(
  month: string,
  opts: { excludeReportCovered?: boolean } = {}
): Promise<StudentBill[]> {
  const { start, end } = monthRange(month);
  let sessions = await db.sessions
    .filter((s) => isBillableSession(s) && s.date >= start && s.date <= end)
    .toArray();
  // Sesi yang sudah masuk laporan SAH tidak boleh ditagih ulang oleh tutup bulan.
  // Draft belum mengunci — sesi di dalamnya masih bisa masuk tagihan tutup bulan.
  if (opts.excludeReportCovered) {
    const confirmed = new Set((await db.reports.toArray()).filter((r) => reportStatus(r) === "confirmed").flatMap((r) => r.sessionIds));
    sessions = sessions.filter((s) => !confirmed.has(s.id));
  }
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

/** Close a month: reconcile confirmed auto reports and their invoices.
 *  The first mutable report covers the calendar month; sessions arriving after
 *  a manual/paid invoice use an explicitly linked supplemental report. */
export async function closeMonth(month: string): Promise<void> {
  const { start, end } = monthRange(month);
  let reconciledReportCount = 0;
  await db.transaction("rw", db.sessions, db.reports, db.payments, db.monthClosings, async () => {
    // Plan and mutate under one lock so concurrent close calls cannot both
    // create a report/payment from the same stale list of sessions.
    const monthSessions = (await db.sessions
      .filter((session) => isBillableSession(session) && session.date >= start && session.date <= end)
      .toArray())
      .sort((a, b) =>
        a.date.localeCompare(b.date)
        || (a.time ?? "").localeCompare(b.time ?? "")
        || a.id.localeCompare(b.id)
      );
    const reports = await db.reports.toArray();
    const coveredIds = new Set(
      reports
        .filter((report) => reportStatus(report) === "confirmed")
        .flatMap((report) => report.sessionIds)
    );

    const sessionsByStudent = new Map<string, typeof monthSessions>();
    for (const session of monthSessions) {
      const sessions = sessionsByStudent.get(session.studentId) ?? [];
      sessions.push(session);
      sessionsByStudent.set(session.studentId, sessions);
    }

    const autoReportsByStudent = new Map<string, MonthlyReport[]>();
    for (const report of reports) {
      if (report.autoGenerated !== true || report.month !== month) continue;
      const studentReports = autoReportsByStudent.get(report.studentId) ?? [];
      studentReports.push(report);
      autoReportsByStudent.set(report.studentId, studentReports);
    }
    for (const studentReports of autoReportsByStudent.values()) {
      studentReports.sort((a, b) =>
        Number(Boolean(a.supplementalForReportId)) - Number(Boolean(b.supplementalForReportId))
        || a.createdAt.localeCompare(b.createdAt)
        || a.id.localeCompare(b.id)
      );
    }

    // Include draft-only students so a paid/manual report can be reconfirmed
    // even when its original sessions were removed while the month was open.
    const studentIds = new Set([
      ...sessionsByStudent.keys(),
      ...autoReportsByStudent.keys(),
    ]);
    const paymentIsProtected = (payment: Payment | undefined): boolean =>
      payment !== undefined && (payment.status === "PAID" || payment.source === "manual");

    const confirmAutoReport = async (
      report: MonthlyReport,
      sessions: typeof monthSessions
    ): Promise<void> => {
      const totalHours = sessions.reduce((sum, session) => sum + session.durationHours, 0);
      const totalCost = sessions.reduce((sum, session) => sum + session.cost, 0);
      const reportPeriod = report.supplementalForReportId && sessions.length > 0
        ? { periodStart: sessions[0].date, periodEnd: sessions[sessions.length - 1].date }
        : { periodStart: report.supplementalForReportId ? report.periodStart : start, periodEnd: report.supplementalForReportId ? report.periodEnd : end };
      await db.reports.update(report.id, {
        month,
        ...reportPeriod,
        sessionIds: sessions.map((session) => session.id),
        totalHours,
        totalCost,
        status: "confirmed" as ReportStatus,
      });
      await syncReportPaymentRecord({
        id: report.id,
        studentId: report.studentId,
        month,
        ...reportPeriod,
        totalCost,
      });
      reconciledReportCount += 1;
    };

    // A confirmed report is itself a billing commitment. Repair missing
    // report invoices before looking only at uncovered sessions; otherwise a
    // legacy/seed report can cover every session yet never become collectible.
    for (const report of reports) {
      if (report.month !== month || reportStatus(report) !== "confirmed") continue;
      if (await getPaymentByReport(report.id)) continue;
      await syncReportPaymentRecord({
        id: report.id,
        studentId: report.studentId,
        month: report.month,
        periodStart: report.periodStart,
        periodEnd: report.periodEnd,
        totalCost: report.totalCost,
      });
      reconciledReportCount += 1;
    }

    for (const studentId of studentIds) {
      const studentSessions = sessionsByStudent.get(studentId) ?? [];
      const autoReports = autoReportsByStudent.get(studentId) ?? [];
      const draftReports = autoReports.filter((report) => reportStatus(report) === "draft");
      const draftPayments = new Map<string, Payment | undefined>();
      for (const report of draftReports) {
        draftPayments.set(report.id, await getPaymentByReport(report.id));
      }

      // Reconfirm reports whose invoice survived reopen, but reserve only their
      // original sessions. A late session must not disappear into an immutable
      // manual/paid amount.
      for (const report of draftReports) {
        if (!paymentIsProtected(draftPayments.get(report.id))) continue;
        const previousIds = new Set(report.sessionIds);
        const ownedSessions = studentSessions.filter(
          (session) => previousIds.has(session.id) && !coveredIds.has(session.id)
        );
        await confirmAutoReport(report, ownedSessions);
        for (const session of ownedSessions) coveredIds.add(session.id);
      }

      let uncoveredSessions = studentSessions.filter((session) => !coveredIds.has(session.id));
      const reusableDraft = draftReports.find(
        (report) => !paymentIsProtected(draftPayments.get(report.id))
      );
      if (reusableDraft && uncoveredSessions.length > 0) {
        // Normal close -> reopen -> close: reuse the same report id, restore one
        // payment, and include sessions added while the month was open.
        await confirmAutoReport(reusableDraft, uncoveredSessions);
        for (const session of uncoveredSessions) coveredIds.add(session.id);
        uncoveredSessions = [];
      }

      if (uncoveredSessions.length === 0) continue;

      // A confirmed auto report can absorb late sessions only while its invoice
      // is still auto-generated and unpaid. Otherwise create a separate invoice.
      let expandableConfirmed: MonthlyReport | undefined;
      let immutableAutoParent: MonthlyReport | undefined;
      for (const report of autoReports) {
        if (reportStatus(report) !== "confirmed") continue;
        const payment = await getPaymentByReport(report.id);
        if (paymentIsProtected(payment)) {
          immutableAutoParent ??= report;
        } else {
          expandableConfirmed = report;
          break;
        }
      }
      if (expandableConfirmed) {
        const priorIds = new Set(expandableConfirmed.sessionIds);
        const combinedSessions = studentSessions.filter(
          (session) => priorIds.has(session.id) || !coveredIds.has(session.id)
        );
        await confirmAutoReport(expandableConfirmed, combinedSessions);
        for (const session of uncoveredSessions) coveredIds.add(session.id);
        continue;
      }

      const studentSessionIds = new Set(studentSessions.map((session) => session.id));
      const fallbackParent = reports
        .filter((report) =>
          report.studentId === studentId
          && reportStatus(report) === "confirmed"
          && report.sessionIds.some((id) => studentSessionIds.has(id))
        )
        .sort((a, b) =>
          Number(Boolean(a.supplementalForReportId)) - Number(Boolean(b.supplementalForReportId))
          || a.createdAt.localeCompare(b.createdAt)
          || a.id.localeCompare(b.id)
        )[0];
      const parentReport = immutableAutoParent ?? fallbackParent;
      const supplementalForReportId = parentReport
        ? (parentReport.supplementalForReportId ?? parentReport.id)
        : undefined;
      const reportPeriod = supplementalForReportId
        ? {
            periodStart: uncoveredSessions[0].date,
            periodEnd: uncoveredSessions[uncoveredSessions.length - 1].date,
          }
        : { periodStart: start, periodEnd: end };
      const reportId = crypto.randomUUID();
      const totalHours = uncoveredSessions.reduce((sum, session) => sum + session.durationHours, 0);
      const totalCost = uncoveredSessions.reduce((sum, session) => sum + session.cost, 0);
      await db.reports.add({
        id: reportId,
        studentId,
        month,
        ...reportPeriod,
        supplementalForReportId,
        sessionIds: uncoveredSessions.map((session) => session.id),
        templateKey: { themeId: "blue", layoutId: "cards" },
        summaryText: "",
        totalHours,
        totalCost,
        status: "confirmed" as ReportStatus,
        autoGenerated: true,
        createdAt: timestamp(),
      });
      await syncReportPaymentRecord({
        id: reportId,
        studentId,
        month,
        ...reportPeriod,
        totalCost,
      });
      reconciledReportCount += 1;
      for (const session of uncoveredSessions) coveredIds.add(session.id);
    }

    const existingClosing = await db.monthClosings.where("month").equals(month).first();
    // Snapshot the whole month, never a delta. This stays idempotent and also
    // accounts for sessions covered by manually-created confirmed reports.
    await db.monthClosings.put({
      id: existingClosing?.id ?? crypto.randomUUID(),
      month,
      closedAt: timestamp(),
      totalPotensi: monthSessions.reduce((sum, session) => sum + session.cost, 0),
      totalHours: monthSessions.reduce((sum, session) => sum + session.durationHours, 0),
      studentCount: new Set(monthSessions.map((session) => session.studentId)).size,
    });
  });
  await logAudit("month.close", "data", month, `${reconciledReportCount} laporan/tagihan diselaraskan`);
}

/** Reopen a month: un-sahkan laporan otomatis (balik ke draft, hapus tagihannya
 *  kalau belum lunas) + hapus snapshot tutup buku. Laporan manual tidak disentuh. */
export async function reopenMonth(month: string): Promise<void> {
  await db.transaction("rw", db.reports, db.payments, db.monthClosings, async () => {
    const autoReports = await db.reports
      .where({ month })
      .filter((r) => r.autoGenerated === true)
      .toArray();
    for (const r of autoReports) {
      const p = await db.payments.where("reportId").equals(r.id).first();
      const canReturnToDraft = !p || (p.status === "UNPAID" && p.source !== "manual");
      if (canReturnToDraft) {
        if (p) await db.payments.delete(p.id);
        await db.reports.update(r.id, { status: "draft" as ReportStatus });
      }
      // Manual and paid invoices remain linked to a confirmed report. Besides
      // preserving accounting history, this keeps their sessions covered in
      // the finance preview while the month itself is open.
    }
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

export async function deleteExpense(id: string): Promise<void> {
  const expense = await db.expenses.get(id);
  if (!expense) return;
  await db.expenses.delete(id);
  await logAudit("expense.delete", "expense", id, `${expense.date}: ${expense.amount}`);
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
