import { useState } from "react";
import type { Session, Homework, FollowUpItem } from "../../db/types";
import type { StudentMap } from "../../lib/studentColor";
import { dayLabel } from "../../lib/format";
import { clampPage, paginateItems } from "../../lib/pagination";
import PaginationControls from "../../components/PaginationControls";

type HomeworkWithStudent = Homework & { studentName?: string };

interface Props {
  missed: Session[];
  overdue: HomeworkWithStudent[];
  upcomingSoon: HomeworkWithStudent[];
  follows: FollowUpItem[];
  studentMap: StudentMap;
  onCapture: (sessionId: string) => void;
  onCancelSession: (sessionId: string) => void;
  onMarkDone: (homeworkId: string, previousStatus: Homework["status"]) => void;
  onCompleteFollowUp: (id: string) => void;
}

/** Single collapsible "needs attention" inbox consolidating the four alert types. */
export default function AttentionInbox({
  missed, overdue, upcomingSoon, follows, studentMap,
  onCapture, onCancelSession, onMarkDone, onCompleteFollowUp,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [missedPage, setMissedPage] = useState(1);
  const [overduePage, setOverduePage] = useState(1);
  const [upcomingHwPage, setUpcomingHwPage] = useState(1);
  const [followUpPage, setFollowUpPage] = useState(1);

  const total = missed.length + overdue.length + upcomingSoon.length + follows.length;
  if (total === 0) return null;

  const safeMissedPage   = clampPage(missedPage, missed.length);
  const safeOverduePage  = clampPage(overduePage, overdue.length);
  const safeUpcomingPage  = clampPage(upcomingHwPage, upcomingSoon.length);
  const safeFollowUpPage = clampPage(followUpPage, follows.length);

  return (
    <div className="mx-4 mb-2">
      <button
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl">
        <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">⚠️ Perlu Perhatian ({total})</span>
        <span className="text-gray-400 text-sm">{collapsed ? "▸" : "▾"}</span>
      </button>

      {!collapsed && (
        <div className="space-y-2 mt-2">
          {/* Sesi belum dicatat */}
          {missed.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
              <p className="text-xs font-bold text-orange-700 mb-2 uppercase tracking-wide">
                Sesi Belum Dicatat ({missed.length})
              </p>
              <div className="space-y-2">
                {paginateItems(missed, safeMissedPage).map((s) => {
                  const name = studentMap.get(s.studentId)?.name ?? "—";
                  return (
                    <div key={s.id} className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{name}</p>
                        <p className="text-xs text-orange-600">{dayLabel(s.date)} · {s.durationHours}j{s.time ? ` · ${s.time}` : ""}</p>
                      </div>
                      <button onClick={() => onCapture(s.id)}
                        className="flex-shrink-0 text-xs bg-blue-600 text-white px-2.5 py-1.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                        Catat
                      </button>
                      <button onClick={() => onCancelSession(s.id)}
                        className="flex-shrink-0 text-xs bg-gray-100 text-gray-600 px-2 py-1.5 rounded-lg hover:bg-gray-200 transition-colors">
                        Batal
                      </button>
                    </div>
                  );
                })}
              </div>
              <PaginationControls page={safeMissedPage} total={missed.length} onPageChange={setMissedPage} label="sesi" />
            </div>
          )}

          {/* Overdue homework */}
          {overdue.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-xs font-bold text-red-600 mb-2 uppercase tracking-wide">
                🚨 PR Terlambat ({overdue.length})
              </p>
              <div className="space-y-1.5">
                {paginateItems(overdue, safeOverduePage).map((h) => (
                  <div key={h.id} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{h.title}</p>
                      <p className="text-xs text-red-500">{h.studentName} · {h.subject} · due {h.dueAt?.slice(5)}</p>
                    </div>
                    <button onClick={() => onMarkDone(h.id, h.status)}
                      className="flex-shrink-0 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg font-semibold hover:bg-green-200 transition-colors">
                      Selesai
                    </button>
                  </div>
                ))}
              </div>
              <PaginationControls page={safeOverduePage} total={overdue.length} onPageChange={setOverduePage} label="PR" />
            </div>
          )}

          {/* Upcoming homework (due within 3 days) */}
          {upcomingSoon.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs font-bold text-amber-700 mb-2 uppercase tracking-wide">
                📋 PR Segera Jatuh Tempo
              </p>
              <div className="space-y-1.5">
                {paginateItems(upcomingSoon, safeUpcomingPage).map((h) => (
                  <div key={h.id} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{h.title}</p>
                      <p className="text-xs text-amber-600">{h.studentName} · {h.subject} · due {h.dueAt?.slice(5)}</p>
                    </div>
                    <button onClick={() => onMarkDone(h.id, h.status)}
                      className="flex-shrink-0 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg font-semibold hover:bg-green-200">
                      Selesai
                    </button>
                  </div>
                ))}
              </div>
              <PaginationControls page={safeUpcomingPage} total={upcomingSoon.length} onPageChange={setUpcomingHwPage} label="PR" />
            </div>
          )}

          {/* Pending follow-ups */}
          {follows.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <p className="text-xs font-bold text-blue-700 mb-2 uppercase tracking-wide">
                🔁 Perlu Dilanjutkan ({follows.length})
              </p>
              <div className="space-y-1.5">
                {paginateItems(follows, safeFollowUpPage).map((f) => {
                  const sName = studentMap.get(f.studentId)?.name ?? "—";
                  return (
                    <div key={f.id} className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-700 truncate">{f.text}</p>
                        <p className="text-xs text-blue-500">{sName}</p>
                      </div>
                      <button onClick={() => onCompleteFollowUp(f.id)}
                        className="flex-shrink-0 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-lg font-semibold hover:bg-blue-200">
                        ✓
                      </button>
                    </div>
                  );
                })}
              </div>
              <PaginationControls page={safeFollowUpPage} total={follows.length} onPageChange={setFollowUpPage} label="follow-up" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
