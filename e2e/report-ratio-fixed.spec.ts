/**
 * Regression: laporan bulanan rasio 3:4 tidak boleh memotong catatan sesi.
 * Paginasi berbasis jumlah buta bisa membuat isi halaman melebihi kotak
 * 3:4 — ReportRenderer harus menggeser entri ke halaman berikutnya (atau
 * membiarkan halaman tumbuh sebagai fallback) sehingga tidak ada konten
 * yang terpotong oleh overflow:hidden.
 */
import { test, expect, type Page } from "@playwright/test";

async function closeChangelog(page: Page) {
  try {
    const btn = page.getByText(/Mengerti|Terima Kasih/);
    if (await btn.isVisible({ timeout: 1500 })) {
      await btn.click();
      await page.waitForTimeout(300);
    }
  } catch { /* tidak ada modal */ }
}

test("rasio 3:4: catatan sesi panjang tidak terpotong (semua halaman muat)", async ({ page }) => {
  test.setTimeout(120_000);

  await page.goto("/");
  await page.waitForTimeout(4000); // startup + auto-seed dev

  const andiId = await page.evaluate(async () => {
    const fn = (window as unknown as { seedDummy?: (force?: boolean) => Promise<unknown> }).seedDummy;
    if (typeof fn === "function") { await fn(true); }
    const mod = await import("/src/db/repos.ts");
    const students = await mod.listStudents();
    const andi = students.find((s: { name: string }) => s.name === "Andi Pratama");
    return andi?.id ?? "";
  });
  expect(andiId).toBeTruthy();
  await page.waitForTimeout(1000);

  await page.goto("/report");
  await closeChangelog(page);
  await page.locator('input[type="month"]').fill("2026-06");

  // Narasi panjang untuk SEMUA sesi Andi Juni → halaman 3:4 pasti meluap
  // bila paginasi tetap berbasis jumlah.
  const longNarrative = "Catatan sesi ini sengaja dibuat sangat panjang untuk menguji apakah teks terpotong di rasio 3:4. ".repeat(8);
  await page.evaluate(async ({ id, narrative }) => {
    const mod = await import("/src/db/repos.ts");
    const sessions = await mod.listSessionsByStudentRange(id, "2026-06-01", "2026-06-30");
    if (sessions.length === 0) throw new Error("tidak ada sesi Andi Juni 2026 di seed");
    for (const s of sessions) await mod.updateSession(s.id, { narrative: narrative + s.narrative });
  }, { id: andiId, narrative: longNarrative });

  await page.locator("select").first().selectOption(andiId);
  await page.getByRole("button", { name: /Buat Laporan|Update Laporan/ }).waitFor({ timeout: 5000 });
  await page.getByRole("button", { name: /Buat Laporan|Update Laporan/ }).click();
  await expect(page.locator("[data-report-page]").first()).toBeVisible({ timeout: 10_000 });

  // Tunggu rebalance selesai: ukuran halaman stabil antar dua pengukuran.
  let last: number[] = [];
  for (let attempt = 0; attempt < 40; attempt++) {
    await page.waitForTimeout(400);
    const now = await page.evaluate(() => {
      const pages = Array.from(document.querySelectorAll<HTMLElement>("[data-report-export-root] [data-report-page]"));
      return pages.map((p) => p.scrollHeight - Math.round(p.offsetWidth * 4 / 3));
    });
    if (JSON.stringify(now) === JSON.stringify(last)) break;
    last = now;
  }

  const pages = await page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-report-export-root] [data-report-page]"));
    return nodes.map((p) => ({
      id: p.id,
      grow: p.classList.contains("report-page-grow"),
      clientH: p.clientHeight,
      scrollH: p.scrollHeight,
      boxH: Math.round(p.offsetWidth * 4 / 3),
    }));
  });

  // Setiap halaman harus menampilkan seluruh isinya (tidak terpotong):
  // scrollHeight ≤ tinggi terlihat. Halaman yang dibiarkan tumbuh juga
  // memenuhi ini karena tingginya mengikuti isi.
  for (const pageInfo of pages) {
    expect(pageInfo.scrollH, `halaman ${pageInfo.id} tidak boleh terpotong`).toBeLessThanOrEqual(pageInfo.clientH + 2);
  }
  // Semua halaman isi yang normal memakai kotak 3:4 persis.
  const nonGrow = pages.filter((p) => !p.grow);
  expect(nonGrow.length).toBeGreaterThan(0);
  for (const pageInfo of nonGrow) {
    expect(pageInfo.clientH, `halaman ${pageInfo.id} memakai kotak 3:4`).toBe(pageInfo.boxH);
  }

  // Export JPG tetap berhasil dengan rasio 3:4.
  const downloadPromise = page.waitForEvent("download", { timeout: 60_000 });
  await page.getByRole("button", { name: /JPG/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.jpg$/);
});
