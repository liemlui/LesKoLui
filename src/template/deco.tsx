import type { DecoKind } from "./types";

const SETS: Record<DecoKind, Array<{ c: string; style: React.CSSProperties }>> = {
  snow:   [{ c: "❄", style: { top: 10, left: 14, fontSize: 22, opacity: 0.45, color: "#fff" } }, { c: "❄", style: { top: 58, right: 18, fontSize: 14, opacity: 0.5, color: "#fff" } }],
  leaf:   [{ c: "🌿", style: { top: 10, left: 12, fontSize: 24, opacity: 0.7 } }, { c: "🍃", style: { top: 54, right: 14, fontSize: 20, opacity: 0.7 } }],
  petal:  [{ c: "🌸", style: { top: 10, left: 12, fontSize: 22, opacity: 0.8 } }, { c: "🌸", style: { top: 60, right: 16, fontSize: 14, opacity: 0.7 } }],
  sparkle:[{ c: "✦", style: { top: 90, right: 18, fontSize: 18, opacity: 0.6 } }, { c: "✦", style: { top: 140, left: 16, fontSize: 12, opacity: 0.5 } }],
  star:   [{ c: "★", style: { top: 14, right: 16, fontSize: 20, opacity: 0.55 } }, { c: "✦", style: { top: 70, left: 18, fontSize: 14, opacity: 0.5 } }],
  wave:   [{ c: "〰", style: { bottom: 30, left: 14, fontSize: 22, opacity: 0.4 } }],
  sun:    [{ c: "☀", style: { top: 12, right: 14, fontSize: 22, opacity: 0.5 } }],
  none:   [],
};

export function Deco({ kind }: { kind: DecoKind }) {
  return (
    <>
      {SETS[kind].map((d, i) => (
        <span key={i} style={{ position: "absolute", pointerEvents: "none", zIndex: 1, ...d.style }}>
          {d.c}
        </span>
      ))}
    </>
  );
}
