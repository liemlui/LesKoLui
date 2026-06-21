import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getSettings } from "../db/repos";
import { todayWIB } from "../lib/format";
import type { Student, Level } from "../db/types";
import { DEFAULT_RATE } from "../db/types";

interface Props {
  initial?: Student;
  onSave: (data: Omit<Student, "id">) => void | Promise<void>;
  onCancel?: () => void;
}

function toWaNumber(raw: string) {
  return raw.replace(/^0/, "62").replace(/[^0-9]/g, "");
}

export default function StudentForm({ initial, onSave, onCancel }: Props) {
  const settings    = useLiveQuery(() => getSettings(), []);
  const [name,        setName]        = useState(initial?.name ?? "");
  const [level,       setLevel]       = useState<Level>(initial?.level ?? "MYP");
  const [phone,       setPhone]       = useState(initial?.parentContact.phone ?? "");
  const [parentName,  setParentName]  = useState(initial?.parentContact.name ?? "");
  const [studentPhone, setStudentPhone] = useState(initial?.studentPhone ?? "");
  const [subjects,    setSubjects]    = useState<string[]>(initial?.subjects ?? []);
  const [hourlyRate,  setHourlyRate]  = useState(initial?.hourlyRate ?? settings?.defaultRate ?? DEFAULT_RATE);
  const [active,      setActive]      = useState(initial?.active ?? true);
  const [notes,       setNotes]       = useState(initial?.notes ?? "");

  if (!settings) return <div className="p-4 text-gray-500">Memuat...</div>;

  const toggleSubject = (s: string) =>
    setSubjects((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    await onSave({
      name: name.trim(),
      level,
      studentPhone: studentPhone.trim() || undefined,
      parentContact: { name: parentName.trim() || undefined, phone: phone.trim() },
      subjects,
      hourlyRate,
      active,
      enrolledAt: initial?.enrolledAt ?? todayWIB(),
      notes: notes.trim() || undefined,
      photo: initial?.photo,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Nama Murid</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div>
        <label className="label">Level</label>
        <select className="input" value={level} onChange={(e) => setLevel(e.target.value as Level)}>
          <option value="MYP">MYP</option>
          <option value="IBDP">IBDP</option>
          <option value="UNIV">UNIV</option>
        </select>
      </div>

      {/* Kontak Orang Tua */}
      <div className="bg-gray-50 rounded-xl p-3 space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Kontak Orang Tua</p>
        <div>
          <label className="label">Nama Orang Tua <span className="text-gray-400 font-normal">(opsional)</span></label>
          <input className="input" value={parentName} onChange={(e) => setParentName(e.target.value)} placeholder="Misal: Bpk. Budi" />
        </div>
        <div>
          <label className="label">No. WhatsApp Orang Tua</label>
          <div className="relative">
            <input className="input pl-10" type="tel" value={phone}
              onChange={(e) => setPhone(e.target.value)} required placeholder="08xxxxxxxxxx" />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500">💬</span>
          </div>
          {phone && (
            <p className="text-xs text-gray-400 mt-0.5">wa.me/{toWaNumber(phone)}</p>
          )}
        </div>
      </div>

      {/* Kontak Murid */}
      <div className="bg-blue-50 rounded-xl p-3 space-y-3">
        <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide">Kontak Murid</p>
        <div>
          <label className="label">No. WhatsApp Murid <span className="text-gray-400 font-normal">(opsional)</span></label>
          <div className="relative">
            <input className="input pl-10" type="tel" value={studentPhone}
              onChange={(e) => setStudentPhone(e.target.value)} placeholder="08xxxxxxxxxx" />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500">💬</span>
          </div>
          {studentPhone && (
            <p className="text-xs text-gray-400 mt-0.5">wa.me/{toWaNumber(studentPhone)}</p>
          )}
        </div>
      </div>

      <div>
        <label className="label">
          Mata Pelajaran <span className="text-gray-400 font-normal text-xs">(opsional)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {settings.subjects.map((s) => (
            <button type="button" key={s}
              className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                subjects.includes(s) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300"
              }`}
              onClick={() => toggleSubject(s)}>{s}</button>
          ))}
        </div>
      </div>

      <input type="hidden" value={hourlyRate} onChange={(e) => setHourlyRate(Number(e.target.value))} />

      <div>
        <label className="label">Catatan <span className="text-gray-400 font-normal text-xs">(opsional)</span></label>
        <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)}
          className="w-4 h-4 accent-blue-600" />
        <span className="text-sm text-gray-700">Murid Aktif</span>
      </label>

      <div className="flex gap-3">
        <button type="submit" className="btn-primary flex-1">Simpan</button>
        {onCancel && <button type="button" className="btn-secondary" onClick={onCancel}>Batal</button>}
      </div>
    </form>
  );
}
