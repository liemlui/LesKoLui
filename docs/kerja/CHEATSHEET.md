# CHEATSHEET — catatan teknis per tugas

> **Sekilas.** Jenis: catatan teknis. Status: berlaku sebagai rujukan, bukan sebagai daftar pekerjaan.
> Untuk siapa: agen AI yang sedang mengerjakan sebuah tugas dan butuh jangkar kode, jebakan, atau perintah verifikasinya tanpa membaca dokumen tugas utuh.
> **Yang ada di sini:** jangkar teks di kode, jebakan yang sudah pernah terjadi, dan perintah verifikasi, satu bagian per tugas.
> **Yang tidak ada di sini:** daftar pekerjaan dan spesifikasi tugas Gelombang 3 — keduanya di [`PEKERJAAN.md`](PEKERJAAN.md). Kalau isi di sini bertentangan dengan `PEKERJAAN.md`, yang menang adalah `PEKERJAAN.md`.
> **Angka di dalam catatan ini adalah potret saat ditulis.** Ukur ulang dengan perintah yang disebutkan, jangan menyalin angkanya.

## TASK-01 — Refactor layar besar (refactor, bukan perbaikan)

- **Target:** `CaptureSession.tsx` **2.155 → 1.891 ✅ TUNTAS 2026-10-04** saat refactor (commit `925e4ff`; angka lama "2.591 → ≤1.900" sudah basi — berkasnya sempat tumbuh ke 2.155 dan angka 2.073 di dokumen lain juga basi), lalu **1.901** sesudah fitur G3-01 ditulis (1 baris di atas ambang; turun hanya lewat ekstraksi); `MonthlyReport.tsx` 2.351 → ≤1.500; `Settings.tsx` 1.308 → ≤700; `StudentDetail.tsx` 1.083 → ≤800; `payments/TagihanTab.tsx` 1.035 → ≤800 (§2; keempat yang belum tuntas ini **terukur 2026-10-04**, bukan angka lama). Ekstraksi: `AiTagTooltip` · `AiCostConfirmModal` · `useAiFill` · `CloseOutSheet` · `ResponseStep` · `SubjectPickerSheet` · `NilaiRapor` · `InvoiceRow` (§3). Amandemen §10: refactor terbatas, tiap berkas tepat sebelum wave-nya.
- **Aturan kunci:** memindah, bukan memperbaiki; satu langkah per putaran. Jangkar: `TOOLTIP OVERLAY` · `AI Cost confirm modal` · `// AI states` · `handleLocalGenerate` · `CLOSE-OUT LAPORAN SESI` · `{detailTab === "nilai" && (<>` · `const { aiNoteLoading` · `STEP_META`. Jangan sentuh `src/db/types.ts`, `src/lib/engagement.ts`, `src/lib/ibTopics.ts`, `src/components/Modal.tsx`.
- **Jebakan:** skrip pemotong baris menghapus baris pembuka (blok `) (<>` muncul dua kali — pernah di `StudentDetail.tsx`) → setelah memotong, baca ulang 10 baris sekitar sambungan; state draf (`draftForm`) ikut pindah → draf berhenti memulihkan isian; dependency `useMemo`/`useEffect` berubah (audit C-17); test timeout >20 dtk dianggap regresi → jalankan `npm test` sendirian.
- **Verifikasi:** `npm run build` (built + `dist/sw.js`) · `npm run lint` (0 error 0 warning) · `npm test` (561+ lulus). Pakai `node_modules/.bin/tsc -b` & `eslint src`; **jangan** `npx` (EPERM `_cacache`). Jangan jalankan tsc+eslint+test paralel.

## TASK-02 — Format dokumen tugas AI (spesifikasi penulisan)

- **Target:** tiap tugas = `docs/kerja/TASK-NN-<slug>.md`, maksimal ±400 baris (satu-satunya ukuran panjang di sumber); baseline v1.75.1 · 561 test lulus. Kerangka wajib: §0 cara pakai · §1 tujuan & definisi selesai · §2 kondisi awal (angka nyata) · §3 urutan langkah · §4 pola umum · §5 jebakan · §6 kalau macet · §7 progres · §8 catatan penyimpangan · §9 riwayat.
- **Aturan kunci:** jangkar teks, bukan nomor baris; tiap langkah wajib punya ukuran hasil; kontrak ditulis sebagai blok kode tersalin; sebut yang JANGAN dipindah. Jangkar: cari komentar teks (mis. `TOOLTIP OVERLAY`), bukan nomor baris · `grep -n "CLOSE-OUT LAPORAN SESI" src/screens/CaptureSession.tsx`. Anti-pola: "rapikan sekalian kalau perlu", hanya nomor baris, "pastikan test tetap lulus" tanpa perintahnya.
- **Jebakan:** dokumen audit gaya tugas (temuan tanpa langkah) — itu milik `docs/` / `docs/arsip/`; menyembunyikan ketidakpastian alih-alih "kalau X tidak terpenuhi, berhenti dan catat".
- **Verifikasi:** daftar periksa §6 (9 kotak): jangkar sudah dicek ada · ukuran hasil · kontrak salin · daftar state dilarang pindah · perintah verifikasi + kegagalan bukan regresi · tabel larangan konkret · §Kalau macet ≥4 gejala · urutan risiko terendah · §8 tabel kosong ada.

## TASK-03 — Blueprint UI/UX (induk: peta layar & arah)

