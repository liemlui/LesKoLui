import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LAYOUTS, getLayout } from "../template/layouts";
import { ReportRenderer } from "../template/ReportRenderer";
import { THEMES } from "../template/themes";
import type { ReportData } from "../template/types";

// Format tanggal HARUS sama dengan produksi (MonthlyReport):
// dayLabel("2026-06-12") → "Jumat, 12 Juni 2026" → split(",")[1] → "12 Juni 2026"
const data: ReportData = {
  studentName: "Alya",
  period: "Juni 2026",
  tutorName: "Ko Lui",
  entries: [
    {
      date: "12 Juni 2026",
      subject: "Matematika",
      narrative: "Detail lengkap sesi tersimpan rapi.",
      details: ["10:00-12:00", "2 jam", "Topik: Aljabar"],
      engagementScore: 8,
      engagementLabel: "Aktif",
    },
  ],
  summary: "Ringkasan bulan tersedia.",
};

// Data multi-sesi KRONOLOGIS awal→akhir bulan (sama seperti produksi):
// skor naik dari 5 (awal bulan) ke 9 (akhir bulan) = tren MENINGKAT
const multiData: ReportData = {
  ...data,
  entries: [
    { date: "5 Juni 2026", subject: "Matematika", narrative: "Sesi awal bulan.", engagementScore: 5 },
    { date: "19 Juni 2026", subject: "Fisika", narrative: "Sesi tengah bulan.", engagementScore: 7 },
    { date: "26 Juni 2026", subject: "Fisika", narrative: "Sesi akhir bulan.", engagementScore: 9 },
  ],
};

