import { NavLink } from "react-router-dom";
import { APP_VERSION } from "../lib/version";
import type { JSX } from "react";

interface NavItem {
  to: string;
  label: string;
  icon: JSX.Element;
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
    to: "/tugas", label: "Tugas", icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M8 12h3M8 16h7M8 8h1" />
      </svg>
    ),
  },
  {
    to: "/analytics", label: "Analitik", icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="12" width="4" height="8" rx="1" />
        <rect x="10" y="7" width="4" height="13" rx="1" />
        <rect x="17" y="3" width="4" height="17" rx="1" />
      </svg>
    ),
  },
  {
    to: "/payments", label: "Keuangan", icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
      </svg>
    ),
  },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex flex-col items-center justify-center px-3 py-1 text-xs transition-colors ${
    isActive
      ? "text-blue-600 font-semibold"
      : "text-gray-400 hover:text-gray-600"
  }`;

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200">
      <div className="max-w-md mx-auto flex justify-around items-center h-16">
        {NAV_ITEMS.map(({ to, icon, label }) => (
          <NavLink key={to} to={to} end={to === "/"} className={linkClass}>
            <span className="mb-0.5">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
      <p className="text-center text-gray-400 pb-1" style={{ fontSize: 10 }}>{APP_VERSION}</p>
    </nav>
  );
}
