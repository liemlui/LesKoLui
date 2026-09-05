import { describe, it, expect, beforeEach, vi } from "vitest";
import { DEFAULT_RATE, MIN_DURATION } from "../db/types";
import { db } from "../db/db";
import { defaultInvoiceDueAt } from "../lib/finance";
import { dateInWIB } from "../lib/format";

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
  await db.followUps.clear();
  await db.expenses.clear();
  await db.iaeeProjects.clear();
  await db.auditLog.clear();
  await db.studyNotes.clear();
});

// ΓöÇΓöÇ Helpers ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function wibDate(offsetDays = 0): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts();
  const m = Object.fromEntries(parts.filter((p) => p.type !== "literal").map((p) => [p.type, p.value]));
  const d = new Date(+m.year, +m.month - 1, +m.day + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ΓöÇΓöÇ Pure Helper Tests ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

describe("repos internal helpers (tested via lib functions)", () => {
  it("recentShortNotes returns empty array when no sessions", async () => {
    const { recentShortNotes } = await import("../db/repos");
    const notes = await recentShortNotes(10);
    expect(Array.isArray(notes)).toBe(true);
  });
});

// ΓöÇΓöÇ Payment Atomicity ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

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
    const { upsertPayment, markPaymentTransferred, listPayments } = await import("../db/repos");
    await upsertPayment({ studentId: "s-pay", month: "2026-06", totalCost: 250000, status: "UNPAID" });
    await Promise.all([
      markPaymentTransferred("s-pay", "2026-06"),
      markPaymentTransferred("s-pay", "2026-06"),
    ]);
    const rows = (await listPayments("2026-06")).filter((p) => p.studentId === "s-pay");
    expect(rows.length).toBe(1);
    expect(rows[0].status).toBe("PAID");
  });

  it("does not create a zero-value paid row when the invoice is missing", async () => {
    const { markPaymentTransferred, listPayments } = await import("../db/repos");
    await expect(markPaymentTransferred("missing", "2026-06")).rejects.toThrow("Payment not found");
    expect(await listPayments("2026-06")).toEqual([]);
  });

  it("creates one manual invoice beside a report invoice without overwriting it", async () => {
    const { syncReportPayment, createManualPayment, listPayments } = await import("../db/repos");
    const reportId = crypto.randomUUID();
    await syncReportPayment({
      id: reportId,
      studentId: "manual-beside-report",
      month: "2026-06",
      periodStart: "2026-06-10",
      periodEnd: "2026-06-12",
      totalCost: 300_000,
    });

    const manualId = await createManualPayment({
      studentId: "manual-beside-report",
      month: "2026-06",
      totalCost: 125_000,
      status: "UNPAID",
    });
    const rows = (await listPayments("2026-06")).filter((payment) => payment.studentId === "manual-beside-report");
    expect(rows).toHaveLength(2);
    expect(rows.find((payment) => payment.reportId === reportId)).toMatchObject({ totalCost: 300_000, source: "auto" });
    const manual = rows.find((payment) => payment.id === manualId);
    expect(manual).toMatchObject({ totalCost: 125_000, source: "manual" });
    expect(manual?.reportId).toBeUndefined();
    await expect(createManualPayment({
      studentId: "manual-beside-report",
      month: "2026-06",
      totalCost: 99_000,
      status: "UNPAID",
    })).rejects.toThrow("Manual payment already exists");
  });

  it("atomically rejects concurrent duplicate manual invoices", async () => {
    const { createManualPayment, listPayments } = await import("../db/repos");
    const input = {
      studentId: "manual-race",
      month: "2026-06",
      totalCost: 175_000,
      status: "UNPAID" as const,
    };
    const results = await Promise.allSettled([
      createManualPayment(input),
      createManualPayment(input),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    const rows = (await listPayments("2026-06")).filter((payment) => payment.studentId === "manual-race");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ source: "manual", totalCost: 175_000 });
  });

  it("upsertPayment targets only the unlinked row when a report invoice shares the month", async () => {
    const { syncReportPayment, upsertPayment, updatePaymentAmount, listPayments } = await import("../db/repos");
    const reportId = crypto.randomUUID();
    await syncReportPayment({
      id: reportId,
      studentId: "safe-upsert",
      month: "2026-06",
      periodStart: "2026-06-10",
      periodEnd: "2026-06-12",
      totalCost: 300_000,
    });
    await upsertPayment({ studentId: "safe-upsert", month: "2026-06", totalCost: 125_000, status: "UNPAID" });
    await upsertPayment({ studentId: "safe-upsert", month: "2026-06", totalCost: 150_000, status: "UNPAID" });
    await updatePaymentAmount("safe-upsert", "2026-06", 160_000);

    const rows = (await listPayments("2026-06")).filter((payment) => payment.studentId === "safe-upsert");
    expect(rows).toHaveLength(2);
    expect(rows.find((payment) => payment.reportId === reportId)).toMatchObject({ totalCost: 300_000, source: "auto" });
    expect(rows.find((payment) => !payment.reportId)).toMatchObject({ totalCost: 160_000, source: "manual" });
  });
});

