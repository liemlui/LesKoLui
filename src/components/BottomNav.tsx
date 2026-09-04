import { NavLink } from "react-router-dom";
import type { JSX } from "react";

interface NavItem {
  to: string;
  label: string;
  icon: JSX.Element;
  primary?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    to: "/", label: "Home", icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
        <path d="M9 21V12h6v9" />
      </svg>
    ),
  },
  {
    to: "/students", label: "Murid", icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 4-7 8-7s8 3 8 7" />
      </svg>
    ),
  },
  {
    to: "/capture", label: "Catat", icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
    ),
    primary: true,
  },
  {
    to: "/report", label: "Laporan", icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 20V9M12 20V4M19 20v-7" />
        <path d="M3 20h18" />
      </svg>
    ),
  },
  {
    to: "/payments", label: "Keuangan", icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5v9A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9Z" />
        <path d="M3 10h18" />
        <path d="M16 15.5h.01M15 12.5h.01" />
      </svg>
    ),
  },
];

const linkClass = ({ isActive }: { isActive: boolean }, primary = false) =>
  `flex flex-col items-center justify-center gap-0.5 min-h-[48px] min-w-[48px] px-2 py-1 text-[12px] font-medium transition-colors rounded-xl ${
    primary
      ? "h-14 w-14 -mt-4 rounded-full border-4 border-white bg-blue-600 text-white shadow-lg"
      : isActive
        ? "text-blue-700 bg-blue-50"
        : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
  }`;

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white pb-[max(env(safe-area-inset-bottom),0px)]" style={{ height: "var(--bottom-nav-h)" }}>
      <div className="mx-auto flex h-full max-w-md items-center justify-around px-2">
        {NAV_ITEMS.map(({ to, icon, label, primary }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/" || to === "/report"}
            className={({ isActive }) => linkClass({ isActive }, primary)}
          >
            <span className="mb-0.5">{icon}</span>
            <span className={primary ? "text-xs font-bold leading-none" : ""}>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
