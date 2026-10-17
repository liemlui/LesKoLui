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
    /**
     * **Dua skrip terpisah, dan urutannya disengaja.**
     *
     * (a) Jejak keputusan layar Laporan dipasang pada **setiap** navigasi, di luar
     *     blok pembersihan — sebab `window` dibuat ulang tiap navigasi sementara
     *     pembersihan storage hanya sekali per tes. Jejak ini yang membuat
     *     kegagalan "tombol Buat Laporan mati" bisa dibedakan antara **belum
     *     siap** dan **memang tidak bisa direkap** (lihat `sintesisJejakLaporan`).
     * (b) Pembersihan database, sekali per tes, ditandai di `sessionStorage`.
     *
     * Keduanya tidak digabung supaya `return` di dalam blok pembersihan tidak
     * ikut melewati pemasangan jejak — kesalahan yang hampir terjadi pada versi
     * pertama penulisan ini.
     */
    await page.addInitScript(() => {
      (window as unknown as { __lklTraceReport?: boolean }).__lklTraceReport = true;
    });
    await page.addInitScript((nama: string) => {
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

/** Pesan konsol yang menandakan seeder DEV sudah berhenti bekerja. */
export const SEED_SELESAI = /Data dummy berhasil dimasukkan|seed dilewati/;

/**
 * Rekam seluruh pesan konsol halaman ke satu larik, untuk diagnostik.
 *
 * Dipakai agar kegagalan seed menyebut **apa yang terakhir dikatakan halaman**,
 * bukan hanya "tidak selesai dalam N detik". Tanpa itu, kegagalan seed di suite
 * penuh tidak bisa dibedakan antara "halaman belum jalan" dan "seeder melempar
 * galat di tengah jalan".
 */
export function rekamKonsol(page: Page): string[] {
  const pesan: string[] = [];
  page.on("console", (m) => pesan.push(m.text()));
  page.on("pageerror", (e) => pesan.push(`[pageerror] ${String(e)}`));
  return pesan;
}

/** Sepuluh pesan terakhir sebagai satu baris — bagian dari pesan kegagalan seed. */
export function ringkasKonsol(pesan: string[], n = 10): string {
  if (pesan.length === 0) return "(halaman tidak menulis satu pun pesan konsol)";
  return pesan.slice(-n).map((t) => t.replace(/\s+/g, " ").slice(0, 160)).join(" ⏐ ");
}

/**
 * Tunggu sinyal **eksplisit** bahwa seed dev selesai.
 *
 * Dipakai spec yang membutuhkan data contoh. Sinyalnya adalah pesan konsol
 * `seedDummy`, bukan "datanya kelihatan sudah ada": seeder menulis bertahap,
 * sehingga "murid pertama sudah ada" jauh lebih awal daripada "seluruh sesi
 * sudah ada".
 *
 * **Kenapa memakai `expect.poll`, bukan menunggu satu event.** Versi sebelumnya
 * menunggu **satu** event konsol dengan `waitForEvent`. Dua cacat pada cara itu,
 * dan keduanya berujung pada kegagalan yang menyesatkan:
 * (a) bila pesannya tiba **sebelum** penungguan dipasang, penungguan itu menunggu
 *     selamanya meski seednya sudah selesai;
 * (b) saat habis batas waktu, pesan galatnya hanya berbunyi "seed tidak selesai",
 *     tanpa menyebut apa yang sebenarnya terjadi di halaman.
 * Sekarang syaratnya diperiksa berulang terhadap larik pesan, dan pesan
 * kegagalannya ikut memuat jejak konsol terakhir.
 */
export async function tungguSeedSelesai(
  page: Page,
  pesan: string[],
  timeoutMs = 120_000,
): Promise<boolean> {
  try {
    await expect
      .poll(() => pesan.some((t) => SEED_SELESAI.test(t)), {
        timeout: timeoutMs,
        message: `seed DEV tidak selesai dalam ${Math.round(timeoutMs / 1000)} dtk. Jejak konsol terakhir: ${ringkasKonsol(pesan)}`,
      })
      .toBe(true);
    return true;
  } catch {
    return false;
  }
}

/**
 * Muat aplikasi dengan data contoh yang **dijamin bersih**, lalu tunggu seednya.
 *
 * Menggantikan pola lama "buka `/`, tunggu 4 detik, panggil `seedDummy()`" yang
 * bergantung pada waktu dan pada keadaan run sebelumnya.
 *
 * `opsi.paksa` memanggil `seedDummy(true)` **di dalam halaman** sesudah dimuat,
 * yang membuat seednya membersihkan sisa data lebih dulu. Perlu diketahui:
 * `seedDummyData` punya penjaga anti-pemanggilan-ganda, jadi bila seed otomatis
 * masih berjalan, panggilan paksa itu **tidak melakukan apa-apa** — dan itu tidak
 * merugikan, sebab yang ditunggu tetap sinyal yang sama.
 */
export async function bukaDenganDataBersih(
  page: Page,
  opsi: { timeoutMs?: number; paksa?: boolean } = {},
): Promise<{ pesan: string[]; selesai: boolean }> {
  const pesan = rekamKonsol(page);
  await page.goto("/");
  if (opsi.paksa) {
    await page
      .evaluate(async () => {
        const fn = (window as unknown as { seedDummy?: (force?: boolean) => Promise<unknown> }).seedDummy;
        if (typeof fn === "function") await fn(true);
      })
      .catch(() => { /* halaman belum siap memanggil: sinyal konsol tetap ditunggu */ });
  }
  const selesai = await tungguSeedSelesai(page, pesan, opsi.timeoutMs ?? 120_000);
  return { pesan, selesai };
}

/**
 * Pilih murid yang sudah ditentukan, lalu **tunggu tombol "Buat Laporan" siap**.
 *
 * ## Kenapa helper ini menggantikan `pilihMuridYangBisaDirekap`
 *
 * Helper lama mencoba **setiap** opsi murid dan memakai murid pertama yang
 * tombolnya menyala. Itu salah untuk spec laporan yang menguji **murid tertentu**:
 * `report-export-ratio` dan `report-ratio-fixed` sengaja memakai Andi Pratama
 * (data seed memuat laporan Juni miliknya, dan narasi panjang ditulis ke sesinya),
 * lalu helper itu **berpindah ke murid lain** — sehingga yang diuji bukan lagi
 * yang dimaksud, dan hasilnya bergantung pada urutan murid di daftar.
 *
 * Mengukur apakah sebuah tombol siap juga lebih langsung daripada menebak dari
 * keberadaan teks alasan: satu-satunya hal yang dibutuhkan spec ini adalah
 * tombolnya benar-benar bisa ditekan.
 *
 * Bila tombolnya tidak pernah siap, pesan kegagalannya menyebut **kode keputusan**
 * dari jejak `catatJejakKetersediaanLaporan` (`sintesisJejakLaporan`), sehingga
 * sebabnya terbaca — "data belum dimuat" dan "periode memang tidak bisa direkap"
 * tidak lagi tampak sama.
 */
export async function pilihMuridDanTungguSiap(
  page: Page,
  muridId: string,
  opsi: { timeoutSiapMs?: number } = {},
): Promise<void> {
  const timeoutSiapMs = opsi.timeoutSiapMs ?? 30_000;
  await page.locator("select").first().selectOption(muridId);
  const tombol = page.getByRole("button", { name: /Buat Laporan|Update Laporan/ }).first();
  try {
    await expect(tombol).toBeEnabled({ timeout: timeoutSiapMs });
  } catch (e) {
    const sintesis = await sintesisJejakLaporan(page);
    const alasan = await page
      .getByText(/Tombol laporan mati:/)
      .first()
      .innerText()
      .catch(() => "(tidak ada paragraf alasan di layar)");
    throw new Error(
      `Tombol "Buat Laporan" tidak pernah siap untuk murid ${muridId.slice(0, 8)} dalam ${timeoutSiapMs} ms.\n` +
      `Alasan di layar: ${alasan.replace(/\s+/g, " ").slice(0, 200)}\n` +
      `Jejak keputusan: ${sintesis}`,
      // `cause` diteruskan supaya galat asli Playwright (yang memuat call log
      // lengkap) tetap terbaca di laporan — aturan `preserve-caught-error`
      // menuntut ini, dan tuntutan itu benar: tanpa `cause`, jejak di bawah hanya
      // menyisakan satu baris pesan dan langkah yang gagal hilang.
      { cause: e },
    );
  }
}

/**
 * Baca jejak keputusan layar Laporan dari `window` (lihat `catatJejakKetersediaanLaporan`).
 *
 * Dipakai untuk **menyebutkan sebabnya di pesan kegagalan**. Tanpa ini, kegagalan
 * hanya berbunyi "expected true, received false" dan sebabnya harus ditebak —
 * persis yang membuat empat putaran sebelumnya menaikkan batas waktu untuk sebab
 * yang salah.
 */
export async function sintesisJejakLaporan(page: Page): Promise<string> {
  return page.evaluate(() => {
    const daftar = (window as unknown as {
      __lklJejakLaporan?: Array<{
        kode: string; bisaDibuat: boolean; alasan: string;
        dipakai: Record<string, unknown>;
      }>;
    }).__lklJejakLaporan;
    if (!daftar || daftar.length === 0) {
      return "(jejak kosong — instrumentasi tidak menyala, atau layar Laporan tidak pernah dirender)";
    }
    const ringkas = daftar.map((j) =>
      `${j.kode}${j.bisaDibuat ? "·bisa" : ""} sesi=${j.dipakai.sesiCakupan} dataSiap=${j.dipakai.dataSiap} laporan=${j.dipakai.adaLaporan}`,
    );
    return ringkas.slice(-6).join(" | ");
  });
}

/**
 * Pilih murid yang periodenya **pasti bisa direkap** — ditentukan dari **data**,
 * bukan dari batas waktu UI.
 *
 * **Kenapa pendekatan ini yang dipakai.** Semua versi sebelumnya memilih murid
 * dengan mencoba opsi di layar lalu menunggu tombol "Buat Laporan" aktif selama N
 * detik (2,5 → 5 → 30 detik). Ketiganya gagal di bawah beban suite penuh, dan
 * gagalnya **berbeda-beda** — tanda yang jelas bahwa yang diukur bukan kesiapan,
 * melainkan waktu. Menaikkan N tidak pernah menyelesaikannya, karena tombol yang
 * mati juga berarti "periode ini memang tidak bisa direkap" (laporannya sudah
 * final, atau muridnya memakai paket pertemuan), sehingga kedua keadaan itu tidak
 * bisa dibedakan lewat lamanya menunggu.
 *
 * Di sini pertanyaannya dijawab langsung ke data: cari murid yang **punya sesi
 * selesai di bulan itu**, **belum punya laporan** untuk periode itu, **dan bukan
 * murid berpaket pertemuan**. Itu syarat yang sama dengan yang dipakai aplikasi
 * untuk mengaktifkan tombolnya, dibaca dari sumber yang sama
 * (`sessions`/`reports`/`students`), sehingga tidak ada tebakan.
 *
 * **Syarat "bukan murid berpaket" ditambahkan 2026-10-17, dan itu temuan nyata.**
 * Laporan paket pertemuan (`billingPolicy: "session_count"`) memang **dibuat dari
 * layar Keuangan**, bukan dari layar Laporan — `reportAvailabilityOf` menolaknya
 * dengan *"Paket pertemuan diterbitkan dari Keuangan agar kuota dan invoice
 * dikunci dalam satu transaksi."* Versi sebelumnya tidak menyaringnya, sehingga
 * helper ini bisa memilih murid paket (di seed dev: **Citra Dewanti**) dan
 * menyerahkan tombol yang **menurut desain** tidak akan pernah menyala. Gejalanya
 * terbaca persis seperti "tombol rusak", padahal tombolnya bekerja benar.
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
    const murid = await baca<{ id: string; name: string; billingPolicy?: string }>("students");
    const sesi = await baca<{ studentId: string; date: string; status: string }>("sessions");
    const laporan = await baca<{ studentId: string; month: string }>("reports");
    buka.close();
    const punyaSesi = new Set(
      sesi.filter((s) => s.date.startsWith(bln) && s.status === "DONE").map((s) => s.studentId),
    );
    const sudahAda = new Set(laporan.filter((l) => l.month === bln).map((l) => l.studentId));
    const berpaket = new Set(
      murid.filter((m) => m.billingPolicy === "session_count").map((m) => m.id),
    );
    const kandidat = murid.find(
      (m) => punyaSesi.has(m.id) && !sudahAda.has(m.id) && !berpaket.has(m.id),
    );
    return kandidat?.id ?? null;
  }, bulan);
}

export { expect };
export type { Page };
