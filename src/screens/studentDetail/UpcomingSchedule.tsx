import type { Session } from "../../db/types";
import { dayLabel } from "../../lib/format";
import { clampPage, paginateItems } from "../../lib/pagination";
import PaginationControls from "../../components/PaginationControls";

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
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">Jadwal Mendatang</h2>
        <span className="text-xs text-gray-500 font-medium">{(upcomingSched ?? []).length} jadwal</span>
      </div>

      {availMonths.length > 1 && (
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
          <button
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${schedMonth === "" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200"}`}
            onClick={() => setSchedMonth("")}>Semua</button>
          {availMonths.map((m) => {
            const label = new Date(m + "-01T00:00:00").toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
            return (
              <button key={m}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${schedMonth === m ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200"}`}
                onClick={() => { setSchedMonth(m); setUpcomingPage(1); }}>
                {label}
              </button>
            );
          })}
        </div>
      )}

      {filteredList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-6 text-center">
          <p className="text-2xl mb-1">📅</p>
          <p className="text-sm text-gray-500">{schedMonth ? "Tidak ada jadwal di bulan ini" : "Belum ada jadwal mendatang"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {paginatedFiltered.map((s) => (
            <div key={s.id}
              className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center justify-between gap-3 cursor-pointer hover:border-blue-200 transition-colors"
              onClick={() => openEditSched(s)}>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {s.date === today && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">Hari ini</span>}
                  {s.seriesId && <span className="text-xs text-gray-500">🔁 Rutin</span>}
                </div>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">{dayLabel(s.date)}</p>
                <p className="text-xs text-gray-500">{s.time ? `${s.time} · ` : ""}{s.durationHours} jam</p>
              </div>
              <span className="text-gray-500 text-xs flex-shrink-0">✏️ Edit</span>
            </div>
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
