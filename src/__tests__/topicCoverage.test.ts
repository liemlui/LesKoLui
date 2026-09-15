import { describe, it, expect } from "vitest";
import {
  IB_TOPICS,
  TOPIC_INDEX_SUBJECTS,
  normalizeSubject,
  resolveSubjectAliases,
  searchTopics,
  searchTopicsExpanded,
} from "../lib/ibTopics";
import {
  IB_MYP_SUBJECTS, IB_DP_GROUPS, CAMBRIDGE_IGCSE_GROUPS, CAMBRIDGE_OLEVEL_GROUPS,
  CAMBRIDGE_ASLEVEL_GROUPS, AP_GROUPS, NATIONAL_GROUPS,
} from "../lib/ibSubjects";

/**
 * TEST PENJAGA CAKUPAN MAPEL ↔ TOPIK (audit P0)
 *
 * Tujuan: setiap mapel yang BISA DIPILIH tutor di layar harus terbukti salah satu dari:
 *   (a) punya topik pada level kurikulumnya sendiri, atau
 *   (b) tertaut ke mapel lain lewat `TOPIC_SUBJECT_ALIASES` di `lib/ibTopics.ts`, atau
 *   (c) terdaftar SADAR di `KNOWN_TOPIcless` di bawah sebagai mapel yang katalognya
 *       memang belum ada.
 *
 * Kenapa penting: sebelum P0, 30 mapel IGCSE dan 6 mapel MYP tidak menemukan satu pun
 * topiknya karena nama ber-kode ("Mathematics (0580)") tidak pernah dipertemukan dengan
 * nama indeks ("Mathematics") — dan tidak ada test yang menangkapnya. Test ini GAGAL
 * begitu ada mapel baru ditambahkan ke `lib/ibSubjects.ts` tanpa keputusan sadar.
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

/**
 * Mapel yang katalog topiknya MEMANG BELUM ADA. Ini bukan daftar "sudah beres" —
 * ini daftar pekerjaan. Setiap penambahan mapel ke `ibSubjects.ts` yang tidak
 * punya topik akan menggagalkan test pertama sampai entri di bawah diputuskan.
 * Hapus dari daftar ini begitu katalognya diisi (mis. oleh audit §6 P3).
 */
const KNOWN_TOPIcless: ReadonlyArray<readonly [string, string]> = [
  // ── IB MYP ──
  ["IB MYP", "Language & Literature"],
  ["IB MYP", "Language Acquisition"],
  // Individu & Masyarakat = gabungan IPS; topik terdekatnya (Economics/History)
  // hanya ada di DP, bukan MYP.
  ["IB MYP", "Individuals & Societies"],
  ["IB MYP", "Arts"],
  ["IB MYP", "PHE"],
  ["IB MYP", "Design"],
  // ── IB DP ──
  ["IB DP", "Philosophy"],
  ["IB DP", "Global Politics"],
  ["IB DP", "Digital Society"],
  ["IB DP", "Design Technology"],
  ["IB DP", "SEHS"],
  ["IB DP", "Visual Arts"],
  ["IB DP", "Music"],
  ["IB DP", "Theatre"],
  ["IB DP", "Film"],
  ["IB DP", "Dance"],
  // ── Cambridge IGCSE ──
  ["Cambridge IGCSE", "Combined Science (0653)"],
  ["Cambridge IGCSE", "Co-ordinated Sciences (0654)"],
  ["Cambridge IGCSE", "Commerce (0452)"],
  ["Cambridge IGCSE", "Accounting (0452)"],
  ["Cambridge IGCSE", "Environmental Management (0680)"],
  ["Cambridge IGCSE", "Marine Science (0697)"],
  ["Cambridge IGCSE", "Sociology (0495)"],
  ["Cambridge IGCSE", "Psychology (0478)"],
  // Global Perspectives = rumpun berpikir kritis (TOK/EE di DP), katalognya hanya
  // ada di level DP — bukan di IGCSE.
  ["Cambridge IGCSE", "Global Perspectives (0457)"],
  ["Cambridge IGCSE", "English Literature (0486)"],
  ["Cambridge IGCSE", "Bahasa Indonesia (0538)"],
  ["Cambridge IGCSE", "French (0520)"],
  ["Cambridge IGCSE", "Spanish (0530)"],
  ["Cambridge IGCSE", "German (0525)"],
  ["Cambridge IGCSE", "ICT (0417)"],
  ["Cambridge IGCSE", "Art & Design (0400)"],
  ["Cambridge IGCSE", "Music (0410)"],
  ["Cambridge IGCSE", "Physical Education (0413)"],
  // ── Cambridge O Level ──
  ["Cambridge O Level", "Combined Science (5129)"],
  ["Cambridge O Level", "Physical Science (5150)"],
  ["Cambridge O Level", "Commerce (7100)"],
  ["Cambridge O Level", "Accounting (7707)"],
  ["Cambridge O Level", "History (2059)"],
  ["Cambridge O Level", "Geography (2217)"],
  ["Cambridge O Level", "Bahasa Indonesia (3026)"],
  ["Cambridge O Level", "French (3015)"],
  ["Cambridge O Level", "Spanish (3080)"],
  ["Cambridge O Level", "Computer Science (2210)"],
  ["Cambridge O Level", "Information & Communication Technology (2210)"],
  // ── Cambridge AS/A Level ──
  ["Cambridge AS/A Level", "Business (9609)"],
  ["Cambridge AS/A Level", "Global Perspectives & Research (9239)"],
  ["Cambridge AS/A Level", "Thinking Skills (9694)"],
  ["Cambridge AS/A Level", "History (9489)"],
  ["Cambridge AS/A Level", "Geography (9696)"],
  ["Cambridge AS/A Level", "Sociology (9699)"],
  ["Cambridge AS/A Level", "Law (9084)"],
  ["Cambridge AS/A Level", "Information Technology (9626)"],
  ["Cambridge AS/A Level", "English Language (9093)"],
  ["Cambridge AS/A Level", "English Literature (9695)"],
  ["Cambridge AS/A Level", "Art & Design (9479)"],
  ["Cambridge AS/A Level", "Music (9483)"],
  ["Cambridge AS/A Level", "Drama (9482)"],
  ["Cambridge AS/A Level", "Media Studies (9607)"],
  // ── AP ──
  // Mapel bahasa AP tidak punya topik level AP di indeks; katalog bahasa yang ada
  // (French B, Spanish B) berada di level DP.
  ["AP", "AP Environmental Science"],
  ["AP", "AP Spanish Language"],
  ["AP", "AP French Language"],
  ["AP", "AP Japanese Language"],
  ["AP", "AP Latin"],
  ["AP", "AP Music Theory"],
  ["AP", "AP Art History"],
  ["AP", "AP Seminar"],
  ["AP", "AP Research"],
  ["AP", "AP 2-D Art & Design"],
  ["AP", "AP 3-D Art & Design"],
  // ── National ──
  ["National", "Sastra Indonesia"],
  ["National", "Sastra Inggris"],
  ["National", "Informatika"],
  ["National", "Pendidikan Agama"],
  ["National", "PKn / PPKN"],
  ["National", "Seni Budaya"],
  ["National", "Penjaskes"],
  ["National", "BK"],
];

