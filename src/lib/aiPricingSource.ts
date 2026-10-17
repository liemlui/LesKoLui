/**
 * Sumber tarif AI: mengambil dari endpoint server, menyimpan di perangkat,
 * dan memilih tarif yang berlaku.
 *
 * **Kenapa lewat server, bukan `fetch` langsung ke dokumentasi.**
 * Dua alasan yang keduanya memblokir di aplikasi ini:
 * 1. CSP `connect-src` di `vercel.json` tidak memuat `api-docs.deepseek.com`,
 *    jadi browser akan menolak permintaannya.
 * 2. Situs dokumentasi statis tidak mengirim header CORS, sehingga respons pun
 *    tidak bisa dibaca dari origin aplikasi.
 * Endpoint `api/deepseek-pricing` menutup keduanya, dan sekaligus menjadi satu
 * tempat parsing yang bisa diuji dengan fixture.
 *
 * **Kenapa `localStorage`, bukan tabel Dexie.** `src/db/db.ts` termasuk berkas
 * yang dibekukan (`ATURAN-AI.md` §3). Tarif ini pula bukan data pengguna: ia
 * salinan angka pihak ketiga yang boleh hilang kapan saja tanpa kehilangan
 * pekerjaan tutor. `localStorage` memberi sifat itu tanpa menyentuh skema.
 */
import { DEEPSEEK_DEFAULT_PRICING, type PricingSnapshot } from "./aiPricing";

export const PRICING_ENDPOINT = "/api/deepseek-pricing";
const STORAGE_KEY = "leskolui:ai-pricing:v1";
const FETCH_TIMEOUT_MS = 8000;

export type PricingFetchResult =
  | { ok: true; snapshot: PricingSnapshot; warnings: string[] }
  | { ok: false; reason: "offline" | "timeout" | "http" | "format"; message: string };

function angkaPositif(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v > 0;
}

/**
 * Validasi runtime — dipakai untuk respons server **dan** untuk isi localStorage.
 *
 * Isi localStorage bisa disunting tangan atau berasal dari versi aplikasi lain,
 * jadi jalur baca dan jalur tulis sama-sama divalidasi. Bentuk yang tidak
 * dikenali berarti `null`, dan pemanggil jatuh ke tarif bawaan.
 */
export function validasiSnapshot(raw: unknown): PricingSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Partial<PricingSnapshot>;
  if (s.schemaVersion !== 1) return null;
  if (!s.models || typeof s.models !== "object") return null;
  if (!s.peak || !Array.isArray(s.peak.windowsUtc) || s.peak.windowsUtc.length === 0) return null;
  if (!Array.isArray(s.peak.weekdayUtc) || s.peak.weekdayUtc.length === 0) return null;

  const flash = s.models["deepseek-flash"];
  if (!flash) return null;
  for (const pos of [flash.inputCacheHit, flash.inputCacheMiss, flash.output]) {
    if (!pos || !angkaPositif(pos.offPeak) || !angkaPositif(pos.peak)) return null;
  }
  if (typeof s.verifiedAt !== "string") return null;

  return s as PricingSnapshot;
}

/** Tarik tarif terbaru dari endpoint server. Tidak pernah menulis apa pun. */
export async function fetchDeepSeekPricing(): Promise<PricingFetchResult> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { ok: false, reason: "offline", message: "Perangkat sedang offline." };
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(PRICING_ENDPOINT, {
      signal: ctrl.signal,
      headers: { accept: "application/json" },
    });

    // Di dev, Vite tanpa proxy membalas index.html untuk /api/* — bukan JSON.
    // Tanpa pemeriksaan ini, kegagalan tampil sebagai galat parse yang membingungkan.
    const tipe = res.headers.get("content-type") ?? "";
    if (!tipe.includes("application/json")) {
      return {
        ok: false,
        reason: "http",
        message: "Endpoint tarif tidak tersedia (balasan bukan JSON). Di dev, jalankan `vercel dev`.",
      };
    }

    if (!res.ok) {
      const galat = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, reason: "http", message: galat.error ?? `Server membalas ${res.status}.` };
    }

    const snapshot = validasiSnapshot(await res.json());
    if (!snapshot) {
      return { ok: false, reason: "format", message: "Bentuk data tarif tidak dikenali." };
    }
    return { ok: true, snapshot, warnings: snapshot.warnings ?? [] };
  } catch (e) {
    const dibatalkan = e instanceof DOMException && e.name === "AbortError";
    return {
      ok: false,
      reason: dibatalkan ? "timeout" : "http",
      message: dibatalkan ? "Waktu habis menghubungi server tarif (8 detik)." : "Tidak bisa menghubungi server tarif.",
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Tarif tersimpan di perangkat, atau `null` bila tidak ada/tidak sah. */
export function bacaTarifTersimpan(): PricingSnapshot | null {
  try {
    const mentah = localStorage.getItem(STORAGE_KEY);
    return mentah ? validasiSnapshot(JSON.parse(mentah)) : null;
  } catch {
    // localStorage bisa diblokir (mode privat) atau berisi JSON rusak.
    return null;
  }
}

/** Simpan tarif baru. Gagal menyimpan bukan alasan membatalkan pemakaiannya. */
export function simpanTarif(snapshot: PricingSnapshot): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...snapshot, provenance: "user-stored" }));
  } catch {
    // Kuota penuh / mode privat: tarif tetap berlaku selama sesi lewat state pemanggil.
  }
}

export function hapusTarifTersimpan(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Tidak ada yang bisa dilakukan, dan tidak ada yang perlu dilakukan.
  }
}

/** Tarif yang dipakai aplikasi: tersimpan → bawaan. Tidak pernah `undefined`. */
export function tarifEfektif(): PricingSnapshot {
  return bacaTarifTersimpan() ?? DEEPSEEK_DEFAULT_PRICING;
}
