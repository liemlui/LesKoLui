import type { ReportData, Theme, ReportOptions } from "./types";
import { getLayout, cover as coverLayout } from "./layouts";
import { paginate } from "./paginate";

interface Props {
  data: ReportData;
  theme: Theme;
  layoutId: string;
  options?: ReportOptions;
}

export function ReportRenderer({ data, theme, layoutId, options }: Props) {
  const layout = getLayout(layoutId);
  const entriesPerPage = options?.entriesPerPage ?? layout.maxEntriesPerPage;
  const pages = paginate(data, entriesPerPage);
  const showCover = options?.coverPage;
  // Rasio halaman export: "3:4" (default) memberi halaman rasio tetap potret
  // agar gambar tidak terlalu tinggi dan terpotong di WhatsApp. "auto"
  // mempertahankan tinggi alami (dipakai PDF).
  const pageRatio = options?.pageRatio ?? "3:4";
  const ratioClass = pageRatio === "3:4" ? "report-ratio-3-4" : "";

  return (
    <div className={ratioClass}>
      {showCover && (
        <div id="report-page-cover" data-report-page style={{ marginBottom: 18 }}>
          {coverLayout.render(data, theme, { isFirst: true, isLast: false })}
        </div>
      )}
      {pages.map((page, i) => (
        <div key={i} id={`report-page-${i}`} data-report-page style={{ marginBottom: 18 }}>
          {layout.render(page, theme, { isFirst: i === 0, isLast: i === pages.length - 1 })}
        </div>
      ))}
    </div>
  );
}
