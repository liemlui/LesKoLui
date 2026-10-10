import { useState, useEffect, useRef, useMemo, useId, createContext, useContext } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  saveSettings, logAudit, listAuditLog,
  countSessionPhotos, pruneSessionPhotosBefore, shrinkSessionPhotosBefore,
} from "../db/repos";
import { shrinkPhotoBlob } from "../lib/foto";
import { db } from "../db/db";
import { exportBackup, importBackup, inspectBackup, type ImportProgressStep } from "../lib/backup";
import { isDriveConfigured, uploadBackupToDrive, downloadBackupFromDrive, findDriveBackup, testRelay } from "../lib/driveBackup";
import { exportDataCsvBlob } from "../lib/exportData";
import { hashPin, verifyPin } from "../lib/crypto";
import { getPinLockoutDelay, recordPinFailure, resetPinLockout } from "../lib/pinLockout";
import { useToastCtx } from "../components/ToastProvider";
import { todayWIB } from "../lib/format";
import { compressPhoto } from "../lib/foto";
import { downloadBlob } from "../lib/download";
import { APP_VERSION } from "../lib/version";
import { saveButtonState, settingsLoadGate, storageUsageState } from "../lib/settingsPresentation";
import { useSettingsQuery } from "../hooks/useSettingsQuery";
import SettingsLoadError from "../components/SettingsLoadError";
import Skeleton from "../components/Skeleton";
import ConfirmSheet from "../components/ConfirmSheet";
import { DEEPSEEK_MODEL, DEEPSEEK_MODEL_LABEL, DEEPSEEK_DOCS_URL, DEEPSEEK_PRICING_URL, DEEPSEEK_COST_NOTE } from "../lib/aiConfig";
import { pemakaianAiBulanIni, type PemakaianAiBulan } from "../lib/aiUsage";
import type { Settings, AuditAction } from "../db/types";
import { settingsDirtyPatch } from "../lib/settingsDirtyPatch";
import Toggle from "../components/Toggle";
import PinConfirmModal from "../components/PinConfirmModal";
import ExitAppModal from "../components/ExitAppModal";
import { UserIcon, KeyIcon, BankIcon, RobotIcon, BackupIcon, TrashIcon, ReceiptIcon, PhoneIcon, CameraIcon, ChartIcon, SearchIcon, CloudIcon, RefreshIcon, DownloadIcon, UploadIcon } from "../components/icons";

const WORDLIST = [
  "apel","baju","cabe","dadu","elang","fajar","gula","harap","ikan","jalan",
  "kapal","lampu","meja","nasi","obat","pagi","rasa","sapi","tahu","ular",
  "voli","waktu","xenon","yakin","zaman","angin","bunga","coklat","daun","ember",
];

// Panjang minimum kata sandi enkripsi backup. 4 karakter terlalu lemah untuk
// melindungi file backup yang berisi seluruh data murid & keuangan; 8 minimum,
// dan tombol "Generate" tetap disarankan (6 kata acak ≈ sangat kuat).
const MIN_PASS = 8;
const AUTO_BACKUP_KEY = "leskolui_last_auto_backup_prompt";

function markBackupReminderCurrent(): void {
  try { localStorage.setItem(AUTO_BACKUP_KEY, String(Date.now())); } catch { /* storage unavailable */ }
}

/** Estimasi kekuatan kasar kata sandi backup untuk umpan balik visual. */
function passStrength(p: string): { label: string; color: string; pct: number } {
  if (!p) return { label: "", color: "", pct: 0 };
  let score = 0;
  if (p.length >= MIN_PASS) score++;
  if (p.length >= 12) score++;
  if (/[a-z]/.test(p) && /[A-Z0-9]/.test(p)) score++;
  if (/[^a-zA-Z0-9]/.test(p) || p.includes("-")) score++;
  if (p.length < MIN_PASS) return { label: "Sangat lemah", color: "#dc2626", pct: 20 };
  if (score <= 1) return { label: "Lemah", color: "#f59e0b", pct: 40 };
  if (score === 2) return { label: "Cukup", color: "#eab308", pct: 60 };
  if (score === 3) return { label: "Baik", color: "#22c55e", pct: 80 };
  return { label: "Kuat", color: "#16a34a", pct: 100 };
}

