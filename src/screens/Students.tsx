import Skeleton from "../components/Skeleton";
import { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Link, useNavigate } from "react-router-dom";
import {
  listStudents,
  listSessionsForMonth, listAllUpcomingScheduled,
  listPendingFollowUps, listPayments,
} from "../db/repos";
import type { StudentBillingUpdateOptions } from "../db/repos";
import { todayWIB, monthOf, monthLabel, dayLabel } from "../lib/format";
import { useSettingsQuery } from "../hooks/useSettingsQuery";
import { useStudentEditor } from "../hooks/useStudentEditor";
import SettingsLoadError from "../components/SettingsLoadError";
import { colorForStudent } from "../lib/studentColor";
import type { Student } from "../db/types";
import {
  STUDENT_SORT_DEFAULT,
  STUDENT_SORT_OPTIONS,
  aktifSejakLabel,
  countAttention,
  filterStudents,
  kartuIdentitasBaris,
  listAttentionCount,
  ringkasSesiBulanIni,
  sortStudents,
  studentSortLabel,
  type StudentListSignals,
  type StudentSortKey,
} from "../lib/studentList";
import StudentForm from "../components/StudentForm";
import StudentActionsSheet from "../components/StudentActionsSheet";
import Modal from "../components/Modal";
import PaginationControls from "../components/PaginationControls";
import Badge from "../components/Badge";
import { clampPage, paginateItems } from "../lib/pagination";
import { BellIcon, PencilIcon, ReceiptIcon } from "../components/icons";

type Tab = "aktif" | "historis";

