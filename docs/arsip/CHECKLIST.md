# Les Ko Lui - Status Checklist

> **Dokumen historis — audit 2026-06-26.** Status di bawah mencerminkan kode v1.12.1. Sejak saat itu, `homeworks` dan `monthClosings` sudah dihapus, schema naik ke v14, backup turun ke 10 tabel. Lihat `../04-RENCANA-KETAHANAN-DATA.md` untuk rencana ketahanan data terkini.

> Status umum: SEMUA DOKUMENTASI TELAH DISELARASKAN dengan kode aktual v1.12.1.  
> Terakhir diupdate: 2026-06-26.

## Bagian G — Sinkronisasi Dokumentasi vs Kode (Audit 2026-06-26)

| # | Item | Status | Catatan |
|---|------|--------|---------|
| G1 | `01-architecture-and-stack.md` — update struktur proyek | DONE | Ditambahkan route `/tugas`, `/payments`, komponen, hooks, 22 lib files, DesignProvider, fitur startup. |
| G2 | `02-data-model.md` — update tipe + schema v8 + 11 tabel | DONE | Semua tipe aktual, field baru, 3 tabel tambahan, migration history, repo functions baru. |
| G3 | `08-backup-and-pwa.md` — update 11 tabel | DONE | TABLES array sekarang 11 (tambah expenses, iaeeProjects, monthClosings). |
| G4 | `09-build-phases.md` — tambah phase 17-19 | DONE | Phase 17 (Expenses & IA/EE), Phase 18 (Month Closing), Phase 19 (AI Enhancement). |
| G5 | `10-conventions-and-pitfalls.md` — fix kontradiksi AI key | DONE | Poin #9 dan #13 diperbaiki: AI key direct dari browser, bukan Worker. |
| G6 | `README.md` — sync DoD + security rules | DONE | 11 tables, fitur tambahan, AI direct API. |
| G7 | `DOC-AUDIT.md` — update status audit | DONE | Mencatat semua perbaikan dokumentasi. |

## Bagian F — Perbaikan v1.8.0→v1.9.0

| # | Item | Status | Catatan |
|---|------|--------|---------|
| F1 | Refactor Payments PIN ke `usePinGate` | DONE | Payments sekarang pakai hook shared, konsisten dengan Students. |
| F2 | Unit test suite (vitest) | DONE | 72+ tests / 8 files: engagement, forecast, pagination, crypto, format, calendar, paginate, reportLayouts. |
| F3 | Shared Toast system | DONE | `useToast` hook + `ToastProvider` + `ToastContainer`. Home + Tugas sudah migrate. |
| F4 | EngagementBar accessibility | DONE | `role="meter"` + `aria-valuenow/min/max/label` + emoji `aria-hidden`. |
| F5 | `esc()` backtick hardening | DONE | Tambah backtick escape di `exportAbsensi.ts`. |

---

## Bagian A - Perbaikan Bug Kode

| # | Item | Status | Catatan |
|---|------|--------|---------|
| A1 | Backup mencakup 11 tabel (`expenses`, `iaeeProjects`, `monthClosings`) | DONE | `lib/backup.ts` export/import mencakup 11 tabel. |
| A2 | Hapus jalur API key langsung dari `aiClient.ts` | ARSITEKTUR BARU | Arsitektur berubah ke direct DeepSeek API call. API key disimpan di IndexedDB Settings dan dikirim langsung dari browser. CSP defense-in-depth. |
| A3 | Fix `saveSettings` read-modify-write | DONE | `saveSettings` membaca current row lalu merge patch sebelum `put()`. |
| A4 | Hash PIN keuangan dengan SHA-256 | DONE | `hashPin()` ditambahkan; Settings dan MonthlyReport memakai hash; PIN plaintext lama dimigrasikan otomatis. |
| A5 | Fix CORS Worker proxy, jangan default `*` | DONE | Default `Access-Control-Allow-Origin` menjadi `"null"`. |
| A6 | Hapus `CaptureChips.tsx` tidak terpakai | DONE | File dihapus dan tidak ada import tersisa. |
| A7 | Hitung ulang cost saat durasi berubah | DONE | `updateSession` dan edit series menghitung ulang cost dari `rateSnapshot`. |
| A8 | Tambah CSP meta tag | DONE | CSP ditambahkan di `index.html`. |
| A9 | Validasi model di Worker proxy | DONE | Worker hanya mengizinkan `deepseek-chat` dan `deepseek-reasoner`. |

## Bagian B - Update Dokumen (Semua Diperbarui 2026-06-26)

| # | Dokumen | Status | Catatan |
|---|---------|--------|---------|
| B1 | `08-backup-and-pwa.md` - backup 11 tabel | UPDATED | 11 tabel, bukan 8. |
| B2 | `02-data-model.md` - types, schema v8, repos | UPDATED | 11 tables, schema v8, migration history, semua field aktual. |
| B3 | `01-architecture-and-stack.md` - struktur proyek aktual | UPDATED | Semua screen, component, lib, hooks, test tercatat. |
| B4 | `03-capture-flow.md` - multi-subject, engagement, close-out | DONE | Masih relevan. |
| B5 | `06-ai-generation.md` - direct DeepSeek API | DONE | Sudah direct API. |
| B6 | `09-build-phases.md` - phase 13-19 | UPDATED | Phase 17-19 ditambahkan. |
| B7 | `10-conventions-and-pitfalls.md` - AI key + pitfalls | UPDATED | Fix kontradiksi AI Worker-only. |
| B8 | `README.md` - nama, scope, Definition of Done | UPDATED | 11 tables, fitur tambahan. |
| B9 | `CHECKLIST.md` - status aktual | UPDATED | Selaras dengan v1.12.1. |
| Extra | `DOC-AUDIT.md` - status audit | UPDATED | Mencatat semua perbaikan. |

