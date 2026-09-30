import { expect, test } from "@playwright/test";

test.use({
  launchOptions: process.env.SYSTEM_CHROME_PATH
    ? { executablePath: process.env.SYSTEM_CHROME_PATH }
    : undefined,
});

test("finance data stays connected across summary, expenses, and audit", async ({ page, isMobile }) => {
  const seedDone = page.waitForEvent("console", {
    predicate: (message) => /berhasil dimasukkan|seed dilewati/.test(message.text()),
    timeout: 60_000,
  });
  await page.goto("/");
  await seedDone;
  await page.evaluate(() => localStorage.setItem("leskolui-last-seen-version", "v1.41.0"));

  await page.goto("/payments");
  const changelogButton = page.getByRole("button", { name: /Mengerti/ });
  if (await changelogButton.isVisible()) await changelogButton.click();
  const backupLaterButton = page.getByRole("button", { name: "Nanti", exact: true });
  if (await backupLaterButton.isVisible()) await backupLaterButton.click();
  await page.getByPlaceholder("PIN (6 digit)").fill("123456");
  await page.getByRole("button", { name: "Buka", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Keuangan", exact: true })).toBeVisible();
  await expect(page.getByText("Bulan keuangan", { exact: true })).toBeVisible();

  // Kontrol bulan keuangan tinggal di `FinancePeriodPicker`: input `type="month"`
  // dengan label "Bulan keuangan" (dulu "Pilih bulan keuangan").
  const monthInput = page.getByRole("textbox", { name: "Bulan keuangan", exact: true });
  await expect(monthInput).toHaveCount(1);
  await monthInput.fill("2026-06");
  await expect(page).toHaveURL(/month=2026-06/);
  await expect(page.getByText("Juni 2026", { exact: true }).first()).toBeVisible();

  // Ringkasan — kas basis pembayaran. Rp 450.000 = satu-satunya pembayaran Juni
  // di data seed (Eko, 2026-06-06); kartunya kini bernama "Uang masuk · …"
  // (istilah lama "Kas diterima" sudah diseragamkan).
  const cashCard = page.getByText("Uang masuk · Juni 2026", { exact: true }).locator("..");
  await expect(cashCard).toContainText("Rp 450.000");
  await expect(page.getByText("Yang benar-benar bergerak di rekening", { exact: true })).toBeVisible();

  await page.getByText("Analitik lanjutan", { exact: true }).click();
  const threeMonthTrend = page.getByRole("button", { name: "3 bulan", exact: true });
  await expect(threeMonthTrend).toBeVisible();
  await threeMonthTrend.click();
  await expect(threeMonthTrend).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("tab", { name: "Pengeluaran", exact: true }).click();
  const expenseTotalCard = page.getByText("Total pengeluaran", { exact: true }).locator("..");
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

  // Audit tahun buku — tab-nya kini bernama "Rekap" (dulu "Rekap Tahunan"), dan
  // kartu tahunannya berlaku di semua lebar layar.
  await page.getByRole("tab", { name: "Rekap", exact: true }).click();
  await expect(page.getByText("Rekap & Ekspor", { exact: true })).toBeVisible();
  await expect(page.getByText("Pendapatan (akrual)", { exact: true })).toBeVisible();
  await expect(page.getByText("Uang masuk (kas)", { exact: true })).toBeVisible();
  await expect(page.getByText("Sisa kas", { exact: true }).first()).toBeVisible();
  if (!isMobile) {
    // Tabel 8 kolom hanya dirender pada layar lebar; layar sempit memakai kartu
    // ringkas per bulan supaya tidak ada scroll horizontal (lihat RekapTab).
    await expect(page.getByRole("columnheader", { name: "Pertemuan", exact: true })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Pendapatan", exact: true })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Uang masuk", exact: true })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Sisa kas", exact: true })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Piutang", exact: true })).toBeVisible();
  }
});