function StorageUsage() {
  const [info, setInfo] = useState<{ used: number; quota: number } | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    let cancelled = false;
    if (!navigator.storage?.estimate) { setUnavailable(true); return; }
    navigator.storage.estimate()
      .then((e) => {
        if (cancelled) return;
        if (storageUsageState(e) === "ready") setInfo({ used: e.usage ?? 0, quota: e.quota ?? 0 });
        else setUnavailable(true);
      })
      .catch(() => { if (!cancelled) setUnavailable(true); });
    return () => { cancelled = true; };
  }, []);
  // Estimasi gagal / API tidak ada: beri tahu, jangan hilangkan barisnya diam-diam.
  if (!info && !unavailable) return null;
  const pct = info ? Math.round((info.used / info.quota) * 100) : 0;
  const mb = (b: number) => (b / 1024 / 1024).toFixed(1) + " MB";
  return (
    <div className="bg-[var(--surface)] rounded-xl p-3 space-y-1">
      <p className="text-xs font-semibold text-[var(--ink-muted)]">Penyimpanan Lokal</p>
      {info ? (
        <>
          <div className="w-full bg-[var(--bg-subtle)] rounded-full h-2">
            <div className="bg-[var(--brand-solid)] h-2 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
          <p className="text-xs text-[var(--ink-muted)]">{mb(info.used)} digunakan dari {mb(info.quota)} ({pct}%)</p>
        </>
      ) : (
        <p className="text-xs text-[var(--ink-muted)]">Perkiraan penyimpanan tidak tersedia di browser ini</p>
      )}
      {/* G3-07: foto murid sudah dikecilkan saat diunggah, jadi ia tidak punya
          perawatan otomatis seperti foto sesi — tetapi ia IKUT berkas backup,
          dan itu perlu dikatakan di layar tempat tutor mengurus penyimpanan. */}
      <p className="text-xs leading-relaxed text-[var(--ink-muted)]">
        Foto murid (maksimal 640 piksel) dan foto sesi ikut terhitung di sini dan ikut masuk berkas
        backup. Foto murid tidak masuk laporan PDF.
      </p>
    </div>
  );
}

// M-5: hemat penyimpanan foto sesi lama (data sesi tetap utuh).
// Dua pilihan: PERKECIL (foto tetap ada, resolusinya turun) atau HAPUS.
// Perkecilan juga berjalan otomatis 1×/30 hari untuk foto >12 bulan.
function PhotoMaintenance({ onToast }: { onToast: (m: string) => void }) {
  const cutoff = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);
  const oldCount = useLiveQuery(() => countSessionPhotos(cutoff), [cutoff]);
  const [busy, setBusy] = useState(false);
  /** S-10: HAPUS itu permanen → konfirmasi. PERKECIL tidak → langsung jalan. */
  const [confirmPrune, setConfirmPrune] = useState(false);

  const prune = async () => {
    setConfirmPrune(false);
    setBusy(true);
    try {
      const n = await pruneSessionPhotosBefore(cutoff);
      onToast(`${n} foto lama dihapus ✓`);
    } catch (e) {
      onToast("Gagal hapus foto: " + ((e as Error).message || "coba lagi"));
    } finally { setBusy(false); }
  };

  const shrink = async () => {
    setBusy(true);
    try {
      const r = await shrinkSessionPhotosBefore(cutoff, shrinkPhotoBlob);
      onToast(r.shrunk > 0
        ? `${r.shrunk} foto diperkecil · hemat ±${Math.round(r.savedBytes / 1024)} KB ✓`
        : "Tidak ada foto yang bisa diperkecil lagi ✓");
    } catch (e) {
      onToast("Gagal perkecil foto: " + ((e as Error).message || "coba lagi"));
    } finally { setBusy(false); }
  };

  if (!oldCount) return null;
  return (
    <div className="bg-[var(--bg-warn)] rounded-xl p-3 space-y-2">
      <p className="text-xs font-semibold text-[var(--ink-warn)]">🖼️ Foto sesi lama</p>
      <p className="text-xs text-[var(--ink-warn)]">
        {oldCount} foto dari sesi &gt; 6 bulan lalu. Foto &gt; 12 bulan diperkecil
        otomatis (tetap ada, resolusinya turun) agar backup tidak membengkak —
        catatan &amp; tanda tangan sesi tidak pernah diubah.
      </p>
      <button disabled={busy}
        onClick={() => setConfirmPrune(true)}
        className="w-full py-2 rounded-xl border border-[var(--border-danger)] bg-[var(--surface-strong)] text-[var(--ink-danger)] text-sm font-semibold hover:bg-[var(--bg-danger)] disabled:opacity-60 transition-colors">
        {busy ? "Menghapus..." : `Hapus ${oldCount} foto lama`}
      </button>
      <button disabled={busy}
        onClick={() => void shrink()}
        className="w-full py-2 rounded-xl bg-[var(--bg-warn-strong)] text-[var(--on-strong)] text-sm font-medium disabled:opacity-60">
        {busy ? "Memproses..." : "Perkecil foto (tanpa menghapus)"}
      </button>

      <ConfirmSheet
        open={confirmPrune}
        title={`Hapus ${oldCount} foto lama?`}
        message={`Foto sesi lebih lama dari 6 bulan akan DIHAPUS PERMANEN. Tindakan ini tidak bisa dibatalkan dan foto yang sudah dihapus TIDAK ada di file backup mana pun. Catatan & tanda tangan sesi tetap utuh.\n\nKalau hanya ingin menghemat ruang, pakai "Perkecil foto (tanpa menghapus)".`}
        confirmLabel="Hapus permanen"
        danger
        onCancel={() => setConfirmPrune(false)}
        onConfirm={() => void prune()}
      />
    </div>
  );
}

