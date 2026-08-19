// ── Perbandingan nilai (prediksi vs aktual) ────────────────────────────────
// Mendukung dua skala umum: numerik (IB 1–7, 0–100, desimal koma) dan huruf
// (A+ s.d. F). Skala campuran tidak dibandingkan — hasilnya `false` untuk
// isGradeLower agar tidak memblokir penyimpanan tanpa alasan yang jelas.

const LETTER_SCALE: Record<string, number> = {
  "A+": 12, "A": 11, "A-": 10,
  "B+": 9, "B": 8, "B-": 7,
  "C+": 6, "C": 5, "C-": 4,
  "D+": 3, "D": 2, "D-": 1,
  "E": 0, "F": -1,
};

export function gradeValue(grade: string): number | null {
  const g = grade.trim().toUpperCase();
  if (!g) return null;
  const normalized = g.replace(",", ".");
  const num = Number(normalized);
  if (normalized !== "" && Number.isFinite(num)) return num;
  return LETTER_SCALE[g] ?? null;
}

/** `true` bila nilai aktual lebih rendah dari prediksi (skala numerik/huruf). */
export function isGradeLower(actual: string, predicted: string): boolean {
  const a = gradeValue(actual);
  const p = gradeValue(predicted);
  if (a === null || p === null) return false;
  return a < p;
}
