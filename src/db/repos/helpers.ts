// ── Shared helpers for repos ───────────────────────────────────────
// Semua helper yang dipakai lintas domain repo: WIB date, month range, timestamp.

import { reportStatus, type MonthlyReport, type Payment } from "../types";

export function monthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split("-").map(Number);
  const start = `${month}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${month}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

export function timestamp(): string {
  return new Date().toISOString();
}

export function nowTimeWIB(): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts();
  const m = Object.fromEntries(parts.filter((p) => p.type !== "literal").map((p) => [p.type, p.value]));
  return `${m.hour}:${m.minute}`;
}

export function subtractHoursFromTime(hhmm: string, hours: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const totalMin = h * 60 + m - Math.round(hours * 60);
  const norm = ((totalMin % 1440) + 1440) % 1440;
  return `${String(Math.floor(norm / 60)).padStart(2, "0")}:${String(norm % 60).padStart(2, "0")}`;
}

export function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** Report-linked payments, regardless of whether their invoice is mutable. */
export function reportIdsWithInvoice(
  payments: readonly Pick<Payment, "reportId">[],
): Set<string> {
  return new Set(
    payments.flatMap((payment) => payment.reportId ? [payment.reportId] : []),
  );
}

/**
 * Paid or manually-priced invoices freeze an ordinary report snapshot. Some
 * old payments predate `reportId`; match those only to statusless reports in
 * their own student/month, which is the sole unambiguous legacy case.
 */
export function protectedInvoiceReportIds(
  reports: readonly Pick<MonthlyReport, "id" | "studentId" | "month" | "status">[],
  payments: readonly Pick<Payment, "studentId" | "month" | "reportId" | "status" | "source">[],
): Set<string> {
  const reportIds = new Set<string>();
  const legacyInvoiceScopes = new Set<string>();
  for (const payment of payments) {
    if (payment.status !== "PAID" && payment.source !== "manual") continue;
    if (payment.reportId) reportIds.add(payment.reportId);
    else legacyInvoiceScopes.add(`${payment.studentId}|${payment.month}`);
  }
  for (const report of reports) {
    if (
      report.status === undefined
      && legacyInvoiceScopes.has(`${report.studentId}|${report.month}`)
    ) {
      reportIds.add(report.id);
    }
  }
  return reportIds;
}

/** A legacy statusless snapshot only blocks siblings once its invoice is protected. */
export function reportBlocksSiblingScope(
  report: Pick<MonthlyReport, "status">,
  hasProtectedInvoice: boolean,
): boolean {
  return report.status === "confirmed" || hasProtectedInvoice;
}

/**
 * Session-count billing has a narrower legacy rule than calendar reports.
 *
 * Reports from before the status field existed are displayed as confirmed for
 * compatibility. They only reserve package sessions when an invoice is
 * actually linked, though. Otherwise an old presentation-only report could
 * silently remove historical sessions after a student switches to a package.
 * Explicitly confirmed reports remain reserved even while their invoice is
 * being repaired by month closing.
 */
export function packageCoveredSessionIds(
  reports: readonly MonthlyReport[],
  payments: readonly Pick<Payment, "reportId">[],
): Set<string> {
  const invoiceReportIds = reportIdsWithInvoice(payments);
  return new Set(
    reports
      .filter((report) => (
        reportStatus(report) === "confirmed"
        && (report.status === "confirmed" || invoiceReportIds.has(report.id))
      ))
      .flatMap((report) => report.sessionIds),
  );
}
