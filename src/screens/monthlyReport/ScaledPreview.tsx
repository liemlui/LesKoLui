import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Pratinjau ter-scale (C-2): merender konten pada lebar penuh (416px, sama
 * dengan root export) lalu mengecilkan tampilannya via CSS transform, tanpa
 * mengubah layout internal renderer. `pointer-events: none` memastikan
 * preview tidak mengganggu interaksi. Tinggi wrapper mengikuti tinggi konten
 * × scale (diukur via ResizeObserver — jumlah halaman bisa berubah).
 *
 * Dipakai bersama oleh pratinjau utama dan modal pratinjau susunan (G3-05 butir 11).
 */
export default function ScaledPreview({ children, scale = 0.5 }: { children: ReactNode; scale?: number }) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [innerHeight, setInnerHeight] = useState(0);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const update = () => setInnerHeight(el.offsetHeight);
    update();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div style={{ height: innerHeight * scale, overflow: "hidden" }}>
      <div
        ref={innerRef}
        style={{ width: 416, transform: `scale(${scale})`, transformOrigin: "top left", pointerEvents: "none" }}>
        {children}
      </div>
    </div>
  );
}
