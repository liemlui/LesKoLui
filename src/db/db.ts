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
    this.version(1).stores({
      students: "id, name, level, active",
      sessions: "id, studentId, date, status, [studentId+date]",
      reports:  "id, studentId, month, [studentId+month]",
      payments: "id, [studentId+month], status",
      settings: "id",
    });
  }
}

export const db = new JurnalDB();
