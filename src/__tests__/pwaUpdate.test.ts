import { describe, expect, it } from "vitest";
import {
  DISMISS_DAYS,
  UPDATE_DISMISS_KEY,
  applyFailureMessage,
  checkResultMessage,
  clearUpdateDismissed,
  dismissedUntil,
  isUpdateDismissed,
  readUpdateDismissed,
  updateState,
  writeUpdateDismissed,
  type UpdateGate,
} from "../lib/pwaUpdate";

const NOW = 1_800_000_000_000;
const DAY_MS = 24 * 60 * 60 * 1000;

function fakeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => { map.set(k, v); },
    removeItem: (k: string) => { map.delete(k); },
    isi: () => map,
  };
}
const storageDiblokir = {
  getItem: (): string | null => { throw new Error("diblokir"); },
  setItem: (): void => { throw new Error("diblokir"); },
  removeItem: (): void => { throw new Error("diblokir"); },
};

const gate = (ubah: Partial<UpdateGate> = {}): UpdateGate => ({
  ready: false, currentVersion: "v1.100.0", onLine: true, checking: false, applying: false, dismissed: false, ...ubah,
});

const aksi = (s: ReturnType<typeof updateState>, id: string) => s.actions.find((a) => a.id === id)!;

describe("updateState — tombol Perbarui (keluhan utama)", () => {
  it("menyalakan Perbarui HANYA saat pembaruan benar-benar siap", () => {
    // Sebelumnya tombol ini bisa ditekan walau tidak ada yang menunggu, dan
    // hasilnya "tidak terjadi apa-apa" — persis yang dilaporkan.
    expect(aksi(updateState(gate({ ready: true })), "apply").enabled).toBe(true);
    /**
     * Saat belum ada pembaruan, tombol "Perbarui" **tidak ditawarkan sama sekali**
     * — bukan ditawarkan lalu mati. Di Pengaturan, tombol mati yang tidak bisa
     * menjelaskan dirinya adalah keluhan yang sedang diperbaiki; yang benar
     * adalah menyembunyikannya dan menampilkan status "sudah versi terbaru".
     */
    const belum = updateState(gate({ ready: false }));
    expect(aksi(belum, "apply")).toBeUndefined();
    expect(belum.headline).toContain("versi terbaru");
    expect(aksi(belum, "check").enabled).toBe(true);
  });

  it("menonaktifkan Perbarui selama pemasangan supaya tidak ditekan dua kali", () => {
    const s = updateState(gate({ ready: true, applying: true }));
    expect(aksi(s, "apply").enabled).toBe(false);
    expect(aksi(s, "apply").label).toBe("Memasang...");
    expect(s.headline).toContain("Memasang");
    expect(aksi(s, "check").enabled).toBe(false);
  });

  it("setiap tombol yang nonaktif SELALU menyebut alasannya", () => {
    // Tombol mati tanpa alasan adalah keluhan yang sama dalam bentuk lain.
    const kasus: UpdateGate[] = [
      gate(),
      gate({ ready: true, applying: true }),
      gate({ onLine: false }),
      gate({ checking: true }),
      gate({ ready: true, dismissed: true }),
    ];
    for (const g of kasus) {
      for (const a of updateState(g).actions) {
        if (!a.enabled) expect(a.reason, `tombol ${a.id} nonaktif tanpa alasan`).toBeTruthy();
      }
    }
  });
  it("menyebut nomor versi yang sedang berjalan supaya tutor tahu apa yang diganti", () => {
    expect(updateState(gate({ ready: true })).detail).toContain("v1.100.0");
    expect(updateState(gate()).detail).toContain("v1.100.0");
  });
});

describe("updateState — tombol tutup (permintaan kedua)", () => {
  it("menampilkan banner saat pembaruan siap dan belum ditutup", () => {
    expect(updateState(gate({ ready: true, dismissed: false })).showBanner).toBe(true);
  });

  it("menyembunyikan banner setelah ditutup", () => {
    expect(updateState(gate({ ready: true, dismissed: true })).showBanner).toBe(false);
  });

  it("menutup banner TIDAK mematikan tombol Perbarui di Pengaturan", () => {
    // Ini yang membuat tombol tutup aman: satu ketukan tidak sengaja tidak boleh
    // mengunci kemampuan memasang pembaruan selama seminggu.
    const s = updateState(gate({ ready: true, dismissed: true }));
    expect(s.showBanner).toBe(false);
    expect(aksi(s, "apply").enabled).toBe(true);
  });

  it("tidak pernah menampilkan banner kalau belum ada pembaruan", () => {
    expect(updateState(gate({ ready: false, dismissed: false })).showBanner).toBe(false);
  });

  it("selama pemasangan banner tetap tampil walau tadi ditutup", () => {
    const s = updateState(gate({ ready: true, dismissed: true, applying: true }));
    expect(s.showBanner).toBe(true);
  });
});

