import { useCallback, useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getSettings } from "../db/repos";
import { db } from "../db/db";
import { SETTINGS_LOAD_TIMEOUT_MS } from "../lib/settingsPresentation";
import type { Settings } from "../db/types";

export interface SettingsQuery {
  /** `undefined` = belum datang (belum selesai dimuat). */
  settings: Settings | undefined;
  /** Pesan galat baca; `null` = tidak ada galat. */
  error: string | null;
  /** Batas tunggu terlampaui tanpa jawaban apa pun dari penyimpanan. */
  timedOut: boolean;
  /** Sedang mencoba lagi (dipakai tombol "Coba lagi"). */
  retrying: boolean;
  /** Buang galat & jalankan ulang pembacaan. */
  retry: () => void;
}

/**
 * Satu cara membaca pengaturan untuk SEMUA layar (G2-10, diangkat dari Q18/G1-07).
 *
 * Masalah yang diselesaikan: `useLiveQuery` tidak meneruskan galat — observable-nya
 * hanya membawa nilai. `getSettings()` yang menolak membuat `settings` tetap
 * `undefined`, sehingga "gagal baca" tidak bisa dibedakan dari "masih memuat" dan
 * layar bisa menggantung tanpa jalan keluar.
 *
 * Hook ini memasang dua jaring yang dulu hanya ada di layar Pengaturan:
 * 1. **batas tunggu** (`SETTINGS_LOAD_TIMEOUT_MS`) → `timedOut`;
 * 2. **probe langsung** ke store yang sama lewat `db.settings.get("app")` → `error`.
 *
 * Probe TIDAK dijalankan ulang setelah gagal sampai `retry()` dipanggil — tanpa
 * penjaga itu, kegagalan permanen berubah menjadi loop request tanpa akhir.
 */
export function useSettingsQuery(): SettingsQuery {
  const [nonce, setNonce] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const settings = useLiveQuery(() => getSettings(), [nonce]);

  useEffect(() => {
    if (settings) return;
    const timer = setTimeout(() => setTimedOut(true), SETTINGS_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [settings, nonce]);

  useEffect(() => {
    if (settings || error) return;
    let cancelled = false;
    db.settings.get("app")
      .then(() => {
        if (cancelled) return;
        setTimedOut(false);
        setRetrying(false);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setRetrying(false);
        setError((e as Error)?.message || "pengaturan tidak bisa dibaca");
      });
    return () => { cancelled = true; };
  }, [settings, nonce, error]);

  const retry = useCallback(() => {
    setRetrying(true);
    setError(null);
    setTimedOut(false);
    setNonce((n) => n + 1);
  }, []);

  return { settings, error, timedOut, retrying, retry };
}
