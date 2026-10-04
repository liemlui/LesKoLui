/**
 * Regression: catatan sesi panjang tidak boleh terpotong di halaman laporan.
 *
 * Rasio halaman tetap 3:4 **DIHAPUS** pemilik 2026-10-01 (`src/index.css`), jadi
 * halaman laporan kini bertinggi otomatis mengikuti isinya. Yang diuji di sini
 * bukan lagi bentuk kotaknya, melainkan janji ke tutor: **tidak ada isi yang
 * terpotong** — dan ekspor tetap berhasil.
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

test("catatan sesi panjang tidak terpotong (halaman bertinggi otomatis)", async ({ page }) => {
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

  // Narasi panjang untuk SEMUA sesi Andi Juni → isi halaman pasti meluap bila
  // paginasi tetap berbasis jumlah buta.
  const longNarrative = "Catatan sesi ini sengaja dibuat sangat panjang untuk menguji apakah teks terpotong di rasio 3:4. ".repeat(8);
  // Auto-seed dev berjalan asinkron; `seedDummy(true)` bisa kembali sebelum
  // sesi Juni benar-benar tertulis. Dulu baris ini `throw` dan membuat spec
  // gagal acak ("tidak ada sesi Andi Juni 2026 di seed") — sekarang menunggu
  // terbatas (maks 15 dtk) lalu gagal dengan pesan yang sama bila memang kosong.
  const narrativeApplied = await page.evaluate(async ({ id, narrative }) => {
    const mod = await import("/src/db/repos.ts");
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const sessions = await mod.listSessionsByStudentRange(id, "2026-06-01", "2026-06-30");
      if (sessions.length > 0) {
        for (const s of sessions) await mod.updateSession(s.id, { narrative: narrative + s.narrative });
        return sessions.length;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    return 0;
  }, { id: andiId, narrative: longNarrative });
  expect(narrativeApplied, "tidak ada sesi Andi Juni 2026 di seed").toBeGreaterThan(0);

  await page.locator("select").first().selectOption(andiId);
  await page.getByRole("button", { name: /Buat Laporan|Update Laporan/ }).waitFor({ timeout: 5000 });
  await page.getByRole("button", { name: /Buat Laporan|Update Laporan/ }).click();
  await expect(page.locator("[data-report-page]").first()).toBeVisible({ timeout: 10_000 });

  // Tunggu paginasi selesai: stabilitas tinggi halaman saja tidak cukup,
  // karena ReportRenderer mengukur ulang setelah font tema selesai dimuat.
  let lastSignature = "";
  for (let attempt = 0; attempt < 40; attempt++) {
    await page.waitForTimeout(400);
    const signature = await page.evaluate(() => Array.from(
      document.querySelectorAll<HTMLElement>("[data-report-export-root] [data-report-page]"),
    ).map((p) => `${p.id}:${p.scrollHeight}`).join("|"));
    const settled = signature === lastSignature && signature.length > 0;
    lastSignature = signature;
    if (settled) break;
  }

  const pages = await page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-report-export-root] [data-report-page]"));
    return nodes.map((p) => ({
      id: p.id,
      clientH: p.clientHeight,
      scrollH: p.scrollHeight,
    }));
  });

  // Setiap halaman harus menampilkan seluruh isinya (tidak terpotong):
  // scrollHeight ≤ tinggi terlihat.
  for (const pageInfo of pages) {
    expect(pageInfo.scrollH, `halaman ${pageInfo.id} tidak boleh terpotong`).toBeLessThanOrEqual(pageInfo.clientH + 2);
    expect(pageInfo.clientH, `halaman ${pageInfo.id} harus punya tinggi`).toBeGreaterThan(0);
  }
  // CATATAN (2026-10-04): asersi lama "setiap halaman memakai kotak 3:4 persis"
  // DIHAPUS — rasio halaman tetap 3:4 memang dibatalkan pemilik 2026-10-01
  // (`src/index.css`: "Rasio halaman tetap 3:4 DIHAPUS … semua halaman laporan
  // kini bertinggi otomatis mengikuti isinya"), dan kelas `.report-page-grow`
  // ikut dihapus sehingga `boxH` tidak lagi relevan. Yang tetap berlaku — dan
  // justru inilah yang penting bagi tutor — adalah tidak ada isi yang terpotong.

  // Export JPG tetap berhasil (halaman bertinggi otomatis, bukan kotak potret).
  const downloadPromise = page.waitForEvent("download", { timeout: 60_000 });
  await page.getByRole("button", { name: /JPG/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.jpg$/);
});
