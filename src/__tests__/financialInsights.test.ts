import { describe, expect, it } from "vitest";
import { calculateFinancialHistoryAverage } from "../lib/financialInsights";

describe("financial insight history", () => {
  it("uses real billable hours and session counts in the monthly average", () => {
    const average = calculateFinancialHistoryAverage([
      {
        potensi: 600_000,
        realisasi: 500_000,
        laba: 400_000,
        sessions: [{ durationHours: 1 }, { durationHours: 1.5 }],
      },
      {
        potensi: 300_000,
        realisasi: 300_000,
        laba: 250_000,
        sessions: [{ durationHours: 2 }],
      },
      {
        potensi: 900_000,
        realisasi: 700_000,
        laba: 550_000,
        sessions: [{ durationHours: 1 }, { durationHours: 1 }, { durationHours: 1 }],
      },
    ]);

    expect(average).toEqual({
      potensi: 600_000,
      realisasi: 500_000,
      laba: 400_000,
      jam: 2.5,
      sesi: 2,
    });
  });

  it("keeps an empty month in the denominator instead of inflating the baseline", () => {
    const average = calculateFinancialHistoryAverage([
      { potensi: 300_000, realisasi: 150_000, laba: 120_000, sessions: [{ durationHours: 1.5 }] },
      { potensi: 0, realisasi: 0, laba: 0, sessions: [] },
    ]);

    expect(average).toEqual({
      potensi: 150_000,
      realisasi: 75_000,
      laba: 60_000,
      jam: 0.8,
      sesi: 0.5,
    });
  });

  it("returns no baseline when there are no previous months", () => {
    expect(calculateFinancialHistoryAverage([])).toBeUndefined();
  });
});
