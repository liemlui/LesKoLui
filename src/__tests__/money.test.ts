import { describe, it, expect } from "vitest";
import {
  parseCurrencyDigits,
  isValidCurrencyAmount,
  clampCurrencyAmount,
  MAX_HOURLY_RATE,
  MAX_PAYMENT_AMOUNT,
} from "../lib/money";

describe("parseCurrencyDigits", () => {
  it("strips non-digits and parses the number", () => {
    expect(parseCurrencyDigits("150.000")).toEqual({ raw: "150000", amount: 150000 });
    expect(parseCurrencyDigits("Rp 1.250.000")).toEqual({ raw: "1250000", amount: 1250000 });
  });

  it("returns zero for empty / non-numeric input", () => {
    expect(parseCurrencyDigits("")).toEqual({ raw: "", amount: 0 });
    expect(parseCurrencyDigits("abc")).toEqual({ raw: "", amount: 0 });
  });

  it("clamps to the max (default payment cap)", () => {
    const over = String(MAX_PAYMENT_AMOUNT + 5);
    expect(parseCurrencyDigits(over).amount).toBe(MAX_PAYMENT_AMOUNT);
  });

  it("honours a custom max (e.g. hourly rate cap)", () => {
    const over = String(MAX_HOURLY_RATE + 1);
    expect(parseCurrencyDigits(over, MAX_HOURLY_RATE).amount).toBe(MAX_HOURLY_RATE);
  });
});

describe("isValidCurrencyAmount", () => {
  it("accepts values within [1, max]", () => {
    expect(isValidCurrencyAmount(1)).toBe(true);
    expect(isValidCurrencyAmount(150000)).toBe(true);
    expect(isValidCurrencyAmount(MAX_PAYMENT_AMOUNT)).toBe(true);
  });

  it("rejects zero, negatives, and over-max", () => {
    expect(isValidCurrencyAmount(0)).toBe(false);
    expect(isValidCurrencyAmount(-100)).toBe(false);
    expect(isValidCurrencyAmount(MAX_PAYMENT_AMOUNT + 1)).toBe(false);
  });

  it("rejects non-finite values", () => {
    expect(isValidCurrencyAmount(NaN)).toBe(false);
    expect(isValidCurrencyAmount(Infinity)).toBe(false);
  });
});

describe("clampCurrencyAmount", () => {
  it("floors fractional amounts", () => {
    expect(clampCurrencyAmount(150000.9)).toBe(150000);
  });

  it("clamps negatives to zero and over-max to max", () => {
    expect(clampCurrencyAmount(-5)).toBe(0);
    expect(clampCurrencyAmount(MAX_PAYMENT_AMOUNT + 999)).toBe(MAX_PAYMENT_AMOUNT);
  });

  it("returns zero for non-finite values", () => {
    expect(clampCurrencyAmount(NaN)).toBe(0);
    expect(clampCurrencyAmount(Infinity)).toBe(0);
  });
});
