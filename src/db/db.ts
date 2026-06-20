import Dexie from "dexie";
import type { Table } from "dexie";
import type { Student, Session, MonthlyReport, Payment, Settings } from "./types";

export class JurnalDB extends Dexie {
  students!: Table<Student, string>;
  sessions!: Table<Session, string>;
  reports!: Table<MonthlyReport, string>;
  payments!: Table<Payment, string>;
  settings!: Table<Settings, string>;

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
      tx.table("sessions").toCollection().modify((s: any) => {
        if (typeof s.subject === "string" && !Array.isArray(s.subjects)) {
          s.subjects = [s.subject];
          delete s.subject;
        }
      })
    );
  }
}

export const db = new JurnalDB();
