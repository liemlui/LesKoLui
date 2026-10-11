import { describe, expect, it } from "vitest";
import {
  detectInstallPlatform,
  installEntryHint,
  installInstructions,
  offlineState,
  persistState,
  type InstallPlatform,
} from "../lib/appSettingsStatus";

const UA = {
  iphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  ipadLama: "Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
  // iPadOS 13+ mengaku sebagai macOS — hanya jumlah titik sentuh yang membedakannya.
  ipadBaru: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  mac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  android: "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36",
  windows: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  linux: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
};

describe("detectInstallPlatform", () => {
  it("mengenali iPhone dan iPod sebagai iOS", () => {
    expect(detectInstallPlatform(UA.iphone)).toBe("ios");
    expect(detectInstallPlatform("Mozilla/5.0 (iPod touch; CPU iPhone OS 15_0 like Mac OS X)")).toBe("ios");
  });

  it("mengenali iPad lama lewat user agent-nya", () => {
    expect(detectInstallPlatform(UA.ipadLama)).toBe("ios");
  });

  it("mengenali iPadOS 13+ yang mengaku macOS lewat jumlah titik sentuh", () => {
    // Tanpa pemeriksaan titik sentuh, iPad baru akan diberi petunjuk komputer
    // yang tidak punya ikon pasang di bilah alamat.
    expect(detectInstallPlatform(UA.ipadBaru, 5)).toBe("ios");
  });

  it("Mac sungguhan tetap dianggap desktop", () => {
    expect(detectInstallPlatform(UA.mac, 0)).toBe("desktop");
    expect(detectInstallPlatform(UA.mac, 1)).toBe("desktop");
  });

  it("mengenali Android, Windows, dan Linux", () => {
    expect(detectInstallPlatform(UA.android)).toBe("android");
    expect(detectInstallPlatform(UA.windows)).toBe("desktop");
    expect(detectInstallPlatform(UA.linux)).toBe("desktop");
  });

  it("user agent yang tidak dikenali menghasilkan 'unknown', bukan tebakan", () => {
    expect(detectInstallPlatform("")).toBe("unknown");
    expect(detectInstallPlatform("Peramban Aneh/1.0")).toBe("unknown");
  });
});

describe("installInstructions — pintu pemasangan manual (G3-09 butir 10)", () => {
  it("iPhone mendapat petunjuk Safari beserta empat langkah yang urut", () => {
    // Banner Pasang di PwaPrompts.tsx TIDAK PERNAH muncul di iOS karena
    // `beforeinstallprompt` tidak ditembakkan Safari — inilah satu-satunya jalan.
    const p = installInstructions("ios");
    expect(p.alreadyInstalled).toBe(false);
    expect(p.title).toContain("Safari");
    expect(p.note).toContain("Safari");
    expect(p.steps.map((s) => s.no)).toEqual([1, 2, 3, 4]);
    expect(p.steps[1].text).toContain("Bagikan");
    expect(p.steps[2].text).toContain("Tambahkan ke Layar Utama");
    expect(p.steps[3].text).toContain("Tambah");
  });

  it("Android mendapat petunjuk Chrome lewat menu", () => {
    const p = installInstructions("android");
    expect(p.title).toContain("Android");
    expect(p.steps.map((s) => s.no)).toEqual([1, 2, 3, 4]);
    expect(p.steps[1].text).toContain("⋮");
  });

  it("komputer mendapat petunjuk bilah alamat", () => {
    const p = installInstructions("desktop");
    expect(p.steps.map((s) => s.no)).toEqual([1, 2, 3]);
    expect(p.steps[1].text).toContain("bilah alamat");
  });

  it("platform yang tidak dikenali tetap mendapat langkah, bukan daftar kosong", () => {
    const p = installInstructions("unknown");
    expect(p.steps.length).toBeGreaterThan(0);
    expect(p.note.trim()).not.toBe("");
  });

  it("aplikasi yang sudah terpasang tidak diberi langkah pemasangan lagi", () => {
    const p = installInstructions("ios", { alreadyInstalled: true });
    expect(p.alreadyInstalled).toBe(true);
    expect(p.steps).toEqual([]);
    expect(p.title).toBe("Sudah terpasang");
  });

  it("setiap platform punya judul dan catatan yang terisi", () => {
    const platforms: InstallPlatform[] = ["ios", "android", "desktop", "unknown"];
    for (const platform of platforms) {
      const p = installInstructions(platform);
      expect(p.title.trim(), `judul kosong untuk ${platform}`).not.toBe("");
      expect(p.note.trim(), `catatan kosong untuk ${platform}`).not.toBe("");
      for (const step of p.steps) expect(step.text.trim()).not.toBe("");
    }
  });
});

describe("installEntryHint", () => {
  it("menjelaskan kenapa aplikasi ini tidak ada di toko aplikasi", () => {
    expect(installEntryHint("ios")).toContain("App Store");
    expect(installEntryHint("android")).toContain("toko aplikasi");
  });
});

describe("offlineState (G3-09 butir 10)", () => {
  it("tanpa service worker yang mengendalikan halaman: belum siap offline", () => {
    const s = offlineState({ controlled: false, onLine: true });
    expect(s.tone).toBe("warn");
    expect(s.text).toBe("Belum siap offline");
  });

  it("kesimpulan ditentukan service worker, bukan navigator.onLine", () => {
    // Justru saat offline-lah `onLine` bernilai false, sehingga menyimpulkan dari
    // situ akan menyesatkan orang yang paling butuh informasi ini.
    expect(offlineState({ controlled: true, onLine: false }).text).toBe("Siap offline");
    expect(offlineState({ controlled: true, onLine: false }).tone).toBe("ok");
    expect(offlineState({ controlled: false, onLine: false }).text).toBe("Belum siap offline");
  });

  it("penjelasannya berbeda antara sedang online dan sedang offline", () => {
    const online = offlineState({ controlled: false, onLine: true }).detail;
    const offline = offlineState({ controlled: false, onLine: false }).detail;
    expect(online).not.toBe(offline);
    expect(offline).toContain("tanpa internet");
    expect(offlineState({ controlled: true, onLine: false }).detail).toContain("memang cara kerjanya");
  });
});

describe("persistState (G3-09 butir 10)", () => {
  it("penyimpanan yang sudah permanen dinyatakan tenang", () => {
    expect(persistState({ persisted: true }).tone).toBe("ok");
    expect(persistState({ persisted: true }).text).toBe("Penyimpanan permanen");
  });

  it("penyimpanan yang belum permanen menyebut risikonya dan mendorong backup", () => {
    // `persist()` dipanggil di App.tsx dan hasilnya sering false sampai aplikasi
    // dipasang; keadaan itu menyangkut data, jadi tidak boleh hanya ada di konsol.
    const s = persistState({ persisted: false });
    expect(s.tone).toBe("warn");
    expect(s.text).toBe("Penyimpanan belum permanen");
    expect(s.detail).toContain("backup");
    expect(s.detail).toContain("dibuang");
  });
});
