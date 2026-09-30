# Dokumentasi Les Ko Lui — Indeks Utama

```yaml
jenis: indeks
status: aktif
diperbarui: 2026-09-30
versi_app: v1.78.0
test: 609 lulus / 54 berkas
baca_ini_kalau: kamu (manusia atau AI) perlu tahu dokumen mana yang harus dibuka
jangan_baca_berurutan: pakai tabel §2
```

> **Sekilas** · Jenis: **indeks dokumentasi (pintu masuk)** · Status: **aktif** · Diperbarui: 2026-09-30 (v1.78.0).
> **Untuk siapa:** pemilik aplikasi (Ko Lui) dan agen AI yang merawat repo ini.
> **Isi:** peta "mau X → buka Y" (§2) · aturan penamaan (§3) · **status pekerjaan (§4)** · riwayat rilis (§5) · aturan pemeliharaan (§6).
> **Berkas lain tidak perlu dibaca berurutan.** Tabel §2 adalah router-nya.

---

## 1. Peta folder (di mana apa)

| Folder | Isi | Sifat |
|---|---|---|
| `docs/` (folder ini) | dokumentasi **operasional** yang masih dipakai + indeks | aktif |
| `docs/kerja/` | **dokumen tugas** untuk agen AI: langkah, jangkar kode, kontrak, verifikasi | aktif (dikerjakan) |
| `docs/arsitektur/` | seri **cara aplikasi dibangun** (`01`–`11`): stack, data model, template, rotation, AI, export, backup, **UI/UX + biaya AI + privasi** | referensi (sebagian bertanggal) |
| `docs/mockups/` | **gambar hidup** (HTML mandiri) hasil brainstorming UI/UX — **bukan** kode produksi | usulan |
| `docs/arsip/` | dokumen **selesai/usang** — dibekukan, hanya untuk sejarah | beku |

---

## 2. Router: "mau X → buka Y"

### Kalau kamu agen AI yang mau MENGERJAKAN sesuatu

| Mau… | Buka | Catatan |
|---|---|---|
| **memulai pekerjaan apa pun** di rombak UI/UX | [`kerja/ATURAN-AI.md`](kerja/ATURAN-AI.md) | **pintu masuk wajib** — kontrak, keputusan terkunci, daftar larangan, bentuk laporan |
| tahu **cara menulis dokumen tugas** yang bisa dieksekusi model kecil | [`kerja/TASK-02-format-dokumen-tugas-ai.md`](kerja/TASK-02-format-dokumen-tugas-ai.md) | spesifikasi format + anti-pola |
| mengerjakan **refactor layar besar** (6 langkah, belum selesai) | [`kerja/TASK-01-refactor-layar-besar.md`](kerja/TASK-01-refactor-layar-besar.md) | ikuti urutan §3, jangan improvisasi |
| mengerjakan **rombak UI/UX** (fondasi visual, keuangan, catat sesi, AI berbiaya, privasi uang) | [`kerja/TASK-03-blueprint-uiux.md`](kerja/TASK-03-blueprint-uiux.md) → lalu §5 di berkas itu | **baca `ATURAN-AI.md` dulu**; pekerjaan `TASK-04`–`TASK-09` tidak boleh dijalankan tanpa §2 larangannya |
| tahu **aturan yang mengikat semua tugas UI/UX** | [`arsitektur/11-uiux-ai-cost-dan-privasi.md`](arsitektur/11-uiux-ai-cost-dan-privasi.md) | kontrak; kalau tugas bertentangan, kontrak yang menang |
| melihat **gambar usulan tampilan** sebelum menulis kode | [`mockups/`](mockups/) | HTML mandiri, buka langsung tanpa server |
| tahu **daftar seluruh pekerjaan terbuka** | §4 di halaman ini | |

### Kalau kamu manusia yang memakai/merawat aplikasi