export default function Students() {
  const today        = todayWIB();
  const currentMonth = monthOf(today);
  const navigate     = useNavigate();
  const allStudents   = useLiveQuery(() => listStudents(), []);
  const monthSessions = useLiveQuery(() => listSessionsForMonth(currentMonth), [currentMonth]);
  const settingsQuery = useSettingsQuery();
  const upcomingSched = useLiveQuery(() => listAllUpcomingScheduled(today), [today]);
  const followUps     = useLiveQuery(() => listPendingFollowUps(), []);
  const payments      = useLiveQuery(() => listPayments(), []);

  const [tab, setTab] = useState<Tab>("aktif");
  const [search, setSearch] = useState("");
  // Butir 12 G3-06: urutan dan penyaringan daftar. Keduanya hanya keadaan layar —
  // tidak ada yang disimpan ke basis data, jadi tidak ada perubahan skema.
  const [sortKey, setSortKey] = useState<StudentSortKey>(STUDENT_SORT_DEFAULT);
  const [onlyAttention, setOnlyAttention] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [activePage, setActivePage] = useState(1);
  const [histPage, setHistPage] = useState(1);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  // Menu aksi satu murid (butir 11 G3-06). Sebelumnya aksi merusak di layar ini
  // punya modal PIN-nya SENDIRI; sekarang dipakai bersama layar Detail Murid lewat
  // `StudentActionsSheet` supaya kedua layar tidak bisa berbeda perilaku.
  const [actionTarget, setActionTarget] = useState<Student | null>(null);
  const { saveStudent } = useStudentEditor();

  // Hanya jumlah sesi dan jam yang dihitung. Nilai `cost` pernah ikut dijumlahkan
  // di sini padahal tidak pernah ditampilkan di kartu (temuan RENCANA-G3-06 §4
  // butir 6); dihapus 2026-10-10 supaya layar ini tidak menyimpan data uang yang
  // tidak melewati gerbang `useMoneyVisible` (keputusan B1).
  const statsMap = useMemo(() => {
    const m = new Map<string, { count: number; hours: number }>();
    (monthSessions ?? []).forEach((s) => {
      const curr = m.get(s.studentId) ?? { count: 0, hours: 0 };
      m.set(s.studentId, {
        count: curr.count + 1,
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

  // Peringatan "masih ada N jadwal mendatang" pindah ke `StudentActionsSheet`
  // (butir 11 G3-06): menu aksinya dipakai bersama layar Detail Murid, jadi
  // peringatannya pun satu tempat.

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

  // Sinyal yang dipakai pengurutan dan penyaringan (butir 12 G3-06). Disusun sekali
  // di sini supaya layar tetap membaca peta yang sudah ada, bukan menghitung ulang
  // per kartu.
  const signals = useMemo<StudentListSignals>(() => ({
    nextSessionDate: (id) => nextSessionMap.get(id)?.date,
    attentionCount: (id) =>
      listAttentionCount(followUpCountMap.get(id) ?? 0, unpaidCountMap.get(id) ?? 0),
  }), [nextSessionMap, followUpCountMap, unpaidCountMap]);

  // Ringkasan "yang akan ikut terhapus" TIDAK lagi dihitung di sini: sejak butir
  // 11 G3-06 ia hidup di `studentDeleteSummary()` dan dipakai bersama menunya
  // (`StudentActionsSheet`), supaya layar Daftar dan layar Detail tidak pernah
  // melaporkan angka yang berbeda untuk aksi yang sama.

  // Post-add guidance: show until the just-added student gets a schedule or session.
  const justAddedStudent = useMemo(
    () => (justAddedId ? (allStudents ?? []).find((s) => s.id === justAddedId) : undefined),
    [justAddedId, allStudents]
  );
  const showFirstScheduleGuide = Boolean(
    justAddedStudent && !nextSessionMap.has(justAddedStudent.id) && !statsMap.has(justAddedStudent.id)
  );

  const q = search.toLowerCase().trim();

  // Dua tingkat, dan bedanya disengaja: `sumber*` adalah yang cocok dengan
  // pencarian — itulah dasar hitungan tombol "butuh perhatian", supaya angkanya
  // menjawab "berapa di daftar yang sedang saya lihat". `active`/`inactive` adalah
  // yang benar-benar ditampilkan sesudah filter perhatian ikut dipakai.
  const sumberAktif = useMemo(
    () => filterStudents((allStudents ?? []).filter((s) => s.active), { query: q }, signals),
    [allStudents, q, signals],
  );
  const sumberHistoris = useMemo(
    () => filterStudents((allStudents ?? []).filter((s) => !s.active), { query: q }, signals),
    [allStudents, q, signals],
  );

  const active = useMemo(
    () => sortStudents(filterStudents(sumberAktif, { onlyAttention }, signals), sortKey, signals),
    [sumberAktif, onlyAttention, sortKey, signals],
  );
  const inactive = useMemo(
    () => sortStudents(filterStudents(sumberHistoris, { onlyAttention }, signals), sortKey, signals),
    [sumberHistoris, onlyAttention, sortKey, signals],
  );

  const perhatianTampil = useMemo(
    () => countAttention(tab === "aktif" ? sumberAktif : sumberHistoris, signals),
    [tab, sumberAktif, sumberHistoris, signals],
  );

  /** Jumlah murid aktif apa adanya — dasar ringkasan bulan, bukan hasil penyaringan. */
  const jumlahMuridAktif = useMemo(
    () => (allStudents ?? []).filter((s) => s.active).length,
    [allStudents],
  );

  const totalMonthSessions = useMemo(
    () => [...statsMap.values()].reduce((sum, s) => sum + s.count, 0),
    [statsMap]
  );

  const safeActivePage = clampPage(activePage, active.length);
  const safeHistPage   = clampPage(histPage, inactive.length);
  const paginatedActive   = paginateItems(active, safeActivePage);
  const paginatedInactive = paginateItems(inactive, safeHistPage);

  // G2-10: "gagal baca" punya jalan keluar, bukan layar yang menggantung.
  if (settingsQuery.error || settingsQuery.timedOut) {
    return <SettingsLoadError screen="Daftar murid" busy={settingsQuery.retrying} onRetry={settingsQuery.retry} />;
  }
  if (!allStudents) return <Skeleton variant="card" lines={4} className="p-4" />;

  const handleSave = async (
    data: Omit<Student, "id">,
    options?: StudentBillingUpdateOptions,
  ) => {
    const id = await saveStudent(data, options, editing);
    if (!editing && (allStudents ?? []).length === 0) setJustAddedId(id);
    setShowForm(false);
    setEditing(null);
  };

  /** Sekarang seluruh aksi per murid ditangani `StudentActionsSheet`. */
  const openActions = (student: Student) => setActionTarget(student);

  const renderStudentCard = (s: Student) => {
    const stats = statsMap.get(s.id);
    const next  = nextSessionMap.get(s.id);
    const pendingFollowUps = followUpCountMap.get(s.id) ?? 0;
    const unpaidInvoices = unpaidCountMap.get(s.id) ?? 0;
    // Butir 13 G3-06: kartu dipotong menjadi TIGA baris keterangan —
    // (1) nama + penanda keadaan, (2) identitas akademik, (3) keanggotaan + sesi bulan ini.
    // Yang sengaja tidak lagi ada di kartu: chip mapel, nama orang tua, dan
    // "N bulan bersama". Semuanya tetap ada di halaman Detail Murid. Jumlah bulan
    // dibuang karena pembulatan ke bawah pernah membuat murid yang bergabung
    // lewat sebulan terbaca "1 bulan bersama"; bulan + tahun tidak bisa salah baca.
    const identitas = kartuIdentitasBaris(s);
    const keanggotaan = aktifSejakLabel(s.enrolledAt);
    const sesiBulanIni = ringkasSesiBulanIni(stats);

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
          diff === 0 ? "bg-[var(--brand-solid)] text-[var(--on-strong)]" : "bg-[var(--brand-tint)] text-[var(--ink-brand)]"
        }`}>
          📅 {label}{timeStr}
        </span>
      );
    })();

    return (
      <div key={s.id} className="bg-[var(--surface-strong)] rounded-xl shadow-sm border border-[var(--border)]">
        <Link to={`/students/${s.id}`} className="block p-4">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-[var(--on-strong)] font-bold text-lg flex-shrink-0"
              style={{ background: colorForStudent(s.id) }}>
              {s.name.charAt(0).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              {/* Baris 1 — nama dan seluruh penanda keadaan */}
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-base">{s.name}</p>
                {!s.active && (
                  <span className="text-xs bg-[var(--bg-subtle)] text-[var(--ink-muted)] px-2 py-0.5 rounded-full">nonaktif</span>
                )}
                {nextChip}
                {pendingFollowUps > 0 && (
                  <Badge tone="amber" size="sm"><BellIcon size={11} className="inline align-[-2px] mr-1" />{pendingFollowUps} follow-up</Badge>
                )}
                {unpaidInvoices > 0 && (
                  <Badge tone="red" size="sm"><ReceiptIcon size={11} className="inline align-[-2px] mr-1" />{unpaidInvoices} tagihan belum dibayar</Badge>
                )}
              </div>

              {/* Baris 2 — identitas akademik, memakai label PENDEK kurikulum */}
              {identitas && (
                <p className="text-sm text-[var(--ink-muted)] truncate">{identitas}</p>
              )}

              {/* Baris 3 — sejak kapan bergabung + sesi bulan ini */}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {keanggotaan && (
                  <span className="text-xs text-[var(--ink-muted)]">{keanggotaan}</span>
                )}
                <span className={stats
                  ? "text-xs font-semibold text-[var(--ink-brand)] bg-[var(--brand-tint)] px-2 py-0.5 rounded-full"
                  : "text-xs text-[var(--ink-muted)]"}>
                  {sesiBulanIni}
                </span>
              </div>
            </div>

            {/* Edit btn */}
            <button
              onClick={(e) => { e.preventDefault(); openActions(s); }}
              className="w-11 h-11 flex items-center justify-center rounded-full bg-[var(--bg-subtle)] hover:bg-[var(--brand-tint-strong)] text-[var(--ink-muted)] hover:text-[var(--ink-brand)] flex-shrink-0 transition-colors text-sm"
              aria-label="Edit murid" title="Edit murid"
            ><PencilIcon size={13} className="mr-1 inline align-[-2px]" /></button>
          </div>
        </Link>

        {/* Action bar — satu pintu ke menu aksi (butir 11 G3-06).
            Dulu ada dua tombol telanjang di sini (Nonaktifkan + Hapus), dan
            keduanya memanggil jalur PIN-nya sendiri. Sekarang keduanya hidup di
            dalam menu yang sama dengan layar Detail Murid, sehingga tombol hapus
            tidak mungkin lagi berperilaku berbeda di dua layar. */}
        <div className="border-t border-[var(--border)] px-4 py-2">
          <button
            onClick={() => openActions(s)}
            aria-label={`Kelola ${s.name}`}
            className="inline-flex w-full min-h-[44px] items-center justify-center text-xs font-semibold text-[var(--ink-muted)] hover:text-[var(--ink-strong)] px-3 py-1 rounded-lg hover:bg-[var(--surface)] transition-colors"
          >
            Kelola murid
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
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-[var(--brand-solid)] text-[var(--on-strong)] shadow transition-colors"
          onClick={() => { setEditing(null); setShowForm(true); }}
        >
          <span className="text-base leading-none">+</span>
          Tambah Murid
        </button>
      </div>

      {/* Audit L-07 / Q22(b): layar ini sebelumnya hanya punya `h1`, sehingga daftar
          heading pembaca layar kosong dan ambang guard G1-11 ("setiap layar ≥1 h2")
          gagal. Judul blok dibuat sr-only supaya kepadatan layar tidak bertambah. */}
      <h2 className="sr-only">Daftar murid</h2>

      {/* Post-add guidance */}
      {showFirstScheduleGuide && justAddedStudent && (
        <div className="bg-[var(--brand-tint)] border border-[var(--brand-tint-strong)] rounded-xl p-3 flex items-start gap-2">
          <span className="text-xl">🎯</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--ink-brand)]">
              Murid "{justAddedStudent.name}" sudah terdaftar!
            </p>
            <p className="text-xs text-[var(--ink-brand)] mt-0.5">
              Langkah berikutnya: buat jadwal sesi pertama mereka.
            </p>
            <div className="flex gap-2 mt-2">
              <button onClick={() => navigate("/")}
                className="inline-flex min-h-[44px] items-center text-xs font-semibold bg-[var(--brand-solid)] text-[var(--on-strong)] px-3 py-1.5 rounded-lg hover:bg-[var(--brand-solid)] transition-colors">
                Buka Kalender
              </button>
              <button onClick={() => setJustAddedId(null)}
                className="inline-flex min-h-[44px] items-center text-xs font-semibold text-[var(--ink-brand)] px-3 py-1.5 rounded-lg hover:bg-[var(--brand-tint-strong)] transition-colors">
                Nanti saja
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary banner */}
      {totalMonthSessions > 0 && (
        <div className="bg-[var(--brand-tint)] rounded-xl p-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--ink-brand)] font-medium uppercase tracking-wide">{monthLabel(currentMonth)}</p>
            <p className="text-sm font-bold text-[var(--ink-brand)]">{totalMonthSessions} sesi · {jumlahMuridAktif} murid aktif</p>
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
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] text-sm">🔍</span>
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
          <button aria-label="Hapus pencarian" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] hover:text-[var(--ink-muted)]"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        )}
      </div>

      {/* Tab selector */}
      <div className="flex gap-2 bg-[var(--bg-subtle)] rounded-xl p-1">
        <button onClick={() => setTab("aktif")}
          className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-colors ${tab === "aktif" ? "bg-[var(--surface-strong)] text-[var(--ink-brand)] shadow-sm" : "text-[var(--ink-muted)]"}`}>
          Aktif ({active.length})
        </button>
        <button onClick={() => setTab("historis")}
          className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-colors ${tab === "historis" ? "bg-[var(--surface-strong)] text-[var(--ink-strong)] shadow-sm" : "text-[var(--ink-muted)]"}`}>
          Historis ({inactive.length})
        </button>
      </div>

      {/* Kontrol urutan dan penyaringan (butir 12 G3-06).
          Spanduk kuning lama hanya MEMBERI TAHU berapa murid yang butuh perhatian;
          sekarang tombol ini yang menyaring, dengan angka yang sama. Tombolnya
          selalu ada supaya filter bisa dilepas walau hasilnya sedang kosong. */}
      <div className="flex items-end gap-2">
        <div className="flex-1 min-w-0">
          <label htmlFor="urutkan-murid" className="label">Urutkan</label>
          <select
            id="urutkan-murid"
            className="input min-h-[44px]"
            value={sortKey}
            onChange={(e) => {
              setSortKey(e.target.value as StudentSortKey);
              setActivePage(1);
              setHistPage(1);
            }}
          >
            {STUDENT_SORT_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>{option.label}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          aria-pressed={onlyAttention}
          onClick={() => {
            setOnlyAttention((v) => !v);
            setActivePage(1);
            setHistPage(1);
          }}
          className={`inline-flex min-h-[44px] items-center gap-1.5 px-3 rounded-xl border text-xs font-semibold transition-colors ${
            onlyAttention
              ? "bg-[var(--bg-warn)] border-[var(--border-warn)] text-[var(--ink-warn)]"
              : "bg-[var(--bg-subtle)] border-[var(--border)] text-[var(--ink-muted)]"
          }`}
        >
          <BellIcon size={14} />
          {onlyAttention ? "Tampilkan semua" : `Butuh perhatian (${perhatianTampil})`}
        </button>
      </div>

      {/* Label urutan yang sedang dipakai — diminta butir 12 supaya tutor tidak
          perlu menebak dari isi kotak pilihan saja. Bukan live region: layar ini
          sudah punya beberapa, dan dua `role="status"` pernah mematahkan locator. */}
      <p className="text-xs text-[var(--ink-muted)]">
        Menampilkan {tab === "aktif" ? active.length : inactive.length} murid
        {" · "}urutan <span className="font-semibold text-[var(--ink-strong)]">{studentSortLabel(sortKey)}</span>
        {onlyAttention ? " · hanya yang butuh perhatian" : ""}
      </p>

      {/* Active students */}
      {tab === "aktif" && (
        <>
          {active.length === 0 ? (
            q ? (
              <p className="text-[var(--ink-muted)] text-center py-8">Tidak ada hasil untuk "{search}".</p>
            ) : onlyAttention ? (
              <p className="text-[var(--ink-muted)] text-center py-8">
                Tidak ada murid aktif yang butuh perhatian saat ini.
              </p>
            ) : (
              <div className="text-center py-8">
                <p className="text-[var(--ink-muted)]">Belum ada murid aktif.</p>
                <button
                  onClick={() => { setEditing(null); setShowForm(true); }}
                  className="mt-3 text-sm font-semibold text-[var(--ink-brand)] bg-[var(--brand-tint)] hover:bg-[var(--brand-tint-strong)] px-4 py-2 rounded-xl transition-colors"
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
              <p className="text-[var(--ink-muted)] text-center py-8">Tidak ada hasil untuk "{search}".</p>
            ) : onlyAttention ? (
              <p className="text-[var(--ink-muted)] text-center py-8">
                Tidak ada murid nonaktif yang butuh perhatian saat ini.
              </p>
            ) : (
              <p className="text-[var(--ink-muted)] text-center py-8">Tidak ada murid nonaktif.</p>
            )
          ) : (
            <div className="space-y-2">
              {paginatedInactive.map(renderStudentCard)}
            </div>
          )}
          <PaginationControls page={safeHistPage} total={inactive.length} onPageChange={setHistPage} label="murid" />
        </>
      )}

      {/* Menu aksi murid — dipakai bersama layar Detail Murid (butir 11 G3-06). */}
      {actionTarget && (
        <StudentActionsSheet
          student={actionTarget}
          actions={actionTarget.active
            ? ["edit", "deactivate", "delete"]
            : ["edit", "activate", "delete"]}
          onClose={() => setActionTarget(null)}
        />
      )}
    </div>
  );
}
