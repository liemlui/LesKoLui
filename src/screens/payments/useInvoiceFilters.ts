/**
 * Hook filter + derived rows daftar tagihan — diekstraksi dari TagihanTab.tsx.
 *
 * Semua perhitungan turunan dibungkus useMemo (sebelumnya dihitung ulang pada
 * setiap render). Fungsi murni presentasi diimpor dari lib/invoicePresentation.
 */
import { useMemo, useState } from "react";
import type { MonthlyReport, Payment, Session, Settings, Student } from "../../db/types";
import { reportStatus } from "../../db/types";
import { compareSessionsChronologically } from "../../db/repos";
import { periodLabel, monthLabel } from "../../lib/format";
import { ageBucket, invoiceAgeDays } from "../../lib/finance";
import type { AgeBucket } from "../../lib/finance";
import { buildBillingMessage, toWaNumber } from "../../lib/waBilling";
import {
  buildManualBillingText, groupPdfPages, invoiceOriginOf, toneForPayment,
} from "../../lib/invoicePresentation";
import type { InvoiceOriginFilter as OriginFilter } from "../../lib/invoicePresentation";

export type InvoiceStatusFilter = "semua" | "ready" | "unpaid" | "paid";
export type InvoiceOriginFilter = OriginFilter;

export interface BillRow {
  payment: Payment;
  report: MonthlyReport | undefined;
  student: Student | undefined;
  sessions: Session[];
}

export interface WaAllRow {
  payment: Payment;
  student: Student;
  phone: string;
  url: string;
  label: string;
}

interface UseInvoiceFiltersArgs {
  payments: Payment[];
  students: Student[];
  reports: MonthlyReport[];
  /** Semua sesi billable lintas bulan — resolusi invoice legacy non-laporan. */
  allBillableSessions: Session[] | undefined;
  settings: Settings;
  allReportSessions: Map<string, Session> | undefined;
  itemsPerPdfPage?: number;
}

