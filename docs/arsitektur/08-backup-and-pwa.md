# 08 — Backup & PWA

Because all data lives on one device, **encrypted backup is mandatory** and the app must be installable and fully offline. Files: `lib/crypto.ts`, `lib/backup.ts`, plus PWA config.

> **Cara membaca dokumen ini (dicek 2026-09-13, app v1.73.0):** blok kode di §`crypto`/§`backup` adalah
> **kerangka awal dari spec** — format backup sekarang **v2** dengan header magic + PBKDF2 600.000 iterasi
> (legacy 150.000 masih dibaca), validasi restore terpisah di `lib/backupValidation.ts`, dan tabel backup
> berjumlah **10** (tanpa `monthClosings`/`homeworks`). Sumber kebenaran tetap kode: `src/lib/crypto.ts`,
> `src/lib/backup.ts`, `src/lib/backupValidation.ts`. Bagian PWA di bawah sudah diselaraskan dengan
> `vite.config.ts` aktual.

## Persistent storage (call on app start)

In `App.tsx` (effect on mount):
```ts
if (navigator.storage?.persist) navigator.storage.persist();
```
This, combined with installing the PWA, stops the browser from evicting IndexedDB under storage pressure.

## `lib/crypto.ts` — AES-GCM + PBKDF2 (write fully)

```ts
const enc = new TextEncoder();
const dec = new TextDecoder();

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 150_000, hash: "SHA-256" },
    base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

export async function encryptJson(obj: unknown, passphrase: string): Promise<Blob> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const data = enc.encode(JSON.stringify(obj));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data));
  // file layout: [salt(16)][iv(12)][ciphertext]
  const out = new Uint8Array(16 + 12 + ct.length);
  out.set(salt, 0); out.set(iv, 16); out.set(ct, 28);
  return new Blob([out], { type: "application/octet-stream" });
}

export async function decryptJson(file: Blob, passphrase: string): Promise<unknown> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const salt = buf.slice(0, 16), iv = buf.slice(16, 28), ct = buf.slice(28);
  const key = await deriveKey(passphrase, salt);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return JSON.parse(dec.decode(pt));
}
```

## `lib/backup.ts` — export/import all tables (write fully)

Blobs (photos) must be converted to base64 to fit in JSON.

```ts
import { db } from "../db/db";
import { encryptJson, decryptJson } from "./crypto";

const BACKUP_TABLES = ["students","sessions","reports","payments","settings","raporGrades","followUps","expenses","iaeeProjects","studyNotes"] as const;

async function blobToB64(b: Blob): Promise<string> {
  const buf = new Uint8Array(await b.arrayBuffer());
  let s = ""; for (const byte of buf) s += String.fromCharCode(byte);
  return `data:${b.type};base64,${btoa(s)}`;
}
async function b64ToBlob(s: string): Promise<Blob> {
  const res = await fetch(s); return res.blob();
}

// Recursively convert Blob fields to/from base64 markers
async function encodeRow(row: any) {
  const out: any = {};
  for (const k in row) out[k] = row[k] instanceof Blob ? { __blob: await blobToB64(row[k]) } : row[k];
  return out;
}
async function decodeRow(row: any) {
  const out: any = {};
  for (const k in row) out[k] = row[k]?.__blob ? await b64ToBlob(row[k].__blob) : row[k];
  return out;
}

export async function exportBackup(passphrase: string): Promise<Blob> {
  const dump: any = { version: 1, exportedAt: new Date().toISOString(), data: {} };
  for (const t of TABLES) dump.data[t] = await Promise.all((await (db as any)[t].toArray()).map(encodeRow));
  return encryptJson(dump, passphrase);
}

export async function importBackup(file: Blob, passphrase: string): Promise<void> {
  const dump: any = await decryptJson(file, passphrase);
  await db.transaction("rw", TABLES.map((t) => (db as any)[t]), async () => {
    for (const t of TABLES) {
      await (db as any)[t].clear();
      const rows = await Promise.all((dump.data[t] ?? []).map(decodeRow));
      await (db as any)[t].bulkAdd(rows);
    }
  });
}
```

In `Settings.tsx`: a "Backup" button (ask passphrase -> `exportBackup` -> download `leskolui-backup-YYYY-MM-DD.jles`) and a "Restore" button (pick file -> passphrase -> `importBackup` -> reload).

## PWA config (aktual — v1.73.0)

`vite.config.ts` (actual):
```ts
VitePWA({
  // "prompt" (bukan autoUpdate): pembaruan menunggu draf Catat Sesi di-flush.
  registerType: "prompt",
  includeAssets: ["favicon.svg", "icon-192.png", "icon-512.png"],
  manifest: {
    id: "/",
    name: "Les Ko Lui",
    short_name: "Les Ko Lui",
    description: "Jurnal les privat & laporan otomatis untuk orang tua",
    theme_color: "#2563eb",
    background_color: "#edf4ff",
    display: "standalone",
    orientation: "portrait",
    start_url: "/",
    scope: "/",
    categories: ["education", "productivity"],
    icons: [
      { src: "icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Rekam Sesi", short_name: "Rekam", url: "/capture" },
      { name: "Laporan Bulanan", short_name: "Laporan", url: "/report" },
      { name: "Daftar Murid", short_name: "Murid", url: "/students" },
    ],
  },
  devOptions: { enabled: false },   // di dev SW TIDAK didaftarkan
  workbox: {
    globPatterns: ["**/*.{js,css,html,woff,woff2,png,svg}"], // termasuk font self-hosted
    maximumFileSizeToCacheInBytes: 5_000_000,
  },
})
```

