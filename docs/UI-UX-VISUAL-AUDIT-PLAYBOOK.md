# UI/UX Visual Audit Playbook — Les Ko Lui

> **Tanggal:** 2026-09-11 · **Target:** `les-ko-lui` v1.71.0 (HEAD `3f27a30`)
> **Tujuan:** panduan eksekusi mandiri — semua fase audit UI/UX visual + perbaikan,
> dieksekusi oleh AI/engineer tanpa konteks tambahan.
> **Kenapa:** audit UI/UX sebelumnya (`docs/UI-UX-ANALYSIS.md`,
> `docs/UI-UX-AUDIT-2026-09-04.md`, `docs/UI-UX-REDUNDANSI-AUDIT-2026-09-05.md`)
> statis + screenshot catalog basi (v1.51.x). Playbook ini: regenerasi katalog →
> audit visual berdasarkan gambar → perbaikan prioritas → guard rail.

---

## 0. Kontrak & Guardrail (MANDATORY)

1. **Tanpa dependency baru** — tidak pernah `npm.cmd install <pkg>`.
2. Semua perintah dijalankan dari direktori app:
   ```powershell
   cd "c:\Users\lieml\Desktop\Big Personal Web App\Private Tutor\les-ko-lui"
   ```
3. Verifikasi setelah **tiap fase** — urutan:
   ```powershell
   npm.cmd run lint      # → 0 error, 0 warning
   npm.cmd test -- --run # → semua lulus
   npm.cmd run build     # → sukses
   ```
4. **Tanpa migrasi skema Dexie** — tidak sentuh schemaVersion / struktur tabel storage.
5. **Tanpa hapus file** di luar daftar eksplisit (§3.4).
6. Ragu / tidak verifiable → tulis TODO di `TODO.md`, jangan menebak.
7. Nomor baris acuan = state 2026-09-11 (v1.71.0). Verifikasi lokasi sebelum edit.
8. Baca file terkait sebelum edit; verify hasil edit setelah.

## 1. Lingkungan & Perintah Kunci

| Tugas | Perintah / Catatan |
|---|---|
| Dev server (port 5174) | `npm.cmd run dev -- --port 5174 --strictPort` |
| Unit test | `npm.cmd test -- --run` |
| Lint | `npm.cmd run lint` |
| Build | `npm.cmd run build` |
| E2E satu spec | `npx playwright test --config=playwright.config.ts e2e/<spec>.spec.ts` |
| E2E solo-project | tambah `--project=mobile` |

- `playwright.config.ts`: `baseURL` = `http://localhost:5174`; webServer auto-start; `reuseExistingServer` = true.
- **Seed auto**: `src/main.tsx:26-31` — DEV DB kosong → auto-seed. `window.seedDummy(force)` & `window.clearDummy()` exposed. PIN Keuangan seed = **`123456`**.
- Playwright: setiap test punya context fresh (IndexedDB per-context) → auto-seed jalan di tiap test (wait ~5 s load pertama).

## 2. Konteks — Kenapa Katalog Basi (Bukti)

### 2.1 Fakta metoda

- Katalog (`e2e/screenshots/`) direview sebagai gambar: 18 file, badge versi `v1.51.1` / `v1.51.2` / `v1.38.0` (`06-tugas-pr.png`), mtime **2026-08-28**.
- Kode saat ini **v1.71.0** (git log HEAD `3f27a30`).
- `e2e/screenshot-katalog.spec.ts` memakai `devices["Desktop Chrome"]` — desktop viewport, bukan mobile.

### 2.2 Bukti: temuan lama selesai / state berbeda

| Temuan audit lama | Screenshot v1.51.x | Kode v1.71.0 (verifikasi) |
|---|---|---|
| K1 ikon Keuangan = jam | ⏰ jam | dompet SVG `BottomNav.tsx:45-52` |
| K2 safe-area iOS kosong | 0 result `env()` | `--safe-top/bottom` + `app-shell` `index.css:24-28,91` |
| K3 strip versi merusak nav | `v1.51.2` bawah nav | dihapus; `height: var(--bottom-nav-h)` `BottomNav.tsx:66` |
| R1 "Progress hari ini" 3× | 2 kartu + bar TodayHero | duplikat dihapus — `OperationalSnapshot.tsx` → "Minggu ini" + "Murid Aktif" |
| Nav 4 item | Home/Murid/Catatan/Keuangan | **5 item**: Home/Murid/Catat/Laporan/Keuangan `BottomNav.tsx:11-53` |

