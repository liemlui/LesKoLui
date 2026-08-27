/**
 * Review visual semua layout laporan — render tiap layout dengan data seed
 * bulan Juni lalu screenshot halaman pertamanya ke e2e/screenshots/layouts/.
 * Untuk audit paginasi & estetika (bukan test assert).
 *
 * Jalankan: npx playwright test e2e/layout-review.spec.ts
 */
import { expect, test, type Page } from "@playwright/test";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.resolve(__dirname, "screenshots", "layouts");

test.beforeAll(() => {
  fs.mkdirSync(DIR, { recursive: true });
});

async function closeChangelog(page: Page) {
  try {
    const btn = page.getByRole("button", { name: /Mengerti/ });
    if (await btn.isVisible({ timeout: 2000 })) {
      await btn.click();
      await btn.waitFor({ state: "hidden" });
    }
  } catch { /* tidak ada modal */ }
}

test("render semua layout laporan", async ({ page }) => {
  test.setTimeout(360_000);

  // Tunggu auto-seed dev BENAR-BENAR selesai (sinyal console) — memanggil
  // seedDummy(true) manual bisa jadi no-op karena guard _seeding saat auto-seed
  // masih berjalan → report ter-render dengan data parsial (race).
  const seedDone = page.waitForEvent("console", {
    predicate: (msg) => /berhasil dimasukkan|seed dilewati/.test(msg.text()),
    timeout: 60_000,
  });
  await page.goto("/");
  await seedDone;
  await page.waitForTimeout(500);

  await page.goto("/report");
  await page.waitForTimeout(1500);
  await closeChangelog(page);
  // Singkirkan banner fixed (stale-backup ✕ / weekly "Nanti") agar tak menimpa screenshot
  for (const name of ["Tutup peringatan", "Nanti"]) {
    for (const btn of await page.getByRole("button", { name }).all()) {
      try { await btn.click({ timeout: 1000 }); } catch { /* sudah hilang */ }
    }
  }
  await page.locator('input[type="month"]').fill("2026-06");

  // Pilih murid dengan sesi Juni
  const studentSelect = page.locator("select").first();
  const students = await studentSelect.locator("option").evaluateAll(
    (opts) => (opts as HTMLOptionElement[]).map((o) => o.value).filter(Boolean),
  );
  for (const value of students) {
    await studentSelect.selectOption(value);
    try {
      await page.getByRole("button", { name: /Buat Laporan|Update Laporan/ }).waitFor({ timeout: 2000 });
      break;
    } catch { /* lanjut */ }
  }
  await page.getByRole("button", { name: /Buat Laporan|Update Laporan/ }).click();
  await page.locator("[data-report-page]").first().waitFor({ timeout: 10_000 });

  // Tunggu toolbar tema selesai ter-render (report + reportData siap), lalu
  // BUKA <details> — dropdown layout di dalamnya tersembunyi saat ditutup.
  const layoutSelect = page.locator("select").nth(1);
  await expect(layoutSelect.locator("option").first()).toBeAttached({ timeout: 10_000 });
  await page.locator("summary").filter({ hasText: "Ubah tema" }).click();
  await expect(layoutSelect).toBeVisible();
  const ids = await layoutSelect.locator("option").evaluateAll(
    (opts) => (opts as HTMLOptionElement[]).map((o) => o.value),
  );
  console.log(`[layout-review] ${ids.length} layout: ${ids.join(", ")}`);

  for (const id of ids) {
    await layoutSelect.selectOption(id);
    await page.waitForTimeout(800);
    const pages = page.locator("[data-report-page]");
    const n = await pages.count(); // termasuk 1 panel rekap tanda tangan
    const first = pages.first();
    await first.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    const box = await first.boundingBox();
    console.log(`[layout-review] ${id}: ${n} node halaman, tinggi hal-1 = ${Math.round(box?.height ?? 0)}px`);
    await first.screenshot({ path: path.join(DIR, `${id}.png`) });
  }
});
