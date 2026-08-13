import type { Layout } from "../types";
import { Deco } from "../deco";
import {
  HeaderEl, LabelEl, PhotoEl, NarrEl, EngagementBar, DetailsEl,
  SummaryEl, onColor, entryDay,
} from "./helpers";

export const summary: Layout = {
  id: "summary", name: "Ringkasan Eksekutif", maxEntriesPerPage: 7,
  render: (d, t, { isFirst, isLast }) => (
    <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden", pageBreakInside: "avoid" }}>
      <Deco kind={t.deco} />
      {isFirst && HeaderEl(d, t)}
      {/* 3 highlight pills */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", position: "relative", zIndex: 2 }}>
        {/* Agregat SELURUH PERIODE bila tersedia — akurat saat laporan >1 halaman */}
        {[
          { icon: "📊", label: `${d.totalSessions ?? d.entries.length} Sesi` },
          { icon: "📚", label: `${d.subjectDist?.length ?? [...new Set(d.entries.flatMap(e => e.subject.split(", ")))].length} Mapel` },
          { icon: "⭐", label: d.avgEngagement != null ? `Rata² ${d.avgEngagement}/10` : "Engagement —" },
        ].map((hl, hi) => (
          <span key={hi} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 999, background: t.palette[hi] + "20", fontSize: 11, fontWeight: 600, color: t.palette[hi] }}>
            {hl.icon} {hl.label}
          </span>
        ))}
      </div>
      {/* Compact session list */}
      {d.entries.map((e, i) => {
        const c = t.palette[i % t.palette.length];
        return (
          <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, position: "relative", zIndex: 2 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
              <PhotoEl t={t} url={e.photoUrl} color={c} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: c, margin: 0 }}>{e.date} · {e.subject.split(",")[0]}</p>
              <p style={{ fontFamily: t.fontBody, fontSize: 10.5, lineHeight: 1.35, color: t.ink, margin: "1px 0 0" }}>{e.narrative}</p>
            </div>
          </div>
        );
      })}
      {isLast && SummaryEl(d, t)}
    </div>
  ),
};

// 9 ─ Growth Chart (mini bar)
export const growth: Layout = {
  id: "growth", name: "Pertumbuhan", maxEntriesPerPage: 5,
  render: (d, t, { isFirst, isLast }) => {
    const maxScore = 10;
    return (
      <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden", pageBreakInside: "avoid" }}>
        <Deco kind={t.deco} />
        {isFirst && HeaderEl(d, t)}
        {/* Mini bar chart — entries kronologis, sumbu waktu langsung kiri→kanan */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 80, marginBottom: 20, position: "relative", zIndex: 2, padding: "0 4px" }}>
          {d.entries.map((e, i) => {
            const c = t.palette[i % t.palette.length];
            const h = e.engagementScore != null ? (e.engagementScore / maxScore) * 100 : 15;
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: c }}>{e.engagementScore ?? "—"}</span>
                <div style={{ width: "100%", height: `${h}%`, borderRadius: "4px 4px 0 0", background: c, minHeight: 4, transition: "height .3s" }} />
                <span style={{ fontSize: 10, color: t.muted, transform: "rotate(-30deg)", whiteSpace: "nowrap", marginTop: 2 }}>{entryDay(e)}</span>
              </div>
            );
          })}
        </div>
        {/* Session details */}
        {d.entries.map((e, i) => {
          const c = t.palette[i % t.palette.length];
          return (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10, position: "relative", zIndex: 2 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
                <PhotoEl t={t} url={e.photoUrl} color={c} />
              </div>
              <div style={{ flex: 1 }}>
                <LabelEl t={t} c={c}>{e.date} — {e.subject}</LabelEl>
                <NarrEl t={t}>{e.narrative}</NarrEl>
              </div>
            </div>
          );
        })}
        {isLast && SummaryEl(d, t)}
      </div>
    );
  },
};

