import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Settings } from "../db/types";
import { buatBackupHandlers, type BackupHandlersDeps } from "../screens/settings/backupHandlers";
import type { JalurPemulihan } from "../screens/settings/useBackupSection";
import { MIN_PASS } from "../lib/passphrase";

/**
 * Penjaga jalur PIN backup & pemulihan.
 *
 * **Kenapa berkas ini ada.** Di rilis v1.99.0 (G3-09 tahap 2) blok backup dipindah
 * ke `settings/BackupSection.tsx`, dan keadaan kata sandinya ikut pindah — sementara
 * `Settings.tsx` membuat pengubah ini dengan `backupPass: ""` yang dikunci harfiah.
 * Karena `buatBackupHandlers` sama sekali tidak punya tes, tidak ada yang menangkap
 * bahwa SETIAP aksi lewat PIN (Backup ke File, Backup ke Drive, Restore, Verifikasi
 * Drive) selalu membaca sandi kosong dan berhenti di pemeriksaan `!backupPass`.
 *
 * Tes di bawah mengikat janji yang paling dasar: **sandi yang diberikan ke pembuat
 * handler adalah sandi yang dipakai untuk mengenkripsi.** Kalau seseorang mengunci
 * `backupPass` lagi, tes ini gagal — tanpa perlu DOM.
 */

vi.mock("../lib/backup", () => ({
  exportBackup: vi.fn(async (pass: string) => new Blob([`terenkripsi:${pass}`])),
  importBackup: vi.fn(async () => undefined),
  inspectBackup: vi.fn(async () => ({
    exportedAt: "2026-10-14T00:00:00.000Z",
    tableCounts: { students: 3, sessions: 5, reports: 1, payments: 2 },
  })),
}));
vi.mock("../lib/driveBackup", () => ({
  downloadBackupFromDrive: vi.fn(async () => new Blob(["dari-drive"])),
  findDriveBackup: vi.fn(async () => ({ id: "file-1", modifiedTime: "2026-10-14T00:00:00.000Z" })),
  isDriveConfigured: vi.fn(() => true),
  testRelay: vi.fn(async () => undefined),
  uploadBackupToDrive: vi.fn(async () => "file-baru"),
}));
vi.mock("../db/repos", () => ({
  logAudit: vi.fn(async () => undefined),
  saveSettings: vi.fn(async () => undefined),
}));
vi.mock("../lib/exportData", () => ({ exportDataCsvBlob: vi.fn(async () => new Blob(["csv"])) }));
vi.mock("../lib/download", () => ({ downloadBlob: vi.fn() }));
vi.mock("../lib/format", () => ({ todayWIB: () => "2026-10-14" }));

import { exportBackup, importBackup, inspectBackup } from "../lib/backup";
import { uploadBackupToDrive } from "../lib/driveBackup";
import { saveSettings } from "../db/repos";
import { downloadBlob } from "../lib/download";

const SANDI = "apel-baju-cabe-dadu-elang-fajar";

function makeSettings(): Settings {
  return {
    id: "app", tutorProfile: { name: "Ko Lui", phone: "0812" }, defaultRate: 100_000, paymentInfo: "",
    subjects: ["Matematika"], ai: { enabled: true, apiKey: "key", model: "deepseek-chat" },
    bankAccounts: { bca: "123", accountName: "Ko Lui" },
    lastBackupAt: "2026-09-01T00:00:00.000Z", templatePref: {},
  };
}

function jalurPalsu(): JalurPemulihan {
  return {
    busy: { busy: false, stepLabel: null },
    mulai: vi.fn(), tahap: vi.fn(), selesai: vi.fn(),
    verifying: false, setVerifying: vi.fn(),
    relayBusy: false, setRelayBusy: vi.fn(),
    peringatan: null,
    jembatanPeringatan: { jawab: vi.fn() },
    tanyaPeringatan: vi.fn(async () => true),
  } as unknown as JalurPemulihan;
}

