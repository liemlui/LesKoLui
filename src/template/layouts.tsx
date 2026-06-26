/* eslint-disable react-refresh/only-export-components */
import type { Theme, ReportData, Layout, ReportEntry } from "./types";
import { Deco } from "./deco";

const EMPTY_NARRATIVE = "Catatan sesi belum diisi. Lengkapi narasi agar laporan lebih personal.";
const EMPTY_SUBJECT = "Mapel belum diisi";
const EMPTY_DATE = "Tanggal belum diisi";

function clean(value?: string): string {
  return value?.trim() ?? "";
}

function entryDate(e: ReportEntry): string {
  return clean(e.date) || EMPTY_DATE;
}

function entryDateShort(e: ReportEntry): string {
  const date = entryDate(e);
  return date.split(" ").pop() || date;
}

function entrySubject(e: ReportEntry): string {
  return clean(e.subject) || EMPTY_SUBJECT;
}

function entrySubjectShort(e: ReportEntry): string {
  return entrySubject(e).split(",")[0]?.trim() || EMPTY_SUBJECT;
}

function entryNarrative(e: ReportEntry): string {
  return clean(e.narrative) || EMPTY_NARRATIVE;
}

function entryDetails(e: ReportEntry, max = 3): string[] {
  return (e.details ?? []).map(clean).filter(Boolean).slice(0, max);
}

function detailText(e: ReportEntry, max = 2): string {
  return entryDetails(e, max).join(" · ");
}

