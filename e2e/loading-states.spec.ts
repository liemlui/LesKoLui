/**
 * Keadaan memuat & gagal (G1-07) — penjaga regresi permanen, bagian `npm run e2e`.
 *
 * Menguji perilaku yang tidak bisa dibuktikan secara statis:
 *   1. Beranda: rangka (skeleton) PERNAH tampil saat data belum siap;
 *   2. Beranda: "Tidak ada sesi hari ini" TIDAK muncul selama rangka itu ada
 *      (audit B-01 — empty state palsu);
 *   3. Pengaturan: penyimpanan yang menolak → `role="alert"` + tombol "Coba lagi";
 *   4. Pengaturan: penyimpanan yang tidak pernah menjawab → batas tunggu 8 detik juga
 *      berujung pada kotak galat (audit L-09 — tidak ada layar tanpa ujung).
 *
 * Tidak ada artefak screenshot/JSON: spec ini menjaga perilaku, bukan mengumpulkan
 * bukti audit. Catatan lingkungan: setiap test Playwright dapat konteks browser BARU,
 * jadi tidak ada state lama yang perlu dibersihkan manual.
 *
 * Hanya project `chromium` yang menjalankannya (lihat `test.skip` di baris pertama
 * describe): uji 2 memakai CDP, sehingga menjalankannya di `mobile` hanya
 * menggandakan biaya CI.
 */
import { test, expect, type Page } from "@playwright/test";

const SETTINGS_FORM_MARKER = "Backup & Restore";
const LOAD_FAILURE = "Pengaturan gagal dimuat";

/** Kotak galat Pengaturan — `role="alert"` yang isinya pesan spesifik (bukan overlay lain). */
function settingsAlert(page: Page) {
  return page.getByRole("alert").filter({ hasText: LOAD_FAILURE });
}

async function dismissChangelog(page: Page): Promise<void> {
  const ok = page.getByRole("button", { name: /Mengerti/ });
  if (await ok.isVisible({ timeout: 3000 }).catch(() => false)) await ok.click();
}

/** Tunggu sampai form Pengaturan benar-benar tergambar (bukan lagi rangka). */
async function expectSettingsForm(page: Page): Promise<void> {
  await dismissChangelog(page);
  await expect(page.getByText(SETTINGS_FORM_MARKER)).toBeVisible({ timeout: 15_000 });
}

/**
 * Pindai DOM sejak init: catat apakah rangka Beranda (`[data-loading]`) PERNAH ada,
 * dan apakah empty state muncul saat rangka itu masih ada.
 */
async function installHomeProbe(page: Page): Promise<void> {
  await page.addInitScript(() => {
    type Probe = { skeleton: boolean; emptyWhileLoading: boolean; chain: string[] };
    const w = window as unknown as { __loadStateProbe: Probe };
    w.__loadStateProbe = { skeleton: false, emptyWhileLoading: false, chain: [] };
    const chainOf = (el: Element): string[] => {
      const out: string[] = [];
      let p: Element | null = el;
      for (let i = 0; i < 6 && p; i++) {
        out.push(`${p.tagName.toLowerCase()}${p.className ? "." + String(p.className).split(" ").slice(0, 2).join(".") : ""}`);
        p = p.parentElement;
      }
      return out;
    };
    const scan = () => {
      const sk = document.querySelector('[data-loading="true"]');
      if (sk) w.__loadStateProbe.skeleton = true;
      if (!sk) return;
      const hit = Array.from(document.querySelectorAll<HTMLElement>("*")).find(
        (el) => el.textContent?.trim() === "Tidak ada sesi hari ini",
      );
      if (hit) {
        w.__loadStateProbe.emptyWhileLoading = true;
        if (w.__loadStateProbe.chain.length === 0) w.__loadStateProbe.chain = chainOf(hit);
      }
    };
    document.addEventListener("DOMContentLoaded", () => {
      scan();
      new MutationObserver(scan).observe(document.body, { childList: true, subtree: true, characterData: true });
    });
  });
}

/**
 * Perlambat main thread (CPU throttling CDP) supaya jendela "data belum siap" cukup
 * panjang untuk diukur. Di mesin cepat, pembacaan IndexedDB selesai dalam hitungan
 * milidetik sehingga rangka hanya berkelip dan uji menjadi tidak deterministik
 * (karena itu uji 1 hanya memeriksa "pernah tampil").
 *
 * Catatan: menambal `indexedDB.open` TIDAK bisa dipakai — Dexie memegang rujukan
 * `IDBFactory` sendiri, jadi tambalan di `window` tidak pernah dipanggil.
 */
async function throttleCpu(page: Page, factor: number): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: factor });
}

