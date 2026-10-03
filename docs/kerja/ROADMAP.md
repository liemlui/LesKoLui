# ROADMAP — Gelombang 2 & 3 (22 tugas)

> **Status:** aktif · Diperbarui: 2026-10-04 · Baseline: v1.88.0 (gate dijalankan untuk v1.88.0: `npx tsc -b` saja — keputusan pemilik tanpa lint/tes/e2e)
> **GATE SUDAH DIJALANKAN 2026-10-04** (keputusan pemilik): `npx eslint .` ✓ · `npm test` ✓ **58 berkas / 698 tes lulus** (`moneyGate.test.ts` 7/7 — penjaga G2-04 kini **terbukti**) · `npm run build` ✓ · **`npm run e2e` ✗ — 68 lulus / 12 gagal / 4 skip, semuanya di jalur laporan** (atribusi belum terbukti; `src/template/**` tak tersentuh sejak v1.79.0) · **`npm run e2e:uiux` ✗ — 42 lulus / 6 gagal / 8 skip**, gagalnya = **guard emoji TASK-11** (Beranda 2 · Murid — daftar 11 · Detail murid 1; identik chromium & mobile) — **keenamnya sudah ditutup `f035451`** sehingga guard kini **48 lulus / 8 skip / 0 gagal**; 8 skip = 4 `test.fixme` Q24. Rincian, bukti, dan langkah diagnostik berikutnya: `.design-audit/g2-gate-2026-10-04.md`
> **Masih `test.fixme` di guard yang sama (4):** 3 pemeriksaan kontras (Murid · Detail murid · Keuangan) + 1 ukuran (`detail-murid`). Penghapusannya (Q24) menuntut `npm run e2e:uiux` benar-benar dijalankan — **bukan** menaikkan ambang.
> **Cara pakai:** baca ATURAN-AI §0. Tentukan tier SEBELUM mulai. Satu putaran = satu tugas (kecuali batch 📦).
> Paralelisasi: hanya sah kalau tidak ada chat lain yang menyentuh berkas itu. Karena satu tugas bisa memegang puluhan berkas src/**, aturan default = SERIAL. Paralel butuh git worktree terpisah.
> Kolom Tier = perkiraan; tier final ditetapkan saat tugas dimulai (§6.2 butir 1).
>
> **Target G2-02 (revisi — menggantikan "889→≤190"):** **0 kelas warna langsung di luar berkas §2.1**.
> Angka 889/≤190 berasal dari penghitung 4-pola yang **buta** terhadap `slate`/`blue`/`indigo`/`text-white`,
> dan baseline sebenarnya **2976 kelas**. Terukur sesudah sapu: **0 kelas warna hidup di 72 berkas**;
> sisa kelas warna hidup **hanya** di 3 berkas §2.1 (`engagement.ts` · `invoicePresentation.ts` · `finance.ts`) — jangkar, angka terukur 2026-10-04, dan keputusan Q42/Q43 ada di [`docs/README.md`](../README.md) §4.2 #26.
> **Jangan pakai angka sebagai DoD:** penghitung `g2-02-scan.mjs` ikut menghitung komentar & teks changelog (terukur 2026-10-04: 9 dari 55 kemunculan bukan kelas hidup). Ukurannya = daftar berkas + jangkar.

## Status ringkas

| Ukuran | Nilai |
|---|---|
| Total tugas | 22 |
| Selesai | 11 (G2-00, G2-00b, G2-01, G2-02, G2-03, G2-04, G2-06, G2-07, G2-08, G2-09, G2-10) |
| Manual | 1 (G2-05 — butuh HP Android; tanpa perubahan kode) |
| Belum | 10 (G3-01 … G3-10) |
| Progress | ~50% hitung tugas (11 dari 22) · ~41% bobot usaha (S=1/M=2/L=4) |

## Gelombang 2

| ID | Judul | Tier | Dep | Berkas inti | Est | Status |
|---|---|---|---|---|---|---|
| G2-00 | Smart Gating (docs) | T0 | — | ATURAN-AI, ROADMAP | — | ✅ |
| G2-00b | Line Endings A15/A16 (docs) | T0 | — | .gitattributes, ATURAN-AI | — | ✅ |
| G2-01 | token + 7 primitif + Q25 | T3 | — | index.css, components/ui/* | L | ✅ v1.86.0 |
| G2-02 | sapu kelas warna → token semantik | T2 | G2-01 | src/**/*.tsx, src/index.css | L | ✅ v1.87.0 |
| G2-03 | kunci light-only permanen | T1 | G2-01 | index.css (komentar), playwright.config | S | ✅ v1.87.0 |
| G2-04 | satu pintu uang (TASK-08) | T2 | G2-01 | useMoneyVisible, MaskedMoney, 5 layar | L | ✅ v1.88.0 — cakupan §6 dipersempit: `src/screens/payments/**` dikecualikan (Q44/A17); residual **109 baris** didaftarkan di `ATURAN-AI` §5 |
| G2-05 | verifikasi input Android (manual) | T1 | G2-01, owner | tidak ada | S | ⛔ manual (butuh HP Android) |
| G2-06 | tap target ≥44px | T2 | G2-01 | 9 berkas layar | M | ✅ v1.88.0 — DoD ditegaskan: **44 px = kontrol utama**, chip/sekunder **24–36 px diterima** (Q45/A18); residual **52 kontrol** (proksi statis) tercatat di `ATURAN-AI` §5 |
| G2-07 | DayView kerapatan 27/54/97 | T1 | G2-01 | home/DayView.tsx | M | ✅ v1.88.0 |
| G2-08 | Beranda non-uang | T2 | G2-04 | home/*.tsx | M | ✅ v1.88.0 |
| G2-09 | emoji→SVG | T2 | G2-01 | icons.tsx + layar pemakai | M | ✅ v1.88.0 — kebijakan [TASK-11](TASK-11-emoji-ke-svg.md): emoji hanya untuk kosakata afektif ber-penanda; guard **asertif**. Guard dijalankan 2026-10-04: sempat **6 gagal**, ditutup `f035451` → **48 lulus / 8 skip / 0 gagal** |
| G2-10 | jalur galat tunggal useLiveQuery | T3 | G2-01 | useSettingsQuery + 6 layar | M | ✅ v1.88.0 |

## Gelombang 3

| ID | Judul | Tier | Dep | Berkas inti | Est | Status |
|---|---|---|---|---|---|---|
| G3-01 | Catat Sesi (refactor + C) | T3 | G2-01, G2-06 | CaptureSession.tsx, captureSession/* | L | ⬜ |
| G3-02 | Keuangan (refactor + K) | T3 | G2-04 | TagihanTab.tsx, useInvoiceFilters.ts | L | ⬜ |
| G3-03 | Redesign pipeline | T2 | G3-02 | FinancePipelineBoard.tsx, RingkasanTab.tsx | L | ⬜ |
| G3-04 | Kontrak AI (TASK-07) | T3 | G1-01, G2-01 | useAiAction, AiCostModal, Settings | L | ⬜ |
| G3-05 | Laporan modern | T3 | G3-01, G3-04 | MonthlyReport.tsx, monthlyReport/* | L | ⬜ |
| G3-06 | Murid (refactor + M) | T3 | G1-01, G2-04 | StudentDetail.tsx, IaEeTracker.tsx | L | ⬜ |
| G3-07 | foto murid | T2 | G3-06 | StudentForm.tsx, Students.tsx | M | ⬜ |
| G3-08 | Kanvas & istilah | T2 | G3-05 | CustomThemeBuilder.tsx, charts/* | M | ⬜ |
| G3-09 | Pengaturan lanjutan | T3 | G1-09 | Settings.tsx, PwaPrompts.tsx | M | ⬜ |
| G3-10 | Reset total + PIN ulang | T3 | G3-09 | Settings.tsx (zona bahaya) | M | ⬜ |

## Urutan eksekusi (dengan batch & paralel)

**Wave 1 (paralel, ~2 hari):**
- A: G2-02 (sapu)
- B: 📦 G2-03 + G2-05 + G2-06
- C: refactor CaptureSession.tsx (pra-G3-01)
- D: refactor StudentDetail.tsx + TagihanTab.tsx (pra-G3-06/G3-02)

**Wave 2 (paralel, ~2 hari):**
- E: G2-04 (satu pintu uang)
- F: 📦 G2-07 + G2-09
- G: G3-01 (Catat Sesi fitur)

**Wave 3 (paralel, ~2 hari):**
- H: 📦 G3-02 + G3-03 (Keuangan)
- I: 📦 G3-04 + G3-05 (AI + Laporan)

**Wave 4 (paralel, ~2 hari):**
- J: 📦 G3-06 + G3-07 (Murid + foto)
- K: 📦 G3-08 + G3-09 + G3-10 (kanvas + Pengaturan)

**Tutup:** checkpoint G3 (T3 penuh).

## Q-series terkunci (jangan diangkat lagi)

Q1–Q39 dijawab. Q baru hanya untuk: (a) ubah perilaku pengguna,
(b) sentuh berkas §2.1 ATURAN-AI, (c) ubah DoD/kontrak.
