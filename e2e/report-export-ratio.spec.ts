/**
 * D-2 (docs/UI-UX-ANALYSIS.md): export laporan per rasio untuk layout
 * representatif — 3 layout (Cards=classic, Infografis Expert=modern,
 * Analitik=analytic) × 3 format:
 *   - JPG  → rasio 3:4 (state default, ramah WhatsApp)
 *   - PNG  → rasio 3:4
 *   - PDF  → otomatis memaksa rasio "auto" lalu restore (useReportExport)
 * Verifikasi per skenario: event download terhasil dengan ekstensi benar,
 * tombol kembali enabled (export selesai), tanpa pesan "Gagal ekspor", dan
 * tanpa pageerror (font-embed timeout / overflow detection tidak boleh crash).
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

const REPRESENTATIVE_LAYOUTS = ["Cards", "Infografis Expert", "Analitik"];

for (const layoutName of REPRESENTATIVE_LAYOUTS) {
  test(`export JPG+PNG+PDF pada layout "${layoutName}" tanpa error (3:4 & auto)`, async ({ page }) => {
    test.setTimeout(300_000); // 9x rasterisasi + font embed butuh waktu

    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(String(err)));

    // ── Seed dummy & buka halaman laporan ────────────────────────────────
    await page.goto("/");
    await page.waitForTimeout(4000); // startup + auto-seed dev
    const seeded = await page.evaluate(async () => {
      const fn = (window as unknown as { seedDummy?: (force?: boolean) => Promise<unknown> }).seedDummy;
      if (typeof fn === "function") { await fn(true); return true; }
      return false;
    });
    expect(seeded).toBe(true);
    await page.waitForTimeout(1000);

    const andiId = await page.evaluate(async () => {
      const mod = await import("/src/db/repos.ts");
      const students = await mod.listStudents();
      const andi = students.find((s: { name: string }) => s.name === "Andi Pratama");
      return andi?.id ?? "";
    });
    expect(andiId).toBeTruthy();

    await page.goto("/report");
    await closeChangelog(page);
    await page.locator('input[type="month"]').fill("2026-06"); // seed: sesi Maret–Juni 2026
    await page.locator("select").first().selectOption(andiId);
    await page.getByRole("button", { name: /Buat Laporan|Update Laporan/ }).waitFor({ timeout: 5000 });
    await page.getByRole("button", { name: /Buat Laporan|Update Laporan/ }).click();
    await expect(page.locator("[data-report-page]").first()).toBeVisible({ timeout: 10_000 });

    // ── Ganti layout via chip di toolbar desain ─────────────────────────
    // `<details>` dikontrol state (open={designOpen}) — klik summary bisa
    // kalah race dengan re-render sehingga details tertutup lagi. Buka ulang
    // sampai chip layout benar-benar terlihat (maks 4 percobaan).
    const designDetails = page.locator("details").filter({ hasText: "🎨 Tema:" });
    const layoutChip = page.getByRole("button", { name: layoutName, exact: true });
    let chipVisible = await layoutChip.isVisible().catch(() => false);
    for (let attempt = 0; attempt < 4 && !chipVisible; attempt++) {
      await designDetails.locator("summary").click();
      try {
        await layoutChip.waitFor({ state: "visible", timeout: 4000 });
        chipVisible = true;
      } catch { /* details tertutup lagi — klik summary sekali lagi */ }
    }
    expect(chipVisible, `chip layout "${layoutName}" tidak muncul setelah membuka toolbar desain`).toBe(true);
    await layoutChip.click();
    await expect(page.getByText("Layout diganti!")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("[data-report-export-root] [data-report-page]").first()).toBeVisible({ timeout: 15_000 });

    // ── Export JPG (rasio 3:4) ───────────────────────────────────────────
    const jpgBtn = page.getByRole("button", { name: /JPG/ });
    let downloadPromise = page.waitForEvent("download", { timeout: 120_000 });
    await jpgBtn.click();
    const jpgDownload = await downloadPromise;
    expect(jpgDownload.suggestedFilename()).toMatch(/\.jpg$/);
    await expect(jpgBtn).toBeEnabled({ timeout: 120_000 }); // exporting selesai

    // ── Export PNG (rasio 3:4) ───────────────────────────────────────────
    const pngBtn = page.getByRole("button", { name: /PNG/ });
    downloadPromise = page.waitForEvent("download", { timeout: 120_000 });
    await pngBtn.click();
    const pngDownload = await downloadPromise;
    expect(pngDownload.suggestedFilename()).toMatch(/\.png$/);
    await expect(pngBtn).toBeEnabled({ timeout: 120_000 });

    // ── Export PDF (rasio auto — hook memaksa auto lalu restore) ─────────
    const pdfBtn = page.getByRole("button", { name: /PDF/ });
    downloadPromise = page.waitForEvent("download", { timeout: 120_000 });
    await pdfBtn.click();
    const pdfDownload = await downloadPromise;
    expect(pdfDownload.suggestedFilename()).toMatch(/\.pdf$/);
    await expect(pdfBtn).toBeEnabled({ timeout: 120_000 });

    // ── Tidak boleh gagal / crash ────────────────────────────────────────
    await expect(page.getByText(/Gagal ekspor/)).toHaveCount(0);
    expect(pageErrors, pageErrors.join(" | ")).toEqual([]);
  });
}
