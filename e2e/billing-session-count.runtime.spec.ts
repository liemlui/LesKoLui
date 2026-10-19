import { test, expect } from "./fixtures";
import { type Page } from "@playwright/test";

test.use({
  launchOptions: process.env.SYSTEM_CHROME_PATH
    ? { executablePath: process.env.SYSTEM_CHROME_PATH }
    : undefined,
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript((version) => {
    localStorage.setItem("leskolui-last-seen-version", version);
  }, "v1.41.0");
});

async function closeChangelog(page: Page) {
  const dialog = page.getByRole("dialog", { name: "Catatan perubahan" });
  const closeButton = dialog.getByRole("button", { name: /Mengerti/ });
  if (await closeButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    /**
     * Klik lewat DOM, **bukan** `click({ force: true })`.
     *
     * Terukur 2026-10-17 pada run suite penuh project `mobile`: catatan perubahan
     * itu panjang, sehingga tombol "Mengerti" berada **di luar viewport** dan
     * `force: true` tidak menolong — Playwright tetap gagal dengan *"Element is
     * outside of the viewport"*, padahal spec yang sama lulus saat dijalankan
     * sendirian. Pola `el.click()` ini yang sudah dipakai
     * `session-cost-manual.spec.ts` dan tercatat di `ATURAN-AI.md` §7.
     */
    await closeButton.evaluate((el: HTMLElement) => el.click());
  }
  await expect(dialog).toBeHidden({ timeout: 5000 });
}

async function closeBackupNag(page: Page) {
  const later = page.getByRole("button", { name: "Nanti", exact: true });
  if (await later.isVisible({ timeout: 2000 }).catch(() => false)) {
    // Alasan sama dengan tombol "Mengerti" di atas: spanduk ini menempel di atas
    // dan bisa berada di luar viewport pada layar pendek.
    await later.evaluate((el: HTMLElement) => el.click());
  }
}

/**
 * Banner hasil aksi, **terlingkup pada teks yang ditunggu**.
 *
 * **Kenapa tidak `page.getByRole("status")` lagi (terukur 2026-10-17).** Layar
 * ini merender lebih dari satu region `status`: `App.tsx` punya banner kilat
 * (terbukti muncul sebagai *"1 foto lama diperkecil · hemat ±1 KB"* — perawatan
 * foto latar belakang) di samping banner hasil tagihan. Pencarian tanpa lingkup
 * karena itu gagal dengan *"strict mode violation: resolved to 2 elements"*,
 * dan kegagalannya terbaca seperti produk rusak padahal banner tagihannya benar.
 * Kelas kerusakan yang sama pernah tercatat 2026-10-07 (dua live region di satu
 * layar mematahkan `getByRole("status")`); yang belum diperbaiki adalah locator
 * tesnya, bukan komponennya.
 */
function bannerStatus(page: Page, teks: RegExp) {
  return page.getByRole("status").filter({ hasText: teks });
}

async function unlockFinance(page: Page) {
  if (!page.url().includes("/payments")) {
    // G3-02 #11: pintu nav bernama "Uang" sejak nav jadi tiga pintu. Judul
    // halamannya tetap "Keuangan" — yang berubah hanya label pintunya.
    await page.getByRole("link", { name: "Uang", exact: true }).click();
  }
  await closeChangelog(page);
  const pin = page.getByPlaceholder("PIN (6 digit)");
  // The fixture always enables a PIN. Use an assertion (auto-wait), not
  // locator.isVisible(), which is an immediate snapshot and can race the
  // initial live query while the screen still shows its skeleton.
  await expect(pin).toBeVisible({ timeout: 30_000 });
  await pin.fill("123456");
  await expect(pin).toHaveValue("123456");
  await page.getByRole("button", { name: "Buka", exact: true }).click();
  await expect(pin).toBeHidden({ timeout: 30_000 });
  await expect(page.getByText("PIN salah.", { exact: true })).toBeHidden();
  await expect(page.getByText(/Tunggu \d+ detik\./)).toBeHidden();
  await closeBackupNag(page);
  const tagihanTab = page.getByRole("tab", { name: /Tagih/ });
  if (await tagihanTab.isVisible({ timeout: 5000 }).catch(() => false)) {
    if ((await tagihanTab.getAttribute("aria-selected")) !== "true") await tagihanTab.click();
  }
}

