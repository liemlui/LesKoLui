/**
 * Self-test pemeriksa daftar periksa — `scripts/check-docs-checklist.mjs`.
 *
 * **Kenapa ini wajib.** Aturan dari sistem dokumentasi di repo ini: *"pagar yang
 * tidak pernah terbukti bisa gagal tidak layak dipercaya."* Di repo asal sistem
 * itu, tiga kali sebuah pemeriksaan tampak hijau padahal tidak memeriksa apa pun.
 * Karena itu self-test di sini **dua arah**: memastikan pemeriksa GAGAL saat
 * seharusnya gagal, dan LULUS saat seharusnya lulus.
 *
 * Jalankan: `node scripts/check-docs-checklist.selftest.mjs`
 */
import { TANDA_SAH, ambilBagian, periksaDaftarPeriksa } from "./check-docs-checklist.mjs";

let gagal = 0;

function harus(deskripsi, syarat) {
  if (syarat) {
    console.log(`  ok   ${deskripsi}`);
  } else {
    gagal += 1;
    console.log(`  GAGAL ${deskripsi}`);
  }
}

/** Daftar periksa sintetis: isinya bisa diubah supaya memicu satu pelanggaran tertentu. */
function daftar(butir) {
  return [
    "## 5. Daftar periksa manual",
    "",
    // Selalu ada teks sesudah "N. " — tanpa itu barisnya tidak berbentuk butir, dan
    // self-test akan menguji daftar kosong tanpa sadar (itu sempat terjadi).
    ...butir.map((b, i) => `${i + 1}. Butir ${i + 1}. ${b}`.trimEnd()),
    "",
    "## 6. Riwayat berkas ini",
  ].join("\n");
}

console.log("check-docs-checklist selftest");

console.log(" A. arah LULUS (pemeriksa tidak boleh berisik)");
{
  // Tanda ditulis terpisah supaya baris ini tidak ikut dibaca pemeriksa lain.
  const isi = daftar(["— \u2705 dilihat pemilik", "", "— \u23ED dilewati atas keputusan pemilik", ""]);
  const { temuan, jumlahButir } = periksaDaftarPeriksa(isi);
  harus("empat butir tanpa temuan", temuan.length === 0);
  harus("jumlah butir terbaca 4", jumlahButir === 4);
}
{
  const isi = daftar(["", "", ""]);
  const { temuan } = periksaDaftarPeriksa(isi);
  harus("butir tanpa tanda sama sekali tetap lulus", temuan.length === 0);
}
{
  // Alarm palsu yang sudah terbukti terjadi: catatan butir menerangkan aturannya
  // dengan menulis tanda di dalam backtick. Itu penjelasan, bukan tanda.
  const isi = daftar(["— tanpa tanda, sebab tanda `\u23F3` sudah dicabut oleh D13"]);
  const { temuan } = periksaDaftarPeriksa(isi);
  harus("tanda di dalam backtick diabaikan (bukan alarm palsu)", temuan.length === 0);
}

console.log(" B. arah GAGAL (pemeriksa harus menggigit)");
{
  // Inilah kerusakan asli yang memicu aturan ini: satu butir dengan dua tanda.
  // Ditulis lewat kode escape supaya berkas self-test ini sendiri tidak dianggap
  // memuat tanda terlarang bila suatu saat ikut dipindai.
  const isi = daftar([`— \u2705 dilihat pemilik, \u23F3 belum diperiksa mata pemilik`]);
  const { temuan } = periksaDaftarPeriksa(isi);
  harus("tanda sah + tanda dicabut di satu butir terdeteksi", temuan.some((t) => t.jenis === "tanda-ganda"));
}
{
  const isi = daftar([`— \u2705 satu, \u23ED dua`]);
  const { temuan } = periksaDaftarPeriksa(isi);
  harus("dua tanda sah sekaligus terdeteksi", temuan.some((t) => t.jenis === "tanda-ganda"));
}
{
  // `⏳` dicabut oleh D13 — kehadirannya harus dilaporkan, bukan diabaikan.
  const isi = daftar([`— \u2705 selesai`, `— \u23F3 menunggu`]);
  const { temuan } = periksaDaftarPeriksa(isi);
  harus("tanda yang sudah dicabut terdeteksi", temuan.some((t) => t.jenis === "tanda-dicabut"));
}
{
  const isi = ["## 5. X", "1. Satu.", "3. Tiga.", "", "## 6. Y"].join("\n");
  const { temuan } = periksaDaftarPeriksa(isi);
  harus("nomor butir yang bolong terdeteksi", temuan.some((t) => t.jenis === "nomor-bolong" && t.nomor === 2));
}
{
  const isi = ["## 5. X", "1. Satu.", "1. Satu lagi.", "", "## 6. Y"].join("\n");
  const { temuan } = periksaDaftarPeriksa(isi);
  harus("nomor butir kembar terdeteksi", temuan.some((t) => t.jenis === "nomor-ganda"));
}
{
  const isi = daftar(["— ✓ dicentang tangan"]);
  const { temuan } = periksaDaftarPeriksa(isi);
  harus("tanda tak dikenal terdeteksi", temuan.some((t) => t.jenis === "tanda-tak-dikenal"));
}

console.log(" C. pemisahan bagian (alarm palsu dicegah)");
{
  const teks = [
    "# Judul",
    "",
    "Prosa yang menyebut ✅ dan ⏳ di luar daftar — ini BUKAN butir.",
    "",
    "## 5. Daftar periksa manual",
    "1. Butir satu. — ✅ selesai",
    "",
    "## 6. Riwayat berkas ini",
    "| 2026-10-15 | Riwayat yang memuat ✅ dan ⏳ di dalam tabel |",
  ].join("\n");
  const isi = ambilBagian(teks, "## 5. ");
  const { temuan, jumlahButir } = periksaDaftarPeriksa(isi);
  harus("bagian 5 terambil, bagian lain tidak", isi !== null && !isi.includes("Riwayat yang memuat"));
  harus("tanda di prosa dan riwayat tidak dihitung", temuan.length === 0 && jumlahButir === 1);
}
{
  const isi = ambilBagian("# Judul\n\ntanpa bagian 5\n", "## 5. ");
  harus("bagian yang tidak ada mengembalikan null", isi === null);
}

console.log(" D. kesepakatan daftar tanda");
harus(`tanda sah = ${TANDA_SAH.join(", ")}`, TANDA_SAH.length === 2 && TANDA_SAH.includes("✅") && TANDA_SAH.includes("⏭"));

if (gagal > 0) {
  console.log(`\ncheck-docs-checklist selftest: ${gagal} GAGAL`);
  process.exit(2);
}
console.log("\ncheck-docs-checklist selftest: OK — memeriksa arah lulus dan arah gagal");
