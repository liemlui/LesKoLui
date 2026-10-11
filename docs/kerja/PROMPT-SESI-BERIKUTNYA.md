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

### Keadaan yang diukur pada 2026-10-11 (ukur sendiri, jangan percaya tulisan ini)

| Hal | Nilai saat berkas ini ditulis |
|---|---|
| Versi | v1.99.0 |
| Branch / HEAD | `main`, pohon kerja bersih sesudah G3-08 (`git status -sb` untuk selisih dengan `origin/main`) |
| Suite | 1.242 lulus / 91 berkas |
| `check:docs` | 0 rusak · 0 pelanggaran |
| `e2e:uiux` | **63 lulus / 1 gagal** — yang gagal adalah batas waktu `locator.fill` pada gerbang PIN `/payments — tiga blok`; **lulus 4/4 saat dijalankan sendirian**, jadi beban mesin. Jangan mengklaim "hijau" tanpa perincian ini |
| `e2e` | **67 lulus / 13 gagal / 6 skip**. Dua belas kegagalan persis daftar warisan 2026-10-08 (`report-export-ratio` 3×2, `report-unlock` ×2, `capture-closeout-failure` ×2, `finance` ×2 — `SchemaError: DexieError` atau batas waktu di bawah beban); yang ketiga belas `screenshot-katalog` "11-narasi-per-sesi" **lulus sendirian** |

Baris berkas besar yang menjadi target refactor (diukur dengan `npm run measure loc`):
`CaptureSession.tsx` **2.077** · `Settings.tsx` **1.387** (target ≤700, tugas berikutnya) · `payments/TagihanTab.tsx` **1.021** (target ≤800). `MonthlyReport.tsx` **1.470** (target ≤1.500) sudah tuntas. **`StudentDetail.tsx` **698** dengan sasaran **≤700** (keputusan pemilik 2026-10-11) — sisa 2 baris, jadi penambahan berikutnya wajib lewat komponen terpisah.** `StudentForm.tsx` 589 dan `Students.tsx` 519, keduanya masih di bawah sasarannya.

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

**Sisa Gelombang 3 — dua tugas, G3-08 sudah tuntas 2026-10-11:**

1. **G3-09 Pengaturan.** Refactor `Settings.tsx` 1.387 → ≤700 + 11 fitur. **Lima `confirm()` bawaan peramban masih hidup di berkas itu** (jalur restore dan hapus semua data), dan syarat selesai G3-09 sendiri sudah menuntut semuanya diganti dialog internal. **Kerjakan ini lebih dulu.**
2. **G3-10 Reset total dan PIN.** Bergantung pada G3-09.

**Menunggu mata pemilik (jangan dikerjakan agen):** butir daftar periksa manual **34–38** belum dicentang — **34–35** foto murid (ditambahkan 2026-10-11), dan **36–38** panel desain laporan + perancang tema + tiga grafik Keuangan (ditambahkan 2026-10-11 bersama G3-08). Butir 35 memeriksa jalur **Batal** sesudah menghapus foto, dan butir 36–38 memeriksa hal yang memang tidak bisa dinilai dari kode.

**Kemudian §4 PEKERJAAN.md (boleh kapan saja):**

- **Tiga temuan baru 2026-10-11 (G3-08):** (a) **sub-layar `?tab=ringkasan` layar Keuangan belum masuk cakupan `e2e:uiux`** — itulah sebabnya cacat urutan `yRange` pada `LineChart` lolos dari tipe, suite, **dan** penjaga tampilan, lalu ditemukan tangkapan layar; menambahkannya = penjaga baru, butuh keputusan pemilik; (b) `useWebWorker` yang sepuluh kali lebih lambat; (c) baris sasaran `StudentDetail.tsx` yang sudah hampir penuh.
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

Ditambahkan dari pengalaman 2026-10-11 (G3-08):

