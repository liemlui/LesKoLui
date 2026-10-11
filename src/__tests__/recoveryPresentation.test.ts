import { describe, expect, it } from "vitest";
import type { ImportProgressStep } from "../lib/backup";
import {
  RECOVERY_STEP_LABEL,
  RESET_CONFIRM_WORD,
  RESTORE_CONFIRM_WORD,
  confirmButtonEnabled,
  confirmWordMatches,
  formatBytes,
  recoveryBusyState,
  recoveryButtonEnabled,
  recoveryTargetSummary,
} from "../lib/recoveryPresentation";

describe("RECOVERY_STEP_LABEL (G3-09 butir 5)", () => {
  it("mempunyai kalimat untuk SETIAP tahap impor", () => {
    // `Record<ImportProgressStep, string>` membuat `tsc` menolak kunci yang
    // hilang; tes ini menjaga bagian lain: kalimatnya tidak boleh kosong.
    const steps: ImportProgressStep[] = ["decrypt", "decode-media", "validate", "pre-restore-backup", "write"];
    for (const s of steps) {
      expect(RECOVERY_STEP_LABEL[s], `kalimat kosong untuk tahap ${s}`).toBeTruthy();
      expect(RECOVERY_STEP_LABEL[s].trim()).not.toBe("");
    }
  });

  it("menyebut istilah antarmuka yang berlaku: Kata Sandi Enkripsi, bukan passphrase", () => {
    // Glosarium G3-08: "kata sandi enkripsi" menggantikan "passphrase" di antarmuka.
    expect(RECOVERY_STEP_LABEL.decrypt).toContain("Kata Sandi Enkripsi");
    expect(RECOVERY_STEP_LABEL.decrypt.toLowerCase()).not.toContain("passphrase");
  });
});

describe("recoveryBusyState — satu keadaan sibuk untuk empat tombol (G3-09 butir 5)", () => {
  it("tidak ada jalur berjalan: tidak sibuk dan tidak ada kalimat tahap", () => {
    const s = recoveryBusyState(null, null);
    expect(s).toEqual({ busy: false, running: null, othersDisabled: false, stepLabel: "" });
  });

  it("menampilkan kalimat tahap yang sesuai saat jalur berjalan", () => {
    const s = recoveryBusyState("restoreFile", "write");
    expect(s.busy).toBe(true);
    expect(s.running).toBe("restoreFile");
    expect(s.othersDisabled).toBe(true);
    expect(s.stepLabel).toBe(RECOVERY_STEP_LABEL.write);
  });

  it("jalur yang berjalan tanpa tahap belum menyebut tahap yang menyesatkan", () => {
    // Menampilkan "Mendekripsi backup..." sementara tidak ada proses dekripsi
    // membuat tutor menunggu sesuatu yang tidak terjadi.
    const s = recoveryBusyState("backupFile", null);
    expect(s.busy).toBe(true);
    expect(s.stepLabel).toBe("Menyiapkan...");
    expect(s.stepLabel).not.toBe(RECOVERY_STEP_LABEL.decrypt);
  });
});

describe("recoveryButtonEnabled", () => {
  it("tombol lain nonaktif selama satu jalur berjalan", () => {
    const s = recoveryBusyState("restoreDrive", "decrypt");
    expect(recoveryButtonEnabled(s, "restoreDrive")).toBe(true);
    expect(recoveryButtonEnabled(s, "restoreFile")).toBe(false);
    expect(recoveryButtonEnabled(s, "backupFile")).toBe(false);
    expect(recoveryButtonEnabled(s, "backupDrive")).toBe(false);
  });

  it("saat tidak ada yang berjalan, keempat tombol bisa ditekan", () => {
    const s = recoveryBusyState(null, null);
    for (const a of ["restoreFile", "restoreDrive", "backupFile", "backupDrive"] as const) {
      expect(recoveryButtonEnabled(s, a)).toBe(true);
    }
  });
});