test.describe("keadaan memuat & gagal (G1-07)", () => {
  // Hanya project `chromium` yang menjalankan spec ini: uji 2 memakai CDP
  // (`Emulation.setCPUThrottlingRate`), sehingga menjalankannya di project `mobile`
  // tidak menambah bukti apa pun — hanya menambah waktu CI (keputusan pemilik
  // gelombang 1, 2026-10-01).
  //
  // CATATAN: `browserName !== "chromium"` SENDIRIAN tidak cukup. Project `mobile`
  // memakai device `Pixel 7` yang `defaultBrowserType`-nya juga `chromium`, jadi
  // `browserName` bernilai "chromium" di KEDUA project — pemeriksaan itu selalu lolos
  // dan keempat uji tetap jalan di `mobile` (terbukti saat verifikasi G1-09).
  // `isMobile` adalah penanda yang benar-benar membedakan kedua project di
  // `playwright.config.ts`.
  test.skip(
    ({ browserName, isMobile }) => browserName !== "chromium" || isMobile,
    "butuh CDP: hanya project chromium",
  );

  test("1. Beranda: rangka pernah tampil saat data belum siap", async ({ page }) => {
    await installHomeProbe(page);
    await page.goto("/");
    await page.waitForTimeout(4000);
    const seen = await page.evaluate(() =>
      (window as unknown as { __loadStateProbe: { skeleton: boolean } }).__loadStateProbe);

    expect(seen.skeleton, "rangka Beranda harus pernah tampil saat data belum siap").toBe(true);
  });

  test("2. Beranda: 'Tidak ada sesi hari ini' tidak muncul selama data belum siap", async ({ page }) => {
    // CPU diperlambat 6× supaya jendela "data belum siap" cukup lebar untuk diperiksa.
    await throttleCpu(page, 6);
    await installHomeProbe(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Di bawah beban paralel, rangka bisa berkelip lebih cepat daripada satu polling
    // locator. Karena itu kehadirannya ditunggu lewat probe di dalam halaman
    // (MutationObserver yang dipasang sejak init), bukan lewat menunggu locator.
    await page.waitForFunction(
      () => (window as unknown as { __loadStateProbe?: { skeleton: boolean } }).__loadStateProbe?.skeleton === true,
      undefined,
      { timeout: 30_000 },
    );

    // Empty state yang DIMAKSUD adalah elemen di dalam kartu "Hari Ini" — bukan frasa
    // serupa di tempat lain (mis. kalender berkata "Belum ada sesi").
    const emptyInHero = page.locator('[data-loading="true"]').locator("xpath=..").getByText("Tidak ada sesi hari ini", { exact: true });
    await expect(emptyInHero, "empty state tidak boleh tampil selama rangka ada").toHaveCount(0);

    // Setelah data datang: rangka hilang (empty state-nya SAH bila memang tidak ada sesi).
    await expect(page.locator('[data-loading="true"]')).toHaveCount(0, { timeout: 30_000 });

    // Jejak sepanjang muat: rangka terlihat, dan empty state tidak pernah menemaninya.
    const seen = await page.evaluate(() =>
      (window as unknown as { __loadStateProbe: { skeleton: boolean; emptyWhileLoading: boolean; chain: string[] } }).__loadStateProbe);
    expect(seen.skeleton, "rangka harus pernah tampil saat data belum siap").toBe(true);
    expect(
      seen.emptyWhileLoading,
      `empty state tidak pernah muncul bersamaan dengan rangka (jejak: ${JSON.stringify(seen.chain)})`,
    ).toBe(false);
  });

  test("3. Pengaturan: penyimpanan menolak → role=alert + tombol Coba lagi", async ({ page }) => {
    await page.goto("/settings");
    await expectSettingsForm(page);

    const pageErrors: string[] = [];
    page.on("pageerror", (e) => pageErrors.push(e.message));

    // Permintaan IndexedDB yang SELALU gagal (asinkron, seperti kegagalan nyata).
    await page.addInitScript(() => {
      const failing = () => {
        const req = { onsuccess: null, onerror: null, onupgradeneeded: null, result: undefined, error: null } as unknown as IDBOpenDBRequest;
        setTimeout(() => {
          const err = new DOMException("indexedDB diblokir (uji negatif)", "UnknownError");
          (req as unknown as { error: DOMException }).error = err;
          (req.onerror as ((this: IDBRequest, ev: Event) => unknown) | null)?.call(req, new Event("error"));
        }, 0);
        return req;
      };
      Object.defineProperty(window, "indexedDB", {
        configurable: true,
        get: () => ({ open: () => failing(), deleteDatabase: () => failing(), databases: async () => [] }),
      });
    });
    await page.reload();

    const alert = settingsAlert(page);
    await expect(alert).toContainText(LOAD_FAILURE, { timeout: 25_000 });
    const retry = alert.getByRole("button", { name: "Coba lagi" });
    await expect(retry).toBeVisible();
    expect(pageErrors.length, "aplikasi tidak boleh crash (tidak ada pageerror)").toBe(0);

    // Menekan "Coba lagi" saat penyimpanan masih rusak: tetap error-state, tidak diam.
    await retry.click();
    await expect(alert).toContainText(LOAD_FAILURE, { timeout: 25_000 });
  });

  test("4. Pengaturan: penyimpanan tidak pernah menjawab → galat setelah batas tunggu", async ({ page }) => {
    await page.goto("/settings");
    await expectSettingsForm(page);

    const pageErrors: string[] = [];
    page.on("pageerror", (e) => pageErrors.push(e.message));

    // Permintaan yang tidak pernah memanggil onsuccess/onerror → query menggantung.
    await page.addInitScript(() => {
      const pending = () =>
        ({ onsuccess: null, onerror: null, onupgradeneeded: null, result: undefined, error: null }) as unknown as IDBOpenDBRequest;
      Object.defineProperty(window, "indexedDB", {
        configurable: true,
        get: () => ({ open: () => pending(), deleteDatabase: () => pending(), databases: async () => [] }),
      });
    });

    const startedAt = Date.now();
    await page.reload();
    const alert = settingsAlert(page);
    await expect(alert).toContainText(LOAD_FAILURE, { timeout: 30_000 });
    const elapsed = Date.now() - startedAt;

    await expect(alert.getByRole("button", { name: "Coba lagi" })).toBeVisible();
    // Harus menunggu batas tunggu (8 dtk), bukan gagal seketika — dan pasti berujung.
    expect(elapsed, "galat muncul setelah batas tunggu, bukan seketika").toBeGreaterThan(7000);
    expect(pageErrors.length, "aplikasi tidak boleh crash (tidak ada pageerror)").toBe(0);
  });
});