### 2.3 Instruksi eksekutor

- **JANGAN lapor ulang temuan di tabel 2.2**.
- Katalog existing **basi** → **tidak valid** untuk audit visual sebelum Fase 0.
- Temuan lintas-sistem yang **MASIH VALID** di v1.71.0 (dari audit statis):
  1. **Dark mode rusak** — `index.css:40-65` ubah token, tapi `.tsx` hanya **1** `dark:` variant; `bg-white` **180×** / `bg-gray-*` **131×** / `bg-slate-*` **32×** hardcode → UI setengah-gelap.
  2. **Emoji = ikon fungsional** — stepper `CaptureSession.tsx:59-64`, CTA StudentDetail, `Section icon` Settings, empty state.
  3. **Bahasa campur ID+EN** — "Command center" `OperationalSnapshot.tsx:32`, "Tren focus", "Pengaturan" vs `/settings`.
  4. **Kontras "Tersimpan ✓"** Settings — teks abu pucat di button abu.
  5. **Wayfinding ganda** StudentDetail — breadcrumb + "Kembali ke Daftar Murid".
  6. **Beban makna merah** — weekend kalender + sesi terlewat + pengeluaran + hapus + error.
## 3. FASE 0 — Regenerasi Katalog Screenshot

> Run: `npx playwright test --config=playwright.config.ts e2e/screenshot-audit.spec.ts`

### 3.1 Edit `playwright.config.ts` (tambah project mobile + dark)

Saat ini hanya project `chromium` (Desktop). Ubah blok `projects` menjadi:

```ts
projects: [
  { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  { name: "mobile", use: { ...devices["Pixel 7"], deviceScaleFactor: 2 } },
  { name: "mobile-dark", use: { ...devices["Pixel 7"], deviceScaleFactor: 2, colorScheme: "dark" } },
],
```

Verifikasi: `import { defineConfig, devices }` sudah ada di baris 1. `colorScheme` valid Playwright ≥ 1.5. Tidak ubah `webServer` / `baseURL`.

### 3.2 File baru `e2e/screenshot-audit.spec.ts`

Salin kode di bawah persis (helper + matriks dalam satu file). Projekt `chromium` + `mobile` + `mobile-dark` jalan SAMA file — setiap project melayangkan semua shot.

