# 09 - Build Phases (Runbook)

This file reflects the current app state. The original MVP phases are complete; phases 13-19 document the added features now present in the app.

> **Fakta yang berlaku sekarang (dicek 2026-09-13, app v1.73.0):** skema Dexie **v15** dengan 12 tabel —
> 10 tabel domain ikut backup (`students`, `sessions`, `reports`, `payments`, `settings`, `raporGrades`,
> `followUps`, `expenses`, `iaeeProjects`, `studyNotes`) + `auditLog` dan `captureDrafts` yang **lokal per
> perangkat dan tidak ikut backup**. **Tidak ada tabel `homeworks`** (data PR/gangguan dikelola lewat
> `followUps` + catatan sesi) dan **tidak ada tabel `monthClosings`** (dihapus di v14). Repo sudah dipecah ke
> folder `src/db/repos/` (13 berkas), bukan satu berkas `src/db/repos.ts`.
> Beberapa "Files"/"Accept" di bawah ditulis saat fase itu dibangun; angka skema/tabel pada fase lama
> dibiarkan sebagai catatan historis dan dilengkapi keterangan statusnya.

---

### Phase 0 - Project Setup
- **Files:** `vite.config.ts` · `src/main.tsx` · `src/App.tsx`
- **Do:** scaffold Vite React-TS; install deps; configure Tailwind v4 via `@tailwindcss/vite`; import self-hosted fonts; build router shell + `BottomNav`.
- **Accept:** `npm run dev` runs; routes navigate; Tailwind classes apply; fonts render.

### Phase 1 - Data Layer
- **Files:** `src/db/types.ts` · `src/db/db.ts` · `src/db/repos.ts` (kini folder `src/db/repos/` — 13 berkas)
- **Do:** write all types/enums/constants; Dexie schema v6 with 8 tables (kini **v15** — lihat blok status di atas); repo functions.
- **Accept:** can create/read students, sessions, settings, reports, payments, rapor grades, and follow-ups. (Tidak ada tabel `homework`/`homeworks` — lihat Phase 14.)

### Phase 2 - Settings + Format Utils
- **Files:** `src/screens/Settings.tsx` · `src/lib/format.ts` · (extend `db/repos/`)
- **Do:** singleton Settings form; tutor profile; default rate; subject list; AI config; financial PIN; backup/restore; IDR and WIB helpers.
- **Accept:** settings persist; defaultRate is used elsewhere; Rupiah/date/WhatsApp numbers render correctly.

### Phase 3 - Student Management
- **Files:** `src/screens/Students.tsx` · `src/screens/StudentDetail.tsx` · `src/components/StudentForm.tsx`
- **Do:** list, add/edit, activate/deactivate; profile detail; session history; stats.
- **Accept:** add/edit/view a student; `hourlyRate` defaults from settings; list updates live.

### Phase 4 - Photo + Capture Session
- **Files:** `src/lib/foto.ts` · `src/screens/CaptureSession.tsx` · `src/lib/engagement.ts`
- **Do:** full capture flow: photo compression, short note + autocomplete, multi-subject chips, engagement indicators, duration + live cost, save as DONE, close-out sheet.
- **Accept:** session saved with photo Blob, subjects, note, engagement, and correct cost; autocomplete works; close-out can create follow-ups (PR dicatat sebagai `followUps` + catatan sesi, bukan tabel tersendiri); works offline.

### Phase 5a - Template Engine: Types + 3 Layouts
- **Files:** `src/template/types.ts` · `src/template/layouts.tsx` · `src/template/ReportRenderer.tsx`
- **Do:** define template types; implement `cards`, `timeline`, `flags`; render `data-report-page` nodes.
- **Accept:** dummy `ReportData` renders in all 3 layouts.

### Phase 5b - Template Engine: 20 Themes + 2 Layouts + Deco
- **Files:** `src/template/themes.ts` · `src/template/deco.tsx` · (extend `layouts.tsx`)
- **Do:** add 20 theme objects, decoration renderer, `magazine`, and `scrapbook`.
- **Accept:** 20 themes render and look distinct.

### Phase 5c - Pagination
- **Files:** `src/template/paginate.ts` · (extend `ReportRenderer.tsx`)
- **Do:** split entries by layout page limits; header on first; summary on last.
- **Accept:** 7 entries split into multiple `data-report-page` nodes correctly.

### Phase 6 - No-Repeat Rotation
- **Files:** `src/lib/rotation.ts` · `src/screens/MonthlyReport.tsx`
- **Do:** implement `pickTemplate`; create report with stored `templateKey`; add "Ganti Desain".
- **Accept:** repeated generation for one student yields different combinations and avoids back-to-back same theme.

### Phase 7 - Generate + AI
- **Files:** `src/lib/aiClient.ts` · `src/screens/MonthlyReport.tsx`
- **Do:** aggregate DONE sessions; call DeepSeek API directly; write narratives + summary; editable fields; raw-note fallback.
- **Accept:** short notes become polished narratives with API key; AI off/offline still allows reports using raw notes.

### Phase 8 - Export & Share
- **Files:** `src/lib/exportReport.ts` · `src/screens/MonthlyReport.tsx` · (`components/InvoiceCard.tsx` optional)
- **Do:** preview report; export PNG/PDF; share via Web Share.
- **Accept:** report exports to PNG and multi-page PDF; fonts/photos correct; share sheet opens where supported.