- **Target:** §2 inventaris layar → nasib, tanpa baris "belum diputuskan"; 6 prinsip §3; 5 pola §4; `BottomNav.tsx` = tepat 3 `NavLink` + 1 tombol aksi (k1.1); `StudentDetail` → tab Ringkas/Sesi/Progres/Proyek (Q5). Urutan lintas tugas: 04 → 08 → 09 → 06 → 05 → 07.
- **Aturan kunci:** pola A blok keputusan (maks 3 kartu) · B baris aksi · C sub-layar `▸` · D sheet dari bawah (panel HP, bukan modal tengah) · E kosong yang lega. Jangkar: `const NAV_ITEMS: NavItem[]` · `TAB_SCOPE` · `end={to === "/"}`. Jangan: `useMoneyVisible()` dilewati saat menulis angka uang, `aiClient` langsung dari komponen, menambah pustaka UI/animasi, mengubah template engine `MonthlyReport`.
- **Jebakan:** `npm test` gagal setelah token diubah = tes kontras `engagementContrast.test.ts` membaca warna → perbarui pasangan warna di sumber, **jangan** matikan tes; `useLiveQuery` ikut terhapus bersama blok lama → layar kosong; istilah "Hari Ini" (pintu nav) vs "Jadwal" (blok kalender) tertukar.
- **Verifikasi:** `npx tsc -b` · `npx eslint src` · `npm test` (561+) · `npm run build`; E2E: selector `e2e/` diperbarui di langkah yang sama.

## TASK-04 — Fondasi visual (token, 7 primitif, ganti hardcode, light-only)

- **Target (DIPERBARUI 2026-10-03, G2-02 selesai):** sapu kelas warna **TUNTAS** — baseline sebenarnya **2976**, hasil **0** di 72 berkas. Target lama "≤190" **DICABUT** (penghitung 4-pola buta terhadap `slate`/`blue`/`indigo`/`text-white`); target berlaku sekarang: **"0 kelas warna langsung di luar berkas §2.1"** — sisa 42 kelas ada di `engagement.ts` (24) · `invoicePresentation.ts` (12) · `finance.ts` (6), semuanya terlindungi. Tipografi 4 langkah (24/18/15/13); elevasi 2 tingkat; 7 primitif di `src/components/ui/` (`Card` · `SectionHeader` · `ListRow` · `ActionBar` · `StatTile` · `Sheet` · `EmptyState`); konten terbaca ≥13px; `playwright.config.ts` baris 17: project `mobile-dark` dihapus.
- **Aturan kunci:** Token di `@theme static` (WAJIB `static`, kalau tidak `--bg-*` hilang dari build). Skala: tipografi 13/15/18/24 · spacing 4/8/12/16/20/24 · elevasi 2 · gerak 200/250ms. Pola warna: `bg-white`→`bg-[var(--surface-strong)]` · `text-gray-500`→`text-[var(--text-muted)]` · `bg-gray-50\|100\|200`→`bg-[var(--surface-soft)]` · `text-gray-400`→`text-[var(--text-muted)]` · `border-gray-*`→`border-[var(--border)]`. Light-only permanen (Q4): jangan tambah `@media (prefers-color-scheme: dark)`. Q25: `font: inherit` wajib di `@layer base`. Satu langkah = satu jenis perubahan; **jangan** migrasi 2 berkas per putaran.
- **Jebakan:** `Select-String -Path "src\**\*.tsx"` tidak rekursif (hanya 38 berkas → 470, bukan 904) — pakai perintah rekursif; salah ambil angka baseline. Tes kontras gagal → perbaiki di sumber, bukan mematikan tes; `engagement.ts` terlarang (A7). `text-xs` disapu rata ke label grafik → label bertumpuk. Nav diubah di sini → E2E patah; struktur nav **hanya** di TASK-05.
- **Jebakan `--text-soft`:** token ini **TIDAK ADA** di `src/index.css` meski TASK-04 §4 memetakan `text-gray-400` ke sana. G2-02: **JANGAN** buat `text-soft` baru (nilai gray-400 = 2,49:1, gagal ambang non-teks 3:1). Sapu `text-gray-400` → `--text-muted`.
- **Anchor G2-03 (diperbarui):** `src/index.css:173-176` (komentar dark mode — sudah light-only permanen) — **bukan** `:48-51`, anchor usang yang hanya hidup di `docs/arsip/GELOMBANG-2.md` (beku).
- **G2-03 substansi terpenuhi:** `prefers-color-scheme` di `src/` = 1 (di komentar). Sisa pekerjaan hanya kalimat komentar.
- **Verifikasi:** perintah gate di bagian bawah berkas ini + penghitung rigor `.design-audit/g2-02-sweep.mjs --dry <berkas>`
  (harus **0 diganti · 0 sisa**, artinya sapu idempoten). **JANGAN** memakai
  `Select-String -Pattern "bg-white|bg-gray-|text-gray-|border-gray-"`: pola itu hanya melihat 4 dari
  23 keluarga palet dan menghitung **baris**, bukan kelas — angka 889 yang dihasilkannya menyesatkan
  (baseline sebenarnya 2976).

## TASK-05 — Rombak keuangan (4 tab → 1 layar)

