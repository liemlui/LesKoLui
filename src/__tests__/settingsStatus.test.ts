import { describe, expect, it } from "vitest";
import {
  aiStatus,
  backupAge,
  backupSectionBadge,
  bankSectionBadge,
  pinSectionBadge,
  profileSectionBadge,
  settingsStatusRows,
  storageStatus,
} from "../lib/settingsStatus";

const NOW = new Date(2026, 9, 11, 12, 0); // 11 Oktober 2026, tengah hari lokal

/** Tanggal lokal `n` hari sebelum NOW, sebagai ISO. */
function hariLalu(n: number): string {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

describe("backupAge (G3-09 butir 3 dan 11)", () => {
  it("tanpa satu pun waktu backup: belum pernah, bernada peringatan", () => {
    const a = backupAge({}, NOW);
    expect(a.bucket).toBe("never");
    expect(a.days).toBeNull();
    expect(a.text).toBe("Belum pernah backup");
    expect(a.tone).toBe("warn");
  });

  it("waktu kosong atau berisi spasi diperlakukan sama dengan tidak ada", () => {
    expect(backupAge({ lastBackupAt: "" }, NOW).bucket).toBe("never");
    expect(backupAge({ lastBackupAt: "   " }, NOW).bucket).toBe("never");
    expect(backupAge({ lastBackupAt: null, driveBackupAt: undefined }, NOW).bucket).toBe("never");
  });

  it("hari ini dan kemarin disebut dengan kata", () => {
    expect(backupAge({ lastBackupAt: hariLalu(0) }, NOW).text).toBe("Hari ini");
    expect(backupAge({ lastBackupAt: hariLalu(1) }, NOW).text).toBe("Kemarin");
  });

  it("menghitung hari dan memisahkan yang masih segar dari yang sudah menua", () => {
    expect(backupAge({ lastBackupAt: hariLalu(7) }, NOW)).toMatchObject({ bucket: "fresh", days: 7, tone: "ok" });
    expect(backupAge({ lastBackupAt: hariLalu(12) }, NOW)).toMatchObject({ bucket: "stale", days: 12, tone: "warn" });
    expect(backupAge({ lastBackupAt: hariLalu(30) }, NOW)).toMatchObject({ bucket: "stale", tone: "warn" });
    expect(backupAge({ lastBackupAt: hariLalu(31) }, NOW)).toMatchObject({ bucket: "old", tone: "warn" });
  });

  it("memakai waktu TERBARU di antara backup berkas dan backup Drive", () => {
    // Tutor yang baru mengunggah ke Drive tidak boleh diberi tahu "belum backup".
    const a = backupAge({ lastBackupAt: hariLalu(40), driveBackupAt: hariLalu(2) }, NOW);
    expect(a.days).toBe(2);
    expect(a.text).toBe("2 hari lalu");
    expect(a.tone).toBe("ok");
  });

  it("Drive yang lebih tua tidak menutupi berkas yang lebih baru", () => {
    const a = backupAge({ lastBackupAt: hariLalu(1), driveBackupAt: hariLalu(60) }, NOW);
    expect(a.text).toBe("Kemarin");
  });

  it("tanggal rusak diperlakukan sebagai belum pernah, bukan '0 hari lalu'", () => {
    // Memberi tahu tutor bahwa backup-nya baru dibuat padahal stempel waktunya
    // rusak adalah kebohongan yang berbahaya di layar ini.
    expect(backupAge({ lastBackupAt: "bukan-tanggal" }, NOW).bucket).toBe("never");
    expect(backupAge({ lastBackupAt: "2026-13-45T99:99:99Z" }, NOW).bucket).toBe("never");
  });

  it("tanggal di masa depan diperlakukan sebagai belum pernah, bukan umur negatif", () => {
    const besok = new Date(NOW);
    besok.setDate(besok.getDate() + 3);
    const a = backupAge({ lastBackupAt: besok.toISOString() }, NOW);
    expect(a.bucket).toBe("never");
    expect(a.days).toBeNull();
    expect(a.text).toBe("Belum pernah backup");
  });

  it("satu tanggal rusak tidak membatalkan tanggal lain yang sah", () => {
    const a = backupAge({ lastBackupAt: "rusak", driveBackupAt: hariLalu(3) }, NOW);
    expect(a.days).toBe(3);
  });
});

describe("aiStatus (G3-09 butir 3)", () => {
  it("AI yang dimatikan tutor bukan cacat pengaturan", () => {
    const s = aiStatus({ enabled: false, hasApiKey: false });
    expect(s.tone).toBe("info");
    expect(s.text).toBe("Mati");
    expect(s.reason).toContain("tidak ada data yang dikirim");
  });

  it("AI hidup tanpa kunci disebut belum siap beserta alasannya", () => {
    const s = aiStatus({ enabled: true, hasApiKey: false });
    expect(s.tone).toBe("warn");
    expect(s.text).toBe("Belum siap");
    expect(s.reason).toContain("API Key");
  });

  it("AI hidup dengan kunci disebut aktif tanpa alasan tambahan", () => {
    const s = aiStatus({ enabled: true, hasApiKey: true });
    expect(s.tone).toBe("ok");
    expect(s.text).toBe("Aktif");
    expect(s.reason).toBeUndefined();
  });

  it("batas belanja yang terlampaui muncul di baris status", () => {
    // Keputusan B4: kosong berarti tanpa batas. Yang terlampaui hanya yang diisi.
    const s = aiStatus({ enabled: true, hasApiKey: true, usage: { terpakaiIdr: 60_000, batasIdr: 50_000, terlampaui: true, jumlahPanggilan: 12 } });
    expect(s.tone).toBe("warn");
    expect(s.text).toBe("Batas terlampaui");
    expect(s.reason).toContain("tombol AI nonaktif");
  });

  it("pemakaian yang belum terlampaui tidak mengubah nada", () => {
    const s = aiStatus({ enabled: true, hasApiKey: true, usage: { terpakaiIdr: 10_000, batasIdr: 50_000, terlampaui: false, jumlahPanggilan: 3 } });
    expect(s).toMatchObject({ tone: "ok", text: "Aktif" });
  });
});

describe("storageStatus (G3-09 butir 3 dan 8)", () => {
  it("menghitung persentase dan tetap tenang di bawah ambang", () => {
    expect(storageStatus({ used: 25, quota: 100 })).toMatchObject({ available: true, pct: 25, tone: "ok" });
  });

  it("di atas sembilan puluh persen berubah menjadi peringatan", () => {
    expect(storageStatus({ used: 95, quota: 100 }).tone).toBe("warn");
    expect(storageStatus({ used: 90, quota: 100 })).toMatchObject({ tone: "warn", pct: 90 });
  });

  it("kuota nol atau hilang menghasilkan 'tidak tersedia', bukan NaN% atau 0%", () => {
    // 0% akan membuat tutor mengira penyimpanannya kosong; NaN% merusak tampilan.
    for (const input of [{ used: 10, quota: 0 }, { used: 10 }, { used: null, quota: 100 }, { quota: 100 }]) {
      const s = storageStatus(input);
      expect(s.available).toBe(false);
      expect(s.pct).toBeNull();
      expect(s.text).toBe("Perkiraan tidak tersedia");
    }
  });

  it("persentase tidak pernah melebihi seratus walau perkiraan peramban aneh", () => {
    expect(storageStatus({ used: 500, quota: 100 }).pct).toBe(100);
  });
});

describe("settingsStatusRows — tiga baris di bawah judul (G3-09 butir 3)", () => {
  it("selalu tiga baris dengan urutan yang mengikat: backup, AI, penyimpanan", () => {
    const rows = settingsStatusRows({
      backup: { lastBackupAt: hariLalu(2) },
      ai: { enabled: true, hasApiKey: true },
      storage: { used: 1, quota: 100 },
      now: NOW,
    });
    expect(rows.map((r) => r.id)).toEqual(["backup", "ai", "penyimpanan"]);
    expect(rows.map((r) => r.label)).toEqual(["Backup terakhir", "AI", "Penyimpanan"]);
  });

  it("setiap baris punya pintasan ke bagiannya dan teks tombol yang pendek", () => {
    const rows = settingsStatusRows({
      backup: {}, ai: { enabled: false, hasApiKey: false }, storage: {}, now: NOW,
    });
    expect(rows.map((r) => r.section)).toEqual(["backup", "ai", "aplikasi"]);
    for (const r of rows) expect(r.action.length, `tombol "${r.action}" terlalu panjang untuk lebar 390 px`).toBeLessThanOrEqual(10);
  });

  it("keadaan paling perlu perhatian tampil sebagai peringatan, bukan angka netral", () => {
    const rows = settingsStatusRows({
      backup: {}, ai: { enabled: false, hasApiKey: false }, storage: {}, now: NOW,
    });
    expect(rows[0].tone).toBe("warn");
    expect(rows[0].value).toBe("Belum pernah backup");
    // AI mati = info (pilihan tutor), penyimpanan tak tersedia = info (batas peramban).
    expect(rows[1].tone).toBe("info");
    expect(rows[2].tone).toBe("info");
  });
});

describe("badge keadaan per bagian (G3-09 butir 11)", () => {
  it("badge backup memakai kalimat umur yang sama dengan baris status", () => {
    expect(backupSectionBadge({ lastBackupAt: hariLalu(12) }, NOW)).toEqual({ text: "12 hari lalu", tone: "warn" });
    expect(backupSectionBadge({}, NOW)).toEqual({ text: "Belum pernah backup", tone: "warn" });
  });

  it("badge profil menghitung empat kolom dan menyebut lengkap hanya saat keempatnya terisi", () => {
    expect(profileSectionBadge({ name: "Ko Lui", phone: "0812", email: "a@b.c", address: "Jl. 1" })).toEqual({ text: "Profil lengkap", tone: "ok" });
    expect(profileSectionBadge({ name: "Ko Lui", phone: "0812" })).toEqual({ text: "Profil 2 dari 4", tone: "info" });
    expect(profileSectionBadge({})).toEqual({ text: "Profil 0 dari 4", tone: "warn" });
    expect(profileSectionBadge({ name: "   ", phone: "" }).text).toBe("Profil 0 dari 4");
  });

  it("badge PIN hanya menyatakan ada atau belum, tanpa pernah membocorkan isinya", () => {
    expect(pinSectionBadge(true)).toEqual({ text: "Aktif", tone: "ok" });
    expect(pinSectionBadge(false)).toEqual({ text: "Belum diisi", tone: "warn" });
  });

  it("badge rekening menghitung rekening terisi dan mendorong pengisian saat kosong", () => {
    expect(bankSectionBadge(undefined)).toEqual({ text: "Belum diisi", tone: "warn" });
    expect(bankSectionBadge({ bca: "", mandiri: "  " })).toEqual({ text: "Belum diisi", tone: "warn" });
    expect(bankSectionBadge({ bca: "123", ewallet: "0812" })).toEqual({ text: "2 rekening", tone: "ok" });
  });
});
