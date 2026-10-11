/**
 * Keadaan pembaruan aplikasi (PWA) — G3-09 butir 10, dan perbaikan tombol
 * "Perbarui" yang tidak berfungsi.
 *
 * Kenapa modul terpisah: repo ini **tidak memasang jsdom**, sehingga satu-satunya
 * cara menjaga perilaku pembaruan lewat tes adalah memisahkan keputusannya ke
 * fungsi murni. Yang dijaga di sini:
 *
 * 1. **Kapan pemeriksaan manual boleh ditekan** — memeriksa pembaruan saat
 *    perangkat offline hanya menghasilkan galat jaringan yang membingungkan.
 * 2. **Apa yang terjadi setelah "Perbarui" ditekan** — sebelum G3-09 tombol itu
 *    bisa ditekan berulang kali karena tidak ada keadaan "sedang memasang", dan
 *    kegagalannya tidak terlihat sama sekali (hanya `console.warn`).
 * 3. **Tombol tutup yang tidak menyembunyikan pembaruan selamanya** — sekali
 *    ditutup, pembaruan tidak muncul lagi di sesi itu, tetapi **selalu tetap bisa
 *    dipasang dari Pengaturan → Aplikasi**. Itu alasan tombol tutup tidak boleh
 *    menghapus kemampuan memasang.
 */

export const UPDATE_DISMISS_KEY = "leskolui_update_dismissed_until";

/** Sekali ditutup, tawaran tidak muncul lagi selama ini (7 hari). */
export const DISMISS_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface UpdateGate {
  /** Ada versi baru yang sudah menunggu untuk dipasang (`onNeedRefresh`). */
  ready: boolean;
  /** Versi aplikasi yang berjalan sekarang, mis. "v1.100.0". */
  currentVersion: string;
  /** Apakah perangkat sedang online; dari `navigator.onLine`. */
  onLine: boolean;
  /** Pemeriksaan sedang berjalan. */
  checking: boolean;
  /** Pemasangan sedang berjalan. */
  applying: boolean;
  /** Tutor menutup tawaran (tersimpan). */
  dismissed: boolean;
}

export type UpdateActionId = "check" | "apply" | "dismiss";

export interface UpdateAction {
  id: UpdateActionId;
  label: string;
  enabled: boolean;
  /** Alasan tombol nonaktif; wajib ada bila `enabled` false. */
  reason?: string;
}

/**
 * Keadaan ringkas untuk antarmuka. Dipakai banner (di `PwaPrompts.tsx`) **dan**
 * bagian Aplikasi di Pengaturan, supaya keduanya tidak pernah berbeda kata.
 */
export interface UpdateState {
  /** Judul yang ditampilkan, mis. "Pembaruan aplikasi siap dipasang." */
  headline: string;
  /** Kalimat penjelas; menyebut nomor versi yang sedang berjalan. */
  detail: string;
  /** Banner tawaran perlu ditampilkan. */
  showBanner: boolean;
  actions: UpdateAction[];
}

/**
 * Ringkas keadaan pembaruan menjadi teks + tombol.
 *
 * Perhatikan bahwa `dismissed` **tidak** mematikan aksi "apply": yang dihentikan
 * hanya tawarannya. Memasang pembaruan adalah hak tutor kapan saja, dan satu
 * ketukan tidak sengaja pada "Tutup" tidak boleh menguncinya selama seminggu.
 *
 * **Invarian yang dijaga tes:** setiap aksi yang `enabled: false` wajib punya
 * `reason`. Tombol mati tanpa alasan adalah keluhan "tombolnya tidak bekerja"
 * dalam bentuk lain, dan itu persis yang sedang diperbaiki.
 */
export function updateState(gate: UpdateGate): UpdateState {
  const applyAction: UpdateAction = gate.applying
    ? { id: "apply", label: "Memasang...", enabled: false, reason: "Pembaruan sedang dipasang." }
    : gate.ready
      ? { id: "apply", label: "Perbarui sekarang", enabled: true }
      : { id: "apply", label: "Perbarui sekarang", enabled: false, reason: "Belum ada pembaruan yang siap dipasang." };

  const checkAction: UpdateAction = gate.checking
    ? { id: "check", label: "Memeriksa...", enabled: false, reason: "Pemeriksaan sedang berjalan." }
    : gate.applying
      ? { id: "check", label: "Periksa pembaruan", enabled: false, reason: "Pembaruan sedang dipasang." }
      : !gate.onLine
        ? { id: "check", label: "Periksa pembaruan", enabled: false, reason: "Perangkat sedang offline — pemeriksaan butuh internet." }
        : { id: "check", label: "Periksa pembaruan", enabled: true };

  const dismissAction: UpdateAction = gate.applying
    ? { id: "dismiss", label: "Nanti saja", enabled: false, reason: "Pembaruan sedang dipasang." }
    : gate.ready
      ? { id: "dismiss", label: "Nanti saja", enabled: true }
      : { id: "dismiss", label: "Nanti saja", enabled: false, reason: "Tidak ada yang perlu ditutup." };

  if (gate.applying) {
    return {
      headline: "Memasang pembaruan...",
      detail: "Halaman dimuat ulang sendiri setelah selesai. Jangan tutup aplikasi.",
      showBanner: true,
      actions: [applyAction, checkAction],
    };
  }
  if (gate.ready) {
    return {
      headline: "Pembaruan aplikasi siap dipasang.",
      detail: `Versi yang berjalan sekarang ${gate.currentVersion}. Memasang pembaruan memuat ulang aplikasi sebentar; isian yang belum tersimpan disimpan lebih dulu.`,
      showBanner: !gate.dismissed,
      actions: [applyAction, dismissAction, checkAction],
    };
  }
  return {
    headline: "Aplikasi sudah versi terbaru.",
    detail: gate.onLine
      ? `Versi yang berjalan ${gate.currentVersion}. Pemeriksaan manual memakai internet dan tidak mengubah data Anda.`
      : `Versi yang berjalan ${gate.currentVersion}. Sambungkan ke internet untuk memeriksa pembaruan.`,
    showBanner: false,
    actions: [checkAction],
  };
}

