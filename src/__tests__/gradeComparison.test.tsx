import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { gradeDelta, GradeComparisonTable } from "../template/layouts";
import { THEMES } from "../template/themes";
import type { GradeComparisonRow } from "../template/types";

describe("gradeDelta", () => {
  it("menghitung selisih numerik positif", () => {
    expect(gradeDelta("6", "7")).toBe("+1");
    expect(gradeDelta("5", "7")).toBe("+2");
  });

  it("menghitung selisih numerik negatif", () => {
    expect(gradeDelta("7", "6")).toBe("-1");
    expect(gradeDelta("7", "5")).toBe("-2");
  });

  it("sama → 'sama'", () => {
    expect(gradeDelta("6", "6")).toBe("sama");
  });

  it("non-numerik → undefined", () => {
    expect(gradeDelta("A", "B")).toBeUndefined();
    expect(gradeDelta("6", undefined)).toBeUndefined();
    expect(gradeDelta(undefined, "7")).toBeUndefined();
  });
});

describe("GradeComparisonTable", () => {
  const rows: GradeComparisonRow[] = [
    { date: "5 Juni", exam: "Paper 2", predicted: "6", actual: "7", delta: "+1" },
    { date: "19 Juni", exam: "Integral", predicted: "7", actual: "5", delta: "-2" },
  ];

  it("tidak render bila tidak ada baris", () => {
    const html = renderToStaticMarkup(<GradeComparisonTable rows={undefined} t={THEMES[0]} />);
    expect(html).toBe("");
  });

  it("menampilkan kolom Tanggal, Ujian, Prediksi, Aktual, Δ", () => {
    const html = renderToStaticMarkup(<GradeComparisonTable rows={rows} t={THEMES[0]} />);
    expect(html).toContain("Tanggal");
    expect(html).toContain("Ujian");
    expect(html).toContain("Prediksi");
    expect(html).toContain("Aktual");
    expect(html).toContain("Paper 2");
    expect(html).toContain("+1");
    expect(html).toContain("-2");
  });
});
