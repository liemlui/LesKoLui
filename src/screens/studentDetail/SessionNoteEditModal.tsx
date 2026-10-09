import { useState, useRef, useEffect, type ChangeEvent } from "react";
import type { Session } from "../../db/types";
import { updateSession } from "../../db/repos";
import { isGradeLower } from "../../lib/grades";
import { compressPhoto, stampPhoto } from "../../lib/foto";
import { Z } from "../../lib/zIndex";
import SignaturePad from "../../components/SignaturePad";
import MaskedMoney from "../../components/ui/MaskedMoney";
import { CameraIcon, ImageIcon, PencilIcon } from "../../components/icons";

/** Pilihan durasi cepat, sama dengan yang dipakai layar Catat Sesi. */
const DURATIONS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6];

interface SessionNoteEditModalProps {
  session: Session;
  /** Apakah angka uang sedang terbuka (gerbang `useMoneyVisible` dari induk). */
  moneyVisible: boolean;
  notify: (text: string) => void;
  onClose: () => void;
  /** Buka panel kelola/hapus sesi (butuh PIN Keuangan). */
  onKelolaSesi: () => void;
}

/**
 * Modal "Edit Catatan Sesi" — dipindahkan dari `StudentDetail.tsx` (G3-06 fase A).
 *
 * Seluruh state-nya ikut pindah ke sini: 17 `useState`, dua `useRef`, dan dua
 * `useEffect` pembuat URL blob. Induknya dulu memegang semuanya walau tidak satu
 * pun dipakai bagian lain layar, sama seperti alasan ekstraksi `IaEeTracker`.
 *
 * Catatan yang harus dijaga saat menyunting berkas ini:
 *
 * - **Dua `useEffect` di bawah melepas URL blob** lewat fungsi pembersih; tanpa
 *   itu memori bocor setiap kali foto/tanda tangan diganti.
 * - **Refleksi wajib** bila nilai akhir lebih rendah dari prediksi
 *   (`isGradeLower`). Aturannya milik `lib/grades.ts`, bukan ditulis ulang di sini.
 * - **`costOverride` adalah pernyataan eksplisit tutor** (`ATURAN-AI.md` §5) dan
 *   tidak boleh dihitung ulang mesin. Karena itu perubahan biaya hanya ditulis
 *   saat tutor benar-benar mengubahnya, dan "Reset" mengirim `null` supaya
 *   perhitungan otomatis berlaku lagi.
 */
