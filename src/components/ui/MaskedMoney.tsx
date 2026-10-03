import { useState } from "react";
import { createPortal } from "react-dom";
import { formatRupiah } from "../../lib/format";
import { MASKED_MONEY_TEXT } from "../../lib/moneyDisplay";
import { useMoneyVisible } from "../../hooks/useMoneyVisible";
import { LockIcon } from "../icons";
import MoneyUnlockSheet from "./MoneyUnlockSheet";

export interface MaskedMoneyProps {
  /** Nilai rupiah. undefined/null → render "—". */
  amount?: number | null;
  /** "inline" untuk di tengah kalimat, "block" untuk angka besar (StatTile). */
  variant?: "inline" | "block";
  /** Kelas tambahan dari pemanggil (ukuran/warna saja — bukan token). */
  className?: string;
  /** Sembunyikan tombol buka (mis. di dalam baris yang sudah punya aksi sendiri). */
  hideUnlock?: boolean;
  /** Ganti perilaku tombol buka dengan aksi milik pemanggil. */
  onUnlockRequest?: () => void;
}

/**
 * Satu-satunya cara menampilkan uang di layar (kontrak K3.1/K3.2, G2-04).
 *
 * - `visible` → `formatRupiah` dari `lib/format.ts` (tidak ada formatter kedua).
 * - terkunci → `Rp ••••••` + gembok. **Bukan** baris kosong, bukan angka parsial.
 * - `null`/`undefined` → `—`.
 *
 * Panel PIN-nya dirender lewat portal ke `document.body` supaya komponen ini aman
 * dipakai di dalam `<p>` dan `<td>` (kalau tidak, `<div>` panel akan ditutup dini
 * oleh parser HTML dan merusak tata letak).
 */
export default function MaskedMoney({
  amount, variant = "inline", className = "", hideUnlock = false, onUnlockRequest,
}: MaskedMoneyProps) {
  const money = useMoneyVisible();
  const [askUnlock, setAskUnlock] = useState(false);

  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return <span className={className}>—</span>;
  }

  if (money.visible) {
    return <span className={className}>{formatRupiah(amount)}</span>;
  }

  const openUnlock = () => {
    if (onUnlockRequest) onUnlockRequest();
    else setAskUnlock(true);
  };

  return (
    <>
      <span className={`inline-flex items-baseline gap-1 ${className}`}>
        <span className={variant === "block" ? "tracking-widest" : "tracking-wider"}>
          {MASKED_MONEY_TEXT}
        </span>
        {/* Tanpa PIN sama sekali tidak ada yang bisa dibuka di sini; layar yang
            memanggil bertanggung jawab menawarkan "Buat PIN Keuangan". */}
        {!hideUnlock && !money.needsSetup && (
          <button
            type="button"
            onClick={openUnlock}
            aria-label="Buka angka uang (butuh PIN Keuangan)"
            title="Angka uang terkunci — klik untuk membuka"
            className="-my-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[var(--ink-muted)] transition-colors hover:bg-[var(--surface-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-brand)]"
          >
            <LockIcon size={13} />
          </button>
        )}
      </span>
      {askUnlock && createPortal(
        <MoneyUnlockSheet open onClose={() => setAskUnlock(false)} />,
        document.body,
      )}
    </>
  );
}
