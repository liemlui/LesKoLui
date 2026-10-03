# ROADMAP — Gelombang 2 & 3 (22 tugas)

> **Status:** aktif · Diperbarui: 2026-10-03 · Baseline: v1.87.0 (691 tes)
> **Cara pakai:** baca ATURAN-AI §0. Tentukan tier SEBELUM mulai. Satu putaran = satu tugas (kecuali batch 📦).
> Kolom Tier = perkiraan; tier final ditetapkan saat tugas dimulai (§6.2 butir 1).
>
> **Target G2-02 (revisi — menggantikan "889→≤190"):** **0 kelas warna langsung di luar berkas §2.1**.
> Angka 889/≤190 berasal dari penghitung 4-pola yang **buta** terhadap `slate`/`blue`/`indigo`/`text-white`,
> dan baseline sebenarnya **2976 kelas**. Terukur sesudah sapu: **0 kelas warna hidup di 72 berkas**;
> sisa 42 kelas ada di 3 berkas §2.1 (`engagement.ts` 24 · `invoicePresentation.ts` 12 · `finance.ts` 6).

## Status ringkas

| Ukuran | Nilai |
|---|---|
| Total tugas | 22 |
| Selesai | 4 (G2-00, G2-00b, G2-01, G2-02) |
| Berjalan | 0 |
| Belum | 18 (22 − 4) |
| Progress | ~18% |

## Gelombang 2

| ID | Judul | Tier | Dep | Berkas inti | Est | Status |
|---|---|---|---|---|---|---|
| G2-00 | Smart Gating (docs) | T0 | — | ATURAN-AI, ROADMAP | — | ✅ |
| G2-00b | Line Endings A15/A16 (docs) | T0 | — | .gitattributes, ATURAN-AI | — | ✅ |
| G2-01 | token + 7 primitif + Q25 | T3 | — | index.css, components/ui/* | L | ✅ v1.86.0 |
| G2-02 | sapu kelas warna → token semantik | T2 | G2-01 | src/**/*.tsx, src/index.css | L | ✅ v1.87.0 |
| G2-03 | kunci light-only permanen | T1 | G2-01 | index.css (komentar), playwright.config | S | ⬜ |
| G2-04 | satu pintu uang (TASK-08) | T2 | G2-01 | useMoneyVisible, MaskedMoney, 5 layar | L | ⬜ |
| G2-05 | verifikasi input Android (manual) | T1 | G2-01 | tidak ada | S | ⬜ |
| G2-06 | tap target ≥44px | T2 | G2-01 | 9 berkas layar | M | ⬜ |
| G2-07 | DayView kerapatan 27/54/97 | T1 | G2-01 | home/DayView.tsx | M | ⬜ |
| G2-08 | Beranda non-uang | T2 | G2-04 | home/*.tsx | M | ⬜ |
| G2-09 | emoji→SVG | T2 | G2-01 | icons.tsx + layar pemakai | M | ⬜ |
| G2-10 | jalur galat tunggal useLiveQuery | T3 | G2-01 | useSettingsQuery + 6 layar | M | ⬜ |

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
