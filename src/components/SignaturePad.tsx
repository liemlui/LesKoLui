import { useRef, useState, useEffect } from "react";

interface Props {
  onSave: (blob: Blob) => void;
  onClear?: () => void;
}

export default function SignaturePad({ onSave, onClear }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const [drawing,  setDrawing]  = useState(false);
  const [hasInk,   setHasInk]   = useState(false);
  const lastPt     = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr  = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w    = rect.width  || 320;
    const h    = rect.height || 140;
    canvas.width  = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.fillStyle  = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
  }, []);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);
    setDrawing(true);
    setHasInk(true);
    lastPt.current = getPos(e);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing || !lastPt.current) return;
    e.preventDefault();
    const ctx = canvasRef.current!.getContext("2d")!;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPt.current.x, lastPt.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPt.current = pos;
  };

  const onPointerUp = () => {
    setDrawing(false);
    lastPt.current = null;
  };

  const handleClear = () => {
    const canvas = canvasRef.current!;
    const ctx    = canvas.getContext("2d")!;
    const dpr    = window.devicePixelRatio || 1;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    setHasInk(false);
    onClear?.();
  };

  const handleSave = () => {
    const trimmed = trimCanvas(canvasRef.current!);
    trimmed.toBlob((b) => { if (b) onSave(b); }, "image/png");
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        className="w-full rounded-xl border-2 border-dashed border-gray-300 bg-white cursor-crosshair"
        style={{ height: 140, touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      />
      <p className="text-xs text-gray-400 text-center">Minta murid tanda tangan di kotak di atas</p>
      <div className="flex gap-2">
        <button type="button" onClick={handleClear}
          className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 hover:border-red-300 hover:text-red-400 transition-colors">
          ✕ Hapus
        </button>
        <button type="button" onClick={handleSave} disabled={!hasInk}
          className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-40 hover:bg-blue-700 transition-colors">
          ✓ Simpan TTD
        </button>
      </div>
    </div>
  );
}

function trimCanvas(src: HTMLCanvasElement): HTMLCanvasElement {
  const dpr = window.devicePixelRatio || 1;
  const W   = src.width;
  const H   = src.height;
  const ctx = src.getContext("2d")!;
  const px  = ctx.getImageData(0, 0, W, H).data;

  let x0 = W, x1 = 0, y0 = H, y1 = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (!(px[i] > 245 && px[i+1] > 245 && px[i+2] > 245)) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 <= x0 || y1 <= y0) return src;

  const pad = Math.round(14 * dpr);
  const cx0 = Math.max(0, x0 - pad);
  const cy0 = Math.max(0, y0 - pad);
  const cx1 = Math.min(W, x1 + pad);
  const cy1 = Math.min(H, y1 + pad);

  const out = document.createElement("canvas");
  out.width  = cx1 - cx0;
  out.height = cy1 - cy0;
  const octx = out.getContext("2d")!;
  octx.fillStyle = "#ffffff";
  octx.fillRect(0, 0, out.width, out.height);
  octx.drawImage(src, cx0, cy0, cx1 - cx0, cy1 - cy0, 0, 0, cx1 - cx0, cy1 - cy0);
  return out;
}
