import { test, expect, type Page, type Locator } from "@playwright/test";

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

/**
 * Penjaga kolom "💰 Biaya" di modal **Edit Catatan Sesi** (tab Sesi murid).
 *
 * Kenapa e2e, bukan unit test: aturan pembacaan kolom (`bacaBiayaSesi`) dan
 * aturan penulisannya (`patchBiayaSesi`) sudah diuji di
 * `src/__tests__/sessionCostPatch.test.ts` — dan keduanya memang benar. Yang
 * tidak pernah teruji adalah **kolom itu sendiri**, karena repo ini tidak
 * memasang DOM (`sessionCostPatch.ts` bahkan menuliskan alasan itu di kepalanya).
 *
 * Tiga cacat nyata yang dijaga berkas ini (dilaporkan pemilik 2026-10-14):
 *
 * 1. kolom mengisi ulang dirinya sendiri saat dikosongkan, sebab `value`-nya
 *    nilai turunan yang jatuh balik ke `session.cost` selama teksnya kosong;
 * 2. akibatnya, mengetik nominal baru menyambung ke angka lama —
 *    "500000" + "250000" = "500000250000" — dan angka itu **tersimpan** sebagai
 *    nominal manual sesi (yang dibaca tagihan);
 * 3. menekan tombol durasi membuat sesi ber-nominal otomatis berubah menjadi
 *    sesi ber-nominal **manual**, padahal tutor tidak pernah mengetik nominal.
 *
 * Fixture `seedDummy` (DEV): Andi Pratama tarif 250.000/jam (bulanan, sesi 2j =
 * 500.000) dan Citra Dewanti paket per pertemuan (flat 200.000/pertemuan).
 */

const MURID_BULANAN = "Andi Pratama";
const MURID_PAKET = "Citra Dewanti";
const PIN_KEUANGAN = "123456";

interface BarisSesi {
  id: string;
  date: string;
  durasi: number;
  cost: number;
  /** `costOverride ?? null` — null berarti nominal otomatis. */
  override: number | null;
}

/** Tutup pengganggu yang mengambang: changelog, banner backup, nag mingguan. */
async function tutupPengganggu(page: Page) {
  const changelog = page.getByRole("dialog", { name: "Catatan perubahan" });
  const mengerti = changelog.getByRole("button", { name: /Mengerti/ });
  if (await mengerti.isVisible({ timeout: 5000 }).catch(() => false)) {
    await mengerti.click({ force: true });
    await expect(changelog).toBeHidden({ timeout: 5000 });
  }
  // Banner "Datamu belum pernah di-backup" menempel di atas layar dan bisa
  // menelan klik elemen di bawahnya (pernah terjadi pada tab dan tombol simpan).
  for (let i = 0; i < 3; i += 1) {
    const tutup = page.getByRole("button", { name: "Tutup peringatan" }).first();
    if (!(await tutup.isVisible({ timeout: 1000 }).catch(() => false))) break;
    await tutup.click({ force: true });
  }
  const nanti = page.getByRole("button", { name: "Nanti", exact: true });
  if (await nanti.isVisible({ timeout: 1000 }).catch(() => false)) await nanti.click({ force: true });
}

/** Tunggu seed DEV selesai — ditandai murid fixture benar-benar ada di DB. */
async function tungguFixture(page: Page, nama: string) {
  await page.waitForFunction(() => (
    typeof (window as Window & { seedDummy?: unknown }).seedDummy === "function"
  ));
  await page.waitForFunction((target: string) => new Promise<boolean>((resolve, reject) => {
    const request = indexedDB.open("jurnalles");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const rows = database.transaction("students", "readonly").objectStore("students").getAll();
      rows.onsuccess = () => {
        database.close();
        resolve(rows.result.some((s: { name?: string }) => s.name === target));
      };
      rows.onerror = () => { database.close(); reject(rows.error); };
    };
  }), nama);
}

async function idMurid(page: Page, nama: string): Promise<string> {
  return page.evaluate((target: string) => new Promise<string>((resolve, reject) => {
    const request = indexedDB.open("jurnalles");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const rows = database.transaction("students", "readonly").objectStore("students").getAll();
      rows.onsuccess = () => {
        database.close();
        const murid = rows.result.find((s: { name?: string }) => s.name === target) as { id?: string } | undefined;
        if (murid?.id) resolve(murid.id);
        else reject(new Error(`murid ${target} tidak ada di fixture`));
      };
      rows.onerror = () => { database.close(); reject(rows.error); };
    };
  }), nama);
}

/** Seluruh tabel `sessions` — dipakai untuk membuktikan apa yang BENAR-BENAR tersimpan. */
async function snapshotSesi(page: Page): Promise<BarisSesi[]> {
  return page.evaluate(() => new Promise<BarisSesi[]>((resolve, reject) => {
    const request = indexedDB.open("jurnalles");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const rows = database.transaction("sessions", "readonly").objectStore("sessions").getAll();
      rows.onsuccess = () => {
        database.close();
        resolve(rows.result.map((s: { id: string; date: string; durationHours: number; cost: number; costOverride?: number | null }) => ({
          id: s.id,
          date: s.date,
          durasi: s.durationHours,
          cost: s.cost,
          override: s.costOverride ?? null,
        })));
      };
      rows.onerror = () => { database.close(); reject(rows.error); };
    };
  }));
}

