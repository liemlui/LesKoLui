import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../db/db";
import { getSettings, initSettings, saveSettings } from "../db/repos";
import { hashPin, verifyPin } from "../lib/crypto";
import type { Settings } from "../db/types";

/** Row minimal untuk menguji migrasi PIN tanpa menyeret seluruh form Pengaturan. */
function settingsRow(financialPin?: string): Settings {
  return {
    id: "app",
    tutorProfile: { name: "Ko Lui", phone: "081100000000" },
    defaultRate: 200_000,
    paymentInfo: "",
    subjects: [],
    ai: { enabled: false, model: "deepseek-v4-flash" },
    templatePref: {},
    financialPin,
  };
}

beforeEach(async () => {
  await db.settings.clear();
});

describe("atomic settings repository", () => {
  it("keeps concurrent patches to different fields", async () => {
    await initSettings();
    await Promise.all([
      saveSettings({ tutorProfile: { name: "Ko Lui" } }),
      saveSettings({ lastBackupAt: "2026-09-05T10:00:00.000Z" }),
    ]);
    await expect(getSettings()).resolves.toMatchObject({
      tutorProfile: { name: "Ko Lui" },
      lastBackupAt: "2026-09-05T10:00:00.000Z",
    });
  });

  it("merges nested AI fields without dropping the other field", async () => {
    await initSettings();
    await saveSettings({ ai: { enabled: true, apiKey: "secret" } });
    await saveSettings({ ai: { enabled: false } });
    await expect(getSettings()).resolves.toMatchObject({ ai: { enabled: false, apiKey: "secret" } });
  });

  it("replaces arrays and permits explicit optional deletion", async () => {
    await initSettings();
    await saveSettings({ subjects: ["Physics"], financialPin: "hashed" });
    await saveSettings({ subjects: ["Math"], financialPin: undefined });
    const settings = await getSettings();
    expect(settings.subjects).toEqual(["Math"]);
    expect(settings.financialPin).toBeUndefined();
  });

  it("initializes only one app row under concurrent startup", async () => {
    await Promise.all([initSettings(), initSettings(), initSettings()]);
    expect(await db.settings.count()).toBe(1);
  });

  it("keeps freshly written operational metadata when the form saves its own fields", async () => {
    await initSettings();
    await saveSettings({ tutorProfile: { name: "Ko Lui" } });
    // Backup selesai dari tempat lain (prompt mingguan / Drive) → metadata baru.
    await saveSettings({ lastBackupAt: "2026-09-12T10:00:00.000Z" });
    // Form Pengaturan menyimpan field yang dieditnya saja — metadata tetap utuh.
    await saveSettings({ tutorProfile: { name: "Ko Lui Baru" } });

    await expect(getSettings()).resolves.toMatchObject({
      tutorProfile: { name: "Ko Lui Baru" },
      lastBackupAt: "2026-09-12T10:00:00.000Z",
    });
  });

  it("fails loudly without a partial change when the write fails", async () => {
    await initSettings();
    await saveSettings({ tutorProfile: { name: "Ko Lui" } });

    const put = vi.spyOn(db.settings, "put").mockRejectedValueOnce(new Error("simulated put failure"));
    await expect(saveSettings({ lastBackupAt: "2026-09-12T10:00:00.000Z" }))
      .rejects.toThrow("simulated put failure");
    put.mockRestore();

    const settings = await getSettings();
    expect(settings.lastBackupAt).toBeUndefined();
    expect(settings.tutorProfile).toMatchObject({ name: "Ko Lui" });
  });

  it("hashes a legacy plaintext PIN during startup migration", async () => {
    await db.settings.add(settingsRow("123456"));
    await initSettings();

    const { financialPin } = await getSettings();
    expect(financialPin).toMatch(/^pbkdf2v2:/);
    await expect(verifyPin("123456", financialPin!)).resolves.toBe(true);
  });

  it("does not resurrect an old PIN after the user replaced it", async () => {
    const replaced = await hashPin("999999");
    await db.settings.add(settingsRow(replaced));
    await initSettings();

    const { financialPin } = await getSettings();
    expect(financialPin).toBe(replaced);
    await expect(verifyPin("999999", financialPin!)).resolves.toBe(true);
    await expect(verifyPin("123456", financialPin!)).resolves.toBe(false);
  });
});
