import { describe, it, expect } from "vitest";
import {
  estimateReportSummaryCost,
  estimateNarrativesCost,
  estimatePolishWACost,
  estimateAnalysisCost,
  estimatePaymentReminderCost,
  estimateDraftNoteCost,
} from "../lib/aiClient";

describe("AI cost estimators", () => {
  it("return positive finite IDR amounts", () => {
    for (const v of [
      estimateReportSummaryCost(10),
      estimatePolishWACost(200),
      estimateAnalysisCost(10),
      estimatePaymentReminderCost(),
    ]) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThan(0);
    }
  });

  it("report summary cost grows with session count", () => {
    expect(estimateReportSummaryCost(50)).toBeGreaterThan(estimateReportSummaryCost(1));
  });

  it("narratives cost is positive, grows with sessions, and exceeds summary-only cost", () => {
    expect(estimateNarrativesCost(1)).toBeGreaterThan(0);
    expect(estimateNarrativesCost(20)).toBeGreaterThan(estimateNarrativesCost(2));
    expect(estimateNarrativesCost(10)).toBeGreaterThan(estimateReportSummaryCost(10));
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

  it("draft-note estimate grows when the current textbox draft is sent", () => {
    const base = estimateDraftNoteCost(["Math"], "kinematika");
    const withDraft = estimateDraftNoteCost(["Math"], "kinematika", "fungsi kuadrat masih bingung tanda negatif");
    expect(withDraft.inputTokens).toBeGreaterThan(base.inputTokens);
    expect(withDraft.idrCost).toBeGreaterThan(base.idrCost);
  });
});
