# PROMPT-SESI-BERIKUTNYA — titik masuk untuk sesi DSH baru

> **Sekilas.** Jenis: prompt serah-terima. Status: berlaku sampai Gelombang 3 tuntas.
> Untuk siapa: sesi DSH baru yang melanjutkan Gelombang 3.
> **Cara pakai:** salin seluruh isi berkas ini sebagai pesan pertama di sesi baru.
> **Berkas ini bukan daftar pekerjaan.** Daftarnya tetap `PEKERJAAN.md`. Kalau isi di sini
> bertentangan dengan `PEKERJAAN.md` atau `ATURAN-AI.md`, dua berkas itu yang menang.

---

## Salinan mulai di sini

Lanjutkan proyek Les Ko Lui (jurnal les privat, PWA lokal-first) — Gelombang 3.

### Di mana

- Workspace DSH: `C:\Users\lieml\Desktop\Big Personal Web App\Private Tutor`
- Repo ada di SUBFOLDER `les-ko-lui/` (bukan di akar workspace — akarnya bukan repo git).
- Bahasa laporan: Indonesia.

### Mulai dari sini

**Baca berurutan, hemat token, jangan membaca semuanya:**

1. `les-ko-lui/docs/kerja/ATURAN-AI.md` (±191 baris) — KONTRAK. Delapan bagian: §1 cara bekerja +
   tabel gate dua tingkat · §2 integritas dokumen · §3 berkas terlarang · §4 keputusan final
   pemilik (B1–B4, D1–D8) · §5 fakta kode · §6 perintah + lingkungan sandbox · §7 jebakan ·
   §8 bentuk laporan. **Nomor bagiannya berubah 2026-10-07** — kalau ada dokumen menunjuk §0,
   §2.1–§2.3, §6.1–§6.4, atau §9, nomor itu sudah tidak ada (peta lama→baru di
   `docs/arsip/README.md` §6).
2. `les-ko-lui/docs/kerja/PEKERJAAN.md` — SATU-SATUNYA daftar pekerjaan. Spesifikasi lengkap
   G3-01…G3-10 ada di §3, pekerjaan tanpa dokumen tugas di §4, daftar periksa manual (25 butir)
   di §5.
3. `les-ko-lui/docs/kerja/SERAH-TERIMA.md` — keadaan + batas kejujuran yang belum beres.
   Bagian 3 dan 4 saja.
4. `les-ko-lui/docs/kerja/CHEATSHEET.md` — jangkar kode dan jebakan per tugas (ringkasan).
5. Baru buka SATU `docs/kerja/TASK-XX` yang relevan kalau perlu detail. `docs/RIWAYAT-RILIS.md`
   hanya kalau butuh alasan historis. `docs/arsip/**` beku — jangan kutip angkanya.

### Keadaan yang diukur pada 2026-10-07 (ukur sendiri, jangan percaya tulisan ini)

| Hal | Nilai saat berkas ini ditulis |
|---|---|
| Versi | v1.95.0 |
| Branch / HEAD | `main` = `origin/main` = `ab4bdb6`, pohon kerja bersih |
| Suite | 945 lulus / 72 berkas |
| `check:docs` | 0 rusak · 0 pelanggaran |

Baris berkas besar yang menjadi target refactor (diukur dengan `npm run measure loc`):
`MonthlyReport.tsx` **2.361** (target ≤1.500) · `Settings.tsx` **1.380** (target ≤700) ·
`StudentDetail.tsx` **1.097** (target ≤800) · `TagihanTab.tsx` **1.021** (target ≤800).

### Gate — jalankan SEKALI di akhir tugas, bukan per langkah

Dari dalam `les-ko-lui/`:

- Dokumen saja → `npm run check:docs`
- Kode biasa 1–3 berkas, tidak menyentuh uang → `npx tsc -b`
- Menyentuh uang / data tersimpan / lebih dari 3 layar → `npx tsc -b` + suite tes + `npm run build`
- Tampilan → Playwright, sekali per tugas besar

