/**
 * Aturan murni panel desain laporan (G3-08 langkah 3).
 *
 * Dipisah dari komponen supaya bisa diuji tanpa DOM — pola yang sama dipakai
 * `reportAvailability.ts`, `aiFieldMarks.ts`, dan `financeRows.ts`.
 *
 * Dua hal yang diatur di sini:
 *
 * 1. **Pengelompokan susunan menurut panjang narasi yang didukung.** Sebelumnya
 *    dua puluh enam susunan ditawarkan sekaligus tanpa pembeda, sehingga
 *    pemilihan menjadi beban. Kelompoknya diambil dari metadata yang SUDAH ada
 *    (`supportsLongNarrative` + `recommendedPhotoCount`), bukan dari daftar
 *    karangan — kalau metadata susunan berubah, kelompoknya ikut berubah.
 *
 * 2. **Hitungan susunan dan tema.** Angka ini tidak diketik di dokumen dan tidak
 *    diketik ulang di komponen: keduanya diturunkan dari sumbernya. Butir G3-08
 *    melarang jumlahnya berkurang, jadi yang dijaga adalah turunannya.
 */

import type { Layout, LayoutCategory, Theme } from "../../template/types";

/** Susunan yang didukung laporan ini (termasuk `cover`, yang bukan susunan halaman biasa). */
export const SEMUA_SUSUNAN = (layouts: readonly Layout[]): readonly Layout[] => layouts;

/** Jumlah susunan yang ditawarkan. Diturunkan, bukan diketik. */
export function hitungSusunan(layouts: readonly Layout[]): number {
  return layouts.length;
}

/**
 * Jumlah tema bawaan. Tema kustom milik tutor ditambahkan pemanggil dan tidak
 * dihitung di sini — yang dijaga butir G3-08 adalah jumlah tema bawaan.
 */
export function hitungTema(themes: readonly Theme[]): number {
  return themes.length;
}

/** Kunci kelompok. Dipakai sebagai id DOM, jadi harus stabil dan tanpa spasi. */
export type KelompokSusunanKey = "narasi-panjang" | "foto" | "ringkas";

export interface KelompokSusunan {
  key: KelompokSusunanKey;
  /** Judul yang dibaca tutor. */
  judul: string;
  /** Satu baris penjelas: susunan ini cocok untuk apa. */
  keterangan: string;
  susunan: readonly Layout[];
}

/**
 * Kelompokkan susunan menurut panjang narasi dan kebutuhan foto.
 *
 * Urutannya sengaja dari yang paling sering dipakai tutor: laporan dengan narasi
 * panjang lebih dulu, lalu yang butuh foto, lalu yang ringkas. Setiap susunan
 * masuk TEPAT satu kelompok supaya tidak ada yang bisa hilang dari daftar:
 * syarat dipenuhi berurutan dan yang terakhir menampung sisanya.
 */
export function kelompokkanSusunan(layouts: readonly Layout[]): KelompokSusunan[] {
  const panjang: Layout[] = [];
  const foto: Layout[] = [];
  const ringkas: Layout[] = [];

  for (const layout of layouts) {
    if (layout.supportsLongNarrative) panjang.push(layout);
    else if ((layout.recommendedPhotoCount?.max ?? 0) >= 4) foto.push(layout);
    else ringkas.push(layout);
  }

  return [
    {
      key: "narasi-panjang",
      judul: "Narasi panjang",
      keterangan: "Tahan catatan sesi yang panjang tanpa memotong cerita.",
      susunan: panjang,
    },
    {
      key: "foto",
      judul: "Banyak foto",
      keterangan: "Untuk laporan yang mengandalkan foto sesi.",
      susunan: foto,
    },
    {
      key: "ringkas",
      judul: "Ringkas",
      keterangan: "Satu halaman padat untuk orang tua yang membaca cepat.",
      susunan: ringkas,
    },
  ];
}

/** Jumlah susunan yang benar-benar ditampilkan di seluruh kelompok (untuk penjaga tes). */
export function jumlahSusunanTerkelompok(groups: readonly KelompokSusunan[]): number {
  return groups.reduce((total, group) => total + group.susunan.length, 0);
}

/**
 * Nama kelompok untuk sebuah susunan. `undefined` bila susunannya tidak ada di
 * daftar mana pun — pemanggil wajib menanganinya, jangan menebak.
 */
export function kelompokSusunan(
  groups: readonly KelompokSusunan[],
  layoutId: string,
): KelompokSusunan | undefined {
  return groups.find((group) => group.susunan.some((layout) => layout.id === layoutId));
}

/**
 * Label kategori galeri dalam bahasa Indonesia. Dipakai keterangan tambahan pada
 * susunan terpilih. Kategori yang tidak dikenal dikembalikan apa adanya supaya
 * metadata baru tidak hilang diam-diam dari antarmuka.
 */
const LABEL_KATEGORI: Record<LayoutCategory, string> = {
  classic: "klasik",
  visual: "visual",
  analytic: "analitis",
  modern: "modern",
  formal: "formal",
  playful: "ceria",
};

export function labelKategori(kategori: LayoutCategory): string {
  return LABEL_KATEGORI[kategori] ?? kategori;
}

/** Satu baris ringkas untuk susunan terpilih: kelompok · kategori · saran foto. */
export function ringkasSusunan(layout: Layout): string {
  const bagian: string[] = [];
  const kategori = layout.categories?.map(labelKategori) ?? [];
  if (kategori.length > 0) bagian.push(kategori.join("/"));

  const max = layout.recommendedPhotoCount?.max;
  if (max != null) bagian.push(max === 0 ? "tanpa foto" : `maksimal ${max} foto`);
  else if (layout.recommendedPhotoCount?.min != null) bagian.push(`minimal ${layout.recommendedPhotoCount.min} foto`);

  return bagian.join(" · ");
}
