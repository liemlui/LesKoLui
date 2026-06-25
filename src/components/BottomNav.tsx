import { NavLink } from "react-router-dom";
import { APP_VERSION } from "../lib/version";

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/",          label: "Home",     icon: "🏠" },
  { to: "/students",  label: "Murid",    icon: "👥" },
  { to: "/tugas",     label: "Tugas",    icon: "📋" },
  { to: "/payments",  label: "Keuangan", icon: "💰" },
  { to: "/settings",  label: "Atur",     icon: "⚙️" },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex flex-col items-center justify-center px-3 py-1 text-xs transition-colors ${
    isActive
      ? "text-blue-600 font-semibold"
      : "text-gray-500 hover:text-gray-700"
  }`;

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200">
      <div className="max-w-md mx-auto flex justify-around items-center h-16">
        {NAV_ITEMS.map(({ to, icon, label }) => (
          <NavLink key={to} to={to} end={to === "/"} className={linkClass}>
            <span className="text-lg">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
      <p className="text-center text-gray-300 pb-1" style={{ fontSize: 9 }}>{APP_VERSION}</p>
    </nav>
  );
}
