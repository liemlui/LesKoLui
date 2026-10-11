/**
 * Panel status laporan: ringkasan angka periode, tren fokus, status draft/final,
 * keadaan penagihan, dan kesiapan laporan.
 *
 * Dipisah dari MonthlyReport.tsx pada refactor terbatas G3-05. Kesiapan di sini
 * SELALU dihitung dari seluruh sesi laporan (butir 7) — angka yang datang lewat
 * prop `readinessItems` sudah dihitung begitu oleh pemanggil, bukan dari sesi
 * yang sedang tersaring penyaring mapel.
 */

import { formatRupiahDisplay } from "../../lib/moneyDisplay";
import { dayLabel, monthLabel } from "../../lib/format";
import { reportDisplayStatus, reportStatus, type MonthlyReport, type Payment } from "../../db/types";
import type { ReportReadinessItem } from "./helpers";

interface ReportStatusPanelProps {
  /** Belum ada laporan untuk periode ini → blok status laporan disembunyikan. */
  report?: MonthlyReport;
  reportSessionCount: number;
  reportTargetCount: number;
  totalHours: number;
  avgEngagement?: number;
  engagementCounted: number;
  engagementTrend?: string;
  /** null = belum ada laporan, jadi kesiapan belum bisa dinilai. */
  readiness: number | null;
  readinessItems: readonly ReportReadinessItem[];
  readinessPercent: number;
  payment?: Payment;
  moneyVisible: boolean;
  totalsDrifted: boolean;
  /** Tagihan bulan-bulan sebelumnya yang belum lunas. */
  olderUnpaidCount: number;
  olderUnpaidTotal: number;
  onMarkShared: () => void;
  onUnlockReport: () => void;
  unlockBusy: boolean;
  onOpenBilling: () => void;
  invoiceBusy: boolean;
}

