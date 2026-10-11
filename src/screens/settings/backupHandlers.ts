import { exportBackup, importBackup, inspectBackup } from "../../lib/backup";
import { logAudit, saveSettings } from "../../db/repos";
import {
  downloadBackupFromDrive, findDriveBackup, isDriveConfigured,
  testRelay, uploadBackupToDrive,
} from "../../lib/driveBackup";
import { exportDataCsvBlob } from "../../lib/exportData";
import { downloadBlob } from "../../lib/download";
import { todayWIB } from "../../lib/format";
import type { Settings } from "../../db/types";
import type { JalurPemulihan } from "./useBackupSection";

/**
 * Pengubah jalur backup & pemulihan, dipisah dari komponennya.
 *
 * Dua alasan:
 * 1. **Berkas komponen tidak boleh mengekspor bukan-komponen**
 *    (`react-refresh/only-export-components`) — kalau tidak, HMR mati. Jebakan
 *    yang sudah dua kali memakan waktu di repo ini (G3-06, lalu G3-09).
 * 2. Bagian "Backup dan Restore" adalah blok JSX terbesar di layar Pengaturan,
 *    jadi mengeluarkan pengubahnya sekaligus membuat berkas layarnya turun.
 *
 * Yang **tidak** dipindah: keadaan (`useState`) tetap di komponen. Modul ini
 * hanya berisi fungsi yang menerima keadaan itu sebagai argumen, sehingga
 * tingkah lakunya bisa dibaca tanpa membaca seluruh komponennya.
 */

export interface BackupHandlersDeps {
  /** Jalur pemulihan: satu keadaan sibuk bersama untuk empat tombol. */
  jalur: JalurPemulihan;
  /** Kata sandi enkripsi yang sedang diketik tutor. */
  backupPass: string;
  /** Apakah backup otomatis Drive sedang menyala (untuk label toggle). */
  driveAuto: boolean;
  /** Bentuk `Settings` yang sedang terbuka di layar (belum tentu tersimpan). */
  form: Settings;
  /** Samakan form setelah metadata backup ditulis (mis. `lastBackupAt`). */
  setForm: (updater: (f: Settings | null) => Settings | null) => void;
  /** Penanda pengingat backup supaya ajakan mingguan tidak muncul tepat sesudahnya. */
  markBackupReminderCurrent: () => void;
  toast: {
    info: (m: string) => void;
    success: (m: string) => void;
    error: (m: string) => void;
  };
  /** Dipanggil setelah setelan auto backup Drive berubah, supaya layar menyamakan toggle-nya. */
  onDriveAutoChange?: (v: boolean) => void;
  /** Kata sandi minimum yang berlaku (dari `lib/passphrase.ts`). */
  minPass: number;
  /** Muat ulang halaman setelah restore berhasil. */
  muatUlang: (delayMs: number) => void;
}

export interface BackupHandlers {
  doExportBackup: () => Promise<void>;
  doRestore: (berkas: File | undefined) => Promise<void>;
  doDriveBackup: () => Promise<void>;
  doDriveRestore: () => Promise<void>;
  doExportCsv: () => Promise<void>;
  doVerifyDrive: () => Promise<void>;
  cekBerkasBisaDibuka: (berkas: File | undefined) => Promise<void>;
  saveRelaySecret: (v: string) => void;
  doTestRelay: () => Promise<void>;
  toggleDriveAuto: (v: boolean) => void;
}

/** Kunci penyimpanan setelan backup otomatis (nilai tidak berubah). */
export const DRIVE_AUTO_KEY = "leskolui_drive_auto";
export const DRIVE_PASS_KEY = "leskolui_drive_pass";
export const RELAY_SECRET_KEY = "leskolui_relay_secret";

