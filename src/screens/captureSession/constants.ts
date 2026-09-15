/**
 * Konstanta wizard "Catat Sesi".
 *
 * Dipisah dari `screens/CaptureSession.tsx` (audit: layar itu sudah 2.677 baris)
 * supaya daftar langkah, pilihan durasi, dan label indikator bisa dibaca — dan
 * diuji — tanpa harus membuka seluruh layar.
 *
 * Catatan penting: daftar `STEPS` di sini **tidak memuat ikon**. Ikon (komponen
 * React) ditempelkan di layar lewat `iconForStep()` agar berkas ini bebas
 * dependensi UI dan bisa diimpor unit test tanpa merender apa pun.
 */
import type { EngagementState } from "./useEngagement";

/** Durasi sesi yang bisa dipilih (jam). */
export const DURATIONS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6] as const;

/** Tinggi bar aksi tetap (kelas `h-[4.25rem]`) — dipublikasikan ke CSS var agar
 *  banner/toast global mengambang di atasnya (audit C-01). Konstanta, bukan hasil
 *  pengukuran: mengukur lewat ref di dalam efek ternyata tidak andal karena efek
 *  bisa berjalan saat ref belum terpasang (render offscreen/transition). */
export const TASK_BAR_H = "4.25rem";

/** Chips cepat "Situasi hari ini" — tap menambah frasa ke kolom bebas situasi.
 *  Murni konteks manusiawi, tidak memengaruhi skor engagement. */
export const SITUASI_CHIPS: ReadonlyArray<{ icon: string; label: string }> = [
  { icon: "😷", label: "Habis sakit" },
  { icon: "😴", label: "Kurang tidur" },
  { icon: "🏃", label: "Habis ekskul" },
  { icon: "🍚", label: "Belum makan" },
  { icon: "📝", label: "Besok ulangan" },
  { icon: "🎉", label: "Ada acara keluarga" },
  { icon: "💭", label: "Ada masalah pribadi" },
];

/** Definisi tampilan tiap indikator kondisi (audit P2 #13): ikon, label, dan
 *  bobotnya ditulis apa adanya supaya aritmetika skor bisa diprediksi pengguna. */
export const ENGAGEMENT_FLAG_META: Record<
  keyof EngagementState,
  { icon: string; label: string; delta: string; tone: "positive" | "attention" }
> = {
  prepared:        { icon: "📚", label: "Sudah siap",      delta: "+2", tone: "positive" },
  focused:         { icon: "🎯", label: "Sangat fokus",    delta: "+1", tone: "positive" },
  activeAsking:    { icon: "🙋", label: "Aktif bertanya",  delta: "+1", tone: "positive" },
  quickLearner:    { icon: "⚡", label: "Cepat paham",     delta: "+1", tone: "positive" },
  playingPhone:    { icon: "📱", label: "Main HP",          delta: "−1", tone: "attention" },
  drowsy:          { icon: "🥱", label: "Mengantuk",        delta: "−1", tone: "attention" },
  needsRepetition: { icon: "🔄", label: "Perlu diulang",   delta: "−1", tone: "attention" },
  hwMissed:        { icon: "❌", label: "PR tidak dibuat",  delta: "−1", tone: "attention" },
  late:            { icon: "⏰", label: "Telat",            delta: "−1", tone: "attention" },
  bathroomBreaks:  { icon: "🚻", label: "Sering ke toilet", delta: "−1", tone: "attention" },
  restless:        { icon: "🦘", label: "Gelisah",          delta: "−1", tone: "attention" },
  offTask:         { icon: "🙈", label: "Sibuk sendiri",    delta: "−1", tone: "attention" },
};

/** Nama ikon langkah — dipetakan ke komponen di layar (`iconForStep`). */
export type StepIconName = "target" | "book" | "smile" | "clipboard" | "pencil" | "camera";

export interface StepMeta {
  id: number;
  label: string;
  desc: string;
  optional: boolean;
  icon: StepIconName;
}

/** Enam langkah wizard, berurutan. */
export const STEP_META: readonly StepMeta[] = [
  { id: 1, label: "Jadwal",  desc: "Murid & waktu",       optional: false, icon: "target" },
  { id: 2, label: "Materi",  desc: "Mapel & topik",       optional: false, icon: "book" },
  { id: 3, label: "Kondisi", desc: "Kondisi & perilaku",  optional: true,  icon: "smile" },
  { id: 4, label: "Detail",  desc: "Respons & nilai",     optional: true,  icon: "clipboard" },
  { id: 5, label: "Catatan", desc: "Ringkasan sesi",      optional: false, icon: "pencil" },
  { id: 6, label: "Bukti",   desc: "Foto & tanda tangan", optional: true,  icon: "camera" },
] as const;

export type StepNum = 1 | 2 | 3 | 4 | 5 | 6;

/** Rentang langkah yang valid — dipakai saat memulihkan draf. */
export const STEP_MIN: StepNum = 1;
export const STEP_MAX: StepNum = 6;

/** Apakah `n` langkah yang sah? Draf lama bisa memuat angka di luar rentang
 *  (mis. skema berubah), dan memulihkannya tanpa cek membuat wizard kosong. */
export function isValidStep(n: unknown): n is StepNum {
  return typeof n === "number" && Number.isInteger(n) && n >= STEP_MIN && n <= STEP_MAX;
}