> The `woff,woff2` glob ensures the self-hosted `@fontsource` fonts are precached, so themed reports keep their fonts offline.

## Install ke layar utama — syarat & batas platform

Empat syarat install (semuanya sudah dipenuhi konfigurasi di atas, **tapi hanya kalau halaman dibuka lewat HTTPS**):

1. **Secure context** — HTTPS atau `localhost`. Membuka `http://<IP-LAN>:5174` dari HP **tidak** memenuhi syarat
   ini: service worker tidak terdaftar, `beforeinstallprompt` tidak pernah muncul, dan tombol "Pasang" di
   `PwaPrompts.tsx` tidak dirender (tombol itu hanya muncul setelah event tersebut).
   Uji di HP tanpa deploy: `npm run build` lalu `npm run preview` (default port **4173**), kemudian
   `chrome://inspect` → **Port forwarding** `4173` → buka `http://localhost:4173` di HP — localhost dianggap
   secure dan SW produksi aktif. **Dev server (5173) tidak bisa dipakai untuk uji install** karena
   `devOptions.enabled: false`: di dev tidak ada service worker sama sekali.
2. **Manifest** dengan `name`/`short_name`, ikon **192 px + 512 px**, `start_url`, dan `display` `standalone`
   (bukan `browser`).
3. **Service worker aktif** dengan precache (dibuat `generateSW`; di produksi Vercel `sw.js` dikirim dengan
   `Service-Worker-Allowed: /` dan `no-cache`).
4. **WebAPK minting** oleh Chrome memakai **Google Play Services**; kalau Play Services tidak ada/terlalu tua,
   Chrome hanya menawarkan pintasan biasa ("Tambahkan ke layar utama"), bukan aplikasi standalone.

Batas versi browser (ini yang menjelaskan kenapa HP lama gagal install):

| Platform | Kenapa |
|---|---|
| **Android 5.0/5.1 (Lollipop)** | **Tidak didukung.** Chrome for Android terakhir untuk Lollipop adalah **Chrome 95** (Okt 2021) dan tidak diupdate lagi. Dua lapis yang memblokir: (a) bundle di-build Vite 8 dengan target default `baseline-widely-available` = **Chrome 111** / Edge 111 / Firefox 114 / Safari 16.4; (b) CSS dibangun Tailwind v4 yang juga ber-target Chrome 111 — hasil build memuat `@layer` (Chrome 99+), `oklch()` dan `color-mix()` (Chrome 111+), jadi di Chrome 95 aturan ber-`@layer` diabaikan dan tampilan aplikasi praktis tidak terbentuk. Jadi "dibuka lewat Chrome saja" pun tidak menyelamatkan perangkat ini. |
| Android 6 (Marshmallow) | Chrome for Android berhenti di **Chrome 106** (Okt 2022) — masih di bawah target 111, jadi belum didukung. |
| Android 7 (Nougat) | Masih bisa: Chrome for Android berhenti di **Chrome 119** (Android 7 dihentikan di Chrome 120), dan 119 ≥ 111. |
| Android 8+ / Chrome 111+ | Jalur yang disarankan. |

Deploy produksi ada di Vercel (`vercel.json`: SPA rewrite, `sw.js` no-cache + `Service-Worker-Allowed: /`,
HSTS, dan CSP dengan `worker-src 'self'`), jadi URL Vercel adalah cara yang benar untuk install di HP.

### Dipakai lewat tab Chrome saja (tanpa install) — didukung

Install **tidak wajib**. Aplikasi sudah dirancang untuk dua-duanya:

| | Terpasang (standalone) | Lewat tab Chrome |
|---|---|---|
| Ikon di launcher, mode layar penuh | ya | tidak |
| `navigator.storage.persist()` | biasanya `true` | sering **`false`** → penyimpanan best-effort |
| Risiko data situs dihapus Chrome saat penyimpanan HP menipis | lebih kecil | lebih besar |
| Service worker & offline | ya | **ya** — SW tetap jalan di tab biasa |
| Tombol "Keluar" | `window.close()` berhasil | Chrome menolak → modal menjelaskan cara tutup tab (`ExitAppModal`) |

Konsekuensinya: tanpa install, **backup adalah pengaman utama**. Yang sudah berjalan otomatis: prompt backup
mingguan, backup senyap ke Drive lewat relay, dan peringatan saat penyimpanan mendekati penuh (kuota error →
banner di `App.tsx`). `App.tsx` sengaja **tidak** memperingatkan ketika `persist()` mengembalikan `false`,
karena itu normal untuk pemakaian tanpa install.

Uji installabilitas versi terbaru: Chrome DevTools → **Application → Manifest** (tanpa error) dan
**Lighthouse → Installable**, plus cek `navigator.serviceWorker.controller` sudah terisi setelah reload kedua.

## Acceptance (Phase 9 + 10)

- Export then import into a clean profile restores all data **including photos** — dibuktikan otomatis di
  `e2e-pwa/pwa-runtime.spec.ts` (build produksi, file `.jles` nyata).
- `navigator.storage.persisted()` resolves `true` after install — **tanpa install boleh `false`** dan itu bukan
  kegagalan (lihat tabel di atas); pengaman datanya adalah backup rutin.
- App installs to the home screen and works fully offline after first load; themed reports still render with
  correct fonts offline — bagian offline dibuktikan di spec yang sama; bagian "terpasang di layar utama"
  hanya berlaku pada browser yang memenuhi tabel di atas (Android 8+/Chrome 111+).