const knownSet = new Set(KNOWN_TOPIcless.map(([c, s]) => `${c} :: ${s}`));

/** Mapel indeks (beserta aliasnya) yang punya topik pada level tertentu. */
function indexedSubjectsAtLevel(levelRule: LevelRule): Set<string> {
  const out = new Set<string>();
  for (const t of IB_TOPICS) {
    if (!levelRule(t.level)) continue;
    for (const alias of resolveSubjectAliases(t.subject)) out.add(normalizeSubject(alias));
  }
  return out;
}

describe("cakupan mapel ↔ topik (test penjaga P0)", () => {
  for (const { name, subjects, levelRule } of CURRICULA) {
    it(`${name}: setiap mapel punya topik di levelnya, atau terdaftar sadar sebagai belum ada katalog`, () => {
      const indexed = indexedSubjectsAtLevel(levelRule);
      const offenders: string[] = [];
      for (const subject of subjects) {
        const matched = resolveSubjectAliases(subject).some((alias) =>
          indexed.has(normalizeSubject(alias)),
        );
        if (matched) continue;
        if (knownSet.has(`${name} :: ${subject}`)) continue;
        offenders.push(subject);
      }
      expect(
        offenders,
        `Mapel tanpa topik yang belum terdaftar di KNOWN_TOPIcless: ${offenders.join(" | ")}`,
      ).toEqual([]);
    });
  }

  it("mapel ber-kode Cambridge kini menemukan topik levelnya sendiri (inti perbaikan T-01)", () => {
    const igcse = indexedSubjectsAtLevel((l) => l.toLowerCase() === "igcse");
    for (const coded of [
      "Mathematics (0580)", "Additional Mathematics (0606)", "International Mathematics (0607)",
      "Biology (0610)", "Chemistry (0620)", "Physics (0625)",
      "Economics (0455)", "Business Studies (0450)", "History (0470)", "Geography (0460)",
      "Computer Science (0478)",
    ]) {
      expect(
        resolveSubjectAliases(coded).some((a) => igcse.has(normalizeSubject(a))),
        `${coded} tidak menemukan satu pun topik IGCSE`,
      ).toBe(true);
    }

    const olevel = indexedSubjectsAtLevel((l) => l.toLowerCase().startsWith("o level"));
    for (const coded of [
      "Physics (5054)", "Chemistry (5070)", "Economics (2281)", "Mathematics (4024)",
      "Additional Mathematics (4037)", "Biology (5090)",
    ]) {
      expect(
        resolveSubjectAliases(coded).some((a) => olevel.has(normalizeSubject(a))),
        `${coded} tidak menemukan satu pun topik O Level`,
      ).toBe(true);
    }

    const alevel = indexedSubjectsAtLevel((l) => l.toLowerCase().startsWith("a level"));
    for (const coded of [
      "Biology (9700)", "Chemistry (9701)", "Physics (9702)", "Mathematics (9709)",
      "Further Mathematics (9231)", "Economics (9708)", "Psychology (9990)",
      "Computer Science (9618)",
    ]) {
      expect(
        resolveSubjectAliases(coded).some((a) => alevel.has(normalizeSubject(a))),
        `${coded} tidak menemukan satu pun topik A Level`,
      ).toBe(true);
    }

    const ap = indexedSubjectsAtLevel((l) => l.toLowerCase() === "ap");
    for (const subject of [
      "AP Precalculus", "AP Computer Science Principles",
      "AP Physics 2", "AP Physics C: Electricity & Magnetism", "AP European History",
      "AP US Government & Politics", "AP Comparative Government & Politics", "AP Human Geography",
      "AP English Literature & Composition",
    ]) {
      expect(
        resolveSubjectAliases(subject).some((a) => ap.has(normalizeSubject(a))),
        `${subject} tidak menemukan satu pun topik AP`,
      ).toBe(true);
    }
  });

  it("catatan KNOWN_TOPIcless menunjuk mapel yang benar-benar ada di daftar kurikulum", () => {
    const all = new Map(CURRICULA.map((c) => [c.name, new Set(c.subjects)]));
    for (const [curriculum, subject] of KNOWN_TOPIcless) {
      expect(all.get(curriculum), `kurikulum tak dikenal: ${curriculum}`).toBeDefined();
      expect(
        all.get(curriculum)!.has(subject),
        `"${subject}" tidak ada lagi di ${curriculum} — perbarui KNOWN_TOPIcless`,
      ).toBe(true);
    }
  });
});

