// Vercel serverless function: kurs USD→IDR terbaru, dengan dua sumber.
//
// Kenapa dua sumber: angka ini mengalikan seluruh taksiran biaya AI, jadi satu
// sumber yang salah tidak boleh langsung dipercaya. Sumber utama diambil, sumber
// kedua dipakai sebagai pembanding — kalau keduanya berbeda lebih dari 2%,
// hasilnya tetap dipakai tetapi diberi peringatan supaya tutor melihatnya
// sebelum menekan "Terapkan".
//
// Keduanya bebas kunci API. Urutannya sengaja: Frankfurter (acuan ECB, JSON
// kecil, ada tanggal kurs) sebagai utama, exchangerate-api sebagai pembanding.
//
// Yang TIDAK dilakukan di sini: menebak. Di luar rentang wajar atau bukan angka
// → tolak, dan klien tetap memakai kurs tersimpan.

const PRIMARY = {
  nama: "frankfurter",
  url: "https://api.frankfurter.dev/v1/latest?base=USD&symbols=IDR",
};
const SECONDARY = {
  nama: "exchangerate-api",
  url: "https://open.er-api.com/v6/latest/USD",
};

const SCHEMA_VERSION = 1;
const FETCH_TIMEOUT_MS = 6000;

/** Rentang wajar IDR per USD. Di luar ini, hampir pasti parse/sumber salah. */
const MIN_KURS = 10_000;
const MAX_KURS = 25_000;

/** Selisih antar-sumber yang dianggap wajar. */
const SELISIH_WAJAR = 0.02;

function dalamRentang(nilai) {
  return Number.isFinite(nilai) && nilai >= MIN_KURS && nilai <= MAX_KURS;
}

async function ambilPrimer() {
  const r = await fetch(PRIMARY.url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const j = await r.json();
  const nilai = Number(j?.rates?.IDR);
  if (!dalamRentang(nilai)) throw new Error(`kurs di luar rentang wajar (${j?.rates?.IDR})`);
  return {
    nama: PRIMARY.nama,
    url: PRIMARY.url,
    nilai,
    // Tanggal kurs menurut ECB, bukan tanggal fetch: pasar tutup di akhir pekan,
    // dan tanggal yang jujur lebih berguna daripada tanggal kita menanyakan.
    rateDate: typeof j?.date === "string" ? j.date : "",
    sumber: "primer",
  };
}

async function ambilPembanding() {
  const r = await fetch(SECONDARY.url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const j = await r.json();
  const nilai = Number(j?.rates?.IDR);
  if (!dalamRentang(nilai)) throw new Error(`kurs di luar rentang wajar (${j?.rates?.IDR})`);
  const waktu = j?.time_last_update_utc ? new Date(j.time_last_update_utc) : null;
  return {
    nama: SECONDARY.nama,
    url: SECONDARY.url,
    nilai,
    rateDate: waktu && !Number.isNaN(waktu.getTime()) ? waktu.toISOString().slice(0, 10) : "",
    sumber: "pembanding",
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const [primer, pembanding] = await Promise.allSettled([ambilPrimer(), ambilPembanding()]);
  const warnings = [];

  const utama = primer.status === "fulfilled" ? primer.value : null;
  const kedua = pembanding.status === "fulfilled" ? pembanding.value : null;

  if (!utama && !kedua) {
    const sebab = [primer, pembanding]
      .filter((h) => h.status === "rejected")
      .map((h) => String(h.reason && h.reason.message ? h.reason.message : h.reason))
      .join(" · ");
    res.status(502).json({ error: `Kurs tidak bisa diambil dari kedua sumber (${sebab})` });
    return;
  }

  // Sumber utama yang menentukan, kecuali ia gagal.
  const dipakai = utama ?? kedua;
  if (!utama) warnings.push("Sumber utama gagal; memakai sumber pembanding.");
  if (utama && !kedua) warnings.push("Sumber pembanding tidak tersedia; kurs tidak diperiksa silang.");

  if (utama && kedua) {
    const selisih = Math.abs(utama.nilai - kedua.nilai) / utama.nilai;
    if (selisih > SELISIH_WAJAR) {
      warnings.push(
        `Kedua sumber berbeda ${(selisih * 100).toFixed(2)}% ` +
          `(${utama.nama} ${utama.nilai}, ${kedua.nama} ${kedua.nilai}). Periksa sebelum memakai.`,
      );
    }
  }

  const sekarang = new Date();
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.status(200).json({
    schemaVersion: SCHEMA_VERSION,
    usdIdr: dipakai.nilai,
    source: dipakai.nama,
    sourceUrl: dipakai.url,
    rateDate: dipakai.rateDate,
    fetchedAt: sekarang.toISOString(),
    verifiedAt: sekarang.toISOString().slice(0, 10),
    provenance: "kurs-live",
    warnings,
  });
}
