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
   G3-01…G3-10 ada di §3, pekerjaan tanpa dokumen tugas di §4, daftar periksa manual (33 butir)
   di §5.
3. `les-ko-lui/docs/kerja/SERAH-TERIMA.md` — keadaan + batas kejujuran yang belum beres.
   Bagian 3 dan 4 saja.
4. `les-ko-lui/docs/kerja/CHEATSHEET.md` — jangkar kode dan jebakan per tugas (ringkasan).
5. Baru buka SATU `docs/kerja/TASK-XX` yang relevan kalau perlu detail. `docs/RIWAYAT-RILIS.md`
   hanya kalau butuh alasan historis. `docs/arsip/**` beku — jangan kutip angkanya.

### Keadaan yang diukur pada 2026-10-10 (ukur sendiri, jangan percaya tulisan ini)

| Hal | Nilai saat berkas ini ditulis |
|---|---|
| Versi | v1.97.0 |
| Branch / HEAD | `main`, pohon kerja bersih sesudah rilis v1.97.0 (`git status -sb` untuk selisih dengan `origin/main`) |
| Suite | 1197 lulus / 89 berkas |
| `check:docs` | 0 rusak · 0 pelanggaran |
| `e2e:uiux` | **64 lulus / 0 gagal** — termasuk layar Detail Murid yang pada 2026-10-10 sempat jatuh ke batas galat karena urutan hook (lihat jebakan) |
| `e2e` | belum dijalankan ulang pada putaran ini. Terukur terakhir 2026-10-08: 69 lulus / 11 gagal / 6 skip — **sebelas kegagalannya sudah ada sebelum G3-05**, lihat bagian jebakan |

Baris berkas besar yang menjadi target refactor (diukur dengan `npm run measure loc`):
`CaptureSession.tsx` **2.077** · `Settings.tsx` **1.380** (target ≤700) · `payments/TagihanTab.tsx` **1.021** (target ≤800). `MonthlyReport.tsx` **1.470** (target ≤1.500) dan `StudentDetail.tsx` **678** (target ≤800) — **keduanya sudah tuntas**.

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

**Sisa Gelombang 3 — empat tugas, G3-06 sudah tuntas 2026-10-10:**

1. **G3-07 Foto murid.** Ketergantungannya (G3-06) sudah selesai, jadi ini yang dikerjakan lebih dulu. Kolom foto pada murid sudah ada dan sudah ikut masuk berkas backup, tetapi belum pernah ditampilkan sama sekali. **Kerjakan ini lebih dulu.**
2. **G3-08 Kanvas dan istilah.** Bergantung G3-05 (sudah selesai) — panel desain laporan yang baru dirombak ada di `src/screens/monthlyReport/DesignToolbar.tsx`. Jangan kurangi 26 susunan / 34 tema.
3. **G3-09 Pengaturan.** Refactor `Settings.tsx` 1.380 → ≤700 + 11 fitur. **Lima `confirm()` bawaan peramban masih hidup di berkas itu** (jalur restore dan hapus semua data), dan syarat selesai G3-09 sendiri sudah menuntut semuanya diganti dialog internal.
4. **G3-10 Reset total dan PIN.** Bergantung G3-09.

**Kemudian §4 PEKERJAAN.md (boleh kapan saja):**

