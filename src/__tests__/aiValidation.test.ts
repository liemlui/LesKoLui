import { describe, expect, it } from "vitest";
import {
  AiValidationError,
  validateAiDraftNote,
  validateAiNarratives,
  validateAiReportSummary,
} from "../lib/aiValidation";

describe("AI response validation", () => {
  it.each([null, [], "text", {}])("rejects invalid root %j", (value) => {
    expect(() => validateAiReportSummary(value)).toThrow(AiValidationError);
  });

  it("accepts valid optional-free summary output", () => {
    expect(validateAiReportSummary({ summary: "Ringkasan perkembangan." })).toMatchObject({
      summary: "Ringkasan perkembangan.",
    });
  });

  it("accepts a plan with optional priority fields absent", () => {
    expect(validateAiReportSummary({
      summary: "Valid",
      nextMonthPlan: { priorities: [{ target: "Latihan rutin" }] },
    })).toMatchObject({ summary: "Valid" });
  });

  it("rejects malformed nested plan before callers inspect priorities", () => {
    expect(() => validateAiReportSummary({
      summary: "Valid",
      nextMonthPlan: { priorities: [{ subject: "Math", evidence: "Bukti", target: {} }] },
    })).toThrow(/target/);
  });

  it("requires exactly the requested narrative IDs without duplicates or foreign IDs", () => {
    const valid = { entries: [{ id: "s1", narrative: "Narasi sesi." }], summary: "Ringkasan." };
    expect(validateAiNarratives(valid, ["s1"])).toEqual(valid);
    expect(() => validateAiNarratives({ entries: [{ id: "foreign", narrative: "x" }], summary: "x" }, ["s1"]))
      .toThrow(/tidak diminta/);
    expect(() => validateAiNarratives({ entries: [{ id: "s1", narrative: "x" }, { id: "s1", narrative: "y" }], summary: "x" }, ["s1"]))
      .toThrow(/duplikat/);
    expect(() => validateAiNarratives({ entries: [], summary: "x" }, ["s1"]))
      .toThrow(/tidak lengkap/);
  });

  it("requires a non-empty draft note", () => {
    expect(validateAiDraftNote({ note: "Catatan valid." })).toMatchObject({ note: "Catatan valid." });
    expect(() => validateAiDraftNote({ note: " " })).toThrow(AiValidationError);
  });
});
