import { test, expect } from "@playwright/test";

test("tombol keluar di Pengaturan membuka konfirmasi tanpa memakai navigasi back", async ({ page }) => {
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
  // Pemeriksaan backup berjalan async setelah app dimuat. Tunggu sebentar bila
  // banner risiko muncul, lalu tutup melalui UI agar tidak menutupi header.
  await dismissWarning.click({ timeout: 5000 }).catch(() => undefined);

  // Tombol keluar dipindahkan ke Pengaturan → Aplikasi (PWA).
  await page.goto("/settings");
  await page.waitForTimeout(1500);
  if (await changelog.isVisible({ timeout: 1500 }).catch(() => false)) await changelog.click();
  await dismissWarning.click({ timeout: 5000 }).catch(() => undefined);

  await expect(page.getByRole("button", { name: "Keluar Aplikasi" })).toBeVisible();
  await page.getByRole("button", { name: "Keluar Aplikasi" }).click();
  await expect(page.getByRole("heading", { name: "Keluar dari Les Ko Lui?" })).toBeVisible();
  await expect(page.getByText("Perubahan sudah tersimpan di perangkat.")).toBeVisible();
});
