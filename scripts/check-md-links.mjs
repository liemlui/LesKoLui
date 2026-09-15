// Pemeriksa tautan markdown lokal: laporkan tautan relatif (.md) yang menunjuk
// berkas tidak ada, untuk semua .md di repo (kecuali node_modules).
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.toLowerCase().endsWith(".md")) out.push(full);
  }
  return out;
}

const files = walk(root);
let checked = 0;
let broken = 0;

for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  for (const m of text.matchAll(/\]\(([^)\s]+\.md)(#[^)]*)?\)/g)) {
    const target = m[1];
    if (/^[a-z]+:\/\//i.test(target)) continue; // tautan luar
    checked += 1;
    const resolved = path.resolve(path.dirname(file), decodeURIComponent(target));
    if (!fs.existsSync(resolved)) {
      broken += 1;
      console.log(`RUSAK  ${path.relative(root, file)}  ->  ${target}`);
    }
  }
}

console.log(`\nberkas md diperiksa: ${files.length} | tautan lokal diperiksa: ${checked} | rusak: ${broken}`);
