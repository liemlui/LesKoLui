import { useCallback, useSyncExternalStore } from "react";

/**
 * Kerapatan timeline layar Hari (G2-07 / TASK-09 Langkah 1–2).
 *
 * Diletakkan di `lib/` — bukan di `screens/home/DayView.tsx` — karena berkas layar
 * di repo ini hanya boleh mengekspor komponen (`react-refresh/only-export-components`,
 * preset `reactRefresh.configs.vite`). Preseden yang sama sudah ada: `lib/moods.ts`
 * dipisah dari `CaptureSession.tsx` dengan alasan yang persis sama.
 */

/** Tiga tingkat kerapatan timeline (mockup: rapat / normal / lega). */
export const DAY_DENSITY = {
  rapat:  27,   // 18 jam ≈ 486 px — sehari penuh muat
  normal: 54,   // kerapatan membaca detail jam
  lega:   97,   // satu blok besar, untuk melihat isi
} as const;
export type DayDensityKey = keyof typeof DAY_DENSITY;

/** Urutan tampil ketiga tingkat (dipakai bilah kerapatan di `DayView`). */
export const DENSITY_ORDER: DayDensityKey[] = ["rapat", "normal", "lega"];

/** Rentang mode "sehari penuh" (18 jam) — dipakai tombol ⇱. */
export const FULL_DAY_START = 6;
export const FULL_DAY_END   = 24;
/** Tinggi area timeline yang tersedia = 62vh (lihat `maxHeight` kontainer DayView). */
export const TIMELINE_VIEWPORT_FRACTION = 0.62;

/**
 * Pemilih kerapatan untuk tombol ⇱ "Muat sehari penuh".
 *
 * Memilih tingkat **terbesar yang tidak melebihi** tinggi tersedia — bukan yang
 * terdekat — supaya seluruh hari benar-benar muat tanpa scroll. Bila bahkan
 * tingkat terapat masih terlalu besar, hasilnya tetap `rapat`.
 */
export function densityForHeight(availablePx: number, hours = FULL_DAY_END - FULL_DAY_START): DayDensityKey {
  const perHour = Math.floor(availablePx / hours);
  let pick: DayDensityKey = "rapat";
  for (const key of DENSITY_ORDER) {
    if (DAY_DENSITY[key] <= perHour) pick = key;
  }
  return pick;
}

/**
 * Kerapatan disimpan di **memori sesi**, bukan `localStorage` — konsisten dengan
 * keputusan "berlaku selama aplikasi terbuka" (§K3.4). Berpindah layar tidak
 * mengembalikan pilihan ke default.
 */
let densityMemory: DayDensityKey = "normal";
const densityListeners = new Set<() => void>();
const subscribeDensity = (listener: () => void) => {
  densityListeners.add(listener);
  return () => { densityListeners.delete(listener); };
};
const getDensitySnapshot = () => densityMemory;

/** Hook kecil; nilai default "normal" (tampilan awal tidak berubah). */
export function useDayDensity(): {
  density: DayDensityKey;
  setDensity(k: DayDensityKey): void;
} {
  const density = useSyncExternalStore(subscribeDensity, getDensitySnapshot, getDensitySnapshot);
  const setDensity = useCallback((k: DayDensityKey) => {
    densityMemory = k;
    for (const listener of densityListeners) listener();
  }, []);
  return { density, setDensity };
}
