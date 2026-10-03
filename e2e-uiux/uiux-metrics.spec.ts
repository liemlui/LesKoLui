/**
 * Guard metrik UI (G1-11) — PENJAGA REGRESI, **di luar CI utama**.
 *
 * Jalankan: `npm run e2e:uiux` (config `playwright.uiux.config.ts`).
 * `npm run e2e` TIDAK menjalankan berkas ini.
 *
 * Kenapa folder ini `e2e-uiux/` dan bukan `e2e/`: config utama memakai
 * `testDir: "./e2e"` (rekursif), jadi spec apa pun di dalam `e2e/` otomatis ikut
 * `npm run e2e` dan menambah ±3 menit CI. Satu-satunya cara "tidak ikut CI"
 * tanpa mengubah `playwright.config.ts` (yang dilarang di tugas ini) adalah
 * menaruh berkasnya di luar `e2e/`.
 *
 * Asal: salinan `.design-audit/uiux-audit.spec.ts` (spec audit v1.79.3) yang
 * diubah dari "pengumpul angka + screenshot" menjadi PENJAGA dengan ambang
 * gagal. Screenshot dihapus supaya guard cukup cepat dijalankan berulang;
 * angka mentahnya tetap ditulis sebagai bukti ke
 * `<folder induk repo>/.design-audit/uiux-guard/<project>-<layar>.json`.
 *
 * Ambang gagal (DoD GELOMBANG-1 §2 G1-11 + keputusan pemilik #2):
 *  1. kontras teks < 4,5:1 (3:1 hanya untuk ≥24px atau ≥18,66px tebal)  → L-01
 *  2. kontrol interaktif (termasuk input) < 24 px                        → L-03 / WCAG 2.5.8
 *  3. `role=tab` tanpa `aria-controls` yang menunjuk elemen ADA, atau
 *     layar bertab tanpa `role=tabpanel`                                 → L-06
 *  4. setiap layar ≥ 1 `h2`, dan tidak ada lompatan level heading (h1→h3) → L-07 / Q22
 *
 * Pengukuran kontras memakai canvas di dalam halaman (normalisasi oklch →
 * sRGB), BUKAN `@axe-core/playwright` — paket itu tidak ada di repo dan
 * menambah dependensi baru dilarang (`ATURAN-AI` §2.2).
 */
import { test, expect, type Page } from "@playwright/test";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// <repo>/e2e-uiux/ → repo = "..", folder induk (tempat .design-audit/) = "../..".
const REPO_ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(REPO_ROOT, "..", ".design-audit", "uiux-guard");