// ΓöÇΓöÇ Audit Trail (L-1) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

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

// ΓöÇΓöÇ Photo maintenance (M-5) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

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

// ΓöÇΓöÇ initSettings idempotency (race-safe) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

describe("initSettings", () => {
  it("does not throw or duplicate under concurrent calls", async () => {
    const { initSettings } = await import("../db/repos");
    await Promise.all([initSettings(), initSettings(), initSettings()]);
    const rows = await db.settings.toArray();
    expect(rows.filter((r) => r.id === "app").length).toBe(1);
  });
});

// ΓöÇΓöÇ Settings Tests ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

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

// ΓöÇΓöÇ Student Tests ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

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

// ΓöÇΓöÇ Session Tests ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

describe("Session CRUD", () => {
  it("orders same-day range sessions deterministically by time then id", async () => {
    const { listSessionsByStudentRange } = await import("../db/repos");
    const base = {
      studentId: "same-day-order",
      date: "2026-06-12",
      durationHours: 1,
      subjects: ["Math"],
      shortNote: "",
      status: "DONE" as const,
      rateSnapshot: DEFAULT_RATE,
      cost: DEFAULT_RATE,
      createdAt: "2026-06-12T00:00:00.000Z",
      updatedAt: "2026-06-12T00:00:00.000Z",
    };
    await db.sessions.bulkAdd([
      { ...base, id: "session-z", time: "17:00" },
      { ...base, id: "session-b", time: "09:00" },
      { ...base, id: "session-a", time: "09:00" },
    ]);

    const rows = await listSessionsByStudentRange("same-day-order", "2026-06-01", "2026-06-30");
    expect(rows.map((session) => session.id)).toEqual(["session-a", "session-b", "session-z"]);
  });
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

  it("preserves the original record and creates a replacement when rescheduling", async () => {
    const { createStudent, scheduleSession, rescheduleSession, listAllUpcomingScheduled } = await import("../db/repos");
    const sid = await createStudent({
      name: "Reschedule Test", level: "IBDP", subjects: [], parentContact: { phone: "087" },
      hourlyRate: DEFAULT_RATE, active: true, enrolledAt: wibDate(-30),
    });
    const originalId = await scheduleSession({ studentId: sid, date: wibDate(), time: "14:00", durationHours: 1.5 });
    const replacementId = await rescheduleSession(originalId, {
      date: wibDate(2), time: "16:00", durationHours: 2, reason: "Murid ada kegiatan sekolah",
    });

    const original = await db.sessions.get(originalId);
    const replacement = await db.sessions.get(replacementId);
    expect(original?.status).toBe("RESCHEDULED");
    expect(original?.rescheduledToId).toBe(replacementId);
    expect(original?.statusReason).toBe("Murid ada kegiatan sekolah");
    expect(replacement).toMatchObject({
      status: "SCHEDULED", rescheduledFromId: originalId, date: wibDate(2), time: "16:00", durationHours: 2,
    });
    expect(replacement?.cost).toBe(2 * DEFAULT_RATE);
    expect((await listAllUpcomingScheduled(wibDate())).map((s) => s.id)).toContain(replacementId);
  });

  it("only includes an explicitly billable no-show in monthly revenue", async () => {
    const { createStudent, scheduleSession, markSessionNoShow, listBillableSessionsForMonth } = await import("../db/repos");
    const sid = await createStudent({
      name: "No Show Test", level: "IBDP", subjects: [], parentContact: { phone: "088" },
      hourlyRate: DEFAULT_RATE, active: true, enrolledAt: wibDate(-30),
    });
    const chargeable = await scheduleSession({ studentId: sid, date: "2026-06-10", time: "14:00", durationHours: 1.5 });
    const waived = await scheduleSession({ studentId: sid, date: "2026-06-12", time: "14:00", durationHours: 1 });
    await markSessionNoShow(chargeable, { billable: true, reason: "Tidak ada kabar" });
    await markSessionNoShow(waived, { billable: false });

    const billable = await listBillableSessionsForMonth("2026-06");
    expect(billable.map((s) => s.id)).toEqual([chargeable]);
    expect(billable[0]).toMatchObject({ status: "NO_SHOW", noShowBillable: true, statusReason: "Tidak ada kabar" });
  });
});

