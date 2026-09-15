// Export "manusiawi": seluruh data ke satu CSV bertanda seksi, sebagai cadangan
// yang bisa dibaca tanpa app (pelengkap file .jles terenkripsi). Aman dari
// CSV-formula-injection lewat escapeCsvCell.
import { db } from "../db/db";
import { escapeCsvCell as esc } from "./csv";
import { levelLabel } from "../db/types";

type Cell = string | number | undefined | null;

function rowsToCsv(headers: string[], rows: Cell[][]): string {
  const head = headers.map(esc).join(",");
  if (rows.length === 0) return head;
  const body = rows.map((r) => r.map(esc).join(",")).join("\n");
  return `${head}\n${body}`;
}

/** Label sumber skor untuk ekspor — supaya angka skor tidak dibaca sebagai
 *  "kondisi murid" ketika sesi itu sebenarnya tidak mencatat kondisi apa pun
 *  (audit P3 #18: basis skor ikut diekspor). */
function scoreBasisLabel(row: { engagement?: { score?: number; scoreBasis?: string } }): string {
  const eng = row.engagement;
  if (!eng) return "tanpa catatan kondisi";
  switch (eng.scoreBasis) {
    case "full":    return "lengkap";
    case "partial": return "sebagian";
    case "none":    return "tidak ada pengamatan";
    default:        return eng.score != null ? "tidak diketahui (data lama)" : "tanpa catatan kondisi";
  }
}

/** Bangun CSV gabungan semua data utama. BOM ditambahkan agar Excel membaca UTF-8. */
export async function buildDataCsv(): Promise<string> {
  const [students, payments, expenses] = await Promise.all([
    db.students.toArray(),
    db.payments.toArray(),
    db.expenses.toArray(),
  ]);
  const nameOf = new Map(students.map((s) => [s.id, s.name]));

  // Sesi di-stream satu per satu (bukan toArray) agar referensi Blob foto/tanda
  // tangan tidak semuanya ditahan di memori sekaligus saat ekspor.
  const sessionRows: Cell[][] = [];
  await db.sessions.orderBy("date").each((s) => {
    sessionRows.push([
      s.date, nameOf.get(s.studentId) ?? "(dihapus)", s.subjects.join("; "),
      s.durationHours, s.status, s.cost, s.engagement?.score, s.shortNote,
      s.situasiNote ?? "",
      // Audit P1 #9 + P3 #18: bab katalog & kelengkapan dasar skor ikut diekspor
      // supaya topik bisa direkap per bab dan angka skor tidak dibaca sebagai
      // "kondisi murid" padahal sesinya tidak mencatat kondisi apa pun.
      s.topicUnit ?? "",
      scoreBasisLabel(s),
    ]);
  });

  const parts: string[] = [];
  parts.push(`# Les Ko Lui — Ekspor Data`);
  parts.push(`# ${new Date().toLocaleString("id-ID")}`);
  parts.push("");

  parts.push("### MURID");
  parts.push(rowsToCsv(
    ["Nama", "Level", "Sekolah", "Tarif/jam", "Aktif", "No HP Ortu", "Terdaftar"],
    // `levelLabel` dipakai (bukan `s.level` mentah) supaya jenjang terbaca
    // manusia — audit P0 T-07: dulu semua kurikulum non-IB tertulis "UNIV".
    students.map((s) => [s.name, levelLabel(s), s.school, s.hourlyRate, s.active ? "ya" : "tidak", s.parentContact?.phone, s.enrolledAt]),
  ));
  parts.push("");

  parts.push("### SESI");
  parts.push(rowsToCsv(
    ["Tanggal", "Murid", "Mapel", "Durasi (jam)", "Status", "Biaya", "Skor", "Catatan", "Situasi", "Bab Topik", "Sumber Skor"],
    sessionRows,
  ));
  parts.push("");

  parts.push("### TAGIHAN");
  parts.push(rowsToCsv(
    ["Bulan", "Murid", "Jumlah", "Status", "Dibayar"],
    [...payments].sort((a, b) => a.month.localeCompare(b.month)).map((p) => [
      p.month, nameOf.get(p.studentId) ?? "(dihapus)", p.totalCost, p.status, p.paidAt,
    ]),
  ));
  parts.push("");

  parts.push("### PENGELUARAN");
  parts.push(rowsToCsv(
    ["Tanggal", "Kategori", "Deskripsi", "Jumlah"],
    [...expenses].sort((a, b) => a.date.localeCompare(b.date)).map((e) => [e.date, e.category, e.description, e.amount]),
  ));

  return "﻿" + parts.join("\n");
}

export async function exportDataCsvBlob(): Promise<Blob> {
  const csv = await buildDataCsv();
  return new Blob([csv], { type: "text/csv;charset=utf-8" });
}
