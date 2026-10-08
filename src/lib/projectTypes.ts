// ── Jenis proyek tugas panjang (IA / EE / PP / jenis bebas) ─────────────────
//
// Menggantikan rantai syarat yang dulu hidup di dalam JSX `IaEeTracker.tsx`
// (empat rantai: teks penjelasan, label kolom mapel, placeholder judul, dan
// warna badge). Satu konsep → satu label, sesuai glosarium G3-08.
//
// Modul ini SENGAJA ditaruh di `src/lib/`, bukan di `src/screens/studentDetail/`,
// supaya `src/lib/backupValidation.ts` bisa memakai daftar kode yang SAMA.
// Butir 7 G3-06 menuntut kedua tempat itu "disamakan"; menyalin daftarnya ke dua
// berkas akan membuat keduanya bisa berbeda lagi di kemudian hari. Modul ini
// murni: tanpa impor Dexie, tanpa efek samping.
//
// Keputusan pemilik 2026-10-09 (K1 + K4): pelacak menjadi manajemen proyek umum
// dengan preset IB, jenis boleh bebas, dan pembatas IB dilonggarkan.

import type { IaEeMilestone, IaEeType, MilestoneStatus } from "../db/types";

/** Satu entri peta jenis proyek. Semua teks antarmuka untuk satu jenis ada di sini. */
export interface ProjectTypeMeta {
  /** Kode yang DISIMPAN di data. Empat di antaranya stabil; `OTHER` untuk jenis bebas. */
  code: IaEeType;
  /** Label penuh di pemilih jenis. */
  label: string;
  /** Label pendek untuk badge pada kartu proyek. */
  badgeLabel: string;
  /** Arahan singkat satu baris yang tampil di bawah pemilih jenis. */
  hint: string;
  /** Label kolom "mapel" untuk jenis ini. */
  subjectLabel: string;
  /** Apakah mapel wajib diisi untuk jenis ini. */
  subjectRequired: boolean;
  /** Placeholder judul. */
  titlePlaceholder: string;
  /** Kelas token warna untuk badge (token, bukan warna mentah — supaya tema tetap satu sumber). */
  badgeClass: string;
  /**
   * Milestone awal yang otomatis ditawarkan saat proyek dibuat.
   * Kosong berarti tutor mengisi sendiri.
   *
   * ⚠️ PRESET DI BAWAH INI DISUSUN AGEN mengikuti kerangka silabus, dan BELUM
   * dibandingkan dengan panduan resmi IB. Ia bantuan kerja, BUKAN pernyataan
   * syarat resmi. Batas kejujuran yang sama dicatat di `SERAH-TERIMA.md` §4.2
   * nomor 4 dan belum ditutup keputusan D5.
   */
  preset: readonly string[];
}

/**
 * Peta jenis proyek. Urutannya menentukan urutan di pemilih jenis.
 *
 * `IA`, `EE`, `PP` dipertahankan apa adanya supaya data lama tetap terbaca tanpa
 * migrasi (kolom `type` tidak diindeks di Dexie, jadi menambah nilai bukan
 * perubahan skema). `OTHER` menampung eksperimen, esai, proyek pribadi, tugas
 * internal, atau tugas panjang apa pun — termasuk untuk kurikulum non-IB.
 */
export const PROJECT_TYPES: readonly ProjectTypeMeta[] = [
  {
    code: "IA",
    label: "IA — Internal Assessment (DP)",
    badgeLabel: "IA",
    hint: "Tugas resmi dari satu mapel DP, dinilai internal lalu dimoderasi.",
    subjectLabel: "Mata pelajaran",
    subjectRequired: true,
    titlePlaceholder: "Judul / topik penelitian",
    badgeClass: "bg-[var(--brand-tint-strong)] text-[var(--ink-brand)]",
    preset: ["Proposal", "Eksperimen / pengumpulan data", "Analisis", "Draf", "Revisi", "Submit"],
  },
  {
    code: "EE",
    label: "EE — Extended Essay (DP)",
    badgeLabel: "EE",
    hint: "Esai riset mandiri dari salah satu mapel DP.",
    subjectLabel: "Mata pelajaran",
    subjectRequired: true,
    titlePlaceholder: "Judul / research question",
    badgeClass: "bg-[var(--accent-tint)] text-[var(--ink-purple)]",
    preset: ["Research question", "Riset literatur", "Draf bab 1–3", "Revisi", "Submit"],
  },
  {
    code: "PP",
    label: "PP — Personal Project (MYP)",
    badgeLabel: "PP",
    hint: "Proyek mandiri MYP — tidak terikat satu mapel.",
    subjectLabel: "Mapel (opsional untuk PP)",
    subjectRequired: false,
    titlePlaceholder: "Judul proyek / pertanyaan pemandu",
    badgeClass: "bg-[var(--bg-success)] text-[var(--ink-success)]",
    preset: ["Tujuan & pertanyaan pemandu", "Riset", "Membuat produk", "Laporan", "Pameran"],
  },
  {
    code: "OTHER",
    label: "Proyek lain / tugas panjang",
    badgeLabel: "Proyek",
    hint: "Untuk eksperimen, esai, proyek pribadi, atau tugas jangka panjang apa pun — mapel boleh dikosongkan.",
    subjectLabel: "Mapel (opsional)",
    subjectRequired: false,
    titlePlaceholder: "Judul proyek / tugas",
    badgeClass: "bg-[var(--bg-subtle)] text-[var(--ink-muted)]",
    preset: [],
  },
];