/**
 * Kalimat tahap restore. Restore file 10 MB+ bisa butuh puluhan detik; tanpa
 * kalimat ini layar tampak menggantung sehingga tutor menutup halaman di tengah
 * proses dan menganggap restore-nya gagal.
 */
const RESTORE_STEP_LABEL: Record<ImportProgressStep, string> = {
  "decrypt": "Mendekripsi backup (memakai Kata Sandi Enkripsi)...",
  "decode-media": "Membaca & menyiapkan foto/tanda tangan...",
  "validate": "Memeriksa keutuhan data...",
  "pre-restore-backup": "Membuat cadangan data lama (pre-restore)...",
  "write": "Menulis data ke perangkat...",
};

// L-1: penampil riwayat aktivitas penting (lokal per perangkat).
const AUDIT_LABEL: Record<AuditAction, string> = {
  "session.delete": "Hapus sesi",
  "session.cancel": "Batalkan sesi",
  "session.no_show": "Tandai tidak hadir",
  "session.reschedule": "Jadwalkan ulang sesi",
  "session.reprice": "Ubah tarif sesi lama (retroaktif)",
  "report.unlock": "Buka kunci laporan final",
  "student.delete": "Hapus murid",
  "payment.paid": "Tagihan ditandai lunas",
  "payment.unpaid": "Batal lunas",
  "payment.amount": "Ubah nominal tagihan",
  "payment.due": "Ubah jatuh tempo tagihan",
  "payment.cancel": "Batalkan tagihan",
  "payment.restore": "Pulihkan tagihan yang dibatalkan",
  "payment.discard": "Hapus salinan pemulihan tagihan",
  "expense.create": "Catat pengeluaran",
  "expense.update": "Ubah pengeluaran",
  "expense.delete": "Hapus pengeluaran",
  "month.close": "Tutup bulan",
  "data.reset": "Reset semua data",
  "data.restore": "Restore data",
  "photos.prune": "Hapus foto lama",
  "photos.shrink": "Perkecil foto lama",
  "ai.call": "Panggilan AI berbiaya",
};