/* ---------- metrik diukur di dalam halaman ---------- */
const COLLECT = `(() => {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 1;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  const cache = new Map();
  // Normalisasi SEMUA format warna CSS (oklch/color()/lab) ke sRGB via canvas.
  const toRgb = (css) => {
    if (!css) return null;
    if (cache.has(css)) return cache.get(css);
    let out = null;
    try {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = "#000";
      ctx.fillStyle = css;
      if (String(ctx.fillStyle) !== "#000000" || /^(#000|black|rgb\\(0, ?0, ?0\\))/.test(css)) {
        ctx.fillRect(0, 0, 1, 1);
        const d = ctx.getImageData(0, 0, 1, 1).data;
        out = { r: d[0], g: d[1], b: d[2], a: d[3] / 255 };
      }
    } catch { out = null; }
    cache.set(css, out);
    return out;
  };
  const px = (v) => parseFloat(v) || 0;
  const rel = (c) => {
    const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const ratio = (a, b) => { const l1 = rel(a), l2 = rel(b); const hi = Math.max(l1, l2), lo = Math.min(l1, l2); return (hi + 0.05) / (lo + 0.05); };
  const bgOf = (el) => {
    let n = el;
    while (n && n !== document.documentElement) {
      const s = getComputedStyle(n);
      const c = toRgb(s.backgroundColor);
      if (c && c.a > 0.5) return { c, from: n.tagName.toLowerCase() + "." + (n.getAttribute("class") || "").split(" ").slice(0, 2).join(".") };
      if (s.backgroundImage && s.backgroundImage !== "none") return null;
      n = n.parentElement;
    }
    const c = toRgb(getComputedStyle(document.body).backgroundColor);
    return c && c.a > 0.5 ? { c, from: "body" } : null;
  };
  const label = (el) => {
    const t = (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 44);
    const cls = (el.getAttribute("class") || "").split(" ").slice(0, 3).join(".");
    return el.tagName.toLowerCase() + (t ? " [" + t + "]" : "") + (cls ? " {" + cls + "}" : "");
  };
  const vis = (el) => {
    const s = getComputedStyle(el);
    if (s.display === "none" || s.visibility === "hidden" || px(s.opacity) < 0.15) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const INTERACTIVE = 'button, a[href], [role=button], [role=tab], [role=switch], [role=checkbox], summary';
  const FORM = 'input:not([type=hidden]), select, textarea';

  const contrast = [], smallControls = [], under44 = [], tiny = [], trunc = [], tabNoPanel = [];
  const all = Array.from(document.querySelectorAll("body *")).filter(vis);

  for (const el of all) {
    const s = getComputedStyle(el);
    const own = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (own) {
      const fg = toRgb(s.color), bg = bgOf(el);
      const fs = px(s.fontSize), bold = parseInt(s.fontWeight, 10) >= 700;
      if (fg && fg.a > 0.5 && bg) {
        const cr = ratio(fg, bg.c);
        const need = fs >= 24 || (bold && fs >= 18.66) ? 3 : 4.5;
        if (cr < need) contrast.push({ el: label(el), ratio: Math.round(cr * 100) / 100, need, fontSize: fs, weight: s.fontWeight, color: s.color, bg: "rgb(" + bg.c.r + "," + bg.c.g + "," + bg.c.b + ") via " + bg.from, text: (el.textContent || "").trim().slice(0, 50) });
      }
      if (fs < 12) tiny.push({ el: label(el), fontSize: fs, text: (el.textContent || "").trim().slice(0, 40) });
    }
    const r = el.getBoundingClientRect();
    const side = Math.min(r.width, r.height);
    if (el.matches(FORM) || el.matches(INTERACTIVE)) {
      const kind = el.matches(FORM) ? "field" : "control";
      const w = Math.round(r.width), h = Math.round(r.height);
      if (side < 24) smallControls.push({ el: label(el), w, h, kind });
      else if (side < 44) under44.push({ el: label(el), w, h, kind });
    }
    if (own) {
      const cs = getComputedStyle(el);
      if ((cs.overflow === "hidden" || cs.textOverflow === "ellipsis") && el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0) {
        trunc.push({ el: label(el), visible: el.clientWidth, full: el.scrollWidth, text: (el.textContent || "").trim().slice(0, 40) });
      }
    }
  }

  const tabs = Array.from(document.querySelectorAll('[role=tab]'));
  for (const t of tabs) {
    const id = t.getAttribute("aria-controls");
    if (!id) tabNoPanel.push({ reason: "tanpa aria-controls", tab: (t.textContent || "").trim() });
    else if (!document.getElementById(id)) tabNoPanel.push({ reason: "aria-controls menggantung", tab: (t.textContent || "").trim() });
  }

  const headings = Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6")).map((h) => h.tagName + ": " + (h.textContent || "").trim().slice(0, 40));

  // TASK-11 (lanjutan G2-09) — emoji di dalam kontrol & heading. Yang dihitung
  // hanya piktograf (termasuk yang ber-default-teks tetapi dipakai dengan VS16
  // seperti ⬇️ ☁️ ♻️). Glyph tipografi ✓ ✕ ✗ ↩ ← → ↑ ↓ ↺ ⇱ × ↗ ▶ dikecualikan.
  // Elemen ber-atribut data-emoji-vocab DILEWATI: itu kosakata keadaan afektif (mood,
  // situasi, indikator perilaku, tag respons, level sesi) yang SENGAJA tetap emoji
  // karena ikon stroke generik untuknya berisiko terbaca salah. Aturannya:
  // docs/kerja/TASK-11-emoji-ke-svg.md
  // ⚠️ Backslash ditulis ganda karena blok ini adalah isi template literal.
  const EMOJI_RE = /\\p{Extended_Pictographic}\\uFE0F?/gu;
  const TEXT_GLYPHS = new Set([
    "\\u2713", "\\u2715", "\\u2717", "\\u21A9", "\\u2190", "\\u2192", "\\u2191", "\\u2193",
    "\\u21BA", "\\u21F1", "\\u2194", "\\u2197", "\\u25B6", "\\u00D7",
  ]);
  const emojiInControls = [];
  const CONTROL_SEL = "button, a[href], [role=button], h1, h2, h3, h4, h5, h6";
  for (const el of Array.from(document.querySelectorAll(CONTROL_SEL))) {
    if (el.closest("[data-emoji-vocab]")) continue;
    const text = (el.textContent || "").trim();
    for (const m of text.matchAll(EMOJI_RE)) {
      if (TEXT_GLYPHS.has(m[0][0])) continue;
      emojiInControls.push({ tag: el.tagName, emoji: m[0], text: text.slice(0, 40) });
    }
  }

  return {
    url: location.pathname + location.search,
    viewport: { w: window.innerWidth, h: window.innerHeight },
    headings,
    h1Count: headings.filter((h) => h.startsWith("H1:")).length,
    h2Count: headings.filter((h) => h.startsWith("H2:")).length,
    contrast: contrast.slice(0, 40),
    contrastCount: contrast.length,
    smallControls: smallControls.slice(0, 40),
    smallControlsCount: smallControls.length,
    under44Count: under44.length,
    tinyCount: tiny.length,
    truncCount: trunc.length,
    emojiInControls: emojiInControls.slice(0, 40),
    emojiInControlsCount: emojiInControls.length,
    tabs: tabs.length,
    tablists: document.querySelectorAll('[role=tablist]').length,
    tabpanels: document.querySelectorAll('[role=tabpanel]').length,
    tabTabindex0: tabs.filter((t) => t.getAttribute("tabindex") === "0").length,
    tabSelected: tabs.filter((t) => t.getAttribute("aria-selected") === "true").length,
    tabProblems: tabNoPanel.slice(0, 10),
  };
})()`;

