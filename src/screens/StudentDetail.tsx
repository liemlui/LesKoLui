import Skeleton from "../components/Skeleton";
import { useMemo, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  getStudent, listSessionsByStudent, listScheduledForStudent,
  updateStudent,
  listIaEeProjects,
  deleteSession, updateSession,
  getStudyNote, saveStudyNote,
  countUnbilledBillableSessions,
  listPaymentsByStudent,
  listPendingFollowUps,
  listRaporGrades,
} from "../db/repos";
import { verifyPin } from "../lib/crypto";
import { getPinLockoutDelay, recordPinFailure, resetPinLockout } from "../lib/pinLockout";
import { todayWIB, formatRupiah } from "../lib/format";
import type { Session } from "../db/types";
import { billingPolicyOf } from "../db/types";
import { CURRICULUM_META } from "../lib/ibSubjects";
import Tabs from "../components/Tabs";
import Badge from "../components/Badge";
import { clampPage, paginateItems } from "../lib/pagination";
import Modal from "../components/Modal";
import SettingsLoadError from "../components/SettingsLoadError";
import { useMoneyVisible } from "../hooks/useMoneyVisible";
import { useSettingsQuery } from "../hooks/useSettingsQuery";
import { getResponseTag } from "../lib/responseTaxonomy";
import { MAX_HOURLY_RATE, isValidCurrencyAmount } from "../lib/money";
import EvidenceCard from "./studentDetail/EvidenceCard";
import StudyNoteCard from "./studentDetail/StudyNoteCard";
import UpcomingSchedule from "./studentDetail/UpcomingSchedule";
import SessionDetailModal from "./studentDetail/SessionDetailModal";
import SessionNoteEditModal from "./studentDetail/SessionNoteEditModal";
import ScheduleEditModal from "./studentDetail/ScheduleEditModal";
import PerluTindakanCard from "./studentDetail/PerluTindakanCard";
import UangBlok from "./studentDetail/UangBlok";
import StudentActionsSheet from "../components/StudentActionsSheet";
import RiwayatSesi from "./studentDetail/RiwayatSesi";
import RiwayatPembayaran from "./studentDetail/RiwayatPembayaran";
import IaEeTracker from "./studentDetail/IaEeTracker";
import NilaiRapor from "./studentDetail/NilaiRapor";
import { engagementAverage, sessionEngagementScore } from "../lib/engagement";
import { studentActions } from "../lib/studentActions";
import { PencilIcon, ChartIcon, ChatIcon } from "../components/icons";

/**
 * StudentDetail — halaman detail murid.
 *
 * Peta tab yang mengikat (keputusan `ATURAN-AI.md` §4.1 "Tetap"): **Ringkas ·
 * Sesi · Progres · Proyek**. Uang hanya muncul di tab Ringkas.
 *
 * Sebelumnya komentar ini menulis "5 tab: Sesi, Rapor, Penagihan, IA/EE, AI
 * Insights" — nama yang sudah lama tidak ada di antarmuka. Diperbarui 2026-10-09
 * bersama penggantian label "Sesi & Jadwal" → "Sesi" dan "IA/EE/PP" → "Proyek".
 *
 * Mengelola: sesi dan jadwal murid, nilai rapor, proyek tugas panjang, kondisi
 * belajar, serta penghapusan sesi dengan PIN Keuangan.
 *
 * @component
 * @route /student/:id
 */
