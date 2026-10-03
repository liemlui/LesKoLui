# Dokumentasi Les Ko Lui — Indeks Utama

```yaml
jenis: indeks
status: aktif
diperbarui: 2026-10-03
versi_app: v1.88.0
test: 691 lulus / 57 berkas (belum dijalankan ulang untuk v1.88.0 — gate tes dimatikan atas keputusan pemilik)
baca_ini_kalau: kamu (manusia atau AI) perlu tahu dokumen mana yang harus dibuka
jangan_baca_berurutan: pakai tabel §2
```

> **Sekilas** · Jenis: **indeks dokumentasi (pintu masuk)** · Status: **aktif** · Diperbarui: 2026-10-03 (v1.88.0).
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
| **lihat peta tugas gelombang 2 & 3** | [`kerja/ROADMAP.md`](kerja/ROADMAP.md) | pengganti GELOMBANG-2/3 |
| **lihat ringkasan TASK-01…TASK-10** | [`kerja/CHEATSHEET.md`](kerja/CHEATSHEET.md) | 1 halaman per tugas |
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
| 1 | **Refactor layar besar** — `CaptureSession.tsx` 2.591 → ≤1.900 baris, dst. | [`kerja/TASK-01-refactor-layar-besar.md`](kerja/TASK-01-refactor-layar-besar.md) | 4 dari 6 langkah selesai; dua target ukuran masih terbuka. **Refactor terbatas dikunci 2026-10-01 (Q9, §10):** `CaptureSession.tsx` sebelum G3-01, `MonthlyReport.tsx` sebelum G3-05 |
| 2 | **Blueprint UI/UX** — peta layar → nasib, nav 3 pintu + aksi di nav, 6 prinsip arah | [`kerja/TASK-03-blueprint-uiux.md`](kerja/TASK-03-blueprint-uiux.md) | `todo` — **induk**; baca [`kerja/ATURAN-AI.md`](kerja/ATURAN-AI.md) dulu. Amandemen 2026-10-01 (Q3/Q5) sudah masuk §2 |
| 3 | **Fondasi visual** — token, 7 primitif, kelas warna hardcode (baseline **2976** terukur 2026-10-03; angka **907**/904 sebelumnya berasal dari penghitung 4-pola yang buta terhadap `slate`/`blue`/`text-white`), **light-only permanen** | [`kerja/TASK-04-fondasi-visual.md`](kerja/TASK-04-fondasi-visual.md) | ✅ **G2-01 + G2-02 SELESAI** — `G2-01` (v1.86.0) **L1–L2**: token (tipografi 13/15/18/24 · spacing · 2 elevasi · 2 gerak) + warna semantik `--ink-*`/`--bg-*`, **7 primitif** di `src/components/ui/`, **Q25**. `G2-02` (v1.87.0) **L4–L5**: sapu 2976 → **0** di 72 berkas. **Target "≤190" DICABUT** — diganti **"0 kelas warna di luar berkas §2.1"**; sisa 42 kelas ada di `engagement.ts`/`invoicePresentation.ts`/`finance.ts` (terlindungi). L6 dark mode **dibatalkan** (Q4) |
| 4 | **Rombak keuangan** — 5 mekanisme tagih → 1 daftar, 4 tab → 1 layar, pipeline **di-redesign** (board di dalam blok "Perlu ditagih") | [`kerja/TASK-05-rombak-keuangan.md`](kerja/TASK-05-rombak-keuangan.md) | `todo` — prioritas pemilik. Langkah 6 diubah 2026-10-01 (Q3): **bukan** dibubarkan |
| 5 | **Perkuat Catat Sesi** — wizard **dipertahankan** (6 langkah tetap 6), satu sheet "Kelola sesi", **simpan boleh dari langkah 5** | [`kerja/TASK-06-perkuat-catat-sesi.md`](kerja/TASK-06-perkuat-catat-sesi.md) | `todo` — amandemen Q2: `STEP_META` tidak berubah, +2 tes (L7) |
| 6 | **Kontrak AI berbiaya** — satu jalur `useAiAction`, modal biaya tiap panggilan, batas bulanan **opsional (default kosong)** | [`kerja/TASK-07-kontrak-ai-berbiaya.md`](kerja/TASK-07-kontrak-ai-berbiaya.md) | `todo` — keputusan pemilik: semua AI lewat tombol biaya. B4 diubah 2026-10-01 (Q1) |
| 7 | **Satu pintu uang** — tutup 6 kebocoran (Home/Murid/Detail/Laporan), `useMoneyVisible()` | [`kerja/TASK-08-satu-pintu-uang.md`](kerja/TASK-08-satu-pintu-uang.md) | `todo` |
| 8 | **Jadwal hari: zoom + tangkapan layar** — agar jadwal pagi–malam bisa di-SS sekaligus | [`kerja/TASK-09-jadwal-hari-zoom.md`](kerja/TASK-09-jadwal-hari-zoom.md) | `todo` |
| 9 | **Tiga gelombang perbaikan UI/UX** — G1-01…G1-11 (bersih-bersih & aksesibilitas), G2-01…G2-10 (fondasi token/uang/jadwal), G3-01…G3-10 (alur: catat sesi, keuangan, AI, laporan, murid/proyek, foto, pengaturan) | [`kerja/GELOMBANG-1.md`](kerja/GELOMBANG-1.md) · [`kerja/ROADMAP.md`](kerja/ROADMAP.md) · [`kerja/ROADMAP.md`](kerja/ROADMAP.md) | ✅ **G1-01…G1-11 SELESAI** (v1.85.0, 2026-10-03). 🟡 **Gelombang 2 hampir tuntas (v1.88.0)**: **10 selesai** (G2-00, 00b, 01, 02, 03, 04, 06, 07, 08, 10) · **G2-09 sebagian** (judul + tombol utama sudah SVG; chip wizard belum) · **G2-05 manual** (butuh HP Android) · **G3-01…G3-10 belum mulai** |
| 10 | **Smart Gating** — gate 4 tier menurut *blast radius* tugas (T0 dokumen saja · T1 <3 berkas tanpa infra · T2 menyentuh `src/components`/`lib`/`db`/`hooks` atau layar dipakai >3 layar · T3 tugas terakhir gelombang / perubahan config), supaya tugas kecil di Gelombang 2 & 3 tidak membayar gate penuh; **jaring akhir tetap** di tugas terakhir tiap gelombang | [`kerja/ATURAN-AI.md`](kerja/ATURAN-AI.md) §6.2 · [`kerja/ROADMAP.md`](kerja/ROADMAP.md) baris G2-00 | ✅ **G2-00 SELESAI** (2026-10-03) — amandemen dokumen saja: **tanpa** perubahan kode, script, atau config; **tanpa** version bump; **tanpa** entri §5. **Berlaku mulai G2-01** |
| 11 | **Line Endings + formalisasi A15/A16** — semua berkas teks WAJIB **LF**, dikunci `.gitattributes`; aturannya ditulis di §6.3 | [`kerja/ATURAN-AI.md`](kerja/ATURAN-AI.md) §6.3 · §9 | **G2-00b ✅ — Line Endings + A15/A16** (2026-10-03) — dokumen + `.gitattributes` saja; **tanpa** perubahan kode; **tanpa** version bump; **tanpa** entri §5 |
| 12 | **Fondasi tampilan** — token warna/tipografi/spacing/elevasi/gerak + **7 primitif** di `src/components/ui/` + perbaikan **Q25** (`font: inherit` dipindah ke `@layer base`) + **sapu kelas warna ke token** | [`kerja/ROADMAP.md`](kerja/ROADMAP.md) baris G2-01 & G2-02 · [`kerja/ATURAN-AI.md`](kerja/ATURAN-AI.md) §6.2 | ✅ **G2-01** (v1.86.0): **Tier 3** — tsc · lint · **691/691 tes** · build · `md-links` 0 rusak · `e2e:uiux` hijau · **41 pasangan kontras lulus**. ✅ **G2-02** (v1.87.0, 2026-10-03): **Tier 3** — sapu **2976 → 0** kelas warna di **72 berkas**; **23 token** baru (36 dipakai); kontras **25 pemeriksaan / 0 gagal** (terburuk 4,94:1); opasitas `/NN` **34/34 `color-mix`**; gate tsc · lint · 691 tes · build · `md-links` 0 · `e2e:uiux` 34 lulus/8 skip · Playwright 32 lulus (5 spec generator/basi dikecualikan, Q37). **Sisa 42 kelas** di 3 berkas §2.1 (`engagement.ts` 24 · `invoicePresentation.ts` 12 · `finance.ts` 6) — butuh keputusan Q42/Q43. `test.fixme` **tidak** dihapus (Q24) |

