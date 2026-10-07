import { safeLocalStorage } from "./pwaInstall";

const KEY = "pin_lockout";

interface LockoutData { fails: number; lastFail: number; }

function getLockout(): LockoutData {
  // Lewat `safeLocalStorage()` supaya modul ini juga aman di lingkungan tanpa
  // penyimpanan (dan bisa diuji). Gagal baca = "tidak ada masa tunggu", bukan error.
  const store = safeLocalStorage();
  if (!store) return { fails: 0, lastFail: 0 };
  try { return JSON.parse(store.getItem(KEY) ?? "null") ?? { fails: 0, lastFail: 0 }; }
  catch { return { fails: 0, lastFail: 0 }; }
}

/** Returns milliseconds remaining before next PIN attempt is allowed. 0 = no wait. */
export function getPinLockoutDelay(): number {
  const { fails, lastFail } = getLockout();
  if (fails === 0) return 0;
  const delay = Math.min(Math.pow(2, fails - 1) * 1000, 60_000); // 1s,2s,4s…60s
  return Math.max(0, delay - (Date.now() - lastFail));
}

/**
 * Sisa masa tunggu dalam detik, dibulatkan ke atas. 0 = boleh mencoba.
 *
 * Dipakai gerbang PIN untuk menampilkan hitungan mundur. Sengaja dihitung dari
 * `getPinLockoutDelay()` yang sama dengan yang dipakai penegakan lockout, supaya
 * angka di layar tidak pernah berbeda dari aturan yang sebenarnya berlaku.
 */
export function sisaDetikLockout(): number {
  return Math.ceil(getPinLockoutDelay() / 1000);
}

export function recordPinFailure(): void {
  const store = safeLocalStorage();
  if (!store) return;
  const { fails } = getLockout();
  store.setItem(KEY, JSON.stringify({ fails: fails + 1, lastFail: Date.now() }));
}

export function resetPinLockout(): void {
  safeLocalStorage()?.removeItem(KEY);
}
