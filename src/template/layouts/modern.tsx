import React from "react";
import type { Layout } from "../types";
import { Deco } from "../deco";
import {
  HeaderEl, LabelEl, DetailsEl, PhotoEl, NarrEl, EngagementBar,
  SummaryEl, Sparkline, EMPTY_SUBJECT,
  entryDateShort, entrySubject, entrySubjectShort,
  entryNarrative, detailText, truncateText,
} from "./helpers";

export const milestone: Layout = {
  id: "milestone", name: "Capaian", maxEntriesPerPage: 5,
  render: (d, t, { isFirst, isLast }) => (
    <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden", pageBreakInside: "avoid" }}>
      <Deco kind={t.deco} />
      {isFirst && HeaderEl(d, t)}
      <div style={{ position: "relative", zIndex: 2 }}>
        {d.entries.map((e, i) => {
          const c = t.palette[i % t.palette.length];
          const engEmoji = e.engagementScore != null ? (e.engagementScore >= 8 ? "🏆" : e.engagementScore >= 6 ? "⭐" : "📌") : "📌";
          return (
            <div key={i} style={{ display: "flex", gap: 14, marginBottom: 22, position: "relative" }}>
              {/* Milestone node */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: c, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, boxShadow: `0 4px 12px ${c}55` }}>
                  {engEmoji}
                </div>
                {i < d.entries.length - 1 && <div style={{ width: 2, flex: 1, background: c + "33", marginTop: 4 }} />}
              </div>
              <div style={{ flex: 1, paddingBottom: i < d.entries.length - 1 ? 0 : 0 }}>
                <LabelEl t={t} c={c}>{e.date} — {e.subject}</LabelEl>
                <div style={{ marginTop: 6, background: c + "0a", borderRadius: 12, padding: "10px 12px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 42, height: 42, borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
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
      </div>
      {isLast && SummaryEl(d, t)}
    </div>
  ),
};

// 14 ─ Split View
export const split: Layout = {
  id: "split", name: "Dua Sisi", maxEntriesPerPage: 4,
  render: (d, t, { isFirst, isLast }) => (
    <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden", pageBreakInside: "avoid" }}>
      <Deco kind={t.deco} />
      {isFirst && HeaderEl(d, t)}
      {d.entries.map((e, i) => {
        const c = t.palette[i % t.palette.length];
        return (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16, position: "relative", zIndex: 2, background: c + "0a", borderRadius: 14, padding: 12, alignItems: "start" }}>
            {/* Left: Photo + Engagement */}
            <div>
              <div style={{ height: 100, borderRadius: 10, overflow: "hidden", marginBottom: 6 }}>
                <PhotoEl t={t} url={e.photoUrl} color={c} />
              </div>
              {e.engagementScore != null && (
                <div style={{ textAlign: "center" }}>
                  <span style={{ fontSize: 20, fontWeight: 800, color: c }}>{e.engagementScore}</span>
                  <span style={{ fontSize: 10, color: t.muted }}>/10</span>
                </div>
              )}
            </div>
            {/* Right: Label + Narrative */}
            <div>
              <LabelEl t={t} c={c}>{e.date}</LabelEl>
              <p style={{ fontSize: 10, fontWeight: 600, color: t.muted, margin: "4px 0" }}>{e.subject}</p>
              <NarrEl t={t}>{e.narrative}</NarrEl>
            </div>
          </div>
        );
      })}
      {isLast && SummaryEl(d, t)}
    </div>
  ),
};

// 15 ─ Journal
export const journal: Layout = {
  id: "journal", name: "Jurnal", maxEntriesPerPage: 6,
  render: (d, t, { isFirst, isLast }) => (
    <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden", pageBreakInside: "avoid" }}>
      <Deco kind={t.deco} />
      {isFirst && HeaderEl(d, t)}
      {d.entries.map((e, i) => {
        const c = t.palette[i % t.palette.length];
        // e.date = "5 Juni 2026" → angka besar = nomor hari, kecil = nama bulan
        const [dayNum = "", monthName = ""] = e.date.split(" ");
        return (
          <div key={i} style={{ display: "flex", gap: 14, marginBottom: 18, position: "relative", zIndex: 2 }}>
            <div style={{ textAlign: "right", flexShrink: 0, width: 48, paddingTop: 2 }}>
              <p style={{ fontFamily: t.fontDisplay, fontWeight: 800, fontSize: 28, color: c, lineHeight: 1, margin: 0 }}>{dayNum}</p>
              <p style={{ fontSize: 10, fontWeight: 600, color: t.muted, margin: 0 }}>{monthName}</p>
            </div>
            <div style={{ flex: 1, borderLeft: `2px dashed ${c}44`, paddingLeft: 14 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: c, background: c + "18", padding: "2px 8px", borderRadius: 999 }}>
                {e.subject}
              </span>
              <div style={{ display: "flex", gap: 10, marginTop: 6, alignItems: "flex-start" }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
                  <PhotoEl t={t} url={e.photoUrl} color={c} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: t.fontBody, fontSize: 14, lineHeight: 1.5, color: t.ink, margin: 0 }}>{e.narrative}</p>
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

// 16 ─ Overview Cards (full-width photo)
export const overview: Layout = {
  id: "overview", name: "Overview Cards", maxEntriesPerPage: 4,
  render: (d, t, { isFirst, isLast }) => (
    <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden", pageBreakInside: "avoid" }}>
      <Deco kind={t.deco} />
      {isFirst && HeaderEl(d, t)}
      {d.entries.map((e, i) => {
        const c = t.palette[i % t.palette.length];
        return (
          <div key={i} style={{ position: "relative", zIndex: 2, marginBottom: 18, borderRadius: 16, overflow: "hidden", boxShadow: `0 3px 12px ${c}22` }}>
            <div style={{ height: 120, position: "relative" }}>
              <PhotoEl t={t} url={e.photoUrl} color={c} />
              <div style={{ position: "absolute", inset: 0, background: `linear-gradient(transparent 40%, ${c}99)` }} />
              <div style={{ position: "absolute", bottom: 8, left: 12, right: 12 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: "rgba(0,0,0,.35)", padding: "3px 10px", borderRadius: 999 }}>{e.date} · {e.subject}</span>
              </div>
            </div>
            <div style={{ padding: "12px 14px", background: c + "08" }}>
              <NarrEl t={t}>{e.narrative}</NarrEl>
              <DetailsEl e={e} t={t} c={c} compact />
              <EngagementBar score={e.engagementScore} label={e.engagementLabel} t={t} />
            </div>
          </div>
        );
      })}
      {isLast && SummaryEl(d, t)}
    </div>
  ),
};

// 17 ─ Minimalis
export const minimal: Layout = {
  id: "minimal", name: "Minimalis", maxEntriesPerPage: 8,
  render: (d, t, { isFirst, isLast }) => (
    <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden", pageBreakInside: "avoid" }}>
      {isFirst && HeaderEl(d, t)}
      <div style={{ position: "relative", zIndex: 2 }}>
        {d.entries.map((e, i) => {
          const c = t.palette[i % t.palette.length];
          return (
            <div key={i} style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 4 }}>
                <div style={{ width: 36, height: 36, borderRadius: 7, overflow: "hidden", flexShrink: 0 }}>
                  <PhotoEl t={t} url={e.photoUrl} color={c} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: c }}>{e.date}</span>
                    <span style={{ fontSize: 10, color: t.muted }}>{e.subject}</span>
                    {e.engagementScore != null && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: c, marginLeft: "auto" }}>{e.engagementScore}/10</span>
                    )}
                  </div>
                  <p style={{ fontFamily: t.fontBody, fontSize: 11.5, lineHeight: 1.55, color: t.ink, margin: 0 }}>{e.narrative}</p>
                  <DetailsEl e={e} t={t} c={c} compact />
                </div>
              </div>
              {i < d.entries.length - 1 && <div style={{ height: 1, background: t.muted + "15", marginTop: 16 }} />}
            </div>
          );
        })}
      </div>
      {isLast && SummaryEl(d, t)}
    </div>
  ),
};

// 18 ─ Bullet Journal
export const bullets: Layout = {
  id: "bullets", name: "Bullet Journal", maxEntriesPerPage: 8,
  render: (d, t, { isFirst, isLast }) => (
    <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden", pageBreakInside: "avoid" }}>
      <Deco kind={t.deco} />
      {isFirst && HeaderEl(d, t)}
      {d.entries.map((e, i) => {
        const c = t.palette[i % t.palette.length];
        const bullet = e.engagementScore != null && e.engagementScore >= 8 ? "●" : e.engagementScore != null && e.engagementScore >= 5 ? "◉" : "○";
        return (
          <div key={i} style={{ display: "flex", gap: 10, marginBottom: 14, position: "relative", zIndex: 2 }}>
            <span style={{ fontSize: 16, color: c, flexShrink: 0, lineHeight: 1.2 }}>{bullet}</span>
            <div style={{ width: 36, height: 36, borderRadius: 7, overflow: "hidden", flexShrink: 0 }}>
              <PhotoEl t={t} url={e.photoUrl} color={c} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3 }}>
                <span style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 11, color: c }}>{e.date}</span>
                <span style={{ fontSize: 10, background: t.muted + "18", color: t.muted, padding: "1px 6px", borderRadius: 999 }}>{e.subject}</span>
                {e.engagementScore != null && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: c }}>⚡{e.engagementScore}</span>
                )}
              </div>
              <p style={{ fontFamily: t.fontBody, fontSize: 13, lineHeight: 1.5, color: t.ink, margin: 0 }}>{e.narrative}</p>
              <DetailsEl e={e} t={t} c={c} compact />
            </div>
          </div>
        );
      })}
      {isLast && SummaryEl(d, t)}
    </div>
  ),
};

