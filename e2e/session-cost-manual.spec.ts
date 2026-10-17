import { test, expect, rekamKonsol, ringkasKonsol, tungguSeedSelesai } from "./fixtures";
import { type Page, type Locator } from "@playwright/test";

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
 *
 * Catatan alur (dua balapan yang sudah ditutup di sini):
 * - **Seed menulis bertahap** (murid muncul ±2 dtk, sesi lengkap ±6 dtk), jadi
 *   tes menunggu pesan selesai seeder di console, bukan sekadar "muridnya ada".
 * - **Buka kunci uang lewat layar Uang**, bukan lewat gembok di blok Uang layar
 *   murid: gembok itu disembunyikan selama setelan PIN belum terbaca
 *   (`hideUnlock={needsSetup}` di `UangBlok`), sehingga kadang belum ada saat
 *   tes membutuhkannya. Sesudah itu seluruh perpindahan layar memakai klik
 *   (client-side), karena reload halaman akan mengunci uang kembali.
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

/** Buka aplikasi sambil merekam console — sinyal selesai seeder berasal dari sana. */
async function bukaAplikasi(page: Page): Promise<string[]> {
  const pesan = rekamKonsol(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  return pesan;
}

/**
 * Tunggu seeder selesai, lalu pastikan murid target benar-benar punya sesi DONE.
 *
 * **Kenapa tidak lagi menunggu satu event konsol dengan batas 60 dtk.** Terukur
 * pada suite penuh (2 pekerja, dua project): panggilan pertama di berkas ini
 * pernah gagal dengan *"seed DEV tidak selesai dalam 60 dtk"* padahal berkas yang
 * sama **lulus 6/6 sendirian** — jadi syaratnya memang sensitif beban, bukan
 * rusak. Dua hal diperbaiki bersamaan, dan keduanya soal **sebab**, bukan
 * kesabaran: batasnya dinaikkan ke nilai yang dipakai helper bersama
 * (`tungguSeedSelesai`, 120 dtk) dan pesan kegagalannya kini **memuat jejak
 * konsol terakhir**, sehingga kegagalan berikutnya bisa dibedakan antara "halaman
 * belum jalan" dan "seeder melempar galat" tanpa mengulang penyelidikan.
 */
async function tungguSeed(page: Page, pesan: string[], nama: string) {
  const selesai = await tungguSeedSelesai(page, pesan);
  expect(selesai, `seed DEV tidak selesai. Jejak konsol terakhir: ${ringkasKonsol(pesan)}`).toBe(true);
  await expect.poll(() => muridSiap(page, nama), { timeout: 30_000 }).toBe(true);
}

/**
 * Murid target ada DAN punya minimal satu sesi DONE bernominal.
 *
 * Pembacaan DB hanya dilakukan sesudah pesan seed selesai, jadi Dexie pasti
 * sudah membuat `jurnalles`. Membuka database tanpa versi **sebelum** itu akan
 * membuat DB kosong versi 1 lebih dulu dan menabrak upgrade Dexie. Semua galat
 * di dalam predikat diubah menjadi `false` supaya polling berlanjut, bukan gagal.
 */
async function muridSiap(page: Page, nama: string): Promise<boolean> {
  return page.evaluate((target: string) => new Promise<boolean>((resolve) => {
    const selesai = (v: boolean) => resolve(v);
    try {
      const req = indexedDB.open("jurnalles");
      req.onblocked = () => selesai(false);
      req.onerror = () => selesai(false);
      req.onsuccess = () => {
        const db = req.result;
        try {
          if (!db.objectStoreNames.contains("students") || !db.objectStoreNames.contains("sessions")) {
            db.close(); selesai(false); return;
          }
          const tx = db.transaction(["students", "sessions"], "readonly");
          const barisMurid = tx.objectStore("students").getAll();
          const barisSesi = tx.objectStore("sessions").getAll();
          tx.oncomplete = () => {
            const murid = barisMurid.result.find((s: { name?: string }) => s.name === target) as { id?: string } | undefined;
            const punyaSesi = barisSesi.result.some((s: { studentId?: string; status?: string; cost?: number }) => (
              s.studentId === murid?.id && s.status === "DONE" && (s.cost ?? 0) > 0
            ));
            db.close();
            selesai(Boolean(murid) && punyaSesi);
          };
          tx.onerror = () => { db.close(); selesai(false); };
        } catch { db.close(); selesai(false); }
      };
    } catch { selesai(false); }
  }), nama);
}

/**
 * Tutup pengganggu yang mengambang: changelog, banner backup, nag mingguan.
 *
 * Semuanya diklik lewat DOM (`el.click()`), bukan klik biasa: dengan catatan
 * perubahan yang panjang tombol "Mengerti" berada di luar viewport dan klik
 * biasa gagal dengan "Element is outside of the viewport".
 */
async function tutupPengganggu(page: Page) {
  const mengerti = page.getByRole("button", { name: /Mengerti/ });
  if (await mengerti.isVisible({ timeout: 5000 }).catch(() => false)) {
    await mengerti.evaluate((el: HTMLElement) => el.click());
    await expect(page.getByRole("dialog", { name: "Catatan perubahan" })).toBeHidden({ timeout: 10_000 });
  }
  for (let i = 0; i < 3; i += 1) {
    const tutup = page.getByRole("button", { name: "Tutup peringatan" }).first();
    if (!(await tutup.isVisible({ timeout: 1000 }).catch(() => false))) break;
    await tutup.evaluate((el: HTMLElement) => el.click());
    await page.waitForTimeout(150);
  }
  const nanti = page.getByRole("button", { name: "Nanti", exact: true });
  if (await nanti.isVisible({ timeout: 1000 }).catch(() => false)) {
    await nanti.evaluate((el: HTMLElement) => el.click());
  }
}

/**
 * Buka kunci uang lewat gerbang PIN di layar Uang — pola yang sama dengan
 * `finance.spec.ts`. Statusnya modul (berlaku selama aplikasi terbuka), jadi
 * sesudah ini seluruh perpindahan layar harus lewat klik, bukan `page.goto`.
 */
async function bukaKunciUang(page: Page) {
  await page.getByRole("link", { name: "Uang", exact: true }).click();
  const pin = page.getByPlaceholder("PIN (6 digit)");
  await expect(pin).toBeVisible({ timeout: 30_000 });
  await pin.fill(PIN_KEUANGAN);
  await expect(pin).toHaveValue(PIN_KEUANGAN);
  await page.getByRole("button", { name: "Buka", exact: true }).click();
  await expect(pin).toBeHidden({ timeout: 30_000 });
  await expect(page.getByText("PIN salah.", { exact: true })).toBeHidden();
  // Bukti uang benar-benar terbuka; tanpa ini tes bisa diam-diam menguji kolom
  // yang tertutup dan gagal di tempat yang membingungkan.
  await expect(page.getByText(/Rp •+/)).toHaveCount(0, { timeout: 20_000 });
}

/** Masuk ke layar murid lewat klik (tanpa reload, agar uang tetap terbuka). */
async function bukaMurid(page: Page, nama: string) {
  await page.getByRole("link", { name: "Murid", exact: true }).click();
  const baris = page.locator('a[href^="/students/"]', { hasText: nama }).first();
  await expect(baris).toBeVisible({ timeout: 30_000 });
  await baris.click();
  await expect(page.getByRole("tab", { name: "Sesi" })).toBeVisible({ timeout: 30_000 });
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

/** Urutan pembuka yang sama untuk semua tes. */
async function siapkanLayarMurid(page: Page, nama: string) {
  const pesan = await bukaAplikasi(page);
  await tungguSeed(page, pesan, nama);
  await tutupPengganggu(page);
  await bukaKunciUang(page);
  await bukaMurid(page, nama);
  await tutupPengganggu(page);
}

test("kolom biaya manual tetap kosong saat isinya dihapus semua", async ({ page }) => {
  test.setTimeout(120_000);
  await siapkanLayarMurid(page, MURID_BULANAN);

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
  test.setTimeout(120_000);
  await siapkanLayarMurid(page, MURID_BULANAN);

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
  test.setTimeout(120_000);
  await siapkanLayarMurid(page, MURID_BULANAN);

  // 1) Pasang nominal manual yang jujur: 175.000 (bukan hasil hitungan 2j × 250.000).
  const pertama = await bukaModalSesi(page);
  await pertama.input!.fill("175000");
  await simpanCatatan(page, pertama.modal);

  // 2) Buka lagi — badge "Manual" dan angka tersimpan hanya ada di mode TAMPIL,
  //    jadi jangan masuk mode edit dulu.
  const kedua = await bukaModalSesi(page, { editBiaya: false });
  await expect(kedua.barisBiaya).toContainText("Manual");
  await expect(kedua.barisBiaya).toContainText("175.000");

  // 3) Masuk mode edit, kosongkan, simpan: artinya "kembali ke hitungan otomatis".
  await kedua.modal.locator('button[title="Edit biaya manual"]').click();
  const inputKedua = kedua.modal.locator('input[aria-label="Nominal biaya manual"]');
  await expect(inputKedua).toHaveValue("175000");
  await kosongkanKolom(page, inputKedua);
  await expect(inputKedua).toHaveValue("");
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
  test.setTimeout(120_000);
  await siapkanLayarMurid(page, MURID_BULANAN);

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
  test.setTimeout(120_000);
  await siapkanLayarMurid(page, MURID_PAKET);

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

/**
 * Keputusan pemilik 2026-10-14 (menguatkan D2/`ATURAN-AI.md` §5): memperbaiki
 * durasi **tidak** menghapus nominal manual tutor. Sebelum ini, sesi 2 jam
 * bernominal manual Rp 175.000 yang durasinya dibetulkan menjadi 3 jam berubah
 * sendiri menjadi Rp 750.000 — dan angka itu yang dibaca tagihan.
 *
 * Modal kini menampilkan catatan berisi kedua angka (yang dipakai vs perkiraan
 * otomatis) plus satu tombol untuk berpindah ke hitungan otomatis; tombol itulah
 * satu-satunya jalan melepas nominal manual dari sini.
 */
test("nominal manual bertahan saat durasi diubah, dan bisa dilepas lewat tombol hitungan otomatis", async ({ page }) => {
  test.setTimeout(150_000);
  await siapkanLayarMurid(page, MURID_BULANAN);

  // 1) Nominal manual yang jujur: 175.000 pada sesi 2 jam (bukan 2 × 250.000).
  //    Mode edit hanya dipakai di langkah ini: badge "Manual" dan angka nominal
  //    hanya dirender di mode TAMPIL, jadi langkah lain membaca baris biaya apa
  //    adanya — persis seperti tutor melihatnya.
  const pertama = await bukaModalSesi(page);
  await pertama.input!.fill("175000");
  await simpanCatatan(page, pertama.modal);

  // 2) Durasi dibetulkan menjadi 3 jam — kolom biaya sengaja TIDAK disentuh.
  const kedua = await bukaModalSesi(page, { editBiaya: false });
  await expect(kedua.barisBiaya).toContainText("Manual");
  await expect(kedua.barisBiaya).toContainText("175.000");
  await kedua.modal.getByRole("button", { name: "3j", exact: true }).click();

  const catatan = kedua.modal.locator('[data-catatan="biaya-manual-durasi"]');
  await expect(catatan).toBeVisible();
  await expect(catatan).toContainText("175.000");   // yang tetap dipakai
  await expect(catatan).toContainText("750.000");   // perkiraan hitungan otomatisnya

  const sebelum = await snapshotSesi(page);
  await simpanCatatan(page, kedua.modal);
  const beda = bedaUang(sebelum, await snapshotSesi(page));
  expect(beda).toHaveLength(1);
  expect(beda[0].baru.durasi).toBe(3);
  // Inti keputusan: nominal manual dipertahankan, bukan dihitung ulang.
  expect(beda[0].baru.cost).toBe(175_000);
  expect(beda[0].baru.override).toBe(175_000);

  // 3) Tombol pada catatan itu melepas nominal manual secara eksplisit.
  const ketiga = await bukaModalSesi(page, { editBiaya: false });
  await expect(ketiga.barisBiaya).toContainText("175.000");
  await ketiga.modal.getByRole("button", { name: "2.5j", exact: true }).click();
  // Perkiraan otomatis untuk 2,5 jam sudah tampil, sementara nominal manual masih dipakai.
  await expect(ketiga.barisBiaya).toContainText("625.000");
  const tombol = ketiga.modal.getByRole("button", { name: /Pakai hitungan otomatis/ });
  await expect(tombol).toBeVisible();
  await tombol.click();
  // Sesudah dilepas: badge "Manual" hilang dan barisnya memakai hitungan otomatis.
  await expect(ketiga.barisBiaya).not.toContainText("Manual");
  await expect(ketiga.modal.locator('[data-catatan="biaya-manual-durasi"]')).toBeHidden();

  const sebelumLepas = await snapshotSesi(page);
  await simpanCatatan(page, ketiga.modal);
  const bedaLepas = bedaUang(sebelumLepas, await snapshotSesi(page));
  expect(bedaLepas).toHaveLength(1);
  expect(bedaLepas[0].baru.durasi).toBe(2.5);
  expect(bedaLepas[0].baru.override).toBeNull();
  // Baru sekarang mesin menghitung ulang: 2,5 jam × 250.000.
  expect(bedaLepas[0].baru.cost).toBe(625_000);
});
