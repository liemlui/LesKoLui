import { toJpeg } from "html-to-image";
import { jsPDF } from "jspdf";

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, b64] = dataUrl.split(",");
  const mime = header.split(":")[1].split(";")[0];
  const bytes = atob(b64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

async function pageNodes(): Promise<HTMLElement[]> {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-report-page]"));
}

async function rasterizePages(): Promise<{ dataUrl: string; w: number; h: number }[]> {
  await document.fonts.ready;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
  const nodes = await pageNodes();
  if (nodes.length === 0) throw new Error("Buat laporan terlebih dahulu, lalu scroll ke bagian Pratinjau.");
  const out: { dataUrl: string; w: number; h: number }[] = [];
  for (const node of nodes) {
    node.scrollIntoView({ block: "nearest" });
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    const dataUrl = await toJpeg(node, {
      pixelRatio: 2,
      quality: 0.92,
      cacheBust: false,  // blob URLs break when query string is appended
      skipFonts: true,   // avoid fetching Google Fonts; fonts already rendered in browser
      style: { overflow: "visible" },
    });
    out.push({ dataUrl, w: node.offsetWidth, h: node.offsetHeight });
  }
  return out;
}

export async function exportJpeg(filenameBase: string): Promise<File[]> {
  const pages = await rasterizePages();
  return pages.map((p, i) => {
    const blob = dataUrlToBlob(p.dataUrl); // no fetch() → no CSP issue
    return new File([blob], `${filenameBase}-hal-${i + 1}.jpg`, { type: "image/jpeg" });
  });
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
    pdf.addImage(p.dataUrl, "JPEG", 0, 0, p.w, p.h);
  });
  const blob = pdf.output("blob");
  return new File([blob], `${filenameBase}.pdf`, { type: "application/pdf" });
}

export async function shareFiles(files: File[], _title: string) {
  for (const f of files) {
    const url = URL.createObjectURL(f);
    const a = document.createElement("a");
    a.href = url;
    a.download = f.name;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
}
