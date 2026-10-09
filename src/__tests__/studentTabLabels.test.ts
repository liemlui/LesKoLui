import { describe, expect, it } from "vitest";
import studentDetailSrc from "../screens/StudentDetail.tsx?raw";
import screenshotAuditSrc from "../../e2e/screenshot-audit.spec.ts?raw";

/**
 * Penjaga kesesuaian label tab layar Murid dengan spec tangkapan layar.
 *
 * Kenapa penjaga ini ada, padahal `ATURAN-AI.md` §1 butir 4 melarang menambah
 * penjaga tanpa alasan yang menyentuh regresi nyata: **regresi ini sudah terjadi
 * dan sudah terdokumentasi.** `e2e/screenshot-audit.spec.ts` pernah menekan label
 * tab yang sudah lama tidak ada ("Bulan Ini", "Penagihan", "Rekap Tahunan"),
 * dan karena `clickTab` menelan kegagalannya lewat `catch`, test itu **lulus**
 * sambil memotret layar yang tidak berpindah. Artinya katalog tangkapan layar
 * berisi gambar berlabel tab yang tidak pernah dibuka.
 *
 * Label tab berubah lagi pada 2026-10-09 (G3-06 fase A): "Sesi & Jadwal" → "Sesi"
 * dan "IA/EE/PP" → "Proyek". Tanpa penjaga ini, spec dan daftar label di dokumen
 * panduan audit bisa tertinggal tanpa ada yang gagal.
 *
 * Cara kerjanya sama dengan `moneyGate.test.ts` dan `nativeDialogs.test.ts`:
 * membaca BERKAS SUMBER, bukan DOM. Yang diperiksa hanya hal yang bisa dibuktikan
 * dari teks, bukan perilaku klik.
 */

/** Empat label tab di `StudentDetail.tsx`, diambil dari array `tabs={[...]}`. */
function screenTabLabels(): string[] {
  const match = /tabs=\{\[([\s\S]*?)\]\}/.exec(studentDetailSrc);
  if (!match) throw new Error("array tabs={[...]} tidak ditemukan di StudentDetail.tsx");
  return [...match[1].matchAll(/label:\s*"([^"]+)"/g)].map((m) => m[1]);
}

/** Daftar label yang ditekan spec tangkapan layar untuk test 03-student-detail. */
function specTabLabels(): string[] {
  const match = /test\("03-student-detail"[\s\S]*?for \(const t of \[([^\]]*)\]\)/.exec(screenshotAuditSrc);
  if (!match) throw new Error("daftar label test 03-student-detail tidak ditemukan");
  return [...match[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

describe("label tab layar Murid", () => {
  it("memakai peta tab yang mengikat: Ringkas · Sesi · Progres · Proyek", () => {
    // Keputusan `ATURAN-AI.md` §4.1 "Tetap" menyebut peta ini secara eksplisit.
    expect(screenTabLabels()).toEqual(["Ringkas", "Sesi", "Progres", "Proyek"]);
  });

  it("genap empat tab, tanpa label kembar", () => {
    const labels = screenTabLabels();
    expect(labels).toHaveLength(4);
    expect(new Set(labels).size).toBe(4);
  });

  it("tidak lagi memuat label lama yang sudah diganti", () => {
    const labels = screenTabLabels();
    expect(labels).not.toContain("Sesi & Jadwal");
    expect(labels).not.toContain("IA/EE/PP");
    expect(labels).not.toContain("Ringkasan");
  });
});

describe("label tab spec tangkapan layar sesuai layarnya", () => {
  it("daftar di spec sama persis dengan daftar di layar", () => {
    expect(specTabLabels()).toEqual(screenTabLabels());
  });

  it("spec tidak menekan label lama yang tidak ada lagi", () => {
    // Kalau ini gagal, katalog tangkapan layar akan memuat gambar basi sementara
    // test-nya tetap "lulus" — persis kegagalan yang pernah terjadi.
    const labels = specTabLabels();
    expect(labels).not.toContain("Sesi & Jadwal");
    expect(labels).not.toContain("IA/EE/PP");
  });
});

describe("penjaga ini benar-benar bisa gagal", () => {
  it("mengenali label yang berbeda", () => {
    const screen = ["Ringkas", "Sesi", "Progres", "Proyek"];
    const spec = ["Ringkasan", "Sesi & Jadwal", "Progres", "IA/EE/PP"];
    expect(spec).not.toEqual(screen);
  });

  it("menemukan keempat label dari sumber aslinya", () => {
    expect(screenTabLabels()).toHaveLength(4);
    expect(specTabLabels()).toHaveLength(4);
  });
});
