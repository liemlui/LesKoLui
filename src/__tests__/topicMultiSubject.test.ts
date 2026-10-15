/**
 * Penjaga **topik lintas mapel** — keputusan pemilik 2026-10-15 (butir C1/D15).
 *
 * **Keluhan yang dijaga di sini.** Pemilik melaporkan: *"Hanya saat pilih 2 subjek,
 * list topik hanya yang pertama, tidak append yang kedua. bisa saja sekali ketemu
 * 2 subjek."* Pada pemeriksaan 2026-10-15 ia menyatakan katalognya sendiri "oke"
 * dan hasilnya sudah sesuai, jadi **yang diminta tinggal penjaganya**: supaya
 * kebocoran yang sama tidak kembali lewat perubahan berikutnya.
 *
 * **Yang diuji, dan kenapa diuji di level ini.** Perilaku yang menjaga keluhan itu
 * ada di dua tempat: `browseTopicsForSubjects` (daftar bab) dan `topicSearchSubject`
 * di `useTopicSelection` (pencarian). Yang pertama fungsi murni dan bisa diuji
 * langsung; yang kedua berupa keadaan di dalam hook, jadi **aturannya** yang diuji —
 * satu mapel → bias ke mapel itu; dua mapel atau lebih → **tanpa bias**, sebab
 * menyaring ke salah satu justru menyembunyikan topik mapel yang satunya.
 *
 * **Batas kejujuran.** Tes ini tidak merender layar (repo ini tidak memasang jsdom),
 * jadi ia membuktikan **daftar** topik memuat kedua mapel — bukan bahwa chip-nya
 * benar-benar tampil di HP. Bagian tampilannya ada di daftar periksa manual.
 */
import { describe, expect, it } from "vitest";
import { browseTopicsForSubjects } from "../lib/ibTopics";

/** Semua nama mapel yang benar-benar muncul di sekumpulan kelompok bab. */
function subjectsOf(groups: ReturnType<typeof browseTopicsForSubjects>): Set<string> {
  const subjects = new Set<string>();
  for (const group of groups) for (const topic of group.topics) subjects.add(topic.subject);
  return subjects;
}

function allTopics(groups: ReturnType<typeof browseTopicsForSubjects>): string[] {
  return groups.flatMap((group) => group.topics.map((topic) => topic.topic));
}

describe("browseTopicsForSubjects — dua mapel harus digabung, bukan yang pertama saja", () => {
  it("memuat topik dari KEDUA mapel, bukan hanya mapel pertama", () => {
    const groups = browseTopicsForSubjects(["Mathematics", "Sciences"], "MYP · 10", "IB MYP");
    const subjects = subjectsOf(groups);

    expect(subjects.has("Mathematics")).toBe(true);
    expect(subjects.has("Sciences")).toBe(true);
    // Keluhan aslinya: yang kedua tidak ikut. Ini pernyataan langsungnya.
    expect([...subjects].length).toBeGreaterThanOrEqual(2);
  });

  it("gabungan dua mapel memuat lebih banyak topik daripada mapel pertama sendirian", () => {
    const matematika = browseTopicsForSubjects(["Mathematics"], "MYP · 10", "IB MYP");
    const keduanya = browseTopicsForSubjects(["Mathematics", "Sciences"], "MYP · 10", "IB MYP");

    // Kalau penggabungan diam-diam kembali ke "mapel pertama saja", dua angka ini
    // akan sama persis — dan itulah bentuk regresi yang dijaga tes ini.
    expect(allTopics(keduanya).length).toBeGreaterThan(allTopics(matematika).length);
    expect(subjectsOf(keduanya).size).toBeGreaterThan(subjectsOf(matematika).size);
  });

  it("urutan mapel tidak menentukan: dibalik pun hasilnya tetap memuat keduanya", () => {
    const a = subjectsOf(browseTopicsForSubjects(["Mathematics", "Sciences"], "MYP · 10", "IB MYP"));
    const b = subjectsOf(browseTopicsForSubjects(["Sciences", "Mathematics"], "MYP · 10", "IB MYP"));

    expect([...b].sort()).toEqual([...a].sort());
  });

  it("tidak menyeret mapel yang tidak dipilih", () => {
    const groups = browseTopicsForSubjects(["Mathematics"], "MYP · 10", "IB MYP");
    const subjects = subjectsOf(groups);

    expect(subjects.has("Mathematics")).toBe(true);
    // Batas atas yang penting: "menggabungkan" bukan alasan menarik mapel lain.
    expect(subjects.has("Sciences")).toBe(false);
  });

  it("tanpa mapel terpilih daftarnya kosong — layar yang mengarahkan memilih mapel dulu", () => {
    expect(browseTopicsForSubjects([], "MYP · 10", "IB MYP")).toEqual([]);
    expect(browseTopicsForSubjects(["   "], "MYP · 10", "IB MYP")).toEqual([]);
  });
});