export default function ReportStatusPanel({
  report, reportSessionCount, reportTargetCount, totalHours,
  avgEngagement, engagementCounted, engagementTrend,
  readiness, readinessItems, readinessPercent, payment, moneyVisible, totalsDrifted,
  olderUnpaidCount, olderUnpaidTotal,
  onMarkShared, onUnlockReport, unlockBusy, onOpenBilling, invoiceBusy,
}: ReportStatusPanelProps) {
  const displayStatus = report ? reportDisplayStatus(report) : "draft";
  const ready = readiness === 4;

  return (
    <>
      {/* Ringkasan yang langsung menjawab kondisi belajar periode ini. */}
      <div className="grid grid-cols-4 gap-1.5">
        <div className="rounded-xl bg-[var(--brand-tint)] py-2 text-center">
          <p className="text-lg font-bold text-[var(--ink-brand)]">{reportSessionCount}</p>
          <p className="text-xs text-[var(--ink-brand)]">Sesi</p>
        </div>
        <div className="rounded-xl bg-[var(--accent-tint)] py-2 text-center">
          <p className="text-lg font-bold text-[var(--ink-accent)]">{totalHours}j</p>
          <p className="text-xs text-[var(--ink-accent)]">Jam</p>
        </div>
        <div className="rounded-xl bg-[var(--accent-tint)] py-2 text-center">
          <p className="text-lg font-bold text-[var(--ink-purple)]">{avgEngagement != null ? `${avgEngagement}/10` : "—"}</p>
          {/* Penyebut wajib (audit P3 #17): tanpa ini "7/10" terbaca sebagai
              penilaian atas SEMUA sesi. */}
          <p className="text-xs text-[var(--ink-purple)]">
            Fokus rata²{avgEngagement != null ? ` dari ${engagementCounted} sesi` : ""}
          </p>
        </div>
        <div className={`rounded-xl py-2 text-center ${ready ? "bg-[var(--bg-success)]" : "bg-[var(--bg-warn)]"}`}>
          <p className={`text-base font-bold leading-tight ${ready ? "text-[var(--ink-success)]" : "text-[var(--ink-warn)]"}`}>
            {readiness != null ? `${readiness}/4` : "—"}
          </p>
          <p className={`text-xs ${ready ? "text-[var(--ink-success)]" : "text-[var(--ink-warn)]"}`}>Siap kirim</p>
        </div>
      </div>

      {engagementTrend && (
        <p className={`rounded-lg px-2.5 py-2 text-xs ${
          engagementTrend === "Meningkat"
            ? "bg-[var(--bg-success)] text-[var(--ink-success)]"
            : engagementTrend === "Perlu perhatian"
              ? "bg-[var(--bg-warn)] text-[var(--ink-warn)]"
              : "bg-[var(--surface)] text-[var(--ink-muted)]"
        }`}>
          Fokus tren: <strong>{engagementTrend}</strong> dibandingkan awal periode.
        </p>
      )}

      {/* Status laporan dan penagihan sengaja dipisah. */}
      {report && reportStatus(report) === "draft" && (
        <div className="rounded-lg border border-[var(--brand-tint-strong)] bg-[var(--brand-tint)] px-3 py-2 text-sm text-[var(--ink-brand)]">
          <p className="font-semibold">
            Laporan: Draft{report.billingMode === "session_count" ? ` · ${reportSessionCount}/${reportTargetCount} sesi` : ""}
          </p>
          <p className="mt-0.5 text-xs text-[var(--ink-brand)]">Masih dapat diedit dan dibatalkan sebelum difinalkan.</p>
        </div>
      )}

      {report && reportStatus(report) === "confirmed" && (
        <div className="space-y-2">
          <div className={`rounded-lg border px-3 py-2 text-sm ${
            displayStatus === "shared"
              ? "border-[var(--border-accent)] bg-[var(--accent-tint)] text-[var(--ink-accent)]"
              : "border-[var(--border-success)] bg-[var(--bg-success)] text-[var(--ink-success)]"
          }`}>
            <p className="font-semibold">
              ✓ Laporan: {displayStatus === "shared" ? "Sudah dibagikan" : "Final"}
            </p>
            <p className="mt-0.5 text-xs opacity-80">
              {displayStatus === "shared"
                ? `Periode belajar dikunci dan laporan sudah ditandai dibagikan ${report.sharedAt || report.pdfGeneratedAt ? `pada ${dayLabel((report.sharedAt || report.pdfGeneratedAt)!.slice(0, 10))}` : ""}.`
                : "Periode belajar sudah dikunci sebagai laporan final. Setelah berkasnya dikirim ke orang tua, tandai agar statusnya jelas."}
            </p>
            {/* D6 — angka final dibekukan supaya nominal yang sudah dikirim tidak
                berubah diam-diam saat sesi dihitung ulang. */}
            {totalsDrifted && (
              <p className="mt-2 rounded-lg bg-[var(--surface-strong)]/70 px-2.5 py-1.5 text-xs font-medium leading-relaxed">
                Total laporan final ini dibekukan di {formatRupiahDisplay(report.totalCost, moneyVisible)}. Perubahan sesi
                setelah final tidak mengubah nominal yang sudah dikirim. Bila yang salah justru
                laporannya, batalkan tagihannya di Keuangan (yang belum lunas) lalu pakai
                “Buka kunci laporan” di bawah; bila sesinya menyusul, terbitkan laporan susulan.
              </p>
            )}
            {displayStatus !== "shared" && (
              <button
                onClick={onMarkShared}
                className="mt-2 inline-flex min-h-[44px] items-center rounded-lg bg-[var(--accent-solid)] px-3 py-1.5 text-xs font-semibold text-[var(--on-strong)] hover:bg-[var(--accent-solid)]"
              >
                Tandai Sudah Dibagikan
              </button>
            )}
            {/* Laporan yang salah tidak bisa diperbaiki dengan membatalkan
                tagihan saja: laporan final membekukan totalnya, sehingga
                tagihan berikutnya identik. Kuncinya harus bisa dibuka. */}
            {report.billingMode === "session_count" ? (
              <p className="mt-2 text-xs leading-relaxed opacity-80">
                Paket per pertemuan dibuka lewat Keuangan → antrean “Tagihan per Pertemuan”
                (batalkan paketnya, sesinya kembali ke antrean, lalu terbitkan paket yang benar).
              </p>
            ) : (
              <div className="mt-2 space-y-1">
                <button
                  type="button"
                  onClick={onUnlockReport}
                  disabled={unlockBusy}
                  className="inline-flex min-h-[44px] items-center rounded-lg border border-[var(--border-warn)] bg-[var(--surface-strong)] px-3 py-1.5 text-xs font-semibold text-[var(--ink-warn)] transition-colors hover:bg-[var(--bg-warn)] disabled:cursor-wait disabled:opacity-50"
                >
                  {unlockBusy ? "Membuka kunci..." : "Buka kunci laporan (perbaiki)"}
                </button>
                <p className="text-xs leading-relaxed opacity-80">
                  Membuka kunci mengembalikan laporan ini menjadi draft supaya sesi, periode, dan
                  nominalnya bisa diperbaiki. Wajib PIN Keuangan, dan tagihan belum lunasnya harus
                  dibatalkan dulu di Keuangan (lunas/diedit manual tidak bisa dibuka).
                </p>
              </div>
            )}
          </div>

          <div className={`rounded-lg border px-3 py-2 text-sm ${payment?.status === "PAID"
            ? "border-[var(--border-success)] bg-[var(--bg-success)] text-[var(--ink-success)]"
            : payment
              ? "border-[var(--border-warn)] bg-[var(--bg-warn)] text-[var(--ink-warn)]"
              : "border-[var(--border)] bg-[var(--surface)] text-[var(--ink-strong)]"}`}>
            <p className="font-semibold">
              Penagihan: {payment?.status === "PAID" ? "Lunas" : payment ? "Belum dibayar" : "Belum diterbitkan"}
            </p>
            <p className="mt-0.5 text-xs opacity-80">
              {payment
                ? `Bulan tagihan ${monthLabel(payment.month)} · ${formatRupiahDisplay(payment.totalCost, moneyVisible)}`
                : "Finalisasi laporan tidak otomatis membuat invoice. Buat tagihannya dari tombol di bawah."}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {/* Satu tombol penagihan: buka tagihannya bila sudah ada, atau
                  terbitkan dulu bila belum. */}
              <button
                onClick={onOpenBilling}
                disabled={invoiceBusy}
                className="inline-flex min-h-[44px] items-center rounded-lg bg-[var(--brand-solid)] px-3 py-1.5 text-xs font-semibold text-[var(--on-strong)] hover:bg-[var(--brand-solid)] disabled:opacity-50"
              >
                {payment ? "Buka Penagihan →" : invoiceBusy ? "Membuat..." : "Buat Tagihan dari Sesi Ini"}
              </button>
            </div>
            {olderUnpaidCount > 0 && (
              <p className="mt-2 rounded-lg border border-[var(--border-warn)] bg-[var(--bg-warn)] px-2.5 py-1.5 text-xs font-medium leading-relaxed text-[var(--ink-warn)]">
                ⚠ {olderUnpaidCount} tagihan bulan sebelumnya belum lunas · {formatRupiahDisplay(olderUnpaidTotal, moneyVisible)}. Buka Keuangan agar tagihan belum dibayar tidak menumpuk.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Kesiapan laporan, bukan hanya jumlah narasi. */}
      {readiness != null && (
      <div className="space-y-2">
        <div className="mb-1 flex justify-between text-xs text-[var(--ink-muted)]">
          <span>Kesiapan laporan</span>
          <span className={ready ? "font-semibold text-[var(--ink-success)]" : ""}>{readinessPercent}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-subtle)]">
          <div
            className={`h-full rounded-full transition-all ${ready ? "bg-[var(--bg-success-strong)]" : "bg-[var(--brand-solid)]"}`}
            style={{ width: `${readinessPercent}%` }}
          />
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {readinessItems.map((item) => (
            <span key={item.label} className={`rounded-md px-2 py-1 text-xs ${item.complete ? "bg-[var(--bg-success)] text-[var(--ink-success)]" : "bg-[var(--surface)] text-[var(--ink-muted)]"}`}>
              {item.complete ? "✓" : "○"} {item.label}
            </span>
          ))}
        </div>
      </div>
      )}
    </>
  );
}
