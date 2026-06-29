import { THEME_IDS } from "../template/themes";
import { LAYOUT_IDS } from "../template/layouts";
import type { TemplateKey } from "../db/types";
import { listReportsByStudent, getSettings } from "../db/repos";

const keyStr = (k: TemplateKey) => `${k.themeId}::${k.layoutId}`;

// Layout premium yang hanya dipilih manual (tak ikut rotasi "Acak").
const MANUAL_ONLY_LAYOUTS = new Set(["infographic"]);

function allCombos(excludedThemes: string[] = []): TemplateKey[] {
  const out: TemplateKey[] = [];
  for (const themeId of THEME_IDS) {
    if (excludedThemes.includes(themeId)) continue;
    for (const layoutId of LAYOUT_IDS) {
      if (MANUAL_ONLY_LAYOUTS.has(layoutId)) continue;
      out.push({ themeId, layoutId });
    }
  }
  return out;
}

export async function pickTemplate(studentId: string): Promise<TemplateKey> {
  const settings = await getSettings();
  const excluded = settings.templatePref?.excludedThemeIds ?? [];
  const combos = allCombos(excluded);

  const history = await listReportsByStudent(studentId);
  const usedKeys = new Set(history.map((r) => keyStr(r.templateKey)));
  const lastTheme = history.at(-1)?.templateKey.themeId;

  // Prefer unused combos, excluding the last theme
  let pool = combos.filter((c) => !usedKeys.has(keyStr(c)) && c.themeId !== lastTheme);

  // If excluding lastTheme emptied an otherwise-usable pool, relax that constraint
  if (pool.length === 0) {
    pool = combos.filter((c) => !usedKeys.has(keyStr(c)));
  }

  if (pool.length > 0) {
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // Everything used → least recently used, fall back to any combo
  const fallback = combos.length > 0 ? combos : allCombos([]);
  if (fallback.length === 0) {
    // Ultimate safety: if THEME_IDS or LAYOUT_IDS are empty, return a hardcoded default
    return { themeId: THEME_IDS[0] ?? "winter", layoutId: LAYOUT_IDS[0] ?? "cards" };
  }
  const lastUsedIndex = new Map<string, number>();
  history.forEach((r, i) => lastUsedIndex.set(keyStr(r.templateKey), i));
  const lru = fallback
    .filter((c) => c.themeId !== lastTheme)
    .sort((a, b) => (lastUsedIndex.get(keyStr(a)) ?? -1) - (lastUsedIndex.get(keyStr(b)) ?? -1));
  return lru[0] ?? fallback[0];
}
