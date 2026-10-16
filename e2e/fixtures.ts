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

/**
 * Pilih murid pertama yang **periodenya benar-benar bisa direkap**, lalu tunggu
 * sinyal siapnya — menggantikan pola "coba tiap murid dengan batas 2,5 detik".
 *
 * **Kenapa pola lama itu rapuh, dan bukan sekadar kurang waktu.** Tombol
 * "Buat Laporan" memang **mati menurut desain** bila periode tidak bisa direkap
 * (mis. laporan periodenya sudah final), sehingga menaikkan batas waktunya hanya
 * memperlambat kegagalan tanpa membedakan "belum siap" dari "memang tidak bisa".
 * Terukur 2026-10-15: pada seed dev, **6 dari 7 murid punya sesi Juni** — jadi
 * loop itu sebenarnya tidak perlu menebak sama sekali; yang dibutuhkan adalah
 * menunggu **satu** sinyal, bukan dua puluh lima percobaan 2,5 detik yang
 * menumpuk.
 *
 * Cara kerjanya: untuk setiap murid, periksa dulu apakah **alasan tombol mati**
 * tertulis di layar. Kalau ada, periode itu memang tidak bisa direkap → lanjut ke
 * murid berikutnya **tanpa menunggu**. Kalau tidak ada, murid itulah yang dipakai,
 * dan tombolnya ditunggu dengan batas longgar. Mengembalikan `false` bila tidak ada
 * satu murid pun yang bisa direkap.
 */
export async function pilihMuridYangBisaDirekap(
  page: Page,
  opsi: { timeoutSiapMs?: number } = {},
): Promise<boolean> {
  const timeoutSiapMs = opsi.timeoutSiapMs ?? 30_000;
  const select = page.locator("select").first();
  const nilai = await select.locator("option").evaluateAll(
    (opts) => (opts as HTMLOptionElement[]).map((o) => o.value).filter(Boolean),
  );
  const tombol = page.getByRole("button", { name: /Buat Laporan|Update Laporan/ });

  if (nilai.length === 0) {
    console.log("[pilihMurid] TIDAK ADA opsi murid sama sekali — layar Laporan belum siap.");
    return false;
  }

  const jejak: string[] = [];
  for (const value of nilai) {
    await select.selectOption(value);
    const adaAlasan = await page
      .getByText(/Tombol laporan mati:/)
      .first()
      .isVisible({ timeout: 500 })
      .catch(() => false);
    if (adaAlasan) { jejak.push(`${value.slice(0, 6)}=ada-alasan`); continue; }
    const siap = await tombol
      .first()
      .isEnabled({ timeout: timeoutSiapMs })
      .catch(() => false);
    if (siap) return true;
    const label = await tombol.first().innerText().catch(() => "?");
    const teksLayar = await page
      .getByText(/Tombol laporan mati:|belum punya sesi|sudah pernah direkap/i)
      .first()
      .innerText()
      .catch(() => "(tak ada pesan alasan)");
    jejak.push(`${value.slice(0, 6)}="${label}" mati: ${teksLayar.slice(0, 70)}`);
  }
  console.log(`[pilihMurid] tidak ada yang bisa direkap dari ${nilai.length} murid:\n  ` + jejak.join("\n  "));
  return false;
}

/**
 * Pilih murid yang periodenya **pasti bisa direkap** — ditentukan dari **data**,
 * bukan dari batas waktu UI.
 *
 * **Kenapa pendekatan ini yang dipakai, setelah tiga percobaan lain gagal.**
 * Semua versi sebelumnya memilih murid dengan mencoba opsi di layar lalu menunggu
 * tombol "Buat Laporan" aktif selama N detik (2,5 → 5 → 30 detik). Ketiganya gagal
 * di bawah beban suite penuh, dan gagalnya **berbeda-beda** — tanda yang jelas
 * bahwa yang diukur bukan kesiapan, melainkan waktu. Menaikkan N tidak pernah
 * menyelesaikannya, karena tombol yang mati juga berarti "periode ini memang tidak
 * bisa direkap" (mis. laporannya sudah final), sehingga kedua keadaan itu tidak
 * bisa dibedakan lewat lamanya menunggu.
 *
 * Di sini pertanyaannya dijawab langsung ke data: cari murid yang **punya sesi
 * selesai di bulan itu** DAN **belum punya laporan** untuk periode itu. Itu syarat
 * yang sama dengan yang dipakai aplikasi untuk mengaktifkan tombolnya, dibaca dari
 * sumber yang sama (`sessions`/`reports`), sehingga tidak ada tebakan.
 *
 * Mengembalikan `id` murid, atau `null` bila tidak ada kandidat (mis. laporan
 * semua murid sudah final) — pemanggil yang memutuskan apakah itu kegagalan.
 */
export async function muridYangBisaDirekap(page: Page, bulan: string): Promise<string | null> {
  return page.evaluate(async (bln: string) => {
    const buka = await new Promise<IDBDatabase | null>((resolve) => {
      const req = indexedDB.open("jurnalles");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
    if (!buka) return null;
    const baca = <T,>(tabel: string): Promise<T[]> => new Promise((resolve) => {
      const tx = buka.transaction(tabel, "readonly");
      const all = tx.objectStore(tabel).getAll();
      all.onsuccess = () => resolve(all.result as T[]);
      all.onerror = () => resolve([]);
    });
    const murid = await baca<{ id: string; name: string }>("students");
    const sesi = await baca<{ studentId: string; date: string; status: string }>("sessions");
    const laporan = await baca<{ studentId: string; month: string }>("reports");
    buka.close();
    const punyaSesi = new Set(
      sesi.filter((s) => s.date.startsWith(bln) && s.status === "DONE").map((s) => s.studentId),
    );
    const sudahAda = new Set(laporan.filter((l) => l.month === bln).map((l) => l.studentId));
    const kandidat = murid.find((m) => punyaSesi.has(m.id) && !sudahAda.has(m.id));
    return kandidat?.id ?? null;
  }, bulan);
}

export { expect };
export type { Page };