interface Metrics {
  url: string;
  headings: string[];
  h1Count: number;
  h2Count: number;
  contrast: Array<Record<string, unknown>>;
  contrastCount: number;
  smallControls: Array<Record<string, unknown>>;
  smallControlsCount: number;
  under44Count: number;
  tinyCount: number;
  truncCount: number;
  emojiInControls: Array<Record<string, unknown>>;
  emojiInControlsCount: number;
  tabs: number;
  tablists: number;
  tabpanels: number;
  tabTabindex0: number;
  tabSelected: number;
  tabProblems: Array<Record<string, unknown>>;
}

/* ---------- daftar layar yang dijaga ---------- */
type ScreenId = "beranda" | "murid" | "detail-murid" | "catat-sesi" | "laporan" | "keuangan" | "pengaturan";

const SCREENS: Array<{ id: ScreenId; title: string }> = [
  { id: "beranda", title: "Beranda (/)" },
  { id: "murid", title: "Murid — daftar (/students)" },
  { id: "detail-murid", title: "Detail murid (/students/:id)" },
  { id: "catat-sesi", title: "Catat Sesi (/capture) langkah 1" },
  { id: "laporan", title: "Laporan (/report)" },
  { id: "keuangan", title: "Keuangan (/payments?tab=ringkasan)" },
  { id: "pengaturan", title: "Pengaturan (/settings)" },
];

async function dismissOverlays(page: Page) {
  for (let i = 0; i < 3; i++) {
    let clicked = false;
    for (const name of [/Mengerti/, /Terima Kasih/, /Tutup peringatan/, /^Nanti$/, /Tutup panel/]) {
      const b = page.getByRole("button", { name });
      if (await b.first().isVisible({ timeout: 300 }).catch(() => false)) {
        await b.first().click().catch(() => {});
        clicked = true;
        await page.waitForTimeout(250);
      }
    }
    if (!clicked) break;
  }
}

async function openPin(page: Page) {
  const pin = page.getByPlaceholder("PIN (6 digit)");
  if (await pin.isVisible({ timeout: 2000 }).catch(() => false)) {
    await pin.fill("123456");
    await page.getByRole("button", { name: "Buka", exact: true }).click();
    await page.getByRole("heading", { name: "Keuangan", exact: true }).waitFor({ timeout: 8000 }).catch(() => {});
  }
}

/** Buka satu layar sampai datanya siap, tanpa membuka modal. */
async function openScreen(page: Page, id: ScreenId) {
  switch (id) {
    case "beranda":
      await page.goto("/");
      break;
    case "murid":
      await page.goto("/students");
      break;
    case "detail-murid": {
      await page.goto("/students");
      await page.waitForTimeout(3000);
      await dismissOverlays(page);
      const card = page.locator('a[href*="/students/"][class*="block"]').first();
      await card.click({ timeout: 10_000 });
      break;
    }
    case "catat-sesi":
      await page.goto("/capture");
      break;
    case "laporan":
      await page.goto("/report");
      break;
    case "keuangan":
      await page.goto("/payments?tab=ringkasan");
      await page.waitForTimeout(3000);
      await dismissOverlays(page);
      await openPin(page);
      break;
    case "pengaturan":
      await page.goto("/settings");
      break;
  }
  await page.waitForTimeout(3000);
  await dismissOverlays(page);
  await page.waitForTimeout(300);
}