**Suite tes dan build TIDAK bisa dijalankan langsung:** Vite gagal `spawn EPERM` di sandbox.
Cara yang terbukti jalan — shim sudah ada di repo, `NODE_OPTIONS` berjalur RELATIF, dalam satu
pemanggilan PowerShell:

```powershell
$env:NODE_OPTIONS = "--require=../.dsh-vitest-shim.cjs"
npm run test:sandbox
```

Jangan pakai jalur absolut Windows: `NODE_OPTIONS` memakan garis miring terbalik dan gagal
dengan `Cannot find module 'C:Userslieml…'`. Perintah yang sama berlaku untuk `npm run build`.

Butuh izin sandbox penuh: `npm run e2e`, `npm run e2e:uiux`, `git push`.

### Urutan pekerjaan yang mengikat

**Sisa Gelombang 3 — enam tugas, semuanya belum tersentuh:**

1. **G3-05 Laporan bulanan.** Refactor `MonthlyReport.tsx` + 12 fitur. Bergantung G3-01, G3-04
   (sudah), G2-04. **Kerjakan ini lebih dulu** — paling besar sesudah G3-06, dan G3-08
   bergantung padanya.
2. **G3-06 Murid.** Refactor + peta tab baru (Ringkas/Sesi/Progres/Proyek) + 14 fitur. Disebut
   di daftar sebagai "yang terbesar di gelombang ini dan boleh dipecah dua sesi".
3. **G3-07 Foto murid.** Bergantung G3-06.
4. **G3-08 Kanvas dan istilah.** Bergantung G3-05. Jangan kurangi 26 susunan / 34 tema.
5. **G3-09 Pengaturan.** Refactor `Settings.tsx` 1.380 → ≤700 + 11 fitur.
6. **G3-10 Reset total dan PIN.** Bergantung G3-09.

**Kemudian §4 PEKERJAAN.md (boleh kapan saja):**

- **D2 — perhitungan biaya saat sesi ditutup mengabaikan nominal manual.** Satu-satunya sisa
  yang menyentuh uang, dan sudah tercatat sebagai masalah nyata di `SERAH-TERIMA.md` §4.2.
- **D3** — 23 peta alias mapel lintas kurikulum (Nasional Informatika & Penjaskes masih memakai
  katalog ilmu komputer internasional).
