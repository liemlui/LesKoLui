import { loadHtmlToImage, loadJsPdf } from "./exportDeps";
import { COVER_PAGE_ID } from "../template/rebalance";

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

export interface OverflowIssue {
  pageId: string;
  overflowPx: number;
}

/** Jumlah halaman laporan yang sedang dirender di sebuah akar render.
 *  Dipakai keterangan pratinjau ("N halaman") supaya jumlah halaman yang
 *  dilihat tutor sama dengan yang akan diekspor. */
export function countReportPages(root: ParentNode = document): number {
  return root.querySelectorAll("[data-report-page]").length;
}

/**
 * Deteksi halaman laporan yang isinya terpotong.
 *
 * Sejak pemilih rasio 3:4 dihapus, halaman selalu bertinggi otomatis sehingga
 * `scrollHeight` tidak lagi melebihi `clientHeight` — fungsi ini dipertahankan
 * sebagai jaring pengaman (mis. tema kustom yang memberi tinggi tetap) dan
 * mengembalikan array kosong pada keadaan normal.
 */
export function detectOverflow(root: ParentNode = document): OverflowIssue[] {
  const issues: OverflowIssue[] = [];
  const nodes = root.querySelectorAll<HTMLElement>("[data-report-page]");
  nodes.forEach((el) => {
    if (el.id === COVER_PAGE_ID) return;
    const overflowPx = el.scrollHeight - el.clientHeight;
    if (overflowPx > 4) issues.push({ pageId: el.id || "(halaman tanpa id)", overflowPx });
  });
  return issues;
}

async function waitForImages(node: ParentNode): Promise<void> {
  const images = Array.from(node.querySelectorAll<HTMLImageElement>("img"));
  await Promise.all(images.map(async (img) => {
    if (!img.complete) {
      await new Promise<void>((resolve) => {
        const done = () => {
          img.removeEventListener("load", done);
          img.removeEventListener("error", done);
          resolve();
        };
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
        // Tutup race bila gambar selesai di antara pengecekan dan pemasangan listener.
        if (img.complete) done();
      });
    }
    try { await img.decode?.(); } catch { /* gambar rusak ditangani renderer */ }
  }));
}

function exportPixelRatio(node: HTMLElement): number {
  // Preview HP lebih sempit daripada desktop. Naikkan densitas raster tanpa
  // mengubah geometri layout agar hasil tetap tajam sekaligus WYSIWYG.
  const targetWidth = 1200;
  return Math.min(3, Math.max(2, targetWidth / Math.max(1, node.offsetWidth)));
}

