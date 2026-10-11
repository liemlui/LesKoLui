/**
 * Keadaan bilah simpan Pengaturan — G3-09 butir 1 dan 2.
 *
 * Sebelum G3-09 tombol Simpan adalah tombol biasa di ujung bawah halaman ~1.400
 * baris: tutor harus menggulir ke dasar untuk menyimpan, dan setelah tersimpan
 * tidak ada satu pun tanda **kapan** penyimpanan itu terjadi. Dua hal yang
 * diperbaiki modul ini:
 *
 * 1. **Bilah menempel** di bawah, jadi tombolnya selalu terjangkau.
 * 2. **Status berwaktu**: "Belum disimpan" → "Menyimpan..." →
 *    "Tersimpan 14:03". Waktunya berasal dari `savedAt`, bukan dari render,
 *    supaya tidak ikut berubah setiap kali layar digambar ulang.
 *
 * Modul ini murni (tanpa React) supaya bisa dites tanpa DOM — repo ini tidak
 * memasang jsdom.
 */

export type SimpanStatus = "kotor" | "menyimpan" | "tersimpan" | "gagal";

export interface SaveBarInput {
  /** Ada perubahan yang belum ditulis. */
  dirty: boolean;
  /** Penulisan sedang berjalan. */
  saving: boolean;
  /** Waktu penyimpanan terakhir berhasil (ISO); `undefined` = belum pernah. */
  savedAt?: string | null;
  /** Pesan kegagalan penyimpanan terakhir; ada isinya berarti gagal. */
  errorMessage?: string | null;
}

export interface SaveBarState {
  status: SimpanStatus;
  /** Teks utama tombol. */
  label: string;
  /** Kalimat status di sebelah tombol; alasan tombol nonaktif ada di sini. */
  detail: string;
  /** Tombol boleh ditekan. */
  enabled: boolean;
  /** Untuk pembaca layar: peran `status` hidup hanya saat ada kabar baru. */
  live: boolean;
}

/** Jam:menit lokal dari ISO; `null` bila tanggalnya tidak bisa dibaca. */
export function jamTersimpan(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Urutan pemeriksaan penting dan mengikat: **gagal → menyimpan → kotor →
 * tersimpan**. Kalau "tersimpan" diperiksa lebih dulu, pesan kegagalan tidak
 * akan pernah terlihat setelah ada satu penyimpanan yang berhasil sebelumnya.
 */
export function saveBarState(input: SaveBarInput): SaveBarState {
  const jam = jamTersimpan(input.savedAt);

  if (input.saving) {
    return { status: "menyimpan", label: "Menyimpan...", detail: "Sedang menulis pengaturan ke perangkat.", enabled: false, live: true };
  }
  if (input.errorMessage) {
    return {
      status: "gagal",
      label: "Coba simpan lagi",
      detail: input.errorMessage,
      // Tetap bisa ditekan: tutor harus punya jalan keluar setelah kegagalan.
      enabled: true,
      live: true,
    };
  }
  if (input.dirty) {
    return {
      status: "kotor",
      label: "Simpan Pengaturan",
      detail: "Ada perubahan yang belum disimpan. Meninggalkan halaman ini akan memunculkan peringatan.",
      enabled: true,
      live: false,
    };
  }
  return {
    status: "tersimpan",
    label: "Tersimpan",
    detail: jam ? `Tersimpan ${jam}` : "Belum ada perubahan.",
    enabled: false,
    live: false,
  };
}

/**
 * Apakah perubahan yang belum disimpan harus ditahan (G3-09 butir 2).
 *
 * Dipisah dari komponennya supaya bisa dites: penjaga yang salah menahan tutor
 * saat tidak ada perubahan sama menjengkelkan dengan penjaga yang tidak menahan
 * apa pun. Hanya `dirty` yang menahan — sedang menyimpan pun tidak, karena
 * menyimpan berarti perubahan itu justru sedang diamankan.
 */
export function harusDitahan(dirty: boolean, saving: boolean): boolean {
  return dirty && !saving;
}

/** Kalimat peringatan saat meninggalkan halaman; satu tempat untuk semua jalur. */
export const PESAN_TINGGALKAN_HALAMAN =
  "Ada perubahan pengaturan yang belum disimpan. Kalau keluar sekarang, perubahan itu hilang.";

/**
 * Apakah peramban perlu dimintai konfirmasi `beforeunload`.
 *
 * `beforeunload` hanya berguna untuk navigasi yang meninggalkan dokumen
 * (muat ulang, tutup tab, ketik alamat lain). Navigasi di dalam aplikasi
 * ditangani dialog internal, bukan peramban — dan memakai `beforeunload` untuk
 * keduanya akan memunculkan dialog peramban yang tidak bisa diberi penjelasan.
 */
export function perluBeforeUnload(dirty: boolean, saving: boolean): boolean {
  return harusDitahan(dirty, saving);
}