describe("normalizeSubject()", () => {
  it("membuang kode silabus, tanda baca, dan diakritik", () => {
    expect(normalizeSubject("Mathematics (0580)")).toBe("mathematics");
    expect(normalizeSubject("Biology (9700)")).toBe("biology");
    // Varian SL/HL ditangani lewat alias, bukan lewat pemotongan otomatis:
    expect(normalizeSubject("Theory of Knowledge (TOK)")).toBe("theory of knowledge");
    expect(normalizeSubject("Environmental Systems & Societies")).toBe("environmental systems and societies");
    expect(normalizeSubject("  Bahasa   Indonesia  ")).toBe("bahasa indonesia");
    expect(normalizeSubject("Français")).toBe("francais");
    expect(normalizeSubject("")).toBe("");
  });

  it("tidak pernah melempar untuk input aneh", () => {
    expect(() => normalizeSubject("(((")).not.toThrow();
    expect(() => normalizeSubject("& & &")).not.toThrow();
    expect(normalizeSubject("& & &")).toBe("and and and");
  });
});

describe("resolveSubjectAliases() — penggabungan nama kembar (audit T-08)", () => {
  it("ESS dan Environmental Systems & Societies menunjuk himpunan yang sama", () => {
    expect(new Set(resolveSubjectAliases("ESS"))).toEqual(
      new Set(resolveSubjectAliases("Environmental Systems & Societies")),
    );
  });

  it("TOK dan Theory of Knowledge menunjuk himpunan yang sama", () => {
    expect(new Set(resolveSubjectAliases("TOK"))).toEqual(
      new Set(resolveSubjectAliases("Theory of Knowledge (TOK)")),
    );
  });

  it("Math dan Mathematics menunjuk himpunan yang sama; Matematika BERDIRI SENDIRI", () => {
    const a = new Set(resolveSubjectAliases("Math"));
    expect(new Set(resolveSubjectAliases("Mathematics"))).toEqual(a);
    // "Matematika" sengaja TIDAK digabung: keduanya kurikulum berbeda, dan
    // penggabungan pernah membuat murid Nasional menerima topik IB MYP.
    expect(resolveSubjectAliases("Matematika")).toEqual(["Matematika"]);
    expect(a.has("Matematika")).toBe(false);
  });

  it("mapel tanpa pemetaan mengembalikan bentuk normalisasinya, bukan mapel lain", () => {
    expect(resolveSubjectAliases("Global Politics")).toEqual(["global politics"]);
    expect(resolveSubjectAliases("Penjaskes")).toEqual(["penjaskes"]);
  });

  it("setiap nama indeks topik mengenali dirinya sendiri", () => {
    for (const subject of TOPIC_INDEX_SUBJECTS) {
      expect(
        resolveSubjectAliases(subject).map(normalizeSubject),
        `${subject} tidak mengenali dirinya sendiri`,
      ).toContain(normalizeSubject(subject));
    }
  });

  it("setiap kunci alias benar-benar ada di indeks topik (tidak ada alias mati)", () => {
    // Alias mati berbahaya: ia terlihat seperti "sudah dipetakan" padahal tidak
    // pernah menghasilkan topik. Ini yang membuat estimasi cakupan menipu.
    const indexedNames = new Set(IB_TOPICS.map((t) => normalizeSubject(t.subject)));
    const dead = [...TOPIC_INDEX_SUBJECTS].filter((key) => !indexedNames.has(normalizeSubject(key)));
    expect(dead, `Kunci alias tanpa entri di IB_TOPICS: ${dead.join(" | ")}`).toEqual([]);
  });

  it("tidak ada penulisan yang dipetakan ke dua mapel berbeda (tabrakan alias)", () => {
    // normalizeSubject membuat dua penulisan yang berbeda bisa bertabrakan;
    // cek tidak ada nama indeks yang "tertelan" oleh grup lain.
    const seen = new Map<string, string>();
    const collisions: string[] = [];
    for (const subject of TOPIC_INDEX_SUBJECTS) {
      const key = normalizeSubject(subject);
      const owner = seen.get(key);
      if (owner && owner !== subject) collisions.push(`${key}: ${owner} vs ${subject}`);
      seen.set(key, subject);
    }
    expect(collisions).toEqual([]);
  });
});

