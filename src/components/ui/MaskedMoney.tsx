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
  /**
   * Nama besaran ini, mis. "Tarif les" atau "Total biaya sesi selesai".
   *
   * Tanpa ini, pembaca layar hanya mendengar teks yang terlihat. Saat terkunci
   * teksnya adalah `Rp ••••••`, sehingga pengguna pembaca layar kehilangan
   * keterangan angka itu apa (audit G3-06 butir 8: satu konsep, satu label).
   * Label yang diberikan dipakai untuk keadaan TERBUKA maupun TERKUNCI.
   */
  label?: string;
  /** Keterangan tambahan di belakang nama, mis. label skor bersama. */
  valueHint?: string;
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
  label, valueHint,
}: MaskedMoneyProps) {
  const money = useMoneyVisible();
  const [askUnlock, setAskUnlock] = useState(false);

  /** Nama yang bisa diakses: "Tarif les: Rp •••••• — angka terkunci". */
  const accessibleName = (visibleText: string) => {
    if (!label) return undefined;
    const hint = valueHint ? ` ${valueHint}` : "";
    return money.visible
      ? `${label}${hint}: ${visibleText}`
      : `${label}${hint}: ${visibleText} — angka terkunci`;
  };

  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return <span className={className} aria-label={label ? `${label}: belum ada angka` : undefined}>—</span>;
  }

  if (money.visible) {
    const text = formatRupiah(amount);
    return <span className={className} aria-label={accessibleName(text)}>{text}</span>;
  }

  const openUnlock = () => {
    if (onUnlockRequest) onUnlockRequest();
    else setAskUnlock(true);
  };

  return (
    <>
      <span
        className={`inline-flex items-baseline gap-1 ${className}`}
        aria-label={accessibleName(MASKED_MONEY_TEXT)}
      >
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
