import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/", label: "Home", icon: "🏠" },
  { to: "/students", label: "Murid", icon: "👥" },
  { to: "/capture", label: "Catat", icon: "📝" },
  { to: "/payments", label: "Bayaran", icon: "💰" },
  { to: "/settings", label: "Atur", icon: "⚙️" },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200">
      <div className="max-w-md mx-auto flex justify-around items-center h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center px-3 py-1 text-xs transition-colors ${
                isActive
                  ? "text-blue-600 font-semibold"
                  : "text-gray-500 hover:text-gray-700"
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
