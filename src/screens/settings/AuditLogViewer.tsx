import { useLiveQuery } from "dexie-react-hooks";
import { listAuditLog } from "../../db/repos";
import { auditActionLabel, auditTimeLabel, groupAuditByDay } from "../../lib/auditDisplay";

/**
 * Penampil Riwayat Aktivitas (audit trail, L-1).
 *
 * Diekstrak dari `screens/Settings.tsx` (G3-09). Logika pengelompokan hari dan
 * labelnya sekarang hidup di `lib/auditDisplay.ts` supaya bisa dites tanpa DOM —
 * repo ini tidak memasang jsdom.
 */
export default function AuditLogViewer() {
  const entries = useLiveQuery(() => listAuditLog(50), []);
  if (!entries || entries.length === 0)
    return <p className="text-xs text-[var(--ink-muted)] pt-3">Belum ada aktivitas tercatat.</p>;

  // Kelompokkan per hari (audit V-14) — daftar panjang jadi mudah dipindai.
  const groups = groupAuditByDay(entries);

  return (
    <div className="pt-3 space-y-3 max-h-72 overflow-y-auto">
      {groups.map((g) => (
        <div key={g.key} className="space-y-1.5">
          <p className="sticky top-0 z-10 bg-[var(--surface-strong)]/95 py-0.5 text-xs font-bold uppercase tracking-wide text-[var(--ink-muted)]">
            {g.label}
          </p>
          {g.items.map((e) => (
            <div key={e.id} className="flex items-start justify-between gap-2 text-xs border-b border-[var(--border)] pb-1.5">
              <div className="min-w-0">
                <p className="font-medium text-[var(--ink-strong)]">{auditActionLabel(e.action)}</p>
                {e.details && <p className="text-[var(--ink-muted)] truncate">{e.details}</p>}
              </div>
              <span className="text-[var(--ink-muted)] flex-shrink-0">{auditTimeLabel(e.timestamp)}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