/** Seluruh kode yang dikenal. Dipakai `backupValidation.ts` sebagai satu sumber daftar. */
export const PROJECT_TYPE_CODES: readonly IaEeType[] = PROJECT_TYPES.map((t) => t.code);

/**
 * Metadata satu jenis. Jenis yang tidak dikenal di data (mis. dari backup lama
 * atau entri baru di masa depan) TIDAK dilempar sebagai galat: ia ditampilkan
 * apa adanya dengan label kodenya sendiri. Ini melanjutkan perilaku
 * `backupValidation.ts` yang memperlakukan jenis tak dikenal sebagai peringatan.
 */
export function projectTypeMeta(code: string): ProjectTypeMeta {
  const found = PROJECT_TYPES.find((t) => t.code === code);
  if (found) return found;
  return {
    code: code as IaEeType,
    label: code || "Jenis tidak dikenal",
    badgeLabel: code || "?",
    hint: "Jenis ini tidak ada di daftar bawaan — datanya dipertahankan apa adanya.",
    subjectLabel: "Mapel (opsional)",
    subjectRequired: false,
    titlePlaceholder: "Judul / topik",
    badgeClass: "bg-[var(--bg-subtle)] text-[var(--ink-muted)]",
    preset: [],
  };
}

/** Preset milestone sebuah jenis, sudah berstatus `pending` dan ber-ID unik. */
export function presetMilestones(code: string): IaEeMilestone[] {
  return projectTypeMeta(code).preset.map((title) => ({
    id: crypto.randomUUID(),
    title,
    status: "pending" as MilestoneStatus,
  }));
}

// ── Keadaan proyek: DITURUNKAN dari milestone, bukan disimpan ────────────────
//
// Keputusan pemilik 2026-10-09 (K2): "cukup hitungan milestone". Jadi TIDAK ada
// kolom status baru di data. Konsekuensi yang harus jujur disebut di antarmuka:
// proyek tanpa milestone tidak punya keadaan apa pun — ia disebut "Belum ada
// milestone", bukan "Rencana", karena tidak ada yang bisa disimpulkan darinya.

export type ProjectState = "kosong" | "jalan" | "selesai";

/** Bentuk minimal yang dibutuhkan `projectProgress` — supaya bisa diuji tanpa data penuh. */
export interface ProjectProgressInput {
  milestones: IaEeMilestone[];
}

export interface ProjectProgress {
  state: ProjectState;
  done: number;
  total: number;
  /** Persen selesai, 0 bila belum ada milestone. */
  percent: number;
  label: string;
}

export function projectProgress(project: ProjectProgressInput): ProjectProgress {
  const total = project.milestones.length;
  const done = project.milestones.filter((m) => m.status === "done").length;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  if (total === 0) {
    return { state: "kosong", done: 0, total: 0, percent: 0, label: "Belum ada milestone" };
  }
  if (done === total) {
    return { state: "selesai", done, total, percent: 100, label: `${done}/${total} milestone · selesai` };
  }
  return { state: "jalan", done, total, percent, label: `${done}/${total} milestone` };
}

// ── Tenggat ─────────────────────────────────────────────────────────────────

export type DeadlineState = "aman" | "dekat" | "terlambat";

export interface DeadlineInfo {
  state: DeadlineState;
  days: number;
  label: string;
}

/**
 * Sisa hari menuju tenggat. `hariIni` bisa ditimpa supaya hasilnya tidak
 * bergantung jam mesin saat diuji (pola yang sama dipakai `financeOverview`).
 */
export function deadlineInfo(deadline: string | undefined, hariIni?: string): DeadlineInfo | null {
  if (!deadline) return null;
  const today = hariIni ?? new Date().toISOString().slice(0, 10);
  const ms = new Date(`${deadline}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime();
  if (!Number.isFinite(ms)) return null;
  const days = Math.round(ms / 86_400_000);
  if (days < 0) return { state: "terlambat", days, label: `${Math.abs(days)}h terlambat` };
  if (days === 0) return { state: "dekat", days, label: "Tenggat hari ini" };
  if (days < 14) return { state: "dekat", days, label: `${days}h lagi` };
  return { state: "aman", days, label: `${days}h lagi` };
}

/** Kelas token untuk lencana tenggat. */
export function deadlineClass(state: DeadlineState): string {
  if (state === "terlambat") return "text-[var(--ink-danger)]";
  if (state === "dekat") return "text-[var(--ink-attention)]";
  return "text-[var(--ink-muted)]";
}
