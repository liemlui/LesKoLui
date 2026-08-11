import { type ReactNode } from "react";

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
  /** Render below the tabs */
  children?: ReactNode;
  /** Full-width tabs stretching to container */
  fullWidth?: boolean;
}

/** Reusable pill-style tab switcher with animated underline indicator. */
export default function Tabs({ tabs, active, onChange, children, fullWidth }: Props) {
  return (
    <div>
      <div className={`flex ${fullWidth ? "overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" : "gap-1 overflow-x-auto"} border-b border-slate-200`} role="tablist">
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.key)}
              className={`relative py-2.5 font-semibold transition-colors whitespace-nowrap ${
                fullWidth
                  ? "flex-1 min-w-max px-2 text-xs sm:min-w-0 sm:px-3 sm:text-sm"
                  : "px-3 text-sm"
              } ${
                isActive
                  ? "text-blue-700"
                  : "text-slate-600 hover:text-slate-700"
              }`}>
              <span className="flex items-center gap-1.5 justify-center">
                {tab.compactLabel && <span className="sm:hidden">{tab.compactLabel}</span>}
                <span className={tab.compactLabel ? "hidden sm:inline" : undefined}>{tab.label}</span>
                {tab.count != null && tab.count > 0 && (
                  <span className={`rounded-full px-1.5 py-0 text-[10px] font-bold ${
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
