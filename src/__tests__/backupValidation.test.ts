import { beforeEach, describe, expect, it } from "vitest";
import { validateBackupData } from "../lib/backupValidation";
import { db } from "../db/db";
import { BACKUP_TABLES, importBackup, inspectBackup } from "../lib/backup";
import { encryptJson } from "../lib/crypto";

const PASS = "kunci-validasi-test";

type BackupData = Record<string, Record<string, unknown>[]>;

function emptyData(): BackupData {
  return Object.fromEntries(
    BACKUP_TABLES.map((t) => [t, []]),
  ) as unknown as BackupData;
}

/** Hapus semua data domain antar tes agar importBackup integrasi tidak terpengaruh data sebelumnya. */
beforeEach(async () => {
  await db.transaction("rw", [
    db.students, db.sessions, db.reports, db.payments, db.settings,
    db.raporGrades, db.followUps, db.expenses, db.iaeeProjects,
    db.auditLog, db.studyNotes,
  ], async () => {
    await Promise.all([
      db.students.clear(), db.sessions.clear(), db.reports.clear(), db.payments.clear(), db.settings.clear(),
      db.raporGrades.clear(), db.followUps.clear(), db.expenses.clear(), db.iaeeProjects.clear(),
      db.auditLog.clear(), db.studyNotes.clear(),
    ]);
  });
});

// ── Student validation ────────────────────────────────────────────
// ── Student validation ────────────────────────────────────────────

describe("validateBackupData students", () => {
  it("accepts a valid student", () => {
    const data = emptyData();
    data.students = [{
      id: "s1", name: "Alya", level: "IBDP", subjects: ["Physics"],
      parentContact: { name: "Bunda", phone: "08123456789" }, hourlyRate: 250_000,
      active: true, enrolledAt: "2026-01-01",
    }];
    const result = validateBackupData(data, db.verno);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects missing name", () => {
    const data = emptyData();
    data.students = [{ id: "s1", hourlyRate: 100_000 }];
    const result = validateBackupData(data, db.verno);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("name wajib"))).toBe(true);
  });

  it("rejects unknown level", () => {
    const data = emptyData();
    data.students = [{
      id: "s1", name: "Test", level: "SMP", subjects: [],
      parentContact: { phone: "0800" }, hourlyRate: 100_000, active: true, enrolledAt: "2026-01-01",
    }];
    const result = validateBackupData(data, db.verno);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("level tidak dikenal"))).toBe(true);
  });

  it("rejects invalid parentContact", () => {
    const data = emptyData();
    data.students = [{
      id: "s1", name: "Test", level: "MYP", subjects: [],
      parentContact: "invalid", hourlyRate: 100_000, active: true, enrolledAt: "2026-01-01",
    }];
    const result = validateBackupData(data, db.verno);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("parentContact harus berupa objek"))).toBe(true);
  });

  it("rejects negative hourlyRate", () => {
    const data = emptyData();
    data.students = [{
      id: "s1", name: "Test", level: "MYP", subjects: [],
      parentContact: { phone: "0800" }, hourlyRate: -1, active: true, enrolledAt: "2026-01-01",
    }];
    const result = validateBackupData(data, db.verno);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("tidak boleh negatif"))).toBe(true);
  });

  it("rejects invalid enrolledAt date", () => {
    const data = emptyData();
    data.students = [{
      id: "s1", name: "Test", level: "MYP", subjects: [],
      parentContact: { phone: "0800" }, hourlyRate: 100_000, active: true, enrolledAt: "not-a-date",
    }];
    const result = validateBackupData(data, db.verno);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("harus format YYYY-MM-DD"))).toBe(true);
  });

  it("warns about extra fields on student", () => {
    const data = emptyData();
    data.students = [{
      id: "s1", name: "Test", level: "MYP", subjects: [],
      parentContact: { phone: "0800" }, hourlyRate: 100_000, active: true, enrolledAt: "2026-01-01",
      unknownField: "something",
    }];
    const result = validateBackupData(data, db.verno);
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.message.includes("Field ekstra"))).toBe(true);
  });
});
// ── Session validation ────────────────────────────────────────────

