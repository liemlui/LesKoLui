/**
 * Pemeriksa daftar periksa manual — keputusan pemilik 2026-10-15 (butir B6, D13).
 *
 * **Kerusakan yang ditutup.** Butir 42 di `docs/kerja/PEKERJAAN.md` §5 memuat `✅`
 * DAN `⏳` sekaligus di satu baris. Akibatnya dua dokumen menghitung sisanya dengan
 * cara berbeda dan hasilnya berbeda — `SERAH-TERIMA.md` menulis "dua puluh dua
 * butir", `PEKERJAAN.md` menulis "dua puluh butir", dan keduanya salah. Akarnya
 * sama dengan kekacauan 2026-10-14: **status dihitung dari ingatan, bukan dari
 * penelusuran.** Karena itu aturan yang berlaku sekarang: satu butir satu tanda,
 * kalimat penghitung dihapus dari dokumen, dan penghitungnya mesin — skrip ini.
 *
 * **Tiga hal yang diperiksa:**
 * 1. setiap butir punya **paling banyak satu** tanda (`✅` atau `⏭`);
 * 2. nomor butir **berurutan tanpa bolong** mulai dari 1;
 * 3. tidak ada tanda yang **tidak dikenal** di dalam daftar (mis. `⏳` yang sudah
 *    dihapus, atau `✓` yang ditulis tangan).
 *
 * **Yang TIDAK diperiksa, dan itu disengaja:** jumlahnya tidak ditulis balik ke
 * dokumen mana pun. Dokumen menyimpan tanda per butir; angkanya dilaporkan skrip
 * ini setiap kali dijalankan, sehingga tidak ada angka yang bisa basi.
 *
 * **Cara memakai:** `node scripts/check-docs-checklist.mjs` (dipanggil oleh
 * `npm run check:docs`). Keluar `2` bila ada pelanggaran, `1` bila berkasnya tidak
 * ketemu, `0` bila lulus — pemisahan itu disengaja supaya "gate merah" tidak
 * tertukar dengan "skripnya rusak".
 *
 * Logikanya dipisah ke `periksaDaftarPeriksa()` supaya bisa diuji self-test
 * (`check-docs-checklist.selftest.mjs`) — gate yang tidak pernah terbukti bisa
 * gagal tidak layak dipercaya.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

/** Tanda yang sah beserta artinya. `⏳` **tidak** termasuk — sejak D13. */
export const TANDA_SAH = ["✅", "⏭"];
/** Tanda yang pernah dipakai lalu dicabut; dilaporkan khusus supaya sebabnya jelas. */
export const TANDA_DICABUT = ["⏳"];

const BARIS_BUTIR = /^(\d+)\.\s/;

/**
 * Apakah baris ini memakai sebuah tanda **sebagai tanda butir**?
 *
 * Tanda di dalam `backtick` sengaja diabaikan: catatan butir sering menulis
 * "tanda `⏳` dicabut" untuk menjelaskan aturannya, dan kalimat penjelasan itu
 * bukan tanda. Tanpa aturan ini pemeriksa akan menggigit dokumen yang justru
 * sedang menerangkan aturannya — dan pagar yang berisik akan dimatikan orang.
 */
