import { describe, expect, it } from "vitest";
import homeSrc from "../screens/home/Home.tsx?raw";
import snapshotSrc from "../screens/home/OperationalSnapshot.tsx?raw";
import studentsSrc from "../screens/Students.tsx?raw";
import studentDetailSrc from "../screens/StudentDetail.tsx?raw";
import sessionModalSrc from "../screens/studentDetail/SessionDetailModal.tsx?raw";
import monthlyReportSrc from "../screens/MonthlyReport.tsx?raw";
import waBillingSrc from "../lib/waBilling.ts?raw";
import invoicePresentationSrc from "../lib/invoicePresentation.ts?raw";

/**
 * Penjaga regresi "satu pintu uang" — TASK-08 Langkah 6 (G2-04).
 *
 * Tes ini membaca **berkas sumber**, bukan DOM. Tujuannya cepat menangkap
 * kebocoran baru: siapa pun yang menambahkan `formatRupiah(...)` langsung di salah
 * satu layar ini akan menggagalkan tes sebelum rilis. Ini pengganti yang murah
 * untuk pemeriksaan manual `warna uang` yang tidak punya metrik runtime.
 *
 * Dua pengecualian yang SAH dan karena itu diizinkan:
 * 1. baris ber-komentar `money-safe` — mis. pesan validasi yang memakai konstanta
 *    batas tarif (`MAX_HOURLY_RATE`), bukan nominal tutor;
 * 2. berkas pembuat pesan keluar (`waBilling`, `invoicePresentation`) yang WAJIB
 *    memuat nominal asli — masking di sana akan merusak pesan tagihan ke orang tua.
 */
const GATED = {
  "Detail murid": studentDetailSrc,
  "Modal detail sesi": sessionModalSrc,
  "Laporan bulanan": monthlyReportSrc,
};

const NO_MONEY_AT_ALL = {
  "Beranda": homeSrc,
  "Ringkasan operasional Beranda": snapshotSrc,
  "Daftar murid": studentsSrc,
};

/** Baris yang menampilkan uang TANPA token gerbang dan tanpa alasan `money-safe`. */
function unguardedMoneyLines(src: string): string[] {
  return src
    .split("\n")
    .map((line, i) => ({ line: line.trim(), n: i + 1 }))
    .filter(({ line }) => /formatRupiah\(/.test(line) && !line.includes("money-safe"))
    .map(({ line, n }) => `${n}: ${line}`);
}

describe("satu pintu uang — layar yang menampilkan uang wajib lewat gerbang", () => {
  for (const [name, src] of Object.entries(GATED)) {
    it(`${name}: angka uang lewat MaskedMoney/useMoneyVisible, tanpa formatRupiah langsung`, () => {
      expect(src, `${name} tidak memakai gerbang uang sama sekali`).toMatch(/MaskedMoney|useMoneyVisible/);
      expect(unguardedMoneyLines(src), `${name} menampilkan uang tanpa gerbang`).toEqual([]);
    });
  }
});

describe("satu pintu uang — Beranda tidak menampilkan uang", () => {
  for (const [name, src] of Object.entries(NO_MONEY_AT_ALL)) {
    it(`${name}: tidak ada formatRupiah maupun literal "Rp"`, () => {
      expect(unguardedMoneyLines(src), `${name} menyentuh formatRupiah`).toEqual([]);
      expect(src, `${name} memuat literal nominal`).not.toMatch(/\bRp\b/);
    });
  }
});

describe("satu pintu uang — pesan keluar tetap memuat nominal asli", () => {
  it("waBilling & invoicePresentation masih memakai formatRupiah (masking dilarang di sana)", () => {
    expect(waBillingSrc).toMatch(/formatRupiah\(/);
    expect(invoicePresentationSrc).toMatch(/formatRupiah\(/);
  });
});
