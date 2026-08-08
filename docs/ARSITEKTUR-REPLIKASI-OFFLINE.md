# Arsitektur Offline-First — Blueprint Replikasi

> Dibedah dari **Les Ko Lui v1.37.0** (2026-08, baseline audit hijau: lint 0/0, unit test 166/166).
> Dokumen ini adalah cetak biru: teknologi, struktur, sistem keamanan, sistem database, dan
> semua hal wajib diperhatikan agar app lain bisa **berfungsi penuh offline** dengan pola yang sama.
> Nama `les-ko-lui` / `jurnalles` / `LKUI` di bawah tinggal diganti dengan identitas app baru.

---

## 1. Ringkasan arsitektur

```
┌────────────────────────────────────────────────────────────────────┐
│  BROWSER (HP/desktop) — satu-satunya source of truth               │
│                                                                    │
│  React 19 SPA (Vite 8 + TS 6 + Tailwind 4)                         │
│  ├─ IndexedDB "jurnalles" (Dexie 4, 12 tabel)  ← SEMUA DATA        │
│  ├─ Service Worker (Workbox via vite-plugin-pwa) ← offline shell   │
│  ├─ localStorage ← preferensi kecil + secret relay + PIN lockout   │
│  └─ WebCrypto ← hash PIN (PBKDF2) + enkripsi backup (AES-GCM)      │
│                                                                    │
│  Yang butuh internet (opsional, ada degradasi):                    │
│  ├─ AI DeepSeek (API key disimpan user, panggil langsung)          │
│  ├─ Backup Google Drive (OAuth GIS 1-tap ATAU relay senyap)        │
│  └─ Update SW (cek tiap 5 menit saat online)                       │
└────────────────────────────────────────────────────────────────────┘
                              │  hanya 1 endpoint API
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│  VERCEL (static host + 1 serverless function)                      │
│  ├─ dist/ di-serve dengan header keamanan + CSP                    │
│  └─ /api/drive/token  ← relay refresh_token → access_token Google  │
│     (server TIDAK pernah melihat data user — hanya menukar token)  │
└────────────────────────────────────────────────────────────────────┘
```

**Prinsip inti: data 100% lokal di perangkat. Server hanya (1) menyajikan file statis, (2) satu endpoint relay token. Tidak ada backend database, tidak ada sinkronisasi server, tidak ada login akun.**

### Stack (package.json)

| Lapisan | Teknologi | Versi |
|---|---|---|
| Framework | React + react-router-dom | 19.2 / 7.18 |
| Build | Vite + TypeScript + @vitejs/plugin-react | 8.0 / 6.0 / 6.0 |
| Styling | Tailwind CSS (via @tailwindcss/vite) | 4.3 |
| DB lokal | Dexie + dexie-react-hooks | 4.4 |
| PWA | vite-plugin-pwa (Workbox) | 1.3 |
| Enkripsi | WebCrypto (PBKDF2-SHA256 + AES-GCM) | bawaan browser |
| Foto | browser-image-compression, html-to-image | 2.0 / 1.11 |
| PDF | jspdf | 4.2 |
| Serverless | Vercel Functions (Node, `api/`) | — |
| Test | Vitest + fake-indexeddb, Playwright (e2e) | 4.1 / 1.61 |

---

## 2. Struktur folder (pola yang direplikasi)

```
├─ vercel.json              ← build, rewrite SPA, header keamanan/CSP
├─ vite.config.ts           ← plugin React/Tailwind + VitePWA (manifest, workbox)
├─ index.html               ← meta iOS PWA; CSP TIDAK di sini (via header, lebih ketat)
├─ .env.example             ← VITE_* public saja (placeholder)
├─ api/                     ← serverless functions (relay token)
│  └─ drive/token.js
├─ public/                  ← favicon + icon PWA (icon-192/512, generate via scripts/)
├─ scripts/
│  ├─ get-refresh-token.mjs ← bootstrap OAuth sekali → GOOGLE_REFRESH_TOKEN
│  └─ generate-icons.mjs    ← generate icon PWA dari satu sumber
├─ src/
│  ├─ main.tsx / App.tsx    ← startup: init DB, storage.persist(), guard kuota, banner offline
│  ├─ db/
│  │  ├─ db.ts              ← kelas Dexie: skema + 10 versi migrasi
│  │  ├─ types.ts           ← tipe semua entitas
│  │  └─ repos/             ← repo per domain + barrel index.ts
│  ├─ lib/                  ← logika murni: crypto, backup, driveBackup, pinLockout,
│  │                          storageGuard, aiClient, money, format (WIB), dll
│  ├─ hooks/                ← usePinGate (state machine PIN)
│  ├─ components/           ← PinConfirmModal, PwaPrompts, ErrorBoundary, dll
│  └─ screens/              ← halaman (Home, Students, Payments, Settings, ...)
├─ docs/                    ← ZERO-TOUCH-BACKUP.md (setup relay), ARSITEKTUR ini
├─ e2e/                     ← Playwright (smoke, finance, report, screenshot)
└─ src/__tests__/           ← Vitest unit/integration (fake-indexeddb)
```