- **Dua temuan baru 2026-10-08** (keduanya dari G3-05, dan keduanya menunggu keputusan atau penyelidikan, bukan sekadar kerja): (a) **`e2e` tidak pernah hijau di mesin ini** — sebelas kegagalan yang sudah ada sebelum G3-05, didominasi galat halaman `SchemaError: DexieError`; (b) **katalog tangkapan layar yang dilacak git tidak cocok lagi** dengan yang dihasilkan spec (19 PNG baru tak terlacak, nama lama dan folder `mobile-dark` masih terlacak).
- **Pengukuran ulang G3-01 butir 9** — penahannya (G3-04) sudah selesai, jadi "label biaya pada tombol AI, pengumuman status, tombol coba lagi saat gagal" harus diukur ulang, bukan diasumsikan selesai.
- **D2 — perhitungan biaya saat sesi ditutup mengabaikan nominal manual.** Satu-satunya sisa yang menyentuh uang, dan sudah tercatat sebagai masalah nyata di `SERAH-TERIMA.md` §4.2.
- **D3** — 23 peta alias mapel lintas kurikulum (Nasional Informatika & Penjaskes masih memakai katalog ilmu komputer internasional).
- **Katalog topik** — 58 dari 78 pasangan mapel belum punya katalog; **D5** — periksa katalog IB.
- **D4 sisa separuh** — catatan palet terkunci. Setengah lainnya sudah tercapai 2026-10-07 lewat entri `keuangan-tagihan`.
- **D8** — flake beban-tinggi pada `report-export.spec.ts:85` dan `screenshot-katalog.spec.ts:139` (sudah berulang kali dibuktikan lulus sendirian).
- **Backlog** — jejak audit untuk perubahan sesi; temuan audit tampilan 2026-10-01 yang tersisa.
- Pemilih sub-layar keuangan (lihat bagian "Kenyataan yang menyimpang" di bawah).

**Sisa kecil dari G3-04:** daftar riwayat panggilan AI di Pengaturan, dan memindahkan pembacaan `pemakaian` di `Settings.tsx` ke hook supaya tidak ada dua pembacaan paralel.

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

Ditambahkan dari pengalaman 2026-10-08 (G3-05):

- **`e2e` di mesin ini TIDAK hijau, dan itu sudah begitu sebelum G3-05.** Terukur: 69 lulus / 11 gagal / 6 skip. Cara memisahkan regresi dari warisan: `git stash push -u`, jalankan spec yang sama di HEAD, lalu `git stash pop`. Hasil pengukuran 2026-10-08: `report-export-ratio` (3 layout × 2 project) dan `report-unlock` (× 2) gagal juga di HEAD dengan `SchemaError: DexieError`; `capture-closeout-failure` (× 2) gagal sendirian di HEAD dengan `DexieError`; `screenshot-katalog` "11-narasi-per-sesi" lulus sendirian (flake beban). **Jangan mengklaim "e2e hijau"** tanpa perincian ini.
- **Tombol yang selalu ada tidak bisa lagi dipakai sebagai penanda keadaan.** Enam spec Playwright menemukan "murid yang punya sesi bulan ini" dengan menunggu tombol `Buat Laporan` **muncul**; sejak G3-05 tombol itu selalu ada di bilah tetap dan hanya **nonaktif**. Polanya sudah diperbarui menjadi `await expect(...).toBeEnabled({ timeout })`. Kalau menulis spec laporan baru, pakai pola itu.
- **Jangan menyentuh berkas ber-UTF-8 lewat `Get-Content` + `Set-Content`.** PowerShell di mesin ini membaca UTF-8 sebagai ANSI, sehingga em dash, tanda kutip tipografis, dan centang berubah menjadi teks rusak — dan kerusakan di dalam string **tidak tertangkap penjaga mojibake**. Terjadi dua kali: `Payments.tsx` (2026-10-07, tertangkap penjaga) dan `MonthlyReport.tsx` (2026-10-08, tidak tertangkap; ketahuan dari peringatan git soal CRLF). Kalau sudah terjadi, pemulihannya: `[Text.Encoding]::UTF8.GetString([Text.Encoding]::GetEncoding(1252).GetBytes($teks))`, lalu tulis ulang dengan `UTF8Encoding($false)` dan akhir baris LF, dan **verifikasi dari byte**, bukan dari tampilan konsol.
- **Peringatan git "CRLF will be replaced by LF" saat `git stash` adalah sinyal kerusakan encoding.** Jangan diabaikan.
- **Setelah `npm run e2e`: `git checkout -- e2e/screenshots/` untuk berkas terlacak, lalu hapus PNG tak terlacak yang baru muncul.** Untuk menghapus, verifikasi dulu jalur absolutnya benar-benar di dalam `e2e/screenshots/`.
- **`npx vitest run <berkas>` GAGAL di sandbox ini** (`spawn EPERM`); yang bekerja adalah `npm run test:sandbox` atau `npx vitest run --pool=threads --maxWorkers=2 <berkas>`, keduanya dengan `NODE_OPTIONS` shim berjalur relatif di proses PowerShell yang sama.