describe("report layouts", () => {
  it("does not expose cover as a normal report layout", () => {
    expect(LAYOUTS.map((layout) => layout.id)).not.toContain("cover");
    expect(getLayout("cover").id).toBe("cards");
  });

  it("renders session subject and details in every selectable layout", () => {
    for (const layout of LAYOUTS) {
      const html = renderToStaticMarkup(layout.render(data, THEMES[0], { isFirst: true, isLast: true }));
      expect(html, layout.id).toContain("Matematika");
      expect(html, layout.id).toContain("Detail lengkap sesi");
    }
  });

  it("renders a compact next-month plan on the last page", () => {
    const planned: ReportData = {
      ...data,
      nextMonthPlan: {
        priorities: [{
          id: "plan-1",
          subject: "Matematika",
          evidence: "Operasi tanda masih perlu teliti.",
          target: "Menyelesaikan 8/10 soal fungsi kuadrat dengan langkah lengkap.",
          tutorAction: "Latihan bertahap dan cek langkah.",
          successMetric: "8/10 soal tepat",
          cadence: "2 sesi per minggu",
          owner: "shared",
          status: "planned",
        }],
        parentSupport: "Latihan mandiri 10 menit dua kali seminggu.",
      },
    };
    const html = renderToStaticMarkup(getLayout("cards").render(planned, THEMES[0], { isFirst: true, isLast: true }));
    expect(html).toContain("Fokus &amp; Rencana Berikutnya");
    expect(html).toContain("Menyelesaikan 8/10 soal fungsi kuadrat");
    expect(html).toContain("Dukungan di rumah");
  });

  it("parses the production date format ('12 Juni 2026') without NaN or stray year", () => {
    for (const layout of LAYOUTS) {
      const html = renderToStaticMarkup(layout.render(multiData, THEMES[0], { isFirst: true, isLast: true }));
      expect(html, `${layout.id} must not render NaN`).not.toContain("NaN");
      // Tahun tidak boleh tampil sebagai teks berdiri sendiri (mis. kolom tanggal "2026")
      expect(html, `${layout.id} must not show bare year`).not.toContain(">2026<");
    }
  });

  it("weekly groups by day-of-month (12 Juni → Minggu 2)", () => {
    const html = renderToStaticMarkup(getLayout("weekly").render(data, THEMES[0], { isFirst: true, isLast: true }));
    expect(html).toContain("Minggu 2");
  });

  it("journal shows the day number as the big numeral", () => {
    const html = renderToStaticMarkup(getLayout("journal").render(data, THEMES[0], { isFirst: true, isLast: true }));
    expect(html).toContain(">12</p>");
    expect(html).toContain(">Juni</p>");
  });

  it("compare reads chronological entries as an IMPROVING trend when scores rise over the month", () => {
    const html = renderToStaticMarkup(getLayout("compare").render(multiData, THEMES[0], { isFirst: true, isLast: true }));
    expect(html).toContain("Meningkat");
    expect(html).not.toContain("Menurun");
  });

  it("solid labels use dark text on bright palette colors (stays readable)", () => {
    // Palet neon-kuning terang dengan label solid "pill" → teks label harus gelap, bukan putih
    const bright = { ...THEMES[0], label: "pill" as const, palette: ["#ffea00", "#39ff14", "#00f0ff", "#ffea00"] };
    const html = renderToStaticMarkup(getLayout("cards").render(data, bright, { isFirst: true, isLast: true }));
    expect(html).toContain("color:#1f2937");
    // Palet gelap tetap putih
    const dark = { ...THEMES[0], label: "pill" as const, palette: ["#1d3a5d", "#15314f", "#1d3a5d", "#15314f"] };
    const html2 = renderToStaticMarkup(getLayout("cards").render(data, dark, { isFirst: true, isLast: true }));
    expect(html2).toContain("color:#fff");
  });

  it("vintage photo style applies a CSS filter (not an invalid background)", () => {
    const watercolor = THEMES.find((t) => t.photo === "vintage")!;
    const withPhoto: ReportData = {
      ...data,
      entries: [{ ...data.entries[0], photoUrl: "data:image/png;base64,x" }],
    };
    const html = renderToStaticMarkup(getLayout("cards").render(withPhoto, watercolor, { isFirst: true, isLast: true }));
    expect(html).toContain("filter:sepia");
    expect(html).not.toContain("background:sepia");
  });

  it("per-mapel layout hides the engagement average when no session has a score", () => {
    const noScores: ReportData = {
      ...data,
      entries: [{ date: "12 Juni 2026", subject: "Matematika", narrative: "Catatan." }],
    };
    const html = renderToStaticMarkup(getLayout("subjects").render(noScores, THEMES[0], { isFirst: true, isLast: true }));
    expect(html).not.toContain("avg 0/10");
  });

  it("dense layouts hold more entries per page than photo-heavy ones", () => {
    // Layout foto besar tetap 4/halaman; layout ringkas dinaikkan
    for (const id of ["cards", "timeline", "scrapbook", "portfolio", "split", "overview"]) {
      expect(getLayout(id).maxEntriesPerPage, id).toBe(4);
    }
    expect(getLayout("reportcard").maxEntriesPerPage).toBe(10);
    expect(getLayout("compact").maxEntriesPerPage).toBe(8);
    expect(getLayout("minimal").maxEntriesPerPage).toBe(8);
    for (const layout of LAYOUTS) {
      expect(layout.maxEntriesPerPage, layout.id).toBeGreaterThanOrEqual(4);
    }
  });

  it("dashboard KPI uses full-month aggregates when provided", () => {
    const aggregated: ReportData = {
      ...multiData,
      totalSessions: 10,
      subjectDist: [
        { name: "Fisika", count: 6 },
        { name: "Matematika", count: 4 },
      ],
    };
    const html = renderToStaticMarkup(getLayout("dashboard").render(aggregated, THEMES[0], { isFirst: true, isLast: true }));
    expect(html).toContain(">10</p>"); // Sesi = totalSessions, bukan 3 entri halaman ini
  });

  it("ReportRenderer applies 3:4 ratio class by default (WhatsApp-friendly)", () => {
    const html = renderToStaticMarkup(
      <ReportRenderer data={data} theme={THEMES[0]} layoutId="cards" />
    );
    expect(html).toContain('class="report-ratio-3-4"');
  });

  it("ReportRenderer omits ratio class when pageRatio is auto (PDF)", () => {
    const html = renderToStaticMarkup(
      <ReportRenderer data={data} theme={THEMES[0]} layoutId="cards" options={{ pageRatio: "auto" }} />
    );
    expect(html).not.toContain("report-ratio-3-4");
  });

  it("ReportRenderer respects entriesPerPage override", () => {
    const many: ReportData = {
      ...data,
      entries: [
        { date: "1 Juni 2026", subject: "Matematika", narrative: "Sesi 1." },
        { date: "2 Juni 2026", subject: "Fisika", narrative: "Sesi 2." },
        { date: "3 Juni 2026", subject: "Kimia", narrative: "Sesi 3." },
        { date: "4 Juni 2026", subject: "Biologi", narrative: "Sesi 4." },
        { date: "5 Juni 2026", subject: "Matematika", narrative: "Sesi 5." },
      ],
    };
    // 5 entri / 2 per halaman = 3 halaman
    const html = renderToStaticMarkup(
      <ReportRenderer data={many} theme={THEMES[0]} layoutId="cards" options={{ entriesPerPage: 2 }} />
    );
    expect(html.match(/data-report-page/g)?.length).toBe(3);
  });
});
