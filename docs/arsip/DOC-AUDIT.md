# DOC-AUDIT - Audit Dokumen vs Kode Aktual

> **Dokumen historis — audit 2026-06-26 untuk v1.12.1.** Sejak audit ini, schema Dexie naik ke v14, `monthClosings` dihapus, `homeworks` tidak lagi menjadi tabel terpisah, backup turun ke 10 tabel. Untuk status terkini lihat `01-architecture-and-stack.md` dan `02-data-model.md` yang sudah diperbarui per 2026-09-05.

> Tanggal update: 2026-06-26  
> Versi: v1.12.1  
> Target: root documentation in `Private Tutor/` vs code in `les-ko-lui/src/`

## Ringkasan Audit

Audit lengkap telah dilakukan pada 2026-06-26 dengan hasil:
- **Total file dokumentasi:** 10 spec docs + 3 meta docs = 13 file
- **Semua dokumentasi telah diperbarui** agar sinkron dengan kode aktual v1.12.1
- **Gap yang diperbaiki:** 9 kategori (lihat detail di bawah)

## Perbaikan yang Dilakukan (2026-06-26)

| # | Dokumen | Perbaikan |
|---|---------|-----------|
| 1 | `01-architecture-and-stack.md` | Ditambahkan: route `/tugas`, screen `Payments.tsx`, `Tugas.tsx`, komponen baru (14→17 komponen), hooks, 22 utility lib, test files, DesignProvider, fitur startup (notifikasi, auto backup) |
| 2 | `02-data-model.md` | Update: semua tipe aktual (CurriculumType, EngagementLog 8 fields, behaviorTags, signature, timeIn/Out, bankAccounts); 11 tabel bukan 8; schema v8 bukan v6; migration history; repo functions untuk expenses, iaeeProjects, monthClosings |
| 3 | `08-backup-and-pwa.md` | Update: TABLES array berisi 11 tabel (tambah expenses, iaeeProjects, monthClosings) |
| 4 | `09-build-phases.md` | Ditambahkan: Phase 17 (Expenses & IA/EE), Phase 18 (Month Closing), Phase 19 (AI Enhancement) |
| 5 | `10-conventions-and-pitfalls.md` | Diperbaiki: kontradiksi AI key (dari Worker-only → direct DeepSeek API); Quick Self-Check disesuaikan |
| 6 | `README.md` | Diperbarui: 11 tables di security rules, fitur tambahan di Definition of Done, AI direct API |

## Status Akhir per Area

| Area | Status | Catatan |
|------|--------|---------|
| Backup 11 tabel | DONE | `students`, `sessions`, `reports`, `payments`, `settings`, `raporGrades`, `homeworks`, `followUps`, `expenses`, `iaeeProjects`, `monthClosings` |
| AI direct API | DONE | Client panggil `api.deepseek.com` langsung dengan API key dari IndexedDB. CSP defense-in-depth. |
| Data model | DONE | Schema v8, 11 tables, semua field aktual tercatat. |
| Architecture | DONE | Semua screen, component, lib, hooks, test tercatat. |
| Build phases | DONE | Phase 0-19 lengkap dengan deskripsi. |
| Security rules | DONE | PIN hash, backup encrypt, AI key, saveSettings merge. |

## Verifikasi

| Check | Status | Hasil |
|-------|--------|-------|
| Build | PASS | `npm.cmd run build` sukses. |
| Lint | PASS | `npm.cmd run lint` sukses tanpa error/warning. |
| Dokumentasi vs kode | VERIFIED | 10 spec docs sudah sinkron dengan kode aktual. |
| Backup/restore | COVERED | 11 tabel termasuk expenses/iaeeProjects/monthClosings. |

## Residual Notes

- `DOC-AUDIT.md` sendiri juga sudah diperbarui.
- `CHECKLIST.md` telah diperbarui dengan status audit terkini.