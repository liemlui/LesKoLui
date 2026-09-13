import { describe, expect, it } from "vitest";
import {
  AiValidationError,
  validateAiDraftNote,
  validateAiDraftStudyNote,
  validateAiNarratives,
  validateAiPolishedWa,
  validateAiReportSummary,
  validateAiStudentInsight,
  validateFinancialInsights,
} from "../lib/aiValidation";

const SINGLE_FIELD_PARSERS: ReadonlyArray<(value: unknown) => unknown> = [
  validateAiReportSummary, validateAiDraftNote, validateAiPolishedWa,
  validateAiStudentInsight, validateAiDraftStudyNote, validateFinancialInsights,
];

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

  it.each([null, [], "text", 42, {}])("rejects invalid root for every AI feature %j", (value) => {
    for (const parse of SINGLE_FIELD_PARSERS) {
      expect(() => parse(value)).toThrow(AiValidationError);
    }
    expect(() => validateAiNarratives(value, [])).toThrow(AiValidationError);
  });

  it("rejects valid JSON whose main field has the wrong type", () => {
    expect(() => validateAiReportSummary({ summary: {} })).toThrow(/summary/);
    expect(() => validateAiDraftNote({ note: 12 })).toThrow(/note/);
    expect(() => validateAiPolishedWa({ message: [] })).toThrow(/message/);
    expect(() => validateAiDraftStudyNote({ content: " " })).toThrow(/content/);
    expect(() => validateAiStudentInsight({ patterns: "bukan array", nextFocus: "x", encouragement: "y" }))
      .toThrow(/patterns/);
    expect(() => validateFinancialInsights({ anomali: [{ level: "kritis", text: "x" }], rekomendasi: [] }))
      .toThrow(/level/);
    expect(() => validateAiNarratives({ entries: [{ id: "s1", narrative: {} }], summary: "x" }, ["s1"]))
      .toThrow(/narrative/);
  });

  it("accepts a minimal valid response for every AI feature", () => {
    expect(validateAiReportSummary({ summary: "Ringkasan." })).toEqual({ summary: "Ringkasan." });
    expect(validateAiDraftNote({ note: "Catatan." })).toEqual({ note: "Catatan." });
    expect(validateAiPolishedWa({ message: "Halo." })).toEqual({ message: "Halo." });
    expect(validateAiDraftStudyNote({ content: "Isi catatan." })).toEqual({ content: "Isi catatan." });
    expect(validateAiStudentInsight({ patterns: ["Sering terlambat"], nextFocus: "Fokus", encouragement: "Semangat" }))
      .toMatchObject({ nextFocus: "Fokus", encouragement: "Semangat" });
    expect(validateFinancialInsights({ anomali: [], rekomendasi: [] })).toMatchObject({ anomali: [] });
    expect(validateAiNarratives({ entries: [{ id: "s1", narrative: "N" }], summary: "S" }, ["s1"]))
      .toMatchObject({ summary: "S" });
  });
});
