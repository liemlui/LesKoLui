export interface SubjectGroup {
  group: string;
  subjects: string[];
}

// ── IB MYP ────────────────────────────────────────────────────────────────────
export const IB_MYP_SUBJECTS: string[] = [
  "Language & Literature",
  "Language Acquisition",
  "Individuals & Societies",
  "Sciences",
  "Mathematics",
  "Arts",
  "PHE",
  "Design",
];

// ── IB DP ─────────────────────────────────────────────────────────────────────
export interface IBGroup { group: string; subjects: string[]; }

export const IB_DP_GROUPS: IBGroup[] = [
  {
    group: "Group 1 – Language A",
    subjects: ["Bahasa Indonesia A", "English A (Literature)", "English A (Lang & Lit)"],
  },
  {
    group: "Group 2 – Language B",
    subjects: ["English B", "Bahasa Indonesia B", "Mandarin B", "French B", "Spanish B"],
  },
  {
    group: "Group 3 – Individuals & Societies",
    subjects: [
      "History", "Geography", "Economics", "Business Management",
      "Psychology", "Philosophy", "Global Politics", "ESS", "Digital Society",
    ],
  },
  {
    group: "Group 4 – Sciences",
    subjects: [
      "Biology", "Chemistry", "Physics", "Computer Science",
      "Design Technology", "SEHS", "ESS",
    ],
  },
  {
    group: "Group 5 – Mathematics",
    subjects: ["Math AA HL", "Math AA SL", "Math AI HL", "Math AI SL"],
  },
  {
    group: "Group 6 – Arts",
    subjects: ["Visual Arts", "Music", "Theatre", "Film", "Dance"],
  },
  {
    group: "Core",
    subjects: ["Theory of Knowledge (TOK)", "Extended Essay (EE)", "CAS"],
  },
];

// ── Cambridge IGCSE ───────────────────────────────────────────────────────────
export const CAMBRIDGE_IGCSE_GROUPS: SubjectGroup[] = [
  {
    group: "Mathematics",
    subjects: ["Mathematics (0580)", "Additional Mathematics (0606)", "International Mathematics (0607)"],
  },
  {
    group: "Sciences",
    subjects: [
      "Biology (0610)", "Chemistry (0620)", "Physics (0625)",
      "Combined Science (0653)", "Co-ordinated Sciences (0654)",
      "Environmental Management (0680)", "Marine Science (0697)",
    ],
  },
  {
    group: "Humanities & Social Sciences",
    subjects: [
      "Economics (0455)", "Business Studies (0450)", "Commerce (0452)", "Accounting (0452)",
      "History (0470)", "Geography (0460)",
      "Global Perspectives (0457)", "Sociology (0495)", "Psychology (0478)",
    ],
  },
  {
    group: "Languages",
    subjects: [
      "English Language (0500)", "English Literature (0486)",
      "Bahasa Indonesia (0538)", "French (0520)", "Spanish (0530)", "German (0525)",
    ],
  },
  {
    group: "Computing & Technology",
    subjects: ["Computer Science (0478)", "ICT (0417)"],
  },
  {
    group: "Arts & Other",
    subjects: ["Art & Design (0400)", "Music (0410)", "Physical Education (0413)"],
  },
];

// ── Cambridge O Level ─────────────────────────────────────────────────────────
export const CAMBRIDGE_OLEVEL_GROUPS: SubjectGroup[] = [
  {
    group: "Mathematics",
    subjects: ["Mathematics (4024)", "Additional Mathematics (4037)"],
  },
  {
    group: "Sciences",
    subjects: [
      "Biology (5090)", "Chemistry (5070)", "Physics (5054)",
      "Combined Science (5129)", "Physical Science (5150)",
    ],
  },
  {
    group: "Humanities",
    subjects: [
      "Economics (2281)", "Commerce (7100)", "Accounting (7707)",
      "History (2059)", "Geography (2217)",
    ],
  },
  {
    group: "Languages",
    subjects: [
      "English Language (1123)", "Bahasa Indonesia (3026)",
      "French (3015)", "Spanish (3080)",
    ],
  },
  {
    group: "Computing",
    subjects: ["Computer Science (2210)", "Information & Communication Technology (2210)"],
  },
];

// ── Cambridge AS Level ────────────────────────────────────────────────────────
// (AS only — typically year 1 of A Level)
export const CAMBRIDGE_ASLEVEL_GROUPS: SubjectGroup[] = [
  {
    group: "Mathematics",
    subjects: ["Mathematics (9709)", "Further Mathematics (9231)"],
  },
  {
    group: "Sciences",
    subjects: ["Biology (9700)", "Chemistry (9701)", "Physics (9702)"],
  },
  {
    group: "Humanities & Social Sciences",
    subjects: [
      "Economics (9708)", "Business (9609)",
      "History (9489)", "Geography (9696)",
      "Psychology (9990)", "Sociology (9699)", "Law (9084)",
    ],
  },
  {
    group: "Computing",
    subjects: ["Computer Science (9618)", "Information Technology (9626)"],
  },
  {
    group: "Languages & Arts",
    subjects: [
      "English Language (9093)", "English Literature (9695)",
      "Art & Design (9479)", "Music (9483)", "Drama (9482)",
      "Media Studies (9607)", "Global Perspectives & Research (9239)", "Thinking Skills (9694)",
    ],
  },
];

