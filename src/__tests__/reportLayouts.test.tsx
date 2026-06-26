import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LAYOUTS, getLayout } from "../template/layouts";
import { THEMES } from "../template/themes";
import type { ReportData } from "../template/types";

const data: ReportData = {
  studentName: "Alya",
  period: "Juni 2026",
  tutorName: "Ko Lui",
  entries: [
    {
      date: "12 Juni",
      subject: "Matematika",
      narrative: "Detail lengkap sesi tersimpan rapi.",
      details: ["10:00-12:00", "2 jam", "Topik: Aljabar"],
      engagementScore: 8,
      engagementLabel: "Aktif",
    },
  ],
  summary: "Ringkasan bulan tersedia.",
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
});
