import Skeleton from "./Skeleton";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getSettings, countUnbilledBillableSessions } from "../db/repos";
import type { StudentBillingUpdateOptions } from "../db/repos";
import { todayWIB } from "../lib/format";
import { toggleArrayItem } from "../lib/arrays";
import type { Student, Level, CurriculumType, BillingPolicy } from "../db/types";
import { levelForCurriculum } from "../db/types";
import { DEFAULT_RATE, billingPolicyOf } from "../db/types";
import { ALL_CURRICULA, CURRICULUM_META, getSubjectGroups } from "../lib/ibSubjects";
import Toggle from "./Toggle";
import { MAX_HOURLY_RATE, isValidCurrencyAmount, parseCurrencyDigits } from "../lib/money";

interface Props {
  initial?: Student;
  onSave: (
    data: Omit<Student, "id">,
    options?: StudentBillingUpdateOptions,
  ) => void | Promise<void>;
  onCancel?: () => void;
}

function toWaNumber(raw: string) {
  return raw.replace(/^0/, "62").replace(/[^0-9]/g, "");
}

/** Returns true if the raw input looks like a valid phone number (digits, optional +, spaces, hyphens) */
function hasInvalidChars(raw: string): boolean {
  return raw.length > 0 && /[^0-9+\- ]/.test(raw);
}

/**
 * Kurikulum → jenjang murid. Sejak audit P0 (T-07) memakai `levelForCurriculum`
 * dari `db/types`: pemetaan lama mengembalikan "UNIV" untuk IGCSE/O Level/
 * A Level/AP/National, sehingga siswa 15 tahun tercatat sebagai jenjang
 * universitas. Fungsi di bawah menambahkan koreksi SMP/SMA dari kelas.
 */
