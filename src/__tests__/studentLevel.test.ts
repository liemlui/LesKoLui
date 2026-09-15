import { describe, it, expect } from "vitest";
import { levelForCurriculum, levelLabel } from "../db/types";
import type { Level } from "../db/types";
import { ALL_CURRICULA } from "../lib/ibSubjects";

/**
 * Audit P0 T-07 — jenjang murid.
 *
 * Sebelum perbaikan, `Level` hanya `"MYP" | "IBDP" | "UNIV"` dan
 * `curriculumToLevel()` memetakan SEMUA kurikulum non-IB ke `"UNIV"`, sehingga
 * siswa Cambridge O Level kelas 9 tertulis sebagai jenjang universitas di kartu
 * murid, ekspor CSV, dan laporan.
 */
describe("levelForCurriculum", () => {
  it("memberi jenjang yang benar untuk setiap kurikulum", () => {
    expect(levelForCurriculum("IB MYP")).toBe("MYP");
    expect(levelForCurriculum("IB DP")).toBe("IBDP");
    expect(levelForCurriculum("Cambridge IGCSE")).toBe("IGCSE");
    expect(levelForCurriculum("Cambridge O Level")).toBe("O Level");
    expect(levelForCurriculum("Cambridge AS Level")).toBe("A Level");
    expect(levelForCurriculum("Cambridge A Level")).toBe("A Level");
    expect(levelForCurriculum("AP")).toBe("AP");
    expect(levelForCurriculum("National")).toBe("SMP");
  });

  it("TIDAK pernah mengembalikan UNIV untuk kurikulum sekolah", () => {
    // "UNIV" hanya untuk Custom. Ini inti perbaikan T-07.
    for (const c of ALL_CURRICULA) {
      if (c === "Custom") continue;
      expect(levelForCurriculum(c), `kurikulum ${c} masih memakai UNIV`).not.toBe("UNIV");
    }
  });

  it("hasilnya selalu anggota tipe Level", () => {
    const known: Level[] = ["MYP", "IBDP", "IGCSE", "O Level", "A Level", "AP", "SMP", "SMA", "UNIV"];
    for (const c of ALL_CURRICULA) {
      expect(known).toContain(levelForCurriculum(c));
    }
  });
});

describe("levelLabel", () => {
  it("menyebut kelas untuk kurikulum nasional dengan jenjang SMP/SMA", () => {
    expect(levelLabel({ level: "SMP", curriculum: "National", grade: "8" })).toBe("SMP · Kelas 8");
    expect(levelLabel({ level: "SMP", curriculum: "National", grade: "12" })).toBe("SMA · Kelas 12");
    expect(levelLabel({ level: "SMP", curriculum: "National", grade: "XII" })).toBe("Nasional · Kelas XII");
  });

  it("mempertahankan konteks MYP dan kurikulum lain", () => {
    expect(levelLabel({ level: "MYP", curriculum: "IB MYP", grade: "Grade 9" })).toBe("MYP · Grade 9");
    expect(levelLabel({ level: "IGCSE", curriculum: "Cambridge IGCSE", grade: "Grade 10" })).toBe("IGCSE · Grade 10");
  });

  it("tidak menambah pemisah bila kelas kosong", () => {
    expect(levelLabel({ level: "IBDP", curriculum: "IB DP" })).toBe("IBDP");
    expect(levelLabel({ level: "AP", curriculum: "AP", grade: "  " })).toBe("AP");
  });
});
