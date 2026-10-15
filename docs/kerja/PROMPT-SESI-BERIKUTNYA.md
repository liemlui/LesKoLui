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

1. `les-ko-lui/docs/kerja/ATURAN-AI.md` — KONTRAK. Delapan bagian: §1 cara bekerja +
   tabel gate dua tingkat · **§1.1 goal dan todos wajib setiap pekerjaan** · §2 integritas dokumen ·
   §3 berkas terlarang · §4 keputusan final pemilik (B1–B4, D1–D8) · §5 fakta kode · §6 perintah +
   lingkungan sandbox · §7 jebakan · §8 bentuk laporan. **Nomor bagiannya berubah 2026-10-07** —
   kalau ada dokumen menunjuk §0, §2.1–§2.3, §6.1–§6.4, atau §9, nomor itu sudah tidak ada
   (peta lama→baru di `docs/arsip/README.md` §6).
2. `les-ko-lui/docs/kerja/PEKERJAAN.md` — SATU-SATUNYA daftar pekerjaan. Spesifikasi lengkap
   G3-01…G3-10 ada di §3, pekerjaan tanpa dokumen tugas di §4, daftar periksa manual (**44 butir**)
   di §5.
3. `les-ko-lui/docs/kerja/SERAH-TERIMA.md` — keadaan + batas kejujuran yang belum beres.
   Bagian 3 dan 4 saja.
4. `les-ko-lui/docs/kerja/CHEATSHEET.md` — jangkar kode dan jebakan per tugas (ringkasan).
5. Baru buka SATU `docs/kerja/TASK-XX` yang relevan kalau perlu detail. `docs/RIWAYAT-RILIS.md`
   hanya kalau butuh alasan historis. `docs/arsip/**` beku — jangan kutip angkanya.

### Keadaan yang diukur pada 2026-10-14 (ukur sendiri, jangan percaya tulisan ini)

| Hal | Nilai saat berkas ini ditulis |
|---|---|
| Versi | v1.103.0 |
| Branch / HEAD | `main` (jalankan `git status -sb` untuk selisih dengan `origin/main`; putaran 2026-10-14 sesudah v1.103.0 **periksa sendiri apakah sudah terdorong**) |
| Suite | **1.409 lulus / 101 berkas · 0 gagal** (diukur 2026-10-14, `npm run test:sandbox`). Putaran itu menambah tes di `captureSessionHelpers.test.ts` (+4), `auditDisplay.test.ts` (+6), `sessionPricing.test.ts` (+3 untuk D2), dan berkas alat ukur baru `topicGapCount.test.ts` (+1) |
| `tsc -b` · `eslint src` | bersih sesudah putaran 2026-10-14 (v1.102.0) |
| `check:docs` | 0 rusak · 0 pelanggaran |
| `e2e:uiux` | **64 lulus / 0 gagal** (5,8 menit, dijalankan 2026-10-14). **Artefak terukur layar yang berubah, dua viewport:** `/capture` → `h1` 1 · `h2` 1 · kontras 0 pelanggaran · kontrol <24 px 0 · emoji 0 · teks <12 px 0 · terpotong 0; `/settings` → sama, dengan `under44Count` 2 dan `truncCount` 1 yang **tidak diuji ambangnya** (kontrol sekunder boleh 24–36 px; elemen mana yang terpotong belum diperiksa satu per satu) |
| `e2e` | **67 lulus / 13 gagal / 6 skip** (potret 2026-10-11 sesudah G3-08). Dua belas kegagalan persis daftar warisan 2026-10-08 (`report-export-ratio` 3×2, `report-unlock` ×2, `capture-closeout-failure` ×2, `finance` ×2 — `SchemaError: DexieError` atau batas waktu di bawah beban); yang ketiga belas `screenshot-katalog` "11-narasi-per-sesi" **lulus sendirian** |

