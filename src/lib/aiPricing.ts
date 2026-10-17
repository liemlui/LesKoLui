/**
 * Tarif DeepSeek — satu sumber angka untuk semua estimasi biaya AI.
 *
 * **Kenapa berkas ini ada.** Tarif sebelumnya ditanam di `aiConfig.ts` dan hanya
 * mencakup `deepseek-flash` pada pos cache-miss. Halaman resmi
 * (https://api-docs.deepseek.com/quick_start/pricing) memuat tiga pos biaya per
 * model dan dua periode jam, jadi satu angka input + satu angka output tidak
 * lagi cukup untuk menghitung biaya.
 *
 * **Aturan yang dijaga di sini:**
 *
 * - Angka `peak` dan `offPeak` **disimpan keduanya**, tidak saling diturunkan.
 *   Dokumentasi sekarang menyatakan off-peak = setengah peak (footnote 2), tetapi
 *   bila hubungan itu berubah, menurunkan angka akan diam-diam salah.
 * - Setiap fungsi menerima `now` supaya bisa diuji tanpa memalsukan jam global.
 * - `hitungBiayaAi` **mewajibkan** `pricing` dioper. Tarif yang berlaku dipilih
 *   pemanggil lewat `tarifEfektif()`; tidak ada default diam-diam yang bisa
 *   membuat angka basi tanpa ketahuan.
 */

export type PricingPeriod = "peak" | "off-peak";

/** USD per 1 juta token untuk kedua periode. */
export interface PeriodRate {
  offPeak: number;
  peak: number;
}

export interface ModelPricing {
  /** Nama model yang dipakai di body permintaan API. */
  model: string;
  /** Versi yang dicantumkan dokumentasi, mis. "DeepSeek-V4.1-Flash-1017". */
  version?: string;
  inputCacheHit: PeriodRate;
  inputCacheMiss: PeriodRate;
  output: PeriodRate;
}

export interface PeakWindows {
  /** Hari kerja menurut UTC: 0=Minggu … 6=Sabtu. */
  weekdayUtc: readonly number[];
  /** Jendela [startHour, endHour) dalam jam UTC. */
  windowsUtc: readonly { startHour: number; endHour: number }[];
  /** Tanggal "YYYY-MM-DD" (UTC) yang dikecualikan — libur nasional Tiongkok. */
  excludedDatesUtc: readonly string[];
  note: string;
}

export interface PricingSnapshot {
  schemaVersion: 1;
  sourceUrl: string;
  /** Kapan ditarik dari dokumentasi. Kosong untuk tarif bawaan yang ditanam di kode. */
  fetchedAt?: string;
  /** Kapan angka ini terakhir dicocokkan dengan dokumentasi resmi. */
  verifiedAt: string;
  provenance: "docs-live" | "default-embedded" | "user-stored";
  models: Record<string, ModelPricing>;
  peak: PeakWindows;
  /** Peringatan non-fatal dari validator saat tarif ditarik. */
  warnings?: string[];
}

export const DEEPSEEK_PRICING_URL = "https://api-docs.deepseek.com/quick_start/pricing";

/**
 * Tarif bawaan — dibaca dari halaman resmi pada 2026-10-18.
 *
 * Dipakai saat belum ada tarif tersimpan, dan saat fetch gagal. Angka di sini
 * **bukan** sumber kebenaran: yang benar adalah halaman resminya. Nilai ini
 * hanya jaring pengaman supaya kalkulator tetap berfungsi tanpa jaringan.
 */
