import { useState, useEffect, useRef } from "react";
import { saveSettings, logAudit } from "../db/repos";
import { exportBackup, importBackup, inspectBackup } from "../lib/backup";
import { isDriveConfigured, uploadBackupToDrive, downloadBackupFromDrive, findDriveBackup, testRelay } from "../lib/driveBackup";
import { exportDataCsvBlob } from "../lib/exportData";
import { useToastCtx } from "../components/ToastProvider";
import { todayWIB } from "../lib/format";
import { compressPhoto } from "../lib/foto";
import { downloadBlob } from "../lib/download";
import { APP_VERSION } from "../lib/version";
import { saveButtonState, settingsLoadGate } from "../lib/settingsPresentation";
import { useSettingsQuery } from "../hooks/useSettingsQuery";
import SettingsLoadError from "../components/SettingsLoadError";
import Skeleton from "../components/Skeleton";
import ConfirmSheet from "../components/ConfirmSheet";
import { DEEPSEEK_MODEL, DEEPSEEK_MODEL_LABEL, DEEPSEEK_DOCS_URL, DEEPSEEK_PRICING_URL, DEEPSEEK_COST_NOTE } from "../lib/aiConfig";
import { pemakaianAiBulanIni, type PemakaianAiBulan } from "../lib/aiUsage";
import type { Settings } from "../db/types";
import { settingsDirtyPatch } from "../lib/settingsDirtyPatch";
import Toggle from "../components/Toggle";
import PinConfirmModal from "../components/PinConfirmModal";
import ExitAppModal from "../components/ExitAppModal";
import { UserIcon, BankIcon, RobotIcon, BackupIcon, TrashIcon, ReceiptIcon, PhoneIcon, CameraIcon, ChartIcon, SearchIcon, CloudIcon, RefreshIcon, DownloadIcon, UploadIcon } from "../components/icons";
import { MIN_PASS, WORDLIST, passStrength } from "../lib/passphrase";
import { RESET_CONFIRM_WORD, recoveryButtonEnabled, recoveryTargetSummary } from "../lib/recoveryPresentation";
import { offlineState, persistState } from "../lib/appSettingsStatus";
import { usePwaUpdate } from "../hooks/usePwaUpdate";
import PwaUpdateUi from "../components/PwaUpdateUi";
import { AccordionProvider, DangerZoneDivider, Section } from "./settings/Section";
import PinSection from "./settings/PinSection";
import DangerZoneSection from "./settings/DangerZoneSection";
import { jalankanResetSemuaData } from "./settings/dangerZoneActions";
import ConfirmActionModal, { type ConfirmDialogState } from "./settings/ConfirmActionModal";
import { useJalurPemulihan } from "./settings/useBackupSection";
import StorageUsage from "./settings/StorageUsage";
import PhotoMaintenance from "./settings/PhotoMaintenance";
import AuditLogViewer from "./settings/AuditLogViewer";

/**
 * Berkas ini sudah dipecah (G3-09). Isinya: keadaan form, pengubahnya, dan
 * perakitan bagian. Blok besar hidup di `./settings/`:
 *
 * - `settings/Section.tsx` — akordeon, urutan bagian yang mengikat, pemisah zona bahaya
 * - `settings/PinSection.tsx` — seluruh bagian PIN Keuangan
 * - `settings/DangerZoneSection.tsx` — Hapus Semua Data + tiga lapis konfirmasi
 * - `settings/ConfirmActionModal.tsx` — dialog konfirmasi internal (pengganti `confirm()`)
 * - `settings/useBackupSection.ts` — satu keadaan sibuk untuk empat tombol pemulihan
 * - `settings/StorageUsage.tsx` · `settings/PhotoMaintenance.tsx` · `settings/AuditLogViewer.tsx`
 *
 * Logika murni yang dulu menumpuk di berkas ini sekarang punya berkasnya sendiri:
 * `lib/passphrase.ts` (kata sandi enkripsi), `lib/recoveryPresentation.ts` (tahap
 * pemulihan + kata konfirmasi), `lib/settingsStatus.ts` (ringkasan status + badge),
 * `lib/auditDisplay.ts` (pengelompokan riwayat aktivitas).
 */

/** Kunci pengingat backup terakhir di `localStorage` (nilai tidak berubah). */
const AUTO_BACKUP_KEY = "leskolui_last_auto_backup_prompt";

/**
 * Tandai pengingat backup sudah diperbarui, supaya pengingat "sudah lama tidak
 * backup" tidak muncul tepat setelah tutor baru saja mem-backup.
 */
function markBackupReminderCurrent(): void {
  try { localStorage.setItem(AUTO_BACKUP_KEY, String(Date.now())); } catch { /* penyimpanan tidak tersedia */ }
}
/**
 * SettingsPage — halaman pengaturan aplikasi.
 * Section: Profil, PIN, Backup/Restore, Google Drive, Relay Server,
 * Template Laporan, Penggunaan Storage, Export Data, Penghapusan Foto.
 *
 * @component
 * @route /settings
 */
