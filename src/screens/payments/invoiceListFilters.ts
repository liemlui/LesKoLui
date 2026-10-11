/**
 * Filter pencarian + pesan kosong daftar tagihan — fungsi murni tanpa React dan
 * tanpa IndexedDB.
 *
 * Dipisah dari `TagihanTab.tsx` (G3-02 fitur #4 K-05 · #7 K-07) supaya teks yang
 * dilihat tutor bisa dites tanpa merender komponen. Aturan yang dipegang:
 * pesan kosong harus menyebut **keadaan filter yang sedang aktif** — "semua sudah
 * diterbitkan" adalah klaim tentang data, dan klaim itu salah kalau daftarnya
 * kosong hanya karena pencarian.
 *
 * Sejak fitur #6 (K-06) modul ini juga memuat ringkasan filter aktif: berapa
 * saringan yang sedang menyaring daftar **dan apa namanya** (nama dipakai chip
 * "N filter aktif · Hapus" sebagai label aksesibilitas).
 */
import type { SessionCountBillingProgress } from "../../db/repos/paymentRepo";
import { AGE_BUCKET_LABEL, type AgeBucket } from "../../lib/finance";

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
    return "Tidak ada tagihan yang lolos saringan umur tagihan ini. Ketuk chip umurnya lagi untuk melepas saringan.";
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

/* ── K-06: ringkasan filter aktif ("N filter aktif · Hapus") ─────────────────── */

/**
 * Pasangan nilai→label filter "Asal invoice" — **satu sumber** untuk chip di layar
 * dan untuk nama yang disebut ringkasan filter. Entri pertama wajib nilai netral
 * ("semua"): `activeInvoiceFilters()` memakainya sebagai penanda "tidak menyaring",
 * jadi menaruh nilai lain di depan akan membuat chip menghitung filter palsu.
 */
export const ORIGIN_FILTERS = [
  ["semua", "Semua"],
  ["monthly", "Bulanan"],
  ["package", "Paket"],
  ["report", "Laporan"],
  ["manual", "Manual"],
] as const;

/** Label terlihat untuk satu nilai filter asal. Nilai tak dikenal dikembalikan apa adanya. */
export function originFilterLabel(origin: string): string {
  return ORIGIN_FILTERS.find(([key]) => key === origin)?.[1] ?? origin;
}

export interface ActiveInvoiceFiltersArgs {
  searchText: string;
  /** `AgeBucket | "all"` — "all" berarti tidak menyaring. */
  agingFilter: AgeBucket | "all";
  /** Nilai filter asal (`InvoiceOriginFilter`) — "semua" berarti tidak menyaring. */
  originFilter: string;
}

export interface ActiveInvoiceFilter {
  key: "search" | "aging" | "origin";
  /** Sebutan pendek untuk dibaca mesin baca layar, mis. `umur tagihan 31–60 hari`. */
  label: string;
}

/**
 * Saringan yang menyaring daftar **dan tersembunyi** saat panel "Filter lanjutan"
 * tertutup (K-06): pencarian, umur piutang, asal invoice.
 *
 * Pemilih tahap (4 kartu) sengaja **tidak** dihitung: kartunya selalu terlihat di
 * depan, jadi tutor sudah tahu saringan itu aktif. Yang chip ini jawab adalah
 * pertanyaan K-06 — "filter mana yang menentukan daftar ini" — untuk saringan yang
 * tidak terlihat. Karena itu jumlahnya paling banyak **3**.
 */
export function activeInvoiceFilters({
  searchText, agingFilter, originFilter,
}: ActiveInvoiceFiltersArgs): ActiveInvoiceFilter[] {
  const filters: ActiveInvoiceFilter[] = [];
  const query = searchText.trim();
  if (query !== "") filters.push({ key: "search", label: `pencarian "${query}"` });
  if (agingFilter !== "all") {
    filters.push({ key: "aging", label: `umur tagihan ${AGE_BUCKET_LABEL[agingFilter]}` });
  }
  if (originFilter !== "semua") {
    filters.push({ key: "origin", label: `asal ${originFilterLabel(originFilter).toLowerCase()}` });
  }
  return filters;
}

/**
 * Teks chip — `null` saat tidak ada filter aktif, dan pemanggil **wajib** memakai
 * `null` itu sebagai "jangan render chip": chip "0 filter aktif" akan menuntut
 * tutor menekan tombol Hapus yang tidak menghapus apa pun.
 */
export function activeFilterChipLabel(count: number): string | null {
  if (count <= 0) return null;
  return `${count} filter aktif`;
}

/**
 * Label aksesibilitas chip. Menyebut **nama** tiap filter, bukan hanya jumlahnya:
 * teks yang terlihat ("3 filter aktif") sengaja pendek, sehingga tanpa nama di sini
 * tutor yang memakai pembaca layar tidak bisa tahu saringan mana yang harus dilepas.
 */
export function activeFilterChipAriaLabel(filters: readonly ActiveInvoiceFilter[]): string {
  const names = filters.map((filter) => filter.label).join(", ");
  return `${filters.length} filter aktif: ${names}. Hapus semua filter.`;
}
