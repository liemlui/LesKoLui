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
  const pages = paginate(data, layout.maxEntriesPerPage);
  const showCover = options?.coverPage;

  return (
    <div>
      {showCover && (
        <div id="report-page-cover" data-report-page style={{ marginBottom: 18 }}>
          {coverLayout.render(data, theme, { isFirst: true, isLast: false })}
        </div>
      )}
      {pages.map((page, i) => (
        <div key={i} id={`report-page-${i}`} data-report-page style={{ marginBottom: 18 }}>
          {layout.render(page, theme, { isFirst: !showCover && i === 0, isLast: i === pages.length - 1 })}
        </div>
      ))}
    </div>
  );
}
