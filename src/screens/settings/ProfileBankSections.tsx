import { Section } from "./Section";
import { BankIcon, CameraIcon, UserIcon } from "../../components/icons";
import { bankSectionBadge, profileSectionBadge } from "../../lib/settingsStatus";
import type { Settings } from "../../db/types";

/**
 * Bagian "Profil Tutor" dan "Rekening Bank" di layar Pengaturan.
 *
 * Keduanya diekstrak dari `screens/Settings.tsx` (G3-09) **tanpa mengubah
 * perilaku**, dan keduanya mendapat badge keadaan (G3-09 butir 11) yang
 * perhitungannya sudah ada di `lib/settingsStatus.ts`:
 *
 * - Profil: "Profil lengkap" atau "Profil N dari 4". Nama dan nomor WA yang
 *   wajib; email dan alamat opsional tetapi tetap dihitung supaya tutor tahu ada
 *   yang bisa dilengkapi — dengan kata "opsional" di keterangannya, bukan sebagai
 *   kesalahan.
 * - Rekening: jumlah rekening terisi, dan dorongan mengisi saat masih kosong —
 *   rekening yang kosong berarti lembar absensi tidak bisa dipakai transfer.
 */
export interface ProfileBankSectionsProps {
  form: Settings;
  /** Logo sebagai object URL; dibuat induk karena induk juga yang melepasnya. */
  logoUrl?: string;
  /** Perubahan kolom profil tutor. */
  updateProfile: (field: string, value: string) => void;
  /** Perubahan satu kolom `Settings` (dipakai untuk menghapus logo). */
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  /** Perubahan kolom rekening bank. */
  updateBank: (field: string, value: string) => void;
  /** Input berkas logo tersembunyi; induk yang memegang ref-nya. */
  fileRef: React.RefObject<HTMLInputElement | null>;
  /** Pemrosesan berkas logo yang dipilih. */
  handleLogo: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function ProfileBankSections({
  form, logoUrl, updateProfile, update, updateBank, fileRef, handleLogo,
}: ProfileBankSectionsProps) {
  const profil = profileSectionBadge(form.tutorProfile);
  const rekening = bankSectionBadge(form.bankAccounts);

  return (
    <>
      <Section id="profil" title="Profil Tutor" icon={<UserIcon size={18} />} badge={profil}>
        <div className="pt-3 space-y-3">
          <div>
            <label htmlFor="set-nama-tutor" className="label">Nama Tutor</label>
            <input id="set-nama-tutor" className="input" placeholder="mis. Ko Lui" maxLength={60}
              value={form.tutorProfile.name}
              onChange={(e) => updateProfile("name", e.target.value)} />
          </div>
          <div>
            <label htmlFor="set-no-wa" className="label">No. WhatsApp</label>
            <input id="set-no-wa" className="input" placeholder="08xxxxxxxxxx" maxLength={20} type="tel"
              value={form.tutorProfile.phone}
              onChange={(e) => updateProfile("phone", e.target.value)} />
          </div>
          <div>
            <label htmlFor="set-email" className="label">Email <span className="text-[var(--ink-muted)] font-normal">(opsional)</span></label>
            <input id="set-email" className="input" placeholder="tutor@email.com" maxLength={100} type="email"
              value={form.tutorProfile.email ?? ""}
              onChange={(e) => updateProfile("email", e.target.value)} />
          </div>
          <div>
            <label htmlFor="set-alamat" className="label">Alamat <span className="text-[var(--ink-muted)] font-normal">(opsional)</span></label>
            <input id="set-alamat" className="input" placeholder="Jl. Contoh No.1, Jakarta" maxLength={150}
              value={form.tutorProfile.address ?? ""}
              onChange={(e) => updateProfile("address", e.target.value)} />
          </div>
          <div>
            <label htmlFor="set-logo" className="label">Logo <span className="text-[var(--ink-muted)] font-normal">(tampil di laporan)</span></label>
            {logoUrl && (
              <div className="flex items-center gap-3 mb-2">
                <img src={logoUrl} className="h-14 w-14 object-contain rounded-lg border border-[var(--border)] bg-[var(--surface)]" alt="Logo tutor" />
                <button type="button" onClick={() => update("logo", undefined)}
                  className="inline-flex min-h-[44px] items-center text-xs text-[var(--ink-danger)] font-medium px-3 py-1 bg-[var(--bg-danger)] rounded-lg">
                  Hapus Logo
                </button>
              </div>
            )}
            <input id="set-logo" ref={fileRef} type="file" accept="image/*" onChange={handleLogo} className="hidden" />
            <button type="button" onClick={() => fileRef.current?.click()}
              className="flex min-h-[44px] items-center gap-2 text-sm text-[var(--ink-muted)] bg-[var(--bg-subtle)] px-3 py-2 rounded-xl font-medium transition-colors">
              <CameraIcon size={13} className="mr-1 inline align-[-2px]" /> {logoUrl ? "Ganti Logo" : "Upload Logo"}
            </button>
          </div>
        </div>
      </Section>

      <Section id="rekening" title="Rekening Bank" icon={<BankIcon size={18} />} badge={rekening}>
        <div className="pt-3 space-y-3">
          <p className="text-xs text-[var(--ink-muted)]">Ditampilkan di lembar absensi untuk memudahkan transfer</p>
          <div>
            <label htmlFor="set-nama-rekening" className="label">Nama Pemilik Rekening</label>
            <input id="set-nama-rekening" className="input" maxLength={60} placeholder="Nama AN rekening"
              value={form.bankAccounts?.accountName ?? ""}
              onChange={(e) => updateBank("accountName", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {([
              ["bca", "BCA", "No rekening"],
              ["mandiri", "Mandiri", "No rekening"],
              ["bri", "BRI", "No rekening"],
              ["cimb", "CIMB Niaga", "No rekening"],
              ["bsi", "BSI", "No rekening"],
              ["ewallet", "GoPay / OVO / DANA", "No HP ewallet"],
            ] as const).map(([field, label, placeholder]) => (
              <div key={field}>
                <label htmlFor={`set-rek-${field}`} className="label">{label}</label>
                <input id={`set-rek-${field}`} className="input" maxLength={20} placeholder={placeholder}
                  value={form.bankAccounts?.[field] ?? ""}
                  onChange={(e) => updateBank(field, e.target.value)} />
              </div>
            ))}
          </div>
        </div>
      </Section>
    </>
  );
}