---

## 3. Vercel — struktur & deploy

### 3.1 vercel.json (kunci replikasi)

```jsonc
{
  "buildCommand": "npm run build",      // = tsc -b && vite build
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "framework": "vite",
  // REWRITE SPA: semua route → index.html, KECUALI /api/*
  "rewrites": [{ "source": "/((?!api/).*)", "destination": "/index.html" }],
  "headers": [ /* lihat §5.2 — header keamanan + caching SW/assets */ ]
}
```

Hal krusial yang diatur header (vercel.json:7-33):
1. **`/sw.js`** → `Cache-Control: no-cache, no-store, must-revalidate` + `Service-Worker-Allowed: /` — SW **wajib selalu fresh** (update harus sampai ke perangkat).
2. **`/assets/*`** → `Cache-Control: public, max-age=31536000, immutable` — aset ber-hash Vite aman cache 1 tahun.
3. **`/(.*)`** → header keamanan + CSP (daftar lengkap di §5.2).

### 3.2 Serverless API — pola relay token

`api/drive/token.js` (hanya 1 endpoint di seluruh app — prinsip minimal):

- **Fungsi**: tukar `refresh_token` → `access_token` Google Drive, agar backup bisa jalan **senyap tanpa popup**.
- **Aman-default**: env belum lengkap → `503` (fitur mati, tidak ada efek samping).
- **POST-only** (selain method → 405).
- **Otentikasi**: header `x-backup-secret` dibandingkan **constant-time** (SHA-256 hash kedua sisi + `timingSafeEqual`) — komentar di kode: *"CORS browser tak cukup karena pemanggil non-browser bisa baca respons"*.
- **Prinsip data**: server **tidak pernah melihat data backup** — hanya menukar token; respons hanya `{ access_token, expires_in }`, refresh-token & client-secret tidak pernah keluar server.
- Env yang dibutuhkan: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `BACKUP_API_SECRET` (set di Vercel → Settings → Environment Variables; detail di `docs/ZERO-TOUCH-BACKUP.md`).

> **Pelajaran arsitektur**: jika app offline perlu fitur "server-assisted" (token relay, dsb.), buat endpoint **sekecil mungkin**, aman-default, dan pastikan server tidak pernah menyentuh data domain.

### 3.3 Environment variables — daftar lengkap

| Nama | Scope | Isi | Keterangan |
|---|---|---|---|
| `VITE_GOOGLE_CLIENT_ID` | public (klien) | Google OAuth Client ID | Untuk 1-tap backup Drive (popup) |
| `GOOGLE_CLIENT_ID` | secret (server) | Google OAuth Client ID | Relay token |
| `GOOGLE_CLIENT_SECRET` | secret (server) | Client secret | Relay token |
| `GOOGLE_REFRESH_TOKEN` | secret (server) | refresh token (lihat §3.4) | Relay token |
| `BACKUP_API_SECRET` | secret (server) | string acak panjang (`openssl rand -hex 24`) | Pengaman endpoint relay |

Aturan:
- **`VITE_*` = publik** (masuk bundle), **non-VITE = server-only** — jangan pernah campur.
- `.env.example` hanya berisi placeholder `VITE_GOOGLE_CLIENT_ID` (public).
- **`vercel pull` menghasilkan `.env.local` berisi `VERCEL_OIDC_TOKEN`** — token akses ke akun Vercel. File ini **dihapus dari disk** (temuan audit C-1): jangan jalankan `vercel pull` tanpa perlu, dan jangan commit `.env*` (`.gitignore` sudah mencakupnya).

