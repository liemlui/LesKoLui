# SERAH-TERIMA — titik masuk untuk sesi/agen berikutnya

> **Sekilas** · Jenis: **lembar serah-terima** · Diperbarui: 2026-10-05 · Status: **aktif**
> **Untuk siapa:** sesi DSH berikutnya (agen baru) yang melanjutkan pekerjaan ini.
> **Menggantikan:** `../arsip/PROMPT-LANJUTAN-G3.md` (beku, potret 2026-10-04).
> **Aturan:** berkas ini **tidak menggantikan** kontrak. Yang mengikat tetap
> [`ATURAN-AI.md`](ATURAN-AI.md) → [`PEKERJAAN.md`](PEKERJAAN.md) → [`CHEATSHEET.md`](CHEATSHEET.md).
> Perbarui berkas ini **di akhir putaran**, bukan di awal.

---

## 1. Urutan baca (jangan diubah)

1. [`ATURAN-AI.md`](ATURAN-AI.md) **seluruhnya** — §0 (urutan baca) · §1 (keputusan terkunci: B1–B4 + amandemen) · §2.1 (berkas terlarang) · **§6.1 (sandbox)** · **§6.2 (gate 4 tier)** · §6.3 (LF) · **§6.4 (jebakan alat & git — hemat waktu, pernah memakan berkali-kali)**.
2. [`PEKERJAAN.md`](PEKERJAAN.md) — satu-satunya daftar pekerjaan (§3 gelombang, §4 pekerjaan tanpa dokumen tugas, §5 daftar periksa manual).
3. [`CHEATSHEET.md`](CHEATSHEET.md) — 1 halaman per tugas; buka `TASK-NN` utuh **hanya** kalau perlu detail langkah.
4. Berkas ini (§4–§7) untuk keadaan & temuan yang **tidak** ada di dokumen kontrak.

---

## 2. Keadaan repo saat serah-terima

