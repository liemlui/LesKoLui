import Skeleton from "../components/Skeleton";
import { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Link, useNavigate } from "react-router-dom";
import {
  listStudents, createStudent, updateStudent, deleteStudent,
  listSessionsForMonth, getSettings, listAllUpcomingScheduled,
  listPendingFollowUps, listPayments,
  listSessionsByStudent, listReportsByStudent, listPaymentsByStudent,
  listRaporGrades, listIaEeProjects, getStudyNote,
} from "../db/repos";
import type { StudentBillingUpdateOptions } from "../db/repos";
import { todayWIB, monthOf, monthLabel, dayLabel } from "../lib/format";
import { usePinGate } from "../hooks/usePinGate";
import { colorForStudent } from "../lib/studentColor";
import type { Student } from "../db/types";
import { useToastCtx } from "../components/ToastProvider";
import StudentForm from "../components/StudentForm";
import Modal from "../components/Modal";
import PaginationControls from "../components/PaginationControls";
import Badge from "../components/Badge";
import { clampPage, paginateItems } from "../lib/pagination";

type Tab = "aktif" | "historis";

export default function Students() {
  const today        = todayWIB();
  const currentMonth = monthOf(today);
  const navigate     = useNavigate();
  const toast        = useToastCtx();
  const allStudents   = useLiveQuery(() => listStudents(), []);
  const monthSessions = useLiveQuery(() => listSessionsForMonth(currentMonth), [currentMonth]);
  const settings      = useLiveQuery(() => getSettings(), []);
  const upcomingSched = useLiveQuery(() => listAllUpcomingScheduled(today), [today]);
  const followUps     = useLiveQuery(() => listPendingFollowUps(), []);
  const payments      = useLiveQuery(() => listPayments(), []);

  const [tab, setTab] = useState<Tab>("aktif");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [activePage, setActivePage] = useState(1);
  const [histPage, setHistPage] = useState(1);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

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

  // Map: studentId → count of upcoming scheduled sessions (for deactivate warning)
  const upcomingCountMap = useMemo(() => {
    const m = new Map<string, number>();
    (upcomingSched ?? []).forEach((s) => m.set(s.studentId, (m.get(s.studentId) ?? 0) + 1));
    return m;
  }, [upcomingSched]);

  // Map: studentId → pending follow-up count (attention badges)
  const followUpCountMap = useMemo(() => {
    const m = new Map<string, number>();
    (followUps ?? []).forEach((f) => m.set(f.studentId, (m.get(f.studentId) ?? 0) + 1));
    return m;
  }, [followUps]);

  // Map: studentId → unpaid invoice count (attention badges)
  const unpaidCountMap = useMemo(() => {
    const m = new Map<string, number>();
    (payments ?? []).forEach((p) => {
      if (p.status === "UNPAID") m.set(p.studentId, (m.get(p.studentId) ?? 0) + 1);
    });
    return m;
  }, [payments]);

  // How many active students need attention (for the summary line)
  const needsAttentionCount = useMemo(() => {
    let n = 0;
    (allStudents ?? []).forEach((s) => {
      if (!s.active) return;
      if ((followUpCountMap.get(s.id) ?? 0) > 0 || (unpaidCountMap.get(s.id) ?? 0) > 0) n++;
    });
    return n;
  }, [allStudents, followUpCountMap, unpaidCountMap]);

  // Read-only summary of what would be deleted for the pending student.
  const deleteTargetId = pendingAction?.action === "delete" ? pendingAction.student.id : null;
  const deleteSummary = useLiveQuery(async () => {
    if (!deleteTargetId) return null;
    const [sessions, reports, pays, rapor, iaee, fups, note] = await Promise.all([
      listSessionsByStudent(deleteTargetId),
      listReportsByStudent(deleteTargetId),
      listPaymentsByStudent(deleteTargetId),
      listRaporGrades(deleteTargetId),
      listIaEeProjects(deleteTargetId),
      listPendingFollowUps(deleteTargetId),
      getStudyNote(deleteTargetId),
    ]);
    return {
      sessions: sessions.length,
      reports: reports.length,
      payments: pays.length,
      raporGrades: rapor.length,
      iaee: iaee.length,
      followUps: fups.length,
      studyNote: note ? 1 : 0,
    };
  }, [deleteTargetId]);

  // Post-add guidance: show until the just-added student gets a schedule or session.
  const justAddedStudent = useMemo(
    () => (justAddedId ? (allStudents ?? []).find((s) => s.id === justAddedId) : undefined),
    [justAddedId, allStudents]
  );
  const showFirstScheduleGuide = Boolean(
    justAddedStudent && !nextSessionMap.has(justAddedStudent.id) && !statsMap.has(justAddedStudent.id)
  );

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

  if (!allStudents) return <Skeleton variant="card" lines={4} className="p-4" />;

  const handleSave = async (
    data: Omit<Student, "id">,
    options?: StudentBillingUpdateOptions,
  ) => {
    if (editing) {
      await updateStudent(editing.id, data, options);
      toast.success(`Profil "${data.name}" diperbarui ✓`);
    } else {
      const id = await createStudent(data);
      toast.success(`Murid "${data.name}" ditambahkan ✓`);
      if ((allStudents ?? []).length === 0) setJustAddedId(id);
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
      toast.error("Set PIN Keuangan di Pengaturan sebelum melakukan aksi ini.");
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
      toast.success(`Murid "${student.name}" dihapus ✓`);
    } else if (action === "deactivate") {
      await updateStudent(student.id, { active: false });
      toast.info(`"${student.name}" dipindah ke historis`);
    } else if (action === "activate") {
      await updateStudent(student.id, { active: true });
      toast.success(`"${student.name}" diaktifkan kembali ✓`);
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
      (new Date(today + "T00:00:00").getTime() - new Date(s.enrolledAt + "T00:00:00").getTime())
      / (1000 * 60 * 60 * 24)
    );
    const monthsSince = Math.floor(daysEnrolled / 30);
    const pendingFollowUps = followUpCountMap.get(s.id) ?? 0;
    const unpaidInvoices = unpaidCountMap.get(s.id) ?? 0;

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
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
              style={{ background: colorForStudent(s.id) }}>
              {s.name.charAt(0).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-base">{s.name}</p>
                {!s.active && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">nonaktif</span>
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
                    <span className="text-xs text-gray-500">+{s.subjects.length - 4}</span>
                  )}
                </div>
              )}

              {/* Attention badges */}
              {(pendingFollowUps > 0 || unpaidInvoices > 0) && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {pendingFollowUps > 0 && (
                    <Badge tone="amber" size="sm">🔔 {pendingFollowUps} follow-up</Badge>
                  )}
                  {unpaidInvoices > 0 && (
                    <Badge tone="red" size="sm">💳 {unpaidInvoices} tagihan belum dibayar</Badge>
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
                  <span className="text-xs text-gray-500">Belum ada sesi bulan ini</span>
                )}
                {monthsSince > 0 && (
                  <span className="text-xs text-gray-500">{monthsSince} bulan bersama</span>
                )}
                {s.parentContact?.name && (
                  <span className="text-xs text-gray-500 truncate">👤 {s.parentContact.name}</span>
                )}
              </div>
            </div>

            {/* Edit btn */}
            <button
              onClick={(e) => { e.preventDefault(); requirePin("edit", s); }}
              className="w-11 h-11 flex items-center justify-center rounded-full bg-gray-100 hover:bg-blue-100 text-gray-500 hover:text-blue-600 flex-shrink-0 transition-colors text-sm"
              aria-label="Edit murid" title="Edit murid"
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

      {/* Post-add guidance */}
      {showFirstScheduleGuide && justAddedStudent && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
          <span className="text-xl">🎯</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-blue-900">
              Murid "{justAddedStudent.name}" sudah terdaftar!
            </p>
            <p className="text-xs text-blue-700 mt-0.5">
              Langkah berikutnya: buat jadwal sesi pertama mereka.
            </p>
            <div className="flex gap-2 mt-2">
              <button onClick={() => navigate("/")}
                className="text-xs font-semibold bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors">
                Buka Kalender
              </button>
              <button onClick={() => setJustAddedId(null)}
                className="text-xs font-semibold text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">
                Nanti saja
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Needs-attention summary */}
      {needsAttentionCount > 0 && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          <span>🔔</span>
          <p className="text-xs font-semibold text-amber-800">
            {needsAttentionCount} murid butuh perhatian (follow-up atau tagihan)
          </p>
        </div>
      )}

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
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
        <input
          className="input pl-9 w-full"
          inputMode="search"
          type="search"
          aria-label="Cari murid"
          placeholder="Cari nama murid..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setActivePage(1); setHistPage(1); }}
        />
        {search && (
          <button aria-label="Hapus pencarian" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-600"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
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
          {active.length === 0 ? (
            q ? (
              <p className="text-gray-500 text-center py-8">Tidak ada hasil untuk "{search}".</p>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Belum ada murid aktif.</p>
                <button
                  onClick={() => { setEditing(null); setShowForm(true); }}
                  className="mt-3 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition-colors"
                >
                  + Tambah murid pertama
                </button>
              </div>
            )
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
            q ? (
              <p className="text-gray-500 text-center py-8">Tidak ada hasil untuk "{search}".</p>
            ) : (
              <p className="text-gray-500 text-center py-8">Tidak ada murid nonaktif.</p>
            )
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

            {pendingAction.action === "deactivate" && (upcomingCountMap.get(pendingAction.student.id) ?? 0) > 0 && (
              <p className="mt-2 rounded-lg bg-amber-50 border border-amber-200 p-2 text-xs text-amber-900">
                ⚠️ Masih ada {upcomingCountMap.get(pendingAction.student.id)} jadwal mendatang yang belum selesai.
                Pertimbangkan untuk membatalkan atau mengatur ulang jadwal tersebut.
              </p>
            )}

            {pendingAction.action === "delete" && deleteSummary && (
              <div className="mt-2 rounded-lg bg-red-50 border border-red-100 p-2 text-xs text-red-800">
                <p className="font-semibold mb-1">Yang akan ikut terhapus:</p>
                <ul className="space-y-0.5">
                  {deleteSummary.sessions > 0 && <li>• {deleteSummary.sessions} sesi</li>}
                  {deleteSummary.reports > 0 && <li>• {deleteSummary.reports} laporan</li>}
                  {deleteSummary.payments > 0 && <li>• {deleteSummary.payments} tagihan</li>}
                  {deleteSummary.followUps > 0 && <li>• {deleteSummary.followUps} follow-up aktif</li>}
                  {deleteSummary.raporGrades > 0 && <li>• {deleteSummary.raporGrades} nilai rapor</li>}
                  {deleteSummary.iaee > 0 && <li>• {deleteSummary.iaee} proyek IA/EE</li>}
                  {deleteSummary.studyNote > 0 && <li>• catatan belajar</li>}
                  {deleteSummary.sessions === 0 && deleteSummary.reports === 0 && deleteSummary.payments === 0 && deleteSummary.followUps === 0 && deleteSummary.raporGrades === 0 && deleteSummary.iaee === 0 && deleteSummary.studyNote === 0 && (
                    <li>• Tidak ada riwayat — hanya profil</li>
                  )}
                </ul>
              </div>
            )}
          </div>
          {settings?.financialPin && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Masukkan PIN untuk konfirmasi</p>
              <input type="password" inputMode="numeric" maxLength={6} placeholder="PIN"
                value={pin.pinInput}
                onChange={(e) => { pin.setPinInput(e.target.value.replace(/\D/g, "").slice(0, 6)); pin.setPinError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") handlePinConfirm(); }}
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

          {pendingAction.action === "delete" && (
            <button
              onClick={() => { setPendingAction({ action: "deactivate", student: pendingAction.student }); pin.resetPin(); }}
              className="w-full text-center text-xs font-semibold text-gray-500 hover:text-gray-700 py-1">
              Alih-alih hapus, nonaktifkan saja →
            </button>
          )}
        </Modal>
      )}
    </div>
  );
}
