import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { listSessionsToday, listStudents } from "../db/repos";
import { dayLabel } from "../lib/format";

export default function Home() {
  const todaySessions = useLiveQuery(() => listSessionsToday(), []);
  const students = useLiveQuery(() => listStudents(true), []);

  const studentMap = new Map(students?.map((s) => [s.id, s.name]));

  return (
    <div className="p-4 space-y-6 pb-20">
      {/* Header */}
      <div className="text-center pt-4">
        <h1 className="text-3xl font-bold" style={{ fontFamily: "'Fredoka', sans-serif" }}>
          Les Ko Lui
        </h1>
        <p className="text-gray-500 text-sm mt-1">{dayLabel(new Date().toISOString().slice(0, 10))}</p>
      </div>

      {/* Quick Record */}
      <Link to="/capture"
        className="block bg-blue-600 text-white rounded-2xl p-5 text-center shadow-lg hover:bg-blue-700 transition-colors">
        <span className="text-3xl">📝</span>
        <p className="text-lg font-bold mt-1">Rekam Sesi</p>
        <p className="text-sm text-blue-200">Catat sesi les hari ini</p>
      </Link>

      {/* Today's Sessions */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Sesi Hari Ini</h2>
        {!todaySessions ? (
          <p className="text-gray-400 text-sm">Memuat...</p>
        ) : todaySessions.length === 0 ? (
          <p className="text-gray-400 text-sm">Belum ada sesi hari ini.</p>
        ) : (
          <div className="space-y-2">
            {todaySessions.map((s) => (
              <div key={s.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex justify-between items-center">
                <div>
                  <p className="font-medium">{studentMap.get(s.studentId) ?? "—"}</p>
                  <p className="text-sm text-gray-500">{s.subject} · {s.durationHours} jam</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  s.status === "SCHEDULED" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"
                }`}>
                  {s.status === "SCHEDULED" ? "Terjadwal" : "Selesai"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/students" className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center hover:shadow-md transition-shadow">
          <span className="text-2xl">👥</span>
          <p className="font-medium text-sm mt-1">Murid</p>
        </Link>
        <Link to="/report" className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center hover:shadow-md transition-shadow">
          <span className="text-2xl">📊</span>
          <p className="font-medium text-sm mt-1">Laporan</p>
        </Link>
        <Link to="/payments" className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center hover:shadow-md transition-shadow">
          <span className="text-2xl">💰</span>
          <p className="font-medium text-sm mt-1">Bayaran</p>
        </Link>
        <Link to="/settings" className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center hover:shadow-md transition-shadow">
          <span className="text-2xl">⚙️</span>
          <p className="font-medium text-sm mt-1">Atur</p>
        </Link>
      </div>
    </div>
  );
}
