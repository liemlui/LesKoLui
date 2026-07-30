/* eslint-disable react-refresh/only-export-components */
import type { Layout } from "../types";
import { Deco } from "../deco";
import {
  HeaderEl, LabelEl, DetailsEl, PhotoEl, NarrEl, EngagementBar,
  SummaryEl, onColor, entryDateShort,
} from "./helpers";

export const dashboard: Layout = {
  id: "dashboard", name: "Dashboard", maxEntriesPerPage: 6,
  render: (d, t, { isFirst, isLast }) => (
    <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden", pageBreakInside: "avoid" }}>
      <Deco kind={t.deco} />
      {isFirst && HeaderEl(d, t)}
      {/* 4 KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18, position: "relative", zIndex: 2 }}>
        {/* Agregat SEBULAN (bukan per halaman) bila tersedia — akurat saat laporan >1 halaman */}
        {[
          { label: "Sesi", value: d.totalSessions ?? d.entries.length },
          { label: "Rata² Engagement", value: d.avgEngagement != null ? `${d.avgEngagement}/10` : "—" },
          { label: "Foto", value: d.photoUrls?.length ?? d.entries.filter(e => e.photoUrl).length },
          { label: "Mapel", value: d.subjectDist?.length ?? [...new Set(d.entries.flatMap(e => e.subject.split(", ")))].length },
        ].map((kpi, ki) => (
          <div key={ki} style={{ background: t.accent + "12", borderRadius: 14, padding: "12px 10px", textAlign: "center" }}>
            <p style={{ fontFamily: t.fontDisplay, fontWeight: 800, fontSize: 24, color: t.accent, margin: 0, lineHeight: 1.1 }}>{kpi.value}</p>
            <p style={{ fontSize: 10, color: t.muted, margin: "2px 0 0", fontWeight: 500 }}>{kpi.label}</p>
          </div>
        ))}
      </div>
      {/* Session rows */}
      {d.entries.map((e, i) => {
        const c = t.palette[i % t.palette.length];
        return (
          <div key={i} style={{ display: "flex", gap: 10, marginBottom: 12, position: "relative", zIndex: 2, alignItems: "center" }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, overflow: "hidden", flexShrink: 0 }}>
              <PhotoEl t={t} url={e.photoUrl} color={c} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: c, fontFamily: t.fontDisplay }}>{e.date}</span>
                <span style={{ fontSize: 10, background: c + "20", color: c, padding: "1px 6px", borderRadius: 999, fontWeight: 600 }}>{e.subject.split(",")[0]}</span>
              </div>
              <p style={{ fontFamily: t.fontBody, fontSize: 11, lineHeight: 1.4, color: t.ink, margin: "2px 0 0" }}>{e.narrative}</p>
              <EngagementBar score={e.engagementScore} label={e.engagementLabel} t={t} />
            </div>
          </div>
        );
      })}
      {isLast && SummaryEl(d, t)}
    </div>
  ),
};