### 3.4 Script pendukung

- `scripts/get-refresh-token.mjs` — OAuth flow sekali di komputer lokal: buka URL → izinkan → refresh-token tercetak di terminal → salin ke env Vercel. Redirect URI `http://localhost:4567/callback`, scope `drive.file`, `access_type=offline&prompt=consent` (wajib `consent` agar refresh-token dikembalikan).
- `scripts/generate-icons.mjs` — generate icon PWA (192/512/maskable) dari satu sumber.

---

## 4. Database — Dexie / IndexedDB

### 4.1 Skema (src/db/db.ts) — pola tabel

Satu kelas `JurnalDB extends Dexie`, instance singleton `db`. Nama DB: **`jurnalles`**. Semua PK `string` (`crypto.randomUUID()`), kecuali yang disebut:

| Tabel | PK | Indeks penting | Catatan |
|---|---|---|---|
| `students` | `id` | `name, level, active` | `photo?: Blob` (foto disimpan di baris, bukan path) |
| `sessions` | `id` | `studentId, date, status, createdAt, [studentId+date]` | `rateSnapshot` (snapshot tarif), `subjects[]`, `status` |
| `reports` | `id` | `studentId, month, [studentId+month]` | `sessionIds[]`, `totalHours/Cost` |
| `payments` | `id` | `studentId, [studentId+month], status` | `source: "auto"\|"manual"` |
| `settings` | `id` (konstan `"app"`) | — | `financialPin` (hash), `driveBackup`, `ai` |
| `raporGrades` | `id` | `studentId, semester, [studentId+semester]` | — |
| `followUps` | `id` | `studentId, completedAt` | — |
| `expenses` | `id` | `date, category` | — |
| `iaeeProjects` | `id` | `studentId, type` | `milestones[]` tersarang |
| `monthClosings` | `id` | `month` | snapshot akumulatif |
| `auditLog` | `id` | `timestamp, entityType` | **lokal saja, tidak ikut backup** |
| `studyNotes` | **`studentId`** | — | PK = FK (relasi 1-1 dengan student) |

**Pola relasi**: FK string (`studentId`) + indeks komposit (`[studentId+date]`, `[studentId+month]`, ...). Blob (foto/tanda tangan) disimpan langsung di baris — memudahkan backup & offline penuh.

### 4.2 Migrasi (pola wajib)

- **10 versi berurutan** di konstruktor: `this.version(n).stores({...})` untuk perubahan skema; `this.version(n).upgrade(tx => ...)` untuk migrasi **data** (contoh nyata v4: ubah `sessions.subject: string` → `subjects: string[]`).
- **Migrasi idempoten di lapisan repo** (bukan hanya Dexie): `initSettings()` dijalankan sekali saat startup (App.tsx) — migrasi hash PIN lama → PBKDF2, isi default jika kosong; aman terhadap race (`ConstraintError` ditangkap).
- **Aturan**: setiap tambah tabel/kolom/indeks = versi baru; jangan pernah mengubah versi lama. Data lama harus tetap terbaca (v1 backup tetap bisa di-restore).

### 4.3 Arsitektur repository

- `src/db/repos.ts` → barrel → `repos/index.ts` + modul per domain (`studentRepo`, `sessionRepo`, `paymentRepo`, `reportRepo`, `settingsRepo`, `auditRepo`, `studyNotesRepo`, ...) + `helpers.ts` bersama (fungsi tanggal WIB).
- **Pola CRUD**: repo terima `Omit<T, "id"|"createdAt">` → buat `crypto.randomUUID()` + timestamp → `db.tabel.add(...)`. Validasi domain inline sebelum tulis (durasi, nominal uang, tanggal, state).
- **Transaksi multi-tabel** `db.transaction("rw", [t1, t2, ...], ...)` untuk operasi yang harus konsisten:
  - `deleteStudent` — cascade 8 tabel dalam satu transaksi.
  - `deleteSession` — hapus sesi + cleanup followUp + hitung ulang laporan + hitung ulang tagihan otomatis.
  - `closeMonth`/`reopenMonth` — payments + monthClosings, **idempoten**.
  - `rescheduleSession` — update lama → `RESCHEDULED` + insert baru, saling menunjuk via `rescheduledFromId/ToId`.
