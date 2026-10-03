import { describe, expect, it } from "vitest";
import { settingsLoadGate, SETTINGS_LOAD_TIMEOUT_MS, storageUsageState } from "../lib/settingsPresentation";

/**
 * G1-07 — keadaan memuat vs gagal di layar Pengaturan (audit L-09).
 *
 * Diuji sebagai fungsi murni: suite ini belum punya React Testing Library, jadi
 * keputusan itu sengaja dikeluarkan dari komponen 1.300 baris `Settings.tsx`.
 */
describe("settingsLoadGate (audit L-09)", () => {
  const loaded = { settingsLoaded: true, formReady: true, error: null, timedOut: false };

  it("menampilkan form hanya saat data DAN form siap", () => {
    expect(settingsLoadGate(loaded)).toBe("ready");
  });

  it("masih memuat selama salah satu belum siap", () => {
    expect(settingsLoadGate({ ...loaded, settingsLoaded: false })).toBe("loading");
    expect(settingsLoadGate({ ...loaded, formReady: false })).toBe("loading");
    expect(settingsLoadGate({ settingsLoaded: false, formReady: false, error: null, timedOut: false }))
      .toBe("loading");
  });

  it("kegagalan baca menang atas keadaan memuat", () => {
    // Inti L-09: `getSettings()` yang menolak membuat `settings` TETAP undefined.
    // Kalau urutan pemeriksaannya salah, layar menggantung selamanya.
    expect(settingsLoadGate({ settingsLoaded: false, formReady: false, error: "penyimpanan terkunci", timedOut: false }))
      .toBe("failed");
    expect(settingsLoadGate({ ...loaded, error: "penyimpanan terkunci" })).toBe("failed");
  });

  it("melewati batas tunggu juga dianggap gagal", () => {
    expect(settingsLoadGate({ settingsLoaded: false, formReady: false, error: null, timedOut: true }))
      .toBe("failed");
    expect(settingsLoadGate({ settingsLoaded: false, formReady: false, error: null, timedOut: false }))
      .toBe("loading");
  });

  it("batas tunggu cukup lama untuk perangkat lambat, tetapi tetap berujung", () => {
    expect(SETTINGS_LOAD_TIMEOUT_MS).toBeGreaterThanOrEqual(5000);
    expect(SETTINGS_LOAD_TIMEOUT_MS).toBeLessThanOrEqual(15000);
  });
});

/**
 * G1-08 — baris "Penyimpanan Lokal" tidak boleh hilang diam-diam (temuan S-10).
 * Dulu `StorageUsage` mengembalikan `null` saat estimasi gagal, jadi tutor tidak tahu
 * apakah penyimpanannya penuh atau fiturnya memang tidak ada.
 */
describe("storageUsageState (audit S-10)", () => {
  it("siap saat usage & quota tersedia", () => {
    expect(storageUsageState({ usage: 1024, quota: 2048 })).toBe("ready");
    expect(storageUsageState({ usage: 0, quota: 1024 })).toBe("ready");
  });

  it("tidak tersedia saat estimasi gagal atau API tidak ada", () => {
    expect(storageUsageState(null)).toBe("unavailable");
    expect(storageUsageState({})).toBe("unavailable");
    expect(storageUsageState({ usage: 1024 })).toBe("unavailable");
    expect(storageUsageState({ quota: 1024 })).toBe("unavailable");
  });
});
