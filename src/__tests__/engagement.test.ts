import { describe, it, expect } from "vitest";
import { calcEngagementScore, scoreLabel, scoreBarColor, semesterDateRange, semesterOptions } from "../lib/engagement";

describe("calcEngagementScore", () => {
  it("starts at 5 (neutral)", () => {
    expect(calcEngagementScore({})).toBe(5);
  });

  it("applies positive modifiers (boosted)", () => {
    expect(calcEngagementScore({ prepared: true })).toBe(7);       // 5+2
    expect(calcEngagementScore({ focused: true })).toBe(6);        // 5+1
    expect(calcEngagementScore({ activeAsking: true })).toBe(6);   // 5+1
    expect(calcEngagementScore({ quickLearner: true })).toBe(6);   // 5+1
  });

  it("applies negative modifiers (mild)", () => {
    expect(calcEngagementScore({ playingPhone: true })).toBe(4);    // 5-1
    expect(calcEngagementScore({ drowsy: true })).toBe(4);          // 5-1
    expect(calcEngagementScore({ needsRepetition: true })).toBe(4); // 5-1
    expect(calcEngagementScore({ hwMissed: true })).toBe(4);        // 5-1
  });

  it("clamps to [1, 10]", () => {
    expect(calcEngagementScore({ prepared: true, focused: true, activeAsking: true, quickLearner: true })).toBe(10);
    expect(calcEngagementScore({ playingPhone: true, drowsy: true, needsRepetition: true, hwMissed: true })).toBe(1);
  });

  it("handles mixed modifiers", () => {
    expect(calcEngagementScore({ prepared: true, playingPhone: true })).toBe(6); // 5+2-1
  });

  // ── New: behavior tags ──
  it("adds positive behavior tags (+1 each, max +3)", () => {
    expect(calcEngagementScore({
      behaviorValences: ["positive"],
    })).toBe(6); // 5+1

    expect(calcEngagementScore({
      behaviorValences: ["positive", "positive", "positive"],
    })).toBe(8); // 5+3

    expect(calcEngagementScore({
      behaviorValences: ["positive", "positive", "positive", "positive", "positive"],
    })).toBe(8); // 5+3, capped
  });

  it("subtracts negative behavior tags (-1 each, max -3)", () => {
    expect(calcEngagementScore({
      behaviorValences: ["negative"],
    })).toBe(4); // 5-1

    expect(calcEngagementScore({
      behaviorValences: ["negative", "negative", "negative"],
    })).toBe(2); // 5-3

    expect(calcEngagementScore({
      behaviorValences: ["negative", "negative", "negative", "negative"],
    })).toBe(2); // 5-3, capped
  });

  it("neutral behavior tags have no effect", () => {
    expect(calcEngagementScore({
      behaviorValences: ["neutral", "neutral"],
    })).toBe(5); // unchanged
  });

  it("handles mixed behavior valences", () => {
    expect(calcEngagementScore({
      behaviorValences: ["positive", "positive", "negative"],
    })).toBe(6); // 5+2-1=6
  });

  // ── New: response quality ──
  it("rewards high-quality academic response", () => {
    expect(calcEngagementScore({ responseTagId: "correct-independent" })).toBe(7);   // 5+2
    expect(calcEngagementScore({ responseTagId: "correct-with-prompt" })).toBe(6);   // 5+1
    expect(calcEngagementScore({ responseTagId: "can-explain-orally" })).toBe(6);    // 5+1
    expect(calcEngagementScore({ responseTagId: "transfer-attempt" })).toBe(6);      // 5+1
    expect(calcEngagementScore({ responseTagId: "metacognitive" })).toBe(6);         // 5+1
  });

  it("penalizes misconception and prerequisite gaps", () => {
    expect(calcEngagementScore({ responseTagId: "misconception" })).toBe(3);         // 5-2
    expect(calcEngagementScore({ responseTagId: "prerequisite-gap" })).toBe(3);      // 5-2
    expect(calcEngagementScore({ responseTagId: "guessing" })).toBe(4);              // 5-1
  });

  it("neutral response tags have no effect", () => {
    expect(calcEngagementScore({ responseTagId: "partial-correct" })).toBe(5);
    expect(calcEngagementScore({ responseTagId: "can-do-procedurally" })).toBe(5);
  });

  // ── New: mood ──
  it("factors in mood", () => {
    expect(calcEngagementScore({ mood: "Semangat" })).toBe(6);    // 5+1
    expect(calcEngagementScore({ mood: "Kesulitan" })).toBe(4);   // 5-1
    expect(calcEngagementScore({ mood: "Biasa" })).toBe(5);       // neutral
    expect(calcEngagementScore({ mood: "Fokus" })).toBe(5);       // neutral
    expect(calcEngagementScore({ mood: "Lelah" })).toBe(5);       // neutral
  });

  // ── Full combo ──
  it("combines all signals correctly", () => {
    // Best case: good indicators + positive behavior + correct response + semangat
    expect(calcEngagementScore({
      prepared: true, focused: true,
      behaviorValences: ["positive", "positive"],
      responseTagId: "correct-independent",
      mood: "Semangat",
    })).toBe(10); // 5+3+2+2+2+1 = 15 → clamp 10

    // Worst case: bad indicators + negative behavior + misconception + kesulitan
    expect(calcEngagementScore({
      drowsy: true, playingPhone: true,
      behaviorValences: ["negative", "negative"],
      responseTagId: "misconception",
      mood: "Kesulitan",
    })).toBe(1); // 5-1-1-2-2-1 = -2 → clamp 1
  });
});

