# GELOMBANG-2 — Fondasi: token → uang → jadwal (G2-01 … G2-10)

> **Sekilas** · Jenis: **dokumen tugas (dapat dieksekusi)** · Diperbarui: 2026-10-01 · Status: **aktif**
> **Untuk siapa:** agen AI pelaksana (satu langkah per putaran, jangan improvisasi).
> **Prasyarat wajib dibaca lebih dulu:** [`ATURAN-AI.md`](ATURAN-AI.md) → [`TASK-04-fondasi-visual.md`](TASK-04-fondasi-visual.md) →
> [`TASK-08-satu-pintu-uang.md`](TASK-08-satu-pintu-uang.md) → [`TASK-09-jadwal-hari-zoom.md`](TASK-09-jadwal-hari-zoom.md).
> **Dependency gelombang:** **seluruh Gelombang 1 selesai** (khusus `G1-02` untuk angka & `G1-04` untuk kontras interim).
> **Isi:** 10 tugas (**G2-10 ditambahkan 2026-10-01 dari Q18/G1-07**). **Tidak ada perubahan skema Dexie.** Urutan risiko terendah sudah dikunci `ATURAN-AI` §4: `04 → 08 → 09`.
> **Estimasi total:** **3×L + 5×M + 2×S** ≈ 2 minggu (L = G2-01, G2-02, G2-04; M = G2-06…G2-10; S = G2-03, G2-05).
> **Revisi estimasi:** `TASK-04` menulis "6 langkah × 30–45 menit" untuk 471 kelas; dengan baseline **904** angka itu tidak realistis (lihat §1).

---

## 0. Cara pakai

Sama seperti [`GELOMBANG-1.md`](GELOMBANG-1.md) §0: satu langkah per putaran, gate wajib
(`npx tsc -b` → `npx eslint src` → `npm test` → `npm run build` → `npm run e2e`, plus `npm run e2e:uiux`
hasil `G1-11`), laporan 5 baris, dan **jangan mengakali tes**.

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
G2-01 (TASK-04 L1–L3: token + 7 primitif + skala tipografi)   ← wajib pertama
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

**DoD terverifikasi:**
- [ ] `@theme` memuat 4 langkah tipografi + spacing + 2 elevasi + 2 pola gerak.
- [ ] `src/components/ui/` berisi 7 berkas; `grep` menunjukkan primitif dipakai di ≥3 layar.
- [ ] 13 pasangan kontras lulus (≥4,5:1 untuk teks <18,66px) — tabel pasangan ditulis di §4.
- [ ] Tidak ada kelas warna langsung di berkas primitif.

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
| | | | |
