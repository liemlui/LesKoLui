import { describe, expect, it } from "vitest";
import type { Settings } from "../db/types";
import { settingsDirtyPatch } from "../lib/settingsDirtyPatch";

function makeSettings(): Settings {
  return {
    id: "app", tutorProfile: { name: "Ko Lui", phone: "0812" }, defaultRate: 100_000, paymentInfo: "",
    subjects: ["Matematika"], ai: { enabled: true, apiKey: "key-lama", model: "deepseek-chat" },
    bankAccounts: { bca: "123", accountName: "Ko Lui" },
    driveBackup: { fileId: "file-lama", backupAt: "2026-09-01T00:00:00.000Z" },
    lastBackupAt: "2026-09-01T00:00:00.000Z", templatePref: {},
  };
}

describe("settingsDirtyPatch", () => {
  it("hanya mengirim field profil yang diubah, tanpa metadata backup dari snapshot lama", () => {
    const before = makeSettings();
    const after: Settings = { ...before, tutorProfile: { ...before.tutorProfile, name: "Ko Baru" } };

    expect(settingsDirtyPatch(before, after)).toEqual({ tutorProfile: { name: "Ko Baru" } });
  });

  it("mengirim hanya field bersarang yang berubah", () => {
    const before = makeSettings();
    const after: Settings = { ...before, ai: { ...before.ai, enabled: false } };

    expect(settingsDirtyPatch(before, after)).toEqual({ ai: { enabled: false } });
  });

  it("menyertakan metadata operasional bila memang diubah oleh alur yang sama", () => {
    const before = makeSettings();
    const after: Settings = { ...before, lastBackupAt: "2026-09-15T00:00:00.000Z" };

    expect(settingsDirtyPatch(before, after)).toEqual({ lastBackupAt: "2026-09-15T00:00:00.000Z" });
  });

  it("dapat menghapus metadata bersarang yang memang diubah", () => {
    const before = makeSettings();
    const after: Settings = { ...before, driveBackup: undefined };

    expect(settingsDirtyPatch(before, after)).toEqual({ driveBackup: undefined });
  });
});

/**
 * S-03 (G1-09) — jalur "Simpan PIN" memakai patch yang sama dengan "Simpan Pengaturan".
 *
 * Sebelumnya `handleSetPin` menulis snapshot `{ ...form }` penuh, sehingga metadata
 * operasional dari form yang bisa lebih tua daripada IndexedDB (mis. `lastBackupAt`
 * atau `driveBackup` yang baru saja ditulis alur backup lain) ikut ditulis balik.
 */
describe("settingsDirtyPatch — skenario PIN (audit S-03)", () => {
  it("menyimpan PIN hanya mengirim field PIN, bukan metadata backup dari snapshot lama", () => {
    // Form dibuka SEBELUM backup lain selesai → snapshotnya lebih tua daripada IndexedDB.
    const before = makeSettings();
    const updated: Settings = {
      ...before,
      financialPin: "pbkdf2v2:pin-baru",
      securityQuestion: "Warna favorit?",
      securityAnswer: "pbkdf2v2:jawaban-baru",
    };

    const patch = settingsDirtyPatch(before, updated);
    expect(patch).toEqual({
      financialPin: "pbkdf2v2:pin-baru",
      securityQuestion: "Warna favorit?",
      securityAnswer: "pbkdf2v2:jawaban-baru",
    });
    expect(patch).not.toHaveProperty("lastBackupAt");
    expect(patch).not.toHaveProperty("driveBackup");
  });

  it("editan yang belum disimpan ikut terkirim bersama PIN, jadi `dirty` boleh dimatikan", () => {
    const before = makeSettings();
    const updated: Settings = {
      ...before,
      tutorProfile: { ...before.tutorProfile, phone: "0899" },
      financialPin: "pbkdf2v2:pin-baru",
    };

    expect(settingsDirtyPatch(before, updated)).toEqual({
      tutorProfile: { phone: "0899" },
      financialPin: "pbkdf2v2:pin-baru",
    });
  });
});
