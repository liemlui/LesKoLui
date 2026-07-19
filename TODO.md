# Technical Debt Tracking — Les Ko Lui

Dibuat 2025-07-19 sebagai bagian dari refactoring round.

## 🟡 Screen Component Splits (In Progress)

Setiap screen component besar perlu dipecah menjadi sub-components dan custom hooks.

### StudentDetail.tsx (~98KB, 35+ useState)
- [ ] Extract `useStudentData(studentId)` — fetch student + sessions + rapor + iaee
- [ ] Extract `useBilling(studentId)` — billing logic, month closing per student
- [ ] Extract `useAiInsights(studentId)` — AI summary generation
- [ ] Split component: `StudentHeader`, `StudentSessionsTab`, `StudentRaporTab`, `StudentBillingTab`, `StudentIaeeTab`
- [ ] Extract PIN verification into shared hook `usePinVerification`

### CaptureSession.tsx (~96KB, 45+ useState)
- [ ] Extract wizard steps: `StepStudent`, `StepSubject`, `StepNotes`, `StepPhoto`, `StepHomework`, `StepReview`
- [ ] Extract `useSessionForm()` — form state + validation
- [ ] Extract `useCamera()` — camera/capture logic (reusable)
- [ ] Extract `useHomeworkAssignment()` — homework creation during session

### Payments.tsx (~58KB)
- [ ] Split tabs: `RingkasanTab`, `TagihanTab`, `PengeluaranTab`, `AuditTab`
- [ ] Extract `useMonthClosing()` — month close/reopen logic
- [ ] Extract `useCashSummary()` — financial summary computation
- [ ] Extract billing list into `BillingCard` component

### Settings.tsx (~49KB)
- [ ] Split sections: `BackupSection`, `PinSection`, `DriveSection`, `RelaySection`, `TemplateSection`, `StorageSection`
- [ ] Extract `useStorageQuota()` — storage monitoring hook
- [ ] Extract `useBackup()` — backup/restore logic hook

### MonthlyReport.tsx (~49KB)
- [ ] Extract `useReportGeneration()` — AI narrative + report creation
- [ ] Extract `useReportExport()` — JPG/PNG/PDF export logic
- [ ] Split layout selector into `LayoutPicker` component

## 🟢 Lower Priority

### localStorage Usage Clarification
- [ ] Document which localStorage keys are "app meta" vs "domain data"
- [ ] Consider migrating relay config to IndexedDB settings table
- Current keys: `leskolui_last_auto_backup_prompt`, `leskolui_drive_auto`, `leskolui_drive_pass`, `leskolui_relay_secret`, changelog version, PIN lockout state

### Test Coverage for Screens
- [ ] Add unit tests for StudentDetail hooks
- [ ] Add unit tests for CaptureSession wizard steps
- [ ] Add unit tests for Payments billing logic
- [ ] Add integration tests for key user flows

## ✅ Completed

- [x] Split repos.ts → `src/db/repos/` (9 domain files)
- [x] Split layouts.tsx → `src/template/layouts/` (helpers + 4 group files)
- [x] Fix empty catch blocks → `console.warn` added
- [x] Create `.env.example`
- [x] StudentDetail.tsx — 4 sub-components extracted: EvidenceCard, UpcomingSchedule, EngagementSummary, SessionDetailModal
- [x] CaptureSession.tsx — usePhotoCapture hook extracted (photo + signature lifecycle)
- [x] All 5 big screens — JSDoc @component headers added
- [x] TODO.md created with prioritized debt tracking

## 🟡 Screen Component Splits (Partial — remaining tracked below)

### StudentDetail.tsx ✅ 4/5 sections extracted
- [x] Extract `EvidenceCard` — Bukti Keaktifan
- [x] Extract `UpcomingSchedule` — Jadwal Mendatang
- [x] Extract `EngagementSummary` — Keseriusan Belajar
- [x] Extract `SessionDetailModal` — Session detail bottom sheet
- [ ] Extract `RiwayatSesi` — history + AI + chart section (~230 lines)
- [ ] Extract `NilaiRapor` — rapor grades section
- [ ] Extract `IaEeTracker` — IA/EE projects section

### CaptureSession.tsx 🟡 1 hook extracted
- [x] Extract `usePhotoCapture` — camera + signature blob lifecycle
- [ ] Extract `useStudentBrief` — load last session, HW, follow-ups on student change
- [ ] Extract `useEngagement` — 13 state vars + score derivation + reset
- [ ] Extract `useAiFill` — AI note/homework/WA generation + AiCostModal
- [ ] Extract `useCloseOut` — post-save homework/follow-up modal
