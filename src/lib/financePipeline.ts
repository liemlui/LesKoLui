/**
 * Papan pipeline murid untuk Menu Keuangan — menghubungkan status
 * Sesi → Laporan → Tagihan → Lunas → Dibagikan dalam satu baris per murid.
 *
 * Helper murni (tanpa ketergantungan React / IndexedDB) agar mudah dites dan
 * dipakai ulang oleh Ringkasan Keuangan. Aksi UI-nya hidup di
 * `screens/payments/FinancePipelineBoard.tsx`.
 */
import type { MonthlyReport, Payment, Session, Student } from "../db/types";
import { reportDisplayStatus, reportStatus, type ReportDisplayStatus } from "../db/types";

export type PipelineInvoiceStatus = "none" | "unpaid" | "paid";

export type PipelineNextAction =
  | "create-report"   // ada sesi billable, belum ada laporan bulan ini
  | "confirm-report"  // ada draft laporan bulan ini (perlu disahkan)
  | "create-invoice"  // laporan final tanpa tagihan
  | "send-wa"         // ada tagihan belum dibayar → ingatkan via WA
  | "share-report"    // laporan final belum dibagikan ke orang tua
  | "mark-paid"       // tagihan sudah dibayar, tinggal dicatat lunas
  | null;             // tidak ada yang perlu dilakukan

export interface StudentPipelineRow {
  student: Student;
  /** Jumlah sesi yang dapat ditagih pada bulan terpilih. */
  sessionCount: number;
  /** Nilai potensi sesi billable bulan terpilih (IDR). */
  potential: number;
  /** Status tampilan laporan bulan ini (draft/final/shared) — null bila belum ada. */
  reportDisplayStatus: ReportDisplayStatus | null;
  /** Laporan bulan ini yang paling baru (dipakai untuk aksi cepat). */
  report?: MonthlyReport;
  /** Jumlah draft laporan bulan ini. */
  draftReportCount: number;
  hasConfirmedReport: boolean;
  invoiceStatus: PipelineInvoiceStatus;
  /** Invoice bulan ini (prioritas UNPAID — dipakai untuk aksi tandai lunas). */
  invoice?: Payment;
  unpaidCount: number;
  unpaidAmount: number;
  paidAmount: number;
  /** Aksi utama yang paling mendesak untuk murid ini. */
  nextAction: PipelineNextAction;
}

export interface BuildPipelineInput {
  students: Student[];
  /** Sesi billable pada bulan terpilih (hasil listBillableSessionsForMonth). */
  sessions: Session[];
  reports: MonthlyReport[];
  payments: Payment[];
  /** YYYY-MM bulan keuangan yang sedang dilihat. */
  month: string;
}

function groupByStudent<T extends { studentId: string }>(
  items: readonly T[],
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const list = map.get(item.studentId);
    if (list) list.push(item);
    else map.set(item.studentId, [item]);
  }
  return map;
}

/** Urutkan baris: yang butuh tindakan lebih dulu, lalu piutang terbesar, lalu nama. */
export function sortPipelineRows(rows: StudentPipelineRow[]): StudentPipelineRow[] {
  return [...rows].sort((a, b) => {
    const aNeeds = a.nextAction !== null ? 0 : 1;
    const bNeeds = b.nextAction !== null ? 0 : 1;
    if (aNeeds !== bNeeds) return aNeeds - bNeeds;
    if (b.unpaidAmount !== a.unpaidAmount) return b.unpaidAmount - a.unpaidAmount;
    return a.student.name.localeCompare(b.student.name);
  });
}

/**
 * Susun baris pipeline untuk bulan terpilih. Hanya murid aktif ATAU murid yang
 * punya aktivitas di bulan itu (murid nonaktif dengan piutang lama tetap tampil
 * agar tidak terlewat).
 */
export function buildStudentPipeline({
  students,
  sessions,
  reports,
  payments,
  month,
}: BuildPipelineInput): StudentPipelineRow[] {
  const sessionsByStudent = groupByStudent(sessions);
  const reportsByStudent = groupByStudent(reports);
  const paymentsByStudent = groupByStudent(payments);

  const rows: StudentPipelineRow[] = [];

  for (const student of students) {
    const monthSessions = (sessionsByStudent.get(student.id) ?? [])
      .filter((s) => s.date.startsWith(month));
    const monthReports = (reportsByStudent.get(student.id) ?? [])
      .filter((r) => r.month === month);
    const monthPayments = (paymentsByStudent.get(student.id) ?? [])
      .filter((p) => p.month === month);

    const hasActivity =
      monthSessions.length > 0 || monthReports.length > 0 || monthPayments.length > 0;
    if (!student.active && !hasActivity) continue;

    const sortedReports = [...monthReports].sort((a, b) =>
      (b.createdAt ?? "").localeCompare(a.createdAt ?? "")
    );
    const report = sortedReports[0];
    const draftReportCount = monthReports.filter((r) => reportStatus(r) === "draft").length;
    const hasConfirmedReport = monthReports.some((r) => reportStatus(r) === "confirmed");

    const unpaidPayments = monthPayments.filter((p) => p.status === "UNPAID");
    const paidPayments = monthPayments.filter((p) => p.status === "PAID");
    const invoice = unpaidPayments[0] ?? paidPayments[0];
    const invoiceStatus: PipelineInvoiceStatus = monthPayments.length === 0
      ? "none"
      : unpaidPayments.length > 0 ? "unpaid" : "paid";

    const sessionCount = monthSessions.length;
    const potential = monthSessions.reduce((sum, s) => sum + s.cost, 0);
    const unpaidAmount = unpaidPayments.reduce((sum, p) => sum + p.totalCost, 0);
    const paidAmount = paidPayments.reduce((sum, p) => sum + p.totalCost, 0);

    // Prioritas aksi tunggal (paling mendesak lebih dulu):
    const hasReportInvoice = Boolean(report && invoice && invoice.reportId === report.id);
    let nextAction: PipelineNextAction = null;
    if (draftReportCount > 0) {
      nextAction = "confirm-report";
    } else if (
      hasConfirmedReport
      && report
      && report.totalCost > 0
      && report.billingMode !== "session_count"
      && !hasReportInvoice
      && unpaidPayments.length === 0
    ) {
      nextAction = "create-invoice";
    } else if (unpaidPayments.length > 0) {
      nextAction = "send-wa";
    } else if (report && reportDisplayStatus(report) === "final") {
      nextAction = "share-report";
    } else if (sessionCount > 0 && !hasConfirmedReport) {
      nextAction = "create-report";
    }

    rows.push({
      student,
      sessionCount,
      potential,
      reportDisplayStatus: report ? reportDisplayStatus(report) : null,
      report,
      draftReportCount,
      hasConfirmedReport,
      invoiceStatus,
      invoice,
      unpaidCount: unpaidPayments.length,
      unpaidAmount,
      paidAmount,
      nextAction,
    });
  }

  return sortPipelineRows(rows);
}
