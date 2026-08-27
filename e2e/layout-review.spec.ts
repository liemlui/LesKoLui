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

/**
 * Pergantian layout memicu penyimpanan IndexedDB lalu ReportRenderer melakukan
 * rebalance halaman. Saat kedua render itu berurutan, node halaman lama dapat
 * terlepas tepat ketika Playwright hendak mengambil screenshot. Ulangi hanya
 * untuk kondisi DOM transien tersebut; error visual/layout yang nyata tetap
 * diteruskan agar audit tidak menyamarkan masalah.
 */
async function captureFirstReportPage(page: Page, id: string) {
  const pages = page.locator("[data-report-export-root] [data-report-page]");
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const first = pages.first();
    try {
      await first.waitFor({ state: "visible", timeout: 5_000 });
      // Locator.screenshot() otomatis men-scroll dan menunggu elemen stabil.
      // Hindari scroll terpisah: di situlah node lama sebelumnya terlepas.
      await first.screenshot({ path: path.join(DIR, `${id}.png`) });
      const box = await first.boundingBox();
      if (!box) throw new Error("Halaman laporan sedang diperbarui.");
      return { count: await pages.count(), height: box.height };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const transientRender = /not attached to the DOM|sedang diperbarui/.test(message);
      if (!transientRender || attempt === 3) throw error;
      await page.waitForTimeout(250);
    }
  }
  throw new Error("Halaman laporan tidak stabil untuk diambil gambarnya.");
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
  const layouts = await layoutSelect.locator("option").evaluateAll(
    (opts) => (opts as HTMLOptionElement[]).map((o) => ({
      id: o.value,
      label: o.textContent?.trim() || o.value,
    })),
  );
  console.log(`[layout-review] ${layouts.length} layout: ${layouts.map((layout) => layout.id).join(", ")}`);

  for (const { id, label } of layouts) {
    await layoutSelect.selectOption(id);
    await expect(layoutSelect).toHaveValue(id);
    // Ini menandakan nilai baru sudah tersimpan dan kembali dari live query;
    // lebih andal daripada menebak lama proses IndexedDB dengan timeout statis.
    await expect(page.locator("summary").filter({ hasText: label })).toBeVisible({ timeout: 10_000 });
    const { count, height } = await captureFirstReportPage(page, id);
    console.log(`[layout-review] ${id}: ${count} node halaman, tinggi hal-1 = ${Math.round(height)}px`);
  }
});