// 2 ─ Progress Bars
export const progress: Layout = {
  id: "progress", name: "Progress Bar", maxEntriesPerPage: 5,
  render: (d, t, { isFirst, isLast }) => (
    <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden", pageBreakInside: "avoid" }}>
      <Deco kind={t.deco} />
      {isFirst && HeaderEl(d, t)}
      {d.entries.map((e, i) => {
        const c = t.palette[i % t.palette.length];
        const barPct = e.engagementScore != null ? e.engagementScore * 10 : 50;
        return (
          <div key={i} style={{ position: "relative", zIndex: 2, marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 6 }}>
              <div style={{ width: 44, height: 44, borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
                <PhotoEl t={t} url={e.photoUrl} color={c} />
              </div>
              <div style={{ flex: 1 }}>
                <LabelEl t={t} c={c}>{e.date} — {e.subject}</LabelEl>
                <NarrEl t={t}>{e.narrative}</NarrEl>
              </div>
            </div>
            <div style={{ height: 6, borderRadius: 999, background: t.muted + "22", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${barPct}%`, borderRadius: 999, background: c, transition: "width .4s" }} />
            </div>
            <EngagementBar score={e.engagementScore} label={e.engagementLabel} t={t} />
          </div>
        );
      })}
      {isLast && SummaryEl(d, t)}
    </div>
  ),
};

// 3 ─ Weekly
export const weekly: Layout = {
  id: "weekly", name: "Per Minggu", maxEntriesPerPage: 6,
  render: (d, t, { isFirst, isLast }) => {
    const weeks = new Map<string, typeof d.entries>();
    d.entries.forEach((e) => {
      // e.date = "5 Juni 2026" → nomor hari adalah token PERTAMA
      const dayNum = parseInt(e.date.split(" ")[0] || "1");
      const weekNum = `Minggu ${Math.ceil(dayNum / 7)}`;
      if (!weeks.has(weekNum)) weeks.set(weekNum, []);
      weeks.get(weekNum)!.push(e);
    });
    return (
      <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden", pageBreakInside: "avoid" }}>
        <Deco kind={t.deco} />
        {isFirst && HeaderEl(d, t)}
        {[...weeks.entries()].map(([wname, entries], wi) => {
          const wc = t.palette[wi % t.palette.length];
          return (
            <div key={wname} style={{ marginBottom: 18, position: "relative", zIndex: 2 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
                <span style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 14, color: wc }}>{wname}</span>
                <span style={{ fontSize: 10, color: t.muted }}>{entries.length} sesi</span>
              </div>
              {entries.map((e, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, padding: "8px 10px", background: wc + "0d", borderRadius: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
                    <PhotoEl t={t} url={e.photoUrl} color={wc} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: t.fontBody, fontWeight: 700, fontSize: 10.5, color: t.ink, margin: 0 }}>{e.date} · {e.subject.split(",")[0]}</p>
                    <p style={{ fontFamily: t.fontBody, fontSize: 10.5, lineHeight: 1.4, color: t.ink, margin: "2px 0 0" }}>{e.narrative}</p>
                    <EngagementBar score={e.engagementScore} label={e.engagementLabel} t={t} />
                  </div>
                </div>
              ))}
            </div>
          );
        })}
        {isLast && SummaryEl(d, t)}
      </div>
    );
  },
};

// 4 ─ Per Mapel
export const subjects: Layout = {
  id: "subjects", name: "Per Mapel", maxEntriesPerPage: 6,
  render: (d, t, { isFirst, isLast }) => {
    const groups = new Map<string, typeof d.entries>();
    d.entries.forEach((e) => {
      const subs = e.subject.split(", ").map(s => s.trim());
      subs.forEach((subj) => {
        if (!groups.has(subj)) groups.set(subj, []);
        groups.get(subj)!.push(e);
      });
    });
    return (
      <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden", pageBreakInside: "avoid" }}>
        <Deco kind={t.deco} />
        {isFirst && HeaderEl(d, t)}
        {[...groups.entries()].map(([subject, entries], gi) => {
          const c = t.palette[gi % t.palette.length];
          const scored = entries.filter(e => e.engagementScore != null);
          const avgEng = scored.length > 0 ? Math.round(scored.reduce((s, e) => s + e.engagementScore!, 0) / scored.length) : null;
          return (
            <div key={subject} style={{ marginBottom: 16, position: "relative", zIndex: 2, background: c + "0d", borderRadius: 14, padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 14, color: c }}>📘 {subject}</span>
                <span style={{ fontSize: 10, color: t.muted }}>{entries.length} sesi{avgEng != null ? ` · avg ${avgEng}/10` : ""}</span>
              </div>
              {entries.map((e, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, paddingLeft: 6, borderLeft: `2px solid ${c}44`, alignItems: "flex-start" }}>
                  <div style={{ width: 34, height: 34, borderRadius: 6, overflow: "hidden", flexShrink: 0, marginTop: 1 }}>
                    <PhotoEl t={t} url={e.photoUrl} color={c} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 10, fontWeight: 600, color: t.muted, margin: 0 }}>{e.date}</p>
                    <p style={{ fontFamily: t.fontBody, fontSize: 10.5, lineHeight: 1.35, color: t.ink, margin: "1px 0 0" }}>{e.narrative}</p>
                    <DetailsEl e={e} t={t} c={c} compact />
                  </div>
                </div>
              ))}
            </div>
          );
        })}
        {isLast && SummaryEl(d, t)}
      </div>
    );
  },
};

// 5 ─ Rapor Style
export const reportcard: Layout = {
  id: "reportcard", name: "Rapor Style", maxEntriesPerPage: 10,
  render: (d, t, { isFirst, isLast }) => (
    <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden", pageBreakInside: "avoid" }}>
      <Deco kind={t.deco} />
      {isFirst && HeaderEl(d, t)}
      <div style={{ position: "relative", zIndex: 2 }}>
        {/* Table header */}
        <div style={{ display: "grid", gridTemplateColumns: "44px 56px 1fr 60px", gap: 6, padding: "6px 8px", background: t.accent, borderRadius: "8px 8px 0 0", fontWeight: 700, fontSize: 10, color: onColor(t.accent) }}>
          <span>Foto</span><span>Tanggal</span><span>Mapel & Catatan</span><span>Engage</span>
        </div>
        {d.entries.map((e, i) => {
          const c = t.palette[i % t.palette.length];
          const bgRow = i % 2 === 0 ? t.bg : c + "0a";
          return (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "44px 56px 1fr 60px", gap: 6, padding: "6px 8px", background: bgRow, borderBottom: `1px solid ${t.muted}18`, alignItems: "start" }}>
              <div style={{ width: 36, height: 36, borderRadius: 6, overflow: "hidden" }}>
                <PhotoEl t={t} url={e.photoUrl} color={c} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, color: t.muted }}>{entryDateShort(e)}</span>
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, color: c, display: "block" }}>{e.subject}</span>
                <span style={{ fontFamily: t.fontBody, fontSize: 10, lineHeight: 1.35, color: t.ink }}>{e.narrative}</span>
                <DetailsEl e={e} t={t} c={c} compact />
              </div>
              <span style={{ fontSize: 12, fontWeight: 800, color: c, textAlign: "center" }}>
                {e.engagementScore != null ? `${e.engagementScore}/10` : "—"}
              </span>
            </div>
          );
        })}
      </div>
      {isLast && SummaryEl(d, t)}
    </div>
  ),
};

// 6 ─ Portfolio
export const portfolio: Layout = {
  id: "portfolio", name: "Portfolio", maxEntriesPerPage: 4,
  render: (d, t, { isFirst, isLast }) => (
    <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden", pageBreakInside: "avoid" }}>
      <Deco kind={t.deco} />
      {isFirst && HeaderEl(d, t)}
      {d.entries.map((e, i) => {
        const c = t.palette[i % t.palette.length];
        return (
          <div key={i} style={{ position: "relative", zIndex: 2, marginBottom: 20, borderRadius: 16, overflow: "hidden", background: c + "0d" }}>
            <div style={{ height: 140 }}>
              <PhotoEl t={t} url={e.photoUrl} color={c} />
            </div>
            <div style={{ padding: "10px 14px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <LabelEl t={t} c={c}>{e.date} — {e.subject}</LabelEl>
                {e.engagementScore != null && (
                  <span style={{ fontSize: 11, fontWeight: 800, color: c }}>⚡ {e.engagementScore}/10</span>
                )}
              </div>
              <NarrEl t={t}>{e.narrative}</NarrEl>
              <DetailsEl e={e} t={t} c={c} compact />
            </div>
          </div>
        );
      })}
      {isLast && SummaryEl(d, t)}
    </div>
  ),
};

// 7 ─ Checklist
export const checklist: Layout = {
  id: "checklist", name: "Checklist", maxEntriesPerPage: 8,
  render: (d, t, { isFirst, isLast }) => (
    <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden", pageBreakInside: "avoid" }}>
      <Deco kind={t.deco} />
      {isFirst && HeaderEl(d, t)}
      {d.entries.map((e, i) => {
        const c = t.palette[i % t.palette.length];
        const hasNarrative = Boolean(e.narrative?.trim());
        const hasEngagement = e.engagementScore != null && e.engagementScore >= 6;
        return (
          <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, padding: "10px 12px", borderRadius: 12, background: c + "0a", position: "relative", zIndex: 2, alignItems: "flex-start" }}>
            <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1 }}>{hasNarrative ? "✅" : "⬜"}</span>
            <div style={{ width: 36, height: 36, borderRadius: 7, overflow: "hidden", flexShrink: 0 }}>
              <PhotoEl t={t} url={e.photoUrl} color={c} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: c }}>{e.date}</span>
                <span style={{ fontSize: 10, background: c + "22", color: c, padding: "1px 6px", borderRadius: 999 }}>{e.subject}</span>
                {e.engagementScore != null && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: hasEngagement ? "#10B981" : "#EF4444", marginLeft: "auto" }}>
                    {hasEngagement ? "🔥" : "⚡"} {e.engagementScore}
                  </span>
                )}
              </div>
              <p style={{ fontFamily: t.fontBody, fontSize: 10.5, lineHeight: 1.4, color: t.ink, margin: 0 }}>
                {e.narrative || "— belum ada narasi —"}
              </p>
              <DetailsEl e={e} t={t} c={c} compact />
            </div>
          </div>
        );
      })}
      {isLast && SummaryEl(d, t)}
    </div>
  ),
};

// 8 ─ Ringkasan Eksekutif
