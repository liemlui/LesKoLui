import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../db/db";
import { getSettings, initSettings, saveSettings } from "../db/repos";

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
});
