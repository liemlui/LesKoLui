import { NavLink, useLocation, useNavigate } from "react-router-dom";
import type { JSX } from "react";

interface NavItem {
  to: string;
  label: string;
  icon: JSX.Element;
}

/**
 * TIGA PINTU, bukan lima.
 *
 * G3-02 #11 (kontrak K1.1, disepakati di `TASK-03` §2): pintu = **Hari Ini ·
 * Murid · Uang**, ditambah **satu aksi utama** di dalam nav.
 *
 * Dua hal yang keluar dari nav ini dan alasannya:
 *
 * - **Catat sesi** sekarang jadi aksi utama berlabel, bukan pintu bergaya tombol
 *   mengambang. Gaya `primary` yang lama membuatnya menonjol keluar dari bilah
 *   nav dan menutupi konten di layar padat; bentuknya diganti bilah aksi yang
 *   melebar di dalam nav.
 * - **Laporan** bukan lagi pintu. Rutenya `/report` **tetap hidup** karena masih
 *   dipakai tautan langsung, bookmark, dan deep link — hanya tempatnya bukan di
 *   nav bawah lagi.
 */
const NAV_ITEMS: NavItem[] = [
  {
    to: "/", label: "Hari Ini", icon: (
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
    to: "/payments", label: "Uang", icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5v9A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9Z" />
        <path d="M3 10h18" />
        <path d="M16 15.5h.01M15 12.5h.01" />
      </svg>
    ),
  },
];

/** Jalur yang dianggap bagian dari aksi "Catat sesi". */
const JALUR_CATAT = ["/capture"];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex flex-col items-center justify-center gap-0.5 min-h-[48px] min-w-[48px] px-2 py-1 text-[12px] font-medium transition-colors rounded-xl ${
    isActive
      ? "text-[var(--ink-brand)] bg-[var(--surface-soft)]"
      : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-soft)]"
  }`;

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const catatAktif = JALUR_CATAT.some((jalur) => pathname.startsWith(jalur));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--border)] bg-[var(--surface-strong)] text-[var(--text)] pb-[max(env(safe-area-inset-bottom),0px)]" style={{ height: "var(--bottom-nav-h)" }}>
      {/* Tiga pintu di kiri-tengah, satu aksi utama di kanan. Aksi sengaja TIDAK
          memakai bentuk mengambang: ia duduk di dalam bilah nav supaya tidak
          pernah menutupi konten. */}
      <div className="mx-auto flex h-full max-w-md items-center justify-around gap-1 px-2">
        {NAV_ITEMS.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) => linkClass({ isActive })}
          >
            <span className="mb-0.5">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}

        <button
          type="button"
          onClick={() => navigate("/capture")}
          aria-current={catatAktif ? "page" : undefined}
          className={`flex min-h-[48px] flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-1 text-[12px] font-bold transition-colors ${
            catatAktif
              ? "bg-[var(--brand-solid-hover)] text-[var(--on-strong)]"
              : "bg-[var(--brand-solid)] text-[var(--on-strong)] hover:bg-[var(--brand-solid-hover)]"
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span className="truncate">Catat sesi</span>
        </button>
      </div>
    </nav>
  );
}
