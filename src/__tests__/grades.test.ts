import { describe, it, expect } from "vitest";
import { gradeValue, isGradeLower } from "../lib/grades";

describe("gradeValue", () => {
  it("membaca nilai numerik bulat dan desimal koma", () => {
    expect(gradeValue("7")).toBe(7);
    expect(gradeValue("6,5")).toBe(6.5);
    expect(gradeValue("85")).toBe(85);
  });

  it("membaca nilai huruf dengan urutan A+ > A > A- dst", () => {
    expect(gradeValue("A+")).toBe(12);
    expect(gradeValue("A")).toBe(11);
    expect(gradeValue("B")).toBe(8);
    expect(gradeValue("E")).toBe(0);
  });

  it("mengembalikan null untuk nilai kosong atau tak dikenal", () => {
    expect(gradeValue("")).toBeNull();
    expect(gradeValue("lulus")).toBeNull();
  });
});

describe("isGradeLower", () => {
  it("true bila aktual numerik lebih rendah dari prediksi", () => {
    expect(isGradeLower("5", "6")).toBe(true);
    expect(isGradeLower("6", "6")).toBe(false);
    expect(isGradeLower("7", "6")).toBe(false);
  });

  it("true bila aktual huruf lebih rendah dari prediksi", () => {
    expect(isGradeLower("B", "A")).toBe(true);
    expect(isGradeLower("A", "B")).toBe(false);
  });

  it("tidak membandingkan skala campuran atau nilai tak dikenal", () => {
    expect(isGradeLower("80", "6")).toBe(false); // skala beda — jangan blokir
    expect(isGradeLower("", "6")).toBe(false);
    expect(isGradeLower("lulus", "A")).toBe(false);
  });
});
