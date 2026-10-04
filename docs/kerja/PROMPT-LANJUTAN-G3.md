# PROMPT — lanjutan finalisasi Les Ko Lui (Gelombang 3, mulai G3-01 sisa → G3-10)

> Tempel **seluruh** isi berkas ini sebagai pesan pertama di chat DSH baru.
> Dibuat **2026-10-04** dari sesi yang menuntaskan Gelombang 2 (v1.88.0 → v1.89.2) **dan** memulai
> Gelombang 3: refactor G3-01 + dua langkah efisiensi Catat Sesi → rilis **v1.90.0** + satu perbaikan bug.

---

## 0. Siapa kamu, di mana, dan apa yang sedang dikerjakan

- **Workspace:** `C:\Users\lieml\Desktop\Big Personal Web App\Private Tutor`
- **Repo:** di subfolder **`les-ko-lui/`** (bukan di akar workspace)
- **Bahasa laporan:** **Indonesia**. Pemilik manusia yang membaca hasilmu.
- **Versi sekarang:** **v1.90.0** · branch `main` · **`main` == `origin/main`** · commit terakhir **`f402e1b`**
  (perintah update: lihat §4)
- **Tugas aktif:** **G3-01 sisa** (Catat Sesi) lalu **G3-02 … G3-10** (Gelombang 3).

---

## 1. Baca dulu (berurutan, hemat token)

1. `docs/kerja/ATURAN-AI.md` — **seluruhnya** (±343 baris). Ini kontraknya: §0 cara pakai · §1 keputusan terkunci
   B1–B4 + amandemen A1–A19 · §2.1 berkas TERLARANG · §2.2 larangan · §3 kontrak inti K1–K4 · **§5 catatan penting:
   angka baris berkas JANGAN dipercaya — ukur sendiri** · §6 perintah verifikasi · §6.2 Smart Gating 4 tier · §6.3 LF.
2. `docs/kerja/ROADMAP.md` — status 22 tugas (Gelombang 2 & 3) + catatan gate terakhir.
3. `docs/kerja/CHEATSHEET.md` — 1 halaman per TASK-01…TASK-10 (cukup untuk 95% kasus).
4. `docs/README.md` §4.2 (pekerjaan yang butuh keputusan manusia) + §4.3 (12 kotak verifikasi manual Catat Sesi) + §5 (riwayat).
5. **Baru** buka satu `TASK-XX` / bagian `GELOMBANG-3` yang relevan dengan tugas aktif. **Jangan** baca seluruh `arsitektur/`.

---

## 2. Status terukur (semua angka di bawah saya ukur sendiri di sesi ini, bukan salinan)

| Ukuran | Nilai | Catatan |
|---|---:|---|
| Versi | **v1.90.0** | `package.json` · `package-lock.json` · `APP_VERSION` (otomatis) |
| HEAD / origin | **`f402e1b`** | `main` == `origin/main`, working tree bersih |
| Tes | **708 lulus / 60 berkas** | `npm run test:sandbox` (lihat §5 soal shim) |
| `src/screens/CaptureSession.tsx` | **1.895** | turun dari 2.155 → 1.891 (refactor) → 1.901 → **1.895** (fix duplikasi) |
| `src/screens/MonthlyReport.tsx` | 2.351 | target refactor ≤1.500 (**belum**) |
| `src/screens/Settings.tsx` | 1.308 | target ≤700 (**belum**) |
| `src/screens/StudentDetail.tsx` | 1.083 | target ≤800 (**belum**) |
| `src/screens/payments/TagihanTab.tsx` | 1.035 | target ≤800 (**belum**) |
| Guard UI `npm run e2e:uiux` | **56 lulus / 0 skip / 0 gagal** | letak resmi: `e2e-uiux/` + `playwright.uiux.config.ts` (Q23/A19) |
| `npm run e2e` | 78 lulus / 6 skip / 0 gagal (run bersih terakhir) | **flaky karena beban** — lihat §7 jebakan |

> ⚠️ **Angka di tabel itu pun akan basi.** Ukur ulang sebelum memakainya:
> `(Get-Content src/screens/CaptureSession.tsx).Count` dst. `ATURAN-AI` §5 sudah memuat peringatan ini.

