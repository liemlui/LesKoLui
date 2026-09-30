/**
 * Perawatan penyimpanan otomatis — foto sesi lama diperkecil agar backup tidak
 * membengkak tiap tahun.
 *
 * Kenapa ada: teks sesi nyaris tidak tumbuh (satu tahun catatan ≈ 20 KB),
 * sedangkan FOTO sesi adalah satu-satunya bagian data yang benar-benar besar
 * (tiap foto tersimpan + tersalin base64 di file backup). Setelah 2 tahun
 * pemakaian, backup jadi berat hampir seluruhnya karena foto.
 *
 * Kebijakan yang dipilih pemilik (2026-10-01): "hemat foto otomatis" — foto
 * yang lebih tua dari 12 bulan diperkecil resolusinya, TIDAK dihapus. Tanggal
 * yang sudah tercetak pada foto tetap ikut karena gambar tidak di-crop, dan
 * narasi/tanda tangan/tagihan tidak disentuh sama sekali.
 *
 * Berjalan paling sering sekali per 30 hari dan tidak pernah memblokir UI:
 * pemanggil cukup `void runPhotoShrinkIfDue()`.
 */

import { getSettings, saveSettings } from "../db/repos/settingsRepo";
import { shrinkSessionPhotosBefore, photoMaintenanceCutoff } from "../db/repos/sessionRepo";
import { shrinkPhotoBlob } from "./foto";

/** Foto lebih tua dari ini (bulan) yang diperkecil. */
export const PHOTO_SHRINK_AFTER_MONTHS = 12;
/** Jeda minimum antar-perawatan (hari). */
export const PHOTO_SHRINK_INTERVAL_DAYS = 30;

export interface PhotoShrinkRunResult {
  ran: boolean;
  shrunk: number;
  skipped: number;
  savedKB: number;
}

/**
 * Jalankan perawatan bila sudah due. Aman dipanggil setiap aplikasi dibuka:
 * tidak melakukan apa pun bila belum 30 hari, bila tidak ada foto lama, atau
 * bila tidak sedang online-safe (fungsi ini murni lokal, tanpa jaringan).
 */
export async function runPhotoShrinkIfDue(now = new Date()): Promise<PhotoShrinkRunResult> {
  const settings = await getSettings();
  const last = settings.lastPhotoShrinkAt ? Date.parse(settings.lastPhotoShrinkAt) : 0;
  const due = !Number.isFinite(last) || now.getTime() - last >= PHOTO_SHRINK_INTERVAL_DAYS * 86_400_000;
  if (!due) return { ran: false, shrunk: 0, skipped: 0, savedKB: 0 };

  const cutoff = photoMaintenanceCutoff(PHOTO_SHRINK_AFTER_MONTHS, now);
  const result = await shrinkSessionPhotosBefore(cutoff, shrinkPhotoBlob);
  // Tandai sudah dijalankan walau tidak ada foto, supaya pemeriksaan tidak
  // diulang setiap kali aplikasi dibuka.
  await saveSettings({ lastPhotoShrinkAt: now.toISOString() });

  return {
    ran: true,
    shrunk: result.shrunk,
    skipped: result.skipped,
    savedKB: Math.round(result.savedBytes / 1024),
  };
}
