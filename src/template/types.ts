import React from "react";
import type { NextMonthPlan } from "../db/types";

export type HeaderStyle = "bubble" | "script" | "plain" | "frame" | "minimal" | "badge" | "watercolor";
export type LabelStyle  = "pill" | "rounded" | "flag" | "tag" | "underline" | "ribbon-label";
export type PhotoStyle  = "round" | "circle" | "polaroid" | "shadow" | "frame" | "vintage" | "duotone";
export type DecoKind    = "snow" | "leaf" | "petal" | "sparkle" | "star" | "wave" | "sun" | "none"
                        | "geometric" | "dots" | "confetti" | "ribbon" | "zigzag";

export interface Theme {
  id: string;
  name: string;
  bg: string;
  ink: string;
  muted: string;
  accent: string;
  palette: string[];
  fontDisplay: string;
  fontBody: string;
  header: HeaderStyle;
  label: LabelStyle;
  photo: PhotoStyle;
  deco: DecoKind;
  headerText: string;
}

export interface ReportEntry {
  date: string;
  subject: string;
  photoUrl?: string;
  narrative: string;
  details?: string[];
  engagementScore?: number;
  engagementLabel?: string;
  /** Topik spesifik yang dibahas sesi ini (selain mapel). */
  topic?: string;
  /** Mood / semangat sesi (Semangat / Fokus / Biasa / Lelah / Kesulitan). */
  mood?: string;
  /** Jam masuk-keluar (mis. "14:00-16:00") atau "Jam 14:00". */
  timeLabel?: string;
  /** Durasi terformat (mis. "2 jam"). */
  durationLabel?: string;
  /** Area yang masih perlu diasah (needsWork). */
  needsWork?: string;
  /** Prediksi nilai sesi ini (opsional). */
  predictedGrade?: string;
  /** Nilai akhir yang benar-benar didapat (follow-up dari prediksi). */
  actualGrade?: string;
  /** Tanda tangan murid (data URL). */
  signatureUrl?: string;
}

export interface ReportData {
  studentName: string;
  period: string;
  tutorName: string;
  logoUrl?: string;
  entries: ReportEntry[];
  summary: string;
  teacherNote?: string;
  quote?: string;
  nextMonthPlan?: NextMonthPlan;
  avgEngagement?: number;
  /** Rata-rata engagement periode sebelumnya — untuk tren bulan-ke-bulan. */
  prevAvgEngagement?: number;
  photoUrls?: string[];
  // Agregat seluruh periode (dipakai layout infografis; aman bila tak diisi).
  totalHours?: number;
  totalSessions?: number;
  subjectDist?: { name: string; count: number }[];
  engagementSeries?: number[];
  /** Agregat prediksi vs nilai aktual (full periode) untuk tabel perbandingan. */
  gradeComparison?: GradeComparisonRow[];
}

export interface GradeComparisonRow {
  /** Tanggal tampilan singkat, mis. "5 Juni". */
  date: string;
  /** Konteks ujian: topik spesifik, fallback ke mapel. */
  exam: string;
  predicted?: string;
  actual?: string;
  /** Selisih terformat, mis. "+1", "−1", atau "sama". */
  delta?: string;
}

export interface Layout {
  id: string;
  name: string;
  maxEntriesPerPage: number;
  render: (page: ReportData, theme: Theme, opts: { isFirst: boolean; isLast: boolean }) => React.JSX.Element;
}

/** Alias for Theme — used in Settings to store user-created themes. */
export type CustomTheme = Theme;

export interface ReportOptions {
  coverPage?: boolean;
  showEngagement?: boolean;
  showGallery?: boolean;
  /** Override jumlah sesi per halaman (default mengikuti layout). */
  entriesPerPage?: number;
  /**
   * Rasio aspek halaman export. "3:4" (default) memberi halaman rasio tetap
   * potret agar gambar tidak terlalu tinggi dan terpotong di WhatsApp.
   * "auto" mempertahankan tinggi alami (dipakai PDF).
   */
  pageRatio?: "3:4" | "auto";
}
