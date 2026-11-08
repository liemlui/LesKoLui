import type { Page } from "@playwright/test";
import { expect, test, rekamKonsol, ringkasKonsol, tungguSeedSelesai } from "./fixtures";

/**
 * Regresi pemilik 2026-11-06: jadwal dipindah ke murid lain, tetapi nominal sesi
 * masih memakai angka murid lama.
 *
 * Unit test sudah membuktikan aturan repository. Berkas ini menjaga bagian yang
 * hanya bisa dibuktikan di browser: pilihan terlihat, bawaannya tarif murid baru,
 * dan pilihan itu benar-benar mengubah baris `sessions` di IndexedDB.
 */
const MURID_LAMA = "E2E Tarif Lama";
const MURID_BARU = "E2E Tarif Baru";
const ID_LAMA = "e2e-tarif-lama";
const ID_BARU = "e2e-tarif-baru";
const RATE_LAMA = 200_000;
const RATE_BARU = 300_000;

interface OpsiSesi {
  id: string;
  override: number | null;
  namaLama?: string;
  namaBaru?: string;
}

/**
 * Tambahkan dua murid dan satu jadwal hari ini setelah seed dev selesai.
 * `costOverride: null` sengaja bisa disuntikkan karena bug yang diperbaiki
 * memperlakukan `null` sebagai nominal manual, padahal artinya otomatis.
 */
async function seedJadwalPindah(page: Page, opsi: OpsiSesi) {
  await page.evaluate(({ id, override, idLama, idBaru, namaLama, namaBaru, rateLama, rateBaru }) => {
    const today = (() => {
      const p = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit",
      }).formatToParts(new Date());
      const m = Object.fromEntries(p.filter((x) => x.type !== "literal").map((x) => [x.type, x.value]));
      return `${m.year}-${m.month}-${m.day}`;
    })();
    return new Promise<void>((resolve, reject) => {
      const req = indexedDB.open("jurnalles");
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(["students", "sessions"], "readwrite");
        const now = new Date().toISOString();
        tx.objectStore("students").put({
          id: idLama, name: namaLama, level: "SMA", subjects: ["Math"],
          parentContact: { name: "Orang Tua Lama", phone: "0800000001" },
          hourlyRate: rateLama, billingPolicy: "monthly", active: true,
          enrolledAt: "2026-01-01",
        });
        tx.objectStore("students").put({
          id: idBaru, name: namaBaru, level: "SMA", subjects: ["Math"],
          parentContact: { name: "Orang Tua Baru", phone: "0800000002" },
          hourlyRate: rateBaru, billingPolicy: "monthly", active: true,
          enrolledAt: "2026-01-01",
        });
        tx.objectStore("sessions").put({
          id, studentId: idLama, date: today, time: "10:00", durationHours: 2,
          subjects: ["Math"], shortNote: "", status: "SCHEDULED",
          rateSnapshot: rateLama, cost: override ?? rateLama * 2, costOverride: override,
          createdAt: now, updatedAt: now,
        });
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
      };
    });
  }, {
    id: opsi.id, override: opsi.override,
    idLama: ID_LAMA, idBaru: ID_BARU,
    namaLama: opsi.namaLama ?? MURID_LAMA, namaBaru: opsi.namaBaru ?? MURID_BARU,
    rateLama: RATE_LAMA, rateBaru: RATE_BARU,
  });
}

async function bacaSesi(page: Page, id: string) {
  return page.evaluate((sessionId) => new Promise<{
    studentId: string; rateSnapshot: number; cost: number; costOverride?: number | null;
  }>((resolve, reject) => {
    const req = indexedDB.open("jurnalles");
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction("sessions", "readonly");
      const get = tx.objectStore("sessions").get(sessionId);
      get.onsuccess = () => { db.close(); resolve(get.result); };
      get.onerror = () => { db.close(); reject(get.error); };
    };
  }), id);
}

