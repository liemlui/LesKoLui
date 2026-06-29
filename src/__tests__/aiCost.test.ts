import { describe, it, expect } from "vitest";
import {
  estimateReportSummaryCost,
  estimatePolishWACost,
  estimateAnalysisCost,
  estimateHomeworkCost,
  estimatePaymentReminderCost,
  estimateDraftNoteCost,
} from "../lib/aiClient";

describe("AI cost estimators", () => {
  it("return positive finite IDR amounts", () => {
    for (const v of [
      estimateReportSummaryCost(10),
      estimatePolishWACost(200),
      estimateAnalysisCost(10),
      estimateHomeworkCost(),
      estimatePaymentReminderCost(),
    ]) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThan(0);
    }
  });

  it("report summary cost grows with session count", () => {
    expect(estimateReportSummaryCost(50)).toBeGreaterThan(estimateReportSummaryCost(1));
  });

  it("WA polish cost grows with message length", () => {
    expect(estimatePolishWACost(2000)).toBeGreaterThan(estimatePolishWACost(20));
  });

  it("draft-note estimate returns a coherent breakdown", () => {
    const e = estimateDraftNoteCost(["Math", "Physics"], "kinematika");
    expect(e.inputTokens).toBeGreaterThan(0);
    expect(e.outputTokens).toBeGreaterThan(0);
    expect(e.idrCost).toBeCloseTo(e.usdCost * 16000, 5);
  });
});
