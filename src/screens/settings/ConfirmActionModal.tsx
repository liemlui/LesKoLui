import { useState } from "react";
import Modal from "../../components/Modal";
import { confirmButtonEnabled } from "../../lib/recoveryPresentation";

/**
 * Dialog konfirmasi internal untuk aksi yang menimpa data — G3-09 butir 7.
 *
 * Menggantikan `confirm()` bawaan peramban di jalur pemulihan. Dua bentuk:
 *  - **tanpa kata**: ringkasan sasaran + tombol Lanjutkan/Batal;
 *  - **dengan kata**: tutor harus mengetik kalimat konfirmasi dulu, dan tombolnya
 *    baru aktif setelah kalimatnya tepat.
 *
 * `busy` hanya menonaktifkan tombol, bukan menutup dialog: menutup dialog di
 * tengah proses akan menyembunyikan bahwa ada pekerjaan yang masih berjalan.
 */
export interface ConfirmDialogState {
  judul: string;
  /** Kalimat penjelas. Baris `• ` ditampilkan sebagai daftar. */
  pesan: string[];
  /** Kalimat yang harus diketik, mis. "HAPUS DATA". Kosong = tidak perlu mengetik. */
  kata?: string;
  labelLanjut: string;
  /** Nada tombol lanjut; `danger` untuk yang menghapus/menimpa. */
  danger?: boolean;
}

export default function ConfirmActionModal({
  open, state, busy = false, onCancel, onConfirm,
}: {
  open: boolean;
  state: ConfirmDialogState | null;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [kata, setKata] = useState("");
  if (!open || !state) return null;

  const butuhKata = Boolean(state.kata);
  const bolehLanjut = !butuhKata || confirmButtonEnabled(kata, state.kata ?? "");

  return (
    <Modal onClose={onCancel} ariaLabel={state.judul}>
      <h3 className="font-bold text-lg text-[var(--ink-strong)]">{state.judul}</h3>
      <div className="space-y-2">
        {state.pesan.map((p) =>
          p.startsWith("• ") ? (
            <p key={p} className="pl-3 text-sm text-[var(--ink-strong)]">{p}</p>
          ) : (
            <p key={p} className="text-sm text-[var(--ink-muted)]">{p}</p>
          ),
        )}
      </div>
      {butuhKata && (
        <div>
          <label htmlFor="confirm-action-word" className="label">
            Ketik <b className="font-mono">{state.kata}</b> untuk mengaktifkan tombol
          </label>
          <input
            id="confirm-action-word"
            className="input font-mono"
            type="text"
            autoFocus
            autoComplete="off"
            placeholder={state.kata}
            value={kata}
            onChange={(e) => setKata(e.target.value)}
          />
        </div>
      )}
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} disabled={busy}
          className="flex-1 min-h-[44px] py-3 rounded-xl bg-[var(--bg-subtle)] text-[var(--ink-muted)] font-semibold text-sm disabled:opacity-50">
          Batal
        </button>
        <button type="button" onClick={onConfirm} disabled={busy || !bolehLanjut}
          className={`flex-1 min-h-[44px] py-3 rounded-xl text-[var(--on-strong)] font-bold text-sm disabled:opacity-40 ${
            state.danger ? "bg-[var(--bg-danger-strong)]" : "bg-[var(--brand-solid)]"
          }`}>
          {busy ? "Memproses..." : state.labelLanjut}
        </button>
      </div>
    </Modal>
  );
}
