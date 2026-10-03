import { useEffect, useRef, useState } from "react";
import Modal from "./Modal";

interface Props {
  onClose: () => void;
}

/**
 * Menutup jendela PWA/tab tanpa memakai history.back(). Browser biasa bisa
 * menolak window.close(); pada kasus itu pengguna mendapat instruksi jelas.
 */
export default function ExitAppModal({ onClose }: Props) {
  const [blocked, setBlocked] = useState(false);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  const closeApp = () => {
    try {
      window.close();
    } catch {
      setBlocked(true);
      return;
    }
    timerRef.current = window.setTimeout(() => {
      if (!window.closed) setBlocked(true);
    }, 350);
  };

  return (
    <Modal onClose={onClose} ariaLabel="Keluar aplikasi">
      <div className="space-y-3">
        <div className="w-11 h-11 rounded-2xl bg-[var(--bg-danger)] text-[var(--ink-danger)] flex items-center justify-center text-xl">⏻</div>
        <div>
          <h2 className="text-base font-bold text-[var(--ink-strong)]">Keluar dari Les Ko Lui?</h2>
          <p className="text-sm text-[var(--ink-muted)] mt-1">Perubahan sudah tersimpan di perangkat. Keluar tidak menghapus data.</p>
        </div>
        {blocked ? (
          <div className="rounded-xl bg-[var(--bg-warn)] border border-[var(--border-warn)] p-3 text-sm text-[var(--ink-warn)]">
            Browser ini tidak mengizinkan aplikasi menutup tab sendiri. Gunakan tombol × pada jendela atau tab untuk keluar.
          </div>
        ) : (
          <div className="flex gap-3 pt-1">
            <button className="btn btn-secondary flex-1" onClick={onClose}>Batal</button>
            <button className="btn flex-1 bg-[var(--bg-danger-strong)] text-[var(--on-strong)] hover:bg-[var(--bg-danger-strong)]" onClick={closeApp}>Keluar</button>
          </div>
        )}
        {blocked && <button className="btn btn-secondary w-full" onClick={onClose}>Mengerti</button>}
      </div>
    </Modal>
  );
}
