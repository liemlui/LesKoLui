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