export function useInvoiceFilters({
  payments, students, reports, allBillableSessions, settings, allReportSessions,
  itemsPerPdfPage = 5,
}: UseInvoiceFiltersArgs) {
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<InvoiceStatusFilter>("semua");
  const [invoiceOriginFilter, setInvoiceOriginFilter] = useState<InvoiceOriginFilter>("semua");
  const [searchText, setSearchText] = useState("");


  const studentMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
  // Daftar flat lintas bulan: semua invoice ikut dihitung, bukan hanya bulan terpilih.
  const allPayments = payments;

  const totals = useMemo(() => {
    const paidPayments = allPayments.filter((p) => p.status === "PAID");
    const unpaidPayments = allPayments.filter((p) => p.status === "UNPAID");
    const totalBilled = allPayments.reduce((s, p) => s + p.totalCost, 0);
    const totalPaid = paidPayments.reduce((s, p) => s + p.totalCost, 0);
    return {
      totalBilled,
      totalPaid,
      totalUnpaid: totalBilled - totalPaid,
      paidCount: paidPayments.length,
      unpaidCount: unpaidPayments.length,
      collectionRate: totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0,
    };
  }, [allPayments]);

  // Distribusi umur piutang lintas bulan (0-30 / 31-60 / >60 hari).
  const agingBuckets = useMemo(() => {
    const buckets: Record<AgeBucket, number> = { "0-30": 0, "31-60": 0, ">60": 0 };
    for (const p of allPayments) {
      if (p.status !== "UNPAID") continue;
      buckets[ageBucket(invoiceAgeDays(p))]++;
    }
    return buckets;
  }, [allPayments]);

  const billRows = useMemo<BillRow[]>(() => allPayments
    .map((p) => {
      const linkedReport = p.reportId ? reports.find((report) => report.id === p.reportId) : undefined;
      return {
        payment: p,
        report: linkedReport,
        student: studentMap.get(p.studentId),
        sessions: linkedReport
          ? linkedReport.sessionIds
              .map((id) => allReportSessions?.get(id))
              .filter((s): s is Session => Boolean(s))
          : p.source === "manual"
            ? []
            : (allBillableSessions ?? [])
                .filter((s) => s.studentId === p.studentId && s.date.slice(0, 7) === p.month)
                .sort(compareSessionsChronologically),
      };
    })
    .sort((a, b) => b.payment.totalCost - a.payment.totalCost),
  [allPayments, reports, studentMap, allReportSessions, allBillableSessions]);

  const filteredBillRows = useMemo(() => billRows.filter((row) => {
    const statusMatches = invoiceStatusFilter === "semua"
      ? true
      : invoiceStatusFilter === "ready"
        ? false
        : invoiceStatusFilter === "paid"
          ? row.payment.status === "PAID"
          : row.payment.status === "UNPAID";
    const originMatches = invoiceOriginFilter === "semua"
      || invoiceOriginOf(row.payment, row.report) === invoiceOriginFilter;
    const query = searchText.trim().toLowerCase();
    const searchMatches = query === ""
      || (row.student?.name ?? "").toLowerCase().includes(query);
    return statusMatches && originMatches && searchMatches;
  }), [billRows, invoiceStatusFilter, invoiceOriginFilter, searchText]);

  const filteredPayments = useMemo(
    () => filteredBillRows.map((row) => row.payment),
    [filteredBillRows],
  );
  const pdfPageGroups = useMemo(
    () => groupPdfPages(filteredPayments, itemsPerPdfPage),
    [filteredPayments, itemsPerPdfPage],
  );

  // Laporan final siap ditagih (belum punya invoice) — lintas bulan, terlama dulu.
  const readyReportRows = useMemo(() => reports
    .filter((report) => (
      reportStatus(report) === "confirmed"
      && report.totalCost > 0
      && report.billingMode !== "session_count"
      && !payments.some((payment) => payment.reportId === report.id)
    ))
    .map((report) => ({ report, student: studentMap.get(report.studentId) }))
    .sort((a, b) => a.report.periodStart.localeCompare(b.report.periodStart)),
  [reports, payments, studentMap]);

  const showReadySections = invoiceStatusFilter === "semua" || invoiceStatusFilter === "ready";
  const showIssuedList = invoiceStatusFilter !== "ready";

  // ── Daftar Tagihan WA (semua unpaid dengan nomor HP tercatat) ──
  const waAllRows = useMemo<WaAllRow[]>(() => payments
    .filter((p) => p.status === "UNPAID")
    .map((p) => {
      const student = studentMap.get(p.studentId);
      if (!student) return null;
      const phone = student.parentContact?.phone ? toWaNumber(student.parentContact.phone) : "";
      if (!phone) return null;
      const report = p.reportId ? reports.find((r) => r.id === p.reportId) : undefined;
      const sessions = report
        ? report.sessionIds.map((id) => allReportSessions?.get(id)).filter((s): s is Session => Boolean(s))
        : p.source === "manual"
          ? []
          : (allBillableSessions ?? [])
              .filter((s) => s.studentId === p.studentId && s.date.slice(0, 7) === p.month)
              .sort(compareSessionsChronologically);
      const periodLbl = p.periodStart && p.periodEnd ? periodLabel(p.periodStart, p.periodEnd) : "";
      const text = p.source === "manual" && !p.reportId
        ? buildManualBillingText(student, p, settings)
        : buildBillingMessage({
            student,
            sessions,
            month: p.month,
            settings,
            amountOverride: p.totalCost,
            period: p.periodStart && p.periodEnd ? { start: p.periodStart, end: p.periodEnd } : undefined,
            periodLabelText: periodLbl || undefined,
            tone: toneForPayment(p),
          }).text;
      return {
        payment: p,
        student,
        phone,
        url: `https://wa.me/${phone}?text=${encodeURIComponent(text)}`,
        label: `${student.name} · ${periodLbl || monthLabel(p.month)}`,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null),
  [payments, studentMap, reports, allReportSessions, allBillableSessions, settings]);

  return {
    // filter state
    invoiceStatusFilter,
    setInvoiceStatusFilter,
    invoiceOriginFilter,
    setInvoiceOriginFilter,
    searchText,
    setSearchText,
    // derived
    studentMap,
    allPayments,
    totals,
    agingBuckets,
    billRows,
    filteredBillRows,
    filteredPayments,
    pdfPageGroups,
    readyReportRows,
    showReadySections,
    showIssuedList,
    waAllRows,
  };
}