Baris berkas besar yang menjadi target refactor (diukur sendiri 2026-10-14, `npm run measure loc`):
`CaptureSession.tsx` **2.108** · `Settings.tsx` **637** (sasaran ≤700, **tercapai**) · `payments/TagihanTab.tsx` **1.021** (sasaran ≤800, belum) · `MonthlyReport.tsx` **1.469** (sasaran ≤1.500, tercapai). **`StudentDetail.tsx` 698 dengan sasaran ≤700** (keputusan pemilik 2026-10-11) — sisa 2 baris, jadi penambahan berikutnya wajib lewat komponen terpisah. `StudentForm.tsx` 589 dan `Students.tsx` 519, keduanya masih di bawah sasarannya.

### WAJIB SEBELUM LANGKAH PERTAMA: goal + todos

**Keputusan pemilik 2026-10-11 (`ATURAN-AI.md` §1.1).** Pemilik memantau kemajuan dari pelacak yang
hidup, bukan dari laporan lisan. Sebelum menyentuh berkas apa pun, untuk **setiap** pekerjaan —
termasuk perubahan dokumen dan penyelidikan kecil:

1. buat **goal** (`create_goal`) yang memuat sasaran konkret dan bisa diperiksa, bukan "mengerjakan tugas";
2. buat **daftar todos** (`todo_write`) yang memuat seluruh langkahnya sejak awal.

Lalu: tandai `completed` segera setelah langkahnya benar-benar selesai, dan **tutup goal dengan
`complete`** saat pekerjaannya tuntas. Goal yang dibiarkan terbuka setelah pekerjaan selesai merusak
pemantauan, karena ia tampak seperti pekerjaan yang masih berjalan. `blocked` hanya setelah
penghambat yang sama bertahan tiga putaran.

Ini **tidak** bertentangan dengan aturan "satu tugas tuntas lalu lapor sekali": yang dilarang adalah
**melapor** per langkah, bukan **mencatat** kemajuan. Kalau alatnya tidak tersedia di sesi itu,
tulis apa adanya di laporan sebagai batas kejujuran — jangan mengaku sudah melacak.

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

**Sisa Gelombang 3 — TIDAK ADA TUGAS KODE TERSISA.** Diperbarui 2026-10-11 sesudah G3-10 butir 3
(v1.101.0). Yang benar-benar tersisa di gelombang ini hanyalah pekerjaan tangan pemilik:

1. **G3-09 Pengaturan.** Target baris tercapai (`Settings.tsx` **566** baris), kesebelas fitur terpasang,
   gate mesin hijau (`tsc` · `eslint` · suite · `build` · `check:docs` · `e2e:uiux` 64/0). Yang tersisa
   **hanya** tampilannya yang belum pernah dilihat mata pemilik.
2. **G3-10.** **Empat dari lima butir selesai.** Butir 3 (ajakan memasang PIN baru sesudah reset)
   ditutup 2026-10-11. **Butir 5** (uji memakai data contoh) sudah dipindahkan menjadi **butir 39**
   daftar periksa manual, karena hanya bisa dijalankan pemilik di server pengembangan — di alamat
   online tidak ada pemuat data contoh sehingga yang terhapus adalah data asli.

**Menunggu mata pemilik (jangan dikerjakan agen) — kini 22 dari 44 butir belum bertanda ✅:** daftar periksa manual **34–35**
(foto murid, ditambahkan 2026-10-11), **36–38** (panel desain laporan + perancang tema + tiga grafik
Keuangan, ditambahkan 2026-10-11 bersama G3-08), **39** (jalur reset total + ajakan PIN baru,
ditambahkan 2026-10-11 bersama G3-10 butir 3 — **wajib di server pengembangan**), **40–43** (backup
manual · biaya di kedua tombol AI · tombol Coba lagi · biaya di Riwayat Aktivitas, ditambahkan
2026-10-14 bersama **v1.102.0**), **44** (nominal manual tidak tertimpa saat sesinya dicatat,
ditambahkan 2026-10-14 bersama **v1.103.0** — **menyentuh uang, jangan dilewati**), dan **butir daftar
periksa untuk layar Pengaturan yang belum dibuat** (v1.100.0–v1.109.0 sama-sama menyentuh layar itu
tanpa punya butirnya sendiri).