- **Target:** 4 tab → 1 layar dengan 3 blok tetap (Ringkasan AI · Perlu ditagih · Bulan ini) + 3 baris `▸`; 5 mekanisme tagih → 1 daftar `BarisTagihan`; `RekapTab` 8 kolom → 3 kolom; nav 5 pintu + FAB → 3 pintu + 1 aksi. Berkas baru: `src/lib/financeRows.ts` · `src/lib/financeOverview.ts` · `src/__tests__/financeRows.test.ts` (9 tes). Lokasi gerbang: `src/screens/uang/`.
- **Aturan kunci:** angka **tidak boleh berubah**; AI hanya memilih & mengurutkan, rupiah dihitung aturan. Jangkar kontrak: `buildTagihanRows` · `sortTagihanRows` · `BarisTagihanKeadaan` (`"siap-ditagih" | "terkirim" | "lewat" | "lunas"`) · `buildFinanceOverview` · `ringkasLokal` · `sorotan` · `RECOVERY_LIMITS_HINT` · `invoiceReportIds`. Urutan baris: `lewat` ↓`umurHari` → `siap-ditagih` → `terkirim` ↑`dueAt` → `lunas` dipotong.
- **Jebakan:** query baru ditulis padahal repo sudah punya (§2) → angka beda antar blok; laporan final dihitung dobel → saring dengan `invoiceReportIds` (`Payments.tsx:85`); murid nonaktif hilang (perilaku `Payments.tsx:53-55`); `umurHari` negatif padahal lewat → pakai `todayWIB()` dari `src/lib/format.ts`, bukan `new Date()`; CSV berubah tanpa sengaja.
- **Verifikasi:** `npm test -- financeRows` · `-- financeOverview` · `-- csv` · `npm run e2e` · penghitung: `(Get-ChildItem -Recurse src -Include *.tsx -File | Select-String -Pattern "FinancePipelineBoard").Count` → **harus TIDAK kosong** (kebalikan perintah lama).

## TASK-06 — Perkuat Catat Sesi (wizard 6 langkah dipertahankan)

- **Target:** jumlah langkah tetap **6** (`STEP_META`) — tidak digabung, tidak dikurangi; `CaptureSession.tsx` **1.931** (1.891 saat refactor tuntas 2026-10-04, lalu naik oleh tiga langkah fitur G3-01 — Langkah 4 wizard & modal pemilih mapel kini di `captureSession/ResponseStep.tsx` / `SubjectPickerSheet.tsx`; undo hapus topik & tindak lanjut di `captureSession/undoDeletion.ts`); `EditSessionModal` + `ResolveMissedSessionModal` → satu `src/screens/home/ManageSessionSheet.tsx`; target sentuh ≥44px untuk kontrol utama, tombol `Lanjut`/`Simpan` tinggi ≥52px lebar penuh.
- **Aturan kunci:** jangan ubah jumlah/urutan `STEP_META`. Jangkar: `const STEPS = STEP_META.map((s) => ({ ...s, Icon: iconForStep(s.icon) }));` · `Langkah {currentStep} dari {STEPS.length}` · `--task-bar-h` · `kontek: SesiKontek` · `/capture?scheduleId=<id>` · `useCaptureDraft.ts`. `Simpan Sesi` aktif di langkah 5 **dan** 6 (Q2); simpan dari langkah 5 **bukan** pengurangan langkah.
- **Jebakan:** menggabung langkah "supaya cepat" → data engagement kosong (dilarang); bentuk/kunci draf (`captureDrafts`) diubah → isian hilang; `Jadwalkan ulang` dihapus alih-alih pindah ke `⋯`; modal lama dibiarkan terimpor → dua perilaku untuk satu hal; `--task-bar-h` tidak di-set → bilah aksi bertumpuk nav.
- **Verifikasi:** `npm test -- captureDraft` (3 tes draf lama lulus tanpa diubah) · `npm run e2e` · `npx playwright test e2e/capture-happy-fast.spec.ts` · `(Get-ChildItem -Recurse src -Include *.tsx -File | Select-String -Pattern "EditSessionModal|ResolveMissedSessionModal").Count` (**harus 0**) · 12 kotak `docs/README.md` §4.3.

## TASK-07 — Kontrak AI berbiaya (satu jalur, harga selalu terlihat)

- **Target:** 7 titik pemanggil + 2 modal + 8 estimator → satu jalur `useAiAction()`; satu modal `src/components/AiCostModal.tsx` (hapus pemakaian `AiCostConfirmModal.tsx`); tiap panggilan sukses → `AuditEntry` `action: "ai.call"` + `costIdr` + `aiFeature`; `Settings.ai.monthlyBudgetIdr` default kosong = tanpa batas (Q1); estimator baru **tidak** dibuat (`aiClient.ts:343,348,353,357,361,499,576`).
- **Aturan kunci:** `run()` hanya dari tombol `Jalankan` — batal = nol panggilan API. Jangkar kontrak: `useAiAction` · `AiActionRequest` · `estimatedIDR` · `logAiCall` · `getAiUsage` · `DEEPSEEK_COST_NOTE` · `DEEPSEEK_PRICING_URL` · `modalProps`. Bulan memakai **WIB** (`todayWIB()`); `estimatedIDR < 1` tetap tampil `~Rp 1`.
- **Jebakan:** modal dibatalkan tapi API tetap terpanggil; estimasi dihitung dua kali → angka tombol ≠ angka modal; `logAiCall` sebelum panggilan → pemakaian naik padahal gagal; pemakaian dihitung UTC → panggilan tanggal 1 pagi WIB masuk bulan lalu; dua `<AiCostModal>` dalam satu layar → tombol tak bisa ditekan; skema Dexie dinaikkan untuk field opsional.
- **Verifikasi:** peta jalur AI §0 hanya menyebut satu jalur · `npm test -- aiUsage` · `-- useAiAction` (termasuk tes batas kosong → tidak memblokir) · `-- aiSettings` · `-- aiOptionalFallback` (3 skenario); selisih estimasi vs pemakaian wajar ≤±20%.

