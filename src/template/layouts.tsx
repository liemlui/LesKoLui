/* eslint-disable react-refresh/only-export-components */
import type { Theme, ReportData, Layout } from "./types";
import { Deco } from "./deco";

// ── Shared helpers ─────────────────────────────────────────────────

function LogoEl({ url, tutorName }: { url?: string; tutorName?: string }) {
  if (!url && !tutorName) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, justifyContent: "flex-end", position: "relative", zIndex: 2 }}>
      {tutorName && (
        <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.75 }}>{tutorName}</span>
      )}
      {url && (
        <img src={url} alt="logo" style={{ height: 32, width: "auto", objectFit: "contain", borderRadius: 6 }} />
      )}
    </div>
  );
}

function HeaderEl(d: ReportData, t: Theme) {
  const periodBadge = (
    <span style={{ display: "inline-block", marginTop: 8, fontWeight: 800, fontSize: 12,
      color: t.ink, background: "rgba(255,255,255,.78)", borderRadius: 999, padding: "4px 13px" }}>
      {d.period}
    </span>
  );

  if (t.header === "bubble") {
    return (
      <div style={{ position: "relative", zIndex: 2, marginBottom: 16 }}>
        <LogoEl url={d.logoUrl} tutorName={d.tutorName} />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 42, color: "#fff",
            WebkitTextStroke: `2.5px ${t.accent}`, lineHeight: 0.92 }}>
            {t.headerText}
          </div>
          <div style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 18, color: "#fff",
            background: t.accent, borderRadius: 12, padding: "4px 16px", display: "inline-block", marginTop: 8 }}>
            {d.studentName}
          </div>
          {periodBadge}
        </div>
      </div>
    );
  }

  if (t.header === "script") {
    return (
      <div style={{ position: "relative", zIndex: 2, marginBottom: 16 }}>
        <LogoEl url={d.logoUrl} tutorName={d.tutorName} />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: t.fontDisplay, fontSize: 46, color: t.accent, lineHeight: 1.1 }}>
            {t.headerText}
          </div>
          <div style={{ fontFamily: t.fontBody, fontWeight: 700, fontSize: 16, color: t.ink, marginTop: 4 }}>
            {d.studentName}
          </div>
          {periodBadge}
        </div>
      </div>
    );
  }

  // plain
  return (
    <div style={{ position: "relative", zIndex: 2, marginBottom: 16 }}>
      <LogoEl url={d.logoUrl} tutorName={d.tutorName} />
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: t.fontDisplay, fontWeight: 800, fontSize: 32, color: t.accent, letterSpacing: 2 }}>
          {t.headerText}
        </div>
        <div style={{ fontFamily: t.fontBody, fontWeight: 600, fontSize: 15, color: t.ink }}>
          {d.studentName}
        </div>
        {periodBadge}
      </div>
    </div>
  );
}

function LabelEl({ t, c, children }: { t: Theme; c: string; children: React.ReactNode }) {
  const base: React.CSSProperties = {
    display: "inline-block", fontWeight: 700, fontSize: 12, padding: "3px 12px",
    fontFamily: t.fontDisplay, background: c, color: "#fff",
  };

  if (t.label === "flag") {
    return <span style={{ ...base, clipPath: "polygon(0 0, 90% 0, 100% 50%, 90% 100%, 0 100%)", paddingRight: 16 }}>{children}</span>;
  }
  if (t.label === "rounded") {
    return <span style={{ ...base, borderRadius: 8 }}>{children}</span>;
  }
  // pill
  return <span style={{ ...base, borderRadius: 999 }}>{children}</span>;
}

function PhotoEl({ t, url, color }: { t: Theme; url?: string; color: string }) {
  const img = url ? (
    <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
  ) : (
    <div style={{ width: "100%", height: "100%", background: color + "33", display: "flex", alignItems: "center", justifyContent: "center", color: t.muted, fontSize: 10 }}>
      📷
    </div>
  );

  const wrap = (style: React.CSSProperties) => <div style={{ width: "100%", height: "100%", ...style }}>{img}</div>;

  if (t.photo === "circle") return wrap({ borderRadius: "50%", overflow: "hidden" });
  if (t.photo === "polaroid") return (
    <div style={{
      background: "#fff", padding: 5, paddingBottom: 18, boxShadow: "0 2px 6px rgba(0,0,0,.1)",
      transform: "rotate(-1deg)",
      borderRadius: 2,
    }}>
      <div style={{ width: "100%", aspectRatio: "1/1", overflow: "hidden", borderRadius: 1 }}>
        {img}
      </div>
    </div>
  );
  // round
  return wrap({ borderRadius: 12, overflow: "hidden" });
}

function NarrEl({ t, children }: { t: Theme; children: string }) {
  return (
    <p style={{ fontFamily: t.fontBody, fontSize: 12.5, lineHeight: 1.55, color: t.ink, margin: 0 }}>
      {children}
    </p>
  );
}

