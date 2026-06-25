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

  if (t.header === "frame") {
    return (
      <div style={{ position: "relative", zIndex: 2, marginBottom: 16 }}>
        <LogoEl url={d.logoUrl} tutorName={d.tutorName} />
        <div style={{ textAlign: "center", border: `3px solid ${t.accent}`, borderRadius: 16, padding: "16px 10px 12px", position: "relative" }}>
          <span style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: t.accent, color: "#fff", fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 11, padding: "3px 16px", borderRadius: 999 }}>
            {t.headerText}
          </span>
          <div style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 20, color: t.ink, marginTop: 4 }}>
            {d.studentName}
          </div>
          {periodBadge}
        </div>
      </div>
    );
  }

  if (t.header === "minimal") {
    return (
      <div style={{ position: "relative", zIndex: 2, marginBottom: 20 }}>
        <LogoEl url={d.logoUrl} tutorName={d.tutorName} />
        <div style={{ borderBottom: `2px solid ${t.accent}`, paddingBottom: 10 }}>
          <div style={{ fontFamily: t.fontDisplay, fontWeight: 800, fontSize: 16, color: t.muted, letterSpacing: 3, textTransform: "uppercase" }}>
            {t.headerText}
          </div>
          <div style={{ fontFamily: t.fontBody, fontWeight: 700, fontSize: 20, color: t.ink, marginTop: 2 }}>
            {d.studentName}
          </div>
          <span style={{ fontSize: 12, color: t.muted, fontWeight: 500 }}>{d.period}</span>
        </div>
      </div>
    );
  }

  if (t.header === "badge") {
    return (
      <div style={{ position: "relative", zIndex: 2, marginBottom: 16 }}>
        <LogoEl url={d.logoUrl} tutorName={d.tutorName} />
        <div style={{ textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: t.accent, borderRadius: 999, padding: "6px 20px", boxShadow: `0 3px 12px ${t.accent}55` }}>
            <span style={{ fontSize: 18 }}>🏅</span>
            <span style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 18, color: "#fff" }}>{t.headerText}</span>
          </div>
          <div style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 18, color: t.ink, marginTop: 10 }}>
            {d.studentName}
          </div>
          {periodBadge}
        </div>
      </div>
    );
  }

  if (t.header === "watercolor") {
    return (
      <div style={{ position: "relative", zIndex: 2, marginBottom: 16 }}>
        <LogoEl url={d.logoUrl} tutorName={d.tutorName} />
        <div style={{ textAlign: "center", position: "relative", padding: "20px 10px 16px" }}>
          <div style={{
            position: "absolute", inset: 0,
            background: `radial-gradient(ellipse at 30% 20%, ${t.accent}22, transparent 60%), radial-gradient(ellipse at 70% 80%, ${t.palette[1]}22, transparent 60%)`,
            borderRadius: 20,
          }} />
          <div style={{ position: "relative" }}>
            <div style={{ fontFamily: t.fontDisplay, fontSize: 38, color: t.accent, opacity: 0.85, lineHeight: 1.15 }}>
              {t.headerText}
            </div>
            <div style={{ fontFamily: t.fontBody, fontWeight: 600, fontSize: 16, color: t.ink, marginTop: 6 }}>
              {d.studentName}
            </div>
            {periodBadge}
          </div>
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
  if (t.label === "tag") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 700, fontSize: 11, fontFamily: t.fontDisplay, color: c, background: c + "18", border: `1.5px solid ${c}44`, borderRadius: 999, padding: "2px 10px" }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: c, flexShrink: 0 }} />
        {children}
      </span>
    );
  }
  if (t.label === "underline") {
    return <span style={{ fontWeight: 700, fontSize: 13, fontFamily: t.fontDisplay, color: t.ink, borderBottom: `3px solid ${c}`, paddingBottom: 2 }}>{children}</span>;
  }
  if (t.label === "ribbon-label") {
    return (
      <span style={{ display: "inline-block", position: "relative", fontWeight: 700, fontSize: 11, fontFamily: t.fontDisplay, color: "#fff", background: c, padding: "4px 14px 4px 10px", borderRadius: "0 6px 6px 0", marginLeft: 6 }}>
        <span style={{ position: "absolute", left: -6, top: 0, width: 0, height: 0, borderTop: `10px solid ${c}`, borderBottom: `10px solid ${c}`, borderLeft: "6px solid transparent" }} />
        {children}
      </span>
    );
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
  if (t.photo === "shadow") return wrap({ borderRadius: 12, overflow: "hidden", boxShadow: "0 6px 18px rgba(0,0,0,.25)" });
  if (t.photo === "frame") return (
    <div style={{ width: "100%", height: "100%", border: `4px solid ${t.accent}`, padding: 3, borderRadius: 4, background: "#fff" }}>
      <div style={{ width: "100%", height: "100%", overflow: "hidden", borderRadius: 2 }}>{img}</div>
    </div>
  );
  if (t.photo === "vintage") return (
    <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden", borderRadius: 6 }}>
      {img}
      <div style={{ position: "absolute", inset: 0, background: "sepia(0.3) contrast(0.9) brightness(0.95)", pointerEvents: "none" }} />
    </div>
  );
  if (t.photo === "duotone") return (
    <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden", borderRadius: 8 }}>
      {img}
      <div style={{ position: "absolute", inset: 0, background: `${t.accent}44`, mixBlendMode: "overlay" as React.CSSProperties["mixBlendMode"], pointerEvents: "none" }} />
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

function EngagementBar({ score, label, t }: { score?: number; label?: string; t: Theme }) {
  if (score == null) return null;
  const pct = Math.max(0, Math.min(100, score * 10));
  const barColor = score >= 8 ? "#10B981" : score >= 6 ? "#3B82F6" : score >= 4 ? "#F59E0B" : "#EF4444";
  const emoji = score >= 9 ? "🔥" : score >= 7 ? "💪" : score >= 5 ? "📖" : score >= 3 ? "😴" : "⚠️";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
      <span style={{ fontSize: 13 }}>{emoji}</span>
      <div style={{ flex: 1, height: 5, borderRadius: 999, background: t.muted + "33", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 999, transition: "width 0.3s" }} />
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, color: barColor, minWidth: 24, textAlign: "right" }}>{score}/10</span>
      {label && <span style={{ fontSize: 9, color: t.muted, fontStyle: "italic" }}>{label}</span>}
    </div>
  );
}

