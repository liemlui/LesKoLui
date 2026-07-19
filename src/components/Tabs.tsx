import { type ReactNode } from "react";

export interface Tab {
  key: string;
  label: string;
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
      <div className={`flex ${fullWidth ? "" : "gap-1"} border-b border-slate-200`} role="tablist">
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.key)}
              className={`relative px-3 py-2.5 text-sm font-semibold transition-colors whitespace-nowrap ${
                fullWidth ? "flex-1" : ""
              } ${
                isActive
                  ? "text-blue-700"
                  : "text-slate-500 hover:text-slate-700"
              }`}>
              <span className="flex items-center gap-1.5 justify-center">
                {tab.label}
                {tab.count != null && tab.count > 0 && (
                  <span className={`rounded-full px-1.5 py-0 text-[10px] font-bold ${
                    isActive ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
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
