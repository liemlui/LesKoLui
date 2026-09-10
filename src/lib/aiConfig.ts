// Verified against https://api-docs.deepseek.com/ on 2026-09-11.
// Keep the API client, persisted defaults, and menu labels on the same model.
export const DEEPSEEK_MODEL = "deepseek-flash";
export const DEEPSEEK_MODEL_LABEL = "DeepSeek V4.1 Flash";
export const DEEPSEEK_DOCS_URL = "https://api-docs.deepseek.com/";
export const DEEPSEEK_CHAT_URL = "https://api.deepseek.com/chat/completions";

// USD per 1M tokens, effective 2026-09-10 04:00 UTC.
// Source: https://api-docs.deepseek.com/quick_start/pricing
export const DEEPSEEK_PRICING_URL = "https://api-docs.deepseek.com/quick_start/pricing";
export const AI_ESTIMATE_IDR_PER_USD = 16_000;
export const DEEPSEEK_COST_NOTE = "Estimasi memakai perkiraan token, input tanpa cache, tarif sesuai jam pemakaian, dan kurs asumsi Rp16.000/USD. Tarif peak berlaku Senin–Jumat pukul 08.00–11.00 dan 13.00–17.00 WIB; di luar itu tarif separuhnya. Biaya aktual mengikuti token, cache, dan waktu pemrosesan DeepSeek.";

export function getDeepSeekPricing(now = new Date()) {
  const day = now.getUTCDay();
  const hour = now.getUTCHours();
  const peak = day >= 1 && day <= 5
    && ((hour >= 1 && hour < 4) || (hour >= 6 && hour < 10));
  return {
    period: peak ? "peak" : "off-peak",
    inputPerMillion: peak ? 0.30 : 0.15,
    outputPerMillion: peak ? 1.20 : 0.60,
  };
}

export function estimateDeepSeekUsd(inputTokens: number, outputTokens: number): number {
  const rates = getDeepSeekPricing();
  return (inputTokens * rates.inputPerMillion + outputTokens * rates.outputPerMillion) / 1_000_000;
}
