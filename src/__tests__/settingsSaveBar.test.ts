import { describe, expect, it } from "vitest";
import {
  PESAN_TINGGALKAN_HALAMAN,
  harusDitahan,
  jamTersimpan,
  perluBeforeUnload,
  saveBarState,
} from "../lib/settingsSaveBar";

const ISO = new Date(2026, 9, 11, 14, 3).toISOString();

describe("saveBarState — status berwaktu (G3-09 butir 1)", () => {
  it("menyebut jam penyimpanan, bukan hanya kata 'tersimpan'", () => {
    // Sebelum G3-09 tidak ada satu pun tanda KAPAN penyimpanan terjadi.
    const s = saveBarState({ dirty: false, saving: false, savedAt: ISO });
    expect(s.status).toBe("tersimpan");
    // Pemisah jam bisa "." atau ":" tergantung data lokal ICU mesin; yang
    // diikat tes ini adalah JAMNYA muncul, bukan pemisahnya.
    expect(s.detail).toMatch(/^Tersimpan 14[.:]03$/);
    expect(s.enabled).toBe(false);
  });

  it("tanpa penyimpanan sebelumnya, tidak mengarang jam", () => {
    const s = saveBarState({ dirty: false, saving: false, savedAt: null });
    expect(s.detail).toBe("Belum ada perubahan.");
    expect(s.detail).not.toContain(":");
  });

  it("tanggal yang rusak tidak menghasilkan 'Invalid Date' di layar", () => {
    const s = saveBarState({ dirty: false, saving: false, savedAt: "bukan-tanggal" });
    expect(s.detail).not.toMatch(/invalid/i);
    expect(s.detail).toBe("Belum ada perubahan.");
  });

  it("menandai ada perubahan belum disimpan dan menyalakan tombolnya", () => {
    const s = saveBarState({ dirty: true, saving: false, savedAt: ISO });
    expect(s.status).toBe("kotor");
    expect(s.label).toBe("Simpan Pengaturan");
    expect(s.enabled).toBe(true);
    expect(s.detail).toContain("belum disimpan");
  });

  it("menonaktifkan tombol selama menulis", () => {
    const s = saveBarState({ dirty: true, saving: true });
    expect(s.status).toBe("menyimpan");
    expect(s.label).toBe("Menyimpan...");
    expect(s.enabled).toBe(false);
  });

  it("kegagalan diperiksa SEBELUM 'tersimpan', supaya pesannya tidak tertelan", () => {
    // Kalau urutannya dibalik, kegagalan tidak akan pernah terlihat setelah ada
    // satu penyimpanan yang berhasil sebelumnya.
    const s = saveBarState({ dirty: false, saving: false, savedAt: ISO, errorMessage: "Gagal menulis: penyimpanan penuh" });
    expect(s.status).toBe("gagal");
    expect(s.detail).toContain("penyimpanan penuh");
    expect(s.enabled).toBe(true);
  });

  it("kegagalan selama menulis tetap terbaca sebagai kegagalan, bukan 'menyimpan'", () => {
    // `saving` menang supaya tombolnya tidak bisa ditekan berulang di tengah
    // proses; setelah prosesnya berakhir, `saving=false` dan pesannya muncul.
    expect(saveBarState({ dirty: true, saving: true, errorMessage: "x" }).status).toBe("menyimpan");
    expect(saveBarState({ dirty: true, saving: false, errorMessage: "x" }).status).toBe("gagal");
  });

  it("hanya keadaan yang punya kabar baru yang diumumkan (aria-live)", () => {
    expect(saveBarState({ dirty: true, saving: false }).live).toBe(false);
    expect(saveBarState({ dirty: false, saving: false }).live).toBe(false);
    expect(saveBarState({ dirty: true, saving: true }).live).toBe(true);
    expect(saveBarState({ dirty: true, saving: false, errorMessage: "x" }).live).toBe(true);
  });
});

describe("jamTersimpan", () => {
  it("mengembalikan jam dua digit", () => {
    expect(jamTersimpan(ISO)).toMatch(/^14[.:]03$/);
  });

  it("nilai kosong atau rusak menghasilkan null, bukan teks sampah", () => {
    for (const v of [null, undefined, "", "x", "2026-13-45T99:99:99Z"]) {
      expect(jamTersimpan(v)).toBeNull();
    }
  });
});

describe("harusDitahan — penjaga perubahan belum disimpan (G3-09 butir 2)", () => {
  it("menahan hanya kalau ada perubahan yang belum disimpan", () => {
    expect(harusDitahan(true, false)).toBe(true);
    expect(harusDitahan(false, false)).toBe(false);
  });

  it("TIDAK menahan saat sedang menyimpan: perubahan itu justru sedang diamankan", () => {
    expect(harusDitahan(true, true)).toBe(false);
  });
});

describe("perluBeforeUnload", () => {
  it("memakai aturan yang sama dengan penjaga internal", () => {
    expect(perluBeforeUnload(true, false)).toBe(true);
    expect(perluBeforeUnload(true, true)).toBe(false);
    expect(perluBeforeUnload(false, false)).toBe(false);
  });

  it("pesan peringatannya menyebut akibatnya, bukan hanya 'yakin?'", () => {
    expect(PESAN_TINGGALKAN_HALAMAN).toContain("belum disimpan");
    expect(PESAN_TINGGALKAN_HALAMAN).toContain("hilang");
  });
});
