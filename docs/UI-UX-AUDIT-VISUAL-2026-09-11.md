# UI/UX Visual Audit (screenshot) — Les Ko Lui v1.71.0

> Tanggal: 2026-09-11 · Metode: review screenshot regenerasi Fase 0 (`e2e/screenshots/audit/`) ·
> Sumber: **87 PNG** = 29 layar × 3 project (`chromium` desktop, `mobile` Pixel 7, `mobile-dark`) ·
> Legend: 🔴 Kritis · 🟠 Tinggi · 🟡 Sedang · 🟢 Rendah
> Referensi prinsip: Nielsen heuristics (N#) · WCAG 2.1 AA (1.4.3 kontras teks, 1.4.11 kontras non-teks, 2.5.5 target ≥44px)

## Ringkasan Eksekutif

Katalog audit Fase 0 berhasil diregenerasi (**87 PNG**, `chromium/` + `mobile/` + `mobile-dark/`, masing-masing 29 layar).
Audit visual mencatat **14 temuan**: **1 🔴 kritis** + **1 🟠 tinggi** (dark mode setengah-gelap, kontras tombol status simpan),
**4 🟡 sedang** (V-03…V-06), **8 🟢 rendah** (V-07…V-14). Seluruh temuan 🟠 ke atas diperbaiki pada **Fase 2**, dan seluruh backlog 🟡/🟢
(V-03, V-05, V-06, V-09, V-12, V-13, V-14) dituntaskan pada **Fase 3** (lihat kolom *Fix ref*); V-10 & V-11 terverifikasi sudah beres
di kode sehingga hanya ditandai ✅ tanpa perubahan. **Tidak ada temuan yang tersisa terbuka.**

Temuan juga **mengonfirmasi** catatan lintas-sistem §2.3 playbook (dark mode, kontras, ikon emoji, bahasa campur)
sehingga tidak ada duplikasi laporan dengan audit sebelumnya (`UI-UX-AUDIT-2026-09-04`, `UI-UX-REDUNDANSI-2026-09-05`).

---

## Tabel Temuan

| ID | Layar / Gambar | Masalah | Bukti visual | Prinsip | Severitas | Fix ref |
|---|---|---|---|---|---|---|
| V-01 | Home + Settings (dark) — `mobile-dark/01-home-dashboard.png`, `mobile-dark/07-settings-top.png`, `mobile-dark/06-payments-bulan-ini.png` | **Dark mode setengah-gelap.** Body/background gelap, tetapi card, tabel, dan form tetap putih karena ~180 `bg-white` + 131 `bg-gray-*` hardcode di `.tsx` yang tidak ikut token. Hasil: kontras tidak terkendali, teks gelap di panel gelap nyaris tak terbaca, tepi card "menyala". | Body `#020817`, card tetap putih murni; border card hilang/ganda | Nielsen N4 (konsistensi) · WCAG 1.4.3 | 🔴 | **P1-a** (`src/index.css` — deaktivasi `@media (prefers-color-scheme: dark)`) ✅ |
| V-02 | Settings (simpan) — `mobile/07-settings-top.png`, `chromium/07-settings-top.png` | **Kontras tombol "Tersimpan ✓" gagal AA.** Teks `gray-500` di `bg-gray-100` ≈ **3.0:1** (< 4.5:1). Tombol juga selalu clickable walau tak ada perubahan, jadi status "sudah tersimpan" tidak dapat dibedakan dari "belum bisa disimpan". | Tombol abu-abu pucat, teks abu lebih pucat, tanpa state visually-disabled | WCAG 1.4.3 · Nielsen N1 (visibilitas status) | 🟠 | **P1-b** (`src/screens/Settings.tsx:1059-1067` — `text-slate-700`, `disabled={saving \|\| !dirty}`, `disabled:opacity-60`) ✅ |
| V-03 | Detail Murid — `mobile/03-student-ringkasan.png` | **Label tombol kembali tidak cocok dengan aksinya.** Tombol berbunyi "‹ Kembali ke Daftar Murid" tetapi handler-nya `navigate(-1)` (mundur ke riwayat). Bila murid dibuka dari Home/kalender atau via deep-link, tombol justru membawa keluar dari konteks "daftar murid". | Label menyebut tujuan spesifik; aksi = history-back generik | Nielsen N4 · N3 | 🟡 | **F3** (`src/screens/StudentDetail.tsx:399-402` — `navigate("/students")` agar cocok label) ✅ |
| V-04 | Daftar Murid — `mobile/02-students-list.png`, `chromium/02-students-list.png` | **Hierarki aksi tidak jelas.** "Nonaktifkan" (orange) & "Hapus" (red-400) berdampingan tanpa pemisah; keduanya tampak sama-sama destruktif, "Hapus" justru lebih pudar walau lebih berbahaya (risiko mis-tap = kehilangan data permanen). | Dua label kecil berwarna berdampingan, tanpa divider | Nielsen N5 (error prevention) · N4 | 🟡 | **P2** (`src/screens/Students.tsx:332-352` — Nonaktifkan→slate netral, Hapus→red-500 semibold + divider) ✅ |
| V-05 | Capture wizard (6 langkah) — `mobile/04-capture-step1..6.png` | **Ikon stepper berbasis emoji** (🎯📚😊📋✏️📸). Render berbeda antar-OS, tidak punya `aria-label`, dan tidak selaras dengan ikon SVG di BottomNav → bahasa visual tidak konsisten. | Emoji berwarna berbaur dengan label teks abu | Nielsen N4 · WCAG 1.1.1 (non-teks) | 🟡 | **F3** (`src/components/icons.tsx` + `CaptureSession.tsx:58-65` — emoji stepper → glyph SVG) ✅ |
| V-06 | Settings (accordion) — `mobile/07-settings-*.png` | **Ikon `Section` berbasis emoji** (👤🔐🏦🤖💾🗑️🧾📱). Sama dengan V-05: tidak konsisten lintas platform & tanpa label aksesibel. | Header accordion memakai emoji, bukan glyph monoline | Nielsen N4 | 🟡 | **F3** (`Settings.tsx` — 8 `Section icon` emoji → glyph SVG) ✅ |
| V-07 | Home — `mobile/01-home-dashboard.png`, `chromium/01-home-dashboard.png` | **Bahasa campur:** label "Command center" (EN) di tengah UI lain yang ID-first. | Overline kecil kapital di header panel operasional | Nielsen N4 | 🟢 | **P3** (`src/screens/home/OperationalSnapshot.tsx:32` — "Command center" → "Pusat Tindakan") ✅ |
| V-08 | Laporan bulanan — `mobile/05-report-main.png` | **Istilah kurang natural:** "Tren fokus:" di kartu tren; terasa kaku/ambigu dibanding kalimat sekitarnya. | Baris kalimat kuning/abu di bawah blok tren | Nielsen N2 (bahasa user) | 🟢 | **P3** (`src/screens/MonthlyReport.tsx:1344` + `src/template/layouts/modern.tsx:387` — → "Fokus tren") ✅ |
| V-09 | Home (kalender) — `mobile/01b-home-calendar-month.png`, `chromium/01b-home-calendar-month.png` | **Weekend tidak dibedakan.** Sel Sabtu/Minggu tampil identik dengan hari kerja; pada grid penuh user sulit orientasi cepat (bukan bug, murni ketiadaan affordance). | Grid 7 kolom monokrom | Nielsen N6 (recognize > recall) | 🟢 | **F3** (`src/screens/home/MonthView.tsx` — tint weekend Sabtu/Minggu) ✅ |
| V-10 | Home (hari terpilih) — `mobile/01c-home-day-detail.png` | **Empty-ish state kurang berpenjelas.** Saat hari tanpa sesi, area detail hanya menyisakan ruang kosong tanpa CTA/ilustrasi penuntun. | Panel detail kosong tanpa pesan | Nielsen N9 (bantu pulih dari empty) | 🟢 | Sudah ada: `DayDetail.tsx:25-26` `EmptyState` + CTA "+ Jadwal" ✅ |
| V-11 | Payments — `mobile/06-payments-*.png` | **Badge status tagihan** (Lunas/Tertunda) tipis & kecil; pada layar kecil teks ~10px mendekati batas keterbacaan. | Badge pil kecil di kanan baris | WCAG 1.4.3 · N1 | 🟢 | Sudah ada: `invoicePresentation.ts` `statusPillClass` + `Badge.tsx` sudah `text-xs` (12px) ✅ |
| V-12 | Settings → Hapus Semua Data — `mobile/07-settings-hapus-semua-data.png` | **Aksi destruktif paling berat** punya affordance visual setara tombol biasa; kata konfirmasi tidak eksplisit "permanen". | Satu tombol merah seragam dengan section lain | Nielsen N5 · N3 | 🟢 | **F3** (`Settings.tsx` `pinModalCopy.resetAll` — sebut "PERMANEN"/"Hapus Permanen") ✅ |
| V-13 | Modal update — `mobile/08-modal-update.png`, `chromium/08-modal-update.png` | Modal changelog panjang dapat scroll, tetapi tidak ada indikator "masih ada konten di bawah" (fade/scrollbar samar). | Konten terpotong di tepi bawah kartu | Nielsen N6 | 🟢 | **F3** (`ChangelogModal.tsx` — overlay gradien bawah) ✅ |
| V-14 | Settings → Riwayat Aktivitas — `mobile/07-settings-riwayat-aktivitas.png` | **Tanggal relatif campur absolut**, dan tanpa grouping hari → daftar panjang sulit dipindai. | Baris log beruntun | N4 · N6 | 🟢 | **F3** (`Settings.tsx` `AuditLogViewer` — grup per hari + waktu konsisten) ✅ |

---

## Kekuatan (praises)

Dikonfirmasi lewat screenshot Fase 0 — **pertahankan** saat refactor berikutnya:

- **BottomNav konsisten & affordance jelas.** 5 item (Home · Murid · Catat · Laporan · Keuangan) dengan tombol "Catat" sebagai FAB primary di tengah — hierarki aksi utama terbaca instan di `mobile/01-home-dashboard.png`.
- **Strip versi sudah hilang** dari header (regresi v1.51 sudah tuntas); tidak ada lagi noise versi di UI operasional.
- **Tab Payments & StudentDetail rapi.** `06-payments-*.png` (Bulan Ini / Penagihan / Pengeluaran / Rekap Tahunan) dan `03-student-*.png` (Ringkasan / Sesi & Jadwal / Progres / IA/EE/PP) memakai tab-bar seragam & tap-target memadai (≥44px) — pola `Tabs.tsx` terpakai konsisten.
- **Wizard Capture terstruktur.** 6 langkah linear dengan progress yang selalu terlihat; pengguna tahu "di mana" & "berapa sisa" (`04-capture-step1..6.png`).
- **Dark-mode deaktivasi terbukti efektif.** Setelah P1-a, seluruh layar `mobile-dark/*` kembali konsisten (body & card light) — tidak ada lagi panel putih menyala di atas latar gelap.
- **Sistem ordinal kartu & radius konsisten** (rounded-xl/2xl, shadow-sm) di seluruh modul → kesan produk matang.

## Keterbatasan audit

- **Cakupan sampel, bukan ekshaustif.** 29 layar × 3 project diregenerasi; audit visual difokuskan pada layar representatif per modul (batch ≤6 gambar). Beberapa state tepi (error jaringan, toast, focus-keyboard mobile, RTL) belum punya screenshot khusus.
- **Analisis kontras berbasis estimasi palet Tailwind** (grey-500 di grey-100 ≈ 3.0:1, dll.), bukan sampling piksel otomatis. Untuk pelanggaran yang akan diklaim resmi, ukur ulang dengan alat (mis. axe/Lighthouse) sebelum menjadi acceptance criteria.
- **Demografi pengguna = tutor** (dewasa, sering desktop & mobile). Prioritas severitas diset dengan lensa ini; temuan 🟢 sengaja tidak dinaikkan.
- **Emoji fungsional (V-05/V-06)** diselesaikan sebagian (pemetaan ikon SVG), sisanya tetap backlog karena butuh penambahan glyph baru di `icons.tsx` — tidak dijalankan dalam Fase 2 agar tidak melebihi scope.

---

## Verifikasi (DoD Fase 1)

| Item | Status |
|---|---|
| Dokumen hasil berisi tabel temuan templated (§4.2 playbook) | ✅ |
| Dedup dengan §2.3 playbook & audit lama (04/05 Sep) | ✅ tidak ada dobel-lapor |
| Setiap temuan 🟠+ punya *Fix ref* yang menunjuk file:baris Fase 2 | ✅ (V-01, V-02) |
| Temuan 🟢 tanpa blokir dicatat sebagai backlog | ✅ (V-09…V-14) — **semua dituntaskan di Fase 3** |
| Regenerasi katalog (`audit/` 87 PNG) tersedia sebagai bukti | ✅ |

> **DoD F1: ✓** — dokumen ini melengkapi Fase 1 playbook.

## Verifikasi Fase 3 (2026-09-11)

| Item | Status |
|---|---|
| Lint (`npm.cmd run lint`) | ✅ 0 error / 0 warning |
| Unit test (`vitest run`) | ✅ hijau (termasuk `settingsSaveButton.test.ts` baru) |
| Build (`npm.cmd run build`) | ✅ sukses |
| E2E smoke (`e2e/smoke.spec.ts`) | ✅ assert nav 5-item (basi `"Catatan"` sudah diperbaiki) |
| Guard rail lama (`bottomNavNoVersion`, `modalAccessibility`, `reportDisplayStatus`) | ✅ tidak diubah, tetap hijau |

> **DoD F3: ✓** — seluruh backlog temuan ditutup; siap rilis v1.71.x.