## TASK-08 — Satu pintu uang (tutup 6 kebocoran, PIN satu lapisan)

- **Target:** satu hook `src/hooks/useMoneyVisible.ts` (4 keadaan: `needsSetup`/`locked`/`visible` + `lock()`); `src/components/ui/MaskedMoney.tsx`; 6 kebocoran ditutup (Home · `OperationalSnapshot` · `Students` · `StudentDetail` · `SessionDetailModal` · `MonthlyReport`); peta kebocoran §0 → **keluaran kosong**; Home tanpa uang sama sekali; tes jaga `src/__tests__/moneyGate.test.ts`.
- **Aturan kunci:** masking **hanya** di lapisan tampilan komponen: `Rp ••••••` + 🔒, bukan baris hilang, bukan digit parsial. Jangkar: `const money = useMoneyVisible` · `<MaskedMoney amount={...} />` · `formatRupiah` (`src/lib/format.ts:66`) · `// money-safe: pesan keluar, bukan layar` · `verifyPin` + `pinLockout`. Status di memori modul (bukan `localStorage`) = berlaku selama aplikasi terbuka; pilih modul+`useSyncExternalStore` atau Context, tulis alasan di §8.
- **Jebakan:** masking ditempel di `formatRupiah` → pesan WhatsApp ke orang tua berisi `Rp ••••••`; tiap layar menyimpan status kunci sendiri → buka di Home, terkunci di Murid; PIN di-hash ulang (sentuh `crypto.ts`) → PIN lama tak berlaku; `needsSetup` lupa → pengguna tanpa PIN melihat `Rp ••••••` tanpa jalan keluar; `/payments` minta PIN dua kali karena `usePinGate` lokal tersisa.
- **Verifikasi:** peta kebocoran §0 `Get-ChildItem -Recurse src\screens -Include *.tsx -File | Select-String -Pattern "formatRupiah|totalCost|rateSnapshot"` + `Where-Object { $_.Line -notmatch "useMoneyVisible|money-safe|formatRupiahDisplay" }` → kosong · `npm test -- useMoneyVisible` · `-- MaskedMoney` · `-- moneyGate`.

## TASK-09 — Jadwal Hari: zoom + mode tangkapan layar

- **Target:** terisolasi di `src/screens/home/DayView.tsx`; 3 tingkat zoom rapat/normal/lega = 27/54/97 px per jam menggantikan `PX_PER_HR = 64`; `⇱` "Muat sehari penuh" mengatur rentang 06:00–24:00; mode tangkapan 1 hari & 1 minggu; tes `src/__tests__/dayDensity.test.ts` + `e2e/day-zoom.spec.ts`.
- **Aturan kunci:** satu nilai `pxPerHr` mengalir ke semua perhitungan (`totalH`, `heightPx`, `topPx`, `nowTop`); tinggi blok `Math.max(durasiJam * pxPerHr - 2, 22)`; label jam 11,5–12px; `DAY_START`/`DAY_END` selalu melebar untuk sesi luar rentang. Jangkar: `const PX_PER_HR = 64;` · `const LABEL_W   = 44;` · `DAY_DENSITY` · `useDayDensity` · `useCaptureMode` · `renderScheduleImage` · `document.fonts.ready` · `src/lib/download.ts`.
- **Jebakan:** satu referensi `PX_PER_HR` tertinggal → blok sesi bertumpuk; `nowTop` tidak ikut skala → garis "sekarang" salah posisi; sesi jam 05:00 terpotong saat `⇱`; teks kosong di gambar karena font belum siap; baris lampau diredupkan di warna teks → gagal WCAG (redupkan latar). Kerapatan di memori sesi, bukan `localStorage`.
- **Verifikasi:** `Select-String -Path "src\screens\home\DayView.tsx" -Pattern "PX_PER_HR"` (harus kosong) · `npm test -- dayDensity` · `npm run e2e` · `npx playwright test e2e/day-zoom.spec.ts` · tangkap manual 1 hari & 1 minggu (7 kolom utuh).

## TASK-10 — Tarif sesi & pengelolaan tagihan (selesai)

