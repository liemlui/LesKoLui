import { describe, it, expect } from "vitest";
import { weightedMovingAverage, forecastNextMonth } from "../lib/forecast";

describe("weightedMovingAverage", () => {
  it("returns 0 for empty input", () => {
    expect(weightedMovingAverage([])).toBe(0);
  });

  it("returns the single value for one-element input", () => {
    expect(weightedMovingAverage([100])).toBe(100);
  });

  it("applies default weights [0.5, 0.33, 0.17]", () => {
    // Values: oldest→newest = [100, 200, 300]
    // Weights reversed: 0.17*100 + 0.33*200 + 0.5*300 = 17 + 66 + 150 = 233
    const result = weightedMovingAverage([100, 200, 300]);
    expect(result).toBeCloseTo(233, -1);
  });

  it("renormalises when fewer values than weights", () => {
    // Two values [100, 200], weights [0.5, 0.33] → reversed: 0.33*100 + 0.5*200 = 133, sum=0.83, result=160.24
    const result = weightedMovingAverage([100, 200]);
    expect(result).toBeCloseTo(160.24, 0);
  });

  it("accepts custom weights", () => {
    const result = weightedMovingAverage([10, 20, 30], [0.6, 0.3, 0.1]);
    // reversed: 0.1*10 + 0.3*20 + 0.6*30 = 1 + 6 + 18 = 25
    expect(result).toBeCloseTo(25, 0);
  });
});

describe("forecastNextMonth", () => {
  it("returns the larger of scheduled vs trend", () => {
    const result = forecastNextMonth({
      scheduledNext: 500000,
      history: [400000, 450000, 480000],
    });
    expect(result.scheduled).toBe(500000);
    expect(result.trend).toBeGreaterThan(0);
    expect(result.estimate).toBe(Math.max(result.scheduled, result.trend));
  });

  it("trend dominates when no scheduled sessions", () => {
    const result = forecastNextMonth({
      scheduledNext: 0,
      history: [200000, 300000, 400000],
    });
    expect(result.trend).toBeGreaterThan(0);
    expect(result.estimate).toBe(result.trend);
  });

  it("handles empty history gracefully", () => {
    const result = forecastNextMonth({
      scheduledNext: 100000,
      history: [],
    });
    expect(result.trend).toBe(0);
    expect(result.estimate).toBe(100000);
  });
});
