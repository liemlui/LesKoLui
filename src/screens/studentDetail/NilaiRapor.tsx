import type { Session, Student } from "../../db/types";
import EngagementSummary from "./EngagementSummary";

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
}

/** Tab progres belajar murid, termasuk ringkasan keaktifan per mapel. */
export default function NilaiRapor({
  engSessions, avgEngScore, engTrend, recentEng, subjectEngStats,
  subjectPage, setSubjectPage, student, responseStats,
}: NilaiRaporProps) {
  return (
    <>
      {/* ── KESERIUSAN BELAJAR ── */}
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
