import { describe, it, expect } from "vitest";
import { escapeCsvCell } from "../lib/csv";

describe("escapeCsvCell", () => {
  it("wraps values in quotes and doubles inner quotes", () => {
    expect(escapeCsvCell("hello")).toBe('"hello"');
    expect(escapeCsvCell('he said "hi"')).toBe('"he said ""hi"""');
  });

  it("neutralises CSV formula-injection prefixes", () => {
    expect(escapeCsvCell("=SUM(A1)")).toBe(`"'=SUM(A1)"`);
    expect(escapeCsvCell("+1")).toBe(`"'+1"`);
    expect(escapeCsvCell("-1")).toBe(`"'-1"`);
    expect(escapeCsvCell("@cmd")).toBe(`"'@cmd"`);
  });

  it("handles numbers and nullish values", () => {
    expect(escapeCsvCell(150000)).toBe('"150000"');
    expect(escapeCsvCell(undefined)).toBe('""');
    expect(escapeCsvCell(null)).toBe('""');
  });

  it("leaves a plain comma-containing string safe inside quotes", () => {
    expect(escapeCsvCell("Budi, Jr.")).toBe('"Budi, Jr."');
  });
});
