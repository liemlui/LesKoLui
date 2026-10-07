/**
 * Riwayat Pembayaran — transaksi murid ini, dikelompokkan per bulan.
 *
 * **Kenapa ada.** Keputusan pemilik 2026-10-07: yang sudah dibayar bukan tagihan
 * melainkan riwayat transaksi, dan riwayat itu tempatnya di halaman murid —
 * bukan menumpuk di layar Keuangan, yang seharusnya hanya memuat pekerjaan yang
 * menunggu tindakan.
 *
 * **Bulan mana yang jadi kunci pengelompokan.** Bulan **uang masuk** (`paidAt`),
 * bukan bulan anchor invoice (`month`). Kalau suatu saat tutor membuka mutasi
 * bank dan bertanya "bulan ini uang dari siapa saja", jawabannya harus ada di
 * satu kelompok — dan basis kas di seluruh aplikasi memang memakai `paidAt`
 * (lihat `RingkasanTab` dan `paymentRepo.getCashSummary`). Baris lunas lama yang
 * tidak punya `paidAt` jatuh ke `month`, jadi tidak ada transaksi yang hilang.
 *
 * Sengaja hanya membaca dan menampilkan: menandai lunas atau membatalkan tagihan
 * tetap dikerjakan dari layar Keuangan, supaya jalur yang menyentuh uang cuma
 * satu.
 */
import { useMemo } from "react";
import type { Payment } from "../../db/types";
import { dayLabel, monthLabel } from "../../lib/format";
import { kelompokkanPerBulan, totalPembayaran } from "../../lib/paymentHistory";
import MaskedMoney from "../../components/ui/MaskedMoney";

interface RiwayatPembayaranProps {
  /** Semua pembayaran murid ini, termasuk yang belum lunas. */
  payments: Payment[];
  /** Dinamai di judul supaya konteksnya jelas saat dibaca sendiri. */
  studentName: string;
  /** Buka layar Keuangan untuk menindaklanjuti yang belum lunas. */
  onKelolaPenagihan: () => void;
}

export default function RiwayatPembayaran({
  payments, studentName, onKelolaPenagihan,
}: RiwayatPembayaranProps) {
  const kelompok = useMemo(() => kelompokkanPerBulan(payments), [payments]);
  const { lunas: totalLunas, belumLunas: totalTunggakan, jumlahBelumLunas } = useMemo(
    () => totalPembayaran(payments),
    [payments],
  );
  // Baris tunggakan dipakai di blok peringatan di atas; urutannya menurut bulan
  // tagihan terlama lebih dulu — itu yang paling lama menunggu.
  const tunggakan = useMemo(
    () => payments.filter((p) => p.status !== "PAID").sort((a, b) => a.month.localeCompare(b.month)),
    [payments],
  );

  const belumAdaApaPun = payments.length === 0;

  return (
    <section
      aria-labelledby="riwayat-pembayaran-title"
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--ink-muted)]">Pembayaran</p>
          <h3 id="riwayat-pembayaran-title" className="text-sm font-bold text-[var(--ink-strong)]">
            Riwayat transaksi {studentName}
          </h3>
        </div>
      </div>

      {belumAdaApaPun ? (
        <p className="mt-2 rounded-lg bg-[var(--surface)] px-3 py-2 text-xs text-[var(--ink-muted)]">
          Belum ada tagihan maupun pembayaran untuk murid ini.
        </p>
      ) : (
        <>
          {/* Tunggakan ditaruh paling atas: itu satu-satunya bagian yang masih
              menuntut tindakan, dan ia satu-satunya yang masih boleh disebut
              "tagihan" menurut keputusan 2026-10-07. */}
          {jumlahBelumLunas > 0 ? (
            <div className="mt-3 rounded-xl border border-[var(--border-warn)] bg-[var(--bg-warn)]/60 p-3">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--ink-warn)]">
                  {jumlahBelumLunas === 1 ? "1 tagihan belum dibayar" : `${jumlahBelumLunas} tagihan belum dibayar`}
                </p>
                <MaskedMoney amount={totalTunggakan} className="text-sm font-bold text-[var(--ink-warn)]" />
              </div>
              <ul className="mt-1.5 space-y-1">
                {tunggakan.map((payment) => (
                  <li key={payment.id} className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="min-w-0 truncate text-[var(--ink-warn)]">
                      {monthLabel(payment.month)}
                      {payment.dueAt ? ` · jatuh tempo ${dayLabel(payment.dueAt)}` : ""}
                    </span>
                    <MaskedMoney amount={payment.totalCost} className="shrink-0 font-semibold text-[var(--ink-warn)]" hideUnlock />
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={onKelolaPenagihan}
                className="mt-2 inline-flex min-h-[44px] items-center rounded-[var(--radius-card)] bg-[var(--bg-warn-strong)] px-3 text-caption font-semibold text-[var(--on-strong)] transition-colors"
              >
                Kelola penagihan ▸
              </button>
            </div>
          ) : (
            <p className="mt-2 rounded-lg bg-[var(--bg-success)] px-3 py-2 text-xs text-[var(--ink-success)]">
              Tidak ada tunggakan. Semua tagihan murid ini sudah lunas.
            </p>
          )}

          {/* Riwayat yang sudah lunas. Dikelompokkan per bulan uang masuk, dan
              tiap bulan bisa dilipat supaya daftar panjang tidak menenggelamkan
              tunggakan di atasnya. */}
          {totalLunas > 0 && (
            <div className="mt-3">
              <div className="flex items-baseline justify-between gap-2 border-t border-[var(--border)] pt-2">
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--ink-muted)]">Sudah dibayar</p>
                <MaskedMoney amount={totalLunas} className="text-sm font-bold text-[var(--ink-success)]" />
              </div>

              <div className="mt-1.5 space-y-1">
                {kelompok.filter((k) => k.lunas.length > 0).map((k) => (
                  <details key={k.bulan} className="group rounded-lg bg-[var(--surface)]">
                    <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-brand)]">
                      <span className="flex items-center gap-2 text-xs font-semibold text-[var(--ink-strong)]">
                        <span aria-hidden="true" className="text-[var(--ink-muted)] transition-transform group-open:rotate-90">›</span>
                        {monthLabel(k.bulan)}
                      </span>
                      <span className="flex items-center gap-2 text-xs text-[var(--ink-muted)]">
                        <span>{k.lunas.length === 1 ? "1 transaksi" : `${k.lunas.length} transaksi`}</span>
                        <MaskedMoney amount={k.totalLunas} className="font-semibold text-[var(--ink-success)]" hideUnlock />
                      </span>
                    </summary>
                    <ul className="space-y-1 border-t border-[var(--border)] px-3 py-2">
                      {k.lunas.map((payment) => (
                        <li key={payment.id} className="flex items-baseline justify-between gap-2 text-xs">
                          <span className="min-w-0 truncate text-[var(--ink-muted)]">
                            {payment.paidAt ? dayLabel(payment.paidAt) : monthLabel(payment.month)}
                            {payment.method ? ` · ${payment.method}` : ""}
                          </span>
                          <MaskedMoney amount={payment.totalCost} className="shrink-0 font-semibold text-[var(--ink-strong)]" hideUnlock />
                        </li>
                      ))}
                    </ul>
                  </details>
                ))}
              </div>

              <p className="mt-2 text-xs leading-relaxed text-[var(--ink-muted)]">
                Dikelompokkan menurut bulan uang masuk. Transaksi lama yang belum mencatat tanggal bayar
                dikelompokkan menurut bulan tagihannya.
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
