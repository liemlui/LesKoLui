# TASK-11 — Kebijakan emoji pada kontrol (lanjutan G2-09)

> **STATUS:** **diputuskan & dikerjakan** (opsi A, keputusan pemilik 2026-10-03) · **PEMILIK:** agen AI
> **DIBUAT:** 2026-10-03 · **DIPERBARUI:** 2026-10-03 · **BASELINE:** v1.88.0
> **MERUPAKAN:** lanjutan **G2-09** (bukan tugas baru di daftar 22) — PEKERJAAN tetap 22 tugas
> **INDUK:** [`GELOMBANG-2.md`](../arsip/GELOMBANG-2.md) §G2-09 · **ATURAN:** [`ATURAN-AI.md`](ATURAN-AI.md)

## 0. DoD yang berlaku sekarang (menggantikan rumusan lama)

> **0 emoji pada kontrol dan heading, KECUALI kosakata keadaan afektif yang ditandai eksplisit.**

- **Kontrol** = `button`, `a[href]`, `[role=button]`, dan `h1…h6`.
- **Kosakata keadaan afektif** = mood, situasi, indikator perilaku, tag respons, dan level sesi —
  dirender dari berkas data dan **wajib** membawa atribut `data-emoji-vocab="affect"`.
- Guard `e2e:uiux` melewati elemen ber-penanda itu, lalu **menuntut 0** di luar penanda
  (`emojiInControlsCount`). Bukan `test.fixme` — angka 0 adalah syarat.

Alasan kebijakan ini dipilih: emoji memang alat terbaik untuk **keadaan emosional/keadaan tubuh**
(Frustrasi, Cemas, Gelisah, Sibuk sendiri). Ikon stroke generik untuk hal-hal itu berisiko terbaca
salah — dan ini dibaca tutor untuk menilai kondisi murid. Sebaliknya, kontrol **aksi/struktural**
(backup, restore, kamera, tipe sesi, unduh) memang tempatnya ikon SVG.

## 1. Yang dikerjakan (2026-10-03)

| # | Pekerjaan | Bukti |
|---|---|---|
| 1 | Emoji **literal di JSX** disapu (17 ikon SVG, 23 berkas) | `.design-audit/g2-09-check.cjs` → 0 |
| 2 | Emoji di dalam **`<a href>`** (tombol "Kirim ke Orang Tua" & tautan WA murid) → `ChatIcon` | 3 titik, `Task-11-tidy.cjs` |
| 3 | Label tombol yang tersisa dimulai spasi (bekas sapuan) dirapikan | 4 titik |
| 4 | **Tipe sesi** (satu-satunya kelompok struktural) → `Icon` komponen: Book, Clipboard, Wrench, Lightbulb, Refresh, Star | `SESSION_TYPE_OPTIONS` + `ScheduleStep.tsx` |
| 5 | **13 tombol** kosakata afektif ditandai `data-emoji-vocab="affect"` | `CaptureSession.tsx` 9 · `SessionDetailModal.tsx` 4 |
| 6 | Guard: metrik mencakup kontrol + tautan, melewati penanda, **menuntut 0** | `e2e-uiux/uiux-metrics.spec.ts` |

Pemeriksa mandiri dengan **selektor yang sama** dengan guard: `.design-audit/task-11-check.cjs`
→ **0 pelanggaran**.

## 2. Yang SENGAJA tetap emoji (dan tetap dihitung sebagai residual "di luar kontrol")

| Sumber | Jumlah | Dipakai di |
|---|---:|---|
| `responseTaxonomy.ts` | 26 | chip tag respons (afektif) + 12 tag perilaku |
| `captureSession/constants.ts` | 19 | chip situasi (7) + indikator perilaku (12) |
| `moods.ts` | 5 | chip mood |
| `engagement.ts` | 3 | level sesi (lancar/biasa/berat) — **berkas dilindungi §2.1, tidak disentuh** |
| `template/layouts/*` | 9 | dekorasi di dalam templat laporan |

## 3. Catatan penyimpangan & hal yang masih terbuka