test("menerbitkan, melihat, dan membatalkan invoice tepat N", async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/payments?tab=tagihan", { waitUntil: "domcontentloaded" });
  // Dev seeding is lazy-loaded after React mounts. Wait for the deterministic
  // fixture before unlocking so its settings write cannot remount the PIN gate.
  await page.waitForFunction(() => (
    typeof (window as Window & { seedDummy?: unknown }).seedDummy === "function"
  ));
  await page.waitForFunction(async () => new Promise<boolean>((resolve, reject) => {
    const request = indexedDB.open("jurnalles");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction("students", "readonly");
      const students = transaction.objectStore("students");
      const rows = students.getAll();
      rows.onsuccess = () => {
        database.close();
        resolve(rows.result.some((student: { name?: string }) => student.name === "Citra Dewanti"));
      };
      rows.onerror = () => {
        database.close();
        reject(rows.error);
      };
    };
  }));
  await unlockFinance(page);
  // Filter tahap default adalah "Belum dibayar", sedangkan "Tagihan per
  // Pertemuan" (beserta antrean paket) hanya tampil pada tahap "Siap ditagih"
  // atau "Tampilkan semua langkah". Semua langkah dibuka sekaligus supaya daftar
  // invoice yang sudah terbit tetap terlihat saat pembatalan diuji di bawah.
  await page.getByRole("button", { name: "Tampilkan semua langkah", exact: true }).click();
  await expect(page.getByText("Tagihan per Pertemuan", { exact: true })).toBeVisible({ timeout: 30_000 });
  // Antrean paket ada di region "Tagihan per Pertemuan". Lingkup region dipakai
  // karena panel pemulihan "Tagihan dibatalkan" juga memakai <article> dan ikut
  // memuat nama murid setelah tagihan dibatalkan.
  const queueCard = page.getByRole("region", { name: "Tagihan per Pertemuan" })
    .locator("article", { hasText: "Citra Dewanti" });
  await expect(queueCard).toContainText("Paket siap");
  await expect(queueCard.getByRole("progressbar")).toHaveAttribute("aria-valuemax", "2");
  await queueCard.getByRole("button", { name: /Terbitkan paket 2 pertemuan untuk Citra Dewanti/i }).click();
  await page.getByRole("dialog", { name: "Terbitkan Tagihan Paket" }).getByRole("button", { name: "Terbitkan", exact: true }).click();
  await expect(bannerStatus(page, /berhasil diterbitkan/)).toBeVisible({ timeout: 10_000 });
  // Baris invoice yang baru terbit: nama aksesibelnya memuat asal "Paket" dan
  // cakupan "2 pertemuan". Chip "Paket 2 pertemuan" sendiri baru dirender di
  // dalam baris setelah baris dibuka (lihat InvoiceRow).
  const invoiceRow = page.locator("li", { hasText: "Citra Dewanti" }).first();
  await expect(invoiceRow.getByRole("button", { name: /Paket 2 pertemuan/i })).toBeVisible();

  await page.setViewportSize({ width: 320, height: 740 });
  await expect(page.getByText("Tagihan per Pertemuan", { exact: true })).toBeVisible();
  const metrics = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    body: document.body.scrollWidth,
    root: document.documentElement.scrollWidth,
  }));
  expect(metrics.body).toBeLessThanOrEqual(metrics.viewport);
  expect(metrics.root).toBeLessThanOrEqual(metrics.viewport);

  // Aksi baris (unduh invoice, batalkan) baru muncul setelah baris dibuka —
  // dulu ada tombol pintas "📄 Invoice".
  await invoiceRow.getByRole("button", { name: /Citra Dewanti/ }).click();
  await invoiceRow.getByRole("button", { name: "Unduh invoice PDF" }).click();
  await expect(page.getByRole("dialog", { name: "Rincian Les" })).toBeVisible();
  const invoiceMetrics = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    body: document.body.scrollWidth,
    root: document.documentElement.scrollWidth,
  }));
  expect(invoiceMetrics.body).toBeLessThanOrEqual(invoiceMetrics.viewport);
  expect(invoiceMetrics.root).toBeLessThanOrEqual(invoiceMetrics.viewport);
  await page.getByRole("button", { name: "Tutup", exact: true }).click();

  await invoiceRow.getByRole("button", { name: "Batalkan tagihan paket", exact: true }).click();
  await page.getByRole("dialog", { name: "Batalkan tagihan paket?" }).getByRole("button", { name: "Batalkan", exact: true }).click();
  // D4 (TASK-10): pembatalan tagihan wajib PIN Keuangan. Sheet konfirmasi sudah
  // tertutup pada titik ini, sehingga dialog dengan judul sama adalah modal PIN.
  const pinDialog = page.getByRole("dialog", { name: "Batalkan tagihan paket?" });
  await pinDialog.getByPlaceholder("PIN", { exact: true }).fill("123456");
  await pinDialog.getByRole("button", { name: "Batalkan", exact: true }).click();
  await expect(bannerStatus(page, /dikembalikan ke antrean/)).toBeVisible({ timeout: 10_000 });
  await expect(queueCard).toContainText("Paket siap");
  expect(errors).toEqual([]);
});
