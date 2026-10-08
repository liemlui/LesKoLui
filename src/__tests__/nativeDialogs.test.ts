import { describe, expect, it } from "vitest";
import studentDetailSrc from "../screens/StudentDetail.tsx?raw";
import iaeeTrackerSrc from "../screens/studentDetail/IaEeTracker.tsx?raw";
import sessionModalSrc from "../screens/studentDetail/SessionDetailModal.tsx?raw";
import riwayatSesiSrc from "../screens/studentDetail/RiwayatSesi.tsx?raw";
import riwayatPembayaranSrc from "../screens/studentDetail/RiwayatPembayaran.tsx?raw";
import upcomingScheduleSrc from "../screens/studentDetail/UpcomingSchedule.tsx?raw";
import engagementSummarySrc from "../screens/studentDetail/EngagementSummary.tsx?raw";
import studentsSrc from "../screens/Students.tsx?raw";
import studentFormSrc from "../components/StudentForm.tsx?raw";
import monthlyReportSrc from "../screens/MonthlyReport.tsx?raw";
import captureSessionSrc from "../screens/CaptureSession.tsx?raw";
import manageSessionSrc from "../screens/home/ManageSessionSheet.tsx?raw";

/**
 * Penjaga K7 — dialog bawaan peramban dilarang di layar Murid.
 *
 * Keputusan pemilik 2026-10-09 (K7): `confirm()` dan `alert()` bawaan peramban
 * diperbaiki SEKARANG, bukan ditunda. Ini menegakkan keputusan "Tetap"
 * `ATURAN-AI.md` §4.1 ("semua dialog konfirmasi memakai komponen internal,
 * bukan confirm() atau prompt() bawaan peramban").
 *
 * Kenapa tes ini ada, padahal §1 butir 4 melarang menambah penjaga tanpa alasan:
 * pelanggarannya SUDAH terjadi di berkas yang tugas ini sentuh, dan terjadi lagi
 * dua kali pada berkas yang sama pada putaran sebelumnya (`Payments.tsx` dan
 * `MonthlyReport.tsx`). Ini regresi nyata yang berulang, bukan kekhawatiran.
 *
 * Cara kerjanya sama dengan `moneyGate.test.ts`: membaca BERKAS SUMBER, bukan DOM.
 * Komentar dibuang lebih dulu supaya dokumentasi yang menyebut `confirm()`
 * (lihat `IaEeTracker.tsx`) tidak dihitung sebagai pelanggaran.
 */

/** Buang komentar blok dan komentar baris sebelum memeriksa. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

/**
 * Baris yang memanggil dialog bawaan peramban.
 *
 * Hanya pencocokan `confirm(`, `alert(`, `prompt(`, dan `window.print(`
 * sebagai PEMANGGILAN — bukan sebagai bagian dari nama lain seperti
 * `onConfirm(`, `ConfirmSheet`, atau `handleConfirm(`.
 */
function nativeDialogLines(src: string): string[] {
  const cleaned = stripComments(src);
  return cleaned
    .split("\n")
    .map((line, i) => ({ line: line.trim(), n: i + 1 }))
    .filter(({ line }) => /(^|[^A-Za-z0-9_.$])(confirm|alert|prompt)\s*\(/.test(line))
    .filter(({ line }) => !/confirm\s*:\s*/.test(line)) // properti objek, bukan panggilan
    .map(({ line, n }) => `${n}: ${line}`);
}

const STUDENT_FILES = {
  "Detail murid": studentDetailSrc,
  "Pelacak proyek": iaeeTrackerSrc,
  "Modal detail sesi": sessionModalSrc,
  "Riwayat sesi": riwayatSesiSrc,
  "Riwayat pembayaran": riwayatPembayaranSrc,
  "Jadwal mendatang": upcomingScheduleSrc,
  "Ringkasan keterlibatan": engagementSummarySrc,
  "Daftar murid": studentsSrc,
  "Formulir murid": studentFormSrc,
};

/** Berkas lain yang sudah bersih dan tidak boleh kembali kotor. */
const OTHER_CLEAN_FILES = {
  "Laporan bulanan": monthlyReportSrc,
  "Catat sesi": captureSessionSrc,
  "Panel kelola sesi": manageSessionSrc,
};

describe("tidak ada dialog bawaan peramban di layar Murid", () => {
  for (const [name, src] of Object.entries(STUDENT_FILES)) {
    it(`${name}: memakai dialog internal, bukan confirm()/alert()/prompt()`, () => {
      expect(nativeDialogLines(src), `${name} memanggil dialog bawaan peramban`).toEqual([]);
    });
  }
});

describe("berkas yang sudah bersih tetap bersih", () => {
  for (const [name, src] of Object.entries(OTHER_CLEAN_FILES)) {
    it(`${name}: tidak ada dialog bawaan peramban`, () => {
      expect(nativeDialogLines(src), `${name} memanggil dialog bawaan peramban`).toEqual([]);
    });
  }
});

describe("penjaga ini benar-benar bisa gagal", () => {
  // Tanpa tes ini, regex yang salah bisa membuat seluruh penjaga di atas
  // "hijau" tanpa pernah memeriksa apa pun.
  it("mendeteksi confirm() dan alert() pada sumber buatan", () => {
    expect(nativeDialogLines('if (confirm("hapus?")) doIt();')).toHaveLength(1);
    expect(nativeDialogLines('  alert("isi PIN dulu");')).toHaveLength(1);
    expect(nativeDialogLines('const x = prompt("nama?");')).toHaveLength(1);
  });

  it("tidak salah menuduh ConfirmSheet, onConfirm, dan komentar", () => {
    expect(nativeDialogLines('<ConfirmSheet open={x} onConfirm={go} />')).toEqual([]);
    expect(nativeDialogLines('function handleConfirm() { return 1; }')).toEqual([]);
    expect(nativeDialogLines('const label = { confirm: "Ya" };')).toEqual([]);
    expect(nativeDialogLines('// dulu memakai confirm() bawaan')).toEqual([]);
    expect(nativeDialogLines('/* confirm() dihapus 2026-10-09 */')).toEqual([]);
  });
});