async function siapkan(page: Page) {
  const pesan: string[] = rekamKonsol(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const selesai = await tungguSeedSelesai(page, pesan);
  expect(selesai, `Seed dev tidak selesai. Jejak: ${ringkasKonsol(pesan)}`).toBe(true);

  const mengerti = page.getByRole("button", { name: /Mengerti/ });
  if (await mengerti.isVisible({ timeout: 3000 }).catch(() => false)) {
    await mengerti.evaluate((el: HTMLElement) => el.click());
  }
}

async function bukaKelolaSesi(page: Page, namaMurid = MURID_LAMA) {
  await page.goto("/");
  const tombol = page.getByRole("button").filter({ hasText: namaMurid }).first();
  await expect(tombol).toBeVisible({ timeout: 20_000 });
  await tombol.click();
  const dialog = page.getByRole("dialog", { name: "Kelola sesi" });
  await expect(dialog).toBeVisible();
  return dialog;
}

test("pilihan bawaan memakai tarif murid baru dan melepas nominal manual", async ({ page }) => {
  await siapkan(page);
  await seedJadwalPindah(page, { id: "e2e-tarif-default", override: 175_000 });
  const dialog = await bukaKelolaSesi(page);

  await dialog.getByLabel("Murid").selectOption(ID_BARU);
  const tarifBaru = dialog.getByRole("radio", { name: /Pakai tarif murid baru/ });
  await expect(tarifBaru).toBeChecked();
  await expect(dialog.getByText("Nominal sesi setelah pindah", { exact: true })).toBeVisible();

  await dialog.getByRole("button", { name: "Simpan perubahan" }).last().click();
  await page.getByRole("button", { name: "Ya, pakai tarif baru" }).click();
  await expect(page.getByText("Jadwal diperbarui ✓", { exact: true })).toBeVisible();

  const hasil = await bacaSesi(page, "e2e-tarif-default");
  expect(hasil.studentId).toBe(ID_BARU);
  expect(hasil.rateSnapshot).toBe(RATE_BARU);
  expect(hasil.cost).toBe(RATE_BARU * 2);
  expect(hasil.costOverride ?? null).toBeNull();
});

test("pilihan pertahankan nominal manual tidak mengubah nominal", async ({ page }) => {
  await siapkan(page);
  await seedJadwalPindah(page, { id: "e2e-tarif-manual", override: 175_000 });
  const dialog = await bukaKelolaSesi(page);

  await dialog.getByLabel("Murid").selectOption(ID_BARU);
  await dialog.getByRole("radio", { name: /Pertahankan nominal manual/ }).check();
  await dialog.getByRole("button", { name: "Simpan perubahan" }).last().click();
  await page.getByRole("button", { name: "Ya, ganti murid" }).click();
  await expect(page.getByText("Jadwal diperbarui ✓", { exact: true })).toBeVisible();

  const hasil = await bacaSesi(page, "e2e-tarif-manual");
  expect(hasil.studentId).toBe(ID_BARU);
  expect(hasil.rateSnapshot).toBe(RATE_BARU);
  expect(hasil.cost).toBe(175_000);
  expect(hasil.costOverride).toBe(175_000);
});

test("override null dianggap otomatis tanpa menampilkan pilihan nominal", async ({ page }) => {
  await siapkan(page);
  await seedJadwalPindah(page, { id: "e2e-tarif-null", override: null });
  const dialog = await bukaKelolaSesi(page);

  await dialog.getByLabel("Murid").selectOption(ID_BARU);
  await expect(dialog.getByRole("radio", { name: /Pakai tarif murid baru/ })).toHaveCount(0);
  await dialog.getByRole("button", { name: "Simpan perubahan" }).last().click();
  await page.getByRole("button", { name: "Ya, ganti murid" }).click();
  await expect(page.getByText("Jadwal diperbarui ✓", { exact: true })).toBeVisible();

  const hasil = await bacaSesi(page, "e2e-tarif-null");
  expect(hasil.studentId).toBe(ID_BARU);
  expect(hasil.rateSnapshot).toBe(RATE_BARU);
  expect(hasil.cost).toBe(RATE_BARU * 2);
  expect(hasil.costOverride ?? null).toBeNull();
});

test("nama murid sama tetap memunculkan konfirmasi pindah pemilik", async ({ page }) => {
  await siapkan(page);
  await seedJadwalPindah(page, {
    id: "e2e-tarif-nama-sama",
    override: 175_000,
    namaLama: "E2E Nama Sama",
    namaBaru: "E2E Nama Sama",
  });
  const dialog = await bukaKelolaSesi(page, "E2E Nama Sama");

  await dialog.getByLabel("Murid").selectOption(ID_BARU);
  await expect(dialog.getByText(/Murid diganti dari E2E Nama Sama ke murid lain bernama E2E Nama Sama/)).toBeVisible();
  await dialog.getByRole("button", { name: "Simpan perubahan" }).last().click();

  await expect(page.getByRole("button", { name: "Ya, pakai tarif baru" })).toBeVisible();
  await expect(page.getByText(/murid lain bernama E2E Nama Sama akan menjadi pemilik sesi ini/)).toBeVisible();
});
