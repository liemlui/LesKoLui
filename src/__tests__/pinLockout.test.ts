import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getPinLockoutDelay,
  recordPinFailure,
  resetPinLockout,
  sisaDetikLockout,
} from "../lib/pinLockout";

/**
 * G3-02 #10 menambahkan hitungan mundur di gerbang PIN. Hitungan itu janji ke
 * pengguna ("Tunggu N detik"), jadi ia harus dibuktikan — dan yang paling
 * penting: ia harus dibaca dari penegakan lockout yang sama, bukan rumus kedua
 * yang bisa berbeda sendiri.
 *
 * Lingkungan tes di repo ini **node, bukan jsdom**, jadi `localStorage` tidak
 * ada. Modulnya sekarang lewat `safeLocalStorage()` dari `pwaInstall`, yang
 * mengembalikan `null` di lingkungan tanpa penyimpanan — jadi yang diuji di
 * bawah ini adalah penyimpanan tiruan yang dipasang sendiri.
 */
function pasangPenyimpananTiruan() {
  const peta = new Map<string, string>();
  const tiruan = {
    getItem: (kunci: string) => peta.get(kunci) ?? null,
    setItem: (kunci: string, nilai: string) => { peta.set(kunci, String(nilai)); },
    removeItem: (kunci: string) => { peta.delete(kunci); },
    clear: () => peta.clear(),
    key: (indeks: number) => Array.from(peta.keys())[indeks] ?? null,
    get length() { return peta.size; },
  };
  (globalThis as { localStorage?: unknown }).localStorage = tiruan;
  return tiruan;
}

describe("pinLockout", () => {
  beforeEach(() => {
    pasangPenyimpananTiruan();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it("tidak menahan percobaan pertama", () => {
    expect(getPinLockoutDelay()).toBe(0);
    expect(sisaDetikLockout()).toBe(0);
  });

  it("menahan satu detik sesudah kegagalan pertama", () => {
    recordPinFailure();
    // 2^(1-1) * 1000 = 1000 ms
    expect(getPinLockoutDelay()).toBeGreaterThan(0);
    expect(getPinLockoutDelay()).toBeLessThanOrEqual(1000);
    expect(sisaDetikLockout()).toBe(1);
  });

  it("menaikkan masa tunggu berlipat ganda tiap kegagalan berikutnya", () => {
    recordPinFailure();
    expect(sisaDetikLockout()).toBe(1);
    recordPinFailure();
    expect(sisaDetikLockout()).toBe(2);
    recordPinFailure();
    expect(sisaDetikLockout()).toBe(4);
    recordPinFailure();
    expect(sisaDetikLockout()).toBe(8);
  });

  it("memotong masa tunggu di enam puluh detik walau gagal berkali-kali", () => {
    for (let i = 0; i < 12; i += 1) recordPinFailure();
    expect(sisaDetikLockout()).toBe(60);
  });

  it("menghitung mundur seiring waktu berjalan", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-07T08:00:00.000Z"));
    recordPinFailure();
    recordPinFailure();
    recordPinFailure();
    expect(sisaDetikLockout()).toBe(4);

    vi.setSystemTime(new Date("2026-10-07T08:00:02.000Z"));
    expect(sisaDetikLockout()).toBe(2);

    vi.setSystemTime(new Date("2026-10-07T08:00:03.500Z"));
    expect(sisaDetikLockout()).toBe(1);
  });

  it("kembali nol setelah masa tunggu habis", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-07T08:00:00.000Z"));
    recordPinFailure();
    recordPinFailure();
    expect(sisaDetikLockout()).toBe(2);

    vi.setSystemTime(new Date("2026-10-07T08:00:05.000Z"));
    expect(getPinLockoutDelay()).toBe(0);
    expect(sisaDetikLockout()).toBe(0);
  });

  it("membersihkan masa tunggu sesudah PIN benar", () => {
    recordPinFailure();
    recordPinFailure();
    expect(sisaDetikLockout()).toBeGreaterThan(0);

    resetPinLockout();
    expect(getPinLockoutDelay()).toBe(0);
    expect(sisaDetikLockout()).toBe(0);
  });

  it("tidak melempar saat localStorage berisi sampah", () => {
    pasangPenyimpananTiruan().setItem("pin_lockout", "{bukan json");
    expect(() => getPinLockoutDelay()).not.toThrow();
    expect(getPinLockoutDelay()).toBe(0);
  });

  it("menganggap tidak ada masa tunggu saat penyimpanan tidak tersedia", () => {
    // Lingkungan tanpa localStorage (mode privat, webview ketat) tidak boleh
    // membuat gerbang PIN melempar — cukup tidak ada masa tunggu.
    delete (globalThis as { localStorage?: unknown }).localStorage;
    expect(getPinLockoutDelay()).toBe(0);
    expect(sisaDetikLockout()).toBe(0);
    expect(() => recordPinFailure()).not.toThrow();
    expect(() => resetPinLockout()).not.toThrow();
  });
});
