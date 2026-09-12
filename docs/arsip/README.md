# Arsip Dokumentasi — Les Ko Lui

**Isi:** 12 dokumen yang sudah **selesai** atau **historis**. Tidak ada dokumen yang dihapus — hanya dipindahkan ke sini dan diringkas di bawah, supaya sejarah keputusan tetap bisa ditelusuri tanpa mengganggu dokumen aktif.

**Aturan arsip:** isi dibekukan — temuan, angka, dan keputusan di dalam setiap dokumen tetap seperti saat ditulis. Satu-satunya perubahan yang dilakukan saat pengarsipan 2026-09-12 adalah **penyesuaian rujukan path** agar tidak menunjuk ke lokasi lama (mis. `docs/UI-UX-ANALYSIS.md` → `arsip/UI-UX-ANALYSIS.md`, `AUDIT-CHECKLIST.md` → `arsip/AUDIT-CHECKLIST.md`). Catatan: sebagian dokumen lama memakai path relatif-workspace (mis. `les-ko-lui/src/...`) karena begitulah aslinya ditulis; itu dibiarkan apa adanya.

> **Dua tautan di `AUDIT-CHECKLIST.md` memang menunjuk berkas yang sudah tidak ada** — `src/screens/Home.tsx` (kini `src/screens/home/Home.tsx`) dan `src/lib/exportAbsensi.ts` (dihapus saat pembersihan dead code v1.53). Keduanya dibiarkan karena merupakan bagian dari catatan audit saat itu, bukan tautan hidup yang perlu diperbaiki.

**Cara membaca:** kalau Anda butuh *aturan yang masih berlaku*, buka `../` (dokumen aktif). Arsip ini untuk menjawab "kenapa dulu diputuskan begitu" dan "apa yang sudah pernah dikerjakan".

---

## 1. Inventaris

| Dokumen | Tanggal | Target | Status akhir | Hasil singkat |
|---|---|---|---|---|
| `DOC-AUDIT.md` | 2026-06-26 | v1.12.1 | ✅ selesai | Audit dokumen vs kode: 9 kategori gap diperbaiki, 10 spec doc + 3 meta doc diselaraskan |
| `CHECKLIST.md` | 2026-06-26 | v1.12.1 | ✅ selesai (historis) | Status checklist per area saat itu; sudah digantikan `../README.md` + seri spec `01`–`10` |
| `AUDIT-CHECKLIST.md` | 2025-07-16, rev. 2026-08-28 | v1.37.0 → v1.53.0 | ✅ 26/26 ditangani (H-2 di-waive) | Audit keamanan/teknis 4 ronde: PIN lockout recovery, konsistensi uang, PWA prompt, a11y label/dialog, penguatan Daftar Murid |
| `UI-UX-ANALYSIS.md` | 2026-09-01 | v1.66.x | ✅ sebagian besar diimplementasikan | Analisis UI/UX + rekomendasi chart/bar/graph; status per task ada di §15 (task visual di-skip) |
| `UI-UX-AUDIT-2026-09-04.md` | 2026-09-04 | v1.70.0 | ✅ Fase 1 selesai | Audit interaksi/navigasi/a11y/design system; quick win bottom nav, safe-area, modal shell dieksekusi |
| `UI-UX-REDUNDANSI-AUDIT-2026-09-05.md` | 2026-09-05 | v1.70.x | ✅ dieksekusi + diverifikasi ulang 2026-09-12 | Audit redundansi & penataan informasi; R1–R17 terbukti ada di kode |
| `WA-MESSAGE-ADJUSTMENT-2026-09-05.md` | 2026-09-05 | v1.70.x | ✅ selesai | Humanisasi pesan WhatsApp ke orang tua; Reminder AI dihapus |
| `UI-UX-AUDIT-VISUAL-2026-09-11.md` | 2026-09-11 | v1.71.0 → v1.71.4 | ✅ semua temuan ditutup | Audit visual 87 screenshot: 14 temuan V-01…V-14 (dark mode setengah-gelap, kontras tombol simpan, ikon emoji) — semua ditutup di Fase 2–3 |
| `PANDUAN-PENUNTASAN-CATAT-SESI.md` | 2026-08-29 | v1.64.x | ✅ selesai | Panduan kerja refactor Catat Sesi: 3 hook diekstrak (`useEngagement`, `useStudentBrief`, `useCaptureDraft`) + polish P1 (warna indikator, chip durasi, tipografi) |
| `AUDIT-UIUX-KEUANGAN-2026-09-12.md` | 2026-09-12 | v1.72.0 | ✅ 10/10 item diimplementasikan | Modul Keuangan: tab dinamai ulang + kalimat cakupan, daftar tagihan 63 invoice dari ±27 layar → ±3 layar, istilah diseragamkan |
| `AUDIT-UIUX-CATAT-SESI-2026-09-12.md` | 2026-09-12 | v1.73.0 | ✅ 17/17 temuan diimplementasikan | Alur Catat Sesi: 2 🔴 (banner menutupi CTA; mode jadwal bisa menyimpan ke murid yang salah), loop autosave yang membuat layar berkedip 2×/detik, kontras skor, laporan sesi yang tidak bisa ditutup, dsb. + 2 bug tambahan yang ditemukan saat verifikasi |
| `PROMPT-AI-IKLAN.md` | 2026-07-03 | — | historis (pemasaran) | Prompt pembuatan materi iklan Instagram; asetnya ada di luar repo (`../Les-Ko-Lui-Instagram-Campaign/`) |

