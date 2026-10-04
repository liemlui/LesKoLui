# 07 — Export & Share

Turn the rendered report into shareable PNG images and/or a multi-page PDF, then share to WhatsApp via the Web Share API. File: `lib/exportReport.ts`.

## How it works

1. `ReportRenderer` (file `04`) renders each page as a node with `data-report-page`.
2. Rasterize each page node to a PNG with **html-to-image**.
3. Either share the PNGs directly (best for WhatsApp; matches the tutor's current image-style output) or assemble them into one PDF with **jsPDF**.
4. Share via `navigator.share({ files })`; fall back to download.

## Critical: wait for fonts and images before rasterizing

html-to-image captures the DOM as-is. If fonts or photos aren't loaded, the PNG is wrong. Always:

```ts
await document.fonts.ready;                 // self-hosted fonts loaded
await new Promise(r => requestAnimationFrame(() => r(null))); // one paint
```

Photos are object URLs from local Blobs (same-origin) so there are no CORS issues. Set `cacheBust: true` and a `pixelRatio` of 2 for crisp output.

## `lib/exportReport.ts` (write fully)

```ts
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

async function pageNodes(): Promise<HTMLElement[]> {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-report-page]"));
}

async function rasterizePages(): Promise<{ dataUrl: string; w: number; h: number }[]> {
  await document.fonts.ready;
  await new Promise(r => requestAnimationFrame(() => r(null)));
  const nodes = await pageNodes();
  const out: { dataUrl:string; w:number; h:number }[] = [];
  for (const node of nodes) {
    const dataUrl = await toPng(node, { pixelRatio: 2, cacheBust: true });
    out.push({ dataUrl, w: node.offsetWidth, h: node.offsetHeight });
  }
  return out;
}

export async function exportPng(filenameBase: string): Promise<File[]> {
  const pages = await rasterizePages();
  return Promise.all(pages.map(async (p, i) => {
    const blob = await (await fetch(p.dataUrl)).blob();
    return new File([blob], `${filenameBase}-hal-${i + 1}.png`, { type: "image/png" });
  }));
}

export async function exportPdf(filenameBase: string): Promise<File> {
  const pages = await rasterizePages();
  const first = pages[0];
  const pdf = new jsPDF({ orientation: first.h >= first.w ? "p" : "l", unit: "px",
    format: [first.w, first.h] });
  pages.forEach((p, i) => {
    if (i > 0) pdf.addPage([p.w, p.h], p.h >= p.w ? "p" : "l");
    pdf.addImage(p.dataUrl, "PNG", 0, 0, p.w, p.h);
  });
  const blob = pdf.output("blob");
  return new File([blob], `${filenameBase}.pdf`, { type: "application/pdf" });
}

export async function shareFiles(files: File[], title: string) {
  if (navigator.canShare?.({ files })) {
    await navigator.share({ files, title });
  } else {
    // fallback: trigger downloads
    for (const f of files) {
      const url = URL.createObjectURL(f);
      const a = document.createElement("a");
      a.href = url; a.download = f.name; a.click();
      URL.revokeObjectURL(url);
    }
  }
}
```

## UI wiring (MonthlyReport.tsx)

```ts
const base = `Laporan-${student.name}-${monthLabel}`.replace(/\s+/g, "-");
// Buttons:
//  "Bagikan Gambar"  -> shareFiles(await exportPng(base), base)
//  "Ekspor PDF"      -> shareFiles([await exportPdf(base)], base)
// After a successful export, set report.pdfGeneratedAt = now.
```

## Notes

- The report preview on screen IS the same DOM that gets rasterized — what you see is what you share.
- Default to **PNG images** for WhatsApp (inline preview, matches current workflow); offer PDF for archiving.
- Multi-page reports produce multiple PNGs (one per page) or one multi-page PDF.

## Acceptance (Phase 8)

- A rendered report exports to PNG (one file per page) and to a single multi-page PDF.
- Fonts and photos appear correctly in the exported image.
- On a phone, "Bagikan" opens the share sheet with the file(s); WhatsApp is a target.
