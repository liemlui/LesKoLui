/**
 * Galeri tema laporan (G3-08 langkah 3).
 *
 * Sebelumnya galeri ini hidup di dalam bilah desain: **enam kolom** dengan label
 * dipotong dan tanpa keterangan, sehingga sasaran sentuhnya di bawah ambang dan
 * nama tema tidak terbaca. Sekarang empat kolom, tiap kartu minimal 44 piksel,
 * nama utuh di `title`, dan **kartu yang sedang dipakai bisa difokus papan
 * ketik beserta tanda centangnya** — warna saja tidak cukup untuk pembaca layar.
 *
 * Dipisah dari `DesignToolbar.tsx` supaya berkas itu tidak tumbuh menjadi satu
 * berkas besar baru (pelajaran G3-05/G3-06).
 */

import type { Theme } from "../../template/types";
import { CheckIcon } from "../../components/icons";

interface Props {
  themes: readonly Theme[];
  activeId: string;
  activeName: string;
  onSelect: (themeId: string) => void;
}

export default function ThemeGallery({ themes, activeId, activeName, onSelect }: Props) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Pilih tema laporan">
        {themes.map((theme) => {
          const isActive = theme.id === activeId;
          const bgColor = theme.bg.includes("gradient") ? theme.accent : theme.bg;
          return (
            <button
              key={theme.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              title={theme.name}
              onClick={() => onSelect(theme.id)}
              className={`min-w-0 overflow-hidden rounded-xl border-2 text-left transition-all ${
                isActive
                  ? "border-[var(--border-strong)] ring-2 ring-[var(--border-brand)] ring-offset-1"
                  : "border-[var(--border)] hover:border-[var(--border-strong)]"
              }`}
            >
              <span
                aria-hidden="true"
                className="relative flex h-11 items-center justify-center"
                style={{ background: bgColor }}
              >
                <span
                  style={{
                    fontFamily: theme.fontDisplay, fontSize: 11, color: theme.ink,
                    fontWeight: 700, lineHeight: 1, textAlign: "center", padding: "0 2px",
                  }}
                >
                  {theme.headerText.slice(0, 6)}
                </span>
                {/* Tanda terpilih: bentuk, bukan hanya warna. */}
                {isActive && (
                  <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--surface-strong)] text-[var(--ink-brand)]">
                    <CheckIcon size={11} />
                  </span>
                )}
              </span>
              <span
                className="block truncate bg-[var(--surface-strong)] px-1.5 py-1 text-[11px] leading-tight text-[var(--ink-muted)]"
                title={theme.name}
              >
                {theme.name}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-xs font-semibold text-[var(--ink-strong)]" role="status">
        Tema terpakai: {activeName}
      </p>
    </div>
  );
}