export default function StudentDetail() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const today    = todayWIB();

  const student       = useLiveQuery(() => (id ? getStudent(id) : undefined), [id]);
  const allSessions   = useLiveQuery(() => (id ? listSessionsByStudent(id) : []), [id]);
  const upcomingSched = useLiveQuery(() => (id ? listScheduledForStudent(id, today) : []), [id, today]);
  const settingsQuery = useSettingsQuery();
  const settings      = settingsQuery.settings;
  const studyNote      = useLiveQuery(() => (id ? getStudyNote(id) : undefined), [id]);
  const iaeeProjects  = useLiveQuery(() => (id ? listIaEeProjects(id) : []), [id]);
  // Sesi lama yang belum ditagih — menentukan apakah pilihan retroaktif perlu
  // ditawarkan pada edit tarif inline. Tarif historis beku secara default (D1(c)).
  const unbilledCount = useLiveQuery(() => (id ? countUnbilledBillableSessions(id) : 0), [id]);
  // Riwayat pembayaran murid ini (keputusan pemilik 2026-10-07: transaksi lunas
  // tempatnya di halaman murid, bukan di layar Keuangan).
  const studentPayments = useLiveQuery(() => (id ? listPaymentsByStudent(id) : []), [id]);
  // Tindak lanjut murid ini — sumber salah satu butir kartu Perlu Tindakan.
  const studentFollowUps = useLiveQuery(() => (id ? listPendingFollowUps(id) : []), [id]);
  // Nilai rapor per semester — sumber isian nilai rapor di tab Progres (butir 5).
  const raporGrades = useLiveQuery(() => (id ? listRaporGrades(id) : []), [id]);

  // Edit scheduled session modal — state-nya pindah ke
  // `studentDetail/ScheduleEditModal.tsx` (G3-06 fase A). Induknya hanya
  // menyimpan JADWAL MANA yang sedang disunting.
  const [editTarget, setEditTarget] = useState<Session | null>(null);

  /** Membuka modal edit jadwal untuk satu sesi terjadwal. */
  const openEditSched = (s: Session) => setEditTarget(s);

  const [showBillingHelp, setShowBillingHelp] = useState(false);
  const [subjectPage,    setSubjectPage]    = useState(1);
  const [upcomingPage,   setUpcomingPage]   = useState(1);
  const [historyPage,    setHistoryPage]    = useState(1);
  const [detailTab,      setDetailTab]      = useState("ringkasan");
  // Default "Semua bulan" ("") — default bulan-berjalan menipu: kalau bulan ini
  // belum ada sesi, option-nya tak ada di dropdown → browser MENAMPILKAN
  // "Semua bulan" padahal filter aktif bulan ini → riwayat tampak kosong.
  const [historyMonth,   setHistoryMonth]   = useState("");
  const [schedMonth,     setSchedMonth]     = useState<string>("");

  // Session detail + delete
  const [detailSession,    setDetailSession]    = useState<import("../db/types").Session | null>(null);
  const [deletePinInput,   setDeletePinInput]   = useState("");
  const [deletePinError,   setDeletePinError]   = useState("");
  const [showDeletePin,    setShowDeletePin]     = useState(false);

  const [flash, setFlash] = useState("");
  function msg(t: string) { setFlash(t); setTimeout(() => setFlash(""), 3000); }

  /**
   * Menu aksi murid (butir 11 G3-06) — komponen yang sama dengan layar Daftar Murid.
   *
   * **Kenapa state ini ada di sini, bukan di dekat tombolnya.** Sampai 2026-10-10
   * `useState`-nya diletakkan setelah gerbang `!student` (baris ~306), sehingga
   * render pertama (murid belum termuat) menjalankan hook yang lebih sedikit
   * daripada render kedua. React melempar *"Rendered more hooks than during the
   * previous render"* dan seluruh layar Detail Murid jatuh ke batas galat —
   * ketahuan dari penjaga `e2e:uiux` (layar tanpa h1 karena yang tampil panel
   * galat), bukan dari penalaran. Jebakan yang sama sudah tercatat di
   * `ATURAN-AI.md` §7: semua hook WAJIB berada sebelum gerbang `return`.
   */
  const [actionsOpen, setActionsOpen] = useState(false);

  // Catatan: state IA/EE/PP (11 useState + form milestone) TIDAK lagi di sini —
  // seluruhnya pindah ke `studentDetail/IaEeTracker.tsx` karena tidak ada bagian
  // lain layar ini yang memakainya (audit utang teknis #3).

  // Tarif les — visibilitas uang lewat SATU hook (kontrak K3.1/K3.6), bukan state
  // lokal per layar. Gerbang PIN untuk aksi (ganti tarif, hapus sesi) tetap ada.
  // State sunting tarif (nilai, sedang menyimpan, centang retroaktif) pindah ke
  // `studentDetail/UangBlok.tsx` sejak butir 3 G3-06.
  const money = useMoneyVisible();

  const handleDeleteSession = async () => {
    if (!detailSession) return;
    if (!settings?.financialPin) {
      // Dulu `alert()` bawaan peramban. Dialog bawaan dilarang keputusan
      // `ATURAN-AI.md` §4.1, dan modal ini SUDAH punya keadaan tanpa-PIN beserta
      // tombol "Atur PIN Keuangan" — jadi cukup buka keadaan itu, dan tutor
      // langsung dapat jalan keluarnya alih-alih pesan yang harus ditutup dulu.
      setDeletePinError("");
      setShowDeletePin(true);
      return;
    }
    const delay = getPinLockoutDelay();
    if (delay > 0) { setDeletePinError(`Tunggu ${Math.ceil(delay / 1000)} detik.`); return; }
    const ok = await verifyPin(deletePinInput, settings.financialPin);
    if (!ok) { recordPinFailure(); setDeletePinError("PIN salah."); return; }
    resetPinLockout();
    try {
      await deleteSession(detailSession.id);
    } catch (error) {
      setDeletePinError(error instanceof Error ? error.message : "Sesi tidak dapat dihapus.");
      return;
    }
    setDetailSession(null); setShowDeletePin(false); setDeletePinInput(""); setDeletePinError("");
    msg("Sesi dihapus");
  };

  /**
   * Menyimpan tarif murid. Mengembalikan pesan galat untuk ditampilkan blok uang;
   * string kosong berarti berhasil, jadi pemanggil tidak perlu menebak.
   */
  const handleSaveRate = async (rateValue: number, applyRetroactive: boolean): Promise<string> => {
    if (!id || !isValidCurrencyAmount(rateValue, MAX_HOURLY_RATE)) {
      // Penanda money-safe WAJIB sebaris dengan pemanggilannya: perintah verifikasi K3
      // (`arsitektur/11` §6) dan tes `moneyGate` memfilter per BARIS, bukan per blok.
      return `Tarif harus 1 sampai ${formatRupiah(MAX_HOURLY_RATE)}.`; // money-safe: konstanta batas tarif
    }
    try {
      // D1(c): tanpa centang, sesi lama tidak tersentuh — hanya sesi berikutnya
      // yang memakai tarif baru. Sesi yang sudah punya nominal manual juga tidak
      // pernah ditimpa; blok uang menyebutkan jumlahnya di layar.
      await updateStudent(id, { hourlyRate: rateValue }, { repriceUnbilledSessions: applyRetroactive });
      msg(applyRetroactive ? "Tarif & sesi lama diperbarui ✓" : "Tarif diperbarui ✓");
      return "";
    } catch (e) {
      return "Gagal: " + (e as Error).message;
    }
  };

  // Edit DONE session notes — SELURUH state modal ini pindah ke
  // `studentDetail/SessionNoteEditModal.tsx` (G3-06 fase A). Induknya hanya
  // menyimpan SESI MANA yang sedang disunting; 17 useState, dua useRef, dan dua
  // useEffect pembuat URL blob ikut pindah supaya induk tidak memegang state
  // yang bukan urusannya.
  const [editSession, setEditSession] = useState<Session | null>(null);

  /** Membuka modal edit catatan untuk satu sesi. Sisa state-nya milik modal itu. */
  const openEditNote = (s: Session) => setEditSession(s);

  // Photo + signature URLs for session history
  const [photoUrls, setPhotoUrls] = useState<Map<string, string>>(new Map());
  const [sigUrls,   setSigUrls]   = useState<Map<string, string>>(new Map());
  useEffect(() => {
    const sessions = allSessions ?? [];
    const pUrls = new Map<string, string>();
    const sUrls = new Map<string, string>();
    sessions.forEach((s) => {
      if (s.photo)     pUrls.set(s.id, URL.createObjectURL(s.photo));
      if (s.signature) sUrls.set(s.id, URL.createObjectURL(s.signature));
    });
    setPhotoUrls(pUrls);
    setSigUrls(sUrls);
    return () => {
      pUrls.forEach((u) => URL.revokeObjectURL(u));
      sUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [allSessions]);

  // ── Computed ────────────────────────────────────────────────────────
  // `totalSessions`/`totalHours` dihapus dari sini (butir 3 G3-06): angka itu
  // sudah dihitung di blok Uang, di atas sesi SELESAI saja — bukan atas seluruh
  // riwayat seperti versi lama, yang ikut menghitung sesi terjadwal dan batal.

  // Sessions with engagement data
  const engSessions = useMemo(
    () => (allSessions ?? []).filter((s) => s.engagement != null).sort((a, b) => a.date.localeCompare(b.date)),
    [allSessions]
  );
  /** Hanya sesi yang benar-benar punya DASAR skor (audit P2 #11 / P3 #17).
   *  Sebelumnya sesi ber-`engagement` tetapi tanpa pengamatan ikut terhitung
   *  sebagai "5/10" — merusak rata-rata. */
  const scoredEngSessions = useMemo(
    () => engSessions.filter((s) => sessionEngagementScore(s) != null),
    [engSessions],
  );

  // Last 15 engagement sessions for trend chart
  const recentEng = useMemo(() => scoredEngSessions.slice(-15), [scoredEngSessions]);

  /** Rata-rata + cakupan data: penyebutnya wajib ditampilkan. */
  const engCoverage = useMemo(() => engagementAverage(engSessions), [engSessions]);
  const avgEngScore = engCoverage.average != null
    ? Math.round(engCoverage.average * 10) / 10
    : null;

  // Trend: compare last 5 vs previous 5
  const engTrend = useMemo((): "up" | "down" | "stable" | null => {
    if (scoredEngSessions.length < 6) return null;
    const recent = scoredEngSessions.slice(-5);
    const prev   = scoredEngSessions.slice(-10, -5);
    if (prev.length === 0) return null;
    const rAvg = recent.reduce((s, x) => s + (sessionEngagementScore(x) ?? 0), 0) / recent.length;
    const pAvg = prev.reduce((s, x)   => s + (sessionEngagementScore(x) ?? 0), 0) / prev.length;
    if (rAvg - pAvg > 0.5) return "up";
    if (pAvg - rAvg > 0.5) return "down";
    return "stable";
  }, [scoredEngSessions]);

  /** Sebaran kualitas respons akademik — sumbu kedua (audit P3 #17). */
  const responseStats = useMemo(() => {
    const counts = new Map<string, number>();
    let answered = 0;
    for (const s of engSessions) {
      if (!s.responseTag) continue;
      const tag = getResponseTag(s.responseTag);
      if (!tag) continue;
      counts.set(tag.label, (counts.get(tag.label) ?? 0) + 1);
      answered += 1;
    }
    return {
      answered,
      rows: [...counts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
    };
  }, [engSessions]);

  // Per-subject engagement breakdown
  const subjectEngStats = useMemo(() => {
    const map = new Map<string, { scores: number[]; phoneCount: number; drowsyCount: number; prepCount: number }>();
    scoredEngSessions.forEach((s) => {
      const score = sessionEngagementScore(s);
      if (score == null) return;
      s.subjects.forEach((sub) => {
        const curr = map.get(sub) ?? { scores: [], phoneCount: 0, drowsyCount: 0, prepCount: 0 };
        curr.scores.push(score);
        if (s.engagement!.playingPhone) curr.phoneCount++;
        if (s.engagement!.drowsy)       curr.drowsyCount++;
        if (s.engagement!.prepared)     curr.prepCount++;
        map.set(sub, curr);
      });
    });
    return [...map.entries()]
      .filter(([, d]) => d.scores.length > 0)
      .map(([sub, d]) => ({
        subject:    sub,
        count:      d.scores.length,
        avgScore:   Math.round((d.scores.reduce((a, b) => a + b, 0) / d.scores.length) * 10) / 10,
        phoneRate:  Math.round((d.phoneCount / d.scores.length) * 100),
        drowsyRate: Math.round((d.drowsyCount / d.scores.length) * 100),
        prepRate:   Math.round((d.prepCount / d.scores.length) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [scoredEngSessions]);

  // These useMemos MUST be before the early return to satisfy the Rules of Hooks
  const historyMonthOptions = useMemo(() => {
    const months = new Set<string>();
    (allSessions ?? []).forEach((s) => months.add(s.date.slice(0, 7)));
    return [...months].sort((a, b) => b.localeCompare(a));
  }, [allSessions]);

  const historySessions = useMemo(() =>
    [...(allSessions ?? [])]
      .filter((s) => !historyMonth || s.date.startsWith(historyMonth))
      .sort((a, b) => b.date.localeCompare(a.date) || (b.time ?? "").localeCompare(a.time ?? "")),
    [allSessions, historyMonth]
  );

  // G2-10: kegagalan baca pengaturan punya jalan keluar yang sama di semua layar.
  if (settingsQuery.error || settingsQuery.timedOut) {
    return <SettingsLoadError screen="Detail murid" busy={settingsQuery.retrying} onRetry={settingsQuery.retry} />;
  }

  if (!student) return <Skeleton variant="card" lines={4} className="p-4" />;
  const studentBillingPolicy = billingPolicyOf(student);

  const safeHistoryPage = clampPage(historyPage, historySessions.length);
  const paginatedHistorySessions = paginateItems(historySessions, safeHistoryPage);

  // Aturan "apa yang menunggu tutor" ada di `lib/studentActions.ts`, bukan di JSX.
  const doneSessions = (allSessions ?? []).filter((s) => s.status === "DONE");

  const studentActionList = studentActions({
    today,
    scheduled: upcomingSched ?? [],
    doneSessions,
    payments: studentPayments ?? [],
    followUps: studentFollowUps ?? [],
    unbilledCount: unbilledCount ?? 0,
  });

  // Menu aksi murid: `actionsOpen`/`setActionsOpen` dideklarasikan di atas,
  // bersama state lain — sebelum gerbang `!student` (lihat catatan di sana).

  // Aturan nomor WA yang sama dengan kartu Info Murid di bawah: awalan 0 → 62.
  const parentWaPhone = (student?.parentContact.phone ?? "")
    .replace(/^0/, "62")
    .replace(/[^0-9]/g, "");

  return (
    <div className="p-4 space-y-4 pb-24">

      {/* Back — label menyebut tujuan spesifik, jadi arahkan eksplisit ke daftar
          murid (bukan history-back generik) agar cocok dibuka dari mana pun. */}
      <button onClick={() => navigate("/students")}
        className="flex items-center gap-1.5 text-sm font-medium text-[var(--ink-muted)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle)] px-3 py-2 rounded-xl transition-colors">
        ‹ Kembali ke Daftar Murid
      </button>

      {flash && (
        <div className={`p-2 rounded-lg text-sm text-center font-medium ${flash.includes("✓") ? "bg-[var(--bg-success)] text-[var(--ink-success)]" : "bg-[var(--bg-danger)] text-[var(--ink-danger)]"}`}>
          {flash}
        </div>
      )}

      {/* Header — butir 11 G3-06: kirim WA, sunting/menu aksi, dan jejak navigasi. */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold break-words">{student.name}</h1>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {student.curriculum ? (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CURRICULUM_META[student.curriculum].color} ${CURRICULUM_META[student.curriculum].text}`}>
                {CURRICULUM_META[student.curriculum].shortLabel}
              </span>
            ) : (
              <span className="text-xs text-[var(--ink-muted)]">{student.level}</span>
            )}
            <Badge tone={student.active ? "green" : "slate"}>
              {student.active ? "Aktif" : "Nonaktif"}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {parentWaPhone && (
            <a
              href={`https://wa.me/${parentWaPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Kirim WhatsApp ke orang tua ${student.name}`}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-success)] text-[var(--ink-success)] border border-[var(--border-success)]"
            >
              <ChatIcon size={15} aria-hidden="true" />
            </a>
          )}
          <button
            type="button"
            onClick={() => setActionsOpen(true)}
            aria-label={`Menu aksi untuk ${student.name}`}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-subtle)] text-[var(--ink-muted)]"
          >
            <span aria-hidden="true" className="text-lg leading-none">⋯</span>
          </button>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => navigate(`/capture?studentId=${encodeURIComponent(id ?? "")}`)}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--brand-solid)] text-[var(--on-strong)] text-sm font-semibold shadow-sm hover:bg-[var(--brand-solid)] transition-colors">
          <span><PencilIcon size={13} className="mr-1 inline align-[-2px]" /></span> Catat Sesi
        </button>
        <button onClick={() => navigate(`/report?studentId=${id}`)}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--accent-tint)] text-[var(--ink-accent)] text-sm font-semibold border border-[var(--border-accent)] hover:bg-[var(--accent-tint)] transition-colors">
          <span><ChartIcon size={13} className="mr-1 inline align-[-2px]" /></span> Lihat Laporan
        </button>
        <button onClick={() => navigate(`/payments?tab=tagihan&studentId=${encodeURIComponent(id ?? "")}`)}
          className="col-span-2 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--bg-success)] text-[var(--ink-success)] text-sm font-semibold border border-[var(--border-success)] hover:bg-[var(--bg-success)] transition-colors">
          <span>{studentBillingPolicy === "session_count" ? "" : ""}</span>
          {studentBillingPolicy === "monthly"
            ? "Kelola Penagihan Bulanan"
            : studentBillingPolicy === "session_count"
              ? "Kelola Tagihan Paket"
              : "Buat Tagihan Manual"}
        </button>
        {studentBillingPolicy === "monthly" && (
          <p className="col-span-2 text-xs text-[var(--ink-muted)] -mt-1">
            💡 Laporan perkembangan difinalkan di menu Laporan. Tagihan bulanan diterbitkan dan diperiksa terpisah melalui <strong>Keuangan → Penagihan</strong>.
          </p>
        )}
      </div>

      {/* Tabs navigasi */}
      <Tabs
        tabs={[
          { key: "ringkasan", label: "Ringkas" },
          { key: "sesi", label: "Sesi" },
          { key: "nilai", label: "Progres" },
          { key: "iaee", label: "Proyek" },
        ]}
        active={detailTab}
        onChange={setDetailTab}
        idPrefix="student"
        fullWidth
      />

      {/* Audit L-06: panel per tab SELALU ada di DOM supaya `aria-controls` setiap
          tab menunjuk elemen nyata; isi panel tetap hanya dirender saat tabnya
          aktif (pekerjaan/query tetap lazy). */}
      <div role="tabpanel" id="student-panel-ringkasan" aria-labelledby="student-tab-ringkasan" hidden={detailTab !== "ringkasan"}>
      {detailTab === "ringkasan" && (<>
      {/* Perlu Tindakan — butir 2 G3-06, sengaja PALING ATAS: pertanyaan pertama
          tutor saat membuka murid adalah "ada yang menunggu saya?". Kartunya
          tidak dirender bila tidak ada yang menunggu. */}
      <PerluTindakanCard
        actions={studentActionList}
        onNavigate={(href) => navigate(href)}
        onJump={(anchor) => {
          if (anchor === "#jadwal-mendatang" || anchor === "#riwayat-sesi") setDetailTab("sesi");
        }}
      />

      {/* Info card */}
      <div className="bg-[var(--surface-strong)] rounded-2xl p-4 shadow-sm border border-[var(--border)] space-y-2">
        <h2 className="font-semibold text-[var(--ink-strong)] text-sm mb-2">Info Murid</h2>
        {student.school && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[var(--ink-muted)] w-28 flex-shrink-0">Sekolah</span>
            <span className="text-[var(--ink-strong)] font-medium">{student.school}</span>
          </div>
        )}
        {student.grade && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[var(--ink-muted)] w-28 flex-shrink-0">Kelas</span>
            <span className="text-[var(--ink-strong)] font-medium">{student.grade}</span>
          </div>
        )}
        {student.subjects.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[var(--ink-muted)] w-28 flex-shrink-0">Mapel</span>
            <span className="text-[var(--ink-strong)] font-medium">{student.subjects.join(", ")}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-[var(--ink-muted)] w-28 flex-shrink-0">Orang Tua</span>
          <span className="text-[var(--ink-strong)] font-medium">{student.parentContact.name || "—"}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-[var(--ink-muted)] w-28 flex-shrink-0">WA Ortu</span>
          <a href={`https://wa.me/${student.parentContact.phone.replace(/^0/, "62").replace(/[^0-9]/g, "")}`}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center gap-1.5 text-[var(--ink-success)] font-medium hover:text-[var(--ink-success)]">
            <ChatIcon size={14} aria-hidden="true" />{student.parentContact.phone}
          </a>
        </div>
        {student.studentPhone && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[var(--ink-muted)] w-28 flex-shrink-0">WA Murid</span>
            <a href={`https://wa.me/${student.studentPhone.replace(/^0/, "62").replace(/[^0-9]/g, "")}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center gap-1.5 text-[var(--ink-brand)] font-medium hover:text-[var(--ink-brand)]">
              <ChatIcon size={14} aria-hidden="true" />{student.studentPhone}
            </a>
          </div>
        )}
        {student.notes && (
          <div className="flex items-start gap-2 text-sm">
            <span className="text-[var(--ink-muted)] w-28 flex-shrink-0">Catatan</span>
            <span className="text-[var(--ink-strong)]">{student.notes}</span>
          </div>
        )}
      </div>

      {/* Blok uang — butir 3 G3-06. Satu-satunya tempat angka uang di layar Murid
          (keputusan ATURAN-AI §4.1 butir B1). Sebelumnya tarif dan siklus tagihan
          menumpang di dalam kartu Info Murid di atas. */}
      <UangBlok
        student={student}
        billableSessions={doneSessions}
        unbilledCount={unbilledCount ?? 0}
        billingPolicy={studentBillingPolicy}
        moneyVisible={money.visible}
        needsSetup={money.needsSetup}
        locked={money.locked}
        onLock={money.lock}
        onOpenSettings={() => navigate("/settings")}
        onOpenBillingHelp={() => setShowBillingHelp(true)}
        onSaveRate={handleSaveRate}
      />

      {student && (
        <StudyNoteCard
          studentId={student.id}
          studyNote={studyNote}
          onSave={async (content) => { await saveStudyNote(student.id, content); }}
        />
      )}
      {/* Riwayat pembayaran hidup di tab Ringkasan, bersebelahan dengan kartu
          "Siklus tagihan" — di situ pertanyaan "sudah dibayar berapa?" muncul. */}
      {student && (
        <RiwayatPembayaran
          payments={studentPayments ?? []}
          studentName={student.name}
          onKelolaPenagihan={() => navigate(`/payments?tab=tagihan&studentId=${student.id}`)}
        />
      )}
      </>)}
      </div>

      <div role="tabpanel" id="student-panel-sesi" aria-labelledby="student-tab-sesi" hidden={detailTab !== "sesi"}>
      {detailTab === "sesi" && (<>

      {/* ── BUKTI KEAKTIFAN ── */}
      {avgEngScore !== null && (
        <EvidenceCard engSessions={engSessions} />
      )}

      {/* ── RIWAYAT SESI (diektrak ke studentDetail/RiwayatSesi.tsx) ── */}
      <RiwayatSesi
        allSessions={allSessions ?? []}
        paginatedHistorySessions={paginatedHistorySessions}
        historySessions={historySessions}
        historyMonth={historyMonth}
        historyMonthOptions={historyMonthOptions}
        setHistoryMonth={setHistoryMonth}
        safeHistoryPage={safeHistoryPage}
        setHistoryPage={setHistoryPage}
        photoUrls={photoUrls}
        sigUrls={sigUrls}
        setDetailSession={setDetailSession}
        openEditNote={openEditNote}
        onCaptureFirst={() => navigate("/capture")}
      />

      {/* ── JADWAL MENDATANG ── */}
      <UpcomingSchedule
        upcomingSched={upcomingSched}
        schedMonth={schedMonth}
        setSchedMonth={setSchedMonth}
        upcomingPage={upcomingPage}
        setUpcomingPage={setUpcomingPage}
        today={today}
        openEditSched={openEditSched}
      />
      </>
      )}
      </div>

      <div role="tabpanel" id="student-panel-iaee" aria-labelledby="student-tab-iaee" hidden={detailTab !== "iaee"}>
      {detailTab === "iaee" && (<>

      {/* ── IA / EE / PP TRACKER (diekstrak ke studentDetail/IaEeTracker.tsx) ── */}
      <IaEeTracker student={student!} projects={iaeeProjects ?? []} notify={msg} />
      </>)}
      </div>

      <div role="tabpanel" id="student-panel-nilai" aria-labelledby="student-tab-nilai" hidden={detailTab !== "nilai"}>
      {detailTab === "nilai" && (
        <NilaiRapor
          engSessions={engSessions}
          avgEngScore={avgEngScore}
          engTrend={engTrend}
          recentEng={recentEng}
          subjectEngStats={subjectEngStats}
          subjectPage={subjectPage}
          setSubjectPage={setSubjectPage}
          student={student!}
          responseStats={responseStats}
          allSessions={allSessions ?? []}
          raporGrades={raporGrades ?? []}
          notify={msg}
        />
      )}
      </div>
      {/* Modals — always render regardless of tab */}

      {/* ── EDIT SESSION NOTES MODAL ── */}
      {editSession && (
        <SessionNoteEditModal
          session={editSession}
          moneyVisible={money.visible}
          notify={msg}
          onClose={() => setEditSession(null)}
          onKelolaSesi={() => { setDetailSession(editSession); setEditSession(null); }}
        />
      )}

      {/* ── EDIT SCHEDULE MODAL ── */}
      {editTarget && (
        <ScheduleEditModal
          session={editTarget}
          notify={msg}
          onClose={() => setEditTarget(null)}
        />
      )}

      {/* ── SESSION DETAIL MODAL ── */}
      <SessionDetailModal
        detailSession={detailSession}
        photoUrls={photoUrls}
        sigUrls={sigUrls}
        setDetailSession={setDetailSession}
        settings={settings}
        showDeletePin={showDeletePin}
        setShowDeletePin={setShowDeletePin}
        deletePinInput={deletePinInput}
        setDeletePinInput={setDeletePinInput}
        deletePinError={deletePinError}
        setDeletePinError={setDeletePinError}
        handleDeleteSession={handleDeleteSession}
        openEditNote={openEditNote}
        openSettings={() => { setDetailSession(null); navigate("/settings"); }}
        // Koreksi kondisi sesi (audit P2 #16): tanpa jalur ini, indikator yang
        // salah tetap tersimpan selamanya dan tidak pernah bisa dibersihkan.
        onUpdateSession={async (patch) => {
          await updateSession(detailSession!.id, patch);
          setDetailSession((prev) => (prev ? { ...prev, ...patch } : prev));
          msg("Kondisi sesi diperbarui.");
        }}
      />

      {/* Bantuan siklus tagihan */}
      {showBillingHelp && (
        <Modal onClose={() => setShowBillingHelp(false)} ariaLabel="Cara kerja siklus tagihan">
          <h3 className="font-bold text-base">Siklus Tagihan</h3>
          <p className="text-xs leading-relaxed text-[var(--ink-muted)]">
            Cara murid ini ditagih. Ubah lewat <strong>Edit Profil → Siklus Tagihan</strong>; perubahan hanya memengaruhi sesi yang belum ditagih.
          </p>
          <ul className="space-y-2 text-xs leading-relaxed text-[var(--ink-strong)]">
            <li><strong>Bulanan (Tutup Bulan)</strong> — sesi yang dapat ditagih digabung per bulan lewat Tutup Bulan di Keuangan.</li>
            <li><strong>Paket per N pertemuan</strong> — tagihan dibuat setiap N pertemuan (sesi tertua lebih dulu); sisa yang belum genap ditagih lewat Tagihan Penutup.</li>
            <li><strong>Manual</strong> — buat tagihan nominal bebas tanpa mengambil sesi otomatis.</li>
          </ul>
          <div className="flex gap-3">
            <button onClick={() => setShowBillingHelp(false)}
              className="flex-1 py-3 rounded-xl bg-[var(--brand-solid)] text-[var(--on-strong)] font-bold text-sm">
              Mengerti
            </button>
          </div>
        </Modal>
      )}
      {/* Menu aksi murid — komponen yang SAMA dengan layar Daftar Murid (butir 11
          G3-06), supaya tombol hapus tidak punya dua perilaku berbeda. */}
      {actionsOpen && student && (
        <StudentActionsSheet
          student={student}
          actions={student.active
            ? ["edit", "deactivate", "delete"]
            : ["edit", "activate", "delete"]}
          onClose={() => setActionsOpen(false)}
          onDeleted={() => navigate("/students")}
        />
      )}
    </div>
  );
}
