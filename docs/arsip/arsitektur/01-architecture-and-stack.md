# 01 - Architecture & Stack

## High-Level Architecture

```
UI (React + Tailwind PWA) -> domain logic -> Dexie (IndexedDB)
                                   |
         Photo module   Template engine   AI client (Direct DeepSeek API)
         Export module  Backup module     Engagement helpers
```

Everything runs on-device. The only online path is AI generation through direct DeepSeek API calls, and optional Google Drive backup.

## Exact Dependencies

Runtime:
```text
react react-dom react-router-dom
dexie dexie-react-hooks
browser-image-compression
html-to-image jspdf
@fontsource/fredoka @fontsource/baloo-2 @fontsource/pacifico @fontsource/poppins @fontsource/nunito @fontsource/quicksand @fontsource/caveat @fontsource/comfortaa
```

Dev:
```text
vite @vitejs/plugin-react typescript
tailwindcss @tailwindcss/vite postcss autoprefixer
vite-plugin-pwa
vitest
```
## Project Structure (actual — v1.70.5)

```text
src/
  main.tsx                # entry; imports fonts + index.css; mounts <App/>
  App.tsx                 # createBrowserRouter + <RouterProvider> + <BottomNav/> + Backup + Storage Guard
  DesignProvider.tsx      # theme/design context provider
  index.css               # @import "tailwindcss" + custom classes
  index.ts                # barrel exports
  db/
    types.ts              # all interfaces (10 domain tables + auditLog + studyNotes)
    db.ts                 # Dexie instance + schema v14
    repos.ts              # barrel proxy; actual modules in repos/
    repos/                # per-domain repos (settings, student, session, report, payment, followUp, iaee, studyNotes, audit, helpers)
  lib/
    aiClient.ts           # DeepSeek direct API
    backup.ts             # export/import 10 tables via AES-GCM
    crypto.ts, calendar.ts, engagement.ts, format.ts, foto.ts, driveBackup.ts...
  screens/                # 7 route screens + decomposed folders
  components/             # BottomNav (5-item), Modal, Toast, PwaPrompts, icons, dll.
  template/               # 20 themes, 5 layout renderers, paginate, rebalance
  hooks/                  # usePinGate, useToast
  __tests__/              # 30+ test files
```

Routes (`src/App.tsx`): `/`, `/students`, `/students/:id`, `/capture`, `/report`, `/payments`, `/settings`. Tidak ada `/tugas` atau `/catatan`.

## App Features on Startup

- `appData().then(r => r.initSettings())` — inisialisasi settings + migrasi satu kali.
- `navigator.storage?.persist()` — persistent storage untuk mencegah eviction IndexedDB.
- Prompt backup mingguan (via `localStorage`).
- Banner offline/online.
- Deteksi tekanan storage (quota error + near-full warning).


