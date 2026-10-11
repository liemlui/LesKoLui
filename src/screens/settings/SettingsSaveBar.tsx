import { saveBarState } from "../../lib/settingsSaveBar";

/**
 * Bilah simpan yang menempel di bawah layar Pengaturan — G3-09 butir 1.
 *
 * Sebelum G3-09 tombol Simpan adalah tombol biasa di ujung bawah halaman ~1.400
 * baris: tutor harus menggulir ke dasar untuk menyimpan, dan setelah tersimpan
 * tidak ada satu pun tanda **kapan** penyimpanan itu terjadi. Bilah ini menempel
 * di bawah, jadi tombolnya selalu terjangkau, dan statusnya menyebut jamnya.
 *
 * Dua hal yang dijaga dari sisi aksesibilitas (G3-09 butir 9):
 * - statusnya berperan `status` (`aria-live="polite"`), sehingga pembaca layar
 *   mengumumkan "Menyimpan..." dan "Tersimpan 14:03" tanpa memotong ucapan lain;
 * - **alasan tombol nonaktif ditulis sebagai teks**, bukan hanya warna — di HP
 *   tidak ada kursor untuk membaca `title`.
 */
export interface SettingsSaveBarProps {
  dirty: boolean;
  saving: boolean;
  savedAt?: string | null;
  errorMessage?: string | null;
  onSave: () => void;
}

export default function SettingsSaveBar({
  dirty, saving, savedAt, errorMessage, onSave,
}: SettingsSaveBarProps) {
  const state = saveBarState({ dirty, saving, savedAt, errorMessage });

  const dasar = "w-full min-h-[44px] py-3.5 rounded-xl font-bold text-base transition-colors shadow-sm";
  const gaya =
    state.status === "gagal"
      ? "bg-[var(--bg-danger-strong)] text-[var(--on-strong)]"
      : state.enabled
        ? "bg-[var(--brand-solid)] text-[var(--on-strong)]"
        : "bg-[var(--bg-subtle)] text-[var(--ink-strong)]";

  return (
    /**
     * `sticky bottom-0` + latar pekat: bilahnya menempel di bawah isi, dan
     * `pb-[env(safe-area-inset-bottom)]` menjaga tombolnya tidak tertutup
     * bilah gestur di iPhone.
     */
    <div
      className="sticky bottom-0 -mx-4 mt-4 border-t border-[var(--border)] bg-[var(--surface-strong)]/95 px-4 pt-3 backdrop-blur"
      style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      data-bagian="bilah-simpan"
    >
      <div
        role="status"
        aria-live={state.live ? "polite" : "off"}
        className={`mb-2 text-xs ${
          state.status === "gagal" ? "font-medium text-[var(--ink-danger)]"
            : state.status === "kotor" ? "text-[var(--ink-warn)]"
              : "text-[var(--ink-muted)]"
        }`}
      >
        {state.detail}
      </div>
      <button type="button" onClick={onSave} disabled={!state.enabled} className={`${dasar} ${gaya} disabled:opacity-60 disabled:cursor-not-allowed`}>
        {state.label}
      </button>
    </div>
  );
}
