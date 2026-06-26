import { loadHtmlToImage, loadJsPdf } from "./exportDeps";

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, b64] = dataUrl.split(",");
  const mime = header.split(":")[1].split(";")[0];
  const bytes = atob(b64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

async function pageNodes(root: ParentNode = document): Promise<HTMLElement[]> {
  return Array.from(root.querySelectorAll<HTMLElement>("[data-report-page]"));
}

async function rasterizePages(
  format: "jpeg" | "png" = "jpeg",
  root: ParentNode = document,
): Promise<{ dataUrl: string; w: number; h: number }[]> {
  await document.fonts.ready;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
  const nodes = await pageNodes(root);
  if (nodes.length === 0) throw new Error("Buat laporan terlebih dahulu, lalu scroll ke bagian Pratinjau.");
  const out: { dataUrl: string; w: number; h: number }[] = [];
  const { toJpeg, toPng } = await loadHtmlToImage();
  for (const node of nodes) {
    node.scrollIntoView({ block: "nearest" });
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    const dataUrl = format === "png"
      ? await toPng(node, { pixelRatio: 2, cacheBust: false, skipFonts: true, style: { overflow: "visible" } })
      : await toJpeg(node, { pixelRatio: 2, quality: 0.92, cacheBust: false, skipFonts: true, style: { overflow: "visible" } });
    out.push({ dataUrl, w: node.offsetWidth, h: node.offsetHeight });
  }
  return out;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function exportJpeg(filenameBase: string, multiFile = false, root: ParentNode = document): Promise<File[]> {
  const pages = await rasterizePages("jpeg", root);
  if (pages.length === 0) return [];
  if (pages.length === 1 || multiFile) {
    return pages.map((p, i) => {
      const blob = dataUrlToBlob(p.dataUrl);
      const name = multiFile && pages.length > 1 ? `${filenameBase}-${i + 1}.jpg` : `${filenameBase}.jpg`;
      return new File([blob], name, { type: "image/jpeg" });
    });
  }
  // Combine all pages into one tall image
  const PR = 2;
  const canvasW = Math.max(...pages.map((p) => p.w)) * PR;
  const canvasH = pages.reduce((sum, p) => sum + p.h, 0) * PR;
  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasW, canvasH);
  let yPx = 0;
  for (const page of pages) {
    const img = await loadImage(page.dataUrl);
    ctx.drawImage(img, 0, yPx, page.w * PR, page.h * PR);
    yPx += page.h * PR;
  }
  const blob = dataUrlToBlob(canvas.toDataURL("image/jpeg", 0.92));
  return [new File([blob], `${filenameBase}.jpg`, { type: "image/jpeg" })];
}

export async function exportPng(filenameBase: string, root: ParentNode = document): Promise<File[]> {
  const pages = await rasterizePages("png", root);
  if (pages.length === 0) return [];
  return pages.map((p, i) => {
    const blob = dataUrlToBlob(p.dataUrl);
    const name = pages.length > 1 ? `${filenameBase}-${i + 1}.png` : `${filenameBase}.png`;
    return new File([blob], name, { type: "image/png" });
  });
}

export async function exportPdf(filenameBase: string, root: ParentNode = document): Promise<File> {
  const pages = await rasterizePages("jpeg", root);
  if (pages.length === 0) throw new Error("No report pages found");
  const { jsPDF } = await loadJsPdf();
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

export async function shareFiles(files: File[], title: string) {
  // Try Web Share API first (mobile-friendly)
  if (typeof navigator !== "undefined" && navigator.share && navigator.canShare?.({ files })) {
    try {
      await navigator.share({ files, title });
      return;
    } catch {
      // Fall through to download
    }
  }
  // Fallback: download via anchor
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
