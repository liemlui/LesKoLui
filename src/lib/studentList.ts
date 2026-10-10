// ── Daftar Murid: urutan, penyaringan, dan teks kartu ───────────────────────
//
// Butir 12 dan 13 G3-06. Modul ini **murni**: tanpa impor Dexie, tanpa DOM, tanpa
// efek samping, supaya aturan urutan dan penyaringan bisa diuji tanpa merender
// layar — pola yang sama dipakai `studentActions`, `financeRows`, dan
// `reportAvailability`.
//
// Dua definisi yang sengaja dibedakan, dan perbedaannya harus disebut apa adanya:
//
// 1. **Sinyal perhatian tingkat DAFTAR** (`listAttentionCount` di sini) — murah,
//    hanya menghitung tindak lanjut + tagihan belum lunas per murid, karena layar
//    daftar memuat puluhan murid sekaligus dan tidak boleh membaca jadwal, sesi,
//    dan PR tiap murid satu per satu.
// 2. **Aturan perhatian tingkat DETAIL** (`studentActions` + `attentionCount` di
//    `studentActions.ts`) — kaya, membaca jadwal terlewat, PR, tagihan, dan
//    tindak lanjut. Itu yang dipakai kartu Perlu Tindakan di tab Ringkas.
//
// Keduanya memakai ambang yang sama: yang dihitung hanya hal yang **menunggu
// tindakan tutor** (setara tone `danger`/`warn` di `studentActions`). Yang di sini
// tidak boleh dipakai untuk mengklaim "murid ini tidak butuh apa-apa" — untuk itu
// pakai aturan detailnya.
//
// ATURAN YANG MENGIKAT: modul ini **tidak pernah memuat nominal uang**, sama
// seperti `studentActions`. Tagihan dilaporkan sebagai jumlah, bukan besaran.

import type { Student } from "../db/types";
import { CURRICULUM_META } from "./ibSubjects";
import { monthLabel } from "./format";

/** Cara mengurutkan daftar murid. Tersimpan di layar, bukan di basis data. */
export type StudentSortKey = "jadwal" | "perhatian" | "nama" | "terbaru";

export interface StudentSortOption {
  key: StudentSortKey;
  /** Tulisan yang dibaca tutor di kontrol urutan. */
  label: string;
}

/** Urutan yang ditawarkan. Entri pertama adalah bawaan layar. */
export const STUDENT_SORT_OPTIONS: readonly StudentSortOption[] = [
  { key: "jadwal", label: "Jadwal terdekat" },
  { key: "perhatian", label: "Paling butuh perhatian" },
  { key: "nama", label: "Nama (A–Z)" },
  { key: "terbaru", label: "Terbaru bergabung" },
];

export const STUDENT_SORT_DEFAULT: StudentSortKey = "jadwal";

/** Nama urutan yang sedang dipakai. Kunci tak dikenal jatuh ke bawaan, bukan kosong. */
export function studentSortLabel(key: StudentSortKey): string {
  const found = STUDENT_SORT_OPTIONS.find((o) => o.key === key);
  return found ? found.label : STUDENT_SORT_OPTIONS[0].label;
}

/**
 * Sinyal yang menentukan urutan dan penyaringan. Disuntikkan sebagai fungsi supaya
 * modul ini tetap murni: pemanggil yang membaca peta jadwal dan peta tagihan.
 */
export interface StudentListSignals {
  /** Tanggal `YYYY-MM-DD` jadwal terjadwal terdekat, atau `undefined` bila tidak ada. */
  nextSessionDate(studentId: string): string | undefined;
  /** Jumlah hal yang menunggu tindakan (tindak lanjut + tagihan belum lunas). */
  attentionCount(studentId: string): number;
}

/** Sinyal perhatian tingkat daftar: tindak lanjut + tagihan belum lunas. */
export function listAttentionCount(pendingFollowUps: number, unpaidInvoices: number): number {
  return Math.max(0, pendingFollowUps) + Math.max(0, unpaidInvoices);
}

/** Urutan cadangan supaya hasilnya tidak bergantung urutan masukan. */
function byName(a: Student, b: Student): number {
  return a.name.localeCompare(b.name, "id");
}

