import { createContext, useContext, useId, useState, type ReactNode } from "react";

/**
 * Akordeon layar Pengaturan: hanya satu bagian terbuka pada satu waktu.
 *
 * Diekstrak dari `screens/Settings.tsx` (G3-09, langkah ekstraksi) tanpa
 * mengubah perilakunya. `id` bagian = judulnya, jadi judul bagian harus unik —
 * itulah sebabnya `SETTINGS_SECTIONS` di bawah menjadi daftar tunggal judul
 * bagian, dan urutannya adalah urutan tampil di layar (G3-09 butir 4).
 */

const AccordionContext = createContext<{
  openId: string | null;
  setOpenId: (id: string | null) => void;
} | null>(null);

export function AccordionProvider({
  openId, setOpenId, children,
}: {
  openId: string | null;
  setOpenId: (id: string | null) => void;
  children: ReactNode;
}) {
  return (
    <AccordionContext.Provider value={{ openId, setOpenId }}>{children}</AccordionContext.Provider>
  );
}

/**
 * Urutan bagian yang mengikat (G3-09 butir 4):
 * Backup dan Restore · AI · Profil · PIN · Rekening Bank · Aplikasi ·
 * Riwayat Aktivitas · Hapus Semua Data (paling bawah, di balik pemisah zona bahaya).
 *
 * `danger: true` menandai satu-satunya bagian di zona berbahaya. Daftar ini juga
 * dipakai pintasan baris ringkasan status, sehingga tidak ada judul bagian yang
 * disalin sebagai teks lepas di dua tempat.
 */
export const SETTINGS_SECTIONS = [
  { id: "backup", title: "Backup dan Restore" },
  { id: "ai", title: "AI — DeepSeek" },
  { id: "profil", title: "Profil Tutor" },
  { id: "pin", title: "PIN Keuangan" },
  { id: "rekening", title: "Rekening Bank" },
  { id: "aplikasi", title: "Aplikasi" },
  { id: "riwayat", title: "Riwayat Aktivitas" },
  { id: "bahaya", title: "Hapus Semua Data", danger: true },
] as const;

/** Judul bagian menurut id-nya, untuk badge dan pintasan. */
export const SECTION_TITLE: Record<string, string> = Object.fromEntries(
  SETTINGS_SECTIONS.map((s) => [s.id, s.title]),
);

export function Section({
  id, title, icon, badge, defaultOpen = false, children,
}: {
  /**
   * Id bagian yang stabil. Dipakai akordeon dan pintasan; **judul tidak dipakai
   * sebagai kunci** karena judul bisa berubah dan dulu itu membuat pintasan
   * "buka bagian Backup" bergantung pada teks tombolnya.
   */
  id: string;
  title: string;
  icon: ReactNode;
  /** Badge keadaan bagian (G3-09 butir 11). `tone` hanya memilih token warna. */
  badge?: { text: string; tone?: "ok" | "warn" | "info" };
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const ctx = useContext(AccordionContext);
  const [localOpen, setLocalOpen] = useState(defaultOpen);
  const contentId = useId();
  const open = ctx ? ctx.openId === id : localOpen;
  const toggle = () => {
    if (ctx) ctx.setOpenId(open ? null : id);
    else setLocalOpen((o) => !o);
  };
  return (
    <div
      id={`bagian-${id}`}
      className="bg-[var(--surface-strong)] rounded-2xl shadow-sm border border-[var(--border)] overflow-hidden"
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={contentId}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex-shrink-0 text-[var(--ink-muted)]">{icon}</span>
          <span className="text-sm font-semibold text-[var(--ink-strong)]">{title}</span>
          {badge && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${BADGE_CLASS[badge.tone ?? "ok"]}`}>
              {badge.text}
            </span>
          )}
        </div>
        <span className={`text-[var(--ink-muted)] text-sm transition-transform duration-200 ${open ? "rotate-180" : ""}`}>▼</span>
      </button>
      {open && <div id={contentId} className="px-4 pb-4 pt-0 space-y-3 border-t border-[var(--border)]">{children}</div>}
    </div>
  );
}

/**
 * Warna badge per nada.
 *
 * Tiga kombinasi ini sudah dipakai layar ini sejak sebelum G3-09 (badge "Aktif"
 * memakai pasangan success). Pasangan warn/info ditambahkan mengikuti token yang
 * sudah teruji kontrasnya di `index.css` (--ink-warn 6,34:1 · --ink-strong pada
 * --bg-subtle jauh di atas ambang), bukan warna baru.
 */
const BADGE_CLASS: Record<"ok" | "warn" | "info", string> = {
  ok: "bg-[var(--bg-success)] text-[var(--ink-success)]",
  warn: "bg-[var(--bg-warn)] text-[var(--ink-warn)]",
  info: "bg-[var(--bg-subtle)] text-[var(--ink-strong)]",
};

/** Pemisah zona berbahaya: hanya satu bagian di bawah garis ini (G3-09 butir 4). */
export function DangerZoneDivider() {
  return (
    <div className="pt-2" role="separator" aria-label="Zona berbahaya">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--ink-danger)]">
        <TrashDividerIcon />
        Zona berbahaya
      </p>
      <p className="mt-1 text-xs text-[var(--ink-muted)]">
        Bagian di bawah ini menghapus data dan tidak bisa dibatalkan.
      </p>
    </div>
  );
}

/** Ikon garis kecil untuk kepala pemisah; bukan emoji (guard TASK-11). */
function TrashDividerIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
    </svg>
  );
}
