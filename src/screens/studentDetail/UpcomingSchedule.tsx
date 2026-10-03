import type { Session } from "../../db/types";
import { dayLabel } from "../../lib/format";
import { clampPage, paginateItems } from "../../lib/pagination";
import PaginationControls from "../../components/PaginationControls";
import EmptyState from "../../components/EmptyState";
import SectionHeader from "../../components/ui/SectionHeader";
import ListRow from "../../components/ui/ListRow";

interface UpcomingScheduleProps {
  upcomingSched: Session[] | undefined;
  schedMonth: string;
  setSchedMonth: (v: string) => void;
  upcomingPage: number;
  setUpcomingPage: (v: number) => void;
  today: string;
  openEditSched: (s: Session) => void;
}

/** Jadwal Mendatang — daftar sesi terjadwal dengan filter bulan dan pagination. */
export default function UpcomingSchedule({
  upcomingSched, schedMonth, setSchedMonth,
  upcomingPage, setUpcomingPage, today, openEditSched,
}: UpcomingScheduleProps) {
  const availMonths = [...new Set((upcomingSched ?? []).map((s) => s.date.slice(0, 7)))].sort();
  const filteredList = schedMonth
    ? (upcomingSched ?? []).filter((s) => s.date.startsWith(schedMonth))
    : (upcomingSched ?? []);
  const safeFilteredPage = clampPage(upcomingPage, filteredList.length);
  const paginatedFiltered = paginateItems(filteredList, safeFilteredPage);

  return (
    <div>
      <SectionHeader
        className="mb-2"
        title="Jadwal Mendatang"
        hint={`${(upcomingSched ?? []).length} jadwal`}
      />

      {availMonths.length > 1 && (
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
          <button
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${schedMonth === "" ? "bg-[var(--brand-solid)] text-[var(--on-strong)] border-[var(--border-brand)]" : "bg-[var(--surface-strong)] text-[var(--ink-muted)] border-[var(--border)]"}`}
            onClick={() => setSchedMonth("")}>Semua</button>
          {availMonths.map((m) => {
            const label = new Date(m + "-01T00:00:00").toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
            return (
              <button key={m}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${schedMonth === m ? "bg-[var(--brand-solid)] text-[var(--on-strong)] border-[var(--border-brand)]" : "bg-[var(--surface-strong)] text-[var(--ink-muted)] border-[var(--border)]"}`}
                onClick={() => { setSchedMonth(m); setUpcomingPage(1); }}>
                {label}
              </button>
            );
          })}
        </div>
      )}

      {filteredList.length === 0 ? (
        <EmptyState tone="dashed" icon="📅"
          message={schedMonth ? "Tidak ada jadwal di bulan ini" : "Belum ada jadwal mendatang"} />
      ) : (
        <div className="space-y-2">
          {paginatedFiltered.map((s) => (
            <ListRow
              key={s.id}
              leading={
                (s.date === today || s.seriesId) ? (
                  <span className="flex flex-col items-start gap-1">
                    {s.date === today && (
                      <span className="rounded-full bg-[var(--surface-soft)] px-1.5 py-0.5 text-caption font-semibold text-[var(--ink-brand)]">
                        Hari ini
                      </span>
                    )}
                    {s.seriesId && <span className="text-caption">🔁 Rutin</span>}
                  </span>
                ) : undefined
              }
              title={dayLabel(s.date)}
              subtitle={`${s.time ? `${s.time} · ` : ""}${s.durationHours} jam`}
              trailing={<span className="text-caption">✏️ Edit</span>}
              onClick={() => openEditSched(s)}
            />
          ))}
          <PaginationControls
            page={safeFilteredPage}
            total={filteredList.length}
            onPageChange={setUpcomingPage}
            label="jadwal"
          />
        </div>
      )}
    </div>
  );
}