describe("updateState — periksa pembaruan manual", () => {
  it("pemeriksaan butuh internet dan menyebut alasannya saat offline", () => {
    const s = updateState(gate({ onLine: false }));
    expect(aksi(s, "check").enabled).toBe(false);
    expect(aksi(s, "check").reason).toContain("offline");
  });

  it("pemeriksaan bisa ditekan saat pembaruan belum ada dan perangkat online", () => {
    expect(aksi(updateState(gate()), "check").enabled).toBe(true);
  });

  it("label pemeriksaan berubah selama berjalan", () => {
    expect(aksi(updateState(gate({ checking: true })), "check").label).toBe("Memeriksa...");
  });

  it("pesan hasil pemeriksaan membedakan ditemukan dan tidak", () => {
    expect(checkResultMessage(true)).toContain("Pembaruan tersedia");
    expect(checkResultMessage(false)).toContain("versi terbaru");
    expect(checkResultMessage(true)).not.toBe(checkResultMessage(false));
  });
});

describe("applyFailureMessage — kegagalan harus terlihat, bukan hanya di konsol", () => {
  it("kegagalan jaringan disebut sebagai masalah jaringan", () => {
    expect(applyFailureMessage(new Error("Failed to fetch"))).toContain("jaringan");
    expect(applyFailureMessage(new Error("ERR_INTERNET_DISCONNECTED"))).toContain("jaringan");
  });

  it("service worker yang tidak menunggu diarahkan ke tutup-buka aplikasi", () => {
    expect(applyFailureMessage(new Error("no waiting service worker"))).toContain("Tutup lalu buka lagi");
  });

  it("galat lain tetap menyebut pesannya dan menegaskan data tidak berubah", () => {
    const pesan = applyFailureMessage(new Error("kode galat aneh"));
    expect(pesan).toContain("kode galat aneh");
    expect(pesan).toContain("Data Anda tidak berubah");
  });

  it("galat yang bukan Error tetap menghasilkan kalimat yang bisa dibaca", () => {
    // `throw "gagal"` dan penolakan tanpa argumen pernah terjadi di runtime.
    for (const aneh of ["gagal", null, undefined, 42, {}]) {
      const pesan = applyFailureMessage(aneh);
      expect(pesan).toContain("Pembaruan gagal dipasang");
      expect(pesan).not.toContain("undefined");
      expect(pesan).not.toContain("[object Object]");
    }
  });
});

describe("penolakan tersimpan", () => {
  it("nilai kosong, rusak, atau kedaluwarsa berarti tawaran boleh muncul lagi", () => {
    expect(isUpdateDismissed(null, NOW)).toBe(false);
    expect(isUpdateDismissed(undefined, NOW)).toBe(false);
    expect(isUpdateDismissed("", NOW)).toBe(false);
    expect(isUpdateDismissed("besok", NOW)).toBe(false);
    expect(isUpdateDismissed(String(NOW - 1), NOW)).toBe(false);
    expect(isUpdateDismissed(String(NOW), NOW)).toBe(false);
  });

  it("batas waktu yang masih berlaku menahan tawaran", () => {
    expect(isUpdateDismissed(String(NOW + 1), NOW)).toBe(true);
  });

  it("menyimpan penolakan membuat pembacaan berikutnya menahannya", () => {
    const s = fakeStorage();
    writeUpdateDismissed(s, NOW);
    expect(s.isi().get(UPDATE_DISMISS_KEY)).toBe(String(dismissedUntil(NOW)));
    expect(readUpdateDismissed(s, NOW)).toBe(true);
  });

  it("setelah tujuh hari tawaran muncul lagi", () => {
    const s = fakeStorage();
    writeUpdateDismissed(s, NOW);
    expect(readUpdateDismissed(s, NOW + (DISMISS_DAYS - 1) * DAY_MS)).toBe(true);
    expect(readUpdateDismissed(s, NOW + (DISMISS_DAYS + 1) * DAY_MS)).toBe(false);
  });

  it("memasang dari Pengaturan menghapus penolakan, jadi tawaran tidak menggantung", () => {
    const s = fakeStorage();
    writeUpdateDismissed(s, NOW);
    expect(readUpdateDismissed(s, NOW)).toBe(true);
    clearUpdateDismissed(s);
    expect(readUpdateDismissed(s, NOW)).toBe(false);
  });

  it("localStorage yang diblokir tidak pernah membuat aplikasi error", () => {
    expect(readUpdateDismissed(storageDiblokir, NOW)).toBe(false);
    expect(() => writeUpdateDismissed(storageDiblokir, NOW)).not.toThrow();
    expect(() => clearUpdateDismissed(storageDiblokir)).not.toThrow();
    expect(readUpdateDismissed(null, NOW)).toBe(false);
    expect(() => writeUpdateDismissed(null, NOW)).not.toThrow();
  });
});
