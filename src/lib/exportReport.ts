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
  const { toJpeg, toPng, getFontEmbedCSS } = await loadHtmlToImage();

  // Font HARUS di-embed ke SVG hasil render: rasterisasi terjadi di dalam <img>
  // yang terisolasi dari dokumen, jadi font tema (Pacifico/Caveat/Fredoka dll.)
  // tidak terbawa tanpa embed dan export jatuh ke font default sistem.
  // Font self-hosted (@fontsource) → fetch same-origin, aman dari CORS.
  // Dihitung SEKALI lalu dipakai semua halaman agar tidak lambat.
  let fontEmbedCSS: string | undefined;
  try { fontEmbedCSS = await getFontEmbedCSS(nodes[0]); } catch { /* fallback: tanpa embed */ }
  const fontOpts = fontEmbedCSS ? { fontEmbedCSS } : { skipFonts: true };

  for (const node of nodes) {
    // Root khusus export dirender di luar viewport (fixed, left -10000) — tidak
    // perlu scrollIntoView karena bisa menggeser layar pengguna.
    if (root === document) node.scrollIntoView({ block: "nearest" });
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    const dataUrl = format === "png"
      ? await toPng(node, { pixelRatio: 2, cacheBust: false, ...fontOpts, style: { overflow: "visible" } })
      : await toJpeg(node, { pixelRatio: 2, quality: 0.92, cacheBust: false, ...fontOpts, style: { overflow: "visible" } });
    out.push({ dataUrl, w: node.offsetWidth, h: node.offsetHeight });
  }
  return out;
}

export async function exportJpeg(filenameBase: string, root: ParentNode = document): Promise<File[]> {
  const pages = await rasterizePages("jpeg", root);
  if (pages.length === 0) return [];
  // Always output separate files per page — combining into one tall image is impractical
  return pages.map((p, i) => {
    const blob = dataUrlToBlob(p.dataUrl);
    const name = pages.length > 1 ? `${filenameBase}-${i + 1}.jpg` : `${filenameBase}.jpg`;
    return new File([blob], name, { type: "image/jpeg" });
  });
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
  if (files.length === 0) return;

  // Try Web Share API first (mobile-friendly) — works best for single files
  if (files.length === 1 && typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ files, title });
      return;
    } catch { /* fall through to download */ }
  }

  // Multi-file or share API unavailable: download sequentially
  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
  for (const f of files) {
    const url = URL.createObjectURL(f);
    const a = document.createElement("a");
    a.href = url;
    a.download = f.name;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Delay between downloads so browser registers each as a separate click
    await delay(500);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}