describe("validateBackupData sessions", () => {
  it("rejects missing studentId", () => {
    const data = emptyData();
    data.students = [{ id: "s1", name: "A", level: "MYP", subjects: [], parentContact: { phone: "0800" }, hourlyRate: 1, active: true, enrolledAt: "2026-01-01" }];
    data.sessions = [{ id: "ses1", date: "2026-07-20", durationHours: 1, subjects: ["Math"], status: "DONE", rateSnapshot: 100_000, cost: 100_000, createdAt: "2026-07-20T08:00:00Z", updatedAt: "2026-07-20T08:00:00Z" }];
    const result = validateBackupData(data, db.verno);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("studentId wajib"))).toBe(true);
  });

  it("rejects invalid status", () => {
    const data = emptyData();
    data.students = [{ id: "s1", name: "A", level: "MYP", subjects: [], parentContact: { phone: "0800" }, hourlyRate: 1, active: true, enrolledAt: "2026-01-01" }];
    data.sessions = [{ id: "ses1", studentId: "s1", date: "2026-07-20", durationHours: 1, subjects: ["Math"], status: "INVALID", rateSnapshot: 100_000, cost: 100_000, createdAt: "2026-07-20T08:00:00Z", updatedAt: "2026-07-20T08:00:00Z" }];
    const result = validateBackupData(data, db.verno);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("status tidak dikenal"))).toBe(true);
  });

  it("rejects infinite cost", () => {
    const data = emptyData();
    data.students = [{ id: "s1", name: "A", level: "MYP", subjects: [], parentContact: { phone: "0800" }, hourlyRate: 1, active: true, enrolledAt: "2026-01-01" }];
    data.sessions = [{ id: "ses1", studentId: "s1", date: "2026-07-20", durationHours: 1, subjects: ["Math"], status: "DONE", rateSnapshot: 100_000, cost: Infinity, createdAt: "2026-07-20T08:00:00Z", updatedAt: "2026-07-20T08:00:00Z" }];
    const result = validateBackupData(data, db.verno);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("angka finite"))).toBe(true);
  });
});
// ── Settings validation ───────────────────────────────────────────

describe("validateBackupData settings", () => {
  it("rejects more than one settings row", () => {
    const data = emptyData();
    data.settings = [
      { id: "app", tutorProfile: { name: "T", phone: "0" }, defaultRate: 1, paymentInfo: "", subjects: [], ai: { enabled: false, model: "x" }, templatePref: {} },
      { id: "app", tutorProfile: { name: "T2", phone: "0" }, defaultRate: 1, paymentInfo: "", subjects: [], ai: { enabled: false, model: "x" }, templatePref: {} },
    ];
    const result = validateBackupData(data, db.verno);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("maksimal 1"))).toBe(true);
  });

  it("rejects wrong settings id", () => {
    const data = emptyData();
    data.settings = [{ id: "not-app", tutorProfile: { name: "T", phone: "0" }, defaultRate: 1, paymentInfo: "", subjects: [], ai: { enabled: false, model: "x" }, templatePref: {} }];
    const result = validateBackupData(data, db.verno);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('id harus "app"'))).toBe(true);
  });

  it("warns when settings is empty", () => {
    const data = emptyData();
    const result = validateBackupData(data, db.verno);
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.message.includes("Settings kosong"))).toBe(true);
  });

  it("rejects non-boolean ai.enabled", () => {
    const data = emptyData();
    data.settings = [{ id: "app", tutorProfile: { name: "T", phone: "0" }, defaultRate: 1, paymentInfo: "", subjects: [], ai: { enabled: "yes", model: "x" }, templatePref: {} }];
    const result = validateBackupData(data, db.verno);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("ai.enabled harus boolean"))).toBe(true);
  });
});
// ── Schema version validation ──────────────────────────────────────

describe("validateBackupData schema version", () => {
  it("rejects schema version higher than current", () => {
    const data = emptyData();
    const result = validateBackupData(data, db.verno + 1);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("lebih baru"))).toBe(true);
  });

  it("rejects non-integer schema version", () => {
    const data = emptyData();
    const result = validateBackupData(data, 1.5);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("integer positif"))).toBe(true);
  });

  it("accepts matching or lower schema version", () => {
    const data = emptyData();
    const result = validateBackupData(data, db.verno);
    expect(result.valid).toBe(true);
  });
});
// ── Dates validation ──────────────────────────────────────────────

