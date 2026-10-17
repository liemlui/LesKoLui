// Vercel serverless function: tarik tarif DeepSeek dari dokumentasi resmi.
//
// Kenapa lewat server dan bukan browser:
// 1. CSP `connect-src` di vercel.json tidak memuat api-docs.deepseek.com.
// 2. Situs dokumentasi statis tidak mengirim header CORS.
// Server juga menjadi satu-satunya tempat parsing, sehingga bisa diuji fixture.
//
// Prinsip: JANGAN MENEBAK. Kalau tabel berubah bentuk atau invarian harga
// dilanggar, balas 422 dan biarkan klien memakai tarif yang sudah tersimpan.
// Menimpa tarif baik dengan hasil tebakan jauh lebih buruk daripada gagal.

const SOURCE_URL = "https://api-docs.deepseek.com/quick_start/pricing";
const SCHEMA_VERSION = 1;
const FETCH_TIMEOUT_MS = 8000;

/** Rentang wajar USD per 1M token. Di luar ini, hampir pasti parse salah. */
const MIN_USD = 0.001;
const MAX_USD = 500;

const MODEL_FLASH = "deepseek-flash";
const MODEL_PRO = "deepseek-v4-pro";

const ANCHOR_HIT = /1M\s+INPUT\s+TOKENS\s*\(?\s*CACHE\s*HIT\s*\)?/i;
const ANCHOR_MISS = /1M\s+INPUT\s+TOKENS\s*\(?\s*CACHE\s*MISS\s*\)?/i;
const ANCHOR_OUT = /1M\s+OUTPUT\s+TOKENS/i;