- **`tsc` dan suite tes TIDAK menangkap kesalahan urutan deklarasi pada waktu jalan.** Menaruh perhitungan yang memakai `yRange` **sebelum** `const yRange` di `LineChart.tsx` membuat **seluruh sub-layar analitik Keuangan jatuh ke batas galat** (`Cannot access 'yRange' before initialization`) sementara `npx tsc -b` lulus, 1.242 tes lulus, **dan** `e2e:uiux` lulus. **Perubahan tampilan wajib dilihat dengan mata** (tangkapan layar), bukan hanya diuji. Alat siap pakai: `.design-audit/g3-08/` — jalankan dari `les-ko-lui/` dengan `npx playwright test --config=../.design-audit/g3-08/audit.config.ts`.
- **`e2e:uiux` TIDAK mengukur sub-layar `?tab=ringkasan`** — hanya `/payments` polos dan `?tab=tagihan`. Tiga grafik (tren kas, potensi per murid, donat pengeluaran) hidup di sub-layar itu, jadi ia tidak punya penjaga otomatis sama sekali. Menambahkan entri `keuangan-ringkasan` ke `SCREENS` = penjaga baru, butuh keputusan pemilik; tercatat di `PEKERJAAN.md` bagian 4.
- **Chip susunan laporan kini `role="radio"` di dalam `radiogroup`, bukan `role="button"`.** Spec yang mencari `getByRole("button", { name: <nama susunan> })` menunggu selamanya. Wadahnya `#panel-susunan-laporan`; chip tema ada di `#panel-tema-laporan`. `<details>` desain sekarang difilter dengan teks **`"Tema:"`**, bukan `"🎨"`.
- **Sesudah PIN Keuangan dibuka, JANGAN `page.goto()` lagi** di spec atau alat pemeriksa visual: buka-kunci berlaku selama aplikasi terbuka (keputusan **B2**), dan memuat ulang mengembalikannya ke gerbang PIN. Berpindah sub-layar lewat pintasan **"Analitik lanjutan"**. Gejalanya menipu: yang terpotret adalah **layar PIN**, bukan layar tujuan.
- **Kartu tema bertanda centang: pakai bentuk, bukan hanya warna.** Warna saja tidak terbaca pembaca layar dan tidak terlihat oleh tutor dengan buta warna; `CheckIcon` + `aria-checked` menyelesaikannya.
- **Nama variabel dan kolom data berbasis "piutang" JANGAN diubah** saat merapikan istilah antarmuka (`cash.piutang`, `r.piutang`, `agedPiutang`, `piutangDetail`). Glosarium hanya menyentuh **teks yang dibaca tutor**; **isi CSV juga tidak disentuh** karena formatnya dibekukan `csv.test.ts`.
- **Menukar dua baris tabel markdown dengan `edit` berbasis jangkar teks mudah salah** — jangkar yang cocok di dua baris membuat satu baris tertimpa. Setelah menyunting tabel riwayat, periksa **nomor baris** tiap baris tanggal (`Select-String -Pattern '^\| 2026-10-11'`) dan urutannya (terbaru di atas). Menukar dua baris penuh lebih aman lewat skrip yang memverifikasi prefiks barisnya dulu.

Ditambahkan dari pengalaman 2026-10-10 (G3-06):