// 19 ─ Compare
export const compare: Layout = {
  id: "compare", name: "Perbandingan", maxEntriesPerPage: 8,
  render: (d, t, { isFirst, isLast }) => {
    // entries KRONOLOGIS (awal→akhir bulan): paruh pertama array = AWAL bulan
    const awalHalf  = d.entries.slice(0, Math.ceil(d.entries.length / 2));
    const akhirHalf = d.entries.slice(Math.ceil(d.entries.length / 2));
    const avgEng = (entries: typeof d.entries) => {
      const valid = entries.filter(e => e.engagementScore != null);
      return valid.length > 0 ? Math.round(valid.reduce((s, e) => s + e.engagementScore!, 0) / valid.length) : null;
    };
    return (
      <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden", pageBreakInside: "avoid" }}>
        <Deco kind={t.deco} />
        {isFirst && HeaderEl(d, t)}
        {/* Comparison header */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16, position: "relative", zIndex: 2 }}>
          {[
            { label: "Awal Bulan", entries: awalHalf, ci: 0 },
            { label: "Akhir Bulan", entries: akhirHalf, ci: 1 },
          ].map((col) => {
            const cc = t.palette[col.ci];
            const avg = avgEng(col.entries);
            return (
              <div key={col.label} style={{ background: cc + "12", borderRadius: 12, padding: "10px", textAlign: "center" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: cc, margin: 0 }}>{col.label}</p>
                <p style={{ fontFamily: t.fontDisplay, fontWeight: 800, fontSize: 22, color: cc, margin: "4px 0 0" }}>{col.entries.length}</p>
                <p style={{ fontSize: 10, color: t.muted, margin: 0 }}>sesi{avg != null ? ` · avg ${avg}/10` : ""}</p>
              </div>
            );
          })}
        </div>
        {/* Arrow and comparison summary */}
        <div style={{ textAlign: "center", marginBottom: 16, position: "relative", zIndex: 2 }}>
          {(avgEng(awalHalf) != null && avgEng(akhirHalf) != null) && (
            <span style={{ fontSize: 12, fontWeight: 600, color: avgEng(akhirHalf)! >= avgEng(awalHalf)! ? "#10B981" : "#EF4444" }}>
              {avgEng(akhirHalf)! >= avgEng(awalHalf)! ? "📈 Meningkat" : "📉 Menurun"} {Math.abs(avgEng(akhirHalf)! - avgEng(awalHalf)!)} poin
            </span>
          )}
        </div>
        {/* All sessions compact */}
        {d.entries.map((e, i) => {
          const c = t.palette[i % t.palette.length];
          const meta = detailText(e, 1);
          return (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, position: "relative", zIndex: 2, padding: "7px 8px", borderRadius: 8, background: c + "08", alignItems: "flex-start" }}>
              <div style={{ width: 30, height: 30, borderRadius: 6, overflow: "hidden", flexShrink: 0 }}>
                <PhotoEl t={t} url={e.photoUrl} color={c} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, color: c, width: 55, flexShrink: 0 }}>{entryDateShort(e)}</span>
              <span style={{ fontFamily: t.fontBody, fontSize: 10, color: t.ink, flex: 1, lineHeight: 1.3 }}>
                <strong style={{ color: c }}>{entrySubjectShort(e)}:</strong> {truncateText(entryNarrative(e), 62)}
                {meta && <span style={{ display: "block", color: t.muted, fontSize: 10.5, marginTop: 1 }}>{meta}</span>}
              </span>
              {e.engagementScore != null && <span style={{ fontSize: 10, fontWeight: 700, color: c }}>{e.engagementScore}</span>}
            </div>
          );
        })}
        {isLast && SummaryEl(d, t)}
      </div>
    );
  },
};

