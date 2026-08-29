import { useState, useCallback } from "react";
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
    setFlags(INITIAL);
    setMood(undefined);
  }, []);

  const applyPreset = useCallback((pattern: Partial<EngagementState>, nextMood?: string) => {
    setFlags({ ...INITIAL, ...pattern });
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

  return {
    flags, mood, setMood,
    behaviorTags, setBehaviorTags,
    responseTag, setResponseTag,
    showBehavior, setShowBehavior,
    activeTooltip, setActiveTooltip,
    situasiNote, setSituasiNote,
    touched, hasEngagementInput,
    score, scoreInfo,
    toggleFlag, applyPreset, resetEngagementFlags, resetAll,
  };
}
