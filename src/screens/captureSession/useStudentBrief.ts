import { useState, useEffect } from "react";
import {
  getStudent, getLastDoneSession, listPendingFollowUps, getRecentDoneSessions,
} from "../../db/repos";
import type { Student, Session, FollowUpItem } from "../../db/types";

export default function useStudentBrief(studentId: string) {
  const [currentStudent, setCurrentStudent] = useState<Student | undefined>();
  const [studentSubjects, setStudentSubjects] = useState<string[]>([]);
  const [briefLastSession, setBriefLastSession] = useState<Session | undefined>();
  const [briefFollowUps, setBriefFollowUps] = useState<FollowUpItem[]>([]);
  /** Tiga sesi DONE terakhir — sumber chip "topik sesi lalu" (audit P1 #8). */
  const [studentRecentSessions, setStudentRecentSessions] = useState<Session[]>([]);

  useEffect(() => {
    if (!studentId) {
      setCurrentStudent(undefined);
      setStudentSubjects([]);
      setBriefLastSession(undefined);
      setBriefFollowUps([]);
      setStudentRecentSessions([]);
      return;
    }
    let cancelled = false;
    Promise.all([
      getStudent(studentId),
      getLastDoneSession(studentId),
      listPendingFollowUps(studentId),
      getRecentDoneSessions(studentId, 3),
    ]).then(([stud, lastSess, fu, recent]) => {
      if (cancelled) return;
      setCurrentStudent(stud);
      setStudentSubjects(stud?.subjects ?? []);
      setBriefLastSession(lastSess);
      setBriefFollowUps(fu);
      setStudentRecentSessions(recent);
    });
    return () => { cancelled = true; };
  }, [studentId]);

  return {
    currentStudent, studentSubjects, briefLastSession, briefFollowUps,
    studentRecentSessions,
  };
}