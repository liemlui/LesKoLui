/**
 * Penjaga kurs USD→IDR.
 *
 * Yang penting diuji di sini bukan "apakah angkanya 18.031" — itu berubah tiap
 * hari. Yang diuji: penyaring data rusak, jalur cadangan saat belum pernah
 * diperbarui, dan pembacaan penyimpanan yang bisa disunting tangan.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  bacaKursTersimpan,
  KURS_USD_IDR_BAWAAN,
  kursBasi,
  kursEfektif,
  kursUsdIdr,
  simpanKurs,
  validasiKurs,
  type KursSnapshot,
} from "../lib/aiKurs";
import { AI_ESTIMATE_IDR_PER_USD } from "../lib/aiPricing";

const KURS_SAH: KursSnapshot = {
  schemaVersion: 1,
  usdIdr: 18_250,
  source: "frankfurter",
  sourceUrl: "https://api.frankfurter.dev/v1/latest?base=USD&symbols=IDR",
  rateDate: "2026-10-16",
  fetchedAt: "2026-10-18T00:00:00.000Z",
  verifiedAt: "2026-10-18",
  provenance: "kurs-live",
};

function pasangLocalStorage() {
  const isi = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (kunci: string) => isi.get(kunci) ?? null,
    setItem: (kunci: string, nilai: string) => void isi.set(kunci, nilai),
    removeItem: (kunci: string) => void isi.delete(kunci),
  });
  return isi;
}

afterEach(() => vi.unstubAllGlobals());

describe("validasi kurs", () => {
  it("menerima kurs yang wajar", () => {
    expect(validasiKurs(KURS_SAH)).not.toBeNull();
    expect(validasiKurs(KURS_USD_IDR_BAWAAN)).not.toBeNull();
  });

  it.each([
    ["bukan objek", null],
    ["skema lain", { ...KURS_SAH, schemaVersion: 2 }],
    ["kurs nol", { ...KURS_SAH, usdIdr: 0 }],
    ["kurs negatif", { ...KURS_SAH, usdIdr: -18_000 }],
    ["kurs di luar rentang (terlalu tinggi)", { ...KURS_SAH, usdIdr: 50_000 }],
    ["kurs di luar rentang (terlalu rendah)", { ...KURS_SAH, usdIdr: 900 }],
    ["bukan angka", { ...KURS_SAH, usdIdr: Number.NaN }],
    ["tanpa sumber", { ...KURS_SAH, source: "" }],
    ["tanpa verifiedAt", { ...KURS_SAH, verifiedAt: undefined }],
  ])("menolak %s", (_nama, masukan) => {
    expect(validasiKurs(masukan)).toBeNull();
  });
});

describe("kurs yang berlaku", () => {
  it("memakai kurs cadangan saat belum pernah diperbarui", () => {
    // Di lingkungan tes tidak ada localStorage → jalur cadangan.
    expect(kursEfektif().provenance).toBe("default-embedded");
    expect(kursUsdIdr()).toBe(AI_ESTIMATE_IDR_PER_USD);
  });

  it("menyimpan lalu membaca kembali kurs yang ditarik", () => {
    pasangLocalStorage();
    simpanKurs(KURS_SAH);

    const terbaca = bacaKursTersimpan();
    expect(terbaca?.usdIdr).toBe(18_250);
    // Asal-usul ditandai ulang: ini salinan di perangkat, bukan hasil fetch asli.
    expect(terbaca?.provenance).toBe("user-stored");
    expect(kursUsdIdr()).toBe(18_250);
  });

  it("mengabaikan isi penyimpanan yang rusak dan kembali ke cadangan", () => {
    const isi = pasangLocalStorage();
    isi.set("leskolui:ai-kurs:v1", JSON.stringify({ ...KURS_SAH, usdIdr: 1 }));

    expect(bacaKursTersimpan()).toBeNull();
    expect(kursUsdIdr()).toBe(AI_ESTIMATE_IDR_PER_USD);
  });

  it("mengabaikan JSON yang tidak bisa dibaca sama sekali", () => {
    const isi = pasangLocalStorage();
    isi.set("leskolui:ai-kurs:v1", "{bukan json");

    expect(bacaKursTersimpan()).toBeNull();
  });
});

describe("umur kurs", () => {
  it("menandai kurs cadangan yang sudah lama tidak dicocokkan", () => {
    const sekarang = new Date("2026-12-31T00:00:00Z");
    expect(kursBasi(KURS_USD_IDR_BAWAAN, sekarang)).toBe(true);
    expect(kursBasi(KURS_USD_IDR_BAWAAN, new Date("2026-10-20T00:00:00Z"))).toBe(false);
  });

  it("menandai kurs tarikan yang lebih tua dari sepekan", () => {
    expect(kursBasi(KURS_SAH, new Date("2026-10-24T00:00:00Z"))).toBe(false);
    expect(kursBasi(KURS_SAH, new Date("2026-10-26T00:00:00Z"))).toBe(true);
  });
});
