import { useEffect, useMemo, useState } from "react";
import type { ReportData, Theme, ReportOptions } from "./types";
import { getLayout, cover as coverLayout } from "./layouts";
import { COVER_PAGE_ID, initialSplits, pagesFromSplits } from "./rebalance";

interface Props {
  data: ReportData;
  theme: Theme;
  layoutId: string;
  options?: ReportOptions;
}

/**
 * Halaman laporan memakai tinggi OTOMATIS (mengikuti isi).
 *
 * Rasio tetap 3:4 dihapus (keputusan pemilik: "Rasio halaman 3:4 hilangkan
 * saja, semua Auto jadi ndak perlu pilihan rasio, cukup berapa sesi per
 * halaman"). Konsekuensinya: tidak ada lagi kotak potret yang memaksa narasi
 * terpotong atau memicu pengukuran ulang/rebalancing berbasis tinggi.
 * Yang tersisa hanyalah paginasi jumlah: sesi dibagi `entriesPerPage` per
 * halaman, dan setiap halaman tumbuh setinggi isinya.
 */
export function ReportRenderer({ data, theme, layoutId, options }: Props) {
  const layout = getLayout(layoutId);
  const entriesPerPage = options?.entriesPerPage ?? layout.maxEntriesPerPage;
  const showCover = options?.coverPage;

  const totalEntries = data.entries.length;
  const [splits, setSplits] = useState<number[] | null>(() =>
    initialSplits(entriesPerPage, totalEntries),
  );

  // Reset pembagian saat input berubah → halaman dihitung ulang dari awal.
  useEffect(() => {
    setSplits(initialSplits(entriesPerPage, totalEntries));
  }, [entriesPerPage, totalEntries, data, theme, layoutId]);

  const pages = useMemo(
    () => pagesFromSplits(data, splits, entriesPerPage),
    [data, splits, entriesPerPage],
  );

  return (
    <div>
      {showCover && (
        <div id={COVER_PAGE_ID} data-report-page style={{ marginBottom: 18 }}>
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
