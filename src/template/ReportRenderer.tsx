import type { ReportData, Theme } from "./types";
import { getLayout } from "./layouts";
import { paginate } from "./paginate";

interface Props {
  data: ReportData;
  theme: Theme;
  layoutId: string;
}

export function ReportRenderer({ data, theme, layoutId }: Props) {
  const layout = getLayout(layoutId);
  const pages = paginate(data, layout.maxEntriesPerPage);

  return (
    <div>
      {pages.map((page, i) => (
        <div key={i} id={`report-page-${i}`} data-report-page style={{ marginBottom: 18 }}>
          {layout.render(page, theme, { isFirst: i === 0, isLast: i === pages.length - 1 })}
        </div>
      ))}
    </div>
  );
}