// 10 ─ Dossier
export const dossier: Layout = {
  id: "dossier", name: "Berkas Siswa", maxEntriesPerPage: 5,
  render: (d, t, { isFirst, isLast }) => (
    <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden", pageBreakInside: "avoid" }}>
      <Deco kind={t.deco} />
      {isFirst && HeaderEl(d, t)}
      {d.entries.map((e, i) => {
        const c = t.palette[i % t.palette.length];
        return (
          <div key={i} style={{ position: "relative", zIndex: 2, marginBottom: 16, borderRadius: 12, border: `2px solid ${c}33`, background: c + "05", overflow: "hidden" }}>
            <div style={{ background: c, padding: "8px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 13, color: onColor(c) }}>{e.date}</span>
              <span style={{ fontSize: 10, background: onColor(c) === "#fff" ? "rgba(255,255,255,.25)" : "rgba(0,0,0,.15)", color: onColor(c), padding: "2px 8px", borderRadius: 999 }}>{e.subject}</span>
            </div>
            <div style={{ padding: "12px 14px" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{ width: 44, height: 44, borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
                  <PhotoEl t={t} url={e.photoUrl} color={c} />
                </div>
                <div style={{ flex: 1 }}>
                  <NarrEl t={t}>{e.narrative}</NarrEl>
                  <DetailsEl e={e} t={t} c={c} compact />
                  <EngagementBar score={e.engagementScore} label={e.engagementLabel} t={t} />
                </div>
              </div>
            </div>
          </div>
        );
      })}
      {isLast && SummaryEl(d, t)}
    </div>
  ),
};

// 11 ─ Analitik
export const analytics: Layout = {
  id: "analytics", name: "Analitik", maxEntriesPerPage: 6,
  render: (d, t, { isFirst, isLast }) => {
    // Distribusi SELURUH PERIODE bila tersedia (akurat >1 halaman); fallback ke entri halaman ini
    const subjectCounts = new Map<string, number>();
    d.entries.forEach(e => e.subject.split(", ").forEach(s => subjectCounts.set(s.trim(), (subjectCounts.get(s.trim()) || 0) + 1)));
    const dist = (d.subjectDist && d.subjectDist.length > 0)
      ? d.subjectDist
      : [...subjectCounts.entries()].map(([name, count]) => ({ name, count }));
    const total = d.totalSessions ?? d.entries.length;
    return (
      <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden", pageBreakInside: "avoid" }}>
        <Deco kind={t.deco} />
        {isFirst && HeaderEl(d, t)}
        {/* Donut-like subject bars */}
        <div style={{ marginBottom: 18, position: "relative", zIndex: 2 }}>
          <p style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 11, color: t.muted, marginBottom: 8, letterSpacing: 1, textTransform: "uppercase" }}>Distribusi Mapel</p>
          {dist.map(({ name: subj, count: cnt }, si) => {
            const c = t.palette[si % t.palette.length];
            const pct = Math.round((cnt / (total || 1)) * 100);
            return (
              <div key={subj} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 600, width: 80, flexShrink: 0, color: t.ink }}>{subj}</span>
                <div style={{ flex: 1, height: 8, borderRadius: 999, background: t.muted + "18", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, borderRadius: 999, background: c }} />
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: c, width: 30, textAlign: "right" }}>{cnt}</span>
              </div>
            );
          })}
        </div>
        {/* Session details */}
        {d.entries.map((e, i) => {
          const c = t.palette[i % t.palette.length];
          return (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, position: "relative", zIndex: 2 }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
                <PhotoEl t={t} url={e.photoUrl} color={c} />
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: c }}>{e.date} · {e.subject.split(",")[0]}</span>
                <p style={{ fontFamily: t.fontBody, fontSize: 10.5, lineHeight: 1.35, color: t.ink, margin: "2px 0 0" }}>{e.narrative}</p>
              </div>
            </div>
          );
        })}
        {isLast && SummaryEl(d, t)}
      </div>
    );
  },
};

// 12 ─ Narrative
export const narrative: Layout = {
  id: "narrative", name: "Narasi Utama", maxEntriesPerPage: 5,
  render: (d, t, { isFirst, isLast }) => (
    <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden", pageBreakInside: "avoid" }}>
      <Deco kind={t.deco} />
      {isFirst && HeaderEl(d, t)}
      {d.entries.map((e, i) => {
        const c = t.palette[i % t.palette.length];
        return (
          <div key={i} style={{ position: "relative", zIndex: 2, marginBottom: 20, paddingBottom: 16, borderBottom: i < d.entries.length - 1 ? `1px solid ${t.muted}18` : "none" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", overflow: "hidden", flexShrink: 0, marginTop: 2 }}>
                <PhotoEl t={t} url={e.photoUrl} color={c} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 14, color: c, margin: "0 0 4px" }}>{e.date}</p>
                <span style={{ fontSize: 10, fontWeight: 600, color: t.muted, display: "block", marginBottom: 6 }}>{e.subject}</span>
                <p style={{ fontFamily: t.fontBody, fontSize: 13, lineHeight: 1.65, color: t.ink, margin: 0 }}>{e.narrative}</p>
                <EngagementBar score={e.engagementScore} label={e.engagementLabel} t={t} />
              </div>
            </div>
          </div>
        );
      })}
      {isLast && SummaryEl(d, t)}
    </div>
  ),
};

// 13 ─ Milestone
