import { settingsStatusRows, type SettingsStatusRow, type StatusTone } from "../../lib/settingsStatus";
import type { PemakaianAiBulan } from "../../lib/aiUsage";
import type { Settings } from "../../db/types";

/**
 * Ringkasan status tiga baris di bawah judul Pengaturan — G3-09 butir 3.
 *
 * Sebelum G3-09, keadaan "kapan backup terakhir", "AI hidup atau mati", dan
 * "penyimpanan terpakai berapa" hanya bisa diketahui dengan membuka tiga
 * akordeon berbeda satu per satu — dan tidak ada satu pun tempat yang memberi
 * tahu bahwa sesuatu **belum pernah** dilakukan. Tiga baris ini menjawabnya
 * sekaligus, masing-masing dengan pintasan ke bagiannya.
 *
 * Perhitungan teks dan nadanya ada di `lib/settingsStatus.ts` (fungsi murni,
 * dites tanpa DOM). Berkas ini hanya merendernya.
 */
export interface SettingsStatusSummaryProps {
  form: Settings;
  /** Pemakaian AI bulan berjalan; `undefined` = masih dihitung. */
  pemakaian: PemakaianAiBulan | null;
  /** Pemakaian penyimpanan dari `navigator.storage.estimate()`. */
  storage: { used?: number | null; quota?: number | null };
  /** Membuka bagian menurut id-nya (dipakai pintasan tiap baris). */
  bukaBagian: (id: string) => void;
}

/** Kelas token per nada; ketiganya sudah teruji kontrasnya di `index.css`. */
const NADA: Record<StatusTone, string> = {
  ok: "text-[var(--ink-success)]",
  warn: "text-[var(--ink-warn)]",
  info: "text-[var(--ink-muted)]",
};

export default function SettingsStatusSummary({
  form, pemakaian, storage, bukaBagian,
}: SettingsStatusSummaryProps) {
  const rows = settingsStatusRows({
    // Waktu backup yang dipakai adalah yang TERBARU di antara berkas dan Drive:
    // tutor yang baru mengunggah ke Drive tidak boleh diberi tahu "belum backup".
    backup: { lastBackupAt: form.lastBackupAt, driveBackupAt: form.driveBackup?.backupAt },
    ai: {
      enabled: Boolean(form.ai.enabled),
      hasApiKey: Boolean(form.ai.apiKey),
      usage: pemakaian
        ? {
          terpakaiIdr: pemakaian.terpakaiIdr,
          batasIdr: pemakaian.batasIdr,
          terlampaui: pemakaian.terlampaui,
          jumlahPanggilan: pemakaian.jumlahPanggilan,
        }
        : null,
    },
    storage,
  });

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]" data-bagian="ringkasan-status">
      <ul className="divide-y divide-[var(--border)]">
        {rows.map((row) => (
          <Baris key={row.id} row={row} bukaBagian={bukaBagian} />
        ))}
      </ul>
    </div>
  );
}

function Baris({ row, bukaBagian }: { row: SettingsStatusRow; bukaBagian: (id: string) => void }) {
  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-xs text-[var(--ink-muted)]">{row.label}</p>
        <p className={`text-sm font-semibold ${NADA[row.tone]}`}>{row.value}</p>
      </div>
      <button
        type="button"
        onClick={() => bukaBagian(row.section)}
        className="min-h-[44px] flex-shrink-0 rounded-lg bg-[var(--bg-subtle)] px-3 py-2 text-xs font-medium text-[var(--ink-strong)]"
        aria-label={`${row.action} — buka bagian ${row.label}`}
      >
        {row.action}
      </button>
    </li>
  );
}
