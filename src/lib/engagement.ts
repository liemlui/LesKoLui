import type { EngagementLog, Session, EngagementScoreBasis, EngagementLevel } from "../db/types";

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
  /** @deprecated Sejak audit P2 #15 mood TIDAK lagi menggeser skor (suasana ≠
   *  perilaku). Field tetap diterima agar data lama bisa dihitung ulang dengan
   *  hasil yang sama seperti dulu TIDAK dijamin — lihat catatan di
   *  `calcEngagementScore`. */
  mood?: string;
}

/**
 * Hitung skor engagement (1–10) dari sinyal yang tersedia.
 *
 * Perubahan audit P2 #15: **mood tidak lagi ikut menambah/mengurangi skor.**
 * Suasana hati bukan perilaku belajar, dan mencampurnya membuat satu pengamatan
 * terhitung dua kali (mood "Semangat" +1 dan tag perilaku "Antusias" +1).
 * Mood tetap DISIMPAN pada sesi — ia konteks, bukan nilai.
 *
 * Catatan kompatibilitas: sesi lama yang skornya sudah TERSIMPAN
 * (`engagement.score`) tidak berubah. Sesi lama yang belum punya skor dan
 * dihitung ulang lewat fungsi ini bisa berbeda ≤1 poin dari rumus lama.
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
  if (e.restless)         s -= 1;
  if (e.offTask)          s -= 1;

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
    // partial-correct & can-do-procedurally = neutral
  }

  // ── Mood: SENGAJA TIDAK LAGI DIHITUNG (audit P2 #15) ──
  // Sebelumnya: mood "Semangat" +1, "Kesulitan" −1.

  return Math.max(1, Math.min(10, s));
}

/** Ada pengamatan perilaku/akademik nyata? Dipakai untuk memutuskan apakah skor
 *  boleh dihitung sama sekali (audit P2 #11). */
export function hasObservedSignals(
  e: Partial<ExtendedEngagementInput> & Partial<Omit<EngagementLog, "score">>,
): boolean {
  return Boolean(
    e.prepared || e.focused || e.activeAsking || e.quickLearner ||
    e.drowsy || e.playingPhone || e.needsRepetition || e.hwMissed ||
    e.late || e.bathroomBreaks || e.restless || e.offTask ||
    (e.behaviorValences && e.behaviorValences.length > 0) ||
    e.responseTagId,
  );
}

/**
 * Kelengkapan dasar skor (audit P2 #11) — dipakai laporan supaya rata-rata
 * tidak menyesatkan:
 *   - `full`    : ada indikator inti DAN tag perilaku/ respons akademik
 *   - `partial` : hanya indikator inti (tanpa observasi lanjutan)
 *   - `none`    : belum ada pengamatan sama sekali → skor tidak dihitung
 */
export function engagementScoreBasis(
  e: Partial<ExtendedEngagementInput> & Partial<Omit<EngagementLog, "score">>,
): EngagementScoreBasis {
  if (!hasObservedSignals(e)) return "none";
  const hasAdvanced = Boolean(
    (e.behaviorValences && e.behaviorValences.length > 0) || e.responseTagId,
  );
  return hasAdvanced ? "full" : "partial";
}

/** Label basis skor untuk ditampilkan ke manusia. */
export function scoreBasisLabel(basis: EngagementScoreBasis): string {
  switch (basis) {
    case "full":    return "Lengkap";
    case "partial": return "Sebagian";
    default:        return "Tidak ada pengamatan";
  }
}

/** Label kondisi sesi (audit P2 #12). */
export const ENGAGEMENT_LEVELS: ReadonlyArray<{
  value: EngagementLevel; icon: string; label: string; hint: string; activeClass: string; idleClass: string;
}> = [
  {
    value: "lancar", icon: "✅", label: "Berjalan lancar",
    hint: "Tidak ada yang perlu dicatat khusus",
    activeClass: "bg-green-600 text-white border-green-600",
    idleClass: "bg-white text-green-700 border-green-200 hover:border-green-400 hover:bg-green-50",
  },
  {
    value: "biasa", icon: "🌤️", label: "Seperti biasa",
    hint: "Hari normal — tersimpan sebagai fakta, bukan kekosongan",
    activeClass: "bg-gray-600 text-white border-gray-600",
    idleClass: "bg-white text-gray-700 border-gray-300 hover:border-gray-400 hover:bg-gray-50",
  },
  {
    value: "berat", icon: "⚠️", label: "Berat hari ini",
    hint: "Ada hambatan — tandai sebabnya di lapisan berikutnya",
    activeClass: "bg-orange-600 text-white border-orange-600",
    idleClass: "bg-white text-orange-700 border-orange-200 hover:border-orange-400 hover:bg-orange-50",
  },
];

