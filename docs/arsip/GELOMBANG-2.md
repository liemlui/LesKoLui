# GELOMBANG-2 — Fondasi: token → uang → jadwal (G2-00 … G2-10)

> **Sekilas** · Jenis: **dokumen tugas (dapat dieksekusi)** · Diperbarui: 2026-10-03 · Status: **aktif**
> **Untuk siapa:** agen AI pelaksana (satu langkah per putaran, jangan improvisasi).
> **Prasyarat wajib dibaca lebih dulu:** [`ATURAN-AI.md`](../kerja/ATURAN-AI.md) → [`TASK-04-fondasi-visual.md`](../kerja/TASK-04-fondasi-visual.md) →
> [`TASK-08-satu-pintu-uang.md`](../kerja/TASK-08-satu-pintu-uang.md) → [`TASK-09-jadwal-hari-zoom.md`](../kerja/TASK-09-jadwal-hari-zoom.md).
> **Dependency gelombang:** **seluruh Gelombang 1 selesai** (khusus `G1-02` untuk angka & `G1-04` untuk kontras interim).
> **Isi:** **11 tugas** — **G2-00 ditambahkan 2026-10-03** (amandemen Smart Gating; dokumen saja, **sudah selesai**) dan **G2-10 ditambahkan 2026-10-01 dari Q18/G1-07**. **Tidak ada perubahan skema Dexie.** Urutan risiko terendah sudah dikunci `ATURAN-AI` §4: `04 → 08 → 09`.
> **Gate:** **Smart Gating** (`ATURAN-AI` §6.2) berlaku **mulai `G2-01`** — setiap tugas menulis `Tier: X — alasan: …` di checklist laporannya. Tier per tugas dicatat di §2; ragu tier → ambil tier lebih tinggi.
> **Estimasi total:** **3×L + 5×M + 2×S** ≈ 2 minggu (L = G2-01, G2-02, G2-04; M = G2-06…G2-10; S = G2-03, G2-05). *(G2-00 tidak masuk estimasi — dokumen saja, ±10 menit.)*
> **Revisi estimasi:** `TASK-04` menulis "6 langkah × 30–45 menit" untuk 471 kelas; dengan baseline **904** angka itu tidak realistis (lihat §1).

---

## 0. Cara pakai

Sama seperti [`GELOMBANG-1.md`](../kerja/GELOMBANG-1.md) §0: satu langkah per putaran, laporan 5 baris, dan
**jangan mengakali tes**.

**Gate tidak lagi sama untuk semua tugas — mulai `G2-01` berlaku SMART GATING**
([`ATURAN-AI.md`](../kerja/ATURAN-AI.md) §6.2). Tier ditentukan dari **blast radius** tugas **sebelum** mulai,
dan `Tier: X — alasan: …` wajib ditulis di checklist laporan. Ragu tier → ambil tier **lebih tinggi**.

| Tier | Kondisi ringkas | Gate |
|---|---|---|
| Tier 1 | <3 berkas **dan** tanpa infrastruktur | `npx tsc -b` · `npx eslint src` · tes terkait saja · spec Playwright terkait |
| Tier 2 | menyentuh `src/components/**`, `src/lib/**`, `src/db/**`, `src/hooks/**`, **atau** layar yang dipakai >3 layar lain | Tier 1 + `npm run test:sandbox` **PENUH** |
| Tier 3 | tugas **terakhir** gelombang, **atau** mengubah `package.json`/`scripts`/config | Tier 2 + `npx playwright test` **SEMUA** spec di `e2e/` |

Urutan gate lama (`npx tsc -b` → `npx eslint src` → `npm test` → `npm run build` → `npm run e2e`)
**tidak dibuang** — itu isi **Tier 3**, dan tetap dijalankan penuh di tugas terakhir gelombang (§3).
`npm run e2e:uiux` (hasil `G1-11`) tetap dijalankan pada tugas yang menyentuh metrik UI dan di checkpoint.
Rincian + aturan naik-tier di tengah jalan: [`ATURAN-AI.md`](../kerja/ATURAN-AI.md) §6.2.

### Larangan tambahan yang berlaku di gelombang ini

| ❌ | Kenapa |
|---|---|
| Menulis `bg-white`/`bg-gray-*`/`text-gray-*`/`border-gray-*` **baru** | kontrak K4.1 — wajib token |
| Menyentuh logika `src/lib/engagement.ts` | terlarang (`ATURAN-AI` §2.1). Perbaikan kontras label skor **hanya** lewat pemanggil/token |
| Menyentuh `src/lib/finance*.ts`, `paymentRepo.ts`, `csv.ts` | terlarang di `TASK-05` §7 |
| Menambah `@media (prefers-color-scheme: dark)` | **light-only permanen** (Q4) |
| Menambah aturan `@media … .input { font-size: 16px }` | **dicabut** (Q7) |
| Mengubah jumlah pintu nav | hanya `TASK-05` Langkah 7 (`ATURAN-AI` §2.3) |

---

## 1. Graf dependency

```
G2-00 (amandemen Smart Gating — dokumen saja, tanpa kode)     ← SELESAI 2026-10-03
G2-01 (TASK-04 L1–L3: token + 7 primitif + skala tipografi)   ← ✅ SELESAI v1.86.0 (kode)
  ├─ G2-02 (TASK-04 L4–L5: sapu 904 → ≤190 + guard kontras)
  ├─ G2-03 (TASK-04 L6 dicabut → light-only; verifikasi + komentar CSS)
  ├─ G2-04 (TASK-08 satu pintu uang)  ← juga butuh G1-04
  │    └─ G2-08 (Beranda non-uang: legenda/aria/label/inbox)
  ├─ G2-05 (verifikasi input Android — tanpa perubahan kode)
  ├─ G2-06 (tap target ≥44px memakai primitif baru)
  ├─ G2-07 (TASK-09 DayView: kerapatan 27/54/97)
  └─ G2-09 (emoji → ikon SVG)
```

**Urutan paling aman:** `G2-01 → G2-02 → G2-03 → G2-04 → G2-05 → G2-06 → G2-07 → G2-08 → G2-09`.
`G2-02` sengaja tepat setelah `G2-01` (sweep butuh token selesai), dan `G2-04` sebelum `G2-08`
(Beranda non-uang butuh masking sudah ada).

> **Revisi estimasi (jujur, bukan kontradiksi):** `TASK-04` menulis "6 langkah × 30–45 menit" untuk **471**
> kelas. Dengan baseline terkoreksi **904**, `G2-01`+`G2-02` realistis **L + L (≈3–5 hari)**, bukan 3 jam.
> Estimasi di dokumen ini menggantikan angka itu; `TASK-04` §0 diperbarui saat `G2-02` selesai.