> **Yang sudah bertanda dan tidak perlu diulang** (jangan mengutip "1–23 terbuka" sebagai penghitung
> sisa — 2026-10-15 tiga di antaranya dibetulkan): **4 · 5 · 6 · 24 · 25** ditutup pemilik 2026-10-07,
> **26–29** pada 2026-10-08, **30–33** pada 2026-10-10 di HP, **34–38** pada 2026-10-14 di server dev,
> dan **40 · 41 · 43 · 44** pada 2026-10-14. **Sisa yang benar: butir 1, 2, 3, dan 7–23** (dua puluh
> butir, belum pernah dicentang) **+ butir 39 dan 42.** Untuk butir **42**, yang ditunggu bukan lagi
> tombol "Coba lagi" (itu sudah tertutup bersama butir 41) melainkan bukti bahwa **percobaan ulangnya
> berhasil** sesudah v1.105.0/v1.107.0 — pemilik mencobanya 2026-10-14 dan panggilan AI-nya masih gagal
> karena konteks terlalu panjang. Panduan langkah-demi-langkahnya ada di
`PANDUAN-CEK-DI-HP.md` **bagian F** (butir 40–44), lengkap dengan tabel keadaan supaya tidak ada
pemeriksaan yang diulang.

**Kemudian §4 PEKERJAAN.md (boleh kapan saja):**

