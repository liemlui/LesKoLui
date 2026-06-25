import { describe, it, expect } from "vitest";
import { calcEngagementScore, scoreLabel, scoreBarColor, semesterDateRange, semesterOptions } from "../lib/engagement";

describe("calcEngagementScore", () => {
  it("starts at 5 (neutral)", () => {
    expect(calcEngagementScore({})).toBe(5);
  });

  it("applies positive modifiers", () => {
    expect(calcEngagementScore({ prepared: true })).toBe(7);       // 5+2
    expect(calcEngagementScore({ focused: true })).toBe(6);        // 5+1
    expect(calcEngagementScore({ activeAsking: true })).toBe(6);   // 5+1
    expect(calcEngagementScore({ quickLearner: true })).toBe(6);   // 5+1
  });

  it("applies negative modifiers", () => {
    expect(calcEngagementScore({ playingPhone: true })).toBe(2);    // 5-3
    expect(calcEngagementScore({ drowsy: true })).toBe(3);          // 5-2
    expect(calcEngagementScore({ needsRepetition: true })).toBe(4); // 5-1
    expect(calcEngagementScore({ hwMissed: true })).toBe(4);        // 5-1
  });

  it("clamps to [1, 10]", () => {
    expect(calcEngagementScore({ prepared: true, focused: true, activeAsking: true, quickLearner: true })).toBe(10);
    expect(calcEngagementScore({ playingPhone: true, drowsy: true, needsRepetition: true, hwMissed: true })).toBe(1);
  });

  it("handles mixed modifiers", () => {
    expect(calcEngagementScore({ prepared: true, playingPhone: true })).toBe(4); // 5+2-3
  });
});

describe("scoreLabel", () => {
  it("returns correct labels for score ranges", () => {
    expect(scoreLabel(10).text).toBe("Sangat Serius");
    expect(scoreLabel(9).text).toBe("Sangat Serius");
    expect(scoreLabel(8).text).toBe("Serius");
    expect(scoreLabel(7).text).toBe("Serius");
    expect(scoreLabel(6).text).toBe("Cukup");
    expect(scoreLabel(5).text).toBe("Cukup");
    expect(scoreLabel(4).text).toBe("Kurang Serius");
    expect(scoreLabel(3).text).toBe("Kurang Serius");
    expect(scoreLabel(2).text).toBe("Tidak Serius");
    expect(scoreLabel(1).text).toBe("Tidak Serius");
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
