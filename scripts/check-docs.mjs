#!/usr/bin/env node
/**
 * check-docs.mjs — penjaga fakta dokumentasi (keputusan pemilik 2026-10-04, Q-9 opsi A).
 *
 * **Kenapa ada.** Fakta yang berubah setiap commit dulu disalin ke belasan dokumen,
 * lalu basi bersamaan: terukur 2026-10-04 ada **18 tempat di 13 berkas** yang menulis
 * jumlah tes, dan hanya 3 yang benar. Prinsipnya sekarang:
 *
 *   > Angka mutakhir tidak ditulis di dokumen. Sumbernya package.json + gate lokal.
 *   > Dokumen wajib menjelaskan CARA MENGUKURNYA, bukan hasil ukurannya.
 *
 * Karena itu gate ini **bukan** pencari angka — ia menjaga klaim yang bisa dipastikan salah:
 *
 *   R1 — KLAIM KEADAAN APLIKASI. Baris yang menyatakan keadaan aplikasi sekarang
 *        ("versi aplikasi", "aplikasi berjalan", "versi sekarang", "status aplikasi")
 *        wajib cocok dengan `package.json`. Angka versi di catatan rilis, tabel riwayat,
 *        arsip, dan dokumen potret historis **bukan** klaim keadaan — tidak diperiksa.
 *
 *   R2 — KEPALA DOKUMEN AKTIF. Blok ```yaml di baris atas dokumen aktif memuat
 *        `versi_app: vX.Y.Z` dan/atau `test: NNN …`. Keduanya wajib cocok dengan kenyataan
 *        (versi dari package.json, jumlah tes dari suite). Kepala dokumen adalah tempat
 *        yang paling dipercaya pembaca, jadi justru di situ pembusukan paling mahal.
 *        Untuk dokumen potret/riwayat, tulis `versi_app_potret:` — bukan `versi_app:`.
 *
 *   R3 — JEBAKAN ARSIP. Dokumen aktif di `docs/**` tidak boleh menautkan berkas yang
 *        sudah berada di `docs/arsip/` seolah masih di tempat lama. (Berkas arsip yang
 *        saling menautkan di dalam `arsip/` wajar.)
 *
 * Angka tes untuk R2 dibaca dari `test-results/` bila ada; kalau tidak ada, aturan R2
 * hanya memeriksa `versi_app`.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DOCS = join(ROOT, "docs");
const ARSIP = join(DOCS, "arsip");

const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const APP_VERSION = `v${pkg.version}`;

/**
 * Jumlah tes suite terakhir — dibaca dari artefak, tidak ditebak.
 *
 * **Kenapa di akar repo, bukan `test-results/` (diperbaiki 2026-10-05).**
 * `test-results/` adalah direktori keluaran **Playwright** (lihat `.gitignore`
 * bagian "# Playwright") — setiap `npm run e2e` membersihkannya, sehingga
 * artefak ini pernah terhapus **dua kali** dan gate-nya lalu melaporkan
 * "belum ada (R2 tes dilewati)" sambil tetap **lulus**: pemeriksaan jumlah tes
 * di kepala dokumen aktif mati tanpa satu pun galat. Di akar repo, tidak ada
 * alat yang menghapusnya. Berkas tetap gitignored.
 */
const SUITE_ARTIFACT = ".design-audit-suite.json";
const SUITE_ARTIFACT_LAMA = "test-results/suite-summary.json";

function readTestFacts() {
  const f = join(ROOT, SUITE_ARTIFACT);
  if (!existsSync(f)) {
    // Jejak versi lama: kalau berkasnya ADA di lokasi lama namun tidak terbaca
    // (mis. BOM membuat JSON.parse gagal), itu kegagalan yang harus terlihat —
    // bukan "tidak ada artefak".
    const lama = join(ROOT, SUITE_ARTIFACT_LAMA);
    if (existsSync(lama)) {
      console.error(
        `check-docs: PERINGATAN — ${SUITE_ARTIFACT_LAMA} ada tetapi TIDAK TERBACA ` +
        `(JSON rusak?), dan lokasi resminya sekarang ${SUITE_ARTIFACT}. ` +
        `Periksa byte pertama (harus 123 = "{", bukan BOM).`,
      );
    }
    return null;
  }
  try {
    const j = JSON.parse(readFileSync(f, "utf8"));
    if (typeof j.tests === "number" && typeof j.files === "number") return j;
    console.error(`check-docs: PERINGATAN — ${SUITE_ARTIFACT} tidak memuat tests/files; R2 dilewati.`);
  } catch (e) {
    console.error(`check-docs: PERINGATAN — ${SUITE_ARTIFACT} gagal di-parse (${e.message}); R2 dilewati.`);
  }
  return null;
}
const TESTS = readTestFacts();

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith(".md")) out.push(full);
  }
  return out;
}

const files = [...walk(DOCS), join(ROOT, "README.md")];
const rel = (f) => relative(ROOT, f).replace(/\\/g, "/");
const isArchived = (f) => rel(f).startsWith("docs/arsip/");

