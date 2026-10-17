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

/**
 * Jejak alasan keputusan — **instrumentasi diagnosis, bukan perilaku aplikasi.**
 *
 * Kenapa ada. Sisa kegagalan `e2e` hanya muncul di suite penuh, khusus project
 * `mobile`, dan selalu di layar Laporan; tombol "Buat Laporan" tinggal **mati**
 * tanpa penjelasan yang terekam. Tanpa jejak ini, dua keadaan yang sangat
 * berbeda — **"data belum selesai dimuat"** dan **"periode ini memang tidak
 * bisa direkap"** — sama-sama terbaca sebagai "tombol tidak aktif", sehingga
 * menaikkan batas waktu tidak membedakan keduanya (dan sudah terbukti tidak
 * menyelesaikannya: 2,5 → 5 → 30 detik, tiga-tiganya gagal).
 *
 * Yang dicatat hanya **keadaan masukan yang menentukan keputusan**, dalam bentuk
 * ringkas: penanda boolean, jumlah, dan nama cabang yang menolak. Isi catatan
 * sesi, nama murid, dan nominal uang **tidak** ikut dicatat.
 *
 * Kapan aktif. Hanya di `import.meta.env.DEV` **dan** hanya bila penanda
 * `__lklTraceReport` dinyalakan — fixture `e2e` yang menyalakannya. Di build
 * produksi fungsinya tidak pernah menulis apa pun (`import.meta.env.DEV` diganti
 * `false` saat build, sehingga bloknya dibuang).
 *
 * Cara membaca. Setiap baris adalah satu **perubahan keputusan**, bukan satu
 * render, jadi jumlah barisnya kecil. `kode` menyebut cabang yang menolak:
 * `tanpa-siswa` · `tautan-laporan` · `data-belum-siap` · `rentang-terbalik` ·
 * `rentang-terkunci` · `paket-jumlah-tidak-cocok` · `paket-dari-keuangan` ·
 * `paket-lama-non-paket` · `tumpang-tindih` · `ok`.
 */
export interface ReportAvailabilityTrace {
  kode: string;
  ok: boolean;
  bisaDibuat: boolean;
  alasan: string;
  dipakai: {
    mode: RecapMode;
    periode: string;
    dataSiap: boolean;
    adaLaporan: boolean;
    statusLaporan: string;
    sesiCakupan: number;
    sesiSasaran: number;
    sesiJendela: number;
    laporanPengunci: number;
    siswaAda: boolean;
    tagihanTerlindungi: boolean;
    tautanRusak: boolean;
  };
}

/** Nama cabang penolakan — dipakai jejak, dan diuji lewat tes unit. */
export function kodeKetersediaanLaporan(
  input: ReportAvailabilityInput,
): { kode: string; ok: boolean; alasan: string } {
  const hasil = reportAvailabilityOf(input);
  if (hasil.ok) return { kode: "ok", ok: true, alasan: "" };
  // Urutannya **sama** dengan urutan cabang di `reportAvailabilityOf`; kalau
  // cabang di sana berpindah, tes yang mengunci pasangan ini akan merah.
  if (!input.studentId || !input.periodStart || !input.periodEnd) {
    return { kode: "tanpa-siswa", ok: false, alasan: hasil.reason };
  }
  if (input.invalidReportLink) return { kode: "tautan-laporan", ok: false, alasan: hasil.reason };
  if (!input.dataReady) return { kode: "data-belum-siap", ok: false, alasan: hasil.reason };
  if (input.mode === "range" && input.rangeStart > input.rangeEnd) {
    return { kode: "rentang-terbalik", ok: false, alasan: hasil.reason };
  }
  if (
    input.report
    && reportStatus(input.report) === "confirmed"
    && input.scopeHasProtectedInvoice
    && (input.periodStart !== input.report.periodStart || input.periodEnd !== input.report.periodEnd)
  ) {
    return { kode: "rentang-terkunci", ok: false, alasan: hasil.reason };
  }
  const modePaket = input.mode === "jumlah"
    && (
      (input.student !== undefined && billingPolicyOf(input.student) === "session_count")
      || input.report?.billingMode === "session_count"
    );
  if (modePaket && input.reportSessionsCount !== input.reportTargetCount) {
    return { kode: "paket-jumlah-tidak-cocok", ok: false, alasan: hasil.reason };
  }
  if (input.student && billingPolicyOf(input.student) === "session_count") {
    return { kode: "paket-dari-keuangan", ok: false, alasan: hasil.reason };
  }
  if (
    input.mode === "jumlah"
    && input.student
    && input.report?.billingMode !== "session_count"
    && input.report?.status === "confirmed"
  ) {
    return { kode: "paket-lama-non-paket", ok: false, alasan: hasil.reason };
  }
  return { kode: "tumpang-tindih", ok: false, alasan: hasil.reason };
}