export default function SettingsPage() {
  /**
   * G2-10: probe + watchdog tidak lagi hidup di layar ini — keduanya pindah ke
   * `useSettingsQuery()` supaya enam layar lain mendapat perilaku yang sama.
   */
  const {
    settings,
    error: settingsError,
    timedOut: settingsTimedOut,
    retrying: settingsRetrying,
    retry: retrySettings,
  } = useSettingsQuery();
  /** S-08: bersihkan cache (service worker + Cache Storage) butuh konfirmasi. */
  const [confirmClearCache, setConfirmClearCache] = useState(false);
  const [form,        setForm]        = useState<Settings | null>(null);
  const [logoUrl,     setLogoUrl]     = useState<string | undefined>();
  const [dirty,       setDirty]       = useState(false);
  const [saving,      setSaving]      = useState(false);
  const toastCtx = useToastCtx();
  const [backupPass,  setBackupPass]  = useState("");
  const [showBackupPass, setShowBackupPass] = useState(false);
  const [driveAuto,   setDriveAuto]   = useState(() => localStorage.getItem("leskolui_drive_auto") === "1");
  const [pinAction,   setPinAction]   = useState<"exportBackup" | "restore" | "resetAll" | "backupDrive" | "restoreDrive" | "exportCsv" | null>(null);

  /**
   * Keadaan bersama jalur backup & pemulihan (G3-09 butir 5): satu jalur
   * berjalan = tombol lain nonaktif, dan tahapnya terlihat di layar.
   */
  const jalur = useJalurPemulihan();
  const [konfirmasi, setKonfirmasi] = useState<ConfirmDialogState | null>(null);
  const aksiKonfirmasiRef = useRef<(() => void) | null>(null);

  /**
   * Peringatan validasi impor: impor TERTAHAN sampai tutor memutuskan (dulu
   * `confirm()` bawaan peramban — lihat `settings/ConfirmActionModal.tsx`).
   */
  const jembatanPeringatan = jalur.jembatanPeringatan;
  const [relaySecret, setRelaySecret] = useState(() => { try { return localStorage.getItem("leskolui_relay_secret") || ""; } catch { return ""; } });
  const [relayBusy,   setRelayBusy]   = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [showExitModal, setShowExitModal] = useState(false);
  const restoreRef = useRef<HTMLInputElement>(null);
  const fileRef    = useRef<HTMLInputElement>(null);
  const savedFormRef = useRef<Settings | null>(null);

  /**
   * Keadaan pembaruan aplikasi — satu sumber dengan banner di `PwaPrompts`
   * (G3-09 butir 10). Karena itu tutor tetap bisa memasang pembaruan dari sini
   * setelah menutup tawarannya di banner.
   */
  const pembaruan = usePwaUpdate();

  /**
   * Status penyimpanan permanen & kesiapan offline untuk bagian Aplikasi.
   *
   * Dibaca dari peramban, bukan ditebak: `persist()` dipanggil sekali di
   * `App.tsx` dan hasilnya sering `false` sampai aplikasi dipasang, sedangkan
   * "siap offline" hanya benar kalau ada service worker yang MENGENDALIKAN
   * halaman — bukan dari `navigator.onLine`, yang justru bernilai false saat
   * offline sehingga menyesatkan orang yang paling butuh informasi ini.
   */
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [swMengontrol, setSwMengontrol] = useState<boolean | null>(null);
  const [onLine, setOnLine] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  useEffect(() => {
    let hidup = true;
    void navigator.storage?.persisted?.()
      .then((v) => { if (hidup) setPersisted(v); })
      .catch(() => { if (hidup) setPersisted(false); });
    if ("serviceWorker" in navigator) {
      const sync = () => { if (hidup) setSwMengontrol(Boolean(navigator.serviceWorker.controller)); };
      sync();
      navigator.serviceWorker.addEventListener("controllerchange", sync);
      const syncOnline = () => setOnLine(navigator.onLine);
      window.addEventListener("online", syncOnline);
      window.addEventListener("offline", syncOnline);
      return () => {
        hidup = false;
        navigator.serviceWorker.removeEventListener("controllerchange", sync);
        window.removeEventListener("online", syncOnline);
        window.removeEventListener("offline", syncOnline);
      };
    }
    return () => { hidup = false; };
  }, []);

  /** `null` = belum terbaca; jangan mengklaim apa pun sebelum peramban menjawab. */
  const statusPenyimpanan = persisted === null
    ? { tone: "info" as const, text: "Memeriksa...", detail: "Menanyakan ke peramban apakah data aplikasi ini dijanjikan tidak dibuang sendiri." }
    : persistState({ persisted });
  const statusOffline = swMengontrol === null
    ? { tone: "info" as const, text: "Belum diketahui", detail: "Status siap offline diperiksa setelah halaman selesai dimuat." }
    : offlineState({ controlled: swMengontrol, onLine });

  // Shallow copy preserves Blobs — JSON.stringify would corrupt them
  useEffect(() => {
    if (settings && !form) {
      const snapshot = { ...settings };
      setForm(snapshot);
      savedFormRef.current = snapshot;
    }
  }, [settings, form]);

  useEffect(() => {
    if (!form?.logo || !(form.logo instanceof Blob)) {
      setLogoUrl(undefined);
      return;
    }
    const url = URL.createObjectURL(form.logo);
    setLogoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [form?.logo]);

  // ── Loading / kegagalan pembacaan pengaturan (audit L-09) ───────────────────
  // Batas tunggu + probe independen sekarang di `useSettingsQuery()` (G2-10).

  const settingsView = settingsLoadGate({
    settingsLoaded: settings !== undefined,
    formReady: form !== null,
    error: settingsError,
    timedOut: settingsTimedOut,
  });

  /**
   * Pemakaian AI bulan berjalan (G3-04). Dibaca dari catatan audit `ai.call`,
   * jadi angkanya berasal dari panggilan yang benar-benar terjadi — bukan dari
   * perkiraan yang mungkin tidak pernah dijalankan.
   *
   * Diletakkan **sebelum** gerbang `settingsView !== "ready"` di bawah, karena
   * aturan hook React menuntut urutan pemanggilan yang sama di setiap render —
   * hook setelah `return` bersyarat akan membuat urutannya berubah-ubah.
   */
  const [pemakaian, setPemakaian] = useState<PemakaianAiBulan | null>(null);
  const aiAktif = Boolean(form?.ai.enabled);
  const batasAi = form?.ai.monthlyBudgetIdr;
  /**
   * AI "terkonfigurasi" = diaktifkan tutor DAN kuncinya terisi. Dipakai badge
   * bagian AI (G3-09 butir 11): badge "Aktif" pada AI yang hidup tanpa kunci
   * akan menyesatkan, karena fitur AI-nya belum bisa dipakai.
   */
  const aiConfigured = aiAktif && Boolean(form?.ai.apiKey);

  useEffect(() => {
    if (!aiAktif) { setPemakaian(null); return; }
    let hidup = true;
    void pemakaianAiBulanIni(batasAi).then((hasil) => {
      if (hidup) setPemakaian(hasil);
    });
    return () => { hidup = false; };
  }, [aiAktif, batasAi]);

  if (settingsView !== "ready") {
    if (settingsView === "loading") {
      return (
        <div className="p-4 space-y-3" role="status" aria-busy="true" aria-label="Memuat pengaturan">
          <Skeleton variant="card" />
          <Skeleton variant="text" lines={3} />
        </div>
      );
    }
    return (
      <SettingsLoadError busy={settingsRetrying} onRetry={retrySettings} />
    );
  }

  // Gerbang di atas sudah memastikan keduanya terisi; penyempitan tipe ini membuat
  // sisanya tidak perlu `!` berulang (dan tetap aman bila gerbangnya kelak berubah).
  if (!settings || !form) throw new Error("SettingsView ready tanpa data pengaturan");

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setForm((f) => (f ? { ...f, [key]: value } : f));
    setDirty(true);
  };
  const updateProfile = (field: string, value: string) => {
    setForm((f) => f ? { ...f, tutorProfile: { ...f.tutorProfile, [field]: value } } : f);
    setDirty(true);
  };

  const updateBank = (field: string, value: string) => {
    setForm((f) => f ? { ...f, bankAccounts: { ...f.bankAccounts, [field]: value } } : f);
    setDirty(true);
  };

  /**
   * Pemakaian AI bulan berjalan dipakai blok "Batas belanja AI" di bagian AI.
   * Hook-nya sudah dipanggil di atas gerbang `settingsView`, jadi di sini hanya
   * fungsi pengubah yang tinggal.
   */
  const updateAi = (field: string, value: string | boolean | number | undefined) => {
    setForm((f) => {
      if (!f) return f;
      const ai = { ...f.ai, [field]: value };
      if (field === "enabled" && value === true) ai.model = DEEPSEEK_MODEL;
      return { ...f, ai };
    });
    setDirty(true);
  };

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    try {
      // Jangan kirim snapshot Settings penuh: metadata backup yang baru ditulis
      // alur lain dapat lebih baru daripada form yang sedang terbuka.
      await saveSettings(settingsDirtyPatch(savedFormRef.current ?? form, form));
      savedFormRef.current = form;
      setDirty(false);
      toastCtx.success("Pengaturan disimpan ✓");
    } catch (e) {
      toastCtx.error("Gagal: " + ((e as Error).message || "terjadi kesalahan."));
    } finally {
      setSaving(false);
    }
  };

  const handleLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toastCtx.info("File harus berupa gambar (JPG/PNG/WebP)."); e.target.value = ""; return; }
    if (file.size > 5 * 1024 * 1024) { toastCtx.info("Ukuran logo maksimal 5 MB."); e.target.value = ""; return; }
    try {
      update("logo", await compressPhoto(file));
    } catch (err) {
      toastCtx.error("Logo gagal diproses: " + (err as Error).message);
    } finally {
      e.target.value = "";
    }
  };

  /**
   * Simpan PIN dari bagian PIN Keuangan.
   *
   * Urutannya mengikat (audit S-03): tulis **patch** (bukan snapshot Settings
   * penuh) → samakan snapshot (`savedFormRef`) → `setDirty(false)`. `form` bisa
   * lebih tua daripada isi IndexedDB, sehingga snapshot penuh akan memundurkan
   * `lastBackupAt`/`driveBackup`.
   */
  const simpanPin = async (perubahan: Settings) => {
    if (!form) return;
    const updated: Settings = { ...form, ...perubahan };
    await saveSettings(settingsDirtyPatch(savedFormRef.current ?? form, updated));
    savedFormRef.current = updated;
    setForm(updated);
    setDirty(false);
    toastCtx.success("PIN berhasil diperbarui ✓");
  };

  /**
   * Jalankan reset semua data lalu muat ulang.
   *
   * Urutan yang mengikat: bersihkan tabel → tulis satu catatan audit → muat
   * ulang. Kalau audit ditulis lebih dulu, catatannya ikut terhapus dan tidak
   * ada jejak bahwa reset pernah terjadi.
   */
  const doResetAll = async () => {
    try {
      await jalankanResetSemuaData();
      toastCtx.success("Semua data berhasil dihapus ✓ Memuat ulang...");
      setTimeout(() => location.reload(), 1500);
    } catch (e) {
      toastCtx.error("Reset gagal: " + ((e as Error).message || "terjadi kesalahan."));
    }
  };

  /**
   * Tampilkan dialog konfirmasi internal lalu jalankan `aksi` bila tutor setuju.
   *
   * Menggantikan `confirm()` bawaan peramban (G3-09 butir 7).
   */
  const mintaKonfirmasi = (state: ConfirmDialogState, aksi: () => void) => {
    aksiKonfirmasiRef.current = aksi;
    setKonfirmasi(state);
  };

  /**
   * Baris "apa yang akan ditimpa" di dialog konfirmasi pemulihan, dari
   * `recoveryTargetSummary` supaya jalur berkas dan jalur Drive tidak bisa
   * berbeda kata.
   */
  const barisSasaran = (sasaran: { fileName?: string; sizeBytes?: number }): string[] => {
    const rows = recoveryTargetSummary({ students: 0, sessions: 0, ...sasaran });
    return rows
      .filter((r) => r.label === "Berkas" || r.label === "Ukuran berkas")
      .map((r) => `• ${r.label}: ${r.value}`);
  };

  const requireFinancialPin = (action: typeof pinAction) => {
    if (!action) return;
    if (!form.financialPin) {
      toastCtx.info("Buat PIN Keuangan dulu sebelum menjalankan aksi ini.");
      return;
    }
    setPinAction(action);
  };

  const doExportBackup = async () => {
    if (!backupPass) { toastCtx.info("Masukkan kata sandi backup!"); return; }
    if (backupPass.length < MIN_PASS) { toastCtx.info(`Kata sandi minimal ${MIN_PASS} karakter!`); return; }
    const blob = await exportBackup(backupPass);
    downloadBlob(blob, `leskolui-backup-${todayWIB()}.jles`);
    const lastBackupAt = new Date().toISOString();
    await saveSettings({ lastBackupAt });
    setForm((f) => f ? { ...f, lastBackupAt } : f);
    markBackupReminderCurrent();
    toastCtx.success("Backup berhasil diunduh ✓");
  };



  const doRestore = async () => {
    const file = restoreRef.current?.files?.[0];
    if (!file || !backupPass) { toastCtx.info("Pilih file dan masukkan kata sandi!"); return; }
    // Kabari tutor bahwa proses ini memang panjang (dekripsi + decode ribuan
    // foto bisa puluhan detik). Tanpa ini, layar yang "diam" terbaca sebagai
    // gagal — lalu halaman ditutup di tengah proses.
    jalur.mulai("restoreFile");
    try {
      await importBackup(file, backupPass, {
        onProgress: jalur.tahap,
        onValidationWarnings: jalur.tanyaPeringatan,
      });
    } finally {
      jalur.selesai();
    }
    await logAudit("data.restore", "data", undefined, "dari file");
    toastCtx.success("Restore berhasil! Memuat ulang... ✓");
    setTimeout(() => location.reload(), 1500);
  };

  const doDriveBackup = async () => {
    if (!backupPass || backupPass.length < MIN_PASS) { toastCtx.info(`Kata sandi enkripsi minimal ${MIN_PASS} karakter!`); return; }
    toastCtx.info("Backup ke Google Drive...");
    const blob = await exportBackup(backupPass);
    const fileId = await uploadBackupToDrive(blob, form.driveBackup?.fileId);
    const now = new Date().toISOString();
    const driveBackup = { fileId, backupAt: now };
    await saveSettings({ driveBackup, lastBackupAt: now });
    setForm((f) => f ? { ...f, driveBackup, lastBackupAt: now } : f);
    markBackupReminderCurrent();
    toastCtx.success("Backup ke Google Drive berhasil ✓");
  };

  const doDriveRestore = async () => {
    if (!backupPass) { toastCtx.info("Masukkan kata sandi backup!"); return; }
    toastCtx.info("Mencari backup di Google Drive...");
    let fileId = form.driveBackup?.fileId;
    if (!fileId) {
      const found = await findDriveBackup();
      if (!found) { toastCtx.info("Tidak ada backup di Google Drive."); return; }
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
    toastCtx.success("Restore dari Drive berhasil! Memuat ulang... ✓");
    setTimeout(() => location.reload(), 1500);
  };

  const doExportCsv = async () => {
    const blob = await exportDataCsvBlob();
    downloadBlob(blob, `leskolui-data-${todayWIB()}.csv`);
    toastCtx.success("Data diekspor ke CSV ✓");
  };

  // Verifikasi backup Drive: unduh + dekripsi untuk pastikan file valid & terbaca.
  const doVerifyDrive = async () => {
    if (!backupPass) { toastCtx.info("Isi Kata Sandi Enkripsi dulu untuk verifikasi!"); return; }
    jalur.setVerifying(true);
    try {
      const found = await findDriveBackup();
      if (!found) { toastCtx.info("Tidak ada backup di Google Drive."); return; }
      const blob = await downloadBackupFromDrive(found.id);
      const summary = await inspectBackup(blob, backupPass);
      const nM = summary.tableCounts.students;
      const nS = summary.tableCounts.sessions;
      const when = new Date(found.modifiedTime).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
      toastCtx.success(`Backup valid ✓ ${nM} murid, ${nS} sesi (${when})`);
    } catch (e) {
      toastCtx.error("Verifikasi gagal: " + ((e as Error).message || "kata sandi salah / file rusak"));
    } finally {
      jalur.setVerifying(false);
    }
  };

  const saveRelaySecret = (v: string) => {
    setRelaySecret(v);
    try { if (v) localStorage.setItem("leskolui_relay_secret", v); else localStorage.removeItem("leskolui_relay_secret"); } catch (e: unknown) { console.warn("saveRelaySecret failed:", e); }
  };

  const doTestRelay = async () => {
    setRelayBusy(true);
    try {
      await testRelay();
      toastCtx.success("Relay backup OK ✓ — token diperoleh tanpa popup");
    } catch (e) {
      toastCtx.error("Relay gagal: " + ((e as Error).message || "cek setup server"));
    } finally {
      setRelayBusy(false);
    }
  };

  const toggleDriveAuto = (v: boolean) => {
    if (v) {
      if (!backupPass || backupPass.length < MIN_PASS) { toastCtx.info(`Isi Kata Sandi Enkripsi (min ${MIN_PASS} karakter) dulu untuk aktifkan auto.`); return; }
      localStorage.setItem("leskolui_drive_auto", "1");
      localStorage.setItem("leskolui_drive_pass", backupPass);
      setDriveAuto(true);
      toastCtx.success("Auto backup Drive aktif ✓ (kata sandi enkripsi tersimpan di perangkat)");
    } else {
      localStorage.removeItem("leskolui_drive_auto");
      localStorage.removeItem("leskolui_drive_pass");
      setDriveAuto(false);
      toastCtx.info("Auto backup Drive dimatikan");
    }
  };

  const runPinAction = async () => {
    if (!pinAction) return;
    try {
      if (pinAction === "exportBackup") await doExportBackup();

      if (pinAction === "restore") await doRestore();
      if (pinAction === "resetAll") await doResetAll();
      if (pinAction === "backupDrive") await doDriveBackup();
      if (pinAction === "restoreDrive") await doDriveRestore();
      if (pinAction === "exportCsv") await doExportCsv();
      setPinAction(null);
    } catch (e) {
      toastCtx.error("Gagal: " + ((e as Error).message || "terjadi kesalahan."));
    }
  };

  const pinModalCopy = {
    exportBackup: {
      title: "Konfirmasi Backup",
      description: "Masukkan PIN Keuangan sebelum mengekspor semua data.",
      confirmLabel: "Ekspor",
    },

    restore: {
      title: "Konfirmasi Restore",
      description: "Restore akan mengganti data saat ini dan menghapus draf lokal perangkat. Masukkan PIN untuk lanjut.",
      confirmLabel: "Restore",
    },
    resetAll: {
      title: "Hapus Semua Data (Permanen)",
      description: "Tindakan ini PERMANEN dan tidak bisa dibatalkan — semua murid, sesi, tagihan, laporan, dan pengeluaran akan hilang. Masukkan PIN untuk lanjut.",
      confirmLabel: "Hapus Permanen",
    },
    backupDrive: {
      title: "Backup ke Google Drive",
      description: "Masukkan PIN Keuangan sebelum mengunggah backup ke Drive.",
      confirmLabel: "Backup",
    },
    restoreDrive: {
      title: "Restore dari Google Drive",
      description: "Restore akan mengganti data saat ini. Masukkan PIN untuk lanjut.",
      confirmLabel: "Restore",
    },
    exportCsv: {
      title: "Ekspor Data ke CSV",
      description: "File CSV berisi data murid & keuangan (tidak terenkripsi). Masukkan PIN untuk lanjut.",
      confirmLabel: "Ekspor",
    },
  } as const;

  const saveState = saveButtonState(dirty, saving);

  return (
    <AccordionProvider openId={openSection} setOpenId={setOpenSection}>
    <div className="p-4 space-y-3 pb-24">
      {pinAction && form.financialPin && (
        <PinConfirmModal
          storedPin={form.financialPin}
          title={pinModalCopy[pinAction].title}
          description={pinModalCopy[pinAction].description}
          confirmLabel={pinModalCopy[pinAction].confirmLabel}
          onCancel={() => setPinAction(null)}
          onConfirm={runPinAction}
        />
      )}

      <div className="flex items-center justify-between py-1">
        <h1 className="text-2xl font-bold">Pengaturan</h1>
        {dirty && (
          <span className="text-xs bg-[var(--bg-warn)] text-[var(--ink-warn)] px-2.5 py-1 rounded-full font-medium animate-pulse">
            Belum disimpan
          </span>
        )}
      </div>
      {/* Audit L-07 / Q22(b): layar ini dulu hanya punya `h1` — judul bagian di bawah
          ini adalah tombol akordeon, bukan heading. Satu `h2` sr-only cukup agar
          hierarki heading dan ambang guard G1-11 ("setiap layar ≥1 h2") terpenuhi. */}
      <h2 className="sr-only">Bagian pengaturan</h2>

      {/* ── Backup & Restore ── */}
      <Section id="backup" title="Backup dan Restore" icon={<BackupIcon size={18} />}>
        <div className="pt-3 space-y-3">
          <StorageUsage />
          <PhotoMaintenance onToast={toastCtx.info} />

          {/* Kata sandi bersama — dipakai semua backup & restore */}
          <div className="bg-[var(--surface)] rounded-xl p-3 space-y-2">
            <label htmlFor="set-backup-pass" className="label">🔑 Kata Sandi Enkripsi</label>
            <div className="flex gap-2">
              <input id="set-backup-pass" className="input flex-1" type={showBackupPass ? "text" : "password"} value={backupPass}
                onChange={(e) => setBackupPass(e.target.value)} placeholder="Kata sandi backup & restore" />
              <button
                onClick={() => {
                  const words = Array.from(crypto.getRandomValues(new Uint8Array(6)))
                    .map((b) => WORDLIST[b % WORDLIST.length]).join("-");
                  setBackupPass(words);
                  setShowBackupPass(true);
                }}
                className="text-xs px-3 py-2 rounded-xl bg-[var(--bg-subtle)] text-[var(--ink-strong)] hover:bg-[var(--bg-subtle)] font-medium flex-shrink-0">
                Generate
              </button>
              <button type="button" onClick={() => setShowBackupPass((visible) => !visible)}
                className="text-xs px-3 py-2 rounded-xl bg-[var(--bg-subtle)] text-[var(--ink-strong)] hover:bg-[var(--bg-subtle)] font-medium flex-shrink-0">
                {showBackupPass ? "Sembunyikan" : "Tampilkan"}
              </button>
            </div>
            {backupPass && showBackupPass && <p className="text-xs text-[var(--ink-muted)] font-mono break-all">{backupPass}</p>}
            {backupPass && (() => {
              const st = passStrength(backupPass);
              return (
                <div className="space-y-1">
                  <div className="w-full bg-[var(--bg-subtle)] rounded-full h-1.5">
                    <div className="h-1.5 rounded-full transition-all" style={{ width: `${st.pct}%`, background: st.color }} />
                  </div>
                  <p className="text-xs font-medium" style={{ color: st.color }}>
                    Kekuatan: {st.label}
                    {backupPass.length < MIN_PASS && ` — minimal ${MIN_PASS} karakter (pakai "Generate" untuk kata sandi yang kuat)`}
                  </p>
                </div>
              );
            })()}
            <p className="text-xs text-[var(--ink-muted)]">
              Dipakai untuk <b>backup &amp; restore</b> (File &amp; Drive). <b>Simpan baik-baik</b> — kata sandi ini tak tersimpan & wajib untuk membuka backup di HP lain.
            </p>
          </div>

          {/* Metode 1: File */}
          <div className="bg-[var(--brand-tint)] rounded-xl p-3 space-y-2.5">
            <p className="text-sm font-semibold text-[var(--ink-brand)]">📁 File (.jles)</p>
            <button disabled={!recoveryButtonEnabled(jalur.busy, "backupFile")}
              className="w-full py-2.5 rounded-xl bg-[var(--brand-solid)] text-[var(--on-strong)] text-sm font-semibold hover:bg-[var(--brand-solid)] transition-colors disabled:opacity-60"
              onClick={() => {
                if (!backupPass || backupPass.length < MIN_PASS) { toastCtx.info(`Isi Kata Sandi Enkripsi (min ${MIN_PASS} karakter) dulu!`); return; }
                requireFinancialPin("exportBackup");
              }}>
              <DownloadIcon size={13} className="mr-1 inline align-[-2px]" /> Backup ke File
            </button>
            <button className="w-full py-2 rounded-xl bg-[var(--brand-tint-strong)] text-[var(--ink-brand)] text-sm font-medium hover:bg-[var(--brand-tint-strong)] transition-colors"
              onClick={() => requireFinancialPin("exportCsv")}>
              <ChartIcon size={13} className="mr-1 inline align-[-2px]" /> Ekspor data ke CSV (terbaca)
            </button>
            <p className="text-xs text-[var(--ink-brand)]">CSV terbaca tanpa app (cadangan tambahan). Backup .jles tetap utama (terenkripsi).</p>
            <div className="border-t border-[var(--brand-tint-strong)] pt-2.5 space-y-2">
              <label htmlFor="set-restore-file" className="label text-[var(--ink-brand)]">Restore dari file</label>
              <input id="set-restore-file" ref={restoreRef} type="file" accept=".jles" className="text-sm text-[var(--ink-muted)] w-full" />
              <button className="w-full py-2 rounded-xl bg-[var(--brand-tint-strong)] text-[var(--ink-brand)] text-sm font-medium hover:bg-[var(--brand-tint-strong)] transition-colors"
                onClick={() => {
                  const file = restoreRef.current?.files?.[0];
                  if (!file) { toastCtx.info("Pilih file .jles dulu!"); return; }
                  if (!backupPass) { toastCtx.info("Isi Kata Sandi Enkripsi dulu!"); return; }
                  const berkas = restoreRef.current?.files?.[0];
                  mintaKonfirmasi({
                    judul: "Pulihkan dari berkas ini?",
                    pesan: [
                      ...barisSasaran({ fileName: berkas?.name, sizeBytes: berkas?.size ?? 0 }),
                      "• Semua murid, sesi, tagihan, dan laporan di perangkat ini akan DIGANTI.",
                      "• Aplikasi menyimpan cadangan data lama (pre-restore) sebelum menggantinya.",
                    ],
                    labelLanjut: "Ya, pulihkan",
                    danger: true,
                  }, () => requireFinancialPin("restore"));
                }}>
                <RefreshIcon size={13} className="mr-1 inline align-[-2px]" /> Restore dari File
              </button>
              {/* Pratinjau file tanpa menyentuh data: menjawab "file-nya atau
                  kata sandinya yang salah?" sebelum tutor menekan Restore. */}
              <button
                disabled={jalur.busy.busy}
                className="w-full py-2 rounded-xl bg-[var(--surface-strong)] text-[var(--ink-brand)] text-sm font-medium border border-[var(--brand-tint-strong)] hover:bg-[var(--brand-tint)] transition-colors disabled:opacity-60"
                onClick={async () => {
                  const file = restoreRef.current?.files?.[0];
                  if (!file) { toastCtx.info("Pilih file .jles dulu!"); return; }
                  if (!backupPass) { toastCtx.info("Isi Kata Sandi Enkripsi dulu!"); return; }
                  jalur.mulai("verifyBackup");
                  try {
                    const summary = await inspectBackup(file, backupPass);
                    const counts = summary.tableCounts;
                    toastCtx.info(`File terbaca ✓ ${counts.students} murid · ${counts.sessions} sesi · ${counts.reports} laporan · ${counts.payments} tagihan (${new Date(summary.exportedAt).toLocaleDateString("id-ID", { dateStyle: "medium" })})`);
                  } catch (e) {
                    toastCtx.error("File tidak bisa dibaca: " + ((e as Error).message || "kata sandi salah / file rusak"));
                  } finally {
                    jalur.selesai();
                  }
                }}>
                <SearchIcon size={13} className="mr-1 inline align-[-2px]" /> Cek file ini bisa dibuka
              </button>

              <p className="text-xs text-[var(--ink-brand)]">
                <b>Kata Sandi Enkripsi</b> (di kolom atas), bukan PIN Keuangan, yang membuka file ini.
              </p>
            </div>
          </div>

          {/* Metode 2: Google Drive */}
          {isDriveConfigured() ? (
            <div className="bg-[var(--bg-success)] rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[var(--ink-success)]">☁️ Google Drive</p>
                {form.driveBackup?.backupAt && (
                  <p className="text-xs text-[var(--ink-muted)]">
                    {new Date(form.driveBackup.backupAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                )}
              </div>
              <button className="w-full py-2.5 rounded-xl bg-[var(--bg-success-strong)] text-[var(--on-strong)] text-sm font-semibold hover:bg-[var(--bg-success-strong)] transition-colors"
                onClick={() => {
                  if (!backupPass || backupPass.length < MIN_PASS) { toastCtx.info(`Isi Kata Sandi Enkripsi (min ${MIN_PASS} karakter) dulu!`); return; }
                  requireFinancialPin("backupDrive");
                }}>
                <CloudIcon size={13} className="mr-1 inline align-[-2px]" /><UploadIcon size={13} className="mr-1 inline align-[-2px]" /> Backup ke Drive
              </button>
              <button className="w-full py-2 rounded-xl bg-[var(--bg-success)] text-[var(--ink-success)] text-sm font-medium hover:bg-[var(--bg-success-strong)] transition-colors"
                onClick={() => {
                  if (!backupPass) { toastCtx.info("Isi Kata Sandi Enkripsi dulu!"); return; }
                  const dibuat = form.driveBackup?.backupAt
                    ? new Date(form.driveBackup.backupAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })
                    : "tanggal tidak tercatat";
                  mintaKonfirmasi({
                    judul: "Pulihkan dari Google Drive?",
                    pesan: [
                      `• Cadangan terakhir di Drive: ${dibuat}`,
                      "• Semua murid, sesi, tagihan, dan laporan di perangkat ini akan DIGANTI.",
                      "• Aplikasi menyimpan cadangan data lama (pre-restore) sebelum menggantinya.",
                    ],
                    labelLanjut: "Ya, pulihkan",
                    danger: true,
                  }, () => requireFinancialPin("restoreDrive"));
                }}>
                <CloudIcon size={13} className="mr-1 inline align-[-2px]" /><RefreshIcon size={13} className="mr-1 inline align-[-2px]" /> Restore dari Drive
              </button>
              <button disabled={jalur.verifying}
                className="w-full py-2 rounded-xl bg-[var(--surface-strong)] text-[var(--ink-success)] text-sm font-medium border border-[var(--border-success)] hover:bg-[var(--bg-success)] transition-colors disabled:opacity-60"
                onClick={doVerifyDrive}>
                {jalur.verifying ? "Memverifikasi..." : <><SearchIcon size={13} className="mr-1 inline align-[-2px]" /> Verifikasi backup Drive</>}
              </button>
              <p className="text-xs text-[var(--ink-success)]">1 file di-overwrite tiap backup — Drive simpan riwayat versi.</p>
              <label className="flex items-center gap-2.5 pt-2 border-t border-[var(--border-success)] cursor-pointer">
                <Toggle checked={driveAuto} onChange={toggleDriveAuto} label="Auto backup Drive mingguan" />
                <span className="text-xs font-medium text-[var(--ink-success)]">Auto backup mingguan (1-tap dari reminder)</span>
              </label>
              {driveAuto && (
                <p className="text-xs text-[var(--ink-warn)] bg-[var(--bg-warn)] rounded-lg px-2 py-1.5">
                  ⚠️ Kata sandi disimpan di perangkat ini agar backup bisa 1-tap — pastikan layar HP terkunci (PIN/biometrik). Tetap simpan salinannya untuk restore di HP lain.
                </p>
              )}

              {/* Backup senyap (relay) — backup tanpa popup saat app dibuka & sudah due */}
              <div className="pt-2 border-t border-[var(--border-success)] space-y-1.5">
                <label htmlFor="set-relay-secret" className="label text-[var(--ink-success)]">⚡ Backup senyap (relay, lanjutan)</label>
                <input id="set-relay-secret" className="input font-mono text-xs" type="password" placeholder="Secret relay (BACKUP_API_SECRET)"
                  value={relaySecret} onChange={(e) => saveRelaySecret(e.target.value)} />
                <div className="flex items-center gap-2">
                  <button disabled={relayBusy || !relaySecret}
                    onClick={doTestRelay}
                    className="inline-flex min-h-[44px] items-center text-xs px-3 py-1.5 rounded-xl bg-[var(--bg-success)] text-[var(--ink-success)] font-medium disabled:opacity-50">
                    {relayBusy ? "Menguji..." : "Tes relay"}
                  </button>
                  <span className="text-xs text-[var(--ink-muted)]">{relaySecret ? "Aktif — backup tanpa popup" : "Nonaktif (pakai 1-tap)"}</span>
                </div>
                <p className="text-xs text-[var(--ink-muted)]">Butuh setup server 1x. Lihat docs/02-PANDUAN-BACKUP-DRIVE-SENYAP.md.</p>
              </div>
            </div>
          ) : (
            <div className="bg-[var(--surface)] rounded-xl p-3">
              <p className="text-xs text-[var(--ink-muted)]">☁️ Backup Google Drive belum aktif.</p>
            </div>
          )}

          <p className="text-xs text-[var(--ink-attention)]">⚠️ Restore mengganti <b>semua</b> data saat ini. Sebelum mengganti, app otomatis mengunduh file <b>pre-restore</b> (cadangan data lama Anda).</p>

          <p className="text-xs text-[var(--ink-muted)] pt-2 border-t border-[var(--border)]">
            🕒 Backup terakhir:{" "}
            {form.lastBackupAt ? (
              <b className="text-[var(--ink-muted)]">{new Date(form.lastBackupAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</b>
            ) : (
              <span className="text-[var(--ink-muted)]">belum pernah backup</span>
            )}
          </p>

          {/* G3-09 butir 5: tahap pemulihan terlihat di SEMUA jalur, bukan hanya
              jalur berkas. Tanpa ini layar tampak "diam" selama puluhan detik dan
              tutor menutup halaman di tengah proses. */}
          {jalur.busy.busy && jalur.busy.stepLabel && (
            <p role="status" aria-live="polite" className="rounded-lg bg-[var(--brand-tint-strong)] px-2.5 py-2 text-xs font-medium text-[var(--ink-brand)]">
              {jalur.busy.stepLabel} Jangan tutup halaman ini.
            </p>
          )}

          {/* Dialog konfirmasi internal: menggantikan dialog bawaan peramban. */}
          <ConfirmActionModal
            open={konfirmasi !== null}
            state={konfirmasi}
            busy={jalur.busy.busy}
            onCancel={() => { setKonfirmasi(null); aksiKonfirmasiRef.current = null; }}
            onConfirm={() => {
              const aksi = aksiKonfirmasiRef.current;
              setKonfirmasi(null);
              aksiKonfirmasiRef.current = null;
              aksi?.();
            }}
          />

          {/* Peringatan validasi impor: impor TERTAHAN sampai tutor memutuskan. */}
          <ConfirmActionModal
            open={jalur.peringatan !== null}
            state={jalur.peringatan ? {
              judul: `Backup memiliki ${jalur.peringatan.length} peringatan validasi`,
              pesan: [
                "Sebagian isian backup tidak lolos pemeriksaan. Impor belum berjalan.",
                ...jalur.peringatan.slice(0, 8).map((p) => `• ${p}`),
              ],
              labelLanjut: "Lanjutkan impor",
              danger: true,
            } : null}
            onCancel={() => jalur.jembatanPeringatan.jawab(false)}
            onConfirm={() => jalur.jembatanPeringatan.jawab(true)}
          />

          {/* G3-09 butir 5: tahap pemulihan terlihat di SEMUA jalur, bukan hanya
              jalur berkas. Tanpa ini, layar tampak "diam" selama puluhan detik dan
              tutor menutup halaman di tengah proses. */}
          {jalur.busy.busy && jalur.busy.stepLabel && (
            <p role="status" aria-live="polite" className="rounded-lg bg-[var(--brand-tint-strong)] px-2.5 py-2 text-xs font-medium text-[var(--ink-brand)]">
              {jalur.busy.stepLabel} Jangan tutup halaman ini.
            </p>
          )}

          {/* Dialog konfirmasi internal: menggantikan dialog bawaan peramban. */}
          <ConfirmActionModal
            open={konfirmasi !== null}
            state={konfirmasi}
            busy={jalur.busy.busy}
            onCancel={() => { setKonfirmasi(null); aksiKonfirmasiRef.current = null; }}
            onConfirm={() => {
              const aksi = aksiKonfirmasiRef.current;
              setKonfirmasi(null);
              aksiKonfirmasiRef.current = null;
              aksi?.();
            }}
          />

          {/* Peringatan validasi impor: impor TERTAHAN sampai tutor memutuskan. */}
          <ConfirmActionModal
            open={jalur.peringatan !== null}
            state={jalur.peringatan ? {
              judul: `Backup memiliki ${jalur.peringatan.length} peringatan validasi`,
              pesan: [
                "Sebagian isian backup tidak lolos pemeriksaan. Impor belum berjalan.",
                ...jalur.peringatan.slice(0, 8).map((p) => `• ${p}`),
                `• ${RESET_CONFIRM_WORD} tidak perlu diketik di sini; peringatan ini belum menghapus apa pun.`,
              ],
              labelLanjut: "Lanjutkan impor",
              danger: true,
            } : null}
            onCancel={() => jembatanPeringatan.jawab(false)}
            onConfirm={() => jembatanPeringatan.jawab(true)}
          />
        </div>
      </Section>

      {/* ── AI ── */}
      <Section id="ai" title="AI — DeepSeek" icon={<RobotIcon size={18} />} badge={aiConfigured ? { text: "Aktif" } : undefined}>
        <div className="pt-3 space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <Toggle checked={form.ai.enabled} onChange={(v) => updateAi("enabled", v)} />
            <div>
              <p className="text-sm text-[var(--ink-strong)] font-medium">Aktifkan AI</p>
              <p className="text-xs text-[var(--ink-muted)]">Bantu menulis catatan, laporan, pesan WA, dan analisis keuangan</p>
            </div>
          </label>
          {form.ai.enabled && (
            <>
              <div>
                <label htmlFor="set-ai-key" className="label">DeepSeek API Key</label>
                <input id="set-ai-key" className="input font-mono text-xs" type="password" placeholder="sk-..."
                  value={form.ai.apiKey ?? ""}
                  onChange={(e) => updateAi("apiKey", e.target.value)} />
                <p className="text-xs text-[var(--ink-muted)] mt-1">
                  Dapatkan di <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener noreferrer" className="font-medium text-[var(--ink-brand)] underline">DeepSeek API Keys</a>.
                  {" "}Disimpan di perangkat ini dan dipakai untuk menghubungkan langsung ke DeepSeek.
                </p>
              </div>
              <div>
                <p id="set-model-label" className="label">Model</p>
                <div role="group" aria-labelledby="set-model-label" className="input bg-[var(--surface)] text-[var(--ink-strong)] text-sm flex items-center gap-2 cursor-default">
                  <span className="font-semibold">{DEEPSEEK_MODEL_LABEL}</span>
                </div>
                <p className="text-xs text-[var(--ink-muted)] mt-1">
                  Model API: <span className="font-mono">{DEEPSEEK_MODEL}</span>. Mode cepat untuk catatan dan laporan.
                </p>
                <p className="text-xs text-[var(--ink-muted)] mt-1">{DEEPSEEK_COST_NOTE}</p>
                <p className="text-xs mt-1">
                  <a href={DEEPSEEK_DOCS_URL} target="_blank" rel="noopener noreferrer" className="text-[var(--ink-brand)] underline">Dokumentasi DeepSeek</a>
                  {" · "}
                  <a href={DEEPSEEK_PRICING_URL} target="_blank" rel="noopener noreferrer" className="text-[var(--ink-brand)] underline">Tarif resmi</a>
                </p>
              </div>
              <div className="rounded-xl border border-[var(--border)] p-3 space-y-2">
                <p className="text-sm font-semibold text-[var(--ink-strong)]">Data yang dikirim ke DeepSeek</p>
                <p className="text-xs text-[var(--ink-muted)]">Data dikirim saat kamu melanjutkan fitur AI. Rinciannya ditampilkan sebelum setiap panggilan.</p>
                <ul className="list-disc pl-4 space-y-1 text-xs text-[var(--ink-muted)]">
                  <li>Catatan dan laporan: identitas murid serta data belajar sesuai sesi yang dipilih. Draft catatan juga menyertakan Situasi Hari Ini dan tindak lanjut bila tersedia.</li>
                  <li>Poles WA: isi pesan awal sesi beserta nama murid dan tutor.</li>
                  <li>Analisis keuangan: ringkasan periode, nama dan data keuangan murid, tagihan belum dibayar, pengeluaran, serta pembanding dan proyeksi.</li>
                </ul>
              </div>
              <div className="rounded-xl border border-[var(--border)] p-3 space-y-2">
                <p className="text-sm font-semibold text-[var(--ink-strong)]">Batas belanja AI per bulan</p>
                <div>
                  <label htmlFor="set-ai-budget" className="label">Batas bulanan (Rp)</label>
                  <input
                    id="set-ai-budget"
                    className="input"
                    inputMode="numeric"
                    placeholder="Kosongkan untuk tanpa batas"
                    value={form.ai.monthlyBudgetIdr ?? ""}
                    onChange={(event) => {
                      const digit = event.target.value.replace(/\D/g, "");
                      updateAi("monthlyBudgetIdr", digit ? Number(digit) : undefined);
                    }}
                  />
                  <p className="mt-1 text-xs text-[var(--ink-muted)]">
                    <strong>Kosong berarti tanpa batas</strong> — itu bawaannya, dan AI tidak pernah diblokir karena
                    kolom ini kosong. Kalau diisi, tombol AI akan nonaktif setelah pemakaian bulan ini melewatinya,
                    dengan alasannya tertulis di layar.
                  </p>
                </div>
                {/* Pemakaian bulan berjalan dibaca dari catatan audit `ai.call`. */}
                <div className="rounded-lg bg-[var(--surface)] px-3 py-2 text-xs">
                  {pemakaian ? (
                    <>
                      <p className="text-[var(--ink-strong)]">
                        Bulan ini: <strong>Rp {pemakaian.terpakaiIdr.toFixed(2)}</strong>
                        {pemakaian.batasIdr !== undefined && <> dari batas Rp {pemakaian.batasIdr.toLocaleString("id-ID")}</>}
                        {" · "}{pemakaian.jumlahPanggilan} panggilan
                      </p>
                      <p className={pemakaian.terlampaui ? "mt-0.5 font-semibold text-[var(--ink-danger)]" : "mt-0.5 text-[var(--ink-muted)]"}>
                        {pemakaian.terlampaui
                          ? "Batas sudah terlampaui — tombol AI nonaktif sampai batas dinaikkan atau bulan berganti."
                          : pemakaian.sisaIdr !== undefined
                            ? `Sisa jatah Rp ${pemakaian.sisaIdr.toFixed(2)}.`
                            : "Tanpa batas."}
                      </p>
                    </>
                  ) : (
                    <p className="text-[var(--ink-muted)]">Menghitung pemakaian…</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </Section>

      {/* ── Profil Tutor ── */}
      <Section id="profil" title="Profil Tutor" icon={<UserIcon size={18} />}>
        <div className="pt-3 space-y-3">
          <div>
            <label htmlFor="set-nama-tutor" className="label">Nama Tutor</label>
            <input id="set-nama-tutor" className="input" placeholder="mis. Ko Lui" maxLength={60}
              value={form.tutorProfile.name}
              onChange={(e) => updateProfile("name", e.target.value)} />
          </div>
          <div>
            <label htmlFor="set-no-wa" className="label">No. WhatsApp</label>
            <input id="set-no-wa" className="input" placeholder="08xxxxxxxxxx" maxLength={20} type="tel"
              value={form.tutorProfile.phone}
              onChange={(e) => updateProfile("phone", e.target.value)} />
          </div>
          <div>
            <label htmlFor="set-email" className="label">Email <span className="text-[var(--ink-muted)] font-normal">(opsional)</span></label>
            <input id="set-email" className="input" placeholder="tutor@email.com" maxLength={100} type="email"
              value={form.tutorProfile.email ?? ""}
              onChange={(e) => updateProfile("email", e.target.value)} />
          </div>
          <div>
            <label htmlFor="set-alamat" className="label">Alamat <span className="text-[var(--ink-muted)] font-normal">(opsional)</span></label>
            <input id="set-alamat" className="input" placeholder="Jl. Contoh No.1, Jakarta" maxLength={150}
              value={form.tutorProfile.address ?? ""}
              onChange={(e) => updateProfile("address", e.target.value)} />
          </div>
          <div>
            <label htmlFor="set-logo" className="label">Logo <span className="text-[var(--ink-muted)] font-normal">(tampil di laporan)</span></label>
            {logoUrl && (
              <div className="flex items-center gap-3 mb-2">
                <img src={logoUrl} className="h-14 w-14 object-contain rounded-lg border border-[var(--border)] bg-[var(--surface)]" alt="logo" />
                <button onClick={() => update("logo", undefined)}
                  className="inline-flex min-h-[44px] items-center text-xs text-[var(--ink-danger)] hover:text-[var(--ink-danger)] font-medium px-3 py-1 bg-[var(--bg-danger)] rounded-lg">
                  Hapus Logo
                </button>
              </div>
            )}
            <input id="set-logo" ref={fileRef} type="file" accept="image/*" onChange={handleLogo} className="hidden" />
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 text-sm text-[var(--ink-muted)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle)] px-3 py-2 rounded-xl font-medium transition-colors">
              <CameraIcon size={13} className="mr-1 inline align-[-2px]" /> {logoUrl ? "Ganti Logo" : "Upload Logo"}
            </button>
          </div>
        </div>
      </Section>

      <PinSection
        financialPin={form.financialPin}
        securityQuestion={form.securityQuestion}
        securityAnswer={form.securityAnswer}
        onSave={simpanPin}
      />

      {/* ── Rekening Bank ── */}
      <Section id="rekening" title="Rekening Bank" icon={<BankIcon size={18} />}>
        <div className="pt-3 space-y-3">
          <p className="text-xs text-[var(--ink-muted)]">Ditampilkan di lembar absensi untuk memudahkan transfer</p>
          <div>
            <label htmlFor="set-nama-rekening" className="label">Nama Pemilik Rekening</label>
            <input id="set-nama-rekening" className="input" maxLength={60} placeholder="Nama AN rekening"
              value={form.bankAccounts?.accountName ?? ""}
              onChange={(e) => updateBank("accountName", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="set-rek-bca" className="label">BCA</label>
              <input id="set-rek-bca" className="input" maxLength={20} placeholder="No rekening"
                value={form.bankAccounts?.bca ?? ""}
                onChange={(e) => updateBank("bca", e.target.value)} />
            </div>
            <div>
              <label htmlFor="set-rek-mandiri" className="label">Mandiri</label>
              <input id="set-rek-mandiri" className="input" maxLength={20} placeholder="No rekening"
                value={form.bankAccounts?.mandiri ?? ""}
                onChange={(e) => updateBank("mandiri", e.target.value)} />
            </div>
            <div>
              <label htmlFor="set-rek-bri" className="label">BRI</label>
              <input id="set-rek-bri" className="input" maxLength={20} placeholder="No rekening"
                value={form.bankAccounts?.bri ?? ""}
                onChange={(e) => updateBank("bri", e.target.value)} />
            </div>
            <div>
              <label htmlFor="set-rek-cimb" className="label">CIMB Niaga</label>
              <input id="set-rek-cimb" className="input" maxLength={20} placeholder="No rekening"
                value={form.bankAccounts?.cimb ?? ""}
                onChange={(e) => updateBank("cimb", e.target.value)} />
            </div>
            <div>
              <label htmlFor="set-rek-bsi" className="label">BSI</label>
              <input id="set-rek-bsi" className="input" maxLength={20} placeholder="No rekening"
                value={form.bankAccounts?.bsi ?? ""}
                onChange={(e) => updateBank("bsi", e.target.value)} />
            </div>
            <div>
              <label htmlFor="set-rek-ewallet" className="label">GoPay / OVO / DANA</label>
              <input id="set-rek-ewallet" className="input" maxLength={20} placeholder="No HP ewallet"
                value={form.bankAccounts?.ewallet ?? ""}
                onChange={(e) => updateBank("ewallet", e.target.value)} />
            </div>
          </div>
        </div>
      </Section>

      {/* ── PWA / Aplikasi ── */}
      <Section id="aplikasi" title="Aplikasi" icon={<PhoneIcon size={18} />}>
        <div className="pt-3 space-y-3">
          <StorageUsage />

          {/**
           * G3-09 butir 10 — pembaruan manual. Ini jalur yang tetap bisa dipakai
           * tutor SESUDAH menutup tawaran pembaruan di banner, jadi menutup
           * tawaran tidak pernah mengunci kemampuan memasang versi baru.
           */}
          <PwaUpdateUi
            variant="panel"
            ready={pembaruan.ready}
            checking={pembaruan.checking}
            onCheck={pembaruan.check}
            onApply={pembaruan.apply}
          />

          <div className="bg-[var(--surface)] rounded-xl p-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--ink-muted)]">Versi</span>
              <span className="font-semibold text-[var(--ink-strong)]">{APP_VERSION}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--ink-muted)]">Penyimpanan permanen</span>
              <span className={statusPenyimpanan.tone === "ok" ? "text-[var(--ink-muted)]" : "text-[var(--ink-warn)]"}>
                {statusPenyimpanan.text}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--ink-muted)]">Siap offline</span>
              <span className={statusOffline.tone === "ok" ? "text-[var(--ink-muted)]" : "text-[var(--ink-warn)]"}>
                {statusOffline.text}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--ink-muted)]">Mode</span>
              <span className="text-[var(--ink-muted)]">{import.meta.env.DEV ? "Development" : "Production"}</span>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-[var(--ink-muted)]">{statusPenyimpanan.detail}</p>
          <p className="text-xs leading-relaxed text-[var(--ink-muted)]">{statusOffline.detail}</p>

          <button
            type="button"
            onClick={() => setShowExitModal(true)}
            className="w-full min-h-[44px] py-2.5 rounded-xl bg-[var(--bg-danger)] text-[var(--ink-danger)] text-sm font-semibold hover:bg-[var(--bg-danger)] transition-colors">
            Keluar Aplikasi
          </button>

          <button
            type="button"
            onClick={() => setConfirmClearCache(true)}
            className="w-full min-h-[44px] py-2.5 rounded-xl bg-[var(--bg-subtle)] text-[var(--ink-strong)] text-sm font-semibold hover:bg-[var(--bg-subtle)] transition-colors">
            <TrashIcon size={13} className="mr-1 inline align-[-2px]" /> Bersihkan Cache (butuh internet setelahnya)
          </button>
        </div>
      </Section>

      {/* ── Riwayat Aktivitas (audit trail) ── */}
      <Section id="riwayat" title="Riwayat Aktivitas" icon={<ReceiptIcon size={18} />}>
        <AuditLogViewer />
      </Section>

      <DangerZoneDivider />

      <DangerZoneSection onRequirePin={() => requireFinancialPin("resetAll")} />


      {/* S-08: bersihkan cache melepas service worker — setelah itu app butuh internet. */}
      <ConfirmSheet
        open={confirmClearCache}
        title="Bersihkan cache?"
        message={"Setelah ini aplikasi butuh internet untuk dibuka.\n\nData murid, sesi, tagihan, laporan, dan pengaturan TIDAK terhapus — yang dibuang hanya salinan berkas aplikasi di perangkat. Halaman akan dimuat ulang setelah dibersihkan."}
        confirmLabel="Bersihkan cache"
        onCancel={() => setConfirmClearCache(false)}
        onConfirm={() => {
          setConfirmClearCache(false);
          void (async () => {
            if ("serviceWorker" in navigator) {
              const registrations = await navigator.serviceWorker.getRegistrations();
              for (const reg of registrations) await reg.unregister();
            }
            if ("caches" in window) {
              const keys = await caches.keys();
              await Promise.all(keys.map((k) => caches.delete(k)));
            }
            toastCtx.success("Cache dibersihkan ✓ Muat ulang...");
            setTimeout(() => location.reload(), 1000);
          })();
        }}
      />

      {showExitModal && <ExitAppModal onClose={() => setShowExitModal(false)} />}

      {/* ── Simpan ── */}
      <button onClick={handleSave} disabled={saveState.disabled} className={saveState.className}>
        {saveState.label}
      </button>
    </div>
    </AccordionProvider>
  );
}
