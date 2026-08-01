import { expect, test } from "@playwright/test";

test("finance data stays connected across summary, expenses, and audit", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => typeof (window as unknown as { seedDummy?: unknown }).seedDummy === "function");
  await page.evaluate(async () => {
    const appWindow = window as unknown as { seedDummy: (force?: boolean) => Promise<void> };
    await appWindow.seedDummy(true);
    localStorage.setItem("leskolui-last-seen-version", "v1.36.0");
  });

  await page.goto("/payments");
  const changelogButton = page.getByRole("button", { name: /Mengerti/ });
  if (await changelogButton.isVisible()) await changelogButton.click();
  const backupLaterButton = page.getByRole("button", { name: "Nanti", exact: true });
  if (await backupLaterButton.isVisible()) await backupLaterButton.click();
  await page.getByPlaceholder("PIN (6 digit)").fill("123456");
  await page.getByRole("button", { name: "Buka", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Keuangan", exact: true })).toBeVisible();

  const monthInput = page.locator('input[type="month"]');
  await expect(monthInput).toHaveCount(1);
  await monthInput.fill("2026-06");

  const cashCard = page.getByText("Kas Masuk Bulan Ini", { exact: true }).locator("..");
  await expect(cashCard).toContainText("Rp 450.000");
  await expect(page.getByText(/Rekonsiliasi sesi/)).toBeVisible();

  await page.getByRole("tab", { name: "Pengeluaran", exact: true }).click();
  const expenseTotalCard = page.getByText("Total Pengeluaran", { exact: true }).locator("..");
  await expect(expenseTotalCard).toContainText("Rp 640.000");
  await expect(page.getByText("Isi bensin", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "+ Catat", exact: true }).click();
  await page.getByLabel("Kategori", { exact: true }).selectOption("alat");
  await page.getByLabel("Deskripsi", { exact: true }).fill("Kertas ujian");
  await page.getByLabel("Jumlah (IDR)", { exact: true }).fill("75000");
  await page.getByRole("button", { name: "Simpan Pengeluaran", exact: true }).click();

  await expect(page.getByText("Kertas ujian", { exact: true })).toBeVisible();
  await expect(expenseTotalCard).toContainText("Rp 715.000");
  await page.screenshot({ path: "e2e/screenshots/finance-strengthened.png", fullPage: true });

  await page.getByRole("tab", { name: "Audit", exact: true }).click();
  await expect(page.getByRole("columnheader", { name: "Potensi", exact: true })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Kas Masuk", exact: true })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Piutang", exact: true })).toBeVisible();
});
