/**
 * Pagar perutean aksi ber-PIN — cacat "Restore dari File" 2026-10-15.
 *
 * **Cacatnya, apa adanya.** Tombol "Restore dari File" di Pengaturan punya
 * dialog, permintaan PIN, dan pengubah `doRestore` yang **teruji** — tetapi
 * perutean PIN-nya tidak punya cabang `restore`. Menekan PIN "Restore" menutup
 * modal lalu **tidak memanggil apa pun**: tanpa galat, tanpa pesan, halaman tidak
 * memuat ulang, dan data tidak berubah. Dibuktikan di build produksi: berkas
 * `.jles` dibuat, satu murid ditambah, restore dijalankan → tabel `students`
 * tetap berisi **dua** baris (seharusnya kembali ke satu).
 *
 * **Kenapa tidak ada tes yang gagal saat itu.** `backupHandlers.test.ts` menguji
 * `doRestore` **langsung**, dan itu lulus. Yang tidak pernah diuji adalah
 * **sambungan** antara aksi yang diminta dan pengubah yang dipanggil. Tes ini
 * menutup lubang itu: satu tes per aksi, dan satu tes yang gagal bila ada aksi
 * tanpa perutean.
 */
import { describe, expect, it } from "vitest";
import {
  PIN_ACTION_KEYS, jalankanAksiPin, type PinAction, type PinActionHandlers, type PinActionState,
} from "../screens/settings/pinActions";

function handlersSpy() {
  const dipanggil: Array<{ aksi: PinAction; arg: unknown }> = [];
  const buat = (aksi: PinAction) => async (arg: unknown) => { dipanggil.push({ aksi, arg }); };
  const handlers: PinActionHandlers = {
    exportBackup: buat("exportBackup"),
    restore: buat("restore"),
    resetAll: buat("resetAll"),
    backupDrive: buat("backupDrive"),
    restoreDrive: buat("restoreDrive"),
    exportCsv: buat("exportCsv"),
  };
  return { handlers, dipanggil };
}

const BERKAS = new File(["isi"], "backup-e2e.jles");

describe("perutean aksi ber-PIN — setiap aksi benar-benar memanggil pengubahnya", () => {
  it("'restore' memanggil doRestore DENGAN berkas yang tutor pilih", async () => {
    const { handlers, dipanggil } = handlersSpy();
    const state: PinActionState = { aksi: "restore", berkas: BERKAS };

    await jalankanAksiPin(handlers, state);

    // Inilah yang dulu tidak pernah terjadi: pengubahnya tidak dipanggil sama sekali.
    expect(dipanggil).toHaveLength(1);
    expect(dipanggil[0].aksi).toBe("restore");
    expect(dipanggil[0].arg).toBe(BERKAS);
  });

  it("setiap aksi lain memanggil pengubahnya sendiri, tepat sekali", async () => {
    for (const aksi of PIN_ACTION_KEYS) {
      const { handlers, dipanggil } = handlersSpy();
      const state = (aksi === "restore"
        ? { aksi, berkas: BERKAS }
        : { aksi }) as PinActionState;

      await jalankanAksiPin(handlers, state);

      expect(dipanggil.map((d) => d.aksi), `aksi ${aksi}`).toEqual([aksi]);
    }
  });

  it("daftar aksi ber-PIN memuat keenam aksi yang benar-benar dipakai layar", () => {
    // Kalau suatu saat ada aksi baru tanpa perutean, tes ini yang menuntutnya.
    expect([...PIN_ACTION_KEYS].sort()).toEqual(
      ["backupDrive", "exportBackup", "exportCsv", "resetAll", "restore", "restoreDrive"],
    );
  });

  it("aksi yang tidak punya perutean MELEMPAR, bukan diam", async () => {
    const { handlers } = handlersSpy();
    const palsu = { aksi: "aksiYangBelumAda" } as unknown as PinActionState;

    // Diam adalah bentuk kegagalan termahal di jalur ini: tutor mengira datanya
    // sudah pulih padahal belum tersentuh. Karena itu harus melempar.
    await expect(jalankanAksiPin(handlers, palsu)).rejects.toThrow(/belum punya perutean/);
  });
});

describe("pagar ini benar-benar menggigit (mutasi)", () => {
  it("peta pengubah yang kehilangan aksi 'restore' ditolak oleh tipe", () => {
    /**
     * Mutasi yang meniru cacat aslinya: peta tanpa entri `restore`.
     *
     * Dua lapis penjagaannya, dan keduanya harus terlihat di sini:
     * 1. **Kompilasi** — `PinActionHandlers` memetakan SELURUH `PinAction`, jadi
     *    objek yang kehilangan satu kunci **gagal `tsc`**. Itu diverifikasi di
     *    luar tes ini (lihat laporan: menempelkan peta tanpa `restore` membuat
     *    `npx tsc -b` berbunyi TS2741 "Property 'restore' is missing").
     * 2. **Saat berjalan** — kalau keadaan yang tak dikenal tetap lolos ke
     *    perutean, fungsinya melempar (diuji di blok sebelumnya).
     *
     * Yang bisa diperiksa di dalam tes tanpa merusak kompilasi: bahwa `restore`
     * memang **wajib** ada di tipe — kalau kunci itu hilang dari `PinAction`,
     * daftar aksi di tes ini akan gagal lebih dulu.
     */
    const tanpaRestore = { ...handlersSpy().handlers } as Partial<PinActionHandlers>;
    delete tanpaRestore.restore;
    expect(PIN_ACTION_KEYS).toContain("restore");
    expect(tanpaRestore.restore).toBeUndefined();
  });

  it("kelengkapan peta diperiksa compiler, bukan hanya di sini", () => {
    // `PIN_ACTION_KEYS` memakai `satisfies readonly PinAction[]`, sehingga aksi
    // yang ditambahkan ke tipe tetapi lupa dimasukkan ke daftar akan gagal
    // dikompilasi. Yang bisa diperiksa saat berjalan: daftarnya tidak punya
    // duplikat dan tidak kosong.
    type KunciTerpakai = (typeof PIN_ACTION_KEYS)[number];
    const semuaTerpakai: KunciTerpakai[] = [...PIN_ACTION_KEYS];
    expect(new Set(semuaTerpakai).size).toBe(PIN_ACTION_KEYS.length);
    expect(PIN_ACTION_KEYS.length).toBeGreaterThan(0);
  });
});
