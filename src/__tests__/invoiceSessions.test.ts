import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../db/db";
import type { MonthlyReport, Payment, Session } from "../db/types";
import { listInvoiceSessions } from "../db/repos";

const makeSession = (
  id: string,
  date: string,
  options: Partial<Pick<Session, "studentId" | "status" | "noShowBillable">> = {},
): Session => ({
  id,
  studentId: options.studentId ?? "student-a",
  date,
  durationHours: 1,
  subjects: ["Math"],
  shortNote: "",
  status: options.status ?? "DONE",
  noShowBillable: options.noShowBillable,
  rateSnapshot: 200_000,
  cost: 200_000,
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
});

const makeReport = (
  id: string,
  sessionIds: string[],
  periodStart = "2026-06-01",
  periodEnd = "2026-06-30",
): MonthlyReport => ({
  id,
  studentId: "student-a",
  month: periodEnd.slice(0, 7),
  periodStart,
  periodEnd,
  status: "confirmed",
  sessionIds,
  templateKey: { themeId: "blue", layoutId: "cards" },
  summaryText: "",
  totalHours: sessionIds.length,
  totalCost: sessionIds.length * 200_000,
  createdAt: "2026-06-30T00:00:00.000Z",
});

const makePayment = (overrides: Partial<Payment> = {}): Payment => ({
  id: "payment-a",
  studentId: "student-a",
  month: "2026-06",
  totalCost: 400_000,
  status: "UNPAID",
  ...overrides,
});

beforeEach(async () => {
  await db.sessions.clear();
  await db.reports.clear();
  await db.payments.clear();
});

describe("invoice session resolution", () => {
  it("uses exactly report sessionIds in report order and includes a billable no-show", async () => {
    const late = makeSession("late", "2026-06-24");
    const noShow = makeSession("no-show", "2026-06-08", {
      status: "NO_SHOW",
      noShowBillable: true,
    });
    const unrelatedInRange = makeSession("unrelated", "2026-06-15");
    await db.sessions.bulkAdd([late, noShow, unrelatedInRange]);
    await db.reports.add(makeReport("report-a", [late.id, noShow.id]));

    const rows = await listInvoiceSessions(makePayment({
      reportId: "report-a",
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30",
    }));

    expect(rows.map((session) => session.id)).toEqual(["late", "no-show"]);
    expect(rows[1]).toMatchObject({ status: "NO_SHOW", noShowBillable: true });
  });

  it("does not mix sessions from reports whose date ranges partially overlap", async () => {
    const firstOnly = makeSession("first-only", "2026-06-12");
    const secondOnly = makeSession("second-only", "2026-06-18");
    await db.sessions.bulkAdd([firstOnly, secondOnly]);
    await db.reports.bulkAdd([
      makeReport("report-first", [firstOnly.id], "2026-06-01", "2026-06-20"),
      makeReport("report-second", [secondOnly.id], "2026-06-15", "2026-07-05"),
    ]);

    const firstRows = await listInvoiceSessions(makePayment({
      reportId: "report-first",
      periodStart: "2026-06-01",
      periodEnd: "2026-06-20",
    }));
    const secondRows = await listInvoiceSessions(makePayment({
      id: "payment-b",
      month: "2026-07",
      reportId: "report-second",
      periodStart: "2026-06-15",
      periodEnd: "2026-07-05",
    }));

    expect(firstRows.map((session) => session.id)).toEqual(["first-only"]);
    expect(secondRows.map((session) => session.id)).toEqual(["second-only"]);
  });

  it("keeps a billable date-range fallback for legacy manual payments", async () => {
    await db.sessions.bulkAdd([
      makeSession("outside", "2026-06-09"),
      makeSession("done", "2026-06-15"),
      makeSession("billable-no-show", "2026-07-02", { status: "NO_SHOW", noShowBillable: true }),
      makeSession("waived-no-show", "2026-06-20", { status: "NO_SHOW", noShowBillable: false }),
      makeSession("other-student", "2026-06-22", { studentId: "student-b" }),
    ]);

    const rows = await listInvoiceSessions(makePayment({
      reportId: undefined,
      periodStart: "2026-06-10",
      periodEnd: "2026-07-05",
    }));

    expect(rows.map((session) => session.id)).toEqual(["done", "billable-no-show"]);
  });

  it("falls back to the billable anchor month when a manual payment has no period", async () => {
    await db.sessions.bulkAdd([
      makeSession("june", "2026-06-30"),
      makeSession("june-no-show", "2026-06-02", { status: "NO_SHOW", noShowBillable: true }),
      makeSession("july", "2026-07-01"),
    ]);

    const rows = await listInvoiceSessions(makePayment());

    expect(rows.map((session) => session.id)).toEqual(["june-no-show", "june"]);
  });

  it("does not repeat report sessions on a coexisting standalone manual invoice", async () => {
    const june = makeSession("june", "2026-06-20");
    await db.sessions.add(june);
    await db.reports.add(makeReport("report-a", [june.id]));
    await db.payments.bulkAdd([
      makePayment({ id: "report-payment", reportId: "report-a", source: "auto" }),
      makePayment({ id: "manual-payment", totalCost: 125_000, source: "manual" }),
    ]);

    const rows = await listInvoiceSessions(makePayment({
      id: "manual-payment",
      totalCost: 125_000,
      source: "manual",
    }));

    expect(rows).toEqual([]);
  });
});
