/**
 * E2E: alur laporan bulanan — buat laporan, pratinjau ter-render,
 * export JPG menghasilkan file (font embedding tidak boleh menggagalkan export).
 */
import {
  test, expect, muridYangBisaDirekap, pilihMuridDanTungguSiap, bukaDenganDataBersih, ringkasKonsol,
} from "./fixtures";
import { type Page } from "@playwright/test";

async function closeChangelog(page: Page) {
  try {
    const btn = page.getByText(/Mengerti|Terima Kasih/);
    if (await btn.isVisible({ timeout: 1500 })) {
      await btn.click();
      await page.waitForTimeout(300);
    }
  } catch { /* tidak ada modal */ }
}

test("buat laporan lalu export JPG dan PDF berhasil tanpa error", async ({ page }) => {
  test.slow(); // rasterisasi + embed font butuh waktu

  /**
   * **Menunggu sinyal seed, bukan tidur 4 detik.**
   *
   * Versi sebelumnya membuka `/`, menunggu 4 detik, lalu memanggil `seedDummy()`.
   * Itu dua risiko sekaligus: (a) bila seed otomatis belum selesai, panggilan
   * `seedDummy()` **tidak melakukan apa pun** karena seeder punya penjaga
   * anti-pemanggilan-ganda, sehingga tes bekerja di atas data setengah jadi;
   * (b) saat mesin sibuk (suite penuh) 4 detik tidak cukup, dan kegagalannya
   * muncul di tempat lain sebagai "tombol tidak siap".
   */
  const { pesan, selesai } = await bukaDenganDataBersih(page, { paksa: true });
  expect(selesai, `seed DEV tidak selesai. Jejak konsol terakhir: ${ringkasKonsol(pesan)}`).toBe(true);

  await page.goto("/report");
  await closeChangelog(page);

  // Seed berisi sesi Maret–Juni 2026 → pilih bulan Juni
  await page.locator('input[type="month"]').fill("2026-06");

  // Pilih murid yang periodenya benar-benar bisa direkap. Kandidatnya ditentukan
  // dari DATA (punya sesi selesai di bulan itu, belum punya laporan), bukan dari
  // batas waktu UI — lihat catatan di `muridYangBisaDirekap`.
  const muridId = await muridYangBisaDirekap(page, "2026-06");
  expect(muridId, "tidak ada murid dengan periode yang bisa direkap di seed").toBeTruthy();
  await pilihMuridDanTungguSiap(page, muridId!);

  // Buat / update laporan → pratinjau harus ter-render
  await page.getByRole("button", { name: /Buat Laporan|Update Laporan/ }).click();
  await expect(page.locator("[data-report-page]").first()).toBeVisible({ timeout: 10_000 });

  // Regression: export harus memakai preview yang terlihat. Render tersembunyi
  // berlebar tetap pernah membuat rasio kotak foto berubah dan crop jadi parah.
  const exportRoot = page.locator("[data-report-export-root]");
  await expect(exportRoot).toBeVisible();
  await expect(exportRoot.locator("[data-report-page]").first()).toBeVisible();
  await expect(page.locator('[aria-hidden="true"] [data-report-page]')).toHaveCount(0);

  // Export JPG → harus menghasilkan download (share API tak ada di chromium headless)
  const downloadPromise = page.waitForEvent("download", { timeout: 45_000 });
  await page.getByRole("button", { name: /JPG/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.jpg$/);

  // Tunggu seluruh halaman JPG selesai agar event download berikutnya pasti PDF.
  const pdfButton = page.getByRole("button", { name: /PDF/ });
  await expect(pdfButton).toBeEnabled({ timeout: 45_000 });
  const pdfDownloadPromise = page.waitForEvent("download", { timeout: 45_000 });
  await pdfButton.click();
  const pdfDownload = await pdfDownloadPromise;
  expect(pdfDownload.suggestedFilename()).toMatch(/\.pdf$/);

  // Tidak boleh muncul pesan gagal
  await expect(page.getByText(/Gagal ekspor/)).toHaveCount(0);
});

test("rencana bulan depan tersimpan dan ikut tampil di pratinjau", async ({ page }) => {
  // Sama seperti tes pertama: tunggu sinyal seed, bukan tidur.
  const { pesan, selesai } = await bukaDenganDataBersih(page, { paksa: true });
  expect(selesai, `seed DEV tidak selesai. Jejak konsol terakhir: ${ringkasKonsol(pesan)}`).toBe(true);
  await page.goto("/report");
  await closeChangelog(page);
  await page.locator('input[type="month"]').fill("2026-06");

  /**
   * **Kandidat ditentukan dari data, bukan dengan mencoba opsi di layar.**
   *
   * Versi sebelumnya — yang ada di sini sampai 2026-10-17 — mencoba tiap murid
   * dengan `toBeEnabled({ timeout: 2500 })`. Pola itu tidak bisa membedakan
   * "belum siap" dari "memang tidak bisa direkap", dan pada suite penuh ia gagal
   * di tempat yang menyesatkan. Kandidatnya juga tidak perlu ditebak: syarat yang
   * dipakai aplikasi (punya sesi selesai di bulan itu, belum punya laporan)
   * dibaca langsung dari sumber yang sama lewat `muridYangBisaDirekap`.
   */
  const muridId = await muridYangBisaDirekap(page, "2026-06");
  expect(muridId, "tidak ada murid dengan periode yang bisa direkap di seed").toBeTruthy();
  await pilihMuridDanTungguSiap(page, muridId!);

  await page.getByRole("button", { name: /Buat Laporan|Update Laporan/ }).click();
  await expect(page.locator("[data-report-page]").first()).toBeVisible({ timeout: 10_000 });

  await page.getByRole("button", { name: /Fokus & Rencana Berikutnya/ }).click();
  await page.getByRole("button", { name: /Susun Rencana/ }).click();
  await page.getByPlaceholder("Contoh: Matematika AA").fill("Matematika AA");
  await page.getByPlaceholder("Contoh: Menyelesaikan 8 dari 10 soal fungsi kuadrat dengan langkah lengkap.")
    .fill("Menyelesaikan 8 dari 10 soal fungsi kuadrat dengan langkah lengkap.");
  await page.getByRole("button", { name: "Simpan Rencana" }).click();

  await expect(page.getByText("Menyelesaikan 8 dari 10 soal fungsi kuadrat dengan langkah lengkap.")).toHaveCount(2);
});
