import { useState, useEffect, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getSettings, saveSettings } from "../db/repos";
import { db } from "../db/db";
import { exportBackup, importBackup } from "../lib/backup";
import { hashPin } from "../lib/crypto";
import { todayWIB } from "../lib/format";
import type { Settings } from "../db/types";
import Toggle from "../components/Toggle";

const WORDLIST = [
  "apel","baju","cabe","dadu","elang","fajar","gula","harap","ikan","jalan",
  "kapal","lampu","meja","nasi","obat","pagi","rasa","sapi","tahu","ular",
  "voli","waktu","xenon","yakin","zaman","angin","bunga","coklat","daun","ember",
];

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

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  const ok = msg.includes("✓");
  return (
    <div className={`fixed top-4 left-4 right-4 z-[70] max-w-md mx-auto px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${ok ? "bg-green-600 text-white" : "bg-red-500 text-white"}`}>
      {msg}
    </div>
  );
}

function Section({
  title, icon, badge, defaultOpen = false, children,
}: {
  title: string; icon: string; badge?: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
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
  const [restorePass, setRestorePass] = useState("");
  const [showPinEdit, setShowPinEdit] = useState(false);
  const [newPin,      setNewPin]      = useState("");
  const [newPinConf,  setNewPinConf]  = useState("");
  const [pinError,    setPinError]    = useState("");
  const restoreRef = useRef<HTMLInputElement>(null);
  const fileRef    = useRef<HTMLInputElement>(null);

  // Shallow copy preserves Blobs — JSON.stringify would corrupt them
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (settings && !form) setForm({ ...settings });
  }, [settings, form]);

  useEffect(() => {
    if (!form?.logo || !(form.logo instanceof Blob)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLogoUrl(undefined);
      return;
    }
    const url = URL.createObjectURL(form.logo);
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      setToast("Gagal: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setToast("File harus berupa gambar (JPG/PNG/WebP)."); e.target.value = ""; return; }
    const reader = new FileReader();
    reader.onload = () => update("logo", new Blob([reader.result as ArrayBuffer], { type: file.type }));
    reader.readAsArrayBuffer(file);
  };

  const handleSetPin = async () => {
    if (newPin.length < 6) { setPinError("PIN harus 6 digit."); return; }
    if (newPin !== newPinConf) { setPinError("PIN tidak cocok."); return; }
    const hashed = await hashPin(newPin);
    await saveSettings({ ...form, financialPin: hashed });
    setToast("PIN berhasil diperbarui ✓");
    setShowPinEdit(false); setNewPin(""); setNewPinConf(""); setPinError("");
    setForm((f) => f ? { ...f, financialPin: hashed } : f);
  };

  return (
    <div className="p-4 space-y-3 pb-24">
      {toast && <Toast msg={toast} onClose={() => setToast("")} />}

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

          {!showPinEdit ? (
            <div className="flex gap-2">
              <button onClick={() => setShowPinEdit(true)}
                className="flex-1 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-2.5 rounded-xl transition-colors">
                {form.financialPin ? "Ganti PIN" : "Buat PIN"}
              </button>
              {form.financialPin && (
                <button
                  onClick={async () => {
                    if (!confirm("Hapus PIN? Data keuangan tidak terlindungi lagi.")) return;
                    const cleared = { ...form };
                    delete cleared.financialPin;
                    await saveSettings(cleared);
                    setForm(cleared);
                    setToast("PIN dihapus ✓");
                  }}
                  className="text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 px-3 py-2.5 rounded-xl transition-colors">
                  Hapus PIN
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="label">PIN Baru (6 digit)</label>
                <input className="input text-center text-xl tracking-widest font-mono" type="password"
                  inputMode="numeric" maxLength={6} placeholder="••••••"
                  value={newPin}
                  onChange={(e) => { setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6)); setPinError(""); }} />
              </div>
              <div>
                <label className="label">Konfirmasi PIN</label>
                <input className={`input text-center text-xl tracking-widest font-mono ${pinError ? "border-red-400" : ""}`}
                  type="password" inputMode="numeric" maxLength={6} placeholder="••••••"
                  value={newPinConf}
                  onChange={(e) => { setNewPinConf(e.target.value.replace(/\D/g, "").slice(0, 6)); setPinError(""); }} />
              </div>
              {pinError && <p className="text-red-500 text-sm">{pinError}</p>}
              <div className="flex gap-2">
                <button onClick={handleSetPin} disabled={newPin.length !== 6 || newPinConf.length !== 6}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm disabled:opacity-40 hover:bg-blue-700 transition-colors">
                  Simpan PIN
                </button>
                <button onClick={() => { setShowPinEdit(false); setNewPin(""); setNewPinConf(""); setPinError(""); }}
                  className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition-colors">
                  Batal
                </button>
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
      <Section title="AI — Narasi Otomatis" icon="🤖">
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

          <div className="bg-blue-50 rounded-xl p-3 space-y-2">
            <p className="text-xs font-semibold text-blue-700">Ekspor Backup</p>
            <div>
              <label className="label">Kata Sandi Enkripsi</label>
              <div className="flex gap-2">
                <input className="input flex-1" type="text" value={backupPass}
                  onChange={(e) => setBackupPass(e.target.value)} placeholder="Buat kata sandi" />
                <button
                  onClick={() => {
                    const words = Array.from(crypto.getRandomValues(new Uint8Array(6)))
                      .map((b) => WORDLIST[b % WORDLIST.length]).join("-");
                    setBackupPass(words);
                  }}
                  className="text-xs px-3 py-2 rounded-xl bg-blue-100 text-blue-700 hover:bg-blue-200 font-medium flex-shrink-0">
                  Generate
                </button>
              </div>
              {backupPass && <p className="text-xs text-gray-500 font-mono break-all">{backupPass}</p>}
            </div>
            <button className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
              onClick={async () => {
                if (!backupPass) { setToast("Masukkan kata sandi backup!"); return; }
                if (backupPass.length < 4) { setToast("Kata sandi minimal 4 karakter!"); return; }
                try {
                  const blob = await exportBackup(backupPass);
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url; a.download = `leskolui-backup-${todayWIB()}.jles`;
                  a.click(); URL.revokeObjectURL(url);
                  setToast("Backup berhasil diunduh ✓");
                } catch (e) { setToast("Backup gagal: " + (e as Error).message); }
              }}>
              Ekspor Backup
            </button>
          </div>

          <div className="bg-orange-50 rounded-xl p-3 space-y-2">
            <p className="text-xs font-semibold text-orange-700">Restore dari Backup</p>
            <p className="text-xs text-orange-600">⚠️ Semua data saat ini akan diganti!</p>
            <div>
              <label className="label">File Backup (.jles)</label>
              <input ref={restoreRef} type="file" accept=".jles" className="text-sm text-gray-600 w-full" />
            </div>
            <div>
              <label className="label">Kata Sandi Backup</label>
              <input className="input" type="password" value={restorePass}
                onChange={(e) => setRestorePass(e.target.value)} placeholder="Kata sandi yang dipakai saat backup" />
            </div>
            <button className="w-full py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition-colors"
              onClick={async () => {
                const file = restoreRef.current?.files?.[0];
                if (!file || !restorePass) { setToast("Pilih file dan masukkan kata sandi!"); return; }
                if (!confirm("Yakin restore? Semua data saat ini akan diganti!")) return;
                try {
                  await importBackup(file, restorePass);
                  setToast("Restore berhasil! Memuat ulang... ✓");
                  setTimeout(() => location.reload(), 1500);
                } catch (e) { setToast("Restore gagal: " + (e as Error).message); }
              }}>
              Restore Data
            </button>
          </div>
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
              try {
                const tables = [
                  db.students, db.sessions, db.reports,
                  db.payments, db.homeworks, db.followUps,
                  db.raporGrades, db.expenses, db.monthClosings, db.iaeeProjects,
                ];
                await db.transaction("rw", tables, async () => {
                  for (const t of tables) await t.clear();
                });
                setToast("Semua data berhasil dihapus ✓ Memuat ulang...");
                setTimeout(() => location.reload(), 1500);
              } catch (e) {
                setToast("Gagal: " + (e as Error).message);
              }
            }}
            className="w-full py-3 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors">
            🗑️ Hapus Semua Data
          </button>
        </div>
      </Section>

      {/* ── PWA / Aplikasi ── */}
      <Section title="Aplikasi (PWA)" icon="📱">
        <div className="pt-3 space-y-3">
          <StorageUsage />
          <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Versi</span>
              <span className="font-semibold text-gray-700">1.7.0</span>
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
  );
}
