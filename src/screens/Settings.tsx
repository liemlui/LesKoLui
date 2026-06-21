import { useState, useEffect, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getSettings, saveSettings } from "../db/repos";
import { exportBackup, importBackup } from "../lib/backup";
import { hashPin } from "../lib/crypto";
import type { Settings } from "../db/types";

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
  const settings = useLiveQuery(() => getSettings(), []);
  const [form,        setForm]        = useState<Settings | null>(null);
  const [logoUrl,     setLogoUrl]     = useState<string | undefined>();
  const [newSubject,  setNewSubject]  = useState("");
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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (settings && !form) setForm(JSON.parse(JSON.stringify(settings)));
  }, [settings, form]);

  useEffect(() => {
    if (!form?.logo) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLogoUrl(undefined);
      return;
    }
    const url = URL.createObjectURL(form.logo);
    setLogoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [form?.logo]);

  if (!settings || !form) return <div className="p-4 text-gray-500">Memuat pengaturan...</div>;

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const updateProfile = (field: string, value: string) =>
    setForm((f) => f ? { ...f, tutorProfile: { ...f.tutorProfile, [field]: value } } : f);

  const updateAi = (field: string, value: string | boolean) =>
    setForm((f) => f ? { ...f, ai: { ...f.ai, [field]: value } } : f);

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    try {
      await saveSettings(form);
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
    <div className="p-4 space-y-6 pb-24">
      {toast && <Toast msg={toast} onClose={() => setToast("")} />}

      <h1 className="text-2xl font-bold">Pengaturan</h1>

      {/* ── Profil Tutor ── */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
        <h2 className="text-base font-semibold text-gray-700">Profil Tutor</h2>
        <input className="input" placeholder="Nama tutor" value={form.tutorProfile.name}
          onChange={(e) => updateProfile("name", e.target.value)} />
        <input className="input" placeholder="Nomor HP" value={form.tutorProfile.phone}
          onChange={(e) => updateProfile("phone", e.target.value)} />
        <input className="input" placeholder="Email (opsional)" value={form.tutorProfile.email ?? ""}
          onChange={(e) => updateProfile("email", e.target.value)} />
        <input className="input" placeholder="Alamat (opsional)" value={form.tutorProfile.address ?? ""}
          onChange={(e) => updateProfile("address", e.target.value)} />
        <div>
          <label className="label">Logo (tampil di laporan)</label>
          {logoUrl && (
            <div className="flex items-center gap-3 mb-2">
              <img src={logoUrl} className="h-14 w-14 object-contain rounded-lg border border-gray-200" alt="logo" />
              <button onClick={() => { update("logo", undefined); setLogoUrl(undefined); }}
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

      {/* ── Mata Pelajaran ── */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
        <h2 className="text-base font-semibold text-gray-700">Mata Pelajaran Default</h2>
        <div className="flex flex-wrap gap-2">
          {form.subjects.map((s) => (
            <span key={s} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-sm font-medium">
              {s}
              <button onClick={() => removeSubject(s)} className="text-blue-300 hover:text-red-500 ml-0.5 font-bold leading-none">&times;</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input className="input flex-1" placeholder="Tambah pelajaran baru..." value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addSubject()} />
          <button onClick={addSubject}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors flex-shrink-0">
            Tambah
          </button>
        </div>
      </section>

      {/* ── AI DeepSeek ── */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
        <h2 className="text-base font-semibold text-gray-700">AI (DeepSeek)</h2>
        <label className="flex items-center gap-3 cursor-pointer">
          <button type="button"
            className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${form.ai.enabled ? "bg-blue-500" : "bg-gray-300"}`}
            onClick={() => updateAi("enabled", !form.ai.enabled)}>
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.ai.enabled ? "translate-x-4" : "translate-x-0.5"}`} />
          </button>
          <span className="text-sm text-gray-700 font-medium">Aktifkan AI untuk narasi laporan</span>
        </label>
        <input className="input" placeholder="Worker URL"
          value={form.ai.workerUrl} onChange={(e) => updateAi("workerUrl", e.target.value)} />
        <input className="input" placeholder="Model (default: deepseek-chat)"
          value={form.ai.model} onChange={(e) => updateAi("model", e.target.value)} />
      </section>

      {/* ── PIN Keuangan ── */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-700">PIN Rekap Keuangan</h2>
          {form.financialPin
            ? <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Aktif 🔐</span>
            : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">Belum diatur</span>}
        </div>
        {!showPinEdit ? (
          <button onClick={() => setShowPinEdit(true)}
            className="text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-xl transition-colors">
            {form.financialPin ? "Ganti PIN" : "Buat PIN"}
          </button>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="label">PIN Baru (4 digit)</label>
              <input className="input text-center text-xl tracking-widest font-mono" type="password"
                inputMode="numeric" maxLength={4} placeholder="••••"
                value={newPin} onChange={(e) => { setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4)); setPinError(""); }} />
            </div>
            <div>
              <label className="label">Konfirmasi PIN</label>
              <input className={`input text-center text-xl tracking-widest font-mono ${pinError ? "border-red-400" : ""}`}
                type="password" inputMode="numeric" maxLength={4} placeholder="••••"
                value={newPinConf} onChange={(e) => { setNewPinConf(e.target.value.replace(/\D/g, "").slice(0, 4)); setPinError(""); }} />
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
      </section>

      {/* ── Backup & Restore ── */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
        <h2 className="text-base font-semibold text-gray-700">Backup & Restore</h2>
        <div>
          <label className="label">Kata Sandi Backup</label>
          <input className="input" type="password" value={backupPass}
            onChange={(e) => setBackupPass(e.target.value)} placeholder="Buat kata sandi untuk enkripsi" />
        </div>
        <button className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
          onClick={async () => {
            if (!backupPass) { setToast("Masukkan kata sandi backup!"); return; }
            try {
              const blob = await exportBackup(backupPass);
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = `leskolui-backup-${new Date().toISOString().slice(0, 10)}.jles`;
              a.click(); URL.revokeObjectURL(url);
              setToast("Backup berhasil diunduh ✓");
            } catch (e) { setToast("Backup gagal: " + (e as Error).message); }
          }}>
          Ekspor Backup
        </button>

        <hr className="border-gray-100" />

        <div>
          <label className="label">Restore dari file backup</label>
          <input ref={restoreRef} type="file" accept=".jles" className="text-sm text-gray-600 w-full" />
        </div>
        <div>
          <label className="label">Kata Sandi Backup (untuk restore)</label>
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
      </section>

      {/* ── Simpan ── */}
      <button onClick={handleSave} disabled={saving}
        className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-bold text-base hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm">
        {saving ? "Menyimpan..." : "Simpan Pengaturan"}
      </button>
    </div>
  );
}
