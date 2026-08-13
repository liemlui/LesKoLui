import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../db/db";
import type { MonthlyReport, Session, Student } from "../db/types";

const RATE = 100_000;

function student(
  id: string,
  billingPolicy: Student["billingPolicy"] = "session_count",
  billingSessionCount = 3,
): Student {
  return {
    id,
    name: `Murid ${id}`,
    level: "MYP",
    subjects: ["Math"],
    parentContact: { phone: "0800000000" },
    hourlyRate: RATE,
    billingPolicy,
    billingSessionCount,
    active: true,
    enrolledAt: "2026-01-01",
  };
}

function session(
  id: string,
  studentId: string,
  date: string,
  options: {
    time?: string;
    durationHours?: number;
    status?: Session["status"];
    noShowBillable?: boolean;
  } = {},
): Session {
  const durationHours = options.durationHours ?? 1;
  return {
    id,
    studentId,
    date,
    time: options.time,
    durationHours,
    subjects: ["Math"],
    shortNote: "",
    status: options.status ?? "DONE",
    noShowBillable: options.noShowBillable,
    rateSnapshot: RATE,
    cost: RATE * durationHours,
    createdAt: `${date}T00:00:00.000Z`,
    updatedAt: `${date}T00:00:00.000Z`,
  };
}

function packageReport(
  id: string,
  studentId: string,
  sessionIds: string[],
  overrides: Partial<MonthlyReport> = {},
): MonthlyReport {
  return {
    id,
    studentId,
    month: "2026-01",
    periodStart: "2026-01-10",
    periodEnd: "2026-01-10",
    status: "confirmed",
    billingMode: "session_count",
    billingSessionCount: sessionIds.length,
    sessionIds,
    templateKey: { themeId: "blue", layoutId: "cards" },
    summaryText: "",
    totalHours: sessionIds.length,
    totalCost: sessionIds.length * RATE,
    createdAt: "2026-01-10T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(async () => {
  await db.students.clear();
  await db.sessions.clear();
  await db.reports.clear();
  await db.payments.clear();
  await db.monthClosings.clear();
  await db.auditLog.clear();
});

