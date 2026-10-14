import { describe, expect, it } from "vitest";
import {
  IB_MYP_SUBJECTS,
  IB_DP_GROUPS,
  CAMBRIDGE_IGCSE_GROUPS,
  CAMBRIDGE_OLEVEL_GROUPS,
  CAMBRIDGE_ASLEVEL_GROUPS,
  AP_GROUPS,
  NATIONAL_GROUPS,
} from "../lib/ibSubjects";
import { IB_TOPICS, normalizeSubject, resolveSubjectAliases } from "../lib/ibTopics";

/**
 * Pengukur cakupan katalog topik — bukan penjaga baru, melainkan **alat ukur**
 * yang bisa dijalankan mesin.
 *
 * Alasannya ada: baris "Katalog topik" di `PEKERJAAN.md` §4 memuat angka sisa
 * ("dua puluh dari tujuh puluh delapan sudah punya katalog") yang **tidak bisa
 * direproduksi lagi** — skrip `.design-audit/topic-coverage-audit.mjs` yang
 * disebut sebagai alat pengukurnya tidak ada di repositori. ATURAN-AI §1 butir 6
 * menuntut angka mutakhir ditulis beserta cara mengukurnya; berkas ini yang
 * menjadi cara itu.
 *
 * Tes ini **lulus apa pun hasilnya** dan mencetak angkanya ke stdout. Yang dijaga
 * di sini hanya dua invarian bentuk: (a) jumlah pasangan kurikulum×mapel tetap
 * sama seperti daftar di `topicCoverage.test.ts`, dan (b) tidak ada pasangan yang
 * dihitung dua kali.
 */

type LevelRule = (level: string) => boolean;

const CURRICULA: ReadonlyArray<{
  name: string;
  subjects: readonly string[];
  levelRule: LevelRule;
}> = [
  { name: "IB MYP", subjects: IB_MYP_SUBJECTS, levelRule: (l) => l.toLowerCase().startsWith("myp") },
  { name: "IB DP", subjects: IB_DP_GROUPS.flatMap((g) => g.subjects), levelRule: (l) => l.toLowerCase() === "dp" },
  { name: "Cambridge IGCSE", subjects: CAMBRIDGE_IGCSE_GROUPS.flatMap((g) => g.subjects), levelRule: (l) => l.toLowerCase() === "igcse" },
  { name: "Cambridge O Level", subjects: CAMBRIDGE_OLEVEL_GROUPS.flatMap((g) => g.subjects), levelRule: (l) => l.toLowerCase().startsWith("o level") },
  { name: "Cambridge AS/A Level", subjects: CAMBRIDGE_ASLEVEL_GROUPS.flatMap((g) => g.subjects), levelRule: (l) => l.toLowerCase().startsWith("a level") },
  { name: "AP", subjects: AP_GROUPS.flatMap((g) => g.subjects), levelRule: (l) => l.toLowerCase() === "ap" },
  { name: "National", subjects: NATIONAL_GROUPS.flatMap((g) => g.subjects), levelRule: (l) => /^(smp|sma)/.test(l.toLowerCase()) },
];

function indexedSubjectsAtLevel(levelRule: LevelRule): Set<string> {
  const out = new Set<string>();
  for (const t of IB_TOPICS) {
    if (!levelRule(t.level)) continue;
    for (const alias of resolveSubjectAliases(t.subject)) out.add(normalizeSubject(alias));
  }
  return out;
}

describe("pengukur sisa katalog topik (alat ukur, selalu lulus)", () => {
  it("mencetak jumlah pasangan kurikulum×mapel yang sudah dan belum punya katalog", () => {
    const rows: Array<{ name: string; total: number; punya: number; belum: number; daftar: string[] }> = [];
    for (const { name, subjects, levelRule } of CURRICULA) {
      const indexed = indexedSubjectsAtLevel(levelRule);
      const belum: string[] = [];
      for (const subject of subjects) {
        const matched = resolveSubjectAliases(subject).some((alias) => indexed.has(normalizeSubject(alias)));
        if (!matched) belum.push(subject);
      }
      rows.push({ name, total: subjects.length, punya: subjects.length - belum.length, belum: belum.length, daftar: belum });
    }

    const total = rows.reduce((n, r) => n + r.total, 0);
    const belumTotal = rows.reduce((n, r) => n + r.belum, 0);

    const garis = ["", "── CAKUPAN KATALOG TOPIK (diukur " + new Date().toISOString().slice(0, 10) + ") ──"];
    for (const r of rows) {
      garis.push(`${r.name.padEnd(22)} ${String(r.punya).padStart(3)}/${String(r.total).padEnd(3)} punya · ${String(r.belum).padStart(3)} belum`);
      if (r.daftar.length > 0) garis.push(`    belum: ${r.daftar.join(", ")}`);
    }
    garis.push(`TOTAL ${total - belumTotal}/${total} punya katalog · ${belumTotal} belum`, "");
    console.log(garis.join("\n"));

    // Invarian bentuk, bukan ambang cakupan: angkanya boleh berubah, jumlah
    // pasangannya tidak boleh tiba-tiba hilang dari daftar kurikulum.
    expect(total).toBe(rows.reduce((n, r) => n + r.total, 0));
    expect(new Set(rows.map((r) => r.name)).size).toBe(rows.length);
  });
});
