/**
 * Penjaga tarif AI.
 *
 * **Asal fixture.** HTML di bawah bukan salinan halaman DeepSeek (halaman asli
 * bisa berubah kapan saja dan tidak disimpan di repo). Ia disusun dari bentuk
 * teks yang diterima lewat `web_fetch` pada 2026-10-18: label metrik diikuti
 * periode dan dua harga model. Tujuannya menguji **logika parser** — jangkar,
 * pemotongan segmen, urutan empat angka, dan invarian harga — bukan menguji
 * apakah DeepSeek masih memasang tabelnya.
 *
 * Kalau nanti ada yang menyimpan HTML asli sebagai berkas, ganti `halamanTarif()`
 * dengan pembacaan berkas itu; seluruh asersi di bawah tetap berlaku.
 */
import { describe, expect, it } from "vitest";
import {
  AI_ESTIMATE_IDR_PER_USD,
  bandingkanTarif,
  DEEPSEEK_DEFAULT_PRICING,
  hitungBiayaAi,
  perubahanTarifBerikutnya,
  resolvePeriod,
  tarifBasi,
  type PricingSnapshot,
} from "../lib/aiPricing";
import { validasiSnapshot } from "../lib/aiPricingSource";
import { htmlToText, parsePricing } from "../../api/deepseek-pricing.js";
import { halamanTarif, TARIF_NORMAL as NORMAL, type Empat } from "./tarifContoh";

function parseOk(html: string) {
  const hasil = parsePricing(html);
  if ("error" in hasil) throw new Error(`parse gagal: ${hasil.error}`);
  return hasil;
}

describe("parser tarif (api/deepseek-pricing)", () => {
  it("membaca tiga pos biaya untuk dua model, termasuk kedua periode", () => {
    const h = parseOk(halamanTarif(NORMAL));

    expect(h.models["deepseek-flash"].inputCacheHit).toEqual({ offPeak: 0.003, peak: 0.006 });
    expect(h.models["deepseek-flash"].inputCacheMiss).toEqual({ offPeak: 0.15, peak: 0.3 });
    expect(h.models["deepseek-flash"].output).toEqual({ offPeak: 0.6, peak: 1.2 });
    expect(h.models["deepseek-v4-pro"].inputCacheHit).toEqual({ offPeak: 0.022, peak: 0.044 });
    expect(h.models["deepseek-v4-pro"].output).toEqual({ offPeak: 1.98, peak: 3.96 });
    expect(h.warnings).toEqual([]);
  });

  it("membaca jendela peak dari kalimat sumber, bukan dari konstanta", () => {
    const h = parseOk(halamanTarif(NORMAL));
    expect(h.peak.windowsUtc).toEqual([
      { startHour: 1, endHour: 4 },
      { startHour: 6, endHour: 10 },
    ]);
    expect(h.peak.weekdayUtc).toEqual([1, 2, 3, 4, 5]);
  });

  it("tetap sejalan dengan tarif bawaan yang ditanam di kode", () => {
    // Kalau dokumentasi berubah, ubah fixture DAN DEEPSEEK_DEFAULT_PRICING
    // pada putaran yang sama. Tes ini menolak keduanya berpisah diam-diam.
    const h = parseOk(halamanTarif(NORMAL));
    for (const model of ["deepseek-flash", "deepseek-v4-pro"] as const) {
      const bawa = DEEPSEEK_DEFAULT_PRICING.models[model];
      expect(h.models[model].inputCacheHit).toEqual(bawa.inputCacheHit);
      expect(h.models[model].inputCacheMiss).toEqual(bawa.inputCacheMiss);
      expect(h.models[model].output).toEqual(bawa.output);
    }
  });

  it("menukar kembali saat kolom OFF-PEAK/PEAK tertukar di sumber", () => {
    const tidakNormal = {
      hit: [0.006, 0.044, 0.003, 0.022] as Empat,
      miss: [0.3, 1.32, 0.15, 0.66] as Empat,
      out: [1.2, 3.96, 0.6, 1.98] as Empat,
    };
    const h = parseOk(halamanTarif(tidakNormal));
    expect(h.models["deepseek-flash"].output).toEqual({ offPeak: 0.6, peak: 1.2 });
    expect(h.warnings.length).toBeGreaterThan(0);
  });

  it("menolak halaman yang tabelnya tidak utuh", () => {
    const hasil = parsePricing(halamanTarif({ ...NORMAL, tanpaMiss: true }));
    expect("error" in hasil).toBe(true);
    if ("error" in hasil) expect(hasil.error).toMatch(/tidak/i);
  });

  it("menolak harga di luar rentang wajar", () => {
    const hasil = parsePricing(halamanTarif({ ...NORMAL, out: [9999, 1.98, 1.2, 3.96] }));
    expect("error" in hasil).toBe(true);
  });

  it("menolak saat pro lebih murah dari flash (tanda kolom bergeser)", () => {
    const hasil = parsePricing(
      halamanTarif({ ...NORMAL, hit: [0.05, 0.01, 0.1, 0.02] }),
    );
    expect("error" in hasil).toBe(true);
  });

  it("htmlToText membuang script dan style", () => {
    const teks = htmlToText("<p>Halo</p><script>alert(1)</script><style>.a{}</style>");
    expect(teks).toBe("Halo");
  });
});

