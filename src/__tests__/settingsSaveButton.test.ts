import { describe, expect, it } from "vitest";
import { saveButtonState } from "../lib/settingsPresentation";

describe("saveButtonState (audit V-02)", () => {
  it("menonaktifkan tombol dan pakai kontras AA saat tidak ada perubahan", () => {
    const s = saveButtonState(false, false);
    expect(s.disabled).toBe(true);
    expect(s.label).toBe("Tersimpan ✓");
    // Kontras teks non-dirty: slate-700 (≥4.5:1), bukan gray-500 (~3.0:1).
    expect(s.className).toContain("text-slate-700");
    expect(s.className).not.toContain("text-gray-500");
    expect(s.className).not.toContain("bg-blue-600");
    expect(s.className).toContain("disabled:opacity-60");
  });

  it("mengaktifkan tombol primary saat ada perubahan", () => {
    const s = saveButtonState(true, false);
    expect(s.disabled).toBe(false);
    expect(s.label).toBe("Simpan Pengaturan");
    expect(s.className).toContain("bg-blue-600");
    expect(s.className).not.toContain("disabled:opacity-60");
  });

  it("tetap menonaktifkan saat sedang menyimpan", () => {
    const s = saveButtonState(true, true);
    expect(s.disabled).toBe(true);
    expect(s.label).toBe("Menyimpan...");
    expect(s.className).toContain("disabled:cursor-not-allowed");
  });
});
