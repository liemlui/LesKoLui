import type { Layout } from "../types";
import { Deco } from "../deco";
import {
  HeaderEl, LabelEl, PhotoEl, FloatPhoto, NarrEl, SessionMeta,
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
        return (
          <div key={i} style={{ position: "relative", zIndex: 2, marginBottom: 16 }}>
            <LabelEl t={t} c={c}>{e.date} — {e.subject}</LabelEl>
            {/* Foto mengalir di dalam teks (bukan kolom 118px) → halaman lebih hemat. */}
            <div style={{ marginTop: 9 }}>
              <FloatPhoto t={t} url={e.photoUrl} color={c} width={112} height={88} side={right ? "right" : "left"} />
              <NarrEl t={t}>{e.narrative}</NarrEl>
              <SessionMeta e={e} t={t} />
              <div style={{ clear: "both" }} />
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
              <div style={{ marginTop: 9 }}>
                <FloatPhoto t={t} url={e.photoUrl} color={c} width={106} height={84} />
                <NarrEl t={t}>{e.narrative}</NarrEl>
                <SessionMeta e={e} t={t} />
                <div style={{ clear: "both" }} />
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
            {/* Polaroid tetap miring, tetapi teks kini mengalir di sampingnya. */}
            <FloatPhoto t={t} url={e.photoUrl} color={c} width={112} height={88} style={{ transform: `rotate(${rot}deg)` }} />
            <LabelEl t={t} c={c}>{e.date} — {e.subject}</LabelEl>
            <div style={{ marginTop: 6, background: t.ink + "08", padding: "8px 10px", borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,.06)" }}>
              <NarrEl t={t}>{e.narrative}</NarrEl>
              <SessionMeta e={e} t={t} />
            </div>
            <div style={{ clear: "both" }} />
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
              <div style={{ height: 130 }}>
                <PhotoEl t={t} url={e.photoUrl} color={c} />
              </div>
              <div style={{ padding: "8px 10px 10px" }}>
                <span style={{ display: "inline-block", background: c, color: onColor(c), fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, marginBottom: 5 }}>
                  {e.date} · {e.subject}
                </span>
                <p style={{ fontFamily: t.fontBody, fontSize: 11, lineHeight: 1.5, color: t.ink, margin: 0 }}>
                  {e.narrative}
                </p>
                <SessionMeta e={e} t={t} />
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
              <div style={{ width: 64, height: 64, flexShrink: 0, borderRadius: t.photo === "circle" ? "50%" : 8, overflow: "hidden" }}>
                <PhotoEl t={t} url={e.photoUrl} color={c} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 11.5, color: c, margin: 0 }}>
                  {e.date} · {e.subject}
                </p>
                <p style={{ fontFamily: t.fontBody, fontSize: 11, lineHeight: 1.45, color: t.ink, margin: "2px 0 0" }}>
                  {e.narrative}
                </p>
                <SessionMeta e={e} t={t} />
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
