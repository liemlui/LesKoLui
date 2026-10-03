import { useState } from "react";
import Sheet from "./Sheet";
import { useMoneyVisible } from "../../hooks/useMoneyVisible";
import { LockIcon } from "../icons";

interface MoneyUnlockSheetProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Panel buka-kunci uang (G2-04). Satu tempat untuk memasukkan PIN Keuangan dan
 * membuka angka uang **di seluruh aplikasi** (kontrak K3.4).
 *
 * Dipakai oleh `<MaskedMoney/>` sendiri (lewat portal, supaya aman di dalam
 * `<p>`/`<td>`) dan oleh layar yang ingin tombol buka sendiri.
 */
export default function MoneyUnlockSheet({ open, onClose }: MoneyUnlockSheetProps) {
  const money = useMoneyVisible();
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const ok = await money.unlock(pin);
      if (ok) { setPin(""); onClose(); }
    } finally {
      setBusy(false);
    }
  };

  const close = () => { setPin(""); money.clearError(); onClose(); };

  return (
    <Sheet
      open={open}
      onClose={close}
      ariaLabel="Buka angka uang"
      title="Buka angka uang"
      description="Masukkan PIN Keuangan. Setelah dibuka, angka uang terbuka di seluruh aplikasi sampai kamu menguncinya lagi."
      footer={
        <div className="flex gap-[var(--space-2)]">
          <button
            type="button"
            onClick={close}
            disabled={busy}
            className="flex-1 rounded-[var(--radius-card)] bg-[var(--surface-soft)] py-[var(--space-3)] text-body font-semibold text-[var(--text-muted)]"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || pin.length !== 6}
            className="flex-1 rounded-[var(--radius-card)] bg-[var(--brand-solid)] py-[var(--space-3)] text-body font-semibold text-[var(--on-strong)] disabled:opacity-40"
          >
            {busy ? "Memeriksa..." : "Buka"}
          </button>
        </div>
      }
    >
      <label htmlFor="money-unlock-pin" className="label">
        <LockIcon size={14} className="mr-1 inline align-[-2px]" />PIN Keuangan
      </label>
      <input
        id="money-unlock-pin"
        type="password"
        inputMode="numeric"
        maxLength={6}
        autoComplete="off"
        value={pin}
        onChange={(e) => { setPin(e.target.value.replace(/\D/g, "").slice(0, 6)); money.clearError(); }}
        onKeyDown={(e) => { if (e.key === "Enter" && !busy && pin.length === 6) void submit(); }}
        className="input w-full text-center text-xl tracking-widest"
        placeholder="6 digit"
      />
      {money.error && (
        <p role="alert" className="mt-[var(--space-1)] text-caption text-[var(--ink-danger)]">{money.error}</p>
      )}
    </Sheet>
  );
}