export function buatBackupHandlers(deps: BackupHandlersDeps): BackupHandlers {
  const { jalur, backupPass, form, setForm, toast, minPass, muatUlang } = deps;

  const doExportBackup = async () => {
    if (!backupPass) { toast.info("Masukkan kata sandi backup!"); return; }
    if (backupPass.length < minPass) { toast.info(`Kata sandi minimal ${minPass} karakter!`); return; }
    const blob = await exportBackup(backupPass);
    downloadBlob(blob, `leskolui-backup-${todayWIB()}.jles`);
    const lastBackupAt = new Date().toISOString();
    await saveSettings({ lastBackupAt });
    setForm((f) => (f ? { ...f, lastBackupAt } : f));
    deps.markBackupReminderCurrent();
    toast.success("Backup berhasil diunduh ✓");
  };

  const doRestore = async (berkas: File | undefined) => {
    if (!berkas || !backupPass) { toast.info("Pilih file dan masukkan kata sandi!"); return; }
    // Kabari tutor bahwa proses ini memang panjang (dekripsi + decode ribuan foto
    // bisa puluhan detik). Tanpa ini, layar yang "diam" terbaca sebagai gagal —
    // lalu halaman ditutup di tengah proses.
    jalur.mulai("restoreFile");
    try {
      await importBackup(berkas, backupPass, {
        onProgress: jalur.tahap,
        onValidationWarnings: jalur.tanyaPeringatan,
      });
    } finally {
      jalur.selesai();
    }
    await logAudit("data.restore", "data", undefined, "dari file");
    toast.success("Restore berhasil! Memuat ulang... ✓");
    muatUlang(1500);
  };

  const doDriveBackup = async () => {
    if (!backupPass || backupPass.length < minPass) { toast.info(`Kata sandi enkripsi minimal ${minPass} karakter!`); return; }
    toast.info("Backup ke Google Drive...");
    const blob = await exportBackup(backupPass);
    const fileId = await uploadBackupToDrive(blob, form.driveBackup?.fileId);
    const now = new Date().toISOString();
    const driveBackup = { fileId, backupAt: now };
    await saveSettings({ driveBackup, lastBackupAt: now });
    setForm((f) => (f ? { ...f, driveBackup, lastBackupAt: now } : f));
    deps.markBackupReminderCurrent();
    toast.success("Backup ke Google Drive berhasil ✓");
  };

  const doDriveRestore = async () => {
    if (!backupPass) { toast.info("Masukkan kata sandi backup!"); return; }
    toast.info("Mencari backup di Google Drive...");
    let fileId = form.driveBackup?.fileId;
    if (!fileId) {
      const found = await findDriveBackup();
      if (!found) { toast.info("Tidak ada backup di Google Drive."); return; }
      fileId = found.id;
    }
    const blob = await downloadBackupFromDrive(fileId);
    jalur.mulai("restoreDrive");
    try {
      await importBackup(blob, backupPass, {
        onProgress: jalur.tahap,
        onValidationWarnings: jalur.tanyaPeringatan,
      });
    } finally {
      jalur.selesai();
    }
    await logAudit("data.restore", "data", undefined, "dari Google Drive");
    toast.success("Restore dari Drive berhasil! Memuat ulang... ✓");
    muatUlang(1500);
  };

  const doExportCsv = async () => {
    const blob = await exportDataCsvBlob();
    downloadBlob(blob, `leskolui-data-${todayWIB()}.csv`);
    toast.success("Data diekspor ke CSV ✓");
  };

  /**
   * Verifikasi backup Drive: unduh lalu dekripsi untuk memastikan berkasnya
   * benar-benar terbaca. **Tidak menimpa apa pun**, jadi ia hanya memakai keadaan
   * "verifying" — bukan jalur sibuk yang memblokir tombol pemulihan.
   */
  const doVerifyDrive = async () => {
    if (!backupPass) { toast.info("Isi Kata Sandi Enkripsi dulu untuk verifikasi!"); return; }
    jalur.setVerifying(true);
    try {
      const found = await findDriveBackup();
      if (!found) { toast.info("Tidak ada backup di Google Drive."); return; }
      const blob = await downloadBackupFromDrive(found.id);
      const summary = await inspectBackup(blob, backupPass);
      const nM = summary.tableCounts.students;
      const nS = summary.tableCounts.sessions;
      const when = new Date(found.modifiedTime).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
      toast.success(`Backup valid ✓ ${nM} murid, ${nS} sesi (${when})`);
    } catch (e) {
      toast.error("Verifikasi gagal: " + ((e as Error).message || "kata sandi salah / file rusak"));
    } finally {
      jalur.setVerifying(false);
    }
  };

  /** Pratinjau berkas tanpa menyentuh data: menjawab "berkasnya atau kata sandinya?". */
  const cekBerkasBisaDibuka = async (berkas: File | undefined) => {
    if (!berkas) { toast.info("Pilih file .jles dulu!"); return; }
    if (!backupPass) { toast.info("Isi Kata Sandi Enkripsi dulu!"); return; }
    jalur.mulai("verifyBackup");
    try {
      const summary = await inspectBackup(berkas, backupPass);
      const counts = summary.tableCounts;
      toast.info(`File terbaca ✓ ${counts.students} murid · ${counts.sessions} sesi · ${counts.reports} laporan · ${counts.payments} tagihan (${new Date(summary.exportedAt).toLocaleDateString("id-ID", { dateStyle: "medium" })})`);
    } catch (e) {
      toast.error("File tidak bisa dibaca: " + ((e as Error).message || "kata sandi salah / file rusak"));
    } finally {
      jalur.selesai();
    }
  };

  const saveRelaySecret = (v: string) => {
    try {
      if (v) localStorage.setItem(RELAY_SECRET_KEY, v);
      else localStorage.removeItem(RELAY_SECRET_KEY);
    } catch (e: unknown) {
      console.warn("saveRelaySecret failed:", e);
    }
  };

  const doTestRelay = async () => {
    jalur.setRelayBusy(true);
    try {
      await testRelay();
      toast.success("Relay backup OK ✓ — token diperoleh tanpa popup");
    } catch (e) {
      toast.error("Relay gagal: " + ((e as Error).message || "cek setup server"));
    } finally {
      jalur.setRelayBusy(false);
    }
  };

  /**
   * Nyalakan/matikan backup otomatis Drive.
   *
   * Menyalakannya **menyimpan kata sandi enkripsi di perangkat ini** supaya backup
   * bisa satu ketukan. Itu risiko yang harus disadari tutor, jadi antarmukanya
   * wajib menampilkan peringatannya — dan syarat kata sandinya diperiksa di sini,
   * bukan hanya di tombolnya.
   */
  const toggleDriveAuto = (v: boolean) => {
    if (v) {
      if (!backupPass || backupPass.length < minPass) {
        toast.info(`Isi Kata Sandi Enkripsi (min ${minPass} karakter) dulu untuk aktifkan auto.`);
        return;
      }
      try {
        localStorage.setItem(DRIVE_AUTO_KEY, "1");
        localStorage.setItem(DRIVE_PASS_KEY, backupPass);
      } catch { /* penyimpanan tidak tersedia: auto backup akan meminta sandi lagi */ }
      toast.success("Auto backup Drive aktif ✓ (kata sandi enkripsi tersimpan di perangkat)");
    } else {
      try {
        localStorage.removeItem(DRIVE_AUTO_KEY);
        localStorage.removeItem(DRIVE_PASS_KEY);
      } catch { /* abaikan */ }
      toast.info("Auto backup Drive dimatikan");
    }
    deps.onDriveAutoChange?.(v);
  };

  return {
    doExportBackup, doRestore, doDriveBackup, doDriveRestore,
    doExportCsv, doVerifyDrive, cekBerkasBisaDibuka,
    saveRelaySecret, doTestRelay, toggleDriveAuto,
  };
}

/** Apakah Drive siap dipakai — dipakai komponen untuk memilih tampilan. */
export { isDriveConfigured };