- **Dua temuan baru 2026-10-14 (putaran verifikasi):** (a) **skrip `.design-audit/topic-coverage-audit.mjs` yang disebut sebagai alat ukur katalog topik TIDAK ADA di repositori** — angkanya karena itu tidak bisa direproduksi; penggantinya `src/__tests__/topicGapCount.test.ts` (selalu lulus, mencetak angkanya). (b) **D3 tidak bisa dikerjakan apa adanya** karena daftar "23 peta alias" juga berasal dari skrip itu; daftarnya harus dibangun ulang lebih dulu, dan **angka 23 tidak boleh dikutip**.
- **Tiga temuan baru 2026-10-11 (G3-08):** (a) **sub-layar `?tab=ringkasan` layar Keuangan belum masuk cakupan `e2e:uiux`** — itulah sebabnya cacat urutan `yRange` pada `LineChart` lolos dari tipe, suite, **dan** penjaga tampilan, lalu ditemukan tangkapan layar; menambahkannya = penjaga baru, butuh keputusan pemilik; (b) `useWebWorker` yang sepuluh kali lebih lambat; (c) baris sasaran `StudentDetail.tsx` yang sudah hampir penuh.
- **Dua temuan baru 2026-10-08** (keduanya dari G3-05, dan keduanya menunggu keputusan atau penyelidikan, bukan sekadar kerja): (a) **`e2e` tidak pernah hijau di mesin ini** — sebelas kegagalan yang sudah ada sebelum G3-05, didominasi galat halaman `SchemaError: DexieError`; (b) **katalog tangkapan layar yang dilacak git tidak cocok lagi** dengan yang dihasilkan spec (19 PNG baru tak terlacak, nama lama dan folder `mobile-dark` masih terlacak).
- **Pengukuran ulang G3-01 butir 9** — **SUDAH DIUKUR DAN DIKERJAKAN 2026-10-14 (v1.102.0).** Hasil pengukurannya: ketiga syaratnya **tidak satu pun** terpasang di HEAD, padahal penahannya (G3-04) sudah selesai sejak 2026-10-07. Sekarang label biaya ada di tombol AI (`labelBiayaAi()`), status diumumkan (`aria-live` + `role="alert"`), dan ada tombol **Coba lagi** untuk panggilan AI yang gagal. **Jangan diukur ulang.**
- **Syarat "riwayat panggilan AI menampilkan waktu, fitur, dan biaya" (G3-04)** — **SUDAH DITUTUP 2026-10-14 (v1.102.0).** `auditAiDetail()` di `lib/auditDisplay.ts` menampilkan fitur + biaya di Riwayat Aktivitas; sebelum itu kolomnya ditulis tetapi tidak dibaca layar mana pun.
- **D2 — perhitungan biaya saat sesi ditutup mengabaikan nominal manual.** **SELESAI 2026-10-14 (v1.103.0).** `markSessionDone` tidak pernah memeriksa `costOverride`, sehingga nominal manual pada sesi terjadwal hilang tepat saat sesinya dicatat; dibuktikan sebagai tes merah lebih dulu, lalu dikunci tiga tes. **Tidak ada lagi sisa pekerjaan yang menyentuh uang** — kecuali temuan `rescheduleSession` di bawah, yang juga menyentuh uang tetapi **butuh keputusan pemilik** karena meneruskan nominal manualnya mengubah jumlah yang ditagih.
- **Temuan baru 2026-10-14 (dari perbaikan D2): `rescheduleSession` membuang `costOverride`.** Sesi pengganti dibuat dengan hitungan otomatis (`sessionRepo.ts:517-531`), jadi menjadwalkan ulang sesi yang punya nominal manual membuat nominalnya kembali ke tarif **tanpa pemberitahuan**. Dua pilihan ada di `PEKERJAAN.md` §4; yang lebih kecil risikonya adalah **memberi tahu tutor di konfirmasi** bahwa nominal manual akan dilepas.
- **D3** — **statusnya berubah 2026-10-14: dua kasus terjelasnya sudah benar di kode** (`resolveSubjectAliases("Informatika")` → `["informatika"]`, `("Penjaskes")` → `["penjaskes"]`), jadi barisnya tidak lagi "Belum". Yang tersisa: meninjau **seluruh** peta alias, dan itu **tidak bisa dimulai** sebelum daftar temuan lama dibangun ulang (skripnya hilang).
- **Katalog topik** — **109 dari 167 pasangan punya katalog · 58 belum** (diukur 2026-10-14). **D5** — periksa katalog IB terhadap panduan silabus resmi; **butir ini sudah pernah "selesai" di kode tetapi belum pernah diverifikasi, jangan disebut terverifikasi.**
- **D4** — **SUDAH SELESAI seluruhnya 2026-10-14.** Tab tagihan sudah dijaga entri `keuangan-tagihan`, dan "jejak perubahan warna/token" memang sudah dijalankan lewat riwayat 2026-10-03 · G3-08 · G3-09 · G3-10. **Tidak ada berkas "palet terkunci" yang perlu dibuat** — keputusan pemilik berbunyi "dicatat di bagian riwayat tugas dengan alasan dan tanggal", yaitu kewajiban pencatatan.
- **D6** — **SUDAH TERPENUHI, jangan dikerjakan.** H1 "Keuangan" → 3×H2 tanpa lompatan level (terukur di `.design-audit/uiux-guard/*-keuangan.json`).
- **D8** — flake beban-tinggi pada `report-export.spec.ts:85` dan `screenshot-katalog.spec.ts:139` (sudah berulang kali dibuktikan lulus sendirian).
- **Backlog** — jejak audit untuk perubahan sesi; temuan audit tampilan 2026-10-01 yang tersisa.
- Pemilih sub-layar keuangan (lihat bagian "Kenyataan yang menyimpang" di bawah).

**Sisa kecil dari G3-04:** **SUDAH DITUTUP 2026-10-14.** "Daftar riwayat panggilan AI di Pengaturan" kini ada (`auditAiDetail()` di `lib/auditDisplay.ts`, ditampilkan `settings/AuditLogViewer.tsx`), dan `pemakaian` tetap dibaca lewat satu jalur `useLiveQuery` yang diteruskan sebagai prop ke `AiSection` — tidak ada dua pembacaan paralel.

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

Ditambahkan dari pengalaman 2026-10-14 (putaran verifikasi + rilis v1.102.0):

