import { describe, expect, it } from "vitest";
import { buildClosingChecklist } from "../lib/closingChecklist";
import type { MonthlyReport, Payment, Session, Student } from "../db/types";

function student(id: string, overrides: Partial<Student> = {}): Student {
  return {
    id,
    name: id,
    level: "IBDP",
    subjects: [],
    parentContact: { phone: "0812" },
    hourlyRate: 200_000,
    active: true,
    enrolledAt: "2026-01-01",
    billingPolicy: "monthly",
    ...overrides,
  };
}

function session(studentId: string, date: string): Session {
  return {
    id: `${studentId}-${date}`,
    studentId,
    date,
    durationHours: 1,
    subjects: [],
    shortNote: "",
    status: "DONE",
    rateSnapshot: 100_000,
    cost: 100_000,
    createdAt: date,
    updatedAt: date,
  };
}

function report(studentId: string, overrides: Partial<MonthlyReport> = {}): MonthlyReport {
  const month = overrides.month ?? "2026-06";
  return {
    id: `r-${studentId}-${month}`,
    studentId,
    month,
    periodStart: `${month}-01`,
    periodEnd: `${month}-30`,
    status: "confirmed",
    billingMode: "monthly",
    templateKey: { themeId: "blue", layoutId: "cards" },
    summaryText: "",
    sessionIds: [],
    totalHours: 0,
    totalCost: 0,
    createdAt: `${month}-30`,
    ...overrides,
  };
}

function payment(studentId: string, month: string, status: Payment["status"] = "UNPAID"): Payment {
  return {
    id: `p-${studentId}-${month}`,
    studentId,
    month,
    totalCost: 100_000,
    status,
    source: "auto",
  };
}

const MONTH = "2026-06";

describe("buildClosingChecklist", () => {
  it("aman (safe) saat tidak ada draft menggantung", () => {
    const result = buildClosingChecklist({
      month: MONTH,
      reports: [report("a")],
      sessions: [session("a", "2026-06-10")],
      payments: [payment("a", "2026-06", "PAID")],
      students: [student("a")],
    });
    expect(result.safe).toBe(true);
    expect(result.draftReports).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it("mendeteksi draft laporan bulan ini", () => {
    const result = buildClosingChecklist({
      month: MONTH,
      reports: [report("a", { status: "draft" })],
      sessions: [session("a", "2026-06-10")],
      payments: [],
      students: [student("a")],
    });
    expect(result.safe).toBe(false);
    expect(result.draftReports).toHaveLength(1);
    expect(result.warnings.join(" ")).toContain("draft");
  });

  it("mendeteksi piutang carry-over dari bulan sebelumnya", () => {
    const result = buildClosingChecklist({
      month: MONTH,
      reports: [report("a")],
      sessions: [session("a", "2026-06-10")],
      payments: [payment("a", "2026-05")],
      students: [student("a")],
    });
    expect(result.carryOverUnpaid).toHaveLength(1);
    expect(result.carryOverTotal).toBe(100_000);
    expect(result.warnings.join(" ")).toContain("bulan sebelumnya");
  });

  it("mengabaikan tagihan lunas pada carry-over", () => {
    const result = buildClosingChecklist({
      month: MONTH,
      reports: [],
      sessions: [],
      payments: [payment("a", "2026-05", "PAID")],
      students: [student("a")],
    });
    expect(result.carryOverUnpaid).toHaveLength(0);
  });

  it("mendeteksi murid non-bulanan dengan sesi di luar tutup bulan", () => {
    const result = buildClosingChecklist({
      month: MONTH,
      reports: [],
      sessions: [session("manual-child", "2026-06-10")],
      payments: [],
      students: [student("manual-child", { billingPolicy: "manual" })],
    });
    expect(result.studentsOutsideClosing).toHaveLength(1);
    expect(result.studentsOutsideClosing[0].id).toBe("manual-child");
  });

  it("tidak menandai murid non-bulanan bila sudah punya laporan confirmed", () => {
    const result = buildClosingChecklist({
      month: MONTH,
      reports: [report("pkg", { billingMode: "session_count" })],
      sessions: [session("pkg", "2026-06-10")],
      payments: [],
      students: [student("pkg", { billingPolicy: "session_count" })],
    });
    expect(result.studentsOutsideClosing).toHaveLength(0);
  });
});
