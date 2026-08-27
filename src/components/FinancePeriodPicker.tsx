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
 * Shared period control for financial screens.
 *
 * The friendly label keeps the active reporting period visible while the
 * native month field remains available for jumping directly to another month.
 */
export default function FinancePeriodPicker({
  month,
  onChange,
  rightContent,
  children,
}: FinancePeriodPickerProps) {
  const inputId = useId();
  const titleId = `${inputId}-title`;
  const currentMonth = todayWIB().slice(0, 7);
  const previousMonth = shiftMonth(month, -1);
  const nextMonth = shiftMonth(month, 1);

  return (
    <section
      aria-labelledby={titleId}
      className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm space-y-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p id={titleId} className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
            Bulan keuangan
          </p>
          <p aria-live="polite" className="mt-0.5 text-lg font-bold text-slate-800">
            {monthLabel(month)}
          </p>
        </div>
        {rightContent && <div className="flex shrink-0 items-center">{rightContent}</div>}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <button
          type="button"
          aria-label={`Bulan sebelumnya: ${monthLabel(previousMonth)}`}
          title={`Bulan sebelumnya: ${monthLabel(previousMonth)}`}
          onClick={() => onChange(previousMonth)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-xl font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <span aria-hidden="true">‹</span>
        </button>

        <div className="min-w-[11rem] flex-1">
          <label htmlFor={inputId} className="block text-xs font-medium text-slate-600">
            Pilih bulan keuangan
          </label>
          <input
            id={inputId}
            type="month"
            lang="id-ID"
            value={month}
            onChange={(event) => {
              if (event.target.value) onChange(event.target.value);
            }}
            className="input mt-1 w-full"
          />
        </div>

        <button
          type="button"
          aria-label={`Bulan berikutnya: ${monthLabel(nextMonth)}`}
          title={`Bulan berikutnya: ${monthLabel(nextMonth)}`}
          onClick={() => onChange(nextMonth)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-xl font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <span aria-hidden="true">›</span>
        </button>

        <button
          type="button"
          onClick={() => onChange(currentMonth)}
          disabled={month === currentMonth}
          className="h-10 rounded-xl border border-blue-200 bg-blue-50 px-3 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-default disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
        >
          Bulan ini
        </button>
      </div>

      <p className="text-xs leading-relaxed text-slate-500">
        Ringkasan, daftar invoice, dan Pengeluaran mengikuti bulan ini. Antrean paket per sesi tetap lintas bulan.
      </p>

      {children && <div>{children}</div>}
    </section>
  );
}
