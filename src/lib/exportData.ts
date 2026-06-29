// Export "manusiawi": seluruh data ke satu CSV bertanda seksi, sebagai cadangan
// yang bisa dibaca tanpa app (pelengkap file .jles terenkripsi). Aman dari
// CSV-formula-injection lewat escapeCsvCell.
import { db } from "../db/db";
import { escapeCsvCell as esc } from "./csv";

type Cell = string | number | undefined | null;

function rowsToCsv(headers: string[], rows: Cell[][]): string {
  const head = headers.map(esc).join(",");
  if (rows.length === 0) return head;
  const body = rows.map((r) => r.map(esc).join(",")).join("\n");
  return `${head}\n${body}`;
}

/** Bangun CSV gabungan semua data utama. BOM ditambahkan agar Excel membaca UTF-8. */
export async function buildDataCsv(): Promise<string> {
  const [students, sessions, payments, expenses] = await Promise.all([
    db.students.toArray(),
    db.sessions.toArray(),
    db.payments.toArray(),
    db.expenses.toArray(),
  ]);
  const nameOf = new Map(students.map((s) => [s.id, s.name]));

  const parts: string[] = [];
  parts.push(`# Les Ko Lui — Ekspor Data`);
  parts.push(`# ${new Date().toLocaleString("id-ID")}`);
  parts.push("");

  parts.push("### MURID");
  parts.push(rowsToCsv(
    ["Nama", "Level", "Sekolah", "Tarif/jam", "Aktif", "No HP Ortu", "Terdaftar"],
    students.map((s) => [s.name, s.level, s.school, s.hourlyRate, s.active ? "ya" : "tidak", s.parentContact?.phone, s.enrolledAt]),
  ));
  parts.push("");

  parts.push("### SESI");
  parts.push(rowsToCsv(
    ["Tanggal", "Murid", "Mapel", "Durasi (jam)", "Status", "Biaya", "Skor", "Catatan"],
    [...sessions].sort((a, b) => a.date.localeCompare(b.date)).map((s) => [
      s.date, nameOf.get(s.studentId) ?? "(dihapus)", s.subjects.join("; "),
      s.durationHours, s.status, s.cost, s.engagement?.score, s.shortNote,
    ]),
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
