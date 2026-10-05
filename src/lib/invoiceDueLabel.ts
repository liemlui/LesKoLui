/**
 * Label jatuh tempo tagihan — fungsi murni tanpa React dan tanpa IndexedDB.
 *
 * Diekstraksi dari `InvoiceRow.tsx` (G3-02 fitur #5, temuan K-03) agar batas hari
 * dan kalender bisa dites tanpa merender komponen: kesalahan yang paling mungkin
 * di sini bukan tata letak, melainkan batas hari (0 vs 1) dan pergeseran
 * timezone. Karena `src/lib/finance.ts` termasuk berkas terlarang (§2.1
 * ATURAN-AI), rumusnya tinggal di modul ini dan **memakai ulang** `dayLabel()`
 * dari `lib/format.ts` — tidak ada label tanggal kedua di repo ini.
 *
 * Aturan yang mengikat: hasilnya bergantung pada `groundedAt` (tanggal "hari ini"
 * WIB) yang **wajib** diberikan pemanggil lewat `todayWIB()`. Tidak ada default
 * tersembunyi: kalau tanggalnya diambil diam-diam di dalam modul, tesnya menjadi
 * bergantung jam dinding dan bisa hijau/merah menurut hari.
 */
import { dayLabel, todayWIB } from "./format";

/** Jatuh tempo sudah lewat n hari. */
export function labelDaysLate(days: number): string {
  return `Terlambat ${days} hari`;
}

/**
 * Jatuh tempo masih n hari lagi (n ≥ 1).
 * Sisi "belum jatuh tempo" ini sengaja dipisah dari `invoiceAgeDays()` di
 * `lib/finance.ts`: fungsi itu memangkas nilai negatif (`delta > 0 ? … : 0`),
 * jadi ia memang tidak dipakai untuk menghitung hari yang tersisa.
 */
export function labelDaysAhead(days: number): string {
  return `Jatuh tempo ${days} hari lagi`;
}

/** Tidak ada tanggal jatuh tempo yang bisa dibaca. */
export function hasNoDueDateLabel(): string {
  return "Jatuh tempo belum diset";
}

/** Tanggal jatuh tempo dalam bahasa manusia, mis. "Kamis, 15 Januari 2026". */
export function labelDueAt(dueAt: string): string {
  return dayLabel(dueAt);
}

/** Selisih hari kalender: positif = sudah lewat, negatif = belum jatuh tempo. */
function daysFromDue(dueAt: string, groundedAt: string): number {
  return Math.round((Date.parse(`${groundedAt}T00:00:00Z`) - Date.parse(`${dueAt}T00:00:00Z`)) / 86_400_000);
}

/**
 * Label umur jatuh tempo untuk satu baris tagihan.
 *
 * `""` berarti tidak ada yang perlu ditampilkan: tagihan sudah lunas (umur tidak
 * relevan lagi) atau jatuh tempo tepat hari ini ("Terlambat 0 hari" dan
 * "Jatuh tempo 0 hari lagi" dua-duanya salah bahasa).
 */
export function formatInvoiceDueLabel(
  dueAt: string | undefined,
  isPaid: boolean,
  groundedAt: string = todayWIB(),
): string {
  if (isPaid || !dueAt) return "";
  const days = daysFromDue(dueAt, groundedAt);
  if (days > 0) return labelDaysLate(days);
  if (days < 0) return labelDaysAhead(-days);
  return "";
}
