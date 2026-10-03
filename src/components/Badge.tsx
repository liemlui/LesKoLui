type BadgeTone = "blue" | "green" | "amber" | "red" | "slate" | "purple" | "teal" | "pink";

const TONE_CLASSES: Record<BadgeTone, string> = {
  blue:   "bg-[var(--brand-tint)] text-[var(--ink-brand)] border-[var(--brand-tint-strong)]",
  green:  "bg-[var(--bg-success)] text-[var(--ink-success)] border-[var(--border-success)]",
  amber:  "bg-[var(--bg-warn)] text-[var(--ink-warn)] border-[var(--border-warn)]",
  red:    "bg-[var(--bg-danger)] text-[var(--ink-danger)] border-[var(--border-danger)]",
  slate:  "bg-[var(--bg-subtle)] text-[var(--ink-muted)] border-[var(--border)]",
  purple: "bg-[var(--accent-tint)] text-[var(--ink-purple)] border-[var(--border-accent)]",
  teal:   "bg-[var(--bg-success)] text-[var(--ink-success)] border-[var(--border-success)]",
  pink:   "bg-[var(--bg-danger)] text-[var(--ink-danger)] border-[var(--border-danger)]",
};

interface Props {
  children: React.ReactNode;
  tone?: BadgeTone;
  /** Numeric count shown as a small pill */
  count?: number;
  /** Filled/outlined variant */
  variant?: "soft" | "outline";
  size?: "sm" | "md";
}

/** Status badge for pills, cards, chips — severity + count. */
export default function Badge({ children, tone = "slate", count, variant = "soft", size = "sm" }: Props) {
  const sizeClass = size === "sm" ? "text-[12px] px-1.5 py-0.5" : "text-xs px-2 py-1";
  const borderClass = variant === "outline" ? "border bg-[var(--surface-strong)]" : "border";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-semibold ${sizeClass} ${borderClass} ${TONE_CLASSES[tone]}`}>
      {children}
      {count != null && count > 0 && (
        <span className={`rounded-full px-1.5 py-0 text-[12px] font-bold ${variant === "outline" ? "bg-[var(--bg-subtle)] text-[var(--ink-muted)]" : "bg-[var(--surface-strong)]/60"}`}>
          {count > 99 ? "99+" : count}
        </span>
      )}
    </span>
  );
}
