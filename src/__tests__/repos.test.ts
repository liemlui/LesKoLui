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

// ── Month Closing (v2 — unified: tutup buku → laporan otomatis + sahkan) ─

describe("Month Closing", () => {
  it("closeMonth creates auto-generated confirmed reports + tagihan", async () => {
    const { createStudent, createSession, closeMonth, listPayments, listReportsByStudent, getMonthClosing } = await import("../db/repos");
    const sid = await createStudent({ name: "Bulanan", level: "IBDP", subjects: [], parentContact: { phone: "088" }, hourlyRate: DEFAULT_RATE, active: true, enrolledAt: wibDate(-30) });
    await createSession({ studentId: sid, date: "2026-06-03", durationHours: 1, subjects: ["Math"], shortNote: "", status: "DONE" });
    await createSession({ studentId: sid, date: "2026-06-20", durationHours: 1, subjects: ["Math"], shortNote: "", status: "DONE" });

    await closeMonth("2026-06");
    // Satu laporan otomatis terbit + sah
    const reports = await listReportsByStudent(sid);
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({
      month: "2026-06", periodStart: "2026-06-01", periodEnd: "2026-06-30",
      status: "confirmed", autoGenerated: true,
    });
    // Tagihan terbit dari laporan otomatis
    const payments = await listPayments("2026-06");
    expect(payments.filter((p) => p.studentId === sid)).toHaveLength(1);
    expect(payments[0].reportId).toBe(reports[0].id);
    expect(payments[0].totalCost).toBe(2 * DEFAULT_RATE);
    // Snapshot tutup buku
    expect((await getMonthClosing("2026-06"))).toBeDefined();
  });

  it("closeMonth adopts an existing manual month payment without changing it", async () => {
    const {
      createStudent, createSession, upsertPayment, getPayment, closeMonth,
      listPayments, listReportsByStudent,
    } = await import("../db/repos");
    const sid = await createStudent({ name: "Adopt Manual", level: "IBDP", subjects: [], parentContact: { phone: "088" }, hourlyRate: DEFAULT_RATE, active: true, enrolledAt: wibDate(-30) });
    await createSession({ studentId: sid, date: "2026-06-03", durationHours: 1, subjects: ["Math"], shortNote: "", status: "DONE" });
    await createSession({ studentId: sid, date: "2026-06-20", durationHours: 1, subjects: ["Math"], shortNote: "", status: "DONE" });
    await upsertPayment({
      studentId: sid,
      month: "2026-06",
      totalCost: 450_000,
      status: "PAID",
      paidAt: "2026-06-25",
      method: "cash",
    });
    const manualBefore = await getPayment(sid, "2026-06");

    await closeMonth("2026-06");

    const reports = (await listReportsByStudent(sid)).filter((report) => report.autoGenerated);
    const payments = (await listPayments("2026-06")).filter((payment) => payment.studentId === sid);
    expect(reports).toHaveLength(1);
    expect(payments).toHaveLength(1);
    expect(payments[0]).toMatchObject({
      id: manualBefore?.id,
      reportId: reports[0].id,
      totalCost: 450_000,
      status: "PAID",
      source: "manual",
      paidAt: "2026-06-25",
      method: "cash",
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30",
    });
  });

  it("close -> reopen -> close reuses the draft and includes newly added sessions", async () => {
    const {
      createStudent, createSession, closeMonth, reopenMonth, listPayments,
      listReportsByStudent, getMonthClosing,
    } = await import("../db/repos");
    const sid = await createStudent({ name: "Reclose Draft", level: "IBDP", subjects: [], parentContact: { phone: "088" }, hourlyRate: DEFAULT_RATE, active: true, enrolledAt: wibDate(-30) });
    const firstSessionId = await createSession({ studentId: sid, date: "2026-06-03", durationHours: 1, subjects: ["Math"], shortNote: "", status: "DONE" });
    await closeMonth("2026-06");
    const originalReport = (await listReportsByStudent(sid)).find((report) => report.autoGenerated)!;

    await reopenMonth("2026-06");
    expect((await listReportsByStudent(sid)).find((report) => report.id === originalReport.id)?.status).toBe("draft");
    expect((await listPayments("2026-06")).filter((payment) => payment.studentId === sid)).toHaveLength(0);
    expect(await getMonthClosing("2026-06")).toBeUndefined();

    const lateSessionId = await createSession({ studentId: sid, date: "2026-06-22", durationHours: 1, subjects: ["Math"], shortNote: "", status: "DONE" });
    await closeMonth("2026-06");

    const reports = (await listReportsByStudent(sid)).filter((report) => report.autoGenerated);
    const payments = (await listPayments("2026-06")).filter((payment) => payment.studentId === sid);
    expect(reports).toHaveLength(1);
    expect(reports[0].id).toBe(originalReport.id);
    expect(reports[0].status).toBe("confirmed");
    expect(reports[0].sessionIds).toEqual([firstSessionId, lateSessionId]);
    expect(reports[0].totalCost).toBe(2 * DEFAULT_RATE);
    expect(payments).toHaveLength(1);
    expect(payments[0]).toMatchObject({ reportId: originalReport.id, totalCost: 2 * DEFAULT_RATE, status: "UNPAID", source: "auto" });
    expect(await getMonthClosing("2026-06")).toMatchObject({
      totalPotensi: 2 * DEFAULT_RATE,
      totalHours: 2,
      studentCount: 1,
    });
  });

  it("does not confirm an empty draft when all sessions are removed before reclose", async () => {
    const {
      createStudent, createSession, closeMonth, reopenMonth, deleteSession,
      listPayments, listReportsByStudent, getMonthClosing,
    } = await import("../db/repos");
    const sid = await createStudent({ name: "Empty Reclose", level: "IBDP", subjects: [], parentContact: { phone: "088" }, hourlyRate: DEFAULT_RATE, active: true, enrolledAt: wibDate(-30) });
    const sessionId = await createSession({ studentId: sid, date: "2026-06-03", durationHours: 1, subjects: ["Math"], shortNote: "", status: "DONE" });
    await closeMonth("2026-06");
    const reportId = (await listReportsByStudent(sid)).find((report) => report.autoGenerated)!.id;

    await reopenMonth("2026-06");
    await deleteSession(sessionId);
    await closeMonth("2026-06");

    const report = (await listReportsByStudent(sid)).find((candidate) => candidate.id === reportId);
    expect(report).toMatchObject({ status: "draft", sessionIds: [], totalHours: 0, totalCost: 0 });
    expect((await listPayments("2026-06")).filter((payment) => payment.studentId === sid)).toHaveLength(0);
    expect(await getMonthClosing("2026-06")).toMatchObject({ totalPotensi: 0, totalHours: 0, studentCount: 0 });
  });

  it("reopen preserves a manually edited report payment", async () => {
    const {
      createStudent, createSession, closeMonth, reopenMonth, updatePaymentAmountById,
      listPayments, listReportsByStudent, getMonthClosing,
    } = await import("../db/repos");
    const sid = await createStudent({ name: "Manual Override", level: "IBDP", subjects: [], parentContact: { phone: "088" }, hourlyRate: DEFAULT_RATE, active: true, enrolledAt: wibDate(-30) });
    await createSession({ studentId: sid, date: "2026-06-03", durationHours: 1, subjects: ["Math"], shortNote: "", status: "DONE" });
    await closeMonth("2026-06");
    const paymentBefore = (await listPayments("2026-06")).find((payment) => payment.studentId === sid)!;
    await updatePaymentAmountById(paymentBefore.id, 175_000);

    await reopenMonth("2026-06");

    const paymentsAfter = (await listPayments("2026-06")).filter((payment) => payment.studentId === sid);
    expect(paymentsAfter).toHaveLength(1);
    expect(paymentsAfter[0]).toMatchObject({
      id: paymentBefore.id,
      reportId: paymentBefore.reportId,
      totalCost: 175_000,
      status: "UNPAID",
      source: "manual",
    });
    expect((await listReportsByStudent(sid)).find((report) => report.id === paymentBefore.reportId)?.status).toBe("confirmed");
    expect(await getMonthClosing("2026-06")).toBeUndefined();

    await closeMonth("2026-06");
    const afterReclose = (await listPayments("2026-06")).filter((payment) => payment.studentId === sid);
    expect(afterReclose).toHaveLength(1);
    expect(afterReclose[0]).toMatchObject({ id: paymentBefore.id, totalCost: 175_000, source: "manual" });
  });

  it("closeMonth extends a confirmed auto report when late sessions appear", async () => {
    const {
      createStudent, createSession, closeMonth, listPayments,
      listReportsByStudent, getMonthClosing,
    } = await import("../db/repos");
    const sid = await createStudent({ name: "Late Session", level: "IBDP", subjects: [], parentContact: { phone: "088" }, hourlyRate: DEFAULT_RATE, active: true, enrolledAt: wibDate(-30) });
    const firstSessionId = await createSession({ studentId: sid, date: "2026-06-03", durationHours: 1, subjects: ["Math"], shortNote: "", status: "DONE" });
    await closeMonth("2026-06");
    const originalReport = (await listReportsByStudent(sid)).find((report) => report.autoGenerated)!;
    const lateSessionId = await createSession({ studentId: sid, date: "2026-06-24", durationHours: 1, subjects: ["Math"], shortNote: "", status: "DONE" });

    await closeMonth("2026-06");

    const reports = (await listReportsByStudent(sid)).filter((report) => report.autoGenerated);
    const payments = (await listPayments("2026-06")).filter((payment) => payment.studentId === sid);
    expect(reports).toHaveLength(1);
    expect(reports[0].id).toBe(originalReport.id);
    expect(reports[0].sessionIds).toEqual([firstSessionId, lateSessionId]);
    expect(reports[0].totalCost).toBe(2 * DEFAULT_RATE);
    expect(payments).toHaveLength(1);
    expect(payments[0]).toMatchObject({ reportId: originalReport.id, totalCost: 2 * DEFAULT_RATE, source: "auto" });
    expect(await getMonthClosing("2026-06")).toMatchObject({ totalPotensi: 2 * DEFAULT_RATE, totalHours: 2, studentCount: 1 });
  });

  it("repairs a missing invoice for sessions already covered by a confirmed report", async () => {
    const {
      createStudent, createSession, upsertReport, closeMonth,
      getPaymentByReport, listReportsByStudent,
    } = await import("../db/repos");
    const sid = await createStudent({ name: "Legacy Missing Invoice", level: "IBDP", subjects: [], parentContact: { phone: "086" }, hourlyRate: DEFAULT_RATE, active: true, enrolledAt: wibDate(-30) });
    const sessionId = await createSession({ studentId: sid, date: "2026-06-08", durationHours: 1, subjects: ["Math"], shortNote: "", status: "DONE" });
    const reportId = "confirmed-without-payment";
    await upsertReport({
      id: reportId,
      studentId: sid,
      month: "2026-06",
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30",
      sessionIds: [sessionId],
      templateKey: { themeId: "blue", layoutId: "cards" },
      summaryText: "",
      totalHours: 1,
      totalCost: DEFAULT_RATE,
      status: "confirmed",
    });
    expect(await getPaymentByReport(reportId)).toBeUndefined();

    await closeMonth("2026-06");

    expect(await getPaymentByReport(reportId)).toMatchObject({
      reportId,
      totalCost: DEFAULT_RATE,
      status: "UNPAID",
      source: "auto",
    });
    expect(await listReportsByStudent(sid)).toHaveLength(1);
  });

  it("keeps close preview aligned when manual and report invoices coexist", async () => {
    const {
      createStudent, createSession, closeMonth, createManualPayment, listPayments,
    } = await import("../db/repos");
    const { buildMonthClosingProjection } = await import("../lib/billingPreview");
    const sid = await createStudent({ name: "Preview Coexist", level: "IBDP", subjects: [], parentContact: { phone: "087" }, hourlyRate: DEFAULT_RATE, active: true, enrolledAt: wibDate(-30) });
    await createSession({ studentId: sid, date: "2026-06-03", durationHours: 1, subjects: ["Math"], shortNote: "", status: "DONE" });
    await closeMonth("2026-06");
    await createManualPayment({ studentId: sid, month: "2026-06", totalCost: 100_000, status: "UNPAID" });
    await createSession({ studentId: sid, date: "2026-06-24", durationHours: 1, subjects: ["Math"], shortNote: "", status: "DONE" });

    const before = (await listPayments("2026-06")).filter((payment) => payment.studentId === sid);
    const beforeTotal = before.reduce((sum, payment) => sum + payment.totalCost, 0);
    const projection = buildMonthClosingProjection([{ studentId: sid, cost: DEFAULT_RATE }], before);
    expect(projection.rows[0].adoptedPayment).toBeUndefined();
    expect(projection.additionalTotal).toBe(DEFAULT_RATE);

    await closeMonth("2026-06");
    const after = (await listPayments("2026-06")).filter((payment) => payment.studentId === sid);
    expect(after.reduce((sum, payment) => sum + payment.totalCost, 0) - beforeTotal).toBe(projection.additionalTotal);
    expect(after.find((payment) => !payment.reportId)?.totalCost).toBe(100_000);
  });

  it("creates addressable supplemental reports for late sessions after manual or paid invoices", async () => {
    const {
      createStudent, createSession, closeMonth, listPayments, listReportsByStudent,
      updatePaymentAmountById, markPaymentTransferredById, getReportById, findReportByPeriod,
    } = await import("../db/repos");
    const manualSid = await createStudent({ name: "Late Manual", level: "IBDP", subjects: [], parentContact: { phone: "081" }, hourlyRate: DEFAULT_RATE, active: true, enrolledAt: wibDate(-30) });
    const paidSid = await createStudent({ name: "Late Paid", level: "IBDP", subjects: [], parentContact: { phone: "082" }, hourlyRate: DEFAULT_RATE, active: true, enrolledAt: wibDate(-30) });
    await createSession({ studentId: manualSid, date: "2026-06-03", durationHours: 1, subjects: ["Math"], shortNote: "", status: "DONE" });
    await createSession({ studentId: paidSid, date: "2026-06-04", durationHours: 1, subjects: ["Math"], shortNote: "", status: "DONE" });
    await closeMonth("2026-06");

    const manualPrimary = (await listReportsByStudent(manualSid)).find((report) => report.autoGenerated)!;
    const paidPrimary = (await listReportsByStudent(paidSid)).find((report) => report.autoGenerated)!;
    const initialPayments = await listPayments("2026-06");
    const manualPrimaryPayment = initialPayments.find((payment) => payment.reportId === manualPrimary.id)!;
    const paidPrimaryPayment = initialPayments.find((payment) => payment.reportId === paidPrimary.id)!;
    await updatePaymentAmountById(manualPrimaryPayment.id, 175_000);
    await markPaymentTransferredById(paidPrimaryPayment.id, "transfer", "2026-06-25");
    const manualLateId = await createSession({ studentId: manualSid, date: "2026-06-20", durationHours: 1, subjects: ["Math"], shortNote: "", status: "DONE" });
    const paidLateId = await createSession({ studentId: paidSid, date: "2026-06-22", durationHours: 1, subjects: ["Math"], shortNote: "", status: "DONE" });

    await closeMonth("2026-06");
    await closeMonth("2026-06");

    for (const scenario of [
      { sid: manualSid, primary: manualPrimary, lateId: manualLateId, lateDate: "2026-06-20", protected: { totalCost: 175_000, status: "UNPAID", source: "manual" } },
      { sid: paidSid, primary: paidPrimary, lateId: paidLateId, lateDate: "2026-06-22", protected: { totalCost: DEFAULT_RATE, status: "PAID", source: "auto", paidAt: "2026-06-25" } },
    ]) {
      const reports = (await listReportsByStudent(scenario.sid)).filter((report) => report.autoGenerated);
      const supplemental = reports.find((report) => report.supplementalForReportId === scenario.primary.id);
      expect(reports).toHaveLength(2);
      expect(supplemental).toMatchObject({
        periodStart: scenario.lateDate,
        periodEnd: scenario.lateDate,
        sessionIds: [scenario.lateId],
        totalCost: DEFAULT_RATE,
        status: "confirmed",
      });
      expect(await getReportById(supplemental!.id)).toMatchObject({ supplementalForReportId: scenario.primary.id });
      expect((await findReportByPeriod(scenario.sid, "2026-06-01", "2026-06-30"))?.id).toBe(scenario.primary.id);

      const payments = (await listPayments("2026-06")).filter((payment) => payment.studentId === scenario.sid);
      expect(payments).toHaveLength(2);
      expect(payments.find((payment) => payment.reportId === scenario.primary.id)).toMatchObject(scenario.protected);
      expect(payments.find((payment) => payment.reportId === supplemental!.id)).toMatchObject({
        totalCost: DEFAULT_RATE,
        status: "UNPAID",
        source: "auto",
        periodStart: scenario.lateDate,
        periodEnd: scenario.lateDate,
      });
    }
  });

  it("closeMonth twice is idempotent (re-close tidak membuat duplikat)", async () => {
    const { createStudent, createSession, closeMonth, listReportsByStudent, listPayments } = await import("../db/repos");
    const sid = await createStudent({ name: "Idem", level: "IBDP", subjects: [], parentContact: { phone: "088" }, hourlyRate: DEFAULT_RATE, active: true, enrolledAt: wibDate(-30) });
    await createSession({ studentId: sid, date: "2026-06-03", durationHours: 1, subjects: ["Math"], shortNote: "", status: "DONE" });
    await closeMonth("2026-06");
    await closeMonth("2026-06"); // double-tap
    expect((await listReportsByStudent(sid))).toHaveLength(1);
    expect((await listPayments("2026-06")).filter((p) => p.studentId === sid)).toHaveLength(1);
  });

  it("reopenMonth un-sahkan laporan otomatis (balik draft, hapus tagihan UNPAID)", async () => {
    const { createStudent, createSession, closeMonth, reopenMonth, listReportsByStudent, listPayments, getMonthClosing } = await import("../db/repos");
    const sid = await createStudent({ name: "Reopen2", level: "IBDP", subjects: [], parentContact: { phone: "088" }, hourlyRate: DEFAULT_RATE, active: true, enrolledAt: wibDate(-30) });
    await createSession({ studentId: sid, date: "2026-06-03", durationHours: 1, subjects: ["Math"], shortNote: "", status: "DONE" });
    await closeMonth("2026-06");

    await reopenMonth("2026-06");
    const r = (await listReportsByStudent(sid))[0];
    expect(r.status).toBe("draft"); // balik draft
    expect((await listPayments("2026-06")).filter((p) => p.studentId === sid)).toHaveLength(0);
    expect(await getMonthClosing("2026-06")).toBeUndefined();
  });

  it("closeMonth excludes sessions from confirmed reports", async () => {
    const { createStudent, createSession, upsertReport, syncReportPayment, closeMonth, listPayments, listReportsByStudent } = await import("../db/repos");
    const sid = await createStudent({ name: "Covered2", level: "IBDP", subjects: [], parentContact: { phone: "088" }, hourlyRate: DEFAULT_RATE, active: true, enrolledAt: wibDate(-30) });
    const s1 = await createSession({ studentId: sid, date: "2026-06-03", durationHours: 1, subjects: ["Math"], shortNote: "", status: "DONE" });
    await createSession({ studentId: sid, date: "2026-06-20", durationHours: 1, subjects: ["Math"], shortNote: "", status: "DONE" });

    // Laporan manual untuk sesi 3 Juni (sah)
    const rid = crypto.randomUUID();
    await upsertReport({ id: rid, studentId: sid, month: "2026-06", periodStart: "2026-06-01", periodEnd: "2026-06-30", sessionIds: [s1], templateKey: { themeId: "blue", layoutId: "cards" }, summaryText: "", totalHours: 1, totalCost: DEFAULT_RATE, status: "confirmed" });
    await syncReportPayment({ id: rid, studentId: sid, month: "2026-06", periodStart: "2026-06-01", periodEnd: "2026-06-30", totalCost: DEFAULT_RATE });

    await closeMonth("2026-06");
    // Hanya sesi 20 Juni (belum direkap) yang masuk laporan otomatis
    const payments = await listPayments("2026-06");
    const autoPayment = payments.find((p) => p.studentId === sid && p.reportId !== rid);
    expect(autoPayment?.totalCost).toBe(DEFAULT_RATE);
    expect(autoPayment).toMatchObject({ periodStart: "2026-06-20", periodEnd: "2026-06-20" });
    const supplemental = (await listReportsByStudent(sid)).find((report) => report.supplementalForReportId === rid);
    expect(supplemental).toMatchObject({
      periodStart: "2026-06-20",
      periodEnd: "2026-06-20",
      supplementalForReportId: rid,
    });
  });

  it("closeMonth skips students whose sessions are all covered by confirmed reports", async () => {
    const { createStudent, createSession, upsertReport, syncReportPayment, closeMonth, listReportsByStudent } = await import("../db/repos");
    const sid = await createStudent({ name: "AllCovered", level: "IBDP", subjects: [], parentContact: { phone: "088" }, hourlyRate: DEFAULT_RATE, active: true, enrolledAt: wibDate(-30) });
    const s1 = await createSession({ studentId: sid, date: "2026-06-03", durationHours: 1, subjects: ["Math"], shortNote: "", status: "DONE" });
    const s2 = await createSession({ studentId: sid, date: "2026-06-20", durationHours: 1, subjects: ["Math"], shortNote: "", status: "DONE" });
    const rid = crypto.randomUUID();
    await upsertReport({ id: rid, studentId: sid, month: "2026-06", periodStart: "2026-06-01", periodEnd: "2026-06-30", sessionIds: [s1, s2], templateKey: { themeId: "blue", layoutId: "cards" }, summaryText: "", totalHours: 2, totalCost: 2 * DEFAULT_RATE, status: "confirmed" });
    await syncReportPayment({ id: rid, studentId: sid, month: "2026-06", periodStart: "2026-06-01", periodEnd: "2026-06-30", totalCost: 2 * DEFAULT_RATE });

    await closeMonth("2026-06");
    // closeMonth tidak membuat laporan baru karena semua sesi sudah direkap
    expect((await listReportsByStudent(sid)).filter((r) => r.autoGenerated)).toHaveLength(0);
  });

  it("markPaymentTransferred is idempotent and keeps a single row", async () => {
    const { upsertPayment, markPaymentTransferred, markPaymentUnpaid, listPayments } = await import("../db/repos");
    await upsertPayment({ studentId: "p-mark", month: "2026-06", totalCost: 600_000, status: "UNPAID" });
    await markPaymentTransferred("p-mark", "2026-06");
    await markPaymentTransferred("p-mark", "2026-06"); // double-tap
    const rows = (await listPayments("2026-06")).filter((p) => p.studentId === "p-mark");
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("PAID");
    await markPaymentUnpaid("p-mark", "2026-06");
    expect((await listPayments("2026-06")).filter((p) => p.studentId === "p-mark")[0].status).toBe("UNPAID");
  });

  it("updatePaymentAmount flips the bill to manual (no longer auto-adjusted)", async () => {
    const { upsertPayment, updatePaymentAmount, getPayment } = await import("../db/repos");
    await upsertPayment({ studentId: "p-manual", month: "2026-06", totalCost: 600_000, status: "UNPAID" });
    await updatePaymentAmount("p-manual", "2026-06", 450_000);
    const p = await getPayment("p-manual", "2026-06");
    expect(p?.totalCost).toBe(450_000);
    expect(p?.source).toBe("manual");
  });
});
