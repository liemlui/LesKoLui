# Les Ko Lui - Build Guide (START HERE)

**What this is:** a complete build guide for **Les Ko Lui**, a local-first PWA for a private IB tutor to record lessons quickly, manage student context, and generate monthly progress reports for parents.

**Working title:** Les Ko Lui (app name finalized).

> **Status dokumentasi:** diselaraskan dengan kode aktual **v1.73.0** (2026-09-13).
> Folder ini sengaja hanya memuat dokumen yang **masih berlaku** (seri spec `01`–`10` + panduan build ini).
> **Indeks dokumentasi aplikasi + riwayat kronologis:** [`../README.md`](../README.md)
> — di sana dokumen bernomor urut baca `00`–`05` (**operasional aplikasi**), berbeda dari seri `01`–`10` di
> folder ini (**arsitektur sistem**).
> Semua dokumen yang sudah selesai/historis kini dibekukan di [`../arsip/`](../arsip/README.md)
> (12 dokumen, termasuk `CHECKLIST.md`, `DOC-AUDIT.md`, audit UI/UX 2026-09, serta audit Catat Sesi & Keuangan 2026-09-12)
> — dipindahkan ke sana agar historisnya ikut terversi di repo aplikasi.
> Rencana ketahanan data ([`../04-RENCANA-KETAHANAN-DATA.md`](../04-RENCANA-KETAHANAN-DATA.md)):
> enam fase A–F sudah **diimplementasikan**; verifikasi E2E close-out gagal (Fase B) dan runtime/PWA restore
> (Fase D) sudah **dijalankan** 2026-09-13 (`e2e/capture-closeout-failure.spec.ts`, `npm.cmd run e2e:pwa`).
> Sisa: 3 kriteria yang butuh tes komponen + uji dua build PWA — rincian di §13 dokumen itu.

---

## Entry Point

Semua perintah dijalankan dari **root repo** (folder yang memuat `package.json`).

```powershell
cd les-ko-lui
npm.cmd install
npm.cmd run dev      # development server
npm.cmd test         # vitest (unit/integration)
npm.cmd run build    # tsc + vite build
npm.cmd run lint     # eslint
npm.cmd run e2e      # Playwright E2E alur (Vite dev)
npm.cmd run e2e:pwa  # Playwright E2E PWA produksi (build dulu)
```

---

## Read Order

1. `01-architecture-and-stack.md` - stack, exact dependencies, project structure, config.
2. `02-data-model.md` - Dexie schema, TypeScript types, repos, validation.
3. `03-capture-flow.md` - the daily record-a-session screen.
4. `04-template-engine.md` - 20 themes x 5 layouts, renderer, pagination.
5. `05-rotation-logic.md` - guaranteed no-repeat design per student.
6. `06-ai-generation.md` - DeepSeek direct API, prompts, client.
7. `07-export-and-share.md` - render to PNG/PDF and share.
8. `08-backup-and-pwa.md` - encrypted backup, persistent storage, offline PWA, fonts.
9. `09-build-phases.md` - runbook and current phase map.
10. `10-conventions-and-pitfalls.md` - coding rules and gotchas.

> Panduan operasional aplikasi (setup backup Drive, alur tagihan, prosedur audit visual, arsip dokumen lama)
> ada di folder `docs/` (satu level di atas) — mulai dari `../README.md`.

---

## Operating Contract

1. Work from the current code, not from an older phase assumption.
2. Keep data local-first and Dexie-backed.
3. Do not use `localStorage` or `sessionStorage` for domain data.
4. All dates go through `lib/format.ts`.
5. Self-host fonts with `@fontsource/*`.
6. AI API key is stored in IndexedDB Settings and sent directly to DeepSeek from the browser.
7. Ask the human only when blocked by a missing decision that is not covered here.

## Product Scope

**In:** student management; fast session capture with photo, multi-subject, short note, structured fields, and engagement; session brief; close-out sheet; follow-ups; calendar views; repeat scheduling; conflict detection; template engine; no-repeat rotation; AI-polished narratives + AI draft notes + AI polish WhatsApp + AI analyze student + AI draft study notes + AI financial insights; export to PDF/image; share to WhatsApp; engagement tracking; rapor grades; IA/EE milestone tracker; internal payment tracking + expenses tracking + financial forecasting; financial PIN; encrypted backup; offline PWA; Google Drive backup (opsional).

**Out (do not build):** teacher/student/parent accounts and online portals; real-time multi-device sync; Google Calendar integration; notification system. These are deferred; design hooks may exist but are not implemented.

## Definition of Done (Current State)

- [x] Manage students (per-student rate, managed subject list, billing policy: monthly/session_count/manual).
- [x] Capture a session offline (photo + multi-subject + engagement indicators + behavior tags + response tags + signature), with note autocomplete.
- [x] Session close-out: follow-ups + WhatsApp message to parent.
- [x] Session brief: shows last session, pending homework, and pending follow-ups before capture.
- [x] Calendar views (month/week/day) with scheduling, repeat series, and conflict detection.
- [x] Template engine renders a report from data in any of 20 themes x 5 layouts.
- [x] Rotation guarantees no-repeat design + no back-to-back same theme.
- [x] AI turns short notes into polished narratives + summary + teacher note + quote + next-month plan (editable, direct DeepSeek API). Also: draft notes, polish WhatsApp, analyze patterns, draft study notes, financial insights.
- [x] Export report to PDF/image and share to WhatsApp.
- [x] Engagement tracking: 12+ indicators, computed score 1-10, per-subject + trend charts.
- [x] Rapor grades with semester correlation to engagement scores + IA/EE milestone tracker.
- [x] Internal payment tracking + expenses tracking + financial forecasting + billing policies (monthly/session_count/manual).
- [x] Financial PIN lock (SHA-256 hashed) + lockout protection.
- [x] Encrypted backup (10 tables) + installable offline PWA + persistent storage + Google Drive backup (opsional). Install PWA butuh HTTPS + Service Worker + manifest (ikon 192/512); batas browser ada di [`08-backup-and-pwa.md`](08-backup-and-pwa.md) — target build `baseline-widely-available` = Chrome/Edge 111+, jadi Android 5 (Chrome maksimum 95) tidak didukung.
- [x] Study notes per student with auto-save.
- [x] Audit trail lokal (riwayat aktivitas penting).

## Current Security/Resilience Rules

- **Backup tables (10):** `students`, `sessions`, `reports`, `payments`, `settings`, `raporGrades`, `followUps`, `expenses`, `iaeeProjects`, `studyNotes`. `auditLog` bersifat lokal per perangkat dan tidak ikut backup.
- AI calls DeepSeek directly from the browser. The API key is stored in IndexedDB Settings.
- Financial PIN is stored as a SHA-256 hash, never plaintext.
- Settings saves must merge with the existing singleton row before `put()`. Implementasi `saveSettings` sudah melakukan read-modify-write dalam satu fungsi.
- Session cost must be recalculated when duration changes.
- Foto/tanda tangan dikonversi ke base64 saat backup, dikembalikan ke Blob saat restore.
- Format backup sekarang versi 2; format 1 masih didukung saat restore.
- `monthClosings` sudah dihapus dari skema (v14). Restore mengabaikan tabel legacy tersebut.
- Tidak ada tabel `homeworks` — data PR/gangguan dikelola melalui `followUps` dan catatan sesi.
