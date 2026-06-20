import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

async function pageNodes(): Promise<HTMLElement[]> {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-report-page]"));
}

async function rasterizePages(): Promise<{ dataUrl: string; w: number; h: number }[]> {
  await document.fonts.ready;
  await new Promise((r) => requestAnimationFrame(() => r(null)));
  const nodes = await pageNodes();
  const out: { dataUrl: string; w: number; h: number }[] = [];
  for (const node of nodes) {
    const dataUrl = await toPng(node, { pixelRatio: 2, cacheBust: true });
    out.push({ dataUrl, w: node.offsetWidth, h: node.offsetHeight });
  }
  return out;
}

export async function exportPng(filenameBase: string): Promise<File[]> {
  const pages = await rasterizePages();
  return Promise.all(
    pages.map(async (p, i) => {
      const blob = await (await fetch(p.dataUrl)).blob();
      return new File([blob], `${filenameBase}-hal-${i + 1}.png`, { type: "image/png" });
    })
  );
}

export async function exportPdf(filenameBase: string): Promise<File> {
  const pages = await rasterizePages();
  if (pages.length === 0) throw new Error("No report pages found");
  const first = pages[0];
  const pdf = new jsPDF({
    orientation: first.h >= first.w ? "p" : "l",
    unit: "px",
    format: [first.w, first.h],
  });
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
    for (const f of files) {
      const url = URL.createObjectURL(f);
      const a = document.createElement("a");
      a.href = url;
      a.download = f.name;
      a.click();
      URL.revokeObjectURL(url);
    }
  }
}
