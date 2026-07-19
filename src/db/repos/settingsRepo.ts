// ── Settings Repository ─────────────────────────────────────────────

import { db } from "../db";
import type { Settings } from "../types";
import { DEFAULT_RATE } from "../types";
import { hashPin, isHashedPin } from "../../lib/crypto";

const DEFAULT_SETTINGS: Settings = {
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
    bca: "8630014884",
    cimb: "4600101184169",
    bri: "119801000960569",
    accountName: "Aloysius Alfa Adji Putra",
  },
};

/** Reads settings and migrates legacy plaintext PINs to hashes once. */
export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get("app");
  if (!s) return { ...DEFAULT_SETTINGS };
  let changed = false;

  if (s.financialPin && !isHashedPin(s.financialPin)) {
    s.financialPin = await hashPin(s.financialPin);
    changed = true;
  }

  if (!s.bankAccounts?.bca && !s.bankAccounts?.cimb && !s.bankAccounts?.bri) {
    s.bankAccounts = DEFAULT_SETTINGS.bankAccounts;
    changed = true;
  }

  if (changed) {
    await db.settings.put({ ...s, id: "app" } as Settings);
  }
  return s;
}

/** Initialize default settings row if missing — call at app startup. Idempotent/race-safe. */
export async function initSettings(): Promise<void> {
  const exists = await db.settings.get("app");
  if (exists) return;
  try {
    await db.settings.add({ ...DEFAULT_SETTINGS });
  } catch (e) {
    if ((e as { name?: string }).name !== "ConstraintError") throw e;
  }
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  const current = await getSettings();
  await db.settings.put({ ...current, ...patch, id: "app" } as Settings);
}
