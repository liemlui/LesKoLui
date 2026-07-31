import type { EngagementLog } from "../db/types";

export interface ExtendedEngagementInput {
  // Core engagement flags
  prepared?: boolean;
  focused?: boolean;
  activeAsking?: boolean;
  quickLearner?: boolean;
  drowsy?: boolean;
  playingPhone?: boolean;
  needsRepetition?: boolean;
  hwMissed?: boolean;
  // Extended — negative
  late?: boolean;
  bathroomBreaks?: boolean;
  // Extended — behavior taxonomy
  behaviorTagIds?: string[];   // BEHAVIOR_TAGS ids with valence info
  behaviorValences?: ("positive" | "neutral" | "negative")[];  // parallel to behaviorTagIds
  // Extended — academic response
  responseTagId?: string;      // RESPONSE_TAGS id
  // Extended — mood
  mood?: string;
}

/**
 * Compute engagement score (1–10) from all available signals.
 * Positives are boosted; negatives are mild (-1 each).
 * Behavior tags and response quality now contribute.
 */
export function calcEngagementScore(e: Omit<EngagementLog, "score"> & Partial<ExtendedEngagementInput>): number {
  let s = 5;

  // ── Core engagement indicators ──
  if (e.prepared)         s += 2;  // datang siap
  if (e.focused)          s += 1;  // fokus
  if (e.activeAsking)     s += 1;  // aktif bertanya
  if (e.quickLearner)     s += 1;  // cepat paham
  if (e.hwMissed)         s -= 1;
  if (e.needsRepetition)  s -= 1;
  if (e.drowsy)           s -= 1;
  if (e.playingPhone)     s -= 1;
  if (e.late)             s -= 1;
  if (e.bathroomBreaks)   s -= 1;

  // ── Behavior tags (cap at ±3) ──
  if (e.behaviorValences && e.behaviorValences.length > 0) {
    let b = 0;
    for (const v of e.behaviorValences) {
      if (v === "positive") b += 1;
      if (v === "negative") b -= 1;
    }
    b = Math.max(-3, Math.min(3, b));
    s += b;
  }

  // ── Academic response quality ──
  if (e.responseTagId) {
    const rid = e.responseTagId;
    if (rid === "correct-independent")                     s += 2;
    if (rid === "correct-with-prompt")                     s += 1;
    if (rid === "can-explain-orally")                      s += 1;
    if (rid === "transfer-attempt")                        s += 1;
    if (rid === "metacognitive")                           s += 1;
    if (rid === "misconception")                           s -= 2;
    if (rid === "prerequisite-gap")                        s -= 2;
    if (rid === "guessing")                                s -= 1;
    // partial-correct, can-do-procedurally, guessing = neutral
  }

  // ── Mood ──
  if (e.mood === "Semangat")   s += 1;
  if (e.mood === "Kesulitan")  s -= 1;

  return Math.max(1, Math.min(10, s));
}

export function scoreLabel(score: number): { text: string; color: string; bg: string } {
  if (score >= 9) return { text: "Sangat Baik",     color: "#059669", bg: "#D1FAE5" };
  if (score >= 7) return { text: "Baik",             color: "#2563EB", bg: "#DBEAFE" };
  if (score >= 5) return { text: "Cukup",            color: "#D97706", bg: "#FEF3C7" };
  if (score >= 3) return { text: "Kurang Fokus",     color: "#EA580C", bg: "#FFEDD5" };
  return             { text: "Perlu Perhatian",  color: "#DC2626", bg: "#FEE2E2" };
}

export function scoreBarColor(score: number): string {
  if (score >= 8) return "#10B981";
  if (score >= 6) return "#3B82F6";
  if (score >= 4) return "#F59E0B";
  return "#EF4444";
}

/** "2024/2025-S1" → { start: "2024-07-01", end: "2024-12-31" } */
export function semesterDateRange(sem: string): { start: string; end: string } {
  const [years, s] = sem.split("-");
  const [y1, y2]   = years.split("/").map(Number);
  if (s === "S1") return { start: `${y1}-07-01`, end: `${y1}-12-31` };
  return { start: `${y2}-01-01`, end: `${y2}-06-30` };
}

export function currentSemester(): string {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 7 ? `${year}/${year + 1}-S1` : `${year - 1}/${year}-S2`;
}

export function semesterOptions(count = 6): { value: string; label: string }[] {
  const opts: { value: string; label: string }[] = [];
  const now   = new Date();
  let y       = now.getFullYear();
  let s       = now.getMonth() + 1 >= 7 ? 1 : 2;
  if (s === 2) y--;
  for (let i = 0; i < count; i++) {
    const value = `${y}/${y + 1}-S${s}`;
    opts.push({ value, label: `Semester ${s} — ${y}/${y + 1}` });
    if (s === 1) { s = 2; } else { s = 1; y--; }
  }
  return opts;
}

export function semesterLabel(sem: string): string {
  const [years, s] = sem.split("-");
  return `Semester ${s.replace("S", "")} ${years}`;
}