- **Konsistensi uang (pola penting)**:
  - Tagihan hanya dari sesi billable (`DONE`, atau `NO_SHOW` dengan `noShowBillable`).
  - **Snapshot tarif** (`rateSnapshot`) di sesi → mengubah tarif murid tidak mengubah sesi lama.
  - Tagihan `source: "auto"` bisa dihitung ulang; `manual`/`PAID` dikunci.
  - `monthClosings` = snapshot akumulatif, hanya dari tagihan baru.
- **Audit trail**: `logAudit` best-effort (try/catch internal — kegagalan log tidak menggagalkan operasi utama).

### 4.4 UI reaktif (tanpa state management)

`useLiveQuery(() => repoQuery(), [])` dari dexie-react-hooks dipakai di hampir semua layar — query repo langsung di callback; Dexie otomatis re-render saat data berubah. **Tidak perlu Redux/Zustand** untuk data DB.

### 4.5 Ketahanan penyimpanan (wajib untuk offline)

`src/lib/storageGuard.ts` + startup di App.tsx:
- `navigator.storage.persist()` — minta anti-eviction (browser tidak menghapus data saat ruang penuh).
- Listener `unhandledrejection` → deteksi `QuotaExceededError` (termasuk pembungkus Dexie/Safari via regex) → banner merah peringatan sebelum data hilang senyap.
- `isStorageNearFull()` — `navigator.storage.estimate()` ≥ 90% → peringatan.
- Settings menyediakan pembersih data lama (mis. foto sesi > 6 bulan).

---

## 5. Keamanan

### 5.1 PIN gate (kunci data sensitif)

- **Layar full-lock**: Payments (satu-satunya layar yang di-lock penuh); operasi sensitif lain (hapus/edit murid, reveal tarif, backup/restore, export) wajib PIN via `PinConfirmModal`.
- **State `unlocked` hanya di memori** (useState) → hilang saat navigasi/reload (tidak ada "tetap terbuka").
- **Hash PIN**: PBKDF2-SHA256, salt acak 16 byte, **150.000 iterasi**, format `pbkdf2v2:<saltHex>:<hash>`; verifikasi mendukung hash lama (SHA-256 static salt) hanya untuk migrasi. Disimpan di **IndexedDB** (tabel settings), bukan localStorage.
- **Lockout exponential backoff** (`pinLockout.ts`, localStorage): delay `min(2^(fails-1) * 1000, 60_000)` → 1s, 2s, 4s, ..., maks 60s; counter hanya reset saat PIN benar; semua titik verifikasi memakai backoff yang sama.
- **Ganti PIN** wajib verifikasi PIN lama + guard in-flight (anti paralel brute-force).
- **Lupa PIN** via pertanyaan keamanan — jawaban **di-hash juga** (`hashPin(jawaban.toLowerCase())`); tombol "Lupa PIN?" hanya muncul jika pertanyaan sudah di-set; PIN baru wajib punya pertanyaan keamanan.
- UI state machine `usePinGate`: `{pinInput, pinError, unlocked}`; cek lockout → verifikasi → reset lockout → unlock.

### 5.2 Header keamanan + CSP (vercel.json)

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(self), microphone=()
Content-Security-Policy:
  default-src 'self';
  script-src 'self' https://accounts.google.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:;
  connect-src 'self' blob: https://api.deepseek.com https://*.vercel.app
               https://www.googleapis.com https://content.googleapis.com
               https://accounts.google.com;
  font-src 'self';
  worker-src 'self';
  manifest-src 'self';
  frame-src https://accounts.google.com
