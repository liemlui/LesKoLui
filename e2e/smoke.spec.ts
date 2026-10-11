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
    await closeChangelog(page);
    // G3-02 #11: nav bawah kini TIGA PINTU + SATU AKSI (kontrak K1.1),
    // sebelumnya lima pintu dengan "Catat" bergaya tombol mengambang.
    // "Laporan" keluar dari nav, tetapi rute `/report` tetap hidup dan masih
    // dicapai dari panel pipeline ("Buat laporan") serta modal invoice.
    await expect(page.getByRole("link", { name: "Hari Ini" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Murid" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Uang" })).toBeVisible();
    // Aksi utama adalah tombol, bukan tautan — itu inti perubahannya.
    await expect(page.getByRole("button", { name: /Catat sesi/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Catat", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Laporan", exact: true })).toHaveCount(0);
  });

  test("aksi utama di nav membuka Catat Sesi", async ({ page }) => {
    await page.goto("/");
    await closeChangelog(page);
    await page.getByRole("button", { name: /Catat sesi/ }).click();
    await expect(page).toHaveURL(/\/capture/);
  });

  test("navigasi ke Murid", async ({ page }) => {
    await page.goto("/");
    await closeChangelog(page);
    await page.getByRole("link", { name: "Murid" }).click();
    await expect(page).toHaveURL(/\/students$/);
  });

  test("rute Pengaturan menampilkan section Backup", async ({ page }) => {
    await page.goto("/settings");
    await closeChangelog(page);
    await expect(page).toHaveURL(/\/settings$/);
    // Judul bagiannya "Backup dan Restore" sejak G3-09 butir 4 (dulu
    // "Backup & Restore"). Ditambatkan pada `data-bagian`, bukan teks judul,
    // supaya perubahan kata tidak mematahkan penjaga ini lagi.
    await expect(page.locator('[data-bagian="backup"]')).toBeVisible();
  });
});
