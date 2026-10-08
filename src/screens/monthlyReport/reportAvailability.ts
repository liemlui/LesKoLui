/**
 * Aturan "periode ini boleh dibuatkan laporan atau tidak" — dipisah dari
 * MonthlyReport.tsx pada refactor terbatas G3-05, dan sengaja dibuat sebagai
 * fungsi murni supaya alasannya bisa diuji tanpa merender layar.
 *
 * Setiap alasan yang dikembalikan sudah memuat **langkah berikutnya** (butir 4
 * G3-05): tutor tidak pernah melihat "tidak bisa" tanpa tahu harus berbuat apa.
 */

import { reportBlocksSiblingScope } from "../../db/repos/helpers";
import { findBlockingReportOverlap } from "../../lib/reportSessionScope";
import { billingPolicyOf, reportStatus } from "../../db/types";
import { dayLabel, periodLabel } from "../../lib/format";
import type { MonthlyReport, Student } from "../../db/types";
import type { RecapMode } from "./helpers";

export interface ReportAvailability {
  ok: boolean;
  reason: string;
  blockingReportId?: string;
}

export interface ReportAvailabilityInput {
  studentId: string;
  periodStart: string;
  periodEnd: string;
  mode: RecapMode;
  rangeStart: string;
  rangeEnd: string;
  /** Tautan `?reportId=` menunjuk laporan yang tidak ada. */
  invalidReportLink: boolean;
  /** Semua query yang dibutuhkan cakupan ini sudah selesai dimuat. */
  dataReady: boolean;
  report?: MonthlyReport;
  scopeHasProtectedInvoice: boolean;
  reportSessionsCount: number;
  reportTargetCount: number;
  reportSessionIds: readonly string[];
  student?: Student;
  blockingConfirmedReports: readonly MonthlyReport[];
  sessionWindowIds: ReadonlySet<string>;
}

export function reportAvailabilityOf(input: ReportAvailabilityInput): ReportAvailability {
  const {
    studentId, periodStart, periodEnd, mode, rangeStart, rangeEnd,
    invalidReportLink, dataReady, report, scopeHasProtectedInvoice,
    reportSessionsCount, reportTargetCount, reportSessionIds, student,
    blockingConfirmedReports, sessionWindowIds,
  } = input;

  if (!studentId || !periodStart || !periodEnd) return { ok: false, reason: "" };
  if (invalidReportLink) {
    return { ok: false, reason: "Tautan laporan tidak ditemukan. Buka “Laporan tersimpan” untuk memilih laporan lain." };
  }
  if (!dataReady) {
    return { ok: false, reason: "Data laporan masih dimuat. Tunggu sebentar, lalu coba lagi." };
  }
  if (mode === "range" && rangeStart > rangeEnd) {
    return { ok: false, reason: "Tanggal awal harus lebih dulu dari tanggal akhir." };
  }
  // Laporan yang tagihannya sudah lunas / diedit manual membekukan snapshotnya
  // (D6). Menggeser tanggalnya berarti tanggal tercetak di laporan tidak lagi
  // cocok dengan sesi yang sudah ditagih — jadi perubahan rentang ditolak
  // dengan jalur perbaikannya, bukan diam-diam diabaikan.
  if (
    report
    && reportStatus(report) === "confirmed"
    && scopeHasProtectedInvoice
    && (periodStart !== report.periodStart || periodEnd !== report.periodEnd)
  ) {
    return {
      ok: false,
      reason: "Rentang tanggal laporan ini terkunci karena tagihannya sudah lunas atau nominalnya diedit manual. Batalkan tagihan itu di Keuangan (belum lunas), atau buka kunci laporan lewat tombol di bawah, sebelum menggeser tanggal.",
    };
  }
  // Paket (session_count) beridentitas per-snapshot sesi, bukan rentang tanggal,
  // sehingga cek tumpang-tindih kalender dan bulan tertutup dilewati. Laporan
  // "jumlah" untuk murid bulanan/manual tetap laporan periode biasa.
  const sessionCountCycle = mode === "jumlah"
    && ((student && billingPolicyOf(student) === "session_count") || report?.billingMode === "session_count");
  if (sessionCountCycle && reportSessionsCount !== reportTargetCount) {
    return {
      ok: false,
      reason: `Paket harus berisi tepat ${reportTargetCount} pertemuan. Saat ini tersedia ${reportSessionsCount}/${reportTargetCount}.`,
    };
  }
  if (
    student
    && billingPolicyOf(student) === "session_count"
    && (
      !report
      || reportStatus(report) !== "confirmed"
      || (
        report.billingMode !== "session_count"
        && (
          report.sessionIds.length !== reportSessionIds.length
          || report.sessionIds.some((id) => !reportSessionIds.includes(id))
        )
      )
    )
  ) {
    return {
      ok: false,
      reason: mode === "jumlah"
        ? "Paket pertemuan diterbitkan dari Keuangan agar kuota dan invoice dikunci dalam satu transaksi."
        : "Murid ini memakai paket pertemuan. Buat tagihannya dari Keuangan agar sesi tidak keluar dari antrean paket.",
    };
  }
  if (
    mode === "jumlah"
    && student
    && billingPolicyOf(student) === "session_count"
    && report
    && reportStatus(report) === "confirmed"
    && report.billingMode !== "session_count"
  ) {
    return {
      ok: false,
      reason: "Laporan non-paket lama tidak dapat diubah menjadi tagihan paket. Gunakan antrean Keuangan.",
    };
  }
  const overlap = sessionCountCycle ? undefined : findBlockingReportOverlap(
    blockingConfirmedReports,
    periodStart,
    periodEnd,
    report ? {
      id: report.id,
      supplementalForReportId: report.supplementalForReportId,
    } : undefined,
    reportSessionIds,
    // Kunci periode mengikuti sesi: laporan lama berentang lebar tidak lagi
    // memblokir bulan yang sesinya belum pernah direkap (keluhan Marcia:
    // "tanggal 1 September sudah direkap" padahal rekap itu bukan September).
    sessionWindowIds,
  );
  if (overlap) {
    return {
      ok: false,
      reason: `Sesi di periode ini sudah pernah direkap oleh laporan ${periodLabel(overlap.periodStart, overlap.periodEnd)} (dibuat ${dayLabel(overlap.createdAt.slice(0, 10))}). Buka laporan itu di “📚 Laporan tersimpan” untuk melihat/memperbaikinya, atau pilih periode lain.`,
      blockingReportId: overlap.id,
    };
  }
  return { ok: true, reason: "" };
}

/** Dipakai pemanggil untuk menyaring laporan yang benar-benar mengunci cakupan. */
export function blocksSiblingScopeOf(
  candidate: MonthlyReport,
  protectedReportIds: ReadonlySet<string>,
  invoiceReportIds: ReadonlySet<string>,
): boolean {
  return candidate.billingMode === "session_count"
    ? candidate.status === "confirmed" || invoiceReportIds.has(candidate.id)
    : reportBlocksSiblingScope(candidate, protectedReportIds.has(candidate.id));
}
