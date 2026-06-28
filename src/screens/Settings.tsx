import { useState, useEffect, useRef, useMemo, createContext, useContext } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  getSettings, saveSettings, logAudit, listAuditLog,
  countSessionPhotos, pruneSessionPhotosBefore,
} from "../db/repos";
import { db } from "../db/db";
import { exportBackup, importBackup } from "../lib/backup";
import { isDriveConfigured, uploadBackupToDrive, downloadBackupFromDrive, findDriveBackup } from "../lib/driveBackup";
import { hashPin, verifyPin } from "../lib/crypto";
import { todayWIB } from "../lib/format";
import { compressPhoto } from "../lib/foto";
import { downloadBlob } from "../lib/download";
import { APP_VERSION } from "../lib/version";
import type { Settings, AuditAction } from "../db/types";
import Toggle from "../components/Toggle";
import PinConfirmModal from "../components/PinConfirmModal";

const WORDLIST = [
  "apel","baju","cabe","dadu","elang","fajar","gula","harap","ikan","jalan",
  "kapal","lampu","meja","nasi","obat","pagi","rasa","sapi","tahu","ular",
  "voli","waktu","xenon","yakin","zaman","angin","bunga","coklat","daun","ember",
];

// Panjang minimum kata sandi enkripsi backup. 4 karakter terlalu lemah untuk
// melindungi file backup yang berisi seluruh data murid & keuangan; 8 minimum,
// dan tombol "Generate" tetap disarankan (6 kata acak ≈ sangat kuat).
const MIN_PASS = 8;

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
  useEffect(() => {
    navigator.storage?.estimate().then((e) => {
      if (e.usage != null && e.quota != null) setInfo({ used: e.usage, quota: e.quota });
    });
  }, []);
  if (!info) return null;
  const pct = Math.round((info.used / info.quota) * 100);
  const mb = (b: number) => (b / 1024 / 1024).toFixed(1) + " MB";
  return (
    <div className="bg-gray-50 rounded-xl p-3 space-y-1">
      <p className="text-xs font-semibold text-gray-500">Penyimpanan Lokal</p>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <p className="text-xs text-gray-400">{mb(info.used)} digunakan dari {mb(info.quota)} ({pct}%)</p>
    </div>
  );
}

// M-5: hapus foto sesi lama untuk membebaskan storage (data sesi tetap utuh).
function PhotoMaintenance({ onToast }: { onToast: (m: string) => void }) {
  const cutoff = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);
  const oldCount = useLiveQuery(() => countSessionPhotos(cutoff), [cutoff]);
  const [busy, setBusy] = useState(false);
  if (!oldCount) return null;
  return (
    <div className="bg-amber-50 rounded-xl p-3 space-y-2">
      <p className="text-xs font-semibold text-amber-700">🖼️ Foto sesi lama</p>
      <p className="text-xs text-amber-600">
        {oldCount} foto dari sesi &gt; 6 bulan lalu. Hapus untuk membebaskan penyimpanan — catatan &amp; tanda tangan sesi tetap aman.
      </p>
      <button disabled={busy}
        onClick={async () => {
          if (!confirm(`Hapus ${oldCount} foto sesi lebih lama dari 6 bulan? Hanya foto yang dihapus; data sesi tetap tersimpan.`)) return;
          setBusy(true);
          try {
            const n = await pruneSessionPhotosBefore(cutoff);
            onToast(`${n} foto lama dihapus ✓`);
          } catch (e) {
            onToast("Gagal hapus foto: " + ((e as Error).message || "coba lagi"));
          } finally { setBusy(false); }
        }}
        className="w-full py-2 rounded-xl bg-amber-500 text-white text-sm font-medium disabled:opacity-60">
        {busy ? "Menghapus..." : `Hapus ${oldCount} foto lama`}
      </button>
    </div>
  );
}

// L-1: penampil riwayat aktivitas penting (lokal per perangkat).
const AUDIT_LABEL: Record<AuditAction, string> = {
  "session.delete": "Hapus sesi",
  "student.delete": "Hapus murid",
  "payment.paid": "Tagihan ditandai lunas",
  "payment.unpaid": "Batal lunas",
  "month.close": "Tutup bulan",
  "data.reset": "Reset semua data",
  "data.restore": "Restore data",
  "photos.prune": "Hapus foto lama",
};

