import { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router-dom";
import {
  listStudents, createStudent, updateStudent, deleteStudent,
  listSessionsForMonth, getSettings, listAllUpcomingScheduled,
} from "../db/repos";
import { todayWIB, monthOf, monthLabel, dayLabel } from "../lib/format";
import { usePinGate } from "../hooks/usePinGate";
import type { Student } from "../db/types";
import StudentForm from "../components/StudentForm";
import Modal from "../components/Modal";
import PaginationControls from "../components/PaginationControls";
import { clampPage, paginateItems } from "../lib/pagination";

type Tab = "aktif" | "historis";

export default function Students() {
  const today        = todayWIB();
  const currentMonth = monthOf(today);
  const allStudents   = useLiveQuery(() => listStudents(), []);
  const monthSessions = useLiveQuery(() => listSessionsForMonth(currentMonth), [currentMonth]);
  const settings      = useLiveQuery(() => getSettings(), []);
  const upcomingSched = useLiveQuery(() => listAllUpcomingScheduled(today), [today]);

  const [tab, setTab] = useState<Tab>("aktif");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [activePage, setActivePage] = useState(1);
  const [histPage, setHistPage] = useState(1);

  // PIN gate — shared hook for PIN verification with lockout protection
  const pin = usePinGate();
  const [pendingAction, setPendingAction] = useState<{
    action: "delete" | "deactivate" | "activate" | "edit";
    student: Student;
  } | null>(null);

  const statsMap = useMemo(() => {
    const m = new Map<string, { count: number; cost: number; hours: number }>();
    (monthSessions ?? []).forEach((s) => {
      const curr = m.get(s.studentId) ?? { count: 0, cost: 0, hours: 0 };
      m.set(s.studentId, {
        count: curr.count + 1,
        cost: curr.cost + s.cost,
        hours: curr.hours + s.durationHours,
      });
    });
    return m;
  }, [monthSessions]);

  // Map: studentId → earliest upcoming session date
  const nextSessionMap = useMemo(() => {
    const m = new Map<string, { date: string; time?: string }>();
    (upcomingSched ?? []).forEach((s) => {
      if (!m.has(s.studentId)) m.set(s.studentId, { date: s.date, time: s.time });
    });
    return m;
  }, [upcomingSched]);

  const q = search.toLowerCase().trim();

  const active = useMemo(() => {
    const list = (allStudents ?? []).filter((s) => s.active && (!q || s.name.toLowerCase().includes(q)));
    return [...list].sort((a, b) => {
      const an = nextSessionMap.get(a.id)?.date;
      const bn = nextSessionMap.get(b.id)?.date;
      if (an && bn) return an.localeCompare(bn);
      if (an) return -1;
      if (bn) return 1;
      return 0;
    });
  }, [allStudents, nextSessionMap, q]);

  const inactive = useMemo(() => (allStudents ?? []).filter((s) => !s.active && (!q || s.name.toLowerCase().includes(q))), [allStudents, q]);

  const totalMonthSessions = useMemo(
    () => [...statsMap.values()].reduce((sum, s) => sum + s.count, 0),
    [statsMap]
  );

  const safeActivePage = clampPage(activePage, active.length);
  const safeHistPage   = clampPage(histPage, inactive.length);
  const paginatedActive   = paginateItems(active, safeActivePage);
  const paginatedInactive = paginateItems(inactive, safeHistPage);

  if (!allStudents) return <div className="p-4 text-gray-500">Memuat...</div>;

  const handleSave = async (data: Omit<Student, "id">) => {
    if (editing) {
      await updateStudent(editing.id, data);
    } else {
      await createStudent(data);
    }
    setShowForm(false);
    setEditing(null);
  };

  const requirePin = (action: "delete" | "deactivate" | "activate" | "edit", student: Student) => {
    if (!settings?.financialPin) {
      if (action === "edit") {
        // No PIN set — open edit modal directly
        setEditing(student);
        setShowForm(true);
        return;
      }
      alert("Set PIN Keuangan di Pengaturan sebelum melakukan aksi ini.");
      return;
    }
    setPendingAction({ action, student });
    pin.resetPin();
  };

  const executeAction = async () => {
    if (!pendingAction) return;
    const { action, student } = pendingAction;
    if (action === "delete") {
      await deleteStudent(student.id);
    } else if (action === "deactivate") {
      await updateStudent(student.id, { active: false });
    } else if (action === "activate") {
      await updateStudent(student.id, { active: true });
    } else if (action === "edit") {
      setEditing(student);
      setShowForm(true);
    }
    setPendingAction(null);
    pin.resetPin();
  };

  const handlePinConfirm = async () => {
    if (!pendingAction) return;
    const ok = await pin.attemptPin(settings?.financialPin ?? "");
    if (ok) await executeAction();
  };

  const renderStudentCard = (s: Student) => {
    const stats = statsMap.get(s.id);
    const next  = nextSessionMap.get(s.id);
    const daysEnrolled = Math.floor(
      (new Date().getTime() - new Date(s.enrolledAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    const monthsSince = Math.floor(daysEnrolled / 30);

    const nextChip = (() => {
      if (!next) return null;
      const diff = Math.round(
        (new Date(next.date + "T00:00:00").getTime() - new Date(today + "T00:00:00").getTime())
        / (1000 * 60 * 60 * 24)
      );
      const label = diff === 0 ? "Hari ini"
                  : diff === 1 ? "Besok"
                  : diff <= 6 ? dayLabel(next.date).split(",")[0]  // "Senin" etc.
                  : dayLabel(next.date).replace(/^\w+, /, "").replace(/ \d{4}$/, "");
      const timeStr = next.time ? ` ${next.time}` : "";
      return (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
          diff === 0 ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700"
        }`}>
          📅 {label}{timeStr}
        </span>
      );
    })();

    return (
      <div key={s.id} className="bg-white rounded-xl shadow-sm border border-gray-100">
        <Link to={`/students/${s.id}`} className="block p-4">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              {s.name.charAt(0).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-base">{s.name}</p>
                {!s.active && (
                  <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">nonaktif</span>
                )}
                {nextChip}
              </div>

              {/* Level + subjects */}
              <p className="text-sm text-gray-500 truncate">
                {s.level}{s.grade ? ` · ${s.grade}` : ""}{s.school ? ` · ${s.school}` : ""}
              </p>
              {s.subjects.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {s.subjects.slice(0, 4).map((sub) => (
                    <span key={sub} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{sub}</span>
                  ))}
                  {s.subjects.length > 4 && (
                    <span className="text-xs text-gray-400">+{s.subjects.length - 4}</span>
                  )}
                </div>
              )}

              {/* Stats row */}
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {stats ? (
                  <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    Bulan ini: {stats.count} sesi · {stats.hours}j
                  </span>
                ) : (
                  <span className="text-xs text-gray-300">Belum ada sesi bulan ini</span>
                )}
                {monthsSince > 0 && (
                  <span className="text-xs text-gray-400">{monthsSince} bulan bersama</span>
                )}
                {s.parentContact?.name && (
                  <span className="text-xs text-gray-400 truncate">👤 {s.parentContact.name}</span>
                )}
              </div>
            </div>

            {/* Edit btn */}
            <button
              onClick={(e) => { e.preventDefault(); requirePin("edit", s); }}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-blue-100 text-gray-500 hover:text-blue-600 flex-shrink-0 transition-colors text-sm"
              title="Edit murid"
            >✏️</button>
          </div>
        </Link>

        {/* Action bar */}
        <div className="border-t border-gray-50 px-4 py-2 flex gap-2 justify-end">
          {s.active ? (
            <button
              onClick={() => requirePin("deactivate", s)}
              className="text-xs text-orange-500 hover:text-orange-700 px-2 py-1 rounded-lg hover:bg-orange-50 transition-colors"
            >
              Nonaktifkan
            </button>
          ) : (
            <button
              onClick={() => requirePin("activate", s)}
              className="text-xs text-green-600 hover:text-green-800 px-2 py-1 rounded-lg hover:bg-green-50 transition-colors"
            >
              Aktifkan
            </button>
          )}
          <button
            onClick={() => requirePin("delete", s)}
            className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
          >
            Hapus
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Murid</h1>
        <button
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white shadow transition-colors"
          onClick={() => { setEditing(null); setShowForm(true); }}
        >
          <span className="text-base leading-none">+</span>
          Tambah Murid
        </button>
      </div>

      {/* Summary banner */}
      {totalMonthSessions > 0 && (
        <div className="bg-blue-50 rounded-xl p-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-blue-500 font-medium uppercase tracking-wide">{monthLabel(currentMonth)}</p>
            <p className="text-sm font-bold text-blue-900">{totalMonthSessions} sesi · {active.length} murid aktif</p>
          </div>
          <span className="text-2xl">📈</span>
        </div>
      )}

      {/* Add / Edit form — bottom-sheet modal */}
      {showForm && (
        <Modal
          onClose={() => { setShowForm(false); setEditing(null); }}
          ariaLabel={editing ? "Edit Murid" : "Murid Baru"}
        >
          <h2 className="text-lg font-semibold">{editing ? "Edit Murid" : "Murid Baru"}</h2>
          <StudentForm
            initial={editing ?? undefined}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditing(null); }}
          />
        </Modal>
      )}

      {/* Search */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        <input
          className="input pl-9 w-full"
          inputMode="search"
          placeholder="Cari nama murid..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setActivePage(1); setHistPage(1); }}
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">✕</button>
        )}
      </div>

      {/* Tab selector */}
      <div className="flex gap-2 bg-gray-100 rounded-xl p-1">
        <button onClick={() => setTab("aktif")}
          className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-colors ${tab === "aktif" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500"}`}>
          Aktif ({active.length})
        </button>
        <button onClick={() => setTab("historis")}
          className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-colors ${tab === "historis" ? "bg-white text-gray-700 shadow-sm" : "text-gray-500"}`}>
          Historis ({inactive.length})
        </button>
      </div>

      {/* Active students */}
      {tab === "aktif" && (
        <>
          {active.length === 0 && !showForm ? (
            <p className="text-gray-400 text-center py-8">Belum ada murid aktif.</p>
          ) : (
            <div className="space-y-2">
              {paginatedActive.map(renderStudentCard)}
            </div>
          )}
          <PaginationControls page={safeActivePage} total={active.length} onPageChange={setActivePage} label="murid" />
        </>
      )}

      {/* Historical students */}
      {tab === "historis" && (
        <>
          {inactive.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Tidak ada murid nonaktif.</p>
          ) : (
            <div className="space-y-2">
              {paginatedInactive.map(renderStudentCard)}
            </div>
          )}
          <PaginationControls page={safeHistPage} total={inactive.length} onPageChange={setHistPage} label="murid" />
        </>
      )}

      {/* PIN Confirmation Modal */}
      {pendingAction && (
        <Modal
          onClose={() => { setPendingAction(null); pin.resetPin(); }}
          ariaLabel="Konfirmasi PIN"
          panelClassName="bg-white w-full max-w-xs rounded-2xl p-5 space-y-4 shadow-xl mx-4"
        >
          <div>
            <p className="font-bold text-base text-gray-800">
              {pendingAction.action === "delete" && "Hapus Murid"}
              {pendingAction.action === "deactivate" && "Nonaktifkan Murid"}
              {pendingAction.action === "activate" && "Aktifkan Murid"}
              {pendingAction.action === "edit" && "Edit Murid"}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {pendingAction.action === "delete"
                ? `Data "${pendingAction.student.name}" akan dihapus permanen.`
                : pendingAction.action === "deactivate"
                ? `"${pendingAction.student.name}" dipindah ke historis.`
                : pendingAction.action === "activate"
                ? `"${pendingAction.student.name}" diaktifkan kembali.`
                : `Edit profil "${pendingAction.student.name}"?`}
            </p>
          </div>
          {settings?.financialPin && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Masukkan PIN untuk konfirmasi</p>
              <input type="password" inputMode="numeric" maxLength={6} placeholder="PIN"
                value={pin.pinInput} onChange={(e) => pin.setPinInput(e.target.value)}
                className="input text-center tracking-widest text-lg w-full" autoFocus />
              {pin.pinError && <p className="text-xs text-red-500 mt-1">{pin.pinError}</p>}
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => { setPendingAction(null); pin.resetPin(); }}
              className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-semibold text-sm">
              Batal
            </button>
            <button
              onClick={handlePinConfirm}
              className={`flex-1 py-2.5 rounded-xl text-white font-semibold text-sm ${pendingAction.action === "delete" ? "bg-red-500 hover:bg-red-600" : pendingAction.action === "deactivate" ? "bg-orange-500 hover:bg-orange-600" : pendingAction.action === "activate" ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"}`}>
              {pendingAction.action === "delete" ? "Hapus" : pendingAction.action === "deactivate" ? "Nonaktifkan" : pendingAction.action === "activate" ? "Aktifkan" : "Edit"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
