/**
 * Penjaga tabel aksi "Kelola sesi" (G3-01 L4 — `TASK-06` §3 Langkah 4).
 *
 * **Kenapa tes ini ada.** L4 melebur **dua modal lama** menjadi satu sheet. Risiko
 * sesungguhnya bukan tampilannya, melainkan **kemampuan yang hilang tanpa
 * disadari** — persis larangan `ATURAN-AI` §2.2 ("menghapus kemampuan dengan
 * alasan menyederhanakan"; paling jauh dipindah ke `⋯`). Tes ini mengunci tabel
 * konteks dan sifat tiap aksi sebelum komponennya ditulis, supaya penggantian
 * modal tidak bisa diam-diam mengurangi.
 *
 * **Cara uji.** Fungsi murni di `screens/home/manageSession.ts`; markup-nya
 * dijaga tahap berikutnya (`tsc`/`eslint`) dan E2E saat sheet-nya dijalankan
 * manusia.
 */
import { describe, expect, it } from "vitest";
import {
  aksiLainnya,
  aksiSesi,
  aksiTerbuka,
  aksiUtama,
  type AksiSesi,
  type SesiAksi,
  type SesiKontek,
} from "../screens/home/manageSession";

const KEDUA_KONTEKS: SesiKontek[] = ["terlewat", "terjadwal"];
const ketujuh: SesiAksi[] = [
  "catat",
  "batal-les",
  "tidak-hadir",
  "simpan-perubahan",
  "jadwalkan-ulang",
  "batalkan-sesi",
  "hapus",
];

const id = (list: AksiSesi[]) => list.map((a) => a.id);

describe("aksiUtama — aksi yang tampil lebar penuh", () => {
  it("konteks terlewat: Catat · Batal les · Tidak hadir", () => {
    expect(id(aksiUtama({ kontek: "terlewat" }))).toEqual(["catat", "batal-les", "tidak-hadir"]);
  });

  it("konteks terjadwal: hanya Simpan perubahan", () => {
    expect(id(aksiUtama({ kontek: "terjadwal" }))).toEqual(["simpan-perubahan"]);
  });

  it("semua yang keluar dari aksiUtama ditandai utama", () => {
    for (const kontek of KEDUA_KONTEKS) {
      expect(aksiUtama({ kontek }).every((a) => a.utama)).toBe(true);
    }
  });
});

describe("aksiLainnya — isi menu ⋯", () => {
  it("konteks terlewat: Jadwalkan ulang · Hapus (kemampuan lama tidak hilang, hanya dipindah)", () => {
    expect(id(aksiLainnya({ kontek: "terlewat", berseri: false }))).toEqual(["jadwalkan-ulang", "hapus"]);
  });

  it("konteks terjadwal: Batalkan sesi · Hapus", () => {
    expect(id(aksiLainnya({ kontek: "terjadwal", berseri: false }))).toEqual(["batalkan-sesi", "hapus"]);
  });

  it("tidak ada satu pun yang ditandai utama", () => {
    for (const kontek of KEDUA_KONTEKS) {
      expect(aksiLainnya({ kontek, berseri: true }).every((a) => !a.utama)).toBe(true);
    }
  });

  it("Jadwalkan ulang hanya muncul di konteks terlewat", () => {
    expect(id(aksiLainnya({ kontek: "terjadwal", berseri: true }))).not.toContain("jadwalkan-ulang");
  });
});

describe("cakupan seri — hanya ditawarkan bila sesi memang berseri", () => {
  it("sesi tanpa seriesId tidak menawarkan pilihan cakupan", () => {
    for (const kontek of KEDUA_KONTEKS) {
      expect(aksiSesi({ kontek, berseri: false }).some((a) => a.butuhCakupanSeri)).toBe(false);
    }
  });

  it("sesi ber-seriesId menandai aksi yang butuh cakupan", () => {
    const berseri = aksiSesi({ kontek: "terjadwal", berseri: true });
    expect(berseri.find((a) => a.id === "batalkan-sesi")?.butuhCakupanSeri).toBe(true);
  });

  it("Tombol Hapus tidak pernah butuh cakupan — ia menghapus satu sesi, bukan seri", () => {
    for (const kontek of KEDUA_KONTEKS) {
      expect(aksiSesi({ kontek, berseri: true }).find((a) => a.id === "hapus")?.butuhCakupanSeri).toBe(false);
    }
  });
});

describe("kelengkapan enam aksi (TASK-06 §9.2)", () => {
  it("tidak ada aksi yang muncul dua kali dalam satu konteks", () => {
    for (const kontek of KEDUA_KONTEKS) {
      const semua = id(aksiSesi({ kontek, berseri: true }));
      expect(new Set(semua).size).toBe(semua.length);
    }
  });

  it("tujuh id yang dinamai kontrak benar-benar bisa dijalankan di suatu konteks", () => {
    const semua = new Set([...id(aksiSesi({ kontek: "terlewat", berseri: true })), ...id(aksiSesi({ kontek: "terjadwal", berseri: true }))]);
    for (const aksi of ketujuh) expect(semua.has(aksi)).toBe(true);
  });

  it("Catat · Batal les · Tidak hadir (tiga aksi yang paling mudah hilang) ada di konteks terlewat", () => {
    const semua = id(aksiSesi({ kontek: "terlewat", berseri: false }));
    expect(semua).toContain("catat");
    expect(semua).toContain("batal-les");
    expect(semua).toContain("tidak-hadir");
  });

  it("satu-satunya aksi yang tidak butuh kolom isian adalah Catat dan Hapus", () => {
    const tanpaIsian = new Set(
      ketujuh.filter((aksi) =>
        KEDUA_KONTEKS.every((kontek) => {
          const found = aksiSesi({ kontek, berseri: true }).find((a) => a.id === aksi);
          return !found || !found.butuhIsian;
        }),
      ),
    );
    expect(tanpaIsian).toEqual(new Set(["catat", "hapus"]));
  });
});

describe("aksiTerbuka — kolom isian mengikuti aksi yang dipilih", () => {
  it("Tidak hadir membuka kolom isian (kebijakan tagihan tidak hilang)", () => {
    const aksi = aksiTerbuka({ kontek: "terlewat", berseri: false }, "tidak-hadir");
    expect(aksi?.butuhIsian).toBe(true);
  });

  it("Tidak hadir TIDAK menawarkan cakupan seri — sesi terlewat dibatalkan satu per satu", () => {
    expect(aksiTerbuka({ kontek: "terlewat", berseri: true }, "tidak-hadir")?.butuhCakupanSeri).toBe(false);
  });

  it("aksi milik konteks lain tidak bisa dibuka", () => {
    expect(aksiTerbuka({ kontek: "terjadwal", berseri: true }, "catat")).toBeNull();
    expect(aksiTerbuka({ kontek: "terlewat", berseri: true }, "simpan-perubahan")).toBeNull();
  });

  it("tanpa pilihan, tidak ada aksi terbuka (sheet hanya menampilkan daftar)", () => {
    expect(aksiTerbuka({ kontek: "terlewat", berseri: false }, null)).toBeNull();
  });
});
