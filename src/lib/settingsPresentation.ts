/**
 * Presentasi tombol simpan Pengaturan.
 *
 * Helper murni (tanpa React / IndexedDB) agar mudah dites — memisahkan logika
 * status tombol dari komponen besar `Settings.tsx`.
 *
 * Kontras teks pada state non-dirty memakai `text-slate-700` (≈ 4.6:1 di atas
 * `bg-gray-100`) supaya status "Tersimpan ✓" lolos WCAG AA 1.4.3; sebelumnya
 * `text-gray-500` hanya ≈ 3.0:1. Lihat audit visual V-02.
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
      dirty ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-gray-100 text-slate-700"
    } ${disabled ? "disabled:opacity-60 disabled:cursor-not-allowed" : ""}`,
    label: saving ? "Menyimpan..." : dirty ? "Simpan Pengaturan" : "Tersimpan ✓",
  };
}
