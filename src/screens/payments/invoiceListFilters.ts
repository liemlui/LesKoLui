/**
 * Filter pencarian + pesan kosong daftar tagihan — fungsi murni tanpa React dan
 * tanpa IndexedDB.
 *
 * Dipisah dari `TagihanTab.tsx` (G3-02 fitur #4 K-05 · #7 K-07) supaya teks yang
 * dilihat tutor bisa dites tanpa merender komponen. Aturan yang dipegang:
 * pesan kosong harus menyebut **keadaan filter yang sedang aktif** — "semua sudah
 * diterbitkan" adalah klaim tentang data, dan klaim itu salah kalau daftarnya
 * kosong hanya karena pencarian.
 */
import type { SessionCountBillingProgress } from "../../db/repos/paymentRepo";

/** Pencocokan nama murid yang dipakai kotak "Cari murid". */
export function matchesStudentName(name: string | undefined, searchText: string): boolean {
  const query = searchText.trim().toLowerCase();
  if (query === "") return true;
  return (name ?? "").toLowerCase().includes(query);
}

/** Baris antrean tagihan per pertemuan yang lolos pencarian. */
export function filterSessionCountProgress<T extends Pick<SessionCountBillingProgress, "studentName">>(
  rows: readonly T[],
  searchText: string,
): T[] {
  return rows.filter((row) => matchesStudentName(row.studentName, searchText));
}

export interface IssuedEmptyMessageArgs {
  invoiceStatusFilter: string;
  searchText: string;
  /** Ada invoice sama sekali (sebelum disaring pencarian). */
  hasRows: boolean;
  /** Ada invoice yang lolos pencarian, sebelum chip umur piutang dan tahap lain. */
  hasMatchingRows: boolean;
  /** Ada laporan final yang memang menunggu diterbitkan. */
  hasReadyData: boolean;
  /**
   * Chip umur piutang sedang aktif. Wajib dikirim: tanpa ini, pesan
   * "lolos saringan umur piutang" bisa muncul untuk kekosongan yang sebenarnya
   * disebabkan tahap/asal — dan itu menuntun tutor melepas filter yang salah.
   */
  hasAgingFilter: boolean;
}

/**
 * Pesan kosong untuk daftar tagihan (K-07: tiap keadaan filter punya pesannya
 * sendiri, bukan satu pesan generik).
 */
export function emptyIssuedMessage({
  invoiceStatusFilter, searchText, hasRows, hasMatchingRows, hasReadyData, hasAgingFilter,
}: IssuedEmptyMessageArgs): string {
  const menungguDiterbitkan = invoiceStatusFilter === "ready";
  if (menungguDiterbitkan) {
    return hasReadyData
      ? "Belum ada baris yang diterbitkan dari antrean di atas."
      : "Semua laporan final sudah diterbitkan.";
  }
  const query = searchText.trim();
  if (hasAgingFilter && hasRows && hasMatchingRows) {
    return "Tidak ada tagihan yang lolos saringan umur piutang ini. Ketuk chip umurnya lagi untuk melepas saringan.";
  }
  if (query !== "") {
    return hasRows
      ? `Tidak ada tagihan dengan nama murid yang memuat "${query}".`
      : "Belum ada tagihan sama sekali untuk dicari.";
  }
  if (!hasRows) return "Belum ada tagihan yang diterbitkan.";
  return "Tidak ada tagihan yang cocok dengan langkah dan asal ini.";
}

/** Pesan kosong untuk daftar "Laporan final siap ditagih". */
export function emptyReadyReportsMessage(searchText: string, hasReadyData: boolean): string {
  const query = searchText.trim();
  if (query !== "") {
    return hasReadyData
      ? `Tidak ada laporan final yang namanya memuat "${query}".`
      : "Belum ada laporan final yang menunggu diterbitkan.";
  }
  return "Belum ada laporan final yang menunggu diterbitkan.";
}

/** Pesan kosong untuk daftar "Tagihan per Pertemuan". */
export function emptySessionCountMessage(searchText: string, hasSessionCountData: boolean): string {
  const query = searchText.trim();
  if (!hasSessionCountData) return "Belum ada murid dengan aturan tagihan per pertemuan.";
  if (query !== "") {
    return `Tidak ada murid bertagihan per pertemuan yang namanya memuat "${query}".`;
  }
  return "Tidak ada murid dengan aturan tagihan per pertemuan.";
}