describe("scoreLabel", () => {
  it("returns correct labels for score ranges", () => {
    expect(scoreLabel(10).text).toBe("Sangat Baik");
    expect(scoreLabel(9).text).toBe("Sangat Baik");
    expect(scoreLabel(8).text).toBe("Baik");
    expect(scoreLabel(7).text).toBe("Baik");
    expect(scoreLabel(6).text).toBe("Cukup");
    expect(scoreLabel(5).text).toBe("Cukup");
    expect(scoreLabel(4).text).toBe("Kurang Fokus");
    expect(scoreLabel(3).text).toBe("Kurang Fokus");
    expect(scoreLabel(2).text).toBe("Perlu Perhatian");
    expect(scoreLabel(1).text).toBe("Perlu Perhatian");
  });
});

describe("scoreBarColor", () => {
  it("returns correct colors", () => {
    expect(scoreBarColor(10)).toBe("#10B981");
    expect(scoreBarColor(8)).toBe("#10B981");
    expect(scoreBarColor(7)).toBe("#3B82F6");
    expect(scoreBarColor(6)).toBe("#3B82F6");
    expect(scoreBarColor(5)).toBe("#F59E0B");
    expect(scoreBarColor(4)).toBe("#F59E0B");
    expect(scoreBarColor(3)).toBe("#EF4444");
    expect(scoreBarColor(1)).toBe("#EF4444");
  });
});

describe("semesterDateRange", () => {
  it("computes S1 range (Jul-Dec)", () => {
    const r = semesterDateRange("2024/2025-S1");
    expect(r.start).toBe("2024-07-01");
    expect(r.end).toBe("2024-12-31");
  });

  it("computes S2 range (Jan-Jun)", () => {
    const r = semesterDateRange("2024/2025-S2");
    expect(r.start).toBe("2025-01-01");
    expect(r.end).toBe("2025-06-30");
  });
});

describe("semesterOptions", () => {
  it("returns correct number of options", () => {
    expect(semesterOptions(3)).toHaveLength(3);
    expect(semesterOptions(6)).toHaveLength(6);
  });

  it("returns properly formatted values", () => {
    const opts = semesterOptions(2);
    expect(opts.length).toBeGreaterThanOrEqual(2);
    expect(opts[0].value).toMatch(/^\d{4}\/\d{4}-S[12]$/);
    expect(opts[0].label).toMatch(/^Semester [12]/);
  });
});
