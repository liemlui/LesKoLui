/**
 * Aturan aksi "Kelola sesi" (G3-01 L4 — `TASK-06` Langkah 4).
 *
 * **Apa yang tinggal di sini.** Satu sheet menggantikan **dua modal lama** (satu
 * untuk mengubah jadwal, satu untuk mengelola sesi terlewat). Tabel "aksi menurut
 * konteks" adalah inti kontraknya, jadi ia ditulis sebagai fungsi murni — bukan
 * sebagai rangkaian `{kontek === "…" && <button/>}` di dalam komponen.
 *
 * **Kenapa fungsi murni.** Toolchain ini belum punya React Testing Library
 * (lihat catatan yang sama di `captureSession/helpers.ts` dan `undoDeletion.ts`),
 * jadi aturan yang bisa diuji HARUS berada di luar komponen. Yang diuji di sini:
 * aksi mana yang muncul, mana yang jadi **aksi utama**, mana yang masuk `⋯`, dan
 * aksi mana yang butuh kolom isian.
 *
 * **Yang TIDAK ada di sini.** Tidak ada nama fungsi repo, tidak ada angka uang,
 * tidak ada aturan tagihan. Aksi `Tidak hadir` tetap memakai `noShowBillable`
 * apa adanya (`sessionRepo.markSessionNoShow`) — L4 adalah perubahan bentuk
 * tampilan, bukan perubahan perilaku tagihan.
 */

/** Konteks sesi: sudah lewat tanpa hasil (`terlewat`) atau masih terjadwal. */
export type SesiKontek = "terjadwal" | "terlewat";

/** Enam aksi yang harus tetap bisa dijalankan sesudah dua modal lama dilebur. */
export type SesiAksi =
  | "catat"
  | "batal-les"
  | "tidak-hadir"
  | "simpan-perubahan"
  | "jadwalkan-ulang"
  | "batalkan-sesi"
  | "hapus";

/**
 * Satu aksi beserta sifatnya.
 *
 * `label` adalah teks tombol — sengaja disimpan bersama aturannya supaya E2E dan
 * komponen membaca teks yang sama (pola yang sudah dipakai untuk kata kunci
 * kegagalan di `captureSession/helpers.ts`).
 */
export interface AksiSesi {
  id: SesiAksi;
  label: string;
  /** `true` = tombol lebar penuh di badan sheet; `false` = baris di dalam `⋯`. */
  utama: boolean;
  /** Aksi ini mengubah/menghapus sesi — diberi gaya bahaya, bukan gaya merek. */
  merusak: boolean;
  /** Butuh kolom isian (tanggal/jam/durasi atau kebijakan tagihan) sebelum bisa disimpan. */
  butuhIsian: boolean;
  /**
   * Muncul dengan pilihan cakupan seri ("Sesi ini saja" / "Ini & berikutnya" /
   * "Semua seri"), karena `cancelSeriesSessions`/`updateSeriesSessions` menolak
   * diam-diam kalau mode-nya tidak dipilih untuk sesi ber-`seriesId`.
   */
  butuhCakupanSeri: boolean;
}

/**
 * Aksi yang **sedang dipilih** di sheet, atau `null` saat sheet baru terbuka.
 *
 * Dipakai berkas aturan bentuk (`manageSessionForm.ts`) dan komponennya; ditulis
 * di sini supaya keduanya tidak perlu mengulang `SesiAksi | null`.
 */
export type AksiSesiId = SesiAksi | null;

/** Rincian teknis per aksi; tabel konteks di bawah hanya menyusun ulang daftar ini. */
const AKSI: Record<SesiAksi, Omit<AksiSesi, "utama">> = {
  "catat": {
    id: "catat",
    label: "Catat",
    merusak: false,
    butuhIsian: false,
    butuhCakupanSeri: false,
  },
  "batal-les": {
    id: "batal-les",
    label: "Batal les",
    merusak: true,
    butuhIsian: true,
    butuhCakupanSeri: true,
  },
  "tidak-hadir": {
    id: "tidak-hadir",
    label: "Tidak hadir",
    merusak: true,
    butuhIsian: true,
    butuhCakupanSeri: false,
  },
  "simpan-perubahan": {
    id: "simpan-perubahan",
    label: "Simpan perubahan",
    merusak: false,
    butuhIsian: true,
    butuhCakupanSeri: true,
  },
  "jadwalkan-ulang": {
    id: "jadwalkan-ulang",
    label: "Jadwalkan ulang",
    merusak: false,
    butuhIsian: true,
    butuhCakupanSeri: false,
  },
  "batalkan-sesi": {
    id: "batalkan-sesi",
    label: "Batalkan sesi",
    merusak: true,
    butuhIsian: true,
    butuhCakupanSeri: true,
  },
  "hapus": {
    id: "hapus",
    label: "Hapus",
    merusak: true,
    butuhIsian: false,
    butuhCakupanSeri: false,
  },
};

