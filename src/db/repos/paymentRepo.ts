// ── Payments + Expenses Repository ──────────────────────────────────

import { db } from "../db";
import type { Payment, Expense, ExpenseCategory, IaEeMilestone, MonthlyReport, Session } from "../types";
import { billingPolicyOf, reportStatus } from "../types";
import { timestamp, monthRange, packageCoveredSessionIds } from "./helpers";
import { dateInWIB, todayWIB } from "../../lib/format";
import { logAudit } from "./auditRepo";
import { compareSessionsChronologically, isBillableSession } from "./sessionRepo";
import { isValidCurrencyAmount } from "../../lib/money";
import { defaultInvoiceDueAt, invoiceDueAt } from "../../lib/finance";

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
 * Invoice baru selalu mendapat jatuh tempo eksplisit. Jika API menerima
 * createdAt historis, tanggal itu tetap menjadi dasar tempo; bila tidak, pakai
 * tanggal WIB saat dibuat. Tanggal dueAt eksplisit yang valid selalu dihormati.
 */
function dueAtForNewPayment(payment: Pick<Payment, "dueAt" | "createdAt">): string {
  const explicitDueAt = invoiceDueAt({ dueAt: payment.dueAt });
  if (explicitDueAt) return explicitDueAt;
  // `createdAt` is UTC ISO, but jatuh tempo adalah tanggal bisnis di WIB.
  // Contoh: 21:30 UTC masih sudah tanggal berikutnya di Jakarta.
  const issuedDate = payment.createdAt ? dateInWIB(payment.createdAt) : undefined;
  return defaultInvoiceDueAt(issuedDate ?? todayWIB());
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
    const createdAt = timestamp();
    await db.payments.add({
      ...normalizeManualPayment(payment),
      id,
      createdAt,
      dueAt: dueAtForNewPayment({ dueAt: payment.dueAt, createdAt }),
    });
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
      const explicitDueAt = invoiceDueAt({ dueAt: payment.dueAt });
      await db.payments.update(existing.id, {
        ...normalized,
        // Jangan menghapus deadline yang ada hanya karena legacy caller tidak
        // mengirimkan dueAt. Sentuhan berikutnya juga melakukan backfill aman
        // untuk baris lama sesuai semantics sebelumnya.
        dueAt: explicitDueAt ?? invoiceDueAt(existing),
        createdAt: payment.createdAt ?? existing.createdAt,
      });
    } else {
      const createdAt = payment.createdAt ?? timestamp();
      await db.payments.add({
        ...normalized,
        id: crypto.randomUUID(),
        createdAt,
        dueAt: dueAtForNewPayment({ dueAt: payment.dueAt, createdAt }),
      });
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

/** Payments for one student, including invoice-linked rows from any period. */
export async function listPaymentsByStudent(studentId: string): Promise<Payment[]> {
  return db.payments.where({ studentId }).toArray();
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
  "id" | "studentId" | "month" | "periodStart" | "periodEnd" | "totalCost" | "billingMode"
>;

/** Reconcile one report payment inside the caller's transaction. */
async function syncReportPaymentRecord(report: ReportPaymentInput): Promise<string | undefined> {
  const byReport = await getPaymentByReport(report.id);
  if (byReport) {
    if (report.totalCost <= 0) {
      if (byReport.status === "UNPAID" && byReport.source !== "manual") {
        await db.payments.delete(byReport.id);
      }
      return report.totalCost > 0 ? byReport.id : undefined;
    }
    const patch: Partial<Payment> = {
      month: report.month,
      periodStart: report.periodStart,
      periodEnd: report.periodEnd,
    };
    // Existing invoices keep their explicit deadline. A legacy row gets its
    // old period-end/month behavior materialized, never a newly-imposed term.
    const legacyDueAt = invoiceDueAt(byReport);
    if (legacyDueAt && byReport.dueAt !== legacyDueAt) patch.dueAt = legacyDueAt;
    if (byReport.status === "UNPAID" && byReport.source !== "manual") {
      patch.totalCost = report.totalCost;
    }
    await db.payments.update(byReport.id, patch);
    return byReport.id;
  }

  if (report.totalCost <= 0) return undefined;

  // The compound index is not unique. Find the unlinked row explicitly instead
  // of accepting getPayment()'s first (possibly report-linked) match.
  const unlinkedMonthPayment = await getUnlinkedMonthPayment(report.studentId, report.month);
  const fullMonth = report.billingMode !== "session_count"
    && report.periodStart === `${report.month}-01`
    && report.periodEnd === monthRange(report.month).end;
  if (unlinkedMonthPayment && fullMonth) {
    // Adoption is metadata-only: keep manual amount, status, source, paidAt,
    // and method exactly as the user recorded them.
    const adoptedDueAt = invoiceDueAt(unlinkedMonthPayment);
    await db.payments.update(unlinkedMonthPayment.id, {
      reportId: report.id,
      periodStart: report.periodStart,
      periodEnd: report.periodEnd,
      ...(adoptedDueAt && unlinkedMonthPayment.dueAt !== adoptedDueAt ? { dueAt: adoptedDueAt } : {}),
    });
    return unlinkedMonthPayment.id;
  }

  const id = crypto.randomUUID();
  const createdAt = timestamp();
  await db.payments.add({
    id,
    studentId: report.studentId,
    month: report.month,
    totalCost: report.totalCost,
    status: "UNPAID",
    source: "auto",
    reportId: report.id,
    periodStart: report.periodStart,
    periodEnd: report.periodEnd,
    createdAt,
    dueAt: dueAtForNewPayment({ createdAt }),
  });
  return id;
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

export interface SessionCountBillingProgress {
  studentId: string;
  studentName: string;
  targetCount: number;
  unbilledCount: number;
  readyBatchCount: number;
  nextBatchSessions: Session[];
  nextBatchTotal: number;
  nextBatchHours: number;
  pendingBillingPolicy?: "monthly" | "manual";
}

export interface SessionCountInvoiceResult {
  reportId: string;
  paymentId: string;
  month: string;
  sessionCount: number;
  totalCost: number;
  finalBatch: boolean;
  activatedBillingPolicy?: "monthly" | "manual";
}

export interface CreateSessionCountInvoiceOptions {
  finalBatch?: boolean;
}

function validSessionCount(value: number | undefined): value is number {
  return Number.isInteger(value) && (value ?? 0) >= 1 && (value ?? 0) <= 20;
}

function unbilledSessions(
  sessions: readonly Session[],
  reports: readonly MonthlyReport[],
  payments: readonly Pick<Payment, "reportId">[],
): Session[] {
  const coveredIds = packageCoveredSessionIds(reports, payments);
  return sessions
    .filter((session) => isBillableSession(session) && !coveredIds.has(session.id))
    .sort(compareSessionsChronologically);
}

/** Current package-billing queue for every active session-count student. */
export async function listSessionCountBillingProgress(): Promise<SessionCountBillingProgress[]> {
  const students = (await db.students.toArray())
    .filter((student) => billingPolicyOf(student) === "session_count")
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));

  const progress = await Promise.all(students.map(async (student) => {
    const [sessions, reports, payments] = await Promise.all([
      db.sessions.where({ studentId: student.id }).toArray(),
      db.reports.where({ studentId: student.id }).toArray(),
      db.payments.where({ studentId: student.id }).toArray(),
    ]);
    const pending = unbilledSessions(sessions, reports, payments);
    const targetCount = validSessionCount(student.billingSessionCount)
      ? student.billingSessionCount
      : 0;
    const nextBatchSessions = targetCount > 0
      ? pending.slice(0, targetCount)
      : [];
    return {
      studentId: student.id,
      studentName: student.name,
      targetCount,
      unbilledCount: pending.length,
      readyBatchCount: targetCount > 0 ? Math.floor(pending.length / targetCount) : 0,
      nextBatchSessions,
      nextBatchTotal: nextBatchSessions.reduce((sum, session) => sum + session.cost, 0),
      nextBatchHours: nextBatchSessions.reduce((sum, session) => sum + session.durationHours, 0),
      pendingBillingPolicy: student.pendingBillingPolicy,
    };
  }));
  // An inactive student must not disappear while lessons are still owed. Once
  // their queue is empty, hiding the row keeps the operational list focused.
  return progress.filter((row, index) => students[index].active || row.unbilledCount > 0);
}

const sessionCountInvoiceInflight = new Map<string, Promise<SessionCountInvoiceResult>>();

async function createSessionCountInvoiceAtomic(
  studentId: string,
  options: CreateSessionCountInvoiceOptions,
): Promise<SessionCountInvoiceResult> {
  return db.transaction("rw", db.students, db.sessions, db.reports, db.payments, async () => {
    const student = await db.students.get(studentId);
    if (!student) throw new Error("Murid tidak ditemukan");
    if (billingPolicyOf(student) !== "session_count") {
      throw new Error("Murid tidak memakai penagihan per jumlah pertemuan");
    }
    if (!validSessionCount(student.billingSessionCount)) {
      throw new Error("Jumlah sesi penagihan tidak valid");
    }

    const [sessions, reports, payments] = await Promise.all([
      db.sessions.where({ studentId }).toArray(),
      db.reports.where({ studentId }).toArray(),
      db.payments.where({ studentId }).toArray(),
    ]);
    const pending = unbilledSessions(sessions, reports, payments);
    const targetCount = student.billingSessionCount;
    const finalBatch = options.finalBatch === true;
    if (finalBatch && !student.pendingBillingPolicy) {
      throw new Error("Tagihan penutup hanya tersedia saat perubahan kebijakan penagihan tertunda");
    }
    if (finalBatch && (pending.length <= 0 || pending.length >= targetCount)) {
      throw new Error(`Tagihan penutup hanya untuk sisa 1-${targetCount - 1} sesi`);
    }
    if (!finalBatch && pending.length < targetCount) {
      throw new Error(`Belum cukup sesi untuk membuat tagihan (${pending.length}/${targetCount})`);
    }

    const selected = finalBatch ? pending : pending.slice(0, targetCount);
    const periodStart = selected[0].date;
    const periodEnd = selected[selected.length - 1].date;
    const month = periodEnd.slice(0, 7);
    const totalHours = selected.reduce((sum, session) => sum + session.durationHours, 0);
    const totalCost = selected.reduce((sum, session) => sum + session.cost, 0);
    const selectedIds = selected.map((session) => session.id);
    const reusableDraft = reports
      .filter((report) => {
        if (reportStatus(report) !== "draft" || report.billingMode !== "session_count") return false;
        // A draft does not claim sessions yet. If it contains the FIFO prefix
        // of the now-complete batch, retain its writing/template work and
        // extend it with the later recorded sessions instead of orphaning it.
        return report.sessionIds.length <= selectedIds.length
          && report.sessionIds.every((id, index) => selectedIds[index] === id);
      })
      .sort((a, b) => b.sessionIds.length - a.sessionIds.length
        || a.createdAt.localeCompare(b.createdAt)
        || a.id.localeCompare(b.id))[0];
    const reportId = reusableDraft?.id ?? crypto.randomUUID();
    const createdAt = timestamp();
    const remainingCount = pending.length - selected.length;
    const billingPolicyAfterBatch = remainingCount === 0
      ? student.pendingBillingPolicy
      : undefined;

    const report: MonthlyReport = {
      id: reportId,
      studentId,
      month,
      periodStart,
      periodEnd,
      status: "confirmed",
      billingMode: "session_count",
      billingSessionCount: selected.length,
      finalBillingBatch: finalBatch || undefined,
      billingTargetSessionCount: student.pendingBillingPolicy ? targetCount : undefined,
      billingPolicyAfterBatch,
      billingPolicyTransitionTarget: student.pendingBillingPolicy,
      fromBillingQueue: true,
      sessionIds: selectedIds,
      templateKey: reusableDraft?.templateKey ?? { themeId: "blue", layoutId: "cards" },
      summaryText: reusableDraft?.summaryText ?? "",
      teacherNote: reusableDraft?.teacherNote,
      quote: reusableDraft?.quote,
      nextMonthPlan: reusableDraft?.nextMonthPlan,
      totalHours,
      totalCost,
      createdAt: reusableDraft?.createdAt ?? createdAt,
    };
    if (reusableDraft) await db.reports.put(report);
    else await db.reports.add(report);
    const paymentId = await syncReportPaymentRecord(report);
    if (!paymentId) throw new Error("Tagihan paket gagal diterbitkan");
    if (billingPolicyAfterBatch) {
      await db.students.update(studentId, {
        billingPolicy: billingPolicyAfterBatch,
        pendingBillingPolicy: undefined,
      });
    }

    return {
      reportId,
      paymentId,
      month,
      sessionCount: selected.length,
      totalCost,
      finalBatch,
      activatedBillingPolicy: billingPolicyAfterBatch,
    };
  });
}

/**
 * Atomically claim the oldest exact N uncovered sessions and issue one report
 * plus invoice. Same-runtime double taps share one in-flight operation, while
 * the IndexedDB transaction prevents cross-context session overlap.
 */
export function createSessionCountInvoice(
  studentId: string,
  options: CreateSessionCountInvoiceOptions = {},
): Promise<SessionCountInvoiceResult> {
  const inflightKey = `${studentId}:${options.finalBatch === true ? "final" : "regular"}`;
  const existing = sessionCountInvoiceInflight.get(inflightKey);
  if (existing) return existing;

  const operation = createSessionCountInvoiceAtomic(studentId, options);
  sessionCountInvoiceInflight.set(inflightKey, operation);
  void operation.finally(() => {
    if (sessionCountInvoiceInflight.get(inflightKey) === operation) {
      sessionCountInvoiceInflight.delete(inflightKey);
    }
  }).catch(() => undefined);
  return operation;
}

/** Cancel one mutable package invoice and return its sessions to the queue. */
export async function cancelSessionCountInvoice(paymentId: string): Promise<void> {
  await db.transaction("rw", db.students, db.reports, db.payments, async () => {
    const payment = await db.payments.get(paymentId);
    if (!payment) throw new Error("Tagihan tidak ditemukan");
    if (!payment.reportId) throw new Error("Tagihan bukan tagihan paket");
    const report = await db.reports.get(payment.reportId);
    if (!report || report.billingMode !== "session_count" || reportStatus(report) !== "confirmed") {
      throw new Error("Tagihan bukan tagihan paket yang sah");
    }
    if (payment.status !== "UNPAID" || payment.source !== "auto") {
      throw new Error("Tagihan paket yang lunas atau diedit manual tidak dapat dibatalkan");
    }
    await db.payments.delete(payment.id);
    await db.reports.delete(report.id);
    const student = await db.students.get(report.studentId);
    // Hanya kembalikan kebijakan murid bila paket ini benar-benar berasal dari
    // antrean billing. Laporan paket legacy yang dibuat lewat mode "Jumlah"
    // untuk murid bulanan tidak boleh diam-diam mengubah murid jadi session_count.
    const issuedFromBilling = report.fromBillingQueue === true
      || report.finalBillingBatch === true
      || report.billingPolicyTransitionTarget !== undefined
      || report.billingPolicyAfterBatch !== undefined;
    if (student && billingPolicyOf(student) !== "session_count" && issuedFromBilling) {
      const currentPolicy = billingPolicyOf(student);
      const currentQuota = validSessionCount(student.billingSessionCount)
        ? student.billingSessionCount
        : undefined;
      await db.students.update(report.studentId, {
        billingPolicy: "session_count",
        billingSessionCount: currentQuota ?? report.billingTargetSessionCount ?? report.billingSessionCount,
        pendingBillingPolicy: currentPolicy === "session_count" ? undefined : currentPolicy,
      });
    }
  });
}

/** Set a payment as transferred, by its row id (aman walau ada 2+ tagihan per murid-bulan). */
export async function markPaymentTransferredById(
  id: string, method = "transfer", paidAt = todayWIB()
): Promise<void> {
  const existing = await db.transaction("rw", db.payments, async () => {
    const payment = await db.payments.get(id);
    if (!payment) throw new Error("Payment not found");
    await db.payments.update(id, { status: "PAID", paidAt, method });
    return payment;
  });
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
  const existing = await db.transaction("rw", db.payments, async () => {
    const payment = await db.payments.get(id);
    if (!payment) throw new Error("Payment not found");
    await db.payments.update(id, { totalCost, source: "manual" });
    return payment;
  });
  await logAudit("payment.amount", "payment", id, `${existing.month}: ${totalCost}`);
}


// ── Cash Summary ───────────────────────────────────────────────────

export interface MonthCashSummary {
  month: string;
  sesi: number;          // jumlah sesi selesai bulan itu — by tanggal sesi
  jam: number;           // total jam sesi bulan itu
  pendapatan: number;    // pendapatan diakui (akrual) — by tanggal sesi
  realisasi: number;     // uang masuk — by paidAt (basis kas)
  piutang: number;       // tagihan belum lunas — dialokasikan by tanggal sesi (akrual)
  pengeluaran: number;
  laba: number;          // Laba = pendapatan - pengeluaran (akrual, matching principle)
}

/**
 * Alokasikan nilai sebuah invoice ke bulan-bulan tempat sesinya berlangsung.
 * Basis akrual: pendapatan diakui saat jasa diberikan, bukan saat uang masuk.
 *
 * - Invoice ber-relasi laporan → proporsional terhadap cost sesi per bulan
 *   (metode sisa terbesar agar jumlah alokasi selalu pas dengan totalCost).
 * - Invoice tanpa data sesi (manual / lama) → fallback 100% ke bulan anchor
 *   invoice (p.month), karena tanggal layanan memang tidak dapat ditarik.
 */
export function allocatePaymentToMonths(
  payment: Payment,
  report: MonthlyReport | undefined,
  sessionsById: ReadonlyMap<string, Session>,
): Map<string, number> {
  if (report && report.sessionIds && report.sessionIds.length > 0) {
    const weights = new Map<string, number>();
    for (const id of report.sessionIds) {
      const session = sessionsById.get(id);
      if (!session) continue;
      const month = session.date.slice(0, 7);
      weights.set(month, (weights.get(month) ?? 0) + session.cost);
    }
    if (weights.size > 0) {
      return proportionalAllocation(payment.totalCost, weights);
    }
  }
  const fallback = new Map<string, number>();
  fallback.set(payment.month, payment.totalCost);
  return fallback;
}

/** Pecah `total` ke bulan-bulan menurut bobot; jumlah akhir selalu == total. */
function proportionalAllocation(
  total: number,
  weights: ReadonlyMap<string, number>,
): Map<string, number> {
  const out = new Map<string, number>();
  if (total <= 0 || weights.size === 0) return out;
  let weightSum = 0;
  for (const w of weights.values()) weightSum += w;
  if (weightSum <= 0) return out;

  const entries = [...weights.entries()];
  const remainderParts: Array<{ month: string; frac: number }> = [];
  let allocated = 0;
  for (const [month, weight] of entries) {
    const exact = (total * weight) / weightSum;
    const floor = Math.floor(exact);
    out.set(month, floor);
    allocated += floor;
    remainderParts.push({ month, frac: exact - floor });
  }
  // Metode sisa terbesar: sisa rupiah menempel ke bulan dengan pecahan terbesar.
  remainderParts.sort((a, b) => b.frac - a.frac);
  let remainder = total - allocated;
  for (const { month } of remainderParts) {
    if (remainder <= 0) break;
    out.set(month, (out.get(month) ?? 0) + 1);
    remainder -= 1;
  }
  return out;
}

export async function getCashSummary(months: string[]): Promise<MonthCashSummary[]> {
  if (months.length === 0) return [];
  const { start: s1 } = monthRange(months[0]);
  const { end: eN } = monthRange(months[months.length - 1]);
  // Semua sesi dimuat untuk acuan alokasi; hanya sesi billable dalam rentang
  // yang menyumbang ke potensi.
  const allSessions = await db.sessions.toArray();
  const sessions = allSessions.filter((s) => isBillableSession(s) && s.date >= s1 && s.date <= eN);
  const payments = await listPayments();
  const reports = await db.reports.toArray();
  const expenses = await db.expenses
    .where("date").between(s1, eN, true, true)
    .toArray();
  const reportById = new Map(reports.map((r) => [r.id, r]));
  const sessionsById = new Map(allSessions.map((s) => [s.id, s]));

  // Pendapatan & piutang akrual: nilai tiap invoice dialokasikan ke bulan sesi
  // (bukan bulan anchor invoice). Lunas/tidaknya invoice tidak mengubah kapan
  // pendapatan diakui — hanya mengubah piutang.
  const pendapatanByMonth = new Map<string, number>();
  const piutangByMonth = new Map<string, number>();
  for (const p of payments) {
    const alloc = allocatePaymentToMonths(p, p.reportId ? reportById.get(p.reportId) : undefined, sessionsById);
    for (const [month, amount] of alloc) {
      pendapatanByMonth.set(month, (pendapatanByMonth.get(month) ?? 0) + amount);
      if (p.status === "UNPAID") {
        piutangByMonth.set(month, (piutangByMonth.get(month) ?? 0) + amount);
      }
    }
  }

  return months.map((month) => {
    const { start, end } = monthRange(month);
    const monthSessions = sessions.filter((s) => s.date >= start && s.date <= end);
    const sesi = monthSessions.length;
    const jam = monthSessions.reduce((sum, s) => sum + s.durationHours, 0);
    // Cash follows the actual payment date. Legacy PAID rows without paidAt fall
    // back to their invoice month so old data does not disappear from reports.
    const realisasi = payments
      .filter((p) => p.status === "PAID" && (p.paidAt?.slice(0, 7) ?? p.month) === month)
      .reduce((sum, p) => sum + p.totalCost, 0);
    const pendapatan = pendapatanByMonth.get(month) ?? 0;
    const piutang = piutangByMonth.get(month) ?? 0;
    const pengeluaran = expenses.filter((e) => e.date >= start && e.date <= end).reduce((sum, e) => sum + e.amount, 0);
    return {
      month,
      sesi,
      jam,
      pendapatan,
      realisasi,
      piutang,
      pengeluaran,
      laba: pendapatan - pengeluaran,
    };
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

export async function updateExpense(
  id: string,
  input: Omit<Expense, "id" | "createdAt" | "updatedAt">
): Promise<void> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error("Invalid expense date");
  if (!input.description.trim()) throw new Error("Expense description is required");
  if (!isValidCurrencyAmount(input.amount)) throw new Error("Invalid expense amount");
  const existing = await db.expenses.get(id);
  if (!existing) throw new Error("Expense not found");
  await db.expenses.update(id, {
    date: input.date,
    category: input.category,
    description: input.description.trim(),
    amount: input.amount,
    updatedAt: timestamp(),
  });
  await logAudit("expense.update", "expense", id, `${input.date}: ${input.amount}`);
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
