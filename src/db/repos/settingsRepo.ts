// ── Settings Repository ─────────────────────────────────────────────

import { db } from "../db";
import type { Settings } from "../types";
import { DEFAULT_RATE } from "../types";
import { hashPin, isHashedPin } from "../../lib/crypto";

function defaultSettings(): Settings {
  return {
  id: "app",
  tutorProfile: { name: "", phone: "" },
  defaultRate: DEFAULT_RATE,
  paymentInfo: "",
  subjects: [
    "Mathematics AA", "Mathematics AI", "Physics", "Chemistry", "Biology",
    "Economics", "Business Management", "Geography", "History", "Psychology",
    "Computer Science", "ESS", "Bahasa Indonesia", "TOK", "Other",
  ],
  ai: { enabled: false, apiKey: "", model: "deepseek-v4-flash" },
  templatePref: {},
  bankAccounts: {
    bca: "",
    cimb: "",
    bri: "",
    accountName: "",
  },
  };
}

export type SettingsPatch = Omit<Partial<Settings>, "ai" | "tutorProfile" | "templatePref" | "bankAccounts" | "driveBackup"> & {
  ai?: Partial<Settings["ai"]>;
  tutorProfile?: Partial<Settings["tutorProfile"]>;
  templatePref?: Partial<Settings["templatePref"]>;
  bankAccounts?: Partial<NonNullable<Settings["bankAccounts"]>>;
  driveBackup?: Partial<NonNullable<Settings["driveBackup"]>>;
};

/** Reads settings — pure reader, no side effects. */
export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get("app");
  return s ?? defaultSettings();
}

/** Initialize default settings row + run one-off migrations — call at app startup. */
export async function initSettings(): Promise<void> {
  const exists = await db.settings.get("app");
  if (!exists) {
    try {
      await db.settings.add(defaultSettings());
    } catch (e) {
      if ((e as { name?: string }).name !== "ConstraintError") throw e;
    }
  }
  // Run migrations (idempotent per session — migration writes make subsequent reads fast)
  await migrateSettings();
}

/** One-off migrations: hash legacy PINs, fill default bank accounts. Idempotent. */
async function migrateSettings(): Promise<void> {
  const s = await db.settings.get("app");
  if (!s) return;
  let changed = false;

  if (s.financialPin && !isHashedPin(s.financialPin)) {
    s.financialPin = await hashPin(s.financialPin);
    changed = true;
  }

  if (!s.bankAccounts?.bca && !s.bankAccounts?.cimb && !s.bankAccounts?.bri) {
    s.bankAccounts = defaultSettings().bankAccounts;
    changed = true;
  }

  if (changed) {
    await db.settings.put({ ...s, id: "app" } as Settings);
  }
}

function mergeDefined<T extends object>(current: T | undefined, patch: Partial<T> | undefined): T | undefined {
  if (patch === undefined) return undefined;
  return { ...(current ?? {}), ...patch } as T;
}

export async function saveSettings(patch: SettingsPatch): Promise<void> {
  await db.transaction("rw", db.settings, async () => {
    const current = (await db.settings.get("app")) ?? defaultSettings();
    const next: Settings = { ...current, id: "app" };
    const scalarPatch = { ...patch } as Record<string, unknown>;
    delete scalarPatch.ai;
    delete scalarPatch.tutorProfile;
    delete scalarPatch.templatePref;
    delete scalarPatch.bankAccounts;
    delete scalarPatch.driveBackup;
    Object.assign(next, scalarPatch);
    if (Object.prototype.hasOwnProperty.call(patch, "ai")) next.ai = { ...current.ai, ...(patch.ai ?? {}) };
    if (Object.prototype.hasOwnProperty.call(patch, "tutorProfile")) {
      next.tutorProfile = { ...current.tutorProfile, ...(patch.tutorProfile ?? {}) };
    }
    if (Object.prototype.hasOwnProperty.call(patch, "templatePref")) {
      next.templatePref = { ...current.templatePref, ...(patch.templatePref ?? {}) };
    }
    if (Object.prototype.hasOwnProperty.call(patch, "bankAccounts")) {
      next.bankAccounts = mergeDefined(current.bankAccounts, patch.bankAccounts);
    }
    if (Object.prototype.hasOwnProperty.call(patch, "driveBackup")) {
      next.driveBackup = mergeDefined(current.driveBackup, patch.driveBackup);
    }
    await db.settings.put(next);
  });
}
