import { describe, expect, it } from "vitest";
import { bacaBiayaSesi, patchBiayaSesi } from "../screens/studentDetail/sessionCostPatch";

/**
 * Dua bug nyata yang dilaporkan pemilik 2026-10-14 sesudah memeriksa butir 44
 * di perangkat, keduanya di kolom "💰 Biaya" modal catatan sesi:
 *
 * 1. menghapus isi kolom menyisakan angka **0** yang harus dihapus lagi sebelum
 *    bisa mengetik nilai baru;
 * 2. menyimpan **0** tidak melepas nominal manual — nilai lama tetap dipakai.
 *
 * Berkas ini mengunci aturan yang menggantikannya. Yang **tidak** boleh berubah:
 * nominal manual adalah pernyataan eksplisit tutor (`ATURAN-AI.md` §5) yang tidak
 * boleh dihitung ulang mesin.
 */

describe("bacaBiayaSesi — apa yang dimaksud tutor dengan isi kolomnya", () => {
  it("isian kosong berarti KEMBALI OTOMATIS, bukan nol rupiah", () => {
    // Inilah bug pertama: dulu `""` ditulis sebagai `0`, sehingga kolomnya
    // terisi 0 dan tutor harus menghapusnya lagi untuk mengetik nilai baru.
    expect(bacaBiayaSesi("")).toEqual({ mode: "auto" });
  });

  it("angka nol (dan nol bertumpuk) juga berarti kembali otomatis", () => {
    expect(bacaBiayaSesi("0")).toEqual({ mode: "auto" });
    expect(bacaBiayaSesi("000")).toEqual({ mode: "auto" });
    expect(bacaBiayaSesi("Rp 0")).toEqual({ mode: "auto" });
  });

  it("angka biasa menjadi nominal manual", () => {
    expect(bacaBiayaSesi("200000")).toEqual({ mode: "manual", nilai: 200_000 });
    expect(bacaBiayaSesi("175000")).toEqual({ mode: "manual", nilai: 175_000 });
  });

  it("pemisah dan simbol yang ikut terketik tidak merusak angkanya", () => {
    expect(bacaBiayaSesi("200.000")).toEqual({ mode: "manual", nilai: 200_000 });
    expect(bacaBiayaSesi("200,000")).toEqual({ mode: "manual", nilai: 200_000 });
    expect(bacaBiayaSesi("Rp 200.000")).toEqual({ mode: "manual", nilai: 200_000 });
  });

  it("notasi ilmiah tidak dibaca sebagai angka kecil", () => {
    // `parseInt("1e5", 10)` menghasilkan 1 — angka yang sama sekali bukan maksud
    // tutor. Digitnya dikumpulkan lebih dulu, jadi hasilnya 15 (dari "1" dan "5").
    // Yang penting di sini: hasilnya bukan 1, dan bukan pula nol yang menghapus
    // nominal manualnya tanpa diminta.
    const hasil = bacaBiayaSesi("1e5");
    expect(hasil.mode).toBe("manual");
    expect(hasil).not.toEqual({ mode: "manual", nilai: 1 });
  });

  it("tanda minus atau isian tak bermakna tidak pernah menghasilkan nominal negatif", () => {
    expect(bacaBiayaSesi("-")).toEqual({ mode: "auto" });
    expect(bacaBiayaSesi("abc")).toEqual({ mode: "auto" });
    expect(bacaBiayaSesi("-500")).toEqual({ mode: "manual", nilai: 500 });
  });
});

describe("patchBiayaSesi — perubahan apa yang dikirim ke updateSession", () => {
  it("mengetik nominal baru pada sesi tanpa nominal manual → memasang nominaalnya", () => {
    expect(patchBiayaSesi({ mode: "manual", nilai: 200_000 }, undefined))
      .toEqual({ cost: 200_000, costOverride: 200_000 });
  });

  it("mengubah nominal manual yang sudah ada → menimpa dengan yang baru", () => {
    expect(patchBiayaSesi({ mode: "manual", nilai: 200_000 }, 175_000))
      .toEqual({ cost: 200_000, costOverride: 200_000 });
  });

  it("nilai yang sama tidak menyentuh uang sama sekali", () => {
    expect(patchBiayaSesi({ mode: "manual", nilai: 200_000 }, 200_000)).toBeNull();
  });

  it("mengosongkan kolom melepas nominal manual (bug kedua: dulu 0 menyimpan nilai lama)", () => {
    expect(patchBiayaSesi({ mode: "auto" }, 175_000))
      .toEqual({ cost: 0, costOverride: null });
  });

  it("mengosongkan kolom pada sesi yang memang otomatis tidak mengubah apa pun", () => {
    expect(patchBiayaSesi({ mode: "auto" }, null)).toBeNull();
    expect(patchBiayaSesi({ mode: "auto" }, undefined)).toBeNull();
  });

  it("`costOverride: null` (bukan undefined) supaya pelepasannya eksplisit", () => {
    // `undefined` berarti "jangan sentuh"; `null` berarti "lepas". Perbedaan itu
    // yang membuat tombol Reset benar-benar bekerja.
    const patch = patchBiayaSesi({ mode: "auto" }, 300_000);
    expect(patch?.costOverride).toBeNull();
    expect(patch?.costOverride).not.toBeUndefined();
  });
});
