import { safeLocalStorage } from "./pwaInstall";

/**
 * Penanda "PIN Keuangan belum dipasang lagi sesudah reset total" — G3-10 butir 3.
 *
 * **Masalah yang diselesaikan.** Sesudah "Hapus Semua Data", `jalankanResetSemuaData()`
 * ikut membersihkan tabel `settings` — termasuk PIN Keuangan. Aplikasi lalu memuat ulang,
 * dan yang muncul adalah Beranda kosong tanpa satu pun penjelasan: tutor tidak tahu bahwa
 * yang hilang adalah PIN-nya, dan tidak tahu bahwa ia harus memasangnya lagi. Syarat selesai
 * G3-10 menyebutnya eksplisit: *"muncul ajakan memasang PIN baru, bukan layar kosong tanpa
 * penjelasan, beserta tautan ke panduan backup"*.
 *
 * **Kenapa di `localStorage`, bukan di tabel.** Penanda ini harus **selamat dari pembersihan
 * tabel** — kalau ia ikut terhapus, ajakannya tidak akan pernah muncul. `dangerZoneActions.ts`
 * memang sengaja menghapus satu kunci `localStorage` lain (pengingat backup) supaya pengingat
 * itu muncul lagi; kunci ini justru kebalikannya, ia harus bertahan sampai tutor membacanya.
 *
 * **Kenapa fungsi murni + storage yang disuntikkan.** Repo ini tidak memasang jsdom, sehingga
 * satu-satunya cara modul ini bisa dijaga tes adalah dengan menerima `Storage` sebagai
 * argumen. `safeLocalStorage()` dari `pwaInstall.ts` dipakai supaya mode privat/cookie
 * diblokir berarti "tidak ada penyimpanan", bukan galat yang menjatuhkan layar.
 */

/** Nilai penanda. Isinya tanggal ISO supaya bisa dibaca manusia saat menelusuri penyimpanan. */
export const PIN_RESET_PENDING_KEY = "leskolui_pin_reset_pending";

/** Halaman Pengaturan, langsung ke bagian PIN Keuangan (`Section` memang memasang `id` ini). */
export const PIN_RESET_SETTINGS_PATH = "/settings#bagian-pin";

/**
 * Halaman panduan backup yang sudah ada di repo.
 *
 * `docs/02-PANDUAN-BACKUP-DRIVE-SENYAP.md`. Sama seperti rujukan `docs/` lain di aplikasi ini
 * (`BackupSection.tsx:405`, `driveBackup.ts:63`) ia ditulis sebagai jalur berkas, bukan URL:
 * repo ini tidak menyajikan folder `docs/` di alamat produksi, jadi menautkannya sebagai
 * halaman web akan menghasilkan tautan mati. Yang menghubungkan tutor ke tempat itu adalah
 * tombol "Buka backup" di banner ini, yang menuju **Pengaturan → Backup dan Restore**.
 */
export const PANDUAN_BACKUP_PATH = "docs/02-PANDUAN-BACKUP-DRIVE-SENYAP.md";

/** Bagian Pengaturan yang memuat jalur backup/pemulihan. */
export const BACKUP_SETTINGS_PATH = "/settings#bagian-backup";

type Readable = Pick<Storage, "getItem"> | null | undefined;
type Writable = Pick<Storage, "setItem"> | null | undefined;
type Removable = Pick<Storage, "removeItem"> | null | undefined;

/**
 * Tandai bahwa reset baru saja terjadi dan PIN-nya belum dipasang lagi.
 * Dipanggil `jalankanResetSemuaData()` **sebelum** halaman dimuat ulang.
 */
export function tandaiPinBelumDibuat(
  storage: Writable = safeLocalStorage(),
  now: number = Date.now(),
): void {
  try {
    storage?.setItem(PIN_RESET_PENDING_KEY, new Date(now).toISOString());
  } catch {
    /* tanpa penyimpanan: ajakannya hilang, tetapi resetnya sendiri tetap berhasil */
  }
}

/** Apakah ajakan "pasang PIN baru" perlu ditampilkan. */
export function pinBelumDibuat(storage: Readable = safeLocalStorage()): boolean {
  try {
    return Boolean(storage?.getItem(PIN_RESET_PENDING_KEY));
  } catch {
    return false;
  }
}

/** Buang penandanya: dipanggil saat PIN baru benar-benar tersimpan, atau saat ditutup tutor. */
export function lupakanPinBelumDibuat(storage: Removable = safeLocalStorage()): void {
  try {
    storage?.removeItem(PIN_RESET_PENDING_KEY);
  } catch {
    /* tidak ada yang bisa dibersihkan */
  }
}

/**
 * Apakah ajakan ditampilkan pada render ini.
 *
 * Dua syarat, dan keduanya wajib: penandanya ada **dan** PIN-nya memang belum terpasang.
 * Syarat kedua bukan hiasan — ia yang membuat ajakan ini hilang sendiri begitu PIN disimpan,
 * sehingga tidak ada cara ajakan itu tertinggal di layar dan berbohong kepada tutor.
 */
export function tampilkanAjakanPin(penandaAda: boolean, adaPin: boolean): boolean {
  return penandaAda && !adaPin;
}
