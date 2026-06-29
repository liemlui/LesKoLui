# Backup Senyap / Zero-Touch — Panduan Setup

## Koreksi arsitektur (penting)

Rencana awal "Vercel Cron upload ke Drive" **tidak bisa** dipakai: data backup ada di
**IndexedDB pada perangkat (HP)**, bukan di server. Cron di server tak punya akses ke
data itu. Backup **harus** dibuat di perangkat.

Yang benar:

| Tingkat | Cara | Platform | Status |
|---------|------|----------|--------|
| **1-tap** | Reminder mingguan → tap "Backup ke Drive" (popup Google sesekali) | Semua | ✅ rilis lama |
| **Senyap saat app dibuka** | Backend **token-relay** kasih access-token tanpa popup → app backup otomatis saat dibuka & sudah due | Semua (Android & iOS) | ✅ v1.21.0 (perlu setup di bawah) |
| **Background saat app tertutup** | Service Worker **Periodic Background Sync** baca IndexedDB & upload | **Chrome/Android saja** (iOS tak dukung) | ⏳ Fase 2 |

Server **tidak pernah** melihat data murid — endpoint relay hanya menukar
`refresh_token` → `access_token`.

---

## Setup backup senyap (token-relay)

### 1. Google Cloud — OAuth client "Web application"
1. Google Cloud Console → APIs & Services → Credentials.
2. Buat/edit **OAuth client ID** tipe **Web application**.
3. Tambahkan **Authorized redirect URI**: `http://localhost:4567/callback` (untuk langkah 2).
4. Catat **Client ID** & **Client secret**.
5. Pastikan scope `https://www.googleapis.com/auth/drive.file` (sama dgn yang dipakai app).

### 2. Dapatkan refresh-token (sekali, di komputermu)
```bash
GOOGLE_CLIENT_ID=xxx GOOGLE_CLIENT_SECRET=yyy node scripts/get-refresh-token.mjs
```
Buka URL yang tercetak → izinkan akses → **refresh token** tercetak di terminal.

### 3. Set Environment Variables di Vercel
Project → Settings → Environment Variables (Production):

| Nama | Nilai |
|------|-------|
| `GOOGLE_CLIENT_ID` | dari langkah 1 |
| `GOOGLE_CLIENT_SECRET` | dari langkah 1 |
| `GOOGLE_REFRESH_TOKEN` | dari langkah 2 |
| `BACKUP_API_SECRET` | string acak panjang buatanmu (mis. hasil `openssl rand -hex 24`) |

> `VITE_GOOGLE_CLIENT_ID` (yang sudah ada untuk fitur 1-tap) tetap dibiarkan.

Redeploy agar env terbaca. Endpoint `/api/drive/token` aktif. (Sebelum env lengkap,
endpoint balas **503** dan fitur mati — aman.)

### 4. Aktifkan di app
Settings → Backup & Restore → Google Drive → **⚡ Backup senyap (relay)**:
isi **Secret relay** = nilai `BACKUP_API_SECRET` → tekan **Tes relay**. Kalau "OK ✓",
backup akan jalan **otomatis tanpa popup** saat app dibuka & sudah lewat 7 hari.
(Isi juga "Kata Sandi Enkripsi" min 8 & aktifkan auto-backup agar passphrase tersimpan.)

---

## Keamanan
- Endpoint dilindungi header `x-backup-secret` (CORS browser tak cukup karena pemanggil
  non-browser bisa membaca respons).
- `refresh_token` & `client_secret` **hanya** di server (env), tak pernah ke klien.
- Secret relay tersimpan di perangkat (localStorage) — sama threat-model solo
  (pastikan layar HP terkunci). Lihat waiver H-2 di `AUDIT-CHECKLIST.md`.

## Fase 2 — true background (app tertutup)
Service Worker `periodicSync`: SW bangun berkala, baca IndexedDB, ambil token via relay,
upload ke Drive. Catatan: hanya Chrome/Android; SW tak bisa baca `localStorage` →
passphrase perlu dipindah ke IndexedDB. Diestimasi terpisah saat dibutuhkan.
