/**
 * Buka kunci laporan final → draft (jalur perbaikan ketika laporannya yang salah).
 *
 * Alur yang diuji: laporan final tanpa tagihan → konfirmasi → PIN Keuangan →
 * laporan kembali draft + tercatat di audit. Seed dev membuat laporan Juni Andi
 * dalam keadaan final (tanpa field `status`, legacy) dan belum punya tagihan.
 */
import { expect, test, type Page } from "@playwright/test";

test.use({
  launchOptions: process.env.SYSTEM_CHROME_PATH
    ? { executablePath: process.env.SYSTEM_CHROME_PATH }
    : undefined,
});

async function closeChangelog(page: Page) {
  try {
    const button = page.getByText(/Mengerti|Terima Kasih/);
    if (await button.isVisible({ timeout: 1500 })) {
      await button.click();
      await page.waitForTimeout(300);
    }
  } catch { /* tidak ada modal */ }
}

test("buka kunci laporan final mengembalikannya menjadi draft (PIN-gated)", async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  const seedDone = page.waitForEvent("console", {
    predicate: (message) => /berhasil dimasukkan|seed dilewati/.test(message.text()),
    timeout: 60_000,
  });
  await page.goto("/");
  await seedDone;
  await page.evaluate(() => localStorage.setItem("leskolui-last-seen-version", "v1.41.0"));

  const ids = await page.evaluate(async () => {
    const mod = await import("/src/db/repos.ts");
    const students = await mod.listStudents();
    const andi = students.find((student: { name: string }) => student.name === "Andi Pratama");
    if (!andi) return null;
    const reports = await mod.listReportsByStudent(andi.id);
    const june = reports.find((report: { month: string }) => report.month === "2026-06");
    return june ? { reportId: june.id } : null;
  });
  expect(ids?.reportId).toBeTruthy();

  await page.goto(`/report?reportId=${encodeURIComponent(ids!.reportId)}`);
  await closeChangelog(page);

  const unlockButton = page.getByRole("button", { name: /Buka kunci laporan/ });
  await expect(unlockButton).toBeVisible({ timeout: 20_000 });

  await unlockButton.click();
  await page.getByRole("dialog", { name: "Buka kunci laporan final ini?" })
    .getByRole("button", { name: "Buka kunci", exact: true }).click();

  // D4: aksi destruktif wajib PIN Keuangan. Sheet konfirmasi sudah tertutup,
  // sehingga dialog dengan judul berbeda tipis adalah modal PIN.
  const pinDialog = page.getByRole("dialog", { name: "Buka kunci laporan final?" });
  await pinDialog.getByPlaceholder("PIN", { exact: true }).fill("123456");
  await pinDialog.getByRole("button", { name: "Buka kunci", exact: true }).click();

  // Laporan kini draft: banner status berubah dan tombol buka kunci hilang.
  await expect(page.getByText(/^Laporan: Draft/)).toBeVisible({ timeout: 20_000 });
  await expect(unlockButton).toBeHidden();

  const audit = await page.evaluate(async ({ reportId }) => {
    const { db } = await import("/src/db/db.ts");
    const entries = await db.auditLog.where("entityType").equals("report").toArray();
    return entries
      .filter((entry: { action: string; entityId: string }) => entry.action === "report.unlock" && entry.entityId === reportId)
      .map((entry: { details?: string }) => JSON.parse(entry.details ?? "{}"));
  }, { reportId: ids!.reportId });

  expect(audit).toHaveLength(1);
  expect(audit[0]).toMatchObject({ previousStatus: "confirmed", wasShared: false });
  expect(errors).toEqual([]);
});
