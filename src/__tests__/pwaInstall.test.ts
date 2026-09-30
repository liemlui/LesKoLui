import { describe, expect, it } from "vitest";
import {
  INSTALL_SNOOZE_KEY,
  SNOOZE_DAYS_AFTER_DISMISS,
  SNOOZE_DAYS_AFTER_PROMPT,
  isSnoozed,
  isStandaloneLaunch,
  readInstallSnooze,
  safeLocalStorage,
  shouldShowInstallPrompt,
  snoozeUntil,
  writeInstallSnooze,
} from "../lib/pwaInstall";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = 1_800_000_000_000;

/** `localStorage` palsu: cukup untuk kontrak getItem/setItem yang dipakai modul ini. */
function fakeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => { map.set(key, value); },
    isi: () => map,
  };
}

const storageYangDiblokir = {
  getItem: (): string | null => { throw new Error("localStorage diblokir"); },
  setItem: (): void => { throw new Error("localStorage diblokir"); },
};

describe("shouldShowInstallPrompt", () => {
  it("menampilkan banner hanya kalau prompt tersedia dan belum terpasang/ditolak", () => {
    expect(shouldShowInstallPrompt({ hasPrompt: true, standalone: false, snoozed: false })).toBe(true);
  });

  it("tidak menampilkan banner tanpa beforeinstallprompt (tombol Pasang tidak akan bekerja)", () => {
    expect(shouldShowInstallPrompt({ hasPrompt: false, standalone: false, snoozed: false })).toBe(false);
  });

  it("tidak menampilkan banner saat sudah berjalan sebagai aplikasi terpasang", () => {
    expect(shouldShowInstallPrompt({ hasPrompt: true, standalone: true, snoozed: false })).toBe(false);
  });

  it("tidak menampilkan banner selama penolakan pengguna belum kedaluwarsa", () => {
    // Inilah kasus Huawei/EMUI: `appinstalled` tidak pernah menyala, jadi banner akan kembali
    // setiap reload kalau penolakan tidak disimpan.
    expect(shouldShowInstallPrompt({ hasPrompt: true, standalone: false, snoozed: true })).toBe(false);
  });
});

describe("isStandaloneLaunch", () => {
  it("mengenali mode standalone dari media query", () => {
    expect(isStandaloneLaunch([true, false, false], undefined)).toBe(true);
  });

  it("mengenali iOS lewat navigator.standalone", () => {
    expect(isStandaloneLaunch([false, false, false], true)).toBe(true);
  });

  it("tab browser biasa bukan mode standalone", () => {
    expect(isStandaloneLaunch([false, false, false], false)).toBe(false);
    expect(isStandaloneLaunch([], undefined)).toBe(false);
  });
});

describe("snoozeUntil", () => {
  it("menghitung batas waktu dalam hari", () => {
    expect(snoozeUntil(NOW, SNOOZE_DAYS_AFTER_DISMISS)).toBe(NOW + 90 * DAY_MS);
    expect(snoozeUntil(NOW, SNOOZE_DAYS_AFTER_PROMPT)).toBe(NOW + 365 * DAY_MS);
  });
});

describe("isSnoozed", () => {
  it("kosong/rusak berarti tidak di-snooze", () => {
    expect(isSnoozed(null, NOW)).toBe(false);
    expect(isSnoozed(undefined, NOW)).toBe(false);
    expect(isSnoozed("", NOW)).toBe(false);
    expect(isSnoozed("besok", NOW)).toBe(false);
  });

  it("membedakan batas waktu yang masih berlaku dan yang sudah lewat", () => {
    expect(isSnoozed(String(NOW + 1), NOW)).toBe(true);
    expect(isSnoozed(String(NOW), NOW)).toBe(false);
    expect(isSnoozed(String(NOW - 1), NOW)).toBe(false);
  });
});

describe("readInstallSnooze", () => {
  it("tanpa penyimpanan tersedia", () => {
    expect(readInstallSnooze(null, NOW)).toBe(false);
    expect(readInstallSnooze(undefined, NOW)).toBe(false);
  });

  it("membaca nilai tersimpan dari localStorage", () => {
    const storage = fakeStorage({ [INSTALL_SNOOZE_KEY]: String(NOW + 5 * DAY_MS) });
    expect(readInstallSnooze(storage, NOW)).toBe(true);
  });

  it("nilai kedaluwarsa berarti boleh ditawarkan lagi", () => {
    const storage = fakeStorage({ [INSTALL_SNOOZE_KEY]: String(NOW - 5 * DAY_MS) });
    expect(readInstallSnooze(storage, NOW)).toBe(false);
  });

  it("localStorage yang diblokir tidak membuat aplikasi error", () => {
    expect(readInstallSnooze(storageYangDiblokir, NOW)).toBe(false);
  });
});

describe("writeInstallSnooze", () => {
  it("menyimpan batas waktu sehingga pembacaan berikutnya mengembalikan true", () => {
    const storage = fakeStorage();
    writeInstallSnooze(storage, NOW, SNOOZE_DAYS_AFTER_DISMISS);
    expect(storage.isi().get(INSTALL_SNOOZE_KEY)).toBe(String(snoozeUntil(NOW, SNOOZE_DAYS_AFTER_DISMISS)));
    expect(readInstallSnooze(storage, NOW)).toBe(true);
  });

  it("setelah 90 hari penolakan tidak lagi menahan banner", () => {
    const storage = fakeStorage();
    writeInstallSnooze(storage, NOW, SNOOZE_DAYS_AFTER_DISMISS);
    expect(readInstallSnooze(storage, NOW + 89 * DAY_MS)).toBe(true);
    expect(readInstallSnooze(storage, NOW + 91 * DAY_MS)).toBe(false);
  });

  it("prompt yang sudah dijalankan menahan banner lebih lama (kasus pintasan EMUI)", () => {
    const storage = fakeStorage();
    writeInstallSnooze(storage, NOW, SNOOZE_DAYS_AFTER_PROMPT);
    expect(readInstallSnooze(storage, NOW + 180 * DAY_MS)).toBe(true);
  });

  it("tanpa penyimpanan / penyimpanan diblokir tetap tidak melempar error", () => {
    expect(() => writeInstallSnooze(null, NOW)).not.toThrow();
    expect(() => writeInstallSnooze(storageYangDiblokir, NOW)).not.toThrow();
  });
});

describe("safeLocalStorage", () => {
  it("selalu bisa dipanggil tanpa melempar error", () => {
    expect(() => safeLocalStorage()).not.toThrow();
  });
});
