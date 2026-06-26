import React from "react";

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
  avgEngagement?: number;
  photoUrls?: string[];
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
}
