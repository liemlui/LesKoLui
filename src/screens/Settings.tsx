import { useState, useEffect, useRef } from "react";
import { saveSettings } from "../db/repos";
import { useToastCtx } from "../components/ToastProvider";
import { compressPhoto } from "../lib/foto";
import { APP_VERSION } from "../lib/version";
import { settingsLoadGate } from "../lib/settingsPresentation";
import { PESAN_TINGGALKAN_HALAMAN, harusDitahan, perluBeforeUnload } from "../lib/settingsSaveBar";
import SettingsSaveBar from "./settings/SettingsSaveBar";
import { useSettingsQuery } from "../hooks/useSettingsQuery";
import SettingsLoadError from "../components/SettingsLoadError";
import Skeleton from "../components/Skeleton";
import ConfirmSheet from "../components/ConfirmSheet";
import { DEEPSEEK_MODEL } from "../lib/aiConfig";
import { pemakaianAiBulanIni, type PemakaianAiBulan } from "../lib/aiUsage";
import type { Settings } from "../db/types";
import { settingsDirtyPatch } from "../lib/settingsDirtyPatch";
import PinConfirmModal from "../components/PinConfirmModal";
import ExitAppModal from "../components/ExitAppModal";
import { TrashIcon, ReceiptIcon, PhoneIcon } from "../components/icons";
import { MIN_PASS } from "../lib/passphrase";
import { offlineState, persistState } from "../lib/appSettingsStatus";
import { usePwaUpdate } from "../hooks/usePwaUpdate";
import PwaUpdateUi from "../components/PwaUpdateUi";
import { AccordionProvider, DangerZoneDivider, Section } from "./settings/Section";
import PinSection from "./settings/PinSection";
import DangerZoneSection from "./settings/DangerZoneSection";
import { jalankanResetSemuaData } from "./settings/dangerZoneActions";
import { useJalurPemulihan } from "./settings/useBackupSection";
import BackupSection from "./settings/BackupSection";
import AiSection from "./settings/AiSection";
import ProfileBankSections from "./settings/ProfileBankSections";
import StorageUsage from "./settings/StorageUsage";
import { buatBackupHandlers } from "./settings/backupHandlers";
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
  /**
   * Waktu penyimpanan terakhir BERHASIL (ISO). Dipakai bilah simpan untuk
   * menuliskan "Tersimpan 14:03" — G3-09 butir 1 meminta status berwaktu,
   * bukan sekadar kata "tersimpan".
   */
  const [savedAt, setSavedAt] = useState<string | null>(null);
  /**
   * Pesan kegagalan penyimpanan terakhir. Toast hilang sendiri, sedangkan
   * tutor perlu tahu bahwa perubahannya MASIH belum tersimpan — jadi
   * kegagalannya juga dicatat sebagai keadaan (G3-09 butir 8).
   */
  const [simpanGagal, setSimpanGagal] = useState<string | null>(null);
  /**
   * Rujukan keadaan untuk penjaga di dalam `useEffect` berisi `[]`: kalau
   * penjaganya dipasang ulang setiap kali `dirty` berubah, pendengarnya
   * sempat lepas tepat saat peristiwa datang.
   */
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const handleSaveRef = useRef<(() => Promise<void>) | null>(null);
  dirtyRef.current = dirty;
  savingRef.current = saving;
  const toastCtx = useToastCtx();
  const [pinAction,   setPinAction]   = useState<"exportBackup" | "restore" | "resetAll" | "backupDrive" | "restoreDrive" | "exportCsv" | null>(null);

  /**
   * Keadaan bersama jalur backup & pemulihan (G3-09 butir 5): satu jalur
   * berjalan = tombol lain nonaktif, dan tahapnya terlihat di layar.
   *
   * Dialog konfirmasi pemulihan dan peringatan validasi impor **tidak** dipegang
   * di sini: keduanya hidup di dalam `BackupSection`, bersama berkas yang dipilih.
   */
  const jalur = useJalurPemulihan();
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [showExitModal, setShowExitModal] = useState(false);
  const fileRef    = useRef<HTMLInputElement>(null);
  const savedFormRef = useRef<Settings | null>(null);

  /**
   * Penjaga perubahan belum disimpan (G3-09 butir 2).
   *
   * Dua jalur yang berbeda, dan itu disengaja:
   * - **`beforeunload`** untuk navigasi yang meninggalkan dokumen (muat ulang,
   *   tutup tab, ketik alamat lain) — peramban yang menanyakan, karena kita
   *   tidak bisa menahan navigasi itu sendiri;
   * - **pendengar pembaruan aplikasi** untuk jalur yang kita kendalikan: sebelum
   *   service worker baru dipasang, pengaturan disimpan lebih dulu supaya
   *   perubahan yang belum tersimpan tidak hilang bersama muat ulang.
   */
  useEffect(() => {
    const sudahSimpan = () => { void handleSaveRef.current?.(); };
    const onSebelumPerbarui = (e: Event) => {
      if (!harusDitahan(dirtyRef.current, savingRef.current)) return;
      const detail = (e as CustomEvent<{ flushes: Array<() => Promise<void>> }>).detail;
      detail?.flushes.push(async () => { sudahSimpan(); });
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!perluBeforeUnload(dirtyRef.current, savingRef.current)) return;
      e.preventDefault();
      // Peramban modern mengabaikan teks khusus; mengembalikan nilai apa pun
      // (termasuk string kosong) sudah cukup untuk memunculkan konfirmasi.
      e.returnValue = PESAN_TINGGALKAN_HALAMAN;
      return PESAN_TINGGALKAN_HALAMAN;
    };
    window.addEventListener("leskolui:before-pwa-update", onSebelumPerbarui);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("leskolui:before-pwa-update", onSebelumPerbarui);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, []);

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
    setSimpanGagal(null);
    try {
      // Jangan kirim snapshot Settings penuh: metadata backup yang baru ditulis
      // alur lain dapat lebih baru daripada form yang sedang terbuka.
      await saveSettings(settingsDirtyPatch(savedFormRef.current ?? form, form));
      savedFormRef.current = form;
      setDirty(false);
      setSavedAt(new Date().toISOString());
      toastCtx.success("Pengaturan disimpan ✓");
    } catch (e) {
      const pesan = "Gagal menyimpan: " + ((e as Error).message || "terjadi kesalahan.");
      // Dicatat di keadaan, bukan hanya di toast: toast hilang sendiri, sedangkan
      // tutor perlu tahu bahwa perubahannya MASIH belum tersimpan.
      setSimpanGagal(pesan);
      toastCtx.error(pesan);
    } finally {
      setSaving(false);
    }
  };
  // Penjaga memanggil penyimpanan lewat rujukan ini (lihat `handleSaveRef`).
  handleSaveRef.current = handleSave;

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

  const requireFinancialPin = (action: typeof pinAction) => {
    if (!action) return;
    if (!form.financialPin) {
      toastCtx.info("Buat PIN Keuangan dulu sebelum menjalankan aksi ini.");
      return;
    }
    setPinAction(action);
  };

  /**
   * Pengubah jalur backup & pemulihan. Fungsi-fungsinya hidup di
   * `settings/backupHandlers.ts` supaya berkas ini tidak menumpuk lagi — dan
   * karena berkas komponen tidak boleh mengekspor bukan-komponen.
   *
   * **Bukan `useMemo`, dan itu disengaja.** `buatBackupHandlers` hanya membuat
   * closure, jadi biayanya nihil; sedangkan `useMemo` harus dipanggil SEBELUM
   * gerbang `settingsView !== "ready"` (aturan hook React), dan mengangkatnya ke
   * sana berarti membuat objek yang belum bisa dipakai. Objek baru setiap render
   * tidak merusak apa pun: `BackupSection` memakainya di dalam callback, bukan
   * sebagai dependensi efek.
   */
  const aksiBackup = buatBackupHandlers({
    jalur,
    backupPass: "",
    driveAuto: false,
    form,
    setForm,
    markBackupReminderCurrent,
    toast: toastCtx,
    onDriveAutoChange: () => { /* keadaan toggle dipegang BackupSection */ },
    minPass: MIN_PASS,
    muatUlang: (ms) => setTimeout(() => location.reload(), ms),
  });

  // Verifikasi backup Drive: unduh + dekripsi untuk pastikan file valid & terbaca.
  const runPinAction = async () => {
    if (!pinAction) return;
    try {
      if (pinAction === "exportBackup") await aksiBackup?.doExportBackup();
      if (pinAction === "resetAll") await doResetAll();
      if (pinAction === "backupDrive") await aksiBackup?.doDriveBackup();
      if (pinAction === "restoreDrive") await aksiBackup?.doDriveRestore();
      if (pinAction === "exportCsv") await aksiBackup?.doExportCsv();
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

      <BackupSection
        form={form}
        jalur={jalur}
        aksi={aksiBackup}
        mintaPin={(a) => requireFinancialPin(a)}
        toast={toastCtx}
      />

      <AiSection
        form={form}
        updateAi={updateAi}
        pemakaian={pemakaian}
        aiConfigured={aiConfigured}
      />

      <ProfileBankSections
        form={form}
        logoUrl={logoUrl}
        update={update}
        updateProfile={updateProfile}
        updateBank={updateBank}
        fileRef={fileRef}
        handleLogo={handleLogo}
      />

      <PinSection
        financialPin={form.financialPin}
        securityQuestion={form.securityQuestion}
        securityAnswer={form.securityAnswer}
        onSave={simpanPin}
      />


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

      <SettingsSaveBar
        dirty={dirty}
        saving={saving}
        savedAt={savedAt}
        errorMessage={simpanGagal}
        onSave={() => void handleSave()}
      />
    </div>
    </AccordionProvider>
  );
}
