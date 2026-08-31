/**
 * Format helpers — all date logic lives here.
 * Never compute month from a UTC timestamp.
 */

/** Convert an instant to its business date in WIB (UTC+7), YYYY-MM-DD. */
export function dateInWIB(value: Date | string): string | undefined {
  const instant = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(instant.getTime())) return undefined;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(instant);
  const m = Object.fromEntries(parts.filter((p) => p.type !== "literal").map((p) => [p.type, p.value]));
  return `${m.year}-${m.month}-${m.day}`;
}

/** Today's date in WIB (UTC+7) as "YYYY-MM-DD". */
export function todayWIB(): string {
  // A valid Date can never produce undefined here; fallback keeps the return
  // contract total if an Intl implementation behaves unexpectedly.
  return dateInWIB(new Date()) ?? new Date().toISOString().slice(0, 10);
}

/** Extract "YYYY-MM" from a "YYYY-MM-DD" string */
export function monthOf(dateStr: string): string {
  return dateStr.slice(0, 7);
}

/** Indonesian day names */
const DAY_NAMES = [
  "Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu",
];

/** Friendly label: "Kamis, 15 Juni 2026" */
export function dayLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d); // local time, avoids UTC shift
  const dayName = DAY_NAMES[date.getDay()];
  const monthName = date.toLocaleDateString("id-ID", { month: "long" });
  return `${dayName}, ${d} ${monthName} ${y}`;
}

/** Month name in Indonesian: "Juni 2026" */
export function monthLabel(monthStr: string): string {
  const [y, m] = monthStr.split("-").map(Number);
  const date = new Date(y, m - 1, 1);
  return date.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

/**
 * Label periode rekap laporan (YYYY-MM-DD inklusif):
 * satu bulan → "Juni 2026"; lintas bulan → "20 Januari – 3 Februari 2026".
 */
export function periodLabel(start: string, end: string): string {
  if (!start || !end) return "";
  if (start.slice(0, 7) === end.slice(0, 7)) return monthLabel(start.slice(0, 7));
  const short = (d: string) => dayLabel(d).replace(/^\w+, /, "").replace(/ \d{4}$/, "");
  if (start.slice(0, 4) !== end.slice(0, 4)) {
    return `${short(start)} ${start.slice(0, 4)} – ${short(end)} ${end.slice(0, 4)}`;
  }
  return `${short(start)} – ${short(end)} ${end.slice(0, 4)}`;
}

/** Format as Indonesian Rupiah — e.g. 150000 → "Rp 150.000". Never shows decimals. */
export function formatRupiah(n: number): string {
  return "Rp " + Math.round(n).toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * Parse a "YYYY-MM-DD" string as local midnight.
 * `new Date("YYYY-MM-DD")` is UTC midnight — can shift the day by timezone.
 * This helper avoids that by appending "T00:00:00" (local time).
 */
export function parseDate(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00");
}
