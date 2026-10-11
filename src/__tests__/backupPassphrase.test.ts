import { describe, expect, it } from "vitest";
import {
  DRIVE_AUTO_KEY,
  DRIVE_PASS_KEY,
  passphraseStoredChip,
  readPassphraseStored,
} from "../lib/backupPassphrase";

function fakeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return { getItem: (k: string) => map.get(k) ?? null };
}
const storageDiblokir = {
  getItem: (): string | null => { throw new Error("diblokir"); },
};

describe("passphraseStoredChip — chip keadaan kata sandi tersimpan (G3-09 butir 6)", () => {
  it("menyatakan sandi tersimpan beserta nadanya sebagai peringatan", () => {
    const c = passphraseStoredChip(true);
    expect(c.stored).toBe(true);
    expect(c.tone).toBe("warn");
    expect(c.text).toContain("tersimpan");
  });

  it("penjelasannya menyebut RISIKO dan CARA MENGHAPUSNYA, bukan hanya memperingatkan", () => {
    // Peringatan tanpa jalan keluar hanya membuat cemas; yang dibutuhkan tutor
    // adalah tahu apa risikonya dan bagaimana menghentikannya.
    const c = passphraseStoredChip(true);
    expect(c.detail).toContain("terkunci");
    expect(c.detail).toContain("berkas kunci");
    expect(c.detail).toContain("Mematikan backup otomatis");
  });

  it("keadaan TIDAK tersimpan juga punya chipnya sendiri, bukan kosong", () => {
    // Ini yang membuat tutor tahu tidak ada sandi yang tertinggal di perangkat.
    const c = passphraseStoredChip(false);
    expect(c.stored).toBe(false);
    expect(c.tone).toBe("info");
    expect(c.text).toContain("tidak disimpan");
    expect(c.detail).toContain("Unduh berkas kunci");
  });

  it("kedua keadaannya tidak bisa tertukar", () => {
    expect(passphraseStoredChip(true).text).not.toBe(passphraseStoredChip(false).text);
    expect(passphraseStoredChip(true).tone).not.toBe(passphraseStoredChip(false).tone);
  });
});

describe("readPassphraseStored", () => {
  it("mengembalikan true hanya kalau kuncinya benar-benar berisi", () => {
    expect(readPassphraseStored(fakeStorage({ [DRIVE_PASS_KEY]: "kata-sandi-kuat-2026" }))).toBe(true);
  });

  it("nilai kosong atau kunci yang tidak ada berarti tidak tersimpan", () => {
    expect(readPassphraseStored(fakeStorage({ [DRIVE_PASS_KEY]: "" }))).toBe(false);
    expect(readPassphraseStored(fakeStorage())).toBe(false);
    expect(readPassphraseStored(null)).toBe(false);
    expect(readPassphraseStored(undefined)).toBe(false);
  });

  it("kunci setelan backup otomatis TIDAK dianggap sebagai kata sandi", () => {
    // `leskolui_drive_auto` cuma penanda "menyala"; sandinya ada di kunci lain.
    // Kalau keduanya tertukar, chip akan berbohong soal data.
    expect(readPassphraseStored(fakeStorage({ [DRIVE_AUTO_KEY]: "1" }))).toBe(false);
  });

  it("penyimpanan yang diblokir berarti tidak tersimpan, bukan error", () => {
    expect(readPassphraseStored(storageDiblokir)).toBe(false);
  });
});
