import { useState, useEffect, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate } from "react-router-dom";
import { getSettings, saveSettings } from "../db/repos";
import { exportBackup, importBackup } from "../lib/backup";
import { hashPin } from "../lib/crypto";
import { todayWIB } from "../lib/format";
import type { Settings } from "../db/types";
import Toggle from "../components/Toggle";

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  const ok = msg.includes("✓");
  return (
    <div className={`fixed top-4 left-4 right-4 z-[70] max-w-md mx-auto px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${ok ? "bg-green-600 text-white" : "bg-red-500 text-white"}`}>
      {msg}
    </div>
  );
}

export default function SettingsPage() {
  const navigate  = useNavigate();
  const settings  = useLiveQuery(() => getSettings(), []);
  const [form,        setForm]        = useState<Settings | null>(null);
  const [logoUrl,     setLogoUrl]     = useState<string | undefined>();
  const [dirty,       setDirty]       = useState(false);
  const [newSubject,  setNewSubject]  = useState("");
  const [saving,      setSaving]      = useState(false);
  const [toast,       setToast]       = useState("");
  const [backupPass,  setBackupPass]  = useState("");
  const [restorePass, setRestorePass] = useState("");
  const [showPinEdit, setShowPinEdit] = useState(false);
  const [newPin,      setNewPin]      = useState("");
  const [newPinConf,  setNewPinConf]  = useState("");
  const [finPin,      setFinPin]      = useState("");
  const [finPinErr,   setFinPinErr]   = useState("");
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

  const addSubject = () => {
    const s = newSubject.trim();
    if (s && !form.subjects.includes(s)) update("subjects", [...form.subjects, s]);
    setNewSubject("");
  };

  const removeSubject = (subject: string) =>
    update("subjects", form.subjects.filter((s) => s !== subject));

  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update("logo", new Blob([reader.result as ArrayBuffer], { type: file.type }));
    reader.readAsArrayBuffer(file);
  };

  const handleSetPin = async () => {
    if (newPin.length !== 4) { setPinError("PIN harus 4 digit."); return; }
    if (newPin !== newPinConf) { setPinError("PIN tidak cocok."); return; }
    const hashed = await hashPin(newPin);
    await saveSettings({ ...form, financialPin: hashed });
    setToast("PIN berhasil diperbarui ✓");
    setShowPinEdit(false); setNewPin(""); setNewPinConf(""); setPinError("");
    setForm((f) => f ? { ...f, financialPin: hashed } : f);
  };

  return (
    <div className="p-4 space-y-4 pb-24">
      {toast && <Toast msg={toast} onClose={() => setToast("")} />}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pengaturan</h1>
        {dirty && (
          <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-medium animate-pulse">
            Belum disimpan
          </span>
        )}
      </div>

      {/* ── Profil Tutor ── */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">Profil Tutor</h2>
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

        {/* Logo */}
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
      </section>

      {/* ── Tarif & Pembayaran ── */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">Tarif & Pembayaran</h2>
        <div>
          <label className="label">Tarif Default per Jam</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 font-medium flex-shrink-0">Rp</span>
            <input className="input flex-1" type="number" min={0} step={5000}
              value={form.defaultRate}
              onChange={(e) => update("defaultRate", Number(e.target.value))} />
            <span className="text-sm text-gray-400 flex-shrink-0">/ jam</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">Dipakai sebagai tarif awal saat tambah murid baru</p>
        </div>
        <div>
          <label className="label">Info Pembayaran <span className="text-gray-400 font-normal">(muncul di absensi)</span></label>
          <textarea className="input" rows={3} maxLength={300}
            placeholder="mis. Transfer ke BCA 1234567890 a/n Ko Lui, konfirmasi via WA"
            value={form.paymentInfo}
            onChange={(e) => update("paymentInfo", e.target.value)} />
        </div>
      </section>

      {/* ── Rekening Bank ── */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">Rekening Bank</h2>
        <p className="text-xs text-gray-400 -mt-1">Ditampilkan di lembar absensi untuk memudahkan transfer</p>
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
      </section>

      {/* ── PIN Keuangan ── */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">PIN Keuangan</h2>
          {form.financialPin
            ? <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Aktif 🔐</span>
            : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">Belum diatur</span>}
        </div>
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
              <label className="label">PIN Baru (4 digit)</label>
              <input className="input text-center text-xl tracking-widest font-mono" type="password"
                inputMode="numeric" maxLength={4} placeholder="••••"
                value={newPin}
                onChange={(e) => { setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4)); setPinError(""); }} />
            </div>
            <div>
              <label className="label">Konfirmasi PIN</label>
              <input className={`input text-center text-xl tracking-widest font-mono ${pinError ? "border-red-400" : ""}`}
                type="password" inputMode="numeric" maxLength={4} placeholder="••••"
                value={newPinConf}
                onChange={(e) => { setNewPinConf(e.target.value.replace(/\D/g, "").slice(0, 4)); setPinError(""); }} />
            </div>
            {pinError && <p className="text-red-500 text-sm">{pinError}</p>}
            <div className="flex gap-2">
              <button onClick={handleSetPin} disabled={newPin.length !== 4 || newPinConf.length !== 4}
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

        {/* Quick access to Keuangan */}
        <div className="pt-1 border-t border-gray-50">
          {form.financialPin ? (
            <div className="space-y-2">
              <p className="text-xs text-gray-400">Buka rekap keuangan</p>
              <input type="password" inputMode="numeric" maxLength={4} placeholder="Masukkan PIN (4 digit)"
                value={finPin} onChange={(e) => { setFinPin(e.target.value.replace(/\D/g, "").slice(0, 4)); setFinPinErr(""); }}
                className="input text-center tracking-widest font-mono" />
              {finPinErr && <p className="text-xs text-red-500">{finPinErr}</p>}
              <button
                onClick={async () => {
                  const h = await hashPin(finPin);
                  if (h !== form.financialPin) { setFinPinErr("PIN salah."); return; }
                  setFinPin(""); navigate("/payments");
                }}
                disabled={finPin.length !== 4}
                className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors">
                Buka Data Keuangan →
              </button>
            </div>
          ) : (
            <button onClick={() => navigate("/payments")}
              className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold hover:bg-gray-200 transition-colors">
              Buka Keuangan →
            </button>
          )}
        </div>
      </section>

      {/* ── Mata Pelajaran ── */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">Mata Pelajaran Kustom</h2>
        <p className="text-xs text-gray-400">Mata pelajaran tambahan di luar kurikulum IB/Cambridge/National</p>
        <div className="flex flex-wrap gap-2">
          {form.subjects.map((s) => (
            <span key={s} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-sm font-medium">
              {s}
              <button onClick={() => removeSubject(s)}
                className="text-blue-300 hover:text-red-500 ml-0.5 font-bold leading-none">&times;</button>
            </span>
          ))}
          {form.subjects.length === 0 && (
            <p className="text-xs text-gray-400 italic">Belum ada mata pelajaran kustom</p>
          )}
        </div>
        <div className="flex gap-2">
          <input className="input flex-1" maxLength={50} placeholder="Nama mata pelajaran..." value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addSubject()} />
          <button onClick={addSubject} disabled={!newSubject.trim()}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors flex-shrink-0">
            Tambah
          </button>
        </div>
      </section>

      {/* ── AI ── */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">AI — Narasi Otomatis</h2>
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
              <label className="label">Worker URL</label>
              <input className="input" placeholder="https://your-worker.workers.dev"
                value={form.ai.workerUrl} onChange={(e) => updateAi("workerUrl", e.target.value)} />
              <p className="text-xs text-gray-400 mt-1">Cloudflare Worker yang mem-proxy request ke DeepSeek API</p>
            </div>
            <div>
              <label className="label">Model</label>
              <input className="input" placeholder="deepseek-chat"
                value={form.ai.model} onChange={(e) => updateAi("model", e.target.value)} />
            </div>
          </>
        )}
      </section>

      {/* ── Backup & Restore ── */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">Backup & Restore</h2>

        <div className="bg-blue-50 rounded-xl p-3 space-y-2">
          <p className="text-xs font-semibold text-blue-700">Ekspor Backup</p>
          <div>
            <label className="label">Kata Sandi Enkripsi</label>
            <input className="input" type="password" value={backupPass}
              onChange={(e) => setBackupPass(e.target.value)} placeholder="Buat kata sandi" />
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
      </section>

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
