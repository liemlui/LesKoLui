type HtmlToImageModule = typeof import("html-to-image");
type JsPdfModule = typeof import("jspdf");

let htmlToImagePromise: Promise<HtmlToImageModule> | undefined;
let jsPdfPromise: Promise<JsPdfModule> | undefined;

export function loadHtmlToImage(): Promise<HtmlToImageModule> {
  htmlToImagePromise ??= import("html-to-image");
  return htmlToImagePromise;
}

export function loadJsPdf(): Promise<JsPdfModule> {
  jsPdfPromise ??= import("jspdf");
  return jsPdfPromise;
}
