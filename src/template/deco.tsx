import type { DecoKind } from "./types";

type DecoItem = { c: string; style: React.CSSProperties };

const SETS: Record<DecoKind, DecoItem[]> = {
  snow:   [{ c: "❄", style: { top: 10, left: 14, fontSize: 22, opacity: 0.45, color: "#fff" } }, { c: "❄", style: { top: 58, right: 18, fontSize: 14, opacity: 0.5, color: "#fff" } }],
  leaf:   [{ c: "🌿", style: { top: 10, left: 12, fontSize: 24, opacity: 0.7 } }, { c: "🍃", style: { top: 54, right: 14, fontSize: 20, opacity: 0.7 } }],
  petal:  [{ c: "🌸", style: { top: 10, left: 12, fontSize: 22, opacity: 0.8 } }, { c: "🌸", style: { top: 60, right: 16, fontSize: 14, opacity: 0.7 } }],
  sparkle:[{ c: "✦", style: { top: 90, right: 18, fontSize: 18, opacity: 0.6 } }, { c: "✦", style: { top: 140, left: 16, fontSize: 12, opacity: 0.5 } }],
  star:   [{ c: "★", style: { top: 14, right: 16, fontSize: 20, opacity: 0.55 } }, { c: "✦", style: { top: 70, left: 18, fontSize: 14, opacity: 0.5 } }],
  wave:   [{ c: "〰", style: { bottom: 30, left: 14, fontSize: 22, opacity: 0.4 } }],
  sun:    [{ c: "☀", style: { top: 12, right: 14, fontSize: 22, opacity: 0.5 } }],
  none:   [],

  // ── NEW deco kinds ──────────────────────────────────────────────────────

  geometric: [
    { c: "◢", style: { top: 0, right: 0, fontSize: 80, opacity: 0.08, color: "#fff" } },
    { c: "◤", style: { bottom: 0, left: 0, fontSize: 60, opacity: 0.08, color: "#000" } },
    { c: "⬢", style: { top: 120, left: 10, fontSize: 28, opacity: 0.12 } },
    { c: "⬡", style: { bottom: 80, right: 16, fontSize: 32, opacity: 0.1 } },
  ],
  dots: [
    { c: "•", style: { top: 14, left: 20, fontSize: 40, opacity: 0.15 } },
    { c: "•", style: { top: 70, left: 60, fontSize: 24, opacity: 0.12 } },
    { c: "•", style: { top: 40, right: 30, fontSize: 32, opacity: 0.14 } },
    { c: "•", style: { bottom: 50, right: 14, fontSize: 20, opacity: 0.11 } },
    { c: "•", style: { top: 130, left: 40, fontSize: 16, opacity: 0.13 } },
    { c: "•", style: { bottom: 100, left: 70, fontSize: 18, opacity: 0.1 } },
  ],
  confetti: [
    { c: "◆", style: { top: 10, left: 16, fontSize: 16, opacity: 0.6, color: "#ff6b6b" } },
    { c: "●", style: { top: 50, right: 20, fontSize: 12, opacity: 0.55, color: "#ffd93d" } },
    { c: "▲", style: { bottom: 60, left: 24, fontSize: 14, opacity: 0.5, color: "#6bcb77" } },
    { c: "■", style: { top: 100, right: 14, fontSize: 18, opacity: 0.45, color: "#4d96ff" } },
    { c: "◆", style: { bottom: 30, right: 30, fontSize: 12, opacity: 0.5, color: "#ff6b6b" } },
  ],
  ribbon: [
    { c: "🎗", style: { top: 14, right: 20, fontSize: 28, opacity: 0.7 } },
    { c: "🎀", style: { bottom: 60, left: 16, fontSize: 24, opacity: 0.55 } },
    { c: "🏷", style: { top: 90, right: 14, fontSize: 20, opacity: 0.5 } },
  ],
  zigzag: [
    { c: "⏝⏝⏝", style: { top: 0, left: 0, right: 0, fontSize: 36, opacity: 0.1, color: "#fff", textAlign: "center", letterSpacing: 4 } },
    { c: "⏜⏜⏜", style: { bottom: 0, left: 0, right: 0, fontSize: 36, opacity: 0.1, color: "#fff", textAlign: "center", letterSpacing: 4 } },
    { c: "⚡", style: { top: 80, right: 20, fontSize: 22, opacity: 0.5 } },
  ],
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