function truncateText(value: string, max: number): string {
  const text = clean(value);
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1))}…`;
}

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

function DetailsEl({ e, t, c, max = 3, compact = false }: {
  e: ReportEntry;
  t: Theme;
  c: string;
  max?: number;
  compact?: boolean;
}) {
  const details = entryDetails(e, max);
  if (details.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: compact ? 3 : 6 }}>
      {details.map((detail) => (
        <span key={detail} style={{
          display: "inline-block",
          maxWidth: "100%",
          fontSize: compact ? 8.5 : 9.5,
          lineHeight: 1.25,
          color: t.muted,
          background: c + "14",
          border: `1px solid ${c}26`,
          borderRadius: 999,
          padding: compact ? "1px 5px" : "2px 7px",
        }}>
          {detail}
        </span>
      ))}
    </div>
  );
}

function PhotoEl({ t, url, color }: { t: Theme; url?: string; color: string }) {
  const img = url ? (
    <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
  ) : (
    <div style={{ width: "100%", height: "100%", background: color + "22", display: "flex", alignItems: "center", justifyContent: "center", color: t.muted, fontSize: 9, fontWeight: 700, textAlign: "center", padding: 6 }}>
      Foto belum ada
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

function NarrEl({ t, children }: { t: Theme; children?: string }) {
  return (
    <p style={{ fontFamily: t.fontBody, fontSize: 12.5, lineHeight: 1.55, color: t.ink, margin: 0 }}>
      {clean(children) || EMPTY_NARRATIVE}
    </p>
  );
}

function EngagementBar({ score, label, t }: { score?: number; label?: string; t: Theme }) {
  if (score == null) return null;
  const pct = Math.max(0, Math.min(100, score * 10));
  const barColor = score >= 8 ? "#10B981" : score >= 6 ? "#3B82F6" : score >= 4 ? "#F59E0B" : "#EF4444";
  const emoji = score >= 9 ? "🔥" : score >= 7 ? "💪" : score >= 5 ? "📖" : score >= 3 ? "😴" : "⚠️";
  const desc = label ?? `Skor keterlibatan ${score}/10`;
  return (
    <div role="meter" aria-valuenow={score} aria-valuemin={1} aria-valuemax={10} aria-label={desc}
      style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
      <span aria-hidden="true" style={{ fontSize: 13 }}>{emoji}</span>
      <div style={{ flex: 1, height: 5, borderRadius: 999, background: t.muted + "33", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 999 }} />
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
// 5 layout klasik + 20 layout infografis baru (total 25)

// ──────────────────── KEPT (5) ────────────────────

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
  id: "compact", name: "Compact List", maxEntriesPerPage: 4,
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
export const dashboard: Layout = {
  id: "dashboard", name: "Dashboard", maxEntriesPerPage: 4,
  render: (d, t, { isFirst, isLast }) => (
    <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden" }}>
      <Deco kind={t.deco} />
      {isFirst && HeaderEl(d, t)}
      {/* 4 KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18, position: "relative", zIndex: 2 }}>
        {[
          { label: "Sesi", value: d.entries.length },
          { label: "Rata² Engagement", value: d.avgEngagement != null ? `${d.avgEngagement}/10` : "—" },
          { label: "Foto", value: d.entries.filter(e => e.photoUrl).length },
          { label: "Mapel", value: [...new Set(d.entries.flatMap(e => e.subject.split(", ")))].length },
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
                <span style={{ fontSize: 9, background: c + "20", color: c, padding: "1px 6px", borderRadius: 999, fontWeight: 600 }}>{e.subject.split(",")[0]}</span>
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
  id: "progress", name: "Progress Bar", maxEntriesPerPage: 4,
  render: (d, t, { isFirst, isLast }) => (
    <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden" }}>
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
  id: "weekly", name: "Per Minggu", maxEntriesPerPage: 4,
  render: (d, t, { isFirst, isLast }) => {
    const weeks = new Map<string, typeof d.entries>();
    d.entries.forEach((e) => {
      const parts = e.date.split(" ");
      const dayNum = parseInt(parts[1] || "1");
      const weekNum = `Minggu ${Math.ceil(dayNum / 7)}`;
      if (!weeks.has(weekNum)) weeks.set(weekNum, []);
      weeks.get(weekNum)!.push(e);
    });
    return (
      <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden" }}>
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
  id: "subjects", name: "Per Mapel", maxEntriesPerPage: 4,
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
      <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden" }}>
        <Deco kind={t.deco} />
        {isFirst && HeaderEl(d, t)}
        {[...groups.entries()].map(([subject, entries], gi) => {
          const c = t.palette[gi % t.palette.length];
          const avgEng = entries.filter(e => e.engagementScore != null).reduce((s,e) => s + e.engagementScore!, 0) / (entries.filter(e => e.engagementScore != null).length || 1);
          return (
            <div key={subject} style={{ marginBottom: 16, position: "relative", zIndex: 2, background: c + "0d", borderRadius: 14, padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 14, color: c }}>📘 {subject}</span>
                <span style={{ fontSize: 10, color: t.muted }}>{entries.length} sesi · avg {Math.round(avgEng)}/10</span>
              </div>
              {entries.map((e, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, paddingLeft: 6, borderLeft: `2px solid ${c}44` }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 10, fontWeight: 600, color: t.muted, margin: 0 }}>{e.date}</p>
                    <p style={{ fontFamily: t.fontBody, fontSize: 10.5, lineHeight: 1.35, color: t.ink, margin: "1px 0 0" }}>{e.narrative}</p>
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
  id: "reportcard", name: "Rapor Style", maxEntriesPerPage: 4,
  render: (d, t, { isFirst, isLast }) => (
    <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden" }}>
      <Deco kind={t.deco} />
      {isFirst && HeaderEl(d, t)}
      <div style={{ position: "relative", zIndex: 2 }}>
        {/* Table header */}
        <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 70px", gap: 8, padding: "6px 8px", background: t.accent, borderRadius: "8px 8px 0 0", fontWeight: 700, fontSize: 10, color: "#fff" }}>
          <span>Tanggal</span><span>Mapel & Catatan</span><span>Engage</span>
        </div>
        {d.entries.map((e, i) => {
          const c = t.palette[i % t.palette.length];
          const bgRow = i % 2 === 0 ? t.bg : c + "0a";
          return (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "60px 1fr 70px", gap: 8, padding: "8px 8px", background: bgRow, borderBottom: `1px solid ${t.muted}18`, alignItems: "start" }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: t.muted }}>{e.date.split(" ").pop()}</span>
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, color: c, display: "block" }}>{e.subject}</span>
                <span style={{ fontFamily: t.fontBody, fontSize: 10, lineHeight: 1.35, color: t.ink }}>{e.narrative}</span>
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
    <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden" }}>
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
  id: "checklist", name: "Checklist", maxEntriesPerPage: 4,
  render: (d, t, { isFirst, isLast }) => (
    <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden" }}>
      <Deco kind={t.deco} />
      {isFirst && HeaderEl(d, t)}
      {d.entries.map((e, i) => {
        const c = t.palette[i % t.palette.length];
        const hasNarrative = Boolean(e.narrative?.trim());
        const hasEngagement = e.engagementScore != null && e.engagementScore >= 6;
        return (
          <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, padding: "10px 12px", borderRadius: 12, background: c + "0a", position: "relative", zIndex: 2, alignItems: "flex-start" }}>
            <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1 }}>{hasNarrative ? "✅" : "⬜"}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: c }}>{e.date}</span>
                <span style={{ fontSize: 9, background: c + "22", color: c, padding: "1px 6px", borderRadius: 999 }}>{e.subject}</span>
                {e.engagementScore != null && (
                  <span style={{ fontSize: 9, fontWeight: 700, color: hasEngagement ? "#10B981" : "#EF4444", marginLeft: "auto" }}>
                    {hasEngagement ? "🔥" : "⚡"} {e.engagementScore}
                  </span>
                )}
              </div>
              <p style={{ fontFamily: t.fontBody, fontSize: 10.5, lineHeight: 1.4, color: t.ink, margin: 0 }}>
                {e.narrative || "— belum ada narasi —"}
              </p>
            </div>
          </div>
        );
      })}
      {isLast && SummaryEl(d, t)}
    </div>
  ),
};

// 8 ─ Ringkasan Eksekutif
export const summary: Layout = {
  id: "summary", name: "Ringkasan Eksekutif", maxEntriesPerPage: 4,
  render: (d, t, { isFirst, isLast }) => (
    <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden" }}>
      <Deco kind={t.deco} />
      {isFirst && HeaderEl(d, t)}
      {/* 3 highlight pills */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", position: "relative", zIndex: 2 }}>
        {[
          { icon: "📊", label: `${d.entries.length} Sesi` },
          { icon: "📚", label: `${[...new Set(d.entries.flatMap(e => e.subject.split(", ")))].length} Mapel` },
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
  id: "growth", name: "Pertumbuhan", maxEntriesPerPage: 4,
  render: (d, t, { isFirst, isLast }) => {
    const maxScore = 10;
    return (
      <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden" }}>
        <Deco kind={t.deco} />
        {isFirst && HeaderEl(d, t)}
        {/* Mini bar chart */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 80, marginBottom: 20, position: "relative", zIndex: 2, padding: "0 4px" }}>
          {d.entries.map((e, i) => {
            const c = t.palette[i % t.palette.length];
            const h = e.engagementScore != null ? (e.engagementScore / maxScore) * 100 : 15;
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: c }}>{e.engagementScore ?? "—"}</span>
                <div style={{ width: "100%", height: `${h}%`, borderRadius: "4px 4px 0 0", background: c, minHeight: 4, transition: "height .3s" }} />
                <span style={{ fontSize: 8, color: t.muted, transform: "rotate(-30deg)", whiteSpace: "nowrap", marginTop: 2 }}>{e.date.split(" ").pop()}</span>
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
  id: "dossier", name: "Berkas Siswa", maxEntriesPerPage: 4,
  render: (d, t, { isFirst, isLast }) => (
    <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden" }}>
      <Deco kind={t.deco} />
      {isFirst && HeaderEl(d, t)}
      {d.entries.map((e, i) => {
        const c = t.palette[i % t.palette.length];
        return (
          <div key={i} style={{ position: "relative", zIndex: 2, marginBottom: 16, borderRadius: 12, border: `2px solid ${c}33`, background: "#fff", overflow: "hidden" }}>
            <div style={{ background: c, padding: "8px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 13, color: "#fff" }}>{e.date}</span>
              <span style={{ fontSize: 9, background: "rgba(255,255,255,.25)", color: "#fff", padding: "2px 8px", borderRadius: 999 }}>{e.subject}</span>
            </div>
            <div style={{ padding: "12px 14px" }}>
              <NarrEl t={t}>{e.narrative}</NarrEl>
              <EngagementBar score={e.engagementScore} label={e.engagementLabel} t={t} />
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
  id: "analytics", name: "Analitik", maxEntriesPerPage: 4,
  render: (d, t, { isFirst, isLast }) => {
    const subjectCounts = new Map<string, number>();
    d.entries.forEach(e => e.subject.split(", ").forEach(s => subjectCounts.set(s.trim(), (subjectCounts.get(s.trim()) || 0) + 1)));
    const total = d.entries.length;
    return (
      <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden" }}>
        <Deco kind={t.deco} />
        {isFirst && HeaderEl(d, t)}
        {/* Donut-like subject bars */}
        <div style={{ marginBottom: 18, position: "relative", zIndex: 2 }}>
          <p style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 11, color: t.muted, marginBottom: 8, letterSpacing: 1, textTransform: "uppercase" }}>Distribusi Mapel</p>
          {[...subjectCounts.entries()].map(([subj, cnt], si) => {
            const c = t.palette[si % t.palette.length];
            const pct = Math.round((cnt / total) * 100);
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
  id: "narrative", name: "Narasi Utama", maxEntriesPerPage: 4,
  render: (d, t, { isFirst, isLast }) => (
    <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden" }}>
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
export const milestone: Layout = {
  id: "milestone", name: "Capaian", maxEntriesPerPage: 4,
  render: (d, t, { isFirst, isLast }) => (
    <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden" }}>
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
                <div style={{ marginTop: 6, background: c + "0a", borderRadius: 12, padding: "10px 12px" }}>
                  <NarrEl t={t}>{e.narrative}</NarrEl>
                  <EngagementBar score={e.engagementScore} label={e.engagementLabel} t={t} />
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
    <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden" }}>
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
              <p style={{ fontSize: 9, fontWeight: 600, color: t.muted, margin: "4px 0" }}>{e.subject}</p>
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
  id: "journal", name: "Jurnal", maxEntriesPerPage: 4,
  render: (d, t, { isFirst, isLast }) => (
    <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden" }}>
      <Deco kind={t.deco} />
      {isFirst && HeaderEl(d, t)}
      {d.entries.map((e, i) => {
        const c = t.palette[i % t.palette.length];
        const [dayName, ...rest] = e.date.split(" ");
        const dayNum = rest.pop() || "";
        return (
          <div key={i} style={{ display: "flex", gap: 14, marginBottom: 18, position: "relative", zIndex: 2 }}>
            <div style={{ textAlign: "right", flexShrink: 0, width: 48, paddingTop: 2 }}>
              <p style={{ fontFamily: t.fontDisplay, fontWeight: 800, fontSize: 28, color: c, lineHeight: 1, margin: 0 }}>{dayNum}</p>
              <p style={{ fontSize: 9, fontWeight: 600, color: t.muted, margin: 0 }}>{dayName}</p>
            </div>
            <div style={{ flex: 1, borderLeft: `2px dashed ${c}44`, paddingLeft: 14 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: c, background: c + "18", padding: "2px 8px", borderRadius: 999 }}>
                {e.subject}
              </span>
              <p style={{ fontFamily: "'Caveat', cursive", fontSize: 14, lineHeight: 1.5, color: t.ink, margin: "6px 0 0" }}>{e.narrative}</p>
              <EngagementBar score={e.engagementScore} label={e.engagementLabel} t={t} />
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
    <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden" }}>
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
            <div style={{ padding: "12px 14px", background: "#fff" }}>
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
  id: "minimal", name: "Minimalis", maxEntriesPerPage: 4,
  render: (d, t, { isFirst, isLast }) => (
    <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden" }}>
      {isFirst && HeaderEl(d, t)}
      <div style={{ position: "relative", zIndex: 2 }}>
        {d.entries.map((e, i) => {
          const c = t.palette[i % t.palette.length];
          return (
            <div key={i} style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: c }}>{e.date}</span>
                <span style={{ fontSize: 10, color: t.muted }}>{e.subject}</span>
                {e.engagementScore != null && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: c, marginLeft: "auto" }}>{e.engagementScore}/10</span>
                )}
              </div>
              <p style={{ fontFamily: t.fontBody, fontSize: 11.5, lineHeight: 1.55, color: t.ink, margin: 0 }}>{e.narrative}</p>
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
  id: "bullets", name: "Bullet Journal", maxEntriesPerPage: 4,
  render: (d, t, { isFirst, isLast }) => (
    <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden" }}>
      <Deco kind={t.deco} />
      {isFirst && HeaderEl(d, t)}
      {d.entries.map((e, i) => {
        const c = t.palette[i % t.palette.length];
        const bullet = e.engagementScore != null && e.engagementScore >= 8 ? "●" : e.engagementScore != null && e.engagementScore >= 5 ? "◉" : "○";
        return (
          <div key={i} style={{ display: "flex", gap: 10, marginBottom: 14, position: "relative", zIndex: 2 }}>
            <span style={{ fontSize: 16, color: c, flexShrink: 0, lineHeight: 1.2 }}>{bullet}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3 }}>
                <span style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 11, color: c }}>{e.date}</span>
                <span style={{ fontSize: 9, background: t.muted + "18", color: t.muted, padding: "1px 6px", borderRadius: 999 }}>{e.subject}</span>
                {e.engagementScore != null && (
                  <span style={{ fontSize: 9, fontWeight: 700, color: c }}>⚡{e.engagementScore}</span>
                )}
              </div>
              <p style={{ fontFamily: "'Caveat', cursive", fontSize: 13, lineHeight: 1.5, color: t.ink, margin: 0 }}>{e.narrative}</p>
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
  id: "compare", name: "Perbandingan", maxEntriesPerPage: 4,
  render: (d, t, { isFirst, isLast }) => {
    const firstHalf = d.entries.slice(0, Math.ceil(d.entries.length / 2));
    const secondHalf = d.entries.slice(Math.ceil(d.entries.length / 2));
    const avgEng = (entries: typeof d.entries) => {
      const valid = entries.filter(e => e.engagementScore != null);
      return valid.length > 0 ? Math.round(valid.reduce((s, e) => s + e.engagementScore!, 0) / valid.length) : null;
    };
    return (
      <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden" }}>
        <Deco kind={t.deco} />
        {isFirst && HeaderEl(d, t)}
        {/* Comparison header */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16, position: "relative", zIndex: 2 }}>
          {[
            { label: "Awal Bulan", entries: firstHalf, ci: 0 },
            { label: "Akhir Bulan", entries: secondHalf, ci: 1 },
          ].map((col) => {
            const cc = t.palette[col.ci];
            const avg = avgEng(col.entries);
            return (
              <div key={col.label} style={{ background: cc + "12", borderRadius: 12, padding: "10px", textAlign: "center" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: cc, margin: 0 }}>{col.label}</p>
                <p style={{ fontFamily: t.fontDisplay, fontWeight: 800, fontSize: 22, color: cc, margin: "4px 0 0" }}>{col.entries.length}</p>
                <p style={{ fontSize: 9, color: t.muted, margin: 0 }}>sesi{avg != null ? ` · avg ${avg}/10` : ""}</p>
              </div>
            );
          })}
        </div>
        {/* Arrow and comparison summary */}
        <div style={{ textAlign: "center", marginBottom: 16, position: "relative", zIndex: 2 }}>
          {(avgEng(firstHalf) != null && avgEng(secondHalf) != null) && (
            <span style={{ fontSize: 12, fontWeight: 600, color: avgEng(secondHalf)! >= avgEng(firstHalf)! ? "#10B981" : "#EF4444" }}>
              {avgEng(secondHalf)! >= avgEng(firstHalf)! ? "📈 Meningkat" : "📉 Menurun"} {Math.abs(avgEng(secondHalf)! - avgEng(firstHalf)!)} poin
            </span>
          )}
        </div>
        {/* All sessions compact */}
        {d.entries.map((e, i) => {
          const c = t.palette[i % t.palette.length];
          const meta = detailText(e, 1);
          return (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, position: "relative", zIndex: 2, padding: "7px 8px", borderRadius: 8, background: c + "08" }}>
              <span style={{ fontSize: 9, fontWeight: 600, color: c, width: 55, flexShrink: 0 }}>{entryDateShort(e)}</span>
              <span style={{ fontFamily: t.fontBody, fontSize: 10, color: t.ink, flex: 1, lineHeight: 1.3 }}>
                <strong style={{ color: c }}>{entrySubjectShort(e)}:</strong> {truncateText(entryNarrative(e), 62)}
                {meta && <span style={{ display: "block", color: t.muted, fontSize: 8.5, marginTop: 1 }}>{meta}</span>}
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
  id: "snapshot", name: "Snapshot", maxEntriesPerPage: 4,
  render: (d, t, { isFirst, isLast }) => (
    <div style={{ background: t.bg, color: t.ink, fontFamily: t.fontBody, borderRadius: 22, padding: "22px 17px 26px", position: "relative", overflow: "hidden" }}>
      <Deco kind={t.deco} />
      {isFirst && HeaderEl(d, t)}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, position: "relative", zIndex: 2 }}>
        {d.entries.map((e, i) => {
          const c = t.palette[i % t.palette.length];
          const rot = ((i % 4) - 1.5) * 1.2;
          const meta = detailText(e, 1);
          return (
            <div key={i} style={{ transform: `rotate(${rot}deg)`, background: "#fff", padding: 7, paddingBottom: 9, boxShadow: "0 2px 8px rgba(0,0,0,.10)", borderRadius: 3 }}>
              <div style={{ aspectRatio: "4/3", overflow: "hidden", borderRadius: 2, marginBottom: 7 }}>
                <PhotoEl t={t} url={e.photoUrl} color={c} />
              </div>
              <p style={{ fontFamily: t.fontBody, fontSize: 9.5, lineHeight: 1.25, color: c, margin: 0, textAlign: "center", fontWeight: 800 }}>
                {entryDateShort(e)} - {entrySubjectShort(e)}
              </p>
              <p style={{ fontFamily: "'Caveat', cursive", fontSize: 10.5, lineHeight: 1.28, color: t.ink, margin: "4px 0 0", textAlign: "center" }}>
                {truncateText(entryNarrative(e), 72)}
              </p>
              {meta && <p style={{ fontSize: 8, lineHeight: 1.2, color: t.muted, textAlign: "center", margin: "3px 0 0" }}>{meta}</p>}
              {e.engagementScore != null && (
                <p style={{ fontSize: 8, fontWeight: 700, color: c, textAlign: "center", margin: "2px 0 0" }}>⚡{e.engagementScore}</p>
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
      </div>
    </div>
  ),
};

export const LAYOUTS: Layout[] = [
  cards, timeline, scrapbook, grid, compact,
  dashboard, progress, weekly, subjects, reportcard,
  portfolio, checklist, summary, growth, dossier,
  analytics, narrative, milestone, split, journal,
  overview, minimal, bullets, compare, snapshot,
];
export const LAYOUT_IDS = LAYOUTS.map((l) => l.id);
export function getLayout(id: string): Layout {
  return LAYOUTS.find((l) => l.id === id) ?? cards;
}
