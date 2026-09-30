// ── Payments + Expenses Repository ──────────────────────────────────

import { db } from "../db";
import type {
  AuditAction, AuditEntry, Expense, ExpenseCategory, IaEeMilestone, InvoiceCancelKind,
  InvoiceCancelSnapshot, MonthlyReport, Payment, Session, Student, StudentBillingSnapshot,
} from "../types";
import { billingPolicyOf, reportStatus } from "../types";
import { timestamp, monthRange, packageCoveredSessionIds } from "./helpers";
import { dateInWIB, todayWIB } from "../../lib/format";
import { logAudit } from "./auditRepo";
import { compareSessionsChronologically, isBillableSession } from "./sessionRepo";
import { isValidCurrencyAmount } from "../../lib/money";
import { defaultInvoiceDueAt, invoiceDueAt, isValidYmd } from "../../lib/finance";

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

// ── Snapshot & pemulihan pembatalan tagihan (R1) ────────────────────
// Snapshot ditulis sebagai entri `auditLog` DI DALAM transaksi pembatalan.
// `auditLog` bersifat lokal per perangkat dan sengaja TIDAK ikut
// backup/restore ("Hapus Semua Data" menghapusnya), jadi pemulihan ini hanya
// berlaku di perangkat ini — BUKAN pengganti Backup ke File.

function billingSnapshotOf(student: Student): StudentBillingSnapshot {
  return {
    billingPolicy: student.billingPolicy,
    billingSessionCount: student.billingSessionCount,
    pendingBillingPolicy: student.pendingBillingPolicy,
  };
}

/** Bandingkan tiga field siklus murid dengan toleransi `missing === undefined`. */
function sameBillingSnapshot(
  snapshot: StudentBillingSnapshot | undefined,
  current: StudentBillingSnapshot | undefined,
): boolean {
  return sameStoredValue(snapshot?.billingPolicy, current?.billingPolicy)
    && sameStoredValue(snapshot?.billingSessionCount, current?.billingSessionCount)
    && sameStoredValue(snapshot?.pendingBillingPolicy, current?.pendingBillingPolicy);
}

/**
 * Perbandingan nilai yang benar-benar tersimpan. `undefined` dan properti yang
 * tidak ada dianggap sama (IndexedDB/JSON sama-sama boleh menghilangkannya),
 * dan array/objek dibandingkan isinya — bukan referensinya.
 */
function sameStoredValue(a: unknown, b: unknown): boolean {
  const left = a ?? undefined;
  const right = b ?? undefined;
  if (left === right) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    return left.every((item, index) => sameStoredValue(item, right[index]));
  }
  if (left && right && typeof left === "object" && typeof right === "object") {
    const leftRecord = left as Record<string, unknown>;
    const rightRecord = right as Record<string, unknown>;
    const keys = new Set([...Object.keys(leftRecord), ...Object.keys(rightRecord)]);
    for (const key of keys) {
      if (!sameStoredValue(leftRecord[key], rightRecord[key])) return false;
    }
    return true;
  }
  return false;
}

/** Perbandingan penuh seluruh field record — dipakai guard G9 (idempoten). */
function sameRecord(a: object, b: object): boolean {
  return sameStoredValue(a, b);
}

function sameInvoiceSessionIds(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const ids = new Set(a);
  return b.every((id) => ids.has(id));
}

function sessionScopesOverlap(a: readonly string[], b: readonly string[]): boolean {
  if (a.length === 0 || b.length === 0) return false;
  const ids = new Set(a);
  return b.some((id) => ids.has(id));
}

export function encodeInvoiceCancelSnapshot(snapshot: InvoiceCancelSnapshot): string {
  return JSON.stringify(snapshot);
}

