import Dexie from "dexie";
import type { Table } from "dexie";
import type { Student, Session, MonthlyReport, Payment, Settings, RaporGrade, Homework, FollowUpItem, Expense, IaEeProject, MonthClosing, AuditEntry, SwBackupConfig } from "./types";

type LegacySessionRow = {
  subject?: unknown;
  subjects?: unknown;
};

export class JurnalDB extends Dexie {
  students!:    Table<Student,       string>;
  sessions!:    Table<Session,       string>;
  reports!:     Table<MonthlyReport, string>;
  payments!:    Table<Payment,       string>;
  settings!:    Table<Settings,      string>;
  raporGrades!: Table<RaporGrade,    string>;
  homeworks!:   Table<Homework,      string>;
  followUps!:   Table<FollowUpItem,  string>;
  expenses!:    Table<Expense,       string>;
  iaeeProjects!:Table<IaEeProject,   string>;
  monthClosings!:Table<MonthClosing, string>;
  auditLog!:    Table<AuditEntry,    string>;
  swConfig!:    Table<SwBackupConfig, string>;

  constructor() {
    super("jurnalles");
    this.version(2).stores({
      students: "id, name, level, active",
      sessions: "id, studentId, date, status, createdAt, [studentId+date]",
      reports:  "id, studentId, month, [studentId+month]",
      payments: "id, [studentId+month], status",
      settings: "id",
    });
    this.version(3).stores({
      payments: "id, studentId, [studentId+month], status",
    });
    // v4: migrate sessions.subject (string) → sessions.subjects (string[])
    this.version(4).upgrade((tx) =>
      tx.table("sessions").toCollection().modify((s: LegacySessionRow) => {
        if (typeof s.subject === "string" && !Array.isArray(s.subjects)) {
          s.subjects = [s.subject];
          delete s.subject;
        }
      })
    );
    // v5: add raporGrades table
    this.version(5).stores({
      raporGrades: "id, studentId, semester, [studentId+semester]",
    });
    // v6: add homework and follow-up tables
    this.version(6).stores({
      homeworks: "id, studentId, assignedAt, status, dueAt, [studentId+status]",
      followUps: "id, studentId, completedAt",
    });
    // v7: add expenses and IA/EE project tables
    this.version(7).stores({
      expenses:     "id, date, category",
      iaeeProjects: "id, studentId, type",
    });
    // v8: add month-closing table (Tutup Bulan workflow)
    this.version(8).stores({
      monthClosings: "id, month",
    });
    // v9: add audit-log table (riwayat aktivitas penting — lokal, tak ikut backup/restore)
    this.version(9).stores({
      auditLog: "id, timestamp, entityType",
    });
    // v10: konfigurasi backup background untuk Service Worker (lokal, tak ikut backup)
    this.version(10).stores({
      swConfig: "id",
    });
  }
}

export const db = new JurnalDB();