describe("session-count billing", () => {
  it("rejects before the exact quota without writing a report or payment", async () => {
    const { createSessionCountInvoice, listSessionCountBillingProgress } = await import("../db/repos");
    await db.students.add(student("short", "session_count", 3));
    await db.sessions.bulkAdd([
      session("short-2", "short", "2026-01-02"),
      session("short-1", "short", "2026-01-01"),
    ]);

    await expect(listSessionCountBillingProgress()).resolves.toMatchObject([{
      studentId: "short",
      targetCount: 3,
      unbilledCount: 2,
      readyBatchCount: 0,
      nextBatchSessions: [{ id: "short-1" }, { id: "short-2" }],
      nextBatchTotal: 2 * RATE,
      nextBatchHours: 2,
    }]);
    await expect(createSessionCountInvoice("short")).rejects.toThrow("Belum cukup sesi");
    expect(await db.reports.count()).toBe(0);
    expect(await db.payments.count()).toBe(0);
  });

  it("rejects restored/direct quotas outside the supported integer range 1..20", async () => {
    const { createSessionCountInvoice } = await import("../db/repos");
    await db.students.add(student("invalid", "session_count", 21));
    await db.sessions.add(session("invalid-1", "invalid", "2026-01-01"));

    await expect(createSessionCountInvoice("invalid")).rejects.toThrow("Jumlah sesi penagihan tidak valid");
    expect(await db.reports.count()).toBe(0);
    expect(await db.payments.count()).toBe(0);
  });

  it("claims the oldest exact batch across closed months and includes only chargeable no-shows", async () => {
    const {
      closeMonth,
      createSessionCountInvoice,
      getPaymentByReport,
      getReportById,
    } = await import("../db/repos");
    await db.students.add(student("cross-month", "session_count", 4));
    await db.sessions.bulkAdd([
      session("feb-later", "cross-month", "2026-02-01", { time: "11:00" }),
      session("jan-second", "cross-month", "2026-01-31", { time: "10:00" }),
      session("jan-first", "cross-month", "2026-01-31", { time: "08:00" }),
      session("ignored-no-show", "cross-month", "2026-01-15", { status: "NO_SHOW", noShowBillable: false }),
      session("billable-no-show", "cross-month", "2026-01-20", { status: "NO_SHOW", noShowBillable: true }),
    ]);
    await closeMonth("2026-01");
    await closeMonth("2026-02");

    const result = await createSessionCountInvoice("cross-month");
    expect(result).toMatchObject({ month: "2026-02", sessionCount: 4, totalCost: 4 * RATE });
    await expect(getReportById(result.reportId)).resolves.toMatchObject({
      periodStart: "2026-01-20",
      periodEnd: "2026-02-01",
      billingMode: "session_count",
      billingSessionCount: 4,
      sessionIds: ["billable-no-show", "jan-first", "jan-second", "feb-later"],
    });
    await expect(getPaymentByReport(result.reportId)).resolves.toMatchObject({
      id: result.paymentId,
      month: "2026-02",
      totalCost: 4 * RATE,
      source: "auto",
    });
  });

  it("issues successive non-overlapping batches and leaves the remainder visible", async () => {
    const { createSessionCountInvoice, listSessionCountBillingProgress } = await import("../db/repos");
    await db.students.add(student("batches", "session_count", 2));
    await db.sessions.bulkAdd(Array.from({ length: 5 }, (_, index) =>
      session(`batch-${index + 1}`, "batches", `2026-01-0${index + 1}`)));

    const first = await createSessionCountInvoice("batches");
    await expect(listSessionCountBillingProgress()).resolves.toMatchObject([{
      unbilledCount: 3,
      readyBatchCount: 1,
      nextBatchSessions: [{ id: "batch-3" }, { id: "batch-4" }],
    }]);
    const second = await createSessionCountInvoice("batches");

    const reports = (await db.reports.bulkGet([first.reportId, second.reportId]))
      .filter((report): report is MonthlyReport => report !== undefined);
    expect(reports.map((report) => report.sessionIds)).toEqual([
      ["batch-1", "batch-2"],
      ["batch-3", "batch-4"],
    ]);
    await expect(listSessionCountBillingProgress()).resolves.toMatchObject([{
      unbilledCount: 1,
      readyBatchCount: 0,
      nextBatchSessions: [{ id: "batch-5" }],
    }]);
  });

  it("coalesces concurrent double taps into one report and one payment", async () => {
    const { createSessionCountInvoice } = await import("../db/repos");
    await db.students.add(student("race", "session_count", 2));
    await db.sessions.bulkAdd([
      session("race-1", "race", "2026-01-01"),
      session("race-2", "race", "2026-01-02"),
      session("race-3", "race", "2026-01-03"),
    ]);

    const [first, second] = await Promise.all([
      createSessionCountInvoice("race"),
      createSessionCountInvoice("race"),
    ]);
    expect(second).toEqual(first);
    expect(await db.reports.count()).toBe(1);
    expect(await db.payments.count()).toBe(1);
    expect((await db.reports.toArray())[0].sessionIds).toEqual(["race-1", "race-2"]);
  });

  it("never adopts a standalone manual invoice into a session-count report", async () => {
    const { createManualPayment, createSessionCountInvoice, listPayments } = await import("../db/repos");
    await db.students.add(student("manual-coexist", "session_count", 2));
    await db.sessions.bulkAdd([
      session("manual-coexist-1", "manual-coexist", "2026-06-01"),
      session("manual-coexist-2", "manual-coexist", "2026-06-30"),
    ]);
    const manualPaymentId = await createManualPayment({
      studentId: "manual-coexist",
      month: "2026-06",
      totalCost: 75_000,
      status: "UNPAID",
    });

    const result = await createSessionCountInvoice("manual-coexist");
    const payments = (await listPayments("2026-06"))
      .filter((payment) => payment.studentId === "manual-coexist");
    expect(payments).toHaveLength(2);
    const manualPayment = payments.find((payment) => payment.id === manualPaymentId);
    expect(manualPayment).toMatchObject({
      totalCost: 75_000,
      source: "manual",
    });
    expect(manualPayment?.reportId).toBeUndefined();
    expect(payments.find((payment) => payment.id === result.paymentId)).toMatchObject({
      totalCost: 2 * RATE,
      source: "auto",
      reportId: result.reportId,
    });
  });

  it("confirms the matching package draft instead of creating a duplicate report", async () => {
    const { createSessionCountInvoice } = await import("../db/repos");
    await db.students.add(student("draft-package", "session_count", 2));
    await db.sessions.bulkAdd([
      session("draft-package-1", "draft-package", "2026-06-01"),
      session("draft-package-2", "draft-package", "2026-06-08"),
    ]);
    await db.reports.add(packageReport(
      "draft-package-report",
      "draft-package",
      ["draft-package-1", "draft-package-2"],
      { status: "draft", summaryText: "Ringkasan yang sudah disiapkan" },
    ));

    const result = await createSessionCountInvoice("draft-package");

    expect(result.reportId).toBe("draft-package-report");
    expect(await db.reports.count()).toBe(1);
    await expect(db.reports.get(result.reportId)).resolves.toMatchObject({
      status: "confirmed",
      summaryText: "Ringkasan yang sudah disiapkan",
      sessionIds: ["draft-package-1", "draft-package-2"],
    });
    expect(await db.payments.count()).toBe(1);
  });

  it("keeps monthly close and preview limited to monthly students", async () => {
    const { closeMonth, computeMonthBills } = await import("../db/repos");
    const legacyMonthly = student("legacy-monthly");
    delete legacyMonthly.billingPolicy;
    delete legacyMonthly.billingSessionCount;
    await db.students.bulkAdd([
      legacyMonthly,
      student("package", "session_count", 2),
      student("manual", "manual", 3),
    ]);
    await db.sessions.bulkAdd([
      session("monthly-session", "legacy-monthly", "2026-06-01"),
      session("package-session", "package", "2026-06-02"),
      session("manual-session", "manual", "2026-06-03"),
    ]);

    await expect(computeMonthBills("2026-06")).resolves.toMatchObject([
      { studentId: "legacy-monthly", count: 1, cost: RATE },
    ]);
    await closeMonth("2026-06");

    expect((await db.reports.toArray()).map((report) => report.studentId)).toEqual(["legacy-monthly"]);
    expect((await db.payments.toArray()).map((payment) => payment.studentId)).toEqual(["legacy-monthly"]);
    await expect(db.monthClosings.where("month").equals("2026-06").first()).resolves.toMatchObject({
      totalPotensi: RATE,
      totalHours: 1,
      studentCount: 1,
    });
  });

  it("keeps an inactive package student visible while unbilled sessions remain", async () => {
    const { listSessionCountBillingProgress } = await import("../db/repos");
    const inactive = student("inactive-package", "session_count", 2);
    inactive.active = false;
    await db.students.add(inactive);
    await db.sessions.add(session("inactive-package-1", inactive.id, "2026-06-01"));

    await expect(listSessionCountBillingProgress()).resolves.toMatchObject([{
      studentId: inactive.id,
      unbilledCount: 1,
      targetCount: 2,
    }]);
  });

  it("repairs a missing invoice for an existing confirmed package without creating a monthly twin", async () => {
    const { closeMonth, getPaymentByReport } = await import("../db/repos");
    await db.students.add(student("repair", "session_count", 2));
    await db.sessions.bulkAdd([
      session("repair-1", "repair", "2026-06-01"),
      session("repair-2", "repair", "2026-06-02"),
    ]);
    await db.reports.add(packageReport("repair-report", "repair", ["repair-1", "repair-2"], {
      month: "2026-06",
      periodStart: "2026-06-01",
      periodEnd: "2026-06-02",
      totalHours: 2,
      totalCost: 2 * RATE,
    }));

    await closeMonth("2026-06");

    await expect(getPaymentByReport("repair-report")).resolves.toMatchObject({
      totalCost: 2 * RATE,
      source: "auto",
    });
    expect(await db.reports.count()).toBe(1);
    expect(await db.payments.count()).toBe(1);
  });

  it("does not repair unrelated confirmed reports for manual students during monthly close", async () => {
    const { closeMonth } = await import("../db/repos");
    await db.students.add(student("manual-repair", "manual", 2));
    await db.sessions.add(session("manual-repair-1", "manual-repair", "2026-06-01"));
    await db.reports.add(packageReport("manual-report", "manual-repair", ["manual-repair-1"], {
      billingMode: "range",
      billingSessionCount: undefined,
      month: "2026-06",
      periodStart: "2026-06-01",
      periodEnd: "2026-06-01",
      totalHours: 1,
      totalCost: RATE,
    }));

    await closeMonth("2026-06");

    expect(await db.payments.count()).toBe(0);
    expect(await db.reports.count()).toBe(1);
  });

  it("uses session ids for package identity/overlap and ignores package reports in period lookup", async () => {
    const { createReportForPeriod, findReportByPeriod, upsertReport } = await import("../db/repos");
    await db.students.add(student("identity", "session_count", 1));
    await db.sessions.bulkAdd([
      session("identity-a", "identity", "2026-01-10"),
      session("identity-b", "identity", "2026-01-10"),
    ]);
    await db.monthClosings.add({
      id: "closed-jan",
      month: "2026-01",
      closedAt: "2026-02-01T00:00:00.000Z",
      totalPotensi: 0,
      totalHours: 0,
      studentCount: 0,
    });
    const first = packageReport("identity-report-a", "identity", ["identity-a"]);
    await upsertReport(first);
    await expect(upsertReport(packageReport("identity-report-b", "identity", ["identity-b"]))).resolves.toBe("identity-report-b");
    await expect(upsertReport(packageReport("identity-overlap", "identity", ["identity-a"])))
      .rejects.toThrow("bertumpuk");
    await expect(findReportByPeriod("identity", "2026-01-10", "2026-01-10")).resolves.toBeUndefined();

    const draft = { ...packageReport("identity-draft-a", "identity", ["identity-a"], { status: "draft" }) };
    const sameSessions = { ...draft, id: "identity-draft-b", periodStart: "2026-01-01", periodEnd: "2026-01-31" };
    await db.reports.delete(first.id);
    const created = await createReportForPeriod(draft);
    const reused = await createReportForPeriod(sameSessions);
    expect(reused).toEqual({ reportId: created.reportId, created: false });
  });

  it("blocks direct confirmation of a partial or invalid package report", async () => {
    const { upsertReport } = await import("../db/repos");
    await db.students.add(student("partial", "session_count", 2));
    await db.sessions.bulkAdd([
      session("partial-1", "partial", "2026-01-01"),
      session("partial-2", "partial", "2026-01-02"),
    ]);

    await expect(upsertReport(packageReport("partial-report", "partial", ["partial-1"], {
      billingSessionCount: 2,
    }))).rejects.toThrow("tepat 2 sesi");
    await expect(upsertReport(packageReport("invalid-report", "partial", ["partial-1"], {
      billingSessionCount: 21,
    }))).rejects.toThrow("Jumlah sesi penagihan tidak valid");
    expect(await db.reports.count()).toBe(0);
  });

  it("rejects direct package confirmation that differs from the student's configured quota", async () => {
    const { upsertReport } = await import("../db/repos");
    await db.students.add(student("quota-guard", "session_count", 8));
    await db.sessions.bulkAdd(Array.from({ length: 3 }, (_, index) =>
      session(`quota-guard-${index + 1}`, "quota-guard", `2026-01-0${index + 1}`)));

    await expect(upsertReport(packageReport(
      "quota-guard-report",
      "quota-guard",
      ["quota-guard-1", "quota-guard-2", "quota-guard-3"],
    ))).rejects.toThrow("kuota murid 8 sesi");
    await expect(upsertReport(packageReport(
      "quota-final-direct",
      "quota-guard",
      ["quota-guard-1", "quota-guard-2", "quota-guard-3"],
      {
        finalBillingBatch: true,
        billingTargetSessionCount: 8,
        billingPolicyAfterBatch: "manual",
      },
    ))).rejects.toThrow("hanya dapat diterbitkan dari Keuangan");
    expect(await db.reports.count()).toBe(0);
  });

  it("rejects a new ordinary confirmed report for a package student but preserves legacy edits", async () => {
    const { upsertReport } = await import("../db/repos");
    await db.students.add(student("ordinary-bypass", "session_count", 8));
    await db.sessions.add(session("ordinary-bypass-1", "ordinary-bypass", "2026-01-01"));
    const ordinary = packageReport(
      "ordinary-bypass-report",
      "ordinary-bypass",
      ["ordinary-bypass-1"],
      { billingMode: "range", billingSessionCount: undefined },
    );

    await expect(upsertReport(ordinary)).rejects.toThrow("harus diterbitkan dari Keuangan");
    await db.reports.add(ordinary);
    await expect(upsertReport({ ...ordinary, summaryText: "Edit laporan lama" }))
      .resolves.toBe(ordinary.id);
    await expect(upsertReport({ ...ordinary, sessionIds: ["ordinary-bypass-1", "new-uncovered"] }))
      .rejects.toThrow("harus diterbitkan dari Keuangan");
  });

  it("rejects a package report for a non-package student but preserves in-place edits", async () => {
    const { upsertReport } = await import("../db/repos");
    await db.students.add(student("non-package", "monthly", 3));
    await db.sessions.bulkAdd([
      session("non-package-1", "non-package", "2026-01-01"),
      session("non-package-2", "non-package", "2026-01-02"),
    ]);

    await expect(upsertReport(packageReport(
      "non-package-report",
      "non-package",
      ["non-package-1", "non-package-2"],
      { billingSessionCount: 2 },
    ))).rejects.toThrow("hanya untuk murid dengan siklus per pertemuan");

    // Paket lama yang sudah sah tetap bisa diedit in-place (mis. narasi) setelah
    // murid beralih dari paket, selama snapshot sesinya tidak berubah.
    await db.reports.add(packageReport(
      "legacy-package-report",
      "non-package",
      ["non-package-1", "non-package-2"],
    ));
    await expect(upsertReport({
      ...(await db.reports.get("legacy-package-report"))!,
      summaryText: "Narasi diperbarui",
    })).resolves.toBe("legacy-package-report");
  });

  it("blocks deletion until the unpaid package is cancelled explicitly", async () => {
    const {
      cancelSessionCountInvoice,
      createSessionCountInvoice,
      deleteSession,
      listSessionCountBillingProgress,
    } = await import("../db/repos");
    await db.students.add(student("delete-unpaid", "session_count", 2));
    await db.sessions.bulkAdd([
      session("delete-unpaid-1", "delete-unpaid", "2026-01-01"),
      session("delete-unpaid-2", "delete-unpaid", "2026-01-02"),
    ]);
    const issued = await createSessionCountInvoice("delete-unpaid");

    await expect(deleteSession("delete-unpaid-2")).rejects.toThrow("Batalkan tagihan di Keuangan");
    expect(await db.reports.count()).toBe(1);
    expect(await db.payments.count()).toBe(1);
    expect(await db.sessions.count()).toBe(2);

    await cancelSessionCountInvoice(issued.paymentId);

    expect(await db.reports.count()).toBe(0);
    expect(await db.payments.count()).toBe(0);
    expect(await db.sessions.count()).toBe(2);
    await expect(listSessionCountBillingProgress()).resolves.toMatchObject([{
      studentId: "delete-unpaid",
      unbilledCount: 2,
      readyBatchCount: 1,
    }]);
  });

  it("keeps a paid package and all of its sessions immutable", async () => {
    const {
      createSessionCountInvoice,
      deleteSession,
      markPaymentTransferredById,
    } = await import("../db/repos");
    await db.students.add(student("delete-paid", "session_count", 2));
    await db.sessions.bulkAdd([
      session("delete-paid-1", "delete-paid", "2026-01-01"),
      session("delete-paid-2", "delete-paid", "2026-01-02"),
    ]);
    const issued = await createSessionCountInvoice("delete-paid");
    await markPaymentTransferredById(issued.paymentId);

    await expect(deleteSession("delete-paid-2")).rejects.toThrow("tagihan paket");

    expect(await db.sessions.count()).toBe(2);
    expect(await db.reports.count()).toBe(1);
    await expect(db.payments.get(issued.paymentId)).resolves.toMatchObject({ status: "PAID" });
  });

  it("issues an explicit partial closing batch only for a non-empty remainder", async () => {
    const { createSessionCountInvoice, updateStudent } = await import("../db/repos");
    await db.students.add(student("final", "session_count", 4));
    await db.sessions.bulkAdd([
      session("final-1", "final", "2026-01-01"),
      session("final-2", "final", "2026-01-02"),
      session("final-3", "final", "2026-01-03"),
    ]);
    await updateStudent(
      "final",
      { billingPolicy: "manual" },
      { deferSessionCountPolicyChange: true },
    );

    const issued = await createSessionCountInvoice("final", { finalBatch: true });
    expect(issued).toMatchObject({
      sessionCount: 3,
      totalCost: 3 * RATE,
      finalBatch: true,
      activatedBillingPolicy: "manual",
    });
    await expect(db.reports.get(issued.reportId)).resolves.toMatchObject({
      billingMode: "session_count",
      billingSessionCount: 3,
      billingTargetSessionCount: 4,
      finalBillingBatch: true,
      billingPolicyAfterBatch: "manual",
      sessionIds: ["final-1", "final-2", "final-3"],
    });
    const finalReport = (await db.reports.get(issued.reportId))!;
    const { upsertReport } = await import("../db/repos");
    await expect(upsertReport({ ...finalReport, summaryText: "Narasi final diperbarui" }))
      .resolves.toBe(issued.reportId);
    await expect(db.students.get("final")).resolves.toMatchObject({ billingPolicy: "manual" });

    await expect(createSessionCountInvoice("final", { finalBatch: true }))
      .rejects.toThrow("tidak memakai penagihan per jumlah pertemuan");
  });

  it("rejects final-batch mode when a complete normal batch is available", async () => {
    const { createSessionCountInvoice, updateStudent } = await import("../db/repos");
    await db.students.add(student("not-final", "session_count", 2));
    await db.sessions.bulkAdd([
      session("not-final-1", "not-final", "2026-01-01"),
      session("not-final-2", "not-final", "2026-01-02"),
    ]);
    await updateStudent(
      "not-final",
      { billingPolicy: "manual" },
      { deferSessionCountPolicyChange: true },
    );
    await expect(createSessionCountInvoice("not-final", { finalBatch: true }))
      .rejects.toThrow("Tagihan penutup hanya");
  });

  it("rejects arbitrary final batches without a pending policy transition", async () => {
    const { createSessionCountInvoice } = await import("../db/repos");
    await db.students.add(student("arbitrary-final", "session_count", 4));
    await db.sessions.add(session("arbitrary-final-1", "arbitrary-final", "2026-01-01"));
    await expect(createSessionCountInvoice("arbitrary-final", { finalBatch: true }))
      .rejects.toThrow("perubahan kebijakan");
  });

  it("rejects cancellation for paid, manually edited, and non-package invoices", async () => {
    const {
      cancelSessionCountInvoice,
      createManualPayment,
      createSessionCountInvoice,
      markPaymentTransferredById,
      updatePaymentAmountById,
    } = await import("../db/repos");
    await db.students.bulkAdd([
      student("cancel-paid", "session_count", 1),
      student("cancel-manual", "session_count", 1),
    ]);
    await db.sessions.bulkAdd([
      session("cancel-paid-1", "cancel-paid", "2026-01-01"),
      session("cancel-manual-1", "cancel-manual", "2026-01-01"),
    ]);
    const paid = await createSessionCountInvoice("cancel-paid");
    const manual = await createSessionCountInvoice("cancel-manual");
    await markPaymentTransferredById(paid.paymentId);
    await updatePaymentAmountById(manual.paymentId, RATE - 1);
    const standalone = await createManualPayment({
      studentId: "cancel-paid", month: "2026-02", totalCost: RATE, status: "UNPAID",
    });

    await expect(cancelSessionCountInvoice(paid.paymentId)).rejects.toThrow("lunas atau diedit manual");
    await expect(cancelSessionCountInvoice(manual.paymentId)).rejects.toThrow("lunas atau diedit manual");
    await expect(cancelSessionCountInvoice(standalone)).rejects.toThrow("bukan tagihan paket");
    expect(await db.reports.count()).toBe(2);
    expect(await db.payments.count()).toBe(3);
  });

  it("serializes payment protection mutations against package cancellation", async () => {
    const {
      cancelSessionCountInvoice,
      createSessionCountInvoice,
      markPaymentTransferredById,
      updatePaymentAmountById,
    } = await import("../db/repos");
    await db.students.bulkAdd([
      student("race-paid-cancel", "session_count", 1),
      student("race-manual-cancel", "session_count", 1),
    ]);
    await db.sessions.bulkAdd([
      session("race-paid-cancel-1", "race-paid-cancel", "2026-01-01"),
      session("race-manual-cancel-1", "race-manual-cancel", "2026-01-01"),
    ]);
    const paid = await createSessionCountInvoice("race-paid-cancel");
    const manual = await createSessionCountInvoice("race-manual-cancel");

    const paidRace = await Promise.allSettled([
      markPaymentTransferredById(paid.paymentId),
      cancelSessionCountInvoice(paid.paymentId),
    ]);
    const manualRace = await Promise.allSettled([
      updatePaymentAmountById(manual.paymentId, RATE - 1),
      cancelSessionCountInvoice(manual.paymentId),
    ]);

    expect(paidRace.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(manualRace.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const paidRow = await db.payments.get(paid.paymentId);
    const manualRow = await db.payments.get(manual.paymentId);
    expect(paidRow ? paidRow.status : undefined).toBe(paidRow ? "PAID" : undefined);
    expect(manualRow ? manualRow.source : undefined).toBe(manualRow ? "manual" : undefined);
    expect(Boolean(paidRow)).toBe(Boolean(await db.reports.get(paid.reportId)));
    expect(Boolean(manualRow)).toBe(Boolean(await db.reports.get(manual.reportId)));
  });

  it("blocks deletion for package drafts before touching any row", async () => {
    const { deleteSession } = await import("../db/repos");
    await db.students.add(student("draft-delete", "session_count", 2));
    await db.sessions.add(session("draft-delete-1", "draft-delete", "2026-01-01"));
    await db.reports.add(packageReport("draft-delete-report", "draft-delete", ["draft-delete-1"], {
      status: "draft",
      billingSessionCount: 2,
    }));

    await expect(deleteSession("draft-delete-1")).rejects.toThrow("Hapus draft laporan");
    expect(await db.sessions.count()).toBe(1);
    expect(await db.reports.count()).toBe(1);
  });

  it("guards entering and leaving package policy when uncovered sessions exist", async () => {
    const { updateStudent } = await import("../db/repos");
    await db.students.bulkAdd([
      student("enter-package", "monthly", 2),
      student("leave-package", "session_count", 2),
    ]);
    await db.sessions.bulkAdd([
      session("enter-package-1", "enter-package", "2026-01-01"),
      session("leave-package-1", "leave-package", "2026-01-01"),
    ]);

    await expect(updateStudent("enter-package", {
      billingPolicy: "session_count", billingSessionCount: 2,
    })).rejects.toThrow("konfirmasi");
    await updateStudent(
      "enter-package",
      { billingPolicy: "session_count", billingSessionCount: 2 },
      { includeExistingUnbilledInPackage: true },
    );
    await expect(db.students.get("enter-package")).resolves.toMatchObject({ billingPolicy: "session_count" });

    await expect(updateStudent("leave-package", { billingPolicy: "manual" }))
      .rejects.toThrow("tagihan penutup");
    await expect(db.students.get("leave-package")).resolves.toMatchObject({ billingPolicy: "session_count" });
  });

  it("drains a deferred N=8 transition with one regular batch and one final batch", async () => {
    const {
      createSessionCountInvoice,
      listSessionCountBillingProgress,
      updateStudent,
    } = await import("../db/repos");
    await db.students.add(student("transition-ten", "session_count", 8));
    await db.sessions.bulkAdd(Array.from({ length: 10 }, (_, index) =>
      session(`transition-${index + 1}`, "transition-ten", `2026-01-${String(index + 1).padStart(2, "0")}`)));
    await updateStudent(
      "transition-ten",
      { billingPolicy: "monthly" },
      { deferSessionCountPolicyChange: true },
    );
    await expect(db.students.get("transition-ten")).resolves.toMatchObject({
      billingPolicy: "session_count",
      pendingBillingPolicy: "monthly",
    });

    const regular = await createSessionCountInvoice("transition-ten");
    expect(regular).toMatchObject({ sessionCount: 8, finalBatch: false });
    expect(regular.activatedBillingPolicy).toBeUndefined();
    await expect(listSessionCountBillingProgress()).resolves.toMatchObject([{
      studentId: "transition-ten",
      unbilledCount: 2,
      pendingBillingPolicy: "monthly",
    }]);
    await expect(db.students.get("transition-ten")).resolves.toMatchObject({
      billingPolicy: "session_count",
      pendingBillingPolicy: "monthly",
    });

    const final = await createSessionCountInvoice("transition-ten", { finalBatch: true });
    expect(final).toMatchObject({
      sessionCount: 2,
      finalBatch: true,
      activatedBillingPolicy: "monthly",
    });
    await expect(db.reports.get(final.reportId)).resolves.toMatchObject({
      billingSessionCount: 2,
      billingTargetSessionCount: 8,
      billingPolicyAfterBatch: "monthly",
    });
    await expect(db.students.get("transition-ten")).resolves.toMatchObject({ billingPolicy: "monthly" });
    expect((await db.students.get("transition-ten"))?.pendingBillingPolicy).toBeUndefined();
  });

  it("cancelling a final transition invoice restores package policy, pending target, and queue", async () => {
    const {
      cancelSessionCountInvoice,
      createSessionCountInvoice,
      listSessionCountBillingProgress,
      updateStudent,
    } = await import("../db/repos");
    await db.students.add(student("cancel-final", "session_count", 3));
    await db.sessions.bulkAdd([
      session("cancel-final-1", "cancel-final", "2026-01-01"),
      session("cancel-final-2", "cancel-final", "2026-01-02"),
    ]);
    await updateStudent(
      "cancel-final",
      { billingPolicy: "manual" },
      { deferSessionCountPolicyChange: true },
    );
    const issued = await createSessionCountInvoice("cancel-final", { finalBatch: true });
    await expect(db.students.get("cancel-final")).resolves.toMatchObject({ billingPolicy: "manual" });

    await cancelSessionCountInvoice(issued.paymentId);

    await expect(db.students.get("cancel-final")).resolves.toMatchObject({
      billingPolicy: "session_count",
      billingSessionCount: 3,
      pendingBillingPolicy: "manual",
    });
    await expect(listSessionCountBillingProgress()).resolves.toMatchObject([{
      studentId: "cancel-final",
      unbilledCount: 2,
      pendingBillingPolicy: "manual",
    }]);
  });

  it("cancelling an earlier transition batch after completion restores the original package transition", async () => {
    const {
      cancelSessionCountInvoice,
      createSessionCountInvoice,
      listSessionCountBillingProgress,
      updateStudent,
    } = await import("../db/repos");
    await db.students.add(student("cancel-early", "session_count", 8));
    await db.sessions.bulkAdd(Array.from({ length: 10 }, (_, index) =>
      session(`cancel-early-${index + 1}`, "cancel-early", `2026-01-${String(index + 1).padStart(2, "0")}`)));
    await updateStudent(
      "cancel-early",
      { billingPolicy: "monthly" },
      { deferSessionCountPolicyChange: true },
    );

    const regular = await createSessionCountInvoice("cancel-early");
    await expect(db.reports.get(regular.reportId)).resolves.toMatchObject({
      billingSessionCount: 8,
      billingTargetSessionCount: 8,
      billingPolicyTransitionTarget: "monthly",
    });
    await createSessionCountInvoice("cancel-early", { finalBatch: true });
    await expect(db.students.get("cancel-early")).resolves.toMatchObject({ billingPolicy: "monthly" });

    await cancelSessionCountInvoice(regular.paymentId);

    await expect(db.students.get("cancel-early")).resolves.toMatchObject({
      billingPolicy: "session_count",
      billingSessionCount: 8,
      pendingBillingPolicy: "monthly",
    });
    await expect(listSessionCountBillingProgress()).resolves.toMatchObject([{
      studentId: "cancel-early",
      unbilledCount: 8,
      readyBatchCount: 1,
      pendingBillingPolicy: "monthly",
    }]);
  });

  it("switches away from package immediately when the backlog is empty", async () => {
    const { updateStudent } = await import("../db/repos");
    await db.students.add(student("empty-transition", "session_count", 8));

    await updateStudent("empty-transition", { billingPolicy: "monthly" });

    await expect(db.students.get("empty-transition")).resolves.toMatchObject({ billingPolicy: "monthly" });
    expect((await db.students.get("empty-transition"))?.pendingBillingPolicy).toBeUndefined();
  });

  it("cancels a deferred transition only when session_count is selected explicitly", async () => {
    const { updateStudent } = await import("../db/repos");
    await db.students.add(student("cancel-transition", "session_count", 8));
    await db.sessions.add(session("cancel-transition-1", "cancel-transition", "2026-01-01"));
    await updateStudent(
      "cancel-transition",
      { billingPolicy: "manual" },
      { deferSessionCountPolicyChange: true },
    );

    await updateStudent("cancel-transition", { name: "Nama baru" });
    await expect(db.students.get("cancel-transition")).resolves.toMatchObject({
      billingPolicy: "session_count",
      pendingBillingPolicy: "manual",
      name: "Nama baru",
    });

    await updateStudent("cancel-transition", { billingPolicy: "session_count" });
    await expect(db.students.get("cancel-transition")).resolves.toMatchObject({
      billingPolicy: "session_count",
    });
    expect((await db.students.get("cancel-transition"))?.pendingBillingPolicy).toBeUndefined();
  });

  it("activates a pending policy when deleting the final uncovered session, but not before", async () => {
    const { deleteSession, updateStudent } = await import("../db/repos");
    await db.students.add(student("delete-transition", "session_count", 8));
    await db.sessions.bulkAdd([
      session("delete-transition-1", "delete-transition", "2026-01-01"),
      session("delete-transition-2", "delete-transition", "2026-01-02"),
    ]);
    await updateStudent(
      "delete-transition",
      { billingPolicy: "manual" },
      { deferSessionCountPolicyChange: true },
    );

    await deleteSession("delete-transition-1");
    await expect(db.students.get("delete-transition")).resolves.toMatchObject({
      billingPolicy: "session_count",
      pendingBillingPolicy: "manual",
    });
    await deleteSession("delete-transition-2");
    await expect(db.students.get("delete-transition")).resolves.toMatchObject({ billingPolicy: "manual" });
    expect((await db.students.get("delete-transition"))?.pendingBillingPolicy).toBeUndefined();
  });

  it("cancelling an old package invoice after an immediate switch restores package with current policy pending", async () => {
    const { cancelSessionCountInvoice, createSessionCountInvoice, updateStudent } = await import("../db/repos");
    await db.students.add(student("cancel-drained", "session_count", 2));
    await db.sessions.bulkAdd([
      session("cancel-drained-1", "cancel-drained", "2026-01-01"),
      session("cancel-drained-2", "cancel-drained", "2026-01-02"),
    ]);
    const issued = await createSessionCountInvoice("cancel-drained");
    await updateStudent("cancel-drained", { billingPolicy: "monthly" });
    await cancelSessionCountInvoice(issued.paymentId);

    await expect(db.students.get("cancel-drained")).resolves.toMatchObject({
      billingPolicy: "session_count",
      billingSessionCount: 2,
      pendingBillingPolicy: "monthly",
    });
  });

  it("uses the current non-package policy as pending when cancelling a historical invoice", async () => {
    const { cancelSessionCountInvoice, createSessionCountInvoice, updateStudent } = await import("../db/repos");
    await db.students.add(student("cancel-current-policy", "session_count", 2));
    await db.sessions.bulkAdd([
      session("cancel-current-policy-1", "cancel-current-policy", "2026-01-01"),
      session("cancel-current-policy-2", "cancel-current-policy", "2026-01-02"),
    ]);
    const issued = await createSessionCountInvoice("cancel-current-policy");
    await updateStudent("cancel-current-policy", { billingPolicy: "monthly" });
    await updateStudent("cancel-current-policy", { billingPolicy: "manual" });
    await cancelSessionCountInvoice(issued.paymentId);

    await expect(db.students.get("cancel-current-policy")).resolves.toMatchObject({
      billingPolicy: "session_count",
      pendingBillingPolicy: "manual",
    });
  });

  it("preserves a newer package quota and pending intent when cancelling an old invoice", async () => {
    const { cancelSessionCountInvoice, createSessionCountInvoice, updateStudent } = await import("../db/repos");
    await db.students.add(student("cancel-new-package", "session_count", 2));
    await db.sessions.bulkAdd([
      session("cancel-new-package-1", "cancel-new-package", "2026-01-01"),
      session("cancel-new-package-2", "cancel-new-package", "2026-01-02"),
    ]);
    const issued = await createSessionCountInvoice("cancel-new-package");
    await updateStudent("cancel-new-package", { billingPolicy: "monthly" });
    await updateStudent("cancel-new-package", { billingPolicy: "session_count", billingSessionCount: 10 });
    await cancelSessionCountInvoice(issued.paymentId);

    const restored = await db.students.get("cancel-new-package");
    expect(restored).toMatchObject({ billingPolicy: "session_count", billingSessionCount: 10 });
    expect(restored?.pendingBillingPolicy).toBeUndefined();
  });

  it("preserves a newer stored quota when a historical invoice is cancelled from manual policy", async () => {
    const { cancelSessionCountInvoice, createSessionCountInvoice, updateStudent } = await import("../db/repos");
    await db.students.add(student("cancel-new-stored-quota", "session_count", 2));
    await db.sessions.bulkAdd([
      session("cancel-new-stored-quota-1", "cancel-new-stored-quota", "2026-01-01"),
      session("cancel-new-stored-quota-2", "cancel-new-stored-quota", "2026-01-02"),
    ]);
    const issued = await createSessionCountInvoice("cancel-new-stored-quota");
    await updateStudent("cancel-new-stored-quota", { billingPolicy: "monthly" });
    await updateStudent("cancel-new-stored-quota", { billingPolicy: "session_count", billingSessionCount: 10 });
    await updateStudent("cancel-new-stored-quota", { billingPolicy: "manual" });

    await cancelSessionCountInvoice(issued.paymentId);

    await expect(db.students.get("cancel-new-stored-quota")).resolves.toMatchObject({
      billingPolicy: "session_count",
      billingSessionCount: 10,
      pendingBillingPolicy: "manual",
    });
  });
});