---

## 2. Daftar tugas

### G2-00 — Amandemen Smart Gating (prasyarat Gelombang 2)

| Field | Isi |
|---|---|
| ID | G2-00 |
| Judul | Tulis aturan **Smart Gating** 3 tier (`ATURAN-AI` §6.2) + daftarkan tier per tugas gelombang |
| Berkas disentuh | `docs/kerja/ATURAN-AI.md` · `docs/kerja/GELOMBANG-2.md` · `docs/README.md` — **dokumen saja** |
| Dependency | Gelombang 1 selesai (v1.85.0) |
| Latar | Gate penuh di **setiap** tugas Gelombang 1 menghabiskan **±2 menit/tugas** (tsc + lint + 691 tes + build + `md-links` + Playwright) — **±20 menit/gelombang** — untuk tugas yang mayoritas hanya menyentuh 1–2 berkas. Dengan 20 tugas tersisa (`G2-01…G2-10`, `G3-01…G3-10`) itu **±40 menit** tes berulang |
| Langkah acuan | — (tugas prosedural) |
| Estimasi | **S** (±10 menit) |
| Keputusan pemilik | **Q23, Q24, Q25 sudah dikunci** — tugas ini **tidak** membukanya lagi |
| Amandemen terkait | **§6.2 baru** di `ATURAN-AI` (amandemen ini sendiri) |
| Catatan | **Tidak ada** perubahan kode, script, config, atau versi. Bukan rilis user-facing → **tidak ada** entri di `src/lib/version.ts` dan **tidak ada** baris di `docs/README.md` §5 |

**Latar singkat.** Smart Gating menggantikan "satu gate untuk semua tugas" dengan **3 tier menurut
blast radius**, supaya tugas yang jelas tidak bisa mematahkan apa pun tidak membayar 2 menit gate.
Tier tertinggi (Tier 3) **tetap** dijalankan penuh di tugas terakhir tiap gelombang sebagai jaring
akhir — jadi yang dihemat bukan cakupan akhir, melainkan tes berulang di tugas-tugas kecil.

**Langkah (berurutan):**
1. Tambah **§6.2 Smart Gating** di [`ATURAN-AI.md`](../kerja/ATURAN-AI.md) (setelah §6.1 sandbox; §6.1 tidak diubah):
   tabel 3 tier + 7 aturan tambahan (ragu → tier lebih tinggi · wajib `Tier: X — alasan: …` · boleh naik
   tier + tandai "BARU" · full suite tetap di tugas terakhir · `e2e:uiux` tidak berubah · dokumen-saja =
   Tier 1 termurah · tidak berlaku surut).
2. Daftarkan **G2-00** di dokumen ini (header, §0, §1 graf, entri ini) dan tegaskan
   **Smart Gating berlaku mulai `G2-01`**.
3. Tambah **satu baris** di [`../README.md`](../README.md) §4.1. §5 dan `versi_app` **tidak** disentuh.
4. Gate: `node scripts/check-md-links.mjs` → **rusak = 0** (Tier 1 dokumen-saja; tanpa tsc/lint/test/build/Playwright).
5. Catat hasilnya di blok **Hasil** di bawah ini.

**DoD terverifikasi:**
- [ ] `ATURAN-AI` §6.2 memuat tabel 3 tier **dan** 7 aturan tambahan; §6.1 tidak berubah satu baris pun.
- [ ] `GELOMBANG-2` menyebut G2-00 di header, §0, §1, dan §2; **"Smart Gating berlaku mulai G2-01"** tertulis eksplisit.
- [ ] `docs/README.md` §4.1 punya baris G2-00; **tidak ada** baris baru di §5; `versi_app` tidak diubah.
- [ ] `node scripts/check-md-links.mjs` → **rusak = 0**.
- [ ] `git diff --name-only` = **hanya** 3 berkas dokumentasi (nol berkas `src/**`, nol config, nol `package.json`).
- [ ] Tidak ada berkas di `ATURAN-AI` §2.1 yang tersentuh.

**Catatan penting untuk `G2-01`…`G2-10`:** tentukan tier **sebelum** mulai dan tulis
`Tier: X — alasan: …` di checklist laporan. Contoh cepat untuk gelombang ini: `G2-07` (hanya
`DayView.tsx`) = **Tier 1**; `G2-01`/`G2-02` (`src/index.css` + `src/components/**`) = **Tier 3**
karena mengubah token/primitif yang dipakai hampir semua layar; `G2-10` (tugas terakhir gelombang) = **Tier 3**.
Ini **contoh**, bukan keputusan — tier ditetapkan ulang saat tugas itu dikerjakan.

**Hasil (2026-10-03):**
- **`ATURAN-AI` §6.2 Smart Gating** tertulis: tabel 3 tier + 7 aturan tambahan. Diff berkas itu = **hanya penambahan**
  (42 baris, **0 penghapusan**) → **§6.1 tidak berubah**.
- **G2-00 terdaftar** di dokumen ini: header (`G2-00 … G2-10`, **11 tugas**), §0 (gate per tier), §1 (graf dependency),
  §2 (entri ini). **"Smart Gating berlaku mulai `G2-01`"** tertulis eksplisit di header, §0, dan §2.
- **`docs/README.md` §4.1** dapat baris **#10** (Smart Gating / G2-00 ✅). **§5 tidak disentuh**; `versi_app` **tidak diubah**.
- **Gate (Tier 1 dokumen-saja):** `node scripts/check-md-links.mjs` → 50 berkas · **188 tautan** · **rusak 0**
  (sebelum: 50 berkas · 180 tautan · 0 rusak). tsc/lint/`test:sandbox`/build/Playwright **tidak dijalankan** —
  tidak ada kode yang berubah (aturan §6.2 butir 6).
- **Berkas disentuh: 3** — semuanya `docs/**`. `git diff --name-only` bersih dari `src/**`, config, dan `package.json`.
  **Tanpa version bump**, **tanpa** entri `CHANGELOG` di `src/lib/version.ts`.
- **Dua ketidaksesuaian metadata lama ditemukan dan sengaja TIDAK diubah** (di luar lingkup tugas ini, dilaporkan ke
  pemilik sebagai **Q26 & Q27**): `docs/README.md` blok YAML masih `versi_app: v1.84.0` / `test: 678 lulus / 56 berkas`
  (tertinggal dari G1-11), dan `ATURAN-AI` §9 belum punya baris riwayat untuk amandemen ini.

**Status:** G2-00 **selesai**. **`G2-01` boleh dimulai.**

