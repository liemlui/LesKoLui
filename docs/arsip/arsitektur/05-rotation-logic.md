# 05 — Rotation Logic (guaranteed no-repeat design per student)

Requirement (hard): a student **never** receives the same design (theme × layout combination) twice, and **never** two similar (same-theme) designs in consecutive months. The database stores per-student history; this is the reason a DB is required.

File: `lib/rotation.ts`.

## Algorithm

1. The full pool is every `theme × layout` combination (e.g. 20 × 5 = 100 keys).
2. Read this student's past `MonthlyReport.templateKey` history (ordered by `createdAt`).
3. `used = set of keys already given to this student`.
4. `pool = all combinations − used`, and also exclude any combo whose `themeId` equals the student's **last** report theme (prevents back-to-back similar).
5. If `pool` is non-empty → pick a random key from it. **Guarantees no repeat.**
6. If `pool` is empty (every combination has been used) → fall back to **Least-Recently-Used**: pick the combination used longest ago for this student (still excluding the last theme).
7. Respect `Settings.templatePref.excludedThemeIds` (skip those themes entirely).
8. A tutor may override and pick a specific template manually; store whatever was actually used.

## `lib/rotation.ts` (write fully)

```ts
import { THEME_IDS } from "../template/themes";
import { LAYOUT_IDS } from "../template/layouts";
import { TemplateKey } from "../db/types";
import { listReportsByStudent, getSettings } from "../db/repos";

const keyStr = (k: TemplateKey) => `${k.themeId}::${k.layoutId}`;

function allCombos(excludedThemes: string[] = []): TemplateKey[] {
  const out: TemplateKey[] = [];
  for (const themeId of THEME_IDS) {
    if (excludedThemes.includes(themeId)) continue;
    for (const layoutId of LAYOUT_IDS) out.push({ themeId, layoutId });
  }
  return out;
}

export async function pickTemplate(studentId: string): Promise<TemplateKey> {
  const settings = await getSettings();
  const excluded = settings.templatePref?.excludedThemeIds ?? [];
  const combos = allCombos(excluded);

  const history = await listReportsByStudent(studentId);   // ordered createdAt asc
  const usedKeys = new Set(history.map(r => keyStr(r.templateKey)));
  const lastTheme = history.at(-1)?.templateKey.themeId;

  // Step 5: prefer unused combos, excluding the last theme
  let pool = combos.filter(c => !usedKeys.has(keyStr(c)) && c.themeId !== lastTheme);

  // Edge: if excluding lastTheme emptied an otherwise-usable pool, relax that constraint
  if (pool.length === 0) {
    pool = combos.filter(c => !usedKeys.has(keyStr(c)));
  }

  if (pool.length > 0) {
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // Step 6: everything used -> least recently used
  const lastUsedIndex = new Map<string, number>();
  history.forEach((r, i) => lastUsedIndex.set(keyStr(r.templateKey), i));
  const lru = combos
    .filter(c => c.themeId !== lastTheme)
    .sort((a, b) => (lastUsedIndex.get(keyStr(a)) ?? -1) - (lastUsedIndex.get(keyStr(b)) ?? -1));
  return (lru[0] ?? combos[0]);
}
```

## When a report is generated

In `MonthlyReport.tsx`, when first creating the report for a student+month:
```ts
let report = await getReport(studentId, month);
if (!report) {
  const templateKey = await pickTemplate(studentId);
  report = { id: crypto.randomUUID(), studentId, month, sessionIds: [],
             templateKey, summaryText: "", totalHours: 0, totalCost: 0,
             createdAt: new Date().toISOString() };
  await upsertReport(report);
}
```
Re-opening an existing report keeps its stored `templateKey` (do not re-pick). Provide a "Ganti desain" button that calls `pickTemplate` again and overwrites `templateKey`.

## Test cases (verify by temporarily seeding data)

- **T1:** Student with empty history → returns any valid combo.
- **T2:** Generate 10 reports for one student → all 10 `templateKey`s are distinct.
- **T3:** Two consecutive reports never share `themeId` (unless pool forces it; with 20 themes this won't happen for a long time).
- **T4:** After 100 combos used, the 101st returns the least-recently-used combo, never the immediately previous one.
- **T5:** Theme in `excludedThemeIds` never appears.

## Acceptance (Phase 6)

- Generating reports repeatedly for the same student yields a different `templateKey` every time.
- `templateKey` is persisted on each `MonthlyReport`.
- "Ganti desain" produces a different design than the current one.