- **Target:** **selesai L0–L10**. Basis v1.76.0 · Dexie **v15** · hasil tes hanya sebagai potret saat itu (599/53 sebelum L10 → 609/54 sesudahnya) — jumlah hari ini: `npm run test:sandbox` · HEAD `2e40b02`. Amandemen §13 (K-01) masih terbuka: peringatan sebelum mengubah asal tagihan — dikerjakan di lapisan UI.
- **Aturan kunci:** snapshot **wajib** ditulis `db.auditLog.add(...)` **di dalam** transaksi, bukan `logAudit` best-effort; guard G0–G9 diperiksa **sebelum** penulisan apa pun. Jangkar: `const rateSnapshot = student.hourlyRate;` · `frozenReportTotals` · `restoreCancelledInvoice` · `RECOVERY_LIMITS_HINT` · `AUDIT_LABEL: Record<AuditAction, string>` · `session.reprice` · `updatePaymentDueAt` · `isValidYmd`. Jangan: `src/db/db.ts`, versi skema Dexie, operasi apa pun ke DB aplikasi pengguna, `logAudit` best-effort, berkas §2.1 worktree, mengakali tes.
- **Jebakan:** W8 (`studentRepo.ts:76-91`, pemicu `toPolicy === "session_count"`) menulis `rateSnapshot`/`cost`/`updatedAt` serentak dan **tidak berjejak audit** → rekonstruksi tarif lama hanya dari backup; laporan final `confirmed` ikut ditulis ulang (J1–J4) — kini dibekukan `frozenReportTotals()`; memulihkan sebagian record saat satu guard gagal (dilarang); G9 tidak membandingkan seluruh data pasangan → menimpa data hasil restore backup.
- **Verifikasi:** `npx tsc -b --force` · `npx eslint .` · `npm test` · `npm test -- sessionPricing` · `-- sessionCountBilling` · `-- invoiceRecovery` · `-- reportUnlock` · `npx playwright test e2e/report-unlock.spec.ts` · E2E kini **dua** project (project `mobile-dark` hilang, Q4) sehingga angka lama 39/39 di tiga project tidak sebanding.

## G3-05 — Laporan bulanan (refactor terbatas + alur modern) — TUNTAS 2026-10-08

- **Target:** `MonthlyReport.tsx` **2.361 → 1.470 ✅** (target ≤1.500; diukur `npm run measure loc`). Blok yang dipindah ke `src/screens/monthlyReport/`: `ReportActionBar` · `ReportScopeControls` · `ReportStatusPanel` · `ReportPreviewPanel` + `ScaledPreview` · `DesignToolbar` · `ReportNarrativePanel` + `useNarrativeAutosave` · `ReportTextsPanel` + `EditableText` · `ReportPlanPanel` · `ReportHistoryPanel` · `ReportAiResultPanel` · `ReportMessageBanner` · `useReportData` · `reportAvailability` · `aiFieldMarks`.
- **Aturan kunci:** satu jalur AI (`useAiAction`) tetap satu-satunya jalan memanggil AI; total laporan final tetap dibekukan `frozenReportTotals()`; `src/template/**`, `src/lib/csv.ts`, dan blok CSV di Rekap **tidak disentuh**; field baru hanya opsional sehingga **skema Dexie tetap v15**. Jangkar kontrak: `reportAvailabilityOf` · `buildReportReadiness` · `reportStepIndex` · `scopeChipLabel` · `isAiWritten` · `narrativeIsAiWritten` · `markAiFields` · `planContent` · `AI_OFFLINE_HINT` · `AI_NO_SESSION_HINT` · `EXPORT_STAGE_LABEL` · `report.aiFieldHashes` · `session.aiNarrativeTextHash` · `report.entriesPerPage` · `report.sharedAt` · `report.lastExportedAt`.
- **Jebakan:** `sessionAiFingerprint` **tidak** memuat teks narasi (supaya menyunting narasi tidak memicu AI menulis ulang) — jadi jangan pakai `aiNarrativeHash` untuk penanda tampilan, pakai `aiNarrativeTextHash`; tombol laporan kini **selalu dirender** di bilah tetap dan hanya nonaktif, sehingga spec Playwright yang mencarinya harus memakai `toBeEnabled`; pratinjau ber-pembesaran memakai `transform` pada leluhur halaman — geometri ekspor tetap benar karena `html-to-image` mengukur `clientWidth`/`offsetWidth` node halaman (diverifikasi lewat ekspor JPG/PNG/PDF di spec laporan); ekspor **tidak lagi** menandai laporan "sudah dibagikan".
- **Verifikasi:** `npm run measure loc` (baris `MonthlyReport.tsx`) · `npm run test:sandbox` (982 lulus / 74 berkas) · `npm run e2e:uiux` (64 lulus / 0 gagal) · `npx playwright test e2e/report-export.spec.ts e2e/report-ratio-fixed.spec.ts` (lulus penuh) · `npm run check:docs`.

## G3-06 — Murid (refactor terbatas, peta tab, proyek, seluruh temuan M) — TUNTAS 2026-10-10