### 4.2 Belum ada dokumen tugasnya (butuh keputusan manusia dulu)

| # | Pekerjaan | Di mana | Kenapa belum selesai |
|---|---|---|---|
| 9 | **3 kriteria ketahanan data tanpa bukti otomatis** — 2 kriteria Fase E (teks/hash lama saat respons AI gagal; respons terlambat setelah ganti scope) dan 1 kriteria Fase F (snapshot form Pengaturan basi) | [`04-RENCANA-KETAHANAN-DATA.md`](04-RENCANA-KETAHANAN-DATA.md) §13 | Semuanya di lapisan hook/komponen; suite belum punya React Testing Library, jadi butuh tes komponen dulu |
| 10 | **Verifikasi PWA dua build berbeda** (pembaruan antar-deploy: halaman lama masih bisa membuka route lazy setelah deploy baru) | [`04-RENCANA-KETAHANAN-DATA.md`](04-RENCANA-KETAHANAN-DATA.md) §13 | Baru **satu** build produksi yang terbukti (`npm run e2e:pwa`); uji dua build butuh deploy kedua |
| 11 | **Verifikasi manual alur baru Catat Sesi (12 langkah)** — P0–P3 sudah dirilis tetapi layarnya belum dibuka manusia | daftar periksa centang di §4.3 | Angka di dokumen audit diukur dari fungsi lewat test, bukan dari layar |
| 12 | **Katalog topik untuk 74 mapel yang belum punya** (mis. Arts MYP, Group 6 DP, ICT IGCSE) | [`arsip/AUDIT-KONDISI-LES-DAN-TOPIK-2026-09-13.md`](arsip/AUDIT-KONDISI-LES-DAN-TOPIK-2026-09-13.md) §7 P3 #19 | Terdaftar sadar di `KNOWN_TOPIcless` (`src/__tests__/topicCoverage.test.ts`); isi berdasar mapel yang benar-benar diajar, jangan dikejar rata |
| 13 | **2 hal yang sengaja TIDAK dikerjakan** (keputusan, bukan lupa) | [`arsip/AUDIT-UIUX-CATAT-SESI-2026-09-12.md`](arsip/AUDIT-UIUX-CATAT-SESI-2026-09-12.md) §9.3 | bottom-nav dibiarkan tampil selama wizard; chip teks 38–42 px dibiarkan (≥24 px, lolos WCAG 2.5.8) |
| 14 | **Temuan audit UI/UX v1.79.3** — 14 lintas-sistem + 79 modul (kontras 46 pasangan gagal AA, terburuk 2,07:1; aksi uang tanpa konfirmasi; teks jaminan "Hapus Semua Data" salah) | [`06-AUDIT-UIUX-2026-10-01.md`](arsip/06-AUDIT-UIUX-2026-10-01.md) | 73 temuan tetap, 18 sebagian, 1 klaim dibatalkan (lihat berkas 07). **Wajib baca 07 lebih dulu** sebelum mengerjakan |
| 15 | **Validasi + rencana eksekusi audit UI/UX** — baseline kelas warna dikoreksi **904** (bukan 471); **amandemen Q1–Q14 sudah dikunci 2026-10-01** di `ATURAN-AI` §1, `arsitektur/11`, `TASK-03…07`, dan playbook | [`07-VALIDASI-RENCANA-2026-10-01.md`](arsip/07-VALIDASI-RENCANA-2026-10-01.md) | ✅ **G1-01…G1-11 selesai** (v1.85.0); dokumen tugas 3 gelombang di `docs/kerja/GELOMBANG-1..3.md` |
| 16 | **K-01 — peringatan saat mengubah nominal tagihan** (menyentuh kolom nominal memindahkan asal tagihan ke `manual` secara senyap → daftar sesi hilang dari ekspor & WA). `TASK-10` sudah selesai, jadi butuh tugas lanjutan | keputusan pemilik #1 (2026-10-01) · [`07-VALIDASI-RENCANA-2026-10-01.md`](arsip/07-VALIDASI-RENCANA-2026-10-01.md) §3 | Dokumen tugas ditulis di `kerja/GELOMBANG-3.md` (G3-02) |
| 17 | ✅ **Dijawab 2026-10-01 (Q11 = A)** — aturan refactor terbatas (Q9) berlaku juga untuk `TagihanTab.tsx` (sebelum G3-02), `StudentDetail.tsx` (sebelum G3-06), `Settings.tsx` (sebelum G3-09). Dikunci sebagai **A13** | [`kerja/TASK-01-refactor-layar-besar.md`](kerja/TASK-01-refactor-layar-besar.md) §10 | Sudah masuk rencana gelombang 3 (bagian "0. Refactor terbatas" di G3-02/G3-06/G3-09) |
| 18 | ✅ **Q12 dijawab 2026-10-01 (opsi A)** — `G3-04` (TASK-07) dikerjakan **sebelum** `G3-05` (laporan) karena panel AI butuh `useAiAction`. Dikunci sebagai **A14** di `ATURAN-AI` §4 | [`07-VALIDASI-RENCANA-2026-10-01.md`](arsip/07-VALIDASI-RENCANA-2026-10-01.md) §8 · [`kerja/ATURAN-AI.md`](kerja/ATURAN-AI.md) §4 | Urutan akhir: G3-01 → G3-02 → G3-03 → G3-04 → G3-05 → … → G3-10 |
| 19 | **Q19 — label form di luar daftar konkret G1-10** → **dipindah ke G2** (keputusan pemilik 2026-10-03). Sisa: input PIN inline `Payments.tsx:129` (hanya placeholder), "Ketik mapel lain" `CaptureSession.tsx:2039`, dan `<label className="label">Model</label>` tanpa `htmlFor` di `Settings.tsx` (temuan S-13) | [`06-AUDIT-UIUX-2026-10-01.md`](arsip/06-AUDIT-UIUX-2026-10-01.md) §4.7 S-13 · [`kerja/GELOMBANG-1.md`](kerja/GELOMBANG-1.md) §G1-10 | **Dipindah ke G2** — Gelombang 2 belum punya ID tugas untuk label form; pemilik perlu menetapkan apakah jadi tugas baru atau digabung (mis. ke `G2-05`/`G3-09`). Tidak dikerjakan di G1-11 sesuai keputusan |
| 20 | ✅ **Q20 — `e2e/capture-closeout-failure.spec.ts` patah sejak G1-06** (spec menuntut `/Tindak lanjut belum tersimpan; coba lagi\./`, sedangkan G1-06 memakai `"Sesi sudah tersimpan; tindak lanjut belum tersimpan. " + saveErrorMessage(e)`) | [`kerja/GELOMBANG-1.md`](kerja/GELOMBANG-1.md) §G1-11 | **Selesai 2026-10-03 (G1-11)**: regex disesuaikan (+ komentar sebabnya); spec **1/1 lulus**. Inilah penutup kenapa Q16d dulu tidak pernah tertangkap tes |
| 21 | ✅ **Q21 — penjaga regresi permanen untuk pola tab & hierarki heading**. G1-10 hanya dibuktikan spec sementara (salinan di `.design-audit/g1-10/`) | [`kerja/GELOMBANG-1.md`](kerja/GELOMBANG-1.md) §G1-11 | **Selesai 2026-10-03 (G1-11)**: penjaga permanen = `e2e-uiux/uiux-metrics.spec.ts` (7 layar × 2 project, ambang heading & kontrak tab) + `src/__tests__/tabsAccessibility.test.tsx` (13 tes: role/`aria-selected`/`tabIndex`/`aria-controls` + panah/Home/End) |
| 22 | ✅ **Q22 — hierarki heading (L-07)**. (a) Keuangan: 6 `h2` setara tanpa induk sehingga "kartu tingkat-B jadi `h3`" menciptakan lompatan `h1→h3`; (b) **Murid** (daftar), **Laporan**, **Pengaturan** hanya `h1` | [`kerja/GELOMBANG-1.md`](kerja/GELOMBANG-1.md) §G1-10 "DoD direvisi" · [`06-AUDIT-UIUX-2026-10-01.md`](arsip/06-AUDIT-UIUX-2026-10-01.md) L-07 | **Selesai 2026-10-03 (G1-11)**: (a) langkah 4 **dibatalkan** (DoD G1-10 direvisi — alasan tertulis); (b) ketiga layar dapat `<h2 className="sr-only">`, terverifikasi `h2Count = 1` di runtime (chromium + mobile) |
| 23 | ⏳ **Q23 — penempatan spec guard metrik UI** (temuan G1-11). DoD menaruh spec di `e2e/uiux-metrics.spec.ts`, tetapi `playwright.config.ts` **dilarang diubah**; dengan `testDir: "./e2e"` (rekursif) spec di dalam `e2e/` pasti ikut `npm run e2e` (+±2 menit CI) | [`kerja/GELOMBANG-1.md`](kerja/GELOMBANG-1.md) §G1-11 penyimpangan #1 | **Butuh keputusan pemilik.** Sementara dipakai `e2e-uiux/` + `playwright.uiux.config.ts` (`testDir: "./e2e-uiux"`) supaya dua syarat DoD lain tetap terpenuhi tanpa menyentuh config utama |
| 24 | ⏳ **Q24 — sisa pelanggaran yang kini dijaga `test.fixme`** (terukur G1-11, identik chromium & mobile): **16 kontras** — Murid 6 (4,39:1 `gray-500` di `gray-100`: tab "Historis (1)" + 5 tombol "Edit murid"), Detail murid 4 (tautan telepon 3,22:1 · `blue-500` 3,46:1 · `indigo-500` 4,09:1), Keuangan 6 (3,10 · 3,20 · 3,47 · 3,20 · 4,39 · 4,39) — dan **2 tautan telepon 126×20 px** | [`kerja/GELOMBANG-1.md`](kerja/GELOMBANG-1.md) §G1-11 tabel residual | Sudah punya tugas: **G2-01/G2-02** (kontras & token) dan **G2-06** (tap target ≥44 px). Dicatat agar `G2-02`/`G2-06` menghapus `test.fixme`-nya setelah selesai — **bukan** menaikkan ambang |
| 25 | ⏳ **Q25 — kelas `text-*`/`font-*` tidak berlaku pada kontrol form** (temuan G1-11, bukti runtime 2026-10-03). `src/index.css:67` (`button, input, select, textarea { font: inherit }`) berada **di luar `@layer`**, jadi mengalahkan `@layer utilities` Tailwind v4. Terukur: tombol "Edit murid" (`Students.tsx:325`, kelas memuat `text-sm`) ter-render **16px/400**, sedangkan `<p class="text-xs font-bold">` di layar yang sama ter-render **12px/700** — artinya skala tipografi K4 (24/18/15/13) tidak sampai ke tombol/input, dan 16px tidak ada di skala itu | bukti: `docs/kerja/GELOMBANG-1.md` §G1-11 (Q25) · [`06-AUDIT-UIUX-2026-10-01.md`](arsip/06-AUDIT-UIUX-2026-10-01.md) K4 | **Butuh keputusan pemilik**: gabungkan ke `G2-01` (token + 7 primitif) atau jadikan tugas sendiri. Tidak dikerjakan di G1-11 karena mengubah tampilan **semua** kontrol form di seluruh aplikasi |

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
| 2026-10-03 | **Sisa Gelombang 2 dikerjakan (5 tugas + 1 sebagian)**: (a) **G2-04 satu pintu uang** — `useMoneyVisible()` (satu status tingkat modul) + `<MaskedMoney/>`; 6 titik kebocoran ditutup (tarif & biaya sesi, total laporan, tautan WA), Beranda kehilangan seluruh akses uang, dan gerbang `/payments` kini **berbagi** status buka-kunci dengan layar lain + tombol `Kunci`; (b) **G2-08 Beranda non-uang** — legenda warna kalender, `aria-label` per tanggal, sel 64→76 px, chip 11 px maks 2 + “+N”, inbox “Perlu Perhatian” persisten di `localStorage`, tombol simpan jadwal menyebut jumlah bentrok, ringkasan minggu **digabung** ke satu blok “Hari Ini”; (c) **G2-06 tap target** — ikon 44 px, chip 32–36 px, `Toggle` 26→32 px rel dengan area 44 px, tautan WA 20→44 px, “Hapus” murid dipisah dari “Nonaktifkan”; (d) **G2-07 DayView** — kerapatan 27/54/97 + tombol `Muat sehari penuh` (18 jam), `PX_PER_HR` dihapus total, batas bawah blok 22 px; (e) **G2-10 jalur galat tunggal** — `useSettingsQuery()` + `<SettingsLoadError/>`, probe/watchdog G1-07 pindah dari `Settings.tsx` ke hook, **6 layar** lain mendapat keadaan gagal yang sama (`role=alert` + “Coba lagi”); (f) **G2-09** — emoji **literal** di kontrol & heading disapu sampai **0** (17 ikon SVG), tetapi **69 emoji masih hidup sebagai `icon:` di 7 berkas data** (`responseTaxonomy` 26 · `captureSession/constants` 19 · `moods` 6 · `sessionTemplates` 6 · `template/layouts` 9 · `engagement.ts` 3 — dilindungi §2.1) dan tetap tampil di dalam tombol saat runtime; DoD-nya sendiri menyebut `e2e:uiux` sebagai alat ukur padahal guard itu **tidak punya metrik emoji**. **Gate yang dijalankan: `npx tsc -b` saja** (keputusan pemilik: tanpa lint/tes/e2e) — lihat `.design-audit/g2-sisa-LAPORAN.md` | v1.88.0 |
| 2026-10-03 | **Warna di seluruh layar diseragamkan**: sekitar **3.000 penulisan warna langsung di 72 berkas** diganti token bertema (**23 token baru**, total 36 dipakai) — warna untuk peran yang sama kini sama di semua layar, dan setiap teks di atas latar terang dibuktikan ≥4,5:1 (rasio terburuk 4,94:1). Ditambah warna khusus status “perlu ditindak” (oranye, terpisah dari kuning “backup menua”, Q33). Opasitas `/NN` dinormalkan dan dibuktikan 34/34 menghasilkan `color-mix`. **Tirai panel dikembalikan ke definisi benar** (17 titik sempat menunjuk `--scrim` yang belum pernah didefinisikan → diperbaiki). Dibuang: `--bg-muted` + skala `--color-brand-*`. Sisa: 42 warna mentah di 3 berkas §2.1 (`engagement.ts` · `invoicePresentation.ts` · `finance.ts`) | v1.87.0 |
| 2026-10-03 | **Skala ukuran teks akhirnya berlaku di tombol & kolom isian**: aturan “kontrol form mewarisi huruf sekitarnya” yang ditulis di luar lapisan gaya dipindah ke `@layer base` — sebelumnya ia mengalahkan seluruh kelas ukuran/ketebalan huruf, sehingga tombol yang ditulis 14px tebal tetap dirender 16px biasa (Q25). Ditambah **fondasi tampilan Gelombang 2**: skala ukuran huruf 13/15/18/24 px, skala jarak kelipatan 4, 2 tingkat bayangan, 2 pola gerak, **4 warna teks bertema** (`--ink-*`) + latarnya yang dibuktikan ≥4,5:1 di semua latar terang (13 titik G1-04 diuji ulang: 5,05–7,13:1), dan **7 primitif** di `src/components/ui/` (G2-01) | v1.86.0 |
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
| 2026-10-01 | Foto sesi mengalir di dalam teks (7 layout), pilihan rasio 3:4 dihapus (semua tinggi otomatis), satu tombol **🤖 Isi Semua dengan AI** dengan narasi berbatch (anti-gagal konteks terlalu besar), info terduplikasi di laporan dihapus (chip topik/perhatian), tema & warna diacak (galeri disembunyikan, mode Bandingkan dihapus), menu Laporan bisa membuka riwayat laporan, aksi penagihan jadi satu tombol, tombol kirim laporan+tagihan & WA massal dihapus, entri pemulihan tagihan bisa dihapus, **foto sesi >12 bulan diperkecil otomatis** (data lama tidak membengkak) | v1.79.0 |
| 2026-10-01 | **Kunci periode laporan jadi per SESI, bukan kalender** (memperbaiki laporan murid yang ditolak karena “tanggal 1 September sudah direkap” padahal rekap sebelumnya bukan September); daftar periode terkunci bisa dibuka di layar Laporan; rentang sesi + tombol “Sesuaikan tanggal”; **titik pemulihan tagihan bisa dipilih** (termasuk kembali ke titik lama setelah salah pulihkan); restore file/Drive menampilkan tahapan + tombol cek file + pesan gagal yang jelas; CSP font tema diperbaiki | v1.79.0 |
| 2026-10-01 | **Perbaikan tombol “Isi Semua dengan AI”**: kolom **Catatan Guru** & **Rencana Berikutnya** tidak terisi karena hanya dihasilkan panggilan narasi sementara field laporan ditulis dari panggilan ringkasan — sekarang satu panggilan ringkasan mengisi ringkasan + catatan guru + kutipan + rencana depan, dengan cadangan dari batch penuh bila panggilan itu gagal | v1.79.1 |
| 2026-10-01 | **Filter kategori layout dihapus** (Classic/Visual/Analytic/Modern/Formal/Playful) — panel desain kini cukup: 🎲 Acak, 🎨 Pilih tema, 📐 Layout (semua layout tetap ada, plus pratinjau 👁) | v1.79.2 |
| 2026-10-03 | **Judul layar Murid, Laporan, dan Pengaturan kini terbaca pembaca layar** (tiga layar terakhir yang tadinya hanya punya `h1` — daftar heading-nya kosong untuk navigasi pembaca layar), plus **penjaga regresi metrik UI** `npm run e2e:uiux` (7 layar × 2 ukuran layar: kontras teks, ukuran kontrol, hierarki heading, kontrak tab) yang **tidak** ikut CI utama, spec close-out yang patah sejak G1-06 ditambal, dan 13 tes tab permanen (G1-11) | v1.85.0 |
| 2026-10-03 | **A11y dasar: tab, judul, pesan status, dan tombol "Coba lagi" close-out** — pola tab lengkap di 3 layar bertab (setiap tab menunjuk panel isinya, hanya tab aktif yang kena tombol Tab, panah ←/→ + Home/End memindahkan fokus sekaligus membuka tab), judul blok Beranda jadi heading sungguhan ("Hari Ini"; "Perlu Perhatian" & "Kalender" untuk pembaca layar), banner Laporan dibacakan sebagai status/peringatan, tombol **"Coba lagi"** kegagalan tindak lanjut pindah ke **dalam** laporan sesi (dulu di balik modal yang mengunci fokus keyboard), tombol ✓ follow-up punya nama, dan keterangan reset menyebut "(kecuali satu jejak reset)" (G1-10) | v1.84.0 |
| 2026-10-01 | **Teks jaminan “Hapus Semua Data” diperbaiki & jalur Simpan PIN tidak lagi merusak metadata**: layar Pengaturan berhenti menjanjikan “Pengaturan, profil, dan PIN tetap aman” (padahal PIN Keuangan, kunci API AI, logo, profil, dan rekening bank ikut terhapus) dan menyebut apa yang tetap ada; “Simpan PIN” kini menulis patch, bukan snapshot penuh — `lastBackupAt` dari backup yang lebih baru tidak lagi mundur, badge “Belum disimpan” kembali “Tersimpan ✓”, dan kegagalan menyimpan PIN dilaporkan (G1-09) | v1.83.0 |
| 2026-10-01 | **Aksi yang mengubah uang & menghapus data minta konfirmasi**: tandai lunas/belum dibayar (+ tombol **Urungkan** 8 detik, label “Batalkan pelunasan” → “Tandai belum dibayar”), hapus foto/TTD (Catat Sesi) & tindak lanjut, hapus foto lama (permanen) vs perkecil foto (tanpa konfirmasi), dan “🧹 Bersihkan Cache (butuh internet setelahnya)”; plus baris “Penyimpanan Lokal” tidak lagi hilang diam-diam (G1-08) | v1.82.0 |
| 2026-10-01 | **Beranda & Pengaturan tidak lagi tampak kosong/menggantung**: kartu “Hari Ini” menampilkan rangka selama data belum siap (tidak lagi berkata “Tidak ada sesi hari ini” lebih awal) dan Pengaturan punya rangka + kotak “Pengaturan gagal dimuat” dengan tombol **“Coba lagi”** (batas tunggu 8 detik, G1-07) | v1.81.0 |
| 2026-10-01 | **Kegagalan tidak lagi tampil seperti keberhasilan**: toast sukses/gagal dipisah (Pengaturan & Beranda) + pesan gagal simpan sesi diterjemahkan ke bahasa manusia dengan tombol **“Coba lagi”** yang tahu aksi mana yang harus diulang (v1.80.0, G1-06) | v1.80.0 |
| 2026-10-01 | **Pengingat backup mingguan tidak lagi menutupi konten**: tingginya diukur (`--nag-h`, terukur 116 px) dan dihitung ke jarak bawah halaman (80 → 196 px) + tombol tutup 44 px (tahan 7 hari) + disembunyikan di layar Catat Sesi & saat ada modal (G1-05) | v1.80.0 |
| 2026-10-01 | **Kontras 13 titik terburuk dinaikkan ke ≥4,5:1** (mis. “Besok” 2,07:1 → 4,87:1, “Backup” 2,15:1 → 5,05:1); 14 baris kelas di 12 berkas, sisanya digantikan token pada fondasi visual (G1-04) | v1.79.3 |
| 2026-10-01 | **Banner “Pasang di layar utama” berhenti muncul terus**: penolakan disimpan di perangkat (90 hari; 365 hari setelah tombol Pasang dijalankan) + deteksi mode aplikasi terpasang (`display-mode` standalone/fullscreen, `navigator.standalone`). Sebelumnya penolakan hanya state React, sehingga banner kembali setiap reload — terutama di HP tanpa Google Play Services (Huawei/EMUI) yang tidak pernah menerima event `appinstalled` | v1.79.3 |

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
