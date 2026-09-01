import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../db/db";
import { BACKUP_TABLES, exportBackup, importBackup, inspectBackup } from "../lib/backup";
import { encryptJson } from "../lib/crypto";
import type {
  Expense, FollowUpItem, IaEeProject, MonthlyReport,
  Payment, RaporGrade, Session, Settings, Student, StudyNote,
} from "../db/types";

const PASS = "backup-sangat-aman-2026";

async function clearDomainData(): Promise<void> {
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
}

beforeEach(clearDomainData);

async function seedEveryBackupTable(): Promise<void> {
  const now = "2026-07-20T08:00:00.000Z";
  const student: Student = {
    id: "student-1", name: "Alya", level: "IBDP", subjects: ["Physics"],
    parentContact: { name: "Bunda Alya", phone: "08123456789" }, hourlyRate: 250_000,
    active: true, enrolledAt: "2026-01-01", photo: new Blob(["student-photo"], { type: "image/jpeg" }),
  };
  const session: Session = {
    id: "session-1", studentId: student.id, date: "2026-07-20", durationHours: 1.5,
    subjects: ["Physics"], shortNote: "Mekanika", status: "DONE", rateSnapshot: 250_000,
    cost: 375_000, createdAt: now, updatedAt: now,
    photo: new Blob(["session-photo"], { type: "image/webp" }),
    signature: new Blob(["signature"], { type: "image/png" }),
  };
  const report: MonthlyReport = {
    id: "report-1", studentId: student.id, month: "2026-07",
    periodStart: "2026-07-01", periodEnd: "2026-07-31",
    sessionIds: [session.id],
    templateKey: { themeId: "blue", layoutId: "cards" }, summaryText: "Bagus", totalHours: 1.5,
    totalCost: 375_000, createdAt: now,
  };
  const payment: Payment = { id: "payment-1", studentId: student.id, month: "2026-07", totalCost: 375_000, status: "UNPAID" };
  const settings: Settings = {
    id: "app", tutorProfile: { name: "Ko Lui", phone: "0811223344" }, defaultRate: 250_000,
    paymentInfo: "BCA", subjects: ["Physics"], logo: new Blob(["tutor-logo"], { type: "image/png" }),
    ai: { enabled: false, model: "deepseek-v4-flash" }, templatePref: {},
  };
  const rapor: RaporGrade = { id: "rapor-1", studentId: student.id, semester: "2025/2026-S2", grades: [{ subject: "Physics", grade: "7" }], createdAt: now };
  const followUp: FollowUpItem = { id: "followup-1", studentId: student.id, type: "continue-topic", text: "Lanjut mekanika", createdAt: now };
  const expense: Expense = { id: "expense-1", date: "2026-07-20", category: "buku", description: "Buku", amount: 100_000, createdAt: now, updatedAt: now };
  const project: IaEeProject = { id: "project-1", studentId: student.id, type: "IA", subject: "Physics", title: "Eksperimen", milestones: [{ id: "milestone-1", title: "Proposal", status: "pending" }], createdAt: now, updatedAt: now };
  const studyNote: StudyNote = { studentId: student.id, content: "Catatan belajar Alya", updatedAt: now };

  await db.transaction("rw", [
    db.students, db.sessions, db.reports, db.payments, db.settings, db.raporGrades,
    db.followUps, db.expenses, db.iaeeProjects, db.auditLog, db.studyNotes,
  ], async () => {
    await db.students.add(student);
    await db.sessions.add(session);
    await db.reports.add(report);
    await db.payments.add(payment);
    await db.settings.add(settings);
    await db.raporGrades.add(rapor);
    await db.followUps.add(followUp);
    await db.expenses.add(expense);
    await db.iaeeProjects.add(project);
    await db.studyNotes.add(studyNote);
    await db.auditLog.add({ id: "audit-local", action: "month.close", entityType: "data", timestamp: now });
  });
}