describe("recoveryTargetSummary — ringkasan sasaran pemulihan (G3-09 butir 7)", () => {
  it("selalu menyebut jumlah murid dan sesi sebelum data ditimpa", () => {
    const rows = recoveryTargetSummary({ students: 12, sessions: 340 });
    expect(rows.map((r) => r.label)).toContain("Murid di backup");
    expect(rows.map((r) => r.label)).toContain("Sesi di backup");
    expect(rows.find((r) => r.label === "Murid di backup")?.value).toBe("12 murid");
    expect(rows.find((r) => r.label === "Sesi di backup")?.value).toBe("340 sesi");
  });

  it("menuliskan pemisah ribuan supaya jumlah besar tidak salah baca", () => {
    const rows = recoveryTargetSummary({ students: 1234, sessions: 98765 });
    expect(rows[0].value).toBe("1.234 murid");
    expect(rows[1].value).toBe("98.765 sesi");
  });

  it("tanggal backup ditulis lengkap dengan waktu, bukan ISO mentah", () => {
    const rows = recoveryTargetSummary({ students: 1, sessions: 1, createdAt: new Date(2026, 9, 11, 14, 3).toISOString() });
    const value = rows.find((r) => r.label === "Backup dibuat")?.value ?? "";
    expect(value).not.toContain("T");
    expect(value).toMatch(/2026/);
    expect(value).toMatch(/14[.:]03/);
  });

  it("berkas tanpa tanggal mengatakannya apa adanya, bukan mengarang tanggal", () => {
    const rows = recoveryTargetSummary({ students: 1, sessions: 1, createdAt: null });
    expect(rows.find((r) => r.label === "Backup dibuat")?.value).toBe("tanggal tidak tercatat di berkas");
  });

  it("ukuran berkas dan nama berkas hanya muncul kalau memang diketahui", () => {
    const tanpa = recoveryTargetSummary({ students: 1, sessions: 1 });
    expect(tanpa.map((r) => r.label)).not.toContain("Ukuran berkas");
    expect(tanpa.map((r) => r.label)).not.toContain("Berkas");

    const dengan = recoveryTargetSummary({ students: 1, sessions: 1, sizeBytes: 10 * 1024 * 1024, fileName: "backup-leskolui.json" });
    expect(dengan.find((r) => r.label === "Ukuran berkas")?.value).toBe("10.0 MB");
    expect(dengan.find((r) => r.label === "Berkas")?.value).toBe("backup-leskolui.json");
  });
});

describe("formatBytes", () => {
  it("memilih satuan yang masuk akal", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(1024 * 1024)).toBe("1.0 MB");
    expect(formatBytes(22.3 * 1024 * 1024)).toBe("22.3 MB");
  });

  it("nilai tidak masuk akal tidak menghasilkan 'NaN' di layar", () => {
    expect(formatBytes(-1)).toBe("tidak diketahui");
    expect(formatBytes(Number.NaN)).toBe("tidak diketahui");
    expect(formatBytes(Number.POSITIVE_INFINITY)).toBe("tidak diketahui");
  });
});

describe("kata konfirmasi yang diketik (G3-09 butir 7)", () => {
  it("menerima kata yang tepat, tanpa peduli spasi tepi dan besar-kecil huruf", () => {
    // Tutor mengetik di papan ketik HP; menolak "hapus data" hanya karena huruf
    // besar akan membuat jalur reset yang memang disengaja jadi mustahil.
    expect(confirmWordMatches("HAPUS DATA", RESET_CONFIRM_WORD)).toBe(true);
    expect(confirmWordMatches("  hapus data  ", RESET_CONFIRM_WORD)).toBe(true);
    expect(confirmWordMatches("Hapus Data", RESET_CONFIRM_WORD)).toBe(true);
    expect(confirmWordMatches("PULIHKAN", RESTORE_CONFIRM_WORD)).toBe(true);
  });

  it("menolak kata yang salah, kosong, atau setengah", () => {
    expect(confirmWordMatches("", RESET_CONFIRM_WORD)).toBe(false);
    expect(confirmWordMatches("hapus", RESET_CONFIRM_WORD)).toBe(false);
    expect(confirmWordMatches("hapus data sekarang", RESET_CONFIRM_WORD)).toBe(false);
    expect(confirmWordMatches("PULIHKAN", RESET_CONFIRM_WORD)).toBe(false);
  });

  it("tombol konfirmasi memakai aturan yang sama dengan pemeriksaan kata", () => {
    expect(confirmButtonEnabled("HAPUS DATA", RESET_CONFIRM_WORD)).toBe(true);
    expect(confirmButtonEnabled("hapus", RESET_CONFIRM_WORD)).toBe(false);
  });

  it("kata reset dan kata pulihkan memang berbeda, jadi tidak mungkin tertukar", () => {
    expect(RESET_CONFIRM_WORD).not.toBe(RESTORE_CONFIRM_WORD);
    expect(confirmWordMatches(RESET_CONFIRM_WORD, RESTORE_CONFIRM_WORD)).toBe(false);
  });
});