/**
 * Sesi yang **uangnya** berubah — sengaja bukan "semua field": perawatan foto
 * latar belakang (`runPhotoShrinkIfDue`) boleh menyentuh `updatedAt` sesi lama
 * kapan saja, dan itu bukan urusan berkas ini.
 */
function bedaUang(sebelum: BarisSesi[], sesudah: BarisSesi[]) {
  const lama = new Map(sebelum.map((s) => [s.id, s]));
  return sesudah
    .filter((s) => lama.has(s.id))
    .map((s) => ({ lama: lama.get(s.id)!, baru: s }))
    .filter(({ lama: a, baru: b }) => a.cost !== b.cost || a.override !== b.override || a.durasi !== b.durasi);
}

async function bukaMurid(page: Page, nama: string) {
  const id = await idMurid(page, nama);
  await page.goto(`/students/${id}`, { waitUntil: "domcontentloaded" });
  await tutupPengganggu(page);
  await expect(page.getByRole("tab", { name: "Sesi" })).toBeVisible({ timeout: 30_000 });
}

/** Buka kunci uang lewat gembok di blok Uang (PIN fixture = 123456). */
async function bukaKunciUang(page: Page) {
  const gembok = page.getByRole("button", { name: /Buka angka uang/ }).first();
  if (!(await gembok.isVisible({ timeout: 5000 }).catch(() => false))) return;
  await gembok.click();
  const sheet = page.getByRole("dialog", { name: "Buka angka uang" });
  await sheet.locator("#money-unlock-pin").fill(PIN_KEUANGAN);
  await sheet.getByRole("button", { name: "Buka", exact: true }).click();
  await expect(sheet).toBeHidden({ timeout: 20_000 });
  const salah = page.getByText("PIN salah.", { exact: true });
  await expect(salah).toBeHidden();
}

/** Modal Edit Catatan Sesi untuk kartu selesai pertama di tab Sesi. */
async function bukaModalSesi(page: Page, opsi: { editBiaya?: boolean } = {}) {
  await page.getByRole("tab", { name: "Sesi", exact: true }).click();
  const pensil = page.getByRole("button", { name: /^Edit catatan sesi/ }).first();
  await expect(pensil).toBeVisible({ timeout: 30_000 });
  await pensil.click();
  const modal = page.getByRole("dialog", { name: "Edit catatan sesi" });
  await expect(modal).toBeVisible({ timeout: 15_000 });

  // Baris "💰 Biaya" — pembungkus terdekat dari labelnya.
  const barisBiaya = modal.locator('div:has(> label:text-is("💰 Biaya"))').first();
  const tanggalSesi = await modal.getByText(/^\d{4}-\d{2}-\d{2} · /).first().innerText();

  if (opsi.editBiaya === false) return { modal, barisBiaya, tanggalSesi, input: null };

  await modal.locator('button[title="Edit biaya manual"]').click();
  const input = modal.locator('input[aria-label="Nominal biaya manual"]');
  await expect(input).toBeVisible();
  return { modal, barisBiaya, tanggalSesi, input };
}

async function simpanCatatan(page: Page, modal: Locator) {
  await modal.getByRole("button", { name: "Simpan Catatan" }).click();
  await expect(modal).toBeHidden({ timeout: 20_000 });
}

/** Kosongkan kolom seperti tutor: pilih semua lalu hapus. */
async function kosongkanKolom(page: Page, input: Locator) {
  await input.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Delete");
}

test("kolom biaya manual tetap kosong saat isinya dihapus semua", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await tungguFixture(page, MURID_BULANAN);
  await tutupPengganggu(page);
  await bukaMurid(page, MURID_BULANAN);
  await bukaKunciUang(page);

  const { input } = await bukaModalSesi(page);
  // Mode Edit selalu mulai dari nominal yang sedang berlaku (2j × 250.000).
  await expect(input!).toHaveValue("500000");

  await kosongkanKolom(page, input!);
  // Inti bug yang dilaporkan: dulu kolom langsung terisi ulang "500000".
  await expect(input!).toHaveValue("");

  await page.keyboard.type("250000");
  // …dan ketikan berikutnya dulu menyambung: "500000250000".
  await expect(input!).toHaveValue("250000");
});

