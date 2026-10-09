// ── Aturan isian nilai rapor (butir 5 G3-06) ────────────────────────────────
//
// Modul murni tanpa impor Dexie dan tanpa React, supaya aturannya bisa diuji di
// lingkungan yang memang tidak punya DOM (repo ini tidak memasang `jsdom` maupun
// `@testing-library/*`, dan menambah dependensi dilarang tanpa keputusan pemilik).
//
// Yang tinggal di sini hanya keputusan "mapel apa yang diisikan" dan "nilai apa
// yang disimpan" — dua hal yang paling mudah salah dan paling tidak enak diuji
// kalau tersembunyi di dalam komponen.

import type { RaporGrade } from "../../db/types";

export interface RaporGradeEntry {
  subject: string;
  grade: string;
}

/**
 * Mata pelajaran yang diisikan pada formulir nilai rapor.
 *
 * Gabungan **profil murid** dan **nilai yang sudah tersimpan**. Profil lebih dulu
 * supaya urutan isian tidak berpindah saat disimpan, dan supaya mapel yang sudah
 * dihapus dari profil tetap muncul — nilai lama tidak boleh menghilang tanpa jejak
 * hanya karena profilnya berubah.
 *
 * Nama mapel di-trim dan dideduplikasi; nilai kosong dibuang.
 */
export function subjectsFor(
  profileSubjects: readonly string[],
  existing: Pick<RaporGrade, "grades"> | undefined,
): string[] {
  const fromProfile = profileSubjects.map((s) => s.trim()).filter(Boolean);
  const fromSaved = (existing?.grades ?? []).map((g) => g.subject.trim()).filter(Boolean);
  return [...new Set([...fromProfile, ...fromSaved])];
}

/**
 * Menyusun daftar nilai yang akan disimpan dari draf isian.
 *
 * Aturan yang mengikat: **baris tanpa nilai dibuang, bukan disimpan kosong.**
 * Menyimpan `{ subject: "Mathematics", grade: "" }` akan membuat jumlah "nilai
 * tercatat" di layar menghitung mapel yang sebenarnya belum dinilai.
 */
export function gradesFromDraft(
  subjects: readonly string[],
  draft: Readonly<Record<string, string>>,
): RaporGradeEntry[] {
  return subjects
    .map((subject) => ({ subject, grade: (draft[subject] ?? "").trim() }))
    .filter((entry) => entry.grade.length > 0);
}

/** Draf awal dari nilai yang sudah tersimpan, supaya isian menyunting dan bukan mengosongkan. */
export function draftFromSaved(
  existing: Pick<RaporGrade, "grades"> | undefined,
): Record<string, string> {
  return Object.fromEntries((existing?.grades ?? []).map((g) => [g.subject, g.grade]));
}

/** Berapa nilai yang benar-benar terisi pada satu baris nilai rapor. */
export function filledGradeCount(existing: Pick<RaporGrade, "grades"> | undefined): number {
  return (existing?.grades ?? []).filter((g) => g.grade.trim().length > 0).length;
}
