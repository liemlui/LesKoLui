/**
 * Aturan murni untuk kolom "💰 Biaya" di modal catatan sesi.
 *
 * **Kenapa dipisah ke berkas sendiri.** Repo ini tidak memasang jsdom, jadi
 * perilaku kolom isian hanya bisa dijaga kalau aturannya berbentuk fungsi murni
 * (pola yang sama dengan `raporForm.ts` dan `perbandinganNilaiRows.ts`).
 *
 * **Dua bug nyata yang ditutup berkas ini** (dilaporkan pemilik 2026-10-14,
 * sesudah memeriksa butir 44 di perangkat):
 *
 * 1. **Menghapus isi kolom menyisakan "0".** Dulu `onChange` menulis
 *    `setCostOverride(0)` untuk isian kosong, sehingga setelah tutor menghapus
 *    nilainya, kolomnya **terisi 0** dan mengetik nilai baru harus menghapus
 *    angka 0 itu lebih dulu. Sekarang isian kosong berarti **"kembali ke
 *    hitungan otomatis"** — bukan nominal nol rupiah.
 * 2. **Menyimpan 0 menyimpan nominal lama.** Karena 0 dianggap "tidak berubah",
 *    niat tutor untuk melepas nominal manual tidak pernah tersampaikan. Sekarang
 *    kosong/0 secara eksplisit berarti **lepas nominal manual**, dan itu
 *    dikirim sebagai patch yang jelas (`costOverride: null`).
 *
 * Yang **tidak** berubah dan tetap dihormati: `costOverride` adalah pernyataan
 * eksplisit tutor (`ATURAN-AI.md` §5) dan tidak boleh dihitung ulang mesin.
 * Fungsi di sini tidak pernah menghitung biaya otomatis — ia hanya memutuskan
 * apakah nominal manualnya dipasang, diubah, atau dilepas.
 */

/** Apa yang dibaca dari kolom isian: nominal manual, atau "kembali otomatis". */
export type BiayaSesiInput =
  | { mode: "auto" }
  | { mode: "manual"; nilai: number };

/**
 * Baca isian tutor menjadi maksud yang jelas.
 *
 * Aturan yang mengikat: **hanya digit** yang dihitung. Kolom `type="number"`
 * bisa mengirim `"0"`, `""`, tanda minus, atau notasi ilmiah (`"1e5"`) — dan
 * `parseInt("1e5")` menghasilkan 1, angka yang sama sekali bukan maksud tutor.
 * Karena itu seluruh karakter selain digit dibuang lebih dulu, lalu:
 *
 * - tanpa digit sama sekali (termasuk `""`, `"-"`, `"abc"`) → `auto`;
 * - digitnya nol semua (`"0"`, `"000"`) → `auto`, sebab nominal sesi **nol
 *   rupiah bukan nominal yang masuk akal** dan nol itulah yang dipakai tutor
 *   untuk mengatakan "jangan pakai nominal manual";
 * - selain itu → `manual` dengan nilai digitnya.
 */
export function bacaBiayaSesi(teks: string): BiayaSesiInput {
  const digit = teks.replace(/\D/g, "");
  if (digit === "") return { mode: "auto" };
  const nilai = Number(digit);
  if (!Number.isFinite(nilai) || nilai <= 0) return { mode: "auto" };
  return { mode: "manual", nilai };
}

/**
 * Perubahan nominal yang perlu dikirim ke `updateSession`, atau `null` bila
 * memang tidak ada yang berubah (supaya menyimpan catatan tidak menyentuh uang
 * tanpa alasan).
 *
 * `overrideAsli` adalah `session.costOverride` yang tersimpan: `null`/`undefined`
 * berarti sesi itu **belum** punya nominal manual.
 */
export function patchBiayaSesi(
  input: BiayaSesiInput,
  overrideAsli: number | null | undefined,
): { cost: number; costOverride: number | null } | null {
  const asli = overrideAsli ?? null;

  if (input.mode === "auto") {
    // Belum ada nominal manual → tidak ada yang perlu dilepas.
    if (asli === null) return null;
    // Ada nominal manual dan tutor mengosongkan kolomnya → lepas, mesin
    // menghitung ulang. `null` (bukan `undefined`) supaya niatnya eksplisit.
    return { cost: 0, costOverride: null };
  }

  if (asli === input.nilai) return null;
  return { cost: input.nilai, costOverride: input.nilai };
}
