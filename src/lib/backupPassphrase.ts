/**
 * Tata kelola kata sandi enkripsi backup — G3-09 butir 6 (bagian F6).
 *
 * Menyalakan backup otomatis Drive menyimpan kata sandi enkripsi ke
 * `localStorage` supaya backup bisa satu ketukan. Keadaan itu **menyangkut data**:
 * siapa pun yang memegang perangkat ini bisa membaca kata sandi yang membuka
 * seluruh berkas backup. Karena itu keadaannya harus **terlihat tanpa membuka
 * atau menyalakan apa pun**, termasuk saat fiturnya mati — supaya tutor tahu
 * tidak ada sandi yang tertinggal.
 *
 * Modul ini murni: tanpa React, tanpa DOM, tanpa Dexie.
 */

/** Kunci penyimpanan yang dipakai fitur backup otomatis. Nilainya tidak berubah. */
export const DRIVE_AUTO_KEY = "leskolui_drive_auto";
export const DRIVE_PASS_KEY = "leskolui_drive_pass";
/**
 * Secret relay backup senyap. Ikut di sini karena ia juga **kredensial backup**:
 * satu tempat untuk semua kunci penyimpanan yang menyangkut berkas backup.
 */
export const RELAY_SECRET_KEY = "leskolui_relay_secret";

export interface PassphraseStoredChip {
  /** Ada kata sandi tersimpan di perangkat. */
  stored: boolean;
  text: string;
  /** Nada warna; `warn` berarti keadaan ini membawa risiko yang perlu disadari. */
  tone: "info" | "warn";
  /** Penjelasan lengkap; menyebut cara menghapusnya supaya bukan cuma peringatan. */
  detail: string;
}

export function passphraseStoredChip(stored: boolean): PassphraseStoredChip {
  if (stored) {
    return {
      stored: true,
      text: "Kata sandi tersimpan di perangkat",
      tone: "warn",
      detail: "Backup otomatis Drive menyimpan kata sandi enkripsi di perangkat ini supaya backup bisa satu ketukan. Pastikan layar HP terkunci, dan tetap simpan berkas kunci di tempat lain untuk restore di HP baru. Mematikan backup otomatis akan menghapusnya.",
    };
  }
  return {
    stored: false,
    text: "Kata sandi tidak disimpan",
    tone: "info",
    detail: "Kata sandi enkripsi hanya ada di kolom isian selama halaman ini terbuka; Anda yang harus menyimpannya (tombol Unduh berkas kunci).",
  };
}

/**
 * Baca apakah kata sandi tersimpan, dari penyimpanan yang diberikan.
 *
 * Penyimpanan yang diblokir (mode privat, cookie ditolak) berarti **tidak
 * tersimpan** — bukan error. Yang penting: hasilnya tidak pernah "berhasil
 * membaca" secara palsu, karena chip ini dipakai untuk memberi tahu tutor bahwa
 * sandinya ada di perangkat.
 */
export function readPassphraseStored(storage: Pick<Storage, "getItem"> | null | undefined): boolean {
  try {
    const v = storage?.getItem(DRIVE_PASS_KEY);
    return typeof v === "string" && v.length > 0;
  } catch {
    return false;
  }
}
