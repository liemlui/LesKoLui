import { useState, useMemo } from "react";
import type { Session, Homework, FollowUpItem } from "../../db/types";
import type { StudentMap } from "../../lib/studentColor";
import { dayLabel } from "../../lib/format";
import { clampPage, paginateItems } from "../../lib/pagination";
import PaginationControls from "../../components/PaginationControls";
import Tabs from "../../components/Tabs";
import Badge from "../../components/Badge";
import type { Tab } from "../../components/Tabs";

type HomeworkWithStudent = Homework & { studentName?: string };

interface Props {
  missed: Session[];
  overdue: HomeworkWithStudent[];
  upcomingSoon: HomeworkWithStudent[];
  follows: FollowUpItem[];
  studentMap: StudentMap;
  onCapture: (sessionId: string) => void;
  onResolveMissed: (session: Session) => void;
  onMarkDone: (homeworkId: string, previousStatus: Homework["status"]) => void;
  onCompleteFollowUp: (id: string) => void;
}

/** Tabbed "needs attention" inbox v2 — consolidates four alert types into tabs with badge counts. */
export default function AttentionInbox({
  missed, overdue, upcomingSoon, follows, studentMap,
  onCapture, onResolveMissed, onMarkDone, onCompleteFollowUp,
}: Props) {
  const [activeTab, setActiveTab] = useState("missed");
  const [missedPage, setMissedPage] = useState(1);
  const [overduePage, setOverduePage] = useState(1);
  const [upcomingHwPage, setUpcomingHwPage] = useState(1);
  const [followUpPage, setFollowUpPage] = useState(1);
  const [collapsed, setCollapsed] = useState(false);

  const total = missed.length + overdue.length + upcomingSoon.length + follows.length;
  if (total === 0) return null;

  const tabs: Tab[] = useMemo(() => [
    { key: "missed", label: "Sesi", count: missed.length },
    { key: "overdue", label: "PR Telat", count: overdue.length },
    { key: "upcoming", label: "PR Segera", count: upcomingSoon.length },
    { key: "follows", label: "Follow-up", count: follows.length },
  ], [missed.length, overdue.length, upcomingSoon.length, follows.length]);

  const safeMissedPage   = clampPage(missedPage, missed.length);
  const safeOverduePage  = clampPage(overduePage, overdue.length);
  const safeUpcomingPage = clampPage(upcomingHwPage, upcomingSoon.length);
  const safeFollowUpPage = clampPage(followUpPage, follows.length);

  return (
    <div className="mx-4 mb-2">
      <button
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl">
        <span className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
          <Badge tone="red" size="sm" count={total}>Perlu Perhatian</Badge>
        </span>
        <span className="text-gray-400 text-sm">{collapsed ? "▸" : "▾"}</span>
      </button>

      {!collapsed && (
        <div className="mt-2 bg-white border border-gray-100 rounded-xl overflow-hidden">
          <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} fullWidth />

          <div className="p-3">
            {/* Missed sessions */}
            {activeTab === "missed" && (
              <div className="space-y-2">
                {missed.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">Tidak ada sesi terlewat 🎉</p>
                ) : (
                  <>
                    {paginateItems(missed, safeMissedPage).map((s) => {
                      const name = studentMap.get(s.studentId)?.name ?? "—";
                      return (
                        <div key={s.id} className="flex items-center gap-2 p-2 rounded-lg bg-orange-50 border border-orange-100">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-800 truncate">{name}</p>
                            <p className="text-xs text-orange-600">{dayLabel(s.date)} · {s.durationHours}j{s.time ? ` · ${s.time}` : ""}</p>
                          </div>
                          <button onClick={() => onCapture(s.id)}
                            className="flex-shrink-0 text-xs bg-blue-600 text-white px-2.5 py-1.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                            Catat
                          </button>
                          <button onClick={() => onResolveMissed(s)}
                            className="flex-shrink-0 text-xs bg-orange-100 text-orange-700 px-2 py-1.5 rounded-lg font-semibold hover:bg-orange-200 transition-colors">
                            Atur
                          </button>
                        </div>
                      );
                    })}
                    <PaginationControls page={safeMissedPage} total={missed.length} onPageChange={setMissedPage} label="sesi" />
                  </>
                )}
              </div>
            )}

            {/* Overdue homework */}
            {activeTab === "overdue" && (
              <div className="space-y-2">
                {overdue.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">Tidak ada PR terlambat 🎉</p>
                ) : (
                  <>
                    {paginateItems(overdue, safeOverduePage).map((h) => (
                      <div key={h.id} className="flex items-center gap-2 p-2 rounded-lg bg-red-50 border border-red-100">
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
                    <PaginationControls page={safeOverduePage} total={overdue.length} onPageChange={setOverduePage} label="PR" />
                  </>
                )}
              </div>
            )}

            {/* Upcoming homework */}
            {activeTab === "upcoming" && (
              <div className="space-y-2">
                {upcomingSoon.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">Tidak ada PR mendesak 🎉</p>
                ) : (
                  <>
                    {paginateItems(upcomingSoon, safeUpcomingPage).map((h) => (
                      <div key={h.id} className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-100">
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
                    <PaginationControls page={safeUpcomingPage} total={upcomingSoon.length} onPageChange={setUpcomingHwPage} label="PR" />
                  </>
                )}
              </div>
            )}

            {/* Follow-ups */}
            {activeTab === "follows" && (
              <div className="space-y-2">
                {follows.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">Tidak ada follow-up 🎉</p>
                ) : (
                  <>
                    {paginateItems(follows, safeFollowUpPage).map((f) => {
                      const sName = studentMap.get(f.studentId)?.name ?? "—";
                      return (
                        <div key={f.id} className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 border border-blue-100">
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
                    <PaginationControls page={safeFollowUpPage} total={follows.length} onPageChange={setFollowUpPage} label="follow-up" />
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