```ts
/**
 * Screenshot audit — layar/tab/modal × mode (light/dark, mobile/desktop).
 * Output: e2e/screenshots/audit/<project>/*.png
 */
import { test, type Page } from "@playwright/test";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUT_ROOT = path.resolve(__dirname, "screenshots", "audit");
let OUT: string;

test.beforeEach(async ({}, testInfo) => {
  OUT = path.join(OUT_ROOT, testInfo.project.name);
  fs.mkdirSync(OUT, { recursive: true });
});

type Opts = { fullPage?: boolean };

async function shot(page: Page, name: string, opts: Opts = { fullPage: true }) {
  try {
    await page.screenshot({ path: path.join(OUT, name), fullPage: opts.fullPage });
    console.log(`  ✓ ${test.info().project.name}/${name}`);
  } catch (e) {
    console.log(`  ✗ ${name}: ${(e as Error).message}`);
  }
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function closeChangelog(page: Page) {
  try {
    const btn = page.getByText(/Mengerti|Terima Kasih/);
    if (await btn.isVisible({ timeout: 800 })) { await btn.click(); await page.waitForTimeout(400); }
  } catch { /* no modal */ }
  const dw = page.getByRole("button", { name: "Tutup peringatan" });
  if (await dw.isVisible({ timeout: 1000 }).catch(() => false)) { await dw.click(); }
  const later = page.getByRole("button", { name: "Nanti", exact: true });
  if (await later.isVisible({ timeout: 1000 }).catch(() => false)) { await later.click(); }
}

async function openPin(page: Page) {
  const pin = page.getByPlaceholder("PIN (6 digit)");
  if (await pin.isVisible({ timeout: 1500 }).catch(() => false)) {
    await pin.fill("123456");
    await page.getByRole("button", { name: "Buka", exact: true }).click();
    await page.getByRole("heading", { name: "Keuangan", exact: true }).waitFor({ timeout: 5000 });
  }
}

async function clickTab(page: Page, label: string) {
  const t = page.getByRole("tab", { name: label });
  if (await t.isVisible({ timeout: 1000 }).catch(() => false)) {
    await t.click(); await page.waitForTimeout(600);
  }
}
// ── Home · dashboard / kalender ──────────────────────────────────────────
test("01-home", async ({ page }) => {
  await page.goto("/"); await page.waitForTimeout(2500);
  await closeChangelog(page);
  await shot(page, "01-home-dashboard.png");

  const monthBtn = page.locator(".grid-cols-3 button").filter({ hasText: "Bulan" }).first();
  if (await monthBtn.isVisible()) { await monthBtn.click(); await page.waitForTimeout(600); }
  await shot(page, "01b-home-calendar-month.png");

  const dayCell = page.locator('[class*="min-h-"]').filter({ hasText: /^\d{1,2}$/ }).first();
  if (await dayCell.isVisible()) { await dayCell.click(); await page.waitForTimeout(600); }
  await shot(page, "01c-home-day-detail.png");
});

// ── Students · daftar murid ──────────────────────────────────────────────
test("02-students", async ({ page }) => {
  await page.goto("/students"); await page.waitForTimeout(2500);
  await closeChangelog(page);
  await shot(page, "02-students-list.png");
});

// ── StudentDetail · 4 tab ────────────────────────────────────────────────
test("03-student-detail", async ({ page }) => {
  await page.goto("/students"); await page.waitForTimeout(2500);
  await closeChangelog(page);
  const card = page.locator('a[href*="/students/"][class*="block"]').first();
  if (await card.isVisible()) { await card.click(); await page.waitForTimeout(2000); }
  for (const t of ["Ringkasan", "Sesi & Jadwal", "Progres", "IA/EE/PP"]) {
    await clickTab(page, t);
    await shot(page, `03-student-${t.toLowerCase().replaceAll(" & ", "-").replaceAll("/", "-")}.png`);
  }
});

// ── CaptureSession · wizard 6 langkah ─────────────────────────────────────
test("04-capture-wizard", async ({ page }) => {
  await page.goto("/capture"); await page.waitForTimeout(2500);
  await closeChangelog(page);
  for (let step = 1; step <= 6; step++) {
    await shot(page, `04-capture-step${step}.png`);
    const next = page.getByRole("button", { name: /Lanjut/ }).first();
    if (await next.isVisible({ timeout: 800 }).catch(() => false)) {
      await next.click(); await page.waitForTimeout(500);
    }
  }
});

// ── MonthlyReport · laporan bulanan (bulan Juni seed) ────────────────────
test("05-report", async ({ page }) => {
  await page.goto("/report"); await page.waitForTimeout(2500);
  await closeChangelog(page);
  await page.locator('input[type="month"]').fill("2026-06");
  const select = page.locator("select").first();
  const values = await select.locator("option").evaluateAll((o) =>
    (o as HTMLOptionElement[]).map((x) => x.value).filter(Boolean));
  for (const v of values) {
    await select.selectOption(v);
    try { await page.getByRole("button", { name: /Buat Laporan|Update Laporan/ }).waitFor({ timeout: 2000 }); break; }
    catch { /* try next */ }
  }
  try {
    await page.getByRole("button", { name: /Buat Laporan|Update Laporan/ }).click();
    await page.locator("[data-report-page]").first().waitFor({ timeout: 10_000 });
  } catch { /* keep whatever */ }
  await page.waitForTimeout(800);
  await shot(page, "05-report-main.png");
});

// ── Payments · 4 tab (PIN gate) ──────────────────────────────────────────
test("06-payments", async ({ page }) => {
  await page.goto("/payments?tab=ringkasan"); await page.waitForTimeout(2500);
  await closeChangelog(page); await openPin(page);
  for (const t of ["Bulan Ini", "Penagihan", "Pengeluaran", "Rekap Tahunan"]) {
    await clickTab(page, t);
    await shot(page, `06-payments-${t.toLowerCase().replaceAll(" ", "-")}.png`);
  }
});

// ── Settings · 8 section accordion ───────────────────────────────────────
test("07-settings", async ({ page }) => {
  await page.goto("/settings"); await page.waitForTimeout(2500);
  await closeChangelog(page);
  await shot(page, "07-settings-top.png");
  const titles = ["Profil Tutor", "PIN Keuangan", "Rekening Bank", "AI — DeepSeek",
    "Backup & Restore", "Riwayat Aktivitas", "Aplikasi (PWA)", "Hapus Semua Data"];
  for (const title of titles) {
    const btn = page.getByRole("button", { name: new RegExp(esc(title)) });
    if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await btn.click(); await page.waitForTimeout(450);
    }
    await shot(page, `07-settings-${title.replaceAll(" ", "-").replaceAll("—", "").toLowerCase()}.png`);
  }
});

// ── Modal changelog (update) ─────────────────────────────────────────────
test("08-modal-update", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.removeItem("leskolui-last-seen-version"));
  await page.reload(); await page.waitForTimeout(2500);
  await shot(page, "08-modal-update.png", { fullPage: false });
});
```

