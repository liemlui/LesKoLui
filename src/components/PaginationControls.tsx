import { memo } from "react";
import { getPageCount, PAGE_SIZE } from "../lib/pagination";

type PaginationControlsProps = {
  page: number;
  total: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  label?: string;
};

function PaginationControls({
  page,
  total,
  onPageChange,
  pageSize = PAGE_SIZE,
  label = "data",
}: PaginationControlsProps) {
  const totalPages = getPageCount(total, pageSize);
  if (total <= pageSize) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-[var(--ink-muted)]">
      <span>
        Menampilkan {start}-{end} dari {total} {label}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-strong)] font-semibold text-[var(--ink-muted)] disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          Sebelumnya
        </button>
        <span className="font-semibold text-[var(--ink-muted)]">
          {page}/{totalPages}
        </span>
        <button
          type="button"
          className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-strong)] font-semibold text-[var(--ink-muted)] disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Berikutnya
        </button>
      </div>
    </div>
  );
}

export default memo(PaginationControls);
