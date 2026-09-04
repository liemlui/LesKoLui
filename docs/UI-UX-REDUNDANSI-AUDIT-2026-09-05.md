# Audit Redundansi & Penataan Informasi — Les Ko Lui

> **Tanggal audit:** 2026-09-05
> **Fokus:** **redundansi informasi**, **arsitektur informasi**, dan **konsistensi penamaan** yang di-show-off ke user pada layar utama. **Bukan** pengulangan `docs/UI-UX-AUDIT-2026-09-04.md` (fokus interaksi/a11y/design-system) maupun `docs/UI-UX-ANALYSIS.md` (fokus data-viz/chart).
> **Metode:** inspeksi kode statis atas 8 layar utama (`home/*`, `Students`, `StudentDetail`, `CaptureSession`, `MonthlyReport`, `Payments/*`, `CatatanBelajar`, `Settings`) + komponen shared + navigasi.
> **Status:** ☐ belum dieksekusi — dokumen ini adalah hasil audit + rencana perbaikan terprioritias.

---

## Ringkasan Eksekutif

Aplikasi ini kaya fitur dan sudah punya pola interaksi kuat (modal focus-trap, toast `aria-live`, PIN lockout, z-index terpusat). Masalah terbesarnya bukan teknis, melainkan **informasi yang ditampilkan berulang kali dengan nama yang berbeda-beda**, sehingga user kesulitan membedakan *apa yang sedang dilihat* dan *ke mana harus menindaklanjuti*.

**Temuan inti:**
1. **"Progress hari ini" ditampilkan 3× di satu layar** (KPI besar + kartu "Progress sesi hari ini" + progress bar TodayHero) — dua di antaranya di dalam komponen yang sama (`OperationalSnapshot`).
2. **"Perlu perhatian" ditampilkan 3×** (alert strip + MetricCard "Tindak lanjut" + MetricCard "Sesi terlewat") semuanya hanya scroll ke daftar yang sama.
3. **Kata "Catat" bermakna dua aksi berbeda di layar yang sama**: FAB nav = catat **sesi**, tombol header `💸 Catat` = catat **pengeluaran**.
4. **Halaman `/catatan` yatim** (tidak terjangkau dari mana pun) dan fungsinya sudah diduplikasi oleh `StudyNoteCard` di halaman detail murid. Tab "Catatan" di AttentionInbox adalah jalan buntu.
5. **Kolektibilitas & arus kas tampil berulang** di dalam Keuangan (3× di `TagihanTab`, diulang lagi di `RingkasanTab`).

Legend severitas: 🔴 Kritis · 🟠 Tinggi · 🟡 Sedang.

---

## Peta Informasi Saat Ini — Home (urutan render, atas → bawah)

| # | Komponen | Isi |
|---|----------|-----|
| 1 | Header | "Les Ko Lui" + tanggal · `💸 Catat` (pengeluaran!) · `⚙️` · `⏻` |
| 2 | OperationalSnapshot "Command center" | alert strip "Perlu perhatian N" → KPI "Hari Ini" (% + badge + progress bar + teks motivasi) → "Minggu Ini" + "Sesi terlewat" → "Tindak lanjut" + "Murid aktif" → separator → **"Progress sesi hari ini" (% + bar + teks — LAGI)** |
| 3 | TodayHero "Hari Ini" | "N sesi" + badge selesai/menunggu/batal + **progress bar (LAGI)** + daftar sesi + "+ Jadwal" |
| 4 | AttentionInbox "Perlu Perhatian" (collapsible) | tab Sesi / **Catatan (buntu)** / Follow-up |
| 5 | Toggle Bulan/Minggu/Hari + filter murid | |
| 6 | Kalender | |

> Dampak: user men-scroll ±2,5 layar yang sebagian besar memuat ulang fakta yang sama sebelum sampai ke kalender.

---

## 🔴 KRITIS — Redundansi yang langsung membingungkan

### R1. "Progress hari ini" ditampilkan 3× di satu layar
- `screens\home\OperationalSnapshot.tsx:88-139` — KPI "Hari Ini": `todayPct` besar + progress bar + teks kondisional ("Semua sesi selesai! 🎉" / "Belum ada sesi selesai — mulai catat sesi pertama." / "N sesi tersisa").
- `screens\home\OperationalSnapshot.tsx:216-261` — bagian **"Progress sesi hari ini"**: persis `todayPct` + progress bar + teks kondisional yang sama, **duplikat harfiah di dalam kartu yang sama**.
- `screens\home\TodayHero.tsx:46-60` — progress bar ketiga (`done / sessions.length`, angka identik).
- **Rekomendasi:** cukup **satu** progress bar yang hidup — pertahankan di TodayHero (yang sudah punya badge + daftar sesi). Hapus KPI %-besar dan bagian "Progress sesi hari ini" dari snapshot.

