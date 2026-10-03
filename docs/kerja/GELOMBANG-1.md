# GELOMBANG-1 — Bersih-bersih aman + amandemen kontrak (G1-01 … G1-11)

> **Sekilas** · Jenis: **dokumen tugas (dapat dieksekusi)** · Diperbarui: 2026-10-03 · Status: **tuntas**
> **Untuk siapa:** agen AI pelaksana (ditulis untuk model kecil: ikuti urutan, jangan improvisasi).
> **Prasyarat wajib dibaca lebih dulu:** [`ATURAN-AI.md`](ATURAN-AI.md) (kontrak + larangan), lalu
> [`../arsip/07-VALIDASI-RENCANA-2026-10-01.md`](../arsip/07-VALIDASI-RENCANA-2026-10-01.md) §3–§4.
> **Isi:** 11 tugas — **SEMUA SELESAI** (G1-01…G1-11, v1.85.0). **Tidak ada perubahan skema Dexie. Tidak menyentuh perilaku uang/AI.**
> **Estimasi total sisa:** **tidak ada** — Gelombang 1 tuntas; lanjut [`ROADMAP.md`](ROADMAP.md).

---

## 0. Cara pakai berkas ini

1. **Satu langkah per putaran.** Kerjakan satu tugas, jalankan gate, laporkan, berhenti.
2. **Gate wajib setiap tugas** (dari `ATURAN-AI` §6, dijalankan dari `les-ko-lui/`):

   ```powershell
   npx tsc -b        # harapan: tanpa keluaran
   npx eslint src    # harapan: tanpa keluaran
   npm test          # harapan: 609+ lulus, 0 gagal
   npm run build     # harapan: built + dist/sw.js
   npm run e2e       # harapan: lulus (2 project: chromium, mobile)
   ```

   > Catatan lingkungan: di sandbox Windows tanpa akses luas, `npm run build` dan `npm run e2e` bisa gagal
   > dengan `spawn EPERM` (Vite/Playwright memanggil proses anak). Itu **batas sandbox**, bukan regresi —
   > jalankan dengan akses lebih luas atau catat di §4.
3. **Bentuk laporan** (dari `ATURAN-AI` §8):

   ```
   TUGAS:  <G1-XX>
   UBAH:   <berkas + 1 baris apa yang berubah>
   ANGKA:  <sebelum> → <sesudah>
   VERIFIKASI: tsc ✓ | eslint ✓ | test 609 ✓ | build ✓ | e2e ✓
   BLOKIR: tidak ada | <sebab>
   ```
4. **Kalau verifikasi gagal:** kembalikan perubahan tugas itu (`git checkout -- <berkas>`) dan tulis
   sebabnya di §4. **Jangan** mengakali tes atau menaikkan ambang.

### Larangan yang paling mudah dilanggar di gelombang ini

| ❌ | Kenapa |
|---|---|
| Menyentuh `src/lib/engagement.ts`, `src/template/**`, `src/db/db.ts`, `src/lib/crypto.ts`, `formatRupiah`, `waBilling.ts`, `invoicePresentation.ts` | daftar terlarang `ATURAN-AI` §2.1 |
| Menambah pustaka/dependensi baru | `ATURAN-AI` §2.2 |
| Menambah aturan `@media … .input { font-size: 16px }` | **dicabut** (Q7 — fokus Android) |
| "Sekalian merapikan" hal di luar daftar tugas | satu tugas = satu perubahan |

---

## 1. Graf dependency

```
G1-01 ✅ (selesai 2026-10-01)
  ├─ G1-02 ✅ (selesai 2026-10-01)  penghitung rekursif + baseline 904
  ├─ G1-03 ✅ (selesai 2026-10-01)  koreksi dokumen audit 06
  ├─ G1-04 ✅ (selesai 2026-10-01)  kontras cepat 13 titik
  ├─ G1-05 ✅ (selesai 2026-10-01)  nag backup (kompensasi + tutup)
  └─ G1-11  guard metrik UI (butuh spec dari G1-01)

G1-06  ✅ (selesai 2026-10-01)  toast sukses/gagal + "Coba lagi"
G1-07  ✅ (selesai 2026-10-01)  state memuat: skeleton Beranda + error-state Pengaturan
G1-08  ✅ (selesai 2026-10-01)  konfirmasi 5 aksi destruktif + StorageUsage + spec loading-states
G1-09  ✅ (selesai 2026-10-01)  teks reset jujur + jalur Simpan PIN memakai patch
G1-10  ✅ (selesai 2026-10-03)  a11y dasar (tab/heading/banner) + Q16d  (mandiri, menyentuh komponen bersama)
G1-11  ✅ (selesai 2026-10-03)  guard metrik UI `e2e:uiux` + Q20/Q21/Q22(b) + DoD G1-10 direvisi
```

**Urutan paling aman:** `G1-05 → G1-06 → G1-07 → G1-08 → G1-02 → G1-03 → G1-04 → G1-09 → G1-10 → G1-11`.
Alasannya: tiga tugas pertama tidak menyentuh berkas bersama, sehingga belum ada risiko konflik; `G1-10`
(Tabs dipakai 3 layar) dan `G1-11` (spec) dikerjakan belakangan agar perubahan kecil tidak mengganggu
matriks screenshot.

> **Status gelombang:** **11/11 selesai** (2026-10-03, v1.85.0). Tidak ada tugas tersisa di gelombang ini;
> tugas berikutnya ada di [`ROADMAP.md`](ROADMAP.md) (prasyarat "seluruh Gelombang 1 selesai" kini terpenuhi).

---

## 2. Daftar tugas

### G1-01 — ✅ SELESAI: amandemen kontrak (A1–A13)

| Field | Isi |
|---|---|
| ID | G1-01 |
| Judul | Amandemen kontrak: kunci Q1–Q11 ke berkas kontrak |
| Berkas disentuh | `kerja/ATURAN-AI.md` · `arsitektur/11-uiux-ai-cost-dan-privasi.md` · `kerja/TASK-01/03/04/05/06/07/10` · `README.md` · `03-PLAYBOOK-AUDIT-UIUX-VISUAL.md` · `playwright.config.ts` |
| Dependency | — |
| Latar | §1.2 dokumen 07 (5 blokir) + N-1, N-7 |
| Estimasi | S — **selesai 2026-10-01** |
| Keputusan pemilik | **Q1–Q11** (semua) |
| Amandemen terkait | **A1–A13** |
| Catatan | 15 amandemen terpasang: A1–A5 (Q1–Q5), A6 **dicabut** (Q7), A7–A10 (teknis), A11 (Q5 tab), A12 (Q9 refactor), **A13 (Q11 refactor 5 berkas)**. Gate saat itu: `tsc -b` ✓ · `eslint` ✓ · `playwright --list` ✓ (2 project) · `check-md-links` rusak 0 |

**DoD terverifikasi:** ✅ tercapai — tidak ada dua dokumen kontrak yang bertentangan; setiap perubahan punya
baris "keputusan pemilik 2026-10-01"; `grep "Ringkas / Sesi / Nilai / Uang"` = 0 instruksi aktif;
`grep "font-size: 16px"` di `src/` = 0.

---

### G1-02 — ✅ SELESAI: kunci penghitung kelas warna & angka baseline

| Field | Isi |
|---|---|
| ID | G1-02 |
| Judul | Verifikasi & catat baseline penghitung kelas warna (**904**) — **selesai 2026-10-01** |
| Berkas disentuh | `arsitektur/11-uiux-ai-cost-dan-privasi.md` (§6 K4 + K2) · `kerja/ATURAN-AI.md` (§6 K2 + K3) · `kerja/TASK-07…md` (peta jalur AI) · `kerja/TASK-06…md` (verifikasi modal lama) · `kerja/TASK-04-fondasi-visual.md` (§3 jebakan + §9 angka) |
| Dependency | G1-01 |
| Latar | **N-1** — perintah kontrak `Select-String "src\**\*.tsx"` tidak rekursif: 38 berkas → 470; angka sebenarnya **904** |
| Estimasi | S — **selesai** |
| Keputusan pemilik | — |
| Amandemen terkait | **A8** |
| Catatan | Skrip baru (`scripts/count-color-classes.mjs`) **tidak** dibuat — masih butuh persetujuan (`ATURAN-AI` §0.6); perintah PowerShell rekursif dianggap cukup |

**Hasil (dilaksanakan 2026-10-01):**

| # | Perbaikan | Berkas:lokasi |
|---|---|---|
| 1 | Penghitung K4 (kelas warna) → rekursif + baseline 904 + catatan selisih `git grep` 902 | `arsitektur/11` §6 |
| 2 | Penghitung K2 (titik AI) → rekursif | `arsitektur/11` §6 |
| 3 | Penghitung K2 → rekursif | `ATURAN-AI` §6 |
| 4 | Penghitung K3 (kebocoran uang) → rekursif **di dalam `src/screens`** saja (tidak menyapu `components`) | `ATURAN-AI` §6 |
| 5 | Peta jalur AI (`AiCostModal|AiCostConfirmModal|useAiAction|estimate*Cost`) → rekursif + `.Path` | `TASK-07` §0 |
| 6 | Verifikasi "modal lama tidak diimpor" → rekursif (dulu **selalu lulus palsu**, karena `src/screens/home/` berada 2 tingkat) | `TASK-06` Langkah 3 |
| 7 | Baris "jebakan" yang **menyarankan** pola lama diperbaiki menjadi perintah rekursif | `TASK-04` §3 |
| 8 | Slot checklist L1 diisi baseline **904** | `TASK-04` §9 |

**Angka terverifikasi:** rekursif `Get-ChildItem` = **904** · `git grep` berkas terlacak = **902** ·
selisih **2** = `src/App.tsx` (pathspec `src/**/*.tsx` tidak mencakup berkas di akar `src/`; `main.tsx` = 0) ·
target **≤190** tetap.

**DoD terverifikasi:**
- [x] Perintah rekursif menghasilkan **904**.
- [x] Tidak ada lagi perintah `Select-String -Path "src\**\*.tsx"` yang dipakai sebagai alat ukur (sisa kemunculan
      hanya di teks yang **menjelaskan** bahwa pola itu salah).
- [x] `TASK-04` §2/§9 memuat **904** sebagai angka awal; `471` hanya disebut sebagai angka kontrak lama.
- [x] Target **≤190** tetap tertulis.
- [x] `node scripts/check-md-links.mjs` → rusak 0.

---

### G1-03 — ✅ SELESAI: koreksi dokumen audit 06

| Field | Isi |
|---|---|
| ID | G1-03 |
| Judul | Sinkronkan temuan di `docs/06` dengan hasil verifikasi `docs/07` §2 — **selesai 2026-10-01** |
| Berkas disentuh | `docs/06-AUDIT-UIUX-2026-10-01.md` (satu-satunya berkas) |
| Dependency | G1-01 |
| Latar | 18 temuan premis berubah + 9 ber-nuansa; **L-02 & L-01h dicabut**; L-04 dicabut (Q7) |
| Estimasi | S — **selesai** |
| Keputusan pemilik | Q2/Q3/Q4/Q7/Q8/Q10 + #3/#7/#10/#11/#12 (dirujuk di baris terkait) |
| Amandemen terkait | A4, A11, A13 |
| Catatan | Ringkasan tiap Q **tidak** disalin ke 06 (cukup rujukan) supaya tidak ada dua sumber kebenaran |

**Hasil (dilaksanakan 2026-10-01):**