describe("backup / restore", () => {
  it("round-trips every domain table and top-level Blob fields", async () => {
    await seedEveryBackupTable();
    const source = await exportBackup(PASS);
    const sourceSummary = await inspectBackup(source, PASS);

    expect(sourceSummary.version).toBe(2);
    for (const count of Object.values(sourceSummary.tableCounts)) expect(count).toBe(1);

    // Simulasikan data lokal baru agar cadangan pre-restore juga diuji.
    await db.students.add({
      id: "student-local", name: "Data lokal", level: "MYP", subjects: [],
      parentContact: { phone: "0800" }, hourlyRate: 1, active: true, enrolledAt: "2026-07-20",
    });

    let preRestoreBlob: Blob | undefined;
    const result = await importBackup(source, PASS, {
      onPreRestoreBackup: ({ blob }) => { preRestoreBlob = blob; },
    });

    expect(result.restored).toEqual(sourceSummary);
    expect(preRestoreBlob).toBeInstanceOf(Blob);
    await expect(inspectBackup(preRestoreBlob!, PASS)).resolves.toMatchObject({
      tableCounts: { students: 2 },
    });
    await expect(db.students.count()).resolves.toBe(1);
    await expect(db.sessions.count()).resolves.toBe(1);
    await expect(db.reports.count()).resolves.toBe(1);
    await expect(db.payments.count()).resolves.toBe(1);
    await expect(db.settings.count()).resolves.toBe(1);
    await expect(db.raporGrades.count()).resolves.toBe(1);
    await expect(db.followUps.count()).resolves.toBe(1);
    await expect(db.expenses.count()).resolves.toBe(1);
    await expect(db.iaeeProjects.count()).resolves.toBe(1);
    await expect(db.studyNotes.count()).resolves.toBe(1);

    await expect((await db.students.get("student-1"))!.photo!.text()).resolves.toBe("student-photo");
    await expect((await db.sessions.get("session-1"))!.photo!.text()).resolves.toBe("session-photo");
    await expect((await db.sessions.get("session-1"))!.signature!.text()).resolves.toBe("signature");
    const restoredSettings = await db.settings.get("app");
    await expect(restoredSettings!.logo!.text()).resolves.toBe("tutor-logo");
    expect(restoredSettings!.lastBackupAt).toBe(sourceSummary.exportedAt);

    // auditLog adalah riwayat perangkat ini dan sengaja tidak diganti restore.
    await expect(db.auditLog.count()).resolves.toBe(1);
  }, 30_000);

  it("rejects incomplete v2 data before changing current records", async () => {
    await seedEveryBackupTable();
    const malformed = await encryptJson({
      version: 2,
      exportedAt: "2026-07-20T08:00:00.000Z",
      schema: { databaseVersion: 9, tableCounts: { students: 1 } },
      data: { students: [{ id: "student-malformed" }] },
    }, PASS);

    await expect(importBackup(malformed, PASS, { onPreRestoreBackup: () => undefined }))
      .rejects.toThrow("File backup tidak lengkap");
    await expect(db.students.count()).resolves.toBe(1);
    await expect(db.sessions.count()).resolves.toBe(1);
  }, 30_000);

  it("accepts v1 payloads that predate newer domain tables", async () => {
    await seedEveryBackupTable();
    const legacy = await encryptJson({
      version: 1,
      exportedAt: "2025-12-31T00:00:00.000Z",
      data: {
        students: [{ id: "student-legacy", name: "Data Lama", level: "MYP", subjects: [], parentContact: { phone: "0800" }, hourlyRate: 1, active: true, enrolledAt: "2025-01-01" }],
        sessions: [],
        reports: [],
        payments: [],
        settings: [{ id: "app", tutorProfile: { name: "Tutor Lama", phone: "0800" }, defaultRate: 1, paymentInfo: "", subjects: [], ai: { enabled: false, model: "legacy" }, templatePref: {} }],
      },
    }, PASS);

    await importBackup(legacy, PASS, { onPreRestoreBackup: () => undefined });
    await expect(db.students.get("student-legacy")).resolves.toMatchObject({ name: "Data Lama" });
    await expect(db.expenses.count()).resolves.toBe(0);
    await expect(db.settings.get("app")).resolves.toMatchObject({ lastBackupAt: "2025-12-31T00:00:00.000Z" });
  }, 30_000);

  it("migrates v1 monthly reports and links their legacy payments before restore", async () => {
    const reportId = "report-v1-legacy";
    const legacy = await encryptJson({
      version: 1,
      exportedAt: "2026-01-02T03:04:05.000Z",
      data: {
        students: [{ id: "student-v1", name: "Vina", level: "MYP", subjects: [], parentContact: { phone: "0800" }, hourlyRate: 410_000, active: true, enrolledAt: "2025-01-01" }],
        sessions: [],
        reports: [{
          id: reportId, studentId: "student-v1", month: "2025-11", sessionIds: [],
          templateKey: { themeId: "blue", layoutId: "cards" }, summaryText: "Laporan lama",
          totalHours: 2, totalCost: 410_000, createdAt: "2025-12-01T00:00:00.000Z",
        }],
        payments: [{
          id: "payment-v1-legacy", studentId: "student-v1", month: "2025-11",
          totalCost: 399_000, status: "PAID", source: "manual",
          paidAt: "2025-12-02", method: "transfer",
        }],
        settings: [{ id: "app", tutorProfile: { name: "Tutor Lama", phone: "0800" }, defaultRate: 1, paymentInfo: "", subjects: [], ai: { enabled: false, model: "legacy" }, templatePref: {} }],
      },
    }, PASS);

    await importBackup(legacy, PASS, { onPreRestoreBackup: () => undefined });

    const { findReportByPeriod, getPaymentByReport, listOverlappingReports } = await import("../db/repos");
    const report = await findReportByPeriod("student-v1", "2025-11-01", "2025-11-30");
    expect(report).toMatchObject({ id: reportId, status: "confirmed" });
    await expect(listOverlappingReports("student-v1", "2025-11-15", "2025-12-01"))
      .resolves.toEqual([expect.objectContaining({ id: reportId })]);
    await expect(getPaymentByReport(reportId)).resolves.toMatchObject({
      id: "payment-v1-legacy",
      reportId,
      periodStart: "2025-11-01",
      periodEnd: "2025-11-30",
      totalCost: 399_000,
      status: "PAID",
      source: "manual",
      paidAt: "2025-12-02",
      method: "transfer",
    });
  }, 30_000);

  it("migrates v2 backups exported from a database older than v11", async () => {
    const data = Object.fromEntries(BACKUP_TABLES.map((table) => [table, []])) as Record<string, Record<string, unknown>[]>;
    data.students = [{ id: "student-v2", name: "Bimo", level: "IBDP", subjects: [], parentContact: { phone: "0800" }, hourlyRate: 500_000, active: true, enrolledAt: "2024-01-01" }];
    data.reports = [{
      id: "report-v2-legacy", studentId: "student-v2", month: "2024-02", sessionIds: [],
      templateKey: { themeId: "blue", layoutId: "cards" }, summaryText: "Sebelum v11",
      totalHours: 1, totalCost: 500_000, createdAt: "2024-03-01T00:00:00.000Z",
    }];
    data.payments = [{
      id: "payment-v2-legacy", studentId: "student-v2", month: "2024-02",
      totalCost: 500_000, status: "UNPAID", source: "auto",
    }];
    data.settings = [{ id: "app", tutorProfile: { name: "Tutor Lama", phone: "0800" }, defaultRate: 1, paymentInfo: "", subjects: [], ai: { enabled: false, model: "legacy" }, templatePref: {} }];
    const tableCounts = Object.fromEntries(BACKUP_TABLES.map((table) => [table, data[table].length]));
    const legacy = await encryptJson({
      version: 2,
      exportedAt: "2024-03-02T00:00:00.000Z",
      schema: { databaseVersion: 10, tableCounts },
      data,
    }, PASS);

    await importBackup(legacy, PASS, { onPreRestoreBackup: () => undefined });

    const { findReportByPeriod, getPaymentByReport, listOverlappingReports } = await import("../db/repos");
    const restoredReport = await findReportByPeriod("student-v2", "2024-02-01", "2024-02-29");
    expect(restoredReport).toMatchObject({ id: "report-v2-legacy" });
    expect(restoredReport?.status).toBeUndefined();
    await expect(listOverlappingReports("student-v2", "2024-02-29", "2024-02-29"))
      .resolves.toEqual([]);
    await expect(getPaymentByReport("report-v2-legacy")).resolves.toMatchObject({
      id: "payment-v2-legacy",
      reportId: "report-v2-legacy",
      periodStart: "2024-02-01",
      periodEnd: "2024-02-29",
      totalCost: 500_000,
      status: "UNPAID",
      source: "auto",
    });
  }, 30_000);

  it("materializes legacy payment due dates during restore without overwriting an explicit deadline", async () => {
    const data = Object.fromEntries(BACKUP_TABLES.map((table) => [table, []])) as Record<string, Record<string, unknown>[]>;
    data.payments = [
      {
        id: "payment-period-end", studentId: "student-period-end", month: "2026-06",
        totalCost: 300_000, status: "UNPAID", periodEnd: "2026-06-18",
      },
      {
        id: "payment-month-end", studentId: "student-month-end", month: "2024-02",
        totalCost: 400_000, status: "UNPAID",
      },
      {
        id: "payment-explicit-due", studentId: "student-explicit-due", month: "2026-06",
        totalCost: 500_000, status: "UNPAID", periodEnd: "2026-06-30", dueAt: "2026-07-07",
      },
    ];
    const tableCounts = Object.fromEntries(BACKUP_TABLES.map((table) => [table, data[table].length]));
    const legacy = await encryptJson({
      version: 2,
      exportedAt: "2026-07-20T08:00:00.000Z",
      schema: { databaseVersion: 12, tableCounts },
      data,
    }, PASS);

    await importBackup(legacy, PASS, { onPreRestoreBackup: () => undefined });

    await expect(db.payments.get("payment-period-end")).resolves.toMatchObject({ dueAt: "2026-06-18" });
    await expect(db.payments.get("payment-month-end")).resolves.toMatchObject({ dueAt: "2024-02-29" });
    await expect(db.payments.get("payment-explicit-due")).resolves.toMatchObject({ dueAt: "2026-07-07" });
  }, 30_000);
});
