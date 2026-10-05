import { useMemo, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useToastCtx } from "../../components/ToastProvider";
import { useLiveQuery } from "dexie-react-hooks";
import {
  listStudents, listAllSessionsForMonth, listAllSessionsForWeek,
  listPendingFollowUps,
  completeFollowUp,
  listPastScheduledSessions,
  listPayments,
} from "../../db/repos";
import type { Session } from "../../db/types";
import { dayLabel, todayWIB, monthOf } from "../../lib/format";
import { invoiceAgeDays } from "../../lib/finance";
import { weekDates, byDay, type CalView } from "../../lib/calendar";
import { colorForStudent, type StudentMap } from "../../lib/studentColor";
import TodayHero from "./TodayHero";
import AttentionInbox from "./AttentionInbox";
import MonthView from "./MonthView";
import WeekView from "./WeekView";
import DayView from "./DayView";
import AddScheduleModal from "./AddScheduleModal";
import ManageSessionSheet from "./ManageSessionSheet";
import type { SesiKontek } from "./manageSession";
import OperationalSnapshot from "./OperationalSnapshot";
import type { SessionActions } from "./SessionPill";
import { feedbackTypeForResult, todayHeroLoadState } from "../captureSession/helpers";
import { SettingsIcon } from "../../components/icons";

