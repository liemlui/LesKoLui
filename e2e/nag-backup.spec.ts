/**
 * Nag backup mingguan (G1-05) — penjaga regresi permanen, bagian `npm run e2e`.
 *
 * Menguji perilaku yang TIDAK bisa dibuktikan secara statis:
 *   1. saat nag tampil dan halaman digulir sampai bawah, elemen konten terakhir
 *      tidak tertutup nag (kompensasi `--nag-h` pada `padding-bottom` `.app-shell`);
 *   2. tombol tutup menyembunyikan nag dan penolakannya tahan reload;
 *   3. nag tidak tampil di layar tugas `/capture`;
 *   4. nag disembunyikan selama ada `role="dialog"` (modal apa pun) dan kembali
 *      setelah modal ditutup.
 *
 * Tidak ada artefak screenshot/JSON: spec ini menjaga perilaku, bukan mengumpulkan
 * bukti audit (bukti pengukuran G1-05 ada di `.design-audit/g1-05/`, di luar repo).
 *
 * Catatan lingkungan: setiap test Playwright mendapat konteks browser BARU
 * (localStorage & IndexedDB kosong), jadi kunci nag tidak perlu dibersihkan manual.
 */
import { test, expect, type Page } from "@playwright/test";

const SNOOZE_KEY = "leskolui_nag_snooze_until";
const NAG = "[data-nag]";
const CHANGELOG_DIALOG = '[aria-label="Catatan perubahan"]';
const CHANGELOG_OK = /Mengerti/;

/** Lebar HP yang dipakai audit G1-05 (nag 2 baris + tombol = 116 px pada lebar ini). */
test.use({ viewport: { width: 412, height: 839 } });

interface SeedWindow extends Window {
  seedDummy?: (force?: boolean) => Promise<unknown>;
}

/** Isi data dev supaya Beranda punya konten yang cukup tinggi untuk digulir. */
async function seedDevData(page: Page): Promise<void> {
  await page.waitForFunction(() => typeof (window as SeedWindow).seedDummy === "function", undefined, { timeout: 30_000 });
  await page.evaluate(() => (window as SeedWindow).seedDummy!(true));
}

/**
 * Changelog adalah modal (`role="dialog"`) dan terbuka pada muat pertama versi baru,
 * sehingga ia MENYEMBUNYIKAN nag (perilaku yang memang diinginkan). Untuk menguji
 * nag, changelog ditutup lebih dulu lewat tombolnya sendiri.
 */
async function dismissChangelog(page: Page): Promise<void> {
  const dialog = page.locator(CHANGELOG_DIALOG);
  const ok = page.getByRole("button", { name: CHANGELOG_OK });
  if (await ok.isVisible({ timeout: 3000 }).catch(() => false)) {
    await ok.click();
    await expect(dialog).toHaveCount(0);
  }
}

/**
 * Syarat nag tampil: prompt mingguan sudah due (kunci `AUTO_BACKUP_KEY` absen — di
 * konteks baru memang absen) DAN banner "backup menua" tidak menang. Banner menua
 * muncul bila `lastBackupAt` kosong atau ≥14 hari, jadi diisi 8 hari.
 */
async function setLastBackupDaysAgo(page: Page, days: number): Promise<void> {
  await page.evaluate(async (d) => {
    const iso = new Date(Date.now() - d * 86_400_000).toISOString();
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open("jurnalles");
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction("settings", "readwrite");
        const store = tx.objectStore("settings");
        const get = store.get("app");
        get.onsuccess = () => {
          const row = (get.result as Record<string, unknown>) || { id: "app" };
          row.lastBackupAt = iso;
          store.put(row);
        };
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      };
    });
  }, days);
}

/** Buka Beranda dalam keadaan di mana nag MEMANG harus tampil, lalu kembalikan halaman siap ukur. */
async function openWithNag(page: Page): Promise<void> {
  await page.goto("/");
  await seedDevData(page);
  await setLastBackupDaysAgo(page, 8);
  await page.reload();
  await dismissChangelog(page);

  await page.waitForSelector(NAG, { state: "visible", timeout: 15_000 });
  // Konten rute dimuat lazy; pastikan halaman memang lebih tinggi dari viewport
  // supaya "gulir sampai bawah" punya arti.
  await page.waitForFunction(() => document.body.scrollHeight - window.innerHeight > 200, undefined, { timeout: 15_000 });
  await page.waitForTimeout(500); // beri kesempatan efek --nag-h menulis
}

interface Measured {
  nagVisible: boolean;
  nagHeight: number;
  nagVar: string;
  nagTopViewport: number | null;
  lastContentBottom: number;
  lastContentTag: string;
  gap: number | null;
  padBottom: string;
  padBottomExpected: string;
  maxScroll: number;
  scrollY: number;
}

