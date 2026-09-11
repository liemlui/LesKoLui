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

test.beforeEach(async (_fixtures, testInfo) => {
  void _fixtures;
  OUT = path.join(OUT_ROOT, testInfo.project.name);
  fs.mkdirSync(OUT, { recursive: true });
});

type Opts = { fullPage?: boolean };

async function shot(page: Page, name: string, opts: Opts = { fullPage: true }) {
  try {
    await page.screenshot({ path: path.join(OUT, name), fullPage: opts.fullPage });
    console.log(`  ok ${test.info().project.name}/${name}`);
  } catch (e) {
    console.log(`  FAIL ${name}: ${(e as Error).message}`);
  }
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function closeChangelog(page: Page) {
  try {
    const btn = page.getByText(/Mengerti|Terima Kasih/);
    if (await btn.isVisible({ timeout: 800 })) {
      await btn.click();
      await page.waitForTimeout(400);
    }
  } catch { /* no modal */ }
  const dw = page.getByRole("button", { name: "Tutup peringatan" });
  if (await dw.isVisible({ timeout: 1000 }).catch(() => false)) { await dw.click(); }
  const later = page.getByRole("button", { name: "Nanti", exact: true });
  if (await later.isVisible({ timeout: 1000 }).catch(() => false)) { await later.click(); }
  // Suppress async backup nag (fixed bottom, intercepts CTA clicks like "Lanjut").
  await page.evaluate(() => localStorage.setItem("leskolui_last_auto_backup_prompt", String(Date.now())));
  const besok = page.getByRole("button", { name: "Besok" });
  if (await besok.isVisible({ timeout: 600 }).catch(() => false)) { await besok.click(); }
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
    await t.click();
    await page.waitForTimeout(600);
  }
}

test("01-home", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(2500);
  await closeChangelog(page);
  await shot(page, "01-home-dashboard.png");

  const monthBtn = page.locator(".grid-cols-3 button").filter({ hasText: "Bulan" }).first();
  if (await monthBtn.isVisible()) {
    await monthBtn.click();
    await page.waitForTimeout(600);
  }
  await shot(page, "01b-home-calendar-month.png");

  const dayCell = page.locator('[class*="min-h-"]').filter({ hasText: /^\d{1,2}$/ }).first();
  if (await dayCell.isVisible()) {
    await dayCell.click();
    await page.waitForTimeout(600);
  }
  await shot(page, "01c-home-day-detail.png");
});

test("02-students", async ({ page }) => {
  await page.goto("/students");
  await page.waitForTimeout(2500);
  await closeChangelog(page);
  await shot(page, "02-students-list.png");
});

test("03-student-detail", async ({ page }) => {
  await page.goto("/students");
  await page.waitForTimeout(2500);
  await closeChangelog(page);
  const card = page.locator('a[href*="/students/"][class*="block"]').first();
  if (await card.isVisible()) {
    await card.click();
    await page.waitForTimeout(2000);
  }
  for (const t of ["Ringkasan", "Sesi & Jadwal", "Progres", "IA/EE/PP"]) {
    await clickTab(page, t);
    await shot(page, `03-student-${t.toLowerCase().replaceAll(" & ", "-").replaceAll("/", "-")}.png`);
  }
});
test("05-report", async ({ page }) => {
  await page.goto("/report");
  await page.waitForTimeout(2500);
  await closeChangelog(page);
  const month = page.locator('input[type="month"]');
  if (await month.isVisible({ timeout: 1500 }).catch(() => false)) {
    await month.fill("2026-06");
    await page.waitForTimeout(600);
  }
  const select = page.locator("select").first();
  if (await select.isVisible({ timeout: 1000 }).catch(() => false)) {
    const values = await select.locator("option").evaluateAll((o) =>
      (o as HTMLOptionElement[]).map((x) => x.value).filter(Boolean));
    for (const v of values) {
      await select.selectOption(v);
      try {
        await page.getByRole("button", { name: /Buat Laporan|Update Laporan/ }).waitFor({ timeout: 2000 });
        break;
      } catch { /* try next */ }
    }
  }
  try {
    await page.getByRole("button", { name: /Buat Laporan|Update Laporan/ }).click();
    await page.locator("[data-report-page]").first().waitFor({ timeout: 10_000 });
  } catch { /* keep whatever */ }
  await page.waitForTimeout(800);
  await shot(page, "05-report-main.png");
});

test("06-payments", async ({ page }) => {
  await page.goto("/payments?tab=ringkasan");
  await page.waitForTimeout(2500);
  await closeChangelog(page);
  await openPin(page);
  for (const t of ["Bulan Ini", "Penagihan", "Pengeluaran", "Rekap Tahunan"]) {
    await clickTab(page, t);
    await shot(page, `06-payments-${t.toLowerCase().replaceAll(" ", "-")}.png`);
  }
});

test("07-settings", async ({ page }) => {
  await page.goto("/settings");
  await page.waitForTimeout(2500);
  await closeChangelog(page);
  await shot(page, "07-settings-top.png");
  const titles = ["Profil Tutor", "PIN Keuangan", "Rekening Bank", "AI — DeepSeek",
    "Backup & Restore", "Riwayat Aktivitas", "Aplikasi (PWA)", "Hapus Semua Data"];
  for (const title of titles) {
    const btn = page.getByRole("button", { name: new RegExp(esc(title)) });
    if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await btn.click();
      await page.waitForTimeout(450);
    }
    await shot(page, `07-settings-${title.replaceAll(" ", "-").replaceAll("—", "").toLowerCase()}.png`);
  }
});

test("08-modal-update", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.removeItem("leskolui-last-seen-version"));
  await page.reload();
  await page.waitForTimeout(2500);
  await shot(page, "08-modal-update.png", { fullPage: false });
});

test("04-capture-wizard", async ({ page }) => {
  await page.goto("/capture");
  await page.waitForTimeout(2500);
  await closeChangelog(page);
  for (let step = 1; step <= 6; step++) {
    await shot(page, `04-capture-step${step}.png`);
    const next = page.getByRole("button", { name: /Lanjut/ }).first();
    if (await next.isVisible({ timeout: 800 }).catch(() => false)) {
      await next.click();
      await page.waitForTimeout(500);
    }
  }
});