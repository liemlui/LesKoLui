/**
 * Presentasi tombol simpan Pengaturan.
 *
 * Helper murni (tanpa React / IndexedDB) agar mudah dites — memisahkan logika
 * status tombol dari komponen besar `Settings.tsx`.
 *
 * Kontras teks pada state non-dirty memakai `--ink-strong` di atas `--bg-subtle`
 * (rasio terukur 14,55:1 — lihat `.design-audit/g2-02-contrast.mjs`) supaya status
 * "Tersimpan ✓" lolos WCAG AA 1.4.3. Sebelum sapu G2-02 kelas literalnya
 * `text-slate-700` di atas `bg-gray-100`; pembanding lama `text-gray-500` hanya
 * ≈3,0:1. Lihat audit visual V-02.
 */

export interface SaveButtonState {
  /** Tombol dinonaktifkan saat sedang menyimpan atau tak ada perubahan. */
  disabled: boolean;
  /** Kelas Tailwind lengkap untuk tombol. */
  className: string;
  /** Label status yang tampil ke pengguna. */
  label: string;
}

export function saveButtonState(dirty: boolean, saving: boolean): SaveButtonState {
  const disabled = saving || !dirty;
  return {
    disabled,
    className: `w-full py-3.5 rounded-xl font-bold text-base transition-colors shadow-sm ${
      dirty ? "bg-[var(--brand-solid)] hover:bg-[var(--brand-solid)] text-[var(--on-strong)]" : "bg-[var(--bg-subtle)] text-[var(--ink-strong)]"
    } ${disabled ? "disabled:opacity-60 disabled:cursor-not-allowed" : ""}`,
    label: saving ? "Menyimpan..." : dirty ? "Simpan Pengaturan" : "Tersimpan ✓",
  };
}

/**
 * Tampilan layar Pengaturan menurut keadaan pembacaan pengaturan (audit L-09).
 *
 * - `loading` → data belum datang: tampilkan rangka (skeleton), bukan teks polos
 *   "Memuat pengaturan..." yang membuat layar tampak kosong/rusak.
 * - `failed`  → pembacaan gagal ATAU melewati batas tunggu: tampilkan jalan keluar.
 * - `ready`   → form seperti biasa.
 *
 * Kegagalan diperiksa SEBELUM keadaan memuat: `getSettings()` yang menolak membuat
 * `settings` tetap `undefined`, jadi tanpa urutan ini layar menggantung selamanya.
 */
export function settingsLoadGate(input: {
  settingsLoaded: boolean;
  formReady: boolean;
  error: string | null;
  timedOut: boolean;
}): "failed" | "loading" | "ready" {
  if (input.error || input.timedOut) return "failed";
  if (!input.settingsLoaded || !input.formReady) return "loading";
  return "ready";
}

/**
 * Batas tunggu pembacaan pengaturan. `useLiveQuery` di layar itu tidak punya saluran
 * galat: kalau penyimpanan IndexedDB tidak pernah menjawab (mis. terkunci tab lain),
 * `settings` tetap `undefined` dan layar diam selamanya. Lewat batas ini tutor diberi
 * tombol "Coba lagi", bukan layar kosong tanpa ujung.
 */
export const SETTINGS_LOAD_TIMEOUT_MS = 8000;

/**
 * Keadaan baris "Penyimpanan Lokal" di Pengaturan (audit S-10/S-08 sekaligus L-09).
 *
 * Sebelumnya `StorageUsage` mengembalikan `null` saat `navigator.storage.estimate()`
 * gagal atau API-nya tidak ada — barisnya HILANG diam-diam, sehingga tutor mengira
 * aplikasi tidak punya informasi penyimpanan sama sekali. Sekarang keadaan itu punya
 * teksnya sendiri.
 */
export function storageUsageState(
  estimate: { usage?: number; quota?: number } | null,
): "unavailable" | "ready" {
  if (!estimate) return "unavailable";
  return estimate.usage != null && estimate.quota != null ? "ready" : "unavailable";
}
