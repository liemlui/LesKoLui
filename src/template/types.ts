import React from "react";

export type HeaderStyle = "bubble" | "script" | "plain";
export type LabelStyle  = "pill" | "rounded" | "flag";
export type PhotoStyle  = "round" | "circle" | "polaroid";
export type DecoKind    = "snow" | "leaf" | "petal" | "sparkle" | "star" | "wave" | "sun" | "none";

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
}

export interface Layout {
  id: string;
  name: string;
  maxEntriesPerPage: number;
  render: (page: ReportData, theme: Theme, opts: { isFirst: boolean; isLast: boolean }) => React.JSX.Element;
}