- **Katalog topik** — 58 dari 78 pasangan mapel belum punya katalog; **D5** — periksa katalog IB.
- **D4 sisa separuh** — catatan palet terkunci. Setengah lainnya ("tab tagihan masuk penjaga
  tampilan") **sudah tercapai** 2026-10-07 lewat entri `keuangan-tagihan`.
- **D8** — flake beban-tinggi pada `report-export.spec.ts:85` dan
  `screenshot-katalog.spec.ts:139` (sudah berulang kali dibuktikan lulus sendirian).
- **Backlog** — jejak audit untuk perubahan sesi; temuan audit tampilan 2026-10-01 yang tersisa.
- Satu pekerjaan yang dicatat 2026-10-07: pemilih sub-layar keuangan (lihat bagian "Kenyataan
  yang menyimpang" di bawah).

**Tugas kecil yang tertinggal dari G3-04:** daftar riwayat panggilan AI di Pengaturan, dan
memindahkan pembacaan `pemakaian` di `Settings.tsx` ke hook supaya tidak ada dua pembacaan paralel.

### Jebakan yang sudah terverifikasi — jangan terperangkap lagi

Dari `ATURAN-AI` §7:

- **Jangan menulis berkas dokumen atau sumber dengan `Set-Content` atau `System.IO.File::WriteAllLines`
  PowerShell.** Ia membaca UTF-8 sebagai ANSI dan **merusak seluruh em dash, garis kotak, panah,
  dan emoji** menjadi teks rusak. Ini terjadi pada 2026-10-07 di `Payments.tsx`; penjaga mojibake
  `manageSessionSheet.test.tsx` yang menangkapnya. Untuk mengubah berkas ber-UTF-8, pakai alat edit
  yang memahami UTF-8, atau `System.IO.File::ReadAllText` + `WriteAllText` dengan
  `UTF8Encoding($false)` dan **jalur absolut**.
- **`npm run release-check` TIDAK ADA di `package.json`** dan tidak pernah ada di riwayat git.
  Jangan mengutipnya sebagai bukti gate. Kalau konsistensi versi mau diperiksa, pakai
  `node .design-audit/release-check.mjs` (skrip yang memang ada di repo, tapi **bukan** gate resmi).
- **`git commit` dan `git push` mencetak kemajuan ke saluran GALAT** dan PowerShell melabelinya
  `NativeCommandError`. Exit code 0 = berhasil. Buktikan dari `git log` / `git rev-list`, jangan ulangi.
- **`npm run e2e` menulis ulang berkas PNG di `e2e/screenshots/` yang ikut DILACAK git.** Sesudah
  run: pulihkan yang terlacak dengan `git checkout -- e2e/screenshots/`, dan **periksa** `git status`
  untuk PNG tak terlacak yang baru muncul. Ketika nama berkas tangkapan layar berubah, PNG lama ikut
  menjadi basi — hapus dengan `git rm` supaya set terlacak cocok dengan kenyataan.
- **Keluaran PowerShell bisa menampilkan teks beraksen sebagai karakter rusak** (UTF-8 dibaca ANSI).
  Untuk menilai kerusakan berkas, ukur byte-nya.
- **`npm run e2e:uiux` mengukur `?tab=ringkasan`… tidak lagi.** Sejak 2026-10-07 entri `keuangan`
  menunjuk `/payments` polos dan ada entri baru `keuangan-tagihan`.
- **Label pada test tampilan mudah basi.** `e2e/screenshot-audit.spec.ts` sempat menekan label tab
  yang sudah lama tidak ada ("Bulan Ini", "Penagihan", "Rekap Tahunan") dan `clickTab` **menelan
  kegagalannya lewat `catch`** — jadi test itu "lulus" sambil memotret layar yang tidak berpindah.
  Kalau menambah/mengubah label antarmuka, perbarui pemilihnya **pada putaran yang sama**.

Ditambahkan dari pengalaman 2026-10-07:

- **Dua live region dalam satu layar mematahkan `getByRole("status")`.** Pesan kolom nominal yang
  memasang `role="status"` (walau kosong) membuat test alur tagihan gagal karena locator jadi
  ambigu. Pakai `role="alert"` hanya saat memang ada galat, dan jangan pasang peran saat kosong.
- **Hook React yang ditaruh setelah `return` bersyarat** melanggar `react-hooks/rules-of-hooks`.
  Tempatkan semua hook **sebelum** gerbang seperti `if (settingsView !== "ready") return …`.
- **`getByRole` mencocokkan nama yang bisa diakses SELURUHNYA**, bukan berawalan. Tombol pintasan
  yang namanya memuat nominal ("Pengeluaran Rp 640.000 ▸") tidak cocok dengan `/^Pengeluaran/`.
  Dan `compactLabel` menyembunyikan teks di layar sempit — pakai peran tab yang memakai `aria-label`.
- **Mode ketat Playwright:** dua elemen dengan nama sama (mis. "Sisa kas" di tabel utama dan tabel
  penuh) menuntut `.first()` atau penyaring yang lebih spesifik.

### Kenyataan yang menyimpang dari spesifikasi — sudah diputuskan, jangan diulang

- **Papan pipeline tetap di sub-layar analitik (`?tab=ringkasan`), bukan dipindah ke blok 2 layar
  Uang.** Blok 2 sudah penuh oleh batas "maks 3 baris" dari G3-02 butir 2, dan memindahkannya akan
  membuat blok itu memuat dua model baris. Blok 2 menjadi pintasan ke situ. Kalau pemilik ingin
  benar-benar pindah, itu keputusan tampilan yang mengubah dua butir sekaligus.
- **Layar Uang tetap tiga blok** (`UangBeranda.tsx`), dan empat tab lamanya hidup sebagai sub-layar
  `?tab=`. Bilah sub-layar hanya muncul saat sebuah sub-layar terbuka — akibatnya tidak ada cara
  melompat dari Tagihan langsung ke Rekap. Sudah dicatat di `PEKERJAAN.md` §4.
- **Keputusan D6 sudah terpenuhi** (layar Uang memakai H1 → 3×H2 tanpa lompatan level, terbukti
  dari `.design-audit/uiux-guard/*-keuangan.json`). Jangan dikerjakan ulang.
- **Keputusan D4 separuh sudah tercapai** lewat entri `e2e:uiux` `keuangan-tagihan`.

### Yang pemilik sudah putuskan soal istilah (2026-10-07) — berlaku untuk semua layar baru

- **Invoice yang sudah lunas BUKAN tagihan, melainkan riwayat transaksi.** Jangan menuliskannya
  sebagai "tagihan" di antarmuka, dan jangan ikut menghitungnya sebagai pekerjaan yang menunggu.
  Model barisnya `BarisTagihanTindakan` di `src/lib/financeRows.ts` (`terbitkan` · `finalkan` ·
  `tagih` · `riwayat`).
- **Layar Keuangan hanya fokus pada yang butuh tindakan.** Riwayat pembayaran hidup di halaman
  murid (`src/screens/studentDetail/RiwayatPembayaran.tsx`), dikelompokkan per **bulan uang masuk**
  (`paidAt`, cadangan `month`).
- **Navigasi bawah tiga pintu + satu aksi:** Hari Ini · Murid · Uang + tombol Catat sesi.
  Rute `/report` dan `/capture` tetap hidup sebagai tautan langsung.

### Larangan yang mengikat (ATURAN-AI §3)

Jangan sentuh: `src/db/db.ts` · `src/lib/crypto.ts` · isi `formatRupiah()` · `src/lib/waBilling.ts` ·
`src/lib/invoicePresentation.ts` · `src/lib/engagement.ts` · `src/lib/finance.ts` ·
`src/lib/financePipeline.ts` · `src/lib/csv.ts` · seluruh `src/template/` · `STEP_META` di
`src/screens/captureSession/constants.ts` · prompt di `src/lib/aiClient.ts`.

Tanpa keputusan pemilik: menambah pustaka baru · mengubah `playwright.config.ts` atau
`vite.config.ts` · mengubah jumlah langkah wizard dari enam · menghidupkan mode gelap ·
mengaktifkan integrasi berkelanjutan di GitHub.

### Cara melapor

Satu laporan di akhir tugas, bukan per langkah (`ATURAN-AI` §8): (1) apa yang berubah dalam bahasa
manusia, (2) perintah apa yang dijalankan dan hasilnya sekali saja, (3) apa yang belum selesai,
(4) keputusan yang diambil sendiri beserta alasan satu baris.

### Dua hal yang pemilik berikan izinnya pada 2026-10-07

1. **Agen boleh mencentang daftar periksa manual** (§5 `PEKERJAAN.md`, 25 butir) — izin eksplisit
   pemilik, menyimpang dari kalimat "hanya pemilik yang boleh mencentang" di berkas itu. Centang
   berdasarkan bukti terukur, dan sebutkan di laporan bukti apa yang dipakai.
2. **Revisi boleh di-push ke `main`** setelah gate hijau dan rilis versi dinaikkan.

## Salinan selesai di sini

---

## Riwayat berkas ini

| Tanggal | Perubahan |
|---|---|
| 2026-10-07 | Dibuat untuk menyerahkan sisa Gelombang 3 ke sesi DSH baru setelah v1.95.0 dirilis. |