describe("validateBackupData dates", () => {
  it("reports periodStart > periodEnd", () => {
    const data = emptyData();
    data.students = [{ id: "s1", name: "A", level: "MYP", subjects: [], parentContact: { phone: "0800" }, hourlyRate: 1, active: true, enrolledAt: "2026-01-01" }];
    data.reports = [{
      id: "r1", studentId: "s1", periodStart: "2026-07-31", periodEnd: "2026-07-01",
      sessionIds: [], templateKey: { themeId: "x", layoutId: "y" }, summaryText: "",
      totalHours: 1, totalCost: 1, createdAt: "2026-07-20T08:00:00Z",
    }];
    const result = validateBackupData(data, db.verno);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("periodStart"))).toBe(true);
  });

  it("rejects invalid month (13)", () => {
    const data = emptyData();
    data.students = [{ id: "s1", name: "A", level: "MYP", subjects: [], parentContact: { phone: "0800" }, hourlyRate: 1, active: true, enrolledAt: "2026-01-01" }];
    data.sessions = [{ id: "ses1", studentId: "s1", date: "2026-13-01", durationHours: 1, subjects: [], status: "DONE", rateSnapshot: 1, cost: 1, createdAt: "2026-07-20T08:00:00Z", updatedAt: "2026-07-20T08:00:00Z" }];
    const result = validateBackupData(data, db.verno);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("bulan harus 01-12"))).toBe(true);
  });
});
// ── Cross-table relations ─────────────────────────────────────────

describe("validateBackupData relations", () => {
  it("rejects session referencing non-existent student", () => {
    const data = emptyData();
    data.sessions = [{ id: "ses1", studentId: "ghost", date: "2026-07-20", durationHours: 1, subjects: [], status: "DONE", rateSnapshot: 1, cost: 1, createdAt: "2026-07-20T08:00:00Z", updatedAt: "2026-07-20T08:00:00Z" }];
    const result = validateBackupData(data, db.verno);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("murid ghost yang tidak ada"))).toBe(true);
  });

  it("rejects report and payment pointing to different students", () => {
    const data = emptyData();
    data.students = [
      { id: "s1", name: "A", level: "MYP", subjects: [], parentContact: { phone: "0800" }, hourlyRate: 1, active: true, enrolledAt: "2026-01-01" },
      { id: "s2", name: "B", level: "MYP", subjects: [], parentContact: { phone: "0800" }, hourlyRate: 1, active: true, enrolledAt: "2026-01-01" },
    ];
    data.reports = [{ id: "r1", studentId: "s1", periodStart: "2026-07-01", periodEnd: "2026-07-31", sessionIds: [], templateKey: { themeId: "x", layoutId: "y" }, summaryText: "", totalHours: 1, totalCost: 1, createdAt: "2026-07-20T08:00:00Z" }];
    data.payments = [{ id: "p1", studentId: "s2", reportId: "r1", month: "2026-07", totalCost: 1, status: "UNPAID" }];
    const result = validateBackupData(data, db.verno);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("murid berbeda"))).toBe(true);
  });

  it("warns about orphaned expense studentId", () => {
    const data = emptyData();
    data.expenses = [{ id: "e1", date: "2026-07-20", category: "buku", description: "Buku", amount: 50_000, createdAt: "2026-07-20T08:00:00Z", updatedAt: "2026-07-20T08:00:00Z", studentId: "ghost" }];
    const result = validateBackupData(data, db.verno);
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.message.includes("expenses"))).toBe(true);
  });

  it("warns about orphaned sourceSessionId in followUp", () => {
    const data = emptyData();
    data.students = [{ id: "s1", name: "A", level: "MYP", subjects: [], parentContact: { phone: "0800" }, hourlyRate: 1, active: true, enrolledAt: "2026-01-01" }];
    data.followUps = [{ id: "f1", studentId: "s1", type: "other", text: "Catatan", createdAt: "2026-07-20T08:00:00Z", sourceSessionId: "ghost-session" }];
    const result = validateBackupData(data, db.verno);
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.message.includes("sourceSessionId"))).toBe(true);
  });
});
// ── Integration with inspectBackup / importBackup ─────────────────