async function rasterizePages(
  format: "jpeg" | "png" = "jpeg",
  root: ParentNode = document,
): Promise<{ dataUrl: string; w: number; h: number }[]> {
  await document.fonts.ready;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
  const nodes = await pageNodes(root);
  if (nodes.length === 0) throw new Error("Buat laporan terlebih dahulu, lalu scroll ke bagian Pratinjau.");
  await Promise.all(nodes.map(waitForImages));

  // Jaring pengaman pre-flight: halaman yang benar-benar meluap (bukan cover)
  // ketahuan sebelum raster agar hasil export tidak terpotong diam-diam.
  const overflow = detectOverflow(root);
  if (overflow.length > 0) {
    const detail = overflow.map((o) => `${o.pageId} (+${o.overflowPx}px)`).join(", ");
    throw new Error(`Konten melebihi halaman export (${detail}). Kurangi sesi per halaman atau pilih layout lain.`);
  }

  const out: { dataUrl: string; w: number; h: number }[] = [];
  const { toJpeg, toPng, getFontEmbedCSS } = await loadHtmlToImage();

  // Font HARUS di-embed ke SVG hasil render: rasterisasi terjadi di dalam <img>
  // yang terisolasi dari dokumen, jadi font tema (Pacifico/Caveat/Fredoka dll.)
  // tidak terbawa tanpa embed dan export jatuh ke font default sistem.
  // Font self-hosted (@fontsource) → fetch same-origin, aman dari CORS.
  // Dihitung SEKALI lalu dipakai semua halaman agar tidak lambat.
  // Timeout 5 dtk: jika embed gagal/terlalu lama, export tetap jalan tanpa embed.
  let fontEmbedCSS: string | undefined;
  try {
    const embedTimeout = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error("Font embed timeout")), 5000),
    );
    fontEmbedCSS = await Promise.race([getFontEmbedCSS(nodes[0]), embedTimeout]);
  } catch { /* fallback: tanpa embed — export tetap sukses */ }
  const fontOpts = fontEmbedCSS ? { fontEmbedCSS } : { skipFonts: true };

  for (const node of nodes) {
    if (root === document) node.scrollIntoView({ block: "nearest" });
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    const pixelRatio = exportPixelRatio(node);
    // Halaman bertinggi otomatis: rasterisasi memakai geometri halaman apa
    // adanya sehingga tidak ada konten yang dipotong (tidak ada lagi rasio
    // tetap dengan overflow:hidden).
    const dataUrl = format === "png"
      ? await toPng(node, { pixelRatio, cacheBust: false, ...fontOpts })
      : await toJpeg(node, { pixelRatio, quality: 0.94, cacheBust: false, ...fontOpts });
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

/** Unduh satu berkas lewat `<a download>` — satu gestur pengguna, satu berkas. */
export function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * Menyerahkan hasil ekspor ke pengguna, dan **mengembalikan berkas yang belum
 * terkirim**.
 *
 * Kenapa tidak mengunduh semuanya sekaligus: peramban hanya mengizinkan **satu**
 * unduhan otomatis per gestur pengguna. Versi lama fungsi ini mengklik N tautan
 * `<a download>` berurutan (jeda 500 ms) — Chrome/Edge memblokirnya, dan di HP
 * hanya berkas terakhir yang tersimpan. Dilaporkan pemilik 2026-10-04: "ekspor
 * JPG/PNG menawarkan gambar berikutnya dan berikutnya, akhirnya yang terunduh
 * hanya yang akhir; PDF aman karena satu berkas".
 *
 * Aturan sekarang:
 *  - **1 berkas** → Web Share bila ada, jika tidak unduhan otomatis.
 *  - **banyak berkas** → Web Share multi-berkas bila didukung (Android/iOS
 *    mengirim semuanya sekaligus); jika tidak, berkas **pertama** diunduh
 *    sekarang dan **sisanya dikembalikan** agar pemanggil menampilkannya sebagai
 *    tombol unduh per halaman (tiap ketukan = gestur yang sah).
 */
/** Hasil penyerahan berkas: sisa yang belum terkirim + cara berkas pertama pergi. */
export interface DeliveryResult {
  /** Berkas yang belum terkirim — pemanggil menampilkannya sebagai tombol per halaman. */
  remaining: File[];
  /** `share` = lembar berbagi sistem terbuka; `download` = berkas pertama diunduh. */
  via: "share" | "download";
}

export async function deliverFiles(
  files: File[],
  title: string,
  /** Diberi tahu cara berkas pergi SEBELUM penyerahan dimulai, supaya layar bisa
   *  menampilkan tahap yang benar ("mengunduh berkas" vs "lembar berbagi dibuka"). */
  onVia?: (via: "share" | "download") => void,
): Promise<DeliveryResult> {
  if (files.length === 0) return { remaining: [], via: "download" };

  const shareData = { files, title };
  const shareSupported = typeof navigator !== "undefined"
    && typeof navigator.share === "function"
    && (files.length === 1 || navigator.canShare?.(shareData) === true);
  if (shareSupported) {
    try {
      onVia?.("share");
      await navigator.share(shareData);
      return { remaining: [], via: "share" };
    } catch { /* dibatalkan / gagal — jatuh ke unduhan */ }
  }

  onVia?.("download");
  downloadFile(files[0]);
  return { remaining: files.slice(1), via: "download" };
}
