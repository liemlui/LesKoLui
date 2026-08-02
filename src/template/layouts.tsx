// ── Barrel re-export ───────────────────────────────────────────────
// Semua layout + helpers sekarang di-split ke `src/template/layouts/`.
// File ini tetap ada sebagai proxy agar import existing tidak rusak.
// Lihat: src/template/layouts/index.ts untuk daftar lengkap export.
/* eslint-disable react-refresh/only-export-components */

export * from "./layouts/index";
