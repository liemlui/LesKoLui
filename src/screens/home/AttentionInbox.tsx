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
    <section className="mx-4 mb-2" aria-labelledby="attention-inbox-title">
      {/* Audit L-07: "Perlu Perhatian" adalah satu blok utama Beranda, jadi
          judulnya heading sungguhan. Judul yang TERLIHAT ada di dalam Badge milik
          tombol lipat, dan heading tidak boleh berada di dalam <button> — karena
          itu teks heading disediakan untuk pembaca layar. */}
      <h2 id="attention-inbox-title" className="sr-only">Perlu Perhatian</h2>
      <button
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
        className="w-full flex items-center justify-between px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl"
      >
        <span className="text-xs font-bold text-[var(--ink-strong)] uppercase tracking-wide flex items-center gap-2">
          <Badge tone="red" size="sm" count={total}>
            Perlu Perhatian
          </Badge>
        </span>
        <span className="text-[var(--ink-muted)] text-sm">{collapsed ? "▸" : "▾"}</span>
      </button>

      {!collapsed && (
        <div className="mt-2 bg-[var(--surface-strong)] border border-[var(--border)] rounded-xl overflow-hidden">
          <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} idPrefix="attention-inbox" fullWidth />

          <div className="p-3">
            {/* Audit L-06: panel per tab SELALU ada di DOM supaya `aria-controls`
                setiap tab menunjuk elemen nyata; isinya hanya dirender untuk tab
                yang aktif (pekerjaan tetap lazy). */}
            <div
              role="tabpanel"
              id="attention-inbox-panel-missed"
              aria-labelledby="attention-inbox-tab-missed"
              hidden={activeTab !== "missed"}
            >
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
                          className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg-attention)] border border-[var(--border-attention)]"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-[var(--ink-strong)] truncate">
                              {name}
                            </p>
                            <p className="text-xs text-[var(--ink-attention)]">
                              {dayLabel(s.date)} · {s.durationHours}j
                              {s.time ? ` · ${s.time}` : ""}
                            </p>
                          </div>
                          <button
                            onClick={() => onCapture(s.id)}
                            className="flex-shrink-0 text-xs bg-[var(--brand-solid)] text-[var(--on-strong)] px-2.5 py-1.5 rounded-lg font-semibold hover:bg-[var(--brand-solid)] transition-colors"
                          >
                            Catat
                          </button>
                          <button
                            onClick={() => onResolveMissed(s)}
                            className="flex-shrink-0 text-xs bg-[var(--bg-attention)] text-[var(--ink-attention)] px-2 py-1.5 rounded-lg font-semibold hover:bg-[var(--bg-attention-strong)] transition-colors"
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
            </div>

            {/* Follow-ups */}
            <div
              role="tabpanel"
              id="attention-inbox-panel-follows"
              aria-labelledby="attention-inbox-tab-follows"
              hidden={activeTab !== "follows"}
            >
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
                          className="flex items-center gap-2 p-2 rounded-lg bg-[var(--brand-tint)] border border-[var(--brand-tint-strong)]"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-[var(--ink-strong)] truncate">
                              {f.text}
                            </p>
                            <p className="text-xs text-[var(--ink-brand)]">{sName}</p>
                          </div>
                          <button
                            onClick={() => onCompleteFollowUp(f.id)}
                            aria-label={`Tandai follow-up "${f.text}" selesai`}
                            className="flex-shrink-0 text-xs bg-[var(--brand-tint-strong)] text-[var(--ink-brand)] px-2 py-1 rounded-lg font-semibold hover:bg-[var(--brand-tint-strong)]"
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
        </div>
      )}
    </section>
  );
}