function AuditLogViewer() {
  const entries = useLiveQuery(() => listAuditLog(50), []);
  if (!entries || entries.length === 0)
    return <p className="text-xs text-gray-400 pt-3">Belum ada aktivitas tercatat.</p>;
  return (
    <div className="pt-3 space-y-1.5 max-h-72 overflow-y-auto">
      {entries.map((e) => (
        <div key={e.id} className="flex items-start justify-between gap-2 text-xs border-b border-gray-50 pb-1.5">
          <div className="min-w-0">
            <p className="font-medium text-gray-700">{AUDIT_LABEL[e.action] ?? e.action}</p>
            {e.details && <p className="text-gray-400 truncate">{e.details}</p>}
          </div>
          <span className="text-gray-400 flex-shrink-0">
            {new Date(e.timestamp).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
          </span>
        </div>
      ))}
    </div>
  );
}

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  const ok = msg.includes("✓");
  return (
    <div className={`fixed top-4 left-4 right-4 z-[70] max-w-md mx-auto px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${ok ? "bg-green-600 text-white" : "bg-red-500 text-white"}`}>
      {msg}
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
  title: string; icon: string; badge?: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const ctx = useContext(AccordionContext);
  const [localOpen, setLocalOpen] = useState(defaultOpen);
  const open = ctx ? ctx.openId === title : localOpen;
  const toggle = () => {
    if (ctx) ctx.setOpenId(open ? null : title);
    else setLocalOpen((o) => !o);
  };
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-base">{icon}</span>
          <span className="text-sm font-semibold text-gray-800">{title}</span>
          {badge && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">{badge}</span>
          )}
        </div>
        <span className={`text-gray-400 text-sm transition-transform duration-200 ${open ? "rotate-180" : ""}`}>▼</span>
      </button>
      {open && <div className="px-4 pb-4 pt-0 space-y-3 border-t border-gray-50">{children}</div>}
    </div>
  );
}