describe("backup validation integration", () => {
  it("inspectBackup returns warnings for orphaned expense", async () => {
    const data = emptyData();
    data.students = [{ id: "s1", name: "A", level: "MYP", subjects: [], parentContact: { phone: "0800" }, hourlyRate: 1, active: true, enrolledAt: "2026-01-01" }];
    data.expenses = [{ id: "e1", date: "2026-07-20", category: "buku", description: "Buku", amount: 50_000, createdAt: "2026-07-20T08:00:00Z", updatedAt: "2026-07-20T08:00:00Z", studentId: "orphan" }];
    const tableCounts = Object.fromEntries(BACKUP_TABLES.map((t) => [t, data[t].length]));
    const blob = await encryptJson({
      version: 2, exportedAt: "2026-09-05T00:00:00.000Z",
      schema: { databaseVersion: db.verno, tableCounts }, data,
    }, PASS);

    const summary = await inspectBackup(blob, PASS);
    expect(summary.warnings.length).toBeGreaterThan(0);
    expect(summary.warnings.some((w) => w.message.includes("expenses"))).toBe(true);
  });

  it("importBackup calls onValidationWarnings when warnings exist", async () => {
    const data = emptyData();
    data.students = [{ id: "s1", name: "A", level: "MYP", subjects: [], parentContact: { phone: "0800" }, hourlyRate: 1, active: true, enrolledAt: "2026-01-01" }];
    data.expenses = [{ id: "e1", date: "2026-07-20", category: "buku", description: "Buku", amount: 50_000, createdAt: "2026-07-20T08:00:00Z", updatedAt: "2026-07-20T08:00:00Z", studentId: "orphan" }];
    const tableCounts = Object.fromEntries(BACKUP_TABLES.map((t) => [t, data[t].length]));
    const blob = await encryptJson({
      version: 2, exportedAt: "2026-09-05T00:00:00.000Z",
      schema: { databaseVersion: db.verno, tableCounts }, data,
    }, PASS);

    let called = false;
    await importBackup(blob, PASS, {
      onPreRestoreBackup: () => undefined,
      onValidationWarnings: (warnings) => {
        called = true;
        expect(warnings.length).toBeGreaterThan(0);
        return true;
      },
    });
    expect(called).toBe(true);
  });

  it("importBackup aborts when onValidationWarnings returns false", async () => {
    const data = emptyData();
    data.students = [{ id: "s1", name: "A", level: "MYP", subjects: [], parentContact: { phone: "0800" }, hourlyRate: 1, active: true, enrolledAt: "2026-01-01" }];
    data.expenses = [{ id: "e1", date: "2026-07-20", category: "buku", description: "Buku", amount: 50_000, createdAt: "2026-07-20T08:00:00Z", updatedAt: "2026-07-20T08:00:00Z", studentId: "orphan" }];
    const tableCounts = Object.fromEntries(BACKUP_TABLES.map((t) => [t, data[t].length]));
    const blob = await encryptJson({
      version: 2, exportedAt: "2026-09-05T00:00:00.000Z",
      schema: { databaseVersion: db.verno, tableCounts }, data,
    }, PASS);

    await expect(importBackup(blob, PASS, {
      onPreRestoreBackup: () => undefined,
      onValidationWarnings: () => false,
    })).rejects.toThrow("dibatalkan oleh pengguna");
  });

  it("importBackup without onValidationWarnings proceeds with warnings silently", async () => {
    const data = emptyData();
    data.students = [{ id: "s1", name: "A", level: "MYP", subjects: [], parentContact: { phone: "0800" }, hourlyRate: 1, active: true, enrolledAt: "2026-01-01" }];
    data.expenses = [{ id: "e1", date: "2026-07-20", category: "buku", description: "Buku", amount: 50_000, createdAt: "2026-07-20T08:00:00Z", updatedAt: "2026-07-20T08:00:00Z", studentId: "orphan" }];
    const tableCounts = Object.fromEntries(BACKUP_TABLES.map((t) => [t, data[t].length]));
    const blob = await encryptJson({
      version: 2, exportedAt: "2026-09-05T00:00:00.000Z",
      schema: { databaseVersion: db.verno, tableCounts }, data,
    }, PASS);

    const result = await importBackup(blob, PASS, { onPreRestoreBackup: () => undefined });
    expect(result.restored.warnings.length).toBeGreaterThan(0);
  });
});

// ── Unknown table rejection ───────────────────────────────────────

describe("validateBackupData unknown tables", () => {
  it("rejects unknown table", () => {
    const data = emptyData() as Record<string, Record<string, unknown>[]>;
    data.myCustomTable = [{ id: "1" }];
    const result = validateBackupData(data, db.verno);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("tabel tidak dikenal"))).toBe(true);
  });
});