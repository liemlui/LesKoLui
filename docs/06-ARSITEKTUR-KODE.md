# 06 — Arsitektur & Peta Kode (pengganti ringkas seri `arsitektur/`)

> **Sekilas** · Jenis: **peta kode + aturan yang tidak boleh dilanggar** · Diperbarui: 2026-10-05 · Status: **aktif**
> **Untuk siapa:** siapa pun (manusia atau AI) yang akan mengubah cara aplikasi bekerja.
> **Baca kalau:** butuh tahu di mana sesuatu tinggal, atau butuh tahu apa yang akan merusak data/uang.
> **Baca TIDAK kalau:** kamu sedang mengerjakan tugas UI/UX rutin — cukup `kerja/ATURAN-AI.md` + `CHEATSHEET.md`.
>
> **Kenapa berkas ini ada.** Seri `docs/arsitektur/01`–`11` (1.664 baris, dipatok v1.70–v1.75) sudah
> **diarsipkan** ke [`arsip/arsitektur/`](arsip/arsitektur/README.md) karena potretnya tidak lagi cocok
> dengan kode. Menggantinya bukan dengan salinan baru (yang pasti akan basi juga), melainkan dengan
> peta tipis ini: **asalnya kode itu sendiri**. Yang tidak ada di kode — keputusan "kenapa" — dicari di
> `arsip/` dan `CHANGELOG`.
>
> **Aturan angka:** berkas ini **tidak** memuat versi, jumlah tabel, jumlah tes, atau baris berkas.
> Semuanya diukur dari sumbernya (lihat §4). Dijaga `npm run check:docs`.

---

## 1. Apa ini

Jurnal les privat **lokal-first PWA** untuk satu tutor: mencatat sesi dengan cepat, menyimpan konteks
murid, dan menghasilkan laporan bulanan untuk orang tua. Data hidup di perangkat (IndexedDB/Dexie);
jaringan hanya dipakai untuk AI opsional, backup opsional ke Google Drive, dan distribusi aplikasi.

**Batas produk (jangan dibangun tanpa keputusan pemilik):** akun guru/murid/orang tua & portal online,
sinkronisasi multi-perangkat real-time, integrasi Google Calendar, sistem notifikasi.

## 2. Di mana apa (peta baca — bukan peta folder lengkap)

| Mau tahu | Buka |
|---|---|
| Skema DB, repositori, migrasi | `src/db/db.ts` (versi skema = blok `this.version(N)` **tertinggi**) · `src/db/repos/*` |
| Tipe domain (murid, sesi, laporan, pembayaran) | `src/db/types.ts` |
| Rumus uang, tagihan, pipeline, ekspor CSV | `src/lib/finance.ts` · `financePipeline.ts` · `invoicePresentation.ts` · `csv.ts` — **dilarang diubah** (§3) |
| Skor & arti indikator engagement | `src/lib/engagement.ts` — **dilarang diubah** (§3) |
| Panggilan AI + estimator biaya | `src/lib/aiClient.ts` (prompt **dilarang diubah**); satu jalur UI: `useAiAction` |
| Laporan bulanan (tema, layout, rotasi) | `src/lib/rotation.ts` · `src/template/**` — tugas tersendiri |
| Rumus + hook uang tertutup (PIN) | `src/hooks/useMoneyVisible.ts` · `src/components/ui/MaskedMoney.tsx` · `src/lib/moneyDisplay.ts` |
| Token warna/tipografi/jarak | `src/index.css` (`@theme static`) · primitif: `src/components/ui/*` |
| Kontrak UI/UX + biaya AI + privasi (aturan, bukan potret) | [`kerja/ATURAN-AI.md`](kerja/ATURAN-AI.md) §1–§3 |

**Cara kerja tiap subsistem** (template engine, rotasi, export/share, backup & PWA, AI generation) ada
di [`arsip/arsitektur/`](arsip/arsitektur/README.md) — **sebagai potret saat dokumen itu ditulis**.
Untuk perilaku hari ini: kode sumber + `CHANGELOG` di `src/lib/version.ts`.

## 3. Yang akan merusak data/uang kalau dilanggar

Ini ringkasan §2.1 `kerja/ATURAN-AI.md`; daftar lengkap + alasannya ada di sana. Kalau tugas menuntut
mengubah salah satu berkas ini, **tugasnya salah lingkup — berhenti dan tanya**.

- **`src/db/db.ts`** — versi skema Dexie. Naikkan/mundurkan versi dengan salah = data pengguna nyata hilang.
- **`src/lib/crypto.ts`** — cara PIN disimpan (PBKDF2 + salt). Salah = pengguna terkunci dari datanya.
- **`formatRupiah()` di `src/lib/format.ts`** — juga menyusun **pesan WhatsApp ke orang tua**; masking di sini mengirim "Rp ••••••" ke orang tua.
- **`finance.ts` / `financePipeline.ts` / `invoicePresentation.ts` / `waBilling.ts`** — angka uang & pesan keluar harus memuat nominal **asli**.
- **`engagement.ts`** — rumus skor; mengubahnya mengubah arti data historis.
- **`csv.ts`** — format ekspor lama harus identik.
- **`src/template/**`** — mesin laporan (tema/rotasi).
- **`STEP_META`** (`src/screens/captureSession/constants.ts`) — jumlah langkah wizard terkunci 6 (ada tesnya).
- **Prompt di `src/lib/aiClient.ts`** — mutu hasil AI; perubahan jalur AI bukan alasan mengubah prompt.

Aturan lain yang berlaku di seluruh kode:

1. **Uang di layar hanya lewat satu pintu:** `useMoneyVisible()` + `<MaskedMoney>`. Menulis angka uang langsung = kebocoran.
2. **AI hanya lewat `useAiAction()`**, dan hanya setelah modal biaya dikonfirmasi. Fitur inti tidak boleh bergantung pada AI.
3. **Warna/teks/jarak lewat token**, bukan kelas palet mentah atau heks di atribut `style`.
4. **Tanggal lewat `src/lib/format.ts`** (jam WIB), bukan `new Date()` langsung.
5. **Tidak menambah dependensi UI/animasi** — fondasinya token + CSS.
6. **Line ending LF** (dikunci `.gitattributes`).

## 4. Cara mengukur (bukan menyalin)

```powershell
# versi aplikasi (satu-satunya sumber)
node -p "require('./package.json').version"

# jumlah tes + berkas
npm run test:sandbox

# versi skema Dexie
Select-String -Path src/db/db.ts -Pattern "this\.version\(" | Select-Object -Last 1

# baris sebuah berkas
(Get-Content src/screens/CaptureSession.tsx).Count

# gate dokumentasi (tautan + klaim versi/angka)
npm run check:docs
```

## 5. Riwayat

| Tanggal | Perubahan |
|---|---|
| 2026-10-05 | Dibuat sebagai pengganti ringkas seri `arsitektur/01`–`11` yang diarsipkan (keputusan pemilik Q-10 opsi A). Isinya sengaja tanpa angka. |
