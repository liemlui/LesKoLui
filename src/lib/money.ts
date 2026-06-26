export const MAX_HOURLY_RATE = 2_000_000;
export const MAX_PAYMENT_AMOUNT = 100_000_000;

export function parseCurrencyDigits(value: string, max = MAX_PAYMENT_AMOUNT): { raw: string; amount: number } {
  const digits = value.replace(/\D/g, "");
  if (!digits) return { raw: "", amount: 0 };
  const amount = Math.min(max, Number(digits));
  return { raw: String(amount), amount };
}

export function isValidCurrencyAmount(value: number, max = MAX_PAYMENT_AMOUNT): boolean {
  return Number.isFinite(value) && value >= 1 && value <= max;
}

export function clampCurrencyAmount(value: number, max = MAX_PAYMENT_AMOUNT): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(max, Math.max(0, Math.floor(value)));
}
