import { afterEach, describe, expect, it, vi } from "vitest";
import { estimateDeepSeekUsd, getDeepSeekPricing } from "../lib/aiConfig";
import { estimateDraftNoteCost, estimateNarrativesCost } from "../lib/aiClient";

afterEach(() => vi.useRealTimers());

describe("DeepSeek V4.1 pricing", () => {
  it.each([
    ["2026-09-11T00:59:59Z", "off-peak"],
    ["2026-09-11T01:00:00Z", "peak"],
    ["2026-09-11T03:59:59Z", "peak"],
    ["2026-09-11T04:00:00Z", "off-peak"],
    ["2026-09-11T06:00:00Z", "peak"],
    ["2026-09-11T09:59:59Z", "peak"],
    ["2026-09-11T10:00:00Z", "off-peak"],
    ["2026-09-12T02:00:00Z", "off-peak"],
    ["2026-09-13T07:00:00Z", "off-peak"],
    ["2026-09-14T01:00:00Z", "peak"],
  ])("uses the billing window at %s", (time, period) => {
    expect(getDeepSeekPricing(new Date(time)).period).toBe(period);
  });

  it("uses current cache-miss rates consistently across cost helpers", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-11T12:00:00Z"));
    expect(estimateDeepSeekUsd(1_000_000, 1_000_000)).toBeCloseTo(0.75);
    const offPeakNarratives = estimateNarrativesCost(3);
    const offPeakDraft = estimateDraftNoteCost(["Math"], "Aljabar", "Latihan persamaan");
    expect(offPeakDraft.idrCost).toBeCloseTo(offPeakDraft.usdCost * 16_000);
    vi.setSystemTime(new Date("2026-09-11T02:00:00Z"));
    expect(estimateDeepSeekUsd(1_000_000, 1_000_000)).toBeCloseTo(1.50);
    expect(estimateNarrativesCost(3)).toBeCloseTo(offPeakNarratives * 2);
    expect(estimateDraftNoteCost(["Math"], "Aljabar", "Latihan persamaan").idrCost)
      .toBeCloseTo(offPeakDraft.idrCost * 2);
  });
});