describe("searchTopics() — level & mapel tidak boleh bocor", () => {
  it("kueri 'algebra' pada Mathematics (0580) hanya mengembalikan topik IGCSE", () => {
    const { results, meta } = searchTopicsExpanded("algebra", {
      subject: "Mathematics (0580)", curriculum: "Cambridge IGCSE",
    });
    expect(results.length).toBeGreaterThan(0);
    expect(meta.inLevel).toBe(true);
    expect(meta.offLevelFallback).toBe(false);
    for (const r of results) expect(r.level).toBe("IGCSE");
  });

  it("kueri 'cell' pada Biology (0610) hanya mengembalikan topik IGCSE", () => {
    const { results, meta } = searchTopicsExpanded("cell", {
      subject: "Biology (0610)", curriculum: "Cambridge IGCSE",
    });
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) expect(r.level).toBe("IGCSE");
    expect(meta.inLevel).toBe(true);
  });

  it("kueri 'power' pada Global Politics TIDAK lagi mengembalikan topik Matematika (audit T-04)", () => {
    const results = searchTopics("power", { subject: "Global Politics", curriculum: "IB DP" });
    const mathHits = results.filter((r) => /math/i.test(r.subject));
    expect(mathHits.map((r) => r.subject)).toEqual([]);
  });

  it("kueri 'teks' pada Bahasa Indonesia (0538) tidak mengembalikan topik Matematika", () => {
    const results = searchTopics("teks", { subject: "Bahasa Indonesia (0538)", curriculum: "Cambridge IGCSE" });
    for (const r of results) {
      expect(normalizeSubject(r.subject)).toContain("bahasa");
    }
  });

  it("hasil level lain dilaporkan lewat meta, bukan disamarkan (audit T-03)", () => {
    // Mapel ini belum punya katalog DP; hasil yang muncul HARUS ditandai.
    const { results, meta } = searchTopicsExpanded("power", {
      subject: "Global Politics", curriculum: "IB DP",
    });
    expect(meta.inLevel).toBe(false);
    if (results.length > 0) {
      expect(meta.offLevelFallback).toBe(true);
      expect(meta.otherLevels.length).toBeGreaterThan(0);
      for (const r of results) expect(r.level).not.toBe("DP");
    }
  });

  it("meta melaporkan mapel hasil alias & level yang diinginkan", () => {
    const { meta } = searchTopicsExpanded("cell", {
      subject: "Biology (0610)", curriculum: "Cambridge IGCSE",
    });
    expect(meta.resolvedSubjects).toContain("Biology");
    expect(meta.targetLevel).toBe("IGCSE");
  });

  it("tanpa kurikulum tetap mencari (perilaku lama dipertahankan)", () => {
    const results = searchTopics("integral", { subject: "Mathematics" });
    expect(results.length).toBeGreaterThan(0);
  });

  it("kueri kosong mengembalikan hasil kosong tanpa error", () => {
    expect(searchTopics("", { subject: "Mathematics" })).toEqual([]);
    expect(searchTopicsExpanded("   ", {}).results).toEqual([]);
  });
});
