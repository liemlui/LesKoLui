import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getSettings } from "../db/repos";
import { todayWIB } from "../lib/format";
import type { Student, Level, CurriculumType } from "../db/types";
import { DEFAULT_RATE } from "../db/types";
import { ALL_CURRICULA, CURRICULUM_META, getSubjectGroups } from "../lib/ibSubjects";
import Toggle from "./Toggle";
import { MAX_HOURLY_RATE, isValidCurrencyAmount, parseCurrencyDigits } from "../lib/money";

interface Props {
  initial?: Student;
  onSave: (data: Omit<Student, "id">) => void | Promise<void>;
  onCancel?: () => void;
}

function toWaNumber(raw: string) {
  return raw.replace(/^0/, "62").replace(/[^0-9]/g, "");
}

/** Returns true if the raw input looks like a valid phone number (digits, optional +, spaces, hyphens) */
function hasInvalidChars(raw: string): boolean {
  return raw.length > 0 && /[^0-9+\- ]/.test(raw);
}

function curriculumToLevel(c: CurriculumType): Level {
  if (c === "IB MYP") return "MYP";
  if (c === "IB DP")  return "IBDP";
  return "UNIV";
}

function inferCurriculum(s: Student): CurriculumType {
  if (s.curriculum) return s.curriculum;
  if (s.level === "MYP")  return "IB MYP";
  if (s.level === "IBDP") return "IB DP";
  return "National";
}

