import { useState, useCallback, useRef } from "react";
import {
  calcEngagementScore, scoreLabel, engagementScoreBasis, hasObservedSignals,
} from "../../lib/engagement";
import type { BehaviorTag, ResponseTag } from "../../lib/responseTaxonomy";
import { BEHAVIOR_TAGS } from "../../lib/responseTaxonomy";
import type { EngagementLevel } from "../../db/types";

export interface EngagementState {
  prepared: boolean;
  focused: boolean;
  activeAsking: boolean;
  quickLearner: boolean;
  drowsy: boolean;
  playingPhone: boolean;
  needsRepetition: boolean;
  hwMissed: boolean;
  late: boolean;
  bathroomBreaks: boolean;
  restless: boolean;
  offTask: boolean;
}

const INITIAL: EngagementState = {
  prepared: false, focused: false, activeAsking: false,
  quickLearner: false, drowsy: false, playingPhone: false,
  needsRepetition: false, hwMissed: false, late: false,
  bathroomBreaks: false, restless: false, offTask: false,
};

/** Urutan tampil indikator di lapisan 2 (audit P2 #13).
 *
 *  Enam pertama = yang paling sering terpakai pada data nyata tutor
 *  (`scripts/analyze-engagement-usage.mjs` atas ekspor 2026-08-23: dari 8 sesi
 *  yang benar-benar memakai indikator, urutan terbanyak = cepat paham → fokus →
 *  aktif bertanya → sudah siap, sedangkan semua indikator negatif 0×).
 *  Sisanya tetap tersedia di balik "lainnya" — jadi tidak ada sinyal yang
 *  hilang, hanya tidak lagi menuntut perhatian tiap sesi. */
export const PRIMARY_ENGAGEMENT_FLAGS: ReadonlyArray<keyof EngagementState> = [
  "focused", "quickLearner", "activeAsking", "prepared",
  "playingPhone", "drowsy",
];

export const SECONDARY_ENGAGEMENT_FLAGS: ReadonlyArray<keyof EngagementState> =
  (Object.keys(INITIAL) as (keyof EngagementState)[])
    .filter((k) => !PRIMARY_ENGAGEMENT_FLAGS.includes(k));

export default function useEngagement() {
  const [flags, setFlags] = useState<EngagementState>(INITIAL);
  const [mood, setMood] = useState<string | undefined>();
  /** Kondisi umum sesi (audit P2 #12) — eksplisit, tidak mengklaim indikator. */
  const [level, setLevel] = useState<EngagementLevel | undefined>();
  const [behaviorTags, setBehaviorTags] = useState<string[]>([]);
  const [responseTag, setResponseTag] = useState<string | undefined>();
  const [showBehavior, setShowBehavior] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<{
    tag: BehaviorTag | ResponseTag; type: "behavior" | "response";
  } | null>(null);
  const [situasiNote, setSituasiNote] = useState("");

  // ── Undo untuk aksi massal (reset) ──────────────────────────────────
  // Preset dulu MENGHAPUS indikator yang sudah ditandai tanpa konfirmasi dan
  // tanpa jalan kembali (audit C-04: 3 flag negatif hilang, skor 2 → 5).
  const snapshotRef = useRef<{ flags: EngagementState; mood?: string; level?: EngagementLevel }>({ flags: INITIAL });
  const undoRef = useRef<{ flags: EngagementState; mood?: string; level?: EngagementLevel } | null>(null);
  const [undoAvailable, setUndoAvailable] = useState(false);
  snapshotRef.current = { flags, mood, level };

  const rememberForUndo = () => {
    undoRef.current = snapshotRef.current;
    setUndoAvailable(true);
  };

  const undo = useCallback(() => {
    const previous = undoRef.current;
    if (!previous) return;
    setFlags(previous.flags);
    setMood(previous.mood);
    setLevel(previous.level);
    undoRef.current = null;
    setUndoAvailable(false);
  }, []);

  const touched =
    flags.prepared || flags.focused || flags.drowsy || flags.playingPhone ||
    flags.activeAsking || flags.quickLearner || flags.needsRepetition ||
    flags.hwMissed || flags.late || flags.bathroomBreaks ||
    flags.restless || flags.offTask;

  const behaviorValences = behaviorTags.length > 0
    ? behaviorTags.map((id) => BEHAVIOR_TAGS.find((t) => t.id === id)?.valence)
        .filter(Boolean) as ("positive" | "neutral" | "negative")[]
    : undefined;

  const scoredInput = {
    ...flags,
    behaviorValences,
    responseTagId: responseTag,
  };

  // Basis skor (audit P2 #11): mood / kondisi umum TIDAK dihitung sebagai
  // pengamatan. Sebelumnya memilih mood saja sudah cukup membuat skor 5/10
  // muncul — angka yang berarti "belum diisi", bukan "cukup".
  const basis = engagementScoreBasis(scoredInput);
  const hasObservation = hasObservedSignals(scoredInput);
  const rawScore = hasObservation ? calcEngagementScore(scoredInput) : 0;
  /** Skor yang ditampilkan. 0 = belum ada pengamatan (bukan "5/10"). */
  const score = rawScore;
  const scoreInfo = score > 0 ? scoreLabel(score) : null;

  /** Ada apa pun yang tersimpan? Termasuk mood/kondisi — keduanya tetap
   *  disimpan sebagai konteks meski tidak membentuk skor. */
  const hasEngagementInput =
    hasObservation || Boolean(mood) || Boolean(level);

  const toggleFlag = useCallback((key: keyof EngagementState) => {
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const resetEngagementFlags = useCallback(() => {
    rememberForUndo();
    setFlags(INITIAL);
    setMood(undefined);
    setLevel(undefined);
  }, []);

  const resetAll = useCallback(() => {
    setFlags(INITIAL);
    setMood(undefined);
    setLevel(undefined);
    setSituasiNote("");
    setBehaviorTags([]);
    setResponseTag(undefined);
    setShowBehavior(false);
    setActiveTooltip(null);
  }, []);

  const hydrate = useCallback((next: {
    flags: EngagementState;
    mood?: string;
    level?: EngagementLevel;
    behaviorTags: string[];
    responseTag?: string;
    situasiNote: string;
  }) => {
    setFlags(next.flags);
    setMood(next.mood);
    setLevel(next.level);
    setBehaviorTags(next.behaviorTags);
    setResponseTag(next.responseTag);
    setSituasiNote(next.situasiNote);
  }, []);

  return {
    flags, mood, setMood,
    level, setLevel,
    behaviorTags, setBehaviorTags,
    responseTag, setResponseTag,
    showBehavior, setShowBehavior,
    activeTooltip, setActiveTooltip,
    situasiNote, setSituasiNote,
    touched, hasEngagementInput, hasObservation, basis,
    score, scoreInfo,
    toggleFlag, resetEngagementFlags, resetAll, hydrate,
    undoAvailable, undo,
  };
}
