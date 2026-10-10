import type { ComponentType } from "react";
import type { StudentAction } from "../../lib/studentActions";
import { BellIcon, InfoIcon, WarningIcon } from "../../components/icons";

interface PerluTindakanCardProps {
  actions: StudentAction[];
  /** Membuka rute halaman lain (mis. `/capture`, `/payments?tab=tagihan`). */
  onNavigate: (href: string) => void;
  /** Membuka rujukan DI DALAM halaman (mis. pindah ke tab Sesi). */
  onJump: (anchor: string) => void;
}

const TONE_CLASS: Record<StudentAction["tone"], string> = {
  danger: "border-[var(--border-danger)] bg-[var(--bg-danger)] text-[var(--ink-danger)]",
  warn: "border-[var(--border-warn)] bg-[var(--bg-warn)] text-[var(--ink-warn)]",
  info: "border-[var(--border)] bg-[var(--surface)] text-[var(--ink-muted)]",
};

/**
 * Penanda tingkat kepentingan — **ikon SVG, bukan emoji** (⚠️ 🔔 ℹ️).
 *
 * Ini bukan pilihan gaya: guard `e2e:uiux` menuntut 0 emoji di dalam kontrol, dan
 * tiga emoji itu sempat membuat tes "emoji di kontrol" merah di layar Detail Murid
 * pada 2026-10-10. Kebijakan emoji yang berlaku (TASK-11) hanya mengizinkan emoji
 * untuk **keadaan afektif** — mood, situasi, indikator perilaku — sedangkan
 * "mendesak / perlu perhatian / keterangan" adalah penanda struktural.
 */
const TONE_ICON: Record<StudentAction["tone"], ComponentType<{ size?: number; className?: string }>> = {
  danger: WarningIcon,
  warn: BellIcon,
  info: InfoIcon,
};

/** Berapa baris yang ditampilkan sebelum diringkas jadi satu baris. */
const MAX_ROWS = 4;

/**
 * Kartu "Perlu Tindakan" — butir 2 G3-06.
 *
 * Aturan isinya ada di `lib/studentActions.ts`, bukan di sini: komponen ini hanya
 * merender. Kalau inventarisnya kosong, kartunya **tidak dirender sama sekali** —
 * kartu yang mengumumkan "tidak ada apa-apa" hanya menambah tinggi layar.
 *
 * Tombolnya bukan `<a href>`: rujukan di dalam halaman tidak boleh menambah
 * riwayat peramban, dan membuka tab lain tidak boleh memuat ulang aplikasi.
 */
export default function PerluTindakanCard({ actions, onNavigate, onJump }: PerluTindakanCardProps) {
  if (actions.length === 0) return null;

  const shown = actions.slice(0, MAX_ROWS);
  const rest = actions.length - shown.length;

  return (
    <section
      aria-labelledby="perlu-tindakan-title"
      className="bg-[var(--surface-strong)] rounded-2xl shadow-sm border border-[var(--border)] overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between gap-2">
        <h2 id="perlu-tindakan-title" className="font-semibold text-[var(--ink-strong)]">
          Perlu Tindakan
        </h2>
        <span className="text-xs text-[var(--ink-muted)] flex-shrink-0">
          {actions.length} hal menunggu
        </span>
      </div>

      <ul className="divide-y divide-[var(--border)] list-none m-0 p-0">
        {shown.map((action) => {
          const Icon = TONE_ICON[action.tone];
          return (
          <li key={`${action.type}-${action.href}-${action.title}`}>
            <button
              type="button"
              onClick={() => (action.anchorOnly ? onJump(action.href) : onNavigate(action.href))}
              className={`w-full text-left px-4 py-3 flex items-start gap-2.5 min-h-[44px] transition-colors hover:bg-[var(--surface)] ${TONE_CLASS[action.tone]}`}
            >
              <Icon size={15} className="flex-shrink-0 mt-0.5" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{action.title}</span>
                <span className="block text-xs mt-0.5 leading-relaxed opacity-90">{action.detail}</span>
              </span>
              <span aria-hidden="true" className="flex-shrink-0 text-xs opacity-70 pt-0.5">›</span>
            </button>
          </li>
          );
        })}
      </ul>

      {rest > 0 && (
        <p className="px-4 py-2 border-t border-[var(--border)] text-xs text-[var(--ink-muted)]">
          {rest} hal lain menunggu — semuanya muncul di tab masing-masing.
        </p>
      )}
    </section>
  );
}