| Mau… | Buka | Waktu |
|---|---|---|
| tahu kapan sesi ditagih & kenapa sebuah sesi (tidak) masuk tagihan | [`01-PANDUAN-TAGIHAN.md`](01-PANDUAN-TAGIHAN.md) | ±3 mnt |
| memasang/memperbaiki backup otomatis ke Google Drive | [`02-PANDUAN-BACKUP-DRIVE-SENYAP.md`](02-PANDUAN-BACKUP-DRIVE-SENYAP.md) | ±10 mnt |
| mengaudit tampilan aplikasi secara sistematis (berbasis screenshot) | [`03-PLAYBOOK-AUDIT-UIUX-VISUAL.md`](03-PLAYBOOK-AUDIT-UIUX-VISUAL.md) | ±30 mnt |
| mengubah backup/restore, draf Catat Sesi, respons AI, atau `saveSettings` | [`04-RENCANA-KETAHANAN-DATA.md`](04-RENCANA-KETAHANAN-DATA.md) | ±20 mnt |
| membangun app lain dengan pola offline-first seperti ini | [`05-ARSITEKTUR-REPLIKASI-OFFLINE.md`](05-ARSITEKTUR-REPLIKASI-OFFLINE.md) | ±25 mnt |
| tahu **bagaimana aplikasi ini dibangun** | [`arsitektur/README.md`](arsitektur/README.md) | sesuai kebutuhan |
| mencari keputusan lama (audit & panduan selesai) | [`arsip/README.md`](arsip/README.md) | sesuai kebutuhan |

---

## 3. Aturan penamaan berkas

| Pola nama | Letak | Arti |
|---|---|---|
| `NN-<JUDUL>.md` | `docs/` | dokumen operasional, urutan baca `01`…`05` |
| `README.md` | tiap folder | router/pintu masuk folder itu |
| `TASK-NN-<slug>.md` | `docs/kerja/` | dokumen tugas untuk agen AI (lihat `TASK-02` untuk formatnya) |
| `ATURAN-AI.md` | `docs/kerja/` | **pintu masuk wajib** agen: kontrak, keputusan terkunci, larangan (pendek & padat) |
| `NN-<topik>.md` | `docs/arsitektur/` | seri build guide (`01`–`11`); **tidak semua bertanggal sama** |
| `<topik>-<tanggal>.html` + `_shared.css` | `docs/mockups/` | mockup tampilan; nama berkas memuat tanggal keputusan |
| `<JUDUL-BEBAS>.md` | `docs/arsip/` | dibekukan; nama dipertahankan, **tidak** diberi nomor |

> **Untuk agen AI:** jangan mengandalkan nomor urut sebagai urutan baca. Pakai §2.
> Nama berkas di `arsip/` sengaja dipertahankan agar tautan lama dan ingatan orang tidak putus.

---

## 4. Pekerjaan terbuka

### 4.1 Ada dokumen tugasnya (kerjakan dari situ)

| # | Pekerjaan | Dokumen tugas | Status |
|---|---|---|---|
| 1 | **Refactor layar besar** — `CaptureSession.tsx` 2.591 → ≤1.900 baris, dst. | [`kerja/TASK-01-refactor-layar-besar.md`](kerja/TASK-01-refactor-layar-besar.md) | 4 dari 6 langkah selesai; dua target ukuran masih terbuka |
| 2 | **Blueprint UI/UX** — peta layar → nasib, nav 3 pintu + aksi di nav, 6 prinsip arah | [`kerja/TASK-03-blueprint-uiux.md`](kerja/TASK-03-blueprint-uiux.md) | `todo` — **induk**; baca [`kerja/ATURAN-AI.md`](kerja/ATURAN-AI.md) dulu |
| 3 | **Fondasi visual** — token, 7 primitif, 471 kelas hardcode, dark mode hidup kembali | [`kerja/TASK-04-fondasi-visual.md`](kerja/TASK-04-fondasi-visual.md) | `todo` — risiko terendah, dikerjakan lebih dulu |
| 4 | **Rombak keuangan** — 5 mekanisme tagih → 1 daftar, 4 tab → 1 layar, pipeline dibubarkan | [`kerja/TASK-05-rombak-keuangan.md`](kerja/TASK-05-rombak-keuangan.md) | `todo` — prioritas pemilik |
| 5 | **Perkuat Catat Sesi** — wizard **dipertahankan** (6 langkah tetap 6), satu sheet "Kelola sesi" | [`kerja/TASK-06-perkuat-catat-sesi.md`](kerja/TASK-06-perkuat-catat-sesi.md) | `todo` |
| 6 | **Kontrak AI berbiaya** — satu jalur `useAiAction`, modal biaya tiap panggilan, batas bulanan | [`kerja/TASK-07-kontrak-ai-berbiaya.md`](kerja/TASK-07-kontrak-ai-berbiaya.md) | `todo` — keputusan pemilik: semua AI lewat tombol biaya |
| 7 | **Satu pintu uang** — tutup 6 kebocoran (Home/Murid/Detail/Laporan), `useMoneyVisible()` | [`kerja/TASK-08-satu-pintu-uang.md`](kerja/TASK-08-satu-pintu-uang.md) | `todo` |
| 8 | **Jadwal hari: zoom + tangkapan layar** — agar jadwal pagi–malam bisa di-SS sekaligus | [`kerja/TASK-09-jadwal-hari-zoom.md`](kerja/TASK-09-jadwal-hari-zoom.md) | `todo` |

