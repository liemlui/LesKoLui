// Resilience storage: deteksi error kuota IndexedDB & tekanan penyimpanan.
// App ini offline-first dan data-critical — kalau kuota habis, tulis ke DB bisa
// gagal SENYAP. Helper ini dipakai App.tsx untuk memperingatkan user sebelum
// data hilang (lewat banner), bukan sekadar gagal tanpa kabar.

/** True kalau error berasal dari kuota penyimpanan yang penuh (lintas browser). */
export function isQuotaError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { name?: string; message?: string; inner?: { name?: string } };
  if (e.name === "QuotaExceededError" || e.inner?.name === "QuotaExceededError") return true;
  // Dexie/Safari kadang membungkus sebagai AbortError/UnknownError → endus pesannya.
  return typeof e.message === "string" && /quota|storage.*(full|exceeded)|exceeded the quota/i.test(e.message);
}

/** True kalau penyimpanan mendekati penuh (default ≥90%). Best-effort; aman gagal. */
export async function isStorageNearFull(threshold = 0.9): Promise<boolean> {
  try {
    if (!navigator.storage?.estimate) return false;
    const { usage, quota } = await navigator.storage.estimate();
    if (!usage || !quota) return false;
    return usage / quota >= threshold;
  } catch {
    return false;
  }
}
