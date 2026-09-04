import { useState, useMemo } from "react";
import type { Session, FollowUpItem } from "../../db/types";
import type { StudentMap } from "../../lib/studentColor";
import { dayLabel } from "../../lib/format";
import { clampPage, paginateItems } from "../../lib/pagination";
import PaginationControls from "../../components/PaginationControls";
import Tabs from "../../components/Tabs";
import Badge from "../../components/Badge";
import EmptyState from "../../components/EmptyState";
import type { Tab } from "../../components/Tabs";

interface Props {
  missed: Session[];
  follows: FollowUpItem[];
  studentMap: StudentMap;
  onCapture: (sessionId: string) => void;
  onResolveMissed: (session: Session) => void;
  onCompleteFollowUp: (id: string) => void;
}

/** Tabbed "needs attention" inbox — missed sessions and follow-ups. */
export default function AttentionInbox({
  missed,
  follows,
  studentMap,
  onCapture,
  onResolveMissed,
  onCompleteFollowUp,
}: Props) {
  const [activeTab, setActiveTab] = useState("missed");
  const [missedPage, setMissedPage] = useState(1);
  const [followUpPage, setFollowUpPage] = useState(1);
  const [collapsed, setCollapsed] = useState(false);

  const total = missed.length + follows.length;
  const tabs: Tab[] = useMemo(
    () => [
      { key: "missed", label: "Sesi", count: missed.length },
      { key: "follows", label: "Follow-up", count: follows.length },
    ],
    [missed.length, follows.length],
  );

  if (total === 0) return null;

  const safeMissedPage = clampPage(missedPage, missed.length);
  const safeFollowUpPage = clampPage(followUpPage, follows.length);

  return (
    <div className="mx-4 mb-2">
      <button
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl"
      >
        <span className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
          <Badge tone="red" size="sm" count={total}>
            Perlu Perhatian
          </Badge>
        </span>
        <span className="text-gray-600 text-sm">{collapsed ? "▸" : "▾"}</span>
      </button>

      {!collapsed && (
        <div className="mt-2 bg-white border border-gray-100 rounded-xl overflow-hidden">
          <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} fullWidth />

          <div className="p-3">
            {/* Missed sessions */}
            {activeTab === "missed" && (
              <div className="space-y-2">
                {missed.length === 0 ? (
                  <EmptyState icon="🎉" message="Tidak ada sesi terlewat" />
                ) : (
                  <>
                    {paginateItems(missed, safeMissedPage).map((s) => {
                      const name = studentMap.get(s.studentId)?.name ?? "—";
                      return (
                        <div
                          key={s.id}
                          className="flex items-center gap-2 p-2 rounded-lg bg-orange-50 border border-orange-100"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-800 truncate">
                              {name}
                            </p>
                            <p className="text-xs text-orange-600">
                              {dayLabel(s.date)} · {s.durationHours}j
                              {s.time ? ` · ${s.time}` : ""}
                            </p>
                          </div>
                          <button
                            onClick={() => onCapture(s.id)}
                            className="flex-shrink-0 text-xs bg-blue-600 text-white px-2.5 py-1.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                          >
                            Catat
                          </button>
                          <button
                            onClick={() => onResolveMissed(s)}
                            className="flex-shrink-0 text-xs bg-orange-100 text-orange-700 px-2 py-1.5 rounded-lg font-semibold hover:bg-orange-200 transition-colors"
                          >
                            Atur
                          </button>
                        </div>
                      );
                    })}
                    <PaginationControls
                      page={safeMissedPage}
                      total={missed.length}
                      onPageChange={setMissedPage}
                      label="sesi"
                    />
                  </>
                )}
              </div>
            )}

            {/* Follow-ups */}
            {activeTab === "follows" && (
              <div className="space-y-2">
                {follows.length === 0 ? (
                  <EmptyState icon="🎉" message="Tidak ada follow-up" />
                ) : (
                  <>
                    {paginateItems(follows, safeFollowUpPage).map((f) => {
                      const sName = studentMap.get(f.studentId)?.name ?? "—";
                      return (
                        <div
                          key={f.id}
                          className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 border border-blue-100"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-700 truncate">
                              {f.text}
                            </p>
                            <p className="text-xs text-blue-500">{sName}</p>
                          </div>
                          <button
                            onClick={() => onCompleteFollowUp(f.id)}
                            className="flex-shrink-0 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-lg font-semibold hover:bg-blue-200"
                          >
                            ✓
                          </button>
                        </div>
                      );
                    })}
                    <PaginationControls
                      page={safeFollowUpPage}
                      total={follows.length}
                      onPageChange={setFollowUpPage}
                      label="follow-up"
                    />
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