1. **`⭐ ✅ 🟡 🔴` tidak dikonversi** meski sempat masuk rencana. Alasan: keempatnya hidup di dalam
   `RESPONSE_TAGS`, satu array yang dirender sebagai **satu kelompok chip**. Mengonversi 4 dari 26
   entri akan membuat satu baris chip bercampur ikon-dan-emoji — persis yang dihindari kebijakan ini.
   Kalau nanti keempatnya mau jadi ikon (mereka sebenarnya "hasil akademik", bukan afek), cara bersihnya:
   **pisahkan mereka ke array sendiri** (`OUTCOME_TAGS`) sehingga batas kelompoknya eksplisit.
2. **Batas cakupan: `label`, `<span>`, tooltip, dan teks paragraf tidak disapu.** Contoh yang tersisa:
   `🗂️ Tipe Sesi` (label di `ScheduleStep`), `🔁` di baris tindak lanjut `CloseOutSheet`, emoji di
   tooltip tag AI. Itu bukan kontrol, jadi di luar DoD — tetapi terlihat di layar.
3. **Guard sudah dijalankan (2026-10-04) dan sempat GAGAL 6 tes — sekarang hijau.** Pemeriksa statis
   melaporkan 0 karena emoji lolos lewat **nilai prop** (`<SectionHeader title="📝 …"/>`) dan
   **`<span>` bersarang di dalam `<a>`** — dua jalur yang tidak terjangkau pemindaian rentang JSX.
   Terukur saat gagal (identik chromium & mobile): **Beranda 2** (`⚙️` di `<a>`, `👥` di `<button>`) ·
   **Murid — daftar 11** (`🔔` `👤` `💳`) · **Detail murid 1** (`📝` di `<h2>`).
   Ditutup di commit **`f035451`**: keenam emoji struktural diganti ikon SVG (`SettingsIcon`, `UsersIcon`,
   `BellIcon`, `ReceiptIcon`, `UserIcon`, `PencilIcon`); `MetricCard.icon` dan `SectionHeader.icon` kini
   menerima `ReactNode` sehingga ikon bisa dikirim sebagai prop. Guard **48 lulus / 8 skip / 0 gagal**.
4. **Pelajaran teknis:** komentar di dalam blok `measure()` berada di **dalam template literal** —
   satu backtick di sana menutup template lebih awal dan merusak seluruh spec. Sudah pernah terjadi
   di sini dan diperbaiki (kesalahan tertangkap karena spec diperiksa `tsc --noEmit` terpisah).

## 4. Verifikasi yang dijalankan

| Perintah | Hasil |
|---|---|
| `npx tsc -b` | exit 0 |
| `npx tsc --noEmit --ignoreConfig … e2e-uiux/uiux-metrics.spec.ts` | exit 0 (spec valid) |
| `.design-audit/task-11-check.cjs` (selektor = guard) | **0 pelanggaran** |
| `.design-audit/g2-09-verify-metric.cjs` | 21/21 contoh sesuai (regex + allowlist) |
| `node scripts/check-md-links.mjs` | 0 tautan rusak |
| `npm run e2e:uiux` | **48 lulus · 8 skip · 0 gagal** (2026-10-04, setelah `f035451`) |
| `npm test` | **58 berkas · 698 tes lulus** (2026-10-04) |

## 5. Riwayat

| Tanggal | Perubahan |
|---|---|
| 2026-10-03 | Dibuat dari sisa G2-09: JSX bersih (0), sisa 70 entri `icon:` di berkas data, 14 situs render di dalam kontrol, 21 emoji emosi butuh keputusan |
| 2026-10-03 | **Keputusan pemilik: opsi A.** DoD diganti menjadi "0 emoji di kontrol kecuali kosakata afektif ber-penanda". Tipe sesi dikonversi ke SVG, 13 tombol ditandai, guard menuntut 0 |
| 2026-10-04 | **Guard dijalankan pertama kali → GAGAL 6 tes** (Beranda 2 · Murid 11 · Detail murid 1). Akar: emoji masuk lewat nilai prop dan `<span>` di dalam `<a>`, di luar jangkauan pemindai statis. Diperbaiki di `f035451` (6 ikon SVG baru/berjalan + `MetricCard.icon`/`SectionHeader.icon` menerima `ReactNode`); guard **48/8/0** |