/** Yang punya jadwal terdekat lebih dulu; yang tidak punya turun ke bawah. */
function byNearestSchedule(a: Student, b: Student, signals: StudentListSignals): number {
  const an = signals.nextSessionDate(a.id);
  const bn = signals.nextSessionDate(b.id);
  if (an && bn && an !== bn) return an.localeCompare(bn);
  if (an && !bn) return -1;
  if (!an && bn) return 1;
  return 0;
}

/**
 * Mengurutkan daftar murid. Selalu mengembalikan larik baru dan selalu
 * deterministik: setiap urutan berakhir dengan nama sebagai pemutus seri, jadi dua
 * murid yang sederajat tidak bertukar posisi tanpa alasan.
 */
export function sortStudents(
  students: readonly Student[],
  key: StudentSortKey,
  signals: StudentListSignals,
): Student[] {
  const out = [...students];
  switch (key) {
    case "nama":
      out.sort(byName);
      break;
    case "terbaru":
      out.sort((a, b) => b.enrolledAt.localeCompare(a.enrolledAt) || byName(a, b));
      break;
    case "perhatian":
      out.sort(
        (a, b) =>
          signals.attentionCount(b.id) - signals.attentionCount(a.id)
          || byNearestSchedule(a, b, signals)
          || byName(a, b),
      );
      break;
    case "jadwal":
    default:
      out.sort((a, b) => byNearestSchedule(a, b, signals) || byName(a, b));
      break;
  }
  return out;
}

export interface StudentFilter {
  /** Teks pencarian nama. Kosong berarti tidak menyaring. */
  query?: string;
  /** `true` = hanya tampilkan murid yang punya hal menunggu tindakan. */
  onlyAttention?: boolean;
}

/** Pencocokan nama: tidak peka huruf besar-kecil dan tidak peka spasi tepi. */
export function matchesQuery(student: Student, query: string): boolean {
  const q = query.trim().toLowerCase();
  return !q || student.name.toLowerCase().includes(q);
}

export function filterStudents(
  students: readonly Student[],
  filter: StudentFilter,
  signals: StudentListSignals,
): Student[] {
  const query = filter.query ?? "";
  return students.filter(
    (s) => matchesQuery(s, query) && (!filter.onlyAttention || signals.attentionCount(s.id) > 0),
  );
}

/** Berapa murid di dalam daftar ini yang punya hal menunggu tindakan. */
export function countAttention(
  students: readonly Student[],
  signals: StudentListSignals,
): number {
  return students.filter((s) => signals.attentionCount(s.id) > 0).length;
}

/**
 * Baris identitas kartu: **label pendek kurikulum** + kelas + sekolah (butir 13).
 * Kurikulum kosong (murid lama yang belum diisi) tidak mencetak label apa pun,
 * bukan label "undefined".
 */
export function kartuIdentitasBaris(student: Student): string {
  const parts: string[] = [];
  const short = student.curriculum ? CURRICULUM_META[student.curriculum]?.shortLabel : undefined;
  if (short) parts.push(short);
  const grade = student.grade?.trim();
  if (grade) parts.push(grade);
  const school = student.school?.trim();
  if (school) parts.push(school);
  return parts.join(" · ");
}

/**
 * "aktif sejak Agustus 2026" — bulan dan tahun, bukan jumlah bulan (butir 13).
 * Jumlah bulan membulat ke bawah dan pernah membuat murid yang bergabung empat
 * puluh hari lalu terbaca "1 bulan bersama" padahal sudah lewat sebulan.
 */
export function aktifSejakLabel(enrolledAt: string): string | undefined {
  const bulan = (enrolledAt ?? "").slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(bulan)) return undefined;
  return `aktif sejak ${monthLabel(bulan)}`;
}

/** Ringkasan sesi bulan berjalan untuk baris ketiga kartu. Tanpa nominal uang. */
export function ringkasSesiBulanIni(stats?: { count: number; hours: number }): string {
  if (!stats || stats.count === 0) return "Belum ada sesi bulan ini";
  return `Bulan ini ${stats.count} sesi · ${stats.hours}j`;
}