export default function StudentForm({ initial, onSave, onCancel }: Props) {
  const settings = useLiveQuery(() => getSettings(), []);

  const [name,         setName]         = useState(initial?.name ?? "");
  const [curriculum,   setCurriculum]   = useState<CurriculumType>(
    initial ? inferCurriculum(initial) : "IB DP"
  );
  const [grade,        setGrade]        = useState(initial?.grade ?? "");
  const [school,       setSchool]       = useState(initial?.school ?? "");
  const [phone,        setPhone]        = useState(initial?.parentContact.phone ?? "");
  const [parentName,   setParentName]   = useState(initial?.parentContact.name ?? "");
  const [studentPhone, setStudentPhone] = useState(initial?.studentPhone ?? "");
  const [subjects,     setSubjects]     = useState<string[]>(initial?.subjects ?? []);
  const [hourlyRate,   setHourlyRate]   = useState(
    initial?.hourlyRate ?? settings?.defaultRate ?? DEFAULT_RATE
  );
  const [rateInput,    setRateInput]    = useState(
    String(initial?.hourlyRate ?? settings?.defaultRate ?? DEFAULT_RATE)
  );
  const [active,  setActive]  = useState(initial?.active ?? true);
  const [notes,   setNotes]   = useState(initial?.notes ?? "");

  if (!settings) return <div className="p-4 text-gray-500">Memuat...</div>;

  const curriculumGroups = getSubjectGroups(curriculum);
  const curriculumSubjects = curriculumGroups.flatMap((g) => g.subjects);
  // Custom subjects from settings not already in curriculum list
  const extraSubjects = settings.subjects.filter((s) => !curriculumSubjects.includes(s));

  const toggleSubject = (s: string) =>
    setSubjects((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);

  const handleCurriculumChange = (c: CurriculumType) => {
    setCurriculum(c);
    // Remove subjects that don't belong to new curriculum (keep extras from settings)
    const newGroups = getSubjectGroups(c).flatMap((g) => g.subjects);
    const newExtra  = settings.subjects.filter((s) => !newGroups.includes(s));
    const keepable  = [...newGroups, ...newExtra];
    setSubjects((prev) => prev.filter((s) => keepable.includes(s)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    if (!isValidCurrencyAmount(hourlyRate, MAX_HOURLY_RATE)) return;
    await onSave({
      name: name.trim(),
      level: curriculumToLevel(curriculum),
      curriculum,
      grade: grade.trim() || undefined,
      school: school.trim() || undefined,
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

  const meta = CURRICULUM_META[curriculum];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Nama */}
      <div>
        <label htmlFor="name" className="label">Nama Murid</label>
        <input id="name" className="input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} required />
      </div>

      {/* Kurikulum — required */}
      <div>
        <label className="label">
          Kurikulum <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {ALL_CURRICULA.map((c) => {
            const m = CURRICULUM_META[c];
            const sel = c === curriculum;
            return (
              <button
                key={c} type="button"
                onClick={() => handleCurriculumChange(c)}
                className={`px-2 py-2 rounded-xl text-xs font-semibold border-2 transition-all ${
                  sel
                    ? `${m.color} ${m.text} border-current shadow-sm`
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                }`}
              >
                {m.shortLabel}
              </button>
            );
          })}
        </div>
        {curriculum && (
          <p className="text-xs text-gray-500 mt-1.5">{meta.label}</p>
        )}
      </div>

      {/* Grade + Sekolah */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="grade" className="label">Kelas / Grade <span className="text-gray-400 font-normal text-xs">(opsional)</span></label>
          <input id="grade" className="input" value={grade} maxLength={20} onChange={(e) => setGrade(e.target.value)}
            placeholder="mis. Grade 10, Year 11" />
        </div>
        <div>
          <label htmlFor="school" className="label">Sekolah <span className="text-gray-400 font-normal text-xs">(opsional)</span></label>
          <input id="school" className="input" value={school} maxLength={80} onChange={(e) => setSchool(e.target.value)}
            placeholder="Nama sekolah" />
        </div>
      </div>

      {/* Kontak Orang Tua */}
      <div className="bg-gray-50 rounded-xl p-3 space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Kontak Orang Tua</p>
        <div>
          <label htmlFor="parentName" className="label">Nama Orang Tua <span className="text-gray-400 font-normal">(opsional)</span></label>
          <input id="parentName" className="input" maxLength={60} value={parentName} onChange={(e) => setParentName(e.target.value)} placeholder="Misal: Bpk. Budi" />
        </div>
        <div>
          <label htmlFor="phone" className="label">No. WhatsApp Orang Tua</label>
          <div className="relative">
            <input id="phone" className="input pl-10" type="tel" value={phone}
              onChange={(e) => setPhone(e.target.value)} required placeholder="08xxxxxxxxxx" />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500">💬</span>
          </div>
          {phone && hasInvalidChars(phone) && (
            <p className="text-xs text-red-500 mt-0.5">⚠️ Hanya angka — karakter lain akan dihapus otomatis.</p>
          )}
          {phone && !hasInvalidChars(phone) && <p className="text-xs text-gray-400 mt-0.5">wa.me/{toWaNumber(phone)}</p>}
        </div>
      </div>

      {/* Kontak Murid */}
      <div className="bg-blue-50 rounded-xl p-3 space-y-3">
        <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide">Kontak Murid</p>
        <div>
          <label htmlFor="studentPhone" className="label">No. WhatsApp Murid <span className="text-gray-400 font-normal">(opsional)</span></label>
          <div className="relative">
            <input id="studentPhone" className="input pl-10" type="tel" value={studentPhone}
              onChange={(e) => setStudentPhone(e.target.value)} placeholder="08xxxxxxxxxx" />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500">💬</span>
          </div>
          {studentPhone && hasInvalidChars(studentPhone) && (
            <p className="text-xs text-red-500 mt-0.5">⚠️ Hanya angka — karakter lain akan dihapus otomatis.</p>
          )}
          {studentPhone && !hasInvalidChars(studentPhone) && <p className="text-xs text-gray-400 mt-0.5">wa.me/{toWaNumber(studentPhone)}</p>}
        </div>
      </div>

      {/* Mata Pelajaran — curriculum-aware */}
      <div>
        <label className="label">
          Mata Pelajaran <span className="text-gray-400 font-normal text-xs">(opsional)</span>
        </label>

        {curriculum === "Custom" ? (
          /* Custom: just show settings.subjects */
          <div className="flex flex-wrap gap-2">
            {settings.subjects.map((s) => (
              <button type="button" key={s}
                className={`px-3 py-2 rounded-full text-sm border transition-colors ${
                  subjects.includes(s) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300"
                }`}
                onClick={() => toggleSubject(s)}>{s}</button>
            ))}
          </div>
        ) : (
          /* Curriculum-grouped subject picker */
          <div className="space-y-3">
            {curriculumGroups.map((group) => (
              <div key={group.group}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{group.group}</p>
                <div className="flex flex-wrap gap-1.5">
                  {group.subjects.map((s) => (
                    <button type="button" key={s}
                      className={`px-3 py-2 rounded-full text-xs border transition-colors ${
                        subjects.includes(s)
                          ? `${meta.color} ${meta.text} border-transparent font-semibold`
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                      }`}
                      onClick={() => toggleSubject(s)}>{s}</button>
                  ))}
                </div>
              </div>
            ))}

            {extraSubjects.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Mata Pelajaran Tambahan</p>
                <div className="flex flex-wrap gap-1.5">
                  {extraSubjects.map((s) => (
                    <button type="button" key={s}
                      className={`px-3 py-2 rounded-full text-xs border transition-colors ${
                        subjects.includes(s)
                          ? "bg-orange-100 text-orange-700 border-transparent font-semibold"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                      }`}
                      onClick={() => toggleSubject(s)}>{s}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {subjects.length > 0 && (
          <p className="text-xs text-gray-500 mt-2">
            Dipilih: {subjects.join(", ")}
          </p>
        )}
      </div>

      {/* Tarif les per jam */}
      <div className="bg-orange-50 rounded-xl p-3 space-y-1">
        <label htmlFor="rateInput" className="label !mb-0">Tarif Les per Jam</label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 font-medium">Rp</span>
          <input
            id="rateInput"
            className="input flex-1"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={rateInput}
            onChange={(e) => {
              const { raw, amount } = parseCurrencyDigits(e.target.value, MAX_HOURLY_RATE);
              setRateInput(raw);
              setHourlyRate(amount);
            }}
            onBlur={() => setRateInput(String(hourlyRate || 0))}
            placeholder="mis. 200000"
          />
          <span className="text-sm text-gray-400">/ jam</span>
        </div>
        {settings?.defaultRate && hourlyRate === settings.defaultRate && (
          <p className="text-xs text-orange-500">Menggunakan tarif default dari Pengaturan</p>
        )}
      </div>

      <div>
        <label htmlFor="notes" className="label">Catatan <span className="text-gray-400 font-normal text-xs">(opsional)</span></label>
        <textarea id="notes" className="input" rows={2} maxLength={300} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <div className="flex items-center gap-3">
        <Toggle checked={active} onChange={setActive} />
        <span className="text-sm font-medium text-gray-700">Murid Aktif</span>
      </div>

      <div className="flex gap-3">
        <button type="submit" className="btn-primary flex-1">Simpan</button>
        {onCancel && <button type="button" className="btn-secondary" onClick={onCancel}>Batal</button>}
      </div>
    </form>
  );
}
