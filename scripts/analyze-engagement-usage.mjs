// Analisis frekuensi indikator engagement dari data nyata tutor (CSV ekspor).
// Dipakai untuk mengurutkan 6 indikator "terdepan" di langkah Kondisi (audit #13).
import fs from "node:fs";

const csv = fs.readFileSync(new URL("../leskolui-data-2026-08-23.csv", import.meta.url), "utf8");
const lines = csv.split(/\r?\n/);

// Ambil blok SESI saja
const start = lines.findIndex((l) => l.trim() === "### SESI");
const end = lines.findIndex((l, i) => i > start && l.trim().startsWith("### "));
const rows = lines.slice(start + 1, end === -1 ? undefined : end).filter((l) => l.startsWith('"'));

console.log("baris sesi:", rows.length);

// frasa yang muncul di "Catatan" untuk tiap sinyal (dari sessionTemplates/engagement)
const SIGNALS = {
  prepared: [/datang siap/i],
  focused: [/fokus sepanjang sesi/i],
  activeAsking: [/aktif bertanya/i],
  quickLearner: [/cepat memahami/i],
  drowsy: [/mengantuk/i, /ngantuk/i],
  playingPhone: [/main hp/i, /bermain hp/i],
  needsRepetition: [/perlu diulang/i],
  hwMissed: [/pr tidak/i, /tidak mengerjakan pr/i],
  late: [/terlambat/i, /\btelat\b/i],
  bathroomBreaks: [/sering ke toilet/i, /toilet/i],
  restless: [/gelisah/i],
  offTask: [/sibuk sendiri/i, /tidak fokus pada tugas/i],
};

const counts = {};
const withEngagement = rows.filter((r) => /Kondisi belajar/i.test(r));
console.log("sesi yang punya penanda 'Kondisi belajar:' (indikator benar-benar dicatat):", withEngagement.length);
console.log("sesi yang hanya punya narasi kondisi (tanpa penanda):", rows.filter((r) => /Suasana sesi/i.test(r)).length);
for (const [key, patterns] of Object.entries(SIGNALS)) {
  counts[key] = withEngagement.filter((r) => patterns.some((p) => p.test(r))).length;
}

const scored = Object.entries(counts).sort((a, b) => b[1] - a[1]);
console.log(`sesi yang menyebut kondisi/narasi: ${withEngagement.length}`);
for (const [k, v] of scored) {
  const pct = Math.round((v / withEngagement.length) * 100);
  console.log(`  ${k.padEnd(16)} ${String(v).padStart(4)}  (${pct}%)`);
}

// Sebaran skor
const scoreCol = rows.map((r) => {
  const m = r.match(/,"(\d{1,2})","/g);
  return m ? Number(m[0].replace(/[",]/g, "")) : null;
}).filter((n) => n !== null && n >= 1 && n <= 10);
const dist = {};
for (const s of scoreCol) dist[s] = (dist[s] ?? 0) + 1;
console.log("\nsebaran skor:", JSON.stringify(dist));
const zeros = rows.filter((r) => /,"0","|,"","/.test(r.slice(0, 120))).length;
console.log("baris dengan skor 0/kosong (perkiraan):", zeros);