test("nominal manual yang diketik setelah kolom dikosongkan tersimpan apa adanya", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await tungguFixture(page, MURID_BULANAN);
  await tutupPengganggu(page);
  await bukaMurid(page, MURID_BULANAN);
  await bukaKunciUang(page);

  const { modal, input, tanggalSesi } = await bukaModalSesi(page);
  await kosongkanKolom(page, input!);
  await page.keyboard.type("250000");
  await expect(input!).toHaveValue("250000");

  const sebelum = await snapshotSesi(page);
  await simpanCatatan(page, modal);

  const beda = bedaUang(sebelum, await snapshotSesi(page));
  expect(beda).toHaveLength(1);
  expect(beda[0].baru.cost).toBe(250_000);
  expect(beda[0].baru.override).toBe(250_000);
  // Sesi yang berubah harus sesi yang benar-benar ditampilkan modalnya.
  expect(tanggalSesi.startsWith(beda[0].baru.date)).toBe(true);
  // Penjaga angka gabungan: tidak ada sesi yang nominalnya menembus satu miliar.
  expect(beda[0].baru.cost).toBeLessThan(1_000_000_000);
});

test("mengosongkan kolom biaya lalu menyimpan melepas nominal manual", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await tungguFixture(page, MURID_BULANAN);
  await tutupPengganggu(page);
  await bukaMurid(page, MURID_BULANAN);
  await bukaKunciUang(page);

  // 1) Pasang nominal manual yang jujur: 175.000 (bukan hasil hitungan 2j × 250.000).
  const pertama = await bukaModalSesi(page);
  await pertama.input!.fill("175000");
  await simpanCatatan(page, pertama.modal);

  // 2) Buka lagi — sekarang sesi ini memang ber-nominal manual.
  const kedua = await bukaModalSesi(page);
  await expect(kedua.barisBiaya).toContainText("Manual");
  await expect(kedua.barisBiaya).toContainText("175.000");

  // 3) Kosongkan dan simpan: artinya "kembali ke hitungan otomatis".
  await kosongkanKolom(page, kedua.input!);
  await expect(kedua.input!).toHaveValue("");
  const sebelum = await snapshotSesi(page);
  await simpanCatatan(page, kedua.modal);

  const beda = bedaUang(sebelum, await snapshotSesi(page));
  expect(beda).toHaveLength(1);
  // Nominal manual dilepas (`null`) dan mesin menghitung ulang dari tarif × durasi.
  expect(beda[0].baru.override).toBeNull();
  expect(beda[0].baru.cost).toBe(500_000);
  expect(beda[0].baru.durasi).toBe(2);
});

test("mengubah durasi tidak menjadikan sesi ber-nominal manual", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await tungguFixture(page, MURID_BULANAN);
  await tutupPengganggu(page);
  await bukaMurid(page, MURID_BULANAN);
  await bukaKunciUang(page);

  // Kolom biaya sengaja TIDAK disentuh: yang diubah hanya durasinya.
  const { modal, barisBiaya } = await bukaModalSesi(page, { editBiaya: false });
  await expect(barisBiaya).toContainText("500.000");
  await expect(barisBiaya).toContainText("250.000/jam × 2j");

  await modal.getByRole("button", { name: "3j", exact: true }).click();
  // Perkiraan mengikuti durasi baru — dan tetap ditampilkan sebagai otomatis.
  await expect(barisBiaya).toContainText("750.000");
  await expect(barisBiaya).toContainText("250.000/jam × 3j");

  const sebelum = await snapshotSesi(page);
  await simpanCatatan(page, modal);

  const beda = bedaUang(sebelum, await snapshotSesi(page));
  expect(beda).toHaveLength(1);
  expect(beda[0].baru.durasi).toBe(3);
  expect(beda[0].baru.cost).toBe(750_000);
  // Penjaga cacat nomor 3: dulu tombol durasi menulis ke kolom biaya, sehingga
  // sesi ini tersimpan dengan `costOverride` — sesi otomatis yang menjelma
  // menjadi "koreksi manual tutor" tanpa tutor mengetik apa pun.
  expect(beda[0].baru.override).toBeNull();
});

test("murid paket per pertemuan: durasi tidak mengubah tarif flat", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await tungguFixture(page, MURID_PAKET);
  await tutupPengganggu(page);
  await bukaMurid(page, MURID_PAKET);
  await bukaKunciUang(page);

  const { modal, barisBiaya } = await bukaModalSesi(page, { editBiaya: false });
  await expect(barisBiaya).toContainText("200.000");
  await expect(barisBiaya).toContainText("/pertemuan (tarif paket)");

  await modal.getByRole("button", { name: "3j", exact: true }).click();
  // Tarif paket = flat per pertemuan: 3 jam tetap 200.000, bukan 600.000.
  await expect(barisBiaya).toContainText("200.000");
  await expect(barisBiaya).not.toContainText("600.000");

  const sebelum = await snapshotSesi(page);
  await simpanCatatan(page, modal);

  const beda = bedaUang(sebelum, await snapshotSesi(page));
  expect(beda).toHaveLength(1);
  expect(beda[0].baru.durasi).toBe(3);
  expect(beda[0].baru.cost).toBe(200_000);
  expect(beda[0].baru.override).toBeNull();
});
