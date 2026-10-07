/**
 * Kolom nominal rupiah — pemisah ribuan saat mengetik.
 *
 * **Kenapa fungsi murni, bukan logika di komponen.** Mengetik "75000" sambil
 * angkanya berubah menjadi "75.000" itu rawan: kalau nilai input diganti tanpa
 * menghitung ulang posisi kursor, kursor melompat ke ujung setiap kali tutor
 * mengetik di tengah angka. Karena itu perhitungan posisi kursor ikut jadi
 * bagian dari fungsi ini dan diuji terpisah.
 *
 * Aturan yang dipegang:
 * - Hanya angka yang diterima; huruf, tanda minus, dan titik desimal dibuang.
 * - Pemisahnya titik (kaidah Indonesia: 7.500.000).
 * - Nilai di atas batas dipotong ke batas, dan itu **dilaporkan** ke pemanggil
 *   supaya antarmuka bisa mengatakannya, bukan diam-diam mengubah angka.
 */
import { MAX_PAYMENT_AMOUNT } from "./money";

export interface HasilFormatNominal {
  /** Teks yang harus ditampilkan di kolom isian (sudah berisi pemisah). */
  teks: string;
  /** Posisi kursor baru, dihitung dari jumlah digit di sebelah kiri kursor. */
  posisiKursor: number;
  /** Nilai rupiah hasil pembacaan. 0 = kolom kosong. */
  nilai: number;
  /** true bila masukan menembus batas dan nilainya dipotong. */
  dipotong: boolean;
}

/** Beri pemisah ribuan pada sekumpulan digit. "" tetap "". */
export function beriPemisah(digits: string): string {
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Baca apa yang diketik tutor dan kembalikan teks berformat + posisi kursor baru.
 *
 * `posisiKursorLama` adalah posisi kursor **sebelum** perubahan. Jumlah digit di
 * sebelah kiri kursor dipertahankan, lalu posisi barunya dicari pada teks yang
 * sudah berformat — itulah yang membuat kursor tidak melompat.
 */
export function formatNominalSaatKetik(
  masukan: string,
  posisiKursorLama: number,
  max = MAX_PAYMENT_AMOUNT,
): HasilFormatNominal {
  const sebelumKursor = masukan.slice(0, Math.max(0, posisiKursorLama));
  const digitKiriAsli = sebelumKursor.replace(/\D/g, "").length;

  const semuaDigit = masukan.replace(/\D/g, "");
  if (!semuaDigit) {
    return { teks: "", posisiKursor: 0, nilai: 0, dipotong: false };
  }

  const angka = Number(semuaDigit);
  const dipotong = Number.isFinite(angka) && angka > max;
  const digitTerpakai = dipotong ? String(max) : String(Number.isFinite(angka) ? angka : 0);

  const teks = beriPemisah(digitTerpakai);

  // Cari posisi kursor: pertahankan jumlah digit di sebelah kiri. Kursor
  // diletakkan tepat sesudah digit ke-`digitKiri`, tanpa melompati pemisah —
  // melompati titik akan menambah satu digit lagi di sebelah kiri, dan ketikan
  // berikutnya masuk ke tempat yang salah.
  const digitKiri = Math.min(digitKiriAsli, digitTerpakai.length);
  let posisiKursor = teks.length;
  if (digitKiri < digitTerpakai.length) {
    let terlihat = 0;
    posisiKursor = 0;
    for (let i = 0; i < teks.length; i += 1) {
      if (/\d/.test(teks[i])) terlihat += 1;
      if (terlihat === digitKiri) {
        posisiKursor = i + 1;
        break;
      }
    }
  }

  return { teks, posisiKursor, nilai: Number(digitTerpakai), dipotong };
}

/** Format nilai rupiah untuk ditampilkan di kolom isian (tanpa awalan "Rp"). */
export function tampilkanNominal(nilai: number): string {
  if (!Number.isFinite(nilai) || nilai <= 0) return "";
  return beriPemisah(String(Math.floor(nilai)));
}

export interface PesanNominal {
  /** Pesan yang harus tampil di bawah kolom; kosong = isinya sah. */
  pesan: string;
  jenis: "kosong" | "tidak-sah" | "dipotong" | "sah";
}

/**
 * Pesan keadaan kolom nominal. Dipisah dari komponen supaya teksnya bisa
 * diuji tanpa merender apa pun.
 */
export function pesanNominal(
  nilai: number,
  opsi: { dipotong?: boolean; tersimpan?: boolean; max?: number } = {},
): PesanNominal {
  const max = opsi.max ?? MAX_PAYMENT_AMOUNT;
  if (nilai <= 0) return { pesan: "", jenis: "kosong" };
  if (!Number.isFinite(nilai) || nilai > max) {
    return { pesan: `Nominal paling besar ${max.toLocaleString("id-ID")}.`, jenis: "tidak-sah" };
  }
  if (opsi.dipotong) {
    return { pesan: `Dipotong ke batas paling besar ${max.toLocaleString("id-ID")}.`, jenis: "dipotong" };
  }
  if (opsi.tersimpan) return { pesan: "Tersimpan ✓", jenis: "sah" };
  return { pesan: "", jenis: "sah" };
}