function SummaryEl(d: ReportData, t: Theme) {
  return (
    <div style={{ marginTop: 20, paddingTop: 14, borderTop: `2px solid ${t.accent}44`, position: "relative", zIndex: 2 }}>
      <div style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 15, color: t.accent, marginBottom: 6 }}>
        Absensi
      </div>
      <p style={{ fontFamily: t.fontBody, fontSize: 12.5, lineHeight: 1.55, color: t.ink, margin: 0 }}>
        {d.summary}
      </p>
      {d.teacherNote && (
        <div style={{ marginTop: 10, padding: 10, background: t.accent + "18", borderRadius: 10 }}>
          <p style={{ fontFamily: t.fontBody, fontSize: 12, lineHeight: 1.5, color: t.ink, margin: 0 }}>
            <strong>Catatan Guru:</strong> {d.teacherNote}
          </p>
        </div>
      )}
      {d.quote && (
        <div style={{ textAlign: "center", marginTop: 10, fontFamily: t.fontDisplay, fontSize: 14, color: t.muted, fontStyle: "italic" }}>
          “{d.quote}”
        </div>
      )}
    </div>
  );
}

// ── Layouts ────────────────────────────────────────────────────────

export const cards: Layout = {
  id: "cards", name: "Cards", maxEntriesPerPage: 4,
  render: (d, t, { isFirst, isLast }) => (
    <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden" }}>
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
              {right ? <><NarrEl t={t}>{e.narrative}</NarrEl>{photoBox}</>
                : <>{photoBox}<NarrEl t={t}>{e.narrative}</NarrEl></>}
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
    <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden" }}>
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
                <NarrEl t={t}>{e.narrative}</NarrEl>
              </div>
            </div>
          );
        })}
      </div>
      {isLast && SummaryEl(d, t)}
    </div>
  ),
};

export const flags: Layout = {
  id: "flags", name: "Flags", maxEntriesPerPage: 5,
  render: (d, t, { isFirst, isLast }) => (
    <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden" }}>
      <Deco kind={t.deco} />
      {isFirst && HeaderEl(d, t)}
      {d.entries.map((e, i) => {
        const c = t.palette[i % t.palette.length];
        return (
          <div key={i} style={{ position: "relative", zIndex: 2, marginBottom: 14 }}>
            <LabelEl t={t} c={c}>{e.date} — {e.subject}</LabelEl>
            <div style={{ display: "flex", gap: 10, marginTop: 7, alignItems: "flex-start" }}>
              <div style={{ width: 70, height: 52, flexShrink: 0 }}>
                <PhotoEl t={t} url={e.photoUrl} color={c} />
              </div>
              <NarrEl t={t}>{e.narrative}</NarrEl>
            </div>
          </div>
        );
      })}
      {isLast && SummaryEl(d, t)}
    </div>
  ),
};

export const magazine: Layout = {
  id: "magazine", name: "Majalah", maxEntriesPerPage: 3,
  render: (d, t, { isFirst, isLast }) => (
    <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden" }}>
      <Deco kind={t.deco} />
      {isFirst && HeaderEl(d, t)}
      {d.entries.map((e, i) => {
        const c = t.palette[i % t.palette.length];
        return (
          <div key={i} style={{ position: "relative", zIndex: 2, marginBottom: 18 }}>
            <div style={{ marginBottom: 6 }}>
              <LabelEl t={t} c={c}>{e.date} — {e.subject}</LabelEl>
            </div>
            <div style={{ width: "100%", height: 150, marginBottom: 8 }}>
              <PhotoEl t={t} url={e.photoUrl} color={c} />
            </div>
            <NarrEl t={t}>{e.narrative}</NarrEl>
          </div>
        );
      })}
      {isLast && SummaryEl(d, t)}
    </div>
  ),
};

export const scrapbook: Layout = {
  id: "scrapbook", name: "Scrapbook", maxEntriesPerPage: 3,
  render: (d, t, { isFirst, isLast }) => (
    <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden" }}>
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
                <div style={{ marginTop: 6, background: "#fff9", padding: "8px 10px", borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,.06)" }}>
                  <NarrEl t={t}>{e.narrative}</NarrEl>
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

// ── Grid — 2-column Instagram-style ────────────────────────────────
export const grid: Layout = {
  id: "grid", name: "Grid 2×", maxEntriesPerPage: 4,
  render: (d, t, { isFirst, isLast }) => (
    <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden" }}>
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
                <span style={{ display: "inline-block", background: c, color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 999, marginBottom: 5 }}>
                  {e.date} · {e.subject}
                </span>
                <p style={{ fontFamily: t.fontBody, fontSize: 11, lineHeight: 1.5, color: t.ink, margin: 0,
                  display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {e.narrative}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      {isLast && SummaryEl(d, t)}
    </div>
  ),
};

// ── Compact — daftar padat, 6 entri per halaman ─────────────────────
export const compact: Layout = {
  id: "compact", name: "Compact List", maxEntriesPerPage: 6,
  render: (d, t, { isFirst, isLast }) => (
    <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden" }}>
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
                <p style={{ fontFamily: t.fontBody, fontSize: 11, lineHeight: 1.45, color: t.ink, margin: "2px 0 0",
                  display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {e.narrative}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      {isLast && SummaryEl(d, t)}
    </div>
  ),
};

export const LAYOUTS: Layout[] = [cards, timeline, flags, magazine, scrapbook, grid, compact];
export const LAYOUT_IDS = LAYOUTS.map((l) => l.id);
export function getLayout(id: string): Layout {
  return LAYOUTS.find((l) => l.id === id) ?? cards;
}
