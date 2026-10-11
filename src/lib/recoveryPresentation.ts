/**
 * Presentasi jalur pemulihan (restore) di layar Pengaturan — G3-09 butir 5 dan 7.
 *
 * Tiga hal yang dijaga modul murni ini, semuanya berasal dari catatan nyata:
 *
 * 1. **Kalimat tahap.** Restore berkas 10 MB+ bisa butuh puluhan detik. Sebelum
 *    G3-09 kalimat tahap hanya ada di jalur restore yang satu; tiga jalur lain
 *    (Drive, verifikasi, reset) tampak "diam" sehingga tutor menutup halaman di
 *    tengah proses dan menganggap restore-nya gagal. `RECOVERY_STEP_LABEL` dipakai
 *    SEMUA jalur.
 * 2. **Kata konfirmasi diketik.** Sebelum G3-09 jalur restore memakai `confirm()`
 *    bawaan peramban; jalur reset memakai `prompt('Ketik "RESET"')`. Keduanya
 *    diganti dialog internal, dan syarat kata yang diketik dikembalikan ke kode
 *    lewat fungsi murni di sini supaya bisa dites tanpa DOM.
 * 3. **Ringkasan sasaran pemulihan.** Sebelum menimpa data, tutor harus melihat
 *    apa yang akan ditimpa (jumlah murid + sesi + kapan backup dibuat) dan apa
 *    yang akan hilang (isi perangkat sekarang).
 *
 * Modul ini **tidak menyentuh** IndexedDB, React, maupun DOM.
 */

import type { ImportProgressStep } from "./backup";

/**
 * Kalimat tahap restore untuk SEMUA jalur (berkas, Drive, verifikasi, reset).
 *
 * `ImportProgressStep` berasal dari `lib/backup.ts` yang dibekukan; penambahan
 * kunci di sana akan membuat `Record` ini tidak lengkap dan `tsc` menolaknya —
 * itu memang tujuannya.
 */
export const RECOVERY_STEP_LABEL: Record<ImportProgressStep, string> = {
  "decrypt": "Mendekripsi backup (memakai Kata Sandi Enkripsi)...",
  "decode-media": "Membaca & menyiapkan foto/tanda tangan...",
  "validate": "Memeriksa keutuhan data...",
  "pre-restore-backup": "Membuat cadangan data lama (pre-restore)...",
  "write": "Menulis data ke perangkat...",
};

/** Kata yang wajib diketik tutor sebelum data apa pun ditimpa/dihapus. */
export const RESTORE_CONFIRM_WORD = "PULIHKAN";
export const RESET_CONFIRM_WORD = "HAPUS DATA";

/**
 * Empat tombol yang memakai satu keadaan sibuk bersama (G3-09 butir 5).
 *
 * Sebelum G3-09 tiap tombol punya `busy`-nya sendiri-sendiri, sehingga tutor bisa
 * menekan tombol kedua sementara yang pertama masih berjalan — dua penulisan ke
 * tabel yang sama.
 */
export type RecoveryAction =
  | "restoreFile"
  | "restoreDrive"
  | "backupFile"
  | "backupDrive"
  /** Membaca berkas backup tanpa menulis apa pun ("Cek berkas ini bisa dibuka"). */
  | "verifyBackup";

/** Label keadaan sibuk per tombol; `null` = tombol ini yang sedang berjalan. */
export interface RecoveryBusyState {
  /** Ada satu jalur pemulihan/backup yang sedang berjalan. */
  busy: boolean;
  /** Jalur yang sedang berjalan, atau `null`. */
  running: RecoveryAction | null;
  /** Tombol lain harus nonaktif selama satu jalur berjalan. */
  othersDisabled: boolean;
  /** Kalimat tahap yang ditampilkan (kosong saat tidak ada yang berjalan). */
  stepLabel: string;
}

/**
 * Satu keadaan sibuk untuk empat tombol.
 *
 * `step` hanya boleh diisi saat benar-benar ada jalur berjalan: menampilkan
 * "Mendekripsi backup..." sementara tidak ada proses apa pun membuat tutor
 * menunggu sesuatu yang tidak terjadi.
 */