/** Ukur layar sekarang + simpan angka mentah sebagai bukti di luar repo. */
async function measure(page: Page, id: ScreenId): Promise<Metrics> {
  const data = (await page.evaluate(COLLECT)) as Metrics;
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, `${test.info().project.name}-${id}.json`), JSON.stringify(data, null, 1));
  return data;
}

/** `h1 → h3` (lompatan > 1 level) dilarang; turun level selalu boleh. */
function headingJump(headings: string[]): string | null {
  let prev = 0;
  for (const h of headings) {
    const level = Number(h.slice(1, 2));
    if (prev > 0 && level > prev + 1) return `H${prev} → H${level} pada "${h}"`;
    prev = level;
  }
  return null;
}

const show = (rows: Array<Record<string, unknown>>) => JSON.stringify(rows, null, 1);

/**
 * Pelanggaran yang SUDAH ADA saat G1-11 ditutup, lengkap dengan tugas
 * pemiliknya. Diukur 2026-10-03 di project `chromium` DAN `mobile` (angkanya
 * identik di keduanya). Bila angka ini berubah, guard akan memberi tahu lewat
 * tes "struktur" pada layar yang sama (angka mentahnya selalu ditulis).
 *
 * CATATAN pembacaan angka (`fontSize`/`weight`): guard membaca
 * `getComputedStyle` — yaitu ukuran yang BENAR-BENAR dirender, dan itulah yang
 * dipakai aturan kontras WCAG.
 *
 * Q25 **SUDAH DIPERBAIKI** di G2-01 (v1.86.0): aturan
 * `button, input, select, textarea { font: inherit }` yang dulu berada DI LUAR
 * `@layer` (dan karena itu mengalahkan `@layer utilities` Tailwind v4, sehingga
 * kelas `text-*`/`font-*` tidak pernah berlaku pada kontrol form) kini berada di
 * dalam `@layer base`. Efeknya pada guard ini nihil: ambang kontras di sini
 * ditentukan ukuran >=/< 18,66px, dan 14px maupun 16px sama-sama butuh 4,5:1.
 */
const RESIDUAL_KONTRAS: Record<string, string> = {
  murid:
    "L-01 sisa (6×): 4,39:1 — `text-gray-500` di atas `bg-gray-100` — 1× tab \"Historis (1)\" " +
    "(Students.tsx:465, keadaan tidak terpilih) dan 5× tombol \"Edit murid\" (Students.tsx:325). " +
    "Tanggung jawab G2-02 (sapu kelas warna ke token). G2-01 hanya menambah token — kelas lama belum disapu.",
  "detail-murid":
    "L-01 sisa (4×): tautan telepon 📞 3,22:1 (14px), \"Total Sesi\" `text-blue-500` di `bg-blue-50` 3,46:1 (12px), " +
    "\"Total Jam\" `text-indigo-500` di `bg-indigo-50` 4,09:1 (12px). Tanggung jawab G2-02 (sapu kelas warna ke token). G2-01 hanya menambah token — kelas lama belum disapu.",
  keuangan:
    "L-01 sisa (6×): \"Perlu ditindaklanjuti\" 3,10:1 · tombol \"Tindak lanjuti di Tagihan\" putih di `bg-amber-600` 3,20:1 · " +
    "\"Uang masuk & keluar\" `green-600` 3,47:1 · \"AI belum aktif\" (nonaktif) 3,20:1 · dua chip rentang grafik " +
    "\"3 bulan\"/\"12 bulan\" 4,39:1 (RingkasanTab.tsx:689, `text-gray-500` di `bg-gray-100`). Tanggung jawab G2-02 (sapu kelas warna ke token). G2-01 hanya menambah token — kelas lama belum disapu.",
};

const RESIDUAL_UKURAN: Record<string, string> = {
  "detail-murid":
    "L-03 sisa (2×): tautan telepon `a[href^=\"tel:\"]` berukuran 126×20 px (butuh ≥24 px). Tanggung jawab G2-06.",
};