### R2. "Perlu perhatian" ditampilkan 3× (plus angka turunan)
- Alert strip `OperationalSnapshot.tsx:68-83` — "⚠️ Perlu perhatian N" → hanya `scrollIntoView`.
- MetricCard "Tindak lanjut" `OperationalSnapshot.tsx:195-203` — angka sama → scroll yang sama.
- MetricCard "Sesi terlewat" `OperationalSnapshot.tsx:182-190` — subset angka → scroll yang sama.
- **AttentionInbox** (`home\AttentionInbox.tsx`) — satu-satunya berisi daftar aslinya.
- Akibat definisi `attentionCount = missed + follows` (`Home.tsx:172`): user melihat "Sesi terlewat: 2" + "Tindak lanjut: 3" + strip "3" — **tiga angka untuk dua daftar**.
- **Rekomendasi:** hapus strip + kedua MetricCard; biarkan AttentionInbox selalu tampil dengan badge count di header-nya. Hemat ±2 baris card penuh.

### R3. Tab "Catatan" di AttentionInbox buntu + halaman `/catatan` yatim
- `AttentionInbox.tsx:38` — `{ key: "catatan", label: "Catatan", count: 0 }` → **count di-hardcode 0**; isinya hanya teks "bisa dilihat di halaman Catatan" (bukan link).
- Verifikasi menyeluruh (`to="/catatan"`, `navigate("/catatan")`): **0 hasil** di seluruh `src`. `/catatan` tidak ada di BottomNav sejak nav 5-slot (Home · Murid · **Catat** · Laporan · Keuangan).
- Fungsi `/catatan` (study notes per murid) **sudah diduplikasi** oleh `studentDetail\StudyNoteCard.tsx` — tabel `studyNotes` sama, dua editor berbeda, salah satunya tak terjangkau.
- **Keputusan (disetujui user):** Opsi A — hapus `/catatan`, jadikan `StudyNoteCard` satu-satunya editor, pindahkan ke tab "Ringkasan"; hapus tab "Catatan" buntu dari AttentionInbox.

### R4. Kata "Catat" = dua aksi berbeda di layar yang sama
- Bottom nav FAB "Catat" → wizard catat **sesi** (`/capture`).
- Tombol header Home `💸 Catat` (`Home.tsx:149-152`) → **QuickExpenseModal** (pengeluaran).
- **Rekomendasi:** ganti label header → `💸 Pengeluaran`.

### R5. Kata "Catatan" = tiga makna
- Wizard step 5 "Catatan" = ringkasan sesi (`CaptureSession.tsx:60`).
- Route `/catatan` = "Catatan Belajar" per murid (running note).
- Tab "Catatan" di AttentionInbox = pointer buntu ke halaman yatim (R3).
- **Rekomendasi:** setelah Opsi A dijalankan, sisa istilah "Catatan" konsisten = *catatan belajar per murid*; wizard tetap pakai label tindakan ("Ringkasan") agar tidak rancu.

---

## 🟠 TINGGI — Duplikasi metrik & wayfinding

### R6. Kolektibilitas 3× dalam satu kartu (TagihanTab)
- `payments\TagihanTab.tsx:247-344` — badge `{collectionRate}% tertagih` (header) + `ActivityRing "Kolektibilitas invoice"` + `ProgressBar "Kolektibilitas"` — **satu metrik, tiga tampilan**.
- Diulang lagi di `RingkasanTab.tsx:444-466` ("Kesehatan keuangan") — badge `% lunas` + ActivityRing "Tagihan dilunasi" + MetricCard "Invoice lunas X%".
- **Rekomendasi:** TagihanTab pertahankan `ActivityRing` saja (hapus badge % + ProgressBar). Ringkasan cukup satu tampilan kolektibilitas dengan label konsisten.

### R7. "Arus kas bersih" dua kali di Ringkasan
- Section "Arus kas" (`RingkasanTab.tsx:385-410`) angka besar `cash.laba`, dan MetricCard "Arus kas bersih" (`RingkasanTab.tsx:465`) — nilai sama.
- **Rekomendasi:** hapus MetricCard; section "Arus kas" sudah menyajikan angka + konteks.