function curriculumToLevel(c: CurriculumType, grade?: string): Level {
  const base = levelForCurriculum(c);
  if (base !== "SMP" && base !== "SMA") return base;
  const n = Number((grade?.match(/(\d{1,2})/) ?? [])[1]);
  if (!Number.isFinite(n)) return base;
  return n >= 10 ? "SMA" : "SMP";
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
  const [billingPolicy, setBillingPolicy] = useState<BillingPolicy>(
    initial ? billingPolicyOf(initial) : "monthly"
  );
  const [billingSessionCountInput, setBillingSessionCountInput] = useState(
    String(initial?.billingSessionCount ?? 8)
  );
  const [billingSessionCountError, setBillingSessionCountError] = useState("");
  const [includeExistingUnbilledInPackage, setIncludeExistingUnbilledInPackage] = useState(false);
  const [cancelPendingTransition, setCancelPendingTransition] = useState(false);
  /** D1(c): retroaktif HANYA setelah tutor mencentang, tidak pernah otomatis. */
  const [repriceUnbilledSessions, setRepriceUnbilledSessions] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [active,  setActive]  = useState(initial?.active ?? true);
  const [notes,   setNotes]   = useState(initial?.notes ?? "");

  // Jumlah sesi yang belum ditagih — menentukan apakah pilihan retroaktif perlu
  // ditawarkan. Tarif historis dibekukan secara default (D1(c)).
  const unbilledCount = useLiveQuery(
    () => (initial ? countUnbilledBillableSessions(initial.id) : 0),
    [initial?.id],
  );

  // Tarif benar-benar berubah? Pilihan retroaktif hanya muncul bila ada sesi
  // lama yang belum ditagih dan nilainya berbeda dari tarif murid saat ini.
  const rateChanged = Boolean(initial) && hourlyRate !== initial!.hourlyRate;
  const showRepriceChoice = rateChanged && (unbilledCount ?? 0) > 0;

  if (!settings) return <Skeleton variant="card" lines={4} className="p-4" />;

  const curriculumGroups = getSubjectGroups(curriculum);
  const curriculumSubjects = curriculumGroups.flatMap((g) => g.subjects);
  // Custom subjects from settings not already in curriculum list
  const extraSubjects = settings.subjects.filter((s) => !curriculumSubjects.includes(s));

  const toggleSubject = (s: string) => setSubjects((prev) => toggleArrayItem(prev, s));

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
    const billingSessionCount = Number(billingSessionCountInput);
    if (
      billingPolicy === "session_count"
      && (!Number.isInteger(billingSessionCount) || billingSessionCount < 1 || billingSessionCount > 20)
    ) {
      setBillingSessionCountError("Jumlah pertemuan harus berupa angka bulat antara 1 dan 20.");
      return;
    }
    setBillingSessionCountError("");
    setSaveError("");
    try {
      const data: Omit<Student, "id"> = {
        name: name.trim(),
        level: curriculumToLevel(curriculum, grade),
        curriculum,
        grade: grade.trim() || undefined,
        school: school.trim() || undefined,
        studentPhone: studentPhone.trim() || undefined,
        parentContact: { name: parentName.trim() || undefined, phone: phone.trim() },
        subjects,
        hourlyRate,
        billingPolicy,
        // Simpan kuota terakhir saat policy lain aktif agar N tidak berubah
        // diam-diam ketika pengguna kembali ke penagihan paket.
        billingSessionCount: billingPolicy === "session_count"
          ? billingSessionCount
          : initial?.billingSessionCount,
        active,
        enrolledAt: initial?.enrolledAt ?? todayWIB(),
        notes: notes.trim() || undefined,
        photo: initial?.photo,
      };
      // Pertahankan peralihan tertunda saat user sekadar mengedit profil tanpa
      // mengubah siklus: billingPolicy tidak dikirim agar updateStudent tidak
      // membatalkan pendingBillingPolicy secara diam-diam.
      const preservePendingTransition = Boolean(initial?.pendingBillingPolicy)
        && billingPolicy === "session_count"
        && billingPolicyOf(initial!) === "session_count"
        && !cancelPendingTransition;
      if (preservePendingTransition) {
        delete data.billingPolicy;
      }
      await onSave(data, {
        includeExistingUnbilledInPackage:
          Boolean(initial)
          && billingPolicy === "session_count"
          && billingPolicyOf(initial!) !== "session_count"
          && includeExistingUnbilledInPackage,
        deferSessionCountPolicyChange:
          Boolean(initial)
          && billingPolicyOf(initial!) === "session_count"
          && billingPolicy !== "session_count",
        // D1(c): tanpa centang, tarif sesi lama tidak tersentuh.
        repriceUnbilledSessions: rateChanged && repriceUnbilledSessions,
      });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Profil murid gagal disimpan.");
    }
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
          Kurikulum <span className="text-[var(--ink-danger)]">*</span>
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
                    : "bg-[var(--surface-strong)] text-[var(--ink-muted)] border-[var(--border)] hover:border-[var(--border-strong)]"
                }`}
              >
                {m.shortLabel}
              </button>
            );
          })}
        </div>
        {curriculum && (
          <p className="text-xs text-[var(--ink-muted)] mt-1.5">{meta.label}</p>
        )}
      </div>

      {/* Grade + Sekolah */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="grade" className="label">Kelas / Grade <span className="text-[var(--ink-muted)] font-normal text-xs">(opsional)</span></label>
          <input id="grade" className="input" value={grade} maxLength={20} onChange={(e) => setGrade(e.target.value)}
            placeholder="mis. Grade 10, Year 11" />
        </div>
        <div>
          <label htmlFor="school" className="label">Sekolah <span className="text-[var(--ink-muted)] font-normal text-xs">(opsional)</span></label>
          <input id="school" className="input" value={school} maxLength={80} onChange={(e) => setSchool(e.target.value)}
            placeholder="Nama sekolah" />
        </div>
      </div>

      {/* Kontak Orang Tua */}
      <div className="bg-[var(--surface)] rounded-xl p-3 space-y-3">
        <p className="text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wide">Kontak Orang Tua</p>
        <div>
          <label htmlFor="parentName" className="label">Nama Orang Tua <span className="text-[var(--ink-muted)] font-normal">(opsional)</span></label>
          <input id="parentName" className="input" maxLength={60} value={parentName} onChange={(e) => setParentName(e.target.value)} placeholder="Misal: Bpk. Budi" />
        </div>
        <div>
          <label htmlFor="phone" className="label">No. WhatsApp Orang Tua</label>
          <div className="relative">
            <input id="phone" className="input pl-10" type="tel" value={phone}
              onChange={(e) => setPhone(e.target.value)} required placeholder="08xxxxxxxxxx" />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-success)]">💬</span>
          </div>
          {phone && hasInvalidChars(phone) && (
            <p className="text-xs text-[var(--ink-danger)] mt-0.5">⚠️ Hanya angka — karakter lain akan dihapus otomatis.</p>
          )}
          {phone && !hasInvalidChars(phone) && <p className="text-xs text-[var(--ink-muted)] mt-0.5">wa.me/{toWaNumber(phone)}</p>}
        </div>
      </div>

      {/* Kontak Murid */}
      <div className="bg-[var(--brand-tint)] rounded-xl p-3 space-y-3">
        <p className="text-xs font-semibold text-[var(--ink-brand)] uppercase tracking-wide">Kontak Murid</p>
        <div>
          <label htmlFor="studentPhone" className="label">No. WhatsApp Murid <span className="text-[var(--ink-muted)] font-normal">(opsional)</span></label>
          <div className="relative">
            <input id="studentPhone" className="input pl-10" type="tel" value={studentPhone}
              onChange={(e) => setStudentPhone(e.target.value)} placeholder="08xxxxxxxxxx" />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-success)]">💬</span>
          </div>
          {studentPhone && hasInvalidChars(studentPhone) && (
            <p className="text-xs text-[var(--ink-danger)] mt-0.5">⚠️ Hanya angka — karakter lain akan dihapus otomatis.</p>
          )}
          {studentPhone && !hasInvalidChars(studentPhone) && <p className="text-xs text-[var(--ink-muted)] mt-0.5">wa.me/{toWaNumber(studentPhone)}</p>}
        </div>
      </div>

      {/* Mata Pelajaran — curriculum-aware */}
      <div>
        <label className="label">
          Mata Pelajaran <span className="text-[var(--ink-muted)] font-normal text-xs">(opsional)</span>
        </label>

        {curriculum === "Custom" ? (
          /* Custom: just show settings.subjects */
          <div className="flex flex-wrap gap-2">
            {settings.subjects.map((s) => (
              <button type="button" key={s}
                aria-pressed={subjects.includes(s)}
                className={`px-3 py-2 rounded-full text-sm border transition-colors ${
                  subjects.includes(s) ? "bg-[var(--brand-solid)] text-[var(--on-strong)] border-[var(--border-brand)]" : "bg-[var(--surface-strong)] text-[var(--ink-muted)] border-[var(--border)]"
                }`}
                onClick={() => toggleSubject(s)}>{s}</button>
            ))}
          </div>
        ) : (
          /* Curriculum-grouped subject picker */
          <div className="space-y-3">
            {curriculumGroups.map((group) => (
              <div key={group.group}>
                <p className="text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wide mb-1.5">{group.group}</p>
                <div className="flex flex-wrap gap-1.5">
                  {group.subjects.map((s) => (
                    <button type="button" key={s}
                      aria-pressed={subjects.includes(s)}
                      className={`px-3 py-2 rounded-full text-xs border transition-colors ${
                        subjects.includes(s)
                          ? `${meta.color} ${meta.text} border-transparent font-semibold`
                          : "bg-[var(--surface-strong)] text-[var(--ink-muted)] border-[var(--border)] hover:border-[var(--border-strong)]"
                      }`}
                      onClick={() => toggleSubject(s)}>{s}</button>
                  ))}
                </div>
              </div>
            ))}

            {extraSubjects.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wide mb-1.5">Mata Pelajaran Tambahan</p>
                <div className="flex flex-wrap gap-1.5">
                  {extraSubjects.map((s) => (
                    <button type="button" key={s}
                      aria-pressed={subjects.includes(s)}
                      className={`px-3 py-2 rounded-full text-xs border transition-colors ${
                        subjects.includes(s)
                          ? "bg-[var(--bg-attention)] text-[var(--ink-attention)] border-transparent font-semibold"
                          : "bg-[var(--surface-strong)] text-[var(--ink-muted)] border-[var(--border)] hover:border-[var(--border-strong)]"
                      }`}
                      onClick={() => toggleSubject(s)}>{s}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {subjects.length > 0 && (
          <p className="text-xs text-[var(--ink-muted)] mt-2">
            Dipilih: {subjects.join(", ")}
          </p>
        )}
      </div>

      {/* Tarif les per jam */}
      <div className="bg-[var(--bg-attention)] rounded-xl p-3 space-y-1">
        <label htmlFor="rateInput" className="label !mb-0">
          Tarif Les {billingPolicy === "session_count" ? "per Pertemuan" : "per Jam"}
        </label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--ink-muted)] font-medium">Rp</span>
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
          <span className="text-sm text-[var(--ink-muted)]">/ {billingPolicy === "session_count" ? "pertemuan" : "jam"}</span>
        </div>
        {settings?.defaultRate && hourlyRate === settings.defaultRate && (
          <p className="text-xs text-[var(--ink-attention)]">Menggunakan tarif default dari Pengaturan</p>
        )}
        {showRepriceChoice && (
          <label className="mt-2 flex items-start gap-2 rounded-lg border border-[var(--border-warn)] bg-[var(--bg-warn)] p-2.5 text-xs leading-relaxed text-[var(--ink-warn)]">
            <input
              type="checkbox"
              checked={repriceUnbilledSessions}
              onChange={(event) => setRepriceUnbilledSessions(event.target.checked)}
              className="mt-0.5 h-4 w-4 flex-none accent-[var(--border-warn)]"
            />
            <span>
              Terapkan tarif baru ke {unbilledCount} sesi lama yang belum ditagih (retroaktif).
              Tanpa centang ini, sesi lama tetap memakai tarif historisnya dan hanya sesi
              berikutnya yang memakai tarif baru. Tindakan retroaktif tercatat di Riwayat Aktivitas.
            </span>
          </label>
        )}
      </div>

      {/* Siklus tagihan */}
      <fieldset className="rounded-2xl border border-[var(--brand-tint-strong)] bg-[var(--brand-tint)]/60 p-3 sm:p-4">
        <legend className="px-1 text-sm font-semibold text-[var(--ink-strong)]">Siklus Tagihan</legend>
        <p id="billing-policy-help" className="mb-3 text-xs leading-relaxed text-[var(--ink-muted)]">
          Atur kapan tagihan murid ini dibuat. Hanya sesi selesai dan no-show yang ditandai dapat ditagih yang masuk hitungan.
          Perubahan berlaku untuk sesi yang belum ditagih; invoice lama tetap utuh.
        </p>
        {initial?.pendingBillingPolicy && (
          <p className="mb-3 rounded-lg border border-[var(--brand-tint-strong)] bg-[var(--brand-tint)] p-2.5 text-xs leading-relaxed text-[var(--ink-brand)]">
            Ada peralihan tertunda: setelah antrean paket selesai, murid otomatis beralih ke {initial.pendingBillingPolicy === "monthly" ? "Bulanan" : "Manual"}.
          </p>
        )}
        {initial?.pendingBillingPolicy && billingPolicy === "session_count" && (
          <label className="mb-3 flex items-start gap-2 rounded-lg border border-[var(--border-warn)] bg-[var(--bg-warn)] p-2.5 text-xs text-[var(--ink-warn)]">
            <input
              type="checkbox"
              checked={cancelPendingTransition}
              onChange={(event) => setCancelPendingTransition(event.target.checked)}
              className="mt-0.5 h-4 w-4 flex-none accent-[var(--border-warn)]"
            />
            <span>Batalkan peralihan ini — murid tetap memakai paket {initial.billingSessionCount ?? 8} pertemuan.</span>
          </label>
        )}
        {initial && billingPolicyOf(initial) === "session_count" && billingPolicy !== "session_count" && (
          <p className="mb-3 rounded-lg border border-[var(--border-warn)] bg-[var(--bg-warn)] p-2.5 text-xs leading-relaxed text-[var(--ink-warn)]">
            Jika masih ada sesi belum ditagih, pilihan ini disimpan sebagai peralihan tertunda agar sesi lama tidak hilang. Terbitkan paket yang sudah penuh lalu gunakan “Tagihan Penutup” untuk sisanya; setelah antrean kosong, kebijakan otomatis beralih ke {billingPolicy === "monthly" ? "Bulanan" : "Manual"}. Jika antrean sudah kosong, perubahan langsung aktif.
          </p>
        )}

        <div className="space-y-2">
          {([
            {
              value: "monthly",
              label: "Bulanan",
              description: "Sahkan Laporan Perkembangan bulanan, lalu terbitkan invoice dari tab Tagihan.",
            },
            {
              value: "session_count",
              label: "Setiap N pertemuan",
              description: "Tagihan siap dibuat setiap target jumlah pertemuan tercapai.",
            },
            {
              value: "manual",
              label: "Manual",
              description: "Buat tagihan nominal bebas tanpa mengambil sesi secara otomatis.",
            },
          ] as const).map((option) => {
            const selected = billingPolicy === option.value;
            return (
              <label
                key={option.value}
                className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                  selected
                    ? "border-[var(--border-brand)] bg-[var(--surface-strong)] shadow-sm"
                    : "border-[var(--border)] bg-[var(--surface-strong)]/70 hover:border-[var(--brand-tint-strong)]"
                }`}
              >
                <input
                  type="radio"
                  name="billingPolicy"
                  value={option.value}
                  checked={selected}
                  onChange={() => {
                    setBillingPolicy(option.value);
                    setBillingSessionCountError("");
                  }}
                  aria-describedby="billing-policy-help"
                  className="mt-0.5 h-5 w-5 flex-none accent-[var(--border-brand)]"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[var(--ink-strong)]">{option.label}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-[var(--ink-muted)]">{option.description}</span>
                </span>
              </label>
            );
          })}
        </div>

        {billingPolicy === "session_count" && (
          <div className="mt-3 rounded-xl border border-[var(--brand-tint-strong)] bg-[var(--surface-strong)] p-3">
            <label htmlFor="billingSessionCount" className="label">
              Jumlah pertemuan per tagihan
            </label>
            <div className="flex items-center gap-2">
              <input
                id="billingSessionCount"
                className="input w-24 flex-none text-center"
                type="number"
                inputMode="numeric"
                min={1}
                max={20}
                step={1}
                required
                value={billingSessionCountInput}
                onChange={(e) => {
                  setBillingSessionCountInput(e.target.value);
                  setBillingSessionCountError("");
                }}
                aria-invalid={billingSessionCountError ? "true" : undefined}
                aria-describedby="billing-session-count-hint billing-session-count-error"
              />
              <span className="text-sm text-[var(--ink-muted)]">pertemuan</span>
            </div>
            <p id="billing-session-count-hint" className="mt-1 text-xs text-[var(--ink-muted)]">
              Pilih 1–20. Contoh: 8 berarti tagihan dibuat per 8 sesi yang dapat ditagih.
            </p>
            {billingSessionCountError && (
              <p id="billing-session-count-error" role="alert" className="mt-1 text-xs font-medium text-[var(--ink-danger)]">
                {billingSessionCountError}
              </p>
            )}
            {initial && billingPolicyOf(initial) !== "session_count" && (
              <label className="mt-3 flex items-start gap-2 rounded-lg bg-[var(--bg-warn)] p-2.5 text-xs text-[var(--ink-warn)]">
                <input
                  type="checkbox"
                  checked={includeExistingUnbilledInPackage}
                  onChange={(event) => setIncludeExistingUnbilledInPackage(event.target.checked)}
                  className="mt-0.5 h-4 w-4 flex-none accent-[var(--border-warn)]"
                />
                <span>
                  Masukkan sesi lama yang belum terikat laporan ke antrean paket. Jika tidak dicentang, perubahan akan ditolak saat masih ada sesi lama agar tidak terjadi tagihan ganda.
                </span>
              </label>
            )}
          </div>
        )}
      </fieldset>

      <div>
        <label htmlFor="notes" className="label">Catatan <span className="text-[var(--ink-muted)] font-normal text-xs">(opsional)</span></label>
        <textarea id="notes" className="input" rows={2} maxLength={300} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <div className="flex items-center gap-3">
        <Toggle checked={active} onChange={setActive} />
        <span className="text-sm font-medium text-[var(--ink-strong)]">Murid Aktif</span>
      </div>

      <div className="flex gap-3">
        <button type="submit" className="btn-primary flex-1">Simpan</button>
        {onCancel && <button type="button" className="btn-secondary" onClick={onCancel}>Batal</button>}
      </div>
      {saveError && <p role="alert" className="text-sm font-medium text-[var(--ink-danger)]">{saveError}</p>}
    </form>
  );
}