- **Status butir di dokumen bisa salah ke DUA arah, dan yang menentukan hanya `grep` ke kode.** Dua kali sekarang: G3-10 ditulis "belum" padahal empat dari lima butirnya sudah ada (2026-10-11), dan putaran ini menemukan kebalikannya — **G3-01 butir 9 dan syarat riwayat AI G3-04 ditulis "selesai"/"tertahan" padahal syaratnya tidak satu pun terpasang**. Aturan praktis: sebelum menutup atau mengerjakan butir, buka berkasnya dan cari fiturnya; jangan percaya kata "selesai" di tabel keadaan.
- **"Tertahan sampai tugas X dikerjakan" kehilangan artinya begitu X selesai — dan tidak ada gate yang memberi tahu.** `tsc` tidak mengeluh soal fitur yang tidak pernah ditulis, dan suite tidak punya tes untuknya. Kalau sebuah butir punya penahan, **catat tanggal pemeriksaan ulangnya** saat penahannya selesai.
- **Perbaikan yang menyentuh perilaku terlihat pengguna tidak boleh ditinggal tanpa nomor versi.** Perbaikan sandi backup (`80af587`) sudah dikomit dan sudah punya tes, tetapi `package.json`, `CHANGELOG`, dan `RIWAYAT-RILIS` tidak disentuh — akibatnya satu-satunya cara mengetahui perbaikan itu ada adalah membuka `git log`, dan dokumen tetap menyebut versi lama. Jalankan rilis tiga berkas itu pada putaran yang sama.
- **Alat ukur yang disebut dokumen bisa tidak ada sama sekali.** `.design-audit/topic-coverage-audit.mjs` disebut sebagai sumber angka katalog topik dan **tidak ada di repositori** (folder `.design-audit/` juga **tidak dilacak git**), sehingga angkanya tidak bisa direproduksi siapa pun. Sebelum mengutip angka dari dokumen, **jalankan perintah pengukurnya**; kalau perintahnya tidak ada, ganti dengan alat yang benar-benar ada di repo (contoh: `src/__tests__/topicGapCount.test.ts`).
- **Penyebut sebuah pecahan lebih mudah basi daripada pembilangnya.** Baris "dua puluh dari tujuh puluh delapan pasangan" salah **penyebut** selama berhari-hari: yang benar 167 pasangan, bukan 78. Menyalin angka tanpa menjalankan pengukurnya menyembunyikan kesalahan seperti ini.
- **Menyisipkan tes "alat ukur" itu boleh, tetapi jangan menyamarkannya sebagai penjaga.** `topicGapCount.test.ts` selalu lulus dan hanya mencetak angka; komentar di berkasnya menjelaskan hal itu. Kalau kelak angka itu mau dijadikan ambang, itu **penjaga baru** dan butuh keputusan pemilik (§1 butir 4).
- **Cara mengukur biaya AI di bawah satu rupiah: bulatkan KE ATAS.** `labelBiayaAi()` dan `auditAiDetail()` memakai `Math.max(1, Math.ceil(...))`. Membulatkan ke bawah menghasilkan "Rp 0" — angka yang justru menyatakan panggilannya gratis, padahal biayanya dicatat.
- **`await locator.fill()` tanpa opsi memakai batas waktu SELURUH test, bukan batas waktu aksi.** Itu akar flake `e2e:uiux` yang sudah tercatat sejak 2026-10-10 tetapi belum diperbaiki: di dalam lingkaran percobaan `openPin()` (`e2e-uiux/uiux-metrics.spec.ts`), satu momen "kolom PIN muncul tetapi belum aktif" membuat `fill()` menunggu sampai 60 detik habis — sehingga keenam percobaan tidak pernah benar-benar dijalankan, dan hasilnya **3 dari 64 tes gagal** pada run 2026-10-14 (dua di sub-layar Tagihan, satu di layar Keuangan — **bukan** layar yang sedang diubah). Perbaikan yang dipakai: `fill(..., { timeout: 2_000 })` + `click(..., { timeout: 2_000 })` di dalam lingkaran itu. Belum ada tes baru untuk ini, karena yang dibuktikan adalah run penuh yang hijau. **Jangan** menaikkan batas 60 detik (keputusan pemilik).
- **Gejala "element is not enabled" lalu "element was detached from the DOM" pada kolom PIN adalah tanda data contoh belum selesai disemai** — bukan tanda gerbang PIN-nya rusak. Jangan mengubah komponen PIN karena gejala ini.

