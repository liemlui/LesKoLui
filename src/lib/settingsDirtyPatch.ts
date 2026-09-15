import type { Settings } from "../db/types";
import type { SettingsPatch } from "../db/repos/settingsRepo";

type NestedSettingsKey = "ai" | "tutorProfile" | "templatePref" | "bankAccounts" | "driveBackup";

function changedObjectFields<T extends object>(before: T | undefined, after: T | undefined): Partial<T> | undefined {
  if (!before || !after) return before === after ? undefined : after;
  const patch: Partial<T> = {};
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)]) as Set<keyof T>) {
    if (!Object.is(before[key], after[key])) patch[key] = after[key];
  }
  return Object.keys(patch).length > 0 ? patch : undefined;
}

/**
 * Builds the smallest SettingsPatch that represents user edits since `before`.
 * Operational metadata absent from the form's edits (for example a backup
 * completed in another screen) is deliberately omitted and cannot be restored
 * from the form's stale snapshot.
 */
export function settingsDirtyPatch(before: Settings, after: Settings): SettingsPatch {
  const patch: SettingsPatch = {};
  const nested: NestedSettingsKey[] = ["ai", "tutorProfile", "templatePref", "bankAccounts", "driveBackup"];

  for (const key of nested) {
    const value = changedObjectFields(before[key], after[key]);
    // `undefined` is itself a meaningful patch for optional nested metadata:
    // it removes a value that existed in the saved snapshot.
    if (value !== undefined || before[key] !== after[key]) Object.assign(patch, { [key]: value });
  }

  for (const key of Object.keys(after) as Array<keyof Settings>) {
    if (key === "id" || nested.includes(key as NestedSettingsKey)) continue;
    if (!Object.is(before[key], after[key])) Object.assign(patch, { [key]: after[key] });
  }
  return patch;
}