| Fakta | Nilai | Cara mengukurnya ulang |
|---|---|---|
| Versi aplikasi | **v1.91.0** — **tidak** dinaikkan di putaran ini (Q-D = d2: satu entri `CHANGELOG` per gelombang) | `node -p "require('./package.json').version"` |
| HEAD | **`ac83e6f`** — **sudah di-push** ke `origin/main` (bukti: `5aaf9eb..ac83e6f  main -> main` · `git status -sb` tanpa ahead/behind · `git rev-parse main` == `origin/main`). Push itu membawa **4 commit**: `cf9e8fe` (G3-02 K-05 · K-03 · K-07) · `e6d9b20` (K-06) · `aab3374` (kelola jadwal (a)+(b) + teks ter-encode ganda) · `ac83e6f` (dokumen status). Pohon kerja **bersih** | `git log --oneline -1` · `git status -sb` · `git rev-parse main origin/main` |
| Suite tes | **837 lulus / 66 berkas** (terakhir dijalankan 2026-10-05, sesudah pembersihan kode mati + penjaga teks) | `npm run test:sandbox` (**wajib** dengan shim §6.1) |
| Berkas besar | `MonthlyReport.tsx` 2351 · `CaptureSession.tsx` 2041 · `Settings.tsx` 1308 · `StudentDetail.tsx` 1083 · `payments/TagihanTab.tsx` **961** (915 → 961 oleh K-06; target refactor ≤800 belum tercapai) | `node scripts/measure.mjs loc` |
| Gate | **lokal saja.** CI GitHub **tidak** diaktifkan — **jangan tawarkan lagi** (keputusan #6) | — |
| Batas satu tes Playwright | **60 dtk** — jangan dinaikkan tanpa alasan terukur (keputusan #5) | `playwright.config.ts` |

**Yang sudah tuntas sejak `PROMPT-LANJUTAN-G3` ditulis:** G3-01 L4 (`ManageSessionSheet` — **dua** modal lama dihapus) · `#7` semua spec e2e hijau (dibuktikan, bukan lagi janji) · rilis v1.91.0 (satu entri `CHANGELOG` untuk seluruh gelombang) · `#3` katalog topik putaran 1 (IB MYP) & 2 (IB DP) · G3-02 bagian 0 langkah 1–3 (refactor `TagihanTab` 1036 → 845) · G3-02 fitur K-05 · K-03 · K-07 · **K-06 (filter lanjutan)**.

---

## 3. Aturan kerja yang mengikat (ringkas — rinciannya di `ATURAN-AI`)

- **Satu langkah per putaran** → tentukan tier → gate → lapor bentuk §8 → berhenti. Jangan lanjut sendiri.
- **Tier ditentukan SEBELUM mulai** dan alasannya ditulis di laporan (§6.2). Ragu → ambil tier lebih tinggi.
- **Berkas §2.1 dilarang disentuh** oleh tugas apa pun di seri ini (`db.ts` · `crypto.ts` · isi `formatRupiah()` · `waBilling.ts` · `invoicePresentation.ts` · `engagement.ts` · `finance.ts` · `financePipeline.ts` · `csv.ts` · `src/template/**` · `STEP_META` · prompt di `aiClient.ts`). Kalau tugas menuntut menyentuhnya → **tugasnya salah lingkup**, berhenti dan lapor.
- **Batas agen:** butir yang menuntut mata manusia di perangkat **tidak boleh** dicentang agen (`PEKERJAAN.md` §5). Agen hanya mencentang yang punya bukti dari perintahnya sendiri.
- **Keputusan pemilik terkunci** ada di `ATURAN-AI` §1; jangan ditawar. Yang sudah **ditolak** jangan ditawarkan lagi (mis. konfirmasi di nav bawah, mengaktifkan CI, dark mode).

---

## 4. Temuan & jebakan yang WAJIB dibaca sebelum bekerja

Semua di bawah ini **nyata terjadi** di sesi ini. `ATURAN-AI` §6.4 memuat versi ringkasnya; di sini konteksnya.

### 4.1 Lingkungan (Windows + sandbox DSH)

| Gejala | Sebab | Tindakan |
|---|---|---|
| `npm test` / `npm run build` gagal `spawn EPERM` | Vite memanggil `child_process.exec("net use")`; sandbox melarang pipa stdio | Buat **shim** §6.1 di `$env:TEMP` **di dalam satu pemanggilan pwsh** yang memakainya (`$env:TEMP` berganti tiap sesi → shim hilang). Perintah resmi: `npm run test:sandbox` |
| `npm run e2e`, `npx playwright test`, `git push` gagal | butuh spawn browser / kredensial Windows | **Eskalasi sandbox** — tidak bisa disiasati |
| `node -e "…"` dari pwsh gagal parse | PowerShell memakan kutip/`[` | Tulis skrip ke `.design-audit/*.mjs` lalu `node` berkas itu |

### 4.2 Git & berkas

| Gejala | Sebab | Tindakan |
|---|---|---|
| `git commit` cetak sukses tetapi **exit 1** | git menulis peringatan CRLF ke stderr; commit **berhasil** | Jangan ulangi commit; buktikan dengan `git log --oneline -1` + `git status --porcelain` |
| `npm run e2e` menulis ulang PNG ter-track + membuat PNG baru | spec screenshot memang begitu | `git checkout HEAD -- e2e/screenshots/` + hapus PNG baru. **JANGAN** pakai `git add --renormalize` untuk berkas biner — ia justru **men-stage** PNG hasil e2e |
| `git status` menampilkan ` M <berkas>` | bisa **nyata** bisa stat-cache | **Bandingkan hash dulu** (`git hash-object -- <berkas>` vs `git rev-parse HEAD:<berkas>`). Jangan simpulkan "false M" dari satu kecocokan |
| `npm run e2e` menghapus artefak fakta suite | `test-results/` adalah direktori keluaran **Playwright** | **Sudah diperbaiki:** artefaknya di **`.design-audit-suite.json`** (akar repo, gitignored). Pembaca: `scripts/check-docs.mjs` (R2) + `scripts/measure.mjs` |
| Artefak JSON "tidak ada" padahal berkasnya ada | `Set-Content -Encoding utf8` (PS 5.1) menulis **BOM** → `JSON.parse` gagal, pembacanya menyimpulkan "tidak ada" **tanpa galat** | Pakai `[System.IO.File]::WriteAllText($p, $t, (New-Object System.Text.UTF8Encoding($false)))`; periksa byte pertama = `123` |

### 4.3 Menyunting dokumen (ini yang paling sering menggigit sesi ini)

- **`edit` dengan anchor pendek merusak baris tabel.** Terjadi **tiga kali** di sesi ini (baris riwayat `ATURAN-AI` §9, `TASK-05` §10). Penyebab nomor satu: **teks pengganti memuat teks anchor**, atau anchor cocok di tempat lain.
  **Cara aman:** tulis baris pengganti ke berkas di `.design-audit/`, lalu skrip kecil yang mengganti **satu baris utuh** dan **memverifikasi jumlah pipa** (`|`) hasilnya sama dengan baris lain di tabel itu. Kalau memilih `edit`: anchor = **seluruh baris**, dan **jangan** memakai teks anchor di dalam pengganti.
- **Jumlah kolom tabel berbeda antar dokumen** — `ATURAN-AI` §9 = 4 pipa, `TASK-05` §10 = **5** pipa. Memeriksa dengan angka yang salah membuat skrip penjaga menolak baris yang benar.
- **Blok JSX besar jangan dipotong dengan `edit`.** Blok kondisional JSX ditutup `)}` pada **baris terpisah**; pengganti yang juga berakhir `)}` menghasilkan `)}` ganda (terjadi **dua kali**, ditangkap `tsc`). Pakai skrip yang memverifikasi `penanda → penutup → baris sesudahnya` **sebelum** memotong, dan potong **termasuk** baris lanjutan itu.

### 4.4 Menulis tes

- **Jangan memakai "celah yang belum diperbaiki" sebagai contoh di tes penjaga.** `topicCoverage.test.ts` dulu memakai `"Global Politics"` sebagai contoh mapel *tanpa* katalog DP; begitu katalog DP diisi, **dua tes gagal padahal aplikasinya sedang membaik**. Pakai properti kontraknya (mapel yang masih terdaftar di `KNOWN_TOPIcless`), lalu tambahkan tes sisi lain yang menuntut celah itu **tertutup**.
- **Menambah cakupan data ≠ menambah jumlah tes.** `topicCoverage` memakai satu loop per kurikulum; menambahkan 6/10 mapel **tidak** mengubah jumlah tesnya. Jangan mengira suite naik.
- Gate tes yang benar-benar menjaga area keuangan: `npm run test:sandbox -- invoiceSessions sessionCountBilling financePipeline` (**54 lulus**) + e2e `finance.spec.ts` & `billing-session-count.runtime.spec.ts` (**4 lulus** di dua project).

### 4.5 Utang & batas kejujuran (jangan diklaim sudah beres)

1. **Katalog topik IB MYP & DP saya susun sendiri** mengikuti kerangka silabus resmi, tetapi **belum diverifikasi** ke IB Subject Guide (tidak ada akses). Katalog lama repo sebagian menyebut sumber buku teks; tambahan saya tidak.
2. **`ManageSessionSheet` (L4) belum pernah diklik mesin maupun manusia.** Suite e2e hijau membuktikan Beranda masih merender, **bukan** bahwa keenam aksinya bekerja. Buktinya ada di `PEKERJAAN.md` §5 butir **21–22** (manual) dan calon spec e2e baru.
3. **`e2e` pernah 1 merah dari 84 tes dan tidak teridentifikasi** — **diperbarui 2026-10-05: galatnya kini teridentifikasi.** Pada run penutup sesi, `e2e/capture-closeout-failure.spec.ts:314` (`expect(pageErrors).toEqual([])`) menerima `["Payment not found"]`; spec itu dijalankan **sendirian → lulus** (14,1 dtk) dan `--repeat-each=2` → **4/4 lulus**, jadi ini flake di bawah beban, **bukan regresi**. Galat itu hanya dilempar `paymentRepo.ts:150,174,1139,1159`, dan spec tersebut **tidak menyentuh tab keuangan sama sekali** (0 kecocokan `payments`/`Tagihan`) — yang tertangkap adalah galat halaman **transien**; dugaan paling masuk akal: balapan dengan seed data dev, yang memang sudah tercatat bisa melempar "Payment not found" (`dev/seedDummy.ts:112`). Belum diperbaiki (spec-nya sendiri hijau). **Kalau menjalankan ulang suite: tulis keluaran tiap run ke berkas BERBEDA** (run kedua menimpa berkas run pertama — sudah pernah menghilangkan bukti).
4. **Alias lintas kurikulum yang belum dibereskan** (temuan lama, bukan regresi): `National :: Informatika` dan `National :: Penjaskes` bermuara ke `computer science` (level AP/DP/IGCSE/A Level). Terlihat lewat `.design-audit/topic-coverage-audit.mjs` (§6).
5. **`test-results/` pernah hilang** — penyebabnya sudah diperbaiki (§4.2), tapi kalau `check-docs` melaporkan "R2 dilewati", periksa `.design-audit-suite.json` apakah isinya masih cocok dengan suite terakhir.
6. **52 kontrol <44 px** adalah pengecualian tertulis (A18/Q45: chip & kontrol sekunder 24–36 px diterima). Jangan "diperbaiki" tanpa keputusan baru.
7. **(2026-10-05, G3-02 K-05/K-03/K-07) Tiga serah-terima yang harus dicentang mata, bukan oleh agen:** kotak `Cari murid` benar-benar menemukan murid; badge "Terlambat N hari" benar untuk tagihan yang memang lewat; dan tanggal jatuh tempo terbaca sebagai nama hari Indonesia di ringkasan **dan** rincian baris. Semuanya punya tes murni (32 tes baru) tetapi **belum satu pun** pernah dilihat di perangkat.
8. **(2026-10-05) `e2e`/`e2e:uiux` sudah dijalankan — dan diulang atas revisi final.** Run A (sesudah (a)/(b)): `e2e` **78 lulus / 6 skip / 0 gagal** (4,9 mnt) · `e2e:uiux` **56 lulus / 0 gagal** (2,7 mnt). Run B (sesudah perbaikan teks + pembersihan kode mati + penjaga): `e2e` **77 lulus / 6 skip / 1 flake** — `capture-closeout-failure.spec.ts`, lulus sendirian & 4/4 saat diulang (butir 3) · `e2e:uiux` **56 lulus / 0 gagal** (3,2 mnt). Keluaran tiap run ditulis ke berkas berbeda di `.design-audit/`; efek samping screenshot dibereskan tiap kali (**59** PNG ter-track dipulihkan + **13** baru dihapus, nol di-commit). Yang **tetap belum**: verifikasi mata di perangkat (butir 7 · 11 dan butir **23** `PEKERJAAN` §5) — suite hijau tidak membuktikan tombol/chip baru bekerja.
9. **(2026-10-05) `showIssuedList` — kode mati, SUDAH DIBERSIHKAN.** Ia dihapus sebagai pengontrol tampil oleh K-07, tetapi perhitungan & pengembaliannya di `useInvoiceFilters.ts` masih tertinggal; dibuang 2026-10-05 bersama `agingBuckets` (butir 13). Bukti: `Select-String "showIssuedList|agingBuckets"` di `src` → tinggal **satu komentar riwayat** di `TagihanTab.tsx` (menjelaskan mengapa daftar selalu dirender).
10. **(2026-10-05) Perubahan perilaku yang perlu diketahui sesi berikutnya:** daftar tagihan kini memakai `visibleBillRows`, sehingga chip umur piutang **mulai berlaku juga pada rekap PDF** (dulu hanya CSV yang menyaring); dan chip umur piutang **dilepas otomatis** saat kata kunci pencarian berubah.
11. **(2026-10-05, G3-02 K-06) Yang harus dicentang mata di perangkat:** Uang → tab **Tagihan** → tombol `Filter lanjutan` membuka & menutup panel (umur piutang + asal invoice + ekspor), dan chip `N filter aktif · Hapus` muncul **hanya** saat ada saringan tersembunyi lalu melepas ketiganya dalam satu klik. Belum pernah diklik mesin maupun manusia: tidak ada satu pun spec e2e yang menyentuh tombol/chip itu.
12. **(2026-10-05) Celah cakupan guard UI — jangan diklaim sebaliknya.** `e2e-uiux/uiux-metrics.spec.ts:217` mengukur `/payments?tab=ringkasan`, sedangkan K-06 mengubah `?tab=tagihan`. Jadi run f1 sesudah K-06 **tidak** memeriksa kontras/tap-target panel baru itu. Menambahkan `?tab=tagihan` ke daftar jaga = perubahan cakupan guard (A19) → keputusan pemilik, bukan agen.
13. **(2026-10-05) `agingBuckets` — kode mati, SUDAH DIBERSIHKAN.** Dihitung di `useInvoiceFilters.ts` (dan dikembalikan) tanpa satu pun konsumen — `TagihanTab` menghitung `agingRows` sendiri dari `billRows` — sehingga ringkasan umur piutang dihitung dua kali untuk satu layar. Dibuang bersama `showIssuedList` (butir 9); impor `ageBucket`/`invoiceAgeDays`/`AgeBucket` ikut dibersihkan. Diff **3 tambah / 14 hapus**; `tsc` + `eslint` + suite memastikan nol perubahan perilaku.
14. **(2026-10-05) `home/ManageSessionSheet.tsx` pernah memuat teks ter-encode ganda — SUDAH DIPERBAIKI, dan sekarang DIJAGA TES.** 13 baris / 17 penggantian (em dash ×9 · titik tengah ×4 · tanda centang ×2 · `⋯` ×2); 6 di antaranya **terlihat pengguna**: tombol `⋯ Aksi lain (N)` (yang justru disuruh dicari di §5 butir 21), subjudul sheet, dan 4 pesan toast. Alatnya `.design-audit/perbaiki-mojibake.cjs`; pasangannya **dihitung** dari tabel CP1252, tidak diketik — jebakannya: `new TextDecoder("windows-1252")` di Node ini memetakan 0x80–0x9F seperti latin1 (terukur `e2 80 94` → `00E2 0080 0094`), sehingga hanya `·` yang cocok dan sisanya lolos. Pindai ulang `src · e2e · e2e-uiux · docs · scripts` = **348 berkas, 0 temuan**. **Penjaganya SUDAH ada:** 5 tes di `manageSessionSheet.test.tsx` memindai **seluruh** `src/**/*.{ts,tsx}` lewat `import.meta.glob(…, { query: "?raw" })` — tanpa `node:fs`, tanpa berkas baru, tanpa ubah config (tipe `?raw` sudah ada di `vite/client`; `@types/node` sengaja tidak dipasang untuk `src/**`). **Kontrol negatif diuji:** menyisipkan satu em dash rusak membuat tesnya merah dan menyebut berkasnya. `PEKERJAAN` §4 #19 ditutup.
15. **(2026-10-05) Saat murid sesi diganti, `rateSnapshot`/`cost` tidak ikut berganti.** Sesi menjadi milik murid B tetapi masih memakai tarif murid A sampai nominalnya diubah manual. Putaran kelola-jadwal hanya memperbaiki "nominal manual tidak terhapus" (a); perbaikan tarifnya = backlog **T3** `PEKERJAAN` §4 **#17**, menunggu keputusan pemilik soal tarif. Jejak auditnya masuk §4 **#18**.
16. **(2026-10-05) Temuan line ending, terukur.** `src/screens/payments/useInvoiceFilters.ts` utuh **CRLF** di working tree (index-nya `i/lf` → artefak checkout lokal `core.autocrlf`, §6.3), dan **tidak ada** berkas campur: 13 berkas yang disentuh sesi ini diukur dengan `.design-audit/cek-eol.cjs` → 12 LF semua, 1 CRLF semua, **0 campur**. Karena berkas itu disentuh tugas ini, ia dinetralkan ke LF (`cek-eol.cjs --perbaiki`) dan diff-nya tetap kecil (**3 tambah / 14 hapus**) — bukti normalisasi tidak menulis ulang seluruh berkas. Catatan alat: `edit` ternyata **mempertahankan** line ending berkas yang ada, jadi campuran tidak muncul dengan sendirinya.

---

## 5. Pekerjaan berikutnya (pilih satu, kerjakan satu)

Prioritas ditentukan pemilik: **fokus mengajar = IB MYP & IB DP**, jadi pekerjaan Cambridge/AP/National lebih rendah.

| Urutan | Pekerjaan | Mulai dari mana | Catatan |
|---|---|---|---|
| **1** | **G3-02 Keuangan — lanjutkan fitur** (bagian 0 refactor: 1036 → **845**; fitur K-05 · K-03 · K-07 · **K-06 tuntas** 2026-10-05; `TagihanTab.tsx` kini **961**) | `docs/kerja/TASK-05-rombak-keuangan.md` §3 + **§9 "Progres G3-02"** (daftar sisa) + `../arsip/GELOMBANG-3.md` §G3-02 (beku, 11 fitur) | **Berikutnya: #8 K-01** (peringatan nominal tagihan — urutan spek §4.5: tampilan sebelum perilaku), lalu #9 K-12, #10 K-13, terakhir **#11 nav 3 pintu**. Guard f1 **sudah dijalankan** 2026-10-05 (`e2e` 78/6/0 · `e2e:uiux` 56/0) |
| **2** | **#8 K-01** — peringatan saat mengubah nominal tagihan | idem | Bukan kosmetik: mengubah nominal tagihan `source:"auto"` memindahkannya ke `manual` → **tombol "Batalkan tagihan" hilang**, **daftar sesi hilang dari ekspor & WA**. Perubahan **UI saja**; `paymentRepo.ts` **tidak** diubah. `paymentRepo` belum punya berkas tes → K-01 butuh tes baru |
| **3** | **#3 katalog topik** — sisa 62 pasangan | `PEKERJAAN.md` §4 #3 | IGCSE 16 · A Level 13 · O Level 11 · AP 10 · National 8 · (IB **tuntas**) |
| **4** | **#2 verifikasi manual** (22 butir) | `PEKERJAAN.md` §5 | **Butuh pemilik di perangkat** — bukan pekerjaan agen |
| **5** | **G3-03 papan pipeline** → G3-04 kontrak AI → G3-05 laporan … | `../arsip/GELOMBANG-3.md` §G3-03…§G3-10 | Urutan mengikat dari A14: `G3-04` **sebelum** `G3-05` |

**Batasan yang mengikat untuk G3-02/G3-03:** `finance.ts`, `financePipeline.ts`, `csv.ts`, dan logika `paymentRepo.ts` **dilarang diubah**; angka uang dan CSV harus **tetap sama**; nav 5→3 pintu dikerjakan **paling akhir** (selector e2e patah di situ).

---

## 6. Perkakas bantu yang sudah ada (semua gitignored, di `.design-audit/`)

| Skrip | Gunanya |
|---|---|
| `topic-coverage-audit.mjs` | Mengukur celah katalog topik: mapel indeks per level · status 78 pasangan · **peta alias lintas kurikulum**. Jalankan: `node .design-audit/topic-coverage-audit.mjs` |
| `cut-jsx-block.mjs` · `cut-cancelled-section.mjs` · `extract-recovery-picker.mjs` | Pemotong blok JSX yang **memverifikasi bentuk sebelum memotong** (pola aman untuk refactor `TASK-01`) |
| `split-a23-a24.mjs` · `fix-a23-a24.mjs` · `replace-row-a24.mjs` · `fix-task05-rows.mjs` | Perbaikan baris tabel yang rusak (contoh pola "satu baris utuh + verifikasi pipa") |
| `release-check.mjs` | Konsistensi versi: `package.json` vs `CHANGELOG[0]` vs duplikat entri |
| `sisip-baris-tabel.cjs` | **Alat pilihan untuk menyunting baris tabel markdown.** Mode `insert` · `replace` · `delete`; menolak menulis bila jangkar tidak unik, bukan baris tabel, atau jumlah pipanya beda dari jangkar; mencetak jumlah pipa baris sekitar sebagai bukti. Pakai: `node .design-audit/sisip-baris-tabel.cjs <insert\|replace\|delete> <berkas> <berkas-jangkar> [berkas-baris-baru]` |
| `anchor-*.txt` · `row-*.txt` | Berkas jangkar & baris pengganti untuk alat di atas. **Jangan** menulis jangkar lewat `Get-Content` (PS 5.1 membaca UTF-8 sebagai ANSI → em-dash rusak → jangkar tidak cocok, 1085 vs 1037 karakter); tulis dengan alat `write` atau `.NET` + `UTF8Encoding($false)` |
| `pindah-filter-lanjutan.cjs` · `ambil-baris.cjs` | Pemindah blok JSX yang menyeimbangkan `<div>` lalu memverifikasi baris **sesudah** blok sebelum menulis (mundur tanpa menulis bila bentuknya tidak cocok; blok disalin byte-identik) · penyalin **satu baris** berkas ke berkas jangkar lewat Node — dipakai agar jangkar tabel tidak pernah lewat shell (PS 5.1 merusak UTF-8) |

> **Pelajaran 2026-10-05 (memakan dua langkah):** skrip `.cjs` tidak boleh berkomentar dengan `#` (itu sintaks shell); dan sebelum memakai alat baris tabel, **pastikan jangkar masih ada di berkas** — setelah satu `replace` berhasil, jangkar lama hilang dan percobaan `delete` dengan jangkar yang sama akan lapor "muncul 0x".

> `$env:TEMP` berganti tiap sesi → **taruh skrip di `.design-audit/`**, jangan di TEMP (§6.4).

---

## 7. Gempa yang harus dihindari saat menutup putaran

Checklist yang dipakai sesi ini, urutannya penting:

1. `npm run test:sandbox` (dengan shim) — catat **837/66** atau angka barunya.
2. Perbarui `.design-audit-suite.json` dengan angka yang **baru saja** keluar (jangan menaikkannya tanpa menjalankan suite).
3. `git status --porcelain` → pastikan **tidak ada** PNG screenshot yang ikut.
4. `git show --stat HEAD` **sebelum** push → pastikan hanya berkas yang diniatkan.
5. `git push origin main` → bukti sah: baris `abc..def  main -> main` **dan** `git status -sb` tanpa penanda ahead/behind **dan** `git rev-parse main` == `git rev-parse origin/main`.
6. Perbarui riwayat tugas (`TASK-NN` §10 / `PEKERJAAN.md` §7) + berkas ini.

---

## 8. Riwayat berkas ini

| Tanggal | Perubahan |
|---|---|
| 2026-10-05 | Dibuat sebagai pengganti `PROMPT-LANJUTAN-G3.md` yang beku. Memuat keadaan pasca rilis v1.91.0, temuan sesi (artefak suite di direktori Playwright, BOM, anchor tabel, tes penjaga yang menuntut celah), dan checklist penutup putaran. |
| 2026-10-05 | **Diperbarui sesudah G3-02 kluster daftar tagihan (K-05 · K-03 · K-07).** §2: HEAD `5aaf9eb` + 6 berkas belum di-commit · suite **771/64 → 803/66** · `TagihanTab.tsx` **845 → 915** · versi **tidak** dinaikkan. §4.5 bertambah butir **7–10** (tiga serah-terima mata · `e2e` sengaja ditunda f1 · `showIssuedList` kode mati · dua perubahan perilaku). §5 baris 1: berikutnya **K-06**, lalu K-01/#8. §6: alat baru `sisip-baris-tabel.cjs` + peringatan jangkar UTF-8/PS 5.1. §7: angka suite jadi 803/66. |
| 2026-10-05 | **Diperbarui sesudah G3-02 fitur #6 K-06 (Filter lanjutan).** §2: HEAD `cf9e8fe` (+3 berkas K-06 belum di-commit) · suite **803 → 820** lulus / 66 berkas · `TagihanTab.tsx` **915 → 961**. §4.5 bertambah butir **11** (verifikasi mata panel K-06 + celah cakupan `e2e:uiux`); butir 8 tetap: `e2e`/`e2e:uiux` **belum** dijalankan dan kini menjadi langkah berikutnya. §5 baris 1: berikutnya **e2e sekali (f1)**, lalu **K-01/#8**. §6: alat baru `pindah-filter-lanjutan.cjs` + `ambil-baris.cjs`. |
| 2026-10-05 | **Diperbarui sesudah putaran kelola-jadwal Beranda (a)+(b) — dan guard f1 akhirnya dijalankan.** §2: HEAD tetap `cf9e8fe`, kini **11 berkas** belum di-commit · suite **820 → 832** lulus / 66 berkas. §4.5 butir 8 **ditutup** (`e2e` 78 lulus / 6 skip / 0 gagal · `e2e:uiux` 56 lulus / 0 gagal) dan bertambah butir **14–15** (teks ter-encode ganda di `ManageSessionSheet.tsx`; `rateSnapshot` tidak ikut berganti saat murid diganti). §5 baris 1: berikutnya **K-01/#8**. §6: alat bantu `pindah-filter-lanjutan.cjs` · `ambil-baris.cjs` · `cek-mojibake.cjs`. |
| 2026-10-05 | **Diperbarui sesudah perbaikan teks ter-encode ganda.** §4.5 butir **14** diubah dari "belum diperbaiki" menjadi **SUDAH diperbaiki** (13 baris / 17 penggantian; pindai ulang repo = 348 berkas / 0 temuan) dan butir 15 dirapikan kalimatnya; §4 bertambah **#19** (penjaga otomatisnya butuh keputusan pemilik). §2 **tidak berubah**: HEAD `cf9e8fe` · 12 berkas · suite 832/66. §6: alat baru `perbaiki-mojibake.cjs` · `mojibake-pasangan.cjs` · `buang-teks-rusak.cjs`, dan `cek-mojibake.cjs` ditulis ulang agar bisa memindai direktori. |
| 2026-10-05 | **Penutupan sesi: 3 commit berjenjang + push `main`.** `e6d9b20` (G3-02 #6 K-06) · `aab3374` (kelola jadwal (a)+(b) + teks ter-encode ganda) · `ac83e6f` (dokumen status). Push `5aaf9eb..ac83e6f` — sekaligus membawa `cf9e8fe` yang tertunda sejak putaran K-05/K-03/K-07. Bukti: `git status -sb` tanpa penanda ahead/behind dan `main` == `origin/main` == `ac83e6f`. Baris §2 HEAD diperbarui di commit sesudahnya (dokumen tidak bisa memuat hash commit-nya sendiri). |
| 2026-10-05 | **Penutupan sisa sebelum tugas berikutnya.** Pembersihan kode mati (`showIssuedList` + `agingBuckets`, diff 3/14) · penjaga otomatis teks ter-encode ganda (5 tes atas seluruh `src/**`, tanpa `node:fs`, kontrol negatif diuji) · line ending `useInvoiceFilters.ts` dinetralkan (temuan butir **16**) · guard `e2e`+`e2e:uiux` diulang atas revisi final (**flake diidentifikasi**: butir 3). §2: suite **832 → 837** · §4 #19 ditutup · §4.5 butir 3/8/9/13/14 diperbarui + butir 16 baru. **Dua sisa yang butuh keputusan Anda:** butir 12 (cakupan guard UI) dan `PEKERJAAN` §4 #17 (tarif saat murid diganti). |