- **Hook React setelah gerbang `return` menjatuhkan SELURUH layar, dan hanya `eslint`/penjaga tampilan yang menangkapnya.** `useState` untuk menu aksi di `StudentDetail.tsx` diletakkan setelah `if (!student) return <Skeleton …/>`; akibatnya render pertama menjalankan hook lebih sedikit daripada render kedua, React melempar *"Rendered more hooks than during the previous render"*, dan halaman murid jatuh ke batas galat. `npx tsc -b` **lulus** dan suite tes **lulus** — yang menangkap adalah `npx eslint src` (aturan `react-hooks/rules-of-hooks`) dan `e2e:uiux` (gejalanya muncul sebagai "layar tanpa h1", karena yang terukur panel galat). **Jalankan `npx eslint src` sebelum menutup tugas, bukan sesudah push.**
- **Guard emoji `e2e:uiux` menolak emoji DI DALAM tombol/heading.** Tiga penanda tingkat kepentingan pada tombol kartu Perlu Tindakan (⚠️ 🔔 ℹ️) membuat dua tes merah di layar Detail Murid. Kebijakan yang berlaku: emoji hanya untuk **kosakata afektif** ber-`data-emoji-vocab="affect"`; penanda struktural wajib ikon SVG (`WarningIcon` · `BellIcon` · `InfoIcon`).
- **Berkas komponen tidak boleh mengekspor fungsi biasa.** `react-refresh/only-export-components` menyala walau fungsinya murni sekalipun. Pindahkan aturan murni ke modul sendiri — pola `raporForm.ts`, `studentConclusion.ts`, `perbandinganNilaiRows.ts`.
- **Nama berkas `.ts` yang berbeda hanya besar-kecil huruf dari sebuah `.tsx` menutupi komponennya di Windows.** TypeScript mencoba `.ts` **sebelum** `.tsx`, jadi `perbandinganNilai.ts` membuat impor `./PerbandinganNilai` dari `NilaiRapor.tsx` gagal dengan TS1192 ("has no default export"). Beri akhiran yang benar-benar berbeda.
- **Repo ini TIDAK memasang `jsdom` maupun `@testing-library/*`.** Komponen diuji dengan `renderToStaticMarkup` (lihat `nilaiRaporIsian.test.tsx`, `perluTindakanCard.test.tsx`), dan invarian struktural diuji dengan membaca berkas sumber lewat `?raw` (`nativeDialogs` · `moneyGate` · `studentSinglePath` · `studentFormGroups`). Menambah jsdom = menambah pustaka, dan itu butuh keputusan pemilik.
- **Satu flake guard tampilan yang terukur:** tes kontras layar Keuangan pada project `mobile` pernah gagal karena kolom PIN masih `disabled` (data contoh belum siap) sehingga `fill()` di `openPin()` menunggu sampai batas waktu tes; run penutup lulus penuh. Kalau menyentuh `e2e-uiux/uiux-metrics.spec.ts`, beri batas waktu pendek pada `fill()` di dalam lingkaran percobaan itu — **jangan** menaikkan batas 60 detik keputusan pemilik.

Ditambahkan dari pengalaman 2026-10-11 (G3-07):

