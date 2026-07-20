/* eslint-disable react-refresh/only-export-components */
import type { Layout } from "../types";
import { Deco } from "../deco";
import {
  HeaderEl, LabelEl, DetailsEl, PhotoEl, NarrEl, EngagementBar,
  SummaryEl, onColor,
} from "./helpers";

export const cards: Layout = {
  id: "cards", name: "Cards", maxEntriesPerPage: 4,
  render: (d, t, { isFirst, isLast }) => (
    <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden", pageBreakInside: "avoid" }}>
      <Deco kind={t.deco} />
      {isFirst && HeaderEl(d, t)}
      {d.entries.map((e, i) => {
        const c = t.palette[i % t.palette.length];
        const right = i % 2 === 1;
        const photoBox = <div style={{ height: 81, width: "100%" }}><PhotoEl t={t} url={e.photoUrl} color={c}/></div>;
        return (
          <div key={i} style={{ position: "relative", zIndex: 2, marginBottom: 16 }}>
            <LabelEl t={t} c={c}>{e.date} — {e.subject}</LabelEl>
            <div style={{ display: "grid", gridTemplateColumns: right ? "1fr 108px" : "108px 1fr", gap: 11, marginTop: 9, alignItems: "start" }}>
              {right ? (
                <><div><NarrEl t={t}>{e.narrative}</NarrEl><DetailsEl e={e} t={t} c={c} compact /><EngagementBar score={e.engagementScore} label={e.engagementLabel} t={t} /></div>{photoBox}</>
              ) : (
                <>{photoBox}<div><NarrEl t={t}>{e.narrative}</NarrEl><DetailsEl e={e} t={t} c={c} compact /><EngagementBar score={e.engagementScore} label={e.engagementLabel} t={t} /></div></>
              )}
            </div>
          </div>
        );
      })}
      {isLast && SummaryEl(d, t)}
    </div>
  ),
};

export const timeline: Layout = {
  id: "timeline", name: "Timeline", maxEntriesPerPage: 4,
  render: (d, t, { isFirst, isLast }) => (
    <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden", pageBreakInside: "avoid" }}>
      <Deco kind={t.deco} />
      {isFirst && HeaderEl(d, t)}
      <div style={{ position: "relative", zIndex: 2, paddingLeft: 24, borderLeft: `3px solid ${t.accent}55` }}>
        {d.entries.map((e, i) => {
          const c = t.palette[i % t.palette.length];
          return (
            <div key={i} style={{ marginBottom: 16, position: "relative" }}>
              <div style={{ position: "absolute", left: -31, top: 4, width: 14, height: 14, borderRadius: "50%", background: c, border: `2px solid ${t.bg.includes("gradient") ? "#fff" : t.bg}` }} />
              <LabelEl t={t} c={c}>{e.date} — {e.subject}</LabelEl>
              <div style={{ display: "grid", gridTemplateColumns: "96px 1fr", gap: 11, marginTop: 9, alignItems: "start" }}>
                <div style={{ height: 72 }}><PhotoEl t={t} url={e.photoUrl} color={c} /></div>
                <div><NarrEl t={t}>{e.narrative}</NarrEl><DetailsEl e={e} t={t} c={c} compact /><EngagementBar score={e.engagementScore} label={e.engagementLabel} t={t} /></div>
              </div>
            </div>
          );
        })}
      </div>
      {isLast && SummaryEl(d, t)}
    </div>
  ),
};

export const scrapbook: Layout = {
  id: "scrapbook", name: "Scrapbook", maxEntriesPerPage: 4,
  render: (d, t, { isFirst, isLast }) => (
    <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden", pageBreakInside: "avoid" }}>
      <Deco kind={t.deco} />
      {isFirst && HeaderEl(d, t)}
      {d.entries.map((e, i) => {
        const c = t.palette[i % t.palette.length];
        const rot = ((i % 5) - 2) * 1.1;
        return (
          <div key={i} style={{ position: "relative", zIndex: 2, marginBottom: 18 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ flexShrink: 0, transform: `rotate(${rot}deg)`, width: 100 }}>
                <div style={{
                  background: "#fff", padding: 4, paddingBottom: 14, boxShadow: "0 2px 8px rgba(0,0,0,.12)",
                  borderRadius: 1, position: "relative",
                }}>
                  <div style={{ position: "absolute", top: -4, left: "40%", width: 20, height: 10, background: "#ccc", borderRadius: 1, opacity: 0.6 }} />
                  <div style={{ width: "100%", aspectRatio: "1/1", overflow: "hidden", borderRadius: 1 }}>
                    <PhotoEl t={t} url={e.photoUrl} color={c} />
                  </div>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <LabelEl t={t} c={c}>{e.date} — {e.subject}</LabelEl>
                <div style={{ marginTop: 6, background: t.ink + "08", padding: "8px 10px", borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,.06)" }}>
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

export const grid: Layout = {
  id: "grid", name: "Grid 2×", maxEntriesPerPage: 4,
  render: (d, t, { isFirst, isLast }) => (
    <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden", pageBreakInside: "avoid" }}>
      <Deco kind={t.deco} />
      {isFirst && HeaderEl(d, t)}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, position: "relative", zIndex: 2 }}>
        {d.entries.map((e, i) => {
          const c = t.palette[i % t.palette.length];
          return (
            <div key={i} style={{ background: c + "1a", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ height: 110 }}>
                <PhotoEl t={t} url={e.photoUrl} color={c} />
              </div>
              <div style={{ padding: "8px 10px 10px" }}>
                <span style={{ display: "inline-block", background: c, color: onColor(c), fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, marginBottom: 5 }}>
                  {e.date} · {e.subject}
                </span>
                <p style={{ fontFamily: t.fontBody, fontSize: 11, lineHeight: 1.5, color: t.ink, margin: 0 }}>
                  {e.narrative}
                </p>
                <DetailsEl e={e} t={t} c={c} compact />
                <EngagementBar score={e.engagementScore} label={e.engagementLabel} t={t} />
              </div>
            </div>
          );
        })}
      </div>
      {isLast && SummaryEl(d, t)}
    </div>
  ),
};

export const compact: Layout = {
  id: "compact", name: "Compact List", maxEntriesPerPage: 8,
  render: (d, t, { isFirst, isLast }) => (
    <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden", pageBreakInside: "avoid" }}>
      <Deco kind={t.deco} />
      {isFirst && HeaderEl(d, t)}
      <div style={{ position: "relative", zIndex: 2 }}>
        {d.entries.map((e, i) => {
          const c = t.palette[i % t.palette.length];
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 11,
              borderLeft: `3px solid ${c}`, paddingLeft: 10 }}>
              <div style={{ width: 48, height: 48, flexShrink: 0, borderRadius: t.photo === "circle" ? "50%" : 8, overflow: "hidden" }}>
                <PhotoEl t={t} url={e.photoUrl} color={c} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 11.5, color: c, margin: 0 }}>
                  {e.date} · {e.subject}
                </p>
                <p style={{ fontFamily: t.fontBody, fontSize: 11, lineHeight: 1.45, color: t.ink, margin: "2px 0 0" }}>
                  {e.narrative}
                </p>
                <DetailsEl e={e} t={t} c={c} compact />
                <EngagementBar score={e.engagementScore} label={e.engagementLabel} t={t} />
              </div>
            </div>
          );
        })}
      </div>
      {isLast && SummaryEl(d, t)}
    </div>
  ),
};

// ──────────────────── NEW (20) ────────────────────

// 1 ─ Dashboard
