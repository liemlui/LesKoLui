import { test, expect } from "@playwright/test";

test("tombol keluar di header membuka konfirmasi tanpa memakai navigasi back", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(4000);
  await page.evaluate(async () => {
    const fn = (window as unknown as { seedDummy?: (force?: boolean) => Promise<unknown> }).seedDummy;
    if (typeof fn === "function") await fn(true);
  });
  await page.reload();

  const changelog = page.getByText(/Mengerti|Terima Kasih/);
  if (await changelog.isVisible({ timeout: 1500 }).catch(() => false)) await changelog.click();
  const dismissWarning = page.getByRole("button", { name: "Tutup peringatan" });
  if (await dismissWarning.isVisible({ timeout: 1500 }).catch(() => false)) await dismissWarning.click();

  await expect(page.getByRole("button", { name: "Keluar aplikasi" })).toBeVisible();
  await page.getByRole("button", { name: "Keluar aplikasi" }).click();
  await expect(page.getByRole("heading", { name: "Keluar dari Les Ko Lui?" })).toBeVisible();
  await expect(page.getByText("Perubahan sudah tersimpan di perangkat.")).toBeVisible();
});
