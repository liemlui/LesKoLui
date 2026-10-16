# PROMPT-SESI-BERIKUTNYA — titik masuk untuk sesi DSH baru

> **Sekilas.** Jenis: prompt serah-terima. Status: berlaku; diperbarui 2026-10-15 sesudah push `f7fc03a`.
> Untuk siapa: sesi DSH baru yang melanjutkan repo ini.
> **Cara pakai:** salin seluruh isi berkas ini sebagai pesan pertama di sesi baru.
> **Berkas ini bukan daftar pekerjaan.** Daftarnya tetap `PEKERJAAN.md`. Kalau isi di sini
> bertentangan dengan `PEKERJAAN.md` atau `ATURAN-AI.md`, dua berkas itu yang menang.

---

## Salinan mulai di sini

Lanjutkan proyek **Les Ko Lui** (jurnal les privat, PWA lokal-first). Sesi sebelumnya
(2026-10-15) mengerjakan pengujian penuh atas izin pemilik, menutup dua cacat nyata,
dan **sudah push ke `origin/main`** (commit `f7fc03a`, 11 commit). Pekerjaan berikutnya
dimulai dari keadaan itu.

### Di mana

- Workspace DSH: `C:\Users\lieml\Desktop\Big Personal Web App\Private Tutor`
- Repo ada di **SUBFOLDER** `les-ko-lui/` — akar workspace **bukan** repo git.
- Bahasa laporan: **Indonesia**.

### Mulai dari sini (hemat token, jangan baca semuanya)

Baca **berurutan**, berhenti begitu cukup:

1. `les-ko-lui/docs/kerja/ATURAN-AI.md` — **KONTRAK**, wajib dibaca penuh (§1 cara bekerja ·
   **§1.1 goal + todos wajib setiap pekerjaan** · §2 integritas dokumen · §3 berkas terlarang ·
   §4 keputusan final pemilik · **§4.6 keputusan 2026-10-15 (D11–D17)** · §5 fakta kode ·
   §6 perintah + lingkungan sandbox · §7 jebakan · §8 bentuk laporan).
2. `les-ko-lui/docs/kerja/KEPUTUSAN-PEMILIK-2026-10-15.md` — **putusan pemilik atas 25 butir
   temuan** (A1–A8 · B1–B8 · C1–C9) beserta akibat dan keadaannya. **Baca ini sebelum bertanya
   apa pun ke pemilik**; pertanyaan yang sudah dijawab di sini dilarang diulang.
3. `les-ko-lui/docs/kerja/SERAH-TERIMA.md` §5 — keadaan terakhir dan langkah berikutnya.
4. `les-ko-lui/docs/kerja/PEKERJAAN.md` §4 — daftar pekerjaan di luar gelombang (di situ
   keempat butir yang **belum** dikerjakan dicatat beserta alasannya).
5. `les-ko-lui/docs/RIWAYAT-RILIS.md` (entri **v1.111.0**, paling atas) — apa yang sudah
   dirilis dan apa yang belum diverifikasi mata.

### WAJIB SEBELUM LANGKAH PERTAMA: goal + todos

`create_goal` + `todo_write` **sebelum** menyentuh berkas apa pun (ATURAN-AI §1.1). Pekerjaan
tanpa goal dan todos tidak bisa dipantau pemilik. Tutup goal dengan `complete` saat tuntas.

### Gate — jalankan SEKALI di akhir tugas, bukan per langkah

```
npx tsc -b                     # 0 error
npx eslint src e2e e2e-uiux e2e-pwa scripts
npm run test:sandbox           # butuh shim: lihat di bawah
npm run check:docs             # 0 pelanggaran · 0 tautan rusak
npm run build                  # dist/sw.js
```

**Lingkungan sandbox (terbukti 2026-10-15).** `npm run test:sandbox` gagal `spawn EPERM`
tanpa shim. Yang bekerja, dari dalam `les-ko-lui/`:

```powershell
$env:NODE_OPTIONS = "--require=../.dsh-vitest-shim.cjs"
npm run test:sandbox
```

`npm run build`, `npm run e2e`, `npm run e2e:uiux`, `npm run e2e:pwa`, dan `git push`
butuh **izin sandbox penuh** (`danger-full-access`). Minta izin itu ke pemilik **satu kali**
untuk seluruh rencana bukti, lalu jalankan **berurutan** — jangan boros permintaan.

### Keadaan terukur 2026-10-15 (ukur sendiri, jangan percaya tulisan ini)

