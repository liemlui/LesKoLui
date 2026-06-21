import type { Student, Session, Homework } from "../db/types";

export interface ShareReportInput {
  student: Student;
  sessions: Session[];
  homeworks: Homework[];
  tutorName: string;
  generatedAt: string; // ISO
}

function formatRp(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

function engColor(score: number) {
  if (score >= 7) return "#16a34a";
  if (score >= 4) return "#d97706";
  return "#dc2626";
}

export function generateShareHtml(input: ShareReportInput): string {
  const { student, sessions, homeworks, tutorName, generatedAt } = input;
  const doneSessions = sessions.filter((s) => s.status === "DONE");
  const totalHours   = doneSessions.reduce((s, x) => s + x.durationHours, 0);

  // Last 3 months attendance
  const now = new Date(Date.now() + 7 * 3600000);
  const months: string[] = [];
  for (let i = 2; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const monthRows = months.map((m) => {
    const cnt = doneSessions.filter((s) => s.date.startsWith(m)).length;
    const hrs  = doneSessions.filter((s) => s.date.startsWith(m)).reduce((s, x) => s + x.durationHours, 0);
    return { m, cnt, hrs };
  });

  // Topics (unique, last 20)
  const topics = [...new Set(doneSessions.map((s) => s.topic).filter(Boolean) as string[])].slice(-20);

  // Engagement avg
  const engSess = doneSessions.filter((s) => s.engagement != null);
  const avgEng  = engSess.length > 0
    ? Math.round(engSess.reduce((s, x) => s + x.engagement!.score, 0) / engSess.length * 10) / 10
    : null;

  // Homework stats
  const doneHw  = homeworks.filter((h) => h.status === "done").length;
  const judgedHw = homeworks.filter((h) => h.status === "done" || h.status === "not_done" || h.status === "overdue").length;
  const hwPct   = judgedHw > 0 ? Math.round((doneHw / judgedHw) * 100) : null;

  // Latest predicted grade
  const gradeSess = [...doneSessions].reverse().find((s) => s.predictedGrade);

  // Last 5 session cards
  const recentSess = [...doneSessions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  const monthLabel = (m: string) => {
    const [y, mo] = m.split("-");
    const names = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
    return `${names[Number(mo) - 1]} ${y}`;
  };

  const engChart = engSess.slice(-12).map((s) => {
    const pct = Math.round((s.engagement!.score / 10) * 100);
    const col  = engColor(s.engagement!.score);
    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px">
      <div style="width:100%;background:${col};border-radius:2px 2px 0 0;height:${pct}%;opacity:0.85"></div>
      <span style="font-size:8px;color:#9ca3af">${s.date.slice(5)}</span>
    </div>`;
  }).join("");

  const topicChips = topics.map((t) =>
    `<span style="display:inline-block;background:#dbeafe;color:#1e40af;border-radius:999px;padding:2px 10px;font-size:12px;margin:3px 2px">${t}</span>`
  ).join("");

  const sessionCards = recentSess.map((s) => {
    const subj = s.subjects.join(", ") || "—";
    const score = s.engagement?.score;
    return `<div style="border:1px solid #e5e7eb;border-radius:12px;padding:12px 14px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <p style="font-size:13px;font-weight:700;color:#111827;margin:0">${s.date} · ${subj}</p>
          <p style="font-size:12px;color:#6b7280;margin:3px 0 0">${s.shortNote || "—"}</p>
          ${s.topic ? `<p style="font-size:12px;color:#3b82f6;margin:2px 0 0">📖 ${s.topic}</p>` : ""}
          ${s.needsWork ? `<p style="font-size:12px;color:#f59e0b;margin:2px 0 0">⚠ ${s.needsWork}</p>` : ""}
        </div>
        ${score != null ? `<span style="font-size:12px;font-weight:700;color:${engColor(score)};background:#f9fafb;padding:2px 8px;border-radius:999px;flex-shrink:0">${score}/10</span>` : ""}
      </div>
    </div>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Laporan Progress — ${student.name}</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;color:#111827;margin:0;padding:16px}
  .card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:20px;margin-bottom:16px}
  h1{font-size:22px;font-weight:800;margin:0 0 4px}
  h2{font-size:15px;font-weight:700;margin:0 0 12px;color:#374151}
  .chip{display:inline-block;border-radius:999px;padding:2px 10px;font-size:12px;font-weight:600}
  .kpi-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .kpi{background:#f3f4f6;border-radius:12px;padding:12px;text-align:center}
  .kpi-val{font-size:22px;font-weight:800;color:#1e40af}
  .kpi-lbl{font-size:11px;color:#6b7280;margin-top:2px}
  .bar-wrap{display:flex;align-items:flex-end;gap:3px;height:80px;margin-top:8px}
  @media(max-width:480px){.kpi-grid{grid-template-columns:1fr 1fr}}
</style>
</head>
<body>
<div style="max-width:480px;margin:0 auto">

  <div class="card" style="background:linear-gradient(135deg,#1e40af,#3b82f6);color:#fff;border:none">
    <p style="font-size:12px;opacity:0.8;margin:0 0 6px">Laporan Progress Belajar</p>
    <h1 style="color:#fff">${student.name}</h1>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">
      ${student.curriculum ? `<span class="chip" style="background:rgba(255,255,255,0.2);color:#fff">${student.curriculum}</span>` : ""}
      ${student.grade ? `<span class="chip" style="background:rgba(255,255,255,0.2);color:#fff">${student.grade}</span>` : ""}
      ${student.school ? `<span class="chip" style="background:rgba(255,255,255,0.2);color:#fff">${student.school}</span>` : ""}
    </div>
    <p style="font-size:11px;opacity:0.7;margin-top:10px 0 0">Disiapkan oleh ${tutorName} · ${new Date(generatedAt).toLocaleDateString("id-ID", { day:"numeric", month:"long", year:"numeric" })}</p>
  </div>

  <div class="card">
    <h2>Statistik Keseluruhan</h2>
    <div class="kpi-grid">
      <div class="kpi"><div class="kpi-val">${doneSessions.length}</div><div class="kpi-lbl">Total Sesi</div></div>
      <div class="kpi"><div class="kpi-val">${totalHours}</div><div class="kpi-lbl">Total Jam</div></div>
      ${avgEng !== null ? `<div class="kpi"><div class="kpi-val" style="color:${engColor(avgEng)}">${avgEng}</div><div class="kpi-lbl">Avg Engagement</div></div>` : ""}
      ${hwPct !== null ? `<div class="kpi"><div class="kpi-val" style="color:#059669">${hwPct}%</div><div class="kpi-lbl">Selesaikan PR</div></div>` : ""}
      ${gradeSess ? `<div class="kpi"><div class="kpi-val" style="color:#7c3aed">${gradeSess.predictedGrade}</div><div class="kpi-lbl">Prediksi Nilai</div></div>` : ""}
    </div>
  </div>

  <div class="card">
    <h2>Kehadiran 3 Bulan Terakhir</h2>
    ${monthRows.map((r) => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f3f4f6">
        <span style="font-size:13px;color:#374151;font-weight:600">${monthLabel(r.m)}</span>
        <div style="text-align:right">
          <span style="font-size:13px;font-weight:700;color:#1e40af">${r.cnt} sesi</span>
          <span style="font-size:12px;color:#9ca3af;margin-left:8px">${r.hrs} jam</span>
        </div>
      </div>`).join("")}
  </div>

  ${engSess.length > 0 ? `
  <div class="card">
    <h2>Grafik Engagement (12 sesi terakhir)</h2>
    <div class="bar-wrap">${engChart}</div>
    <div style="display:flex;justify-content:space-between;margin-top:4px">
      <span style="font-size:9px;color:#9ca3af">lama</span>
      <span style="font-size:9px;color:#9ca3af">terbaru</span>
    </div>
    <p style="font-size:12px;color:#6b7280;margin-top:10px">
      <span style="color:#16a34a">●</span> ≥7 Sangat Baik &nbsp;
      <span style="color:#d97706">●</span> ≥4 Cukup &nbsp;
      <span style="color:#dc2626">●</span> &lt;4 Perlu Perhatian
    </p>
  </div>` : ""}

  ${topics.length > 0 ? `
  <div class="card">
    <h2>Topik yang Dipelajari</h2>
    <div>${topicChips}</div>
  </div>` : ""}

  <div class="card">
    <h2>5 Sesi Terbaru</h2>
    ${sessionCards || "<p style='color:#9ca3af;font-size:13px'>Belum ada sesi.</p>"}
  </div>

  <p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:16px">
    Laporan ini dibuat otomatis oleh Les Ko Lui · ${new Date(generatedAt).toLocaleString("id-ID")}
  </p>
</div>
</body>
</html>`;
}
