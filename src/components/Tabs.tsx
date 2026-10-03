import { useRef, type KeyboardEvent, type ReactNode } from "react";

export interface Tab {
  key: string;
  label: string;
  /** Short label used below the `sm` breakpoint when five+ tabs must fit. */
  compactLabel?: string;
  /** Optional badge count */
  count?: number;
}

interface Props {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
  /**
   * Awalan id pasangan tab↔panel (audit L-06). Kontraknya:
   * tab = `<idPrefix>-tab-<key>`, panel = `<idPrefix>-panel-<key>`.
   *
   * Pemanggil WAJIB menyediakan elemen `role="tabpanel"` ber-id panel itu untuk
   * SETIAP key (boleh `hidden` saat tidak aktif) — kalau tidak, `aria-controls`
   * menunjuk elemen yang tidak ada dan gunanya hilang.
   */
  idPrefix: string;
  /** Render below the tabs */
  children?: ReactNode;
  /** Full-width tabs stretching to container */
  fullWidth?: boolean;
}

/**
 * Indeks tab tujuan untuk tombol panah/Home/End (pola APG). `null` = tombol itu
 * bukan tanggung jawab tablist, jadi jangan dicegah (`preventDefault`).
 */
function arrowTargetIndex(key: string, index: number, count: number): number | null {
  if (count === 0) return null;
  if (key === "ArrowRight") return index + 1 >= count ? 0 : index + 1;
  if (key === "ArrowLeft") return index - 1 < 0 ? count - 1 : index - 1;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return null;
}

/**
 * Reusable pill-style tab switcher with animated underline indicator.
 *
 * Audit L-06: pola tab dibuat lengkap — setiap tab punya `id` + `aria-controls`,
 * hanya tab aktif yang bisa di-Tab (tabIndex bergilir), dan panah ←/→ (plus
 * Home/End) memindahkan fokus sekaligus membuka panelnya.
 */
export default function Tabs({ tabs, active, onChange, idPrefix, children, fullWidth }: Props) {
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = arrowTargetIndex(e.key, index, tabs.length);
    if (next === null) return;
    e.preventDefault();
    buttons.current[next]?.focus();
    const target = tabs[next];
    if (target) onChange(target.key);
  };

  return (
    <div>
      <div className={`flex ${fullWidth ? "overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" : "gap-1 overflow-x-auto"} border-b border-slate-200`} role="tablist">
        {tabs.map((tab, index) => {
          const isActive = tab.key === active;
          return (
            <button
              key={tab.key}
              ref={(el) => { buttons.current[index] = el; }}
              id={`${idPrefix}-tab-${tab.key}`}
              role="tab"
              aria-selected={isActive}
              aria-controls={`${idPrefix}-panel-${tab.key}`}
              aria-label={tab.label}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(tab.key)}
              onKeyDown={(e) => onKeyDown(e, index)}
              className={`relative py-2.5 font-semibold transition-colors whitespace-nowrap ${
                fullWidth
                  ? "flex-1 min-w-0 basis-0 px-1 text-xs sm:px-1.5 sm:text-sm"
                  : "px-3 text-sm"
              } ${
                isActive
                  ? "text-blue-700"
                  : "text-slate-600 hover:text-slate-700"
              }`}>
              <span className="flex items-center justify-center gap-1 min-w-0">
                {tab.compactLabel && <span className="sm:hidden">{tab.compactLabel}</span>}
                <span
                  className={`truncate ${tab.compactLabel ? "hidden sm:inline" : ""}`}
                  title={tab.label}
                >
                  {tab.label}
                </span>
                {tab.count != null && tab.count > 0 && (
                  <span className={`shrink-0 rounded-full px-1.5 py-0 text-[12px] font-bold ${
                    isActive ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                  }`}>
                    {tab.count > 99 ? "99+" : tab.count}
                  </span>
                )}
              </span>
              {/* Animated underline */}
              <span
                className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-full transition-all duration-200 ${
                  isActive ? "bg-blue-600 scale-x-100" : "bg-transparent scale-x-0"
                }`}
              />
            </button>
          );
        })}
      </div>
      {children}
    </div>
  );
}
