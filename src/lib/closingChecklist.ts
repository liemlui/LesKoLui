/**
 * Pre-flight checklist "Tutup Bulan" — pengaman atas pitfall yang selama ini
 * hanya dijaga lewat dokumentasi (PANDUAN-TAGIHAN.md §3): bulan yang sudah
 * ditutup tidak bisa dimasukkan ke laporan rentang baru, dan draft laporan
 * sebaiknya disahkan sebelum tutup agar tidak tertimpa.
 *
 * Helper murni (tanpa IndexedDB/React) agar mudah dites.
 */
import type { MonthlyReport, Payment, Session, Student } from "../db/types";
import { billingPolicyOf, reportStatus } from "../db/types";

export interface ClosingChecklistResult {
  /** Laporan draft bulan ini yang belum disahkan (harus diselesaikan dulu). */
  draftReports: MonthlyReport[];
  /** Tagihan bulan-bulan sebelumnya yang belum lunas (piutang carry-over). */
  carryOverUnpaid: Payment[];
  carryOverTotal: number;
  /** Murid non-bulanan dengan sesi billable yang TIDAK otomatis masuk tutup
   *  bulan (siklus Manual/Paket), sehingga perlu ditangani lewat jalur lain. */
  studentsOutsideClosing: Student[];
  /** Aman ditutup = tidak ada draft laporan yang menggantung. */
  safe: boolean;
  /** Pesan ringkas untuk tampilan UI. */
  warnings: string[];
}

export interface ClosingChecklistInput {
  /** YYYY-MM bulan yang akan ditutup. */
  month: string;
  reports: MonthlyReport[];
  /** Sesi billable pada bulan terpilih (hasil listBillableSessionsForMonth). */
  sessions: Session[];
  payments: Payment[];
  students: Student[];
}

export function buildClosingChecklist({
  month,
  reports,
  sessions,
  payments,
  students,
}: ClosingChecklistInput): ClosingChecklistResult {
  const monthReports = reports.filter((report) => report.month === month);
  const draftReports = monthReports.filter((report) => reportStatus(report) === "draft");

  const carryOverUnpaid = payments
    .filter((payment) => payment.status === "UNPAID" && payment.month < month)
    .sort((a, b) => a.month.localeCompare(b.month));
  const carryOverTotal = carryOverUnpaid.reduce((sum, payment) => sum + payment.totalCost, 0);

  // Sesi billable per murid untuk bulan ini.
  const sessionsByStudent = new Map<string, Session[]>();
  for (const session of sessions) {
    const list = sessionsByStudent.get(session.studentId);
    if (list) list.push(session);
    else sessionsByStudent.set(session.studentId, [session]);
  }
  // Murid dengan laporan confirmed bulan ini sudah "diurus" tutup bulan.
  const confirmedStudentIds = new Set(
    monthReports.filter((report) => reportStatus(report) === "confirmed").map((report) => report.studentId),
  );
  const studentsOutsideClosing = students.filter((student) =>
    billingPolicyOf(student) !== "monthly"
    && (sessionsByStudent.get(student.id)?.length ?? 0) > 0
    && !confirmedStudentIds.has(student.id)
  );

  const warnings: string[] = [];
  if (draftReports.length > 0) {
    warnings.push(`${draftReports.length} laporan draft bulan ini belum disahkan. Sahkan dulu agar tidak tertimpa saat tutup.`);
  }
  if (studentsOutsideClosing.length > 0) {
    warnings.push(`${studentsOutsideClosing.length} murid non-bulanan punya sesi yang tidak masuk tutup bulan. Tangani lewat jalur Manual/Paket.`);
  }
  if (carryOverUnpaid.length > 0) {
    warnings.push(`${carryOverUnpaid.length} tagihan bulan sebelumnya belum lunas (${carryOverTotal.toLocaleString("id-ID")} IDR).`);
  }

  return {
    draftReports,
    carryOverUnpaid,
    carryOverTotal,
    studentsOutsideClosing,
    safe: draftReports.length === 0,
    warnings,
  };
}
