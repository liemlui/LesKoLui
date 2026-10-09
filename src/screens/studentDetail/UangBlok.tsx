import { useMemo, useState } from "react";
import type { Session, Student } from "../../db/types";
import MaskedMoney from "../../components/ui/MaskedMoney";
import { PencilIcon, LockIcon } from "../../components/icons";
import { MAX_HOURLY_RATE, clampCurrencyAmount } from "../../lib/money";

interface UangBlokProps {
  student: Student;
  /** Sesi yang menentukan biaya: hanya yang benar-benar selesai. */
  billableSessions: readonly Session[];
  /** Jumlah sesi selesai yang belum masuk tagihan (dari repo, bukan dihitung di sini). */
  unbilledCount: number;
  /** `billingPolicyOf(student)` — dihitung induk, tidak diulang di sini. */
  billingPolicy: string;
  /** Apakah angka uang sedang terbuka (gerbang `useMoneyVisible`). */
  moneyVisible: boolean;
  /** Guru perlu membuat PIN dulu sebelum uang bisa dibuka. */
  needsSetup: boolean;
  locked: boolean;
  onLock: () => void;
  onOpenSettings: () => void;
  onOpenBillingHelp: () => void;
  /**
   * Menyimpan tarif baru. Induk yang memutuskan jalur tulisnya (termasuk aturan
   * D1(c) retroaktif) dan mengembalikan pesan galat — string kosong berarti
   * berhasil. Blok ini tidak pernah menulis data sendiri.
   */
  onSaveRate: (rate: number, applyRetroactive: boolean) => Promise<string>;
}

/**
 * Blok uang tab Ringkas — butir 3 G3-06.
 *
 * SEBELUMNYA "tarif + siklus tagihan + Total Sesi/Jam" menumpang di dalam kartu
 * **Info Murid**, sehingga pertanyaan "berapa tarifnya dan sudah berapa nilainya"
 * harus dicari di antara sekolah, kelas, dan kontak orang tua. Sekarang keduanya
 * satu blok bernama **Uang**.
 *
 * Blok ini satu-satunya tempat angka uang di layar Murid — keputusan
 * `ATURAN-AI.md` §4.1 butir B1 ("Uang hanya di tab Ringkas"). Empat tab lainnya
 * tidak memuat satu pun nominal; itu diperiksa penjaga `moneyGate.test.ts`.
 *
 * Dua aturan yang harus dijaga saat menyunting berkas ini:
 *
 * 1. **Setiap nominal lewat `MaskedMoney`.** Tidak ada satu pun angka uang yang
 *    ditulis langsung. Baris ber-tanda `// money-safe:` hanya untuk konstanta
 *    batas (`MAX_HOURLY_RATE`), bukan tarif tutor.
 * 2. **Agregat hanya dihitung bila `moneyVisible`.** Saat terkunci tidak ada
 *    angka yang dihitung maupun dikirim ke DOM, jadi tidak ada yang bocor lewat
 *    markup.
 */
