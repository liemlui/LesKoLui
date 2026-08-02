// ── Barrel export — semua layout + helpers ──────────────────────────
// Di-split dari layouts.tsx (sebelumnya 1504 baris).
// Import dari "../template/layouts" tetap jalan tanpa perubahan.

// Shared helpers (React components + utility functions)
export {
  HeaderEl, LogoEl, LabelEl, DetailsEl, PhotoEl, NarrEl, EngagementBar,
  SummaryEl, Sparkline,
  clean, entryDate, entryDateShort, entryDay, entrySubject, entrySubjectShort,
  entryNarrative, entryDetails, detailText, truncateText, onColor,
  EMPTY_NARRATIVE, EMPTY_SUBJECT, EMPTY_DATE,
} from "./helpers";

// Layout objects
export {
  cards, timeline, scrapbook, grid, compact,
} from "./classic";

export {
  dashboard, progress, weekly, subjects, reportcard,
  portfolio, checklist,
} from "./visual";

export {
  summary, growth, dossier, analytics, narrative,
} from "./analytic";

export {
  milestone, split, journal, overview, minimal, bullets,
  compare, snapshot, infographic, cover,
} from "./modern";

// Registry
import * as classicMod from "./classic";
import * as visualMod from "./visual";
import * as analyticMod from "./analytic";
import * as modernMod from "./modern";
import type { Layout } from "../types";

export const LAYOUTS: Layout[] = [
  modernMod.infographic,
  classicMod.cards, classicMod.timeline, classicMod.scrapbook, classicMod.grid, classicMod.compact,
  visualMod.dashboard, visualMod.progress, visualMod.weekly, visualMod.subjects, visualMod.reportcard,
  visualMod.portfolio, visualMod.checklist,
  analyticMod.summary, analyticMod.growth, analyticMod.dossier,
  analyticMod.analytics, analyticMod.narrative,
  modernMod.milestone, modernMod.split, modernMod.journal,
  modernMod.overview, modernMod.minimal, modernMod.bullets, modernMod.compare, modernMod.snapshot,
];
export const LAYOUT_IDS = LAYOUTS.map((l) => l.id);
export function getLayout(id: string): Layout {
  return LAYOUTS.find((l) => l.id === id) ?? classicMod.cards;
}