- **Target:** `StudentDetail.tsx` **1.097 → 678 ✅** (target ≤800; diukur `npm run measure loc`). Pemotongannya lewat **ekstraksi modal** (`studentDetail/SessionNoteEditModal.tsx` · `ScheduleEditModal.tsx`), **bukan** pemecahan per tab seperti usulan `docs/mockups/RENCANA-G3-06.md` §3 — target sudah tercapai tanpa itu, jadi jangan mengutip §3 sebagai keadaan. Modul pendukung: `lib/studentActions.ts` · `lib/studentConclusion.ts` · `lib/projectTypes.ts` · `lib/studentList.ts` · `studentDetail/PerluTindakanCard.tsx` · `UangBlok.tsx` · `PerbandinganNilai.tsx` + `perbandinganNilaiRows.ts` · `NilaiRaporIsian.tsx` + `NilaiRaporForm.tsx` + `raporForm.ts` · `IaEeTracker.tsx` · `EngagementSummary.tsx` · `RiwayatSesi.tsx`.
- **Aturan kunci:** peta tab **Ringkas · Sesi · Progres · Proyek** (keputusan "Tetap" `ATURAN-AI` §4.1) dan **uang hanya di tab Ringkas** (B1). Jangkar kontrak: `studentActions` · `attentionCount` · `relativeDayLabel` · `buildConclusionLog` · `kartuIdentitasBaris` · `aktifSejakLabel` · `STUDENT_SORT_OPTIONS` · `sortStudents` · `filterStudents` · `listAttentionCount` · `barisPerbandingan` · `gradeDelta` (dipakai apa adanya dari `template/layouts`, **jangan** menulis rumus kedua) · `upsertRaporGrade` · `updateIaEeProject` · `PROJECT_TYPES`. Nilai tipe proyek baru aman tanpa migrasi karena `backupValidation.ts` memperlakukan tipe tak dikenal sebagai **peringatan** → skema Dexie tetap v15.
- **Jebakan (dua di antaranya benar-benar terjadi pada putaran penutup 2026-10-10):**
  - **Hook diletakkan SETELAH gerbang `return`** (`if (!student) return <Skeleton/>`) → render pertama menjalankan hook lebih sedikit daripada render kedua → React melempar *"Rendered more hooks than during the previous render"* dan **seluruh layar Detail Murid jatuh ke batas galat**. `tsc` dan suite tes **tidak** menangkapnya; yang menangkap `npx eslint src` (`react-hooks/rules-of-hooks`) dan `e2e:uiux` (gejalanya muncul sebagai "layar tanpa h1").
  - **Emoji di dalam kontrol** (`⚠️` `🔔` `ℹ️` sebagai penanda tingkat kepentingan pada tombol kartu Perlu Tindakan) ditolak guard emoji `e2e:uiux`. Penanda struktural wajib ikon SVG (`WarningIcon` · `BellIcon` · `InfoIcon`); emoji hanya untuk kosakata afektif ber-`data-emoji-vocab="affect"`.
  - **Nama berkas `.ts` yang berbeda hanya besar-kecil huruf dari sebuah `.tsx` menutupi komponennya** di Windows: TypeScript mencoba `.ts` sebelum `.tsx`, jadi `perbandinganNilai.ts` membuat impor `./PerbandinganNilai` dari `NilaiRapor.tsx` gagal dengan **TS1192** ("has no default export"). Beri akhiran yang jelas berbeda (`perbandinganNilaiRows.ts`).
  - **Berkas komponen tidak boleh mengekspor fungsi biasa** (`react-refresh/only-export-components` menyala dan mematikan fast refresh satu berkas) → pindahkan aturan murni ke modul sendiri, pola `raporForm.ts`.
  - Butir #10 (#muat 20 lagi) **dipertahankan sebagai pola halaman** atas keputusan K5 pemilik — jangan "membetulkan" ke tombol muat-lagi tanpa keputusan baru.
- **Verifikasi:** `npm run measure loc` · **`npx eslint src`** (wajib di tugas ini — hanya ini yang menangkap `rules-of-hooks`) · `npm run test:sandbox` · `npm run e2e:uiux` · `npm run check:docs`. Untuk memisahkan regresi dari warisan: `git stash push -u`, jalankan spec yang sama, lalu `git stash pop`.

## G3-07 — Foto murid (unggah, tampil, hapus) — TUNTAS 2026-10-11

- **Target:** kolom `photo` pada murid akhirnya dipakai; tidak ada refactor berangka di tugas ini. Berkas baru: `hooks/useBlobUrl.ts` · `lib/studentPhoto.ts` · `components/StudentAvatar.tsx` · `components/StudentPhotoField.tsx`. Berkas disentuh: `components/StudentForm.tsx` (576 → 589) · `screens/Students.tsx` (520 → 519) · `screens/StudentDetail.tsx` (692 → 698) · `screens/Settings.tsx` · `__tests__/nativeDialogs.test.ts`.
- **Jangkar kontrak:** `useBlobUrl(blob)` (satu-satunya tempat `URL.createObjectURL`/`revokeObjectURL` untuk foto murid) · `studentInitial(name)` · `StudentAvatar({ name, seed, photo, size })` · `StudentPhotoField({ photo, onChange, name, id })` · `compressPhoto()` + `PHOTO_MAX_PX` (640) · `RAW_MAX_MB` (50). Skema Dexie tetap **v15** — kolom `photo` sudah ada sejak lama dan tidak diindeks, jadi tidak ada migrasi.
- **Jebakan:**
  - **Pemotongan bulat HANYA lewat CSS** (`object-cover` + `overflow-hidden`). Jangan memotong blob-nya: foto yang tersimpan ikut berkas backup, dan memotongnya berarti kehilangan bagian gambar secara permanen tanpa cara membatalkan.
  - **Tombol Hapus foto tidak langsung menyentuh penyimpanan.** Pratinjau dikosongkan dan `photo: undefined` baru dikirim saat **Simpan**, sehingga Batal tetap berarti "tidak ada yang berubah". Karena itu `StudentForm.tsx` memuat baris `photo,` (bukan `photo: initial?.photo`) — mengembalikannya akan membuat tombol hapus tidak pernah berpengaruh.
  - **`undefined` di `db.students.update()` MENGHAPUS kolomnya**, bukan mengabaikannya. Itulah mekanisme hapus fotonya; jangan "mengamankan" dengan `?? existing.photo`.
  - **Jumlah `createObjectURL` tidak bisa dipasangkan dengan `revokeObjectURL` secara per-baris.** `foto.ts` membuat satu URL dan melepasnya di **dua** jalur (`onload` dan `onerror`), dan `useBlobUrl` memasangnya di dalam `try` sambil melepasnya lewat cleanup `useEffect` di baris lain. Penjaga berbasis hitungan baris akan **salah menuduh kode yang benar** (terjadi 2026-10-11 di tujuh berkas). Yang benar: uji runtime pada hook, dan serahkan pelepasan pada render nyata ke `e2e:uiux`.
  - **Input berkas `sr-only` wajib `tabIndex={-1}`**, kalau tidak kontrol tak terlihat itu ikut urutan fokus papan ketik.
  - **Sasaran baris `StudentDetail.tsx` yang berlaku adalah ≤700** (keputusan pemilik 2026-10-11); berkasnya terukur **698**. Penambahan berikutnya harus lewat komponen terpisah. `PEKERJAAN.md` bagian G3-06 masih menulis ≤800 — itu catatan keadaan saat G3-06 ditutup, bukan sasaran yang berlaku.
  - **`useWebWorker: true` membuat pengecilan ±10× lebih lambat dengan hasil identik** (terukur 3.270 ms vs 325 ms pada gambar 12 MP). Belum diputuskan; berlaku juga untuk foto sesi dan logo.