export default function UangBlok({
  student, billableSessions, unbilledCount, billingPolicy,
  moneyVisible, needsSetup, locked, onLock, onOpenSettings, onOpenBillingHelp, onSaveRate,
}: UangBlokProps) {
  const [editing, setEditing] = useState(false);
  const [rate, setRate] = useState(student.hourlyRate);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [applyRetroactive, setApplyRetroactive] = useState(false);

  const startEdit = () => {
    setRate(student.hourlyRate);
    setApplyRetroactive(false);
    setSaveError("");
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    setSaveError("");
    try {
      const error = await onSaveRate(rate, applyRetroactive);
      if (error) {
        setSaveError(error);
        return;
      }
      setEditing(false);
      setApplyRetroactive(false);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Tarif tidak dapat disimpan.");
    } finally {
      setSaving(false);
    }
  };

  // Hanya dihitung saat uang terbuka. Saat terkunci hasilnya `null`, sehingga
  // tidak ada agregat yang bisa dibaca dari struktur DOM.
  const summary = useMemo(() => {
    if (!moneyVisible) return null;
    let total = 0;
    let hours = 0;
    let manual = 0;
    for (const s of billableSessions) {
      total += s.cost;
      hours += s.durationHours;
      if (s.costOverride != null) manual += 1;
    }
    return { total, hours, count: billableSessions.length, manual };
  }, [moneyVisible, billableSessions]);

  const rateUnit = billingPolicy === "session_count" ? "pertemuan" : "jam";
  const rateChanged = rate !== student.hourlyRate;

  return (
    <section
      aria-labelledby="uang-blok-title"
      className="bg-[var(--surface-strong)] rounded-2xl p-4 shadow-sm border border-[var(--border)] space-y-3"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="uang-blok-title" className="font-semibold text-[var(--ink-strong)] text-sm">Uang</h2>
        {moneyVisible && !editing && (
          <button
            type="button"
            onClick={onLock}
            aria-label="Kunci angka uang"
            className="inline-flex h-8 w-8 items-center justify-center text-xs text-[var(--ink-muted)] px-1.5 py-1"
          >
            <LockIcon size={13} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* ── Tarif ── */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-[var(--ink-muted)] w-28 flex-shrink-0">Tarif les</span>
        {moneyVisible ? (
          editing ? (
            <div className="flex flex-1 flex-col gap-2">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className="input text-sm py-1.5 flex-1"
                  aria-label={`Tarif per ${rateUnit}`}
                  value={rate || ""}
                  onChange={(e) => setRate(clampCurrencyAmount(Number(e.target.value), MAX_HOURLY_RATE))}
                  placeholder={`IDR/${rateUnit}`}
                />
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={saving}
                  className="text-xs bg-[var(--brand-solid)] text-[var(--on-strong)] px-2 py-1.5 rounded-lg font-semibold disabled:opacity-50"
                >
                  {saving ? "..." : "Simpan"}
                </button>
                <button
                  type="button"
                  onClick={() => { setEditing(false); setApplyRetroactive(false); }}
                  aria-label="Batal menyunting tarif"
                  className="text-xs text-[var(--ink-muted)] px-1.5 py-1.5"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>

              {rateChanged && unbilledCount > 0 && (
                <label className="flex items-start gap-2 rounded-lg border border-[var(--border-warn)] bg-[var(--bg-warn)] p-2 text-xs leading-relaxed text-[var(--ink-warn)]">
                  <input
                    type="checkbox"
                    checked={applyRetroactive}
                    onChange={(e) => setApplyRetroactive(e.target.checked)}
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
          ) : (
            <div className="flex items-center gap-2 flex-1">
              <span className="text-[var(--ink-strong)] font-medium">
                <MaskedMoney amount={student.hourlyRate} />/{rateUnit}
              </span>
              <button
                type="button"
                onClick={startEdit}
                className="ml-auto text-xs bg-[var(--bg-subtle)] text-[var(--ink-muted)] px-2 py-1 rounded-lg"
              >
                <PencilIcon size={13} className="mr-1 inline align-[-2px]" aria-hidden="true" /> Edit
              </button>
            </div>
          )
        ) : (
          <div className="flex items-center gap-2 flex-1">
            <MaskedMoney amount={student.hourlyRate} className="text-base" hideUnlock={needsSetup} />
            {needsSetup && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="ml-auto text-xs bg-[var(--bg-danger)] text-[var(--ink-danger)] px-2 py-1 rounded-lg"
              >
                Buat PIN
              </button>
            )}
            {locked && <span className="ml-auto text-xs text-[var(--ink-muted)]">Tarif dikunci</span>}
          </div>
        )}
      </div>

      {saveError && <p className="text-xs text-[var(--ink-danger)]">{saveError}</p>}

      {/* ── Siklus tagihan ── */}
      <div className="flex items-start gap-2 border-t border-[var(--border)] pt-2 text-sm">
        <span className="w-28 flex-shrink-0 text-[var(--ink-muted)]">Siklus tagihan</span>
        <span className="min-w-0 flex-1 font-medium text-[var(--ink-strong)]">
          {billingCycleLabel(student, billingPolicy)}
        </span>
        <button
          type="button"
          onClick={onOpenBillingHelp}
          aria-label="Bantuan siklus tagihan"
          title="Cara kerja siklus tagihan"
          className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[var(--bg-subtle)] text-xs font-bold text-[var(--ink-muted)] transition-colors hover:bg-[var(--brand-tint-strong)] hover:text-[var(--ink-brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-brand)]"
        >?</button>
      </div>

      {/* ── Rincian biaya dari sesi yang sudah selesai ──
          SELURUH bagian ini ikut gerbang uang. Bukan hanya nominalnya: jumlah sesi
          yang belum ditagih dan jumlah sesi bernominal manual pun bercerita tentang
          uang, dan menampilkannya di sebelah tarif yang bertuliskan `Rp ••••••`
          tidak konsisten. Saat terkunci, bagian ini tidak dirender sama sekali. */}
      {moneyVisible && (
        <div className="border-t border-[var(--border)] pt-2">
          <p className="text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wide mb-1.5">
            Rincian biaya sesi
          </p>
          {billableSessions.length === 0 ? (
            <p className="text-xs text-[var(--ink-muted)]">
              Belum ada sesi selesai, jadi belum ada biaya yang bisa dirinci.
            </p>
          ) : (
            <>
              <div className="text-xs text-[var(--ink-muted)] space-y-0.5">
                <p>
                  {billableSessions.length} sesi selesai
                  {summary ? ` · ${summary.hours} jam` : ""}
                </p>
                {summary && summary.manual > 0 && (
                  <p>
                    {summary.manual} dari {summary.count} sesi memakai nominal manual — itu koreksi yang Anda isi
                    sendiri dan tidak dihitung ulang mesin.
                  </p>
                )}
              </div>

              {summary && (
                <div className="mt-2 rounded-xl bg-[var(--brand-tint)] px-3 py-2">
                  <p className="text-xs text-[var(--ink-brand)]">Total biaya sesi selesai</p>
                  <p className="text-lg font-bold text-[var(--ink-brand)]">
                    <MaskedMoney amount={summary.total} />
                  </p>
                  <p className="text-xs text-[var(--ink-brand)] mt-0.5 leading-relaxed">
                    Perkiraan dari {summary.count} sesi selesai. Tagihan yang sudah difinalkan memakai nominal
                    beku masing-masing dan tidak berubah oleh angka ini.
                  </p>
                </div>
              )}

              {unbilledCount > 0 && (
                <p className="text-xs text-[var(--ink-muted)] mt-1.5">
                  {unbilledCount} dari {billableSessions.length} sesi ini belum masuk tagihan.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}

/** Label siklus tagihan, termasuk keadaan transisi bila ada. */
function billingCycleLabel(student: Student, billingPolicy: string): string {
  if (billingPolicy === "session_count") {
    const per = student.billingSessionCount ?? 8;
    const transition = student.pendingBillingPolicy
      ? ` · akan beralih ke ${student.pendingBillingPolicy === "monthly" ? "Bulanan" : "Manual"} setelah antrean selesai`
      : "";
    return `Setiap ${per} pertemuan yang dapat ditagih${transition}`;
  }
  if (billingPolicy === "manual") return "Manual";
  return "Bulanan (Laporan → Tagihan)";
}
