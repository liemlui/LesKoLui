import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  /** "solid" = putih + garis; "soft" = abu muda tanpa garis (blok sekunder). */
  tone?: "solid" | "soft";
  className?: string;
  as?: "div" | "section" | "article";
}

/**
 * Kartu dasar (G2-01 — TASK-04 §3).
 * Hanya memakai token `src/index.css`: warna, radius, spacing, elevasi.
 * Berkas di folder ini WAJIB nol kelas warna langsung dari palet Tailwind
 * (mis. kelas putih-abu atau teks abu), sehingga aman dari pergeseran palet.
 */
export default function Card({ children, tone = "solid", className = "", as: Tag = "div" }: CardProps) {
  const toneClass =
    tone === "solid"
      ? "bg-[var(--surface-strong)] border border-[var(--border)]"
      : "bg-[var(--surface-soft)] border border-transparent";

  return (
    <Tag
      className={`rounded-[var(--radius-card)] p-[var(--space-4)] shadow-[var(--e-flat)] ${toneClass} ${className}`}
    >
      {children}
    </Tag>
  );
}