> Kode spec selesai — save as `e2e/screenshot-audit.spec.ts`. Lanjut ke §3.3.

### 3.3 Run regenerasi

```powershell
npx playwright test --config=playwright.config.ts e2e/screenshot-audit.spec.ts
```

- Bila trunk browser belum: `npx playwright install chromium`.
- Durasi ~5-10 min (seed auto + 3 project). Debug solo: `--project=mobile` / `--project=chromium`.
- Shot "always snap" — screen tidak menggagalkan test; fokus pada file yang MUNCUL.

### 3.4 Hapus artefak basi (daftar eksplisit)

File basi v1.51.x / duplikat / orphan — hapus:

```powershell
Remove-Item e2e\screenshots\06-tugas-pr.png
Remove-Item e2e\screenshots\finance-strengthened.png
Remove-Item e2e\screenshots\01-home-dashboard.png
Remove-Item e2e\screenshots\02-home-calendar-detail.png
Remove-Item e2e\screenshots\03-daftar-murid.png
Remove-Item e2e\screenshots\04-detail-murid.png
Remove-Item e2e\screenshots\05-catat-sesi.png
Remove-Item e2e\screenshots\06-catatan.png
Remove-Item e2e\screenshots\07-laporan-bulanan.png
Remove-Item e2e\screenshots\08-keuangan.png
Remove-Item e2e\screenshots\09-settings-1.png
Remove-Item e2e\screenshots\10-settings-2.png
Remove-Item e2e\screenshots\11-settings-3.png
Remove-Item e2e\screenshots\12-update-modal.png
Remove-Item e2e\screenshots\13-narasi-per-sesi.png
Remove-Item e2e\screenshots\14-calendar-month.png
Remove-Item test-results\audit-*.png
```

> Keep `e2e/screenshots/layouts/*` — pratinjau layout engine (berhubung template, tanpa badge versi). Katalog promosi (`e2e/screenshot-katalog.spec.ts`) tetap diperuntakan — **jangan hapus**.

### 3.5 Verifikasi Fase 0

- `e2e/screenshots/audit/` berisi subfolder `chromium/`, `mobile/`, `mobile-dark/` + PNG.
- Count: `Get-ChildItem e2e\screenshots\audit -Recurse -Filter *.png | Measure-Object` → seharusnya ≥ 60.
- Buka 2-3 file sebagai gambar (mis. `audit/mobile/01-home-dashboard.png`, `audit/mobile-dark/07-settings-top.png`):
  - Home: 5 item nav, ikon dompet, tanpa strip versi.
  - Dark: bila card masih putih → bukti isu P1-a (jangan fix di Fase 0; catat di dokumen audit).
- Registrasi hasil → `docs/UI-UX-AUDIT-VISUAL-2026-09-11.md` (template §4.2).
## 4. FASE 1 — Audit Visual (pakai kemampuan gambar)