/**
 * Ambil pesan yang benar-benar bisa dibaca dari nilai yang dilempar.
 *
 * `String(nilai)` tidak cukup: `String({})` menghasilkan `"[object Object]"`,
 * dan itu pernah akan tampil di layar. Hanya Error, string, dan number yang
 * dianggap punya pesan; sisanya diperlakukan sebagai "tidak ada pesan".
 */
function pesanTerbaca(error: unknown): string {
  if (error instanceof Error) return error.message || "";
  if (typeof error === "string") return error;
  if (typeof error === "number" && Number.isFinite(error)) return String(error);
  return "";
}

/**
 * Pesan galat yang bisa dibaca tutor ketika pemasangan gagal.
 *
 * Sebelum G3-09 kegagalan hanya masuk `console.warn`, sehingga tombol yang tidak
 * bekerja tampak seperti tombol mati — persis keluhan yang memicu perubahan ini.
 */
export function applyFailureMessage(error: unknown): string {
  const pesan = pesanTerbaca(error);
  if (/offline|network|fetch|ERR_INTERNET/i.test(pesan)) {
    return "Pembaruan gagal dipasang karena jaringan terputus. Sambungkan ke internet lalu coba lagi — data Anda tidak berubah.";
  }
  if (/waiting|no\s*service\s*worker|not\s*found/i.test(pesan)) {
    return "Pembaruan tidak bisa dipasang sekarang. Tutup lalu buka lagi aplikasi ini, kemudian tekan Perbarui sekali lagi.";
  }
  return `Pembaruan gagal dipasang${pesan ? `: ${pesan}` : ""}. Coba lagi; kalau tetap gagal, tutup dan buka lagi aplikasi ini. Data Anda tidak berubah.`;
}

/** Pesan hasil pemeriksaan manual: ditemukan pembaruan atau tidak. */
export function checkResultMessage(ditemukan: boolean): string {
  return ditemukan
    ? "Pembaruan tersedia. Tekan Perbarui sekarang untuk memasangnya."
    : "Aplikasi sudah versi terbaru.";
}

/**
 * Apakah tawaran pembaruan boleh muncul, mengingat penolakan tersimpan.
 *
 * `raw` adalah isi `localStorage`; nilai kosong, rusak, atau sudah kedaluwarsa
 * berarti boleh ditawarkan lagi.
 */
export function isUpdateDismissed(raw: string | null | undefined, now: number = Date.now()): boolean {
  if (!raw) return false;
  const until = Number(raw);
  return Number.isFinite(until) && until > now;
}

export function dismissedUntil(now: number = Date.now(), days: number = DISMISS_DAYS): number {
  return now + days * DAY_MS;
}

/** Baca penolakan dari penyimpanan; penyimpanan yang diblokir = belum ditolak. */
export function readUpdateDismissed(
  storage: Pick<Storage, "getItem"> | null | undefined,
  now: number = Date.now(),
): boolean {
  try {
    return isUpdateDismissed(storage ? storage.getItem(UPDATE_DISMISS_KEY) : null, now);
  } catch {
    return false;
  }
}

/** Simpan penolakan; gagal menyimpan tidak boleh membuat aplikasi error. */
export function writeUpdateDismissed(
  storage: Pick<Storage, "setItem"> | null | undefined,
  now: number = Date.now(),
  days: number = DISMISS_DAYS,
): void {
  try {
    storage?.setItem(UPDATE_DISMISS_KEY, String(dismissedUntil(now, days)));
  } catch {
    /* tanpa penyimpanan: tawaran mungkin muncul lagi, tapi aplikasi tetap jalan */
  }
}

/** Hapus penolakan — dipakai saat tutor memasang pembaruan dari Pengaturan. */
export function clearUpdateDismissed(storage: Pick<Storage, "removeItem"> | null | undefined): void {
  try {
    storage?.removeItem(UPDATE_DISMISS_KEY);
  } catch {
    /* abaikan */
  }
}
