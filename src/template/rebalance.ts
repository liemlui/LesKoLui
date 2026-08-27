import type { ReportData } from "./types";
import { paginate } from "./paginate";

export const COVER_PAGE_ID = "report-page-cover";

/**
 * Bagi `total` entri ke halaman berisi `perPage` entri (halaman terakhir
 * menerima sisa). Ini target awal — mode rasio tetap (3:4) bisa menggeser
 * entri agar konten muat dalam kotak halaman.
 */
export function initialSplits(perPage: number, total: number): number[] {
  const splits: number[] = [];
  for (let i = 0; i < total; i += perPage) {
    splits.push(Math.min(perPage, total - i));
  }
  return splits;
}

/**
 * Ambil halaman laporan dari pembagian entri (`splits`). Fallback paginasi
 * berbasis jumlah saat `splits` belum siap atau tidak ada entri.
 */
export function pagesFromSplits(
  data: ReportData,
  splits: number[] | null,
  entriesPerPage: number,
): ReportData[] {
  if (splits == null || splits.length === 0 || data.entries.length === 0) {
    return paginate(data, entriesPerPage);
  }
  const pages: ReportData[] = [];
  let offset = 0;
  for (const size of splits) {
    pages.push({ ...data, entries: data.entries.slice(offset, offset + size) });
    offset += size;
  }
  if (offset < data.entries.length) {
    // Keamanan: entri sisa (tidak boleh terjadi) tetap dirender.
    pages.push({ ...data, entries: data.entries.slice(offset) });
  }
  return pages;
}

/** Tinggi kotak halaman rasio tetap 3:4 untuk lebar `width` (px). */
export function ratioHeight3x4(width: number): number {
  return width * (4 / 3);
}