### 4.1 Cara membaca

- Baca gambar batched (≤6 file per panggilan), path absolut.
- Sampel representatif: tiap layar × tiap mode × minimal 1 observasi; total ~60-90 file (jangan 300 semua).
- Checklist per gambar: hierarchy · spacing · kontras (teks ≥4.5:1, besar ≥3:1 — WCAG 1.4.3/1.4.11) · alignment · state (aktif/disabled/empty/error) · tap-target ≥44px · safe-area iOS · tint teks.
- Temuan → tabel template; klasifikasi severitas; dedup daftar §2.3.

### 4.2 Template dokumen hasil: `docs/UI-UX-AUDIT-VISUAL-2026-09-11.md`

```md
# UI/UX Visual Audit (screenshot) — Les Ko Lui v1.71.0
> Tanggal: 2026-09-11 · Metode: review screenshot regenerasi (Fase 0) · Legend: 🔴 Kritis · 🟠 Tinggi · 🟡 Sedang · 🟢 Rendah

| ID | Layar / Gambar | Masalah | Bukti visual | Prinsip | Severitas | Fix ref |
|---|---|---|---|---|---|---|
| V-01 | … | … | … | Nielsen / WCAG | 🔴 | P1-a/P2… |

## Kekuatan (praises)
- …

## Keterbatasan
- …
```

### 4.3 Konvert temuan → Fase 2 item

Klasifikasi: P1 (kritis usabiltas/kontras/dark) · P2 (wayfinding/konsistens/ikon) · P3 (kosmetik/glossary). Dedup dengan §2.3 (jangan dobel).

## 5. FASE 2 — Perbaikan Terprioritas

> Aturan: eksekusi one-by-one; después SETIAP item → lint+test+build. Fail → `git checkout -- <file>` revert → tulis TODO → lanjut.

### 5.1 P1-a — Dark mode rusak

**Langkah 1 — deaktivasi dark mode** (untuk restituire UI normal ke warna daylight). Edit `src/index.css`, hapus DUA blok `@media (prefers-color-scheme: dark)` (baris ~40-65 `:root` + baris ~75-80 `body`). Keep `color-scheme: light` di `:root`. Kode token lintas-sistem layak — tetap di file, deaktivasi saja sampai migrasi token.

**Langkah 2 — verifikasi**: `npm run build` hijau; `Get-ChildItem src -Recurse -Include *.tsx | Select-String 'prefers-color-scheme'` → 0 hasil.

**Langkah 3 (opsional)**: bila user confirm, hapus project `mobile-dark` dari playbook §3.1 + `playwright.config.ts` — **tidak default**; catat di dokumen audit.

### 5.2 P1-b — Kontras tombol "Tersimpan ✓" (Settings)

- File `src/screens/Settings.tsx` — search "Tersimpan".
- Problem: teks abu pucat di button abu (WCAG 1.4.3 fail); makna ambigu.
- Fix: primary-clickable → `bg-[var(--brand)] text-white` bila `dirty && !saving`; saat `saving` → `disabled` + label "Tersimpan…"; `aria-disabled` correct. Subtitle/aria: "Tersimpan semua pengaturan".

### 5.3 P2 — Wayfinding & konsistens

#### 5.3.1 StudentDetail wayfinding ganda
- `src/screens/StudentDetail.tsx`: hapus `<Breadcrumb />` dari tab Ringkasan; header = nama murid + chip kurikulum (Info card sudah berisi sekolah/mapel). Keep tombol "Kembali ke Daftar Murid".
- Search `Breadcrumb` in file — bila menjadi unused import, hapus import.

#### 5.3.2 Daftar Murid: "Nonaktifkan" vs "Hapus"
- `src/screens/Students.tsx`: "Hapus" → destruktif eksplisit (teks merah + ConfirmSheet kata "hapus permanen"); "Nonaktifkan" → netral (slate/amber, aksi non-destruktif, badge "Nonaktif"). Divider antara dua.