## Bagian C - Verifikasi Akhir

| Check | Status | Hasil |
|-------|--------|-------|
| `npm.cmd run build` | PAS S | Build production sukses. |
| `npm.cmd run lint` | PASS | ESLint selesai tanpa error/warning. |
| Dokumentasi vs kode | VERIFIED | Semua 10 spec docs sinkron dengan kode aktual. |
| 11 tabel backup | VERIFIED | `expenses`, `iaeeProjects`, `monthClosings` termasuk di `TABLES`. |
| AI direct API | VERIFIED | `aiClient.ts` panggil `api.deepseek.com` langsung. |

## Bagian D - Fitur Diimplementasi

| # | Fitur | Status |
|---|-------|--------|
| D1 | Engagement tracking (4+ indikator + skor 1-10) | DONE |
| D2 | Homework Tracker (assign, done, overdue, cancelled) | DONE |
| D3 | Follow-Up Items / carry-forward antar sesi | DONE |
| D4 | Next Session Brief (ringkasan sebelum sesi) | DONE |
| D5 | Close-Out sheet (PR + carry-forward + WA update) | DONE |
| D6 | Today Workspace di Home | DONE |
| D7 | WA Murid (studentPhone) + grouped kontak | DONE |
| D8 | IB subject hierarchy picker (MYP/DP bottom sheet) | DONE |
| D9 | Merge Mood + Engagement ke Kondisi Belajar | DONE |
| D10 | School + Grade di profil murid | DONE |
| D11 | Lihat Laporan dari StudentDetail auto-select murid | DONE |
| D12 | 20 tema + tema picker swatches di MonthlyReport | DONE |
| D13 | Reorder StudentDetail: Info → Riwayat → Jadwal → Nilai → Keseriusan | DONE |
| D14 | Month filter di Jadwal Mendatang | DONE |
| D15 | PDF export fix (rAF delay + better error message) | DONE |
| D16 | ClockTimePicker (analog clock face) di semua modal jadwal | DONE |
| D17 | Toggle component (inline-style, reliable) ganti semua translate-x toggle | DONE |
| D18 | Murid Aktif pakai Toggle bukan checkbox | DONE |
| D19 | **Expenses tracking** (transport, buku, alat, platform, lainnya) | DONE |
| D20 | **IA/EE Milestone Tracker** (proyek + milestones per student) | DONE |
| D21 | **Month Closing (Tutup Bulan)** + snapshot financial | DONE |
| D22 | **AI Draft Short Note** (draft catatan sesi otomatis) | DONE |
| D23 | **AI Polish WhatsApp** (poles pesan WA untuk orang tua) | DONE |
| D24 | **AI Analyze Student** (analisis pola + saran fokus) | DONE |
| D25 | **AI Suggest Homework** (saran PR dari AI) | DONE |
| D26 | **AI Payment Reminder** (pengingat tagihan WA) | DONE |
| D27 | **Financial Forecasting** (proyeksi keuangan) | DONE |
| D28 | **Signature Pad** (tanda tangan siswa di sesi) | DONE |
| D29 | **Web Notifications** (PR deadline + H-1 sesi reminder) | DONE |
| D30 | **Auto Backup Prompt** (mingguan, tiap 7 hari) | DONE |
| D31 | **PIN Lockout** (keamanan setelah gagal PIN) | DONE |
| D32 | **Offline Banner** (indikator offline di UI) | DONE |
| D33 | **DesignProvider** (theme/design context) | DONE |

## Bagian E - Fitur Mendatang (Backlog)

| # | Fitur | Impact | Ease | Prioritas |
|---|-------|--------|------|-----------|
| E1 | Semester Report PDF (laporan akhir tahun khusus) | ★★★★ | ★★★ | Tinggi |
| E2 | Smart Reminder (notif WA otomatis H-1 sesi via API) | ★★★★★ | ★★ | Tinggi |
| E3 | Topic Mastery Tags (tag topik + status paham) | ★★★★ | ★★★ | Sedang |
| E4 | Reusable Session Templates | ★★★ | ★★★★ | Sedang |
| E5 | Assessment Rubric (HL/SL criteria per mapel) | ★★★★ | ★★ | Sedang |
| E6 | Resource Queue (link/materi per murid) | ★★★ | ★★★★ | Sedang |
| E7 | Laporan progres per subject (bukan per bulan) | ★★★★ | ★★★ | Sedang |
| E8 | Predictive grade dari engagement trend | ★★★★★ | ★★ | Sedang |
| E9 | Semester Report (otomatis dari IA/EE + rapor) | ★★★★ | ★★★ | Sedang |
| E10 | Calendar sync (Google Calendar export) | ★★★ | ★★ | Rendah |
| E11 | Parent Portal (link baca-saja untuk ortu) | ★★★★ | ★ | Rendah |
| E12 | Multi-tutor support | ★★★ | ★ | Rendah |
| E13 | Bulk Session Import (CSV/Excel) | ★★ | ★★ | Rendah |

## Catatan

- Audit 2026-06-26: Semua file dokumentasi telah diselaraskan dengan kode aktual v1.12.1.
- 11 tabel di Dexie (v8): students, sessions, reports, payments, settings, raporGrades, homeworks, followUps, expenses, iaeeProjects, monthClosings.
- AI: Client memanggil `api.deepseek.com` langsung dengan API key dari IndexedDB Settings.
- Command `npm run build` dan `npm run lint` via PowerShell perlu `npm.cmd` karena execution policy.