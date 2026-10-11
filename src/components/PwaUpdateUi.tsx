import { useCallback, useState } from "react";
import { APP_VERSION } from "../lib/version";
import { safeLocalStorage } from "../lib/pwaInstall";
import {
  applyFailureMessage,
  readUpdateDismissed,
  updateState,
  writeUpdateDismissed,
  type UpdateGate,
} from "../lib/pwaUpdate";

/**
 * Tampilan keadaan pembaruan aplikasi. Dipakai di **dua tempat** dengan satu
 * sumber kebenaran (`lib/pwaUpdate.ts`):
 *
 * - `variant="banner"` — tawaran mengambang yang muncul sendiri saat pembaruan siap.
 * - `variant="panel"`  — baris tetap di **Pengaturan → Aplikasi**, tempat tutor
 *   bisa memeriksa dan memasang pembaruan **kapan saja**, termasuk setelah
 *   menutup bannernya.
 *
 * Tiga cacat yang diperbaiki di sini (permintaan pemilik 2026-10-11):
 * 1. **Tombol "Perbarui" tidak berfungsi.** Dulu `applyUpdate` memanggil
 *    `updateServiceWorker(true)` dan menelan galatnya dengan `console.warn`,
 *    sehingga kegagalan tampak seperti tombol mati. Sekarang galatnya ditangkap
 *    dan **ditulis di layar** sebagai kalimat yang bisa dibaca.
 * 2. **Tidak ada tombol tutup.** Sekarang ada "Nanti saja"; penolakannya
 *    disimpan 7 hari, dan **tidak** mematikan kemampuan memasang dari Pengaturan.
 * 3. **Tidak ada cara memasang manual.** Sekarang ada "Periksa pembaruan" dan
 *    "Perbarui sekarang" di Pengaturan → Aplikasi.
 */
export interface PwaUpdateUiProps {
  /** Pembaruan menunggu dipasang (`needRefresh` dari `useRegisterSW`). */
  ready: boolean;
  /** Pemeriksaan sedang berjalan (dari pemanggil, yang memiliki `registration`). */
  checking: boolean;
  /** Panggil `registration.update()`; pemanggil yang memiliki objeknya. */
  onCheck: () => Promise<void> | void;
  /** Panggil `updateServiceWorker(true)`. */
  onApply: () => Promise<void> | void;
  variant: "banner" | "panel";
}

