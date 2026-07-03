/**
 * Screenshot katalog — menangkap semua fitur Les Ko Lui untuk iklan/poster Instagram.
 * Hasil disimpan di e2e/screenshots/ — @2x pixel density (retina).
 *
 * Jalankan khusus katalog: npx playwright test --config=playwright.config.ts e2e/screenshot-katalog.spec.ts
 */

import { test } from "@playwright/test";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCREENSHOTS_DIR = path.resolve(__dirname, "screenshots");

// Pastikan folder ada
test.beforeAll(() => {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
});

/** Selalu snap — gagal screenshot tidak menggagalkan test */
async function shot(page: any, name: string, opts?: { fullPage?: boolean }) {
  try {
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, name),
      fullPage: opts?.fullPage ?? true,
    });
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.log(`  ✗ ${name}: ${(e as Error).message}`);
  }
}

// ───── seed data sebelum semua test ─────
test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage({ deviceScaleFactor: 2 });
  await page.goto("/");
  await page.waitForTimeout(3000);

  // Seed dummy data
  const hasStudents = await page.evaluate(async () => {
    const { listStudents } = await import("../src/db/repos");
    return (await listStudents(true)).length > 0;
  });

  if (!hasStudents) {
    console.log("  ⏳ Seeding dummy data...");
    try {
      await page.evaluate(async () => {
        const fn = (window as any).seedDummy;
        if (typeof fn === "function") await fn();
      });
      await page.waitForTimeout(5000);
      // PIN: 123456 — diset oleh seedDummy
    } catch {
      console.log("  ⚠️ Seed gagal — lanjut tanpa data dummy");
    }
    await page.reload();
    await page.waitForTimeout(2000);
  } else {
    console.log("  ✓ Data dummy sudah ada");
  }

  await page.close();
});

// ───── Page-level screenshots ─────

test("01-home-dashboard", async ({ page }) => {
  await page.goto("/"); await page.waitForTimeout(2000);
  await closeChangelog(page);
  await shot(page, "01-home-dashboard.png");
});

test("02-home-day-detail", async ({ page }) => {
  await page.goto("/"); await page.waitForTimeout(1500);
  await closeChangelog(page);

  // Tap salah satu tanggal di calendar
  const dayCell = page.locator('[class*="min-h-"]').filter({ hasText: /^\d{1,2}$/ }).first();
  if (await dayCell.isVisible()) {
    await dayCell.click();
    await page.waitForTimeout(500);
  }
  await shot(page, "02-home-calendar-detail.png");
});

test("03-daftar-murid", async ({ page }) => {
  await page.goto("/students"); await page.waitForTimeout(2000);
  await closeChangelog(page);
  await shot(page, "03-daftar-murid.png");
});

test("04-detail-murid", async ({ page }) => {
  await page.goto("/students"); await page.waitForTimeout(2000);
  await closeChangelog(page);

  // Klik murid pertama
  const card = page.locator('a[href*="/students/"][class*="block"]').first();
  if (await card.isVisible()) {
    await card.click();
    await page.waitForTimeout(2000);
  }
  await shot(page, "04-detail-murid.png");
});

test("05-catat-sesi", async ({ page }) => {
  await page.goto("/capture"); await page.waitForTimeout(1500);
  await closeChangelog(page);
  await shot(page, "05-catat-sesi.png");
});

test("06-tugas-pr", async ({ page }) => {
  await page.goto("/tugas"); await page.waitForTimeout(1500);
  await closeChangelog(page);
  await shot(page, "06-tugas-pr.png");
});

test("07-laporan-bulanan", async ({ page }) => {
  await page.goto("/report"); await page.waitForTimeout(1500);
  await closeChangelog(page);
  await shot(page, "07-laporan-bulanan.png");
});

test("08-keuangan", async ({ page }) => {
  await page.goto("/payments"); await page.waitForTimeout(1500);
  await closeChangelog(page);
  await shot(page, "08-keuangan.png");
});

test("09-settings", async ({ page }) => {
  await page.goto("/settings"); await page.waitForTimeout(1500);
  await closeChangelog(page);
  await shot(page, "09-settings-1.png");

  // Scroll ke bawah untuk AI + PIN + Bank
  await page.evaluate(() => window.scrollTo(0, 800));
  await page.waitForTimeout(400);
  await shot(page, "10-settings-2.png");

  await page.evaluate(() => window.scrollTo(0, 1600));
  await page.waitForTimeout(400);
  await shot(page, "11-settings-3.png");
});

test("10-update-modal", async ({ page }) => {
  // Paksa modal muncul
  await page.goto("/");
  await page.evaluate(() => localStorage.removeItem("leskolui-last-seen-version"));
  await page.reload();
  await page.waitForTimeout(2000);
  await shot(page, "12-update-modal.png", { fullPage: false });
});

test("11-narasi-per-sesi", async ({ page }) => {
  await page.goto("/report"); await page.waitForTimeout(1500);
  await closeChangelog(page);

  // Buka accordion "Narasi per Sesi"
  const narasiBtn = page.getByText(/Narasi per Sesi/i);
  if (await narasiBtn.isVisible()) {
    await narasiBtn.click();
    await page.waitForTimeout(800);
  }
  await shot(page, "13-narasi-per-sesi.png");
});

test("12-home-calendar-month", async ({ page }) => {
  await page.goto("/"); await page.waitForTimeout(1500);
  await closeChangelog(page);

  // Tampilan bulan
  const monthBtn = page.getByText("Bulan");
  if (await monthBtn.isVisible()) {
    await monthBtn.click();
    await page.waitForTimeout(500);
  }
  await shot(page, "14-calendar-month.png");
});

// ───── Helper ─────

async function closeChangelog(page: any) {
  try {
    const btn = page.getByText(/Mengerti|Terima Kasih/);
    if (await btn.isVisible({ timeout: 800 })) {
      await btn.click();
      await page.waitForTimeout(400);
    }
  } catch { /* no modal */ }
}