function buat(backupPass: string) {
  const log: string[] = [];
  const deps: BackupHandlersDeps = {
    jalur: jalurPalsu(),
    backupPass,
    driveAuto: false,
    form: makeSettings(),
    setForm: vi.fn(),
    markBackupReminderCurrent: vi.fn(),
    toast: {
      info: (m: string) => log.push(`info:${m}`),
      success: (m: string) => log.push(`ok:${m}`),
      error: (m: string) => log.push(`err:${m}`),
    },
    onDriveAutoChange: vi.fn(),
    minPass: MIN_PASS,
    muatUlang: vi.fn(),
  };
  return { aksi: buatBackupHandlers(deps), log };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("backupHandlers — kata sandi yang diberikan HARUS yang dipakai (regresi v1.99.0)", () => {
  it("Backup ke File: sandi panjang diteruskan ke exportBackup dan berkas diunduh", async () => {
    const { aksi, log } = buat(SANDI);
    await aksi.doExportBackup();

    // Yang diuji bukan sekadar "tidak ada pesan error", tapi bahwa sandi yang
    // diketik BENAR-BENAR sampai ke lapisan enkripsi.
    expect(exportBackup).toHaveBeenCalledWith(SANDI);
    expect(downloadBlob).toHaveBeenCalledTimes(1);
    expect(log).toContain("ok:Backup berhasil diunduh ✓");
    expect(log.some((l) => l.startsWith("info:"))).toBe(false);
  });

  it("Backup ke Drive: sandi panjang diteruskan, diunggah, dan fileId disimpan", async () => {
    const { aksi, log } = buat(SANDI);
    await aksi.doDriveBackup();

    expect(exportBackup).toHaveBeenCalledWith(SANDI);
    expect(uploadBackupToDrive).toHaveBeenCalledTimes(1);
    expect(saveSettings).toHaveBeenCalledWith(
      expect.objectContaining({ driveBackup: expect.objectContaining({ fileId: "file-baru" }) }),
    );
    expect(log).toContain("ok:Backup ke Google Drive berhasil ✓");
  });

  it("Restore dari File: sandi yang sama dipakai untuk mendekripsi berkas yang dipilih", async () => {
    const { aksi, log } = buat(SANDI);
    const berkas = new File(["isi"], "backup.jles");
    await aksi.doRestore(berkas);

    expect(importBackup).toHaveBeenCalledWith(berkas, SANDI, expect.anything());
    expect(log).toContain("ok:Restore berhasil! Memuat ulang... ✓");
  });

  it("Cek file bisa dibuka: sandi diteruskan ke inspectBackup", async () => {
    const { aksi } = buat(SANDI);
    await aksi.cekBerkasBisaDibuka(new File(["isi"], "backup.jles"));

    expect(inspectBackup).toHaveBeenCalledWith(expect.any(File), SANDI);
  });

  it("Verifikasi backup Drive: sandi diteruskan ke inspectBackup, bukan hanya dicek kosong", async () => {
    const { aksi, log } = buat(SANDI);
    await aksi.doVerifyDrive();

    expect(inspectBackup).toHaveBeenCalledWith(expect.any(Blob), SANDI);
    expect(log.some((l) => l.startsWith("ok:Backup valid"))).toBe(true);
  });

  it("sandi tersimpan di perangkat saat auto backup dinyalakan", () => {
    // Lingkungan tes di sini node (bukan jsdom), jadi `localStorage` di-stub dan
    // isinya diperiksa lewat peta — bukan lewat global yang tidak ada.
    const tersimpan = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => tersimpan.get(k) ?? null,
      setItem: (k: string, v: string) => { tersimpan.set(k, v); },
      removeItem: (k: string) => { tersimpan.delete(k); },
    });

    const { aksi, log } = buat(SANDI);
    aksi.toggleDriveAuto(true);

    expect(tersimpan.get("leskolui_drive_pass")).toBe(SANDI);
    expect(log).toContain("ok:Auto backup Drive aktif ✓ (kata sandi enkripsi tersimpan di perangkat)");

    vi.unstubAllGlobals();
  });
});

describe("backupHandlers — sandi kosong/terlalu pendek tetap ditolak dengan pesannya", () => {
  it("sandi kosong: Backup ke File menyebut 'Masukkan kata sandi backup!'", async () => {
    const { aksi, log } = buat("");
    await aksi.doExportBackup();

    expect(exportBackup).not.toHaveBeenCalled();
    expect(log).toContain("info:Masukkan kata sandi backup!");
  });

  it("sandi kosong: Backup ke Drive menyebut batas minimum, bukan diam", async () => {
    const { aksi, log } = buat("");
    await aksi.doDriveBackup();

    expect(exportBackup).not.toHaveBeenCalled();
    expect(log).toContain(`info:Kata sandi enkripsi minimal ${MIN_PASS} karakter!`);
  });

  it("sandi lebih pendek dari batas minimum ditolak", async () => {
    const { aksi, log } = buat("apel");
    await aksi.doExportBackup();

    expect(exportBackup).not.toHaveBeenCalled();
    expect(log).toContain(`info:Kata sandi minimal ${MIN_PASS} karakter!`);
  });

  it("tepat di batas minimum sudah diterima (bukan off-by-one)", async () => {
    const { aksi } = buat("a".repeat(MIN_PASS));
    await aksi.doExportBackup();

    expect(exportBackup).toHaveBeenCalledWith("a".repeat(MIN_PASS));
  });
});