/** Skor engagement satu sesi (1–10) — dari snapshot, atau dihitung ulang bila
 *  snapshot belum ada. Dipakai untuk rata-rata periode dan tren MoM.
 *
 *  Mengembalikan `undefined` bila sesi tidak mencatat pengamatan apa pun ATAU
 *  basisnya `none` — supaya sesi kosong tidak masuk rata-rata sebagai "5/10".
 *  Sesi lama (tanpa `scoreBasis`) tetap dihormati bila punya skor tersimpan. */
export function sessionEngagementScore(
  session: Pick<Session, "engagement">,
): number | undefined {
  const eng = session.engagement;
  if (!eng) return undefined;
  if (eng.scoreBasis === "none") return undefined;
  if (typeof eng.score === "number" && eng.score > 0) return eng.score;
  // Data lama tanpa skor tersimpan: hitung ulang, tetapi hanya bila ada sinyal.
  if (!hasObservedSignals(eng)) return undefined;
  return calcEngagementScore(eng);
}

/** Rata-rata skor + berapa sesi yang benar-benar punya dasar perhitungan.
 *  `coverage` dipakai laporan agar rata-rata selalu punya penyebut (audit P3 #17). */
export interface EngagementAverage {
  average?: number;
  /** Jumlah sesi yang skornya dihitung. */
  counted: number;
  /** Jumlah sesi yang diperiksa. */
  total: number;
  /** Jumlah sesi yang punya observasi lanjutan (basis `full`). */
  full: number;
  /** Jumlah sesi yang punya entri engagement tetapi basisnya `none`. */
  noObservation: number;
}

export function engagementAverage(
  sessions: readonly Pick<Session, "engagement">[],
): EngagementAverage {
  let counted = 0, sum = 0, full = 0, noObservation = 0;
  for (const s of sessions) {
    const score = sessionEngagementScore(s);
    if (score != null) {
      counted += 1;
      sum += score;
      if (s.engagement?.scoreBasis === "full") full += 1;
    } else if (s.engagement && s.engagement.scoreBasis === "none") {
      noObservation += 1;
    }
  }
  return {
    average: counted > 0 ? Math.round(sum / counted) : undefined,
    counted,
    total: sessions.length,
    full,
    noObservation,
  };
}

/** Rata-rata engagement (dibulatkan) dari sekumpulan sesi. Undefined bila
 *  tidak ada satu pun sesi yang punya data engagement.
 *  @deprecated untuk laporan baru pakai `engagementAverage` yang menyertakan
 *  penyebut (cakupan data). */
export function averageEngagement(
  sessions: readonly Pick<Session, "engagement">[],
): number | undefined {
  return engagementAverage(sessions).average;
}

/**
 * Label + warna status skor. Semua pasangan `color`/`bg` WAJIB memenuhi kontras
 * WCAG AA 4,5:1 (dijaga `src/__tests__/engagementContrast.test.ts`) — versi lama
 * gagal di kelima tingkat (2,86–4,24:1) dan yang terburuk justru status paling
 * sering muncul ("Cukup", karena skor dasar perhitungan = 5). Audit C-08.
 */
export function scoreLabel(score: number): { text: string; color: string; bg: string } {
  if (score >= 9) return { text: "Sangat Baik",     color: "#065F46", bg: "#D1FAE5" };
  if (score >= 7) return { text: "Baik",            color: "#1D4ED8", bg: "#DBEAFE" };
  if (score >= 5) return { text: "Cukup",           color: "#B45309", bg: "#FEF3C7" };
  if (score >= 3) return { text: "Kurang Fokus",    color: "#C2410C", bg: "#FFEDD5" };
  return             { text: "Perlu Perhatian",  color: "#B91C1C", bg: "#FEE2E2" };
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
