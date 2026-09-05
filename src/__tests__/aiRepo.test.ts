import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../db/db";
import { applyAiNarrativeBatch } from "../db/repos";
import type { MonthlyReport, Session, Student } from "../db/types";

const student: Student = {
  id: "ai-student", name: "Alya", level: "MYP", subjects: ["Math"],
  parentContact: { phone: "0800" }, hourlyRate: 100_000, active: true, enrolledAt: "2026-01-01",
};
const session = (id: string): Session => ({
  id, studentId: student.id, date: "2026-09-05", durationHours: 1,
  subjects: ["Math"], shortNote: "Catatan lama", status: "DONE",
  rateSnapshot: 100_000, cost: 100_000, createdAt: "2026-09-05T00:00:00.000Z", updatedAt: "2026-09-05T00:00:00.000Z",
});
const report: MonthlyReport = {
  id: "ai-report", studentId: student.id, month: "2026-09", periodStart: "2026-09-01", periodEnd: "2026-09-30",
  sessionIds: ["session-a", "session-b"], templateKey: { themeId: "blue", layoutId: "cards" },
  summaryText: "Ringkasan lama", totalHours: 2, totalCost: 200_000, createdAt: "2026-09-05T00:00:00.000Z",
};

beforeEach(async () => {
  await db.students.clear(); await db.sessions.clear(); await db.reports.clear();
  await db.students.add(student); await db.sessions.bulkAdd([session("session-a"), session("session-b")]); await db.reports.add(report);
});

describe("atomic AI batch writes", () => {
  it("rolls back all narratives and report changes when a session write fails", async () => {
    const originalUpdate = db.sessions.update.bind(db.sessions);
    let writes = 0;
    const spy = vi.spyOn(db.sessions, "update").mockImplementation((...args) => {
      writes++;
      if (writes === 2) return Promise.reject(new Error("simulated write failure")) as never;
      return originalUpdate(...args);
    });

    await expect(applyAiNarrativeBatch(report, [
      { id: "session-a", narrative: "Baru A", aiNarrativeHash: 1 },
      { id: "session-b", narrative: "Baru B", aiNarrativeHash: 2 },
    ], { summaryText: "Ringkasan baru" })).rejects.toThrow("simulated write failure");
    spy.mockRestore();

    expect((await db.sessions.get("session-a"))?.narrative).toBeUndefined();
    expect((await db.sessions.get("session-b"))?.narrative).toBeUndefined();
    expect((await db.reports.get(report.id))?.summaryText).toBe("Ringkasan lama");
  });
});