/** Ringkas masukan menjadi objek kecil — tanpa nama murid dan tanpa nominal. */
export function jejakKetersediaanLaporan(input: ReportAvailabilityInput): ReportAvailabilityTrace {
  const { kode, ok, alasan } = kodeKetersediaanLaporan(input);
  return {
    kode,
    ok,
    bisaDibuat: ok && input.reportSessionsCount > 0,
    alasan,
    dipakai: {
      mode: input.mode,
      periode: `${input.periodStart}..${input.periodEnd}`,
      dataSiap: input.dataReady,
      adaLaporan: Boolean(input.report),
      statusLaporan: input.report ? reportStatus(input.report) : "(tanpa laporan)",
      sesiCakupan: input.reportSessionsCount,
      sesiSasaran: input.reportTargetCount,
      sesiJendela: input.sessionWindowIds.size,
      laporanPengunci: input.blockingConfirmedReports.length,
      siswaAda: Boolean(input.student),
      tagihanTerlindungi: input.scopeHasProtectedInvoice,
      tautanRusak: input.invalidReportLink,
    },
  };
}

/**
 * Tulis jejak **hanya ketika keputusannya berubah**, dan hanya bila diminta.
 *
 * Penandanya sengaja hidup di `window`, bukan di `localStorage`: pengosongan
 * storage oleh fixture `e2e` tidak boleh mematikannya di tengah tes.
 *
 * Jejaknya juga **disimpan di `window.__lklJejakLaporan`**, bukan hanya dicetak
 * ke konsol. Alasannya terukur: keluaran konsol peramban tidak sampai ke berkas
 * log suite penuh (`PLAYWRIGHT_DISABLE_CONSOLE_REDIRECT` tidak berpengaruh di
 * lingkungan ini), sehingga jejak yang hanya dicetak **tidak terbaca justru pada
 * run yang gagal** — satu-satunya run yang penting. Dengan disimpan di `window`,
 * helper tes bisa membacanya dan **menyebutkan alasannya di pesan gagal**.
 *
 * Panjangnya dibatasi: run suite penuh menghasilkan puluhan perubahan
 * keputusan, dan jejak yang tumbuh tanpa batas hanya menambah beban pada run
 * yang sedang bermasalah.
 */
const BATAS_JEJAK = 80;

/** Kunci keputusan terakhir — jejak dicatat saat **berubah**, bukan tiap render. */
let jejakTerakhir: string | undefined;

export function catatJejakKetersediaanLaporan(input: ReportAvailabilityInput): void {
  if (!import.meta.env.DEV) return;
  if (typeof window === "undefined") return;
  const w = window as unknown as {
    __lklTraceReport?: boolean;
    __lklJejakLaporan?: ReportAvailabilityTrace[];
  };
  if (!w.__lklTraceReport) return;
  const jejak = jejakKetersediaanLaporan(input);
  const kunci = `${jejak.kode}|${jejak.bisaDibuat}|${jejak.dipakai.periode}|${jejak.dipakai.sesiCakupan}`;
  if (kunci === jejakTerakhir) return;
  jejakTerakhir = kunci;
  const daftar = w.__lklJejakLaporan ?? [];
  daftar.push(jejak);
  if (daftar.length > BATAS_JEJAK) daftar.splice(0, daftar.length - BATAS_JEJAK);
  w.__lklJejakLaporan = daftar;
  console.log(`[laporan-tersedia] ${JSON.stringify(jejak)}`);
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
