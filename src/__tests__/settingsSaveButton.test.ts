import { describe, expect, it } from "vitest";
import { saveButtonState } from "../lib/settingsPresentation";
import { settingsDirtyPatch } from "../lib/settingsDirtyPatch";
import type { Settings } from "../db/types";

describe("saveButtonState (audit V-02)", () => {
  it("menonaktifkan tombol dan pakai kontras AA saat tidak ada perubahan", () => {
    const s = saveButtonState(false, false);
    expect(s.disabled).toBe(true);
    expect(s.label).toBe("Tersimpan ✓");
    // Kontras teks non-dirty: --ink-strong (≈4.6:1 di atas --bg-subtle), bukan
    // --ink-muted yang hanya ≈3,0:1 pada latar itu. Nama token menggantikan
    // kelas literal `text-slate-700` / `text-gray-500` pada sapu G2-02.
    expect(s.className).toContain("text-[var(--ink-strong)]");
    expect(s.className).not.toContain("text-[var(--ink-muted)]");
    expect(s.className).not.toContain("bg-[var(--brand-solid)]");
    expect(s.className).toContain("disabled:opacity-60");
  });

  it("mengaktifkan tombol primary saat ada perubahan", () => {
    const s = saveButtonState(true, false);
    expect(s.disabled).toBe(false);
    expect(s.label).toBe("Simpan Pengaturan");
    expect(s.className).toContain("bg-[var(--brand-solid)]");
    expect(s.className).not.toContain("disabled:opacity-60");
  });

  it("tetap menonaktifkan saat sedang menyimpan", () => {
    const s = saveButtonState(true, true);
    expect(s.disabled).toBe(true);
    expect(s.label).toBe("Menyimpan...");
    expect(s.className).toContain("disabled:cursor-not-allowed");
  });
});

/**
 * S-03 (G1-09) — keadaan tombol Simpan setelah PIN disimpan.
 *
 * `handleSetPin` dulu hanya menulis snapshot penuh dan tidak pernah memanggil
 * `setDirty(false)`, jadi badge "Belum disimpan" bertahan walau PIN sudah tersimpan.
 * Urutan sukses yang benar: tulis patch → samakan snapshot (`savedFormRef`) →
 * `setDirty(false)`. Dua tes di bawah menjaga urutan itu pada tingkat helper.
 */
function makeSettings(): Settings {
  return {
    id: "app", tutorProfile: { name: "Ko Lui", phone: "0812" }, defaultRate: 100_000, paymentInfo: "",
    subjects: ["Matematika"], ai: { enabled: true, apiKey: "key-lama", model: "deepseek-chat" },
    bankAccounts: { bca: "123", accountName: "Ko Lui" },
    lastBackupAt: "2026-09-01T00:00:00.000Z", templatePref: {},
  };
}

/** Meniru urutan sukses `handleSetPin`: tulis patch → snapshot disamakan → dirty dimatikan. */
function pinSaveTransition(before: Settings, updated: Settings) {
  const patch = settingsDirtyPatch(before, updated);
  const button = saveButtonState(false, false);
  return { patch, button };
}

describe("tombol Simpan setelah PIN disimpan (audit S-03)", () => {
  it("tombol kembali nonaktif 'Tersimpan ✓' setelah PIN disimpan dari form yang bersih", () => {
    const before = makeSettings();
    const updated: Settings = { ...before, financialPin: "pbkdf2v2:pin-baru" };

    const { patch, button } = pinSaveTransition(before, updated);
    expect(patch).toEqual({ financialPin: "pbkdf2v2:pin-baru" });
    expect(button.disabled).toBe(true);
    expect(button.label).toBe("Tersimpan ✓");
  });

  it("editan profil yang belum disimpan tetap membuat tombol aktif sampai benar-benar disimpan", () => {
    const before = makeSettings();
    const edited: Settings = { ...before, tutorProfile: { ...before.tutorProfile, name: "Ko Baru" } };
    // Sebelum simpan: form kotor → tombol aktif.
    expect(saveButtonState(true, false).disabled).toBe(false);

    const updated: Settings = { ...edited, financialPin: "pbkdf2v2:pin-baru" };
    const { patch, button } = pinSaveTransition(before, updated);

    // Editan profil ikut tertulis bersama PIN, jadi `dirty=false` memang jujur.
    expect(patch).toEqual({ tutorProfile: { name: "Ko Baru" }, financialPin: "pbkdf2v2:pin-baru" });
    expect(button.disabled).toBe(true);
    expect(button.label).toBe("Tersimpan ✓");
  });
});