export const DEEPSEEK_DEFAULT_PRICING: PricingSnapshot = {
  schemaVersion: 1,
  sourceUrl: DEEPSEEK_PRICING_URL,
  verifiedAt: "2026-10-18",
  provenance: "default-embedded",
  models: {
    "deepseek-flash": {
      model: "deepseek-flash",
      version: "DeepSeek-V4.1-Flash-1017",
      inputCacheHit: { offPeak: 0.003, peak: 0.006 },
      inputCacheMiss: { offPeak: 0.15, peak: 0.3 },
      output: { offPeak: 0.6, peak: 1.2 },
    },
    "deepseek-v4-pro": {
      model: "deepseek-v4-pro",
      version: "DeepSeek-V4-Pro-0813",
      inputCacheHit: { offPeak: 0.022, peak: 0.044 },
      inputCacheMiss: { offPeak: 0.66, peak: 1.32 },
      output: { offPeak: 1.98, peak: 3.96 },
    },
  },
  peak: {
    weekdayUtc: [1, 2, 3, 4, 5],
    windowsUtc: [
      { startHour: 1, endHour: 4 }, // 08.00–11.00 WIB
      { startHour: 6, endHour: 10 }, // 13.00–17.00 WIB
    ],
    excludedDatesUtc: [],
    note: "Peak 01:00–04:00 dan 06:00–10:00 UTC, Senin–Jumat, kecuali libur nasional Tiongkok.",
  },
};

/**
 * Periode tarif pada satu saat.
 *
 * Jam dinyatakan UTC dan hari kerja juga hari kerja UTC — bukan WIB. Kedua
 * jendela peak jatuh di tanggal WIB yang sama (01–04 UTC = 08–11 WIB, 06–10 UTC
 * = 13–17 WIB), jadi tidak ada pergeseran hari antara kedua kalender.
 */
export function resolvePeriod(now: Date, peak: PeakWindows): PricingPeriod {
  if (!peak.weekdayUtc.includes(now.getUTCDay())) return "off-peak";
  const kunciTanggal = now.toISOString().slice(0, 10);
  if (peak.excludedDatesUtc.includes(kunciTanggal)) return "off-peak";
  const jam = now.getUTCHours() + now.getUTCMinutes() / 60;
  return peak.windowsUtc.some((w) => jam >= w.startHour && jam < w.endHour) ? "peak" : "off-peak";
}

/**
 * Angka satu pos biaya pada periode tertentu.
 *
 * Nama periode sengaja memakai bentuk yang tampil di antarmuka ("off-peak"),
 * sedangkan kunci objeknya `offPeak`; pemetaan itu hanya boleh ada di sini.
 * Indeks langsung `rate[period]` tidak bisa dipakai tanpa memaksa salah satu
 * bentuk nama berubah.
 */
export function ratePada(rate: PeriodRate, period: PricingPeriod): number {
  return period === "peak" ? rate.peak : rate.offPeak;
}

/** Kapan tarif berikutnya berganti — untuk teks "berlaku sampai …" di modal. */
export function perubahanTarifBerikutnya(now: Date, peak: PeakWindows): Date {
  const sekarang = resolvePeriod(now, peak);
  const awal = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours() + 1);
  for (let i = 0; i < 24 * 8; i++) {
    const t = new Date(awal + i * 3_600_000);
    if (resolvePeriod(t, peak) !== sekarang) return t;
  }
  return new Date(awal);
}

/**
 * Kurs **cadangan** rupiah per dolar.
 *
 * **Bukan angka dari DeepSeek, dan bukan kurs yang Anda bayar.** Nilainya kurs
 * pasar yang dicocokkan 2026-10-18 (Frankfurter/ECB 18.031; exchangerate-api
 * 18.014,6 — selisih 0,09%). Kurs yang benar-benar dipakai aplikasi berasal dari
 * `aiKurs.ts` (`kursUsdIdr()`); konstanta ini hanya dipakai bila kurs belum
 * pernah ditarik atau jaringannya mati.
 *
 * Sebelum 2026-10-18 angkanya Rp16.000, yaitu ~11% di bawah pasar saat itu —
 * dan angka itu mengalikan **seluruh** biaya AI yang dicatat.
 */
export const AI_ESTIMATE_IDR_PER_USD = 18_031;

