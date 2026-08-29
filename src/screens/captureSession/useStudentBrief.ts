import { useState, useEffect } from "react";
import { getStudent, getLastDoneSession, listPendingFollowUps } from "../../db/repos";
import type { Student, Session, FollowUpItem } from "../../db/types";

export default function useStudentBrief(studentId: string) {
  const [currentStudent, setCurrentStudent] = useState<Student | undefined>();
  const [studentSubjects, setStudentSubjects] = useState<string[]>([]);
  const [briefLastSession, setBriefLastSession] = useState<Session | undefined>();
  const [briefFollowUps, setBriefFollowUps] = useState<FollowUpItem[]>([]);

  useEffect(() => {
    if (!studentId) {
      setCurrentStudent(undefined);
      setStudentSubjects([]);
      setBriefLastSession(undefined);
      setBriefFollowUps([]);
      return;
    }
    let cancelled = false;
    Promise.all([
      getStudent(studentId),
      getLastDoneSession(studentId),
      listPendingFollowUps(studentId),
    ]).then(([stud, lastSess, fu]) => {
      if (cancelled) return;
      setCurrentStudent(stud);
      setStudentSubjects(stud?.subjects ?? []);
      setBriefLastSession(lastSess);
      setBriefFollowUps(fu);
    });
    return () => { cancelled = true; };
  }, [studentId]);

  return { currentStudent, studentSubjects, briefLastSession, briefFollowUps };
}