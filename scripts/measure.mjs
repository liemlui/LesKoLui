#!/usr/bin/env node
/**
 * measure.mjs — cetak fakta yang berubah sering, supaya dokumen tidak perlu menyimpannya.
 *
 * Dipakai oleh `ATURAN-AI` §5/§6: dokumen memuat PERINTAH-nya, bukan hasilnya.
 * Hasil yang ditulis di dokumen selalu basi; perintah yang bisa dijalankan tidak pernah basi.
 *
 *   node scripts/measure.mjs            # semua
 *   node scripts/measure.mjs loc        # hanya baris berkas besar
 *   node scripts/measure.mjs tests      # hanya jumlah tes/berkas di src/__tests__ + src/**
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const which = process.argv[2] ?? "all";

/** Berkas besar yang berulang kali salah dikutip di dokumen. */
const BIG = [
  "src/screens/MonthlyReport.tsx",
  "src/screens/CaptureSession.tsx",
  "src/screens/Settings.tsx",
  "src/screens/StudentDetail.tsx",
  "src/screens/payments/TagihanTab.tsx",
];

/** Jumlah baris — dihitung sama seperti `(Get-Content <berkas>).Count` di PowerShell,
 *  supaya angka di laporan agen dan angka skrip ini tidak pernah berbeda 1. */
const lines = (p) => readFileSync(join(ROOT, p), "utf8").replace(/\n$/, "").split("\n").length;

if (which === "all" || which === "loc") {
  console.log("Baris berkas besar (bukan target/DoD — hanya penanda apakah sudah dipecah):");
  for (const f of BIG) {
    const n = existsSync(join(ROOT, f)) ? String(lines(f)) : "TIDAK ADA";
    console.log(`  ${n.padStart(6)}  ${f}`);
  }
}

if (which === "all" || which === "tests") {
  let files = 0;
  let cases = 0;
  const walk = (dir) => {
    for (const e of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(rel);
      else if (/\.(test|spec)\.(ts|tsx)$/.test(e.name)) {
        files++;
        const text = readFileSync(join(ROOT, rel), "utf8");
        cases += (text.match(/\b(it|test)\s*\(/g) ?? []).length;
      }
    }
  };
  walk("src");
  const hasil = existsSync(join(ROOT, "test-results/suite-summary.json"))
    ? JSON.parse(readFileSync(join(ROOT, "test-results/suite-summary.json"), "utf8"))
    : null;
  console.log("\nTes:");
  console.log(`  berkas uji di src/ : ${files}`);
  console.log(`  kasus (perkiraan dari \`it(\`/\`test(\`) : ${cases}   ← perkiraan; angka RESMI = keluaran vitest`);
  if (hasil) {
    console.log(`  hasil run terakhir (test-results/suite-summary.json, ${hasil.measured_at}): ${hasil.tests} lulus / ${hasil.files} berkas`);
    console.log(`  perintahnya: ${hasil.command}`);
  } else {
    console.log("  hasil run terakhir: belum ada test-results/suite-summary.json → jalankan `npm run test:sandbox`");
  }
}

if (which === "all") {
  console.log("\nVersi aplikasi:");
  console.log(`  ${JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).version}  (dari package.json)`);
}
