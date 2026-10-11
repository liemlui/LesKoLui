import { useState } from "react";
import { hashPin, verifyPin } from "../../lib/crypto";
import { getPinLockoutDelay, recordPinFailure, resetPinLockout } from "../../lib/pinLockout";
import { Section } from "./Section";
import { KeyIcon } from "../../components/icons";
import { pinSectionBadge } from "../../lib/settingsStatus";
import type { Settings } from "../../db/types";

/**
 * Bagian "PIN Keuangan" di layar Pengaturan.
 *
 * Diekstrak dari `screens/Settings.tsx` (G3-09) **tanpa mengubah perilaku**:
 * alur view → verifyOld/forgotPin → edit, pesan galat, dan penjagaan
 * `pinRecoveryBusy` semuanya tetap sama.
 *
 * Satu penambahan dari G3-09 butir 9 (aksesibilitas): saat PIN salah dan
 * penguncian sedang berjalan, **hitungan mundurnya terlihat**. Sebelumnya
 * penguncian hanya disebut sekali pada saat percobaan berikutnya ditolak,
 * sehingga kolomnya tampak siap dipakai padahal masih terkunci.
 */

type PinMode = "view" | "verifyOld" | "forgotPin" | "edit";

export interface PinSectionProps {
  /** Nilai PIN tersimpan (hash); `undefined` = belum pernah dibuat. */
  financialPin?: string;
  securityQuestion?: string;
  securityAnswer?: string;
  /**
   * Menyimpan PIN baru. Diteruskan ke `handleSetPin` di induk supaya penulisan
   * patch, penyamaan snapshot (`savedFormRef`), dan `setDirty(false)` tetap
   * berjalan di satu tempat seperti sebelumnya.
   */
  onSave: (updated: Settings) => Promise<void>;
  /** Diisi induk supaya perubahan PIN tanpa simpan bisa ditahan (G3-09 butir 2). */
  sectionRef?: (el: HTMLDivElement | null) => void;
}

