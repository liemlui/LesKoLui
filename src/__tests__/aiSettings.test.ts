import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../db/db";
import { getSettings, initSettings, saveSettings } from "../db/repos";

beforeEach(async () => { await db.settings.clear(); });

describe("DeepSeek model settings migration", () => {
  it("defaults to the current DeepSeek model", async () => {
    await expect(getSettings()).resolves.toMatchObject({ ai: { model: "deepseek-flash", enabled: false } });
  });

  const legacyModels = ["deepseek-chat", "deepseek-reasoner", "deepseek-v4-flash", "deepseek-v4-pro"];

  it.each(legacyModels)("normalizes restored %s settings without losing the API key or preferences", async (model) => {
      const original = await getSettings();
      await db.settings.put({
        ...original,
        tutorProfile: { name: "Tutor", phone: "" },
        ai: { enabled: true, apiKey: "test-key", model },
      });
      // Restored settings work before restart; getSettings remains a pure reader.
      await expect(getSettings()).resolves.toMatchObject({ ai: { model: "deepseek-flash", enabled: true, apiKey: "test-key" } });
      expect((await db.settings.get("app"))?.ai.model).toBe(model);
      await initSettings();
      expect(await db.settings.get("app")).toMatchObject({
        tutorProfile: { name: "Tutor" },
        ai: { model: "deepseek-flash", enabled: true, apiKey: "test-key" },
      });
      await saveSettings({ ai: { model, enabled: false } });
      expect((await db.settings.get("app"))?.ai).toMatchObject({ model: "deepseek-flash", enabled: false, apiKey: "test-key" });
    });
});