// Batas = jangkar metrik berikutnya, bukan posisi sel. Rows tabel dokumentasi
// memakai rowspan sehingga jumlah <td> per baris tidak seragam; teks hasil
// normalisasi menghapus perbedaan itu.
const BATAS_HIT = /1M\s+INPUT\s+TOKENS\s*\(?\s*CACHE\s*MISS/i;
const BATAS_MISS = /1M\s+OUTPUT\s+TOKENS/i;
const BATAS_OUT = /CONCURRENCY/i;

/** HTML → teks satu baris. Tag jadi spasi supaya jangkar tidak menempel. */
export function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(td|th|tr|p|li|h[1-6]|div|section)>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Empat angka pertama pada segmen: off-flash, off-pro, peak-flash, peak-pro. */
function ambilEmpat(text, anchorRe, batasRe) {
  const m = anchorRe.exec(text);
  if (!m) return null;
  const sisa = text.slice(m.index + m[0].length);
  const batas = batasRe.exec(sisa);
  const segmen = batas ? sisa.slice(0, batas.index) : sisa;
  const angka = [...segmen.matchAll(/(\d+(?:\.\d+)?)/g)].map((x) => Number(x[1]));
  return angka.length >= 4 ? angka.slice(0, 4) : null;
}

function bacaJendelaPeak(text) {
  const mulai = text.search(/Peak\s+hours/i);
  const potongan = mulai >= 0 ? text.slice(mulai, mulai + 400) : "";
  return [...potongan.matchAll(/(\d{1,2}):(\d{2})\s*[–\-−]\s*(\d{1,2}):(\d{2})/g)]
    .map((m) => ({ startHour: Number(m[1]), endHour: Number(m[3]) }))
    .filter((w) => w.startHour >= 0 && w.endHour <= 24 && w.startHour < w.endHour)
    .slice(0, 2);
}

/**
 * Parse HTML dokumentasi menjadi snapshot tarif.
 *
 * Mengembalikan `{ error }` (bukan melempar) saat bentuknya tidak dikenali,
 * supaya handler bisa memilih status HTTP yang tepat.
 */
export function parsePricing(html) {
  const text = htmlToText(html);
  const warnings = [];

  if (!/MODEL DETAILS/i.test(text) || !/CACHE\s*MISS/i.test(text)) {
    return { error: "Halaman tidak memuat bagian Model Details/tarif." };
  }

  const hit = ambilEmpat(text, ANCHOR_HIT, BATAS_HIT);
  const miss = ambilEmpat(text, ANCHOR_MISS, BATAS_MISS);
  const out = ambilEmpat(text, ANCHOR_OUT, BATAS_OUT);

  if (!hit || !miss || !out) {
    return { error: "Tabel harga tidak terbaca utuh (jangkar CACHE HIT/MISS/OUTPUT tidak cocok)." };
  }

  const susun = (n) => ({
    [MODEL_FLASH]: { offPeak: n[0], peak: n[2] },
    [MODEL_PRO]: { offPeak: n[1], peak: n[3] },
  });

  const pos = {
    inputCacheHit: susun(hit),
    inputCacheMiss: susun(miss),
    output: susun(out),
  };

  // ── Validasi silang. Gagal di sini = lebih baik menolak daripada menampilkan
  // angka salah yang langsung menggeser taksiran biaya dan batas belanja.
  for (const [nama, r] of Object.entries(pos)) {
    for (const model of [MODEL_FLASH, MODEL_PRO]) {
      const off = r[model].offPeak;
      const peak = r[model].peak;
      if (!Number.isFinite(off) || !Number.isFinite(peak)) {
        return { error: `Nilai ${nama}/${model} bukan angka.` };
      }
      if (off < MIN_USD || off > MAX_USD || peak < MIN_USD || peak > MAX_USD) {
        return { error: `Nilai ${nama}/${model} di luar rentang wajar (${off}, ${peak}).` };
      }
      const rasio = peak / off;
      if (Math.abs(rasio - 0.5) <= 0.01) {
        // Kolom tertukar: tukar kembali, jangan tampilkan tarif terbalik.
        r[model].offPeak = r[model].peak;
        r[model].peak = off;
        warnings.push(`${nama}/${model}: urutan OFF-PEAK/PEAK terbalik di sumber, ditukar.`);
      } else if (Math.abs(rasio - 2) > 0.01) {
        warnings.push(`${nama}/${model}: peak bukan 2× off-peak (rasio ${rasio.toFixed(3)}).`);
      }
    }
    if (!(r[MODEL_FLASH].offPeak < r[MODEL_PRO].offPeak)) {
      return { error: `Invarian harga ${nama} dilanggar: pro tidak lebih mahal dari flash.` };
    }
  }
  for (const model of [MODEL_FLASH, MODEL_PRO]) {
    const a = pos.inputCacheHit[model].offPeak;
    const b = pos.inputCacheMiss[model].offPeak;
    const c = pos.output[model].offPeak;
    if (!(a < b && b < c)) {
      return { error: `Invarian harga ${model} dilanggar: cache hit < cache miss < output tidak berlaku.` };
    }
  }

  const jendela = bacaJendelaPeak(text);
  if (jendela.length !== 2) {
    warnings.push("Jendela peak tidak terbaca dari sumber; memakai nilai bawaan.");
  }

  const sekarang = new Date();
  return {
    schemaVersion: SCHEMA_VERSION,
    sourceUrl: SOURCE_URL,
    fetchedAt: sekarang.toISOString(),
    verifiedAt: sekarang.toISOString().slice(0, 10),
    provenance: "docs-live",
    models: {
      [MODEL_FLASH]: {
        model: MODEL_FLASH,
        inputCacheHit: pos.inputCacheHit[MODEL_FLASH],
        inputCacheMiss: pos.inputCacheMiss[MODEL_FLASH],
        output: pos.output[MODEL_FLASH],
      },
      [MODEL_PRO]: {
        model: MODEL_PRO,
        inputCacheHit: pos.inputCacheHit[MODEL_PRO],
        inputCacheMiss: pos.inputCacheMiss[MODEL_PRO],
        output: pos.output[MODEL_PRO],
      },
    },
    peak: {
      weekdayUtc: [1, 2, 3, 4, 5],
      windowsUtc:
        jendela.length === 2
          ? jendela
          : [
              { startHour: 1, endHour: 4 },
              { startHour: 6, endHour: 10 },
            ],
      // Libur nasional Tiongkok tidak dicantumkan di halaman. Dibiarkan kosong —
      // lihat catatan di laporan: taksiran jadi terlalu tinggi pada hari libur,
      // bukan terlalu rendah.
      excludedDatesUtc: [],
      note: "Peak 01:00–04:00 dan 06:00–10:00 UTC, Senin–Jumat, kecuali libur nasional Tiongkok.",
    },
    warnings,
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const r = await fetch(SOURCE_URL, {
      headers: { "user-agent": "les-ko-lui/pricing-refresh", accept: "text/html" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!r.ok) {
      res.status(502).json({ error: "Dokumentasi DeepSeek tidak bisa dibaca", status: r.status });
      return;
    }

    const hasil = parsePricing(await r.text());
    if (hasil.error) {
      // 422, bukan 200 dengan data separuh: klien tidak boleh menimpa tarif baik.
      res.status(422).json({ error: hasil.error });
      return;
    }

    // Cache 6 jam di CDN: halaman tarif tidak berubah per menit, dan server
    // dokumentasi tidak perlu dipukul setiap kali tombol ditekan.
    res.setHeader("Cache-Control", "public, s-maxage=21600, stale-while-revalidate=86400");
    res.status(200).json(hasil);
  } catch (e) {
    const timeout = e && (e.name === "TimeoutError" || e.name === "AbortError");
    res.status(timeout ? 504 : 502).json({
      error: timeout
        ? "Waktu habis menghubungi dokumentasi DeepSeek"
        : "Gagal menghubungi dokumentasi DeepSeek",
    });
  }
}