export default function PwaUpdateUi({ ready, checking, onCheck, onApply, variant }: PwaUpdateUiProps) {
  const [applying, setApplying] = useState(false);
  const [pesan, setPesan] = useState<{ jenis: "galat" | "info"; teks: string } | null>(null);
  const [dismissed, setDismissed] = useState(() => readUpdateDismissed(safeLocalStorage()));

  /**
   * Pemasangan pembaruan. `updateServiceWorker(true)` memuat ulang halaman, jadi
   * baris sesudahnya biasanya tidak tercapai — tetapi **tidak selalu**: kalau
   * service worker tidak menunggu, promise-nya menolak dan halaman tidak dimuat
   * ulang. Di situlah pesan galatnya wajib muncul.
   */
  const terapkan = useCallback(async () => {
    if (applying) return;
    setPesan(null);
    setApplying(true);
    try {
      await onApply();
      // Kalau baris ini tercapai, halaman TIDAK dimuat ulang: beri tahu apa adanya
      // daripada membiarkan tombol tampak tidak melakukan apa pun.
      setPesan({ jenis: "info", teks: "Pembaruan dipasang. Muat ulang halaman ini sekali untuk memakai versi barunya." });
    } catch (e) {
      setPesan({ jenis: "galat", teks: applyFailureMessage(e) });
    } finally {
      setApplying(false);
    }
  }, [applying, onApply]);

  const periksa = useCallback(async () => {
    setPesan(null);
    try {
      await onCheck();
    } catch (e) {
      setPesan({ jenis: "galat", teks: applyFailureMessage(e) });
    }
  }, [onCheck]);

  const tutup = useCallback(() => {
    writeUpdateDismissed(safeLocalStorage());
    setDismissed(true);
  }, []);

  const gate: UpdateGate = {
    ready,
    currentVersion: APP_VERSION,
    onLine: typeof navigator === "undefined" ? true : navigator.onLine,
    checking,
    applying,
    dismissed,
  };
  const state = updateState(gate);
  const tombol = (id: "apply" | "check" | "dismiss") => state.actions.find((a) => a.id === id);

  if (variant === "banner" && !state.showBanner) return null;

  const isBanner = variant === "banner";
  const wrapperClass = isBanner
    ? "fixed top-3 inset-x-3 z-50 mx-auto max-w-md rounded-xl bg-[var(--surface-inverse)] p-3 text-[var(--on-strong)] shadow-xl"
    : "rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 space-y-2";

  const applyTombol = tombol("apply");
  const checkTombol = tombol("check");
  const dismissTombol = tombol("dismiss");

  return (
    <div className={wrapperClass} data-bagian="pembaruan-aplikasi">
      <div className={isBanner ? "flex items-start justify-between gap-3" : "space-y-1"}>
        <div className="min-w-0">
          <p className={isBanner ? "text-sm font-semibold" : "text-sm font-semibold text-[var(--ink-strong)]"}>
            {state.headline}
          </p>
          <p className={isBanner ? "mt-0.5 text-xs text-[var(--brand-tint-strong)]" : "mt-0.5 text-xs text-[var(--ink-muted)]"}>
            {state.detail}
          </p>
        </div>
        {isBanner && dismissTombol && (
          <button
            type="button"
            onClick={tutup}
            disabled={!dismissTombol.enabled}
            aria-label="Tutup tawaran pembaruan"
            className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-[var(--brand-tint-strong)] hover:bg-[var(--surface-strong)]/20 disabled:opacity-40"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Pesan hasil: satu-satunya tempat kegagalan pemasangan terlihat. */}
      {pesan && (
        <p
          role="status"
          aria-live="polite"
          className={
            pesan.jenis === "galat"
              ? "mt-2 rounded-lg bg-[var(--bg-danger)] px-2.5 py-2 text-xs font-medium text-[var(--ink-danger)]"
              : "mt-2 rounded-lg bg-[var(--bg-success)] px-2.5 py-2 text-xs font-medium text-[var(--ink-success)]"
          }
        >
          {pesan.teks}
        </p>
      )}

      <div className={isBanner ? "mt-2.5 flex flex-wrap gap-2" : "mt-2 flex flex-wrap gap-2"}>
        {applyTombol && (
          <button
            type="button"
            onClick={() => void terapkan()}
            disabled={!applyTombol.enabled}
            title={applyTombol.reason}
            className="min-h-[44px] rounded-lg bg-[var(--surface-strong)] px-3 py-2 text-sm font-semibold text-[var(--ink-strong)] disabled:opacity-50"
          >
            {applyTombol.label}
          </button>
        )}
        {checkTombol && (
          <button
            type="button"
            onClick={() => void periksa()}
            disabled={!checkTombol.enabled}
            title={checkTombol.reason}
            className={
              isBanner
                ? "min-h-[44px] rounded-lg border border-[var(--surface-strong)]/40 px-3 py-2 text-sm font-medium text-[var(--on-strong)] disabled:opacity-50"
                : "min-h-[44px] rounded-lg bg-[var(--bg-subtle)] px-3 py-2 text-sm font-medium text-[var(--ink-strong)] disabled:opacity-50"
            }
          >
            {checkTombol.label}
          </button>
        )}
        {!isBanner && dismissTombol && dismissTombol.enabled && (
          <button
            type="button"
            onClick={tutup}
            className="min-h-[44px] rounded-lg px-3 py-2 text-sm font-medium text-[var(--ink-muted)] hover:bg-[var(--bg-subtle)]"
          >
            Sembunyikan tawaran
          </button>
        )}
      </div>

      {/* Alasan tombol mati ditulis, bukan hanya jadi atribut title: di HP tidak
          ada kursor yang bisa diarahkan untuk membacanya. */}
      {!isBanner && !ready && checkTombol?.reason && (
        <p className="text-xs text-[var(--ink-muted)]">{checkTombol.reason}</p>
      )}
    </div>
  );
}
