import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { countSessionPhotos, pruneSessionPhotosBefore, shrinkSessionPhotosBefore } from "../../db/repos";
import { shrinkPhotoBlob } from "../../lib/foto";
import ConfirmSheet from "../../components/ConfirmSheet";

/**
 * Perawatan foto sesi lama (M-5): hemat penyimpanan tanpa menyentuh data sesi.
 *
 * Dua pilihan: PERKECIL (foto tetap ada, resolusinya turun) atau HAPUS.
 * Perkecilan juga berjalan otomatis 1×/30 hari untuk foto >12 bulan.
 *
 * Diekstrak dari `screens/Settings.tsx` (G3-09) tanpa perubahan perilaku. Yang
 * perlu diketahui sesi berikutnya: **tidak ada** konfirmasi untuk PERKECIL
 * (tidak menghapus apa pun), sedangkan HAPUS permanen selalu lewat `ConfirmSheet`.
 */
export default function PhotoMaintenance({ onToast }: { onToast: (m: string) => void }) {
  const cutoff = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);
  const oldCount = useLiveQuery(() => countSessionPhotos(cutoff), [cutoff]);
  const [busy, setBusy] = useState(false);
  /** S-10: HAPUS itu permanen → konfirmasi. PERKECIL tidak → langsung jalan. */
  const [confirmPrune, setConfirmPrune] = useState(false);

  const prune = async () => {
    setConfirmPrune(false);
    setBusy(true);
    try {
      const n = await pruneSessionPhotosBefore(cutoff);
      onToast(`${n} foto lama dihapus ✓`);
    } catch (e) {
      onToast("Gagal hapus foto: " + ((e as Error).message || "coba lagi"));
    } finally { setBusy(false); }
  };

  const shrink = async () => {
    setBusy(true);
    try {
      const r = await shrinkSessionPhotosBefore(cutoff, shrinkPhotoBlob);
      onToast(r.shrunk > 0
        ? `${r.shrunk} foto diperkecil · hemat ±${Math.round(r.savedBytes / 1024)} KB ✓`
        : "Tidak ada foto yang bisa diperkecil lagi ✓");
    } catch (e) {
      onToast("Gagal perkecil foto: " + ((e as Error).message || "coba lagi"));
    } finally { setBusy(false); }
  };

  if (!oldCount) return null;
  return (
    <div className="bg-[var(--bg-warn)] rounded-xl p-3 space-y-2">
      <p className="text-xs font-semibold text-[var(--ink-warn)]">Foto sesi lama</p>
      <p className="text-xs text-[var(--ink-warn)]">
        {oldCount} foto dari sesi &gt; 6 bulan lalu. Foto &gt; 12 bulan diperkecil
        otomatis (tetap ada, resolusinya turun) agar backup tidak membengkak —
        catatan &amp; tanda tangan sesi tidak pernah diubah.
      </p>
      <button disabled={busy}
        onClick={() => setConfirmPrune(true)}
        className="w-full py-2 rounded-xl border border-[var(--border-danger)] bg-[var(--surface-strong)] text-[var(--ink-danger)] text-sm font-semibold hover:bg-[var(--bg-danger)] disabled:opacity-60 transition-colors">
        {busy ? "Menghapus..." : `Hapus ${oldCount} foto lama`}
      </button>
      <button disabled={busy}
        onClick={() => void shrink()}
        className="w-full py-2 rounded-xl bg-[var(--bg-warn-strong)] text-[var(--on-strong)] text-sm font-medium disabled:opacity-60">
        {busy ? "Memproses..." : "Perkecil foto (tanpa menghapus)"}
      </button>

      <ConfirmSheet
        open={confirmPrune}
        title={`Hapus ${oldCount} foto lama?`}
        message={`Foto sesi lebih lama dari 6 bulan akan DIHAPUS PERMANEN. Tindakan ini tidak bisa dibatalkan dan foto yang sudah dihapus TIDAK ada di file backup mana pun. Catatan & tanda tangan sesi tetap utuh.\n\nKalau hanya ingin menghemat ruang, pakai "Perkecil foto (tanpa menghapus)".`}
        confirmLabel="Hapus permanen"
        danger
        onCancel={() => setConfirmPrune(false)}
        onConfirm={() => void prune()}
      />
    </div>
  );
}