Ditambahkan dari pengalaman 2026-10-10 (G3-06):

- **Hook React setelah gerbang `return` menjatuhkan SELURUH layar, dan hanya `eslint`/penjaga tampilan yang menangkapnya.** `useState` untuk menu aksi di `StudentDetail.tsx` diletakkan setelah `if (!student) return <Skeleton …/>`; akibatnya render pertama menjalankan hook lebih sedikit daripada render kedua, React melempar *"Rendered more hooks than during the previous render"*, dan halaman murid jatuh ke batas galat. `npx tsc -b` **lulus** dan suite tes **lulus** — yang menangkap adalah `npx eslint src` (aturan `react-hooks/rules-of-hooks`) dan `e2e:uiux` (gejalanya muncul sebagai "layar tanpa h1", karena yang terukur panel galat). **Jalankan `npx eslint src` sebelum menutup tugas, bukan sesudah push.**
- **Guard emoji `e2e:uiux` menolak emoji DI DALAM tombol/heading.** Tiga penanda tingkat kepentingan pada tombol kartu Perlu Tindakan (⚠️ 🔔 ℹ️) membuat dua tes merah di layar Detail Murid. Kebijakan yang berlaku: emoji hanya untuk **kosakata afektif** ber-`data-emoji-vocab="affect"`; penanda struktural wajib ikon SVG (`WarningIcon` · `BellIcon` · `InfoIcon`).
- **Berkas komponen tidak boleh mengekspor fungsi biasa.** `react-refresh/only-export-components` menyala walau fungsinya murni sekalipun. Pindahkan aturan murni ke modul sendiri — pola `raporForm.ts`, `studentConclusion.ts`, `perbandinganNilaiRows.ts`.
- **Nama berkas `.ts` yang berbeda hanya besar-kecil huruf dari sebuah `.tsx` menutupi komponennya di Windows.** TypeScript mencoba `.ts` **sebelum** `.tsx`, jadi `perbandinganNilai.ts` membuat impor `./PerbandinganNilai` dari `NilaiRapor.tsx` gagal dengan TS1192 ("has no default export"). Beri akhiran yang benar-benar berbeda.
- **Repo ini TIDAK memasang `jsdom` maupun `@testing-library/*`.** Komponen diuji dengan `renderToStaticMarkup` (lihat `nilaiRaporIsian.test.tsx`, `perluTindakanCard.test.tsx`), dan invarian struktural diuji dengan membaca berkas sumber lewat `?raw` (`nativeDialogs` · `moneyGate` · `studentSinglePath` · `studentFormGroups`). Menambah jsdom = menambah pustaka, dan itu butuh keputusan pemilik.
- **Satu flake guard tampilan yang terukur:** tes kontras layar Keuangan pada project `mobile` pernah gagal karena kolom PIN masih `disabled` (data contoh belum siap) sehingga `fill()` di `openPin()` menunggu sampai batas waktu tes; run penutup lulus penuh. Kalau menyentuh `e2e-uiux/uiux-metrics.spec.ts`, beri batas waktu pendek pada `fill()` di dalam lingkaran percobaan itu — **jangan** menaikkan batas 60 detik keputusan pemilik.

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
- **Layar Laporan sudah dirombak G3-05** (2026-10-08) dan **tidak perlu dikerjakan ulang**: `MonthlyReport.tsx` 1.470 baris, bilah aksi tetap + penunjuk lima langkah, panel hasil AI per sesi, penyimpanan narasi otomatis, penanda AI per isian, pratinjau ber-pembesaran, dan pratinjau susunan lewat `Modal`. **Tampilannya sudah dilihat pemilik di perangkat dan dinilai cukup** ("sudah sangat oke"), jadi butir daftar periksa 26–29 sudah dicentang — jangan diangkat lagi. **Ekspor tidak lagi menandai laporan "sudah dibagikan"** — itu keputusan yang disengaja (butir 3 G3-05) dan sudah disetujui lewat inspeksi; kalau pemilik ingin perilaku lama, itu satu baris di `useReportExport.ts`. **G3-08 bekerja di atas panel desain baru** (`src/screens/monthlyReport/DesignToolbar.tsx`), bukan lagi di `MonthlyReport.tsx`.

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
- **Butir #10 G3-06 tetap memakai pola halaman** (tombol Sebelumnya/Berikutnya), bukan tombol "muat
  20 lagi" seperti bunyi spesifikasinya — itu jawaban K5 pemilik 2026-10-09. Bagian yang wajib di
  butir itu, kontrol bersarang di `RiwayatSesi.tsx`, sudah dihapus (`e1106dd`). Jangan "membetulkan"
  ke tombol muat-lagi tanpa keputusan baru.