---

## 2. Detail yang perlu diingat dari tiap dokumen

**`PANDUAN-PENUNTASAN-CATAT-SESI.md`** — Menetapkan pola yang masih dipakai hari ini: state besar dipecah ke hook per tanggung jawab, dan nama variabel lama di-alias agar JSX tidak perlu diubah. Sebagian item P1 di dalamnya (mis. "Nanti Saja" dijadikan tombol sekunder) kemudian **berubah arah** di v1.73.0: tombol itu justru dihapus agar langkah Bukti hanya punya satu tombol simpan.

**`DOC-AUDIT.md` + `CHECKLIST.md`** — Keduanya memotret sinkronisasi dokumentasi pada v1.12.1 (`homeworks` masih tabel, `monthClosings` masih ada, backup 11 tabel). Semua fakta itu **sudah tidak berlaku**: schema kini v15, `monthClosings`/`homeworks` dihapus, backup 10 tabel. Jangan pakai sebagai acuan schema.

**`AUDIT-CHECKLIST.md`** — Satu-satunya catatan waiver keamanan yang disetujui sadar: **H-2** (API key AI bisa dicuri pemilik perangkat) di-waive sesuai threat model pengguna tunggal; rujukannya masih dipakai di `../ARSITEKTUR-REPLIKASI-OFFLINE.md` dan `../ZERO-TOUCH-BACKUP.md`.

**`UI-UX-AUDIT-2026-09-04.md`, `UI-UX-REDUNDANSI-AUDIT-2026-09-05.md`, `UI-UX-ANALYSIS.md`** — Tiga sudut audit yang sengaja tidak saling mengulang: interaksi/a11y/design-system, redundansi/arsitektur informasi, dan data-viz/chart. Pola ini dilanjutkan oleh `../UI-UX-VISUAL-AUDIT-PLAYBOOK.md` (berbasis screenshot).

**`UI-UX-AUDIT-VISUAL-2026-09-11.md`** — Menetapkan **format tabel temuan** (ID · layar · masalah · bukti visual · prinsip · severitas · fix ref) yang dipakai ulang oleh dua audit 2026-09-12. Severitas di sana memakai legend 🔴/🟠/🟡/🟢.

**`AUDIT-UIUX-KEUANGAN-2026-09-12.md`** — Metodenya (jalankan app dengan data realistis, ukur DOM, tulis angka sebelum→sesudah) menjadi standar yang dipakai audit Catat Sesi.

**`AUDIT-UIUX-CATAT-SESI-2026-09-12.md`** — Dokumen terbaru di arsip. Selain 17 temuan, §9.5 mencatat dua bug yang **baru ketemu saat memverifikasi perbaikan** (`discard()` tidak mereset revisi draf; revisi draf tidak tersinkron setelah close-out) — keduanya kini dijaga guard test. §9.3 mencatat dua penyimpangan yang disengaja dari rekomendasi audit beserta alasannya.

**`PROMPT-AI-IKLAN.md`** — Bukan dokumentasi produk; disimpan agar prompt pemasaran tidak hilang setelah aset kampanye dipindahkan.

---

## 3. Catatan pengarsipan 2026-09-12

Ringkas, supaya jejaknya jelas:

| Asal | Tujuan | Cara |
|---|---|---|
| `les-ko-lui/AUDIT-CHECKLIST.md`, `PANDUAN-PENUNTASAN-CATAT-SESI.md`, `PROMPT-AI-IKLAN.md`, `docs/UI-UX-*.md`, `docs/WA-MESSAGE-ADJUSTMENT-*.md` (8 berkas) | `docs/arsip/` | `git mv` — riwayat git setiap berkas tetap utuh |
| `Private Tutor/CHECKLIST.md`, `DOC-AUDIT.md`, `AUDIT-UIUX-CATAT-SESI-2026-09-12.md`, `AUDIT-UIUX-KEUANGAN-2026-09-12.md` (4 berkas) | `docs/arsip/` | dipindahkan (bukan disalin) dari folder induk yang **tidak** dikelola git, sehingga historisnya kini ikut terversi |
| `Private Tutor/package-lock.json` | dihapus | berkas nyasar berisi `packages: {}` tanpa `package.json` di folder itu (lockfile sebenarnya ada di `les-ko-lui/`) |

Isi ke-12 dokumen **tidak** diringkas-hapus: ringkasan di halaman ini adalah tambahan, bukan pengganti.