Ditambahkan dari pengalaman 2026-10-11 (G3-10 butir 3):

- **Status sebuah tugas di dokumen bisa SALAH, dan satu-satunya cara memeriksanya adalah `grep` ke kode.** `PEKERJAAN.md` dan `SERAH-TERIMA.md` sama-sama menulis G3-10 "belum" selama beberapa hari, padahal **butir 1, 2, dan 4-nya sudah ada di kode sejak G3-09** (`dangerZoneRows.ts` · `DangerZoneSection.tsx` · `dangerZoneActions.ts`). Tidak ada gate yang bisa menangkapnya: `tsc` tidak mengeluh soal fitur yang tidak pernah ditulis, dan suite tidak punya tes untuknya. **Sebelum mengerjakan tugas yang ditandai "belum", periksa dulu apakah butir-butirnya sudah ada di kode.** Kelas yang sama dengan dua sub-butir G3-09 yang sempat terlewat (`grep installInstructions` → 0 pemakaian).
- **Penanda lintas-reload untuk sesuatu yang ikut terhapus reset HARUS hidup di luar basis data.** Tabel `settings` (tempat PIN Keuangan) dibersihkan `db.transaction`, jadi penanda di dalamnya mustahil dibaca sesudahnya — penandanya dipasang di `localStorage` (`leskolui_pin_reset_pending`). Perhatikan bahwa ini **kebalikan** dari `leskolui_last_auto_backup_prompt`, yang justru sengaja dibuang supaya pengingatnya muncul lagi: jangan menyeragamkan keduanya.
- **Saat menulis penanda di `localStorage` dari jalur yang baru saja menghapus tabel, tulis SESUDAH pembersihan.** `localStorage` tidak ikut dibersihkan `db.transaction`, tetapi menulis lebih dulu berarti penandanya hidup berdampingan dengan data yang belum terhapus — dan bila kelak pembersihannya diperluas, urutan yang salah akan menghapusnya. Urutannya diuji lewat pembacaan sumber `?raw`, bukan diingat.
- **Penjaga untuk "fitur yang seharusnya ada" butuh DUA lapis: perilaku DAN sambungan.** `pinResetInvite.test.ts` menguji fungsi murni dengan `Storage` palsu **dan** membaca berkas sumber `?raw` untuk membuktikan penandanya benar-benar ditulis saat reset dan dibaca saat halaman dibuka. Tanpa lapis kedua, modul yang benar tetapi **tidak dipanggil siapa pun** akan tampak hijau — persis bagaimana butir ini bisa terlewat.
- **`useLiveQuery` lewat `useSettingsQuery()` membuat keadaan hilang-sendiri gratis.** Banner ajakan PIN menghilang begitu PIN tersimpan tanpa satu baris kode tambahan, karena syarat tampilnya `tampilkanAjakanPin(penandaAda, adaPin)` dibaca dari pengaturan yang reaktif. Lebih baik daripada memasang pembersih di dua tempat.
- **Jangan menaruh penanda "sudah dibaca" pada tombol yang mengarahkan, taruh pada aksi yang benar-benar menyelesaikan.** Penanda ajakan PIN dibuang di jalur **penyimpanan PIN yang berhasil** (`simpanPin`), bukan di tombol "Buat PIN sekarang" — kalau tidak, tutor yang membuka Pengaturan lalu menutupnya tanpa menyimpan tidak akan pernah melihat ajakannya lagi.
- **`Section` di layar Pengaturan memasang `id={`bagian-${id}`}` dan akordeonnya dikendalikan `openSection`.** Jadi tautan dalam-aplikasi ke sebuah bagian butuh DUA hal: hash yang benar (`/settings#bagian-pin`) **dan** pembacaan hash itu di `Settings.tsx` untuk membuka akordeonnya — hash saja hanya menggulir ke elemen yang isinya belum dirender. Dipasang 2026-10-11 lewat satu `useEffect` berisi `[]`; perhatikan bahwa eslint **menandai direktif `exhaustive-deps` yang tidak perlu** di situ, jadi jalankan `npx eslint src` dan buang direktif yang dilaporkan.
- **Mengubah `/settings` tidak tertangkap `e2e:uiux` pada putaran ini** — gate itu tidak dijalankan sesudah perubahan G3-10 butir 3, sehingga halaman Pengaturan yang berubah tidak punya penjaga tampilan untuk perubahan itu. Kalau menyentuh layar Pengaturan lagi, jalankan `e2e:uiux` **pada putaran yang sama** (butuh izin sandbox penuh) atau tulis batas itu di laporan.

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

