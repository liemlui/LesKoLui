type BadgeTone = "blue" | "green" | "amber" | "red" | "slate" | "purple" | "teal" | "pink";

const TONE_CLASSES: Record<BadgeTone, string> = {
  blue:   "bg-blue-50 text-blue-700 border-blue-200",
  green:  "bg-green-50 text-green-700 border-green-200",
  amber:  "bg-amber-50 text-amber-700 border-amber-200",
  red:    "bg-red-50 text-red-700 border-red-200",
  slate:  "bg-slate-100 text-slate-600 border-slate-200",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
  teal:   "bg-teal-50 text-teal-700 border-teal-200",
  pink:   "bg-pink-50 text-pink-700 border-pink-200",
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
  const borderClass = variant === "outline" ? "border bg-white" : "border";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-semibold ${sizeClass} ${borderClass} ${TONE_CLASSES[tone]}`}>
      {children}
      {count != null && count > 0 && (
        <span className={`rounded-full px-1.5 py-0 text-[12px] font-bold ${variant === "outline" ? "bg-slate-100 text-slate-600" : "bg-white/60"}`}>
          {count > 99 ? "99+" : count}
        </span>
      )}
    </span>
  );
}
