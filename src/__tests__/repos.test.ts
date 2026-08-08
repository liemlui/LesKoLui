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
  await db.followUps.clear();
  await db.expenses.clear();
  await db.iaeeProjects.clear();
  await db.monthClosings.clear();
  await db.auditLog.clear();
  await db.studyNotes.clear();
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
    const { createStudent, scheduleSession, markSessionNoShow, listBillableSessionsForMonth, computeMonthBills } = await import("../db/repos");
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
    const bills = await computeMonthBills("2026-06");
    expect(bills).toHaveLength(1);
    expect(bills[0]).toMatchObject({ studentId: sid, count: 1, hours: 1.5, cost: 1.5 * DEFAULT_RATE });
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
    expect(summary[2]).toMatchObject({ realisasi: 500_000, piutang: 150_000, pengeluaran: 50_000, laba: 450_000 });

    const trend = await getMonthlyIncomeVsExpense(["2026-04", "2026-05", "2026-06"]);
    expect(trend.map((row) => row.income)).toEqual([0, 0, 500_000]);
    expect(trend[2]).toMatchObject({ expense: 50_000, net: 450_000 });
  });

  it("handles an empty month range", async () => {
    const { getCashSummary, getMonthlyIncomeVsExpense } = await import("../db/repos");
    expect(await getCashSummary([])).toEqual([]);
    expect(await getMonthlyIncomeVsExpense([])).toEqual([]);
  });
});

