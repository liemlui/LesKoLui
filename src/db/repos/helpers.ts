// ── Shared helpers for repos ───────────────────────────────────────
// Semua helper yang dipakai lintas domain repo: WIB date, month range, timestamp.

export function monthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split("-").map(Number);
  const start = `${month}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${month}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

export function timestamp(): string {
  return new Date().toISOString();
}

export function nowTimeWIB(): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts();
  const m = Object.fromEntries(parts.filter((p) => p.type !== "literal").map((p) => [p.type, p.value]));
  return `${m.hour}:${m.minute}`;
}

export function subtractHoursFromTime(hhmm: string, hours: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const totalMin = h * 60 + m - Math.round(hours * 60);
  const norm = ((totalMin % 1440) + 1440) % 1440;
  return `${String(Math.floor(norm / 60)).padStart(2, "0")}:${String(norm % 60).padStart(2, "0")}`;
}

export function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}
