// Alat bantu: hitung batas blok <Modal>...</Modal> + blok JSX bersarang di
// src/screens/CaptureSession.tsx. Dipakai untuk panduan eksekusi (docs/kerja/).
import fs from "node:fs";

const file = process.argv[2] ?? "src/screens/CaptureSession.tsx";
const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);

let depth = 0;
let start = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (/<Modal[\s>]/.test(line) && !/<\/Modal>/.test(line)) {
    if (depth === 0) start = i + 1;
    depth += 1;
  }
  const closes = (line.match(/<\/Modal>/g) ?? []).length;
  for (let k = 0; k < closes; k++) {
    depth -= 1;
    if (depth === 0) {
      const ctx = lines.slice(Math.max(0, start - 4), start - 1).map((l) => l.trim()).filter(Boolean).join(" | ");
      console.log(`Modal baris ${start}-${i + 1} (${i + 2 - start} baris)  ⟵ konteks: ${ctx.slice(0, 90)}`);
    }
  }
}
console.log("total baris berkas:", lines.length);