/** Kunci tanggal lokal "YYYY-MM-DD" — bukan UTC, supaya grup hari tidak bergeser. */
function auditDayKey(ts: string): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Header grup: "Hari ini"/"Kemarin" lalu tanggal absolut agar konsisten. */
function auditDayLabel(ts: string): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Hari ini";
  if (d.toDateString() === yesterday.toDateString()) return "Kemarin";
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function AuditLogViewer() {
  const entries = useLiveQuery(() => listAuditLog(50), []);
  if (!entries || entries.length === 0)
    return <p className="text-xs text-[var(--ink-muted)] pt-3">Belum ada aktivitas tercatat.</p>;

  // Kelompokkan per hari (audit V-14) — daftar panjang jadi mudah dipindai.
  const groups: Array<{ key: string; label: string; items: NonNullable<typeof entries> }> = [];
  for (const e of entries) {
    const key = auditDayKey(e.timestamp);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(e);
    else groups.push({ key, label: auditDayLabel(e.timestamp), items: [e] });
  }

  return (
    <div className="pt-3 space-y-3 max-h-72 overflow-y-auto">
      {groups.map((g) => (
        <div key={g.key} className="space-y-1.5">
          <p className="sticky top-0 z-10 bg-[var(--surface-strong)]/95 py-0.5 text-xs font-bold uppercase tracking-wide text-[var(--ink-muted)]">
            {g.label}
          </p>
          {g.items.map((e) => (
            <div key={e.id} className="flex items-start justify-between gap-2 text-xs border-b border-[var(--border)] pb-1.5">
              <div className="min-w-0">
                <p className="font-medium text-[var(--ink-strong)]">{AUDIT_LABEL[e.action] ?? e.action}</p>
                {e.details && <p className="text-[var(--ink-muted)] truncate">{e.details}</p>}
              </div>
              <span className="text-[var(--ink-muted)] flex-shrink-0">
                {new Date(e.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// Accordion: hanya satu Section terbuka pada satu waktu (id = title, unik).
const AccordionContext = createContext<{
  openId: string | null;
  setOpenId: (id: string | null) => void;
} | null>(null);

function Section({
  title, icon, badge, defaultOpen = false, children,
}: {
  title: string; icon: React.ReactNode; badge?: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const ctx = useContext(AccordionContext);
  const [localOpen, setLocalOpen] = useState(defaultOpen);
  const contentId = useId();
  const open = ctx ? ctx.openId === title : localOpen;
  const toggle = () => {
    if (ctx) ctx.setOpenId(open ? null : title);
    else setLocalOpen((o) => !o);
  };
  return (
    <div className="bg-[var(--surface-strong)] rounded-2xl shadow-sm border border-[var(--border)] overflow-hidden">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={contentId}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex-shrink-0 text-[var(--ink-muted)]">{icon}</span>
          <span className="text-sm font-semibold text-[var(--ink-strong)]">{title}</span>
          {badge && (
            <span className="text-xs bg-[var(--bg-success)] text-[var(--ink-success)] px-2 py-0.5 rounded-full font-medium">{badge}</span>
          )}
        </div>
        <span className={`text-[var(--ink-muted)] text-sm transition-transform duration-200 ${open ? "rotate-180" : ""}`}>▼</span>
      </button>
      {open && <div id={contentId} className="px-4 pb-4 pt-0 space-y-3 border-t border-[var(--border)]">{children}</div>}
    </div>
  );
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
  const [pinMode,     setPinMode]     = useState<"view" | "verifyOld" | "forgotPin" | "edit">("view");
  const [oldPin,      setOldPin]      = useState("");
  const [forgotA,     setForgotA]     = useState("");
  const [secQ,        setSecQ]        = useState("");
  const [secA,        setSecA]        = useState("");
  const [newPin,      setNewPin]      = useState("");
  const [newPinConf,  setNewPinConf]  = useState("");
  const [pinError,    setPinError]    = useState("");
  const [pinRecoveryBusy, setPinRecoveryBusy] = useState(false);
  const [pinAction,   setPinAction]   = useState<"exportBackup" | "restore" | "resetAll" | "driveBackup" | "driveRestore" | "exportCsv" | null>(null);
  /** Tahap restore yang sedang berjalan — ditampilkan agar layar tidak "diam". */
  const [restoreProgress, setRestoreProgress] = useState("");
  const [verifying,   setVerifying]   = useState(false);
  const [relaySecret, setRelaySecret] = useState(() => { try { return localStorage.getItem("leskolui_relay_secret") || ""; } catch { return ""; } });
  const [relayBusy,   setRelayBusy]   = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [showExitModal, setShowExitModal] = useState(false);
  const restoreRef = useRef<HTMLInputElement>(null);
  const fileRef    = useRef<HTMLInputElement>(null);
  const pinRecoveryInFlightRef = useRef(false);
  const savedFormRef = useRef<Settings | null>(null);

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

  const handleVerifyOldPin = async () => {
    if (!form?.financialPin || pinRecoveryInFlightRef.current) return;
    const delay = getPinLockoutDelay();
    if (delay > 0) { setPinError(`Terlalu banyak percobaan. Tunggu ${Math.ceil(delay / 1000)} detik.`); return; }
    pinRecoveryInFlightRef.current = true;
    setPinRecoveryBusy(true);
    try {
      const ok = await verifyPin(oldPin, form.financialPin);
      if (!ok) { recordPinFailure(); setPinError("PIN lama salah."); return; }
      resetPinLockout();
      setPinError(""); setOldPin("");
      setSecQ(form.securityQuestion || ""); setSecA("");
      setPinMode("edit");
    } finally {
      pinRecoveryInFlightRef.current = false;
      setPinRecoveryBusy(false);
    }
  };

  const handleVerifyForgot = async () => {
    if (pinRecoveryInFlightRef.current) return;
    if (!form?.securityAnswer) { setPinError("Pertanyaan keamanan belum disetel."); return; }
    const delay = getPinLockoutDelay();
    if (delay > 0) { setPinError(`Terlalu banyak percobaan. Tunggu ${Math.ceil(delay / 1000)} detik.`); return; }
    pinRecoveryInFlightRef.current = true;
    setPinRecoveryBusy(true);
    try {
      const ok = await verifyPin(forgotA.trim().toLowerCase(), form.securityAnswer);
      if (!ok) { recordPinFailure(); setPinError("Jawaban salah."); return; }
      resetPinLockout();
      setPinError(""); setForgotA("");
      setSecQ(form.securityQuestion || ""); setSecA("");
      setPinMode("edit");
    } finally {
      pinRecoveryInFlightRef.current = false;
      setPinRecoveryBusy(false);
    }
  };

  const handleSetPin = async () => {
    if (newPin.length < 6) { setPinError("PIN harus 6 digit."); return; }
    if (newPin !== newPinConf) { setPinError("PIN tidak cocok."); return; }
    if (!secQ.trim()) { setPinError("Pertanyaan keamanan wajib diisi."); return; }
    if (!form?.securityAnswer && !secA.trim()) { setPinError("Jawaban wajib diisi untuk PIN baru."); return; }
    
    try {
      const hashed = await hashPin(newPin);
      let hashedAns = form?.securityAnswer;
      if (secA.trim()) {
        hashedAns = await hashPin(secA.trim().toLowerCase());
      }

      const updated: Settings = { ...form, financialPin: hashed, securityQuestion: secQ.trim(), securityAnswer: hashedAns };
      // Patch, bukan snapshot Settings penuh: `form` bisa lebih tua daripada isi
      // IndexedDB (mis. backup selesai dari layar/prompt lain), sehingga menulis
      // snapshot penuh akan memundurkan `lastBackupAt`/`driveBackup`.
      await saveSettings(settingsDirtyPatch(savedFormRef.current ?? form, updated));
      savedFormRef.current = updated;
      setForm(updated);
      setDirty(false);
      toastCtx.success("PIN berhasil diperbarui ✓");
      setPinMode("view"); setNewPin(""); setNewPinConf(""); setPinError(""); setSecQ(""); setSecA("");
    } catch (e) {
      toastCtx.error("PIN gagal disimpan: " + ((e as Error).message || "terjadi kesalahan."));
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
    setRestoreProgress("Membaca & mendekripsi backup...");
    try {
      await importBackup(file, backupPass, {
        onProgress: (step) => setRestoreProgress(RESTORE_STEP_LABEL[step]),
        onValidationWarnings: async (warnings) => {
          const summary = warnings.map((w) => `- ${w.table}.${w.rowId}.${w.field}: ${w.message}`).join("\n");
          return confirm(`Backup memiliki ${warnings.length} peringatan validasi:\n\n${summary}\n\nLanjutkan restore?`);
        },
      });
    } finally {
      setRestoreProgress("");
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
    setRestoreProgress(RESTORE_STEP_LABEL.decrypt);
    try {
      await importBackup(blob, backupPass, {
        onProgress: (step) => setRestoreProgress(RESTORE_STEP_LABEL[step]),
        onValidationWarnings: async (warnings) => {
          const summary = warnings.map((w) => `- ${w.table}.${w.rowId}.${w.field}: ${w.message}`).join("\n");
          return confirm(`Backup memiliki ${warnings.length} peringatan validasi:\n\n${summary}\n\nLanjutkan restore?`);
        },
      });
    } finally {
      setRestoreProgress("");
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
    setVerifying(true);
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
      setVerifying(false);
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
      toastCtx.success("Auto backup Drive aktif ✓ (passphrase tersimpan di perangkat)");
    } else {
      localStorage.removeItem("leskolui_drive_auto");
      localStorage.removeItem("leskolui_drive_pass");
      setDriveAuto(false);
      toastCtx.info("Auto backup Drive dimatikan");
    }
  };

  const doResetAll = async () => {
    const tables = [
      db.students, db.sessions, db.reports,
      db.payments, db.followUps,
      db.raporGrades, db.expenses, db.iaeeProjects,
      db.studyNotes, db.captureDrafts, db.settings, db.auditLog,
    ];
    await db.transaction("rw", tables, async () => {
      for (const t of tables) await t.clear();
    });
    // Catat reset setelah clear agar jejak auditnya tetap ada (satu entri).
    await logAudit("data.reset", "data");
    toastCtx.success("Semua data berhasil dihapus ✓ Memuat ulang...");
    setTimeout(() => location.reload(), 1500);
  };

  const runPinAction = async () => {
    if (!pinAction) return;
    try {
      if (pinAction === "exportBackup") await doExportBackup();

      if (pinAction === "restore") await doRestore();
      if (pinAction === "resetAll") await doResetAll();
      if (pinAction === "driveBackup") await doDriveBackup();
      if (pinAction === "driveRestore") await doDriveRestore();
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
    driveBackup: {
      title: "Backup ke Google Drive",
      description: "Masukkan PIN Keuangan sebelum mengunggah backup ke Drive.",
      confirmLabel: "Backup",
    },
    driveRestore: {
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
    <AccordionContext.Provider value={{ openId: openSection, setOpenId: setOpenSection }}>
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

      {/* ── Profil Tutor ── */}
      <Section title="Profil Tutor" icon={<UserIcon size={18} />}>
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



      {/* ── PIN Keuangan ── */}
      <Section title="PIN Keuangan" icon={<KeyIcon size={18} />} badge={form.financialPin ? "Aktif" : undefined}>
        <div className="pt-3 space-y-3">
          <p className="text-xs text-[var(--ink-muted)]">Melindungi akses rekap keuangan & hapus sesi</p>

          {pinMode === "view" ? (
            <div className="flex gap-2">
              <button onClick={() => {
                if (form.financialPin) setPinMode("verifyOld");
                else { setSecQ(""); setSecA(""); setPinMode("edit"); }
              }}
                className="flex-1 text-sm font-medium text-[var(--ink-brand)] bg-[var(--brand-tint)] hover:bg-[var(--brand-tint-strong)] px-3 py-2.5 rounded-xl transition-colors">
                {form.financialPin ? "Ganti PIN" : "Buat PIN"}
              </button>
              {form.financialPin && form.securityQuestion && (
                <button onClick={() => { setPinMode("forgotPin"); setPinError(""); setOldPin(""); setForgotA(""); }}
                  className="text-sm font-medium text-[var(--ink-muted)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle)] px-3 py-2.5 rounded-xl transition-colors whitespace-nowrap">
                  Lupa PIN?
                </button>
              )}
            </div>
          ) : pinMode === "verifyOld" ? (
            <div className="space-y-3">
              <div>
                <label htmlFor="set-pin-lama" className="label">Masukkan PIN Lama</label>
                <input id="set-pin-lama" className="input text-center text-xl tracking-widest font-mono" type="password"
                  inputMode="numeric" maxLength={6} placeholder="••••••"
                  value={oldPin} onChange={(e) => { setOldPin(e.target.value.replace(/\D/g, "").slice(0, 6)); setPinError(""); }} />
              </div>
              {pinError && <p className="text-[var(--ink-danger)] text-sm">{pinError}</p>}
              <div className="flex gap-2">
                <button onClick={handleVerifyOldPin} disabled={pinRecoveryBusy || oldPin.length !== 6}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--brand-solid)] text-[var(--on-strong)] font-semibold text-sm disabled:opacity-40 hover:bg-[var(--brand-solid)] transition-colors">{pinRecoveryBusy ? "Memeriksa..." : "Lanjut"}</button>
                <button onClick={() => { setPinMode("view"); setOldPin(""); setPinError(""); }} disabled={pinRecoveryBusy}
                  className="px-4 py-2.5 rounded-xl bg-[var(--bg-subtle)] text-[var(--ink-muted)] text-sm font-medium hover:bg-[var(--bg-subtle)] transition-colors">Batal</button>
              </div>
              {form.securityQuestion && (
                <button onClick={() => { setPinMode("forgotPin"); setPinError(""); setOldPin(""); }}
                  className="w-full text-center text-sm font-medium text-[var(--ink-brand)] pt-2 hover:underline">
                  Lupa PIN? Jawab Pertanyaan Keamanan
                </button>
              )}
            </div>
          ) : pinMode === "forgotPin" ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-[var(--ink-strong)] bg-[var(--surface)] p-3 rounded-lg border border-[var(--border)]">
                <span className="text-[var(--ink-muted)] block text-xs mb-1">Pertanyaan Keamanan:</span>
                {form.securityQuestion}
              </p>
              <div>
                <label htmlFor="set-jawaban-anda" className="label">Jawaban Anda</label>
                <input id="set-jawaban-anda" className="input" type="text" placeholder="Jawaban rahasia..."
                  value={forgotA} onChange={(e) => { setForgotA(e.target.value); setPinError(""); }} />
              </div>
              {pinError && <p className="text-[var(--ink-danger)] text-sm">{pinError}</p>}
              <div className="flex gap-2">
                <button onClick={handleVerifyForgot} disabled={pinRecoveryBusy || !forgotA.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--brand-solid)] text-[var(--on-strong)] font-semibold text-sm disabled:opacity-40 hover:bg-[var(--brand-solid)] transition-colors">{pinRecoveryBusy ? "Memeriksa..." : "Verifikasi"}</button>
                <button onClick={() => { setPinMode("view"); setForgotA(""); setPinError(""); }} disabled={pinRecoveryBusy}
                  className="px-4 py-2.5 rounded-xl bg-[var(--bg-subtle)] text-[var(--ink-muted)] text-sm font-medium hover:bg-[var(--bg-subtle)] transition-colors">Kembali</button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label htmlFor="set-pin-baru" className="label">PIN Baru (6 digit)</label>
                <input id="set-pin-baru" className="input text-center text-xl tracking-widest font-mono" type="password"
                  inputMode="numeric" maxLength={6} placeholder="••••••"
                  value={newPin} onChange={(e) => { setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6)); setPinError(""); }} />
              </div>
              <div>
                <label htmlFor="set-pin-konfirmasi" className="label">Konfirmasi PIN Baru</label>
                <input id="set-pin-konfirmasi" className={`input text-center text-xl tracking-widest font-mono ${pinError?.includes("cocok") ? "border-[var(--ink-danger)]" : ""}`}
                  type="password" inputMode="numeric" maxLength={6} placeholder="••••••"
                  value={newPinConf} onChange={(e) => { setNewPinConf(e.target.value.replace(/\D/g, "").slice(0, 6)); setPinError(""); }} />
              </div>
              <div className="pt-2 border-t border-[var(--border)]">
                <p className="text-xs text-[var(--ink-brand)] mb-2 font-medium">Lupa PIN Recovery (Wajib):</p>
                <label htmlFor="set-sec-q" className="label">Pertanyaan Keamanan</label>
                <input id="set-sec-q" className="input mb-2" type="text" maxLength={100} placeholder="Contoh: Nama hewan peliharaan?"
                  value={secQ} onChange={(e) => { setSecQ(e.target.value); setPinError(""); }} />
                <label htmlFor="set-sec-a" className="label">Jawaban Keamanan</label>
                <input id="set-sec-a" className="input" type="text" maxLength={100} placeholder={form.securityAnswer ? "(Biarkan kosong jika tak ganti)" : "Jawaban rahasia..."}
                  value={secA} onChange={(e) => { setSecA(e.target.value); setPinError(""); }} />
              </div>
              {pinError && <p className="text-[var(--ink-danger)] text-sm">{pinError}</p>}
              <div className="flex gap-2">
                <button onClick={handleSetPin} disabled={newPin.length !== 6 || newPinConf.length !== 6}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--brand-solid)] text-[var(--on-strong)] font-semibold text-sm disabled:opacity-40 hover:bg-[var(--brand-solid)] transition-colors">Simpan PIN</button>
                <button onClick={() => { setPinMode("view"); setNewPin(""); setNewPinConf(""); setSecQ(""); setSecA(""); setPinError(""); }}
                  className="px-4 py-2.5 rounded-xl bg-[var(--bg-subtle)] text-[var(--ink-muted)] text-sm font-medium hover:bg-[var(--bg-subtle)] transition-colors">Batal</button>
              </div>
            </div>
          )}

          <p className="text-xs text-[var(--ink-muted)] pt-2 border-t border-[var(--border)]">
            Buka data keuangan dari tab <b>💰 Keuangan</b> di menu bawah (akan diminta PIN ini).
          </p>
        </div>
      </Section>

      {/* ── Rekening Bank ── */}
      <Section title="Rekening Bank" icon={<BankIcon size={18} />}>
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

      {/* ── AI ── */}
      <Section title="AI — DeepSeek" icon={<RobotIcon size={18} />} badge={form.ai.enabled && form.ai.apiKey ? "Aktif" : undefined}>
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
                  <li>Analisis keuangan: ringkasan periode, nama dan data keuangan murid, piutang, pengeluaran, serta pembanding dan proyeksi.</li>
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



      {/* ── Backup & Restore ── */}
      <Section title="Backup & Restore" icon={<BackupIcon size={18} />}>
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
                    {backupPass.length < MIN_PASS && ` — minimal ${MIN_PASS} karakter (pakai "Generate" untuk kunci kuat)`}
                  </p>
                </div>
              );
            })()}
            <p className="text-xs text-[var(--ink-muted)]">
              Dipakai untuk <b>backup &amp; restore</b> (File &amp; Drive). <b>Simpan baik-baik</b> — kunci ini tak tersimpan & wajib untuk membuka backup di HP lain.
            </p>
          </div>

          {/* Metode 1: File */}
          <div className="bg-[var(--brand-tint)] rounded-xl p-3 space-y-2.5">
            <p className="text-sm font-semibold text-[var(--ink-brand)]">📁 File (.jles)</p>
            <button className="w-full py-2.5 rounded-xl bg-[var(--brand-solid)] text-[var(--on-strong)] text-sm font-semibold hover:bg-[var(--brand-solid)] transition-colors"
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
                  if (!confirm("Restore akan mengganti semua data saat ini. Lanjut?")) return;
                  requireFinancialPin("restore");
                }}>
                <RefreshIcon size={13} className="mr-1 inline align-[-2px]" /> Restore dari File
              </button>
              {/* Pratinjau file tanpa menyentuh data: menjawab "file-nya atau
                  kata sandinya yang salah?" sebelum tutor menekan Restore. */}
              <button
                disabled={restoreProgress !== ""}
                className="w-full py-2 rounded-xl bg-[var(--surface-strong)] text-[var(--ink-brand)] text-sm font-medium border border-[var(--brand-tint-strong)] hover:bg-[var(--brand-tint)] transition-colors disabled:opacity-60"
                onClick={async () => {
                  const file = restoreRef.current?.files?.[0];
                  if (!file) { toastCtx.info("Pilih file .jles dulu!"); return; }
                  if (!backupPass) { toastCtx.info("Isi Kata Sandi Enkripsi dulu!"); return; }
                  setRestoreProgress(RESTORE_STEP_LABEL.decrypt);
                  try {
                    const summary = await inspectBackup(file, backupPass);
                    const counts = summary.tableCounts;
                    toastCtx.info(`File terbaca ✓ ${counts.students} murid · ${counts.sessions} sesi · ${counts.reports} laporan · ${counts.payments} tagihan (${new Date(summary.exportedAt).toLocaleDateString("id-ID", { dateStyle: "medium" })})`);
                  } catch (e) {
                    toastCtx.error("File tidak bisa dibaca: " + ((e as Error).message || "kata sandi salah / file rusak"));
                  } finally {
                    setRestoreProgress("");
                  }
                }}>
                <SearchIcon size={13} className="mr-1 inline align-[-2px]" /> Cek file ini bisa dibuka
              </button>
              {restoreProgress && (
                <p role="status" aria-live="polite" className="rounded-lg bg-[var(--brand-tint-strong)] px-2.5 py-2 text-xs font-medium text-[var(--ink-brand)]">
                  ⏳ {restoreProgress} Jangan tutup halaman ini.
                </p>
              )}
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
                  requireFinancialPin("driveBackup");
                }}>
                <CloudIcon size={13} className="mr-1 inline align-[-2px]" /><UploadIcon size={13} className="mr-1 inline align-[-2px]" /> Backup ke Drive
              </button>
              <button className="w-full py-2 rounded-xl bg-[var(--bg-success)] text-[var(--ink-success)] text-sm font-medium hover:bg-[var(--bg-success-strong)] transition-colors"
                onClick={() => {
                  if (!backupPass) { toastCtx.info("Isi Kata Sandi Enkripsi dulu!"); return; }
                  if (!confirm("Restore dari Google Drive akan mengganti semua data saat ini. Lanjut?")) return;
                  requireFinancialPin("driveRestore");
                }}>
                <CloudIcon size={13} className="mr-1 inline align-[-2px]" /><RefreshIcon size={13} className="mr-1 inline align-[-2px]" /> Restore dari Drive
              </button>
              <button disabled={verifying}
                className="w-full py-2 rounded-xl bg-[var(--surface-strong)] text-[var(--ink-success)] text-sm font-medium border border-[var(--border-success)] hover:bg-[var(--bg-success)] transition-colors disabled:opacity-60"
                onClick={doVerifyDrive}>
                {verifying ? "Memverifikasi..." : <><SearchIcon size={13} className="mr-1 inline align-[-2px]" /> Verifikasi backup Drive</>}
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
        </div>
      </Section>

      {/* ── Hapus Semua Data ── */}
      <Section title="Hapus Semua Data" icon={<TrashIcon size={18} />}>
        <div className="pt-3 space-y-3">
          <p className="text-xs text-[var(--ink-danger)] font-semibold">
            ⚠️ Menghapus semua data murid, sesi, tagihan, laporan, dan pengeluaran.
          </p>
          <p className="text-xs text-[var(--ink-muted)]">
            Ikut terhapus juga: PIN Keuangan, pertanyaan keamanan, kunci API AI, logo, profil tutor,
            dan rekening bank — beserta catatan audit (kecuali satu jejak reset), draf Catat Sesi
            yang belum tersimpan, dan pengingat backup terakhir.
          </p>
          <p className="text-xs text-[var(--ink-muted)]">
            Yang tetap ada: file backup yang sudah Anda unduh (termasuk yang di Google Drive) dan
            kata sandi backup yang mungkin tersimpan di browser ini. Setelah reset, aplikasi terbuka
            dengan pengaturan bawaan — tanpa PIN.
          </p>
          <button
            onClick={async () => {
              if (!confirm("Yakin hapus SEMUA data? Tindakan ini tidak bisa dibatalkan!")) return;
              const word = prompt('Ketik "RESET" untuk konfirmasi:');
              if (word !== "RESET") { toastCtx.info("Konfirmasi gagal — ketik RESET."); return; }
              requireFinancialPin("resetAll");
            }}
            className="w-full py-3 rounded-xl bg-[var(--bg-danger-strong)] text-[var(--on-strong)] text-sm font-bold hover:bg-[var(--bg-danger-strong)] transition-colors">
            <TrashIcon size={13} className="mr-1 inline align-[-2px]" /> Hapus Semua Data
          </button>
        </div>
      </Section>

      {/* ── Riwayat Aktivitas (audit trail) ── */}
      <Section title="Riwayat Aktivitas" icon={<ReceiptIcon size={18} />}>
        <AuditLogViewer />
      </Section>

      {/* ── PWA / Aplikasi ── */}
      <Section title="Aplikasi (PWA)" icon={<PhoneIcon size={18} />}>
        <div className="pt-3 space-y-3">
          <StorageUsage />
          <div className="bg-[var(--surface)] rounded-xl p-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--ink-muted)]">Versi</span>
              <span className="font-semibold text-[var(--ink-strong)]">{APP_VERSION}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--ink-muted)]">Framework</span>
              <span className="text-[var(--ink-muted)]">React + Vite + Tailwind</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--ink-muted)]">Database</span>
              <span className="text-[var(--ink-muted)]">IndexedDB (lokal)</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--ink-muted)]">Mode</span>
              <span className="text-[var(--ink-muted)]">{import.meta.env.DEV ? "⚙️ Development" : "🚀 Production"}</span>
            </div>
          </div>

          <button
            onClick={() => setShowExitModal(true)}
            className="w-full py-2.5 rounded-xl bg-[var(--bg-danger)] text-[var(--ink-danger)] text-sm font-semibold hover:bg-[var(--bg-danger)] transition-colors">
            ⏻ Keluar Aplikasi
          </button>

          <button
            onClick={() => setConfirmClearCache(true)}
            className="w-full py-2.5 rounded-xl bg-[var(--bg-subtle)] text-[var(--ink-strong)] text-sm font-semibold hover:bg-[var(--bg-subtle)] transition-colors">
            <TrashIcon size={13} className="mr-1 inline align-[-2px]" /> Bersihkan Cache (butuh internet setelahnya)
          </button>
        </div>
      </Section>

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
    </AccordionContext.Provider>
  );
}