export default function SettingsPage() {
  const settings  = useLiveQuery(() => getSettings(), []);
  const [form,        setForm]        = useState<Settings | null>(null);
  const [logoUrl,     setLogoUrl]     = useState<string | undefined>();
  const [dirty,       setDirty]       = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [toast,       setToast]       = useState("");
  const [backupPass,  setBackupPass]  = useState("");
  const [driveAuto,   setDriveAuto]   = useState(() => localStorage.getItem("leskolui_drive_auto") === "1");
  const [pinMode,     setPinMode]     = useState<"view" | "verifyOld" | "forgotPin" | "edit">("view");
  const [oldPin,      setOldPin]      = useState("");
  const [forgotA,     setForgotA]     = useState("");
  const [secQ,        setSecQ]        = useState("");
  const [secA,        setSecA]        = useState("");
  const [newPin,      setNewPin]      = useState("");
  const [newPinConf,  setNewPinConf]  = useState("");
  const [pinError,    setPinError]    = useState("");
  const [pinAction,   setPinAction]   = useState<"exportBackup" | "restore" | "resetAll" | "driveBackup" | "driveRestore" | null>(null);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const restoreRef = useRef<HTMLInputElement>(null);
  const fileRef    = useRef<HTMLInputElement>(null);

  // Shallow copy preserves Blobs — JSON.stringify would corrupt them
  useEffect(() => {
    if (settings && !form) setForm({ ...settings });
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

  if (!settings || !form) return <div className="p-4 text-gray-500">Memuat pengaturan...</div>;

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

  const updateAi = (field: string, value: string | boolean) => {
    setForm((f) => f ? { ...f, ai: { ...f.ai, [field]: value } } : f);
    setDirty(true);
  };

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    try {
      await saveSettings(form);
      setDirty(false);
      setToast("Pengaturan disimpan ✓");
    } catch (e) {
      setToast("Gagal: " + ((e as Error).message || "terjadi kesalahan."));
    } finally {
      setSaving(false);
    }
  };

  const handleLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setToast("File harus berupa gambar (JPG/PNG/WebP)."); e.target.value = ""; return; }
    if (file.size > 5 * 1024 * 1024) { setToast("Ukuran logo maksimal 5 MB."); e.target.value = ""; return; }
    try {
      update("logo", await compressPhoto(file));
    } catch (err) {
      setToast("Logo gagal diproses: " + (err as Error).message);
    } finally {
      e.target.value = "";
    }
  };

  const handleVerifyOldPin = async () => {
    if (!form?.financialPin) return;
    const ok = await verifyPin(oldPin, form.financialPin);
    if (!ok) { setPinError("PIN lama salah."); return; }
    setPinError(""); setOldPin("");
    setSecQ(form.securityQuestion || ""); setSecA("");
    setPinMode("edit");
  };

  const handleVerifyForgot = async () => {
    if (!form?.securityAnswer) { setPinError("Pertanyaan keamanan belum disetel."); return; }
    const ok = await verifyPin(forgotA.trim().toLowerCase(), form.securityAnswer);
    if (!ok) { setPinError("Jawaban salah."); return; }
    setPinError(""); setForgotA("");
    setSecQ(form.securityQuestion || ""); setSecA("");
    setPinMode("edit");
  };

  const handleSetPin = async () => {
    if (newPin.length < 6) { setPinError("PIN harus 6 digit."); return; }
    if (newPin !== newPinConf) { setPinError("PIN tidak cocok."); return; }
    if (!secQ.trim()) { setPinError("Pertanyaan keamanan wajib diisi."); return; }
    if (!form?.securityAnswer && !secA.trim()) { setPinError("Jawaban wajib diisi untuk PIN baru."); return; }
    
    const hashed = await hashPin(newPin);
    let hashedAns = form?.securityAnswer;
    if (secA.trim()) {
      hashedAns = await hashPin(secA.trim().toLowerCase());
    }
    
    const updated = { ...form, financialPin: hashed, securityQuestion: secQ.trim(), securityAnswer: hashedAns };
    await saveSettings(updated as Settings);
    setToast("PIN berhasil diperbarui ✓");
    setPinMode("view"); setNewPin(""); setNewPinConf(""); setPinError(""); setSecQ(""); setSecA("");
    setForm(updated as Settings);
  };

  const requireFinancialPin = (action: typeof pinAction) => {
    if (!action) return;
    if (!form.financialPin) {
      setToast("Buat PIN Keuangan dulu sebelum menjalankan aksi ini.");
      return;
    }
    setPinAction(action);
  };

  const doExportBackup = async () => {
    if (!backupPass) { setToast("Masukkan kata sandi backup!"); return; }
    if (backupPass.length < MIN_PASS) { setToast(`Kata sandi minimal ${MIN_PASS} karakter!`); return; }
    const blob = await exportBackup(backupPass);
    downloadBlob(blob, `leskolui-backup-${todayWIB()}.jles`);
    const lastBackupAt = new Date().toISOString();
    await saveSettings({ lastBackupAt });
    setForm((f) => f ? { ...f, lastBackupAt } : f);
    setToast("Backup berhasil diunduh ✓");
  };



  const doRestore = async () => {
    const file = restoreRef.current?.files?.[0];
    if (!file || !backupPass) { setToast("Pilih file dan masukkan kata sandi!"); return; }
    await importBackup(file, backupPass);
    await logAudit("data.restore", "data", undefined, "dari file");
    setToast("Restore berhasil! Memuat ulang... ✓");
    setTimeout(() => location.reload(), 1500);
  };

  const doDriveBackup = async () => {
    if (!backupPass || backupPass.length < MIN_PASS) { setToast(`Kata sandi enkripsi minimal ${MIN_PASS} karakter!`); return; }
    setToast("Backup ke Google Drive...");
    const blob = await exportBackup(backupPass);
    const fileId = await uploadBackupToDrive(blob, form.driveBackup?.fileId);
    const now = new Date().toISOString();
    const driveBackup = { fileId, backupAt: now };
    await saveSettings({ driveBackup, lastBackupAt: now });
    setForm((f) => f ? { ...f, driveBackup, lastBackupAt: now } : f);
    setToast("Backup ke Google Drive berhasil ✓");
  };

  const doDriveRestore = async () => {
    if (!backupPass) { setToast("Masukkan kata sandi backup!"); return; }
    setToast("Mencari backup di Google Drive...");
    let fileId = form.driveBackup?.fileId;
    if (!fileId) {
      const found = await findDriveBackup();
      if (!found) { setToast("Tidak ada backup di Google Drive."); return; }
      fileId = found.id;
    }
    const blob = await downloadBackupFromDrive(fileId);
    await importBackup(blob, backupPass);
    await logAudit("data.restore", "data", undefined, "dari Google Drive");
    setToast("Restore dari Drive berhasil! Memuat ulang... ✓");
    setTimeout(() => location.reload(), 1500);
  };

  const toggleDriveAuto = (v: boolean) => {
    if (v) {
      if (!backupPass || backupPass.length < MIN_PASS) { setToast(`Isi Kata Sandi Enkripsi (min ${MIN_PASS} karakter) dulu untuk aktifkan auto.`); return; }
      localStorage.setItem("leskolui_drive_auto", "1");
      localStorage.setItem("leskolui_drive_pass", backupPass);
      setDriveAuto(true);
      setToast("Auto backup Drive aktif ✓ (passphrase tersimpan di perangkat)");
    } else {
      localStorage.removeItem("leskolui_drive_auto");
      localStorage.removeItem("leskolui_drive_pass");
      setDriveAuto(false);
      setToast("Auto backup Drive dimatikan");
    }
  };

  const doResetAll = async () => {
    const tables = [
      db.students, db.sessions, db.reports,
      db.payments, db.homeworks, db.followUps,
      db.raporGrades, db.expenses, db.monthClosings, db.iaeeProjects,
    ];
    await db.transaction("rw", tables, async () => {
      for (const t of tables) await t.clear();
    });
    await logAudit("data.reset", "data");
    setToast("Semua data berhasil dihapus ✓ Memuat ulang...");
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
      setPinAction(null);
    } catch (e) {
      setToast("Gagal: " + ((e as Error).message || "terjadi kesalahan."));
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
      description: "Restore akan mengganti data saat ini. Masukkan PIN untuk lanjut.",
      confirmLabel: "Restore",
    },
    resetAll: {
      title: "Hapus Semua Data",
      description: "Masukkan PIN sebelum mengosongkan database aplikasi.",
      confirmLabel: "Hapus",
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
  } as const;

  return (
    <AccordionContext.Provider value={{ openId: openSection, setOpenId: setOpenSection }}>
    <div className="p-4 space-y-3 pb-24">
      {toast && <Toast msg={toast} onClose={() => setToast("")} />}
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
          <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-medium animate-pulse">
            Belum disimpan
          </span>
        )}
      </div>

      {/* ── Profil Tutor ── */}
      <Section title="Profil Tutor" icon="👤">
        <div className="pt-3 space-y-3">
          <div>
            <label className="label">Nama Tutor</label>
            <input className="input" placeholder="mis. Ko Lui" maxLength={60}
              value={form.tutorProfile.name}
              onChange={(e) => updateProfile("name", e.target.value)} />
          </div>
          <div>
            <label className="label">No. WhatsApp</label>
            <input className="input" placeholder="08xxxxxxxxxx" maxLength={20} type="tel"
              value={form.tutorProfile.phone}
              onChange={(e) => updateProfile("phone", e.target.value)} />
          </div>
          <div>
            <label className="label">Email <span className="text-gray-400 font-normal">(opsional)</span></label>
            <input className="input" placeholder="tutor@email.com" maxLength={100} type="email"
              value={form.tutorProfile.email ?? ""}
              onChange={(e) => updateProfile("email", e.target.value)} />
          </div>
          <div>
            <label className="label">Alamat <span className="text-gray-400 font-normal">(opsional)</span></label>
            <input className="input" placeholder="Jl. Contoh No.1, Jakarta" maxLength={150}
              value={form.tutorProfile.address ?? ""}
              onChange={(e) => updateProfile("address", e.target.value)} />
          </div>
          <div>
            <label className="label">Logo <span className="text-gray-400 font-normal">(tampil di laporan)</span></label>
            {logoUrl && (
              <div className="flex items-center gap-3 mb-2">
                <img src={logoUrl} className="h-14 w-14 object-contain rounded-lg border border-gray-200 bg-gray-50" alt="logo" />
                <button onClick={() => update("logo", undefined)}
                  className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 bg-red-50 rounded-lg">
                  Hapus Logo
                </button>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleLogo} className="hidden" />
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-xl font-medium transition-colors">
              📷 {logoUrl ? "Ganti Logo" : "Upload Logo"}
            </button>
          </div>
        </div>
      </Section>



      {/* ── PIN Keuangan ── */}
      <Section title="PIN Keuangan" icon="🔐" badge={form.financialPin ? "Aktif" : undefined}>
        <div className="pt-3 space-y-3">
          <p className="text-xs text-gray-400">Melindungi akses rekap keuangan & hapus sesi</p>

          {pinMode === "view" ? (
            <div className="flex gap-2">
              <button onClick={() => {
                if (form.financialPin) setPinMode("verifyOld");
                else { setSecQ(""); setSecA(""); setPinMode("edit"); }
              }}
                className="flex-1 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-2.5 rounded-xl transition-colors">
                {form.financialPin ? "Ganti PIN" : "Buat PIN"}
              </button>
              {form.financialPin && form.securityQuestion && (
                <button onClick={() => { setPinMode("forgotPin"); setPinError(""); setOldPin(""); setForgotA(""); }}
                  className="text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-2.5 rounded-xl transition-colors whitespace-nowrap">
                  Lupa PIN?
                </button>
              )}
            </div>
          ) : pinMode === "verifyOld" ? (
            <div className="space-y-3">
              <div>
                <label className="label">Masukkan PIN Lama</label>
                <input className="input text-center text-xl tracking-widest font-mono" type="password"
                  inputMode="numeric" maxLength={6} placeholder="••••••"
                  value={oldPin} onChange={(e) => { setOldPin(e.target.value.replace(/\D/g, "").slice(0, 6)); setPinError(""); }} />
              </div>
              {pinError && <p className="text-red-500 text-sm">{pinError}</p>}
              <div className="flex gap-2">
                <button onClick={handleVerifyOldPin} disabled={oldPin.length !== 6}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm disabled:opacity-40 hover:bg-blue-700 transition-colors">Lanjut</button>
                <button onClick={() => { setPinMode("view"); setOldPin(""); setPinError(""); }}
                  className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition-colors">Batal</button>
              </div>
              {form.securityQuestion && (
                <button onClick={() => { setPinMode("forgotPin"); setPinError(""); setOldPin(""); }}
                  className="w-full text-center text-sm font-medium text-blue-600 pt-2 hover:underline">
                  Lupa PIN? Jawab Pertanyaan Keamanan
                </button>
              )}
            </div>
          ) : pinMode === "forgotPin" ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100">
                <span className="text-gray-400 block text-xs mb-1">Pertanyaan Keamanan:</span>
                {form.securityQuestion}
              </p>
              <div>
                <label className="label">Jawaban Anda</label>
                <input className="input" type="text" placeholder="Jawaban rahasia..."
                  value={forgotA} onChange={(e) => { setForgotA(e.target.value); setPinError(""); }} />
              </div>
              {pinError && <p className="text-red-500 text-sm">{pinError}</p>}
              <div className="flex gap-2">
                <button onClick={handleVerifyForgot} disabled={!forgotA.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm disabled:opacity-40 hover:bg-blue-700 transition-colors">Verifikasi</button>
                <button onClick={() => { setPinMode("view"); setForgotA(""); setPinError(""); }}
                  className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition-colors">Kembali</button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="label">PIN Baru (6 digit)</label>
                <input className="input text-center text-xl tracking-widest font-mono" type="password"
                  inputMode="numeric" maxLength={6} placeholder="••••••"
                  value={newPin} onChange={(e) => { setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6)); setPinError(""); }} />
              </div>
              <div>
                <label className="label">Konfirmasi PIN Baru</label>
                <input className={`input text-center text-xl tracking-widest font-mono ${pinError?.includes("cocok") ? "border-red-400" : ""}`}
                  type="password" inputMode="numeric" maxLength={6} placeholder="••••••"
                  value={newPinConf} onChange={(e) => { setNewPinConf(e.target.value.replace(/\D/g, "").slice(0, 6)); setPinError(""); }} />
              </div>
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-blue-600 mb-2 font-medium">Lupa PIN Recovery (Wajib):</p>
                <label className="label">Pertanyaan Keamanan</label>
                <input className="input mb-2" type="text" maxLength={100} placeholder="Contoh: Nama hewan peliharaan?"
                  value={secQ} onChange={(e) => { setSecQ(e.target.value); setPinError(""); }} />
                <label className="label">Jawaban Keamanan</label>
                <input className="input" type="text" maxLength={100} placeholder={form.securityAnswer ? "(Biarkan kosong jika tak ganti)" : "Jawaban rahasia..."}
                  value={secA} onChange={(e) => { setSecA(e.target.value); setPinError(""); }} />
              </div>
              {pinError && <p className="text-red-500 text-sm">{pinError}</p>}
              <div className="flex gap-2">
                <button onClick={handleSetPin} disabled={newPin.length !== 6 || newPinConf.length !== 6}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm disabled:opacity-40 hover:bg-blue-700 transition-colors">Simpan PIN</button>
                <button onClick={() => { setPinMode("view"); setNewPin(""); setNewPinConf(""); setSecQ(""); setSecA(""); setPinError(""); }}
                  className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition-colors">Batal</button>
              </div>
            </div>
          )}

          <p className="text-xs text-gray-400 pt-2 border-t border-gray-50">
            Buka data keuangan dari tab <b>💰 Keuangan</b> di menu bawah (akan diminta PIN ini).
          </p>
        </div>
      </Section>

      {/* ── Rekening Bank ── */}
      <Section title="Rekening Bank" icon="🏦">
        <div className="pt-3 space-y-3">
          <p className="text-xs text-gray-400">Ditampilkan di lembar absensi untuk memudahkan transfer</p>
          <div>
            <label className="label">Nama Pemilik Rekening</label>
            <input className="input" maxLength={60} placeholder="Nama AN rekening"
              value={form.bankAccounts?.accountName ?? ""}
              onChange={(e) => updateBank("accountName", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">BCA</label>
              <input className="input" maxLength={20} placeholder="No rekening"
                value={form.bankAccounts?.bca ?? ""}
                onChange={(e) => updateBank("bca", e.target.value)} />
            </div>
            <div>
              <label className="label">Mandiri</label>
              <input className="input" maxLength={20} placeholder="No rekening"
                value={form.bankAccounts?.mandiri ?? ""}
                onChange={(e) => updateBank("mandiri", e.target.value)} />
            </div>
            <div>
              <label className="label">BRI</label>
              <input className="input" maxLength={20} placeholder="No rekening"
                value={form.bankAccounts?.bri ?? ""}
                onChange={(e) => updateBank("bri", e.target.value)} />
            </div>
            <div>
              <label className="label">CIMB Niaga</label>
              <input className="input" maxLength={20} placeholder="No rekening"
                value={form.bankAccounts?.cimb ?? ""}
                onChange={(e) => updateBank("cimb", e.target.value)} />
            </div>
            <div>
              <label className="label">BSI</label>
              <input className="input" maxLength={20} placeholder="No rekening"
                value={form.bankAccounts?.bsi ?? ""}
                onChange={(e) => updateBank("bsi", e.target.value)} />
            </div>
            <div>
              <label className="label">GoPay / OVO / DANA</label>
              <input className="input" maxLength={20} placeholder="No HP ewallet"
                value={form.bankAccounts?.ewallet ?? ""}
                onChange={(e) => updateBank("ewallet", e.target.value)} />
            </div>
          </div>
        </div>
      </Section>

      {/* ── AI ── */}
      <Section title="AI — Narasi Otomatis" icon="🤖" badge={form.ai.enabled && form.ai.apiKey ? "Aktif" : undefined}>
        <div className="pt-3 space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <Toggle checked={form.ai.enabled} onChange={(v) => updateAi("enabled", v)} />
            <div>
              <p className="text-sm text-gray-700 font-medium">Aktifkan AI</p>
              <p className="text-xs text-gray-400">Generate narasi sesi otomatis via DeepSeek</p>
            </div>
          </label>
          {form.ai.enabled && (
            <>
              <div>
                <label className="label">DeepSeek API Key</label>
                <input className="input font-mono text-xs" type="password" placeholder="sk-..."
                  value={form.ai.apiKey ?? ""}
                  onChange={(e) => updateAi("apiKey", e.target.value)} />
                <p className="text-xs text-gray-400 mt-1">
                  Dapatkan di <span className="font-medium text-blue-600">platform.deepseek.com → API Keys</span>.
                  Disimpan lokal di perangkat ini saja.
                </p>
              </div>
              <div>
                <label className="label">Model</label>
                <select className="input" value={["deepseek-v4-flash","deepseek-v4-pro"].includes(form.ai.model) ? form.ai.model : "custom"}
                  onChange={(e) => updateAi("model", e.target.value === "custom" ? "" : e.target.value)}>
                  <option value="deepseek-v4-flash">deepseek-v4-flash (cepat, hemat)</option>
                  <option value="deepseek-v4-pro">deepseek-v4-pro (lebih dalam)</option>
                  <option value="custom">Custom...</option>
                </select>
                {(!["deepseek-v4-flash","deepseek-v4-pro"].includes(form.ai.model)) && (
                  <input className="input mt-1 font-mono text-sm" placeholder="nama-model-custom"
                    value={form.ai.model}
                    onChange={(e) => updateAi("model", e.target.value)} />
                )}
              </div>
            </>
          )}
        </div>
      </Section>



      {/* ── Backup & Restore ── */}
      <Section title="Backup & Restore" icon="💾">
        <div className="pt-3 space-y-3">
          <StorageUsage />
          <PhotoMaintenance onToast={setToast} />

          {/* Kata sandi bersama — dipakai semua backup & restore */}
          <div className="bg-gray-50 rounded-xl p-3 space-y-2">
            <label className="label">🔑 Kata Sandi Enkripsi</label>
            <div className="flex gap-2">
              <input className="input flex-1" type="text" value={backupPass}
                onChange={(e) => setBackupPass(e.target.value)} placeholder="Kata sandi backup & restore" />
              <button
                onClick={() => {
                  const words = Array.from(crypto.getRandomValues(new Uint8Array(6)))
                    .map((b) => WORDLIST[b % WORDLIST.length]).join("-");
                  setBackupPass(words);
                }}
                className="text-xs px-3 py-2 rounded-xl bg-gray-200 text-gray-700 hover:bg-gray-300 font-medium flex-shrink-0">
                Generate
              </button>
            </div>
            {backupPass && <p className="text-xs text-gray-500 font-mono break-all">{backupPass}</p>}
            {backupPass && (() => {
              const st = passStrength(backupPass);
              return (
                <div className="space-y-1">
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full transition-all" style={{ width: `${st.pct}%`, background: st.color }} />
                  </div>
                  <p className="text-xs font-medium" style={{ color: st.color }}>
                    Kekuatan: {st.label}
                    {backupPass.length < MIN_PASS && ` — minimal ${MIN_PASS} karakter (pakai "Generate" untuk kunci kuat)`}
                  </p>
                </div>
              );
            })()}
            <p className="text-xs text-gray-500">
              Dipakai untuk <b>backup &amp; restore</b> (File &amp; Drive). <b>Simpan baik-baik</b> — kunci ini tak tersimpan & wajib untuk membuka backup di HP lain.
            </p>
          </div>

          {/* Metode 1: File */}
          <div className="bg-blue-50 rounded-xl p-3 space-y-2.5">
            <p className="text-sm font-semibold text-blue-700">📁 File (.jles)</p>
            <button className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
              onClick={() => {
                if (!backupPass || backupPass.length < MIN_PASS) { setToast(`Isi Kata Sandi Enkripsi (min ${MIN_PASS} karakter) dulu!`); return; }
                requireFinancialPin("exportBackup");
              }}>
              ⬇️ Backup ke File
            </button>
            <div className="border-t border-blue-100 pt-2.5 space-y-2">
              <label className="label text-blue-800">Restore dari file</label>
              <input ref={restoreRef} type="file" accept=".jles" className="text-sm text-gray-600 w-full" />
              <button className="w-full py-2 rounded-xl bg-blue-100 text-blue-700 text-sm font-medium hover:bg-blue-200 transition-colors"
                onClick={() => {
                  const file = restoreRef.current?.files?.[0];
                  if (!file) { setToast("Pilih file .jles dulu!"); return; }
                  if (!backupPass) { setToast("Isi Kata Sandi Enkripsi dulu!"); return; }
                  if (!confirm("Restore akan mengganti semua data saat ini. Lanjut?")) return;
                  requireFinancialPin("restore");
                }}>
                ♻️ Restore dari File
              </button>
            </div>
          </div>

          {/* Metode 2: Google Drive */}
          {isDriveConfigured() ? (
            <div className="bg-green-50 rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-green-700">☁️ Google Drive</p>
                {form.driveBackup?.backupAt && (
                  <p className="text-[11px] text-gray-500">
                    {new Date(form.driveBackup.backupAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                )}
              </div>
              <button className="w-full py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors"
                onClick={() => {
                  if (!backupPass || backupPass.length < MIN_PASS) { setToast(`Isi Kata Sandi Enkripsi (min ${MIN_PASS} karakter) dulu!`); return; }
                  requireFinancialPin("driveBackup");
                }}>
                ☁️⬆️ Backup ke Drive
              </button>
              <button className="w-full py-2 rounded-xl bg-green-100 text-green-700 text-sm font-medium hover:bg-green-200 transition-colors"
                onClick={() => {
                  if (!backupPass) { setToast("Isi Kata Sandi Enkripsi dulu!"); return; }
                  if (!confirm("Restore dari Google Drive akan mengganti semua data saat ini. Lanjut?")) return;
                  requireFinancialPin("driveRestore");
                }}>
                ☁️♻️ Restore dari Drive
              </button>
              <p className="text-xs text-green-600">1 file di-overwrite tiap backup — Drive simpan riwayat versi.</p>
              <label className="flex items-center gap-2.5 pt-2 border-t border-green-100 cursor-pointer">
                <Toggle checked={driveAuto} onChange={toggleDriveAuto} label="Auto backup Drive mingguan" />
                <span className="text-xs font-medium text-green-800">Auto backup mingguan (1-tap dari reminder)</span>
              </label>
              {driveAuto && (
                <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg px-2 py-1.5">
                  ⚠️ Kata sandi disimpan di perangkat ini agar backup bisa 1-tap — pastikan layar HP terkunci (PIN/biometrik). Tetap simpan salinannya untuk restore di HP lain.
                </p>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400">☁️ Backup Google Drive belum aktif.</p>
            </div>
          )}

          <p className="text-xs text-orange-600">⚠️ Restore mengganti <b>semua</b> data saat ini. Sebelum mengganti, app otomatis mengunduh file <b>pre-restore</b> (cadangan data lama Anda).</p>

          <p className="text-xs text-gray-400 pt-2 border-t border-gray-50">
            🕒 Backup terakhir:{" "}
            {form.lastBackupAt ? (
              <b className="text-gray-600">{new Date(form.lastBackupAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</b>
            ) : (
              <span className="text-gray-400">belum pernah backup</span>
            )}
          </p>
        </div>
      </Section>

      {/* ── Hapus Semua Data ── */}
      <Section title="Hapus Semua Data" icon="🗑️">
        <div className="pt-3 space-y-3">
          <p className="text-xs text-red-600 font-semibold">
            ⚠️ Menghapus semua data murid, sesi, tagihan, laporan, dan pengeluaran.
          </p>
          <p className="text-xs text-gray-400">
            Database tidak dihapus — hanya dikosongkan. Pengaturan, profil, dan PIN tetap aman.
          </p>
          <button
            onClick={async () => {
              if (!confirm("Yakin hapus SEMUA data? Tindakan ini tidak bisa dibatalkan!")) return;
              const word = prompt('Ketik "RESET" untuk konfirmasi:');
              if (word !== "RESET") { setToast("Konfirmasi gagal — ketik RESET."); return; }
              requireFinancialPin("resetAll");
            }}
            className="w-full py-3 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors">
            🗑️ Hapus Semua Data
          </button>
        </div>
      </Section>

      {/* ── Riwayat Aktivitas (audit trail) ── */}
      <Section title="Riwayat Aktivitas" icon="🧾">
        <AuditLogViewer />
      </Section>

      {/* ── PWA / Aplikasi ── */}
      <Section title="Aplikasi (PWA)" icon="📱">
        <div className="pt-3 space-y-3">
          <StorageUsage />
          <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Versi</span>
              <span className="font-semibold text-gray-700">{APP_VERSION}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Framework</span>
              <span className="text-gray-600">React + Vite + Tailwind</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Database</span>
              <span className="text-gray-600">IndexedDB (lokal)</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Mode</span>
              <span className="text-gray-600">{import.meta.env.DEV ? "⚙️ Development" : "🚀 Production"}</span>
            </div>
          </div>

          <button
            onClick={async () => {
              if ("serviceWorker" in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const reg of registrations) await reg.unregister();
              }
              if ("caches" in window) {
                const keys = await caches.keys();
                await Promise.all(keys.map((k) => caches.delete(k)));
              }
              setToast("Cache dibersihkan ✓ Muat ulang...");
              setTimeout(() => location.reload(), 1000);
            }}
            className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition-colors">
            🗑️ Hapus Cache & Muat Ulang
          </button>
        </div>
      </Section>

      {/* ── Simpan ── */}
      <button onClick={handleSave} disabled={saving}
        className={`w-full py-3.5 rounded-xl font-bold text-base transition-colors shadow-sm ${
          dirty
            ? "bg-blue-600 hover:bg-blue-700 text-white"
            : "bg-gray-100 text-gray-400"
        } disabled:opacity-50`}>
        {saving ? "Menyimpan..." : dirty ? "Simpan Pengaturan" : "Tersimpan ✓"}
      </button>
    </div>
    </AccordionContext.Provider>
  );
}