**Gelombang 1 & 2 TUNTAS.** Gelombang 3: **G3-01 sebagian** (refactor + 2 langkah efisiensi), G3-02…G3-10 belum.

---

## 3. Apa yang SUDAH selesai di G3-01 (jangan dikerjakan ulang)

Semua commit di bawah **sudah di-push** ke `origin/main`:

| Commit | Isi |
|---|---|
| `925e4ff` | **refactor terbatas (Q9/A12):** `CaptureSession.tsx` **2.155 → 1.891**. Dua ekstraksi: badan Langkah 4 wizard → `captureSession/ResponseStep.tsx` (7 prop), modal pemilih mapel → `captureSession/SubjectPickerSheet.tsx` (10 prop). Dibuktikan murni pemindahan (159 vs 159 baris identik; 126 vs 126 dengan 10 beda yang semuanya penggantian identifier) |
| `4fcbaf4` | **L8 (Q-2 opsi A):** modal `+ Tambah Mapel` dihapus; chip mapel dieja datar di langkah 2. Mapel di luar profil **4 ketukan → 2**. +6 tes `subjectPickerInline.test.tsx` |
| `38eb8c9` | **L9:** panel "Pilih dari daftar bab" **terbuka sejak awal**; **hasil pencarian tepat di bawah kolom isian**; batas 8 bab diberitahukan. +2 tes `topicBrowseDefault.test.tsx` |
| `495fdaa` | **rilis v1.90.0**: entri changelog + bump versi + dokumen |
| `f402e1b` | **fix:** mapel profil tidak lagi tampil dua kali — kelompok **"Mapel murid ini"** diletakkan paling atas dan anggota katalognya dikurangi. +2 tes |

**Catatan rilis penting:** `ChangelogModal.tsx:29` berbunyi `if (lastSeen === APP_VERSION) return;` — jadi modal
"Catatan perubahan" **hanya muncul kalau versi dinaikkan**. Update aplikasi sendiri (spanduk "versi baru") **tidak**
butuh naik versi: precache berubah + `/sw.js` sudah `no-cache` di `vercel.json`, dan `PwaPrompts.tsx` mengecek
worker tiap **5 menit**.

---

## 4. Cara memeriksa hasil secara online (penting)

| | |
|---|---|
| URL **aktif** | **`https://les-ko-lui.vercel.app`** |
| ⚠️ URL yang **salah** → **404 "deployment could not be found"** | `leskolui.vercel.app`. Sudah dikoreksi di `CHECKLIST-VISUAL-2026-10-04.md`; **masih tertulis di `arsip/PROMPT-AI-IKLAN.md:78`** (belum dibersihkan — lihat Q-8) |
| Cara memastikan build terbaru | **Pengaturan** → kartu versi harus menyebut versi terakhir. Kalau belum, tunggu 1–3 menit (Vercel membangun dari `main`) lalu muat ulang |
| Batas agen | **Status build Vercel tidak bisa dicek dari mesin ini** — API-nya butuh token (`403 missing authentication token`), CLI `vercel` tidak terpasang. **Jangan mengklaim build selesai tanpa bukti dari pemilik.** |
| Cache PWA | HP bisa menyajikan versi lama. Kalau muncul spanduk update, tekan; kalau tidak, tutup tab lalu buka lagi |

---

## 5. Cara menjalankan perintah di mesin ini (workaround sandbox — sudah terbukti)