// 20 ─ Snapshot (Polaroid grid with session notes)
export const snapshot: Layout = {
  id: "snapshot", name: "Snapshot", maxEntriesPerPage: 6,
  render: (d, t, { isFirst, isLast }) => (
    <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden", pageBreakInside: "avoid" }}>
      <Deco kind={t.deco} />
      {isFirst && HeaderEl(d, t)}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, position: "relative", zIndex: 2 }}>
        {d.entries.map((e, i) => {
          const c = t.palette[i % t.palette.length];
          const rot = ((i % 4) - 1.5) * 1.2;
          const meta = detailText(e, 1);
          return (
            <div key={i} style={{ transform: `rotate(${rot}deg)`, background: c + "08", padding: 7, paddingBottom: 9, boxShadow: "0 2px 8px rgba(0,0,0,.10)", borderRadius: 3 }}>
              <div style={{ aspectRatio: "4/3", overflow: "hidden", borderRadius: 2, marginBottom: 7 }}>
                <PhotoEl t={t} url={e.photoUrl} color={c} />
              </div>
              <p style={{ fontFamily: t.fontBody, fontSize: 10.5, lineHeight: 1.25, color: c, margin: 0, textAlign: "center", fontWeight: 800 }}>
                {entryDateShort(e)} - {entrySubjectShort(e)}
              </p>
              <p style={{ fontFamily: t.fontBody, fontSize: 10.5, lineHeight: 1.28, color: t.ink, margin: "4px 0 0", textAlign: "center" }}>
                {truncateText(entryNarrative(e), 72)}
              </p>
              {meta && <p style={{ fontSize: 10, lineHeight: 1.2, color: t.muted, textAlign: "center", margin: "3px 0 0" }}>{meta}</p>}
              {e.engagementScore != null && (
                <p style={{ fontSize: 10, fontWeight: 700, color: c, textAlign: "center", margin: "2px 0 0" }}>⚡{e.engagementScore}</p>
              )}
            </div>
          );
        })}
      </div>
      {isLast && SummaryEl(d, t)}
    </div>
  ),
};

