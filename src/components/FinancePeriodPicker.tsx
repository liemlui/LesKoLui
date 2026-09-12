import { useId, type ReactNode } from "react";
import { monthLabel, todayWIB } from "../lib/format";

export interface FinancePeriodPickerProps {
  /** Selected month in YYYY-MM format. */
  month: string;
  onChange: (month: string) => void;
  /** Optional status or action displayed beside the selected period. */
  rightContent?: ReactNode;
  /** Optional contextual content displayed below the period explanation. */
  children?: ReactNode;
}

function shiftMonth(month: string, amount: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 1 + amount, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Period control for financial screens.
 *
 * Deliberately compact: it sits inside the page's sticky header so the active
 * period stays visible on every finance tab. It does not render its own card or
 * page title — the surrounding screen owns that framing.
 */
export default function FinancePeriodPicker({
  month,
  onChange,
  rightContent,
  children,
}: FinancePeriodPickerProps) {
  const inputId = useId();
  const currentMonth = todayWIB().slice(0, 7);
  const previousMonth = shiftMonth(month, -1);
  const nextMonth = shiftMonth(month, 1);

  return (
    <section aria-label="Bulan keuangan" className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <button
          type="button"
          aria-label={`Bulan sebelumnya: ${monthLabel(previousMonth)}`}
          title={`Bulan sebelumnya: ${monthLabel(previousMonth)}`}
          onClick={() => onChange(previousMonth)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-lg font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <span aria-hidden="true">‹</span>
        </button>

        <div className="min-w-[9.5rem] flex-1">
          <label htmlFor={inputId} className="block text-xs font-medium text-slate-500">
            Bulan keuangan
          </label>
          <input
            id={inputId}
            type="month"
            lang="id-ID"
            value={month}
            onChange={(event) => {
              if (event.target.value) onChange(event.target.value);
            }}
            className="input mt-0.5 w-full py-1.5"
          />
        </div>

        <button
          type="button"
          aria-label={`Bulan berikutnya: ${monthLabel(nextMonth)}`}
          title={`Bulan berikutnya: ${monthLabel(nextMonth)}`}
          onClick={() => onChange(nextMonth)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-lg font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <span aria-hidden="true">›</span>
        </button>

        <button
          type="button"
          onClick={() => onChange(currentMonth)}
          disabled={month === currentMonth}
          className="h-9 shrink-0 rounded-xl border border-blue-200 bg-blue-50 px-2.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-default disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
        >
          Bulan ini
        </button>
        {rightContent && <div className="flex shrink-0 items-center">{rightContent}</div>}
      </div>

      {children && <div>{children}</div>}
    </section>
  );
}