// Cambridge A Level — same subjects as AS Level (full 2-year course)
export const CAMBRIDGE_ALEVEL_GROUPS: SubjectGroup[] = CAMBRIDGE_ASLEVEL_GROUPS;

// ── AP (College Board) ────────────────────────────────────────────────────────
export const AP_GROUPS: SubjectGroup[] = [
  {
    group: "Mathematics",
    subjects: [
      "AP Calculus AB", "AP Calculus BC",
      "AP Statistics", "AP Precalculus",
      "AP Computer Science A", "AP Computer Science Principles",
    ],
  },
  {
    group: "Sciences",
    subjects: [
      "AP Biology", "AP Chemistry", "AP Environmental Science",
      "AP Physics 1", "AP Physics 2",
      "AP Physics C: Mechanics", "AP Physics C: Electricity & Magnetism",
    ],
  },
  {
    group: "Humanities & Social Sciences",
    subjects: [
      "AP Microeconomics", "AP Macroeconomics",
      "AP World History: Modern", "AP European History",
      "AP US History", "AP US Government & Politics",
      "AP Comparative Government & Politics",
      "AP Human Geography", "AP Psychology",
    ],
  },
  {
    group: "English & Languages",
    subjects: [
      "AP English Language & Composition", "AP English Literature & Composition",
      "AP Spanish Language", "AP French Language",
      "AP Japanese Language", "AP Latin",
    ],
  },
  {
    group: "Arts & Capstone",
    subjects: [
      "AP Art History", "AP Music Theory",
      "AP 2-D Art & Design", "AP 3-D Art & Design",
      "AP Seminar", "AP Research",
    ],
  },
];

// ── Kurikulum Nasional Indonesia ──────────────────────────────────────────────
export const NATIONAL_GROUPS: SubjectGroup[] = [
  {
    group: "MIPA",
    subjects: ["Matematika", "Fisika", "Kimia", "Biologi"],
  },
  {
    group: "IPS",
    subjects: ["Ekonomi", "Akuntansi", "Geografi", "Sejarah", "Sosiologi"],
  },
  {
    group: "Bahasa",
    subjects: ["Bahasa Indonesia", "Bahasa Inggris", "Sastra Indonesia", "Sastra Inggris"],
  },
  {
    group: "Lainnya",
    subjects: ["Informatika", "Pendidikan Agama", "PKn / PPKN", "Seni Budaya", "Penjaskes", "BK"],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
import type { CurriculumType } from "../db/types";

export interface CurriculumMeta {
  label: string;
  color: string;   // tailwind bg color class
  text: string;    // tailwind text color class
  shortLabel: string;
}

export const CURRICULUM_META: Record<CurriculumType, CurriculumMeta> = {
  "IB MYP":           { label: "IB MYP",            shortLabel: "MYP",    color: "bg-blue-100",   text: "text-blue-700"   },
  "IB DP":            { label: "IB DP",              shortLabel: "DP",     color: "bg-blue-600",   text: "text-white"      },
  "Cambridge IGCSE":  { label: "Cambridge IGCSE",    shortLabel: "IGCSE",  color: "bg-purple-100", text: "text-purple-700" },
  "Cambridge O Level":{ label: "Cambridge O Level",  shortLabel: "O Lvl",  color: "bg-purple-100", text: "text-purple-700" },
  "Cambridge AS Level":{ label: "Cambridge AS Level",shortLabel: "AS Lvl", color: "bg-violet-100", text: "text-violet-700" },
  "Cambridge A Level":{ label: "Cambridge A Level",  shortLabel: "A Lvl",  color: "bg-violet-600", text: "text-white"      },
  "AP":               { label: "AP (College Board)", shortLabel: "AP",     color: "bg-red-100",    text: "text-red-700"    },
  "National":         { label: "Kurikulum Nasional", shortLabel: "Nasional",color: "bg-green-100", text: "text-green-700"  },
  "Custom":           { label: "Lainnya / Custom",   shortLabel: "Custom", color: "bg-gray-100",   text: "text-gray-600"   },
};

export const ALL_CURRICULA: CurriculumType[] = [
  "IB MYP", "IB DP",
  "Cambridge IGCSE", "Cambridge O Level",
  "Cambridge AS Level", "Cambridge A Level",
  "AP", "National", "Custom",
];

/** Get flat list of subject groups for a given curriculum. */
export function getSubjectGroups(curriculum: CurriculumType): SubjectGroup[] {
  switch (curriculum) {
    case "IB MYP":            return [{ group: "IB MYP", subjects: IB_MYP_SUBJECTS }];
    case "IB DP":             return IB_DP_GROUPS;
    case "Cambridge IGCSE":   return CAMBRIDGE_IGCSE_GROUPS;
    case "Cambridge O Level": return CAMBRIDGE_OLEVEL_GROUPS;
    case "Cambridge AS Level":return CAMBRIDGE_ASLEVEL_GROUPS;
    case "Cambridge A Level": return CAMBRIDGE_ALEVEL_GROUPS;
    case "AP":                return AP_GROUPS;
    case "National":          return NATIONAL_GROUPS;
    default:                  return [];
  }
}

/** Get all subjects flat for a given curriculum. */
export function getAllSubjectsForCurriculum(curriculum: CurriculumType): string[] {
  return getSubjectGroups(curriculum).flatMap(g => g.subjects);
}