### 4.2 Belum ada dokumen tugasnya (butuh keputusan manusia dulu)

| # | Pekerjaan | Di mana | Kenapa belum selesai |
|---|---|---|---|
| 9 | **3 kriteria ketahanan data tanpa bukti otomatis** — 2 kriteria Fase E (teks/hash lama saat respons AI gagal; respons terlambat setelah ganti scope) dan 1 kriteria Fase F (snapshot form Pengaturan basi) | [`04-RENCANA-KETAHANAN-DATA.md`](04-RENCANA-KETAHANAN-DATA.md) §13 | Semuanya di lapisan hook/komponen; suite belum punya React Testing Library, jadi butuh tes komponen dulu |
| 10 | **Verifikasi PWA dua build berbeda** (pembaruan antar-deploy: halaman lama masih bisa membuka route lazy setelah deploy baru) | [`04-RENCANA-KETAHANAN-DATA.md`](04-RENCANA-KETAHANAN-DATA.md) §13 | Baru **satu** build produksi yang terbukti (`npm run e2e:pwa`); uji dua build butuh deploy kedua |
| 11 | **Verifikasi manual alur baru Catat Sesi (12 langkah)** — P0–P3 sudah dirilis tetapi layarnya belum dibuka manusia | daftar periksa centang di §4.3 | Angka di dokumen audit diukur dari fungsi lewat test, bukan dari layar |
| 12 | **Katalog topik untuk 74 mapel yang belum punya** (mis. Arts MYP, Group 6 DP, ICT IGCSE) | [`arsip/AUDIT-KONDISI-LES-DAN-TOPIK-2026-09-13.md`](arsip/AUDIT-KONDISI-LES-DAN-TOPIK-2026-09-13.md) §7 P3 #19 | Terdaftar sadar di `KNOWN_TOPIcless` (`src/__tests__/topicCoverage.test.ts`); isi berdasar mapel yang benar-benar diajar, jangan dikejar rata |
| 13 | **2 hal yang sengaja TIDAK dikerjakan** (keputusan, bukan lupa) | [`arsip/AUDIT-UIUX-CATAT-SESI-2026-09-12.md`](arsip/AUDIT-UIUX-CATAT-SESI-2026-09-12.md) §9.3 | bottom-nav dibiarkan tampil selama wizard; chip teks 38–42 px dibiarkan (≥24 px, lolos WCAG 2.5.8) |

### 4.3 Daftar periksa manual — alur Catat Sesi versi baru (±10 menit)

Satu-satunya cara menutup pekerjaan §4.2 #4. Jalankan dengan data dev (fungsi `seedDummy()` sudah menyiapkan murid IB MYP / IB DP / Cambridge IGCSE / AP / Nasional).