1. **Agen boleh mencentang daftar periksa manual** (§5 `PEKERJAAN.md`, kini **44 butir**) — izin eksplisit
   pemilik, menyimpang dari kalimat "hanya pemilik yang boleh mencentang" di berkas itu. Centang
   berdasarkan bukti terukur, dan sebutkan di laporan bukti apa yang dipakai.
2. **Revisi boleh di-push ke `main`** setelah gate hijau dan rilis versi dinaikkan.

## Salinan selesai di sini

---

## Riwayat berkas ini

| Tanggal | Perubahan |
|---|---|
| 2026-10-14 | **Diperbarui sesudah putaran verifikasi ke kode dan rilis v1.102.0.** Kepala berkas diselaraskan dengan keadaan terukur: daftar periksa manual **39 butir** (sebelumnya tertulis 38 di §"Mulai dari sini"), tabel keadaan versi **v1.102.0**, angka baris berkas hasil ukur sendiri (`Settings.tsx` **637**, bukan 1.387; `CaptureSession.tsx` **2.108**, bukan 2.077), dan catatan bahwa `e2e:uiux` **tidak** dijalankan pada putaran ini. Urutan pekerjaan diperbarui: **pengukuran ulang G3-01 butir 9, syarat riwayat AI G3-04, D4, dan D6 dicabut dari daftar sisa** (dua yang pertama dikerjakan, dua yang terakhir sudah terpenuhi), D3 berubah status karena dua kasus terjelasnya sudah benar di kode sementara daftar "23 peta alias" **tidak bisa direproduksi**, dan katalog topik diperbarui menjadi **109/167 · 58 belum**. **Enam jebakan baru** ditambahkan, terutama: status butir di dokumen bisa salah ke **dua arah** dan hanya `grep` yang menentukan; penahan yang sudah selesai tidak otomatis berarti butirnya terpasang; perbaikan tanpa nomor versi tidak bisa dilacak; dan **alat ukur yang disebut dokumen bisa tidak ada sama sekali** di repositori. |
| 2026-10-07 | Dibuat untuk menyerahkan sisa Gelombang 3 ke sesi DSH baru setelah v1.95.0 dirilis. |
| 2026-10-08 | Diperbarui sesudah G3-05 tuntas dan v1.96.0 dirilis: keadaan terukur (v1.96.0 · suite 982/74 · `e2e` 69/11/6 dengan penjelasan bahwa sebelas kegagalan itu sudah ada sebelum G3-05), urutan pekerjaan (G3-06 lebih dulu, G3-05 dikeluarkan), dan lima jebakan baru dari putaran ini — terutama pola spec Playwright yang menemukan murid lewat tombol `toBeEnabled`, dan peringatan agar tidak menyentuh berkas ber-UTF-8 dengan `Get-Content`/`Set-Content`. |
| 2026-10-08 | Ditambahkan sesudah inspeksi pemilik: layar Laporan **sudah dilihat di perangkat dan dinilai cukup** ("sudah sangat oke"), butir daftar periksa 26–29 dicentang, dan catatan bahwa pemisahan istilah dibuat/dibagikan pada ekspor ikut disetujui lewat inspeksi itu. |
| 2026-10-10 | Diperbarui sesudah **G3-06 tuntas dan v1.97.0 dirilis**: keadaan terukur (v1.97.0 · suite 1197/89 · `e2e:uiux` **64/0** termasuk layar Detail Murid), urutan pekerjaan (G3-06 dikeluarkan, **G3-07 jadi yang pertama**), dan enam jebakan baru dari putaran ini — terutama **hook React setelah gerbang `return`** (menjatuhkan satu layar penuh, lolos dari `tsc` dan suite, hanya tertangkap `eslint` + `e2e:uiux`), emoji di dalam tombol yang ditolak guard, `react-refresh/only-export-components`, jebakan nama `.ts` vs `.tsx` di Windows, catatan bahwa repo **tidak** memasang jsdom, dan satu flake PIN di guard tampilan. Ditambahkan juga dua penyimpangan yang mengikat: butir #10 tetap berpola halaman, dan `StudentDetail.tsx` dipotong lewat ekstraksi modal (bukan pemecahan per tab). |
| 2026-10-11 | Diperbarui sesudah **G3-10 butir 3 tuntas dan v1.101.0 dirilis**: keadaan terukur (v1.101.0 · `tsc`/`eslint` bersih · 22 tes baru · **`e2e:uiux` tidak dijalankan pada putaran itu** dan itu ditulis apa adanya), urutan pekerjaan (**tidak ada tugas kode tersisa di Gelombang 3**; yang tersisa hanya pekerjaan tangan pemilik, kini **8 butir**: 34–39 ditambah butir daftar periksa Pengaturan yang belum dibuat), dan **tujuh jebakan baru** — terutama bahwa **status sebuah tugas di dokumen bisa salah** (G3-10 ditulis "belum" padahal empat dari lima butirnya sudah ada di kode sejak G3-09; yang menemukannya `grep` ke kode, bukan membaca ulang dokumen), bahwa **penanda lintas-reload untuk hal yang ikut terhapus reset harus hidup di luar basis data**, bahwa **penjaga "fitur yang seharusnya ada" butuh dua lapis** (perilaku + sambungan lewat berkas sumber `?raw`) supaya modul yang tidak dipanggil siapa pun tidak lolos, dan bahwa **tautan ke bagian Pengaturan butuh hash DAN pembacaan hash** karena akordeonnya dikendalikan `openSection`. |
| 2026-10-11 | Diperbarui sesudah **G3-07 tuntas dan v1.98.0 dirilis**: keadaan terukur (v1.98.0 · suite **1226/90** · `e2e:uiux` **64/0** · `e2e` **68/12/6** dengan catatan bahwa satu kegagalan tambahan belum dipastikan warisan), urutan pekerjaan (G3-07 dikeluarkan, **G3-08 jadi yang pertama**, dan butir periksa manual 34–35 ditandai menunggu mata pemilik), serta **delapan jebakan baru** — terutama bahwa **menghitung pasangan `createObjectURL`/`revokeObjectURL` dari berkas sumber tidak bisa dipercaya** (penjaga pertama salah menuduh kode yang benar di tujuh berkas lalu dibuang), **Playwright mengabaikan spec di dalam direktori berawalan titik** (`No tests found` tanpa petunjuk), **Chromium menolak impor modul di halaman `file://`**, `useWebWorker` yang ±10× lebih lambat dengan hasil identik, `maxSizeMB` yang menekan mutu lebih dulu sehingga piksel hasilnya di bawah 640, `sr-only` yang tidak mengeluarkan kontrol dari urutan fokus, sasaran baris `StudentDetail.tsx` yang sekarang **≤700** dan hampir penuh (698), dan `undefined` pada `db.students.update()` yang **menghapus** kolomnya. Ditambahkan juga bagian penyimpangan G3-07: pemotongan lewat CSS, hapus-foto-berlaku-saat-Simpan, dan larangan mengembalikan janji "paling besar 150 KB" di antarmuka. |