/**
 * TASK-11 (lanjutan G2-09) — kebijakan emoji, bukan lagi residual.
 *
 * Emoji **literal** di JSX sudah 0 dan kelompok **struktural** (tipe sesi) sudah
 * memakai ikon SVG. Yang tetap emoji adalah kosakata **keadaan afektif** — mood,
 * situasi, indikator perilaku, tag respons, dan level sesi — dan setiap tombolnya
 * membawa `data-emoji-vocab="affect"`. Guard melewati elemen ber-penanda itu
 * (lihat blok measure()), lalu menuntut **0** emoji di kontrol lain.
 *
 * Karena itu tidak ada `test.fixme` di sini: angka 0 adalah syarat, dan setiap
 * emoji baru di luar kosakata afektif akan menggagalkannya.
 * Kebijakan lengkap: docs/kerja/TASK-11-emoji-ke-svg.md
 */
test.describe("guard metrik UI — emoji di kontrol/heading (TASK-11)", () => {
  for (const screen of SCREENS) {
    test(`${screen.title}`, async ({ page }) => {
      await openScreen(page, screen.id);
      const data = await measure(page, screen.id);
      expect(
        data.emojiInControlsCount,
        `emoji di kontrol/heading di luar kosakata afektif:\n${show(data.emojiInControls)}`,
      ).toBe(0);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. Struktur: heading + pola tab.  Semua layar WAJIB lulus.
// ─────────────────────────────────────────────────────────────────────────────
test.describe("guard metrik UI — struktur (heading & tab)", () => {
  for (const screen of SCREENS) {
    test(`${screen.title}`, async ({ page }) => {
      await openScreen(page, screen.id);
      const data = await measure(page, screen.id);

      expect(data.h1Count, `layar tanpa h1 — heading: ${data.headings.join(" | ")}`).toBeGreaterThanOrEqual(1);
      expect(data.h2Count, `layar tanpa h2 (ambang G1-11) — heading: ${data.headings.join(" | ")}`).toBeGreaterThanOrEqual(1);
      expect(headingJump(data.headings), "lompatan level heading").toBeNull();

      if (data.tabs > 0) {
        expect(data.tabProblems, "role=tab tanpa aria-controls yang menunjuk elemen ada").toEqual([]);
        expect(data.tabpanels, "ada role=tab tetapi tidak ada role=tabpanel").toBeGreaterThan(0);
        expect(data.tabTabindex0, "harus tepat satu tab yang bisa dijangkau Tab per tablist").toBe(data.tablists);
        expect(data.tabSelected, "harus tepat satu tab terpilih per tablist").toBe(data.tablists);
      }
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Kontras teks (L-01) dan ukuran kontrol (L-03).
//
//    Layar yang masih menyimpan pelanggaran lama didaftarkan sebagai
//    `test.fixme` — sesuai DoD G1-11: residual G1-04 didaftarkan dengan
//    rujukan tugas, BUKAN dengan menaikkan ambang. Angka & elemennya diukur
//    ulang setiap kali guard dijalankan (lihat `.design-audit/uiux-guard/`),
//    dan tes "struktur" untuk layar yang sama tetap menulis angka itu sebagai
//    bukti meski tes di bawah ini di-skip.
// ─────────────────────────────────────────────────────────────────────────────
test.describe("guard metrik UI — kontras teks (<4,5:1)", () => {
  for (const screen of SCREENS) {
    test(`${screen.title}`, async ({ page }) => {
      if (screen.id === "murid") {
        test.fixme(true, RESIDUAL_KONTRAS.murid);
      }
      if (screen.id === "detail-murid") {
        test.fixme(true, RESIDUAL_KONTRAS["detail-murid"]);
      }
      if (screen.id === "keuangan") {
        test.fixme(true, RESIDUAL_KONTRAS.keuangan);
      }
      await openScreen(page, screen.id);
      const data = await measure(page, screen.id);
      expect(data.contrastCount, `kontras < ambang AA:\n${show(data.contrast)}`).toBe(0);
    });
  }
});

test.describe("guard metrik UI — kontrol interaktif < 24 px", () => {
  for (const screen of SCREENS) {
    test(`${screen.title}`, async ({ page }) => {
      if (screen.id === "detail-murid") {
        test.fixme(true, RESIDUAL_UKURAN["detail-murid"]);
      }
      await openScreen(page, screen.id);
      const data = await measure(page, screen.id);
      expect(data.smallControlsCount, `kontrol < 24 px:\n${show(data.smallControls)}`).toBe(0);
    });
  }
});
