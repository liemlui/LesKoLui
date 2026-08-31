import type { Layout, LayoutCategory } from "../types";

/**
 * Metadata kompatibilitas per layout (Milestone A dari docs/UI-UX-ANALYSIS.md).
 * Dipakai oleh:
 *  - ReportRenderer (rasio aman 3:4/auto, fallback bila layout tidak mendukung)
 *  - galeri template (filter kategori agar pilihan tidak membebani pengguna — Hick's Law)
 *  - mode produksi (rekomendasi jumlah foto, dukungan narasi panjang)
 */

export interface LayoutCompatibility {
  supportedRatios: ("3:4" | "auto")[];
  supportsLongNarrative: boolean;
  recommendedPhotoCount: { min?: number; max?: number };
  categories: LayoutCategory[];
}

const DEFAULT_COMPAT: LayoutCompatibility = {
  supportedRatios: ["3:4", "auto"],
  supportsLongNarrative: true,
  recommendedPhotoCount: { max: 10 },
  categories: ["classic"],
};

export const LAYOUT_COMPAT: Record<string, LayoutCompatibility> = {
  // ── classic ────────────────────────────────────────────────────────────
  cards:       { supportedRatios: ["3:4", "auto"], supportsLongNarrative: false, recommendedPhotoCount: { min: 1, max: 4 }, categories: ["classic"] },
  timeline:    { supportedRatios: ["3:4", "auto"], supportsLongNarrative: true,  recommendedPhotoCount: { max: 4 }, categories: ["classic"] },
  scrapbook:   { supportedRatios: ["3:4", "auto"], supportsLongNarrative: false, recommendedPhotoCount: { min: 1, max: 4 }, categories: ["classic", "playful"] },
  grid:        { supportedRatios: ["3:4", "auto"], supportsLongNarrative: false, recommendedPhotoCount: { max: 4 }, categories: ["classic"] },
  compact:     { supportedRatios: ["3:4", "auto"], supportsLongNarrative: false, recommendedPhotoCount: { max: 8 }, categories: ["classic"] },

  // ── visual ─────────────────────────────────────────────────────────────
  dashboard:   { supportedRatios: ["3:4", "auto"], supportsLongNarrative: false, recommendedPhotoCount: { max: 6 }, categories: ["visual"] },
  progress:    { supportedRatios: ["3:4", "auto"], supportsLongNarrative: false, recommendedPhotoCount: { max: 5 }, categories: ["visual"] },
  weekly:      { supportedRatios: ["3:4", "auto"], supportsLongNarrative: false, recommendedPhotoCount: { max: 6 }, categories: ["visual"] },
  subjects:    { supportedRatios: ["3:4", "auto"], supportsLongNarrative: false, recommendedPhotoCount: { max: 6 }, categories: ["visual"] },
  reportcard:  { supportedRatios: ["3:4", "auto"], supportsLongNarrative: false, recommendedPhotoCount: { max: 10 }, categories: ["visual", "formal"] },
  portfolio:   { supportedRatios: ["3:4", "auto"], supportsLongNarrative: false, recommendedPhotoCount: { min: 1, max: 4 }, categories: ["visual", "playful"] },
  checklist:   { supportedRatios: ["3:4", "auto"], supportsLongNarrative: false, recommendedPhotoCount: { max: 8 }, categories: ["visual"] },

  // ── analytic ───────────────────────────────────────────────────────────
  summary:     { supportedRatios: ["3:4", "auto"], supportsLongNarrative: true,  recommendedPhotoCount: { max: 7 }, categories: ["analytic"] },
  growth:      { supportedRatios: ["3:4", "auto"], supportsLongNarrative: false, recommendedPhotoCount: { max: 5 }, categories: ["analytic"] },
  dossier:     { supportedRatios: ["3:4", "auto"], supportsLongNarrative: true,  recommendedPhotoCount: { max: 5 }, categories: ["analytic"] },
  analytics:   { supportedRatios: ["3:4", "auto"], supportsLongNarrative: false, recommendedPhotoCount: { max: 6 }, categories: ["analytic"] },
  narrative:   { supportedRatios: ["auto"],         supportsLongNarrative: true,  recommendedPhotoCount: { max: 5 }, categories: ["analytic"] },

  // ── modern ─────────────────────────────────────────────────────────────
  milestone:   { supportedRatios: ["3:4", "auto"], supportsLongNarrative: true,  recommendedPhotoCount: { max: 5 }, categories: ["modern"] },
  split:       { supportedRatios: ["3:4", "auto"], supportsLongNarrative: false, recommendedPhotoCount: { min: 1, max: 4 }, categories: ["modern"] },
  journal:     { supportedRatios: ["3:4", "auto"], supportsLongNarrative: true,  recommendedPhotoCount: { max: 6 }, categories: ["modern", "playful"] },
  overview:    { supportedRatios: ["3:4", "auto"], supportsLongNarrative: false, recommendedPhotoCount: { min: 1, max: 4 }, categories: ["modern"] },
  minimal:     { supportedRatios: ["3:4", "auto"], supportsLongNarrative: true,  recommendedPhotoCount: { max: 8 }, categories: ["modern", "formal"] },
  bullets:     { supportedRatios: ["3:4", "auto"], supportsLongNarrative: false, recommendedPhotoCount: { max: 8 }, categories: ["modern", "formal"] },
  compare:     { supportedRatios: ["3:4", "auto"], supportsLongNarrative: false, recommendedPhotoCount: { max: 8 }, categories: ["modern", "analytic"] },
  snapshot:    { supportedRatios: ["3:4", "auto"], supportsLongNarrative: false, recommendedPhotoCount: { min: 1, max: 6 }, categories: ["modern", "playful"] },
  infographic: { supportedRatios: ["3:4", "auto"], supportsLongNarrative: false, recommendedPhotoCount: { max: 6 }, categories: ["modern", "formal"] },
  cover:       { supportedRatios: ["3:4", "auto"], supportsLongNarrative: true,  recommendedPhotoCount: { max: 8 }, categories: ["modern"] },
};

/** Gabungkan metadata kompatibilitas ke objek layout (tanpa menyentuh `render`). */
export function mergeLayoutMeta(layout: Layout): Layout {
  const compat = LAYOUT_COMPAT[layout.id] ?? DEFAULT_COMPAT;
  return { ...layout, ...compat };
}