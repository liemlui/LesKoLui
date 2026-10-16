/**
 * Perutean aksi ber-PIN Keuangan — dipisah dari komponennya **karena komponen
 * tidak boleh mengekspor bukan-komponen** (`react-refresh/only-export-components`;
 * jebakan yang sudah dua kali memakan waktu di repo ini).
 *
 * **Cacat yang melahirkan modul ini (2026-10-15).** "Restore dari File" di layar
 * Pengaturan punya tombol, dialog ringkasan, dan permintaan PIN yang semuanya
 * benar — tetapi perutean pin-nya **tidak punya cabang `restore`**. Akibatnya
 * menekan PIN "Restore" menutup modal lalu **tidak memanggil apa pun**: tidak ada
 * galat, tidak ada pesan, halaman tidak memuat ulang, dan data **tidak berubah**.
 * Ditemukan lewat probe di build produksi (`.jles` dibuat, satu murid ditambah,
 * restore dijalankan → tabel `students` tetap berisi dua baris). Yang membuatnya
 * bertahan lama: `doRestore` **ada** dan **teruji** (`backupHandlers.test.ts`),
 * jadi tidak ada tes yang gagal — yang tidak ada adalah tes untuk **sambungannya**.
 *
 * **Aturan yang berlaku sekarang.** Setiap aksi pada {@link PIN_ACTION_KEYS} wajib
 * punya perutean. Bila tidak, fungsi ini **melempar** — bukan diam. Diam adalah
 * bentuk kegagalan yang paling mahal di jalur ini: tutor mengira datanya sudah
 * pulih padahal belum tersentuh.
 */

/** Argumen yang dibutuhkan tiap aksi ber-PIN. `undefined` = tidak ada argumen. */
export interface PinActionArgs {
  exportBackup: undefined;
  /** Berkas `.jles` yang dipilih tutor — inilah yang selama ini hilang dari perutean. */
  restore: File;
  resetAll: undefined;
  backupDrive: undefined;
  restoreDrive: undefined;
  exportCsv: undefined;
}

export type PinAction = keyof PinActionArgs;

/** Daftar aksi ber-PIN — satu-satunya sumber kebenaran untuk kunci perutean. */
export const PIN_ACTION_KEYS = [
  "exportBackup", "restore", "resetAll", "backupDrive", "restoreDrive", "exportCsv",
] as const satisfies readonly PinAction[];

/**
 * Keadaan modal PIN: aksi yang sedang diminta **beserta argumennya**.
 *
 * Argumen disimpan bersama aksinya, bukan di keadaan terpisah, supaya tidak
 * mungkin ada "aksi tanpa argumen" — bentuk yang membuat jalur restore mustahil
 * diselesaikan walau peruteannya sudah ditulis.
 */
export type PinActionState =
  | { aksi: "restore"; berkas: File }
  | { aksi: Exclude<PinAction, "restore"> };

/** Peta pengubah: satu entri per aksi, dan tipenya memaksa kelengkapannya. */
export type PinActionHandlers = {
  [K in PinAction]: (arg: PinActionArgs[K]) => Promise<void>;
};

/**
 * Jalankan aksi ber-PIN yang diminta.
 *
 * **Tidak ada cabang yang boleh diam.** Dulu bentuknya rentetan `if`, dan aksi
 * yang cabangnya lupa ditulis **tidak melakukan apa pun tanpa satu pun galat** —
 * persis itulah cacat "Restore dari File" 2026-10-15. Di sini keadaan yang tidak
 * dikenal **melempar**, supaya kesalahannya terlihat sebagai pesan di layar, bukan
 * sebagai layar yang tampak normal.
 */
export async function jalankanAksiPin(
  handlers: PinActionHandlers,
  state: PinActionState,
): Promise<void> {
  if (state.aksi === "restore") return handlers.restore(state.berkas);
  if (state.aksi === "exportBackup") return handlers.exportBackup(undefined);
  if (state.aksi === "resetAll") return handlers.resetAll(undefined);
  if (state.aksi === "backupDrive") return handlers.backupDrive(undefined);
  if (state.aksi === "restoreDrive") return handlers.restoreDrive(undefined);
  if (state.aksi === "exportCsv") return handlers.exportCsv(undefined);
  // Dijangkau hanya bila ada aksi baru yang ditambahkan tanpa perutean.
  throw new Error(`Aksi ber-PIN "${(state as { aksi: string }).aksi}" belum punya perutean.`);
}