- **Pemotongan `StudentDetail.tsx` lewat ekstraksi modal, bukan pemecahan per tab.** Usulan
  `RingkasTab.tsx`/`SesiTab.tsx`/… di `docs/mockups/RENCANA-G3-06.md` §3 **tidak** dipakai; target
  ≤800 sudah tercapai tanpa itu. Jangan mengutip §3 sebagai keadaan hari ini.

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

1. **Agen boleh mencentang daftar periksa manual** (§5 `PEKERJAAN.md`, kini **33 butir**) — izin eksplisit
   pemilik, menyimpang dari kalimat "hanya pemilik yang boleh mencentang" di berkas itu. Centang
   berdasarkan bukti terukur, dan sebutkan di laporan bukti apa yang dipakai.
2. **Revisi boleh di-push ke `main`** setelah gate hijau dan rilis versi dinaikkan.

## Salinan selesai di sini

---

## Riwayat berkas ini

| Tanggal | Perubahan |
|---|---|
| 2026-10-07 | Dibuat untuk menyerahkan sisa Gelombang 3 ke sesi DSH baru setelah v1.95.0 dirilis. |
| 2026-10-08 | Diperbarui sesudah G3-05 tuntas dan v1.96.0 dirilis: keadaan terukur (v1.96.0 · suite 982/74 · `e2e` 69/11/6 dengan penjelasan bahwa sebelas kegagalan itu sudah ada sebelum G3-05), urutan pekerjaan (G3-06 lebih dulu, G3-05 dikeluarkan), dan lima jebakan baru dari putaran ini — terutama pola spec Playwright yang menemukan murid lewat tombol `toBeEnabled`, dan peringatan agar tidak menyentuh berkas ber-UTF-8 dengan `Get-Content`/`Set-Content`. |
| 2026-10-08 | Ditambahkan sesudah inspeksi pemilik: layar Laporan **sudah dilihat di perangkat dan dinilai cukup** ("sudah sangat oke"), butir daftar periksa 26–29 dicentang, dan catatan bahwa pemisahan istilah dibuat/dibagikan pada ekspor ikut disetujui lewat inspeksi itu. |
| 2026-10-10 | Diperbarui sesudah **G3-06 tuntas dan v1.97.0 dirilis**: keadaan terukur (v1.97.0 · suite 1197/89 · `e2e:uiux` **64/0** termasuk layar Detail Murid), urutan pekerjaan (G3-06 dikeluarkan, **G3-07 jadi yang pertama**), dan enam jebakan baru dari putaran ini — terutama **hook React setelah gerbang `return`** (menjatuhkan satu layar penuh, lolos dari `tsc` dan suite, hanya tertangkap `eslint` + `e2e:uiux`), emoji di dalam tombol yang ditolak guard, `react-refresh/only-export-components`, jebakan nama `.ts` vs `.tsx` di Windows, catatan bahwa repo **tidak** memasang jsdom, dan satu flake PIN di guard tampilan. Ditambahkan juga dua penyimpangan yang mengikat: butir #10 tetap berpola halaman, dan `StudentDetail.tsx` dipotong lewat ekstraksi modal (bukan pemecahan per tab). |
