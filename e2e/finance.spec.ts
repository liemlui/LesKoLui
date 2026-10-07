import { expect, test } from "@playwright/test";

test.use({
  launchOptions: process.env.SYSTEM_CHROME_PATH
    ? { executablePath: process.env.SYSTEM_CHROME_PATH }
    : undefined,
});

test("finance data stays connected across summary, expenses, and audit", async ({ page }) => {
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

  // ── Layar Uang: tiga blok tetap (sejak 2026-10-07) ──
  // `/payments` polos TIDAK lagi memuat analitik maupun tab; keempat rincian
  // hidup sebagai sub-layar `?tab=`. Blok "Bulan ini" tetap memuat angka kas
  // yang sama, jadi pemeriksaannya dipindah ke sana — bukan dihapus.
  await expect(page.getByRole("heading", { name: "Uang yang benar-benar bergerak · Juni 2026", exact: true })).toBeVisible();
  // Rp 450.000 = satu-satunya pembayaran Juni di data seed (Eko, 2026-06-06).
  const uangMasuk = page.getByText("Masuk", { exact: true }).locator("..");
  await expect(uangMasuk).toContainText("Rp 450.000");
  const pengeluaranBlok = page.getByText("Keluar", { exact: true }).locator("..");
  await expect(pengeluaranBlok).toContainText("Rp 640.000");

  // ── Sub-layar analitik: kartu kas, tren, dan panel lanjutan ──
  // Tombol pintasan "Analitik lengkap" satu-satunya jalan resmi masuk ke sini.
  await page.getByRole("button", { name: /Analitik lengkap/ }).click();
  await expect(page).toHaveURL(/tab=ringkasan/);
  // Kartu kas basis pembayaran; istilah lama "Kas diterima" sudah diseragamkan.
  const cashCard = page.getByText("Uang masuk · Juni 2026", { exact: true }).locator("..");
  await expect(cashCard).toContainText("Rp 450.000");
  await expect(page.getByText("Yang benar-benar bergerak di rekening", { exact: true })).toBeVisible();

  await page.getByText("Analitik lanjutan", { exact: true }).click();
  const threeMonthTrend = page.getByRole("button", { name: "3 bulan", exact: true });
  await expect(threeMonthTrend).toBeVisible();
  await threeMonthTrend.click();
  await expect(threeMonthTrend).toHaveAttribute("aria-pressed", "true");

  // ── Sub-layar Pengeluaran ──
  // Lewat bilah tab sub-layar, bukan pintasan beranda: label pintasan memuat
  // nominal, dan teksnya sendiri disembunyikan `compactLabel` di layar sempit
  // ("Keluar"). Peran tab memakai `aria-label` sehingga sama di semua lebar.
  await page.getByRole("tab", { name: "Pengeluaran", exact: true }).click();
  await expect(page).toHaveURL(/tab=pengeluaran/);
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

  // ── Sub-layar Rekap tahun buku ──
  // Tab-nya kini bernama "Rekap" (dulu "Rekap Tahunan"), dan tabel penuh 8
  // kolom hidup di balik tombol "Lihat lengkap" karena tampilan utamanya
  // sengaja diringkas menjadi 3 kolom (2026-10-07).
  await page.getByRole("tab", { name: "Rekap", exact: true }).click();
  await expect(page.getByText("Rekap & Ekspor", { exact: true })).toBeVisible();
  await expect(page.getByText("Pendapatan (akrual)", { exact: true })).toBeVisible();
  await expect(page.getByText("Uang masuk (kas)", { exact: true })).toBeVisible();
  await expect(page.getByText("Sisa kas", { exact: true }).first()).toBeVisible();

  // Tabel utama 3 kolom berlaku di semua lebar layar — inilah yang menggantikan
  // kartu dua baris untuk layar sempit. `Sisa kas` dan `Piutang` sengaja diuji
  // dengan `.first()`: keduanya muncul di tabel utama DAN di tabel penuh, jadi
  // pencocokan tanpa `.first()` akan melanggar mode ketat Playwright.
  await expect(page.getByRole("columnheader", { name: "Piutang", exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: /Lihat lengkap/ }).click();
  await expect(page.getByRole("columnheader", { name: "Pertemuan", exact: true })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Pendapatan", exact: true })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Uang masuk", exact: true })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Sisa kas", exact: true }).first()).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Pengeluaran", exact: true })).toBeVisible();
});