export interface TokenUsage {
  /** Token input yang kena cache. Boleh 0 bila tidak diketahui. */
  inputCacheHitTokens?: number;
  inputCacheMissTokens: number;
  outputTokens: number;
}

export interface CostEstimate {
  model: string;
  period: PricingPeriod;
  usd: number;
  idr: number;
  idrPerUsd: number;
  breakdown: { cacheHitUsd: number; cacheMissUsd: number; outputUsd: number };
}

export interface CostEstimateOptions {
  /** Tarif yang berlaku. Wajib dioper — lihat catatan di kepala berkas. */
  pricing: PricingSnapshot;
  /**
   * Kurs USD→IDR yang berlaku. **Wajib**, dengan alasan yang sama seperti
   * `pricing`: kurs cadangan yang tertinggal 11% pernah membuat seluruh laporan
   * biaya terlalu rendah tanpa ada yang menyadarinya. Pemanggil memakai
   * `kursUsdIdr()` dari `aiKurs.ts`.
   */
  idrPerUsd: number;
  model?: string;
  now?: Date;
}

const aman = (n: number | undefined) => (Number.isFinite(n) && (n as number) > 0 ? (n as number) : 0);

/** Biaya satu panggilan AI menurut tarif yang dioper dan periode pada `now`. */
export function hitungBiayaAi(usage: TokenUsage, opsi: CostEstimateOptions): CostEstimate {
  const { pricing, idrPerUsd } = opsi;
  const model = opsi.model ?? "deepseek-flash";
  const harga = pricing.models[model] ?? pricing.models["deepseek-flash"];
  const now = opsi.now ?? new Date();
  const period = resolvePeriod(now, pricing.peak);

  const cacheHitUsd = (aman(usage.inputCacheHitTokens) * ratePada(harga.inputCacheHit, period)) / 1_000_000;
  const cacheMissUsd = (aman(usage.inputCacheMissTokens) * ratePada(harga.inputCacheMiss, period)) / 1_000_000;
  const outputUsd = (aman(usage.outputTokens) * ratePada(harga.output, period)) / 1_000_000;
  const usd = cacheHitUsd + cacheMissUsd + outputUsd;

  return {
    model,
    period,
    usd,
    idr: usd * idrPerUsd,
    idrPerUsd,
    breakdown: { cacheHitUsd, cacheMissUsd, outputUsd },
  };
}

export interface PerbedaanTarif {
  label: string;
  model: string;
  dari: number;
  ke: number;
}

/** Selisih tarif lama → baru, untuk ditampilkan sebelum menimpa. */
export function bandingkanTarif(lama: PricingSnapshot, baru: PricingSnapshot): PerbedaanTarif[] {
  const hasil: PerbedaanTarif[] = [];
  const pos: readonly [string, (m: ModelPricing) => number][] = [
    ["Cache hit off-peak", (m) => m.inputCacheHit.offPeak],
    ["Cache hit peak", (m) => m.inputCacheHit.peak],
    ["Cache miss off-peak", (m) => m.inputCacheMiss.offPeak],
    ["Cache miss peak", (m) => m.inputCacheMiss.peak],
    ["Output off-peak", (m) => m.output.offPeak],
    ["Output peak", (m) => m.output.peak],
  ];

  for (const model of Object.keys(baru.models)) {
    const a = lama.models[model];
    const b = baru.models[model];
    if (!a || !b) continue;
    for (const [label, ambil] of pos) {
      const dari = ambil(a);
      const ke = ambil(b);
      if (dari !== ke) hasil.push({ label, model, dari, ke });
    }
  }
  return hasil;
}

/** true bila tarif tersimpan sudah lebih tua dari `hariMaksimal`. */
export function tarifBasi(snapshot: PricingSnapshot, sekarang = new Date(), hariMaksimal = 90): boolean {
  if (!snapshot.fetchedAt) return false;
  const umur = sekarang.getTime() - new Date(snapshot.fetchedAt).getTime();
  return Number.isFinite(umur) && umur > hariMaksimal * 86_400_000;
}