### Phase 9 - Backup & Resilience
- **Files:** `src/lib/crypto.ts` · `src/lib/backup.ts` · (extend `Settings.tsx`)
- **Do:** AES-GCM encrypt/decrypt; export/import all tables including photos; persistent-storage call; pre-restore auto-backup.
- **Accept:** export then import into a clean profile restores all data including photos, rapor grades, and follow-ups (10 tabel domain; `auditLog` + `captureDrafts` sengaja tidak ikut backup).

### Phase 10 - PWA Polish
- **Files:** `vite.config.ts` · icons/manifest · (extend `App.tsx`)
- **Do:** vite-plugin-pwa config; manifest/icons; precache fonts; install prompt.
- **Accept:** installs to home screen; fully offline after first load; themed reports keep fonts offline.

### Phase 11 - Payments (Internal)
- **Files:** `src/screens/Payments.tsx` · `src/components/InvoiceCard.tsx` · (extend `db/repos/`)
- **Do:** per (student, month) totals snapshot; mark PAID; prevent duplicates.
- **Accept:** totals match sessions; mark-paid persists; no duplicate (student, month).

### Phase 12 - Home Calendar + Today Workspace
- **Files:** `src/screens/home/Home.tsx`
- **Do:** month/week/day calendar, today's sessions, quick capture, PR/tindak lanjut yang terlewat dan yang akan datang, pending follow-ups.
- **Accept:** sessions show in calendar; today workspace surfaces useful actions.

### Phase 13 - Engagement Tracking (Added)
- **Files:** `src/lib/engagement.ts` · (extend `CaptureSession.tsx`) · (extend `StudentDetail.tsx`)
- **Do:** 4+ toggle indicators; computed score 1-10; per-subject breakdown; trend charts; rapor correlation.
- **Accept:** score computes correctly; trend chart renders; per-subject breakdown is accurate.

### Phase 14 - Follow-Ups & Homework Status (Added)
- **Files:** (extend `db/types.ts`, `db/db.ts`, `db/repos/`) · (extend `CaptureSession.tsx`)
- **Do:** follow-up items linked to sessions; status PR (belum selesai/selesai) diturunkan dari `followUps.completedAt` + catatan sesi — **tanpa tabel `homeworks`**; close-out sheet; WhatsApp message generator.
- **Accept:** create follow-ups from close-out; overdue detection works; WhatsApp message is formatted correctly.

### Phase 15 - Rapor Grades (Added)
- **Files:** (extend `db/types.ts`, `db/db.ts`, `db/repos/`) · (extend `StudentDetail.tsx`)
- **Do:** per-student, per-semester grade entries; correlation with engagement scores; semester helper.
- **Accept:** input rapor grades per semester; engagement correlation shown; semester labels correct.

### Phase 16 - Calendar & Scheduling (Added)
- **Files:** `src/screens/home/Home.tsx` · (extend `db/repos/`)
- **Do:** month/week/day calendar; repeat scheduling; conflict detection; series edit/cancel in this/future/all modes.
- **Accept:** calendar renders sessions; repeat creates correct dates; conflicts are flagged; series ops work.

### Phase 17 - Expenses & IA/EE Tracker (Added)
- **Files:** `src/db/types.ts` · `src/db/db.ts` · `src/db/repos/` · `src/screens/Payments.tsx`
- **Do:** add `expenses` table (v7) for operational cost tracking (transport, books, tools, platform, other); add `iaeeProjects` table for IA/EE milestone tracking; CRUD for both; Integrate expenses into Payments screen.
- **Accept:** expenses can be added/edited/deleted; IA/EE projects with milestones can be tracked per student.

### Phase 18 — [DIHAPUS] Month Closing / Tutup Bulan

Fitur Tutup Bulan dihapus di skema v14. Metrik keuangan dihitung live dari sessions/payments/expenses, tanpa snapshot bulanan. Lihat `src/db/db.ts` versi 14: `monthClosings: null`.

### Phase 19 - AI Enhancement & Polish (Added)

- **Files:** `src/lib/aiClient.ts`, `src/lib/aiIncremental.ts`, `src/lib/reportSessionScope.ts`
- **Do:** 7 AI functions: generateNarratives, generateReportSummary, draftShortNote, polishWhatsApp, analyzeStudent, draftStudyNote, generateFinancialInsights. Incremental AI fingerprinting untuk hemat token. Sanitasi input, timeout, estimasi biaya.
- **Accept:** semua AI functions bekerja dengan validasi runtime; input disanitasi sebelum dikirim; timeout tertangani; cost estimates ditampilkan sebelum panggilan AI.

---

## Optional, After Current Scope

- Parent Portal (read-only link for parents) — belum dibangun; di luar lingkup saat ini menurut `../../README.md`.
- Notification system — **belum ada** (tidak ada pemakaian `Notification`/`requestPermission` di `src/`), dan memang di luar lingkup saat ini.
- Google Drive auto-backup — **sudah ada** sejak v1.71.x lewat relay + Google Identity Services (bukan `drive.appdata`); panduan di `../02-PANDUAN-BACKUP-DRIVE-SENYAP.md`.

## Order Summary

0 setup -> 1 data -> 2 settings -> 3 students -> 4 capture -> 5 template -> 6 rotation -> 7 AI -> 8 export -> 9 backup -> 10 PWA -> 11 payments -> 12 home -> 13 engagement -> 14 follow-ups/PR -> 15 rapor -> 16 calendar/scheduling -> 17 expenses/IAEE -> 18 month closing (dihapus) -> 19 AI enhancement
