import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import type { Session } from "../db/types";
import { blobToDataUrl } from "./imageUtils";

interface AbsensiOptions {
  studentName: string;
  month: string; // "YYYY-MM"
  sessions: Session[];
  hourlyRate: number;
  tutorName: string;
  bankAccounts?: { bca?: string; cimb?: string; bri?: string; mandiri?: string; bsi?: string; ewallet?: string; accountName?: string };
  signatureDataUrls?: Map<string, string>; // sessionId → base64 data URL
}

// A4 at 96dpi = 794×1123px. We use 750px width to leave safe margin.
const PAGE_W = 750;
const ROWS_PER_PAGE = 20;

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/`/g, "&#96;");
}

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + mins;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}.${String(mm).padStart(2, "0")}`;
}

function fmtTime(t: string): string {
  return t.replace(":", ".");
}

function fmtDate(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  const months = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Ags","Sep","Okt","Nov","Des"];
  const yr = dateStr.slice(2, 4);
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${yr}`;
}

function monthLabel(month: string): string {
  const [, m] = month.split("-");
  const months = ["Januari","Februari","Maret","April","Mei","Juni",
    "Juli","Agustus","September","Oktober","November","Desember"];
  const yr = month.slice(0, 4);
  return `${months[parseInt(m) - 1]} ${yr}`;
}

function buildPageHtml(
  rows: Array<{ no: number; dur: number; date: string; masuk: string; keluar: string; materi: string; sigDataUrl?: string }>,
  opts: AbsensiOptions,
  pageIdx: number,
  totalPages: number,
  isLastPage: boolean,
  totalHours: number,
): string {
  const { studentName, month, hourlyRate, tutorName, bankAccounts } = opts;
  const total = totalHours * hourlyRate;
  const border = "1px solid #444";
  const cellBase = `border:${border};padding:5px 6px;`;

  const dataRows = rows.map((r) => `
    <tr style="height:28px">
      <td style="${cellBase}text-align:center;font-size:10px;color:#777;font-style:italic">${r.dur > 0 ? r.dur + "j" : ""}</td>
      <td style="${cellBase}text-align:center;font-size:11px;font-weight:700">${r.no}</td>
      <td style="${cellBase}font-size:11px;white-space:nowrap">${esc(r.date)}</td>
      <td style="${cellBase}text-align:center;font-size:11px;font-weight:600">${esc(r.masuk)}</td>
      <td style="${cellBase}text-align:center;font-size:11px;font-weight:600">${esc(r.keluar)}</td>
      <td style="${cellBase}font-size:10px">${esc(r.materi)}</td>
      <td style="${cellBase}text-align:center;padding:2px 4px">
        ${r.sigDataUrl
          ? `<img src="${esc(r.sigDataUrl)}" style="max-width:64px;max-height:22px;object-fit:contain;vertical-align:middle">`
          : `<span style="font-size:9px;color:#ccc">—</span>`}
      </td>
      <td style="${cellBase}"></td>
    </tr>`).join("");

  // Fill empty rows
  const emptyCount = ROWS_PER_PAGE - rows.length;
  const emptyRows = Array.from({ length: emptyCount }, (_, i) => `
    <tr style="height:28px">
      <td style="${cellBase}"></td>
      <td style="${cellBase}text-align:center;font-size:10px;color:#ddd">${rows.length + i + 1}</td>
      <td style="${cellBase}"></td>
      <td style="${cellBase}"></td>
      <td style="${cellBase}"></td>
      <td style="${cellBase}"></td>
      <td style="${cellBase}"></td>
      <td style="${cellBase}"></td>
    </tr>`).join("");

  const totalRow = isLastPage ? `
    <tr style="height:32px">
      <td colspan="3" style="${cellBase}"></td>
      <td colspan="3" style="${cellBase}font-size:12px;font-weight:700;color:#1e40af">
        ${totalHours}j × Rp ${hourlyRate.toLocaleString("id-ID")} = Rp ${total.toLocaleString("id-ID")}
      </td>
      <td colspan="2" style="${cellBase}"></td>
    </tr>` : "";

  const anyBank = bankAccounts && (bankAccounts.bca || bankAccounts.mandiri || bankAccounts.bri || bankAccounts.cimb || bankAccounts.bsi || bankAccounts.ewallet);
  const bankRow = isLastPage && anyBank ? `
    <tr>
      <td colspan="3" style="${cellBase}font-size:10px;font-weight:600;color:#555">Transfer via:</td>
      <td colspan="5" style="${cellBase}font-size:10px;color:#333">
        ${[
          bankAccounts!.bca     ? `BCA: <strong>${esc(bankAccounts!.bca)}</strong>` : "",
          bankAccounts!.mandiri ? `Mandiri: <strong>${esc(bankAccounts!.mandiri)}</strong>` : "",
          bankAccounts!.bri     ? `BRI: <strong>${esc(bankAccounts!.bri)}</strong>` : "",
          bankAccounts!.cimb    ? `CIMB: <strong>${esc(bankAccounts!.cimb)}</strong>` : "",
          bankAccounts!.bsi     ? `BSI: <strong>${esc(bankAccounts!.bsi)}</strong>` : "",
          bankAccounts!.ewallet ? `GoPay/OVO/DANA: <strong>${esc(bankAccounts!.ewallet)}</strong>` : "",
        ].filter(Boolean).join("  &nbsp;·&nbsp;  ")}
        ${bankAccounts!.accountName ? `<br>a.n. <strong>${esc(bankAccounts!.accountName)}</strong>` : ""}
      </td>
    </tr>` : "";

  const signRow = isLastPage ? `
    <tr>
      <td colspan="5" style="${cellBase}font-size:10px;color:#555;padding:10px 6px">
        Hormat kami,<br><br><br>
        <strong>${esc(tutorName || "Ko Lui")}</strong>
      </td>
      <td colspan="3" style="${cellBase}font-size:10px;color:#555;padding:10px 6px;text-align:center">
        Disetujui,<br><br><br>
        (Orang Tua / Murid)
      </td>
    </tr>` : "";

  return `<div style="
      width:${PAGE_W}px;
      background:#fff;
      padding:32px 36px;
      box-sizing:border-box;
      font-family:Arial,Helvetica,sans-serif;
    ">
    <p style="text-align:center;font-weight:900;font-size:16px;letter-spacing:3px;margin:0 0 4px">ABSENSI LES PRIVAT</p>
    <p style="text-align:center;font-size:11px;color:#666;margin:0 0 16px">
      ${monthLabel(month)}${totalPages > 1 ? ` — Hal ${pageIdx + 1} / ${totalPages}` : ""}
    </p>

    <div style="display:flex;gap:0;margin-bottom:14px;font-size:12px">
      <div style="flex:1">
        <span style="color:#555">Nama Murid</span>
        <span style="font-weight:700;margin-left:8px">: ${esc(studentName)}</span>
      </div>
      <div>
        <span style="color:#555">Tutor</span>
        <span style="font-weight:700;margin-left:8px">: ${esc(tutorName || "Ko Lui")}</span>
      </div>
    </div>

    <table style="width:100%;border-collapse:collapse;border:${border}">
      <thead>
        <tr style="background:#fde8d0">
          <th style="${cellBase}font-size:10px;font-weight:700;width:36px;text-align:center">Durasi</th>
          <th style="${cellBase}font-size:10px;font-weight:700;width:32px;text-align:center">No</th>
          <th style="${cellBase}font-size:10px;font-weight:700;width:90px">Tanggal</th>
          <th style="${cellBase}font-size:10px;font-weight:700;width:62px;text-align:center">Jam Masuk</th>
          <th style="${cellBase}font-size:10px;font-weight:700;width:62px;text-align:center">Jam Keluar</th>
          <th style="${cellBase}font-size:10px;font-weight:700">Materi</th>
          <th style="${cellBase}font-size:10px;font-weight:700;width:72px;text-align:center">TTD Murid</th>
          <th style="${cellBase}font-size:10px;font-weight:700;width:72px;text-align:center">TTD Guru</th>
        </tr>
      </thead>
      <tbody>
        ${dataRows}
        ${emptyRows}
        ${totalRow}
        ${bankRow}
        ${signRow}
      </tbody>
    </table>
  </div>`;
}

export async function exportAbsensiPdf(opts: AbsensiOptions): Promise<void> {
  const { sessions, month } = opts;
  const done = sessions
    .filter((s) => s.status === "DONE" && s.date.startsWith(month))
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalHours = done.reduce((sum, s) => sum + s.durationHours, 0);

  // Pre-convert signatures to base64 data URLs (needed for off-screen HTML rendering)
  const sigDataUrls = opts.signatureDataUrls ?? new Map<string, string>();
  if (!opts.signatureDataUrls) {
    for (const s of done) {
      if (s.signature) sigDataUrls.set(s.id, await blobToDataUrl(s.signature));
    }
  }

  const rows = done.map((s, i) => {
    // Prefer auto-recorded timeIn/timeOut; fall back to scheduled time
    const masuk  = s.timeIn  ? fmtTime(s.timeIn)
                 : s.time    ? fmtTime(s.time)
                 : "--:--";
    const keluar = s.timeOut ? fmtTime(s.timeOut)
                 : s.time    ? addMinutes(s.time, Math.round(s.durationHours * 60))
                 : "--:--";
    const materi = [
      s.subjects?.join(", "),
      s.topic,
      s.shortNote,
    ].filter(Boolean).join(" — ").slice(0, 80);
    return { no: i + 1, dur: s.durationHours, date: fmtDate(s.date), masuk, keluar, materi, sigDataUrl: sigDataUrls.get(s.id) };
  });

  // Chunk into pages of ROWS_PER_PAGE
  const chunks: typeof rows[] = [];
  for (let i = 0; i < Math.max(rows.length, 1); i += ROWS_PER_PAGE) {
    chunks.push(rows.slice(i, i + ROWS_PER_PAGE));
  }
  if (chunks.length === 0) chunks.push([]);

  // Build off-screen container — use absolute positioning so toPng captures the full element
  const wrapper = document.createElement("div");
  wrapper.style.cssText = [
    "position:absolute",
    "top:0",
    `left:${-(PAGE_W + 100)}px`,
    "z-index:-9999",
    "pointer-events:none",
  ].join(";");

  chunks.forEach((pageRows, idx) => {
    const pageDiv = document.createElement("div");
    pageDiv.innerHTML = buildPageHtml(pageRows, opts, idx, chunks.length, idx === chunks.length - 1, totalHours);
    wrapper.appendChild(pageDiv);
  });

  document.body.appendChild(wrapper);
  await document.fonts.ready;
  // Two rAF ticks to let layout fully settle
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));

  let pdfUrl: string | null = null;
  try {
    let pdf: InstanceType<typeof jsPDF> | null = null;
    const pageDivs = Array.from(wrapper.children) as HTMLElement[];

    for (let i = 0; i < pageDivs.length; i++) {
      const node = pageDivs[i].firstElementChild as HTMLElement;
      if (!node) continue;

      const w = node.scrollWidth;
      const h = node.scrollHeight;

      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        cacheBust: true,
        width: w,
        height: h,
        style: { overflow: "visible", display: "block" },
      });

      if (!pdf) {
        pdf = new jsPDF({ orientation: "p", unit: "px", format: [w, h] });
      } else {
        pdf.addPage([w, h], "p");
      }
      pdf.addImage(dataUrl, "PNG", 0, 0, w, h);
    }

    if (!pdf) return;
    const blob = pdf.output("blob");
    pdfUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = `absensi-${opts.studentName.replace(/\s+/g, "-")}-${month}.pdf`;
    a.click();
  } finally {
    document.body.removeChild(wrapper);
    if (pdfUrl) {
      // Delay revoke so browser can start the download
      const urlToRevoke = pdfUrl;
      requestAnimationFrame(() => requestAnimationFrame(() => URL.revokeObjectURL(urlToRevoke)));
    }
  }
}
