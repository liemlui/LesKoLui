// ── Tabel prediksi vs nilai akhir: aturan barisnya ──────────────────────────
//
// Dipisah dari komponennya (butir 4 G3-06) supaya bisa diuji tanpa DOM, dan —
// sejak 2026-10-10 — supaya berkas komponennya hanya mengekspor komponen.
// Sebelumnya `barisPerbandingan` menumpang di `PerbandinganNilai.tsx`, dan itu
// melanggar `react-refresh/only-export-components`: berkas yang mengekspor
// komponen DAN fungsi biasa mematikan fast refresh untuk seluruh berkasnya.
// Pola yang sama sudah dipakai `raporForm.ts` dan `studentConclusion.ts`.
//
// **Kenapa namanya `perbandinganNilaiRows.ts`, bukan `perbandinganNilai.ts`.**
// Di Windows nama berkas tidak peka huruf besar-kecil, dan TypeScript mencoba
// `.ts` SEBELUM `.tsx`. Berkas `perbandinganNilai.ts` karena itu menutupi komponen
// `PerbandinganNilai.tsx` untuk setiap impor yang ditulis `./PerbandinganNilai` —
// `NilaiRapor.tsx` langsung gagal dengan TS1192 ("has no default export") pada
// percobaan pertama. Akhiran `Rows` membuat namanya berbeda lebih dari sekadar
// besar-kecil huruf.

import type { Session } from "../../db/types";
import { gradeDelta } from "../../template/layouts";
import { gradeValue, isGradeLower } from "../../lib/grades";
import { dayLabel } from "../../lib/format";

/**
 * Apakah dua nilai berada pada SKALA yang sama sehingga boleh dibandingkan.
 *
 * `isGradeLower` sengaja longgar — ia dipakai untuk memblokir PENYIMPANAN, jadi
 * kegagalan membandingkan lebih baik menghasilkan `false` daripada menahan tutor.
 * Akibatnya `isGradeLower("B", "80")` bernilai `true` (B dinilai 8, lalu 8 < 80),
 * padahal huruf dan angka bukan skala yang sama.
 *
 * Untuk sebuah TABEL di layar, longgar itu salah: menulis "nilai akhir di bawah
 * prediksi" untuk pasangan yang tidak sebanding menyesatkan pembaca. Karena itu
 * di sini ditambahkan syarat skala: keduanya huruf, atau keduanya angka.
 */
function skalaSama(a: string, b: string): boolean {
  const letter = (v: string) => /^[A-Fa-f][+-]?$/.test(v.trim());
  return letter(a) === letter(b);
}

/** Satu baris perbandingan yang sudah siap dirender. */
export interface BarisNilai {
  id: string;
  /** Tanggal pendek untuk kolom pertama, mis. "12 Jun". */
  date: string;
  /** Topik atau mapel — konteks ujian apa yang dinilai. */
  konteks: string;
  predicted: string;
  actual: string;
  /** "+1", "-2", "sama", atau `undefined` bila tidak bisa dibandingkan. */
  delta?: string;
  /** `naik` / `turun` / `sama` — hanya diisi bila perbandingannya mungkin. */
  arah?: "naik" | "turun" | "sama";
  /** `true` bila nilai akhir lebih rendah dari prediksi (skala numerik MAUPUN huruf). */
  turun: boolean;
}

/**
 * Menyaring dan menyusun baris perbandingan dari daftar sesi.
 *
 * Aturan yang dipakai — dan sengaja TIDAK ditulis ulang di sini:
 *
 * - `gradeDelta` (dari `template/layouts`) menentukan besar selisih pada skala
 *   **numerik**. Ini fungsi yang SAMA dengan yang dipakai laporan bulanan
 *   (`useReportData.ts`), jadi layar dan laporan tidak bisa berbeda angka.
 * - `isGradeLower` (dari `lib/grades`) menangkap skala **huruf**, yang tidak
 *   dibandingkan `gradeDelta` — tetapi hanya setelah dipastikan kedua nilai
 *   sebanding (lihat `skalaSama`).
 * - Sesi tanpa prediksi DAN tanpa nilai akhir tidak masuk tabel: tidak ada yang
 *   bisa dibandingkan.
 */
export function barisPerbandingan(sessions: readonly Session[]): BarisNilai[] {
  return sessions
    .filter((s) => s.status === "DONE")
    .filter((s) => Boolean((s.predictedGrade ?? "").trim() || (s.actualGrade ?? "").trim()))
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((s) => {
      const predicted = (s.predictedGrade ?? "").trim();
      const actual = (s.actualGrade ?? "").trim();
      const delta = gradeDelta(predicted, actual);
      // `isGradeLower` hanya dipercaya bila kedua nilai benar-benar sebanding:
      // keduanya ada, bisa dibaca `gradeValue`, dan satu skala. Tanpa syarat ini,
      // "80" vs "B" akan dilaporkan sebagai turun.
      const sebanding =
        Boolean(predicted) && Boolean(actual) &&
        gradeValue(predicted) !== null && gradeValue(actual) !== null &&
        skalaSama(predicted, actual);
      const turun = sebanding && isGradeLower(actual, predicted);
      // Arah dipakai untuk warna. Bila `gradeDelta` tidak bisa membandingkan
      // (skala huruf), arah ditentukan oleh `isGradeLower` saja.
      const arah: BarisNilai["arah"] =
        delta === undefined ? (turun ? "turun" : undefined) :
        delta === "sama" ? "sama" :
        delta.startsWith("+") ? "naik" : "turun";
      return {
        id: s.id,
        date: dayLabel(s.date).split(",")[1]?.trim() ?? s.date.slice(5),
        konteks: (s.topic ?? "").trim() || s.subjects.join(", ") || "Sesi umum",
        predicted,
        actual,
        delta,
        arah,
        turun,
      };
    });
}
