# Design Sync Notes — Les Ko Lui

## Re-sync checklist

1. `npm run build` — regenerate `dist/assets/index-<hash>.css`
2. Update `cssEntry` in `.design-sync/config.json` with the new hash
3. `node .ds-sync/package-build.mjs --config .design-sync/config.json --node-modules ./node_modules --out ds-bundle --entry ./src/index.ts`
4. `node .ds-sync/package-capture.mjs --out ds-bundle`
5. Grade any new/changed component sheets
6. Upload via DesignSync with planId

## Known quirks

- **CSS hash changes on every `npm run build`** (Tailwind v4 + Vite content hashing). `cssEntry` must be updated after each build or styles will be missing.
- **`--node-modules ./node_modules`** (app's own node_modules, NOT `.ds-sync/node_modules`). The converter needs React etc. from the app's node_modules.
- **`--entry ./src/index.ts`** required. This is a Vite PWA app, not a published package. `node_modules/les-ko-lui/` doesn't exist. The synthetic barrel `src/index.ts` + `componentSrcMap` bypass the package lookup.
- **PwaPrompts excluded** — uses `virtual:pwa-register/react` (Vite virtual module, not bundlable by esbuild). Set to `null` in `componentSrcMap`.
- **App excluded** — root router component, not a design-system component.
- **DesignProvider** — wraps all previews via `cfg.provider`. It's a MemoryRouter wrapper so screen components can call `useNavigate`/`useParams` without crashing.
- **Screens render empty Dexie state** — IndexedDB is available in headless Chrome but starts empty. Screens show their real empty-state UI. This is valid design reference.
- **StudentDetail shows "Memuat..."** — needs a route param `:id`; without it, shows the loading state. Valid for design reference.
- **getSettings() always returns DEFAULT_SETTINGS** when DB is empty, so StudentForm renders its full form (not loading state).

## Project ID history

| Date | Project ID | Note |
|------|-----------|------|
| 2026-06-21 | 4ae2e591-2802-4d6a-9453-8c4d4a32d66b | First sync — deleted |
| 2026-06-22 | 27913e04-3ab6-4290-bb32-f52b5547870e | Current |
