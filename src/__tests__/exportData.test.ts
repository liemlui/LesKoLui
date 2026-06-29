import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../db/db";
import { buildDataCsv } from "../lib/exportData";
import { createStudent, createSession } from "../db/repos";
import { DEFAULT_RATE } from "../db/types";

beforeEach(async () => {
  await db.students.clear();
  await db.sessions.clear();
  await db.payments.clear();
  await db.expenses.clear();
});

describe("buildDataCsv", () => {
  it("produces section headers and includes seeded data", async () => {
    const sid = await createStudent({
      name: "Budi, Jr.", level: "IBDP", subjects: ["Math"],
      parentContact: { phone: "08123" }, hourlyRate: DEFAULT_RATE,
      active: true, enrolledAt: "2026-01-01",
    });
    await createSession({
      studentId: sid, date: "2026-06-10", durationHours: 2,
      subjects: ["Math"], shortNote: "Latihan", status: "DONE",
    });

    const csv = await buildDataCsv();
    expect(csv).toContain("### MURID");
    expect(csv).toContain("### SESI");
    expect(csv).toContain("### TAGIHAN");
    expect(csv).toContain("Budi, Jr.");      // name with comma kept safe in quotes
    expect(csv).toContain("2026-06-10");
  });

  it("neutralises a formula-injection student name", async () => {
    await createStudent({
      name: "=cmd()", level: "IBDP", subjects: [],
      parentContact: { phone: "0" }, hourlyRate: DEFAULT_RATE,
      active: true, enrolledAt: "2026-01-01",
    });
    const csv = await buildDataCsv();
    expect(csv).toContain(`"'=cmd()"`); // leading quote-prefixed, not executable
  });
});