| Gate | Hasil saat itu |
|---|---|
| suite unit | **1.479 lulus / 108 berkas / 0 gagal** |
| `build` | lulus (`dist/sw.js`, 146 entri precache) |
| `e2e:uiux` | **72 lulus / 0 gagal** |
| `e2e:pwa` | **2 lulus / 0 gagal** |
| `e2e` | **85 lulus / 7 gagal / 6 skip** — **dan angkanya bergoyang tiap run** |
| `check:docs` · `tsc` · `eslint` | 0 pelanggaran · 0 error · 0 error |

### Pekerjaan yang BENAR-BENAR tersisa

**1. Kegagalan `e2e` yang flaky — ini yang paling berharga untuk dikejar.**
Empat run berturut-turut memberi himpunan kegagalan yang **berbeda** dengan kode yang sama
(79/13 → 83/9 → 84/8 → 86/6 → 85/7). Artinya sisanya **flaky**, bukan cacat tetap. Yang sudah
dibuktikan dan **jangan diulang**:

- **bukan** beban paralel semata: `workers: 2` hanya mengurangi 8 → 6 (perubahan itu dibatalkan);
- **bukan** fixture isolasi: seed **selesai** di mobile (7 murid, probe);
- **bukan** data bocor dari `report-unlock`: `report-export` lulus bersamanya;
- **bukan** pemilihan murid: empat strategi sudah dicoba (batas 2,5 s → 5 s → 30 s → kandidat
  dari data) dan **tidak satu pun menstabilkannya**.

**Hipotesis terkuat yang belum diuji:** kesiapan layar **Laporan** itu sendiri di bawah beban
(dev server Vite melakukan transform modul sesuai permintaan; `screenshot-katalog` dan
`screenshot-audit` membuka layar Laporan di project yang sama). Langkah berikutnya yang masuk
akal: **instrumentasi `reportAvailability`** — catat masukan dan keluarannya saat tombol
"Buat Laporan" mati di tengah suite, lalu bandingkan dengan run yang lulus. Jangan menambah
batas waktu lagi; itu menyembunyikan gejala.

**2. `docs/kerja/PEKERJAAN.md` §4 — inilah satu-satunya daftar pekerjaan.**
Baca di sana; jangan percaya ringkasan ini. Keadaan 2026-10-15: dua baris **belum** dikerjakan
(C3 katalog topik · C5 lanjutan audit di repositori murid), tiga **sebagian** (C7 peta alias ·
C8 katalog IB · B1 kalimat jadwalkan-ulang), sisanya ditutup atau sengaja tidak dikerjakan
(C9 · B8) — **semuanya sudah punya alasan satu baris di situ**.

**3. Yang menunggu MATA pemilik, bukan agen:** apakah tiga isian "Isi Semua dengan AI" benar-benar
terisi di perangkat, dan apakah tombol **Coba lagi** benar-benar berhasil. Dua-duanya butuh
panggilan AI sungguhan; jangan diklaim dari tes.

### Jebakan yang sudah terbukti — jangan terperangkap lagi

1. **`e2e` dan `e2e:uiux` memakai PORT 5174 yang sama.** Menjalankannya bersamaan
   menghasilkan **50 kegagalan palsu**. Jalankan **berurutan**.
2. **Jangan menyunting berkas dengan `Set-Content` PowerShell.** PowerShell 5.1 menulis **BOM**
   dan membaca UTF-8 sebagai ANSI. Kejadian nyata 2026-10-15: tiga berkas spec rusak (BOM + satu
   karakter), harus dipulihkan dari git. Pakai alat edit berkas.
3. **`git stash` TIDAK BISA mengukur baseline** setelah perubahan dikomit — ia berbunyi
   "No local changes to save" dan Anda mengukur kode sendiri tanpa sadar. Pakai
   `git worktree add ../.baseline <commit>` + junction `node_modules`.
4. **IndexedDB tidak bisa diakses dari `about:blank`** (origin buram):
   `Access to the IndexedDB API is denied in this context`. Untuk membersihkan storage,
   pakai `page.addInitScript` yang berjalan **di origin aplikasi sebelum kode aplikasi**.
5. **Jangan menelan kegagalan di helper.** Fixture isolasi versi pertama gagal senyap karena
   `try/catch` menelan galat di atas — dan tampak bekerja padahal tidak.
6. **`git` kadang keluar kode 1 padahal sukses** (mis. `git commit`); buktikan dari riwayat.
   `git fetch` di mesin ini bisa gagal karena kredensial — itu bukan tanda push gagal.
7. **Angka mutakhir tidak ditulis di dokumen.** Versi dari `package.json`, jumlah tes dari
   `npm run test:sandbox`, baris berkas dari `npm run measure loc`. `npm run check:docs`
   menjaga ini.

### Cara melapor

