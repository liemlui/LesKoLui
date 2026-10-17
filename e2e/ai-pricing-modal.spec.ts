import { readFileSync } from "node:fs";
import { test, expect } from "./fixtures";

test.use({
  launchOptions: process.env.SYSTEM_CHROME_PATH
    ? { executablePath: process.env.SYSTEM_CHROME_PATH }
    : undefined,
});

/**
 * Versi dibaca dari `package.json`, bukan ditulis mati.
 *
 * `ChangelogModal` muncul setiap kali `leskolui-last-seen-version` berbeda dari
 * `APP_VERSION`, dan modal itu menutupi seluruh layar sehingga klik apa pun
 * gagal ("subtree intercepts pointer events"). Spec lain memakai versi mati;
 * di sini versinya dibaca supaya tidak diam-diam berhenti menutup modal pada
 * rilis berikutnya.
 */
const VERSI_APLIKASI = `v${JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version}`;

test.beforeEach(async ({ page }) => {
  await page.addInitScript((versi) => {
    localStorage.setItem("leskolui-last-seen-version", versi);
  }, VERSI_APLIKASI);
});

/**
 * Penjaga modal tarif AI (Pengaturan → AI — DeepSeek → "Kelola tarif AI").
 *
 * Kenapa e2e, bukan unit test: repo ini tidak memasang DOM, jadi tombol,
 * akordeon, dan modalnya tidak pernah benar-benar dirender oleh tes mana pun.
 * Yang diuji di `src/__tests__/aiPricing.test.ts` adalah aturan murninya
 * (periode, biaya, parser) — bukan bahwa tombolnya ada dan bisa ditekan.
 *
 * Dua hal yang dijaga berkas ini:
 *
 * 1. **Tombol dan modalnya benar-benar ada** setelah bagian AI dibuka dan AI
 *    dinyalakan — jalur yang hanya hidup saat `form.ai.enabled` benar.
 * 2. **Kegagalan mengambil tarif tampil sebagai pesan, bukan diam.** Di dev
 *    tidak ada `/api/deepseek-pricing` (endpoint itu hanya ada di Vercel), jadi
 *    tombol "Perbarui" pasti gagal di sini. Itu justru jalur yang ingin
 *    dibuktikan: pesan galat muncul, dan **tarif yang berlaku tidak hilang**.
 */

test("modal tarif tampil, membaca tarif berlaku, dan gagal dengan jelas saat endpoint tidak ada", async ({ page }) => {
  await page.goto("/settings", { waitUntil: "domcontentloaded" });

  // Akordeon: isi bagian baru dirender setelah kepalanya ditekan.
  const bagian = page.locator("#bagian-ai");
  await expect(bagian).toBeVisible({ timeout: 20_000 });
  const kepala = bagian.getByRole("button", { name: /DeepSeek/i }).first();
  if ((await kepala.getAttribute("aria-expanded")) !== "true") await kepala.click();

  // Tombol tarif hanya muncul saat AI aktif (bawaan: mati).
  const saklar = bagian.getByRole("switch").first();
  await expect(saklar).toBeVisible();
  if ((await saklar.getAttribute("aria-checked")) !== "true") await saklar.click();

  const tombol = bagian.getByRole("button", { name: "Kelola tarif AI" });
  await expect(tombol).toBeVisible();
  await tombol.click();

  const modal = page.getByRole("dialog", { name: "Tarif AI DeepSeek" });
  await expect(modal).toBeVisible();

  // Tarif yang berlaku, dari kedua model dan kedua periode.
  await expect(modal.getByText("deepseek-flash")).toBeVisible();
  await expect(modal.getByText("deepseek-v4-pro")).toBeVisible();
  await expect(modal.getByText("$0.1500")).toBeVisible(); // flash cache miss off-peak
  await expect(modal.getByText("$3.9600")).toBeVisible(); // pro output peak
  await expect(modal.getByText(/Berlaku sekarang/)).toBeVisible();

  // Kurs ikut ditampilkan: ia pengali seluruh biaya rupiah.
  await expect(modal.getByText("Kurs USD → IDR")).toBeVisible();
  await expect(modal.getByText(/Rp 18\.031/)).toBeVisible();

  // Jalur gagal: dev tidak punya endpoint-nya.
  await modal.getByRole("button", { name: "Perbarui Tarif & Kurs" }).click();
  await expect(modal.getByText(/Gagal memperbarui/)).toBeVisible({ timeout: 20_000 });

  // Kegagalan tidak boleh mengosongkan tarif maupun kurs yang sedang berlaku.
  await expect(modal.getByText("$0.1500")).toBeVisible();
  await expect(modal.getByText(/Rp 18\.031/)).toBeVisible();
});