- **Menghitung pasangan `createObjectURL`/`revokeObjectURL` dari berkas sumber TIDAK BISA DIPERCAYA.** Penjaga pertama untuk foto murid membandingkan jumlah keduanya per berkas dan **salah menuduh kode yang benar di tujuh berkas**: `useBlobUrl.ts` memasang URL di dalam `try` dan melepasnya lewat cleanup `useEffect` di baris lain, sementara `foto.ts` membuat **satu** URL dan melepasnya di **dua** jalur — `img.onload` dan `img.onerror`. Itu bentuk yang benar, bukan kebocoran. Penjaga itu **dibuang**, bukan dilonggarkan; penggantinya adalah pengujian runtime pada hook (`renderToStaticMarkup` + `URL.createObjectURL` yang dipalsukan) ditambah penyerahan pelepasan pada render nyata ke `e2e:uiux`. **Pelajaran umumnya: kalau sebuah invarian tidak bisa diuji runtime di suite ini, ujilah di peramban — jangan ditebak dari teks sumber.**
- **Playwright mengabaikan berkas spec yang berada di dalam direktori berawalan titik, walau `testDir` menunjuk langsung ke sana dan `testMatch` cocok.** Gejalanya `Error: No tests found` tanpa petunjuk apa pun. Terjadi pada harness pengukuran di `.design-audit/g3-07/`. Jalan keluarnya: jangan letakkan spec di sana — pakai skrip Node yang memanggil Chromium langsung (`chromium.launch()` dari paket `playwright`), seperti `.design-audit/g3-07/measure.mjs`.
- **Chromium menolak impor modul lintas berkas pada halaman `file://`** (CSP bawaan) sehingga pustaka tidak pernah termuat dan pengukuran menggantung tanpa galat yang jelas. Untuk mengukur barang peramban, layani halamannya lewat HTTP: `python -m http.server 5199 --directory .` lalu buka `http://localhost:5199/...`. Perhatikan juga bahwa `python -m http.server` mewarisi direktori kerja pemanggilnya — pakai `--directory` eksplisit.
- **`useWebWorker: true` membuat pengecilan foto ±10× lebih lambat dengan hasil identik byte-per-byte** (terukur 3.270 ms vs 325 ms pada gambar 3.000×4.000 px). Berlaku untuk `compressPhoto()` di ketiga pemakainya (foto murid, foto sesi, logo). Belum diputuskan; alat ukurnya sudah ada.
- **`maxSizeMB` menekan mutu lebih dulu, sehingga jumlah piksel hasilnya bisa jauh di bawah `maxWidthOrHeight`.** Terukur: gambar 3.000×4.000 px keluar **480×640 px**, bukan 640×853. Jadi jangan menulis jaminan ukuran berkas di antarmuka hanya dari nilai `maxSizeMB` — ukur dulu, lalu tulis apa adanya.
- **`sr-only` tidak mengeluarkan kontrol dari urutan fokus.** Input berkas yang disembunyikan tetap bisa difokus papan ketik; tambahkan `tabIndex={-1}` dan biarkan tombol yang terlihat menjadi satu-satunya jalan masuknya.
- **Sasaran baris `StudentDetail.tsx` yang berlaku adalah ≤700** (keputusan pemilik 2026-10-11), dan berkasnya terukur **698**. Setiap penambahan di berkas itu harus lewat komponen terpisah. Angka ≤800 yang tertulis di bagian G3-06 `PEKERJAAN.md` adalah catatan keadaan saat G3-06 ditutup, bukan sasaran yang berlaku.
- **`undefined` pada `db.students.update()` menghapus kolomnya.** Itulah mekanisme "Hapus foto"; jangan menambahkan cadangan `?? existing.photo` yang akan membuat tombol hapus tidak pernah berpengaruh.

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
- **Foto murid diselesaikan dengan tiga penyimpangan yang disetujui pemilik 2026-10-11** (G3-07), dan ketiganya mengikat pekerjaan berikutnya: (a) **pemotongan bulat lewat CSS saja** — isi blob tidak pernah dipotong, sehingga berkas backup tidak kehilangan bagian gambar; (b) **tombol Hapus foto baru berlaku saat Simpan** — pratinjau dikosongkan lebih dulu, dan Batal tetap berarti "tidak ada yang berubah"; (c) **batas 150 KB tidak dijanjikan di antarmuka** — yang ditulis adalah batas piksel yang dijamin mesin (640 px) beserta ukuran hasil yang biasa muncul, karena pengukuran menunjukkan `maxSizeMB` menekan mutu lebih dulu sehingga berkasnya justru jauh lebih kecil. Jangan "mengembalikan" kalimat lama yang menjanjikan 150 KB.

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
| 2026-10-11 | Diperbarui sesudah **G3-07 tuntas dan v1.98.0 dirilis**: keadaan terukur (v1.98.0 · suite **1226/90** · `e2e:uiux` **64/0** · `e2e` **68/12/6** dengan catatan bahwa satu kegagalan tambahan belum dipastikan warisan), urutan pekerjaan (G3-07 dikeluarkan, **G3-08 jadi yang pertama**, dan butir periksa manual 34–35 ditandai menunggu mata pemilik), serta **delapan jebakan baru** — terutama bahwa **menghitung pasangan `createObjectURL`/`revokeObjectURL` dari berkas sumber tidak bisa dipercaya** (penjaga pertama salah menuduh kode yang benar di tujuh berkas lalu dibuang), **Playwright mengabaikan spec di dalam direktori berawalan titik** (`No tests found` tanpa petunjuk), **Chromium menolak impor modul di halaman `file://`**, `useWebWorker` yang ±10× lebih lambat dengan hasil identik, `maxSizeMB` yang menekan mutu lebih dulu sehingga piksel hasilnya di bawah 640, `sr-only` yang tidak mengeluarkan kontrol dari urutan fokus, sasaran baris `StudentDetail.tsx` yang sekarang **≤700** dan hampir penuh (698), dan `undefined` pada `db.students.update()` yang **menghapus** kolomnya. Ditambahkan juga bagian penyimpangan G3-07: pemotongan lewat CSS, hapus-foto-berlaku-saat-Simpan, dan larangan mengembalikan janji "paling besar 150 KB" di antarmuka. |
