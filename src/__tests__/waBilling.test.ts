import { describe, it, expect } from "vitest";
import { buildBillingMessage, toWaNumber } from "../lib/waBilling";
import type { Session } from "../db/types";

function sess(p: Partial<Session> & { date: string; status: Session["status"] }): Session {
  return {
    id: crypto.randomUUID(),
    studentId: "s1",
    subjects: [],
    shortNote: "",
    durationHours: 1,
    cost: 0,
    rateSnapshot: 150000,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...p,
  } as unknown as Session;
}

describe("toWaNumber", () => {
  it("converts a local 0-prefixed number to 62", () => {
    expect(toWaNumber("08123456789")).toBe("628123456789");
  });

  it("strips +, spaces and dashes", () => {
    expect(toWaNumber("+62 812-3456-7890")).toBe("6281234567890");
    expect(toWaNumber("0812 3456 789")).toBe("628123456789");
  });

  it("leaves an already-normalised number intact", () => {
    expect(toWaNumber("62812345678")).toBe("62812345678");
  });
});

describe("buildBillingMessage", () => {
  const student = { name: "Budi", hourlyRate: 150000 };
  const sessions: Session[] = [
    sess({ date: "2026-06-05", status: "DONE", durationHours: 2, cost: 300000, subjects: ["Physics"] }),
    sess({ date: "2026-06-12", status: "DONE", durationHours: 1.5, cost: 225000, subjects: [] }),
    sess({ date: "2026-06-20", status: "CANCELLED", durationHours: 2, cost: 300000, subjects: ["Math"] }),
    sess({ date: "2026-05-30", status: "DONE", durationHours: 2, cost: 300000, subjects: ["Math"] }),
  ];

  it("counts only DONE sessions within the billing month", () => {
    const r = buildBillingMessage({ student, sessions, month: "2026-06" });
    expect(r.count).toBe(2);
    expect(r.totalHours).toBe(3.5);
    expect(r.totalCost).toBe(525000);
  });

  it("includes student name, month label and a fallback subject label", () => {
    const r = buildBillingMessage({ student, sessions, month: "2026-06" });
    expect(r.text).toContain("Budi");
    expect(r.text).toContain("Juni 2026");
    expect(r.text).toContain("Sesi umum"); // empty-subjects session
    expect(r.text).toContain("Rp 525.000");
  });

  it("respects an explicit amountOverride", () => {
    const r = buildBillingMessage({ student, sessions, month: "2026-06", amountOverride: 500000 });
    expect(r.totalCost).toBe(500000);
    expect(r.text).toContain("Rp 500.000");
  });

  it("renders bank transfer lines when accounts are configured", () => {
    const r = buildBillingMessage({
      student,
      sessions,
      month: "2026-06",
      settings: { bankAccounts: { bca: "1234567", accountName: "Ko Lui" }, tutorProfile: { name: "Ko Lui", phone: "" } },
    });
    expect(r.text).toContain("BCA 1234567 a.n. Ko Lui");
  });

  it("returns an empty bill for a month with no DONE sessions", () => {
    const r = buildBillingMessage({ student, sessions, month: "2026-01" });
    expect(r.count).toBe(0);
    expect(r.totalHours).toBe(0);
    expect(r.totalCost).toBe(0);
  });
});
