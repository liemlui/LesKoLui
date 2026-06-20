/**
 * Format helpers — all date logic lives here.
 * Never compute month from a UTC timestamp.
 */

/** Today's date in WIB (UTC+7) as "YYYY-MM-DD" */
export function todayWIB(): string {
  const now = new Date();
  const wibOffset = 7 * 60; // minutes ahead of UTC
  const local = new Date(now.getTime() + (now.getTimezoneOffset() + wibOffset) * 60_000);
  return local.toISOString().slice(0, 10);
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

/** Format as Indonesian Rupiah — e.g. 150000 → "Rp150.000" */
export function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}