// ── FollowUp Tests ─────────────────────────────────────────────────

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

  it("closeMonth snapshot only counts newly created bills (existing payment skipped)", async () => {
    const { createStudent, createSession, closeMonth, getMonthClosing, upsertPayment, getPayment } = await import("../db/repos");
    const s1 = await createStudent({
      name: "Tanpa Tagihan", level: "IBDP", subjects: [], parentContact: { phone: "088" },
      hourlyRate: DEFAULT_RATE, active: true, enrolledAt: wibDate(-30),
    });
    const s2 = await createStudent({
      name: "Sudah Ditagih", level: "IBDP", subjects: [], parentContact: { phone: "089" },
      hourlyRate: DEFAULT_RATE, active: true, enrolledAt: wibDate(-30),
    });
    await createSession({ studentId: s1, date: "2026-08-05", durationHours: 2, subjects: ["Math"], shortNote: "x", status: "DONE" });
    await createSession({ studentId: s2, date: "2026-08-06", durationHours: 1, subjects: ["Math"], shortNote: "y", status: "DONE" });

    // s2 sudah punya tagihan manual → closeMonth harus melewatinya.
    await upsertPayment({ studentId: s2, month: "2026-08", totalCost: 999_000, status: "UNPAID" });
    await closeMonth("2026-08");

    const closing = await getMonthClosing("2026-08");
    expect(closing!.studentCount).toBe(1);                      // hanya s1
    expect(closing!.totalHours).toBe(2);
    expect(closing!.totalPotensi).toBe(2 * DEFAULT_RATE);
    const manual = await getPayment(s2, "2026-08");
    expect(manual!.totalCost).toBe(999_000);                    // tagihan manual utuh
    expect(manual!.source).toBe("manual");
  });

  it("deleteSession reduces the auto UNPAID payment of the same month", async () => {
    const { createStudent, createSession, closeMonth, deleteSession, getPayment } = await import("../db/repos");
    const sid = await createStudent({
      name: "Sync Pay", level: "IBDP", subjects: [], parentContact: { phone: "090" },
      hourlyRate: DEFAULT_RATE, active: true, enrolledAt: wibDate(-30),
    });
    const sess1 = await createSession({ studentId: sid, date: "2026-08-10", durationHours: 2, subjects: ["Math"], shortNote: "a", status: "DONE" });
    await createSession({ studentId: sid, date: "2026-08-12", durationHours: 1, subjects: ["Math"], shortNote: "b", status: "DONE" });
    await closeMonth("2026-08");

    let pay = await getPayment(sid, "2026-08");
    expect(pay!.totalCost).toBe(3 * DEFAULT_RATE);

    await deleteSession(sess1);
    pay = await getPayment(sid, "2026-08");
    expect(pay!.totalCost).toBe(DEFAULT_RATE);                  // 1 sesi tersisa
    expect(pay!.status).toBe("UNPAID");
  });

  it("deleteSession leaves manual/PAID payments untouched", async () => {
    const { createStudent, createSession, upsertPayment, deleteSession, getPayment } = await import("../db/repos");
    const sid = await createStudent({
      name: "Manual Pay", level: "IBDP", subjects: [], parentContact: { phone: "091" },
      hourlyRate: DEFAULT_RATE, active: true, enrolledAt: wibDate(-30),
    });
    const sessId = await createSession({ studentId: sid, date: "2026-08-15", durationHours: 2, subjects: ["Math"], shortNote: "a", status: "DONE" });
    await upsertPayment({ studentId: sid, month: "2026-08", totalCost: 2 * DEFAULT_RATE, status: "UNPAID" });

    await deleteSession(sessId);
    const pay = await getPayment(sid, "2026-08");
    expect(pay).toBeDefined();
    expect(pay!.totalCost).toBe(2 * DEFAULT_RATE);              // tidak dikurangi
    expect(pay!.source).toBe("manual");
  });

  it("deleteSession does not reduce payment for non-billable sessions", async () => {
    const { createStudent, createSession, closeMonth, deleteSession, getPayment } = await import("../db/repos");
    const sid = await createStudent({
      name: "Scheduled Pay", level: "IBDP", subjects: [], parentContact: { phone: "092" },
      hourlyRate: DEFAULT_RATE, active: true, enrolledAt: wibDate(-30),
    });
    await createSession({ studentId: sid, date: "2026-08-20", durationHours: 1, subjects: ["Math"], shortNote: "x", status: "DONE" });
    const scheduledId = await createSession({ studentId: sid, date: "2026-08-21", durationHours: 2, subjects: ["Math"], shortNote: "y", status: "SCHEDULED" });
    await closeMonth("2026-08");

    let pay = await getPayment(sid, "2026-08");
    expect(pay!.totalCost).toBe(DEFAULT_RATE);                  // hanya sesi DONE

    await deleteSession(scheduledId);                           // sesi SCHEDULED tidak billable
    pay = await getPayment(sid, "2026-08");
    expect(pay!.totalCost).toBe(DEFAULT_RATE);                  // tagihan tidak berubah
  });

  it("closeMonth twice is idempotent (re-close does not zero the snapshot)", async () => {
    const { createStudent, createSession, closeMonth, getMonthClosing } = await import("../db/repos");
    const sid = await createStudent({
      name: "Reclose Pay", level: "IBDP", subjects: [], parentContact: { phone: "093" },
      hourlyRate: DEFAULT_RATE, active: true, enrolledAt: wibDate(-30),
    });
    await createSession({ studentId: sid, date: "2026-08-25", durationHours: 2, subjects: ["Math"], shortNote: "x", status: "DONE" });
    await closeMonth("2026-08");
    await closeMonth("2026-08");                                // double-tap / re-close

    const closing = await getMonthClosing("2026-08");
    expect(closing!.totalPotensi).toBe(2 * DEFAULT_RATE);       // tidak jadi nol
    expect(closing!.totalHours).toBe(2);
    expect(closing!.studentCount).toBe(1);
  });

  it("updatePaymentAmount flips the bill to manual (no longer auto-adjusted)", async () => {
    const { createStudent, createSession, closeMonth, updatePaymentAmount, deleteSession, getPayment } = await import("../db/repos");
    const sid = await createStudent({
      name: "Edited Pay", level: "IBDP", subjects: [], parentContact: { phone: "094" },
      hourlyRate: DEFAULT_RATE, active: true, enrolledAt: wibDate(-30),
    });
    const sessId = await createSession({ studentId: sid, date: "2026-08-28", durationHours: 2, subjects: ["Math"], shortNote: "x", status: "DONE" });
    await closeMonth("2026-08");
    await updatePaymentAmount(sid, "2026-08", 500_000);         // tutor edit nominal

    await deleteSession(sessId);
    const pay = await getPayment(sid, "2026-08");
    expect(pay!.source).toBe("manual");
    expect(pay!.totalCost).toBe(500_000);                       // nominal sepakatan tetap
  });
});

// ── Expenses Tests ─────────────────────────────────────────────────

