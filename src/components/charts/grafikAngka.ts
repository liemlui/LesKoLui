/**
 * Angka grafik dalam bahasa manusia (G3-08 langkah 4).
 *
 * Modul murni tanpa DOM, supaya aturan pemendekan bisa diuji tanpa merender
 * grafik — dan supaya sumbu grafik TIDAK pernah memakai aturan yang berbeda dari
 * keterangannya (itu sumber angka yang saling bertentangan di satu layar).
 *
 * Aturan yang dipakai, apa adanya:
 *
 * - nilai di bawah seribu tampil utuh (`Rp 500`) — memendekkannya hanya
 *   menghilangkan informasi tanpa menghemat tempat;
 * - ribuan dan jutaan dipendekkan dengan satu angka di belakang koma, dan koma
 *   yang bernilai nol dibuang (`Rp 150 rb`, `Rp 1,2 jt`, `Rp 2 jt`);
 * - **nilai penuh selalu tersedia** di keterangan/`aria-label`; pemendekan hanya
 *   berlaku untuk label sumbu yang ruangnya sempit.
 *
 * Kenapa `Intl` dipakai dari `lib/finance.formatIdrNumber` dan bukan disalin:
 * simbol mata uang dan pemisah ribuan tidak boleh berbeda antara sumbu grafik dan
 * baris teks di sebelahnya.
 */

import { formatIdrNumber } from "../../lib/finance";

/** Satuan yang dipakai label ringkas. Diekspor agar keterangan bisa menyebutnya. */
export const SATUAN_RINGKAS = { ribu: "rb", juta: "jt" } as const;

/** Satu angka di belakang koma; koma nol dibuang. `1.0` → `1`, `1.25` → `1,3`. */
function satuDesimal(nilai: number): string {
  return nilai.toFixed(1).replace(/\.0$/, "").replace(".", ",");
}

/**
 * Angka rupiah ringkas untuk label sumbu grafik: `Rp 150 rb`, `Rp 1,2 jt`.
 *
 * Ribuan dibulatkan ke ribuan penuh (`Rp 889,7 rb` → `Rp 890 rb`): angka sumbu
 * dipakai untuk membaca besarannya, bukan untuk membaca presisi. Nilai penuh
 * tersedia di keterangan, jadi tidak ada informasi yang hilang — hanya dipindah
 * ke tempat yang benar. Jutaan tetap satu angka di belakang koma karena
 * pembulatannya ke bilangan bulat akan menghapus selisih yang terlihat.
 *
 * Nilai negatif dijaga (tanda di depan simbol) karena grafik selisih kas bisa
 * turun di bawah nol. Nilai bukan angka dikembalikan sebagai `—` supaya sumbu
 * tidak pernah mencetak `NaN`.
 */
export function formatRupiahRingkas(nilai: number): string {
  if (!Number.isFinite(nilai)) return "—";
  const tanda = nilai < 0 ? "−" : "";
  const abs = Math.abs(nilai);

  if (abs < 1_000) return `${tanda}${formatIdrNumber(Math.round(abs))}`;
  if (abs < 1_000_000) return `${tanda}Rp ${Math.round(abs / 1_000)} ${SATUAN_RINGKAS.ribu}`;
  if (abs < 1_000_000_000) return `${tanda}Rp ${satuDesimal(abs / 1_000_000)} ${SATUAN_RINGKAS.juta}`;
  return `${tanda}Rp ${satuDesimal(abs / 1_000_000_000)} m`;
}

/**
 * Perkiraan lebar teks label (piksel) untuk menghitung jarak kiri grafik.
 *
 * Bukan pengukuran font sungguhan — repo ini tidak memasang pengukur teks di
 * lingkungan tes. Angkanya konservatif (lebih lebar daripada huruf sebenarnya)
 * supaya label terpanjang tidak pernah terpotong; kelebihan lebar hanya membuat
 * sedikit ruang kosong, sedangkan kekurangan lebar memotong angka.
 */
export function perkiraanLebarTeks(teks: string, ukuranPiksel: number): number {
  return teks.length * ukuranPiksel * 0.62;
}

/** Jarak kiri grafik: mengikuti label sumbu TERPANJANG, bukan angka tetap. */
export function jarakKiriGrafik(label: readonly string[], opsi?: {
  ukuranPiksel?: number;
  jarakMinimum?: number;
  /** Ruang antara label dan garis sumbu. */
  sela?: number;
}): number {
  const ukuran = opsi?.ukuranPiksel ?? 11;
  const minimum = opsi?.jarakMinimum ?? 28;
  const sela = opsi?.sela ?? 8;
  const terpanjang = label.reduce((maks, teks) => Math.max(maks, perkiraanLebarTeks(teks, ukuran)), 0);
  return Math.max(minimum, Math.ceil(terpanjang + sela));
}