export default function PinSection({ financialPin, securityQuestion, securityAnswer, onSave, sectionRef }: PinSectionProps) {
  const [pinMode, setPinMode] = useState<PinMode>("view");
  const [oldPin, setOldPin] = useState("");
  const [forgotA, setForgotA] = useState("");
  const [secQ, setSecQ] = useState("");
  const [secA, setSecA] = useState("");
  const [newPin, setNewPin] = useState("");
  const [newPinConf, setNewPinConf] = useState("");
  const [pinError, setPinError] = useState("");
  const [busy, setBusy] = useState(false);
  const [verifyOldBusy, setVerifyOldBusy] = useState(false);
  const [verifyForgotBusy, setVerifyForgotBusy] = useState(false);
  /** Sisa detik penguncian; `0` = tidak terkunci. */
  const [lockLeft, setLockLeft] = useState(0);

  /** Perbarui hitungan mundur penguncian. Dipanggil pada tiap percobaan. */
  const refreshLock = (): number => {
    const delay = getPinLockoutDelay();
    const detik = delay > 0 ? Math.ceil(delay / 1000) : 0;
    setLockLeft(detik);
    return detik;
  };

  const handleVerifyOldPin = async () => {
    if (!financialPin || verifyOldBusy) return;
    if (refreshLock() > 0) { setPinError(`Terlalu banyak percobaan. Tunggu ${lockLeft} detik.`); return; }
    setVerifyOldBusy(true);
    try {
      const ok = await verifyPin(oldPin, financialPin);
      if (!ok) { recordPinFailure(); setPinError("PIN lama salah."); refreshLock(); return; }
      resetPinLockout();
      setLockLeft(0);
      setPinError(""); setOldPin("");
      setSecQ(securityQuestion || ""); setSecA("");
      setPinMode("edit");
    } finally {
      setVerifyOldBusy(false);
    }
  };

  const handleVerifyForgot = async () => {
    if (verifyForgotBusy) return;
    if (!securityAnswer) { setPinError("Pertanyaan keamanan belum disetel."); return; }
    if (refreshLock() > 0) { setPinError(`Terlalu banyak percobaan. Tunggu ${lockLeft} detik.`); return; }
    setVerifyForgotBusy(true);
    try {
      const ok = await verifyPin(forgotA.trim().toLowerCase(), securityAnswer);
      if (!ok) { recordPinFailure(); setPinError("Jawaban salah."); refreshLock(); return; }
      resetPinLockout();
      setLockLeft(0);
      setPinError(""); setForgotA("");
      setSecQ(securityQuestion || ""); setSecA("");
      setPinMode("edit");
    } finally {
      setVerifyForgotBusy(false);
    }
  };

  const handleSetPin = async () => {
    if (newPin.length < 6) { setPinError("PIN harus 6 digit."); return; }
    if (newPin !== newPinConf) { setPinError("PIN tidak cocok."); return; }
    if (!secQ.trim()) { setPinError("Pertanyaan keamanan wajib diisi."); return; }
    if (!securityAnswer && !secA.trim()) { setPinError("Jawaban wajib diisi untuk PIN baru."); return; }
    if (busy) return;
    setBusy(true);
    try {
      const hashed = await hashPin(newPin);
      let hashedAns = securityAnswer;
      if (secA.trim()) hashedAns = await hashPin(secA.trim().toLowerCase());
      await onSave({ financialPin: hashed, securityQuestion: secQ.trim(), securityAnswer: hashedAns } as Settings);
      setPinMode("view"); setNewPin(""); setNewPinConf(""); setPinError(""); setSecQ(""); setSecA("");
    } catch (e) {
      setPinError("PIN gagal disimpan: " + ((e as Error).message || "terjadi kesalahan."));
    } finally {
      setBusy(false);
    }
  };

  const pinRecoveryBusy = verifyOldBusy || verifyForgotBusy;

  /** Baris penguncian; `role="status"` supaya diumumkan pembaca layar (butir 9). */
  const lockRow = lockLeft > 0 ? (
    <p role="status" aria-live="polite" className="rounded-lg bg-[var(--bg-warn)] px-3 py-2 text-xs font-medium text-[var(--ink-warn)]">
      Terlalu banyak percobaan. Tunggu {lockLeft} detik sebelum mencoba lagi.
    </p>
  ) : null;

  return (
    <div ref={sectionRef}>
      <Section id="pin" title="PIN Keuangan" icon={<KeyIcon size={18} />} badge={pinSectionBadge(Boolean(financialPin))}>
        <div className="pt-3 space-y-3">
          <p className="text-xs text-[var(--ink-muted)]">Melindungi akses rekap keuangan & hapus sesi</p>
          {lockRow}

          {pinMode === "view" ? (
            <div className="flex gap-2">
              <button onClick={() => {
                if (financialPin) { setPinMode("verifyOld"); refreshLock(); }
                else { setSecQ(""); setSecA(""); setPinMode("edit"); }
              }}
                className="flex-1 min-h-[44px] text-sm font-medium text-[var(--ink-brand)] bg-[var(--brand-tint)] hover:bg-[var(--brand-tint-strong)] px-3 py-2.5 rounded-xl transition-colors">
                {financialPin ? "Ganti PIN" : "Buat PIN"}
              </button>
              {financialPin && securityQuestion && (
                <button onClick={() => { setPinMode("forgotPin"); setPinError(""); setOldPin(""); setForgotA(""); refreshLock(); }}
                  className="min-h-[44px] text-sm font-medium text-[var(--ink-muted)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle)] px-3 py-2.5 rounded-xl transition-colors whitespace-nowrap">
                  Lupa PIN?
                </button>
              )}
            </div>
          ) : pinMode === "verifyOld" ? (
            <div className="space-y-3">
              <div>
                <label htmlFor="set-pin-lama" className="label">Masukkan PIN Lama</label>
                <input id="set-pin-lama" className="input text-center text-xl tracking-widest font-mono" type="password"
                  inputMode="numeric" maxLength={6} placeholder="••••••" autoComplete="current-password"
                  value={oldPin} onChange={(e) => { setOldPin(e.target.value.replace(/\D/g, "").slice(0, 6)); setPinError(""); }} />
              </div>
              {pinError && <p className="text-[var(--ink-danger)] text-sm">{pinError}</p>}
              <div className="flex gap-2">
                <button onClick={handleVerifyOldPin} disabled={pinRecoveryBusy || oldPin.length !== 6}
                  className="flex-1 min-h-[44px] py-2.5 rounded-xl bg-[var(--brand-solid)] text-[var(--on-strong)] font-semibold text-sm disabled:opacity-40 hover:bg-[var(--brand-solid)] transition-colors">{pinRecoveryBusy ? "Memeriksa..." : "Lanjut"}</button>
                <button onClick={() => { setPinMode("view"); setOldPin(""); setPinError(""); }} disabled={pinRecoveryBusy}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[var(--bg-subtle)] text-[var(--ink-muted)] text-sm font-medium hover:bg-[var(--bg-subtle)] transition-colors">Batal</button>
              </div>
              {securityQuestion && (
                <button onClick={() => { setPinMode("forgotPin"); setPinError(""); setOldPin(""); }}
                  className="w-full min-h-[44px] text-center text-sm font-medium text-[var(--ink-brand)] pt-2 hover:underline">
                  Lupa PIN? Jawab Pertanyaan Keamanan
                </button>
              )}
            </div>
          ) : pinMode === "forgotPin" ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-[var(--ink-strong)] bg-[var(--surface)] p-3 rounded-lg border border-[var(--border)]">
                <span className="text-[var(--ink-muted)] block text-xs mb-1">Pertanyaan Keamanan:</span>
                {securityQuestion}
              </p>
              <div>
                <label htmlFor="set-jawaban-anda" className="label">Jawaban Anda</label>
                <input id="set-jawaban-anda" className="input" type="text" placeholder="Jawaban rahasia..." autoComplete="off"
                  value={forgotA} onChange={(e) => { setForgotA(e.target.value); setPinError(""); }} />
              </div>
              {pinError && <p className="text-[var(--ink-danger)] text-sm">{pinError}</p>}
              <div className="flex gap-2">
                <button onClick={handleVerifyForgot} disabled={pinRecoveryBusy || !forgotA.trim()}
                  className="flex-1 min-h-[44px] py-2.5 rounded-xl bg-[var(--brand-solid)] text-[var(--on-strong)] font-semibold text-sm disabled:opacity-40 hover:bg-[var(--brand-solid)] transition-colors">{pinRecoveryBusy ? "Memeriksa..." : "Verifikasi"}</button>
                <button onClick={() => { setPinMode("view"); setForgotA(""); setPinError(""); }} disabled={pinRecoveryBusy}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[var(--bg-subtle)] text-[var(--ink-muted)] text-sm font-medium hover:bg-[var(--bg-subtle)] transition-colors">Kembali</button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label htmlFor="set-pin-baru" className="label">PIN Baru (6 digit)</label>
                <input id="set-pin-baru" className="input text-center text-xl tracking-widest font-mono" type="password"
                  inputMode="numeric" maxLength={6} placeholder="••••••" autoComplete="new-password"
                  value={newPin} onChange={(e) => { setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6)); setPinError(""); }} />
              </div>
              <div>
                <label htmlFor="set-pin-konfirmasi" className="label">Konfirmasi PIN Baru</label>
                <input id="set-pin-konfirmasi" className={`input text-center text-xl tracking-widest font-mono ${pinError?.includes("cocok") ? "border-[var(--ink-danger)]" : ""}`}
                  type="password" inputMode="numeric" maxLength={6} placeholder="••••••" autoComplete="new-password"
                  value={newPinConf} onChange={(e) => { setNewPinConf(e.target.value.replace(/\D/g, "").slice(0, 6)); setPinError(""); }} />
              </div>
              <div className="pt-2 border-t border-[var(--border)]">
                <p className="text-xs text-[var(--ink-brand)] mb-2 font-medium">Lupa PIN Recovery (Wajib):</p>
                <label htmlFor="set-sec-q" className="label">Pertanyaan Keamanan</label>
                <input id="set-sec-q" className="input mb-2" type="text" maxLength={100} placeholder="Contoh: Nama hewan peliharaan?"
                  value={secQ} onChange={(e) => { setSecQ(e.target.value); setPinError(""); }} />
                <label htmlFor="set-sec-a" className="label">Jawaban Keamanan</label>
                <input id="set-sec-a" className="input" type="text" maxLength={100} placeholder={securityAnswer ? "(Biarkan kosong jika tak ganti)" : "Jawaban rahasia..."}
                  value={secA} onChange={(e) => { setSecA(e.target.value); setPinError(""); }} />
              </div>
              {pinError && <p className="text-[var(--ink-danger)] text-sm">{pinError}</p>}
              <div className="flex gap-2">
                <button onClick={handleSetPin} disabled={busy || newPin.length !== 6 || newPinConf.length !== 6}
                  className="flex-1 min-h-[44px] py-2.5 rounded-xl bg-[var(--brand-solid)] text-[var(--on-strong)] font-semibold text-sm disabled:opacity-40 hover:bg-[var(--brand-solid)] transition-colors">{busy ? "Menyimpan..." : "Simpan PIN"}</button>
                <button onClick={() => { setPinMode("view"); setNewPin(""); setNewPinConf(""); setSecQ(""); setSecA(""); setPinError(""); }}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[var(--bg-subtle)] text-[var(--ink-muted)] text-sm font-medium hover:bg-[var(--bg-subtle)] transition-colors">Batal</button>
              </div>
            </div>
          )}

          <p className="text-xs text-[var(--ink-muted)] pt-2 border-t border-[var(--border)]">
            Buka data keuangan dari tab <b>Uang</b> di menu bawah (akan diminta PIN ini).
          </p>
        </div>
      </Section>
    </div>
  );
}