/** Gulir sampai bawah, lalu bandingkan elemen konten terakhir dengan nag. */
async function measure(page: Page): Promise<Measured> {
  return page.evaluate(() => {
    const nag = document.querySelector("[data-nag]") as HTMLElement | null;
    window.scrollTo(0, document.body.scrollHeight);

    // Elemen konten terakhir yang benar-benar ikut aliran dokumen: abaikan elemen
    // fixed/sticky DAN apa pun yang berada di dalam induk fixed/sticky (mis. baris
    // dalam bottom-nav, yang rect-nya selalu menempel di dasar viewport).
    const insideFloating = (el: HTMLElement): boolean => {
      let p: HTMLElement | null = el.parentElement;
      while (p) {
        const s = getComputedStyle(p).position;
        if (s === "fixed" || s === "sticky") return true;
        p = p.parentElement;
      }
      return false;
    };

    let lastBottom = 0;
    let lastTag = "";
    document.querySelectorAll(".app-shell *").forEach((node) => {
      const el = node as HTMLElement;
      const st = getComputedStyle(el);
      if (st.position === "fixed" || st.position === "sticky") return;
      if (st.visibility === "hidden" || st.display === "none" || st.opacity === "0") return;
      const r = el.getBoundingClientRect();
      if (r.height === 0 || r.width === 0) return;
      if (insideFloating(el)) return;
      if (r.bottom > lastBottom) {
        lastBottom = r.bottom;
        lastTag = `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`;
      }
    });

    const nagRect = nag ? nag.getBoundingClientRect() : null;
    const shell = document.querySelector(".app-shell") as HTMLElement | null;
    const pad = shell ? getComputedStyle(shell).paddingBottom : "";
    const navH = getComputedStyle(document.documentElement).getPropertyValue("--bottom-nav-h").trim();
    const nagH = nag ? `${nag.offsetHeight}px` : "0px";

    return {
      nagVisible: !!nag,
      nagHeight: nag ? nag.offsetHeight : 0,
      nagVar: getComputedStyle(document.documentElement).getPropertyValue("--nag-h").trim(),
      nagTopViewport: nagRect ? Math.round(nagRect.top) : null,
      lastContentBottom: Math.round(lastBottom),
      lastContentTag: lastTag,
      gap: nagRect ? Math.round(nagRect.top - lastBottom) : null,
      padBottom: pad,
      // .app-shell = nav + 1rem + tinggi nag
      padBottomExpected: `${parseFloat(navH) + 16 + parseFloat(nagH)}px`,
      maxScroll: Math.round(document.body.scrollHeight - window.innerHeight),
      scrollY: Math.round(window.scrollY),
    };
  });
}

test.describe("nag backup mingguan (G1-05)", () => {
  test("1. nag tampil, --nag-h terisi, elemen terakhir tidak tertutup", async ({ page }) => {
    await openWithNag(page);
    const m = await measure(page);

    expect(m.nagVisible, "nag harus tampil saat backup sudah due").toBe(true);
    expect(m.nagHeight).toBeGreaterThan(40);
    expect(m.nagVar, "--nag-h harus sama dengan tinggi nag").toBe(`${m.nagHeight}px`);
    expect(m.scrollY, "halaman sudah di dasar gulir").toBeGreaterThan(m.maxScroll - 5);
    expect(m.padBottom, "padding-bottom .app-shell = nav + 1rem + --nag-h").toBe(m.padBottomExpected);
    expect(m.gap, `elemen terakhir (${m.lastContentTag}) harus di ATAS nag, bukan tertutup`).toBeGreaterThanOrEqual(0);
  });

  test("2. tombol tutup: nag hilang, penolakan tersimpan, tetap hilang setelah reload", async ({ page }) => {
    await openWithNag(page);
    expect((await measure(page)).nagVisible).toBe(true);

    await page.click('[data-nag] button[aria-label="Tutup pengingat backup"]');
    await expect(page.locator(NAG)).toHaveCount(0);

    const snooze = await page.evaluate((k) => localStorage.getItem(k), SNOOZE_KEY);
    expect(snooze, "penolakan harus tersimpan di perangkat").toBeTruthy();
    const days = (Number(snooze) - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(6);
    expect(days).toBeLessThanOrEqual(8);

    await page.reload();
    await page.waitForFunction(() => document.body.scrollHeight - window.innerHeight > 200, undefined, { timeout: 15_000 });
    await page.waitForTimeout(800);
    const after = await measure(page);

    expect(after.nagVisible, "nag tidak boleh kembali setelah reload").toBe(false);
    expect(after.nagVar, "--nag-h harus 0px saat nag tidak tampil").toBe("0px");
  });

  test("3. nag tidak tampil di layar tugas /capture", async ({ page }) => {
    await openWithNag(page);

    await page.goto("/capture");
    await page.waitForTimeout(1500);
    const m = await measure(page);

    expect(m.nagVisible, "nag harus disembunyikan di /capture").toBe(false);
    expect(m.nagVar).toBe("0px");
  });

  test("4. nag disembunyikan saat modal (role=dialog) terbuka, kembali setelah ditutup", async ({ page }) => {
    await openWithNag(page);
    expect((await measure(page)).nagVisible).toBe(true);

    // Probe: semua modal aplikasi memakai role="dialog" (Modal.tsx) — termasuk modal Laporan.
    await page.evaluate(() => {
      const d = document.createElement("div");
      d.id = "__probe_dialog";
      d.setAttribute("role", "dialog");
      d.setAttribute("aria-modal", "true");
      document.body.appendChild(d);
    });
    await expect(page.locator(NAG)).toHaveCount(0);
    const duringVar = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--nag-h").trim());
    expect(duringVar, "--nag-h harus 0px selama dialog terbuka").toBe("0px");

    await page.evaluate(() => document.getElementById("__probe_dialog")?.remove());
    await expect(page.locator(NAG)).toHaveCount(1);
  });
});
