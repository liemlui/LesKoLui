/**
 * E2E: alur laporan bulanan — buat laporan, pratinjau ter-render,
 * export JPG menghasilkan file (font embedding tidak boleh menggagalkan export).
 */
import { test, expect, type Page } from "@playwright/test";

async function closeChangelog(page: Page) {
  try {
    const btn = page.getByText(/Mengerti|Terima Kasih/);
    if (await btn.isVisible({ timeout: 1500 })) {
      await btn.click();
      await page.waitForTimeout(300);
    }
  } catch { /* tidak ada modal */ }
}

test("buat laporan lalu export JPG berhasil tanpa error", async ({ page }) => {
  test.slow(); // rasterisasi + embed font butuh waktu

  await page.goto("/");
  await page.waitForTimeout(4000); // tunggu startup + auto-seed dev

  // Pastikan data dummy ada
  const seeded = await page.evaluate(async () => {
    const fn = (window as unknown as { seedDummy?: (force?: boolean) => Promise<unknown> }).seedDummy;
    if (typeof fn === "function") { await fn(); return true; }
    return false;
  });
  expect(seeded).toBe(true);
  await page.waitForTimeout(1000);

  await page.goto("/report");
  await closeChangelog(page);

  // Seed berisi sesi Maret–Juni 2026 → pilih bulan Juni
  await page.locator('input[type="month"]').fill("2026-06");

  // Pilih murid pertama yang punya sesi (coba tiap murid sampai stats muncul)
  const select = page.locator("select").first();
  const optionValues = await select.locator("option").evaluateAll(
    (opts) => (opts as HTMLOptionElement[]).map((o) => o.value).filter(Boolean),
  );
  expect(optionValues.length).toBeGreaterThan(0);

  let found = false;
  for (const value of optionValues) {
    await select.selectOption(value);
    try {
      await page.getByRole("button", { name: /Buat Laporan|Update Laporan/ }).waitFor({ timeout: 2500 });
      found = true;
      break;
    } catch { /* murid ini tak punya sesi bulan ini — lanjut */ }
  }
  expect(found, "tidak ada murid dengan sesi bulan ini di seed").toBe(true);

  // Buat / update laporan → pratinjau harus ter-render
  await page.getByRole("button", { name: /Buat Laporan|Update Laporan/ }).click();
  await expect(page.locator("[data-report-page]").first()).toBeVisible({ timeout: 10_000 });

  // Export JPG → harus menghasilkan download (share API tak ada di chromium headless)
  const downloadPromise = page.waitForEvent("download", { timeout: 45_000 });
  await page.getByRole("button", { name: /JPG/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.jpg$/);

  // Tidak boleh muncul pesan gagal
  await expect(page.getByText(/Gagal ekspor/)).toHaveCount(0);
});
