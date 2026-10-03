import { useCallback, useSyncExternalStore } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getSettings } from "../db/repos";
import { verifyPin } from "../lib/crypto";
import { getPinLockoutDelay, recordPinFailure, resetPinLockout } from "../lib/pinLockout";

/** Status buka-kunci uang. Selama aplikasi terbuka (kontrak K3.4, keputusan B2). */
export interface MoneyVisibility {
  /** Belum ada PIN keuangan di Pengaturan. */
  readonly needsSetup: boolean;
  /** Ada PIN, belum dibuka. */
  readonly locked: boolean;
  /** Boleh menampilkan angka. */
  readonly visible: boolean;
  /** Buka dengan PIN. true = berhasil. */
  unlock(pin: string): Promise<boolean>;
  /** Kunci kembali secara manual. */
  lock(): void;
  /** Pesan galat terakhir (mis. "PIN salah." / "Tunggu 12 detik."). */
  readonly error: string;
  /** Bersihkan galat saat pengguna mulai mengetik lagi. */
  clearError(): void;
}

interface MoneyState {
  unlocked: boolean;
  error: string;
}

/**
 * Satu kebenaran visibilitas uang untuk seluruh aplikasi (kontrak K3.1).
 *
 * Status disimpan **di memori modul**, bukan `useState` per komponen dan bukan
 * `localStorage`: beberapa komponen di satu layar memanggil hook ini, dan membuka
 * di satu tempat harus membuka di semuanya (B2: berlaku selama aplikasi terbuka,
 * lalu kembali terkunci saat aplikasi ditutup).
 *
 * Verifikasi PIN memakai `verifyPin` yang sama dengan `usePinGate` dan lockout
 * dari `lib/pinLockout` — **bukan** salinan logika sendiri.
 */
let state: MoneyState = { unlocked: false, error: "" };
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function getSnapshot(): MoneyState {
  return state;
}

function patch(next: Partial<MoneyState>): void {
  state = { ...state, ...next };
  for (const listener of listeners) listener();
}

/** Hook utama. Aman dipanggil di banyak komponen sekaligus. */
export function useMoneyVisible(): MoneyVisibility {
  const settings = useLiveQuery(() => getSettings(), []);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const storedPin = settings?.financialPin;
  const needsSetup = !storedPin;

  const unlock = useCallback(async (pin: string): Promise<boolean> => {
    const delay = getPinLockoutDelay();
    if (delay > 0) {
      patch({ error: `Tunggu ${Math.ceil(delay / 1000)} detik.` });
      return false;
    }
    if (!storedPin) {
      patch({ error: "PIN Keuangan belum dibuat." });
      return false;
    }
    const ok = await verifyPin(pin, storedPin);
    if (!ok) {
      recordPinFailure();
      patch({ error: "PIN salah." });
      return false;
    }
    resetPinLockout();
    patch({ unlocked: true, error: "" });
    return true;
  }, [storedPin]);

  const lock = useCallback(() => { patch({ unlocked: false, error: "" }); }, []);

  const clearError = useCallback(() => {
    if (state.error) patch({ error: "" });
  }, []);

  return {
    needsSetup,
    locked: !needsSetup && !snapshot.unlocked,
    visible: !needsSetup && snapshot.unlocked,
    unlock,
    lock,
    clearError,
    error: snapshot.error,
  };
}