- [ ] **1.** Murid **Cambridge IGCSE** → mapel ber-kode → langkah Materi → ketik `algebra` → muncul baris "Menampilkan topik jenjang IGCSE" dan **hanya** topik IGCSE
- [ ] **2.** Buka **"📚 Pilih dari daftar bab"** → daftar bab muncul; membuka satu bab menampilkan topik bercentang; memilih satu topik menambah chip **beserta nama babnya**
- [ ] **3.** Pilih topik yang sama dari **pencarian** → tidak muncul chip kedua (string identik)
- [ ] **4.** Mapel yang katalognya belum ada (mis. `Global Perspectives (0457)`) → ketik `essay` → kotak kuning "Tidak ada topik jenjang IGCSE…" + tombol "Tampilkan topik jenjang lain" / "Pakai … sebagai topik"
- [ ] **5.** Murid **Nasional** + `Matematika` → ketik `bilangan` → tidak ada hasil berlabel `MYP`
- [ ] **6.** Murid **IB DP** + `Global Politics` → ketik `power` → **tidak ada** hasil Matematika (dulu ada)
- [ ] **7.** Langkah Kondisi → hanya **3 tombol kondisi + 6 indikator** terlihat; "6 indikator lain" membuka sisanya; tombol "😐 Biasa" **sudah tidak ada**
- [ ] **8.** Ketuk "Seperti biasa" saja → lanjut ke langkah Detail → kartu "Skor sesi" berkata **skor tidak dihitung**
- [ ] **9.** Isi 2 indikator → langkah Detail → skor muncul + "kelengkapan data: Sebagian"; **isi pilihan respons akademik** → angka berubah di langkah itu juga
- [ ] **10.** Simpan sesi → buka detail dari tab Riwayat → semua indikator & tag tampil; tombol "✏️ Koreksi" menyimpan perubahan dan skor ikut berubah
- [ ] **11.** Tab Nilai → kartu Keseriusan Belajar → ada penyebut ("rata-rata dari N sesi"), panel **cakupan data**, dan grafik **Kualitas Respons Akademik**
- [ ] **12.** Pengaturan → Ekspor CSV → kolom baru "Bab Topik" & "Sumber Skor"; kolom Level berisi label (mis. `IGCSE · Grade 10`), **bukan** `UNIV`

> Sudah ditutup 2026-09-13: verifikasi E2E close-out gagal (Fase B) dan runtime/PWA restore (Fase D) dijalankan
> (`e2e/capture-closeout-failure.spec.ts`, `e2e-pwa/pwa-runtime.spec.ts`). Dari 32 kriteria §5–§9 di dokumen
> ketahanan data, 29 sudah dicentang dengan rujukan tes; 3 sisanya ada di §4.2 #2.

---

## 5. Riwayat rilis (ringkas — jejak lengkap di `arsip/README.md`)

| Tanggal | Peristiwa | Versi |
|---|---|---|
| 2026-06-26 | Audit dokumentasi vs kode: 13 dokumen diselaraskan | v1.12.1 |
| 2026-07 → 08 | Audit keamanan/teknis 4 ronde: 26/26 ditangani (1 di-waive: H-2, API key AI) | v1.37.0 → v1.53.0 |
| 2026-08-29 | Refactor Catat Sesi: state besar dipecah ke 3 hook | v1.64.x |
| 2026-09-01 | Analisis UI/UX (chart/data-viz) + cheat-sheet tagihan | v1.66–1.68 |
| 2026-09-04 | Audit interaksi, navigasi, a11y, design system | v1.70.0 |
| 2026-09-05 | Audit redundansi informasi + humanisasi pesan WhatsApp | v1.70.x |
| 2026-09-05 | **Ketahanan data: 6 fase (A–F) diimplementasikan** (draf Catat Sesi, schema v15, validasi restore, kontrak AI, `saveSettings` atomik) | v1.70.5 |
| 2026-09-08 | Backup senyap ke Google Drive lewat relay | v1.71.x |
| 2026-09-11 | Audit visual 87 screenshot: 14 temuan — semua ditutup | v1.71.4 |
| 2026-09-12 | Audit modul Keuangan: 10 item — semua diimplementasikan | v1.72.0 |
| 2026-09-12 | Audit alur Catat Sesi: **17 temuan** + 2 bug tambahan saat verifikasi | v1.73.0 |
| 2026-09-13 | Ketahanan data: E2E close-out gagal (Fase B) + runtime PWA/restore (Fase D) dijalankan | v1.73.0 |
| 2026-09-13 | Audit pilihan topik & kondisi les **P0**: cakupan topik 64 → 93 dari 167 mapel; saran topik lintas-jenjang tidak lagi menyamar | v1.74.0 |
| 2026-09-13 | Audit yang sama **P1–P3**: pilih topik dari daftar bab, langkah Kondisi 3 lapis (60 → 11 kontrol), mood keluar dari skor, rata-rata berpenyebut + cakupan data, detail sesi bisa dikoreksi, jenjang murid tidak lagi `UNIV` | v1.75.0 |
| 2026-09-13 | Refactor putaran 1: `StudentDetail.tsx` 1.429 → 1.039; modul konstanta & helper Catat Sesi; **+31 test** (530 → 561); 2 bug ditemukan test baru | v1.75.1 |
| 2026-09-13 | Dokumentasi ditata ulang: `docs/kerja/` untuk dokumen tugas AI, indeks jadi router, `TODO.md` + `03-capture-flow.md` diarsipkan | v1.75.1 |
| 2026-09-15 | Ketahanan AI dan Settings diperkuat dengan tes; refactor Catat Sesi, detail murid, dan tagihan dilanjutkan | v1.76.0 |
| 2026-09-30 | Tarif sesi lama dibekukan (retroaktif hanya lewat centang eksplisit + audit); tagihan bisa dibatalkan berjejak lalu dipulihkan dari perangkat ini; total laporan final dibekukan; jatuh tempo bisa diubah — semuanya di balik PIN Keuangan | v1.77.0 |
| 2026-09-30 | Laporan final bisa **dibuka kuncinya** menjadi draft untuk diperbaiki (PIN-gated) — jalur yang hilang sebelumnya: membatalkan tagihan saja menghasilkan tagihan identik karena total final membeku; guard: tagihan lunas/manual, paket, laporan susulan | v1.78.0 |

