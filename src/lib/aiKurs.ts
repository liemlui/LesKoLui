/**
 * Kurs USD→IDR untuk seluruh perhitungan biaya AI.
 *
 * **Kenapa berkas terpisah dari `aiPricingSource.ts`.** Tarif DeepSeek dan kurs
 * berasal dari sumber berbeda, berubah dengan irama berbeda (tarif: jarang,
 * kurs: harian), dan punya arti berbeda saat gagal. Menyatukannya membuat satu
 * kegagalan jaringan menghapus dua angka sekaligus.
 *
 * **Kenapa kurs tidak boleh ditanam sebagai satu angka.** Sampai 2026-10-18
 * aplikasi memakai Rp16.000/USD. Kurs pasar hari itu 18.031 (Frankfurter/ECB)
 * dan 18.014,6 (exchangerate-api) — asumsi lamanya meleset ~11%, dan angka itu
 * mengalikan **seluruh** biaya AI yang dicatat.
 *
 * **Batas yang tetap berlaku:** ini kurs pasar, bukan kurs yang Anda bayar.
 * Kartu bank biasanya menambah 1–3% di atas kurs pasar. Jadi angka di aplikasi
 * tetap perkiraan, hanya lebih dekat.
 */
import { AI_ESTIMATE_IDR_PER_USD } from "./aiPricing";

export const KURS_ENDPOINT = "/api/kurs-usd-idr";
const STORAGE_KEY = "leskolui:ai-kurs:v1";
const FETCH_TIMEOUT_MS = 8000;

/** Rentang wajar IDR per USD; di luar ini dianggap data rusak. */
export const KURS_MIN_WAJAR = 10_000;
export const KURS_MAX_WAJAR = 25_000;

export interface KursSnapshot {
  schemaVersion: 1;
  usdIdr: number;
  /** Nama sumber: "frankfurter", "exchangerate-api", atau "asumsi bawaan". */
  source: string;
  sourceUrl: string;
  /** Tanggal kurs menurut sumbernya (YYYY-MM-DD), bukan tanggal pengambilan. */
  rateDate: string;
  fetchedAt?: string;
  verifiedAt: string;
  provenance: "kurs-live" | "default-embedded" | "user-stored";
  warnings?: string[];
}

/**
 * Kurs cadangan bila belum pernah diperbarui atau jaringan gagal.
 *
 * Nilainya kurs pasar yang dicocokkan pada 2026-10-18. Kurs bergerak setiap
 * hari, jadi angka ini **akan** basi — modal menandainya sebagai asumsi bawaan,
 * dan `kursBasi()` memberi peringatan sesudah sepekan.
 */
export const KURS_USD_IDR_BAWAAN: KursSnapshot = {
  schemaVersion: 1,
  usdIdr: AI_ESTIMATE_IDR_PER_USD,
  source: "asumsi bawaan",
  sourceUrl: "https://api.frankfurter.dev/v1/latest?base=USD&symbols=IDR",
  rateDate: "2026-10-18",
  verifiedAt: "2026-10-18",
  provenance: "default-embedded",
};

export type KursFetchResult =
  | { ok: true; snapshot: KursSnapshot; warnings: string[] }
  | { ok: false; reason: "offline" | "timeout" | "http" | "format"; message: string };

export function validasiKurs(raw: unknown): KursSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const k = raw as Partial<KursSnapshot>;
  if (k.schemaVersion !== 1) return null;
  if (typeof k.usdIdr !== "number" || !Number.isFinite(k.usdIdr)) return null;
  if (k.usdIdr < KURS_MIN_WAJAR || k.usdIdr > KURS_MAX_WAJAR) return null;
  if (typeof k.source !== "string" || k.source.length === 0) return null;
  if (typeof k.verifiedAt !== "string") return null;
  return k as KursSnapshot;
}

/** Ambil kurs terbaru dari endpoint server. Tidak pernah menulis apa pun. */
export async function fetchKursUsdIdr(): Promise<KursFetchResult> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { ok: false, reason: "offline", message: "Perangkat sedang offline." };
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(KURS_ENDPOINT, { signal: ctrl.signal, headers: { accept: "application/json" } });

    const tipe = res.headers.get("content-type") ?? "";
    if (!tipe.includes("application/json")) {
      return { ok: false, reason: "http", message: "Endpoint kurs tidak tersedia (balasan bukan JSON)." };
    }
    if (!res.ok) {
      const galat = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, reason: "http", message: galat.error ?? `Server membalas ${res.status}.` };
    }

    const snapshot = validasiKurs(await res.json());
    if (!snapshot) return { ok: false, reason: "format", message: "Bentuk data kurs tidak dikenali." };
    return { ok: true, snapshot, warnings: snapshot.warnings ?? [] };
  } catch (e) {
    const dibatalkan = e instanceof DOMException && e.name === "AbortError";
    return {
      ok: false,
      reason: dibatalkan ? "timeout" : "http",
      message: dibatalkan ? "Waktu habis menghubungi server kurs (8 detik)." : "Tidak bisa menghubungi server kurs.",
    };
  } finally {
    clearTimeout(timer);
  }
}

export function bacaKursTersimpan(): KursSnapshot | null {
  try {
    const mentah = localStorage.getItem(STORAGE_KEY);
    return mentah ? validasiKurs(JSON.parse(mentah)) : null;
  } catch {
    return null;
  }
}

export function simpanKurs(snapshot: KursSnapshot): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...snapshot, provenance: "user-stored" }));
  } catch {
    // Kuota penuh / mode privat: kurs tetap berlaku selama sesi lewat state pemanggil.
  }
}

export function hapusKursTersimpan(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Tidak ada yang bisa dilakukan, dan tidak ada yang perlu dilakukan.
  }
}

export function kursEfektif(): KursSnapshot {
  return bacaKursTersimpan() ?? KURS_USD_IDR_BAWAAN;
}

/** Angka kurs yang dipakai perhitungan uang. */
export function kursUsdIdr(): number {
  return kursEfektif().usdIdr;
}

/** true bila kurs sudah lebih tua dari `hariMaksimal` (bawaan: sepekan). */
export function kursBasi(snapshot: KursSnapshot, sekarang = new Date(), hariMaksimal = 7): boolean {
  if (!snapshot.fetchedAt) {
    // Kurs bawaan: basi diukur dari tanggal pencocokannya.
    const umurBawaan = sekarang.getTime() - new Date(snapshot.verifiedAt).getTime();
    return Number.isFinite(umurBawaan) && umurBawaan > 30 * 86_400_000;
  }
  const umur = sekarang.getTime() - new Date(snapshot.fetchedAt).getTime();
  return Number.isFinite(umur) && umur > hariMaksimal * 86_400_000;
}
