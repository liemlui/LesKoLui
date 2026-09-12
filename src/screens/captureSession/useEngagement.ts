import { useState, useCallback, useRef } from "react";
import { calcEngagementScore, scoreLabel } from "../../lib/engagement";
import type { BehaviorTag, ResponseTag } from "../../lib/responseTaxonomy";
import { BEHAVIOR_TAGS } from "../../lib/responseTaxonomy";

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

export default function useEngagement() {
  const [flags, setFlags] = useState<EngagementState>(INITIAL);
  const [mood, setMood] = useState<string | undefined>();
  const [behaviorTags, setBehaviorTags] = useState<string[]>([]);
  const [responseTag, setResponseTag] = useState<string | undefined>();
  const [showBehavior, setShowBehavior] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<{
    tag: BehaviorTag | ResponseTag; type: "behavior" | "response";
  } | null>(null);
  const [situasiNote, setSituasiNote] = useState("");

  // ── Undo untuk aksi massal (preset / reset) ──────────────────────────
  // Preset dulu MENGHAPUS indikator yang sudah ditandai tanpa konfirmasi dan
  // tanpa jalan kembali (audit C-04: 3 flag negatif hilang, skor 2 → 5).
  const snapshotRef = useRef<{ flags: EngagementState; mood?: string }>({ flags: INITIAL });
  const undoRef = useRef<{ flags: EngagementState; mood?: string } | null>(null);
  const [undoAvailable, setUndoAvailable] = useState(false);
  snapshotRef.current = { flags, mood };

  const rememberForUndo = () => {
    undoRef.current = snapshotRef.current;
    setUndoAvailable(true);
  };

  const undo = useCallback(() => {
    const previous = undoRef.current;
    if (!previous) return;
    setFlags(previous.flags);
    setMood(previous.mood);
    undoRef.current = null;
    setUndoAvailable(false);
  }, []);

  const touched =
    flags.prepared || flags.focused || flags.drowsy || flags.playingPhone ||
    flags.activeAsking || flags.quickLearner || flags.needsRepetition ||
    flags.hwMissed || flags.late || flags.bathroomBreaks ||
    flags.restless || flags.offTask;

  const hasEngagementInput =
    touched || behaviorTags.length > 0 || Boolean(responseTag) || Boolean(mood);

  const score = hasEngagementInput
    ? calcEngagementScore({
        ...flags,
        behaviorValences: behaviorTags.length > 0
          ? behaviorTags.map((id) => BEHAVIOR_TAGS.find((t) => t.id === id)?.valence)
              .filter(Boolean) as ("positive" | "neutral" | "negative")[]
          : undefined,
        responseTagId: responseTag,
        mood,
      })
    : 0;
  const scoreInfo = score > 0 ? scoreLabel(score) : null;

  const toggleFlag = useCallback((key: keyof EngagementState) => {
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const resetEngagementFlags = useCallback(() => {
    rememberForUndo();
    setFlags(INITIAL);
    setMood(undefined);
  }, []);

  /**
   * Preset bersifat ADITIF: hanya menyalakan indikator yang disebut `pattern`.
   * Sebelumnya `{ ...INITIAL, ...pattern }` mengosongkan seluruh indikator lain
   * secara diam-diam (audit C-04) — pada aplikasi rekam-jejak, kehilangan sinyal
   * perilaku berarti mengubah skor engagement, narasi, dan dasar tindak lanjut
   * tanpa jejak bahwa hal itu terjadi.
   */
  const applyPreset = useCallback((pattern: Partial<EngagementState>, nextMood?: string) => {
    rememberForUndo();
    setFlags((prev) => ({ ...prev, ...pattern }));
    setMood(nextMood);
  }, []);

  const resetAll = useCallback(() => {
    setFlags(INITIAL);
    setMood(undefined);
    setSituasiNote("");
    setBehaviorTags([]);
    setResponseTag(undefined);
    setShowBehavior(false);
    setActiveTooltip(null);
  }, []);

  const hydrate = useCallback((next: {
    flags: EngagementState;
    mood?: string;
    behaviorTags: string[];
    responseTag?: string;
    situasiNote: string;
  }) => {
    setFlags(next.flags);
    setMood(next.mood);
    setBehaviorTags(next.behaviorTags);
    setResponseTag(next.responseTag);
    setSituasiNote(next.situasiNote);
  }, []);

  return {
    flags, mood, setMood,
    behaviorTags, setBehaviorTags,
    responseTag, setResponseTag,
    showBehavior, setShowBehavior,
    activeTooltip, setActiveTooltip,
    situasiNote, setSituasiNote,
    touched, hasEngagementInput,
    score, scoreInfo,
    toggleFlag, applyPreset, resetEngagementFlags, resetAll, hydrate,
    undoAvailable, undo,
  };
}