/**
 * Tabel keputusan — `TASK-06` §3 Langkah 4.
 *
 * | Konteks | Aksi utama | Aksi di `⋯` |
 * |---|---|---|
 * | `terlewat` | `Catat` · `Batal les` · `Tidak hadir` | `Jadwalkan ulang` · `Hapus` |
 * | `terjadwal` | `Simpan perubahan` | `Batalkan sesi` · `Hapus` |
 *
 * Catatan yang mengikat:
 * - **`Jadwalkan ulang` tetap ada**, hanya tidak lagi berebut perhatian. Ia
 *   memang **hanya** untuk konteks `terlewat`: jadwal pengganti dibuat dari sesi
 *   yang sudah lewat. Modal lama menawarkannya di konteks itu saja.
 * - **`Hapus` berlaku di kedua konteks** (`sessionRepo.deleteSession` sudah ada
 *   dengan penjagaan tagihan paket sendiri; jangan menulis repo baru).
 * - Urutan tidak bebas: aksi utama disusun menurut kegentingannya di konteks itu.
 */
const TABEL: Record<SesiKontek, { utama: SesiAksi[]; lainnya: SesiAksi[] }> = {
  "terlewat": {
    utama: ["catat", "batal-les", "tidak-hadir"],
    lainnya: ["jadwalkan-ulang", "hapus"],
  },
  "terjadwal": {
    utama: ["simpan-perubahan"],
    lainnya: ["batalkan-sesi", "hapus"],
  },
};

/** Sesi berulang: pilihan cakupan hanya relevan kalau ada `seriesId`. */
export interface KonteksSesi {
  kontek: SesiKontek;
  /**
   * `true` bila sesi ini bagian dari seri berulang (punya `seriesId`).
   * Berdefault `false` dengan sengaja: pemanggil yang lupa mengisinya akan
   * menyembunyikan pilihan cakupan — salah yang **aman**. Kalau defaultnya
   * `true`, sesi tunggal akan menampilkan pilihan seri yang tidak berlaku
   * (`cancelSeriesSessions`/`updateSeriesSessions` jatuh ke mode "this" saja).
   */
  berseri?: boolean;
}

/** Satu aksi utama, urut sesuai tabel. */
export function aksiUtama({ kontek, berseri = false }: KonteksSesi): AksiSesi[] {
  return TABEL[kontek].utama.map((id) => ({
    ...AKSI[id],
    utama: true,
    // Sesi tanpa seri tidak punya cakupan untuk dipilih: mode "this" satu-satunya
    // yang sah, dan itulah yang dikirim komponen.
    butuhCakupanSeri: AKSI[id].butuhCakupanSeri && berseri,
  }));
}

/**
 * Satu baris `⋯`. Dipisah dari `aksiUtama` supaya komponen tidak perlu tahu
 * tabelnya — dan supaya tes bisa menyatakan "tidak ada aksi yang muncul dua kali".
 */
export function aksiLainnya({ kontek, berseri = false }: KonteksSesi): AksiSesi[] {
  return TABEL[kontek].lainnya.map((id) => ({
    ...AKSI[id],
    utama: false,
    butuhCakupanSeri: AKSI[id].butuhCakupanSeri && berseri,
  }));
}

/**
 * Seluruh aksi yang bisa dijalankan di konteks ini — dipakai untuk menghitung
 * "enam aksi bisa dijalankan: N dari 6" di `TASK-06` §9.2 tanpa membaca komponen.
 */
export function aksiSesi(konteks: KonteksSesi): AksiSesi[] {
  return [...aksiUtama(konteks), ...aksiLainnya(konteks)];
}

/**
 * Aksi mana yang sedang terbuka. Sheet hanya menampilkan kolom isian milik aksi
 * yang dipilih, jadi keadaan ini harus bisa dinyatakan sebagai data — kalau
 * tersembunyi di dalam komponen, tidak ada yang bisa menguji "Tidak hadir"
 * benar-benar menyertakan pilihan kebijakan tagihan.
 */
export function aksiTerbuka(konteks: KonteksSesi, id: SesiAksi | null): AksiSesi | null {
  if (!id) return null;
  return aksiSesi(konteks).find((a) => a.id === id) ?? null;
}
