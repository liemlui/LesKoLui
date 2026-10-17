/**
 * Fixture HTML tabel tarif DeepSeek — dipakai tes parser **dan** tes handler.
 *
 * **Bukan salinan halaman asli.** Ia disusun dari bentuk teks halaman
 * (https://api-docs.deepseek.com/quick_start/pricing, dibaca 2026-10-18):
 * label metrik diikuti periode, lalu harga dua model. Tujuannya menguji logika
 * jangkar, pemotongan segmen, urutan empat angka, dan invarian harga — bukan
 * menguji apakah DeepSeek masih memasang tabelnya.
 *
 * Parser-nya sendiri sudah dicocokkan sekali dengan HTML asli lewat
 * `node .dsh-tmp/cek-tarif.mjs` (HTTP 200, 25.967 byte, `warnings: []`).
 */

/** [off-peak flash, off-peak pro, peak flash, peak pro] — urutan kolom di dokumentasi. */
export type Empat = [number, number, number, number];

export const TARIF_NORMAL = {
  hit: [0.003, 0.022, 0.006, 0.044] as Empat,
  miss: [0.15, 0.66, 0.3, 1.32] as Empat,
  out: [0.6, 1.98, 1.2, 3.96] as Empat,
};

export function halamanTarif(o: { hit: Empat; miss: Empat; out: Empat; tanpaMiss?: boolean }): string {
  const blok = (judul: string, n: Empat) => `
      <tr><td>${judul}</td><td>OFF-PEAK</td><td>$${n[0]}</td><td>$${n[1]}</td></tr>
      <tr><td>PEAK</td><td>$${n[2]}</td><td>$${n[3]}</td></tr>`;

  return `<!doctype html><html><body>
  <h1>Models &amp; Pricing</h1>
  <h2>Model Details</h2>
  <table>
    <thead><tr><th>MODEL</th><th>deepseek-flash(1)</th><th>deepseek-v4-pro</th></tr></thead>
    <tbody>
      <tr><td>MODEL VERSION</td><td>DeepSeek-V4.1-Flash-1017</td><td>DeepSeek-V4-Pro-0813</td></tr>
      ${blok("1M INPUT TOKENS<br>(CACHE HIT)", o.hit)}
      ${o.tanpaMiss ? "" : blok("1M INPUT TOKENS<br>(CACHE MISS)", o.miss)}
      ${blok("1M OUTPUT TOKENS", o.out)}
      <tr><td>Concurrency Limit(3)</td><td>2500</td><td>500</td></tr>
    </tbody>
  </table>
  <p>(2) Off-peak rates are half of the peak rates. Peak hours are 01:00 - 04:00 and 06:00 - 10:00 UTC, Monday through Friday, excluding Chinese public holidays. All other hours are off-peak.</p>
  </body></html>`;
}
