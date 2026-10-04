# 10 - Conventions & Pitfalls

Re-read this before touching shared behavior.

## Conventions

- **Language:** UI strings in Bahasa Indonesia; code identifiers in English.
- **IDs:** `crypto.randomUUID()`.
- **Timestamps:** `new Date().toISOString()`.
- **Reactivity:** read data with `useLiveQuery(() => repoFn(args), [deps])`. `undefined` means still loading.
- **Money:** always `formatRupiah()` from `lib/format.ts` (`Intl.NumberFormat("id-ID")`).
- **Phone numbers:** always `toWaNumber()` from `lib/format.ts` to normalize to `62xxx`.
- **Dates:** store `"YYYY-MM-DD"` in WIB local time. Compute month from the local date string, never from a UTC `Date`.
- **Styling:** Tailwind for app UI. Report templates use inline styles/CSS variables driven by theme tokens so `html-to-image` captures them reliably.
- **AI:** browser calls DeepSeek API directly. The API key is stored in IndexedDB (Settings) and sent in the `Authorization` header. CSP restricts `script-src` to `'self'` as defense-in-depth.
- **Sessions:** use `subjects: string[]`, not `subject: string`.

## Pitfalls

1. **localStorage for data** - forbidden. Use Dexie. Domain data must be included in encrypted backup.
2. **Google Fonts via `<link>`** - breaks offline. Use `@fontsource/*` and precache `woff/woff2`.
3. **Month from UTC** - UTC date parsing can shift month around WIB boundaries. Use helpers in `lib/format.ts`.
4. **Rasterizing before fonts/images load** - call `await document.fonts.ready` and wait one frame before `toPng`.
5. **Object URL leaks** - every `URL.createObjectURL(blob)` needs a matching `URL.revokeObjectURL`.
6. **Stale rate on old invoices** - set `rateSnapshot` + `cost` when the session is created; never recompute from the student's current rate for old sessions.
7. **Re-picking a template on reopen** - `pickTemplate` runs only when a report is first created or when the user explicitly changes design.
8. **Random without history check** - rotation must read report history and exclude used combos plus the last theme.
9. **AI key in client** - The API key is stored in IndexedDB Settings and sent directly to DeepSeek from the browser. This means a successful XSS attack could exfiltrate the key. Keep the app's CSP strict and avoid injecting untrusted scripts.
10. **Putting payment on the parent report** - payments are internal only. Parent reports show progress, never money.
11. **Schema changes after release** - bump `db.version(n)` with a migration; do not mutate an older stores definition.
12. **Blobs in JSON** - Dexie stores Blobs fine, but backup JSON cannot. Convert Blob fields to/from base64 markers.
13. **Scope creep** - no accounts, portals, real-time sync, analytics dashboards, notifications, or external calendar integration without a new decision.
14. **Backup must cover all tables** - when adding a Dexie table, add it to `BACKUP_TABLES` in `lib/backup.ts` and to the `importBackup` transaction. Saat ini ada 10 tabel backup: students, sessions, reports, payments, settings, raporGrades, followUps, expenses, iaeeProjects, studyNotes. `auditLog` lokal tidak ikut backup.
15. **`saveSettings` is a PUT** - Dexie `put()` replaces the whole row. Read current settings, merge, then write.
16. **PIN is sensitive** - hash with SHA-256 before storing. Never compare plaintext.
17. **Session cost must update** - when `durationHours` changes through `updateSession`, recalculate `cost = durationHours * rateSnapshot`.
18. **Multi-subject sessions** - queries, aggregates, reports, and UI must handle `subjects: string[]`.

## Quick Self-Check

- Does the app build?
- Did the change preserve existing user data?
- Does the changed path work offline when it should?
- Did backup/restore still cover all tables?
- Did AI key stay protected in IndexedDB with CSP defense-in-depth?
- Did financial PIN stay hashed?
