import { useState, useEffect, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getSettings, saveSettings } from "../db/repos";
import { exportBackup, importBackup } from "../lib/backup";
import type { Settings } from "../db/types";

export default function SettingsPage() {
  const settings = useLiveQuery(() => getSettings(), []);
  const [form, setForm] = useState<Settings | null>(null);
  const [newSubject, setNewSubject] = useState("");
  const [saving, setSaving] = useState(false);
  const [backupPass, setBackupPass] = useState("");
  const [restorePass, setRestorePass] = useState("");
  const [backupMsg, setBackupMsg] = useState("");
  const restoreRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settings && !form) setForm(JSON.parse(JSON.stringify(settings)));
  }, [settings, form]);

  if (!settings || !form) {
    return <div className="p-4 text-gray-500">Memuat pengaturan...</div>;
  }

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const updateProfile = (field: string, value: string) =>
    setForm((f) =>
      f ? { ...f, tutorProfile: { ...f.tutorProfile, [field]: value } } : f
    );

  const updateAi = (field: string, value: string | boolean) =>
    setForm((f) =>
      f ? { ...f, ai: { ...f.ai, [field]: value } } : f
    );

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    try {
      await saveSettings(form);
      alert("Pengaturan disimpan!");
    } catch (e) {
      alert("Gagal menyimpan: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const addSubject = () => {
    const s = newSubject.trim();
    if (s && !form.subjects.includes(s)) {
      update("subjects", [...form.subjects, s]);
    }
    setNewSubject("");
  };

  const removeSubject = (subject: string) => {
    update("subjects", form.subjects.filter((s) => s !== subject));
  };

  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        // Convert to Blob
        const blob = new Blob([reader.result as ArrayBuffer], { type: file.type });
        update("logo", blob);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  return (
    <div className="p-4 space-y-6 pb-20">
      <h1 className="text-2xl font-bold">Pengaturan</h1>

      {/* Profile */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-700">Profil Tutor</h2>
        <input className="input" placeholder="Nama" value={form.tutorProfile.name}
          onChange={(e) => updateProfile("name", e.target.value)} />
        <input className="input" placeholder="Nomor HP" value={form.tutorProfile.phone}
          onChange={(e) => updateProfile("phone", e.target.value)} />
        <input className="input" placeholder="Email (opsional)" value={form.tutorProfile.email ?? ""}
          onChange={(e) => updateProfile("email", e.target.value)} />
        <input className="input" placeholder="Alamat (opsional)" value={form.tutorProfile.address ?? ""}
          onChange={(e) => updateProfile("address", e.target.value)} />

        {/* Logo */}
        <div>
          <label className="block text-sm text-gray-600 mb-1">Logo (opsional)</label>
          {form.logo && (
            <img src={URL.createObjectURL(form.logo)} className="h-16 w-16 object-contain mb-2 rounded" alt="logo" />
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={handleLogo} className="text-sm" />
        </div>
      </section>

      <hr className="border-gray-200" />

      {/* Rate */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-700">Tarif</h2>
        <label className="text-sm text-gray-600">Tarif Default (IDR/jam)</label>
        <input className="input" type="number" value={form.defaultRate}
          onChange={(e) => update("defaultRate", Number(e.target.value))} />
        <input className="input" placeholder="Info Pembayaran (internal)" value={form.paymentInfo}
          onChange={(e) => update("paymentInfo", e.target.value)} />
      </section>

      <hr className="border-gray-200" />

      {/* Subjects */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-700">Mata Pelajaran</h2>
        <div className="flex flex-wrap gap-2">
          {form.subjects.map((s) => (
            <span key={s} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-sm">
              {s}
              <button onClick={() => removeSubject(s)} className="text-blue-400 hover:text-red-500">&times;</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input className="input flex-1" placeholder="Tambah pelajaran..." value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addSubject()} />
          <button onClick={addSubject} className="btn btn-secondary">Tambah</button>
        </div>
      </section>

      {/* AI */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-700">AI (DeepSeek)</h2>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.ai.enabled}
            onChange={(e) => updateAi("enabled", e.target.checked)} />
          <span className="text-sm">Aktifkan AI</span>
        </label>
        <input className="input" placeholder="Worker URL (opsional)" value={form.ai.workerUrl}
          onChange={(e) => updateAi("workerUrl", e.target.value)} />
        <input className="input" type="password" placeholder="DeepSeek API Key" value={form.ai.apiKey}
          onChange={(e) => updateAi("apiKey", e.target.value)} />
        <input className="input" placeholder="Model (default: deepseek-chat)" value={form.ai.model}
          onChange={(e) => updateAi("model", e.target.value)} />
      </section>

      <hr className="border-gray-200" />

      {/* Backup & Restore */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-700">Backup & Restore</h2>
        {backupMsg && (
          <p className={`text-sm ${backupMsg.includes("✓") ? "text-green-600" : "text-red-500"}`}>{backupMsg}</p>
        )}
        <div>
          <label className="label">Kata Sandi Backup</label>
          <input className="input" type="password" value={backupPass}
            onChange={(e) => setBackupPass(e.target.value)} placeholder="Masukkan kata sandi" />
        </div>
        <div className="flex gap-2">
          <button className="btn-primary text-sm flex-1" onClick={async () => {
            if (!backupPass) { setBackupMsg("Masukkan kata sandi!"); return; }
            try {
              const blob = await exportBackup(backupPass);
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `jurnalles-backup-${new Date().toISOString().slice(0, 10)}.jles`;
              a.click();
              URL.revokeObjectURL(url);
              setBackupMsg("Backup berhasil ✓");
            } catch (e) { setBackupMsg("Gagal: " + (e as Error).message); }
          }}>Ekspor Backup</button>
        </div>
        <div className="flex gap-2">
          <input ref={restoreRef} type="file" accept=".jles" className="text-sm flex-1" />
          <button className="btn-secondary text-sm" onClick={async () => {
            const file = restoreRef.current?.files?.[0];
            if (!file || !restorePass) { setBackupMsg("Pilih file backup dan masukkan kata sandi!"); return; }
            if (!confirm("Yakin restore? Semua data saat ini akan diganti!")) return;
            try {
              await importBackup(file, restorePass);
              setBackupMsg("Restore berhasil! Muat ulang halaman... ✓");
              setTimeout(() => location.reload(), 1500);
            } catch (e) { setBackupMsg("Gagal: " + (e as Error).message); }
          }}>Restore</button>
        </div>
        <div>
          <label className="label">Kata Sandi (untuk restore)</label>
          <input className="input" type="password" value={restorePass}
            onChange={(e) => setRestorePass(e.target.value)} placeholder="Kata sandi backup" />
        </div>
      </section>

      {/* Save */}
      <button onClick={handleSave} disabled={saving}
        className="btn btn-primary w-full">
        {saving ? "Menyimpan..." : "Simpan Pengaturan"}
      </button>
    </div>
  );
}
