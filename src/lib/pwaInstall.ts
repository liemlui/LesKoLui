/**
 * Gerbang tampil/tidaknya banner "Pasang di layar utama" (`components/PwaPrompts.tsx`).
 *
 * Kenapa penolakan harus DISIMPAN, bukan sekadar state React:
 * di Android, Chrome mengubah situs menjadi aplikasi terpasang (WebAPK) lewat **Google Play
 * Services**. Pada perangkat tanpa GMS — mis. Huawei/EMUI — proses itu tidak berjalan, jadi
 * (a) yang dibuat hanya pintasan, dan (b) event `appinstalled` **tidak pernah** menyala walau
 * ikon sudah ada di layar utama. Akibatnya `installed` tidak pernah menjadi `true`, dan banner
 * kembali muncul setiap reload — terasa seperti "notif pasang app terus".
 *
 * Solusinya: setelah pengguna menekan "Nanti" atau menjalankan prompt "Pasang", simpan tanggal
 * berakhir tawaran di `localStorage` dan jangan tawarkan lagi sampai tanggal itu lewat.
 */

export const INSTALL_SNOOZE_KEY = "leskolui_install_snooze_until";

/** "Nanti" = jangan tawarkan lagi selama ini. */
export const SNOOZE_DAYS_AFTER_DISMISS = 90;
/** Prompt sudah dijalankan (diterima ATAU dibatalkan) = anggap selesai, lebih lama lagi. */
export const SNOOZE_DAYS_AFTER_PROMPT = 365;

/** Mode layar penuh = aplikasi sudah dibuka dari ikon, jadi tidak perlu ditawari pasang lagi. */
export const STANDALONE_MEDIA_QUERIES = [
  "(display-mode: standalone)",
  "(display-mode: fullscreen)",
  "(display-mode: window-controls-overlay)",
] as const;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface InstallGate {
  /** `beforeinstallprompt` sudah tertangkap, jadi tombol "Pasang" memang bisa bekerja. */
  hasPrompt: boolean;
  /** Sedang berjalan sebagai aplikasi terpasang (bukan tab browser ber-address bar). */
  standalone: boolean;
  /** Pengguna sudah menolak / prompt sudah dijalankan dan belum kedaluwarsa. */
  snoozed: boolean;
}

export function shouldShowInstallPrompt(gate: InstallGate): boolean {
  return gate.hasPrompt && !gate.standalone && !gate.snoozed;
}

export function snoozeUntil(now: number, days: number): number {
  return now + days * DAY_MS;
}

/** `raw` adalah isi `localStorage`; nilai kosong/rusak/kedaluwarsa berarti tidak di-snooze. */
export function isSnoozed(raw: string | null | undefined, now: number): boolean {
  if (!raw) return false;
  const until = Number(raw);
  return Number.isFinite(until) && until > now;
}

export function isStandaloneLaunch(
  matches: readonly boolean[],
  iosStandalone: boolean | undefined,
): boolean {
  return iosStandalone === true || matches.some(Boolean);
}

/**
 * `localStorage` bisa melempar saat diakses (mode privat / cookie diblokir), jadi aksesnya
 * selalu lewat helper ini — gagal berarti "tidak ada penyimpanan", bukan error.
 */
export function safeLocalStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function readInstallSnooze(
  storage: Pick<Storage, "getItem"> | null | undefined,
  now: number = Date.now(),
): boolean {
  try {
    return isSnoozed(storage ? storage.getItem(INSTALL_SNOOZE_KEY) : null, now);
  } catch {
    return false;
  }
}

export function writeInstallSnooze(
  storage: Pick<Storage, "setItem"> | null | undefined,
  now: number = Date.now(),
  days: number = SNOOZE_DAYS_AFTER_DISMISS,
): void {
  try {
    storage?.setItem(INSTALL_SNOOZE_KEY, String(snoozeUntil(now, days)));
  } catch {
    /* tanpa penyimpanan: banner mungkin muncul lagi, tapi aplikasi tetap jalan */
  }
}
