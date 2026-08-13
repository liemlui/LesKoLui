// ── Lapisan z-index terpusat ─────────────────────────────────────────
// Satu sumber kebenaran agar tumpukan modal/banner konsisten. Nav = z-50.
// Urutan (bawah → atas):
//   nav 50 → nag 55 → modal 60 → picker 70 → tooltip 80 → dialog 90
//   → invoice 100 → flash 160 → toast/offline 200 → banner 205 → bannerTop 210
export const Z = {
  /** Prompt backup mingguan: di atas nav, DI BAWAH semua modal. */
  nag: "z-[55]",
  /** Modal bottom-sheet dasar + dialog edit inline. */
  modal: "z-[60]",
  /** Picker & overlay laporan sesi. */
  picker: "z-[70]",
  /** Tooltip info. */
  tooltip: "z-[80]",
  /** Changelog & dialog AI. */
  dialog: "z-[90]",
  /** Invoice & catat pengeluaran. */
  invoice: "z-[100]",
  /** Flash hasil aksi (di atas modal). */
  flash: "z-[160]",
  /** Toast + banner offline. */
  toast: "z-[200]",
  /** Banner backup menua. */
  banner: "z-[205]",
  /** Banner penyimpanan penuh (paling atas). */
  bannerTop: "z-[210]",
} as const;
