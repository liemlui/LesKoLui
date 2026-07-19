/* eslint-disable react-refresh/only-export-components */
import type { Theme, ReportData, Layout, ReportEntry } from "../types";
import { Deco } from "../deco";

// Ikut tercetak di laporan orang tua — jaga netral, tanpa instruksi untuk tutor
export const EMPTY_NARRATIVE = "Sesi berjalan sesuai jadwal.";
export const EMPTY_SUBJECT = "Mapel belum diisi";
export const EMPTY_DATE = "Tanggal belum diisi";

export function clean(value?: string): string {
  return value?.trim() ?? "";
}

export function entryDate(e: ReportEntry): string {
  return clean(e.date) || EMPTY_DATE;
}

// e.date dari MonthlyReport berformat "5 Juni 2026" — ambil "5 Juni" (buang tahun)
export function entryDateShort(e: ReportEntry): string {
  const date = entryDate(e);
  const tokens = date.split(" ").filter(Boolean);
  return tokens.slice(0, 2).join(" ") || date;
}

/** Nomor hari saja ("5") — untuk label sumbu chart yang sempit. */
export function entryDay(e: ReportEntry): string {
  return entryDate(e).split(" ")[0] || "";
}

export function entrySubject(e: ReportEntry): string {
  return clean(e.subject) || EMPTY_SUBJECT;
}

export function entrySubjectShort(e: ReportEntry): string {
  return entrySubject(e).split(",")[0]?.trim() || EMPTY_SUBJECT;
}

export function entryNarrative(e: ReportEntry): string {
  return clean(e.narrative) || EMPTY_NARRATIVE;
}

export function entryDetails(e: ReportEntry, max = 3): string[] {
  return (e.details ?? []).map(clean).filter(Boolean).slice(0, max);
}

export function detailText(e: ReportEntry, max = 2): string {
  return entryDetails(e, max).join(" · ");
}

export function truncateText(value: string, max: number): string {
  const text = clean(value);
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1))}…`;
}

/**
 * Warna teks kontras (putih/gelap) untuk latar hex — supaya label tetap
 * terbaca di palet terang (mis. Neon Pop #39ff14, Retro 80s #ffea00).
 * Non-hex (gradient/nama warna) → default putih.
 */
export function onColor(bgHex: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(bgHex.trim());
  if (!m) return "#fff";
  const n = parseInt(m[1], 16);
  const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 165 ? "#1f2937" : "#fff";
}

// ── Shared helpers ─────────────────────────────────────────────────

export function LogoEl({ url, tutorName }: { url?: string; tutorName?: string }) {
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

export function HeaderEl(d: ReportData, t: Theme) {
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
          <div style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 18, color: onColor(t.accent),
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
            <span style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 18, color: onColor(t.accent) }}>{t.headerText}</span>
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

export function LabelEl({ t, c, children }: { t: Theme; c: string; children: React.ReactNode }) {
  const base: React.CSSProperties = {
    display: "inline-block", fontWeight: 700, fontSize: 12, padding: "3px 12px",
    fontFamily: t.fontDisplay, background: c, color: onColor(c),
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
      <span style={{ display: "inline-block", position: "relative", fontWeight: 700, fontSize: 11, fontFamily: t.fontDisplay, color: onColor(c), background: c, padding: "4px 14px 4px 10px", borderRadius: "0 6px 6px 0", marginLeft: 6 }}>
        <span style={{ position: "absolute", left: -6, top: 0, width: 0, height: 0, borderTop: `10px solid ${c}`, borderBottom: `10px solid ${c}`, borderLeft: "6px solid transparent" }} />
        {children}
      </span>
    );
  }
  // pill
  return <span style={{ ...base, borderRadius: 999 }}>{children}</span>;
}

export function DetailsEl({ e, t, c, max = 3, compact = false }: {
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

export function PhotoEl({ t, url, color }: { t: Theme; url?: string; color: string }) {
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
    // filter (bukan background) — nilai sepia() di background adalah CSS invalid dan tak pernah berefek
    <div style={{ width: "100%", height: "100%", overflow: "hidden", borderRadius: 6, filter: "sepia(0.35) contrast(0.92) brightness(0.97)" }}>
      {img}
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

export function NarrEl({ t, children }: { t: Theme; children?: string }) {
  return (
    <p style={{ fontFamily: t.fontBody, fontSize: 12.5, lineHeight: 1.55, color: t.ink, margin: 0 }}>
      {clean(children) || EMPTY_NARRATIVE}
    </p>
  );
}

export function EngagementBar({ score, label, t }: { score?: number; label?: string; t: Theme }) {
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

export function SummaryEl(d: ReportData, t: Theme) {
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

/** Sparkline SVG tren skor fokus (1–10) — dipakai layout infografis. */
export function Sparkline(series: number[], t: Theme) {
  const W = 300, H = 40, pad = 5;
  const n = series.length;
  const yOf = (v: number) => pad + (1 - (Math.max(1, Math.min(10, v)) - 1) / 9) * (H - pad * 2);
  const xOf = (i: number) => pad + (i / (n - 1)) * (W - pad * 2);
  const pts = series.map((v, i) => `${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`).join(" ");
  const avg = series.reduce((s, v) => s + v, 0) / n;
  const avgY = yOf(avg).toFixed(1);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: "block" }}>
      <line x1={pad} y1={avgY} x2={W - pad} y2={avgY} stroke={t.muted} strokeWidth={1} strokeDasharray="4 4" opacity={0.5} />
      <polyline points={pts} fill="none" stroke={t.accent} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      {series.map((v, i) => <circle key={i} cx={xOf(i)} cy={yOf(v)} r={2.6} fill={t.accent} />)}
    </svg>
  );
}