### R8. Breadcrumb + tombol "‹ Kembali ke Daftar Murid" berdampingan
- `StudentDetail.tsx:400-406` — Breadcrumb (Home › Murid › Nama) tepat di atas tombol "‹ Kembali ke Daftar Murid". Dua alat navigasi, satu tujuan, ±70px vertikal terbuang di mobile.
- **Rekomendasi:** hapus `<Breadcrumb />` di StudentDetail (satu-satunya rute dalam app yang depth ≥2); pertahankan tombol ‹ Kembali (lebih ramah thumb). Sejalan dengan arah audit sebelumnya yang menyarankan breadcrumb selektif.

### R9. "Catat Sesi" dari halaman murid tidak membawa konteks murid
- `StudentDetail.tsx:440` — `navigate("/capture")` polos.
- `CaptureSession.tsx:104-105` — hanya membaca `?scheduleId=`, tidak ada `?studentId=`.
- Pengalaman: user tap "Catat Sesi" dari profil Andi → wizard menyuruh "👤 Pilih murid dulu". Terasa rusak.
- **Rekomendasi:** `CaptureSession` baca `searchParams.get("studentId")` sebagai preselect (pola sama seperti `scheduleId`); `StudentDetail` kirim `?studentId=${id}`.

### R10. Tab butuh "manual pemakaian" — tanda arsitektur info tidak self-evident
- `Payments.tsx:26-31` — tiap tab punya deskripsi, mis. Ringkasan: *"hanya untuk dipantau; semua aksi ada di tab Penagihan"*.
- Kalau tab harus dijelaskan dengan "bukan untuk X", tab-nya yang salah nama/bagi.
- **Rekomendasi:** rename tab "Ringkasan" → "Bulan Ini" (selaras period picker), hapus `TAB_DESCRIPTIONS` setelah penamaan jelas (atau sisakan 1 baris khusus Penagihan).

### R11. Satu tempat, tiga nama (Penagihan)
- Tab label "Penagihan" (compact "Tagih") → eyebrow "Penagihan · Semua Periode" → judul section **"Pusat Koleksi"** (`TagihanTab.tsx:250-251`).
- User mencari "Penagihan", menemukan "Pusat Koleksi".
- **Rekomendasi:** samakan — judul section "Penagihan", hapus "Pusat Koleksi".

---

## 🟡 SEDANG — Penataan & housekeeping

- **R12.** `StudyNoteCard` berada di tab "Sesi & Jadwal" (`StudentDetail.tsx:613-620`) — catatan belajar bukan sesi; seharusnya di tab "Ringkasan".
- **R13.** Header StudentDetail mengulang sekolah/mapel yang juga tercetak di kartu "Info Murid" (`StudentDetail.tsx:427-430` vs `481-493`).
- **R14.** Empty-state ganda "tidak ada sesi hari ini": snapshot (`OperationalSnapshot.tsx:256-259`, merujuk komponen lain *by name*: `'bagian "Hari Ini" di bawah'` — copy coupling rapuh) vs TodayHero ("Tidak ada sesi hari ini 🎉").
- **R15.** Tombol `⏻` Keluar di header Home (`Home.tsx:157-160` + `ExitAppModal`): di Android PWA `window.close()` hampir selalu ditolak → modal "browser tidak mengizinkan". Fitur yang nyaris selalu gagal di real estate termahal layar.
- **R16.** `Breadcrumb.tsx:21` masih menyimpan label legacy `"tugas"`; `App.tsx:27` meng-import `CatatanBelajar` sebagai `Tugas` — sisa rebranding yang belum dibersihkan.
- **R17.** Tab "Ringkasan" = dashboard "segalanya": pipeline board (read-only) + status pendapatan + arus kas + Kesehatan keuangan + AI + forecast + 3 chart — satu tab sangat panjang (punya `<details>` "Analitik lanjutan" sebagai penyangga).
---

# 💡 Ide Perbaikan (terprioritisasi)