describe("Expenses", () => {
  it("creates and lists expenses by month", async () => {
    const { createExpense, listExpenses } = await import("../db/repos");
    await createExpense({ date: "2026-06-10", category: "transport", description: "Bensin", amount: 50000 });
    await createExpense({ date: "2026-06-12", category: "buku", description: "Buku Paket", amount: 150000 });
    const all = await listExpenses("2026-06");
    expect(all.length).toBe(2);
    const totals = all.reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + e.amount;
      return acc;
    }, {});
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

// ── Report Periods (rekap N pertemuan / rentang tanggal) ─────────

describe("Report periods", () => {
  it("upsertReport backfills period from calendar month for legacy reports", async () => {
    const { upsertReport, getReport } = await import("../db/repos");
    const id = crypto.randomUUID();
    await upsertReport({
      id, studentId: "r-legacy", month: "2026-02",
      sessionIds: [], templateKey: { themeId: "blue", layoutId: "cards" },
      summaryText: "", totalHours: 0, totalCost: 0,
    });
    const r = await getReport("r-legacy", "2026-02");
    expect(r?.periodStart).toBe("2026-02-01");
    expect(r?.periodEnd).toBe("2026-02-28");
  });

  it("findReportByPeriod matches exact period only", async () => {
    const { upsertReport, findReportByPeriod } = await import("../db/repos");
    const a = crypto.randomUUID();
    await upsertReport({
      id: a, studentId: "s1", month: "2026-02", periodStart: "2026-01-20", periodEnd: "2026-02-03",
      sessionIds: [], templateKey: { themeId: "blue", layoutId: "cards" },
      summaryText: "", totalHours: 0, totalCost: 0,
    });
    expect((await findReportByPeriod("s1", "2026-01-20", "2026-02-03"))?.id).toBe(a);
    expect(await findReportByPeriod("s1", "2026-01-21", "2026-02-03")).toBeUndefined();
  });

  it("listOverlappingReports finds intersecting periods and honors excludeId", async () => {
    const { upsertReport, listOverlappingReports } = await import("../db/repos");
    const a = crypto.randomUUID();
    await upsertReport({
      id: a, studentId: "s1", month: "2026-02", periodStart: "2026-01-20", periodEnd: "2026-02-03",
      sessionIds: [], templateKey: { themeId: "blue", layoutId: "cards" },
      summaryText: "", totalHours: 0, totalCost: 0,
    });
    // Pertemuan tepat di tepi periode dianggap bertumpuk (inklusif).
    expect((await listOverlappingReports("s1", "2026-02-03", "2026-02-10")).map((r) => r.id)).toEqual([a]);
    // Periode setelahnya tidak bertumpuk.
    expect(await listOverlappingReports("s1", "2026-02-04", "2026-02-10")).toHaveLength(0);
    // Laporan itu sendiri dikecualikan saat update.
    expect(await listOverlappingReports("s1", "2026-01-20", "2026-02-03", a)).toHaveLength(0);
  });
});

// ── Report Payments (tagihan per laporan periode) ─────────────────

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
    // Belum lunas → nominal mengikuti laporan.
    await syncReportPayment({ id, studentId: "stu-pay", month: "2026-02", periodStart: "2026-01-20", periodEnd: "2026-02-05", totalCost: 750_000 });
    expect((await getPaymentByReport(id))?.totalCost).toBe(750_000);
    expect((await getPaymentByReport(id))?.periodEnd).toBe("2026-02-05");

    // Lunas → nominal tidak berubah walau laporan berubah.
    await markPaymentTransferredById((await getPaymentByReport(id))!.id);
    await syncReportPayment({ id, studentId: "stu-pay", month: "2026-02", periodStart: "2026-01-20", periodEnd: "2026-02-05", totalCost: 800_000 });
    expect((await getPaymentByReport(id))?.totalCost).toBe(750_000);

    // Manual → nominal tidak berubah.
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

// ── Tutup Bulan vs Laporan Periode ────────────────────────────────

describe("closeMonth with report periods", () => {
  it("excludes sessions already covered by a report (no double billing)", async () => {
    const { createStudent, createSession, upsertReport, closeMonth, getPayment, listMonthClosings } = await import("../db/repos");
    const sid = await createStudent({
      name: "Covered", level: "IBDP", subjects: [], parentContact: { phone: "087" },
      hourlyRate: DEFAULT_RATE, active: true, enrolledAt: wibDate(-30),
    });
    const s1 = await createSession({ studentId: sid, date: "2026-06-03", durationHours: 1, subjects: ["Math"], shortNote: "", status: "DONE" });
    await createSession({ studentId: sid, date: "2026-06-20", durationHours: 1, subjects: ["Math"], shortNote: "", status: "DONE" });
    await upsertReport({
      id: crypto.randomUUID(), studentId: sid, month: "2026-06", periodStart: "2026-06-01", periodEnd: "2026-06-30",
      sessionIds: [s1], templateKey: { themeId: "blue", layoutId: "cards" },
      summaryText: "", totalHours: 1, totalCost: DEFAULT_RATE,
    });
    await closeMonth("2026-06");
    // Hanya sesi 20 Juni (belum direkap) yang ditagih.
    const p = await getPayment(sid, "2026-06");
    expect(p?.totalCost).toBe(DEFAULT_RATE);
    expect((await listMonthClosings())[0].totalPotensi).toBe(DEFAULT_RATE);
  });

  it("bills leftover sessions separately when a report payment already exists for the month", async () => {
    const { createStudent, createSession, upsertReport, syncReportPayment, closeMonth, listPayments } = await import("../db/repos");
    const sid = await createStudent({
      name: "Leftover", level: "IBDP", subjects: [], parentContact: { phone: "087" },
      hourlyRate: DEFAULT_RATE, active: true, enrolledAt: wibDate(-30),
    });
    const s1 = await createSession({ studentId: sid, date: "2026-02-03", durationHours: 1, subjects: ["Math"], shortNote: "", status: "DONE" });
    await createSession({ studentId: sid, date: "2026-02-15", durationHours: 1, subjects: ["Math"], shortNote: "", status: "DONE" });
    const rid = crypto.randomUUID();
    await upsertReport({
      id: rid, studentId: sid, month: "2026-02", periodStart: "2026-01-20", periodEnd: "2026-02-03",
      sessionIds: [s1], templateKey: { themeId: "blue", layoutId: "cards" },
      summaryText: "", totalHours: 1, totalCost: DEFAULT_RATE,
    });
    await syncReportPayment({ id: rid, studentId: sid, month: "2026-02", periodStart: "2026-01-20", periodEnd: "2026-02-03", totalCost: DEFAULT_RATE });

    await closeMonth("2026-02");
    const rows = (await listPayments("2026-02")).filter((p) => p.studentId === sid);
    // Tagihan laporan (periode Jan 20–Feb 3) + tagihan sisa sesi 15 Feb.
    expect(rows).toHaveLength(2);
    expect(rows.find((p) => p.reportId === rid)?.totalCost).toBe(DEFAULT_RATE);
    expect(rows.find((p) => !p.reportId)?.totalCost).toBe(DEFAULT_RATE);

    // Tutup bulan kedua (double-tap) tidak membuat baris ketiga.
    await closeMonth("2026-02");
    expect((await listPayments("2026-02")).filter((p) => p.studentId === sid)).toHaveLength(2);
  });

  it("reopenMonth keeps report-tied bills and drops only tutup-bulan auto bills", async () => {
    const { createStudent, createSession, upsertReport, syncReportPayment, closeMonth, reopenMonth, listPayments, getPaymentByReport } = await import("../db/repos");
    const sid = await createStudent({
      name: "Reopen", level: "IBDP", subjects: [], parentContact: { phone: "087" },
      hourlyRate: DEFAULT_RATE, active: true, enrolledAt: wibDate(-30),
    });
    const s1 = await createSession({ studentId: sid, date: "2026-02-03", durationHours: 1, subjects: ["Math"], shortNote: "", status: "DONE" });
    await createSession({ studentId: sid, date: "2026-02-15", durationHours: 1, subjects: ["Math"], shortNote: "", status: "DONE" });
    const rid = crypto.randomUUID();
    await upsertReport({
      id: rid, studentId: sid, month: "2026-02", periodStart: "2026-02-01", periodEnd: "2026-02-28",
      sessionIds: [s1], templateKey: { themeId: "blue", layoutId: "cards" },
      summaryText: "", totalHours: 1, totalCost: DEFAULT_RATE,
    });
    await syncReportPayment({ id: rid, studentId: sid, month: "2026-02", periodStart: "2026-02-01", periodEnd: "2026-02-28", totalCost: DEFAULT_RATE });
    await closeMonth("2026-02"); // tagihan sisa sesi 15 Feb

    await reopenMonth("2026-02");
    // Tagihan laporan tetap ada; tagihan tutup bulan (auto, non-laporan) hilang.
    expect(await getPaymentByReport(rid)).toBeDefined();
    expect((await listPayments("2026-02")).filter((p) => p.studentId === sid && !p.reportId)).toHaveLength(0);
  });
});

// ── Draft / Confirmed Report Status ───────────────────────────────

describe("Report draft / confirm", () => {
  it("draft reports do NOT block new reports via overlap guard", async () => {
    const { upsertReport, listOverlappingReports } = await import("../db/repos");
    const id = crypto.randomUUID();
    await upsertReport({
      id, studentId: "s-draft", month: "2026-02", periodStart: "2026-02-01", periodEnd: "2026-02-10",
      status: "draft", sessionIds: [], templateKey: { themeId: "blue", layoutId: "cards" },
      summaryText: "", totalHours: 0, totalCost: 0,
    });
    expect(await listOverlappingReports("s-draft", "2026-02-05", "2026-02-15")).toHaveLength(0);
  });

  it("confirm locks the report and makes it visible to overlap guard", async () => {
    const { upsertReport, confirmReport, listOverlappingReports } = await import("../db/repos");
    const id = crypto.randomUUID();
    await upsertReport({
      id, studentId: "s-draft2", month: "2026-02", periodStart: "2026-02-01", periodEnd: "2026-02-10",
      status: "draft", sessionIds: [], templateKey: { themeId: "blue", layoutId: "cards" },
      summaryText: "", totalHours: 0, totalCost: 0,
    });
    await confirmReport(id);
    expect((await listOverlappingReports("s-draft2", "2026-02-05", "2026-02-15")).map((r) => r.id)).toEqual([id]);
  });

  it("discard deletes a draft report completely", async () => {
    const { upsertReport, discardReport, getReport } = await import("../db/repos");
    const id = crypto.randomUUID();
    await upsertReport({
      id, studentId: "s-draft3", month: "2026-02", periodStart: "2026-02-01", periodEnd: "2026-02-10",
      status: "draft", sessionIds: [], templateKey: { themeId: "blue", layoutId: "cards" },
      summaryText: "", totalHours: 0, totalCost: 0,
    });
    await discardReport(id);
    expect(await getReport("s-draft3", "2026-02")).toBeUndefined();
  });

  it("closeMonth excludes only confirmed report sessions", async () => {
    const { createStudent, createSession, upsertReport, closeMonth, getPayment, listMonthClosings } = await import("../db/repos");
    const sid = await createStudent({
      name: "Draft Close", level: "IBDP", subjects: [], parentContact: { phone: "087" },
      hourlyRate: DEFAULT_RATE, active: true, enrolledAt: wibDate(-30),
    });
    const s1 = await createSession({ studentId: sid, date: "2026-06-03", durationHours: 1, subjects: ["Math"], shortNote: "", status: "DONE" });
    await createSession({ studentId: sid, date: "2026-06-20", durationHours: 1, subjects: ["Math"], shortNote: "", status: "DONE" });
    // Report draft — sesinya TIDAK dikecualikan dari closeMonth.
    await upsertReport({
      id: crypto.randomUUID(), studentId: sid, month: "2026-06", periodStart: "2026-06-01", periodEnd: "2026-06-30",
      status: "draft", sessionIds: [s1], templateKey: { themeId: "blue", layoutId: "cards" },
      summaryText: "", totalHours: 1, totalCost: DEFAULT_RATE,
    });
    await closeMonth("2026-06");
    // Draft tidak mengecualikan sesi → kedua sesi ditagih tutup bulan.
    const p = await getPayment(sid, "2026-06");
    expect(p?.totalCost).toBe(2 * DEFAULT_RATE);
    expect((await listMonthClosings())[0].totalPotensi).toBe(2 * DEFAULT_RATE);
  });
});