```

Catatan penting:
- **CSP via header, bukan meta tag** — meta versi dev lebih longgar (`unsafe-inline` script); header produksi lebih ketat & mencakup `worker-src` (yang tidak bisa di-set meta).
- `connect-src` = daftar eksplisit semua fitur online: DeepSeek (AI), Google (Drive/GIS), `blob:` (export file).
- Font self-hosted (`@fontsource`) → `font-src 'self'` saja, tidak perlu Google Fonts.

### 5.3 Enkripsi backup (AES-GCM + PBKDF2)

`src/lib/crypto.ts`:
- Kunci: PBKDF2-SHA256, iterasi **600.000** (v2) / 150.000 (v1 legacy); salt 16 B + IV 12 B **acak per operasi**.
- Format file: `magic "LKUI"(4) | version uint16(2) | iterations uint32(4) | salt(16) | iv(12) | ciphertext` — parameter KDF di header sehingga bisa naik versi.
- `decryptJson` memvalidasi header (iterasi dibatasi 150k–2M, versi didukung), kegagalan AES-GCM → pesan seragam "Kata sandi salah atau file backup rusak." (anti oracle).
- PIN 150k iterasi vs backup 600k — trade-off disengaja (verifikasi PIN sering, backup jarang).

### 5.4 Lain-lain

- **AI (DeepSeek)**: dipanggil langsung dari klien (`fetch api.deepseek.com` + Bearer API key). API key disimpan user di IndexedDB (settings), bukan env build. Input ke AI di-**sanitize** (trim, batasi panjang) sebelum dikirim; timeout 30 dtk; guard eksplisit `!navigator.onLine → "Offline."`; kegagalan tidak memengaruhi fitur lain. **Risiko disadari**: key bisa dicuri pemilik perangkat — acceptable untuk threat-model solo user (waiver terdokumentasi di AUDIT-CHECKLIST).
- **Backup Drive relay**: secret dibanding constant-time di server (§3.2); refresh-token & client-secret hanya di server.
- **ErrorBoundary** global: fallback UI + tombol "Muat Ulang" — app offline harus punya pemulihan yang jelas.
- **Threat model yang disadari (waiver)**: lockout lokal bisa di-bypass (hapus localStorage / akses langsung DB), secret relay & passphrase tersimpan di localStorage perangkat. Diterima karena single-user di HP pribadi — **dokumentasikan waiver ini di app baru juga**.

---

## 6. Offline-first & PWA

### 6.1 vite-plugin-pwa (vite.config.ts)

```ts
VitePWA({
  registerType: "prompt",   // BUKAN autoUpdate — SW baru menunggu konfirmasi user
  includeAssets: ["favicon.svg", "icon-192.png", "icon-512.png"],
  manifest: { id: "/", name, short_name, theme_color, background_color,
              display: "standalone", orientation: "portrait", start_url: "/",
              scope: "/", icons: [192, 512, maskable], shortcuts: [...] },
  devOptions: { enabled: false },  // SW tidak diregistrasi saat dev
  workbox: {
    globPatterns: ["**/*.{js,css,html,woff,woff2,png,svg}"],
    maximumFileSizeToCacheInBytes: 5_000_000,
  },
})
```

**Mengapa `registerType: "prompt"` (keputusan desain penting)**: `autoUpdate` memaksa `window.location.reload()` saat SW baru aktif — bisa **menghapus input form yang sedang diisi user**. Dengan `prompt`, banner "🆕 Versi baru tersedia" (`PwaPrompts.tsx`) yang memutuskan kapan reload (`SKIP_WAITING` + reload, hanya saat user menekan tombol).

Hasil build: `dist/sw.js` = `precacheAndRoute` + `cleanupOutdatedCaches` + `NavigationRoute("index.html")` (fallback SPA offline penuh) — **tidak ada file `sw.js`/`manifest.json` manual di `public/`**, semua digenerate.

### 6.2 Update flow (PwaPrompts.tsx)

1. `useRegisterSW` dari `virtual:pwa-register/react` → deteksi SW baru (`onNeedRefresh`) → banner hijau "Muat ulang untuk dapat fitur terbaru" + tombol **Muat Ulang / Nanti**.
2. Cek update berkala: interval **5 menit** + saat tab kembali fokus (`visibilitychange`) — keduanya **hanya saat `navigator.onLine`**.
3. Install prompt: tangkap `beforeinstallprompt` → banner biru "Pasang di layar utama" → `deferred.prompt()`.

### 6.3 Operasi penuh offline

- **Semua data di IndexedDB** — setiap tulis langsung ke lokal; tidak ada antrean sinkronisasi (tidak ada server untuk sinkron).
- **Offline banner**: event `online`/`offline` → "📵 Offline — data tetap aman, perubahan disimpan lokal".
- **Yang butuh internet** (semua opsional, degradasi halus): AI DeepSeek (toast error), backup Drive (skip otomatis saat offline), update SW (skip cek).
- Foto/tanda tangan diproses **lokal**: kompresi `browser-image-compression` (max 640px, 0.15MB, quality 0.65, web worker), timestamp WIB via canvas, `blobToDataUrl` via FileReader (tanpa fetch → tidak kena CSP).
- Export laporan JPG/PNG/PDF lokal (html2canvas/jspdf) — tanpa server.
- `navigator.storage.persist()` + guard kuota (§4.5).

---

## 7. Backup & restore (3 tingkat)

| Tingkat | Cara | Platform |
|---|---|---|
| 1-tap | Reminder mingguan → tap "Backup ke Drive" (popup Google sesekali) | Semua |
| Senyap saat dibuka | Relay server kasih access-token tanpa popup → backup otomatis saat due (7 hari) | Semua |
| Manual | Export file `.jles` terenkripsi (tanpa internet) | Semua |

### 7.1 Payload backup (backup.ts)

- `BACKUP_TABLES` = 11 tabel domain; **`auditLog` sengaja tidak ikut** (riwayat lokal per perangkat). `BACKUP_VERSION = 2`.
- Payload: `{ version, exportedAt, schema: { databaseVersion, tableCounts }, data: { <tabel>: [rows] } }`; v1 tetap bisa di-restore (tabel baru diisi `[]`).
- **Blob (foto/tanda tangan)** → marker `{ __blob: "data:<mime>;base64,..." }`, encode per blok 32 KB (hemat memori).
- Snapshot dibaca dalam **satu transaksi read** → konsisten.
- Validasi ketat **sebelum** menyentuh DB: versi didukung, `exportedAt` valid, tabel tak dikenal ditolak, PK unik per baris (`studyNotes` pakai `studentId`), `tableCounts` cocok.

### 7.2 Restore aman (urutan wajib)

1. Dekripsi + validasi + decode media **sebelum** apa pun diubah.
2. **Pre-restore backup otomatis** data saat ini → file `leskolui-pre-restore-<timestamp>.jles` (jaring pengaman).
3. `clear()` + `bulkAdd()` semua tabel dalam **satu transaksi `rw`** — atomic; satu kegagalan membatalkan seluruhnya, data lama utuh.
4. `location.reload()`.

Semua aksi backup/restore/reset dilindungi **PIN Keuangan**; passphrase min 8 karakter dengan strength meter.

### 7.3 Google Drive (driveBackup.ts)

- Scope **`drive.file`** (hanya file buatan app); satu file tetap `leskolui-backup.jles`, di-overwrite tiap backup (revision history di sisi Drive).
- OAuth 1-tap: GIS (`accounts.google.com/gsi/client`) dimuat on-demand; token di-cache ±1 jam; retry 1× saat 401 (token basi → paksa baru); 404 → upload ulang (file hilang).
- Relay senyap: `POST /api/drive/token` + header `x-backup-secret`; prioritas relay dulu, baru popup.
- Jadwal: `AUTO_BACKUP_INTERVAL_DAYS = 7`, `STALE_BACKUP_DAYS = 14` (peringatan keras "backup menua"); backup senyap hanya jalan saat `navigator.onLine`.
- Metadata di settings: `{ fileId, backupAt }` + `lastBackupAt`; verifikasi = unduh → dekripsi → validasi → "Backup valid ✓ N murid, N sesi".
- Restore dari Drive: pakai `fileId` tersimpan atau cari file terbaru → download `?alt=media` → `importBackup`.
- **Fase 2 (rencana, belum dirilis)**: Periodic Background Sync SW (Chrome/Android saja; iOS tak dukung) — terkendala SW tak bisa baca localStorage (passphrase harus pindah ke IndexedDB). Branch `phase2-bg-sync` berisi percobaan `src/sw.ts`.

---

## 8. Checklist wajib untuk replikasi (inti jawaban)

### A. Agar app berjalan offline penuh
1. [ ] Semua data domain di **IndexedDB (Dexie)** — tidak ada fetch data ke server; server tidak pernah jadi source of truth.
2. [ ] **PWA + Workbox precache** semua aset & route (`NavigationRoute → index.html`); `registerType: "prompt"` + banner update (jangan autoUpdate — bisa hapus input form).
3. [ ] Header `/sw.js` `no-cache` dan `/assets/*` `immutable` di vercel.json — update harus sampai, aset boleh lama.
4. [ ] `navigator.storage.persist()` + deteksi `QuotaExceededError` (`storageGuard`) → peringatan sebelum data hilang senyap.
5. [ ] Banner offline (`online`/`offline` events) + degradasi halus tiap fitur online (AI/backup di-skip saat offline, bukan error).
6. [ ] Fitur berat (foto, export PDF) diproses **lokal** — jangan bergantung server.
7. [ ] Backup/restore **terenkripsi** (AES-GCM + PBKDF2, header ber-parameter) + pre-restore safety + transaksi atomic.
8. [ ] Migrasi Dexie berlapis per versi + migrasi data idempoten di repo (bukan cuma skema).
9. [ ] Satu sumber versi (`package.json` → `version.ts`) untuk changelog/update banner.

### B. Struktur Vercel
10. [ ] Rewrite SPA `/((?!api/).*)` → `/index.html`; simpan `api/` untuk serverless.
11. [ ] **Minimal 1 endpoint serverless** untuk fitur yang butuh rahasia (relay token); aman-default (503 tanpa env); POST-only; secret dibanding constant-time.
12. [ ] Pisah env publik (`VITE_*`, masuk bundle) vs secret (server-only); `.env.example` hanya placeholder publik; jangan commit `.env*`.
13. [ ] Jangan jalankan `vercel pull` tanpa perlu (`VERCEL_OIDC_TOKEN` bocor ke disk); rotate jika terlanjur.

### C. Keamanan
14. [ ] Header keamanan lengkap + **CSP via header** (lebih ketat dari meta; `connect-src` = daftar eksplisit domain fitur online).
15. [ ] Data sensitif (PIN) di-hash dengan **PBKDF2 + salt acak** + lockout exponential backoff; verifikasi lama → migrasi otomatis.
16. [ ] Enkripsi dengan WebCrypto: salt/IV acak per operasi, iterasi KDF di header file (bisa naik versi), pesan error seragam (anti oracle).
17. [ ] Audit trail best-effort (tidak menggagalkan operasi utama); ErrorBoundary global dengan pemulihan.
18. [ ] Sanitasi input sebelum dikirim ke AI/API eksternal; timeout & guard offline.
19. [ ] Dokumentasikan **waiver keamanan** (threat-model solo user) — lockout lokal bisa di-bypass, secret di localStorage — agar keputusan desain tidak "hilang" saat di-audit.

### D. Kualitas
20. [ ] Unit test dengan **fake-indexeddb** (repo + konsistensi uang diuji); lint 0/0; e2e Playwright (smoke + fitur inti).
21. [ ] Audit checklist tertulis (AUDIT-CHECKLIST.md) yang mencatat temuan + status — jadikan bagian dari workflow.

---

## 9. Env vars — ringkasan cepat

```
# .env.example (publik)
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# Vercel → Environment Variables (secret, server-only)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=        # dari scripts/get-refresh-token.mjs
BACKUP_API_SECRET=            # openssl rand -hex 24
```

---

## 10. Sumber rujukan dalam repo ini

- `vercel.json` — deploy + header/CSP
- `vite.config.ts` — PWA/manifest/workbox
- `src/db/db.ts` — skema & migrasi Dexie
- `src/db/repos/*` — pola repo & transaksi
- `src/lib/crypto.ts` — PBKDF2/AES-GCM
- `src/lib/pinLockout.ts`, `src/hooks/usePinGate.ts` — keamanan PIN
- `src/lib/backup.ts`, `src/lib/driveBackup.ts` — backup/restore
- `src/lib/storageGuard.ts` — ketahanan penyimpanan
- `api/drive/token.js` — pola serverless relay
- `docs/ZERO-TOUCH-BACKUP.md` — setup relay Google Drive
- `AUDIT-CHECKLIST.md` — riwayat temuan keamanan & perbaikannya