---

### G2-01 — TASK-04 L1–L3: token, 7 primitif, skala tipografi

| Field | Isi |
|---|---|
| ID | G2-01 |
| Judul | Fondasi visual: token warna/tipografi/spacing/elevasi/gerak + 7 primitif |
| Berkas disentuh | `src/index.css` · `src/components/ui/*` (baru: `Card`, `SectionHeader`, `ListRow`, `ActionBar`, `StatTile`, `Sheet`, `EmptyState`) |
| Dependency | Gelombang 1 |
| Latar | **L-01** (46 pasangan gagal), **L-12** (teks 9–11px), **K-11** (3 sistem kartu) |
| Langkah acuan | `TASK-04` §3 Langkah 1–3 |
| Estimasi | L |
| Keputusan pemilik | — |
| Amandemen terkait | A7 (larangan `engagement.ts`), A8 (angka) |
| Catatan | Tambahkan token **semantik** untuk kontras: `--ink-danger`, `--ink-warn`, `--ink-success`, `--ink-muted` beserta pasangan latarnya — inilah yang dipakai `G2-02` untuk menggantikan kelas interim `G1-04` |

**Langkah (berurutan):**
1. Tambah token di `@theme`/`:root`: skala tipografi 4 langkah (24/18/15/13), spacing `--space-1..6`,
   elevasi `--e-flat`/`--e-float`, gerak `--motion-enter 200ms`/`--motion-sheet 250ms`.
2. Tambah token warna semantik + dokumentasikan pasangan resminya (mana teks, mana latar) di komentar blok.
3. Buat 7 primitif di `src/components/ui/` sesuai `TASK-04` §3; tiap primitif memakai token (0 kelas `gray-*`).
4. Pakai primitif di **minimal 3 layar** (mis. `Card` di Beranda, `ListRow` di Murid, `Sheet` di satu modal).
5. Verifikasi kontras: 13 pasangan `G1-04` harus lulus memakai token baru (ukur dengan skrip kontras).

**DoD terverifikasi (G2-01 selesai — v1.86.0, 2026-10-03):**
- [x] `@theme` memuat 4 langkah tipografi + spacing + 2 elevasi + 2 pola gerak. — **CATATAN:** blok-nya harus `@theme static`; tanpa `static` Tailwind v4 tidak mencetak variabel tema yang belum dipakai utility, dan **seluruh `--bg-*` hilang** dari `dist/assets/*.css` (terukur).
- [x] `src/components/ui/` berisi 7 berkas; `grep` menunjukkan primitif dipakai di ≥3 layar. — 7 berkas; dipakai di **3 berkas layar** (`PengeluaranTab`, `StudyNoteCard`, `UpcomingSchedule`) dan lewat `ConfirmSheet` → `ui/Sheet` menjangkau **4 layar utama lagi** (`Payments`/Keuangan, `CaptureSession`, `MonthlyReport`, `Settings`). Ketujuh primitif punya ≥1 pemakaian nyata.
- [x] 13 pasangan kontras lulus (≥4,5:1 untuk teks <18,66px) — tabel pasangan ditulis di §4.
- [x] Tidak ada kelas warna langsung di berkas primitif. — `Select-String -Path "src\components\ui\*.tsx" -Pattern "bg-white|gray-"` → **kosong**.