Satu laporan di akhir, dalam Bahasa Indonesia, memuat: **yang berubah** · **perintah + hasilnya** ·
**yang belum selesai** · **keputusan yang Anda ambil sendiri + alasannya satu baris** ·
**batas kejujuran** (apa yang tidak bisa Anda buktikan). Jangan menyalin keluaran perintah mentah.

**Kalau menemukan pekerjaan yang belum selesai tetapi tidak ada di daftar:** langsung tambahkan
ke `PEKERJAAN.md` §4 beserta tanggal dan sumbernya — jangan menunggu izin (ATURAN-AI §1 butir 7).

**Bertanya ke pemilik hanya sah untuk tiga hal:** mengubah uang, mengubah perilaku pengguna,
menghapus data. Di luar itu putuskan sendiri dan catat alasannya satu baris.

## Salinan selesai di sini

---

## Riwayat berkas ini

| Tanggal | Perubahan |
|---|---|
| 2026-10-15 | **Salinan ditulis ulang untuk keadaan sesudah push \`f7fc03a\` — dan isinya dipangkas dari 325 menjadi 156 baris.** Sesi sebelumnya menguji seluruh gate dengan izin sandbox penuh, menutup **dua cacat nyata** ("Restore dari File" yang tidak pernah memanggil restore karena perutean PIN-nya kehilangan satu cabang, dan \`SchemaError: KeyPath action on auditStore auditLog is not indexed\`), memasang **isolasi data per tes** untuk \`e2e\`, dan **push 11 commit** ke \`origin/main\`. **Yang berubah di salinan:** titik masuk kini menunjuk \`KEPUTUSAN-PEMILIK-2026-10-15.md\` (putusan atas 25 butir temuan) dan \`ATURAN-AI.md\` §4.6 (D11–D17); tabel keadaan memuat angka terukur 2026-10-15 (suite 1.479/108 · \`e2e:uiux\` 72/0 · \`e2e:pwa\` 2/0 · \`e2e\` 85/7/6); bagian "pekerjaan yang tersisa" menunjuk keadaan §4 yang sebenarnya; dan **tujuh jebakan** ditulis ulang dengan yang benar-benar terbukti — terutama **port 5174 yang sama untuk \`e2e\` dan \`e2e:uiux\`** (menjalankan bersamaan → 50 kegagalan palsu), **larangan \`Set-Content\` PowerShell** (menulis BOM, tiga berkas spec rusak di putaran ini), **\`git stash\` tidak bisa mengukur baseline sesudah commit** (pakai worktree), **IndexedDB ditolak dari \`about:blank\`**, dan **larangan menelan kegagalan di helper**. Ditambahkan juga catatan kejujuran bahwa **angka \`e2e\` bergoyang tiap run** (79/13 → 83/9 → 84/8 → 86/6 → 85/7) sehingga sisanya flaky, bukan cacat tetap — beserta empat hipotesis yang sudah dibuang dan hipotesis terkuat yang belum diuji |
| 2026-10-14 | **Diperbarui sesudah putaran verifikasi ke kode dan rilis v1.102.0.** Kepala berkas diselaraskan dengan keadaan terukur: daftar periksa manual **39 butir** (sebelumnya tertulis 38 di §"Mulai dari sini"), tabel keadaan versi **v1.102.0**, angka baris berkas hasil ukur sendiri (`Settings.tsx` **637**, bukan 1.387; `CaptureSession.tsx` **2.108**, bukan 2.077), dan catatan bahwa `e2e:uiux` **tidak** dijalankan pada putaran ini. Urutan pekerjaan diperbarui: **pengukuran ulang G3-01 butir 9, syarat riwayat AI G3-04, D4, dan D6 dicabut dari daftar sisa** (dua yang pertama dikerjakan, dua yang terakhir sudah terpenuhi), D3 berubah status karena dua kasus terjelasnya sudah benar di kode sementara daftar "23 peta alias" **tidak bisa direproduksi**, dan katalog topik diperbarui menjadi **109/167 · 58 belum**. **Enam jebakan baru** ditambahkan, terutama: status butir di dokumen bisa salah ke **dua arah** dan hanya `grep` yang menentukan; penahan yang sudah selesai tidak otomatis berarti butirnya terpasang; perbaikan tanpa nomor versi tidak bisa dilacak; dan **alat ukur yang disebut dokumen bisa tidak ada sama sekali** di repositori. |
| 2026-10-07 | Dibuat untuk menyerahkan sisa Gelombang 3 ke sesi DSH baru setelah v1.95.0 dirilis. |
| 2026-10-08 | Diperbarui sesudah G3-05 tuntas dan v1.96.0 dirilis: keadaan terukur (v1.96.0 · suite 982/74 · `e2e` 69/11/6 dengan penjelasan bahwa sebelas kegagalan itu sudah ada sebelum G3-05), urutan pekerjaan (G3-06 lebih dulu, G3-05 dikeluarkan), dan lima jebakan baru dari putaran ini — terutama pola spec Playwright yang menemukan murid lewat tombol `toBeEnabled`, dan peringatan agar tidak menyentuh berkas ber-UTF-8 dengan `Get-Content`/`Set-Content`. |
| 2026-10-08 | Ditambahkan sesudah inspeksi pemilik: layar Laporan **sudah dilihat di perangkat dan dinilai cukup** ("sudah sangat oke"), butir daftar periksa 26–29 dicentang, dan catatan bahwa pemisahan istilah dibuat/dibagikan pada ekspor ikut disetujui lewat inspeksi itu. |
| 2026-10-10 | Diperbarui sesudah **G3-06 tuntas dan v1.97.0 dirilis**: keadaan terukur (v1.97.0 · suite 1197/89 · `e2e:uiux` **64/0** termasuk layar Detail Murid), urutan pekerjaan (G3-06 dikeluarkan, **G3-07 jadi yang pertama**), dan enam jebakan baru dari putaran ini — terutama **hook React setelah gerbang `return`** (menjatuhkan satu layar penuh, lolos dari `tsc` dan suite, hanya tertangkap `eslint` + `e2e:uiux`), emoji di dalam tombol yang ditolak guard, `react-refresh/only-export-components`, jebakan nama `.ts` vs `.tsx` di Windows, catatan bahwa repo **tidak** memasang jsdom, dan satu flake PIN di guard tampilan. Ditambahkan juga dua penyimpangan yang mengikat: butir #10 tetap berpola halaman, dan `StudentDetail.tsx` dipotong lewat ekstraksi modal (bukan pemecahan per tab). |
| 2026-10-11 | Diperbarui sesudah **G3-10 butir 3 tuntas dan v1.101.0 dirilis**: keadaan terukur (v1.101.0 · `tsc`/`eslint` bersih · 22 tes baru · **`e2e:uiux` tidak dijalankan pada putaran itu** dan itu ditulis apa adanya), urutan pekerjaan (**tidak ada tugas kode tersisa di Gelombang 3**; yang tersisa hanya pekerjaan tangan pemilik, kini **8 butir**: 34–39 ditambah butir daftar periksa Pengaturan yang belum dibuat), dan **tujuh jebakan baru** — terutama bahwa **status sebuah tugas di dokumen bisa salah** (G3-10 ditulis "belum" padahal empat dari lima butirnya sudah ada di kode sejak G3-09; yang menemukannya `grep` ke kode, bukan membaca ulang dokumen), bahwa **penanda lintas-reload untuk hal yang ikut terhapus reset harus hidup di luar basis data**, bahwa **penjaga "fitur yang seharusnya ada" butuh dua lapis** (perilaku + sambungan lewat berkas sumber `?raw`) supaya modul yang tidak dipanggil siapa pun tidak lolos, dan bahwa **tautan ke bagian Pengaturan butuh hash DAN pembacaan hash** karena akordeonnya dikendalikan `openSection`. |
| 2026-10-11 | Diperbarui sesudah **G3-07 tuntas dan v1.98.0 dirilis**: keadaan terukur (v1.98.0 · suite **1226/90** · `e2e:uiux` **64/0** · `e2e` **68/12/6** dengan catatan bahwa satu kegagalan tambahan belum dipastikan warisan), urutan pekerjaan (G3-07 dikeluarkan, **G3-08 jadi yang pertama**, dan butir periksa manual 34–35 ditandai menunggu mata pemilik), serta **delapan jebakan baru** — terutama bahwa **menghitung pasangan `createObjectURL`/`revokeObjectURL` dari berkas sumber tidak bisa dipercaya** (penjaga pertama salah menuduh kode yang benar di tujuh berkas lalu dibuang), **Playwright mengabaikan spec di dalam direktori berawalan titik** (`No tests found` tanpa petunjuk), **Chromium menolak impor modul di halaman `file://`**, `useWebWorker` yang ±10× lebih lambat dengan hasil identik, `maxSizeMB` yang menekan mutu lebih dulu sehingga piksel hasilnya di bawah 640, `sr-only` yang tidak mengeluarkan kontrol dari urutan fokus, sasaran baris `StudentDetail.tsx` yang sekarang **≤700** dan hampir penuh (698), dan `undefined` pada `db.students.update()` yang **menghapus** kolomnya. Ditambahkan juga bagian penyimpangan G3-07: pemotongan lewat CSS, hapus-foto-berlaku-saat-Simpan, dan larangan mengembalikan janji "paling besar 150 KB" di antarmuka. |
