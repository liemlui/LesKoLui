/**
 * Format helpers — all date logic lives here.
 * Never compute month from a UTC timestamp.
 */

/** Today's date in WIB (UTC+7) as "YYYY-MM-DD".
 *  Always adds 7h to UTC then reads UTC fields — device timezone irrelevant. */
export function todayWIB(): string {
  const wib = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return `${wib.getUTCFullYear()}-${String(wib.getUTCMonth() + 1).padStart(2, "0")}-${String(wib.getUTCDate()).padStart(2, "0")}`;
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

/** Format as Indonesian Rupiah — e.g. 150000 → "Rp 150.000" */
export function formatRupiah(n: number): string {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}

/**
 * Parse a "YYYY-MM-DD" string as local midnight.
 * `new Date("YYYY-MM-DD")` is UTC midnight — can shift the day by timezone.
 * This helper avoids that by appending "T00:00:00" (local time).
 */
export function parseDate(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00");
}
