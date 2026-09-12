import { describe, expect, it } from "vitest";
import { scoreLabel } from "../lib/engagement";

/** Kontras WCAG 2.x untuk dua warna heksadesimal. */
function contrast(hexA: string, hexB: string): number {
  const channel = (value: number) => {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const luminance = (hex: string) => {
    const r = channel(parseInt(hex.slice(1, 3), 16));
    const g = channel(parseInt(hex.slice(3, 5), 16));
    const b = channel(parseInt(hex.slice(5, 7), 16));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const l1 = luminance(hexA);
  const l2 = luminance(hexB);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

describe("scoreLabel kontras (penjaga C-08)", () => {
  // Setiap skor 1..10 harus memakai pasangan warna yang lolos AA 4,5:1.
  it("semua tingkat skor memenuhi WCAG AA 4,5:1", () => {
    for (let score = 1; score <= 10; score += 1) {
      const { text, color, bg } = scoreLabel(score);
      const ratio = contrast(color, bg);
      expect(ratio, `skor ${score} (${text}) = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("teks status terburuk tetap terbaca (status paling sering: Cukup)", () => {
    expect(contrast(scoreLabel(5).color, scoreLabel(5).bg)).toBeGreaterThanOrEqual(4.5);
  });
});