const violations = [];
const push = (file, line, rule, message) => violations.push({ file: rel(file), line, rule, message });

// ── R1 — klaim keadaan aplikasi ────────────────────────────────────────────
const KLAIM_KEADAAN = /\b(versi aplikasi|aplikasi berjalan|versi sekarang|status aplikasi|app version)\b/i;
const CATATAN_RIWAYAT = /\b(riwayat|baseline|dibuat|dibekukan|potret|sebelumnya|saat itu|dulu|rilis|dirilis|changelog)\b/i;

for (const file of files) {
  if (isArchived(file)) continue;
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line || !KLAIM_KEADAAN.test(line)) return;
    if (CATATAN_RIWAYAT.test(line)) return;
    for (const m of line.matchAll(/\bv(\d+\.\d+\.\d+)/g)) {
      if (m[1] === pkg.version) continue;
      push(file, i + 1, "R1", `mengklaim keadaan aplikasi v${m[1]}, padahal package.json = v${pkg.version}`);
    }
  });
}

// ── R2 — kepala dokumen aktif ──────────────────────────────────────────────
for (const file of files) {
  if (isArchived(file)) continue;
  const text = readFileSync(file, "utf8");
  const head = text.match(/```yaml\r?\n([\s\S]*?)```/);
  if (!head) continue;
  const block = head[1];
  const startLine = text.slice(0, head.index).split(/\r?\n/).length + 1;

  const ver = block.match(/^\s*versi_app\s*:\s*(v?[\d.]+)\s*$/m);
  if (ver && `v${ver[1].replace(/^v/, "")}` !== APP_VERSION) {
    push(file, startLine, "R2", `kepala dokumen mengaku versi_app ${ver[1]}, padahal package.json = ${APP_VERSION}`);
  }

  if (TESTS) {
    const t = block.match(/^\s*test\s*:\s*(\d{3,4})\s*(?:lulus)?\s*\/?\s*(\d{1,3})?\s*berkas/m);
    if (t) {
      const tests = Number(t[1]);
      const berkas = t[2] ? Number(t[2]) : null;
      if (tests !== TESTS.tests || (berkas !== null && berkas !== TESTS.files)) {
        push(file, startLine, "R2",
          `kepala dokumen menulis test ${tests}${berkas ? `/${berkas} berkas` : ""}, kenyataan ${TESTS.tests}/${TESTS.files}`);
      }
    }
  }
}

// ── R3 — jebakan arsip ─────────────────────────────────────────────────────
// Bukti, bukan dugaan: tautan hanya dilaporkan bila (a) targetnya memang tidak ada
// dari lokasi berkas itu, DAN (b) berkas bernama sama ada di docs/arsip/.
const archivedNames = new Set(
  readdirSync(ARSIP)
    .filter((n) => n.endsWith(".md") && n !== "README.md")
    .map((n) => n.replace(/\.md$/, "")),
);

for (const file of files) {
  if (isArchived(file)) continue;
  const text = readFileSync(file, "utf8");
  const dir = dirname(file);
  text.split(/\r?\n/).forEach((line, i) => {
    if (!line.includes(".md")) return;
    for (const m of line.matchAll(/\]\(([^)\s]+\.md)(#[^)]*)?\)/g)) {
      const target = m[1];
      if (/^https?:/.test(target)) continue;
      if (existsSync(join(dir, decodeURIComponent(target)))) continue; // tautan hidup
      const base = target.split("/").pop().replace(/\.md$/, "");
      if (!archivedNames.has(base)) continue; // patah karena sebab lain — bukan urusan gate ini
      push(file, i + 1, "R3", `tautan \`${target}\` patah; berkas itu ada di docs/arsip/${base}.md`);
    }
  });
}

// ── Laporan ────────────────────────────────────────────────────────────────
if (violations.length === 0) {
  const t = TESTS ? ` · suite terakhir ${TESTS.tests}/${TESTS.files}` : " · test-results/ belum ada (R2 tes dilewati)";
  console.log(`check-docs: OK — ${APP_VERSION}${t} · ${files.length} berkas diperiksa · 0 pelanggaran.`);
  process.exit(0);
}

console.error(`check-docs: ${violations.length} pelanggaran (aplikasi ${APP_VERSION}${TESTS ? `, suite ${TESTS.tests}/${TESTS.files}` : ""})\n`);
for (const v of violations) {
  console.error(`  [${v.rule}] ${v.file}:${v.line} — ${v.message}`);
}
console.error(`
Cara membetulkan:
  R1  hapus/betulkan klaim keadaannya, atau ubah jadi catatan bertanggal
      ("per 2026-10-03 aplikasi v1.86.0 …") yang juga menyebut kata penanda riwayat.
  R2  samakan kepala dokumen dengan kenyataan; untuk dokumen potret pakai
      "versi_app_potret:" alih-alih "versi_app:", dan jangan tulis jumlah tes mutakhir
      di kepala dokumen — ganti dengan perintah pengukurnya.
  R3  ubah tautannya menjadi ../arsip/<berkas>.md.
`);
process.exit(1);