| Perintah | Masalah | Jalan keluar |
|---|---|---|
| `npm test`, `npm run build` | pool `forks` tidak bisa spawn di sandbox (Vite memanggil `child_process.exec("net use")`) → `spawn EPERM`, worker menggantung | ada skrip **`npm run test:sandbox`** (= `vitest run --pool=threads --maxWorkers=2`). Untuk `build`, set dulu shim: `$env:NODE_OPTIONS="--require $env:TEMP\dsh-no-exec.cjs"` |
| shim `dsh-no-exec.cjs` | **`$env:TEMP` berubah tiap sesi** (mis. `…\Temp\dsh-CJzOWG\`), jadi shim dari sesi lama **hilang** | kalau `npm run build` gagal `spawn EPERM`, **buat ulang** shim kecil di `$env:TEMP`: override `child_process.exec`/`execFile` agar memanggil callback dengan galat `EPERM` (itu perilaku Vite saat "net use" gagal) |
| `npm run e2e`, `npm run e2e:uiux`, `npx playwright test …` | Playwright harus men-spawn browser + dev server | **butuh eskalasi sandbox** — minta sekali, sebutkan alasannya. Sudah terbukti bekerja |
| `git push` | `schannel … SEC_E_NO_CREDENTIALS` | **butuh eskalasi sandbox**. `git fetch` tetap gagal meski di-eskalasi — buktikan keberhasilan push dari baris keluaran `push` (`abc..def  main -> main`) + `git status -sb` tanpa penanda ahead/behind |
| `npx eslint .` | kadang gagal cache | pakai binari lokal: `.\node_modules\.bin\eslint.cmd src --max-warnings 0` |
| `Invoke-WebRequest` ke internet | koneksi mati di sandbox | pakai alat `web_fetch` (tetapi ia mengembalikan **teks**, bukan HTML mentah — SPA ini tidak berguna dibaca begitu) |
| Path di PowerShell | `cd` **tidak** memengaruhi `[IO.File]::…` (tetap pakai `$PWD` proses) | **selalu** pakai path absolut: `[IO.File]::ReadAllText("$base\src\...")` |
| `Get-Content` + emoji/em-dash | tampak mojibake di konsol (`â€"`) | itu **artefak konsol**, bukan isi berkas. Verifikasi encoding dengan byte: `[IO.File]::ReadAllBytes` + `U+FFFD` = 0 |

---

## 6. Sisa pekerjaan G3-01 (yang paling mungkin kamu kerjakan lebih dulu)

Rincian lengkap: `docs/kerja/TASK-06-perkuat-catat-sesi.md` **§9.2** (status L1–L9) dan `docs/arsip/GELOMBANG-3.md` §G3-01
(daftar 12 fitur). Ringkas sisa:

| Fitur | Temuan | Catatan |
|---|---|---|
| `aria-live="polite"` pada teks langkah + scroll ke atas & fokus `<h2 tabIndex={-1}>` saat pindah langkah | C-02 | mandiri |
| `ConfirmSheet` saat keluar dengan isian + badge `!` pada stepper untuk langkah wajib yang belum valid | C-04 | sebagian sudah ditutup G1-08 |
| Satu penulis `responseTag` + keduanya `role="radiogroup"` | C-03 | menyentuh langkah 4 (`captureSession/ResponseStep.tsx` — **sudah terekstraksi**, jadi mudah) |
| "Lewati" muncul di langkah 2 bila murid **tanpa mapel** | C-08 | **tanpa** menyentuh `STEP_META`/`constants.ts` |
| Undo hapus topik & hapus tindak lanjut (toast `role="status"` + "↩ Urungkan") | C-13 | pola undo sudah ada di `useEngagement.ts:61-82` |
| Donat skor → `ProgressBar`/`RatingIndicator` | C-10 | |
| `ManageSessionSheet` menggantikan `EditSessionModal` + `ResolveMissedSessionModal` | TASK-06 L4 | berkas baru `src/screens/home/ManageSessionSheet.tsx`; aksi: Catat · Batal les · Tidak hadir; "Jadwalkan ulang" ke `⋯` |
| Label biaya `· ~RpNN` + `role="status"` progres AI + "Coba lagi" | C-12 | ⏸ menunggu **G3-04** (kontrak AI) |
| **+2 tes baru:** simpan dari langkah 5 tanpa Bukti · Bukti tersimpan bila ada | TASK-06 L7 | Q2/A4 — simpan dari langkah 5 sudah dizinkan |
| 12 kotak verifikasi manual `docs/README.md` §4.3 | TASK-06 L6 | **butuh manusia** — jangan diklaim |

**Sudah dinilai pemilik di perangkat (2026-10-04):** bentuk baru langkah 2 = **"sudah bagus"**, dengan permintaan
lanjutan *"perkuat list topik dan search-nya"* yang **sudah dikerjakan** (L9). **Jadi jangan mengulang efisiensi
langkah 2** kecuali pemilik memintanya lagi.

---

## 7. Aturan kerja yang tidak boleh dilanggar

- **§2.1 berkas TERLARANG:** `src/db/db.ts` · `src/lib/crypto.ts` · isi `formatRupiah()` di `src/lib/format.ts` ·
  `src/lib/waBilling.ts` · `src/lib/invoicePresentation.ts` · `src/lib/engagement.ts` · `src/lib/finance.ts` ·
  `src/lib/csv.ts` · `src/template/**` · `STEP_META` · prompt di `src/lib/aiClient.ts`.
  **Kalau tugas menuntut menyentuhnya → berhenti dan lapor** (tandanya tugasnya salah lingkup).
- **Satu tugas = satu commit**, sebut path **eksplisit**: `git commit -m "…" -- path/a path/b`.
  Berkas **BARU** harus `git add` dulu. **Jangan** `git commit -a` (repo kadang dikerjakan paralel).
- **Satu langkah per putaran** → verifikasi → lapor → **berhenti**. Jangan lanjut sendiri.
- **Line endings WAJIB LF** (§6.3). Verifikasi: `git ls-files --eol` (lihat kolom **`i/`** dulu).
- **Jangan** mengubah `playwright.config.ts` / `vite.config.ts` / script `package.json` tanpa keputusan pemilik (config = Tier 3).
- **Jangan** mengakali gate (menonaktifkan tes, menaikkan ambang). Kalau gagal, perbaiki sebabnya.
- **`npm run e2e` menulis ulang 59 PNG ter-track di `e2e/screenshots/` + membuat ~13 berkas baru.**
  Bersihkan: `git checkout -- e2e/screenshots` lalu hapus yang baru. **Jangan di-commit.**
- **Laporkan dengan format §8 `ATURAN-AI`:** `LANGKAH / UBAH / ANGKA / VERIFIKASI / BLOKIR`.
- **Satu putaran = satu tier yang ditulis lebih dulu**, mis. `Tier: T3 — alasan: menyentuh liputan wizard + gate G3-01`.

---

## 8. Jebakan yang sudah memakan waktu orang lain

1. **Dokumen sering basi — ukur sendiri sebelum bekerja.** Contoh nyata: `CaptureSession.tsx` tertulis 2.099 di satu
   dokumen dan 2.073 di dokumen lain, kenyataannya **2.155**; `MonthlyReport` 2.097 vs **2.351**; `Settings` 1.118 vs
   **1.308**; `StudentDetail` 1.037 vs **1.083**; `TagihanTab` 1.004 vs **1.035**.
2. **Angka baris bukan DoD refactor.** Target `≤1.900` dipenuhi **saat refactor** (1.891); menulis fitur menaikkannya
   lagi (1.901) dan perbaikan bug menurunkannya (1.895). Jangan memotong fitur demi angka.
3. **Tailwind v4 memindai teks mentah seluruh berkas proyek, termasuk `docs/*.md`.** Menulis nama kelas palet di
   dokumen ikut mencetak utility-nya ke bundel — **sebut warnanya, jangan nama kelasnya**.
4. **`npm run e2e` flaky karena beban.** Dua run memberi himpunan merah berbeda (timeout bawaan **30 dtk**;
   `finance.spec.ts` / `report-export` merah saat mesin sibuk, **lulus sendirian**). **Satu spec merah → jalankan
   sendirian dulu** sebelum menyimpulkan regresi. Menaikkan timeout = keputusan pemilik.
5. **`e2e:uiux` juga bisa flake** dengan gejala `getByPlaceholder('PIN (6 digit)')` timeout di
   `/payments?tab=ringkasan` — jalankan `npx playwright test --config=playwright.uiux.config.ts -g "Keuangan"` (terbukti 8/8 hijau sendirian).
6. **Modal changelog hanya muncul bila versi naik** (`lastSeen === APP_VERSION`), sedangkan **update SW tidak butuh** naik versi.
7. **Warna heks mentah di `style`/SVG/canvas lolos dari sapu token** — `ATURAN-AI` §5 sudah mencatat 3 titik sisa yang
   benar-benar bisa dibersihkan (`CaptureSession.tsx` bilah aksi · `CloseOutSheet.tsx:56` · `ChangelogModal.tsx:73`).
   Sisanya (~40 berkas: canvas, SVG, palet data, gaya cetak/PDF) **sah** dan bukan pelanggaran.
8. **Edit editor kadang gagal `ReplaceFileW EIO` (transien)** → ulangi saja. `edit` menolak berkas yang belum dibaca →
   `read` dulu. Dua edit ke berkas yang sama dalam satu batch bisa bentrok → kerjakan berurutan.
9. **Sesudah mengubah berkas dengan skrip PowerShell, `edit` menolak** ("file changed since it was read") → `read` ulang dulu.
10. **`.design-audit/` ada DI LUAR repo** (scratch, tidak ikut git): laporan gate, skrip audit, catatan desain.
11. **CI GitHub tidak berjalan** (kedua job gagal dalam 2 detik dengan `steps: []` sejak v1.79.0). **Jangan andalkan CI** —
    jalankan gate lokal. Penyebabnya perlu diaktifkan pemilik di Settings → Actions.

---

## 9. Keputusan pemilik yang masih terbuka (ajukan sebagai pertanyaan bernomor)

Q baru hanya sah untuk: **(a)** mengubah perilaku pengguna, **(b)** menyentuh berkas §2.1, **(c)** mengubah DoD/kontrak.
Kalau tidak termasuk ketiganya, **jangan bertanya — putuskan dan cantumkan alasannya di laporan**.

| # | Hal | Butuh |
|---|---|---|
| Q-3 | **Timeout `playwright.config.ts` 30 dtk → 60–90 dtk** (penyebab flake saat 2 project + spec generator berjalan bersama) | izin: config utama |
| Q-4 | **CI Actions diaktifkan di GitHub** (Settings → Actions) supaya penjaga berjalan otomatis | pemilik, di GitHub |
| Q-5 | **Verifikasi PWA dua build berbeda** (`docs/README.md` §4.2 #10) — kini bisa karena sudah ada deploy | manusia |
| Q-6 | **12 kotak verifikasi manual Catat Sesi** (`docs/README.md` §4.3) — masih terbuka; 3 butirnya sudah dinilai pemilik 2026-10-04, sisanya belum | manusia |
| Q-7 | **Katalog topik untuk 74 mapel yang belum punya** (§4.2 #12) | pengetahuan pemilik |
| Q-8 | **Satu dokumen masih menyebut URL `leskolui.vercel.app` yang 404** — `arsip/PROMPT-AI-IKLAN.md:78` (di dalam teks iklan, jadi bisa ikut tercetak/terkirim) | boleh dibersihkan sendiri, sebutkan di laporan |

---

## 10. Bentuk laporan yang diminta (`ATURAN-AI` §8)

```
LANGKAH: <TASK-XX L<n> atau G3-0N>
UBAH: <berkas + 1 baris apa yang berubah>
ANGKA: <sebelum> → <sesudah>
VERIFIKASI: tsc ✓ | eslint ✓ | test NNN ✓ | build ✓ | e2e … | e2e:uiux … | md-links …
BLOKIR: tidak ada | <sebab>
```

**Angka dulu. Jujur soal apa yang belum diverifikasi.** Bedakan jelas **"terimplementasi"** dari **"terbukti"** —
dan **jangan pernah menulis angka yang tidak kamu ukur sendiri**, termasuk angka tes atau hasil gate.

---

## 11. Urutan kerja yang disarankan setelah prompt ini

1. **Ukur ulang** keadaan (git, versi, baris berkas, jumlah tes) — jangan percaya tabel §2.
2. Pilih **satu** langkah sisa G3-01 dari §6, mulai dari yang paling mandiri:
   **C-13 (undo hapus topik)** — satu komponen (`useTopicSelection.ts` + langkah 2), tidak menyentuh `STEP_META`.
   Alternatif berikutnya: **C-02** (aria-live + scroll/fokus saat pindah langkah).
3. Kerjakan **satu langkah**, tentukan tier lebih dulu, jalankan gate tier itu, lapor §8, **berhenti**.
4. Sesudah G3-01 tuntas → **G3-02 (Keuangan: refactor `TagihanTab.tsx` 1.035 → ≤800 + K-01/K-03/K-05/K-06/K-07/K-12/K-13)**,
   lalu G3-03 (papan pipeline), G3-04 (kontrak AI), G3-05 (laporan), G3-06, G3-07, G3-08, G3-09, G3-10.