export default function SessionNoteEditModal({
  session, moneyVisible, notify, onClose, onKelolaSesi,
}: SessionNoteEditModalProps) {
  const [shortNote, setShortNote]         = useState(session.shortNote ?? "");
  const [topic, setTopic]                 = useState(session.topic ?? "");
  const [needsWork, setNeedsWork]         = useState(session.needsWork ?? "");
  const [predictedGrade, setPredictedGrade] = useState(session.predictedGrade ?? "");
  const [actualGrade, setActualGrade]     = useState(session.actualGrade ?? "");
  const [gradeReflection, setGradeReflection] = useState(session.gradeReflection ?? "");
  const [gradeError, setGradeError]       = useState("");
  const [saving, setSaving]               = useState(false);

  const [photo, setPhoto]                 = useState<Blob | undefined>(session.photo);
  const [photoUrl, setPhotoUrl]           = useState<string | undefined>();
  const [photoError, setPhotoError]       = useState("");
  const [signature, setSignature]         = useState<Blob | undefined>(session.signature);
  const [sigUrl, setSigUrl]               = useState<string | undefined>();
  const [showSigPad, setShowSigPad]       = useState(false);

  const [cost, setCost]                   = useState(session.cost);
  const [costOverride, setCostOverride]   = useState<number | null>(session.costOverride ?? null);
  const [duration, setDuration]           = useState(session.durationHours);
  const [isEditingCost, setIsEditingCost] = useState(false);

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  // URL blob foto selalu mengikuti blob-nya, dan dilepas saat blob diganti.
  useEffect(() => {
    if (!photo) { setPhotoUrl(undefined); return; }
    const url = URL.createObjectURL(photo);
    setPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  // Sama untuk tanda tangan.
  useEffect(() => {
    if (!signature) { setSigUrl(undefined); return; }
    const url = URL.createObjectURL(signature);
    setSigUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [signature]);

  const handlePhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoError("File harus berupa gambar (JPG/PNG/WebP).");
      e.target.value = "";
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setPhotoError("Foto terlalu besar (maks. 50 MB).");
      e.target.value = "";
      return;
    }
    try {
      const compressed = await compressPhoto(file);
      setPhoto(await stampPhoto(compressed, session.date));
      setPhotoError("");
    } catch {
      setPhotoError("Foto tidak dapat diproses. Coba pilih file lain.");
    }
    e.target.value = "";
  };

  const handleSave = async () => {
    if (isGradeLower(actualGrade, predictedGrade) && !gradeReflection.trim()) {
      setGradeError("Nilai akhir lebih rendah dari prediksi — tulis refleksi kenapa.");
      return;
    }
    setGradeError("");
    setSaving(true);
    try {
      const patch: Partial<Session> = {
        shortNote: shortNote.trim(),
        topic: topic.trim() || undefined,
        needsWork: needsWork.trim() || undefined,
        predictedGrade: predictedGrade.trim() || undefined,
        actualGrade: actualGrade.trim() || undefined,
        gradeReflection: gradeReflection.trim() || undefined,
        photo,
        signature,
      };
      // Nominal manual hanya ditulis bila tutor benar-benar mengubahnya.
      if (costOverride !== null && costOverride !== session.costOverride) {
        patch.costOverride = costOverride;
        patch.cost = costOverride;
      } else if (costOverride === null && session.costOverride != null) {
        // Tutor menekan Reset → override dibersihkan, mesin menghitung ulang.
        patch.costOverride = null;
      }
      if (duration !== session.durationHours) {
        patch.durationHours = duration;
      }
      await updateSession(session.id, patch);
      notify("Catatan diperbarui ✓");
      onClose();
    } catch (e) {
      notify("Gagal: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Edit catatan sesi"
      className={`fixed inset-0 bg-[var(--scrim)]/40 ${Z.modal} flex items-end justify-center`}
      onClick={onClose}
    >
      <div
        className="bg-[var(--surface-strong)] w-full max-w-md rounded-t-2xl pb-8 max-h-[80vh] overflow-y-auto overflow-x-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div>
            <h3 className="font-bold text-base">Edit Catatan Sesi</h3>
            <p className="text-xs text-[var(--ink-muted)] mt-0.5">{session.date} · {session.durationHours}j</p>
          </div>
          <button onClick={onClose} aria-label="Tutup" className="text-[var(--ink-muted)] text-xl">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* ── Durasi & biaya ── */}
          <div className="bg-[var(--surface)] rounded-xl p-4 space-y-3">
            <div>
              <label className="label">⏱️ Durasi</label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {DURATIONS.filter((d) => d <= 3).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => { setDuration(d); if (costOverride === null) setCost(d * session.rateSnapshot); }}
                    className={`py-1.5 px-3 rounded-lg text-xs font-semibold border transition-colors ${
                      duration === d
                        ? "bg-[var(--brand-solid)] text-[var(--on-strong)] border-[var(--border-brand)]"
                        : "bg-[var(--surface-strong)] text-[var(--ink-muted)] border-[var(--border)]"
                    }`}
                  >
                    {d}j
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">💰 Biaya</label>
              {moneyVisible && isEditingCost ? (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[var(--ink-muted)] text-sm font-medium">Rp</span>
                  <input
                    type="number"
                    className="input flex-1"
                    aria-label="Nominal biaya manual"
                    value={costOverride ?? cost}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v) && v >= 0) setCostOverride(v);
                      else if (e.target.value === "") setCostOverride(0);
                    }}
                    placeholder="300000"
                    min={0}
                    step={500}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setIsEditingCost(false)}
                    className="text-xs text-[var(--ink-muted)] hover:text-[var(--ink-muted)] px-2 py-1"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-1">
                  <MaskedMoney amount={costOverride ?? cost} className="text-base font-bold text-[var(--ink-strong)]" />
                  {moneyVisible && costOverride !== null && (
                    <span className="text-xs bg-[var(--bg-warn)] text-[var(--ink-warn)] px-1.5 py-0.5 rounded-full font-medium">
                      Manual
                    </span>
                  )}
                  {moneyVisible && costOverride !== null && (
                    <button
                      type="button"
                      onClick={() => setCostOverride(null)}
                      className="text-xs text-[var(--ink-danger)] hover:text-[var(--ink-danger)] ml-1"
                      title="Kembalikan ke hitungan otomatis"
                    >
                      ↺ Reset
                    </button>
                  )}
                  {moneyVisible && (
                    <button
                      type="button"
                      onClick={() => { setIsEditingCost(true); if (costOverride === null) setCostOverride(cost); }}
                      className="text-xs text-[var(--ink-brand)] hover:text-[var(--ink-brand)] ml-auto"
                      title="Edit biaya manual"
                    >
                      <PencilIcon size={13} className="mr-1 inline align-[-2px]" /> Edit
                    </button>
                  )}
                </div>
              )}
              {moneyVisible && costOverride === null && (
                <p className="text-xs text-[var(--ink-muted)] mt-0.5">
                  <MaskedMoney amount={session.rateSnapshot} />/jam × {duration}j
                </p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="sd-catatan-singkat" className="label">Catatan Singkat</label>
            <textarea id="sd-catatan-singkat" className="input" rows={3} value={shortNote}
              onChange={(e) => setShortNote(e.target.value)}
              placeholder="Apa yang dibahas hari ini?" />
          </div>
          <div>
            <label htmlFor="sd-topik" className="label">Topik Spesifik</label>
            <input id="sd-topik" className="input" value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Mis. Quadratic Functions, Essay Structure..." />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="sd-prediksi" className="label">📈 Prediksi Nilai</label>
              <input id="sd-prediksi" className="input" maxLength={10} value={predictedGrade}
                onChange={(e) => setPredictedGrade(e.target.value)}
                placeholder="mis. 6, 7, A" />
            </div>
            <div>
              <label htmlFor="sd-aktual" className="label">✅ Nilai Akhir</label>
              <input id="sd-aktual" className="input" maxLength={10} value={actualGrade}
                onChange={(e) => { setActualGrade(e.target.value); setGradeError(""); }}
                placeholder="mis. 5, B" />
            </div>
          </div>

          {isGradeLower(actualGrade, predictedGrade) && (
            <div>
              <label htmlFor="sd-refleksi" className="label">💭 Refleksi Nilai <span className="text-[var(--ink-danger)]">*</span></label>
              <textarea id="sd-refleksi" className="input text-sm" rows={2} value={gradeReflection}
                onChange={(e) => { setGradeReflection(e.target.value); setGradeError(""); }}
                placeholder="Kenapa nilai akhir lebih rendah dari prediksi? (mis. soal ujian lebih sulit, materi belum dikuasai, kondisi murid...)" />
              <p className="text-xs text-[var(--ink-attention)] mt-1">Prediksi ({predictedGrade}) lebih tinggi dari nilai akhir ({actualGrade}) — refleksi wajib diisi.</p>
              {gradeError && <p className="text-xs text-[var(--ink-danger)] mt-1">{gradeError}</p>}
            </div>
          )}

          <div>
            <label htmlFor="sd-followup" className="label">Perlu Diulang / Follow-up</label>
            <input id="sd-followup" className="input" value={needsWork}
              onChange={(e) => setNeedsWork(e.target.value)}
              placeholder="Hal yang perlu dikerjakan di sesi berikutnya..." />
          </div>

          {/* ── Foto sesi ── */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label !mb-0">📸 Foto Sesi</label>
              {photoUrl && (
                <button type="button" onClick={() => { setPhoto(undefined); setPhotoError(""); }}
                  className="text-xs text-[var(--ink-danger)] hover:text-[var(--ink-danger)]">Hapus</button>
              )}
            </div>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment"
              onChange={handlePhoto} className="hidden" aria-label="Ambil foto sesi" />
            <input ref={galleryRef} type="file" accept="image/*"
              onChange={handlePhoto} className="hidden" aria-label="Pilih foto sesi dari galeri" />
            {photoUrl ? (
              <div className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                <img src={photoUrl} alt="Foto sesi" className="h-44 w-full object-cover" />
                <div className="absolute bottom-2 right-2 flex gap-1.5">
                  <button type="button" onClick={() => cameraRef.current?.click()}
                    className="rounded-full bg-[var(--scrim)]/65 px-2.5 py-1 text-xs text-[var(--on-strong)]"><CameraIcon size={13} className="mr-1 inline align-[-2px]" /> Kamera</button>
                  <button type="button" onClick={() => galleryRef.current?.click()}
                    className="rounded-full bg-[var(--scrim)]/65 px-2.5 py-1 text-xs text-[var(--on-strong)]"><ImageIcon size={13} className="mr-1 inline align-[-2px]" /> Galeri</button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => cameraRef.current?.click()}
                  className="rounded-xl border-2 border-dashed border-[var(--border)] py-5 text-sm text-[var(--ink-muted)] transition-colors hover:border-[var(--brand-tint-strong)] hover:text-[var(--ink-brand)]">
                  <CameraIcon size={13} className="mr-1 inline align-[-2px]" /> Ambil Foto
                </button>
                <button type="button" onClick={() => galleryRef.current?.click()}
                  className="rounded-xl border-2 border-dashed border-[var(--border)] py-5 text-sm text-[var(--ink-muted)] transition-colors hover:border-[var(--border-success)] hover:text-[var(--ink-success)]">
                  <ImageIcon size={13} className="mr-1 inline align-[-2px]" /> Pilih Galeri
                </button>
              </div>
            )}
            {photoError && <p className="mt-1 text-xs text-[var(--ink-danger)]">{photoError}</p>}
            <p className="mt-1.5 text-xs text-[var(--ink-muted)]">Foto akan dikompres dan diberi tanggal sesi.</p>
          </div>

          {/* ── Tanda tangan murid ── */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label !mb-0">✍️ Tanda Tangan Murid</label>
              {sigUrl && (
                <button type="button" onClick={() => { setSignature(undefined); setShowSigPad(false); }}
                  className="text-xs text-[var(--ink-danger)] hover:text-[var(--ink-danger)]">Hapus</button>
              )}
            </div>
            {showSigPad ? (
              <div className="space-y-2">
                <SignaturePad
                  onSave={(blob) => { setSignature(blob); setShowSigPad(false); }}
                  onClear={() => setSignature(undefined)}
                />
                <button type="button" onClick={() => setShowSigPad(false)}
                  className="text-xs text-[var(--ink-muted)] w-full text-center">Tutup</button>
              </div>
            ) : sigUrl ? (
              <div className="border border-[var(--border)] rounded-xl p-2 bg-[var(--surface)] flex items-center gap-3">
                <img src={sigUrl} alt="TTD" className="h-12 max-w-[120px] object-contain" />
                <button type="button" onClick={() => setShowSigPad(true)}
                  className="text-xs text-[var(--ink-brand)] hover:underline">Ganti</button>
              </div>
            ) : (
              <button type="button" onClick={() => setShowSigPad(true)}
                className="w-full py-2.5 border-2 border-dashed border-[var(--border)] rounded-xl text-sm text-[var(--ink-muted)] hover:border-[var(--brand-tint-strong)] hover:text-[var(--ink-brand)] transition-colors">
                + Minta tanda tangan murid
              </button>
            )}
          </div>

          <button onClick={handleSave} disabled={saving}
            className="w-full py-3 rounded-xl bg-[var(--brand-solid)] text-[var(--on-strong)] font-bold text-sm hover:bg-[var(--brand-solid)] disabled:opacity-50 transition-colors">
            {saving ? "Menyimpan..." : "Simpan Catatan"}
          </button>
          <button type="button" onClick={onKelolaSesi}
            className="w-full py-2.5 rounded-xl border border-[var(--border-danger)] text-[var(--ink-danger)] text-sm font-medium hover:bg-[var(--bg-danger)] transition-colors">
            Kelola / Hapus Sesi
          </button>
          <p className="text-center text-xs text-[var(--ink-muted)]">Penghapusan sesi memerlukan PIN Keuangan.</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Penanda arsip: modul ini dulu berada di dalam `StudentDetail.tsx` sebagai blok
 * JSX + 17 `useState`. State-nya pindah seluruhnya ke sini karena tidak satu pun
 * dipakai bagian lain layar induk.
 */