**Hasil (2026-10-03 · v1.86.0 · Tier 3):**
- **Token** di `src/index.css`: tipografi 13/15/18/24 px · `--space-1..6` · `--e-flat`/`--e-float` · `--motion-enter`(200ms)/`--motion-sheet`(250ms) · warna semantik `--ink-danger/warn/success/muted` + `--bg-danger/warn/success/muted` + `--bg-*-strong` + `--color-scrim` (tirai sheet, supaya primitif benar-benar nol kelas warna).
- **Pemilihan nilai warna berbasis bukti**, bukan hafalan: `.design-audit/g2-01-contrast.mjs` memeriksa **41 pasangan → 0 gagal**. Dua langkah yang dipakai teks (amber-700 **4,49:1**, green-700 **4,40:1**) **GAGAL tipis** di atas `--surface-soft` (#eef2f7), jadi warn/success dinaikkan ke langkah **-800** (warn 6,34:1 · success 6,31:1 · danger−red-700 5,71:1 · muted 6,74:1).
- **Q25 DIKERJAKAN**: `button, input, select, textarea { font: inherit }` pindah dari luar layer ke `@layer base`, sehingga `@layer utilities` Tailwind v4 menang. Ini satu-satunya **perubahan perilaku** rilis ini (ukuran/ketebalan huruf kontrol form).
- **7 primitif**: `Card` · `SectionHeader` · `ListRow` · `ActionBar` · `StatTile` · `Sheet` · `EmptyState` — semuanya berbasis token, tanpa kelas warna langsung.
- **Penghitung kelas warna: 907 → 889.** Angka 904 di dokumen adalah pengukuran 2026-10-01; saat G2-01 dimulai penghitung rekursif berbunyi **907**. Sapu sampai **≤190** tetap milik **G2-02** (lihat §4 penyimpangan #1).
- **`test.fixme` tetap 3** (16 residu kontras) + **1** (2 residu tap target) — tidak satu pun tertutup oleh G2-01, karena perbaikannya ada di lapisan kelas warna layar (**G2-02**) dan ukuran kontrol (**G2-06**). Sesuai Q24, `test.fixme` **tidak** dihapus sebelum tugas terkait selesai.

---

### G2-02 — TASK-04 L4–L5: sapu kelas hardcode 904 → ≤190 + perluas guard kontras

| Field | Isi |
|---|---|
| ID | G2-02 |
| Judul | Migrasi kelas warna ke token + guard kontras yang benar-benar menguji |
| Berkas disentuh | `src/**/*.tsx` (kecuali berkas terlarang) · `src/__tests__/engagementContrast.test.ts` |
| Dependency | G2-01, G1-02 |
| Latar | **N-1** (baseline 904), **N-7** (kontradiksi `TASK-04:284-285`), **L-01** |
| Langkah acuan | `TASK-04` §3 Langkah 4–5 + §4 pola ganti warna |
| Estimasi | L |
| Keputusan pemilik | — |
| Amandemen terkait | A7, A8 |
| Catatan | Perbaiki **per berkas**: ganti → verifikasi → catat angka. Jangan sapu seluruh repo dalam satu putaran |

**Langkah (berurutan):**
1. Urutkan berkas berdasarkan jumlah kelas warna terbanyak; kerjakan 1 berkas per putaran.
2. Terapkan pola `TASK-04` §4 (`bg-white`→`bg-[var(--surface-strong)]`, dst.).
3. Setelah tiap berkas: jalankan penghitung rekursif & catat penurunannya.
4. Perluas `engagementContrast.test.ts`: uji **semua** pasangan token semantik di atas `--surface`,
   `--surface-strong`, dan **putih** (gap yang ditemukan di L-01h).
5. Berhenti saat penghitung **≤190**; tulis angka akhir di `TASK-04` §9.

**DoD terverifikasi:**
- [ ] Penghitung rekursif **≤190** (dari 904) — catat sebelum→sesudah per berkas.
- [ ] `npm test` hijau; `engagementContrast` diperluas & lulus.
- [ ] `grep "prefers-color-scheme"` di `src/` = 0.
- [ ] Tidak ada berkas terlarang yang tersentuh (`git diff --name-only` diperiksa).

---

### G2-03 — TASK-04 L6 dicabut: kunci light-only permanen

| Field | Isi |
|---|---|
| ID | G2-03 |
| Judul | Tegaskan light-only permanen & pastikan tidak ada sisa jalur dark mode |
| Berkas disentuh | `src/index.css` (komentar) · verifikasi `playwright.config.ts`, `docs/**` |
| Dependency | G2-01 |
| Latar | **L-13** (29/37 screenshot identik → mode gelap tak bermakna) |
| Estimasi | S |
| Keputusan pemilik | **Q4** (opsi A: cabut L6) |
| Amandemen terkait | **A3**, **A3b** |
| Catatan | Penghapusan project `mobile-dark` & penyelarasan dokumen **sudah dikerjakan di G1-01**; tugas ini mengunci sisanya + membuktikan |

**Langkah (berurutan):**
1. `src/index.css:48-51` — ganti komentar `Dark mode DEAKTIVASI` menjadi catatan permanen:
   "Light-only permanen — keputusan pemilik 2026-10-01 (Q4). Jangan menambahkan `@media (prefers-color-scheme: dark)`."
2. Verifikasi: `grep -rn "prefers-color-scheme" src/` = 0 (selain komentar ini yang menyebutnya sebagai larangan).
3. Verifikasi: `playwright.config.ts` hanya memuat `chromium` + `mobile`; `docs/03-PLAYBOOK` §3.1 & §5.1 dan
   `docs/README` §4.1 sudah selaras.
4. Jalankan `npm run e2e` (2 project) → hijau, durasi lebih pendek dari sebelumnya.

**DoD terverifikasi:**
- [ ] Komentar permanen tertulis di `index.css`; tidak ada `@media (prefers-color-scheme: dark)` fungsional.
- [ ] `playwright test --list` melaporkan **2** project.
- [ ] `npm run e2e` hijau.

---

### G2-04 — TASK-08: satu pintu uang (`useMoneyVisible` + `MaskedMoney`)

| Field | Isi |
|---|---|
| ID | G2-04 |
| Judul | Tutup 5 kebocoran uang & hapus akses uang dari Beranda |
| Berkas disentuh | `src/hooks/useMoneyVisible.ts` (baru) · `src/components/MaskedMoney.tsx` (baru) · `src/screens/Students.tsx` · `src/screens/StudentDetail.tsx` · `src/screens/studentDetail/SessionDetailModal.tsx` · `src/screens/MonthlyReport.tsx` · `src/screens/home/Home.tsx` |
| Dependency | G2-01, G1-04 |
| Latar | `arsitektur/11` §5 (6 titik), keputusan pemilik **#5** (Beranda hanya jadwal) |
| Langkah acuan | `TASK-08` (semua langkah) |
| Estimasi | L |
| Keputusan pemilik | **#5** + kontrak K3/B1/B2 |
| Amandemen terkait | — |
| Catatan | Titik #2 (`OperationalSnapshot`) **sudah bersih** (grep `formatRupiah`/`Rp` di `src/screens/home` = nihil) — catat sebagai "sudah tertutup", jangan kerjakan ulang. `QuickExpenseModal` **tetap ada** (dipakai `PengeluaranTab`) |

**Langkah (berurutan):**
1. Buat `useMoneyVisible()` (satu state, sekali buka berlaku selama app terbuka — B2) + `MaskedMoney`
   (bentuk `Rp ••••••` + 🔒, bisa diklik untuk membuka).
2. Bungkus 4 titik yang masih bocor: `Students.tsx` (~:558), `StudentDetail.tsx` (~:564),
   `SessionDetailModal.tsx` (~:437,461), `MonthlyReport.tsx` (~:1078,1403).
3. `Home.tsx:141-144` — **hapus** tombol "💸 Pengeluaran"; hapus juga `showExpenseModal` + mount
   `QuickExpenseModal` (`:24,40,240-245`). Tambahkan blok **"Perlu keputusan"** tanpa nominal
   (mis. "3 tagihan perlu ditindak") + CTA `Lihat di Uang ▸` bila `TASK-08` mensyaratkannya.
4. Jalankan perintah verifikasi K3 (`arsitektur/11` §6) → **0** kebocoran.
5. Uji: buka uang sekali di `/payments` → kembali ke Murid → nominal **tidak** tertutup lagi (B2).

**DoD terverifikasi:**
- [ ] Perintah K3 = 0 baris (tanpa `useMoneyVisible`/`// money-safe`).
- [ ] Beranda tidak punya baris uang & tidak punya tombol pengeluaran; `QuickExpenseModal` masih diimpor `PengeluaranTab`.
- [ ] Tes `moneyGate` (bila dibuat di `TASK-08`) hijau; `npm test` hijau.
- [ ] Manual: nomor uang di 5 layar tertutup dengan 🔒 dan bisa dibuka.

---

### G2-05 — Verifikasi input di Android (tanpa perubahan kode)

| Field | Isi |
|---|---|
| ID | G2-05 |
| Judul | Pastikan input 14px nyaman di Chrome Android (bukan tugas iOS) |
| Berkas disentuh | **tidak ada** (kecuali hasil temuan → angkat **Q12**) |
| Dependency | G2-01 |
| Latar | **L-04** — **DICABUT** oleh keputusan Q7 |
| Estimasi | S |
| Keputusan pemilik | **Q7** (fokus Android) |
| Amandemen terkait | **A6 dicabut** |
| Catatan | **Jangan** menambahkan aturan 16px. Bila muncul zoom/geser di Android, **jangan** improvisasi — tulis **Q12** di §4 |

**Langkah (berurutan):**
1. Di Chrome Android (versi dicatat), buka 4 form utama: `StudentForm` (tambah/edit murid), catatan sesi
   (langkah 5 wizard), nominal tagihan (`InvoiceRow`), pengeluaran (`QuickExpenseModal`).
2. Fokuskan tiap input dengan keyboard default; perhatikan: zoom otomatis, lompatan viewport, task bar
   tertutup, kursor tersembunyi.
3. Catat hasil per form: **OK** atau **bermasalah (jelaskan)**.
4. Bila semua OK: tutup tugas **tanpa perubahan kode**; tulis hasilnya di §4 gelombang ini.
5. Bila bermasalah: tulis **Q12** (gejala, form, versi Chrome, usulan) dan **berhenti** — jangan ubah CSS.

**DoD terverifikasi:**
- [ ] Catatan uji: perangkat/versi Chrome, 4 form, hasil per form.
- [ ] `grep "font-size: 16px"` di `src/` = 0 (tidak ada aturan yang ditambahkan).
- [ ] Bila bermasalah → Q12 tertulis & tugas diblokir (bukan diselesaikan diam-diam).

---

### G2-06 — Tap target ≥44px (memakai primitif baru)

| Field | Isi |
|---|---|
| ID | G2-06 |
| Judul | Kontrol utama ≥44×44, tidak ada kontrol <24px |
| Berkas disentuh | `src/screens/home/WeekView.tsx` · `src/screens/payments/RekapTab.tsx` · `src/screens/payments/TagihanTab.tsx` · `src/screens/Settings.tsx` · `src/components/Toggle.tsx` · `src/screens/Students.tsx` · `src/screens/studentDetail/RiwayatSesi.tsx` · `src/screens/MonthlyReport.tsx` · `src/screens/CaptureSession.tsx` |
| Dependency | G2-01 |
| Latar | **L-03**, **M-04** (aksi destruktif bersebelahan) |
| Estimasi | M |
| Keputusan pemilik | — |
| Amandemen terkait | — |
| Catatan | Pakai teknik termurah: `py-2.5 px-3` untuk tombol teks, `h-11 w-11` untuk tombol ikon, atau
`after:absolute after:-inset-2` agar tampilan tetap kecil. **Khusus aksi destruktif**: pisahkan dari aksi aman |

**Langkah (berurutan):**
1. Ukur baseline dengan `npm run e2e:uiux` (`G1-11`) → catat jumlah kontrol <24px & <44px.
2. Perbaiki kelompok tombol ikon kecil (‹ › tahun, "?", `👁`, ✕) → `h-11 w-11` atau pseudo-element.
3. Perbaiki chip/tombol teks ("Catat"/"Atur", "Tambah [+]), `Toggle` (26px → ≥32px dengan area sentuh 44px).
4. `Students.tsx:332-357` — pisahkan "Hapus" dari "Nonaktifkan" (menu `⋯` atau baris sendiri) + naikkan ukuran.
5. Ukur ulang; target 0 kontrol <24px.

**DoD terverifikasi:**
- [ ] `npm run e2e:uiux` melaporkan **0** kontrol <24px.
- [ ] Kontrol utama (tombol aksi per baris/kartu) ≥44px pada audit runtime.
- [ ] "Hapus" tidak lagi bertetangga langsung dengan "Nonaktifkan".
- [ ] `npm run e2e` hijau (locator yang menyentuh label tidak berubah).

---

### G2-07 — TASK-09: kerapatan DayView (27/54/97) + mode tangkapan

| Field | Isi |
|---|---|
| ID | G2-07 |
| Judul | Jadwal hari bisa dirapatkan sehingga 1 sesi tidak perlu 2 layar gulir |
| Berkas disentuh | `src/screens/home/DayView.tsx` **saja** |
| Dependency | G2-01 |
| Latar | **B-07** (grid 07:00–22:00 = 960px tetap) |
| Langkah acuan | `TASK-09` (semua langkah) |
| Estimasi | M |
| Keputusan pemilik | — |
| Amandemen terkait | — |
| Catatan | `TASK-09` §"Larangan" melarang menyentuh `MonthView`/`WeekView`, struktur `Home.tsx`, `src/db/**`, dan pustaka tangkap gambar baru. **Patuhi** |

**Langkah (berurutan):**
1. Ikuti `TASK-09` Langkah 1–N: 3 kerapatan (27/54/97 px per jam), tombol pengubah kerapatan, tinggi blok
   minimum 22px, garis "sekarang" tetap benar.
2. Mode tangkapan: pastikan seluruh rentang hari muat dalam satu tangkapan layar saat kerapatan rapat.
3. Uji dengan hari berisi 1 sesi (harus ≤450px tinggi grid) dan hari padat 6 sesi (blok tidak bertumpuk).

**DoD terverifikasi:**
- [ ] Hari biasa dengan kerapatan rapat ≤450px; tidak ada blok bertumpuk pada hari padat.
- [ ] `TASK-09` §"Verifikasi" hijau; `npm run e2e` hijau.
- [ ] Tidak ada berkas di luar `DayView.tsx` yang berubah.

---

### G2-08 — Beranda non-uang: legenda, aria, label, persistensi

| Field | Isi |
|---|---|
| ID | G2-08 |
| Judul | Kalender & kotak perhatian dapat dipahami & tidak menyebut nama tombol |
| Berkas disentuh | `src/screens/home/MonthView.tsx` · `WeekView.tsx` · `DayDetail.tsx` · `SessionPill.tsx` · `AttentionInbox.tsx` |
| Dependency | G2-04 |
| Latar | **B-02, B-03, B-04, B-05, B-06, B-08, B-09, B-10, B-11, B-13** |
| Estimasi | M |
| Keputusan pemilik | **Q6** ✅ (ringkasan operasional **digabung** ke header "Hari Ini") |
| Amandemen terkait | — |
| Catatan | B-04/B-05 memakai keputusan Q6 = A: **satu blok "Hari Ini"**, bukan blok terpisah. `OperationalSnapshot.tsx` kini boleh disentuh — tetapi **hanya** untuk penggabungan ini, jangan merombak blok lain |

**Langkah (berurutan):**
1. `MonthView.tsx` — tambah legenda 1 baris ("Warna tanggal: rata-rata skor sesi — ≥7 hijau · 4–6 kuning · <4 merah")
   + `aria-label` pada tombol sel (`dayLabel(d), N sesi`); naikkan `min-h-[64px]` → `min-h-[76px]`, chip 11px,
   maks 2 sesi + "+N", `title` nama lengkap.
2. `WeekView.tsx` — penanda hari terpilih: `ring-2 ring-inset ring-indigo-400`; tombol "+" per kolom `min-h-[36px] w-full`
   + `aria-label` bertanggal.
3. `DayDetail.tsx:26` — hilangkan copy coupling: `description="Tambahkan sesi untuk tanggal ini."` (jangan menyebut
   nama tombol "+ Jadwal"); beri garis atas 2px pada header.
4. `SessionPill.tsx:60-63` — hapus emoji pensil dari tombol Catat → teks "Catat Sesi"; tombol edit diberi label "Ubah".
5. `AttentionInbox.tsx` — simpan status `collapsed` di `localStorage`; tombol selesai → "Selesai ✓" +
   `aria-label` + `min-h-[44px]`.
6. **B-02** `home/AddScheduleModal.tsx:118-129,136` — peringatan bentrok jangan murni informatif:
   tombol simpan berbunyi **"Tetap simpan (N bentrok)"** (gaya sekunder/oranye) + baris mikro "Bentrok dengan
   N sesi lain pada jam ini."; selaraskan istilah scope dengan `EditSessionModal.tsx:130-133`.
   (Label "Batalkan jadwal — pilih scope:" yang disebut audit ada di `EditSessionModal`, **bukan** di modal ini.)
7. **B-04** *(Q6 = A)* — hierarki aksi Beranda: `+ Jadwal` menjadi tombol **solid** di blok "Hari Ini";
   aksi uang sudah hilang lewat `G2-04`, jadi tinggal memastikan aksi utama tidak bersaing dengan
   `+ Catat sesi` di nav (K1.1).
8. **B-05** *(Q6 = A)* — **gabungkan** ringkasan operasional ke header "Hari Ini" (`TASK-03:53`):
   hapus `h2` + paragraf "Operasional hari ini", sembunyikan sparkline bila 0 titik (jangan garis rata di dasar),
   hilangkan label "Hari Ini" yang muncul dua kali. Hasil: **satu** blok, selalu terlihat.
9. Uji: buka Beranda → tutup inbox → reload → tetap tertutup.

**DoD terverifikasi:**
- [ ] Legenda warna tampil; setiap sel tanggal punya `aria-label` berisi jumlah sesi.
- [ ] Tidak ada teks yang menyebut nama tombol; inbox tetap tertutup setelah reload.
- [ ] Modal jadwal menyebut jumlah bentrok di tombol simpan.
- [ ] Beranda menampilkan **satu** blok "Hari Ini" (ringkasan operasional tergabung); tidak ada sparkline kosong.
- [ ] `npm test` + `npm run e2e` hijau.

---

### G2-09 — Emoji → ikon SVG pada kontrol fungsional

| Field | Isi |
|---|---|
| ID | G2-09 |
| Judul | Ganti emoji di tombol/heading dengan ikon SVG konsisten |
| Berkas disentuh | `src/components/icons.tsx` · layar pemakai (Beranda, Catat Sesi, Laporan, Pengaturan, Murid) |
| Dependency | G2-01 |
| Latar | **L-05** (backlog lama playbook §5.3.3 belum tuntas) |
| Estimasi | M |
| Keputusan pemilik | — |
| Amandemen terkait | — |
| Catatan | Emoji **dekoratif** (label grafik, teks banner, toast) **tetap**. Hanya tombol & heading fungsional |

**Langkah (berurutan):**
1. Tambah ikon SVG di `components/icons.tsx` mengikuti pola `IconBase` (pencil, camera, clipboard, checklist,
   money, chart, bell, trash, sparkle, lock, download).
2. Ganti satu per satu di: stepper `CaptureSession`, tombol "💸/📝/🎨/🖨️/🗑️/🔐" di layar lain.
3. Beri `aria-hidden="true"` pada ikon dekoratif di dalam tombol berlabel.
4. Verifikasi dengan `npm run e2e:uiux` (spec menghitung emoji di kontrol).

**DoD terverifikasi:**
- [ ] `npm run e2e:uiux` melaporkan 0 emoji pada `<button>`/`heading`.
- [ ] Ikon tampil konsisten di Android (bukan kotak "tofu").
- [ ] `npm test` + `npm run e2e` hijau.

---

### G2-10 — Jalur galat tunggal untuk `useLiveQuery` (diangkat dari Q18, G1-07)

| Field | Isi |
|---|---|
| ID | G2-10 |
| Judul | Satu cara menangani "gagal baca" untuk semua layar yang memakai `useLiveQuery` |
| Berkas disentuh | (belum ditentukan) `src/lib/appData.ts` atau `src/db/repos/*` · 6 layar pemakai `getSettings()`: `Students.tsx` · `StudentDetail.tsx` · `Payments.tsx` · `MonthlyReport.tsx` · `CaptureSession.tsx` · `components/StudentForm.tsx` · `Settings.tsx` |
| Dependency | G2-01 (token) — **tidak** bergantung pada gelombang lain |
| Latar | **Q18a–Q18c** (diangkat saat G1-07). `useLiveQuery` tidak meneruskan galat di hook: `getSettings()` yang menolak membuat nilainya tetap `undefined`, jadi "gagal baca" tidak bisa dibedakan dari "masih memuat" tanpa alat tambahan |
| Estimasi | M |
| Keputusan pemilik | **2026-10-01: dicatat, tidak dikerjakan sekarang** (diterima sebagai tugas G2) |
| Amandemen terkait | — |
| Catatan | Di G1-07 masalah ini **hanya** diatasi di layar Pengaturan: probe `db.settings.get("app")` + watchdog `SETTINGS_LOAD_TIMEOUT_MS` (8 dtk) + `role="alert"` "Pengaturan gagal dimuat" + tombol "Coba lagi". Lima layar lain **masih** bisa menggantung tanpa jalan keluar |

**Kenapa butuh tugas tersendiri:** pilihan yang tersedia semuanya menyentuh banyak berkas sekaligus —
(a) `getSettings()` melempar saat gagal (mengubah kontrak repo untuk 6 pemanggil),
(b) `useLiveQuery(fn, deps, { catch })` → perlu jalur galat per layar,
(c) hook bersama `useSettingsQuery()` yang mengembalikan `{ data, error, retry }`.
Ketiganya **bukan** perubahan satu baris, dan di G1-07 tidak dikerjakan agar tidak mencampur
"perbaikan tampilan memuat" dengan "perubahan kontrak data".

**Langkah (kasar — dirinci saat dikerjakan):**
1. Putuskan satu bentuk kontrak (usul: hook `useSettingsQuery()` mengembalikan `{ settings, error, retry }`).
2. Terapkan di `Settings.tsx` lebih dulu (menggantikan probe + watchdog G1-07) supaya perilakunya tetap terjaga.
3. Pindahkan 6 pemakai satu per satu; setiap layar mendapat keadaan gagal yang sama bentuknya
   (`role="alert"` + tombol "Coba lagi") — samakan dengan pola G1-07.
4. Tambah **satu** spec E2E yang memaksa kegagalan IndexedDB dan memeriksa tiap layar (pola `e2e/loading-states.spec.ts`).

**DoD terverifikasi:**
- [ ] Tidak ada lagi layar yang bisa menggantung tanpa jalan keluar saat penyimpanan gagal/diam.
- [ ] `Settings.tsx` tidak lagi memakai probe/timer lokal (dipindahkan ke hook).
- [ ] `npm test` + `npm run e2e` hijau; layar lain tidak berubah perilaku saat penyimpanan sehat.

---

## 3. Checkpoint akhir Gelombang 2

**Otomatis:** `npx tsc -b` → `npx eslint src` → `npm test` → `npm run build` → `npm run e2e` (2 project) →
`npm run e2e:uiux` → penghitung kelas warna **≤190** → perintah K3 (`arsitektur/11` §6) = **0**.

**Manual (Android 412×839):**
1. Semua input nyaman, tanpa zoom/geser (hasil `G2-05`).
2. Beranda **tidak** punya baris uang; blok "Perlu keputusan" tetap ada; nomor uang di 5 layar lain tertutup 🔒 dan bisa dibuka.
3. `DayView` kerapatan rapat untuk hari 1 sesi.
4. Tap target kontrol utama ≥44px (ukur dengan inspeksi).
5. Kalender: legenda tampil & sel tanggal diumumkan pembaca layar.

---

## 4. Riwayat & catatan penyimpangan

| Tanggal | Tugas | Yang terjadi | Keputusan |
|---|---|---|---|
| 2026-10-03 | **G2-01** | **Brief/checklist menyuruh "sapu 904 kelas warna" di tugas ini**, padahal `GELOMBANG-2` §2 menaruh sapu kelas (target **≤190**) di **G2-02**, dan langkah G2-01 sendiri (5 langkah) tidak memuat sapu | **Ikuti DoD** (klausul pengaman brief). Sapu **tidak** dikerjakan di G2-01. Penghitung dicatat sebagai bukti: **907 → 889** |
| 2026-10-03 | **G2-01** | **Baseline penghitung ≠ 904.** Diukur ulang 2026-10-03 (awal G2-01): **907**. Angka **904** adalah pengukuran 2026-10-01 (sebelum G1-05…G1-11) | Dipakai **907** sebagai titik awal. **G2-02 wajib mengukur ulang** sebelum menyapu; jangan memakai 904 sebagai pembanding |
| 2026-10-03 | **G2-01** | **Brief menyebut "13 pasangan kontras G1-04"** — G1-04 sebenarnya **14 baris kelas** dalam **13 titik** (baris #10 memuat dua warna) | Diuji **14 baris** (bagian C skrip), bukan 13 |
| 2026-10-03 | **G2-01** | **`TASK-04` §4 memetakan `text-gray-400` → `var(--text-soft)`**, tetapi **`--text-soft` tidak ada** di `src/index.css` (hanya `--text` dan `--text-muted`) | **Tidak** ditambahkan di G2-01 (di luar daftar token DoD). **G2-02 akan menabraknya** → dicatat sebagai Q31 di laporan |
| 2026-10-03 | **G2-01** | **`@theme` biasa membuat `--bg-*` hilang** dari CSS hasil build (Tailwind v4 memangkas variabel tema yang belum dipakai utility) | Blok diubah ke **`@theme static`**; diberi komentar "jangan dihapus". Diverifikasi ulang dengan `grep` pada `dist/assets/*.css` |
| 2026-10-03 | **G2-01** | **A15 & §6.3 (Line Endings) ternyata sudah ditulis pihak lain** (tugas **G2-00b**) di tengah pengerjaan G2-01, sekaligus memperbaiki metadata `docs/README.md` (Q26) | **Q26/Q27 dianggap SELESAI oleh G2-00b** — tidak dikerjakan ulang. G2-01 hanya menaikkan `versi_app` ke **v1.86.0** sesudah bump, dan menormalkan berkas yang disentuhnya ke **LF** |
| 2026-10-03 | **G2-01** | `src/index.css` dan `src/lib/version.ts` ditemukan **CRLF** di working tree (aturan baru: WAJIB LF, §6.3 A16) | Dinormalkan ke **LF** oleh G2-01 (hanya 2 berkas itu, keduanya disentuh tugas ini). Berkas lain **tidak** disentuh (larangan §6.3 butir 2) |
| 2026-10-03 | **G2-03** | Seluruh pekerjaannya (komentar `index.css` + baris ROADMAP + angka kontrak `ATURAN-AI`) **tertinggal di working tree** tanpa commit saat gelombang dilanjutkan pihak lain | Ditutup lebih dulu sebagai commit tersendiri (`2f23365`) sekaligus memperbaiki blok **Status ringkas** ROADMAP yang masih menulis 4 selesai/18 belum |
| 2026-10-03 | **G2-04…G2-10** | **Gate dipersempit oleh pemilik**: hanya `npx tsc -b`, **tanpa** lint/tes/e2e, dan tiap tugas di-commit terpisah | DoD yang berbasis angka runtime (`e2e:uiux` untuk G2-06/G2-09, `npm test` untuk G2-04/G2-08/G2-10) **tidak dapat dibuktikan** pada putaran ini. Semua klaim "selesai" karena itu berarti **implementasi selesai**, bukan **terverifikasi** — rinciannya di `.design-audit/g2-sisa-LAPORAN.md` |
| 2026-10-03 | **G2-06** | DoD "0 kontrol <24px" & "kontrol utama ≥44px" biasanya diukur `npm run e2e:uiux` | Diganti **pemindai statis** `.design-audit/g2-06-scan.cjs` (kelas Tailwind → perkiraan ukuran). Ini **proksi**, bukan pengukuran runtime; sisa 52 kandidat 24–40 px dilaporkan terbuka |
| 2026-10-03 | **G2-08** | Spec menulis penanda hari terpilih `ring-2 ring-inset ring-indigo-400` | Kelas palet langsung **dilarang** kontrak K4.1 (ditegakkan G2-02) → dipakai token `ring-[var(--border-brand)]` dengan nilai warna yang sama |
| 2026-10-03 | **G2-09** | DoD "0 emoji pada `<button>`/heading" menyebut `npm run e2e:uiux` sebagai alat ukur — **guard itu tidak punya metrik emoji sama sekali** (verifikasi: kata "emoji" di seluruh `*.ts` repo hanya muncul di teks changelog `version.ts`). DoD-nya karena itu tidak bisa lulus maupun gagal | Diukur dengan alat sendiri: `.design-audit/g2-09-check.cjs` (definisi `Extended_Pictographic` dikurangi allowlist glyph tipografi ✓ ✕ ↩ ← → ↑ ↓ ↺ ⇱ ↗ ▶). Hasil: emoji **literal** di kontrol/heading = **0**, tetapi **69 emoji masih hidup sebagai `icon:` di berkas data** (responseTaxonomy 26 · captureSession/constants 19 · moods 6 · sessionTemplates 6 · template/layouts 9 · **engagement.ts 3** — berkas dilindungi §2.1) dan itu tetap dirender ke dalam tombol saat runtime. Status ROADMAP ditulis 🟡, bukan ✅. **Metrik emoji ke guard ditambahkan 2026-10-03** (lihat baris berikutnya) |
| 2026-10-03 | **G2-09** | Percobaan pertama sapuan hampir merusak 25 berkas: skrip pembersih `replace(/>\s{2,}/g, "> ")` menelan **newline** (`\s` termasuk `\n`) sehingga seluruh indentasi rata — diff melaporkan **3.496 baris "terhapus"** padahal `tsc` lolos | Ketahuan dari `git diff --stat` sebelum commit; seluruh perubahan di-**revert**, skrip ditulis ulang **tanpa** perataan spasi, lalu disapu ulang (diff akhir 181/82 baris). Pelajaran: periksa `--stat` sebelum commit setiap sapuan otomatis |
| 2026-10-03 | **G2-09** | DoD menunjuk guard yang tidak punya metrik emoji; pemilik mematikan gate tes sehingga spec tidak bisa dijalankan untuk memverifikasi suntingan guard | **Metrik ditambahkan** ke `e2e-uiux/uiux-metrics.spec.ts`: `emojiInControls`/`emojiInControlsCount` di `measure()` + satu `test.describe` yang di-`test.fixme` dengan residual 69 ikon (konvensi G1-11/Q24, **bukan** menaikkan ambang). Diverifikasi **tanpa** Playwright: (a) `npx tsc --noEmit --ignoreConfig …` pada spec → exit 0; (b) `.design-audit/g2-09-verify-metric.cjs` mengevaluasi template literal `measure()` dan menguji 21 contoh → semua sesuai, termasuk membuktikan glyph ✓ ✕ ↩ ← → ↺ × ▶ ↗ ⇱ tidak ikut terhitung |
| 2026-10-03 | **G2-09** | Rencana memindahkan ikon dari berkas DATA ke komponen SVG **dibatalkan setelah diperiksa** | `src/__tests__/captureSessionHelpers.test.ts:283-301` menjaga keunikan ikon antar-kontrol (`ENGAGEMENT_FLAG_META` vs `MOODS`) dengan membandingkan **string** ikon; mengubah tipe `icon` menjadi komponen membuat tes itu kehilangan makna, dan gate tes dimatikan sehingga perubahannya tidak bisa diverifikasi. Residual 69 ikon dibiarkan + dilaporkan, menunggu keputusan pemilik |
| 2026-10-03 | **G2-10** | Daftar berkas DoD menyebut 6 layar + `Settings.tsx` | Probe + watchdog G1-07 dipindah **utuh** ke `useSettingsQuery()`; `Settings.tsx` turun ~40 baris logika lokal. `useMoneyVisible` ikut memakai hook yang sama sehingga hanya **dua** hook yang menyentuh `getSettings()` langsung |

### 4.1 Tabel pasangan kontras token (DoD G2-01 butir 3)

Bukti: `.design-audit/g2-01-contrast.mjs` — **41 pasangan diperiksa, 0 gagal**. Ambang 4,5:1 (teks <18,66px).
Nilai warna = langkah **palet resmi Tailwind v4** (`node_modules/tailwindcss/theme.css`), tanpa warna baru.

| # | Lokasi (temuan G1-04) | Token pengganti | Latar | Rasio |
|---|---|---|---|---|
| 1 | `App.tsx:244` "Besok" | `--ink-warn` | `--bg-warn` (amber-50) | **6,88:1** |
| 2 | `App.tsx:256` "Backup" | putih | `--bg-warn-strong` (amber-700) | **5,05:1** |
| 3 | `Settings.tsx:113` "Hapus foto lama" | putih | `--bg-warn-strong` | **5,05:1** |
| 4 | `FinancePeriodPicker:81` (disabled) | `--ink-muted` | `--bg-muted` (slate-100) | **6,90:1** |
| 5 | `AttentionInbox:87` | `--ink-warn` | orange-50 | **6,72:1** |
| 6 | `MonthView:53` "Min" | `--ink-danger` | putih | **6,42:1** |
| 7 | `MonthView:79` angka Minggu | `--ink-danger` | `--surface` | **6,14:1** |
| 8 | `Students:353` "Hapus" | `--ink-danger` | putih | **6,42:1** |
| 9 | `RiwayatSesi:200` chip CANCELLED | `--ink-danger` | `--bg-danger` (red-50) | **5,88:1** |
| 10a | `IaEeTracker:158` merah | `--ink-danger` | putih | **6,42:1** |
| 10b | `IaEeTracker:158` oranye | `--ink-warn` | putih | **7,13:1** |
| 11 | `EngagementSummary:198` | `--ink-warn` | putih | **7,13:1** |
| 12 | `EvidenceCard:15` | `--ink-warn` | putih | **7,13:1** |
| 13 | `StudentDetail:846` | `--ink-warn` | putih | **7,13:1** |
| 14 | `StudentForm:364` | `--ink-warn` | putih | **7,13:1** |

**Rasio terburuk tiap token di semua latar terang aplikasi** (`--surface` · `--surface-strong` · `--surface-soft` · tint-nya · putih):

| Token | Nilai (langkah palet) | Terburuk | Di latar |
|---|---|---|---|
| `--ink-danger` | red-700 | **5,71:1** | `--surface-soft` |
| `--ink-warn` | amber-**800** | **6,34:1** | `--surface-soft` |
| `--ink-success` | green-**800** | **6,31:1** | `--surface-soft` |
| `--ink-muted` | slate-600 (= `--color-text-muted`) | **6,74:1** | `--surface-soft` |

**Residual yang SENGAJA dibiarkan gagal (milik G2-02)** — dibuktikan masih gagal oleh skrip bagian D:
`"Total Sesi"` blue-500 di blue-50 **3,45:1** · `"Total Jam"` indigo-500 di indigo-50 **4,09:1** · chip `"3 bulan"` gray-500 di gray-100 **4,39:1**.
