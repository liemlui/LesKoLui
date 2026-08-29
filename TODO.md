# Technical Debt Tracking — Les Ko Lui

Dibuat 2025-07-19 sebagai bagian dari refactoring round.

## 🟡 Screen Component Splits (In Progress)

Setiap screen component besar perlu dipecah menjadi sub-components dan custom hooks.

### StudentDetail.tsx (~82KB, ~1.490 baris, 47 useState)
- [ ] Extract `useStudentData(studentId)` — fetch student + sessions + rapor + iaee
- [ ] Extract `useBilling(studentId)` — billing logic, month closing per student
- [ ] Extract `useAiInsights(studentId)` — AI summary generation
- [ ] Split component: `StudentHeader`, `StudentSessionsTab`, `StudentRaporTab`, `StudentBillingTab`, `StudentIaeeTab`
- [ ] Extract PIN verification into shared hook `usePinVerification`

### CaptureSession.tsx (~99KB, ~1.743 baris, 34 useState)
- [ ] Extract wizard steps: `StepStudent`, `StepSubject`, `StepNotes`, `StepPhoto`, `StepHomework`, `StepReview`
- [ ] Extract `useSessionForm()` — form state + validation
- [ ] Extract `useCamera()` — camera/capture logic (reusable)
- [ ] Extract `useHomeworkAssignment()` — homework creation during session

### Payments.tsx (~76KB, ~1.374 baris)
- [ ] Split tabs: `RingkasanTab`, `TagihanTab`, `PengeluaranTab`, `AuditTab`
- [ ] Extract `useMonthClosing()` — month close/reopen logic
- [ ] Extract `useCashSummary()` — financial summary computation
- [ ] Extract billing list into `BillingCard` component

### Settings.tsx (~50KB, ~1.016 baris)
- [ ] Split sections: `BackupSection`, `PinSection`, `DriveSection`, `RelaySection`, `TemplateSection`, `StorageSection`
- [ ] Extract `useStorageQuota()` — storage monitoring hook
- [ ] Extract `useBackup()` — backup/restore logic hook

### MonthlyReport.tsx (refactor v1.57.0: 2466 → ~1900 baris, +5 file di `screens/monthlyReport/`)
- [x] Extract `helpers.ts` — konstanta + fungsi murni (cleanText, buildSessionNarrative, normaliseAiPlan, dll.)
- [x] Extract `NextMonthPlanEditor.tsx` — editor rencana bulan depan (max 3 prioritas)
- [x] Extract `CustomThemeBuilder.tsx` — builder tema kustom + konstanta style
- [x] Extract `useReportExport.ts` — logika export JPG/PNG/PDF + tandai sudah dibagikan
- [x] Extract `useReportGeneration.ts` — seluruh logika AI (handlePolish, handleGenerateNarratives, fallback lokal) + state aiLoading/aiRequestRef/prevTexts
- [ ] Split `LayoutPicker` component — **sengaja ditunda**: toolbar desain butuh ~20 props (designOpen, undoStack, coverPage, showCompare, compareThemeId, showCustomBuilder, handleRegenerate, handleCreateOrSwitch, dll.) yang juga dipakai di luar toolbar (reportOptions, handleRegenerate), sehingga ekstraksinya hanya memindahkan JSX tanpa mengurangi coupling. Dipertimbangkan ulang bila state desain diangkat ke hook `useDesignPicker`.

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
- [x] Dead code cleanup (2026-08-02): `exportAbsensi.ts`, `Popover.tsx`, `Gauge.tsx`, folder `captureSession/`, 10 export mati di barrel repos
- [x] `tsconfig.app.json` → `"strict": true` (2026-08-02, 0 error)
- [x] Audit v1.37.0 fixes (2026-08-02) — detail di `AUDIT-CHECKLIST.md` Ronde 3: PIN lockout recovery, konsistensi uang deleteSession/closeMonth, PWA autoUpdate (fix stale chunk), a11y label+dialog

## 🟡 Screen Component Splits (Partial — remaining tracked below)

### StudentDetail.tsx ✅ 4/5 sections extracted
- [x] Extract `EvidenceCard` — Bukti Keaktifan
- [x] Extract `UpcomingSchedule` — Jadwal Mendatang
- [x] Extract `EngagementSummary` — Keseriusan Belajar
- [x] Extract `SessionDetailModal` — Session detail bottom sheet
- [ ] Extract `RiwayatSesi` — history + AI + chart section (~230 lines)
- [ ] Extract `NilaiRapor` — rapor grades section
- [ ] Extract `IaEeTracker` — IA/EE projects section

### CaptureSession.tsx 🟢 3 hooks extracted
- [x] Extract `usePhotoCapture` — camera + signature blob lifecycle
- [x] Extract `useStudentBrief` — load last session, HW, follow-ups on student change
- [x] Extract `useEngagement` — 13 state vars + score derivation + reset
- [ ] Extract `useAiFill` — AI note/homework/WA generation + AiCostModal
- [ ] Extract `useCloseOut` — post-save homework/follow-up modal
