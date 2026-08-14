import { describe, it, expect } from "vitest";
import { searchTopics } from "../lib/ibTopics";

describe("searchTopics — curriculum & grade filtering", () => {
  it("filters National students to National topics (not IB)", () => {
    const results = searchTopics("integral", { subject: "Matematika", grade: "XII", curriculum: "National" });
    expect(results.length).toBeGreaterThan(0);
    // Every result must be a National (SMP/SMA) topic — no MYP/DP/IGCSE bleed-through.
    for (const r of results) {
      const lvl = r.level.toLowerCase();
      expect(lvl.startsWith("smp") || lvl.startsWith("sma")).toBe(true);
    }
  });

  it("filters IB MYP students to MYP topics", () => {
    const results = searchTopics("ratio", { subject: "Mathematics", grade: "Grade 7", curriculum: "IB MYP" });
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.level.toLowerCase().startsWith("myp")).toBe(true);
    }
  });

  it("filters IB DP students to DP topics", () => {
    const results = searchTopics("calculus", { subject: "Math AA HL", grade: "Grade 12", curriculum: "IB DP" });
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.level.toLowerCase()).toBe("dp");
    }
  });

  it("resolves National roman-numeral grade (XII) to SMA 12", () => {
    // "dimensi tiga" hanya ada di SMA 12 → membuktikan "XII" ter-parse jadi SMA 12.
    const results = searchTopics("dimensi tiga", { subject: "Matematika", grade: "XII", curriculum: "National" });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].level).toBe("SMA 12");
  });

  it("AP student searching calculus gets AP topics", () => {
    const results = searchTopics("derivative", { subject: "AP Calculus AB", curriculum: "AP" });
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.level.toLowerCase()).toBe("ap");
    }
  });

  it("falls back to all topics when curriculum has no match", () => {
    // "perbandingan" appears in National but not in, e.g., AP — still returns results via fallback.
    const results = searchTopics("perbandingan senilai", { subject: "Matematika", curriculum: "AP" });
    expect(results.length).toBeGreaterThan(0);
  });
});
