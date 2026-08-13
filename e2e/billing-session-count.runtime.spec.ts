import { test, expect, type Page } from "@playwright/test";

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
  if (await dialog.isVisible({ timeout: 5000 }).catch(() => false)) {
    await page.evaluate(() => localStorage.setItem("leskolui-last-seen-version", "v1.41.0"));
    await page.reload({ waitUntil: "domcontentloaded" });
  }
  await expect(dialog).toBeHidden({ timeout: 5000 });
}

async function closeBackupNag(page: Page) {
  const later = page.getByRole("button", { name: "Nanti", exact: true });
  if (await later.isVisible({ timeout: 2000 }).catch(() => false)) await later.click({ force: true });
}

async function unlockFinance(page: Page) {
  if (!page.url().includes("/payments")) {
    await page.getByRole("link", { name: "Keuangan", exact: true }).click();
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
  await expect(page.getByText("Tagihan per Pertemuan", { exact: true })).toBeVisible({ timeout: 30_000 });
  const queueCard = page.locator("article", { hasText: "Citra Dewanti" });
  await expect(queueCard).toContainText("Paket siap");
  await expect(queueCard.getByRole("progressbar")).toHaveAttribute("aria-valuemax", "2");
  page.once("dialog", (confirmation) => confirmation.accept());
  await queueCard.getByRole("button", { name: /Terbitkan paket 2 pertemuan untuk Citra Dewanti/i }).click();
  await expect(page.getByRole("status")).toContainText("berhasil diterbitkan");
  await expect(page.getByText("Paket 2 Pertemuan", { exact: true })).toBeVisible();

  await page.setViewportSize({ width: 320, height: 740 });
  await expect(page.getByText("Tagihan per Pertemuan", { exact: true })).toBeVisible();
  const metrics = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    body: document.body.scrollWidth,
    root: document.documentElement.scrollWidth,
  }));
  expect(metrics.body).toBeLessThanOrEqual(metrics.viewport);
  expect(metrics.root).toBeLessThanOrEqual(metrics.viewport);

  await page.getByRole("button", { name: "📄 Invoice" }).click();
  await expect(page.getByRole("dialog", { name: "Invoice Profesional" })).toBeVisible();
  const invoiceMetrics = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    body: document.body.scrollWidth,
    root: document.documentElement.scrollWidth,
  }));
  expect(invoiceMetrics.body).toBeLessThanOrEqual(invoiceMetrics.viewport);
  expect(invoiceMetrics.root).toBeLessThanOrEqual(invoiceMetrics.viewport);
  await page.getByRole("button", { name: "Tutup", exact: true }).click();

  page.once("dialog", (confirmation) => confirmation.accept());
  await page.getByRole("button", { name: "Batalkan Tagihan Paket" }).click();
  await expect(page.getByRole("status")).toContainText("dikembalikan ke antrean");
  await expect(queueCard).toContainText("Paket siap");
  expect(errors).toEqual([]);
});