---

## 6. Aturan pemeliharaan (supaya tidak berantakan lagi)

### 6.1 Untuk manusia

1. **Dokumen selesai → pindahkan ke `docs/arsip/`** dan tambahkan satu baris di [`arsip/README.md`](arsip/README.md): tanggal · target versi · status akhir · hasil.
2. **Nama berkas di `arsip/` tidak diganti.** Isi arsip dibekukan; yang boleh berubah hanya **rujukan path** agar tidak menunjuk lokasi lama.
3. **Dokumen dengan pekerjaan terbuka tetap di `docs/` atau `docs/kerja/`** dan wajib punya blok "Sekilas" di baris atas.
4. **Jangan menaruh dokumentasi penting di luar repo.** Folder induk (`Private Tutor/`) tidak dikelola git.
5. **Artefak tidak masuk repo**: `dist/`, `test-results/`, `typecheck-output.txt`, ekspor `leskolui-data-*.csv` sudah diabaikan `.gitignore`.

### 6.2 Untuk agen AI (dan manusia yang menulis untuk AI)

1. **Sebelum mengerjakan apa pun di rombak UI/UX, baca [`kerja/ATURAN-AI.md`](kerja/ATURAN-AI.md).** Berkas itu memuat keputusan yang sudah dikunci (B1–B4), daftar berkas yang **dilarang** disentuh, perintah verifikasi, dan bentuk laporan yang diminta. Ia sengaja pendek supaya hemat token. Urutan menang kalau ada konflik: `ATURAN-AI.md` → `arsitektur/11` → `TASK-XX` → lainnya.
2. **Dokumen tugas masuk `docs/kerja/`** dengan format di [`kerja/TASK-02-format-dokumen-tugas-ai.md`](kerja/TASK-02-format-dokumen-tugas-ai.md). Dokumen tugas **wajib** memuat: jangkar kode (bukan hanya nomor baris), kontrak prop/fungsi yang bisa disalin, perintah verifikasi, tabel larangan, dan bagian "kalau macet".
3. **Jangan membaca berkas >500 baris secara utuh.** Empat berkas terbesar: `CaptureSession.tsx` (2.099), `MonthlyReport.tsx` (2.097), `Settings.tsx` (1.118), `StudentDetail.tsx` (1.037). Pakai jangkar teks, baca ±40 baris di sekitarnya.
4. **Satu langkah per putaran, lalu berhenti.** Jangan melanjutkan ke langkah berikutnya tanpa verifikasi.
5. **Jangan menaruh daftar pekerjaan di `README.md` akar repo** — dulu ada `TODO.md` di akar dan tidak pernah terbaca. Daftar pekerjaan hidup di §4 halaman ini.
6. **Setelah mengubah perilaku:** tambahkan entri di `src/lib/version.ts` (`CHANGELOG`) dan satu baris di §5 halaman ini.
7. **Kalau menemukan fakta yang bertentangan dengan dokumen:** perbaiki dokumennya di putaran yang sama, atau catat di `docs/kerja/TASK-*.md` §8. Jangan biarkan dua dokumen saling bertentangan.
8. **Versi di `docs/arsitektur/` tidak selalu terbaru.** Seri itu menjelaskan **cara** aplikasi dibangun, bukan keadaan hari ini. Untuk keadaan hari ini: kode + `src/lib/version.ts` + §5 halaman ini.