// ΓöÇΓöÇ Payment Tests ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

describe("Payment CRUD", () => {
  it("menyimpan jatuh tempo eksplisit dan tidak mengubahnya saat invoice diperbarui", async () => {
    const { upsertPayment, getPayment } = await import("../db/repos");
    await upsertPayment({
      studentId: "deadline-terjaga", month: "2026-06", totalCost: 600_000,
      status: "UNPAID", dueAt: "2026-07-07", createdAt: "2026-06-30T08:00:00.000Z",
    });
    await upsertPayment({
      studentId: "deadline-terjaga", month: "2026-06", totalCost: 650_000,
      status: "UNPAID",
    });

    const payment = await getPayment("deadline-terjaga", "2026-06");
    expect(payment).toMatchObject({ totalCost: 650_000, dueAt: "2026-07-07" });
  });

  it("memberi invoice laporan baru jatuh tempo tujuh hari setelah diterbitkan", async () => {
    const { syncReportPayment, getPaymentByReport } = await import("../db/repos");
    const reportId = crypto.randomUUID();
    await syncReportPayment({
      id: reportId,
      studentId: "deadline-laporan",
      month: "2026-06",
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30",
      totalCost: 600_000,
    });

    const payment = await getPaymentByReport(reportId);
    expect(payment?.createdAt).toBeTruthy();
    expect(payment?.dueAt).toBe(defaultInvoiceDueAt(dateInWIB(payment!.createdAt!)!));
  });

  it("menghitung jatuh tempo invoice historis menurut tanggal bisnis WIB", async () => {
    const { upsertPayment, getPayment } = await import("../db/repos");
    await upsertPayment({
      studentId: "deadline-wib", month: "2026-09", totalCost: 600_000,
      status: "UNPAID", createdAt: "2026-08-31T21:30:00.000Z",
    });

    await expect(getPayment("deadline-wib", "2026-09"))
      .resolves.toMatchObject({ dueAt: "2026-09-08" });
  });

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

describe("Financial summaries", () => {
  it("books cash in the payment month, not the invoice month", async () => {
    const { upsertPayment, createExpense, getCashSummary, getMonthlyIncomeVsExpense } = await import("../db/repos");
    await upsertPayment({
      studentId: "late-payment", month: "2026-04", totalCost: 300_000,
      status: "PAID", paidAt: "2026-06-05", method: "transfer",
    });
    await upsertPayment({
      studentId: "june-payment", month: "2026-06", totalCost: 200_000,
      status: "PAID", paidAt: "2026-06-20", method: "cash",
    });
    await upsertPayment({ studentId: "june-unpaid", month: "2026-06", totalCost: 150_000, status: "UNPAID" });
    await createExpense({ date: "2026-06-10", category: "transport", description: "Bensin", amount: 50_000 });

    const summary = await getCashSummary(["2026-04", "2026-05", "2026-06"]);
    expect(summary[0].realisasi).toBe(0);
    // Invoice manual tanpa data sesi ΓåÆ pendapatan mengikuti bulan anchor invoice (April).
    expect(summary[0].pendapatan).toBe(300_000);
    expect(summary[2]).toMatchObject({ realisasi: 500_000, piutang: 150_000, pengeluaran: 50_000, laba: 300_000, pendapatan: 350_000 });

    const trend = await getMonthlyIncomeVsExpense(["2026-04", "2026-05", "2026-06"]);
    expect(trend.map((row) => row.income)).toEqual([0, 0, 500_000]);
    expect(trend[2]).toMatchObject({ expense: 50_000, net: 450_000 });
  });

  it("handles an empty month range", async () => {
    const { getCashSummary, getMonthlyIncomeVsExpense } = await import("../db/repos");
    expect(await getCashSummary([])).toEqual([]);
    expect(await getMonthlyIncomeVsExpense([])).toEqual([]);
  });

  it("allocates range-report income to the session months (accrual basis)", async () => {
    const {
      createStudent, createSession, upsertReport, syncReportPayment,
      getCashSummary, markPaymentTransferredById, getPaymentByReport,
    } = await import("../db/repos");
    const sid = await createStudent({
      name: "Rentang Juli-Ags", level: "IBDP", subjects: [],
      parentContact: { phone: "088" }, hourlyRate: DEFAULT_RATE, active: true, enrolledAt: wibDate(-60),
    });
    const julySid = await createSession({ studentId: sid, date: "2026-07-28", durationHours: 1, subjects: ["Math"], shortNote: "", status: "DONE" });
    const augustSid = await createSession({ studentId: sid, date: "2026-08-05", durationHours: 1, subjects: ["Math"], shortNote: "", status: "DONE" });
    const reportId = crypto.randomUUID();
    await upsertReport({
      id: reportId, studentId: sid, month: "2026-08", periodStart: "2026-07-28", periodEnd: "2026-08-05",
      sessionIds: [julySid, augustSid], templateKey: { themeId: "blue", layoutId: "cards" },
      summaryText: "", totalHours: 2, totalCost: 2 * DEFAULT_RATE,
      status: "confirmed", billingMode: "range",
    });
    await syncReportPayment({
      id: reportId, studentId: sid, month: "2026-08", periodStart: "2026-07-28", periodEnd: "2026-08-05",
      totalCost: 2 * DEFAULT_RATE, billingMode: "range",
    });

    const before = await getCashSummary(["2026-07", "2026-08"]);
    // Belum bayar ΓåÆ piutang mengikuti bulan sesi, bukan bulan anchor invoice (Agustus).
    expect(before[0]).toMatchObject({ sesi: 1, jam: 1, pendapatan: DEFAULT_RATE, piutang: DEFAULT_RATE, realisasi: 0, laba: DEFAULT_RATE });
    expect(before[1]).toMatchObject({ sesi: 1, jam: 1, pendapatan: DEFAULT_RATE, piutang: DEFAULT_RATE, realisasi: 0, laba: DEFAULT_RATE });

    const payment = await getPaymentByReport(reportId);
    expect(payment?.month).toBe("2026-08"); // anchor invoice tetap bulan akhir periode
    await markPaymentTransferredById(payment!.id, "transfer", "2026-08-20");

    const after = await getCashSummary(["2026-07", "2026-08"]);
    // Lunas di Agustus ΓåÆ kas penuh tercatat Agustus; pendapatan akrual tetap per-bulan sesi.
    expect(after[0]).toMatchObject({ pendapatan: DEFAULT_RATE, piutang: 0, realisasi: 0 });
    expect(after[1]).toMatchObject({ pendapatan: DEFAULT_RATE, piutang: 0, realisasi: 2 * DEFAULT_RATE });
  });
});

// ΓöÇΓöÇ FollowUp Tests ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

describe("FollowUps", () => {
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

  it("saves a close-out batch atomically and retries with stable IDs", async () => {
    const { createStudent, createSession, createFollowUpBatch, listPendingFollowUps } = await import("../db/repos");
    const sid = await createStudent({
      name: "Batch Murid", level: "IBDP", subjects: [], parentContact: { phone: "081" },
      hourlyRate: DEFAULT_RATE, active: true, enrolledAt: wibDate(-30),
    });
    const sessionId = await createSession({
      studentId: sid, date: wibDate(), durationHours: MIN_DURATION,
      subjects: ["Math"], shortNote: "x", status: "DONE",
    });
    const items = [
      { id: "fu-1", text: "Review limits" },
      { id: "fu-2", text: "Practice graphs" },
    ];

    await createFollowUpBatch(sid, sessionId, items);
    await createFollowUpBatch(sid, sessionId, items);

    const pending = await listPendingFollowUps(sid);
    expect(pending.map((item) => item.id).sort()).toEqual(["fu-1", "fu-2"]);
  });

  it("rolls back the whole batch when the database write fails", async () => {
    const { createStudent, createSession, createFollowUpBatch, listPendingFollowUps } = await import("../db/repos");
    const sid = await createStudent({
      name: "Rollback Murid", level: "IBDP", subjects: [], parentContact: { phone: "081" },
      hourlyRate: DEFAULT_RATE, active: true, enrolledAt: wibDate(-30),
    });
    const sessionId = await createSession({
      studentId: sid, date: wibDate(), durationHours: MIN_DURATION,
      subjects: ["Math"], shortNote: "x", status: "DONE",
    });
    const bulkAdd = vi.spyOn(db.followUps, "bulkAdd").mockRejectedValueOnce(new Error("simulated write failure"));

    await expect(createFollowUpBatch(sid, sessionId, [
      { id: "rollback-1", text: "First" },
      { id: "rollback-2", text: "Second" },
    ])).rejects.toThrow("simulated write failure");
    bulkAdd.mockRestore();

    expect(await listPendingFollowUps(sid)).toHaveLength(0);
  });

  it("rejects an ID conflict without overwriting the existing item", async () => {
    const { createStudent, createSession, createFollowUpBatch, listPendingFollowUps } = await import("../db/repos");
    const sid = await createStudent({
      name: "Conflict Murid", level: "IBDP", subjects: [], parentContact: { phone: "081" },
      hourlyRate: DEFAULT_RATE, active: true, enrolledAt: wibDate(-30),
    });
    const sessionId = await createSession({
      studentId: sid, date: wibDate(), durationHours: MIN_DURATION,
      subjects: ["Math"], shortNote: "x", status: "DONE",
    });
    await createFollowUpBatch(sid, sessionId, [{ id: "conflict-1", text: "Original" }]);

    await expect(createFollowUpBatch(sid, sessionId, [{ id: "conflict-1", text: "Changed" }]))
      .rejects.toThrow("Konflik ID tindak lanjut");
    expect((await listPendingFollowUps(sid))[0]?.text).toBe("Original");
  });
});

// ΓöÇΓöÇ Month Closing Tests ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ


// ΓöÇΓöÇ Report Payments (tagihan per laporan periode) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

describe("Report payments", () => {
  async function seedReport(overrides: Partial<import("../db/types").MonthlyReport> = {}) {
    const { upsertReport } = await import("../db/repos");
    const id = crypto.randomUUID();
    await upsertReport({
      id, studentId: "stu-pay", month: "2026-02", periodStart: "2026-01-20", periodEnd: "2026-02-03",
      sessionIds: [], templateKey: { themeId: "blue", layoutId: "cards" },
      summaryText: "", totalHours: 3, totalCost: 600_000, ...overrides,
    });
    return id;
  }

  it("syncReportPayment creates UNPAID auto payment anchored to period end month", async () => {
    const { syncReportPayment, getPaymentByReport, getPayment } = await import("../db/repos");
    const id = await seedReport();
    await syncReportPayment({ id, studentId: "stu-pay", month: "2026-02", periodStart: "2026-01-20", periodEnd: "2026-02-03", totalCost: 600_000 });

    const p = await getPaymentByReport(id);
    expect(p).toMatchObject({
      studentId: "stu-pay", month: "2026-02", totalCost: 600_000,
      status: "UNPAID", source: "auto", periodStart: "2026-01-20", periodEnd: "2026-02-03",
    });
    // Tagihan bulanan lama (getPayment by month) juga menemukannya.
    expect((await getPayment("stu-pay", "2026-02"))?.reportId).toBe(id);
  });

  it("does not create a payment when the report total is zero", async () => {
    const { syncReportPayment, listPayments } = await import("../db/repos");
    await syncReportPayment({ id: crypto.randomUUID(), studentId: "stu-pay", month: "2026-02", periodStart: "2026-01-20", periodEnd: "2026-02-03", totalCost: 0 });
    expect(await listPayments()).toHaveLength(0);
  });

  it("resync updates amount while UNPAID, but never after PAID or manual edit", async () => {
    const { syncReportPayment, getPaymentByReport, markPaymentTransferredById, updatePaymentAmountById } = await import("../db/repos");
    const id = await seedReport();
    await syncReportPayment({ id, studentId: "stu-pay", month: "2026-02", periodStart: "2026-01-20", periodEnd: "2026-02-03", totalCost: 600_000 });
    // Belum lunas ΓåÆ nominal mengikuti laporan.
    await syncReportPayment({ id, studentId: "stu-pay", month: "2026-02", periodStart: "2026-01-20", periodEnd: "2026-02-05", totalCost: 750_000 });
    expect((await getPaymentByReport(id))?.totalCost).toBe(750_000);
    expect((await getPaymentByReport(id))?.periodEnd).toBe("2026-02-05");

    // Lunas ΓåÆ nominal tidak berubah walau laporan berubah.
    await markPaymentTransferredById((await getPaymentByReport(id))!.id);
    await syncReportPayment({ id, studentId: "stu-pay", month: "2026-02", periodStart: "2026-01-20", periodEnd: "2026-02-05", totalCost: 800_000 });
    expect((await getPaymentByReport(id))?.totalCost).toBe(750_000);

    // Manual ΓåÆ nominal tidak berubah.
    const id2 = await seedReport({ id: crypto.randomUUID(), month: "2026-03", periodStart: "2026-03-01", periodEnd: "2026-03-31", totalCost: 500_000 });
    await syncReportPayment({ id: id2, studentId: "stu-pay", month: "2026-03", periodStart: "2026-03-01", periodEnd: "2026-03-31", totalCost: 500_000 });
    await updatePaymentAmountById((await getPaymentByReport(id2))!.id, 450_000);
    await syncReportPayment({ id: id2, studentId: "stu-pay", month: "2026-03", periodStart: "2026-03-01", periodEnd: "2026-03-31", totalCost: 700_000 });
    expect((await getPaymentByReport(id2))?.totalCost).toBe(450_000);
    expect((await getPaymentByReport(id2))?.source).toBe("manual");
  });

  it("does NOT adopt a month payment for a partial-period report (no double billing)", async () => {
    const { upsertPayment, syncReportPayment, getPaymentByReport, listPayments } = await import("../db/repos");
    await upsertPayment({ studentId: "stu-pay", month: "2026-02", totalCost: 600_000, status: "UNPAID" });
    const id = await seedReport();
    await syncReportPayment({ id, studentId: "stu-pay", month: "2026-02", periodStart: "2026-01-20", periodEnd: "2026-02-03", totalCost: 600_000 });
    // Tagihan lama tetap berdiri sendiri; laporan menerbitkan baris baru.
    const p = await getPaymentByReport(id);
    expect(p?.reportId).toBe(id);
    expect(p?.periodStart).toBe("2026-01-20");
    expect((await listPayments()).filter((x) => x.studentId === "stu-pay" && x.month === "2026-02")).toHaveLength(2);
  });

  it("adopts a month payment when the report spans the full calendar month", async () => {
    const { upsertPayment, syncReportPayment, getPaymentByReport, listPayments } = await import("../db/repos");
    await upsertPayment({ studentId: "stu-pay", month: "2026-03", totalCost: 900_000, status: "UNPAID" });
    const id = crypto.randomUUID();
    await syncReportPayment({ id, studentId: "stu-pay", month: "2026-03", periodStart: "2026-03-01", periodEnd: "2026-03-31", totalCost: 900_000 });
    const p = await getPaymentByReport(id);
    expect(p?.reportId).toBe(id);
    expect(p?.totalCost).toBe(900_000); // nominal lama dipertahankan
    expect((await listPayments()).filter((x) => x.studentId === "stu-pay" && x.month === "2026-03")).toHaveLength(1);
  });

  it("drops the stale UNPAID bill when a report total becomes zero", async () => {
    const { syncReportPayment, getPaymentByReport, listPayments } = await import("../db/repos");
    const id = await seedReport();
    await syncReportPayment({ id, studentId: "stu-pay", month: "2026-02", periodStart: "2026-01-20", periodEnd: "2026-02-03", totalCost: 600_000 });
    expect(await getPaymentByReport(id)).toBeDefined();
    await syncReportPayment({ id, studentId: "stu-pay", month: "2026-02", periodStart: "2026-01-20", periodEnd: "2026-02-03", totalCost: 0 });
    expect(await getPaymentByReport(id)).toBeUndefined();
    expect(await listPayments()).toHaveLength(0);
  });

  it("markPaymentTransferredById targets one specific row when two bills share a month", async () => {
    const { syncReportPayment, markPaymentTransferredById, getPaymentByReport, listPayments } = await import("../db/repos");
    const id = await seedReport();
    await syncReportPayment({ id, studentId: "stu-pay", month: "2026-02", periodStart: "2026-01-20", periodEnd: "2026-02-03", totalCost: 600_000 });
    // Baris kedua = tagihan sisa tutup bulan (bukan laporan).
    await db.payments.add({ id: crypto.randomUUID(), studentId: "stu-pay", month: "2026-02", totalCost: 200_000, status: "UNPAID", source: "auto" });

    const reportBill = await getPaymentByReport(id);
    await markPaymentTransferredById(reportBill!.id);
    const rows = (await listPayments("2026-02")).filter((p) => p.studentId === "stu-pay");
    const byStatus = Object.fromEntries(rows.map((p) => [p.reportId ? "report" : "manual", p.status]));
    expect(byStatus).toEqual({ report: "PAID", manual: "UNPAID" });
  });

  it("deleteSession syncs the report-tied payment while UNPAID", async () => {
    const { createStudent, createSession, upsertReport, syncReportPayment, getPaymentByReport, deleteSession } = await import("../db/repos");
    const sid = await createStudent({
      name: "Del Sync", level: "IBDP", subjects: [], parentContact: { phone: "088" },
      hourlyRate: DEFAULT_RATE, active: true, enrolledAt: wibDate(-30),
    });
    const s1 = await createSession({ studentId: sid, date: "2026-06-02", durationHours: 1, subjects: ["Math"], shortNote: "", status: "DONE" });
    const s2 = await createSession({ studentId: sid, date: "2026-06-04", durationHours: 2, subjects: ["Math"], shortNote: "", status: "DONE" });
    const rid = crypto.randomUUID();
    await upsertReport({
      id: rid, studentId: sid, month: "2026-06", periodStart: "2026-06-01", periodEnd: "2026-06-30",
      sessionIds: [s1, s2], templateKey: { themeId: "blue", layoutId: "cards" },
      summaryText: "", totalHours: 3, totalCost: 3 * DEFAULT_RATE,
    });
    await syncReportPayment({ id: rid, studentId: sid, month: "2026-06", periodStart: "2026-06-01", periodEnd: "2026-06-30", totalCost: 3 * DEFAULT_RATE });
    expect((await getPaymentByReport(rid))?.totalCost).toBe(3 * DEFAULT_RATE);

    await deleteSession(s2);
    expect((await getPaymentByReport(rid))?.totalCost).toBe(1 * DEFAULT_RATE);
  });
});



describe("Report identity", () => {
  it("keeps ordinary full/partial lookup stable while supplemental reports stay addressable by id", async () => {
    const { upsertReport, findReportByPeriod, getReportById } = await import("../db/repos");
    const base = {
      studentId: "report-identity",
      month: "2026-06",
      sessionIds: [] as string[],
      templateKey: { themeId: "blue", layoutId: "cards" },
      summaryText: "",
      totalHours: 0,
      totalCost: 0,
      status: "confirmed" as const,
      autoGenerated: true,
    };
    const fullId = "report-full-primary";
    const legacyDuplicateId = "report-full-legacy-duplicate";
    const supplementalId = "report-full-supplemental";
    const partialId = "report-partial-primary";
    await upsertReport({ ...base, id: fullId, periodStart: "2026-06-01", periodEnd: "2026-06-30", createdAt: "2026-06-30T01:00:00.000Z" });
    // Simulate a legacy duplicate that predates the current atomic guard.
    await db.reports.add({ ...base, id: legacyDuplicateId, periodStart: "2026-06-01", periodEnd: "2026-06-30", createdAt: "2026-06-30T02:00:00.000Z" });
    await db.reports.add({ ...base, id: supplementalId, periodStart: "2026-06-01", periodEnd: "2026-06-30", createdAt: "2026-06-30T00:00:00.000Z", supplementalForReportId: fullId });
    await db.reports.add({ ...base, id: partialId, periodStart: "2026-06-10", periodEnd: "2026-06-12", createdAt: "2026-06-12T01:00:00.000Z" });

    expect((await findReportByPeriod("report-identity", "2026-06-01", "2026-06-30"))?.id).toBe(fullId);
    expect((await findReportByPeriod("report-identity", "2026-06-10", "2026-06-12"))?.id).toBe(partialId);
    expect(await getReportById(supplementalId)).toMatchObject({
      id: supplementalId,
      supplementalForReportId: fullId,
    });
  });

  it("does not expose a supplemental report through ordinary period lookup", async () => {
    const { upsertReport, findReportByPeriod, getReportById } = await import("../db/repos");
    const supplementalId = "report-only-supplemental";
    await upsertReport({
      id: supplementalId,
      studentId: "report-identity",
      month: "2026-07",
      periodStart: "2026-07-20",
      periodEnd: "2026-07-20",
      supplementalForReportId: "missing-legacy-parent",
      sessionIds: [],
      templateKey: { themeId: "blue", layoutId: "cards" },
      summaryText: "",
      totalHours: 0,
      totalCost: 0,
      status: "confirmed",
      createdAt: "2026-07-20T00:00:00.000Z",
    });

    expect(await findReportByPeriod("report-identity", "2026-07-20", "2026-07-20")).toBeUndefined();
    expect((await getReportById(supplementalId))?.id).toBe(supplementalId);
  });

  it("atomically get-or-creates one regular draft for concurrent period requests", async () => {
    const { createReportForPeriod, listReportsByStudent } = await import("../db/repos");
    const base = {
      studentId: "report-concurrent",
      month: "2026-08",
      periodStart: "2026-08-01",
      periodEnd: "2026-08-31",
      sessionIds: [] as string[],
      templateKey: { themeId: "blue", layoutId: "cards" },
      summaryText: "",
      totalHours: 0,
      totalCost: 0,
      status: "draft" as const,
    };

    const results = await Promise.all([
      createReportForPeriod({ ...base, id: "concurrent-a" }),
      createReportForPeriod({ ...base, id: "concurrent-b" }),
    ]);
    const reports = await listReportsByStudent(base.studentId);

    expect(reports).toHaveLength(1);
    expect(new Set(results.map((result) => result.reportId))).toEqual(new Set([reports[0].id]));
    expect(results.filter((result) => result.created)).toHaveLength(1);
  });

  it("rejects a confirmed scope that overlaps an unrelated confirmed report", async () => {
    const { upsertReport } = await import("../db/repos");
    const base = {
      studentId: "report-overlap-atomic",
      month: "2026-08",
      sessionIds: [] as string[],
      templateKey: { themeId: "blue", layoutId: "cards" },
      summaryText: "",
      totalHours: 0,
      totalCost: 0,
      status: "confirmed" as const,
    };
    await upsertReport({ ...base, id: "confirmed-a", periodStart: "2026-08-01", periodEnd: "2026-08-20" });

    await expect(upsertReport({
      ...base,
      id: "confirmed-b",
      periodStart: "2026-08-15",
      periodEnd: "2026-08-31",
    })).rejects.toThrow("bertumpuk");
  });

  it("does not let an unprotected statusless legacy snapshot block confirmation", async () => {
    const { upsertReport } = await import("../db/repos");
    const base = {
      studentId: "legacy-scope-repair",
      month: "2026-08",
      sessionIds: [] as string[],
      templateKey: { themeId: "blue", layoutId: "cards" },
      summaryText: "",
      totalHours: 0,
      totalCost: 0,
    };
    await db.reports.add({
      ...base,
      id: "legacy-statusless-snapshot",
      periodStart: "2026-08-01",
      periodEnd: "2026-08-20",
      createdAt: "2026-08-20T00:00:00.000Z",
    });

    await expect(upsertReport({
      ...base,
      id: "refreshed-calendar-report",
      periodStart: "2026-08-15",
      periodEnd: "2026-08-31",
      status: "confirmed",
    })).resolves.toBe("refreshed-calendar-report");
  });

  it("keeps a protected statusless legacy snapshot as a confirmation blocker", async () => {
    const { upsertReport } = await import("../db/repos");
    const base = {
      studentId: "legacy-protected-scope",
      month: "2026-08",
      sessionIds: [] as string[],
      templateKey: { themeId: "blue", layoutId: "cards" },
      summaryText: "",
      totalHours: 0,
      totalCost: 0,
    };
    await db.reports.add({
      ...base,
      id: "legacy-protected-snapshot",
      periodStart: "2026-08-01",
      periodEnd: "2026-08-20",
      createdAt: "2026-08-20T00:00:00.000Z",
    });
    await db.payments.add({
      id: "legacy-protected-payment",
      studentId: base.studentId,
      month: base.month,
      reportId: "legacy-protected-snapshot",
      totalCost: 0,
      status: "PAID",
      source: "manual",
    });

    await expect(upsertReport({
      ...base,
      id: "blocked-calendar-report",
      periodStart: "2026-08-15",
      periodEnd: "2026-08-31",
      status: "confirmed",
    })).rejects.toThrow("bertumpuk");
  });

  it("serializes concurrent confirmations and keeps legacy confirmed collisions editable", async () => {
    const { upsertReport, getReportById } = await import("../db/repos");
    const base = {
      studentId: "report-confirm-race",
      month: "2026-08",
      periodStart: "2026-08-01",
      periodEnd: "2026-08-31",
      sessionIds: [] as string[],
      templateKey: { themeId: "blue", layoutId: "cards" },
      summaryText: "",
      totalHours: 0,
      totalCost: 0,
      status: "draft" as const,
      createdAt: "2026-08-31T00:00:00.000Z",
    };
    await db.reports.bulkAdd([
      { ...base, id: "confirm-race-a" },
      { ...base, id: "confirm-race-b", createdAt: "2026-08-31T00:00:01.000Z" },
    ]);

    const confirmations = await Promise.allSettled([
      upsertReport({ ...base, id: "confirm-race-a", status: "confirmed" }),
      upsertReport({ ...base, id: "confirm-race-b", status: "confirmed" }),
    ]);
    expect(confirmations.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(confirmations.filter((result) => result.status === "rejected")).toHaveLength(1);

    const confirmed = (await db.reports.toArray()).find((report) => report.status === "confirmed")!;
    // Once a collision already exists in legacy data, same-scope content edits
    // remain possible; the guard blocks only creation/confirmation/new overlap.
    const legacyTwin = {
      ...confirmed,
      id: "legacy-confirmed-twin",
      createdAt: "2026-08-31T00:00:02.000Z",
    };
    await db.reports.add(legacyTwin);
    await upsertReport({ ...confirmed, summaryText: "Updated safely" });
    expect((await getReportById(confirmed.id))?.summaryText).toBe("Updated safely");
  });
});

// ΓöÇΓöÇ Month Closing (v2 ΓÇö unified: tutup buku ΓåÆ laporan otomatis + sahkan) ΓöÇ
