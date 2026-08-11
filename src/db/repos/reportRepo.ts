// ── Monthly Reports Repository ─────────────────────────────────────

import { db } from "../db";
import type { MonthlyReport, ReportStatus } from "../types";
import { reportStatus } from "../types";
import { timestamp } from "./helpers";

export type ReportWrite = Omit<MonthlyReport, "createdAt" | "periodStart" | "periodEnd">
  & Partial<Pick<MonthlyReport, "periodStart" | "periodEnd">>
  & { createdAt?: string };

function compareReportIdentity(a: MonthlyReport, b: MonthlyReport): number {
  // A regular report is the canonical period lookup. Supplemental reports are
  // addressable by id and must never hijack an ordinary full/range selection.
  const kind = Number(Boolean(a.supplementalForReportId)) - Number(Boolean(b.supplementalForReportId));
  return kind || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
}

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
  const reports = await db.reports
    .where({ studentId, month })
    .toArray();
  return reports.sort(compareReportIdentity)[0];
}

/** Stable report identity for deep-links and supplemental invoice editing. */
export async function getReportById(id: string): Promise<MonthlyReport | undefined> {
  return db.reports.get(id);
}

/** Cari laporan reguler dengan periode persis; supplemental memakai identity id. */
export async function findReportByPeriod(
  studentId: string, periodStart: string, periodEnd: string
): Promise<MonthlyReport | undefined> {
  const reports = await listReportsByStudent(studentId);
  return reports
    .filter((r) =>
      !r.supplementalForReportId
      && r.periodStart === periodStart
      && r.periodEnd === periodEnd
    )
    .sort(compareReportIdentity)[0];
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
  const report = await db.reports.get(id);
  if (!report) return;
  await upsertReport({ ...report, status: "confirmed" as ReportStatus });
}

async function assertConfirmedScopeAvailable(
  report: MonthlyReport,
  existing?: MonthlyReport,
): Promise<void> {
  if (reportStatus(report) !== "confirmed") return;
  const scopeUnchanged = existing
    && reportPeriodOf(existing).periodStart === report.periodStart
    && reportPeriodOf(existing).periodEnd === report.periodEnd;
  // Preserve editability of already-confirmed legacy collisions without
  // allowing a draft to bypass the guard merely because its own dates match.
  if (scopeUnchanged && existing && reportStatus(existing) === "confirmed") return;

  const candidates = await db.reports
    .where({ studentId: report.studentId })
    .filter((candidate) => reportStatus(candidate) === "confirmed")
    .toArray();
  const overlap = candidates.find((candidate) => {
    if (candidate.id === report.id) return false;
    // Parent ↔ child edits are one accounting family. Siblings remain blocked.
    if (candidate.supplementalForReportId === report.id) return false;
    if (report.supplementalForReportId === candidate.id) return false;
    const period = reportPeriodOf(candidate);
    return period.periodStart <= report.periodEnd && period.periodEnd >= report.periodStart;
  });
  if (overlap) {
    throw new Error("Periode laporan bertumpuk dengan laporan sah lain");
  }

  const closings = await db.monthClosings.toArray();
  const closed = closings.find((closing) => {
    const period = reportPeriodOf({ month: closing.month });
    return period.periodStart <= report.periodEnd && period.periodEnd >= report.periodStart;
  });
  if (closed) throw new Error("Periode laporan berada pada bulan yang sudah ditutup");
}

/** Save one report identity and enforce confirmed-scope invariants atomically. */
export async function upsertReport(report: ReportWrite): Promise<string> {
  const now = timestamp();
  const period = reportPeriodOf(report);
  const normalized = { ...report, ...period } as MonthlyReport;
  return db.transaction("rw", db.reports, db.monthClosings, async () => {
    if (normalized.id) {
      const existing = await db.reports.get(normalized.id);
      if (existing) {
        await assertConfirmedScopeAvailable(normalized, existing);
        await db.reports.update(existing.id, { ...normalized, createdAt: existing.createdAt });
        return existing.id;
      }
    }
    const id = normalized.id ?? crypto.randomUUID();
    const created = { ...normalized, id, createdAt: normalized.createdAt ?? now };
    await assertConfirmedScopeAvailable(created);
    await db.reports.add(created);
    return id;
  });
}

/**
 * Atomically create one regular draft per exact student/period. Concurrent
 * tabs and double taps receive the same existing id instead of adding twins.
 */
export async function createReportForPeriod(
  report: ReportWrite,
): Promise<{ reportId: string; created: boolean }> {
  if (report.supplementalForReportId) {
    throw new Error("Supplemental reports must be created by the billing workflow");
  }
  const now = timestamp();
  const period = reportPeriodOf(report);
  const normalized = { ...report, ...period } as MonthlyReport;
  return db.transaction("rw", db.reports, db.monthClosings, async () => {
    const matches = await db.reports
      .where({ studentId: normalized.studentId })
      .filter((candidate) => {
        const candidatePeriod = reportPeriodOf(candidate);
        return !candidate.supplementalForReportId
          && candidatePeriod.periodStart === normalized.periodStart
          && candidatePeriod.periodEnd === normalized.periodEnd;
      })
      .toArray();
    const existing = matches.sort(compareReportIdentity)[0];
    if (existing) return { reportId: existing.id, created: false };

    const id = normalized.id ?? crypto.randomUUID();
    const created = { ...normalized, id, createdAt: normalized.createdAt ?? now };
    await assertConfirmedScopeAvailable(created);
    await db.reports.add(created);
    return { reportId: id, created: true };
  });
}

export async function listReportsByStudent(studentId: string): Promise<MonthlyReport[]> {
  const reports = await db.reports
    .where({ studentId })
    .toArray();
  return reports.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

export async function listAllReports(): Promise<MonthlyReport[]> {
  return db.reports.toArray();
}
