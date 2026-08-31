import type { ReportData } from "./types";

/**
 * Data contoh untuk thumbnail/preview desain laporan (C-2 dari
 * docs/UI-UX-ANALYSIS.md).
 *
 * Dipakai oleh:
 *  - galeri layout di MonthlyReport (preview on-demand per kombinasi yang
 *    diklik — BUKAN render 540 thumbnail sekaligus)
 *  - unit test render layout (reportLayouts.test.tsx)
 *
 * Aturan penting:
 *  - TANPA foto (Blob/dataURL) agar preview tetap ringan.
 *  - Format tanggal HARUS sama dengan produksi: "12 Juni 2026"
 *    (hasil `dayLabel(...).split(",")[1].trim()`).
 *  - Tidak boleh memicu panggilan AI — ini data statis.
 */
export const SAMPLE_REPORT_DATA: ReportData = {
  studentName: "Alya Rahmania",
  period: "Juni 2026",
  tutorName: "Ko Lui",
  entries: [
    {
      date: "5 Juni 2026",
      subject: "Matematika AA",
      narrative: "Mengerjakan soal fungsi kuadrat; langkah pemfaktoran sudah lebih rapi dari sesi sebelumnya.",
      details: ["10:00-12:00", "2 jam", "Topik: Fungsi Kuadrat"],
      engagementScore: 6,
      engagementLabel: "Cukup fokus",
      topic: "Fungsi Kuadrat",
      mood: "Fokus",
      timeLabel: "10:00-12:00",
      durationLabel: "2 jam",
      needsWork: "Ketelitian tanda saat pemindahan ruas",
      predictedGrade: "6",
    },
    {
      date: "12 Juni 2026",
      subject: "Fisika SL",
      narrative: "Diskusi hukum Newton diteruskan ke soal applied; mulai berani menebak struktur jawaban sendiri.",
      details: ["14:00-16:00", "2 jam", "Topik: Dinamika"],
      engagementScore: 7,
      engagementLabel: "Aktif",
      topic: "Dinamika Partikel",
      mood: "Semangat",
      timeLabel: "14:00-16:00",
      durationLabel: "2 jam",
      needsWork: "Menggambar diagram gaya sebelum berhitung",
      predictedGrade: "7",
    },
    {
      date: "19 Juni 2026",
      subject: "Matematika AA",
      narrative: "Latihan campuran trigonometri; strategi mengidentifikasi identitas sudah mulai otomatis.",
      details: ["10:00-12:00", "2 jam", "Topik: Trigonometri"],
      engagementScore: 8,
      engagementLabel: "Sangat aktif",
      topic: "Trigonometri",
      mood: "Semangat",
      timeLabel: "10:00-12:00",
      durationLabel: "2 jam",
      needsWork: "Manajemen waktu pada soal panjang",
      predictedGrade: "7",
      actualGrade: "8",
    },
    {
      date: "26 Juni 2026",
      subject: "Ekonomi SL",
      narrative: "Menutup bulan dengan review demand-supply; mampu menjelaskan kembali konsep dengan kalimat sendiri.",
      details: ["09:00-11:00", "2 jam", "Topik: Permintaan & Penawaran"],
      engagementScore: 9,
      engagementLabel: "Sangat aktif",
      topic: "Elastisitas",
      mood: "Semangat",
      timeLabel: "09:00-11:00",
      durationLabel: "2 jam",
      needsWork: "Istilah teknis saat menjelaskan grafik",
      predictedGrade: "7",
      actualGrade: "7",
    },
  ],
  summary:
    "Bulan ini Alya menunjukkan tren engagement yang meningkat dan lebih berani mencoba soal tanpa bantuan. Fondasi konsep di tiga mapel mulai konsisten; fokus bulan depan adalah ketelitian langkah dan manajemen waktu ujian.",
  teacherNote:
    "Kolaborasi orang tua membantu: latihan mandiri 10 menit per hari terlihat efeknya pada kecepatan pengerjaan.",
  quote: "Saya sekarang tidak takut soal cerita lagi.",
  avgEngagement: 7.5,
  prevAvgEngagement: 6.4,
  totalHours: 8,
  totalSessions: 4,
  subjectDist: [
    { name: "Matematika AA", count: 2 },
    { name: "Fisika SL", count: 1 },
    { name: "Ekonomi SL", count: 1 },
  ],
  engagementSeries: [6, 7, 8, 9],
  gradeComparison: [
    { date: "5 Juni", exam: "Fungsi Kuadrat", predicted: "6" },
    { date: "12 Juni", exam: "Dinamika Partikel", predicted: "7" },
    { date: "19 Juni", exam: "Trigonometri", predicted: "7", actual: "8", delta: "+1" },
    { date: "26 Juni", exam: "Elastisitas", predicted: "7", actual: "7", delta: "sama" },
  ],
};
