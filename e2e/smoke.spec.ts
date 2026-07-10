import { test, expect, type Page } from "@playwright/test";

// Smoke E2E: app shell memuat & navigasi bawah berfungsi (offline-first PWA).

/** Modal changelog muncul di load pertama tiap versi baru — tutup dulu agar nav bisa diklik. */
async function closeChangelog(page: Page) {
  try {
    const btn = page.getByRole("button", { name: /Mengerti/ });
    if (await btn.isVisible({ timeout: 2000 })) {
      await btn.click();
      await btn.waitFor({ state: "hidden" });
    }
  } catch { /* tidak ada modal */ }
}

test.describe("smoke", () => {
  test("app shell memuat dengan navigasi bawah", async ({ page }) => {
    await page.goto("/");
    // Bottom nav selalu ada di semua layar
    await expect(page.getByRole("link", { name: "Murid" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Keuangan" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Atur" })).toBeVisible();
  });

  test("navigasi ke Murid", async ({ page }) => {
    await page.goto("/");
    await closeChangelog(page);
    await page.getByRole("link", { name: "Murid" }).click();
    await expect(page).toHaveURL(/\/students$/);
  });

  test("navigasi ke Pengaturan menampilkan section Backup", async ({ page }) => {
    await page.goto("/");
    await closeChangelog(page);
    await page.getByRole("link", { name: "Atur" }).click();
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByText("Backup & Restore")).toBeVisible();
  });
});
