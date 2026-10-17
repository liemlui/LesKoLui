// Pintu masuk tarif AI. Angka aslinya sekarang tinggal di `aiPricing.ts`,
// karena tarif resmi memuat tiga pos biaya × dua periode × dua model.
// Berkas ini dipertahankan sebagai muka yang stabil untuk pemanggil lama
// (`aiClient`, `AiCostModal`, `AiSection`, `settingsRepo`).
import { hitungBiayaAi, ratePada, resolvePeriod } from "./aiPricing";
import { tarifEfektif } from "./aiPricingSource";
import { kursUsdIdr } from "./aiKurs";

export { AI_ESTIMATE_IDR_PER_USD, DEEPSEEK_PRICING_URL } from "./aiPricing";

// Keep the API client, persisted defaults, and menu labels on the same model.
export const DEEPSEEK_MODEL = "deepseek-flash";
export const DEEPSEEK_MODEL_LABEL = "DeepSeek V4.1 Flash";
export const DEEPSEEK_DOCS_URL = "https://api-docs.deepseek.com/";
export const DEEPSEEK_CHAT_URL = "https://api.deepseek.com/chat/completions";

export const DEEPSEEK_COST_NOTE = "Estimasi memakai perkiraan token, input tanpa cache, tarif sesuai jam pemakaian, dan kurs USD→IDR terbaru yang ditarik lewat Pengaturan → AI → Kelola tarif AI (sebelum pernah diperbarui, dipakai kurs cadangan). Tarif peak berlaku Senin–Jumat pukul 08.00–11.00 dan 13.00–17.00 WIB; di luar itu tarif separuhnya. Biaya aktual mengikuti token, cache, dan waktu pemrosesan DeepSeek.";

/**
 * Tarif model yang dipakai aplikasi pada satu saat.
 *
 * Bentuk kembaliannya sengaja dipertahankan (satu angka input cache-miss + satu
 * angka output) supaya `AiCostModal` tidak perlu tahu soal periode dan pos
 * biaya. Modul `aiPricing.ts` yang menyimpan bentuk lengkapnya.
 */
export function getDeepSeekPricing(now = new Date()) {
  const pricing = tarifEfektif();
  const period = resolvePeriod(now, pricing.peak);
  const harga = pricing.models[DEEPSEEK_MODEL] ?? pricing.models["deepseek-flash"];
  return {
    period,
    inputPerMillion: ratePada(harga.inputCacheMiss, period),
    outputPerMillion: ratePada(harga.output, period),
  };
}

/**
 * Estimasi biaya satu panggilan, dolar.
 *
 * Seluruh input dianggap cache-miss — aplikasi belum membaca `usage` dari
 * respons API, jadi cache-hit tidak pernah diklaim. Arah galatnya aman:
 * taksiran lebih tinggi daripada tagihan nyata, bukan sebaliknya.
 */
export function estimateDeepSeekUsd(inputTokens: number, outputTokens: number): number {
  return hitungBiayaAi(
    { inputCacheMissTokens: inputTokens, outputTokens },
    { pricing: tarifEfektif(), idrPerUsd: kursUsdIdr() },
  ).usd;
}

/**
 * Rupiah per dolar yang berlaku sekarang — untuk pemanggil yang menghitung
 * biaya sendiri (mis. `aiClient` yang memisahkan USD dan IDR).
 */
export function kursUsdIdrBerlaku(): number {
  return kursUsdIdr();
}
