import { test as base, expect, type Page } from "@playwright/test";

/**
 * Fixture bersama untuk seluruh spec `e2e/` — **isolasi data per tes**.
 *
 * ## Cacat yang ditutup, dan buktinya
 *
 * Seluruh berkas spec memakai **database peramban yang sama** dalam satu run.
 * Akibatnya keadaan data bocor antar-tes dan antar-berkas: laporan yang
 * difinalkan satu tes membuat tes berikutnya tidak menemukan satu pun murid yang
 * bisa direkap, dan tombol "Buat Laporan" **mati menurut desain** — gejalanya
 * terbaca seperti kerusakan produk padahal bukan.
 *
 * Terukur 2026-10-15, dan urutan pembuktiannya penting karena dua hipotesis lebih
 * dulu salah:
 * 1. "flake beban-tinggi" (dugaan yang tercatat di `playwright.config.ts`) —
 *    **dibuang**: membatasi `workers` ke 2 hanya mengurangi 8 → 6 kegagalan.
 * 2. "cacat produk" — **dibuang**: `report-export` lulus 2/2 saat dijalankan
 *    sendirian, dan lulus lagi setelah berkas dijalankan dengan profil bersih.
 * 3. "data bocor antar-tes" — **terbukti**: tes **kedua** dalam satu berkas gagal,
 *    dengan tes pertama berkas itu yang memfinalkan laporan.
 *
 * ## Kesalahan yang hampir terjadi pada fixture ini, dan cara menghindarinya
 *
 * Versi pertama menghapus database dari `about:blank`. Itu **tidak bekerja**, dan
 * gagalnya **senyap** karena galatnya ditelan `try/catch`: `about:blank`
 * ber-origin buram, sehingga IndexedDB ditolak —
 * *"Access to the IndexedDB API is denied in this context"*. Terbukti lewat probe:
 * database `jurnalles` tetap ada sesudah "penghapusan".
 *
 * Karena itu penghapusan sekarang dilakukan lewat **`addInitScript`**, yang
 * berjalan **di origin aplikasi dan sebelum kode aplikasi mana pun** — termasuk
 * sebelum auto-seed dev. Tidak ada navigasi ke `about:blank`, tidak ada galat yang
 * perlu ditelan, dan tidak ada perlombaan dengan seeder.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript((nama: string) => {
      /**
       * Dipanggil pada SETIAP navigasi, sebelum skrip halaman berjalan.
       *
       * Penghapusan hanya perlu sekali per tes; sisanya adalah navigasi di dalam
       * aplikasi yang tidak boleh menghapus data yang sedang diuji. Penandanya
       * disimpan di `sessionStorage` — ikut terhapus bersama localStorage pada
       * pembersihan pertama, sehingga tes berikutnya tetap mendapat pembersihan.
       */
      try {
        if (sessionStorage.getItem("__e2e_db_bersih") === "1") return;
        sessionStorage.setItem("__e2e_db_bersih", "1");
        localStorage.clear();
        indexedDB.deleteDatabase(nama);
        /**
         * Tandai Catatan perubahan sudah dilihat.
         *
         * Tanpa ini, pembersihan localStorage membuat modal itu **muncul di setiap
         * tes**, dan helper `closeChangelog` di beberapa spec memeriksa
         * keberadaannya sekali dengan batas waktu pendek lalu menyerah — sehingga
         * tes gagal pada klik yang "element is not visible" (terukur di
         * `billing-session-count.runtime.spec.ts`). Nilai versinya sengaja jauh di
         * belakang supaya jendela itu tidak pernah muncul, sama seperti yang sudah
         * dilakukan `e2e-pwa/pwa-runtime.spec.ts`.
         */
        localStorage.setItem("leskolui-last-seen-version", "v1.41.0");
      } catch {
        // Konteks tanpa storage (mis. halaman error): tidak ada yang bisa dibersihkan.
      }
    }, NAMA_DB);
    // `use` di sini milik Playwright (fixture), bukan hook React — aturan
    // `react-hooks` salah mengenalinya karena namanya sama.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(page);
  },
});

/** Nama database aplikasi (`src/db/db.ts` → `super("jurnalles")`). */
export const NAMA_DB = "jurnalles";

/**
 * Tunggu sinyal **eksplisit** bahwa seed dev selesai.
 *
 * Dipakai spec yang membutuhkan data contoh. Mengembalikan `false` bila sinyalnya
 * tidak datang dalam batas waktu — pemanggil yang memutuskan apakah itu kegagalan.
 * Sinyalnya adalah pesan konsol `seedDummy`, bukan "datanya kelihatan sudah ada":
 * seeder menulis bertahap, sehingga "murid pertama sudah ada" jauh lebih awal
 * daripada "seluruh sesi sudah ada".
 */
export async function tungguSeedSelesai(page: Page, timeoutMs = 60_000): Promise<boolean> {
  return page
    .waitForEvent("console", {
      predicate: (m) => /berhasil dimasukkan|seed dilewati/.test(m.text()),
      timeout: timeoutMs,
    })
    .then(() => true)
    .catch(() => false);
}

/**
 * Muat aplikasi dengan data contoh yang **dijamin bersih**, lalu tunggu seednya.
 *
 * Menggantikan pola lama "buka `/`, tunggu 4 detik, panggil `seedDummy()`" yang
 * bergantung pada waktu dan pada keadaan run sebelumnya.
 */
export async function bukaDenganDataBersih(page: Page, timeoutMs = 60_000): Promise<boolean> {
  const sinyal = tungguSeedSelesai(page, timeoutMs);
  await page.goto("/");
  return sinyal;
}

export { expect };
export type { Page };
