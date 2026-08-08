// ── Monthly Reports Repository ─────────────────────────────────────

import { db } from "../db";
import type { MonthlyReport, ReportStatus } from "../types";
import { reportStatus } from "../types";
import { timestamp } from "./helpers";

/** Laporan lama (tanpa periode) dianggap satu bulan kalender penuh. */
export function reportPeriodOf(report: { month: string; periodStart?: string; periodEnd?: string }): { periodStart: string; periodEnd: string } {
  if (report.periodStart && report.periodEnd) {
    return { periodStart: report.periodStart, periodEnd: report.periodEnd };
  }
  const lastDay = new Date(+report.month.slice(0, 4), +report.month.slice(5, 7), 0).getDate();
  return { periodStart: `${report.month}-01`, periodEnd: `${report.month}-${String(lastDay).padStart(2, "0")}` };
}

export async function getReport(
  studentId: string, month: string
): Promise<MonthlyReport | undefined> {
  return db.reports
    .where({ studentId, month })
    .first();
}

/** Cari laporan dengan periode yang PERSIS sama (basis identitas laporan periode). */
export async function findReportByPeriod(
  studentId: string, periodStart: string, periodEnd: string
): Promise<MonthlyReport | undefined> {
  const reports = await listReportsByStudent(studentId);
  return reports.find((r) => r.periodStart === periodStart && r.periodEnd === periodEnd);
}

/** Laporan murid YANG SUDAH SAH yang periodenya BERTUMPUK dengan [start, end] —
 *  draft tidak mengunci tanggal. */
export async function listOverlappingReports(
  studentId: string, start: string, end: string, excludeId?: string
): Promise<MonthlyReport[]> {
  const reports = await listConfirmedReportsByStudent(studentId);
  return reports.filter(
    (r) => r.id !== excludeId && r.periodStart <= end && r.periodEnd >= start
  );
}

/** Laporan murid yang sudah disahkan (bukan draft). */
export async function listConfirmedReportsByStudent(studentId: string): Promise<MonthlyReport[]> {
  return db.reports
    .where({ studentId })
    .filter((r) => reportStatus(r) === "confirmed")
    .sortBy("createdAt");
}

/** Hapus laporan draft — tanggal & sesi kembali bebas. */
export async function discardReport(id: string): Promise<void> {
  await db.reports.delete(id);
}

/** Sahkan laporan draft → kunci tanggal + terbitkan tagihan (dipanggil terpisah). */
export async function confirmReport(id: string): Promise<void> {
  await db.reports.update(id, { status: "confirmed" as ReportStatus });
}

export async function upsertReport(
  report: Omit<MonthlyReport, "createdAt" | "periodStart" | "periodEnd">
    & Partial<Pick<MonthlyReport, "periodStart" | "periodEnd">>
    & { createdAt?: string }
): Promise<string> {
  const now = timestamp();
  const period = reportPeriodOf(report);
  const normalized = { ...report, ...period };
  return db.transaction("rw", db.reports, async () => {
    if (normalized.id) {
      const existing = await db.reports.get(normalized.id);
      if (existing) {
        await db.reports.update(existing.id, { ...normalized, createdAt: existing.createdAt });
        return existing.id;
      }
    }
    const id = normalized.id ?? crypto.randomUUID();
    await db.reports.add({ ...normalized, id, createdAt: normalized.createdAt ?? now });
    return id;
  });
}

export async function listReportsByStudent(studentId: string): Promise<MonthlyReport[]> {
  return db.reports
    .where({ studentId })
    .sortBy("createdAt");
}

export async function listAllReports(): Promise<MonthlyReport[]> {
  return db.reports.toArray();
}