/** Baca snapshot dari entri audit; entri rusak/asing dianggap tidak ada. */
export function decodeInvoiceCancelSnapshot(entry: AuditEntry): InvoiceCancelSnapshot | undefined {
  if (entry.action !== "payment.cancel" || !entry.details) return undefined;
  try {
    const parsed = JSON.parse(entry.details) as InvoiceCancelSnapshot;
    if (parsed?.version !== 1) return undefined;
    if (!parsed.payment || typeof parsed.payment.id !== "string") return undefined;
    if (parsed.kind !== "package" && parsed.kind !== "report" && parsed.kind !== "manual") return undefined;
    if (!Array.isArray(parsed.sessionIds)) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

/**
 * Cancel one mutable package invoice and return its sessions to the queue.
 *
 * Snapshot (R1) ditulis di dalam transaksi yang sama: kegagalan menulis
 * snapshot membatalkan seluruh pembatalan, sehingga tidak pernah ada
 * pembatalan tanpa jejak pemulihan.
 */
export async function cancelSessionCountInvoice(paymentId: string): Promise<void> {
  await db.transaction("rw", db.students, db.reports, db.payments, db.auditLog, async () => {
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
    const student = await db.students.get(report.studentId);
    // Hanya kembalikan kebijakan murid bila paket ini benar-benar berasal dari
    // antrean billing. Laporan paket legacy yang dibuat lewat mode "Jumlah"
    // untuk murid bulanan tidak boleh diam-diam mengubah murid jadi session_count.
    const issuedFromBilling = report.fromBillingQueue === true
      || report.finalBillingBatch === true
      || report.billingPolicyTransitionTarget !== undefined
      || report.billingPolicyAfterBatch !== undefined;
    const restoresPolicy = Boolean(student) && billingPolicyOf(student!) !== "session_count" && issuedFromBilling;
    // Nilai sesudah-pembatalan dihitung SEBELUM menulis, agar guard G8 saat
    // pemulihan membandingkan keadaan yang benar-benar ditulis di sini.
    const studentAfterCancel: StudentBillingSnapshot | undefined = restoresPolicy
      ? {
          billingPolicy: "session_count",
          billingSessionCount: validSessionCount(student!.billingSessionCount)
            ? student!.billingSessionCount
            : report.billingTargetSessionCount ?? report.billingSessionCount,
          pendingBillingPolicy: billingPolicyOf(student!) === "session_count"
            ? undefined
            : billingPolicyOf(student!) as "monthly" | "manual",
        }
      : student ? billingSnapshotOf(student) : undefined;

    await db.auditLog.add({
      id: crypto.randomUUID(),
      action: "payment.cancel",
      entityType: "payment",
      entityId: payment.id,
      timestamp: timestamp(),
      details: encodeInvoiceCancelSnapshot({
        version: 1,
        kind: "package",
        payment,
        report,
        sessionIds: report.sessionIds,
        studentBeforeCancel: student ? billingSnapshotOf(student) : undefined,
        studentAfterCancel,
      }),
    });

    await db.payments.delete(payment.id);
    await db.reports.delete(report.id);
    if (restoresPolicy) {
      await db.students.update(report.studentId, {
        billingPolicy: "session_count",
        billingSessionCount: studentAfterCancel!.billingSessionCount,
        pendingBillingPolicy: studentAfterCancel!.pendingBillingPolicy,
      });
    }
  });
}

export type InvoiceRestoreStatus = "restored" | "noop";

export interface InvoiceRestoreResult {
  status: InvoiceRestoreStatus;
  kind: InvoiceCancelKind;
}

export interface InvoiceCancellation {
  snapshotId: string;
  kind: InvoiceCancelKind;
  paymentId: string;
  studentId: string;
  month: string;
  totalCost: number;
  reportId?: string;
  sessionCount: number;
  cancelledAt: string;
}

/**
 * Aksi audit "salinan pemulihan dibuang" (R1) — salah satu anggota `AuditAction`
 * di `src/db/types.ts`, jadi tidak ada cast dan penampil riwayat aktivitas
 * menampilkannya dengan labelnya sendiri.
 */
const PAYMENT_DISCARD_ACTION: AuditAction = "payment.discard";

/**
 * Pembatalan yang masih bisa dipulihkan di perangkat ini (baru → lama).
 * Entri yang sudah dipulihkan (ada `payment.restore` dengan `snapshotId` sama),
 * yang salinan pemulihannya sudah dibuang (ada `payment.discard` dengan
 * `snapshotId` sama), atau snapshotnya rusak tidak ditawarkan — sehingga aksi
 * "Pulihkan" tidak pernah muncul untuk snapshot yang sudah hilang.
 */
export async function listInvoiceCancellations(): Promise<InvoiceCancellation[]> {
  const entries = await db.auditLog.where("entityType").equals("payment").toArray();
  const restoredSnapshotIds = new Set<string>();
  const discardedSnapshotIds = new Set<string>();
  for (const entry of entries) {
    if (!entry.details) continue;
    const isRestore = entry.action === "payment.restore";
    const isDiscard = entry.action === PAYMENT_DISCARD_ACTION;
    if (!isRestore && !isDiscard) continue;
    try {
      const parsed = JSON.parse(entry.details) as { snapshotId?: string };
      if (!parsed?.snapshotId) continue;
      if (isRestore) restoredSnapshotIds.add(parsed.snapshotId);
      else discardedSnapshotIds.add(parsed.snapshotId);
    } catch {
      // entri lama tanpa JSON yang bisa dibaca — abaikan
    }
  }
  return entries
    .flatMap((entry): InvoiceCancellation[] => {
      if (entry.action !== "payment.cancel") return [];
      if (restoredSnapshotIds.has(entry.id) || discardedSnapshotIds.has(entry.id)) return [];
      const snapshot = decodeInvoiceCancelSnapshot(entry);
      if (!snapshot) return [];
      return [{
        snapshotId: entry.id,
        kind: snapshot.kind,
        paymentId: snapshot.payment.id,
        studentId: snapshot.payment.studentId,
        month: snapshot.payment.month,
        totalCost: snapshot.payment.totalCost,
        reportId: snapshot.payment.reportId,
        sessionCount: snapshot.sessionIds.length,
        cancelledAt: entry.timestamp,
      }];
    })
    .sort((a, b) => b.cancelledAt.localeCompare(a.cancelledAt));
}

function isInvoiceCancelKind(value: unknown): value is InvoiceCancelKind {
  return value === "package" || value === "report" || value === "manual";
}

/** `snapshotId` + `kind` dari `details` entri `payment.restore`/`payment.discard`. */
function parseSnapshotRef(details: string | undefined): { snapshotId?: string; kind?: InvoiceCancelKind } {
  if (!details) return {};
  try {
    const parsed = JSON.parse(details) as { snapshotId?: unknown; kind?: unknown };
    return {
      snapshotId: typeof parsed?.snapshotId === "string" ? parsed.snapshotId : undefined,
      kind: isInvoiceCancelKind(parsed?.kind) ? parsed.kind : undefined,
    };
  } catch {
    return {};
  }
}

/**
 * Satu titik pemulihan dalam riwayat sebuah tagihan (R1 timeline).
 *
 * `restoredAt`/`discardedAt` diisi dari entri `payment.restore`/`payment.discard`
 * yang menunjuk `snapshotId` ini; `spent` merangkum keduanya: salinan pemulihan
 * yang sudah terpakai (dipulihkan) atau sudah dibuang hanya boleh DILIHAT.
 */
export interface InvoiceSnapshotPoint {
  snapshotId: string;
  kind: InvoiceCancelKind;
  cancelAt: string;
  restoredAt?: string;
  discardedAt?: string;
  sessionCount: number;
  totalCost: number;
  month: string;
  /** true bila salinan pemulihan sudah dipakai (dipulihkan) atau dibuang. */
  spent: boolean;
}

/**
 * Riwayat titik pemulihan SATU tagihan, dari yang paling lama ke yang paling
 * baru — dasar pemilih "pulihkan ke tanggal berapa".
 *
 * Berbeda dari `listInvoiceCancellations()` yang hanya menawarkan salinan yang
 * MASIH bisa dipakai, fungsi ini sengaja ikut menampilkan titik yang sudah
 * dipulihkan atau dibuang: setelah salah memulihkan, pemilik perlu melihat titik
 * sebelumnya untuk bisa kembali ke keadaan yang lebih awal. Karena itu fungsi ini
 * READ-ONLY — ia tidak menulis apa pun dan tidak pernah menghapus jejak.
 *
 * Titik yang salinan pemulihannya sudah DIBUANG sudah tidak punya baris
 * `payment.cancel` (entri itu dihapus saat dibuang), jadi titiknya
 * direkonstruksi dari entri `payment.discard` (entityId = id tagihan) dengan
 * `discardedAt` + `spent: true`; nominal, bulan, dan jumlah sesinya sudah tidak
 * tersimpan lagi sehingga bernilai 0/kosong.
 */
export async function listInvoiceSnapshotPoints(paymentId: string): Promise<InvoiceSnapshotPoint[]> {
  const entries = await db.auditLog.where("entityType").equals("payment").toArray();

  const restoredAt = new Map<string, string>();
  const discardedAt = new Map<string, string>();
  for (const entry of entries) {
    if (entry.action !== "payment.restore" && entry.action !== PAYMENT_DISCARD_ACTION) continue;
    const { snapshotId } = parseSnapshotRef(entry.details);
    if (!snapshotId) continue;
    const target = entry.action === "payment.restore" ? restoredAt : discardedAt;
    // Jejak PERTAMA yang menang: satu snapshot hanya pernah dipulihkan atau
    // dibuang sekali, jadi urutannya tidak pernah ambigu.
    if (!target.has(snapshotId)) target.set(snapshotId, entry.timestamp);
  }

  const points: InvoiceSnapshotPoint[] = [];
  const known = new Set<string>();
  for (const entry of entries) {
    if (entry.action !== "payment.cancel") continue;
    const snapshot = decodeInvoiceCancelSnapshot(entry);
    if (!snapshot || snapshot.payment.id !== paymentId) continue;
    known.add(entry.id);
    const restored = restoredAt.get(entry.id);
    const discarded = discardedAt.get(entry.id);
    points.push({
      snapshotId: entry.id,
      kind: snapshot.kind,
      cancelAt: entry.timestamp,
      restoredAt: restored,
      discardedAt: discarded,
      sessionCount: snapshot.sessionIds.length,
      totalCost: snapshot.payment.totalCost,
      month: snapshot.payment.month,
      spent: Boolean(restored || discarded),
    });
  }

  for (const entry of entries) {
    if (entry.action !== PAYMENT_DISCARD_ACTION || entry.entityId !== paymentId) continue;
    const { snapshotId, kind } = parseSnapshotRef(entry.details);
    if (!snapshotId || !kind || known.has(snapshotId)) continue;
    known.add(snapshotId);
    points.push({
      snapshotId,
      kind,
      // Tanggal pembatalan aslinya ikut terhapus bersama snapshotnya; waktu
      // salinan itu dibuang adalah penanda waktu terbaik yang masih tersimpan.
      cancelAt: entry.timestamp,
      discardedAt: entry.timestamp,
      sessionCount: 0,
      totalCost: 0,
      month: "",
      spent: true,
    });
  }

  return points.sort((a, b) => a.cancelAt.localeCompare(b.cancelAt));
}

/**
 * Pulihkan satu pembatalan dari snapshot audit (R1).
 *
 * Pemulihan MEMAKAI HABIS salinan pemulihan itu (jejak `payment.restore`
 * menandainya `spent`): ia memulihkan keadaan tagihan PERSIS seperti saat
 * dibatalkan. Karena itu titik pemulihan berikutnya — yaitu "titik waktu"
 * pertama yang tersedia saat tagihan dibatalkan lagi — ditambahkan pada
 * pembatalan berikutnya, dan itulah yang membuat riwayat di
 * `listInvoiceSnapshotPoints()` tumbuh dari waktu ke waktu.
 *
 * Seluruh guard G1–G9 diperiksa SEBELUM penulisan apa pun, dan pemulihan
 * berjalan dalam satu transaksi: bila ada satu pemeriksaan gagal, tidak ada
 * record yang dipulihkan sebagian.
 */
export async function restoreCancelledInvoice(snapshotId: string): Promise<InvoiceRestoreResult> {
  return db.transaction("rw", db.students, db.reports, db.payments, db.auditLog, db.sessions, async () => {
    // G0 — baca langsung lewat id, bukan daftar 50 entri terakhir.
    const entry = await db.auditLog.get(snapshotId);
    if (!entry) throw new Error("Snapshot pembatalan tidak ditemukan di perangkat ini");
    const snapshot = decodeInvoiceCancelSnapshot(entry);
    if (!snapshot) throw new Error("Snapshot pembatalan tidak dapat dibaca");
    const { payment, report, sessionIds, kind } = snapshot;

    // G6 — sesi yang dicakup harus masih ada.
    if (sessionIds.length > 0) {
      const rows = await db.sessions.bulkGet(sessionIds);
      const missing = rows.filter((row) => !row).length;
      if (missing > 0) {
        throw new Error(`Tidak dapat dipulihkan: ${missing} sesi pada tagihan ini sudah tidak ada`);
      }
    }

    const existingPayment = await db.payments.get(payment.id);
    const currentReport = report ? await db.reports.get(report.id) : undefined;
    let currentStudent: Student | undefined;

    if (kind === "package") {
      // G7 — murid yang wajib dipulihkan harus masih ada.
      currentStudent = await db.students.get(payment.studentId);
      if (!currentStudent) throw new Error("Tidak dapat dipulihkan: murid tagihan ini sudah dihapus");
      // G8 — siklus murid tidak boleh berubah setelah pembatalan.
      if (!sameBillingSnapshot(snapshot.studentAfterCancel, billingSnapshotOf(currentStudent))) {
        throw new Error("Tidak dapat dipulihkan: siklus tagihan murid sudah berubah setelah pembatalan");
      }
      // Laporan paket sudah dihapus saat pembatalan. Bila ada laporan dengan ID
      // yang sama tetapi isinya BEDA, jangan ditimpa — itu bukan undo idempoten.
      if (currentReport && !sameRecord(report!, currentReport)) {
        throw new Error("Tidak dapat dipulihkan: laporan paket untuk ID ini sudah ada dengan data berbeda");
      }
      // G2 — paket pengganti dengan himpunan sesi identik (selain laporan ini).
      const identical = await db.reports
        .where({ studentId: payment.studentId })
        .filter((candidate) => candidate.id !== report!.id
          && sameInvoiceSessionIds(candidate.sessionIds, sessionIds))
        .first();
      if (identical) {
        throw new Error("Tidak dapat dipulihkan: paket pengganti untuk sesi yang sama sudah diterbitkan");
      }
    }

    if (kind === "report") {
      // G4 — laporan snapshot harus ada dan cakupannya tidak berubah.
      if (!currentReport) throw new Error("Tidak dapat dipulihkan: laporan tagihan ini sudah tidak ada");
      if (!sameInvoiceSessionIds(currentReport.sessionIds, sessionIds)) {
        throw new Error("Tidak dapat dipulihkan: cakupan sesi laporan sudah berubah");
      }
      // G3 — sudah ada invoice lain untuk laporan yang sama.
      const sibling = (await db.payments.where("reportId").equals(report!.id).toArray())
        .find((candidate) => candidate.id !== payment.id);
      if (sibling) throw new Error("Tidak dapat dipulihkan: laporan ini sudah punya tagihan lain");
    }

    if (kind === "manual") {
      // G5 — tagihan tanpa laporan lain pada murid+bulan yang sama.
      const duplicate = (await db.payments
        .where("[studentId+month]").equals([payment.studentId, payment.month])
        .toArray())
        .find((candidate) => candidate.id !== payment.id && !candidate.reportId);
      if (duplicate) {
        throw new Error("Tidak dapat dipulihkan: sudah ada tagihan manual lain untuk murid dan bulan ini");
      }
    }

    // G1 — report LAIN (bukan report milik invoice yang sedang dipulihkan) yang
    // mencakup sesi snapshot. Report milik invoice sendiri tetap sah memiliki
    // sesi itu (laporan periode tetap `confirmed`; laporan paket ikut dipulihkan),
    // jadi ia memang harus dikecualikan; report lain yang tumpang tindih tetap
    // menolak, karena sesi itu sudah diklaim ringkasan lain.
    if (kind !== "manual" && sessionIds.length > 0) {
      const ownReportId = report?.id;
      const overlapping = (await db.reports.where({ studentId: payment.studentId }).toArray())
        .find((candidate) => candidate.id !== ownReportId
          && sessionScopesOverlap(candidate.sessionIds, sessionIds));
      if (overlapping) {
        throw new Error("Tidak dapat dipulihkan: sesi tagihan ini sudah tercakup laporan lain");
      }
    }

    if (existingPayment) {
      // G9 — idempoten bila SELURUH record pasangan identik.
      const paymentIdentical = sameRecord(payment, existingPayment);
      const reportIdentical = kind === "package"
        ? Boolean(report) && Boolean(currentReport) && sameRecord(report!, currentReport!)
        : true;
      const studentIdentical = kind === "package"
        ? sameBillingSnapshot(
            snapshot.studentBeforeCancel,
            currentStudent ? billingSnapshotOf(currentStudent) : undefined,
          )
        : true;
      if (paymentIdentical && reportIdentical && studentIdentical) {
        return { status: "noop", kind };
      }
      // Keadaan tagihan BERBEDA dari titik ini → kembalikan ke titik tersebut.
      // Inilah jalur "salah pulihkan lalu pilih titik lain": tagihan yang sudah
      // dipulihkan ke titik B bisa diarahkan lagi ke titik A yang lebih tua,
      // karena setiap titik menyimpan salinan tagihan apa adanya.
      await db.payments.put(payment);
      if (kind === "package") {
        await db.reports.put(report!);
        await db.students.update(payment.studentId, {
          billingPolicy: snapshot.studentBeforeCancel?.billingPolicy,
          billingSessionCount: snapshot.studentBeforeCancel?.billingSessionCount,
          pendingBillingPolicy: snapshot.studentBeforeCancel?.pendingBillingPolicy,
        });
      }
      await db.auditLog.add({
        id: crypto.randomUUID(),
        action: "payment.restore" as const,
        entityType: "payment",
        entityId: payment.id,
        timestamp: timestamp(),
        details: JSON.stringify({ snapshotId, kind, replacedDifferentState: true }),
      });
      return { status: "restored", kind };
    }

    await db.payments.put(payment);
    if (kind === "package") {
      await db.reports.put(report!);
      await db.students.update(payment.studentId, {
        billingPolicy: snapshot.studentBeforeCancel?.billingPolicy,
        billingSessionCount: snapshot.studentBeforeCancel?.billingSessionCount,
        pendingBillingPolicy: snapshot.studentBeforeCancel?.pendingBillingPolicy,
      });
    }
    await db.auditLog.add({
      id: crypto.randomUUID(),
      action: "payment.restore",
      entityType: "payment",
      entityId: payment.id,
      timestamp: timestamp(),
      details: JSON.stringify({ snapshotId, kind }),
    });
    return { status: "restored", kind };
  });
}

/**
 * Buang salinan pemulihan satu pembatalan (R1) tanpa memulihkan tagihannya.
 *
 * Dipakai agar daftar "Tagihan dibatalkan — bisa dipulihkan" tidak menumpuk
 * selamanya. Snapshot dihapus dari auditLog — itulah yang membuat entrinya
 * hilang dari `listInvoiceCancellations()` — lalu satu entri `payment.discard`
 * ditulis supaya riwayat aktivitas tetap mencatat bahwa salinan itu dibuang.
 *
 * Aksi ini permanen dan TIDAK mengembalikan tagihan: hanya salinan
 * pemulihannya yang hilang. Snapshot yang sudah dipulihkan ditolak, karena
 * jejaknya masih menerangkan pemulihan yang sudah terjadi.
 */
export async function discardInvoiceCancellation(snapshotId: string): Promise<void> {
  await db.transaction("rw", db.auditLog, async () => {
    const entry = await db.auditLog.get(snapshotId);
    if (!entry) throw new Error("Snapshot pembatalan tidak ditemukan");
    if (entry.action !== "payment.cancel") throw new Error("Entri ini bukan snapshot pembatalan");

    const related = await db.auditLog.where("entityType").equals("payment").toArray();
    const alreadyRestored = related.some((other) => {
      if (other.action !== "payment.restore" || !other.details) return false;
      try {
        return (JSON.parse(other.details) as { snapshotId?: string })?.snapshotId === snapshotId;
      } catch {
        return false;
      }
    });
    if (alreadyRestored) throw new Error("Tagihan ini sudah dipulihkan");

    const snapshot = decodeInvoiceCancelSnapshot(entry);
    await db.auditLog.delete(snapshotId);
    await db.auditLog.add({
      id: crypto.randomUUID(),
      action: PAYMENT_DISCARD_ACTION,
      entityType: "payment",
      entityId: snapshot?.payment.id,
      timestamp: timestamp(),
      details: JSON.stringify({ snapshotId, kind: snapshot?.kind }),
    });
  });
}

/**
 * Batalkan invoice yang terbit dari laporan periode (L3).
 *
 * D3: hanya laporan dengan status final EKSPLISIT (`status === "confirmed"`)
 * yang boleh dilepas. Laporan legacy tanpa `status` ditolak — setelah invoice
 * hilang, `reportIdsWithInvoice` tidak lagi memuatnya sehingga cakupan paket
 * bisa lepas diam-diam.
 *
 * Laporannya TIDAK dihapus: laporan tetap final, hanya tagihannya yang hilang
 * dan barisnya kembali ke "Siap ditagih".
 */
export async function cancelReportInvoice(paymentId: string): Promise<void> {
  await db.transaction("rw", db.payments, db.reports, db.auditLog, async () => {
    const payment = await db.payments.get(paymentId);
    if (!payment) throw new Error("Tagihan tidak ditemukan");
    if (!payment.reportId) throw new Error("Tagihan ini tidak terbit dari laporan");
    const report = await db.reports.get(payment.reportId);
    if (!report) throw new Error("Laporan tagihan ini tidak ditemukan");
    if (report.billingMode === "session_count") {
      throw new Error("Tagihan paket dibatalkan lewat antrean paket di Keuangan");
    }
    if (report.status !== "confirmed") {
      throw new Error("Laporan belum berstatus final eksplisit; invoice laporan lama tidak dapat dibatalkan");
    }
    if (payment.status !== "UNPAID" || payment.source !== "auto") {
      throw new Error("Tagihan yang lunas atau diedit manual tidak dapat dibatalkan");
    }
    const linked = await db.payments.where("reportId").equals(report.id).toArray();
    if (linked.length > 1) {
      throw new Error("Ada lebih dari satu tagihan untuk laporan ini; rapikan dulu di Keuangan");
    }
    await db.auditLog.add({
      id: crypto.randomUUID(),
      action: "payment.cancel",
      entityType: "payment",
      entityId: payment.id,
      timestamp: timestamp(),
      details: encodeInvoiceCancelSnapshot({
        version: 1,
        kind: "report",
        payment,
        report,
        sessionIds: report.sessionIds,
      }),
    });
    await db.payments.delete(payment.id);
  });
}

/**
 * Hapus tagihan manual (tanpa laporan) yang belum dibayar (L4).
 *
 * Snapshot wajib: tanpanya satu tagihan manual hilang permanen tanpa cara
 * dipulihkan. Pelanggaran duplikat murid+bulan baru diperiksa saat pemulihan
 * (G5), bukan saat menghapus.
 */
export async function deleteManualPayment(paymentId: string): Promise<void> {
  await db.transaction("rw", db.payments, db.auditLog, async () => {
    const payment = await db.payments.get(paymentId);
    if (!payment) throw new Error("Tagihan tidak ditemukan");
    if (payment.reportId) throw new Error("Tagihan ini terbit dari laporan, bukan tagihan manual");
    if (payment.source !== "manual") throw new Error("Hanya tagihan manual yang dapat dihapus");
    if (payment.status !== "UNPAID") throw new Error("Tagihan yang sudah lunas tidak dapat dihapus");
    await db.auditLog.add({
      id: crypto.randomUUID(),
      action: "payment.cancel",
      entityType: "payment",
      entityId: payment.id,
      timestamp: timestamp(),
      details: encodeInvoiceCancelSnapshot({
        version: 1,
        kind: "manual",
        payment,
        sessionIds: [],
      }),
    });
    await db.payments.delete(payment.id);
  });
}

/**
 * Ubah jatuh tempo tagihan (L5 / D5).
 *
 * Hanya `UNPAID` dan tanggal `YYYY-MM-DD` yang benar-benar valid (termasuk
 * 31 Februari ditolak). Tidak ada field lain yang disentuh — nominal, status,
 * pembayaran, laporan, dan sesi tidak ikut berubah, sehingga Σ rekap tetap.
 */
export async function updatePaymentDueAt(paymentId: string, dueAt: string): Promise<void> {
  if (!isValidYmd(dueAt)) throw new Error("Tanggal jatuh tempo tidak valid");
  await db.transaction("rw", db.payments, db.auditLog, async () => {
    const payment = await db.payments.get(paymentId);
    if (!payment) throw new Error("Tagihan tidak ditemukan");
    if (payment.status !== "UNPAID") {
      throw new Error("Jatuh tempo hanya dapat diubah untuk tagihan yang belum dibayar");
    }
    const previous = invoiceDueAt(payment) ?? "—";
    await db.payments.update(paymentId, { dueAt });
    // Audit di dalam transaksi: aging dan nada pesan WA ikut berubah, jadi
    // perubahan ini tidak boleh terjadi tanpa jejak.
    await db.auditLog.add({
      id: crypto.randomUUID(),
      action: "payment.due",
      entityType: "payment",
      entityId: paymentId,
      timestamp: timestamp(),
      details: `${payment.month}: ${previous} → ${dueAt}`,
    });
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
