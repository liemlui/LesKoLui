interface Props {
  /** Predefined shapes */
  variant?: "text" | "card" | "circle" | "rect" | "chart";
  /** Number of skeleton lines (for text variant) */
  lines?: number;
  /** Custom width/height */
  width?: string | number;
  height?: string | number;
  /** Extra classes */
  className?: string;
}

/** Shimmer loader for async/suspense boundaries. */
export default function Skeleton({ variant = "text", lines = 3, width, height, className = "" }: Props) {
  const shimmer = "animate-pulse bg-slate-200 rounded";

  if (variant === "text") {
    return (
      <div className={`space-y-2 ${className}`} aria-hidden="true">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`${shimmer}`}
            style={{
              width: i === lines - 1 ? "60%" : width ?? "100%",
              height: height ?? 14,
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div className={`rounded-2xl border border-slate-100 p-4 space-y-3 ${className}`} aria-hidden="true">
        <div className="flex items-center gap-3">
          <div className={`${shimmer} rounded-full`} style={{ width: 40, height: 40 }} />
          <div className="flex-1 space-y-2">
            <div className={`${shimmer}`} style={{ width: "50%", height: 14 }} />
            <div className={`${shimmer}`} style={{ width: "30%", height: 10 }} />
          </div>
        </div>
        <div className={`${shimmer}`} style={{ width: "100%", height: 12 }} />
        <div className={`${shimmer}`} style={{ width: "70%", height: 12 }} />
      </div>
    );
  }

  if (variant === "circle") {
    const s = width ?? height ?? 48;
    return (
      <div className={`${shimmer} rounded-full ${className}`} aria-hidden="true"
        style={{ width: s, height: s }} />
    );
  }

  if (variant === "chart") {
    return (
      <div className={`rounded-xl bg-slate-50 border border-slate-100 p-4 space-y-3 ${className}`} aria-hidden="true">
        <div className={`${shimmer}`} style={{ width: "40%", height: 14 }} />
        <div className={`${shimmer} rounded`} style={{ width: "100%", height: height ?? 160 }} />
      </div>
    );
  }

  // rect
  return (
    <div className={`${shimmer} ${className}`} aria-hidden="true"
      style={{ width: width ?? "100%", height: height ?? 40 }} />
  );
}