describe("periode tarif", () => {
  it.each([
    ["2026-09-11T00:59:59Z", "off-peak"],
    ["2026-09-11T01:00:00Z", "peak"],
    ["2026-09-11T03:59:59Z", "peak"],
    ["2026-09-11T04:00:00Z", "off-peak"],
    ["2026-09-11T06:00:00Z", "peak"],
    ["2026-09-11T09:59:59Z", "peak"],
    ["2026-09-11T10:00:00Z", "off-peak"],
    ["2026-09-12T02:00:00Z", "off-peak"],
    ["2026-09-13T07:00:00Z", "off-peak"],
    ["2026-09-14T01:00:00Z", "peak"],
  ])("memakai jendela penagihan pada %s", (waktu, periode) => {
    expect(resolvePeriod(new Date(waktu), DEEPSEEK_DEFAULT_PRICING.peak)).toBe(periode);
  });

  it("menghormati tanggal yang dikecualikan (libur Tiongkok)", () => {
    const peak = { ...DEEPSEEK_DEFAULT_PRICING.peak, excludedDatesUtc: ["2026-10-19"] };
    // Senin 02:00 UTC = jam peak, tetapi tanggalnya dikecualikan.
    expect(resolvePeriod(new Date("2026-10-19T02:00:00Z"), peak)).toBe("off-peak");
    expect(resolvePeriod(new Date("2026-10-20T02:00:00Z"), peak)).toBe("peak");
  });

  it("menghitung kapan tarif berikutnya berganti", () => {
    const ganti = perubahanTarifBerikutnya(
      new Date("2026-10-19T03:30:00Z"),
      DEEPSEEK_DEFAULT_PRICING.peak,
    );
    expect(ganti.toISOString()).toBe("2026-10-19T04:00:00.000Z");
  });

  it("berganti ke Senin lewat akhir pekan", () => {
    // Jumat 10:00 UTC = awal off-peak; peak berikutnya Senin 01:00 UTC.
    const ganti = perubahanTarifBerikutnya(
      new Date("2026-10-23T10:00:00Z"),
      DEEPSEEK_DEFAULT_PRICING.peak,
    );
    expect(ganti.toISOString()).toBe("2026-10-26T01:00:00.000Z");
  });
});