## Fase 0 — Kemenangan tercepat (dampak pemahaman terbesar, risiko kecil)
1. **Satu kartu "Hari Ini"** — hapus bagian "Progress sesi hari ini" (duplikat harfiah) + KPI %-besar; satu progress bar hidup di TodayHero. Snapshot menyusut jadi strip: Minggu ini + Murid aktif.
2. **Satu tempat "Perlu perhatian"** — hapus alert strip, MetricCard "Tindak lanjut", MetricCard "Sesi terlewat"; AttentionInbox selalu tampil dengan badge count.
3. **Hapus tab "Catatan" buntu** dari AttentionInbox.
4. **Rename header Home**: `💸 Catat` → `💸 Pengeluaran`.
5. **`/capture?studentId=`** — CaptureSession baca param; StudentDetail kirim param.

## Fase 1 — Hapus `/catatan` (Opsi A, disetujui user)
6. Hapus `screens\CatatanBelajar.tsx`; hapus route `/catatan` + import `Tugas` di `App.tsx`; bersihkan `ROUTE_LABELS` ("catatan", "tugas") di `Breadcrumb.tsx`.
7. Pindahkan `<StudyNoteCard>` ke tab "Ringkasan" StudentDetail; hapus dari tab "sesi".
8. Update `e2e\screenshot-katalog.spec.ts` (hapus step `06-catatan`) dan referensi `PANDUAN-PENUNTASAN-CATAT-SESI.md` bila ada.

## Fase 2 — Keuangan
9. `TagihanTab`: hapus ProgressBar "Kolektibilitas" + badge `%` header; sisakan `ActivityRing`. Ganti judul "Pusat Koleksi" → "Penagihan".
10. `RingkasanTab`: hapus MetricCard "Invoice lunas" & "Arus kas bersih" (sudah ada di section Arus Kas + satu kolektibilitas).
11. `Payments.tsx`: rename tab "Ringkasan" → "Bulan Ini"; hapus/ramping `TAB_DESCRIPTIONS`; strip "Ringkasan {bulan}" dirender bersama `FinancePeriodPicker` (berlaku untuk ringkasan + pengeluaran).

## Fase 3 — Wayfinding & housekeeping
12. `StudentDetail`: hapus `<Breadcrumb />`; header cukup nama + chip kurikulum (sekolah/mapel di Info card).
13. Pindahkan `StudyNoteCard` ke tab Ringkasan (redundant dengan #7 — dilakukan sekali).
14. Hapus tombol `⏻` dari header Home; pindahkan "Keluar" ke `Settings.tsx` section "Aplikasi (PWA)".
15. Satukan empty state "belum ada sesi" jadi satu komponen yang tidak merujuk nama section lain.

---

## Rencana Progression & Verifikasi

| Fase | Isi | Estimasi | Dampak |
|---|---|---|---|
| 0 — Dekongesti Home & penamaan | R1–R5 | ±2 jam | Home menyusut ±2,5 layar → ±1,2 layar; tidak ada tombol "Catat" ambigu |
| 1 — Hapus /catatan | R3, R12, R16 | ±1 jam | Satu editor catatan belajar; tak ada rute mati |
| 2 — Keuangan | R6, R7, R10, R11, R17 | ±3 jam | Kolektibilitas/arus kas tampil tepat sekali |
| 3 — Wayfinding & housekeeping | R8, R13, R14, R15 | ±2 jam | Navigasi konsisten, header ramping |

Verifikasi tiap fase: `npm run lint` · `npm test -- --run` · `npm run build` — mengacu konvensi audit sebelumnya (lint 0 · test hijau · build OK). Jaring pengaman tes yang relevan: `bottomNavNoVersion.test.tsx`, `reportDisplayStatus.test.ts`, dsb.

---

## Checklist Pengerjaan

- [x] Fase 0 — R1..R5
- [x] Fase 1 — hapus `/catatan` (Opsi A)
- [x] Fase 2 — R6..R7, R10..R11, R17
- [x] Fase 3 — R8, R13, R14, R15

_Verifikasi Fase 0 (2026-09-05): `npm run lint` ✅ · `npm test -- --run` ✅ · `npm run build` ✅._
_Verifikasi Fase 1 (2026-09-05): `npm run lint` ✅ · `npm test -- --run` ✅ (33 file, 351 tes) · `npm run build` ✅._
_Verifikasi Fase 2 (2026-09-05): `npm run lint` ✅ · `npm test -- --run` ✅ (33 file, 351 tes) · `npm run build` ✅. R17 dipertahankan dengan panel Analitik Lanjutan yang collapsed._
_Verifikasi Fase 3 (2026-09-05): `npm run lint` ✅ · `npm test -- --run` ✅ (33 file, 351 tes) · `npm run build` ✅._