- **Cara mengukur dampak penyimpanan** (jangan salin angkanya, jalankan alatnya): `python -m http.server 5199 --directory .` lalu `node .design-audit/g3-07/measure.mjs`. Alat itu menyalakan Chromium, membuka `.design-audit/g3-07/ukur.html` yang memakai pustaka dan parameter yang sama dengan `compressPhoto()`, dan menulis hasilnya ke `.design-audit/g3-07/hasil-ukur.json`. **Hasil 2026-10-11:** 22,3 MB → 102,9 KB dan 0,45 MB → 20,1 KB, keduanya **480×640 px** (bukan 640 di sisi panjang — `maxSizeMB` menekan mutu lebih dulu, sehingga jumlah piksel ikut turun).
- **Verifikasi:** `npx tsc -b` · `npx eslint src` · `npm run test:sandbox` (1226 lulus / 90 berkas) · `npm run build` (`dist/sw.js`) · `npm run e2e:uiux` (64 lulus / 0 gagal) · `npm run check:docs`. Penjaga baru: `__tests__/studentPhoto.test.tsx` (28 tes).

## G3-08 — Kanvas dan istilah (tema, susunan, glosarium, grafik) — TUNTAS 2026-10-11

- **Target:** tidak ada refactor berangka. Berkas murni baru: `screens/monthlyReport/susunanLaporan.ts` · `components/charts/grafikAngka.ts` · `kartuIdentitasLengkap()` di `lib/studentList.ts`. Komponen baru/berubah: `monthlyReport/ThemeGallery.tsx` (baru, galeri tema empat kolom) · `monthlyReport/DesignToolbar.tsx` · `monthlyReport/CustomThemeBuilder.tsx` · `components/charts/BarChart.tsx` · `LineChart.tsx` · `DonutChart.tsx` · `components/icons.tsx` (+`CheckIcon`) · `screens/MonthlyReport.tsx` · `screens/Students.tsx` · layar `payments/*` · `monthlyReport/ReportStatusPanel.tsx` · `uang/UangBeranda.tsx` · `Settings.tsx`. Penjaga baru: `__tests__/reportDesignPanel.test.ts` (16 tes).
- **Jangkar kontrak:** `kelompokkanSusunan(layouts)` · `jumlahSusunanTerkelompok` · `ringkasSusunan` · `ThemeGallery({ themes, activeId, onSelect })` · `formatRupiahRingkas` · `jarakKiriGrafik(label, { ukuranPiksel, jarakMinimum })` · prop baru `formatTooltip` + `ariaLabel` pada `BarChart`/`LineChart`/`DonutChart` · `kartuIdentitasLengkap(student)` · `PilihanBentuk { id, nama, singkat, warna }` di perancang tema.
- **Cara mengukur jumlah pilihan (jangan salin angkanya):** jumlahnya dijaga dari sumbernya — `THEMES.length` dan `LAYOUTS.length` di `src/__tests__/reportDesignPanel.test.ts` menetapkan lantai **34 tema** dan **26 susunan**. Menjalankan `npm run test:sandbox -- reportDesignPanel` karena itu sekaligus menjawab "apakah pilihannya berkurang".
- **Jebakan:**
  - **Chip susunan kini `role="radio"` di dalam `radiogroup`, bukan `role="button"`.** Spec Playwright yang mencari `getByRole("button", { name: <nama susunan> })` akan menunggu selamanya. Chip-nya ada di `#panel-susunan-laporan`. Dua spec sudah disesuaikan: `e2e/layout-review.spec.ts` dan `e2e/report-export-ratio.spec.ts`.
  - **`<details>` desain sekarang berisi chip Tema DAN chip Susunan**, jadi jangan memfilter `details` dengan teks "🎨" (sudah tidak ada) — filternya `hasText: "Tema:"`. Ringkasan `<summary>` menampilkan `Tema: … · Susunan: …`.
  - **Kesalahan urutan deklarasi pada waktu jalan tidak ditangkap `tsc`.** Menaruh perhitungan yang memakai `yRange` **sebelum** `const yRange` di `LineChart` membuat seluruh layar Keuangan jatuh ke batas galat (`Cannot access 'yRange' before initialization`) sementara `tsc`, suite tes, **dan** `e2e:uiux` semuanya lulus. Perubahan tampilan wajib **dilihat**.
  - **`e2e:uiux` TIDAK mengukur sub-layar `?tab=ringkasan`** tempat tiga grafik hidup (hanya `/payments` polos dan `?tab=tagihan`). Karena itu cacat di atas lolos. Menambahkannya = penjaga baru, butuh keputusan pemilik; dicatat di `PEKERJAAN.md` bagian 4.
  - **Sesudah PIN Keuangan dibuka, jangan `page.goto()` lagi** di alat pemeriksa visual: buka-kunci berlaku selama aplikasi terbuka (B2) dan memuat ulang mengembalikannya ke gerbang PIN. Berpindah sub-layar lewat pintasan **"Analitik lanjutan"**.
  - **Nama variabel/kolom berbasis "piutang" JANGAN diubah** (`cash.piutang`, `r.piutang`, `agedPiutang`, `piutangDetail`); glosarium G3-08 hanya menyentuh **teks yang dibaca tutor**. **Isi CSV juga tidak disentuh** — formatnya dibekukan `csv.test.ts` (header `Piutang,…` di `RekapTab` sengaja dibiarkan).