// ──────────────────── EXPORT ────────────────────

// ── Infografis Expert (premium, dipilih manual; di luar rotasi acak) ──
export const infographic: Layout = {
  id: "infographic", name: "Infografis Expert", maxEntriesPerPage: 6,
  render: (d, t, { isFirst, isLast }) => {
    const panel: React.CSSProperties = {
      background: t.ink + "0D", border: `1px solid ${t.ink}1F`, borderRadius: 14, padding: 14,
    };
    const overline: React.CSSProperties = {
      fontSize: 10, fontWeight: 800, letterSpacing: 1.4, textTransform: "uppercase", color: t.muted, margin: 0,
    };

    const sessions = d.totalSessions ?? d.entries.length;
    const hoursLabel = d.totalHours != null
      ? (Number.isInteger(d.totalHours) ? `${d.totalHours}` : String(d.totalHours).replace(".", ",")) + "j"
      : "—";
    const dist = (d.subjectDist && d.subjectDist.length > 0)
      ? d.subjectDist
      : (() => {
          const m = new Map<string, number>();
          d.entries.forEach((e) => entrySubject(e).split(",").forEach((s) => {
            const k = s.trim(); if (k && k !== EMPTY_SUBJECT) m.set(k, (m.get(k) ?? 0) + 1);
          }));
          return [...m.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
        })();
    const distTotal = dist.reduce((s, x) => s + x.count, 0) || 1;
    const series = (d.engagementSeries && d.engagementSeries.length > 0)
      ? d.engagementSeries
      // fallback: entries kronologis → sparkline langsung searah waktu
      : d.entries.map((e) => e.engagementScore).filter((s): s is number => s != null);

    const kpi = (value: string, label: string, accent = false) => (
      <div style={{ flex: 1, textAlign: "center", padding: "2px 4px" }}>
        <div style={{ fontFamily: t.fontDisplay, fontWeight: 800, fontSize: 25, lineHeight: 1, color: accent ? t.accent : t.ink }}>{value}</div>
        <div style={{ ...overline, marginTop: 5, letterSpacing: 1 }}>{label}</div>
      </div>
    );
    const divider = <div style={{ width: 1, background: t.ink + "1A" }} />;

    return (
      <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "24px 18px 26px", position: "relative", overflow: "hidden" }}>
        {isFirst && (
          <>
            {/* Header editorial */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <p style={overline}>Laporan Bulanan</p>
                <div style={{ fontFamily: t.fontDisplay, fontWeight: 800, fontSize: 26, lineHeight: 1.05, color: t.ink, marginTop: 3 }}>{d.studentName}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                {d.logoUrl && <img src={d.logoUrl} alt="logo" style={{ height: 30, width: "auto", objectFit: "contain", marginBottom: 4, marginLeft: "auto", display: "block" }} />}
                <div style={{ fontWeight: 800, fontSize: 13, color: t.accent }}>{d.period}</div>
                {d.tutorName && <div style={{ fontSize: 10, color: t.muted, marginTop: 1 }}>{d.tutorName}</div>}
              </div>
            </div>
            <div style={{ height: 3, width: 46, background: t.accent, borderRadius: 2, margin: "10px 0 16px" }} />

            {/* KPI hero */}
            <div style={{ ...panel, display: "flex", alignItems: "stretch", padding: "14px 6px", marginBottom: 12 }}>
              {kpi(String(sessions), "Sesi")}
              {divider}
              {kpi(hoursLabel, "Jam")}
              {divider}
              {kpi(d.avgEngagement != null ? `${d.avgEngagement}/10` : "—", "Fokus rata²", true)}
              {divider}
              {kpi(String(dist.length), "Mapel")}
            </div>

            {/* Tren fokus */}
            {series.length >= 2 && (
              <div style={{ ...panel, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                  <p style={overline}>Tren Fokus</p>
                  <span style={{ fontSize: 10, color: t.muted }}>skala 1–10 · rata-rata {d.avgEngagement ?? "—"}</span>
                </div>
                {Sparkline(series, t)}
              </div>
            )}

            {/* Distribusi mapel */}
            {dist.length > 0 && (
              <div style={{ ...panel, marginBottom: 14 }}>
                <p style={{ ...overline, marginBottom: 8 }}>Distribusi Mapel</p>
                {dist.slice(0, 5).map((s, i, arr) => {
                  const c = t.palette[i % t.palette.length];
                  const pct = Math.round((s.count / distTotal) * 100);
                  return (
                    <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: i < arr.length - 1 ? 7 : 0 }}>
                      <span style={{ fontSize: 10.5, fontWeight: 600, color: t.ink, width: 74, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
                      <div style={{ flex: 1, height: 7, borderRadius: 999, background: t.ink + "14", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: c, borderRadius: 999 }} />
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: t.muted, width: 30, textAlign: "right" }}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            )}

            <p style={{ ...overline, marginBottom: 4 }}>Catatan Sesi</p>
          </>
        )}

        {/* Daftar sesi */}
        <div style={{ position: "relative", zIndex: 2 }}>
          {d.entries.map((e, i) => {
            const c = t.palette[i % t.palette.length];
            const score = e.engagementScore;
            const dotColor = score == null ? t.muted : score >= 8 ? "#10B981" : score >= 6 ? "#3B82F6" : score >= 4 ? "#F59E0B" : "#EF4444";
            return (
              <div key={i} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: i < d.entries.length - 1 ? `1px solid ${t.ink}14` : "none" }}>
                {e.photoUrl && (
                  <div style={{ width: 34, height: 34, borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
                    <PhotoEl t={t} url={e.photoUrl} color={c} />
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: t.accent, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entrySubjectShort(e)}</span>
                    <span style={{ fontSize: 10.5, color: t.muted, flexShrink: 0 }}>{entryDateShort(e)}</span>
                  </div>
                  <p style={{ fontFamily: t.fontBody, fontSize: 11, lineHeight: 1.45, color: t.ink, margin: "3px 0 0" }}>{entryNarrative(e)}</p>
                </div>
                {score != null && (
                  <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", width: 26 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: dotColor, lineHeight: 1 }}>{score}</span>
                    <span style={{ fontSize: 7.5, color: t.muted, letterSpacing: 0.5 }}>/10</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {isLast && SummaryEl(d, t)}
      </div>
    );
  },
};

export const cover: Layout = {
  id: "cover", name: "Cover", maxEntriesPerPage: 999,
  render: (d, t) => (
    <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "30px 22px 34px", minHeight: 520, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <Deco kind={t.deco} />
      <div style={{ position: "relative", zIndex: 2 }}>
        {HeaderEl(d, t)}
        <div style={{ marginTop: 24, borderTop: `2px solid ${t.accent}33`, paddingTop: 18, textAlign: "center" }}>
          <p style={{ fontSize: 12, color: t.muted, margin: 0, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Monthly Progress Report</p>
          <p style={{ fontFamily: t.fontDisplay, fontSize: 26, fontWeight: 800, color: t.accent, margin: "8px 0 0" }}>{d.period}</p>
          {d.summary && (
            <p style={{ fontSize: 13, lineHeight: 1.55, color: t.ink, margin: "18px auto 0", maxWidth: 300 }}>
              {d.summary}
            </p>
          )}
          <p style={{ fontSize: 11, color: t.muted, margin: "20px 0 0" }}>{d.entries.length} sesi tercatat</p>
        </div>
        {/* Foto bukti pertemuan — galeri kecil */}
        {d.photoUrls && d.photoUrls.length > 0 && (
          <div style={{ marginTop: 18, display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
            {d.photoUrls.slice(0, 8).map((url, i) => (
              <div key={i} style={{
                width: 52, height: 52, borderRadius: 8, overflow: "hidden",
                boxShadow: "0 2px 8px rgba(0,0,0,.10)", transform: `rotate(${((i % 3) - 1) * 1.5}deg)`,
              }}>
                <PhotoEl t={t} url={url} color={t.palette[i % t.palette.length]} />
              </div>
            ))}
            {d.photoUrls.length > 8 && (
              <span style={{ fontSize: 11, color: t.muted, alignSelf: "center", marginLeft: 4 }}>
                +{d.photoUrls.length - 8} foto
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  ),
};
