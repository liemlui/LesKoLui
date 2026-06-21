import imageCompression from "browser-image-compression";
import { PHOTO_MAX_PX } from "../db/types";

export async function compressPhoto(file: File): Promise<Blob> {
  return imageCompression(file, {
    maxWidthOrHeight: PHOTO_MAX_PX,
    maxSizeMB: 0.4,
    useWebWorker: true,
    fileType: "image/jpeg",
    initialQuality: 0.8,
  });
}

const ID_MONTHS = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

/**
 * Burns a timestamp stamp onto a photo blob (bottom-right corner).
 * Shows session date + current WIB clock time.
 */
export async function stampPhoto(blob: Blob, sessionDate: string): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width  = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);

      // Labels
      const [yr, mo, dy] = sessionDate.split("-").map(Number);
      const dateLabel = `${dy} ${ID_MONTHS[mo - 1]} ${yr}`;
      const wibNow   = new Date(Date.now() + 7 * 60 * 60 * 1000);
      const timeLabel = `${String(wibNow.getUTCHours()).padStart(2,"0")}:${String(wibNow.getUTCMinutes()).padStart(2,"0")} WIB`;

      const fontSize = Math.max(14, Math.round(img.width * 0.038));
      const lineH    = fontSize * 1.38;
      const pad      = fontSize * 0.65;
      ctx.font       = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;

      const textW = Math.max(ctx.measureText(dateLabel).width, ctx.measureText(timeLabel).width);
      const bgW   = textW + pad * 2;
      const bgH   = lineH * 2 + pad * 1.5;
      const margin = Math.round(img.width * 0.015);
      const bx    = img.width  - bgW - margin;
      const by    = img.height - bgH - margin;
      const r     = fontSize * 0.35;

      // Rounded-rect background
      ctx.fillStyle = "rgba(0,0,0,0.58)";
      ctx.beginPath();
      ctx.moveTo(bx + r, by);
      ctx.lineTo(bx + bgW - r, by);
      ctx.arcTo(bx + bgW, by,          bx + bgW, by + r,       r);
      ctx.lineTo(bx + bgW, by + bgH - r);
      ctx.arcTo(bx + bgW, by + bgH,    bx + bgW - r, by + bgH, r);
      ctx.lineTo(bx + r,  by + bgH);
      ctx.arcTo(bx,       by + bgH,    bx, by + bgH - r,       r);
      ctx.lineTo(bx,      by + r);
      ctx.arcTo(bx,       by,          bx + r, by,             r);
      ctx.closePath();
      ctx.fill();

      // Text
      ctx.fillStyle = "#ffffff";
      ctx.fillText(dateLabel, bx + pad, by + pad + fontSize * 0.85);
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.fillText(timeLabel, bx + pad, by + pad + fontSize * 0.85 + lineH);

      canvas.toBlob((b) => resolve(b ?? blob), "image/jpeg", 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(blob); };
    img.src = url;
  });
}

export function blobUrl(blob?: Blob): string | undefined {
  return blob ? URL.createObjectURL(blob) : undefined;
}
