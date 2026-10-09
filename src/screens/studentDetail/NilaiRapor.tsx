import type { RaporGrade, Session, Student } from "../../db/types";
import EngagementSummary from "./EngagementSummary";
import PerbandinganNilai from "./PerbandinganNilai";
import NilaiRaporIsian from "./NilaiRaporIsian";

interface NilaiRaporProps {
  engSessions: Session[];
  avgEngScore: number | null;
  engTrend: string | null;
  recentEng: Session[];
  subjectEngStats: { subject: string; avgScore: number; count: number; prepRate: number; phoneRate: number; drowsyRate: number }[];
  subjectPage: number;
  setSubjectPage: (v: number) => void;
  student: Student;
  responseStats: { answered: number; rows: { label: string; count: number }[] };
  /**
   * Semua sesi murid — sumber tabel prediksi vs nilai akhir (butir 4 G3-06).
   * Bukan `engSessions`: tabel itu juga harus memuat sesi yang tidak punya
   * pengamatan kondisi sama sekali, karena nilai ujian tidak bergantung pada
   * apakah tutor sempat mengisi indikator keaktifan.
   */
  allSessions: readonly Session[];
  /** Nilai rapor per semester — sumber isian nilai rapor (butir 5 G3-06). */
  raporGrades: readonly RaporGrade[];
  /** Notifikasi singkat dari induk, dipakai isian nilai rapor saat menyimpan. */
  notify: (text: string) => void;
}

/**
 * Tab Progres — dua hal yang menjawab pertanyaan berbeda:
 *
 * 1. **Prediksi vs Nilai Akhir** (butir 4) — hasil akademik, dasar angka yang
 *    bisa dibandingkan dengan laporan ke orang tua.
 * 2. **Kesimpulan + ringkasan keterlibatan** — kondisi belajar, yaitu *cara*
 *    murid sampai ke hasil itu.
 *
 * Urutannya disengaja: hasil akademik lebih dulu, karena itu yang paling sering
 * ditanyakan orang tua.
 */
export default function NilaiRapor({
  engSessions, avgEngScore, engTrend, recentEng, subjectEngStats,
  subjectPage, setSubjectPage, student, responseStats, allSessions,
  raporGrades, notify,
}: NilaiRaporProps) {
  return (
    <>
      <PerbandinganNilai sessions={allSessions} />

      <NilaiRaporIsian student={student} raporGrades={raporGrades} notify={notify} />

      <EngagementSummary
        engSessions={engSessions}
        avgEngScore={avgEngScore}
        engTrend={engTrend}
        recentEng={recentEng}
        subjectEngStats={subjectEngStats}
        subjectPage={subjectPage}
        setSubjectPage={setSubjectPage}
        student={student}
        responseStats={responseStats}
      />
    </>
  );
}
