import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReportData, Theme, ReportOptions } from "./types";
import { getLayout, cover as coverLayout } from "./layouts";
import { COVER_PAGE_ID, initialSplits, pagesFromSplits, ratioHeight3x4 } from "./rebalance";

interface Props {
  data: ReportData;
  theme: Theme;
  layoutId: string;
  options?: ReportOptions;
}

export function ReportRenderer({ data, theme, layoutId, options }: Props) {
  const layout = getLayout(layoutId);
  const entriesPerPage = options?.entriesPerPage ?? layout.maxEntriesPerPage;
  const showCover = options?.coverPage;
  // Rasio halaman export: "3:4" (default) memberi halaman rasio tetap potret
  // agar gambar tidak terlalu tinggi dan terpotong di WhatsApp. "auto"
  // mempertahankan tinggi alami (dipakai PDF).
  const pageRatio = options?.pageRatio ?? "3:4";
  const ratioClass = pageRatio === "3:4" ? "report-ratio-3-4" : "";

  // ── Rebalancing konten untuk rasio tetap (3:4) ─────────────────────
  // Paginasi berbasis jumlah buta: narasi panjang bisa melebihi tinggi kotak
  // 3:4, lalu overflow:hidden memotong catatan sesi. Halaman asli diukur
  // (scrollHeight vs tinggi rasio = lebar × 4/3) dan entri berlebih dipindah
  // ke halaman berikutnya sampai semua muat. Halaman yang tidak bisa
  // direbalans (cover, atau satu entri yang tetap terlalu tinggi) diberi izin
  // tumbuh (kelas .report-page-grow) alih-alih terpotong.
  const totalEntries = data.entries.length;
  const [splits, setSplits] = useState<number[] | null>(() =>
    initialSplits(entriesPerPage, totalEntries),
  );
  const [growPages, setGrowPages] = useState<Set<string>>(new Set());
  const [recheckTick, setRecheckTick] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  // Reset target saat input berubah → rebalance ulang dari awal.
  useEffect(() => {
    setSplits(initialSplits(entriesPerPage, totalEntries));
    setGrowPages(new Set());
  }, [entriesPerPage, totalEntries, data, theme, layoutId]);

  // Font tema dimuat asinkron dan mengubah tinggi teks → ukur ulang sekali
  // setelah fonts.ready agar hasil akhir tidak bergantung font fallback.
  useEffect(() => {
    document.fonts?.ready
      .then(() => setRecheckTick((t) => t + 1))
      .catch(() => {});
  }, []);

  // Ukur ulang saat ukuran jendela berubah (kotak 3:4 mengikuti lebar).
  useEffect(() => {
    const onResize = () => setRecheckTick((t) => t + 1);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useLayoutEffect(() => {
    if (pageRatio !== "3:4" || splits == null || totalEntries === 0 || !rootRef.current) return;
    const nodes = Array.from(rootRef.current.querySelectorAll<HTMLElement>("[data-report-page]"));
    if (nodes.length === 0) return;

    // Tinggi kotak 3:4 dihitung dari lebar asli — tetap valid walau halaman
    // sedang memakai kelas .report-page-grow (tinggi mengikuti isi).
    const overflows = (el: HTMLElement) => el.scrollHeight > ratioHeight3x4(el.offsetWidth) + 2;

    const entryNodes = nodes.filter((el) => el.id !== COVER_PAGE_ID);
    const nextGrow = new Set<string>();

    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i];
      if (!overflows(el)) continue;
      if (el.id === COVER_PAGE_ID) {
        nextGrow.add(el.id); // cover tanpa entri → tidak bisa dipindah
        continue;
      }
      const idx = entryNodes.indexOf(el);
      if (splits[idx] != null && splits[idx] > 1) {
        // Pindahkan satu entri ke halaman berikutnya; buat halaman baru
        // bila ini halaman terakhir. Satu pergeseran per pass — efek ini
        // berjalan lagi setelah render ulang sampai semua halaman muat.
        setSplits((prev) => {
          if (!prev || prev.length === 0) return prev;
          const next = [...prev];
          next[idx] = Math.max(1, next[idx] - 1);
          if (idx === next.length - 1) next.push(1);
          else next[idx + 1] += 1;
          return next;
        });
        return; // splits berubah → pass berikutnya mengukur ulang
      }
      nextGrow.add(el.id); // satu entri masih terlalu tinggi → biarkan tumbuh
    }

    // Tidak ada pergeseran: sinkronkan set halaman yang dibiarkan tumbuh.
    const same = nextGrow.size === growPages.size && [...nextGrow].every((id) => growPages.has(id));
    if (!same) setGrowPages(nextGrow);
  }, [pageRatio, splits, growPages, data, theme, layoutId, entriesPerPage, totalEntries, recheckTick]);

  const pages = useMemo(
    () => pagesFromSplits(data, splits, entriesPerPage),
    [data, splits, entriesPerPage],
  );

  return (
    <div ref={rootRef} className={ratioClass}>
      {showCover && (
        <div
          id={COVER_PAGE_ID}
          data-report-page
          className={growPages.has(COVER_PAGE_ID) ? "report-page-grow" : undefined}
          style={{ marginBottom: 18 }}
        >
          {coverLayout.render(data, theme, { isFirst: true, isLast: false })}
        </div>
      )}
      {pages.map((page, i) => (
        <div
          key={i}
          id={`report-page-${i}`}
          data-report-page
          className={growPages.has(`report-page-${i}`) ? "report-page-grow" : undefined}
          style={{ marginBottom: 18 }}
        >
          {layout.render(page, theme, { isFirst: i === 0, isLast: i === pages.length - 1 })}
        </div>
      ))}
    </div>
  );
}
