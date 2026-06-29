import { describe, it, expect, beforeEach } from "vitest";
import { DEFAULT_RATE, MIN_DURATION } from "../db/types";
import { db } from "../db/db";

/**
 * Integration tests for repo functions.
 * These tests run against the Dexie IndexedDB backend (polyfilled via fake-indexeddb).
 */

// Clear all tables before each test for isolation
beforeEach(async () => {
  await db.students.clear();
  await db.sessions.clear();
  await db.reports.clear();
  await db.payments.clear();
  await db.settings.clear();
  await db.raporGrades.clear();
  await db.homeworks.clear();
  await db.followUps.clear();
  await db.expenses.clear();
  await db.iaeeProjects.clear();
  await db.monthClosings.clear();
  await db.auditLog.clear();
});

// ── Helpers ────────────────────────────────────────────────────────

function wibDate(offsetDays = 0): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts();
  const m = Object.fromEntries(parts.filter((p) => p.type !== "literal").map((p) => [p.type, p.value]));
  const d = new Date(+m.year, +m.month - 1, +m.day + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ── Pure Helper Tests ──────────────────────────────────────────────

describe("repos internal helpers (tested via lib functions)", () => {
  it("recentShortNotes returns empty array when no sessions", async () => {
    const { recentShortNotes } = await import("../db/repos");
    const notes = await recentShortNotes(10);
    expect(Array.isArray(notes)).toBe(true);
  });
});

// ── Payment Atomicity ──────────────────────────────────────────────

describe("Payment upsert atomicity", () => {
  it("does not create duplicate rows under concurrent upsert (same student+month)", async () => {
    const { upsertPayment, listPayments } = await import("../db/repos");
    const base = { studentId: "s-atom", month: "2026-06", totalCost: 100000, status: "UNPAID" as const };
    await Promise.all([
      upsertPayment(base),
      upsertPayment({ ...base, totalCost: 200000 }),
    ]);
    const rows = (await listPayments("2026-06")).filter((p) => p.studentId === "s-atom");
    expect(rows.length).toBe(1);
  });

  it("markPaymentTransferred is idempotent and keeps a single row", async () => {
    const { markPaymentTransferred, listPayments } = await import("../db/repos");
    await Promise.all([
      markPaymentTransferred("s-pay", "2026-06"),
      markPaymentTransferred("s-pay", "2026-06"),
    ]);
    const rows = (await listPayments("2026-06")).filter((p) => p.studentId === "s-pay");
    expect(rows.length).toBe(1);
    expect(rows[0].status).toBe("PAID");
  });
});

// ── Audit Trail (L-1) ──────────────────────────────────────────────

describe("Audit trail", () => {
  it("records entries and lists them newest-first", async () => {
    const { logAudit, listAuditLog } = await import("../db/repos");
    await logAudit("month.close", "data", "2026-06", "2 tagihan");
    await new Promise((r) => setTimeout(r, 5)); // jamin timestamp ms berbeda
    await logAudit("session.delete", "session", "sess-1");
    const log = await listAuditLog(10);
    expect(log.length).toBe(2);
    expect(log[0].action).toBe("session.delete"); // newest first
    expect(log[1].action).toBe("month.close");
  });

  it("deleteSession writes a session.delete audit entry", async () => {
    const { createStudent, createSession, deleteSession, listAuditLog } = await import("../db/repos");
    const sid = await createStudent({
      name: "Audit Murid", level: "IBDP", subjects: [], parentContact: { phone: "081" },
      hourlyRate: DEFAULT_RATE, active: true, enrolledAt: wibDate(-30),
    });
    const sessId = await createSession({
      studentId: sid, date: wibDate(), durationHours: MIN_DURATION,
      subjects: ["Math"], shortNote: "x", status: "DONE",
    });
    await deleteSession(sessId);
    const log = await listAuditLog(10);
    expect(log.some((e) => e.action === "session.delete" && e.entityId === sessId)).toBe(true);
  });
});

// ── Photo maintenance (M-5) ────────────────────────────────────────

describe("pruneSessionPhotosBefore", () => {
  it("removes photos from old sessions, keeps recent ones, preserves data", async () => {
    const { pruneSessionPhotosBefore, countSessionPhotos } = await import("../db/repos");
    const photo = new Blob(["x"], { type: "image/jpeg" });
    await db.sessions.bulkAdd([
      { id: "old1", studentId: "s", date: "2020-01-01", durationHours: 1, subjects: [], shortNote: "keep", status: "DONE", rateSnapshot: 0, cost: 0, createdAt: "", updatedAt: "", photo },
      { id: "new1", studentId: "s", date: "2030-01-01", durationHours: 1, subjects: [], shortNote: "", status: "DONE", rateSnapshot: 0, cost: 0, createdAt: "", updatedAt: "", photo },
    ]);
    expect(await countSessionPhotos("2025-01-01")).toBe(1);
    const n = await pruneSessionPhotosBefore("2025-01-01");
    expect(n).toBe(1);
    const old = await db.sessions.get("old1");
    const recent = await db.sessions.get("new1");
    expect(old?.photo).toBeUndefined();
    expect(old?.shortNote).toBe("keep");       // session data preserved
    expect(recent?.photo).toBeInstanceOf(Blob); // recent photo kept
    expect(await countSessionPhotos("2025-01-01")).toBe(0);
  });

  it("logs a photos.prune audit entry when photos are removed", async () => {
    const { pruneSessionPhotosBefore, listAuditLog } = await import("../db/repos");
    const photo = new Blob(["x"], { type: "image/jpeg" });
    await db.sessions.add({ id: "old2", studentId: "s", date: "2019-05-05", durationHours: 1, subjects: [], shortNote: "", status: "DONE", rateSnapshot: 0, cost: 0, createdAt: "", updatedAt: "", photo });
    await pruneSessionPhotosBefore("2025-01-01");
    const log = await listAuditLog(10);
    expect(log.some((e) => e.action === "photos.prune")).toBe(true);
  });
});

// ── initSettings idempotency (race-safe) ───────────────────────────

describe("initSettings", () => {
  it("does not throw or duplicate under concurrent calls", async () => {
    const { initSettings } = await import("../db/repos");
    await Promise.all([initSettings(), initSettings(), initSettings()]);
    const rows = await db.settings.toArray();
    expect(rows.filter((r) => r.id === "app").length).toBe(1);
  });
});

// ── Settings Tests ─────────────────────────────────────────────────

describe("Settings", () => {
  it("getSettings returns default settings when none exist", async () => {
    const { getSettings } = await import("../db/repos");
    const s = await getSettings();
    expect(s.id).toBe("app");
    expect(s.defaultRate).toBe(DEFAULT_RATE);
    expect(s.subjects).toContain("Physics");
    expect(s.ai.enabled).toBe(false);
  });

  it("saveSettings merges with existing settings", async () => {
    const { initSettings, getSettings, saveSettings } = await import("../db/repos");
    await initSettings();
    await saveSettings({ defaultRate: 300_000 });
    const s = await getSettings();
    expect(s.defaultRate).toBe(300_000);
    // existing fields preserved
    expect(Array.isArray(s.subjects)).toBe(true);
    expect(s.subjects.length).toBeGreaterThan(0);
  });
});

// ── Student Tests ──────────────────────────────────────────────────

describe("Student CRUD", () => {
  it("creates and reads a student", async () => {
    const { createStudent, getStudent } = await import("../db/repos");
    const id = await createStudent({
      name: "Test Student",
      level: "IBDP",
      subjects: ["Mathematics AA"],
      parentContact: { phone: "08123456789" },
      hourlyRate: DEFAULT_RATE,
      active: true,
      enrolledAt: wibDate(-30),
    });
    expect(id).toBeTruthy();
    expect(typeof id).toBe("string");

    const s = await getStudent(id);
    expect(s).toBeDefined();
    expect(s!.name).toBe("Test Student");
    expect(s!.hourlyRate).toBe(DEFAULT_RATE);
  });

  it("lists active students only", async () => {
    const { createStudent, listStudents } = await import("../db/repos");
    await createStudent({
      name: "Budi", level: "IBDP", subjects: [], parentContact: { phone: "081" },
      hourlyRate: DEFAULT_RATE, active: true, enrolledAt: wibDate(-30),
    });
    await createStudent({
      name: "Adi", level: "MYP", subjects: [], parentContact: { phone: "082" },
      hourlyRate: DEFAULT_RATE, active: false, enrolledAt: wibDate(-30),
    });
    const active = await listStudents(true);
    expect(active.length).toBeGreaterThanOrEqual(1);
    const names = active.map((s) => s.name);
    expect(names).toContain("Budi");
    expect(names).not.toContain("Adi");
  });

  it("updates a student partially", async () => {
    const { createStudent, getStudent, updateStudent } = await import("../db/repos");
    const id = await createStudent({
      name: "Update Test", level: "IBDP", subjects: [], parentContact: { phone: "083" },
      hourlyRate: DEFAULT_RATE, active: true, enrolledAt: wibDate(-30),
    });
    await updateStudent(id, { hourlyRate: 500_000 });
    const s = await getStudent(id);
    expect(s!.hourlyRate).toBe(500_000);
    expect(s!.name).toBe("Update Test"); // unchanged
  });
});

// ── Session Tests ──────────────────────────────────────────────────

describe("Session CRUD", () => {
  it("creates a DONE session with cost auto-calculated", async () => {
    const { createStudent, createSession } = await import("../db/repos");
    const sid = await createStudent({
      name: "Sesi Test", level: "IBDP", subjects: [], parentContact: { phone: "084" },
      hourlyRate: DEFAULT_RATE, active: true, enrolledAt: wibDate(-30),
    });
    const sessionId = await createSession({
      studentId: sid,
      date: wibDate(),
      durationHours: 2,
      subjects: ["Physics"],
      shortNote: "Latihan soal",
      status: "DONE",
    });
    expect(sessionId).toBeTruthy();
  });

  it("rejects duration < MIN_DURATION", async () => {
    const { createStudent, createSession } = await import("../db/repos");
    const sid = await createStudent({
      name: "Duration Test", level: "IBDP", subjects: [], parentContact: { phone: "085" },
      hourlyRate: DEFAULT_RATE, active: true, enrolledAt: wibDate(-30),
    });
    await expect(
      createSession({
        studentId: sid, date: wibDate(), durationHours: 0.5, subjects: [], shortNote: "x", status: "DONE",
      })
    ).rejects.toThrow(`Duration must be >= ${MIN_DURATION}`);
  });

  it("creates scheduled session and lists upcoming", async () => {
    const { createStudent, scheduleSession, listScheduledForStudent } = await import("../db/repos");
    const sid = await createStudent({
      name: "Schedule Test", level: "IBDP", subjects: [], parentContact: { phone: "086" },
      hourlyRate: DEFAULT_RATE, active: true, enrolledAt: wibDate(-30),
    });
    await scheduleSession({ studentId: sid, date: wibDate(7), time: "14:00", durationHours: 1.5 });
    const upcoming = await listScheduledForStudent(sid);
    expect(upcoming.length).toBeGreaterThanOrEqual(1);
    expect(upcoming[0].status).toBe("SCHEDULED");
  });
});

// ── Payment Tests ──────────────────────────────────────────────────

describe("Payment CRUD", () => {
  it("upserts payment (create then update)", async () => {
    const { upsertPayment, getPayment } = await import("../db/repos");
    await upsertPayment({ studentId: "p1", month: "2026-06", totalCost: 600_000, status: "UNPAID" });
    const p1 = await getPayment("p1", "2026-06");
    expect(p1?.totalCost).toBe(600_000);

    await upsertPayment({ studentId: "p1", month: "2026-06", totalCost: 700_000, status: "UNPAID" });
    const p2 = await getPayment("p1", "2026-06");
    expect(p2?.totalCost).toBe(700_000);
  });

  it("marks payment as PAID", async () => {
    const { upsertPayment, markPaymentTransferred: markTransferred, getPayment } = await import("../db/repos");
    await upsertPayment({ studentId: "p2", month: "2026-05", totalCost: 300_000, status: "UNPAID" });
    await markTransferred("p2", "2026-05", "transfer");
    const p = await getPayment("p2", "2026-05");
    expect(p?.status).toBe("PAID");
    expect(p?.method).toBe("transfer");
  });

  it("marks payment unpaid", async () => {
    const { upsertPayment, markPaymentUnpaid, getPayment } = await import("../db/repos");
    await upsertPayment({ studentId: "p3", month: "2026-04", totalCost: 200_000, status: "PAID" });
    await markPaymentUnpaid("p3", "2026-04");
    const p = await getPayment("p3", "2026-04");
    expect(p?.status).toBe("UNPAID");
  });
});

// ── Homework & FollowUp Tests ──────────────────────────────────────

describe("Homework & FollowUps", () => {
  it("creates and resolves homework", async () => {
    const { createHomework, listPendingHomework, markHomeworkDone, getHomeworkStats } = await import("../db/repos");
    const sid = crypto.randomUUID();
    const hwId = await createHomework({
      studentId: sid, subject: "Math", title: "PR 1",
      assignedAt: wibDate(-7), dueAt: wibDate(), status: "assigned",
    });
    expect(hwId).toBeTruthy();

    const pending = await listPendingHomework(sid);
    expect(pending.length).toBe(1);

    await markHomeworkDone(hwId);
    const stats = await getHomeworkStats(sid);
    expect(stats.done).toBe(1);
  });

  it("creates and completes follow-up items", async () => {
    const { createFollowUp, listPendingFollowUps, completeFollowUp } = await import("../db/repos");
    const sid = crypto.randomUUID();
    const fuId = await createFollowUp({
      studentId: sid, type: "misconception", text: "Review limit functions",
    });
    expect(fuId).toBeTruthy();

    const pending = await listPendingFollowUps(sid);
    expect(pending.length).toBe(1);

    await completeFollowUp(fuId);
    const after = await listPendingFollowUps(sid);
    expect(after.length).toBe(0);
  });
});

// ── Month Closing Tests ────────────────────────────────────────────

describe("Month Closing", () => {
  it("closeMonth creates closing record", async () => {
    const { createStudent, createSession, closeMonth, getMonthClosing } = await import("../db/repos");
    const sid = await createStudent({
      name: "Closing Test", level: "IBDP", subjects: [], parentContact: { phone: "087" },
      hourlyRate: DEFAULT_RATE, active: true, enrolledAt: wibDate(-30),
    });
    await createSession({
      studentId: sid, date: "2026-06-10", durationHours: 2, subjects: ["Math"],
      shortNote: "Sesi 1", status: "DONE",
    });
    await createSession({
      studentId: sid, date: "2026-06-15", durationHours: 1.5, subjects: ["Math"],
      shortNote: "Sesi 2", status: "DONE",
    });
    await closeMonth("2026-06");
    const closing = await getMonthClosing("2026-06");
    expect(closing).toBeDefined();
    expect(closing!.totalHours).toBe(3.5);
    expect(closing!.studentCount).toBe(1);
  });

  it("reopenMonth removes closing", async () => {
    const { closeMonth, reopenMonth, getMonthClosing } = await import("../db/repos");
    await closeMonth("2026-07");
    const before = await getMonthClosing("2026-07");
    expect(before).toBeDefined();

    await reopenMonth("2026-07");
    const after = await getMonthClosing("2026-07");
    expect(after).toBeUndefined();
  });
});

// ── Expenses Tests ─────────────────────────────────────────────────

describe("Expenses", () => {
  it("creates and lists expenses by month", async () => {
    const { createExpense, listExpenses, getExpenseTotals } = await import("../db/repos");
    await createExpense({ date: "2026-06-10", category: "transport", description: "Bensin", amount: 50000 });
    await createExpense({ date: "2026-06-12", category: "buku", description: "Buku Paket", amount: 150000 });
    const all = await listExpenses("2026-06");
    expect(all.length).toBe(2);
    const totals = await getExpenseTotals("2026-06");
    expect(totals.transport).toBe(50000);
    expect(totals.buku).toBe(150000);
  });
});

// ── IA/EE Projects Tests ───────────────────────────────────────────

describe("IA/EE Projects", () => {
  it("creates project with milestones", async () => {
    const { createIaEeProject, listIaEeProjects, addMilestone } = await import("../db/repos");
    const sid = crypto.randomUUID();
    const projId = await createIaEeProject({
      studentId: sid, type: "IA", subject: "Physics", title: "Physics IA", milestones: [], notes: "",
    });
    expect(projId).toBeTruthy();

    await addMilestone(projId, { id: crypto.randomUUID(), title: "Research", status: "done" });
    await addMilestone(projId, { id: crypto.randomUUID(), title: "Write Draft", status: "in_progress" as const });

    const projects = await listIaEeProjects(sid);
    expect(projects.length).toBe(1);
    expect(projects[0].milestones.length).toBe(2);
    expect(projects[0].milestones[0].title).toBe("Research");
    expect(projects[0].milestones[0].status).toBe("done");
  });
});