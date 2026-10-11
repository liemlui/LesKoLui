import { test, expect, type Page } from "@playwright/test";
import path from "node:path";

/**
 * Fase C/D "Rencana Ketahanan Data" — verifikasi **runtime PWA** pada build produksi.
 *
 * Dua hal yang tidak bisa dibuktikan di unit test (`fake-indexeddb`) maupun di
 * Vite dev (SW dimatikan):
 * 1. Service worker produksi benar-benar mengontrol halaman dan aplikasi tetap
 *    terbuka — termasuk rute lazy — saat perangkat offline.
 * 2. Restore dari file `.jles` hasil aplikasi sendiri benar-benar berjalan di
 *    runtime: divalidasi, mengganti seluruh data, dan draf lokal dibersihkan.
 *
 * Jalankan `npm.cmd run build` lebih dulu; config `playwright.sw.config.ts`
 * melayani `dist/` di http://localhost:4174.
 */

const PIN = "135790";
const PASS = "kata-sandi-uji-pwa-2026";
const STUDENT_IN_BACKUP = "Murid Sebelum Backup";
const STUDENT_AFTER_BACKUP = "Murid Sesudah Backup";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    // Ajakan backup mingguan & changelog mengganggu alur; backup ditandai sudah
    // ditanya, changelog ditutup setelah tampil (tombolnya beranimasi).
    localStorage.setItem("leskolui_last_auto_backup_prompt", String(Date.now()));
  });
});

async function dismissChangelog(page: Page) {
  const dialog = page.getByRole("dialog", { name: "Catatan perubahan" });
  try {
    await dialog.waitFor({ state: "visible", timeout: 8000 });
    await dialog.getByRole("button", { name: /Mengerti/ }).click({ timeout: 8000 });
    await expect(dialog).toBeHidden({ timeout: 8000 });
  } catch {
    // tidak ada changelog (sudah pernah dilihat di context ini)
  }
}

/**
 * Bagian Pengaturan memakai accordion: hanya satu yang terbuka pada satu waktu.
 * Ditambatkan pada `data-bagian` (bukan teks judul), karena judul bagian berubah
 * di G3-09 butir 4 — dulu "Backup & Restore", sekarang "Backup dan Restore".
 */
async function openSettingsSection(page: Page, id: string) {
  const header = page.locator(`[data-bagian="${id}"] button`).first();
  await expect(header).toBeVisible({ timeout: 30_000 });
  if ((await header.getAttribute("aria-expanded")) !== "true") await header.click();
  await expect(header).toHaveAttribute("aria-expanded", "true");
}

async function createFinancialPin(page: Page) {
  await page.goto("/settings");
  await dismissChangelog(page);
  await openSettingsSection(page, "pin");
  await page.getByRole("button", { name: "Buat PIN" }).click();
  await page.locator("#set-pin-baru").fill(PIN);
  await page.locator("#set-pin-konfirmasi").fill(PIN);
  await page.locator("#set-sec-q").fill("Nama hewan peliharaan?");
  await page.locator("#set-sec-a").fill("kucing");
  await page.getByRole("button", { name: "Simpan PIN" }).click();
  await expect(page.getByText("PIN berhasil diperbarui ✓")).toBeVisible({ timeout: 20_000 });
}

async function createStudent(page: Page, name: string, phone: string) {
  await page.goto("/students");
  await dismissChangelog(page);
  await page.getByRole("button", { name: /Tambah [Mm]urid/ }).first().click();
  await page.locator("#name").fill(name);
  await page.locator("#phone").fill(phone);
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(page.locator("#name")).toBeHidden({ timeout: 20_000 });
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 20_000 });
}

async function confirmWithPin(page: Page, title: string, confirmLabel: string) {
  const dialog = page.getByRole("dialog", { name: title });
  await expect(dialog).toBeVisible({ timeout: 20_000 });
  await dialog.getByPlaceholder("PIN").fill(PIN);
  await dialog.getByRole("button", { name: confirmLabel, exact: true }).click();
  await expect(dialog).toBeHidden({ timeout: 60_000 });
}

test("build produksi: service worker mengontrol halaman & app tetap terbuka saat offline", async ({ page, context }) => {
  test.setTimeout(120_000);

  await page.goto("/");
  await dismissChangelog(page);
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  // Instalasi pertama belum mengontrol halaman (tanpa clientsClaim) — muat ulang
  // sekali supaya navigasi dilayani service worker.
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)), { timeout: 30_000 })
    .toBe(true);

  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: "Murid" })).toBeVisible({ timeout: 30_000 });

  // Rute lazy juga harus tersedia dari precache saat offline.
  await page.getByRole("link", { name: "Murid" }).click();
  await expect(page).toHaveURL(/\/students$/);
  await expect(page.getByRole("button", { name: /Tambah [Mm]urid/ }).first())
    .toBeVisible({ timeout: 30_000 });

  await context.setOffline(false);
});

test("build produksi: restore dari file .jles mengganti seluruh data di runtime", async ({ page }) => {
  test.setTimeout(300_000);

  await createFinancialPin(page);
  await createStudent(page, STUDENT_IN_BACKUP, "081200000001");

  // ── Ekspor backup lewat UI (file .jles terenkripsi) ────────────────────
  await page.goto("/settings");
  await openSettingsSection(page, "backup");
  await page.locator("#set-backup-pass").fill(PASS);
  const downloadPromise = page.waitForEvent("download", { timeout: 120_000 });
  await page.getByRole("button", { name: /Backup ke File/ }).click();
  await confirmWithPin(page, "Konfirmasi Backup", "Ekspor");
  const backupFile = path.join(test.info().outputDir, "backup-e2e.jles");
  await (await downloadPromise).saveAs(backupFile);

  // Data berubah setelah backup → restore harus mengembalikan keadaan saat backup.
  await createStudent(page, STUDENT_AFTER_BACKUP, "081200000002");

  // ── Restore dari file ──────────────────────────────────────────────────
  await page.goto("/settings");
  await openSettingsSection(page, "backup");
  await page.locator("#set-restore-file").setInputFiles(backupFile);
  await page.locator("#set-backup-pass").fill(PASS);
  await page.getByRole("button", { name: /Restore dari File/ }).click();

  /**
   * G3-09 butir 7: konfirmasi restore bukan lagi `confirm()` bawaan peramban,
   * melainkan dialog internal yang menyebut berkas dan ukurannya. Dialog itu
   * muncul SEBELUM PIN, dan itu memang urutan yang diminta.
   */
  const ringkasan = page.getByRole("dialog", { name: "Pulihkan dari berkas ini?" });
  await expect(ringkasan).toBeVisible({ timeout: 20_000 });
  await expect(ringkasan.getByText(/Ukuran berkas/)).toBeVisible();
  await ringkasan.getByRole("button", { name: "Ya, pulihkan" }).click();

  await confirmWithPin(page, "Konfirmasi Restore", "Restore");

  // Restore mengunduh cadangan pra-restore, lalu memuat ulang halaman otomatis.
  await expect(page.getByText(/Restore berhasil/)).toBeVisible({ timeout: 120_000 });
  await page.waitForURL(/\/settings/, { timeout: 60_000 });

  await page.goto("/students");
  await expect(page.getByText(STUDENT_IN_BACKUP)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(STUDENT_AFTER_BACKUP)).toHaveCount(0);
});
