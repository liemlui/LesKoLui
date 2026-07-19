// ── Monthly Reports Repository ─────────────────────────────────────

import { db } from "../db";
import type { MonthlyReport } from "../types";
import { timestamp } from "./helpers";

export async function getReport(
  studentId: string, month: string
): Promise<MonthlyReport | undefined> {
  return db.reports
    .where({ studentId, month })
    .first();
}

export async function upsertReport(report: Omit<MonthlyReport, "createdAt"> & { createdAt?: string }): Promise<string> {
  const now = timestamp();
  return db.transaction("rw", db.reports, async () => {
    const existing = await db.reports
      .where({ studentId: report.studentId, month: report.month })
      .first();
    if (existing) {
      await db.reports.update(existing.id, { ...report, createdAt: existing.createdAt });
      return existing.id;
    } else {
      const id = crypto.randomUUID();
      await db.reports.add({ ...report, id, createdAt: report.createdAt ?? now });
      return id;
    }
  });
}

export async function listReportsByStudent(studentId: string): Promise<MonthlyReport[]> {
  return db.reports
    .where({ studentId })
    .sortBy("createdAt");
}
