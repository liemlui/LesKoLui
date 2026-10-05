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
| Versi aplikasi | **v1.91.0** | `node -p "require('./package.json').version"` |
| HEAD | **`240314d`** · `main` **sinkron** dengan `origin/main` (0 commit belum push) | `git log --oneline -1` · `git status -sb` |
| Suite tes | **771 lulus / 64 berkas** (terakhir dijalankan 2026-10-05) | `npm run test:sandbox` (**wajib** dengan shim §6.1) |
| Berkas besar | `MonthlyReport.tsx` 2351 · `CaptureSession.tsx` 2041 · `Settings.tsx` 1308 · `StudentDetail.tsx` 1083 · `payments/TagihanTab.tsx` **845** | `node scripts/measure.mjs loc` |
| Gate | **lokal saja.** CI GitHub **tidak** diaktifkan — **jangan tawarkan lagi** (keputusan #6) | — |
| Batas satu tes Playwright | **60 dtk** — jangan dinaikkan tanpa alasan terukur (keputusan #5) | `playwright.config.ts` |

**Yang sudah tuntas sejak `PROMPT-LANJUTAN-G3` ditulis:** G3-01 L4 (`ManageSessionSheet` — **dua** modal lama dihapus) · `#7` semua spec e2e hijau (dibuktikan, bukan lagi janji) · rilis v1.91.0 (satu entri `CHANGELOG` untuk seluruh gelombang) · `#3` katalog topik putaran 1 (IB MYP) & 2 (IB DP) · G3-02 bagian 0 langkah 1–3 (refactor `TagihanTab` 1036 → 845).

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
3. **`e2e` pernah 1 merah dari 84 tes dan tidak teridentifikasi** (run berikutnya hijau, spec version-sensitive lulus `--repeat-each=2`). Dugaan: `nag-backup.spec.ts:4` — `dismissChangelog()` memakai `if (await ok.isVisible({timeout:3000}))`, jadi di bawah beban modal changelog bisa belum ter-render dan penolakannya **senyap**. **Kalau menjalankan ulang suite: tulis keluaran tiap run ke berkas BERBEDA** (run kedua menimpa berkas run pertama — sudah pernah menghilangkan bukti).
4. **Alias lintas kurikulum yang belum dibereskan** (temuan lama, bukan regresi): `National :: Informatika` dan `National :: Penjaskes` bermuara ke `computer science` (level AP/DP/IGCSE/A Level). Terlihat lewat `.design-audit/topic-coverage-audit.mjs` (§6).
5. **`test-results/` pernah hilang** — penyebabnya sudah diperbaiki (§4.2), tapi kalau `check-docs` melaporkan "R2 dilewati", periksa `.design-audit-suite.json` apakah isinya masih cocok dengan suite terakhir.
6. **52 kontrol <44 px** adalah pengecualian tertulis (A18/Q45: chip & kontrol sekunder 24–36 px diterima). Jangan "diperbaiki" tanpa keputusan baru.

---

## 5. Pekerjaan berikutnya (pilih satu, kerjakan satu)

Prioritas ditentukan pemilik: **fokus mengajar = IB MYP & IB DP**, jadi pekerjaan Cambridge/AP/National lebih rendah.

| Urutan | Pekerjaan | Mulai dari mana | Catatan |
|---|---|---|---|
| **1** | **G3-02 Keuangan — fitur** (refactor bagian 0 sudah 1036 → **845**; target ≤800) | `docs/kerja/TASK-05-rombak-keuangan.md` §3 + `../arsip/GELOMBANG-3.md` §G3-02 (beku, spesifikasi 11 fitur) | **Spek §4.5 menuntut urutan ini:** K-05/K-03 (tampilan) **sebelum** K-01 (perilaku). Kandidat sisa pemotongan baris: baris filter/chip, blok "Siap ditagih" |
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

> `$env:TEMP` berganti tiap sesi → **taruh skrip di `.design-audit/`**, jangan di TEMP (§6.4).

---

## 7. Gempa yang harus dihindari saat menutup putaran

Checklist yang dipakai sesi ini, urutannya penting:

1. `npm run test:sandbox` (dengan shim) — catat **771/64** atau angka barunya.
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
