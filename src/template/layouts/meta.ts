import type { Layout, LayoutCategory } from "../types";

/**
 * Metadata kompatibilitas per layout (Milestone A dari docs/arsip/UI-UX-ANALYSIS.md).
 * Dipakai oleh:
 *  - galeri template (filter kategori agar pilihan tidak membebani pengguna — Hick's Law)
 *  - mode produksi (rekomendasi jumlah foto, dukungan narasi panjang)
 *
 * Catatan: metadata `supportedRatios` dihapus bersama pilihan rasio halaman —
 * semua layout kini memakai tinggi otomatis, jadi tidak ada lagi rasio yang
 * harus "didukung" atau di-fallback.
 */

export interface LayoutCompatibility {
  supportsLongNarrative: boolean;
  recommendedPhotoCount: { min?: number; max?: number };
  categories: LayoutCategory[];
}

const DEFAULT_COMPAT: LayoutCompatibility = {
  supportsLongNarrative: true,
  recommendedPhotoCount: { max: 10 },
  categories: ["classic"],
};

export const LAYOUT_COMPAT: Record<string, LayoutCompatibility> = {
  // ── classic ────────────────────────────────────────────────────────────
  cards:       { supportsLongNarrative: false, recommendedPhotoCount: { min: 1, max: 4 }, categories: ["classic"] },
  timeline:    { supportsLongNarrative: true,  recommendedPhotoCount: { max: 4 }, categories: ["classic"] },
  scrapbook:   { supportsLongNarrative: false, recommendedPhotoCount: { min: 1, max: 4 }, categories: ["classic", "playful"] },
  grid:        { supportsLongNarrative: false, recommendedPhotoCount: { max: 4 }, categories: ["classic"] },
  compact:     { supportsLongNarrative: false, recommendedPhotoCount: { max: 8 }, categories: ["classic"] },
  // ── visual ─────────────────────────────────────────────────────────────
  dashboard:   { supportsLongNarrative: false, recommendedPhotoCount: { max: 6 }, categories: ["visual"] },
  progress:    { supportsLongNarrative: false, recommendedPhotoCount: { max: 5 }, categories: ["visual"] },
  weekly:      { supportsLongNarrative: false, recommendedPhotoCount: { max: 6 }, categories: ["visual"] },
  subjects:    { supportsLongNarrative: false, recommendedPhotoCount: { max: 6 }, categories: ["visual"] },
  reportcard:  { supportsLongNarrative: false, recommendedPhotoCount: { max: 10 }, categories: ["visual", "formal"] },
  portfolio:   { supportsLongNarrative: false, recommendedPhotoCount: { min: 1, max: 4 }, categories: ["visual", "playful"] },
  checklist:   { supportsLongNarrative: false, recommendedPhotoCount: { max: 8 }, categories: ["visual"] },
  // ── analytic ───────────────────────────────────────────────────────────
  summary:     { supportsLongNarrative: true,  recommendedPhotoCount: { max: 7 }, categories: ["analytic"] },
  growth:      { supportsLongNarrative: false, recommendedPhotoCount: { max: 5 }, categories: ["analytic"] },
  dossier:     { supportsLongNarrative: true,  recommendedPhotoCount: { max: 5 }, categories: ["analytic"] },
  analytics:   { supportsLongNarrative: false, recommendedPhotoCount: { max: 6 }, categories: ["analytic"] },
  narrative:   { supportsLongNarrative: true,  recommendedPhotoCount: { max: 5 }, categories: ["analytic"] },
  // ── modern ─────────────────────────────────────────────────────────────
  milestone:   { supportsLongNarrative: true,  recommendedPhotoCount: { max: 5 }, categories: ["modern"] },
  split:       { supportsLongNarrative: false, recommendedPhotoCount: { min: 1, max: 4 }, categories: ["modern"] },
  journal:     { supportsLongNarrative: true,  recommendedPhotoCount: { max: 6 }, categories: ["modern", "playful"] },
  overview:    { supportsLongNarrative: false, recommendedPhotoCount: { min: 1, max: 4 }, categories: ["modern"] },
  minimal:     { supportsLongNarrative: true,  recommendedPhotoCount: { max: 8 }, categories: ["modern", "formal"] },
  bullets:     { supportsLongNarrative: false, recommendedPhotoCount: { max: 8 }, categories: ["modern", "formal"] },
  compare:     { supportsLongNarrative: false, recommendedPhotoCount: { max: 8 }, categories: ["modern", "analytic"] },
  snapshot:    { supportsLongNarrative: false, recommendedPhotoCount: { min: 1, max: 6 }, categories: ["modern", "playful"] },
  infographic: { supportsLongNarrative: false, recommendedPhotoCount: { max: 6 }, categories: ["modern", "formal"] },
  cover:       { supportsLongNarrative: true,  recommendedPhotoCount: { max: 8 }, categories: ["modern"] },
};

/** Gabungkan metadata kompatibilitas ke sebuah layout (tanpa mengubah objek asal). */
export function mergeLayoutMeta(layout: Layout): Layout {
  const meta = LAYOUT_COMPAT[layout.id] ?? DEFAULT_COMPAT;
  return {
    ...layout,
    supportsLongNarrative: layout.supportsLongNarrative ?? meta.supportsLongNarrative,
    recommendedPhotoCount: layout.recommendedPhotoCount ?? meta.recommendedPhotoCount,
    categories: layout.categories ?? meta.categories,
  };
}