function SummaryEl(d: ReportData, t: Theme) {
  return (
    <div style={{ marginTop: 20, paddingTop: 14, borderTop: `2px solid ${t.accent}44`, position: "relative", zIndex: 2 }}>
      {d.summary && (
        <>
          <div style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 12, color: t.accent, marginBottom: 6, letterSpacing: 1, textTransform: "uppercase" as const }}>
            Ringkasan Bulan Ini
          </div>
          <p style={{ fontFamily: t.fontBody, fontSize: 12.5, lineHeight: 1.55, color: t.ink, margin: 0 }}>
            {d.summary}
          </p>
        </>
      )}
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
              {right ? (
                <><div><NarrEl t={t}>{e.narrative}</NarrEl><EngagementBar score={e.engagementScore} label={e.engagementLabel} t={t} /></div>{photoBox}</>
              ) : (
                <>{photoBox}<div><NarrEl t={t}>{e.narrative}</NarrEl><EngagementBar score={e.engagementScore} label={e.engagementLabel} t={t} /></div></>
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
                <div><NarrEl t={t}>{e.narrative}</NarrEl><EngagementBar score={e.engagementScore} label={e.engagementLabel} t={t} /></div>
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
              <div><NarrEl t={t}>{e.narrative}</NarrEl><EngagementBar score={e.engagementScore} label={e.engagementLabel} t={t} /></div>
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
            <div><NarrEl t={t}>{e.narrative}</NarrEl><EngagementBar score={e.engagementScore} label={e.engagementLabel} t={t} /></div>
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

// ── Cover Page — halaman judul dengan foto besar ────────────────────
export const cover: Layout = {
  id: "cover", name: "Cover Page", maxEntriesPerPage: 1,
  render: (d, t) => (
    <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "30px 20px", position: "relative", overflow: "hidden", minHeight: 420, display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <Deco kind={t.deco} />
      <div style={{ position: "relative", zIndex: 2, textAlign: "center" }}>
        {d.photoUrls && d.photoUrls.length > 0 && (
          <div style={{ width: 140, height: 140, borderRadius: "50%", overflow: "hidden", margin: "0 auto 20px", border: `4px solid ${t.accent}`, boxShadow: `0 8px 24px ${t.accent}44` }}>
            <img src={d.photoUrls[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}
        <div style={{ fontFamily: t.fontDisplay, fontWeight: 800, fontSize: 28, color: t.accent, letterSpacing: 1, marginBottom: 4 }}>
          {t.headerText}
        </div>
        <div style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 36, color: t.ink, lineHeight: 1.2, marginBottom: 6 }}>
          {d.studentName}
        </div>
        <div style={{ fontFamily: t.fontBody, fontSize: 16, color: t.muted, fontWeight: 500 }}>
          {d.period}
        </div>
        {d.tutorName && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${t.muted}33` }}>
            <span style={{ fontFamily: t.fontBody, fontSize: 13, color: t.muted }}>
              Disusun oleh <strong style={{ color: t.ink }}>{d.tutorName}</strong>
            </span>
          </div>
        )}
      </div>
    </div>
  ),
};

// ── Gallery — grid foto semua sesi ──────────────────────────────────
export const gallery: Layout = {
  id: "gallery", name: "Photo Gallery", maxEntriesPerPage: 6,
  render: (d, t, { isFirst, isLast }) => (
    <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden" }}>
      <Deco kind={t.deco} />
      {isFirst && HeaderEl(d, t)}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, position: "relative", zIndex: 2 }}>
        {d.entries.map((e, i) => {
          const c = t.palette[i % t.palette.length];
          return (
            <div key={i} style={{ position: "relative" }}>
              <div style={{ aspectRatio: "1/1", borderRadius: 10, overflow: "hidden", background: c + "22" }}>
                <PhotoEl t={t} url={e.photoUrl} color={c} />
              </div>
              <div style={{ position: "absolute", bottom: 4, left: 4, right: 4 }}>
                <span style={{ display: "inline-block", background: "rgba(0,0,0,.65)", color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 999 }}>
                  {e.date}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {isLast && d.summary && (
        <div style={{ marginTop: 16, position: "relative", zIndex: 2, textAlign: "center" }}>
          <p style={{ fontFamily: t.fontBody, fontSize: 11, color: t.muted, fontStyle: "italic" }}>📸 {d.entries.length} momen belajar di {d.period}</p>
        </div>
      )}
    </div>
  ),
};

// ── Grouped — dikelompokkan per subject ─────────────────────────────
export const grouped: Layout = {
  id: "grouped", name: "Grouped by Subject", maxEntriesPerPage: 8,
  render: (d, t, { isFirst, isLast }) => {
    // Group entries by subject
    const groups = new Map<string, typeof d.entries>();
    d.entries.forEach((e) => {
      const subjects = e.subject.split(", ").map((s) => s.trim());
      subjects.forEach((subj) => {
        if (!groups.has(subj)) groups.set(subj, []);
        groups.get(subj)!.push(e);
      });
    });

    return (
      <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden" }}>
        <Deco kind={t.deco} />
        {isFirst && HeaderEl(d, t)}
        <div style={{ position: "relative", zIndex: 2 }}>
          {[...groups.entries()].map(([subject, entries], gi) => {
            const c = t.palette[gi % t.palette.length];
            return (
              <div key={subject} style={{ marginBottom: 18 }}>
                <div style={{
                  fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 15, color: "#fff",
                  background: c, borderRadius: 8, padding: "6px 14px", marginBottom: 8,
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <span>📘</span> {subject}
                  <span style={{ fontSize: 10, opacity: 0.8, marginLeft: "auto" }}>{entries.length} sesi</span>
                </div>
                {entries.map((e, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, paddingLeft: 6, borderLeft: `3px solid ${c}44` }}>
                    <div style={{ width: 48, height: 48, flexShrink: 0, borderRadius: 8, overflow: "hidden" }}>
                      <PhotoEl t={t} url={e.photoUrl} color={c} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: t.fontBody, fontWeight: 700, fontSize: 11, color: c, margin: 0 }}>{e.date}</p>
                      <p style={{ fontFamily: t.fontBody, fontSize: 11.5, lineHeight: 1.4, color: t.ink, margin: "2px 0 0",
                        display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {e.narrative}
                      </p>
                      <EngagementBar score={e.engagementScore} label={e.engagementLabel} t={t} />
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        {isLast && SummaryEl(d, t)}
      </div>
    );
  },
};

export const LAYOUTS: Layout[] = [cards, timeline, flags, magazine, scrapbook, grid, compact, cover, gallery, grouped];
export const LAYOUT_IDS = LAYOUTS.map((l) => l.id);
export function getLayout(id: string): Layout {
  return LAYOUTS.find((l) => l.id === id) ?? cards;
}