| # | Yang dikerjakan | Jumlah |
|---|---|---|
| 1 | Baris ditandai **⚠️** (18 premis berubah + 9 ber-nuansa) | **27** |
| 2 | **Koreksi fakta** inline (nomor baris/berkas/angka salah) — K-1…K-26 | **26** |
| 3 | **Klaim dicabut** + blok transparansi: L-02 (banner), L-01h (atribusi `scoreLabel`), L-04 (Q7) | **3** |
| 4 | Baris **diputuskan** ditandai 📌 (K-01, K-10, M-02, M-06, S-01) & **tidak dikerjakan** 🚫 (R-11) | **6** |
| 5 | Catatan modul diperbarui: `Student.photo` (#12), `avgDaysToPayProxy`, dialog internal (Q8), artefak `mobile-dark` historis | 4 |
| 6 | **§9 baru**: ringkasan + tabel ⚠️ + tabel K-1…K-26 + klaim dicabut + temuan dipindah | 1 bagian |
| 7 | Header: catatan **A1–A14** terkunci + rekonsiliasi angka 18 vs 27 | 2 baris |

**DoD terverifikasi:**
- [x] Setiap baris §3/§4 dokumen 06 konsisten dengan §2 dokumen 07 (ambang berbeda dijelaskan di §9.1).
- [x] Tidak ada klaim yang sudah dicabut yang masih berdiri tanpa penanda.
- [x] L-04 tetap ada di dokumen (ditandai DICABUT), **tidak** dihapus.
- [x] `node scripts/check-md-links.mjs` → rusak 0.

---

### G1-04 — ✅ SELESAI: kontras cepat 13 titik

| Field | Isi |
|---|---|
| ID | G1-04 |
| Judul | Naikkan 13 pasangan warna terburuk ke ≥4,5:1 (interim, sebelum token `TASK-04`) — **selesai 2026-10-01** |
| Berkas disentuh | `src/App.tsx` · `src/screens/Settings.tsx` · `src/components/FinancePeriodPicker.tsx` · `src/screens/home/AttentionInbox.tsx` · `src/screens/home/MonthView.tsx` · `src/screens/Students.tsx` · `src/screens/studentDetail/RiwayatSesi.tsx` · `src/screens/studentDetail/IaEeTracker.tsx` · `src/screens/studentDetail/EngagementSummary.tsx` · `src/screens/studentDetail/EvidenceCard.tsx` · `src/screens/StudentDetail.tsx` · `src/components/StudentForm.tsx` |
| Dependency | G1-01 |
| Latar | **L-01a…L-01g** (46 pasangan gagal; 13 terburuk) |
| Estimasi | M — **selesai** |
| Keputusan pemilik | — |
| Amandemen terkait | A7 (larangan `engagement.ts` ditegaskan di `TASK-04` §0) |
| Catatan | Interim: `G2-02` akan menggantinya dengan token. Nilai `-600/-700` **tetap sah** setelah token jadi |

**Hasil (dilaksanakan 2026-10-01) — 14 baris kelas di 12 berkas:**

| # | Lokasi | Sebelum → Sesudah | Rasio lama → baru | Status |
|---|---|---|---|---|
| 1 | [`src/App.tsx:244`](../../src/App.tsx) ("Besok") | `text-amber-500` → **`text-amber-700`** | 2,07:1 → **4,87:1** | ✅ |
| 2 | [`src/App.tsx:256`](../../src/App.tsx) ("Backup") | `bg-amber-500` → **`bg-amber-700`** | 2,15:1 → **5,05:1** | ✅ |
| 3 | [`src/screens/Settings.tsx:113`](../../src/screens/Settings.tsx) (Hapus foto lama) | `bg-amber-500` → **`bg-amber-700`** | 2,15:1 → **5,05:1** | ✅ |
| 4 | [`src/components/FinancePeriodPicker.tsx:81`](../../src/components/FinancePeriodPicker.tsx) | `disabled:text-slate-400` → **`disabled:text-slate-600`** | 2,40:1 → **6,90:1** | ✅ |
| 5 | [`src/screens/home/AttentionInbox.tsx:87`](../../src/screens/home/AttentionInbox.tsx) | `text-orange-600` → **`text-orange-700`** | 3,38:1 → **4,93:1** | ✅ |
| 6 | [`src/screens/home/MonthView.tsx:53`](../../src/screens/home/MonthView.tsx) ("Min") | `text-red-500` → **`text-red-700`** | 3,82:1 → **6,42:1** | ✅ |
| 7 | [`src/screens/home/MonthView.tsx:79`](../../src/screens/home/MonthView.tsx) (angka Minggu) | `text-red-500` → **`text-red-700`** | 3,65:1 → **6,13:1** | ✅ |
| 8 | [`src/screens/Students.tsx:353`](../../src/screens/Students.tsx) ("Hapus") | `text-red-500` → **`text-red-600`** | 3,82:1 → **4,76:1** | ✅ |
| 9 | [`src/screens/studentDetail/RiwayatSesi.tsx:200`](../../src/screens/studentDetail/RiwayatSesi.tsx) (chip CANCELLED) | `bg-red-50 text-red-500` → **`text-red-700`** | 3,50:1 → **5,88:1** | ✅ |
| 10 | [`src/screens/studentDetail/IaEeTracker.tsx:158`](../../src/screens/studentDetail/IaEeTracker.tsx) (2 kelas di 1 baris) | `text-red-500` → **`text-red-700`** · `text-orange-500` → **`text-orange-700`** | 3,82:1 → **6,42:1** · 2,89:1 → **5,23:1** | ✅ |
| 11 | [`src/screens/studentDetail/EngagementSummary.tsx:198`](../../src/screens/studentDetail/EngagementSummary.tsx) | `text-orange-500` → **`text-orange-700`** | 2,89:1 → **5,23:1** | ✅ |
| 12 | [`src/screens/studentDetail/EvidenceCard.tsx:15`](../../src/screens/studentDetail/EvidenceCard.tsx) | `text-orange-500` → **`text-orange-700`** | 2,89:1 → **5,23:1** | ✅ |
| 13 | [`src/screens/StudentDetail.tsx:846`](../../src/screens/StudentDetail.tsx) | `text-orange-500` → **`text-orange-700`** | 2,89:1 → **5,23:1** | ✅ |
| 14 | [`src/components/StudentForm.tsx:364`](../../src/components/StudentForm.tsx) | `text-orange-500` → **`text-orange-700`** | 2,89:1 → **5,23:1** | ✅ |

**Penyimpangan dari rencana (disengaja, dengan alasan):**

| # | Rencana | Dipakai | Alasan |
|---|---|---|---|
| 1 | `amber-800` | `amber-700` | 4,87:1 sudah lulus; `amber-800` terlalu gelap untuk tombol sekunder "Besok" |
| 5 | `orange-800` | `orange-700` | 4,93:1 sudah lulus |
| 8 | `red-700` | `red-600` | tombol ini **sudah** punya `hover:text-red-700` — kalau basis jadi `red-700`, umpan balik hover hilang. `red-600` = 4,76:1 (lulus) |
| 10 | hanya merah | merah **dan** oranye | kenyataannya satu baris memuat **dua** kelas (merah `daysLeft<0`, oranye `daysLeft<14`) |

**Koreksi fakta yang muncul saat G1-04** (dictat juga di dokumen 06 §9): `IaEeTracker:158` memakai `text-orange-500` (bukan `text-orange-600` seperti tertulis di audit), dan chip di `RiwayatSesi:200` adalah status **CANCELLED**, bukan teks "15h terlambat" (teks itu ada di `IaEeTracker:159`).

**Titik serupa yang DITEMUKAN tetapi TIDAK diubah** (di luar 13 titik tugas ini — kandidat untuk `G2-02`) :

| Lokasi | Kelas | Kenapa tidak diubah di sini |
|---|---|---|
| `src/screens/Students.tsx:566` | `text-red-500` (pesan galat PIN) | di luar daftar 13 titik |
| `src/screens/studentDetail/EngagementSummary.tsx:197` | `text-red-500` ("📱 Main HP") | di luar daftar |
| `src/screens/studentDetail/RiwayatSesi.tsx:190` | `text-orange-500` ("⚠ needsWork") | di luar daftar |
| `src/screens/studentDetail/RiwayatSesi.tsx:180` | `bg-red-50 text-red-600` (tag negatif) | 4,36:1 — **tetap gagal AA**, masuk `G2-02` |
| `src/screens/studentDetail/EvidenceCard.tsx:13,16` | `text-blue-500` / `text-red-500` | di luar daftar |
| `src/screens/home/AddScheduleModal.tsx:122` · `captureSession/ScheduleStep.tsx:72` | `text-orange-600` | di luar daftar |
| `src/screens/Settings.tsx:1108` · `SessionDetailModal.tsx:163,203,244` · `CaptureSession.tsx:1748` · `MonthlyReport.tsx:1573` | `orange-*`/`amber-500` | di luar daftar |

**DoD terverifikasi:**
- [x] 14 baris JSX terganti; diff = **14 insertions / 14 deletions** di **12 berkas** — **semua** baris yang berubah memuat `className`/nilai kelas (diverifikasi per-baris dari `git diff --unified=0`).
- [x] Semua rasio baru **≥4,5:1**, dihitung dari **palet resmi Tailwind v4** (`node_modules/tailwindcss/theme.css`, oklch → sRGB, rumus WCAG) memakai skrip baru `.design-audit/g1-04-contrast.mjs`.
- [x] Tidak ada berkas terlarang disentuh (`src/lib/engagement.ts`, `src/template/**`, `formatRupiah`, CSV, `paymentRepo.ts` tidak muncul di `git diff --name-only`).
- [x] Tidak ada perubahan perilaku — tidak ada logika/handler/struktur JSX yang berubah.
- [x] Gate: `npx tsc -b` **exit 0** · `npm run lint` **exit 0** · `npm run build` **exit 0** (`dist/sw.js` dibuat) · `npm test` **653/653 lulus** (1 kegagalan pertama = timeout beban pada `backup.test.ts`, lolos saat diulang).
- [ ] Screenshot sebelum/sesudah — **belum diambil** (lihat Catatan verifikasi di bawah).

**Catatan verifikasi screenshot (ketidakmampuan + cara manual):**

- **"Sebelum"** sudah tersedia sebagai artefak audit: `.design-audit/uiux-v1793/` (111 PNG + 111 JSON metrik) memuat angka gagal asli untuk ke-13 titik.
- **"Sesudah"** butuh menjalankan Playwright (browser + dev server Vite). Di mode sandbox default Playwright gagal `spawn EPERM`; gate `npm test`/`npm run build` juga hanya bisa jalan setelah eskalasi akses. Karena perubahan sudah diterapkan, "sebelum" tidak bisa direproduksi lagi tanpa `git stash` sementara.
- **Cara manual (pemilik, ±5 menit):** buka `npm run dev` di Android/Chrome → (1) Beranda: banner backup ("Besok" & "Backup" harus terbaca jelas di atas kuning muda) + kalender: header "Min" dan angka hari Minggu; (2) Beranda → kotak "Perlu Perhatian": baris tanggal sesi terlewat; (3) Murid: tombol "Hapus" per kartu; (4) Detail murid → tab **Progres** (chip "😴 Ngantuk"), tab **Sesi** (chip status merah), tab **Proyek** ("Nh terlambat"/"Nh lagi"); (5) Pengaturan → Backup & Restore: tombol amber "Hapus N foto lama" + chip periode "Bulan ini" (keadaan disabled); (6) form Murid: teks "Menggunakan tarif default dari Pengaturan".
- Bila ingin bukti otomatis: `npm run e2e:uiux` (hasil `G1-11`) akan membandingkan sebelum/sesudah secara numerik.

---

### G1-05 — ✅ SELESAI: nag backup — kompensasi tinggi + tombol tutup + jangan tampil di wizard

| Field | Isi |
|---|---|
| ID | G1-05 |
| Judul | Nag mingguan tidak boleh menutupi konten & bisa ditutup — **selesai 2026-10-01** |
| Berkas disentuh | `src/App.tsx` (+19/−1 baris inti) · `src/index.css` (+7/−1) |
| Dependency | G1-01 |
| Latar | **L-02 (sisa)**: `.app-shell` hanya mengompensasi bottom-nav (64px+1rem), nag menempati 76–146px dari bawah → konten terbawah tertutup |
| Estimasi | S — **selesai** |
| Keputusan pemilik | — |
| Amandemen terkait | — |
| Catatan | Banner **atas** (offline/penyimpanan/backup menua) **tidak diubah** ✓. Yang diperbaiki hanya nag bawah |

**Hasil (dilaksanakan 2026-10-01) — sebelum → sesudah:**

| # | Item | Sebelum | Sesudah |
|---|---|---|---|
| 1 | Publikasi tinggi nag | — (tidak ada) | `--nag-h` di `:root` (`index.css`), di-set oleh `ResizeObserver` atas `[data-nag]` (`App.tsx`), **0px** saat nag tidak tampil |
| 2 | Kompensasi `.app-shell` | `padding-bottom: calc(nav + safe + 1rem)` = **80px** | `+ var(--nag-h, 0px)` → **196px** saat nag tampil (64+16+116) |
| 3 | Tombol tutup | **tidak ada** (hanya "Besok" & "Backup") | `<button aria-label="Tutup pengingat backup">` + `CloseIcon` (SVG, bukan emoji), target **44×44px**, `text-amber-800` |
| 4 | Ingat penolakan | — | `localStorage.leskolui_nag_snooze_until` = **+7 hari** (pola `pwaInstall.ts`) |
| 5 | Layar tugas | nag tampil di `/capture` | disembunyikan (`useLocation().pathname.startsWith("/capture")`) |
| 6 | Saat modal terbuka | nag tampil di atas modal | disembunyikan bila ada `[role="dialog"]` (MutationObserver) — mencakup modal Laporan |
| 7 | Kontras subtitle nag | `text-amber-600` di `amber-50` = **3,08:1 (gagal)** | `text-amber-700` = **4,87:1** |

**Pilihan periode penolakan: satu siklus mingguan (7 hari), bukan permanen.** Alasan: (a) aplikasi sendiri berirama mingguan (`AUTO_BACKUP_INTERVAL_DAYS = 7`), (b) nag ini pengingat **perlindungan data** — menolak permanen menghapus pengingat satu-satunya di perangkat yang belum pernah backup, (c) pola "sampai" yang sama sudah dipakai `pwaInstall.ts`. Tombol "Besok" tetap ada dan tetap berarti **+1 hari** (bukan 7) — sudah benar di kode (`App.tsx:240`), jadi tidak diubah.

**Catatan implementasi yang perlu diketahui pemilik:**

- **Nag juga disembunyikan saat modal apa pun terbuka** (mis. changelog rilis baru), bukan hanya modal Laporan. Ini **superset** dari permintaan dan disengaja: dua lapisan mengambang sekaligus mengganggu. Efeknya: pada perangkat yang baru memperbarui versi, nag menunggu sampai changelog ditutup.
- Nag `fixed` sengaja **tidak** mengubah kondisi "banner atas menang atas nag" (`!staleBackup && !storageWarn`) — sesuai larangan mengubah jumlah banner bersamaan.
- Tinggi nag terukur **116px** (audit memperkirakan 76–146px) — teks 2 baris + tombol.
- Deteksi modal memakai `[role="dialog"]`: semua modal aplikasi memakainya (`Modal.tsx:62`, `QuickExpenseModal:70`, `InvoiceModal:55`, `SessionDetailModal:133`, `ChangelogModal:47`, `MonthlyReport:1898`, `StudentDetail:716,944`). Bila kelak ada modal tanpa `role="dialog"`, nag tidak akan ikut tersembunyi.

**Verifikasi runtime (Playwright, 412×839, spec sementara — bukti di `.design-audit/g1-05/`):**

| Uji | Hasil | Angka |
|---|---|---|
| 1. Nag tampil & konten terakhir terjangkau | ✅ | `--nag-h = 116px` · `padding-bottom = 196px` (= 64+16+116) · di dasar gulir: elemen terakhir `bottom = 643` vs **nag top = 647 → gap +4px** (sebelum perbaikan: **−112px**) |
| 2. Tombol tutup → nag hilang, tahan reload | ✅ | snooze = now+7 hari · setelah reload `nagVisible=false`, `--nag-h = 0px`, `padding-bottom = 80px` |
| 3. Tidak tampil di `/capture` | ✅ | `nagVisible=false`, `--nag-h = 0px` |
| 4. Disembunyikan saat modal, muncul lagi setelah modal ditutup | ✅ | `--nag-h = 0px` selama dialog ada; nag kembali setelah dialog hilang |

**DoD terverifikasi:**
- [x] `--nag-h` dipublikasikan & **0px** saat nag tidak tampil (bukti: uji 2, 3, 4).
- [x] `padding-bottom` `.app-shell` mengompensasi `--nag-h` — diukur, bukan diasumsikan: **196px = 64+16+116**.
- [x] Di 412px, saat nag tampil, elemen terakhir **bisa dijangkau** (gap **+4px** di dasar gulir).
- [x] Tombol tutup ada, berfungsi, dan menolak nag **7 hari**.
- [x] Nag tidak muncul di `/capture` dan saat modal (`role="dialog"`) terbuka.
- [x] Kontras nag ≥4,5:1: judul 6,88 · subtitle 4,87 · "Besok" 4,87 · "Backup" 5,05 · ikon tutup 6,88 (hover `amber-100` juga diperiksa).
- [x] Tidak menyentuh berkas terlarang; banner atas, `--top-banner-h`, `--task-bar-h` tidak diubah.
- [x] Gate: `npx tsc -b` 0 · `npm run lint` 0 · `npm test` **653/653** · `npm run build` 0 · `check-md-links` rusak 0.
- [x] Bukti runtime: 3 PNG + 4 JSON di `.design-audit/g1-05/` (di luar repo).

> **Spec uji runtime tidak disimpan di repo tanpa persetujuan**: salinannya ada di
> `.design-audit/g1-05/zz-g1-05-nag.spec.ts.txt`. Bila pemilik ingin menjadikannya penjaga regresi permanen
> (`e2e/nag-backup.spec.ts`, ikut `npm run e2e`), itu **berkas baru** → butuh keputusan pemilik.

**Keputusan pemilik yang perlu diingat (ditanyakan & dijawab 2026-10-01):**

| Kode | Keputusan | Isi |
|---|---|---|
| **D1** | Spec nag backup jadi **tes regresi permanen** | Disalin ke `e2e/nag-backup.spec.ts` supaya ikut `npm run e2e`. Catatan: berkas itu **belum ada** di repo saat gelombang ini ditutup — jalankan sebagai bagian dari penutupan gelombang |
| **D2** | Aturan "nag sembunyi saat modal apa pun" **dipertahankan** sebagai perilaku tetap | Bukan jalan pintas sementara: dua lapisan mengambang sekaligus memang mengganggu |

**Angka terverifikasi (runtime Playwright 412×839 — bukti di `.design-audit/g1-05/`):**

| Uji | Sebelum | Sesudah |
|---|---|---|
| Gap elemen terakhir ke atas nag di dasar gulir | **−112 px** (tertutup) | **+4 px** (terjangkau) |
| `padding-bottom` `.app-shell` | 80 px | **196 px** (= 64 + 16 + 116) saat nag tampil · 80 px saat tidak |
| Kontras subtitle nag (`amber-600` di `amber-50`) | 3,08:1 (gagal) | **4,87:1** |

**DoD terverifikasi:**
- [x] `--nag-h` dipublikasikan & **0px** saat nag tidak tampil (bukti: uji 2, 3, 4).
- [x] `padding-bottom` `.app-shell` mengompensasi `--nag-h` — diukur, bukan diasumsikan: **196px = 64+16+116**.
- [x] Di 412px, saat nag tampil, elemen terakhir **bisa dijangkau** (gap **+4px** di dasar gulir).
- [x] Tombol tutup ada, berfungsi, dan menolak nag **7 hari**.
- [x] Nag tidak muncul di `/capture` dan saat modal (`role="dialog"`) terbuka.
- [x] Kontras nag ≥4,5:1: judul 6,88 · subtitle 4,87 · "Besok" 4,87 · "Backup" 5,05 · ikon tutup 6,88.
- [x] Tidak menyentuh berkas terlarang; banner atas, `--top-banner-h`, `--task-bar-h` tidak diubah.
- [x] Bukti runtime: 3 PNG + 4 JSON di `.design-audit/g1-05/` (di luar repo).
- [ ] **D1 belum dikerjakan:** `e2e/nag-backup.spec.ts` belum disalin ke repo (butuh keputusan berkas baru).

---

### G1-06 — ✅ SELESAI: umpan balik toast sukses/gagal + aksi "Coba lagi"

| Field | Isi |
|---|---|
| ID | G1-06 |
| Judul | Kegagalan tidak boleh tampil seperti keberhasilan — **selesai 2026-10-01** |
| Berkas disentuh | `src/screens/home/Home.tsx` · `src/screens/Settings.tsx` · `src/screens/CaptureSession.tsx` · `src/screens/captureSession/helpers.ts` · `src/__tests__/captureSessionHelpers.test.ts` · `src/lib/version.ts` · `package.json` · `docs/README.md` · dokumen ini |
| Dependency | — |
| Latar | **L-08** (semua hasil lewat `toast.info`), **C-11** (pesan gagal simpan mentah, tanpa "Coba lagi") |
| Estimasi | S — **selesai** |
| Keputusan pemilik | **Q13 = A** (prompt tetap `info`) · **Q14 = A** (`Students.tsx:209` tidak disentuh) |
| Amandemen terkait | — |
| Catatan | `ToastProvider` **sudah** punya `success`/`error` — tidak ada komponen baru. Tidak ada util baru: `saveErrorMessage` + `feedbackTypeForResult` masuk `captureSession/helpers.ts` |

**Hasil (dilaksanakan 2026-10-01) — jenis toast per lokasi:**

| # | Lokasi | Sebelum | Sesudah | Pesan |
|---|---|---|---|---|
| 1 | `home/Home.tsx:99` (penerus `msg`, dipakai `:226,230,237,243`) | `toast.info` untuk **semua** hasil | `feedbackTypeForResult()` → `error`/`success` | pesan dari 4 modal |
| 2 | `Settings.tsx:367` | `info` | **`success`** | "Pengaturan disimpan ✓" |
| 3 | `Settings.tsx:369` | `info` | **`error`** | "Gagal: …" |
| 4 | `Settings.tsx:383` | `info` | **`error`** | "Logo gagal diproses: …" |
| 5 | `Settings.tsx:442` | `info` | **`success`** | "PIN berhasil diperbarui ✓" |
| 6 | `Settings.tsx:465` | `info` | **`success`** | "Backup berhasil diunduh ✓" |
| 7 | `Settings.tsx:489` | `info` | **`success`** | "Restore berhasil! Memuat ulang... ✓" |
| 8 | `Settings.tsx:503` | `info` | **`success`** | "Backup ke Google Drive berhasil ✓" |
| 9 | `Settings.tsx:529` | `info` | **`success`** | "Restore dari Drive berhasil! …" |
| 10 | `Settings.tsx:536` | `info` | **`success`** | "Data diekspor ke CSV ✓" |
| 11 | `Settings.tsx:551` | `info` | **`success`** | "Backup valid ✓ N murid …" |
| 12 | `Settings.tsx:553` | `info` | **`error`** | "Verifikasi gagal: …" |
| 13 | `Settings.tsx:568` | `info` | **`success`** | "Relay backup OK ✓ …" |
| 14 | `Settings.tsx:570` | `info` | **`error`** | "Relay gagal: …" |
| 15 | `Settings.tsx:582` | `info` | **`success`** | "Auto backup Drive aktif ✓ …" |
| 16 | `Settings.tsx:603` | `info` | **`success`** | "Semua data berhasil dihapus ✓ …" |
| 17 | `Settings.tsx:619` | `info` | **`error`** | "Gagal: …" |
| 18 | `Settings.tsx:1026` | `info` | **`error`** | "File tidak bisa dibaca: …" |
| 19 | `Settings.tsx:1181` | `info` | **`success`** | "Cache dibersihkan ✓ Muat ulang..." |
| 20 | `CaptureSession.tsx:499` (catch `handleSave`) | `setMessage("Gagal: " + e.message)` | `saveErrorMessage(e)` + **retry `"save"`** | "Penyimpanan perangkat penuh…" / "Perangkat menolak menyimpan data…" / "Simpan gagal: …" |
| 21 | `CaptureSession.tsx:528` (catch `handleCloseOutDone`) | pesan lama + `e.message` mentah | `saveErrorMessage(e)` + **retry `"closeout"`** | "Sesi sudah tersimpan; tindak lanjut belum tersimpan. …" |
| 22 | `CaptureSession.tsx:865-882` (banner `role="alert"`) | hanya teks + tombol tutup | tombol **"Coba lagi"** (min-h 44px) → `handleSave` **atau** `handleCloseOutDone` sesuai `retry` | — |

**Temuan yang mengubah rencana (angkat sebagai Q16):**

| Kode | Temuan | Tindakan |
|---|---|---|
| **Q16a** | Tombol "Coba lagi" **tidak boleh** memanggil `handleSave` untuk kegagalan close-out: sesi **sudah** tersimpan, jadi memanggil `handleSave` akan menyimpan sesi kedua kali | State `message` menyimpan `retry: "save" \| "closeout" \| null`; tombol memilih handler sesuai nilai itu |
| **Q16b** | Pesan `saveErrorMessage` ("Penyimpanan perangkat penuh…") **tidak** dikenali sebagai kegagalan oleh classifier (`/^(Gagal\|Pilih)\b/`) → bila kelak tampil sebagai toast, ia terbaca sebagai keberhasilan | Classifier dijadikan satu regex `KATA_GAGAL` yang memuat dua kata kunci pesan mapper + tes kontrak silang |
| **Q16c** | Regex `localStorage\|storage is not\|penyimpanan` **tidak** cocok untuk pesan DOM "Failed to execute 'setItem' on 'Storage'": alternasi `storage is not` diperiksa lebih dulu, sehingga "Storage" sendirian gagal cocok | Pola disederhanakan jadi `/storage\|penyimpanan/i` + catatan urutan alternasi. **Ditemukan oleh tes baru**, bukan oleh pembacaan kode |
| **Q16d** | Banner pesan berada **di halaman**, sedangkan kegagalan close-out terjadi **di dalam modal** `CloseOutSheet` (`role="dialog"`, focus-trap). Tombol "Coba lagi" untuk `retry = "closeout"` karena itu tidak terjangkau keyboard selama modal terbuka | **Tidak diperbaiki di sini** (di luar lingkup). Kandidat perbaikan: `G1-10` (a11y) atau `G2` |

**Prompt yang sengaja TETAP `info` (Q13 = A):** `:378, 379, 450, 457, 458, 472, 494, 495, 507, 512, 541, 545, 578, 587, 988, 1004, 1005, 1018, 1019, 1057, 1064, 1134` — semuanya permintaan/keadaan (mis. "Masukkan kata sandi backup!"), bukan hasil aksi. `:495` tetap `info` karena itu **progres** ("Backup ke Google Drive...") yang memang belum selesai.

**Berkas yang sengaja TIDAK disentuh (Q14 = A):** `src/screens/Students.tsx` — pesan gagalnya **sudah** `toast.error` (`:194`) dan keberhasilannya sudah `toast.success` (`:176,179,206,212`); satu-satunya `toast.info` di sana (`:209` "dipindah ke historis") bukan kegagalan. Isi §3 dokumen 06 yang berbunyi "semuanya `toast.info`" berlaku untuk Pengaturan/Beranda, bukan berkas ini.

**DoD terverifikasi:**
- [x] **0** pemanggilan `toast.info` untuk pesan gagal di 3 berkas G1-06 (bukti grep rekursif di bawah).
- [x] Gagal simpan sesi menampilkan banner `role="alert"` + tombol "Coba lagi" yang memanggil handler sesuai jenis kegagalan (verifikasi jangkar + tes routing).
- [x] `saveErrorMessage` memetakan `QuotaExceededError`, kegagalan tulis `localStorage`/`SecurityError`, error generik, dan nilai non-Error (tanpa "undefined").
- [x] Tes baru: **9 kasus** di `captureSessionHelpers.test.ts` — 5 `saveErrorMessage` (QuotaExceeded, tulis `localStorage`, `SecurityError`, generik, non-Error/`undefined`) + 4 `feedbackTypeForResult` (termasuk tes kontrak silang). Suite **653 → 663**; berkas `captureSessionHelpers.test.ts` sendiri **23 → 41** tes.
- [ ] **Manual:** matikan IndexedDB lewat devtools lalu simpan sesi → pesan manusiawi + tombol "Coba lagi" (belum dijalankan manusia; tidak ada browser di lingkungan ini).

**Bukti grep rekursif (target 0):**

```powershell
Get-ChildItem -Recurse src -Include *.tsx -File | Select-String "toast.info" | Where-Object { $_.Line -match "Gagal|gagal|Verifikasi" }
# hasil: 0 baris pernyataan (satu-satunya kecocokan adalah KOMENTAR di Home.tsx yang menjelaskan pola lama)
```

**Verifikasi (angka):**

| Uji | Hasil |
|---|---|
| `npx tsc -b` | exit **0** |
| `npx eslint src` | exit **0** |
| `npm test` (pool `threads`, 2 worker) | **663/663 lulus**, 55 berkas (sebelum: 653/653, 54 berkas; satu pengukuran antara sempat membaca 662 — selisih 1 tes berasal dari suite lama, bukan dari perubahan G1-06: `captureSessionHelpers.test.ts` stabil di 41) |
| Verifikasi tombol "Coba lagi" (uji negatif: `QuotaExceededError` dipaksa) | 2 `catch` memuat `retry` yang benar · JSX memilih `handleSave`/`handleCloseOutDone` dari `retry` · pesan "Penyimpanan perangkat penuh…" **bukan** pesan mentah · 45/45 tes hijau |
| Gate | `tsc` ✓ · `eslint` ✓ · `test` 663/663 ✓ · `build` ✓ (dist/sw.js) · `check-md-links` ✓ (rusak 0) · **`e2e` tidak dijalankan** (Q17) |

**Q17 — kendala lingkungan (bukan regresi kode).** Dua hambatan ditemukan; keduanya sudah dilewati **tanpa** mengubah repo:

1. `vitest` gagal start: Vite memanggil `child_process.exec("net use")` di `optimizeSafeRealPathSync()` (Windows) dan sandbox memblokir piped stdio → `spawn EPERM`. Dilewati dengan shim `--require` di direktori temp (`C:\Users\lieml\AppData\Local\Temp\dsh-no-exec.cjs`, **di luar repo**) yang menjawab `exec` seperti cabang "gagal" milik Vite.
2. Pool `forks` milik vitest menggantung (worker butuh pipa antarproses) → dipakai `npx vitest run --pool=threads --maxWorkers=2`. **`npm test` polos masih memakai `forks`** dan akan menggantung; ini perlu diputuskan pada tugas berikutnya (mis. `pool: "threads"` di `vite.config.ts`) — **belum diubah** karena `vite.config.ts` di luar lingkup G1-06.

> **Catatan angka:** baris riwayat G1-04/G1-05 di bawah menyebut **653/653** karena suite memang berukuran
> 653 tes (54 berkas) saat kedua tugas itu ditutup; G1-06 menambah 10 tes menjadi **663** (55 berkas).
> Angka lama **tidak** direvisi — ia benar untuk versi kode saat itu.

---

### G1-07 — ✅ SELESAI: state memuat — skeleton Beranda + error-state Pengaturan

| Field | Isi |
|---|---|
| ID | G1-07 |
| Judul | Jangan tampilkan "kosong" saat data belum siap; sediakan jalan keluar saat gagal — **selesai 2026-10-01** |
| Berkas disentuh | `src/screens/home/TodayHero.tsx` · `src/screens/home/Home.tsx` · `src/screens/Settings.tsx` · `src/screens/captureSession/helpers.ts` · `src/lib/settingsPresentation.ts` · `src/__tests__/captureSessionHelpers.test.ts` · `src/__tests__/settingsLoadGate.test.ts` (baru) · `src/lib/version.ts` · `package.json` · `docs/README.md` · `docs/kerja/ATURAN-AI.md` · dokumen ini |
| Dependency | — |
| Latar | **B-01** (empty state palsu), **L-09** (memuat tanpa skeleton & bisa menggantung) |
| Estimasi | S — **selesai** |
| Keputusan pemilik | — (Q16d dari G1-06 dicatat di §4) |
| Amandemen terkait | — |
| Catatan | `components/Skeleton.tsx` dipakai apa adanya (tidak ada komponen baru) |

**Hasil (dilaksanakan 2026-10-01) — sebelum → sesudah:**

| # | Lokasi | Sebelum | Sesudah |
|---|---|---|---|
| 1 | `home/TodayHero.tsx:64-65` (blok sesi) | `ordered.length === 0` → langsung `EmptyState` "Tidak ada sesi hari ini" | prop `loading?: boolean`; saat `true` render **3 baris `Skeleton`** (`data-loading="true"`, `aria-busy`) — empty state hanya saat data sudah siap |
| 2 | `home/Home.tsx` (pemanggil `TodayHero`) | tanpa prop `loading` | `loading={todayHeroLoadState(todaySessions, students) === "loading"}` |
| 3 | `Settings.tsx:331` | `if (!settings \|\| !form) return <div>Memuat pengaturan...</div>` (teks polos, tanpa jalan keluar) | `settingsLoadGate()` → **"loading"** = `Skeleton variant="card"` + 3 baris teks; **"failed"** = `role="alert"` "Pengaturan gagal dimuat" + tombol **"Coba lagi"**; **"ready"** = form |
| 4 | `Settings.tsx` (jalur gagal, baru) | tidak ada — kegagalan tidak terlihat sama sekali | **probe** `db.settings.get("app")` (menangkap galat, tidak berjalan ulang setelah gagal sampai tombol ditekan) + **watchdog 8 detik** (`SETTINGS_LOAD_TIMEOUT_MS`) |
| 5 | `Settings.tsx` (tombol) | — | "Coba lagi" = `setSettingsError(null)` + `setSettingsTimedOut(false)` + `setSettingsNonce(n+1)` → `useLiveQuery` benar-benar membaca ulang |

**Fungsi murni baru (bisa diuji tanpa merender layar):**

| Fungsi | Berkas | Aturan |
|---|---|---|
| `todayHeroLoadState(todaySessions, students)` | `captureSession/helpers.ts` | `undefined` di salah satu → `"loading"`; daftar kosong yang SUDAH dimuat → `"ready"` |
| `settingsLoadGate({settingsLoaded, formReady, error, timedOut})` | `lib/settingsPresentation.ts` | gagal (`error`/`timedOut`) **diperiksa sebelum** memuat — kalau urutannya terbalik, layar menggantung selamanya |

**Kontradiksi baru (Q18) — diangkat, tidak diimprovisasi:**

| Kode | Temuan | Tindakan |
|---|---|---|
| **Q18a** | `useLiveQuery` pada layar Pengaturan **tidak punya saluran galat**: observable-nya hanya membawa nilai, jadi `getSettings()` yang menolak membuat `settings` tetap `undefined` — kegagalan mustahil dibedakan dari "masih memuat" tanpa alat tambahan | Ditambahkan **probe** independen ke store yang sama; setelah gagal, probe tidak dijalankan ulang sampai tombol ditekan (mencegah loop request) |
| **Q18b** | Bahkan dengan probe, penyimpanan yang **tidak pernah menjawab** (mis. terkunci tab lain) tetap menggantung | Ditambahkan **watchdog 8 detik** → keadaan gagal + tombol "Coba lagi". Batas ini juga menjadi satu-satunya jaminan "tidak ada layar tanpa ujung" |
| **Q18c** | Permintaan awal ("bungkus pemuat pengaturan dengan `try/catch`") **tidak bisa** dipenuhi apa adanya: tidak ada pemanggilan langsung yang bisa dibungkus, dan alternatifnya (`getSettings()` melempar saat gagal, `useLiveQuery` dengan `catch`) menyentuh **6 layar lain** yang memakai fungsi repo yang sama | Dipakai probe + watchdog **hanya di layar Pengaturan**; `getSettings()` **tidak** diubah. Bila pemilik menginginkan jalur galat tunggal untuk semua layar, itu tugas tersendiri (usul: `G2`) |

**DoD terverifikasi:**
- [x] Beranda tidak menampilkan "Tidak ada sesi hari ini" saat data masih `undefined` — **verifikasi runtime**: skeleton pernah tampil (`data-loading="true"`), dan empty state **tidak pernah** muncul selama skeleton ada.
- [x] Pengaturan: skeleton saat memuat; error-state `role="alert"` + tombol "Coba lagi" saat gagal — **verifikasi runtime**: dengan IndexedDB dibuat gagal total, `role="alert"` "Pengaturan gagal dimuat" tampil + tombol "Coba lagi" ada dan bisa ditekan (tetap di error-state selama penyimpanan masih rusak, tanpa crash).
- [x] Tombol "Coba lagi" benar-benar memanggil ulang pembacaan (nonce → `useLiveQuery` jalan lagi).
- [x] Tidak menyentuh berkas terlarang; `vite.config.ts` tidak berubah.
- [x] Tes baru **7 kasus** (5 gate Pengaturan + 2 keadaan Beranda); suite **663 → 670**.

**Tidak dikerjakan dari rencana lama (sengaja, menunggu keputusan):** Langkah 5 rencana asli —
`Settings.tsx` `StorageUsage` (baris sekitar 62-81) — **belum** diubah: saat ini ia tetap `return null` bila
`navigator.storage.estimate()` gagal, sehingga baris "Penyimpanan Lokal" hilang diam-diam. Tugas G1-07 yang
diberikan hanya menyebut TodayHero + Home + jalur loading/gagal Pengaturan, jadi perubahan ini tidak
diimprovisasi. Usul: kerjakan bersama G1-08 (sama-sama menyentuh Pengaturan).

---

### G1-08 — ✅ SELESAI: konfirmasi aksi destruktif kecil (+ StorageUsage + spec loading-states)

| Field | Isi |
|---|---|
| ID | G1-08 |
| Judul | Aksi permanen wajib minta konfirmasi (pola `ConfirmSheet` yang sudah ada) — **selesai 2026-10-01** |
| Berkas disentuh | `src/screens/payments/TagihanTab.tsx` · `src/screens/payments/InvoiceRow.tsx` · `src/screens/CaptureSession.tsx` · `src/screens/captureSession/CloseOutSheet.tsx` · `src/screens/Settings.tsx` · `src/lib/settingsPresentation.ts` · `src/__tests__/settingsLoadGate.test.ts` · `e2e/loading-states.spec.ts` (baru) · `e2e/nag-backup.spec.ts` · `src/lib/version.ts` · `package.json` · `docs/README.md` · `docs/kerja/GELOMBANG-2.md` · dokumen ini |
| Dependency | — |
| Latar | **K-02**, **C-05**, **S-08**, **S-10** + **langkah StorageUsage** yang ditunda dari G1-07 |
| Estimasi | M — **selesai** |
| Keputusan pemilik | 2026-10-01: Q18a–c → tugas **G2-10** (dicatat di `GELOMBANG-2.md`, **tidak** dikerjakan) · StorageUsage digabung ke sini · spec loading-states dibuat permanen |
| Amandemen terkait | — |
| Catatan | **Batas lingkup dipatuhi:** penggantian `confirm()`/`prompt()` native → dialog internal = **G3-09**; peringatan asal tagihan **K-01** = **G3-02**. Keduanya tidak dikerjakan di sini |

**Hasil (dilaksanakan 2026-10-01) — per aksi:**

| # | Lokasi | Sebelum | Sesudah |
|---|---|---|---|
| 1 | `TagihanTab.tsx` `onTogglePaid` (K-02) | `payment.status === "PAID" ? markPaymentUnpaidById(...) : markPaymentTransferredById(...)` dijalankan **langsung** — satu ketukan salah mengubah uang masuk | `askTogglePaid()` → `ConfirmSheet` yang menyebut akibatnya: **"Uang masuk +Rp X dan piutang −Rp X"** (menandai lunas) / **"…uang masuk berkurang…"** (membatalkan). Batal tidak mengubah apa pun |
| 2 | `InvoiceRow.tsx` label | "Batalkan pelunasan" | **"Tandai belum dibayar"** |
| 3 | `TagihanTab.tsx` umpan balik | hanya teks `setMessage` (tanpa jalan kembali) | `toast.show(..., "success"/"info", 8000, { label: "Urungkan", onClick })` — urungkan memanggil fungsi kebalikannya. Plus `setMessage` ringkas untuk pembaca layar (`role="status"`/`alert` di `Payments.tsx`) |
| 4 | `CaptureSession.tsx` hapus foto (C-05) | `setPhoto(undefined)` langsung | `ConfirmSheet` danger: "Foto bukti kehadiran akan dihapus dan tidak bisa dikembalikan — ambil ulang dari kamera…" |
| 5 | `CaptureSession.tsx` hapus TTD (C-05) | `setSignature(undefined)` langsung | `ConfirmSheet` danger: "Tanda tangan murid akan dihapus dan tidak bisa dikembalikan…" |
| 6 | `CaptureSession.tsx` → `CloseOutSheet.tsx` hapus tindak lanjut (C-05) | `onDeleteFollowUp={(id) => setCoFollowUps(...)}` langsung; tombol **tanpa** nama aksesibel | `requestDeleteFollowUp()` → `ConfirmSheet` danger yang menyebut teksnya; tombol hapus diberi `aria-label={\`Hapus tindak lanjut: ${text}\`}` |
| 7 | `Settings.tsx` hapus cache (S-08) | `"🗑️ Hapus Cache & Muat Ulang"` dijalankan langsung (service worker dicabut tanpa peringatan) | **"🧹 Bersihkan Cache (butuh internet setelahnya)"** + konfirmasi ("Setelah ini aplikasi butuh internet untuk dibuka… data murid/sesi/tagihan/laporan/pengaturan **TIDAK** terhapus") + **dipindah ke baris terakhir** bagian Aplikasi (setelah "Keluar Aplikasi") |
| 8 | `Settings.tsx` foto (S-10) | **terbalik**: "Hapus N foto lama" langsung jalan; "Perkecil foto" memakai `confirm()` native | Dibetulkan: **HAPUS** → `ConfirmSheet` danger ("DIHAPUS PERMANEN", "TIDAK ada di file backup", saran pakai Perkecil) + tombol outline merah · **PERKECIL** → **tanpa** dialog (tidak destruktif) |
| 9 | `Settings.tsx` `StorageUsage` (dari G1-07) | `return null` saat `navigator.storage.estimate()` gagal / API tak ada → baris "Penyimpanan Lokal" **hilang diam-diam** | Pesan **"Perkiraan penyimpanan tidak tersedia di browser ini"**; barisnya selalu tampil. Aturan diuji lewat fungsi murni `storageUsageState()` |

**Catatan implementasi:**

- **Undo K-02 memakai `toast.show(..., action)`** (API yang sudah ada) dengan jendela **8 detik** — pola "Undo Hasil AI" di `MonthlyReport` memakai tombol di layar, bukan toast, jadi ini **pola pertama** untuk toast ber-aksi. Konsekuensinya: `toast.success()/error()` tidak menerima aksi, sehingga aksi krusial memakai `show()` langsung.
- **Warna tombol hapus foto lama** diubah dari `bg-amber-700` (isi) menjadi outline merah (`border-red-300 bg-white text-red-700`). Kontras teks **6,02:1** (palet Tailwind v4; `red-700` #b91c1c di atas putih) — di atas ambang AA. Isi (`bg-red-600`) sengaja **tidak** dipakai supaya tombol permanen tidak terlihat lebih menarik daripada tombol aman di bawahnya.
- **`ConfirmSheet` tidak diubah** (tanpa berkas/modal baru); `danger` + `busy` sudah ada.
- **Aksi inti tidak berubah**: `markPaymentTransferredById`, `markPaymentUnpaidById`, `pruneSessionPhotosBefore`, `shrinkSessionPhotosBefore` tetap dipanggil apa adanya.

**Spec permanen baru — `e2e/loading-states.spec.ts` (4 tes):**

| Tes | Isi |
|---|---|
| 1 | Beranda: rangka (`[data-loading]`) **pernah** tampil saat data belum siap |
| 2 | Beranda: empty state "Tidak ada sesi hari ini" **tidak pernah** tampil selama rangka ada (CPU throttling CDP 6× supaya jendelanya terukur) |
| 3 | Pengaturan: IndexedDB menolak → `role="alert"` + tombol "Coba lagi" (dan tetap error-state saat tombol ditekan, tanpa `pageerror`) |
| 4 | Pengaturan: IndexedDB **tidak pernah menjawab** → galat setelah batas tunggu (>7 dtk), bukan seketika |

Hasil: **4/4 lulus di `chromium` (30,4 s) dan `mobile` (27,1 s)**. Tanpa tag — `testDir: "./e2e"` membuatnya otomatis ikut `npm run e2e` (konsisten dengan `nag-backup.spec.ts`).

**DoD terverifikasi:**
- [x] `e2e/loading-states.spec.ts` permanen di repo, 4 tes lulus di 2 project.
- [x] 5 aksi destruktif memakai `ConfirmSheet` (verifikasi runtime + statis).
- [x] "Batalkan pelunasan" → "Tandai belum dibayar".
- [x] Hapus cache: konfirmasi + label baru + posisi baru (baris terakhir bagian).
- [x] Prioritas konfirmasi foto ditukar (hapus = konfirmasi, perkecil = tanpa).
- [x] `StorageUsage` gagal → pesan informatif, bukan `return null`.
- [x] Berkas terlarang: **0**; `vite.config.ts` **tidak** disentuh.
- [x] Tes baru **2 kasus** (`storageUsageState`); suite **670 → 672**.

**Bukti runtime (`e2e/zz-g1-08-verified.spec.ts`, spec sementara — 8/8 lulus, salinan di `.design-audit/g1-08/`):**

| Uji | Hasil |
|---|---|
| 1. Tagihan "Tandai sudah dibayar" → konfirmasi menyebut "Uang masuk +Rp" & "piutang −Rp"; **Batal tidak mengubah apa pun** | ✓ |
| 2. Konfirmasi "Tandai lunas" benar-benar mengeksekusi; tombol **"Urungkan"** tampil; tagihan keluar dari saringan "Belum dibayar" | ✓ |
| 3. "Tandai belum dibayar" (saringan Lunas) → konfirmasi "uang masuk berkurang" + tombol Urungkan tampil | ✓ |
| 3b. **"Urungkan" mengembalikan status** (tagihan kembali jadi piutang) | ✓ |
| 4. "🧹 Bersihkan Cache (butuh internet setelahnya)" → konfirmasi berisi "butuh internet untuk dibuka" & "TIDAK terhapus"; label lama **0** | ✓ |
| 5. Foto lama: jalur klik **dilewati** (data seed tidak punya foto >6 bulan) — dijamin asersi statis: `confirm()` native hilang, `ConfirmSheet` danger + "DIHAPUS PERMANEN" + "TIDAK ada di file backup" ada | ✓ sebagian (jujur) |
| 6. Estimasi penyimpanan tidak tersedia → pesan "Perkiraan penyimpanan tidak tersedia di browser ini" | ✓ |
| 7. Catat Sesi & Close-out: tiga `ConfirmSheet` + `aria-label` tindak lanjut ada di kode; penghapusan langsung sudah tidak ada | ✓ statis |

Verifikasi manual tertunda: jalur klik hapus foto bukti / TTD / tindak lanjut di Catat Sesi langkah 6 — pemilik verifikasi manual.

**Catatan yang harus dibawa:**
- **Belum diverifikasi lewat browser:** jalur klik hapus foto / TTD / tindak lanjut (butuh wizard 6 langkah; hanya dibuktikan statis + manual).
- **Q16d** (tombol retry close-out tak terjangkau keyboard saat modal terbuka) tetap menunggu **G1-10**/**G2**.
- **Q18a–c** kini tercatat sebagai **G2-10** di `GELOMBANG-2.md`.

---

### G1-09 — Bug kepercayaan Pengaturan (teks reset + snapshot PIN basi)

| Field | Isi |
|---|---|
| ID | G1-09 |
| Judul | Perbaiki janji yang salah & penulisan pengaturan yang memundurkan metadata |
| Berkas disentuh | `src/screens/Settings.tsx` · `src/__tests__/settingsDirtyPatch.test.ts` · `src/__tests__/settingsSaveButton.test.ts` · `src/__tests__/settingsRepo.test.ts` · `e2e/loading-states.spec.ts` (batas project, keputusan #3) |
| Dependency | G1-01 |
| Latar | **S-01(a)** (teks "PIN tetap aman" salah), **S-03** (`handleSetPin` menulis snapshot penuh) |
| Estimasi | S — **selesai 2026-10-01** |
| Keputusan pemilik | #3 (sebagian: keputusan total-nya dikerjakan di **G3-10**) |
| Amandemen terkait | — |
| Catatan | Di tugas ini **hanya** teks + jalur tulis. Perubahan perilaku reset (hapus total + konfirmasi 2 lapis) = **G3-10** |

**Langkah (berurutan):**
1. `Settings.tsx:1127-1129` — ganti kalimat jaminan menjadi daftar eksplisit apa yang **hilang**:
   murid, sesi, tagihan, laporan, pengeluaran, **PIN Keuangan, kunci API AI, logo, profil & rekening bank**,
   catatan audit & draf.
2. `Settings.tsx:428-445` — ganti `saveSettings(updated as Settings)` menjadi
   `saveSettings(settingsDirtyPatch(savedFormRef.current ?? form, updated))`; setelah sukses:
   `savedFormRef.current = updated; setForm(updated); setDirty(false);`
3. Bungkus dengan `try/catch` → `toastCtx.error("PIN gagal disimpan: …")` (pakai hasil G1-06).
4. Tambah tes: (a) patch hanya memuat field yang berubah; (b) setelah simpan PIN, `dirty === false`.
5. Manual: ubah PIN → badge berubah "Tersimpan"; `lastBackupAt` **tidak** mundur (cek di IndexedDB devtools).

**Hasil (dilaksanakan 2026-10-01):**

| # | Perbaikan | Berkas:lokasi |
|---|---|---|
| 1 | Kalimat "Pengaturan, profil, dan PIN tetap aman" **dihapus**, diganti daftar jujur: **ikut terhapus** PIN Keuangan, pertanyaan keamanan, kunci API AI, logo, profil tutor, rekening bank, catatan audit, draf Catat Sesi yang belum tersimpan, pengingat backup terakhir — lalu **yang tetap ada**: file backup yang sudah diunduh (termasuk Drive) dan kata sandi backup yang mungkin tersimpan di browser | `Settings.tsx` §"Hapus Semua Data" |
| 2 | `handleSetPin` memakai `saveSettings(settingsDirtyPatch(savedFormRef.current ?? form, updated))`, lalu `savedFormRef.current = updated; setForm(updated); setDirty(false);` — dibungkus `try/catch` → `toastCtx.error("PIN gagal disimpan: …")` (pola G1-06) | `Settings.tsx` →`handleSetPin` |
| 3 | **6 tes baru**: 2 skenario PIN di `settingsDirtyPatch`, 2 di `settingsSaveButton`, 2 di `settingsRepo` (termasuk **bukti bug**: snapshot penuh memang memundurkan `lastBackupAt`) | `src/__tests__/` |
| 4 | Spec E2E `loading-states` dibatasi ke satu project: `test.skip(({ browserName, isMobile }) => browserName !== "chromium" \|\| isMobile)` di baris pertama `describe` — **`browserName` sendirian tidak cukup** karena project `mobile` memakai device `Pixel 7` yang `defaultBrowserType`-nya juga `chromium` (terbukti: 4 uji tetap jalan di `mobile`), jadi `isMobile` ikut diperiksa | `e2e/loading-states.spec.ts` |

**Bukti otomatis tes baru (672 → 678/678):**

| Uji | Hasil |
|---|---|
| `settingsDirtyPatch` — simpan PIN hanya mengirim `financialPin`/`securityQuestion`/`securityAnswer`; `lastBackupAt` & `driveBackup` dari snapshot lama **tidak** ikut | ✓ |
| `settingsDirtyPatch` — editan profil yang belum disimpan ikut terkirim bersama PIN (jadi `dirty=false` memang jujur) | ✓ |
| `settingsSaveButton` — setelah PIN disimpan dari form bersih, tombol kembali nonaktif berlabel "Tersimpan ✓" | ✓ |
| `settingsSaveButton` — editan profil yang belum disimpan tetap membuat tombol aktif sampai benar-benar disimpan | ✓ |
| `settingsRepo` — **bukti bug**: `saveSettings(snapshot penuh)` memundurkan `lastBackupAt` (2026-09-12 → 2026-09-01) | ✓ |
| `settingsRepo` — `saveSettings(settingsDirtyPatch(…))` menyimpan PIN **tanpa** memundurkan `lastBackupAt` | ✓ |

**DoD terverifikasi:**
- [x] Teks reset tidak lagi menjanjikan PIN/profil aman.
- [x] `grep -n "saveSettings({...form})" src/screens/Settings.tsx` = 0 (juga `as Settings` = 0; tinggal 2 patch eksplisit `{ lastBackupAt }` / `{ driveBackup, lastBackupAt }`).
- [x] Tes baru + `npm test -- settingsDirtyPatch settingsRepo settingsSaveButton` hijau (21/21 untuk tiga berkas itu).
- [x] Langkah 5 rencana ("ubah PIN → badge berubah Tersimpan; `lastBackupAt` tidak mundur") — **tidak lagi menunggu verifikasi manual pemilik**, sudah dibuktikan spec runtime di bawah.

**Bukti runtime di UI nyata (DoD langkah 5) — spec sementara `e2e/zz-g1-09-verified.spec.ts`, salinan di `.design-audit/g1-09/`:**

| Uji | Hasil |
|---|---|
| Form dibuat kotor (nama tutor diubah) → badge **"Belum disimpan"** tampil | ✓ |
| `lastBackupAt` **baru** (2026-09-12) ditulis langsung ke IndexedDB **setelah** form dibuka — meniru backup selesai dari alur lain | ✓ |
| PIN diganti lewat UI (jalur "Ganti PIN" → PIN lama `123456` dari seed dev → PIN baru) → toast "PIN berhasil diperbarui ✓" | ✓ |
| Badge **"Belum disimpan"** hilang setelah simpan PIN (`setDirty(false)` benar-benar jalan) | ✓ |
| IndexedDB **sesudah** simpan: `lastBackupAt` = **2026-09-12** (tidak mundur ke 2026-09-01), `financialPin` = hash `pbkdf2v2:`, `securityQuestion` tersimpan, editan profil ikut tersimpan | ✓ |
| Tanpa `pageerror` (aplikasi tidak crash) | ✓ |

**Catatan yang harus dibawa:**
- Kotak "Hapus Semua Data" **masih** memakai `confirm()`/`prompt()` native dan **belum** memakai `ConfirmSheet` (Q8) — sengaja tidak diubah: perilaku reset + konfirmasi 2 lapis + tawaran PIN baru adalah lingkup **G3-10** (keputusan pemilik #3).
- Spec runtime di atas **sementara** (tidak masuk `npm run e2e`) supaya tidak menambah biaya CI — sama seperti pola G1-08.

---

### G1-10 — ✅ SELESAI: A11y dasar: pola tab lengkap, hierarki heading, banner ber-`aria-live`

| Field | Isi |
|---|---|
| ID | G1-10 |
| Judul | Tab, heading, dan banner bisa dipahami pembaca layar — **selesai 2026-10-03** |
| Berkas disentuh | `src/components/Tabs.tsx` · `src/screens/StudentDetail.tsx` · `src/screens/Payments.tsx` · `src/screens/home/AttentionInbox.tsx` · `src/screens/home/Home.tsx` · `src/screens/home/TodayHero.tsx` · `src/screens/MonthlyReport.tsx` · `src/screens/CaptureSession.tsx` · `src/screens/captureSession/CloseOutSheet.tsx` · `src/screens/Settings.tsx` · `src/lib/version.ts` · `package.json` · `docs/README.md` · dokumen ini |
| Dependency | — |
| Latar | **L-06** (18 state punya tab, 0 `tabpanel`), **L-07** (hierarki heading), **R-13** (banner tanpa `role`), **B-11** (tombol ✓ tanpa nama), **Q16d** (tombol "Coba lagi" close-out tak terjangkau keyboard), keputusan pemilik **#5** (teks reset) |
| Estimasi | M — **selesai 2026-10-03** |
| Keputusan pemilik | #5 (teks "(kecuali satu jejak reset)") |
| Amandemen terkait | — |
| Catatan | `Tabs.tsx` dipakai **3 layar** — komponen diubah dulu, lalu pemakainya. Struktur tab yang terlihat **tidak** berubah. Dua berkas di luar daftar rencana ikut disentuh dengan alasan yang dicatat di bawah (`TodayHero.tsx`, `Settings.tsx`) |

**Langkah (berurutan):**
1. `components/Tabs.tsx` — tambah `id` per tab, `aria-controls={panelId}`, `tabIndex={aktif ? 0 : -1}`,
   dan navigasi keyboard ArrowLeft/ArrowRight/Home/End (pola `role=tablist` sudah ada di `:26`).
2. Bungkus isi tab di 3 pemakai dengan `<div role="tabpanel" id={panelId} aria-labelledby={tabId}>`.
3. `Home.tsx` — jadikan blok utama `<h2>` ("Hari ini", "Perlu perhatian", "Kalender"); turunkan sub-judul ke `h3`.
4. `Payments.tsx` — kartu tingkat-B jadi `h3` (sekarang 6 `h2` setara).
5. `MonthlyReport.tsx:1159-1173` — banner sukses `role="status" aria-live="polite"`, gagal `role="alert"`.
6. Verifikasi keyboard: Tab → panah → Enter/Space pada 3 layar bertab.

**Hasil (dilaksanakan 2026-10-03) — sebelum → sesudah:**

| # | Lokasi | Sebelum | Sesudah |
|---|---|---|---|
| 1 | `components/Tabs.tsx` | `role=tab` + `aria-selected` saja; tab non-aktif ikut terkena tombol Tab; tanpa panah ←/→ | id kontrak `${idPrefix}-tab-<key>` + `aria-controls` → `${idPrefix}-panel-<key>`, `tabIndex={aktif ? 0 : -1}` (satu tab yang bisa di-Tab), dan `onKeyDown` untuk ArrowLeft/ArrowRight/Home/End (fokus **dan** pilihan ikut pindah) |
| 2 | `screens/Payments.tsx` (4 tab) | hanya tab aktif di-mount → tidak ada `role=tabpanel` | 4 panel **selalu ada** (`payments-panel-*`, non-aktif `hidden`); komponen tab tetap hanya di-mount saat aktif → `useLiveQuery` tetap lazy |
| 3 | `screens/StudentDetail.tsx` (4 tab) | sama | 4 panel `student-panel-*` selalu ada, isi tetap dirender hanya untuk tab aktif |
| 4 | `screens/home/AttentionInbox.tsx` (2 tab) | sama + tombol ✓ tanpa nama + header tanpa heading | 2 panel `attention-inbox-panel-*`; tombol ✓ ber-`aria-label` `Tandai follow-up "<teks>" selesai`; blok dibungkus `<section aria-labelledby>` + `<h2>` "Perlu Perhatian" (`sr-only`, karena judul terlihatnya ada di dalam `<button>` — heading tidak sah di dalam tombol) |
| 5 | `screens/home/TodayHero.tsx:37` | `<p>Hari Ini</p>` | **`<h2>Hari Ini</h2>`** (kelas sama; preflight Tailwind menyetel ulang ukuran/berat heading → tampilan tidak berubah) |
| 6 | `screens/home/Home.tsx` | blok kalender tanpa judul | `<h2 className="sr-only">Kalender</h2>` (tidak menambah kepadatan above-fold — temuan B-05) |
| 7 | `screens/MonthlyReport.tsx:1161` | banner tanpa semantik | `role={gagal ? "alert" : "status"}` + `aria-live={gagal ? "assertive" : "polite"}` (predikat `messageFailed` dihitung sekali, dipakai juga oleh kelas warna) |
| 8 | **Q16d** — `captureSession/CloseOutSheet.tsx` + `screens/CaptureSession.tsx` | tombol "Coba lagi" hanya ada di banner halaman; saat laporan sesi masih terbuka, `Modal` mengunci fokus di dialog → tombol itu **tidak terjangkau keyboard** | kegagalan `retry: "closeout"` ditampilkan **di dalam** laporan sesi (`closeOutError` + `onRetry`): blok `role="alert"` + tombol "Coba lagi" 44px; banner halaman menyembunyikan pesan yang sama supaya tidak tampil dua kali — dan saat laporan ditutup, banner halaman kembali muncul |
| 9 | `captureSession/CloseOutSheet.tsx` (label form) | input tindak lanjut hanya punya `placeholder` | `aria-label="Fokus sesi berikutnya (opsional)"` |
| 10 | `screens/Settings.tsx:1268` (keputusan #5) | "beserta catatan audit, draf Catat Sesi yang belum tersimpan…" | "beserta catatan audit **(kecuali satu jejak reset)**, draf Catat Sesi yang belum tersimpan…" — `doResetAll` memang menulis satu entri `data.reset` setelah `auditLog.clear()` |

**Kontrak id tab↔panel (dipakai G1-11):** tab = `idPrefix + "-tab-" + key`, panel = `idPrefix + "-panel-" + key`.
Prefiks yang dipakai: `payments`, `student`, `attention-inbox`. Setiap panel **harus ada di DOM** (boleh `hidden`) — kalau panel hanya di-mount saat aktif, `aria-controls` tab lain menunjuk elemen yang tidak ada.

**Penyimpangan dari rencana (disengaja, dengan alasan):**

| # | Rencana | Dipakai | Alasan |
|---|---|---|---|
| 1 | Langkah 3 hanya menyebut `Home.tsx` | `TodayHero.tsx` ikut disentuh (1 baris) | Teks "Hari ini" yang diminta jadi `<h2>` **hanya ada** di `TodayHero.tsx`; `src/screens/Home.tsx` di daftar rencana bahkan tidak ada (berkasnya `src/screens/home/Home.tsx`) |
| 2 | Langkah 4 "kartu tingkat-B jadi `h3`" (Keuangan) | **tidak dikerjakan** — diangkat sebagai **Q22** | Keenam `h2` itu blok besar tanpa `h2` induk di layar Keuangan; menurunkannya ke `h3` menciptakan lompatan `h1 → h3` yang dilarang DoD yang sama. Butuh keputusan pemilik (tambah `h2` area dulu, atau biarkan) |
| 3 | Fokus "label form" pada arahan tugas | hanya 1 kontrol (input tindak lanjut di berkas yang memang sudah disentuh) | Daftar konkret G1-10 tidak memuat langkah label form; sisa temuan (PIN inline `Payments.tsx`, "Ketik mapel lain" di `CaptureSession.tsx`, `<label>` tanpa `htmlFor` di `Settings.tsx` = S-13) diangkat sebagai **Q19** |

**Bukti runtime (spec sementara — 6/6 lulus di `chromium`, salinan di `.design-audit/g1-10/`):**

| Uji | Hasil | Angka |
|---|---|---|
| 1. Beranda: heading hierarkis | ✓ | Urutan heading: `h1 Les Ko Lui` → `h2 Operasional hari ini` (246×24) → `h2 Hari Ini` (307×20) → `h2 Perlu Perhatian` (1×1) → `h2 Kalender` (1×1); tidak ada lompatan level |
| 2. Beranda: pola tab "Perlu Perhatian" | ✓ | 2 tab, 2 panel, `aria-controls` semua menunjuk elemen ada, **1** tab ber-`tabindex="0"`; `ArrowRight` → fokus + `aria-selected` + panel berpindah (panel lama `hidden`) |
| 3. Keuangan: pola tab + panah/Home/End | ✓ | 4 tab, 4 panel (`payments-panel-*`), 0 `aria-controls` rusak, 1 tabbable; `ArrowRight`/`End`/`Home`/`ArrowLeft` (melingkar) semuanya memindahkan fokus + membuka panel |
| 4. Detail murid: pola tab | ✓ | 4 tab, 4 panel (`student-panel-*`), 0 rusak, 1 tabbable; `ArrowRight` → "Sesi & Jadwal" terbuka; layar ini juga punya ≥1 `h2` |
| 5. **Q16d** | ✓ | Tombol "Coba lagi" ada **di dalam** `role="dialog"` "Laporan sesi"; teks kegagalan hanya **1** kali di halaman (tidak dobel); **Tab dari dalam dialog mencapai tombol itu** (loop ≤30 tekanan Tab); `Enter` di tombol itu menulis 2 tindak lanjut lalu menuju `/students/<id>` |
| 6. Laporan: banner status vs alert | ✓ | Gagal finalisasi (tulis `reports` dibatalkan) → `[role="alert"][aria-live="assertive"]` berisi "Error: … AbortError" · jalur "Update Laporan" → `[role="status"][aria-live="polite"]` berisi "Data laporan diperbarui ✓" |
| 7. Pengaturan: teks reset | ✓ | "(kecuali satu jejak reset)" tampil; kalimat lama ("beserta catatan audit, draf Catat Sesi") **0** kemunculan |

**Regresi yang dijalankan (bukan bagian gate, tapi menyentuh berkas tugas ini):**

| Spec | Hasil |
|---|---|
| `e2e/finance.spec.ts` (memakai tab Keuangan + ganti tab + tutup PIN) | ✓ 1/1 lulus |
| `e2e/capture-closeout-failure.spec.ts` | ❌ **gagal karena teks pesan basi**, bukan karena perubahan G1-10 — spec menuntut `/Tindak lanjut belum tersimpan; coba lagi\./` sedangkan **G1-06** sudah menggantinya menjadi `"Sesi sudah tersimpan; tindak lanjut belum tersimpan. " + saveErrorMessage(e)`. Bukti: `git show HEAD:src/screens/CaptureSession.tsx` masih memuat teks lama (commit v1.79.3), sementara working tree sudah memuat teks baru. Salinan spec itu dengan **regex saja** yang dikoreksi **lulus 1/1** → substansinya (rollback tanpa tindak lanjut parsial, satu sesi, retry menyimpan satu batch, draf dibersihkan) masih utuh |

**DoD terverifikasi:**
- [x] Setiap `role="tab"` punya `aria-controls` yang menunjuk elemen **ada** (7 tab di 3 layar, 0 rusak — diukur di runtime); jumlah `[role=tabpanel]` > 0 (10 panel).
- [ ] **Sebagian** — `h2` ada di Beranda (4×: "Operasional hari ini", "Hari Ini", "Perlu Perhatian", "Kalender"), detail murid (1×), Keuangan (dari kartu `RingkasanTab`/`TagihanTab` — lihat Q22), dan Catat Sesi (judul langkah). **Tiga layar utama masih hanya `h1`**: **Murid** (daftar), **Laporan**, dan **Pengaturan** — `h2` di ketiganya hanya muncul di dalam modal (mis. "Edit Murid", "Laporan dan Penagihan"). Tidak ditambahkan di sini karena tidak ada di daftar langkah konkret G1-10 → **Q22**. Tidak ada lompatan level pada layar yang diperiksa runtime (Beranda: `h1 → h2` semua).
- [x] `npm run test:sandbox` hijau — **678/678** (56 berkas), termasuk `bottomNavNoVersion.test.tsx` & `modalAccessibility.test.tsx` yang **tidak diubah**.
- [x] Bukti keyboard runtime: Tab → panah → Home/End pada 3 layar bertab (tabel bukti di atas) — **menggantikan** verifikasi manual sebagian.
- [ ] Manual pembaca layar (TalkBack/VoiceOver) mengumumkan "tab 2 dari 4" + panel terbuka — **belum dijalankan manusia** (tidak ada perangkat di lingkungan ini); penggantinya: struktur ARIA-nya diukur di runtime (uji 2–4).
- [x] Berkas terlarang **0**; `vite.config.ts` & `playwright.config.ts` tidak disentuh; `e2e/loading-states.spec.ts` tidak diubah.
- [x] Gate: `tsc -b` 0 · `lint` 0 · `test:sandbox` **678/678** · `build` 0 (`dist/sw.js`) · `check-md-links` rusak 0 · **e2e gate: 12 lulus + 4 skip** (loading-states 4 lulus + 4 skip, nag-backup 4+4 lulus).

**Temuan yang diangkat (Q19–Q22) — tidak diimprovisasi:**

| Kode | Temuan | Tindakan |
|---|---|---|
| **Q19** | Label form di luar daftar konkret G1-10: input PIN inline `Payments.tsx:129` (hanya placeholder), "Ketik mapel lain" `CaptureSession.tsx:2039`, dan `<label className="label">Model</label>` tanpa `htmlFor` (`Settings.tsx`, temuan **S-13**) | Dicatat di `docs/README.md` §4.2 #19 — menunggu keputusan (semuanya berkas yang sudah punya tugas sendiri: G2/G3-09) |
| **Q20** | `e2e/capture-closeout-failure.spec.ts` sudah **patah sejak G1-06** (teks pesan berubah, spec tidak ikut diperbarui) — inilah sebabnya Q16d tidak pernah tertangkap tes | Dicatat di `docs/README.md` §4.2 #20. Perbaikan 1 baris **tidak** diambil sendiri karena `e2e/**` di luar daftar berkas tugas ini |
| **Q21** | Penjaga regresi permanen untuk pola tab & heading | Diusulkan masuk `G1-11` (`e2e/uiux-metrics.spec.ts`: "`role=tab` tanpa `aria-controls`/`tabpanel`" + "≥1 `h2` per layar" sudah ada di daftar ambang G1-11). Tes unit baru butuh persetujuan berkas baru |
| **Q22** | Hierarki heading belum tuntas (L-07): **(a)** Keuangan — 6 `h2` setara tanpa induk, sehingga langkah 4 ("kartu tingkat-B jadi `h3`") tidak bisa dijalankan tanpa menciptakan lompatan `h1 → h3`; **(b)** **Murid** (daftar), **Laporan**, dan **Pengaturan** masih hanya `h1` — `h2`-nya hanya ada di dalam modal, jadi pemeriksaan "setiap layar punya ≥1 `h2`" (usulan ambang G1-11) akan gagal di ketiga layar itu | (a) Langkah 4 **tidak dijalankan**; (b) ketiga layar **tidak diimprovisasi** karena di luar daftar langkah konkret. Butuh keputusan pemilik: tambah `h2` (terlihat / `sr-only`) lalu turunkan kartu Keuangan, atau ubah ambang G1-11 |

**DoD direvisi (keputusan pemilik 2026-10-03, saat menutup G1-11):**

| # | Butir DoD semula | Keputusan | Alasan |
|---|---|---|---|
| 1 | **Langkah 4** — "`Payments.tsx`: kartu tingkat-B jadi `h3` (sekarang 6 `h2` setara)" | **DIBATALKAN (SKIP)** — sudah tercatat sebagai Q22(a) dan **tidak** dijalankan | Menurunkan keenam kartu itu ke `h3` menciptakan lompatan `h1 → h3` di layar Keuangan, yaitu hal yang dilarang oleh DoD yang sama ("tidak ada lompatan level heading"). Layar itu tidak punya `h2` induk untuk dijadikan tempat bergantung; membuat induknya adalah perubahan struktur layar, bukan perbaikan aksesibilitas |
| 2 | **Q22(b)** — tiga layar (`Murid` daftar, `Laporan`, `Pengaturan`) masih hanya `h1` | **DITUTUP di G1-11**: masing-masing diberi satu `<h2 className="sr-only">` (judul per konteks layar) | Ambang guard G1-11 "setiap layar ≥1 `h2`" hanya bisa hijau setelah ketiganya punya `h2`. `sr-only` dipilih agar tidak menambah kepadatan layar (catatan B-05). Diverifikasi runtime: `h2Count` = 1 di ketiga layar (chromium + mobile) |

> **Efek ke DoD G1-10:** butir "setiap layar ≥1 `h2`" yang semula ditandai *sebagian* kini **terpenuhi untuk
> ketiga layar yang tersisa** — tetapi bukan oleh G1-10, melainkan oleh G1-11 (lihat §G1-11). Butir DoD
> G1-10 yang lain tidak berubah.

> **Batas sandbox (bukan regresi):** `npm run build` dan Playwright **tidak bisa** jalan di sandbox default —
> build berhenti di `spawn EPERM` (`optimizeSafeRealPathSync` memanggil `exec("net use")`) dan Playwright
> berhenti di `WorkerHost.startRunner` (`fork` dengan pipa stdio). Keduanya dijalankan **tanpa mengubah
> repo**: build dengan shim `--require` di direktori temp (`ATURAN-AI` §6.1), e2e dengan eskalasi akses.

---

### G1-11 — ✅ SELESAI: Guard metrik UI (di luar gate CI utama)

| Field | Isi |
|---|---|
| ID | G1-11 |
| Judul | Jadikan audit metrik sebagai penjaga regresi dengan ambang gagal — **selesai 2026-10-03** |
| Berkas disentuh | `e2e-uiux/uiux-metrics.spec.ts` (dari `.design-audit/uiux-audit.spec.ts`) · `playwright.uiux.config.ts` (baru) · `package.json` · `e2e/capture-closeout-failure.spec.ts` · `src/__tests__/tabsAccessibility.test.tsx` (baru) · `src/screens/Students.tsx` · `src/screens/MonthlyReport.tsx` · `src/screens/Settings.tsx` · `src/lib/version.ts` · `docs/README.md` · `docs/kerja/ATURAN-AI.md` · dokumen ini |
| Dependency | G1-01 |
| Latar | §4.8 dokumen 07 — temuan L-01/L-03/L-06 tidak boleh kambuh diam-diam |
| Estimasi | M — **selesai 2026-10-03** |
| Keputusan pemilik | **Q10** ✅ (opsi A: skrip `e2e:uiux` terpisah, **bukan** CI utama) · #1 Q20 · #2 Q22 · #4 Q21 · #5 versi v1.85.0 |
| Amandemen terkait | A3b (matriks tanpa `mobile-dark`) |
| Catatan | Penambahan 2 berkas ini **bagian dari rencana yang disetujui** (doc 07 §5 G1-11). Spec-nya diletakkan di **`e2e-uiux/`**, bukan `e2e/` — lihat penyimpangan #1 |

**Hasil (dilaksanakan 2026-10-03) — apa yang dikerjakan:**

| # | Item | Isi |
|---|---|---|
| 1 | **Skrip terpisah** | `package.json` → `"e2e:uiux": "playwright test --config=playwright.uiux.config.ts"`. **Tidak** ikut `npm test` maupun `npm run ci` (Q10). `npm run e2e` **tidak** menjalankannya (config utama: `testDir: "./e2e"`, spec-nya di luar folder itu) |
| 2 | **Config khusus** | `playwright.uiux.config.ts` — `testDir: "./e2e-uiux"`, `testMatch` implisit (satu spec), project `chromium` + `mobile` (tanpa `mobile-dark`, Q4), `webServer` sama dengan config utama (port 5174) |
| 3 | **Guard metrik** | 42 tes: 7 layar × 3 kelompok (struktur heading/tab · kontras · ukuran kontrol) × 2 project. Angka mentah tiap layar ditulis ke `<folder induk repo>/.design-audit/uiux-guard/<project>-<layar>.json` sebagai bukti |
| 4 | **Q20** | `e2e/capture-closeout-failure.spec.ts:276` — regex lama `/Tindak lanjut belum tersimpan; coba lagi\./` (pra-G1-06) → `/Sesi sudah tersimpan; tindak lanjut belum tersimpan\./` + komentar sebabnya. **2/2 lulus** (chromium + mobile) |
| 5 | **Q22(b)** | `<h2 className="sr-only">` di 3 layar: `Students.tsx` ("Daftar murid"), `MonthlyReport.tsx` ("Periode dan pratinjau laporan"), `Settings.tsx` ("Bagian pengaturan") |
| 6 | **Q21 / keputusan #4** | `src/__tests__/tabsAccessibility.test.tsx` — **13 tes**: struktur ARIA (role, `aria-selected`, `tabIndex`, `aria-controls`, id, nama) + navigasi `ArrowRight`/`ArrowLeft`/`Home`/`End` (termasuk melingkar, satu tab, tombol lain tidak dicegah) + klik. Tanpa dependensi baru (lihat penyimpangan #3) |
| 7 | **Keputusan #2** | DoD G1-10 direvisi: langkah 4 (`h2`→`h3` di Keuangan) **dibatalkan** — dicatat di §2 G1-10 "DoD direvisi" |

**Ambang gagal yang benar-benar dijaga (terukur, bukan asumsi):**

| Kelompok | Ambang | Layar lulus | Layar `test.fixme` |
|---|---|---|---|
| Struktur: `≥1 h1`, `≥1 h2`, tidak ada lompatan level, kontrak tab (`aria-controls` menunjuk elemen ada · `tabpanel` > 0 · tepat 1 tab `tabindex=0` · tepat 1 `aria-selected=true`) | ketat | **7 / 7** | — |
| Kontras teks < 4,5:1 (3:1 untuk ≥24px / ≥18,66px tebal) | `toBe(0)` | 4 / 7 | **3** — Murid (6), Detail murid (4), Keuangan (6) |
| Kontrol interaktif (termasuk input) < 24 px | `toBe(0)` | 6 / 7 | **1** — Detail murid (2 tautan telepon 126×20) |

**Pelanggaran sisa yang didaftarkan `test.fixme` (DoD: didaftarkan, BUKAN dengan menaikkan ambang).**
Angka identik di `chromium` **dan** `mobile`; rujukan tugas tetap:

| Layar | Sisa | Contoh terukur | Rujukan |
|---|---:|---|---|
| Murid (daftar) | 6 kontras | 4,39:1 — `text-gray-500` di atas `bg-gray-100`: 1× tab "Historis (1)" (`Students.tsx:465`, tidak terpilih) + 5× tombol "Edit murid" (`Students.tsx:325`) | G2-01/G2-02 |
| Detail murid | 4 kontras · 2 ukuran | 3,22:1 tautan telepon (14px) · 3,46:1 "Total Sesi" `text-blue-500`/`bg-blue-50` · 4,09:1 "Total Jam" `text-indigo-500`/`bg-indigo-50` · tautan telepon 126×20 px | G2-01/G2-02 · G2-06 |
| Keuangan | 6 kontras | 3,10:1 "Perlu ditindaklanjuti" · 3,20:1 putih di `bg-amber-600` ("Tindak lanjuti di Tagihan") · 3,47:1 `green-600` · 3,20:1 "AI belum aktif" (nonaktif) · 4,39:1 dua chip rentang grafik "3 bulan"/"12 bulan" (`RingkasanTab.tsx:689`, `text-gray-500` di `bg-gray-100`) | G2-01/G2-02 |

> **Cara membaca angka `fontSize`/`weight` guard:** guard memakai `getComputedStyle`, jadi yang dilaporkan adalah
> ukuran yang **benar-benar dirender** — dan itulah yang dipakai aturan kontras WCAG. Untuk `<button>`/`<input>`,
> ukuran itu sering **tidak sama** dengan kelas `text-*`/`font-*` di sumbernya karena `src/index.css:67`
> (`button, input, select, textarea { font: inherit }`) berada **di luar `@layer`** sehingga mengalahkan
> `@layer utilities` Tailwind v4 (temuan **Q25**, terpisah dari guard ini). Pada data saat ini efek itu belum
> mengubah satu keputusan pun (semua nilai tersebut tetap butuh 4,5:1), tetapi ia menjelaskan kenapa mis.
> tombol `text-xs font-semibold` terukur 16px/400.

**Penyimpangan dari rencana (disengaja, dengan alasan):**

| # | Rencana | Dipakai | Alasan |
|---|---|---|---|
| 1 | spec di **`e2e/uiux-metrics.spec.ts`** (DoD langkah 1) + `testIgnore` di config utama (DoD langkah 5) | **`e2e-uiux/uiux-metrics.spec.ts`** + `playwright.uiux.config.ts` (`testDir: "./e2e-uiux"`) | Dua instruksi DoD saling bertentangan: config utama memakai `testDir: "./e2e"` **rekursif**, jadi spec di dalam `e2e/` **pasti** ikut `npm run e2e` (durasi +±2 menit) kecuali `playwright.config.ts` diubah — padahal mengubah berkas itu **dilarang** di tugas ini. Catatan DoD sendiri hanya memerintahkan perubahan itu bila Q10 dijawab "masuk CI" (Q10 dijawab **tidak**). Memindahkan spec memenuhi keduanya tanpa menyentuh config utama |
| 2 | screenshot sebelum/sesudah ikut disalin dari spec audit | **tidak** disalin | Guard dijalankan berulang; screenshot membuatnya ±2× lebih lama tanpa menambah kekuatan penjaga. Angka mentah (JSON) tetap ditulis sebagai bukti, dan screenshot "sebelum" sudah tersimpan di `.design-audit/uiux-v1793/` |
| 3 | "Boleh pakai `@testing-library/react` (sudah ada di repo — cek dulu)" (keputusan #4) | `renderToStaticMarkup` + pemanggilan komponen langsung (pola yang sudah ada di repo) | **Tidak ada** `@testing-library/react`/`jsdom`/`happy-dom` di `node_modules` (diperiksa 2026-10-03); memakainya berarti menambah **2** dependensi, yang dilarang tanpa Q-series. Jadi berkas unit test dibuat **tanpa sumber daya DOM**: struktur ARIA dari markup SSR, navigasi keyboard dengan memanggil **handler asli** (`useRef` dinetralkan karena itu satu-satunya hook di `Tabs.tsx`). **`src/components/Tabs.tsx` tidak diubah sama sekali** |
| 4 | `@axe-core/playwright` untuk mengukur kontras | pengukuran in-page (canvas) yang sama dengan spec audit | Paket itu **tidak ada** di repo; menambah dependensi dilarang tanpa Q-series (`ATURAN-AI` §2.2) |
| 5 | kontras & ukuran diuji dalam satu tes per layar | dipisah (kontras · ukuran) | Supaya `test.fixme` kontras tidak ikut mematikan penjaga ukuran kontrol di layar yang sama (Keuangan & Murid: ukurannya bersih, kontrasnya belum) |

**Uji negatif (DoD langkah 6) — guard terbukti BISA gagal:**

| # | Sisipan sementara | Hasil terukur | Status |
|---|---|---|---|
| 1 | `<h2 className="text-sm font-bold text-gray-800">Hari Ini</h2>` → `text-amber-500` (`home/TodayHero.tsx`) | `kontras < ambang AA: h2 [Hari Ini] … ratio 2.13, need 4.5` → `Expected: 0, Received: 1` → **exit 1** | ✅ dikembalikan (baris 41 kembali `text-gray-800`) |
| 2 | `<h2 className="sr-only">Bagian pengaturan</h2>` dikomentari (`Settings.tsx`) | `layar tanpa h2 (ambang G1-11) — heading: H1: Pengaturan` → **exit 1** | ✅ dikembalikan |

**Bukti runtime (guard dijalankan apa adanya):**

```powershell
npm run e2e:uiux
# → 34 passed, 8 skipped (test.fixme), 2.0m  (exit 0)
```

| Kelompok | chromium | mobile |
|---|---|---|
| Struktur (heading & tab) | 7 lulus | 7 lulus |
| Kontras | 4 lulus + 3 fixme | 4 lulus + 3 fixme |
| Ukuran kontrol <24 px | 6 lulus + 1 fixme | 6 lulus + 1 fixme |

**Angka terukur per layar (bukti `.design-audit/uiux-guard/`, identik chromium & mobile):**

| Layar | `h1`/`h2` | tab/panel | kontras gagal | kontrol <24 px | kontrol 24–43 px |
|---|---|---:|---:|---:|---:|
| Beranda `/` | 1 / **4** | 2 / 2 | 0 | 0 | 19 |
| Murid `/students` | 1 / **1** (baru) | 0 / 0 | 6 *(fixme)* | 0 | 17 |
| Detail murid | 1 / 2 | 4 / 4 | 4 *(fixme)* | 2 *(fixme)* | 6 |
| Catat Sesi `/capture` | 1 / 1 | 0 / 0 | 0 | 0 | 17 |
| Laporan `/report` | 1 / **1** (baru) | 0 / 0 | 0 | 0 | 3 |
| Keuangan `/payments` | 1 / 6 | 4 / 4 | 6 *(fixme)* | 0 | 10 |
| Pengaturan `/settings` | 1 / **1** (baru) | 0 / 0 | 0 | 0 | 2 |

> Kolom "24–43 px" **tidak** menggagalkan guard (ambang DoD = <24 px; ≥44 px adalah sasaran `G2-06`) —
> angkanya dicatat supaya pekerjaan `G2-06` punya titik awal terukur.

**DoD terverifikasi:**
- [x] `npm run e2e:uiux` **lulus pada kode saat ini** → 34 lulus, 8 `test.fixme`, exit 0.
- [x] **Uji negatif** membuktikan spec bisa gagal (2 sisipan berbeda: kontras & heading) — keduanya dikembalikan.
- [x] `npm run e2e` **tidak** menjalankan spec ini & durasinya tidak bertambah: spec ada di `e2e-uiux/`, di luar `testDir: "./e2e"`; `npx playwright test --list` tetap **84 tes / 14 berkas** seperti sebelum G1-11.
- [x] Pelanggaran kontras sisa dari G1-04 didaftarkan `test.fixme` **dengan rujukan tugas** (G2-01/G2-02; ukuran → G2-06) — ambang **tidak** dinaikkan.
- [x] `ATURAN-AI` §6 memuat perintah baru (1 baris) + catatan bahwa ia **bukan** bagian CI.
- [x] Larangan: `vite.config.ts`, `playwright.config.ts`, `e2e/loading-states.spec.ts` **tidak** disentuh; 0 berkas terlarang §2.1; tanpa dependensi baru; `Tabs.tsx` tidak diubah.
- [x] Gate penuh (lihat §4 riwayat G1-11): tsc 0 · lint 0 · `test:sandbox` **691/691** · build 0 · md-links rusak 0 · e2e gate **14 lulus + 4 skip** (loading-states 4 lulus + 4 skip · nag-backup 8 lulus · capture-closeout-failure 2 lulus — 1 tes × 2 project) · `e2e:uiux` **34 lulus + 8 skip**.
- [ ] **Manual pembaca layar** membaca urutan heading layar Murid/Laporan/Pengaturan — belum dijalankan manusia (tidak ada perangkat/AT di lingkungan ini); penggantinya: `h1`/`h2` dan kontrak tab diukur di runtime (tabel di atas).

**Temuan baru (Q23) — ditulis, tidak diputuskan sendiri:**

| Kode | Temuan | Butuh keputusan |
|---|---|---|
| **Q23** | Judul tugas (`#2` keputusan pemilik) menyebut `e2e/uiux-metrics.spec.ts`, sedangkan `playwright.config.ts` **dilarang diubah** — dua hal itu tidak bisa benar bersamaan (lihat penyimpangan #1). Dipilih `e2e-uiux/` | Apakah penempatan `e2e-uiux/` diterima permanen, atau pemilik ingin spec dipindah ke `e2e/` **dan** `testIgnore` ditambahkan ke `playwright.config.ts` (perubahan config diizinkan)? |
| **Q24** | 3 layar masih menyimpan **16 pelanggaran kontras** + 2 kontrol < 24 px (tabel di atas). Guard sudah mendaftarkannya, tetapi penjaganya `test.fixme` sampai G2-01/G2-02/G2-06 selesai | Konfirmasi bahwa sisa itu memang milik G2 (bukan pekerjaan tambahan G1-11). Satu di antaranya **baru terukur**: chip "3 bulan"/"12 bulan" 4,39:1 dan 6 titik `gray-500`/`gray-100` 4,39:1 — semuanya di bawah 4,5:1 walau terlihat "abu normal" |
| **Q25** | **`src/index.css:67` (`button, input, select, textarea { font: inherit }`) berada DI LUAR `@layer`**, sehingga mengalahkan `@layer utilities` Tailwind v4: kelas `text-*`/`font-*` **tidak berlaku pada tombol/input/select/textarea**. Bukti terukur (probe Playwright 2026-10-03): tombol `Edit murid` (`Students.tsx:325`, kelas memuat `text-sm`) ter-render **16px/400**, sedangkan `<p class="text-xs font-bold">` di layar yang sama ter-render **12px/700**. Artinya skala tipografi K4 (24/18/15/13) tidak sampai ke kontrol form; 16px bahkan tidak ada di skala itu | **Temuan ini tidak dikerjakan di G1-11** (menyentuh `index.css` + tampilan SEMUA kontrol form = keputusan pemilik; juga bersinggungan dengan token `G2-01`). Butuh keputusan: masukkan ke `G2-01`/`G2-02`, atau tugas tersendiri. **Efek ke guard:** tidak ada ambang yang salah diterapkan hari ini (semua nilai itu tetap butuh 4,5:1), tetapi bila kelak ada teks ≥18,66px tebal di dalam tombol, ambang 3:1 bisa salah dipakai |

> **Batas sandbox (bukan regresi):** seperti G1-10, `npm run build` dan Playwright tidak bisa jalan di sandbox
> default (`spawn EPERM` di Vite `optimizeSafeRealPathSync` / `WorkerHost.startRunner`); keduanya dijalankan
> **tanpa mengubah repo** (build dengan shim `--require` di direktori temp — `ATURAN-AI` §6.1 — dan e2e dengan
> eskalasi akses).

---

## 3. Checkpoint akhir Gelombang 1

**Otomatis:** `npx tsc -b` → `npx eslint src` → `npm test` (609+ lulus) → `npm run build` → `npm run e2e`
→ `npm run e2e:uiux` (baru) → `node scripts/check-md-links.mjs` (rusak 0).

**Manual (HP/emulator 412×839):**
1. 13 titik kontras G1-04 dipotret ulang; tidak ada yang <4,5:1.
2. Saat nag backup tampil, elemen terakhir halaman masih terjangkau; tombol tutup mengingat pilihan.
3. Toast gagal berwarna merah; banner gagal simpan punya "Coba lagi".
4. Tab murid dikendalikan keyboard; panel terbuka diumumkan.
5. Beranda tidak menampilkan "Tidak ada sesi hari ini" saat data masih dimuat.

---

## 4. Riwayat & catatan penyimpangan

| Tanggal | Tugas | Yang terjadi | Keputusan |
|---|---|---|---|
| 2026-10-01 | G1-01 | 15 amandemen (A1–A13) dikunci; `tsc -b` & `eslint` & `playwright --list` hijau; `npm run build` **tidak bisa** dijalankan di sandbox (`spawn EPERM` di Vite `windowsSafeRealPathSync`) | Lanjut; gate build/e2e diverifikasi di lingkungan dengan akses lebih luas |
| 2026-10-01 | G1-02 | Baseline terkunci **904** (rekursif) vs 902 (`git grep`); **6 titik** perintah tidak rekursif diperbaiki — termasuk `TASK-06` yang sebelumnya **selalu lulus palsu**; baseline 904 diisi di `TASK-04` §9 | Selesai; lanjut G1-03 |
| 2026-10-01 | G1-03 | Dokumen 06 dikoreksi: **27** baris ditandai ⚠️, **26** koreksi fakta (K-1…K-26), **3** klaim dicabut (L-02, L-01h, L-04) + blok transparansi §9.4, **6** baris diputuskan/tidak dikerjakan, **§9 baru**; angka 18 vs 27 direkonsiliasi di §9.1 | Selesai; lanjut G1-04 |
| 2026-10-01 | G1-04 | **14 kelas di 12 berkas** dinaikkan ke `-600/-700` (semua ≥4,5:1, dihitung dari palet resmi Tailwind v4). Gate: tsc 0 · eslint 0 · **build OK** · **test 653/653** (kegagalan pertama = timeout beban `backup.test.ts`, lolos saat diulang). 3 penyimpangan kecil dari rencana (amber-700, orange-700, red-600 demi hover) + 11 titik serupa ditemukan & **tidak** diubah (masuk `G2-02`). Screenshot belum diambil (butuh akses lebih luas) — resep manual dicatat | Selesai; lanjut G1-05 |
| 2026-10-01 | G1-05 | `--nag-h` dipublikasikan + kompensasi `padding-bottom` (80→**196px** terukur) + tombol tutup 44px (snooze 7 hari) + sembunyi di `/capture` & saat modal + subtitle nag 3,08→**4,87:1**. **Uji runtime Playwright 412px: 4/4 lulus** (gap konten terakhir **+4px**, sebelumnya −112px). Gate: tsc 0 · eslint 0 · **test 653/653** · **build OK** · md-links rusak 0. Spec uji sementara tidak disimpan di repo (butuh persetujuan) | Selesai; lanjut G1-06. **D1 belum jalan:** `e2e/nag-backup.spec.ts` belum disalin |
| 2026-10-01 | G1-06 | **19 lokasi** di `Settings.tsx` (6 gagal → `error`, 12 sukses → `success`, prompt tetap `info`) + `Home.tsx:99` (klasifikasi pesan dari 4 modal) + `CaptureSession.tsx` (mapper `saveErrorMessage` + `retry: "save"\|"closeout"` + tombol "Coba lagi" 44px di banner `role="alert"`). **4 temuan** diangkat sebagai **Q16** — termasuk tombol yang tidak boleh memanggil `handleSave` saat sesi sudah tersimpan, dan bug regex alternasi yang hanya tertangkap tes baru. **9 tes baru** (653 → **663/663 lulus**). Gate: tsc 0 · eslint 0 · test 663/663 · build 0 · md-links 0. **`e2e` tidak dijalankan** (Q17: sandbox) | Selesai; lanjut G1-07 (menunggu konfirmasi) |
| 2026-10-01 | D1 (keputusan G1-05) | `e2e/nag-backup.spec.ts` dibuat permanen (4 tes) dari spec sementara; **4/4 lulus di project `chromium` (16,4 s) dan `mobile` (12,2 s)**. `playwright.config.ts` **tidak** diubah (`testDir: "./e2e"` → otomatis ikut `npm run e2e`, tanpa tag `@regression`) | Selesai |
| 2026-10-01 | Q17 (opsi B+C) | Skrip `npm run test:sandbox` (= `vitest run --pool=threads --maxWorkers=2`) + §6.1 baru di `ATURAN-AI` (shim temp + larangan mengubah `vite.config.ts`/`playwright.config.ts` demi sandbox). `vite.config.ts` **tidak** disentuh | Selesai |
| 2026-10-01 | G1-07 | Prop `loading` di `TodayHero` (+3 baris `Skeleton`, `data-loading`), `Home.tsx` memakai `todayHeroLoadState()`, dan `Settings.tsx` memakai `settingsLoadGate()` + probe galat + watchdog **8 detik** → `role="alert"` "Pengaturan gagal dimuat" + tombol "Coba lagi" (nonce → `useLiveQuery` baca ulang). **3 temuan** diangkat sebagai **Q18** (`useLiveQuery` tanpa saluran galat, penyimpanan yang tak pernah menjawab, dan `try/catch` yang tidak bisa dipasang apa adanya). **7 tes baru** (663 → **670/670**). **Verifikasi runtime Playwright: 4/4 lulus** — skeleton Beranda pernah tampil & empty state tidak muncul saat data belum siap; Pengaturan dengan IndexedDB dibuat gagal total menampilkan `role="alert"` + tombol yang bisa ditekan tanpa crash. Gate: tsc 0 · eslint 0 · test:sandbox 670/670 · build 0 · md-links 0 · **e2e nag-backup 4/4 (chromium) + 4/4 (mobile)**. **Q16d dicatat:** tombol "Coba lagi" untuk kegagalan tindak lanjut (G1-06) tidak terjangkau keyboard selama modal laporan terbuka — masuk cakupan **G1-10** (a11y) atau G2 | Selesai; lanjut G1-08 (menunggu konfirmasi) |
| 2026-10-01 | Q18 (keputusan) | Q18a–c diterima sebagai solusi G1-07, tetapi **jalur galat tunggal untuk semua layar** dikeluarkan dari lingkup → dicatat sebagai **G2-10** di `GELOMBANG-2.md` (10 tugas) | Ditunda ke Gelombang 2 |
| 2026-10-01 | G1-08 | **5 aksi destruktif** kini lewat `ConfirmSheet`: tandai lunas/batal (menyebut "+Rp/−Rp" + tombol **Urungkan** 8 dtk), hapus foto/TTD/tindak lanjut, hapus foto lama (permanen, outline merah) vs perkecil foto (tanpa dialog — sebelumnya terbalik), dan bersihkan cache (label + konfirmasi + pindah ke baris terakhir). `StorageUsage` gagal → pesan, bukan baris hilang. **Spec permanen baru** `e2e/loading-states.spec.ts` (4 tes). **2 tes baru** (670 → **672/672**). **Verifikasi runtime 8/8 lulus** (bukti `.design-audit/g1-08/`); 1 jalur klik dilewati jujur (data seed tanpa foto lama) dan dijamin asersi statis. Gate: tsc 0 · eslint 0 · test:sandbox 672/672 · build 0 · md-links 0 · **e2e nag-backup 4/4+4/4, loading-states 4/4+4/4** | Selesai; lanjut G1-09 (menunggu konfirmasi) |
| 2026-10-01 | G1-09 | **Janji palsu dihapus**: "Pengaturan, profil, dan PIN tetap aman" diganti daftar jujur (PIN Keuangan, pertanyaan keamanan, kunci API AI, logo, profil, rekening bank, catatan audit, draf, pengingat backup **hilang**; file backup & kata sandi backup di browser **tetap**) dan `handleSetPin` pindah ke `settingsDirtyPatch` + `setDirty(false)` + `try/catch` → `toastCtx.error`. **6 tes baru** (672 → **678/678**), termasuk **bukti bug**: `saveSettings(snapshot penuh)` memundurkan `lastBackupAt` 2026-09-12 → 2026-09-01 sedangkan patch tidak. **Bukti runtime UI nyata 1/1** (spec sementara, salinan `.design-audit/g1-09/`): badge "Belum disimpan" hilang setelah simpan PIN dan `lastBackupAt` tetap 2026-09-12. `e2e/loading-states.spec.ts` dibatasi ke 1 project **dengan `isMobile`** (bukan `browserName` — project `mobile` juga chromium) → 4 lulus + 4 skip. Gate: tsc 0 · eslint 0 · test:sandbox 678/678 · build 0 · md-links 0 · **e2e loading-states 4/4 (+4 skip) + nag-backup 4/4+4/4 = 12 lulus, 4 skip** | Selesai; lanjut G1-10 (menunggu konfirmasi) |
| 2026-10-03 | G1-10 | **A11y dasar**: pola tab lengkap di **3 layar bertab** (id + `aria-controls` → panel nyata yang selalu ada, `tabIndex` bergilir, panah ←/→ + Home/End — terukur 10 tab/10 panel, 0 `aria-controls` rusak), judul blok Beranda jadi heading sungguhan ("Hari Ini" `<p>`→`<h2>`; "Perlu Perhatian" & "Kalender" `sr-only`), banner Laporan jadi `role=status`/`alert` + `aria-live`, nama aksesibel tombol ✓ follow-up, label form input tindak lanjut, dan **Q16d**: tombol "Coba lagi" kegagalan tindak lanjut pindah ke **dalam** laporan sesi (dulu tak terjangkau keyboard di balik focus-trap) + teks "(kecuali satu jejak reset)" (keputusan #5). **Bukti runtime 6/6 lulus** (`chromium`, spec sementara → `.design-audit/g1-10/`) termasuk Tab-sampai-Enter pada tombol retry baru; regresi `finance.spec.ts` ✓. **4 temuan diangkat (Q19–Q22)** — termasuk `e2e/capture-closeout-failure.spec.ts` yang **sudah patah sejak G1-06** (teks pesan berubah): salinannya dengan regex yang dikoreksi lulus 1/1. Gate: tsc 0 · lint 0 · test:sandbox **678/678** · build 0 · md-links rusak 0 · **e2e gate 12 lulus + 4 skip** | Selesai; lanjut G1-11 (menunggu konfirmasi) |
| 2026-10-03 | G1-11 | **Guard metrik UI jadi penjaga regresi** (Q10 = A): `npm run e2e:uiux` (`playwright.uiux.config.ts`, spec di **`e2e-uiux/`** supaya `npm run e2e` tidak ikut melambat tanpa menyentuh `playwright.config.ts`) — **42 tes** = 7 layar × (struktur heading/tab · kontras · ukuran kontrol) × 2 project; ambang: `≥1 h2` per layar, tanpa lompatan level, `aria-controls`→panel ada, kontras ≥4,5:1, kontrol ≥24 px. Hasil: **34 lulus + 8 `test.fixme`**, exit 0. **Dua uji negatif** membuktikan guard bisa gagal (`text-amber-500` → 2,13:1; h2 dihapus → "layar tanpa h2"), keduanya dikembalikan. **Q20** ditutup (regex spec close-out → teks G1-06, 1/1 lulus), **Q22(b)** ditutup (3 `<h2 className="sr-only">`: Murid/Laporan/Pengaturan), **Q21** ditutup (13 tes `tabsAccessibility.test.tsx` untuk role/aria-selected/tabIndex/aria-controls + panah/Home/End — tanpa dependensi baru, `Tabs.tsx` tidak diubah), dan **DoD G1-10 direvisi**: langkah 4 (Keuangan `h2`→`h3`) dibatalkan karena menciptakan `h1→h3`. Sisa pelanggaran (16 kontras di 3 layar + 2 kontrol 126×20 px) **didaftarkan `test.fixme` dengan rujukan G2-01/G2-02/G2-06**, bukan dengan menaikkan ambang. Gate: tsc 0 · lint 0 · `test:sandbox` **691/691** · build 0 · md-links rusak 0 · e2e gate **14 lulus + 4 skip** · `e2e:uiux` 34 lulus + 8 skip. **3 temuan baru (Q23 penempatan spec · Q24 sisa kontras G2 · Q25 kelas tipografi tak berlaku di tombol/input)** | **Selesai — Gelombang 1 TUNTAS** |
| | | | |
**Catatan yang harus dibawa ke gelombang berikutnya:**

| Dari | Catatan | Masuk ke |
|---|---|---|
| **Q16d** (G1-06) | Tombol "Coba lagi" untuk kegagalan **tindak lanjut** (`retry: "closeout"`) dirender di banner halaman, sedangkan kegagalannya terjadi di dalam modal `CloseOutSheet` (`role="dialog"`, focus-trap). Akibatnya tombol itu **tidak terjangkau keyboard** selama modal laporan terbuka — tutor harus menutup laporan dulu. Tidak diperbaiki di G1-06 karena di luar lingkup | ✅ **Selesai di G1-10 (2026-10-03)** — kegagalan close-out kini ditampilkan di dalam laporan sesi (`closeOutError` + `onRetry`), dibuktikan runtime: Tab dari dalam dialog mencapai tombol itu, `Enter` menyelesaikan penyimpanan satu batch |
| **Q18a-c** (G1-07) | `useLiveQuery` di layar Pengaturan tidak punya saluran galat; jalur gagal tunggal untuk **semua** layar (`getSettings()` melempar / `useLiveQuery` dengan `catch`) menyentuh 6 layar lain — keputusan pemilik bila diinginkan | **G2** (calon tugas baru) |
| **Langkah 5 rencana G1-07** | `StorageUsage` (`Settings.tsx`) masih `return null` bila `navigator.storage.estimate()` gagal → baris "Penyimpanan Lokal" hilang diam-diam | **G1-08** (sama-sama menyentuh Pengaturan) |
| **Q19** (G1-10) | Label form di luar daftar konkret G1-10: input PIN inline `Payments.tsx` (hanya placeholder), "Ketik mapel lain" `CaptureSession.tsx`, dan `<label>` tanpa `htmlFor` di `Settings.tsx` (S-13) | **Dipindah ke G2** (keputusan pemilik 2026-10-03) — dicatat di `docs/README.md` §4.2 #19; **ID tugas G2-nya belum ditetapkan** pemilik |
| **Q20** (G1-10) | `e2e/capture-closeout-failure.spec.ts` patah sejak G1-06 (regex teks pesan basi) | ✅ **Selesai di G1-11 (2026-10-03)** — regex disesuaikan ke teks G1-06; spec **1/1 lulus** |
| **Q21** (G1-10) | Belum ada penjaga regresi **permanen** untuk pola tab & hierarki heading (G1-10 hanya dibuktikan spec sementara) | ✅ **Selesai di G1-11** — penjaga permanen: `e2e-uiux/uiux-metrics.spec.ts` (heading + kontrak tab, dijalankan di 7 layar × 2 project) + 13 tes unit `tabsAccessibility.test.tsx` |
| **Q22** (G1-10) | (a) Keuangan: 6 `h2` setara tanpa induk; (b) Murid/Laporan/Pengaturan hanya `h1` | ✅ **Diputuskan & selesai di G1-11**: (a) langkah 4 **dibatalkan** (DoD direvisi — menciptakan `h1→h3`); (b) tiga layar dapat `h2` sr-only, terverifikasi `h2Count = 1` |
| **Q23** (G1-11, BARU) | DoD menaruh spec di `e2e/uiux-metrics.spec.ts` sekaligus melarang mengubah `playwright.config.ts`; dengan `testDir: "./e2e"` (rekursif) keduanya tidak bisa benar bersamaan | **Butuh keputusan pemilik**: terima penempatan permanen di `e2e-uiux/`, atau izinkan `testIgnore` ditambahkan ke `playwright.config.ts` dan spec dipindah ke `e2e/` |
| **Q24** (G1-11, BARU) | Sisa terukur yang kini dijaga `test.fixme`: **16 pelanggaran kontras** (Murid 6 · Detail murid 4 · Keuangan 6; termasuk 6 titik `gray-500`/`gray-100` dan 2 chip 4,39:1) + **2 tautan telepon 126×20 px** | **G2-01/G2-02** (kontras & token) dan **G2-06** (tap target) — sub-butir baru untuk `G2-02`/`G2-06`, bukan tugas baru |
| **Q25** (G1-11, BARU) | `src/index.css:67` — `button, input, select, textarea { font: inherit }` **di luar `@layer`** → mengalahkan `@layer utilities`, sehingga `text-*`/`font-*` tidak berlaku pada kontrol form (tombol `text-sm` ter-render 16px/400; `<p class="text-xs font-bold">` ter-render 12px/700). Skala tipografi K4 (24/18/15/13) tidak sampai ke tombol/input | **Butuh keputusan pemilik**: masukkan ke `G2-01` (token/primitif) atau jadikan tugas tersendiri — perubahan ini menyentuh tampilan **semua** kontrol form, jadi tidak diambil sendiri di G1-11 |