- **Glosarium antarmuka yang berlaku:** tagihan (objek) · invoice (dokumen) · **belum dibayar** (bukan "piutang") · **umur tagihan** · **kata sandi enkripsi** (bukan "passphrase") · **fokus rata-rata** (bukan "rata-rata engagement").
- **Alat pemeriksa visual:** `.design-audit/g3-08/` (tidak dilacak git) — `audit.config.ts` + `visual-check.spec.ts` + `shots/`, dijalankan dari `les-ko-lui/` dengan `npx playwright test --config=../.design-audit/g3-08/audit.config.ts`. Ia menangkap panel tema, panel susunan, perancang tema, dan tiga blok grafik pada lebar 390 px.
- **Verifikasi:** `npx tsc -b` · `npx eslint` atas berkas yang disentuh · `npm run test:sandbox` (1.242 lulus / 91 berkas) · `npm run build` · `npm run e2e:uiux` (63 lulus / 1 gagal — gagal karena batas waktu PIN di bawah beban, lulus 4/4 sendirian) · `npm run e2e` (67 lulus / 13 gagal / 6 skip; 12 warisan + 1 flake yang lulus sendirian).

## Verifikasi per gate (dua tingkat — menggantikan "Smart Gating 4 tier")

> **Diganti 2026-10-07.** Bagian ini dulu memuat tabel **empat tier** (T0–T3). Sistem itu sudah dicabut;
> yang berlaku sekarang **dua tingkat**, dan gate dijalankan **sekali di akhir tugas**, bukan per langkah.
> Kontraknya di [`ATURAN-AI.md`](ATURAN-AI.md) **§1**. Tabel lama sengaja tidak disalin ke sini — dua
> tabel gate yang berbeda adalah cara tercepat membuat sesi berikutnya menjalankan gate yang salah.

| Jenis perubahan | Yang dijalankan |
|---|---|
| Dokumen saja | `npm run check:docs` |
| Kode biasa (satu sampai tiga berkas, tidak menyentuh uang) | `npx tsc -b` |
| Kode yang menyentuh uang, data tersimpan, atau lebih dari tiga layar | `npx tsc -b` · suite tes · `npm run build` |
| Tampilan | Test Playwright, sekali per tugas besar |

`eslint` tidak lagi wajib per putaran — jalankan sekali sebelum menutup tugas besar.

## Smoke suite (6 tes)

engagementContrast · captureSessionHelpers · repos · backup · finance · settingsRepo

> Smoke suite bukan lagi tingkat gate tersendiri. Ia dipakai sebagai pemeriksaan cepat saat ragu, bukan sebagai pengganti suite penuh di tugas yang menyentuh uang atau data tersimpan.

## Larangan global (ATURAN-AI §3)

> Nomor bagian diperbaiki 2026-10-07. Larangan ini dulu ditulis sebagai **§2.1**; pada penomoran
> `ATURAN-AI.md` yang berlaku sekarang, daftar berkas terlarang ada di **§3**.

| Berkas | Alasan |
|---|---|
| `src/db/db.ts` | versi skema Dexie; migrasi salah = kehilangan data pengguna nyata |
| `src/lib/crypto.ts` | cara PIN disimpan; salah = pengguna terkunci dari datanya |
| `src/lib/format.ts` → isi `formatRupiah()` | juga menyusun **pesan WhatsApp ke orang tua**; masking di sini merusak tagihan |
| `src/lib/waBilling.ts`, `src/lib/invoicePresentation.ts` | pesan keluar harus memuat nominal **asli** |
| `src/lib/engagement.ts` | rumus skor; mengubahnya mengubah arti data historis |
| `src/lib/finance.ts`, `src/lib/financePipeline.ts` | rumus uang yang sudah benar |
| `src/lib/csv.ts` | format ekspor lama harus identik |
| `src/template/**` | mesin laporan (tema/rotation); tugas terpisah |
| `src/screens/captureSession/constants.ts` → `STEP_META` | jumlah langkah dikunci 6 (ada tesnya) |
| Prompt di `src/lib/aiClient.ts` | mutu hasil AI; tugas ini soal jalur, bukan isi |