describe("kalkulator biaya", () => {
  const pricing = DEEPSEEK_DEFAULT_PRICING;

  it("menagih tarif off-peak dan peak untuk flash", () => {
    const off = hitungBiayaAi(
      { inputCacheMissTokens: 1_000_000, outputTokens: 1_000_000 },
      { pricing, idrPerUsd: AI_ESTIMATE_IDR_PER_USD, now: new Date("2026-10-18T12:00:00Z") },
    );
    expect(off.period).toBe("off-peak");
    expect(off.usd).toBeCloseTo(0.75);

    const peak = hitungBiayaAi(
      { inputCacheMissTokens: 1_000_000, outputTokens: 1_000_000 },
      { pricing, idrPerUsd: AI_ESTIMATE_IDR_PER_USD, now: new Date("2026-10-19T02:00:00Z") },
    );
    expect(peak.period).toBe("peak");
    expect(peak.usd).toBeCloseTo(1.5);
  });

  it("memakai harga cache-hit untuk token yang kena cache", () => {
    const hasil = hitungBiayaAi(
      { inputCacheHitTokens: 1_000_000, inputCacheMissTokens: 0, outputTokens: 0 },
      { pricing, idrPerUsd: AI_ESTIMATE_IDR_PER_USD, now: new Date("2026-10-18T12:00:00Z") },
    );
    expect(hasil.usd).toBeCloseTo(0.003);
    expect(hasil.breakdown.cacheMissUsd).toBe(0);
  });

  it("memakai tarif pro saat model pro diminta", () => {
    const hasil = hitungBiayaAi(
      { inputCacheMissTokens: 1_000_000, outputTokens: 0 },
      { pricing, idrPerUsd: AI_ESTIMATE_IDR_PER_USD, model: "deepseek-v4-pro", now: new Date("2026-10-18T12:00:00Z") },
    );
    expect(hasil.usd).toBeCloseTo(0.66);
  });

  it("tidak pernah menghasilkan biaya negatif dari masukan aneh", () => {
    const hasil = hitungBiayaAi(
      { inputCacheHitTokens: Number.NaN, inputCacheMissTokens: -5, outputTokens: Number.POSITIVE_INFINITY },
      { pricing, idrPerUsd: AI_ESTIMATE_IDR_PER_USD, now: new Date("2026-10-18T12:00:00Z") },
    );
    expect(hasil.usd).toBe(0);
  });

  it("mengalikan kurs asumsi untuk rupiah", () => {
    const hasil = hitungBiayaAi(
      { inputCacheMissTokens: 1_000_000, outputTokens: 0 },
      { pricing, idrPerUsd: AI_ESTIMATE_IDR_PER_USD, now: new Date("2026-10-18T12:00:00Z") },
    );
    expect(hasil.idr).toBeCloseTo(0.15 * AI_ESTIMATE_IDR_PER_USD);
  });
});

describe("fungsi bantu tarif", () => {
  it("hanya melaporkan angka yang benar-benar berubah", () => {
    const baru: PricingSnapshot = {
      ...DEEPSEEK_DEFAULT_PRICING,
      models: {
        ...DEEPSEEK_DEFAULT_PRICING.models,
        "deepseek-flash": {
          ...DEEPSEEK_DEFAULT_PRICING.models["deepseek-flash"],
          output: { offPeak: 0.6, peak: 2.4 },
        },
      },
    };
    const selisih = bandingkanTarif(DEEPSEEK_DEFAULT_PRICING, baru);
    expect(selisih).toEqual([
      { label: "Output peak", model: "deepseek-flash", dari: 1.2, ke: 2.4 },
    ]);
  });

  it("menandai tarif yang sudah basi", () => {
    const lama: PricingSnapshot = { ...DEEPSEEK_DEFAULT_PRICING, fetchedAt: "2026-01-01T00:00:00.000Z" };
    expect(tarifBasi(lama, new Date("2026-10-18T00:00:00Z"))).toBe(true);
    expect(tarifBasi(DEEPSEEK_DEFAULT_PRICING, new Date("2026-10-18T00:00:00Z"))).toBe(false);
  });
});

describe("validasi snapshot", () => {
  it("menerima tarif bawaan", () => {
    expect(validasiSnapshot(DEEPSEEK_DEFAULT_PRICING)).not.toBeNull();
  });

  it.each([
    ["bukan objek", null],
    ["skema lain", { ...DEEPSEEK_DEFAULT_PRICING, schemaVersion: 2 }],
    ["tanpa model flash", { ...DEEPSEEK_DEFAULT_PRICING, models: {} }],
    ["tanpa jendela peak", { ...DEEPSEEK_DEFAULT_PRICING, peak: { ...DEEPSEEK_DEFAULT_PRICING.peak, windowsUtc: [] } }],
    [
      "harga nol",
      {
        ...DEEPSEEK_DEFAULT_PRICING,
        models: {
          "deepseek-flash": {
            ...DEEPSEEK_DEFAULT_PRICING.models["deepseek-flash"],
            output: { offPeak: 0, peak: 1 },
          },
        },
      },
    ],
  ])("menolak %s", (_nama, masukan) => {
    expect(validasiSnapshot(masukan)).toBeNull();
  });
});