#### 5.3.3 Unifikasi ikon emoji → SVG (`components/icons.tsx`)
- Add ikon SVG kecil (pencil, camera, checklist, money, chart, bell) di `icons.tsx` — pola `IconBase`.
- Swap emoji fungsional: stepper `CaptureSession.tsx:59-64` (🎯📚😊📋✏️📸), `Section` Settings (👤🔐🏦🤖💾🗑️🧾📱 potong `icon` prop → SVG), tombol CTA StudentDetail, empty state.
- Emoji dekoratif (chart label, banner, toast) KEEP — jangan overreach.

### 5.4 P3 — Glossary istilah (bahasa campur)

| Istilah | Ubah ke |
|---|---|
| Command center | Pusat Tindakan |
| Tren focus | Fokus Tren |
| Pengaturan (header) | Pengaturan (keep) — fix EN "Settings" in labels user-visible |
| Progress (StudentDetail tab) | Progres |
| "Gagal" toast | tetap "Gagal" (konsisten) |

> Konvensi penamaan sudah ID-first — align semua label user-visible ke ID; URL/path keep EN (`/settings`, `/payments`).

## 6. FASE 3 — Guard Rail & Tes

1. A11y/regression: `src/__tests__/bottomNavNoVersion.test.tsx` & `modalAccessibility.test.tsx` tetap hijau (test tidak diubah).
2. Tambah test kontrast "Tersimpan" bila gagal → pola `modalAccessibility` (render minimal + assert class primary bila dirty).
3. E2E smoke: `npx playwright test --config=playwright.config.ts e2e/smoke.spec.ts` green.
4. Review `src/__tests__/reportDisplayStatus.test.ts` tetap hijau (status laporan).

## 7. Protokol Verifikasi & DoD

| Fase | Verifikasi | DoD |
|---|---|---|
| 0 | audit/ ≥60 PNG; lint/test/build hijau; katalog basi dihapus | F0 ✓ |
| 1 | `docs/UI-UX-AUDIT-VISUAL-2026-09-11.md` dengan temuan template | F1 ✓ |
| 2 | lint 0/0 · test hijau · build OK; dark deaktivasi | F2 ✓ |
| 3 | lint/test/build hijau + e2e smoke green | F3 ✓ |

Rollback: `git checkout -- <file>` · `git stash pop` bila perlu.

## 8. Lampiran — Snapshot State (2026-09-11)

- `git log --oneline -5`: `3f27a30 fix(drive): pesan actionable…` · `b9a9426 feat: harden data resilience…` · `dbc5641 chore: release v1.70.5` · `c6e4cd1 release: v1.70.4` · `6dc9e0e chore: release v1.70.3`.
- Routes (`src/App.tsx:256-270`): `/` `/students` `/students/:id` `/capture` `/report` `/payments` `/settings` `* → /`.
- Payments tab keys (`Payments.tsx:23`): `ringkasan|tagihan|pengeluaran|audit` → Bulan Ini / Penagihan / Pengeluaran / Rekap Tahunan.
- StudentDetail tab keys: `ringkasan|sesi|nilai|iaee` → Ringkasan / Sesi & Jadwal / Progres / IA/EE/PP.
- Capture STEPS (`CaptureSession.tsx:58-65`): 1 Jadwal 2 Materi 3 Kondisi 4 Detail 5 Catatan 6 Bukti.
- Settings Section titles: Profil Tutor · PIN Keuangan · Rekening Bank · AI — DeepSeek · Backup & Restore · Hapus Semua Data · Riwayat Aktivitas · Aplikasi (PWA).
- BottomNav (`BottomNav.tsx:11-53`): Home, Murid, Catat (primary FAB), Laporan, Keuangan.
- PIN seed: `123456` · Seed auto DEV `main.tsx:26-31` · `window.seedDummy(force)`.

---

_Tandai checkbox sesuai progres; set hasil verifikasi di baris paling atas._

- [x] Fase 0 — regen katalog audit/ (87 PNG) + hapus basi
- [x] Fase 1 — dokumen audit visual templated → `docs/UI-UX-AUDIT-VISUAL-2026-09-11.md`
- [x] Fase 2 — P1-a dark deaktivasi · P1-b kontras · P2 wayfinding/nonaktifkan · P3 glossary (emoji→SVG = backlog)
- [ ] Fase 3 — guard rail test + e2e smoke + docs final