export default function Home() {
  const today = todayWIB();
  const navigate = useNavigate();

  const [view,        setView]        = useState<CalView>("month");
  const [calMonth,    setCalMonth]    = useState(() => monthOf(today));
  const [anchor,      setAnchor]      = useState(today);
  const [selectedDay, setSelectedDay] = useState<string | null>(today);

  const [addDate,    setAddDate]    = useState<string | null>(null);
  // Satu target untuk semua pengelolaan sesi dari Beranda (G3-01 L4): konteksnya
  // yang menentukan aksi mana yang muncul, bukan dua modal berbeda.
  const [manageTarget, setManageTarget] = useState<{ session: Session; kontek: SesiKontek } | null>(null);
  const [filterStudentId, setFilterStudentId] = useState<string>("");

  const toast = useToastCtx();
  // ── Data ──────────────────────────────────────────────────────────────────
  const students = useLiveQuery(() => listStudents(true), []);
  const allStudents = useLiveQuery(() => listStudents(), []);
  const week = useMemo(() => weekDates(anchor), [anchor]);
  const currentWeek = useMemo(() => weekDates(today), [today]);

  const monthSessions = useLiveQuery(() => listAllSessionsForMonth(calMonth), [calMonth]);
  const weekSessions  = useLiveQuery(() => listAllSessionsForWeek(week[0], week[6]), [week[0], week[6]]);
  const currentWeekSessions = useLiveQuery(
    () => listAllSessionsForWeek(currentWeek[0], currentWeek[6]),
    [currentWeek[0], currentWeek[6]],
  );
  // Tren "Minggu Ini": jumlah sesi selesai per minggu untuk 4 minggu terakhir
  // (termasuk minggu berjalan). Menghidupkan konteks historis di card mingguan
  // tanpa menambah perpustakaan chart baru (sparkline pakai LineChart existing).
  const weeklyTrend = useLiveQuery(async () => {
    const out: number[] = [];
    const iso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    for (let back = 3; back >= 0; back--) {
      const anchorDate = new Date();
      anchorDate.setDate(anchorDate.getDate() - back * 7);
      const dow = (anchorDate.getDay() + 6) % 7; // 0 = Senin
      const monday = new Date(anchorDate);
      monday.setDate(anchorDate.getDate() - dow);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const sessions = await listAllSessionsForWeek(iso(monday), iso(sunday));
      out.push(sessions.filter((s) => s.status === "DONE").length);
    }
    return out;
  }, []);
  const daySessions   = useLiveQuery(() => listAllSessionsForWeek(anchor, anchor), [anchor]);
  const todaySessions = useLiveQuery(() => listAllSessionsForWeek(today, today), [today]);

  const allFollowUps    = useLiveQuery(() => listPendingFollowUps(), []);
  const missedSchedules = useLiveQuery(() => listPastScheduledSessions(today), [today]);

  const studentMap: StudentMap = useMemo(
    () => new Map((allStudents ?? []).map((s) => [s.id, { name: s.name, color: colorForStudent(s.id) }])),
    [allStudents]
  );

  // ── Student filter (applied consistently everywhere) ────────────────────────
  const inFilter = (studentId: string) => !filterStudentId || studentId === filterStudentId;

  const monthByDay = useMemo(() => byDay((monthSessions ?? []).filter((s) => !filterStudentId || s.studentId === filterStudentId)), [monthSessions, filterStudentId]);
  const weekByDay  = useMemo(() => byDay((weekSessions ?? []).filter((s) => !filterStudentId || s.studentId === filterStudentId)),  [weekSessions, filterStudentId]);
  const dayList    = useMemo(() => (daySessions ?? []).filter((s) => !filterStudentId || s.studentId === filterStudentId), [daySessions, filterStudentId]);
  const todayList  = useMemo(() => (todaySessions ?? []).filter((s) => !filterStudentId || s.studentId === filterStudentId), [todaySessions, filterStudentId]);

  // ── Attention inbox data (filtered) ─────────────────────────────────────────
  const follows      = (allFollowUps ?? []).filter((f) => inFilter(f.studentId));
  const missed       = (missedSchedules ?? []).filter((s) => inFilter(s.studentId));

  // ── "Perlu keputusan": jumlah tagihan yang menunggu tindakan ────────────────
  // G2-04 (K3.5) memindahkan akses uang keluar dari Beranda. Penggantinya bukan
  // nominal, melainkan JUMLAH tagihan + jalan ke layar Uang. Umur piutang dihitung
  // dengan aturan yang sudah dipakai Keuangan (`invoiceAgeDays`), bukan rumus baru.
  const allPayments = useLiveQuery(() => listPayments(), []);
  const unpaidSummary = useMemo(() => {
    const unpaid = (allPayments ?? []).filter((p) => p.status === "UNPAID");
    return {
      count: unpaid.length,
      overdue: unpaid.filter((p) => invoiceAgeDays(p, today) > 30).length,
    };
  }, [allPayments, today]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  /**
   * Umpan balik hasil aksi dari modal Beranda (audit L-08).
   *
   * Dulu SEMUA hasil lewat `toast.info` (abu-abu), sehingga "Jadwal ditambahkan ✓"
   * dan "Gagal: …" tampak sama. Klasifikasinya ada di `feedbackTypeForResult`
   * (fungsi murni, ada tesnya) supaya aturan itu tidak tersembunyi di komponen.
   */
  const msg = useCallback((t: string) => {
    if (feedbackTypeForResult(t) === "error") toast.error(t);
    else toast.success(t);
  }, [toast]);

  const openAdd = (date: string) => { setSelectedDay(date); setAddDate(date); };
  const jumpToday = () => { setCalMonth(monthOf(today)); setAnchor(today); setSelectedDay(today); };

  const actions: SessionActions = useMemo(() => ({
    onEdit:    (s: Session) => setManageTarget({ session: s, kontek: "terjadwal" }),
    onCapture: (id: string) => navigate(`/capture?scheduleId=${id}`),
    onResolveMissed: (s: Session) => setManageTarget({ session: s, kontek: "terlewat" }),
  }), [navigate]);

  // ── Empty state / onboarding ────────────────────────────────────────────────
  if (allStudents && allStudents.length === 0) {
    return (
      <div className="pb-20">
        <div className="px-4 pt-5 pb-3">
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Fredoka', sans-serif" }}>Les Ko Lui</h1>
          <p className="text-[var(--ink-muted)] text-xs">{dayLabel(today)}</p>
        </div>
        <div className="mx-4 mt-6 bg-[var(--surface-strong)] rounded-2xl shadow-sm border border-[var(--border)] p-6 text-center">
          <p className="text-4xl mb-3">👋</p>
          <h2 className="text-lg font-bold text-[var(--ink-strong)] mb-1">Selamat datang!</h2>
          <p className="text-sm text-[var(--ink-muted)] mb-5">Mulai dengan menambahkan murid pertamamu, lalu jadwalkan sesi les.</p>
          <button onClick={() => navigate("/students")}
            className="btn-primary w-full py-3 font-semibold">
            + Tambah murid pertama
          </button>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="pb-20">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Fredoka', sans-serif" }}>Les Ko Lui</h1>
          <p className="text-[var(--ink-muted)] text-xs">{dayLabel(today)}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {/* G2-04 (K3.5): akses uang — termasuk pintasan Pengeluaran — tidak
              lagi hidup di Beranda. Kemampuannya tetap ada di Keuangan →
              Pengeluaran; Beranda hanya jadwal & murid. */}
          <Link to="/settings" aria-label="Pengaturan"
            className="text-[var(--ink-muted)] hover:text-[var(--ink-strong)] hover:bg-[var(--bg-subtle)] rounded-xl w-[44px] h-[44px] flex items-center justify-center text-lg transition-colors">
            <SettingsIcon size={20} />
          </Link>
        </div>
      </div>

      {/* Satu blok "Hari Ini": agenda + ringkasan minggu (B-04/B-05, Q6 = A). */}
      <TodayHero
        today={today}
        sessions={todayList}
        studentMap={studentMap}
        onAdd={openAdd}
        // Audit B-01: `useLiveQuery` mengembalikan undefined selama query pertama
        // berjalan — itu "belum siap", bukan "tidak ada sesi hari ini".
        loading={todayHeroLoadState(todaySessions, students) === "loading"}
        snapshot={(
          <OperationalSnapshot
            activeStudents={(students ?? []).length}
            weekDone={(currentWeekSessions ?? []).filter((s) => s.status === "DONE").length}
            weekPlanned={(currentWeekSessions ?? []).filter((s) => s.status === "DONE" || s.status === "SCHEDULED").length}
            weeklyTrend={weeklyTrend ?? []}
            onActiveStudentsClick={() => navigate("/students")}
          />
        )}
        {...actions} />

      {/* "Perlu keputusan" — pengganti akses uang yang dilepas dari Beranda:
          hanya JUMLAH tagihan, tanpa satu pun nominal (TASK-08 Langkah 3). */}
      {unpaidSummary.count > 0 && (
        <div className="mx-4 mb-2 flex items-center justify-between gap-2 rounded-xl border border-[var(--border-warn)] bg-[var(--bg-warn)] px-3 py-2">
          <p className="text-xs font-semibold text-[var(--ink-warn)]">
            {unpaidSummary.count} tagihan perlu ditindak
            {unpaidSummary.overdue > 0 ? ` — ${unpaidSummary.overdue} lewat 30 hari` : ""}
          </p>
          <button onClick={() => navigate("/payments?tab=tagihan")}
            className="shrink-0 min-h-[44px] rounded-lg px-2 text-xs font-bold text-[var(--ink-warn)] underline underline-offset-2">
            Lihat di Uang ▸
          </button>
        </div>
      )}

      {/* Perlu Perhatian */}
      <div>
      <AttentionInbox
        missed={missed} follows={follows}
        studentMap={studentMap}
        onCapture={actions.onCapture}
        onResolveMissed={actions.onResolveMissed}
        onCompleteFollowUp={async (id) => { await completeFollowUp(id); msg("Tandai selesai ✓"); }}
      />
      </div>

      {/* Audit L-07: blok kalender diberi heading agar navigasi heading pembaca
          layar punya tujuan. Judulnya disembunyikan karena blok ini sudah dikenali
          dari tombol Bulan/Minggu/Hari — menambah teks terlihat berarti menambah
          kepadatan above-fold (temuan B-05). */}
      <h2 className="sr-only">Kalender</h2>
      {/* View toggle + filter murid */}
      <div className="mx-4 mb-3 mt-2 space-y-2">
        <div className="bg-[var(--bg-subtle)] rounded-xl p-1 grid grid-cols-3">
          {(["month", "week", "day"] as CalView[]).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`py-1.5 rounded-lg text-sm font-medium transition-colors ${view === v ? "bg-[var(--surface-strong)] shadow text-[var(--ink-brand)]" : "text-[var(--ink-muted)]"}`}>
              {v === "month" ? "Bulan" : v === "week" ? "Minggu" : "Hari"}
            </button>
          ))}
        </div>
        {(students ?? []).length > 1 && (
          <div className="flex items-center gap-2">
            <select
              value={filterStudentId}
              onChange={(e) => setFilterStudentId(e.target.value)}
              aria-label="Filter murid"
              className="input py-1.5 text-sm flex-1">
              <option value="">Semua murid</option>
              {(students ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {filterStudentId && (
              <button aria-label="Hapus filter" onClick={() => setFilterStudentId("")}
                className="text-xs text-[var(--ink-muted)] hover:text-[var(--ink-strong)] w-8 h-8 flex items-center justify-center bg-[var(--bg-subtle)] rounded-lg"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            )}
          </div>
        )}
      </div>

      {view === "month" && (
        <MonthView
          calMonth={calMonth} setCalMonth={setCalMonth} today={today}
          selectedDay={selectedDay} setSelectedDay={setSelectedDay}
          monthByDay={monthByDay} studentMap={studentMap}
          onJumpToday={jumpToday} onAdd={openAdd} {...actions} />
      )}
      {view === "week" && (
        <WeekView
          week={week} anchor={anchor} setAnchor={setAnchor} today={today}
          selectedDay={selectedDay} setSelectedDay={setSelectedDay}
          weekByDay={weekByDay} studentMap={studentMap}
          onJumpToday={jumpToday} onAdd={openAdd} {...actions} />
      )}
      {view === "day" && (
        <DayView
          anchor={anchor} setAnchor={setAnchor} today={today}
          sessions={dayList} studentMap={studentMap}
          onJumpToday={jumpToday} onAdd={openAdd} {...actions} />
      )}

      {addDate && (
        <AddScheduleModal date={addDate} students={students ?? []}
          onClose={() => setAddDate(null)} onResult={msg} />
      )}
      {manageTarget && (
        <ManageSessionSheet
          session={manageTarget.session}
          kontek={manageTarget.kontek}
          studentName={studentMap.get(manageTarget.session.studentId)?.name ?? "Murid"}
          students={students ?? []}
          onClose={() => setManageTarget(null)}
          onResult={msg}
        />
      )}
    </div>
  );
}