function memilikiTanda(baris, tanda) {
  const tanpaKode = baris.replace(/`[^`]*`/g, "");
  return tanpaKode.includes(tanda);
}

/**
 * Ambil isi satu bagian bernomor dari teks markdown.
 *
 * Dipakai alih-alih memeriksa seluruh berkas karena `PEKERJAAN.md` memuat tanda
 * `✅`/`⏳` juga di **prosa** (tabel riwayat dan catatan penghitung), dan prosa itu
 * bukan daftar periksa. Memeriksa seluruh berkas akan melahirkan alarm palsu —
 * jebakan yang sudah pernah terjadi di repo asal sistem ini.
 */
export function ambilBagian(teks, judulBagian) {
  const baris = teks.split(/\r?\n/);
  const mulai = baris.findIndex((l) => l.startsWith(judulBagian));
  if (mulai === -1) return null;
  const sisa = baris.slice(mulai + 1);
  const akhir = sisa.findIndex((l) => /^##\s/.test(l));
  return (akhir === -1 ? sisa : sisa.slice(0, akhir)).join("\n");
}

/**
 * Periksa isi daftar periksa. Mengembalikan daftar temuan (kosong = lulus).
 *
 * `temuan[].jenis` bernilai `butir-ganda`, `tanda-ganda`, `tanda-dicabut`,
 * `tanda-tak-dikenal`, `nomor-bolong`, atau `nomor-ganda` — nama jenisnya dipakai
 * self-test untuk memastikan pemeriksa ini benar-benar bisa gagal.
 */
export function periksaDaftarPeriksa(isiBagian) {
  const temuan = [];
  const baris = (isiBagian ?? "").split(/\r?\n/);
  const nomorTerlihat = [];
  const nomorGanda = new Set();
  for (let i = 0; i < baris.length; i += 1) {
    const cocok = BARIS_BUTIR.exec(baris[i]);
    if (!cocok) continue;
    const nomor = Number(cocok[1]);
    const isi = baris[i];
    // Baris **kutipan** (`>`) bukan butir daftar periksa: catatan di bagian 5
    // sering mengutip ulang tanda sebuah butir beserta sebabnya, dan menghitung
    // kutipan itu sebagai tanda butir melahirkan alarm palsu — jenis kesalahan
    // yang membuat orang mematikan pagar.
    if (/^\s*>/.test(isi)) continue;
    if (nomorTerlihat.includes(nomor)) nomorGanda.add(nomor);
    nomorTerlihat.push(nomor);

    const jumlahSah = TANDA_SAH.filter((t) => memilikiTanda(isi, t)).length;
    const jumlahDicabut = TANDA_DICABUT.filter((t) => memilikiTanda(isi, t)).length;
    // "Dua tanda" mencakup gabungan tanda sah + tanda yang sudah dicabut, sebab
    // justru itulah kerusakan aslinya (butir 42 memuat ✅ **dan** ⏳) — dan itulah
    // yang membuat dua dokumen menghitung sisanya dengan hasil berbeda.
    if (jumlahSah > 1 || (jumlahSah > 0 && jumlahDicabut > 0)) {
      temuan.push({
        jenis: "tanda-ganda",
        nomor,
        baris: isi.slice(0, 160),
        pesan: `butir ${nomor} punya ${jumlahSah + jumlahDicabut} tanda (${[...TANDA_SAH, ...TANDA_DICABUT].filter((t) => isi.includes(t)).join(" ")}) — satu butir satu tanda`,
      });
    }
    if (jumlahDicabut > 0) {
      temuan.push({
        jenis: "tanda-dicabut",
        nomor,
        baris: isi.slice(0, 160),
        pesan: `butir ${nomor} memakai tanda yang sudah dicabut (${TANDA_DICABUT.filter((t) => isi.includes(t)).join(" ")}) — butir yang belum ditutup cukup tanpa tanda`,
      });
    }
    // Tanda lain yang sering ditulis tangan dan tidak punya arti resmi di sini.
    for (const t of ["✓", "☑", "⏸", "🚧", "❌"]) {
      if (isi.includes(t)) {
        temuan.push({
          jenis: "tanda-tak-dikenal",
          nomor,
          pesan: `butir ${nomor} memakai tanda tak dikenal "${t}" — yang sah hanya ${TANDA_SAH.join(" dan ")}`,
        });
      }
    }
  }

  for (const nomor of nomorGanda) {
    temuan.push({ jenis: "nomor-ganda", nomor, pesan: `nomor butir ${nomor} muncul lebih dari sekali` });
  }

  const urut = [...new Set(nomorTerlihat)].sort((a, b) => a - b);
  const tertinggi = urut.at(-1) ?? 0;
  for (let n = 1; n <= tertinggi; n += 1) {
    if (!urut.includes(n)) {
      temuan.push({ jenis: "nomor-bolong", nomor: n, pesan: `butir nomor ${n} hilang dari daftar` });
    }
  }

  return { temuan, jumlahButir: urut.length, tanda: hitungTanda(isiBagian) };
}

/** Jumlah tiap tanda yang sah — dilaporkan, tidak ditulis ke dokumen mana pun. */
function hitungTanda(isiBagian) {
  const hasil = {};
  for (const t of [...TANDA_SAH, ...TANDA_DICABUT]) {
    hasil[t] = (isiBagian ?? "").split(/\r?\n/).filter((l) => BARIS_BUTIR.test(l) && l.includes(t)).length;
  }
  return hasil;
}

const BERKAS = "docs/kerja/PEKERJAAN.md";
const JUDUL_BAGIAN = "## 5. ";

function main() {
  const root = process.cwd();
  const penuh = path.join(root, BERKAS);
  if (!fs.existsSync(penuh)) {
    console.log(`check-docs-checklist: berkas tidak ditemukan: ${BERKAS}`);
    process.exit(1);
  }
  const isi = ambilBagian(fs.readFileSync(penuh, "utf8"), JUDUL_BAGIAN);
  if (isi === null) {
    console.log(`check-docs-checklist: bagian "${JUDUL_BAGIAN.trim()}" tidak ada di ${BERKAS}`);
    process.exit(1);
  }

  const { temuan, jumlahButir, tanda } = periksaDaftarPeriksa(isi);
  const ringkas = Object.entries(tanda).map(([t, n]) => `${t} ${n}`).join(" · ");
  if (temuan.length === 0) {
    console.log(`check-docs-checklist: OK — ${jumlahButir} butir · ${ringkas} · 0 pelanggaran`);
    process.exit(0);
  }
  for (const t of temuan) console.log(`check-docs-checklist: PELANGGARAN — ${t.pesan}${process.env.CHECK_DEBUG ? `\n  baris: ${t.baris}` : ""}`);
  console.log(`\ncheck-docs-checklist: ${temuan.length} pelanggaran · ${jumlahButir} butir · ${ringkas}`);
  process.exit(2);
}

// Hanya jalan sebagai skrip, tidak saat di-import self-test.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
