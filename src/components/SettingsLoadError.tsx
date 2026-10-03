interface Props {
  /** Sedang mencoba lagi (mengunci tombol). */
  busy?: boolean;
  /** Nama layar yang gagal, mis. "Keuangan" — muncul di kalimat penjelasan. */
  screen?: string;
  onRetry: () => void;
}

/**
 * Keadaan gagal baca pengaturan — SATU bentuk untuk semua layar (G2-10).
 *
 * Sebelumnya hanya layar Pengaturan yang punya jalan keluar (probe + watchdog
 * G1-07); lima layar lain bisa menggantung selamanya saat penyimpanan gagal.
 * Sekarang semuanya memakai komponen ini: `role="alert"` + tombol "Coba lagi".
 */
export default function SettingsLoadError({ busy = false, screen, onRetry }: Props) {
  return (
    <div className="p-4" role="alert">
      <div className="rounded-2xl border border-[var(--border-danger)] bg-[var(--bg-danger)] p-4 space-y-2">
        <p className="text-sm font-bold text-[var(--ink-danger)]">Pengaturan gagal dimuat</p>
        <p className="text-xs text-[var(--ink-danger)]">
          {screen
            ? `${screen} belum bisa dibuka karena data pengaturan tidak terbaca dari perangkat ini.`
            : "Data pengaturan belum bisa dibaca dari perangkat ini."}{" "}
          Muat ulang halaman bila tombol di bawah tetap tidak berhasil.
        </p>
        <button
          type="button"
          onClick={onRetry}
          disabled={busy}
          className="w-full min-h-[44px] py-3 rounded-xl bg-[var(--bg-danger-strong)] text-[var(--on-strong)] text-sm font-semibold hover:bg-[var(--bg-danger-strong)] disabled:opacity-60 transition-colors"
        >
          {busy ? "Mencoba lagi..." : "Coba lagi"}
        </button>
      </div>
    </div>
  );
}
