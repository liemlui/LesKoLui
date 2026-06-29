import { test, expect } from "@playwright/test";

// Smoke E2E: app shell memuat & navigasi bawah berfungsi (offline-first PWA).
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
    await page.getByRole("link", { name: "Murid" }).click();
    await expect(page).toHaveURL(/\/students$/);
  });

  test("navigasi ke Pengaturan menampilkan section Backup", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Atur" }).click();
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByText("Backup & Restore")).toBeVisible();
  });
});