export function recoveryBusyState(
  running: RecoveryAction | null,
  step: ImportProgressStep | null,
): RecoveryBusyState {
  if (!running) {
    return { busy: false, running: null, othersDisabled: false, stepLabel: "" };
  }
  return {
    busy: true,
    running,
    othersDisabled: true,
    stepLabel: step ? RECOVERY_STEP_LABEL[step] : "Menyiapkan...",
  };
}

/** Apakah sebuah tombol boleh ditekan: tidak ada jalur berjalan, atau ia jalurnya sendiri. */
export function recoveryButtonEnabled(
  state: RecoveryBusyState,
  action: RecoveryAction,
): boolean {
  return !state.busy || state.running === action;
}

/** Ringkasan apa yang akan DITIMPA di perangkat (dari `inspectBackup`). */
export interface RecoveryTarget {
  students: number;
  sessions: number;
  /** ISO string waktu backup dibuat; `undefined` = berkas tidak menyebutkannya. */
  createdAt?: string | null;
  /** Ukuran berkas backup dalam byte; `undefined` = tidak diketahui (mis. dari Drive). */
  sizeBytes?: number;
  /** Nama berkas yang dipilih tutor; `undefined` = dari Drive. */
  fileName?: string;
}

/** Baris siap-tampil: `label` pendek, `nilai` sudah berbentuk teks Indonesia. */
export interface RecoverySummaryRow {
  label: string;
  value: string;
}

/**
 * Ringkasan sasaran pemulihan (G3-09 butir 7) — dipakai dialog konfirmasi restore.
 *
 * Jumlah murid dan sesi **wajib** muncul supaya tutor tahu backup mana yang ia
 * pegang; tanggal ditulis lengkap dengan waktu lokal, bukan ISO mentah. Ukuran
 * berkas hanya muncul kalau memang diketahui, dan nama berkas hanya muncul untuk
 * jalur berkas — mengarang "dari Drive" pada jalur berkas akan menyesatkan.
 */
export function recoveryTargetSummary(target: RecoveryTarget): RecoverySummaryRow[] {
  const rows: RecoverySummaryRow[] = [
    { label: "Murid di backup", value: `${target.students.toLocaleString("id-ID")} murid` },
    { label: "Sesi di backup", value: `${target.sessions.toLocaleString("id-ID")} sesi` },
  ];
  rows.push({
    label: "Backup dibuat",
    value: target.createdAt
      ? new Date(target.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })
      : "tanggal tidak tercatat di berkas",
  });
  if (target.sizeBytes !== undefined) {
    rows.push({ label: "Ukuran berkas", value: formatBytes(target.sizeBytes) });
  }
  if (target.fileName) {
    rows.push({ label: "Berkas", value: target.fileName });
  }
  return rows;
}

/** Ukuran berkas dalam satuan yang dibaca tutor (KB mulai 1024 B, MB mulai 1024 KB). */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "tidak diketahui";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Apakah kata konfirmasi yang diketik tutor sudah tepat.
 *
 * Dibandingkan setelah `trim()` dan tanpa peduli besar-kecil huruf: tutor mengetik
 * di papan ketik HP, dan menolak "hapus data" hanya karena huruf besar akan membuat
 * jalur reset yang memang disengaja jadi mustahil dijalankan. Yang dijaga bukan
 * ketepatan huruf melainkan **tidak sengaja** — itu gunanya mengetik kalimat panjang.
 */
export function confirmWordMatches(input: string, expected: string): boolean {
  return input.trim().toUpperCase() === expected.trim().toUpperCase();
}

/**
 * Apakah tombol konfirmasi boleh aktif saat kata yang diketik belum tepat.
 *
 * Dipisah dari `confirmWordMatches` supaya tombol nonaktif dan pesan galat bisa
 * memakai satu sumber kebenaran yang sama.
 */
export function confirmButtonEnabled(input: string, expected: string): boolean {
  return confirmWordMatches(input, expected);
}
