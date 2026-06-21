const KEY = "pin_lockout";

interface LockoutData { fails: number; lastFail: number; }

function getLockout(): LockoutData {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "null") ?? { fails: 0, lastFail: 0 }; }
  catch { return { fails: 0, lastFail: 0 }; }
}

/** Returns milliseconds remaining before next PIN attempt is allowed. 0 = no wait. */
export function getPinLockoutDelay(): number {
  const { fails, lastFail } = getLockout();
  if (fails === 0) return 0;
  const delay = Math.min(Math.pow(2, fails - 1) * 1000, 60_000); // 1s,2s,4s…60s
  return Math.max(0, delay - (Date.now() - lastFail));
}

export function recordPinFailure(): void {
  const { fails } = getLockout();
  localStorage.setItem(KEY, JSON.stringify({ fails: fails + 1, lastFail: Date.now() }));
}

export function resetPinLockout(): void {
  localStorage.removeItem(KEY);
}
