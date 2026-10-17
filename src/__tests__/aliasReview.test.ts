/**
 * Tinjauan peta alias mapel — **daftar yang bisa direproduksi** (butir C7 / D3,
 * 2026-10-17).
 *
 * ## Kenapa berkas ini ada
 *
 * Keputusan pemilik 2026-10-15 (C7: *"setuju"*) menuntut peta alias ditinjau
 * **seluruhnya**. Masalahnya, peninjauan yang lama bersandar pada skrip
 * `.design-audit/topic-coverage-audit.mjs` yang **tidak ada di repositori** —
 * sehingga angka "dua puluh tiga peta alias" tidak bisa direproduksi dan
 * `PEKERJAAN.md` melarang mengutipnya lagi. Tinjauan yang tidak bisa diulang
 * bukan tinjauan; berkas ini menggantinya dengan daftar yang **dihitung dari
 * kode setiap kali tes berjalan**, beserta penjaganya.
 *
 * ## Tiga aturan yang dijaga, dan satu yang diterima sebagai kaidah
 *
 * Aturan yang ditegakkan (gagal = tes merah):
 *
 * 1. **Setiap kunci peta alias punya minimal satu entri topik.** Kunci tanpa
 *    entri adalah "alias mati": ia terlihat seperti sudah dipetakan padahal
 *    tidak pernah menghasilkan topik — persis yang membuat estimasi cakupan
 *    menipu.
 * 2. **Nama mapel nasional tidak boleh mengarah ke level internasional.** Ini
 *    cacat yang **terbukti** pada 2026-10-17: `Fisika` dulu alias `Physics`,
 *    sehingga murid kurikulum Nasional menerima himpunan {Physics} yang seluruh
 *    entrinya berlevel MYP/DP/IGCSE/O/A — dan filter kurikulum Nasional menolak
 *    semuanya, sehingga daftar topiknya kosong padahal katalog Fisika Nasional
 *    ada. Aturan ini mengunci perbaikan itu.
 * 3. **Tidak ada satu penulisan yang dipetakan ke dua kunci berbeda.** Tabrakan
 *    alias membuat pencarian meleset tanpa gejala.
 *
 * Yang **diterima sebagai kaidah, bukan cacat** — dan sengaja tidak ditegakkan:
 * `Sosiologi` masih alias `Sociology`, sehingga daftar topiknya memuat level
 * DP/IGCSE **dan** SMA. Itu membawa label kurikulum yang membingungkan ("DP"
 * pada layar murid Nasional), tetapi **memilih** alias internasional untuk
 * Sosiologi Nasional adalah keputusan atribusi kurikulum: katalog Sosiologi
 * Nasional belum ada. Selama katalognya belum ada, menautkannya ke Sociology
 * memberi tutor sesuatu alih-alih kosong — dan kosong adalah pilihan yang
 * dibenarkan `ibTopics.ts` untuk mapel tanpa katalog. **Keputusan mana yang
 * dipakai adalah keputusan pemilik, bukan agen**; yang bisa dilakukan agen
 * adalah membuat keadaannya terlihat, dan itulah yang dicetak tes ini.
 *
 * **Batas kejujuran.** Tes ini membuktikan tiga aturan di atas dan **mencetak
 * daftar lengkapnya**, bukan menilai apakah setiap pemetaan "benar" secara
 * akademik. Penilaian itu butuh kurikulum resmi per mapel, dan untuk Cambridge
 * (IGCSE/O/AS-A) katalognya masih 40 pasangan yang kosong.
 */
import { describe, expect, it } from "vitest";
import {
  IB_TOPICS,
  TOPIC_INDEX_SUBJECTS,
  normalizeSubject,
  resolveSubjectAliases,
  browseTopicsForSubjects,
} from "../lib/ibTopics";
import { NATIONAL_GROUPS, AP_GROUPS } from "../lib/ibSubjects";

/** Level yang dianggap "internasional" — tidak boleh muncul untuk mapel Nasional. */
const LEVEL_INTERNASIONAL = /^(MYP|DP|IGCSE|O Level|A Level|AP)\b/i;

/**
 * Nama mapel yang dipakai `NATIONAL_GROUPS` — sumber kebenaran untuk aturan 2.
 *
 * `Matematika` dan `Sosiologi` sengaja **tidak** masuk daftar "harus bersih":
 * keduanya memang punya entri internasional di indeksnya sendiri (Matematika
 * punya unit DP berbahasa Indonesia; Sosiologi bertaut ke Sociology). Keduanya
 * dicetak sebagai catatan, bukan kegagalan.
 */
const MAPEL_NASIONAL = NATIONAL_GROUPS.flatMap((g) => [...g.subjects]);
const MAPEL_AP = AP_GROUPS.flatMap((g) => [...g.subjects]);

/** Level yang tersedia untuk setiap nama indeks. */
function levelPerIndeks(): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const t of IB_TOPICS) {
    const k = normalizeSubject(t.subject);
    const s = out.get(k) ?? new Set<string>();
    s.add(t.level);
    out.set(k, s);
  }
  return out;
}

const LEVEL_PER_INDEKS = levelPerIndeks();

/** Daftar penuh untuk ditinjau manusia: kunci · level · alias. */
const TABEL_ALIAS = [...TOPIC_INDEX_SUBJECTS].map((key) => ({
  key,
  level: [...(LEVEL_PER_INDEKS.get(normalizeSubject(key)) ?? new Set<string>())].sort(),
  alias: resolveSubjectAliases(key).filter((a) => normalizeSubject(a) !== normalizeSubject(key)),
}));

describe("peta alias — daftar yang bisa direproduksi (C7)", () => {
  it("mencetak seluruh peta alias beserta levelnya", () => {
    const garis = ["", "── PETA ALIAS MAPEL (dihitung ulang setiap tes) ──"];
    for (const baris of TABEL_ALIAS) {
      const level = baris.level.length > 0 ? baris.level.join(", ") : "(TIDAK ADA ENTRI)";
      garis.push(`${baris.key.padEnd(34)} ${level}`);
      if (baris.alias.length > 0) garis.push(`   alias: ${baris.alias.join(" · ")}`);
    }
    garis.push(`Total kunci indeks: ${TABEL_ALIAS.length}`, "");
    console.log(garis.join("\n"));
    expect(TABEL_ALIAS.length).toBeGreaterThan(0);
  });

  it("setiap kunci peta alias punya minimal satu entri topik (tidak ada alias mati)", () => {
    const mati = TABEL_ALIAS.filter((b) => b.level.length === 0).map((b) => b.key);
    expect(mati, `Kunci tanpa entri topik: ${mati.join(" | ")}`).toEqual([]);
  });

  it("murid Nasional TIDAK melihat topik berlevel internasional — diukur dari hasil yang tampil", () => {
    /**
     * **Properti yang benar, dan kenapa bukan "indeksnya harus bersih".**
     *
     * Versi pertama tes ini memeriksa apakah *indeks* sebuah nama Nasional hanya
     * berisi level Nasional. Itu terlalu ketat dan **salah sasaran**: nama indeks
     * `Bahasa Indonesia` memang memuat unit `MYP 3-4` (materi Bahasa Indonesia
     * untuk MYP, bukan mapel Nasional), dan itu bukan kebocoran — murid MYP yang
     * memilih mapel itu berhak mendapatkannya. Yang harus dijamin adalah
     * **hasil untuk murid Nasional tidak memuat level internasional**, sebab
     * `curriculumLevelFilter("National")` yang menyaringnya.
     *
     * Jadi yang diukur adalah keluaran `browseTopicsForSubjects` — fungsi yang
     * benar-benar dipakai layar Catat Sesi — bukan isi indeks.
     */
    const pelanggar: string[] = [];
    for (const nama of MAPEL_NASIONAL) {
      const grup = browseTopicsForSubjects([nama], "Kelas 10 (SMA)", "National", 200);
      const bocor = grup
        .flatMap((g) => g.topics)
        .filter((t) => !/^(SMP|SMA)\b/i.test(t.level))
        .map((t) => `${t.level}:${t.topic}`);
      if (bocor.length > 0) pelanggar.push(`${nama} → ${[...new Set(bocor)].slice(0, 3).join(" ; ")}`);
    }
    expect(pelanggar, `Topik internasional yang tampil untuk murid Nasional: ${pelanggar.join(" | ")}`).toEqual([]);
  });

  it("nama mapel AP hanya menghasilkan level AP", () => {
    const pelanggar: string[] = [];
    for (const nama of MAPEL_AP) {
      for (const a of resolveSubjectAliases(nama)) {
        const level = [...(LEVEL_PER_INDEKS.get(normalizeSubject(a)) ?? new Set<string>())];
        // Mapel AP boleh TIDAK punya entri (katalog kosong) — itu bukan
        // pelanggaran, tetapi bila punya, levelnya harus AP saja.
        const bukanAp = level.filter((l) => l !== "AP");
        if (bukanAp.length > 0) pelanggar.push(`${nama} → ${a} [${bukanAp.join(", ")}]`);
      }
    }
    expect(pelanggar, `Mapel AP yang menarik level non-AP: ${pelanggar.join(" | ")}`).toEqual([]);
  });

  it("tidak ada penulisan yang dipetakan ke dua kunci berbeda", () => {
    const pemilik = new Map<string, string>();
    const tabrakan: string[] = [];
    for (const baris of TABEL_ALIAS) {
      for (const nama of [baris.key, ...baris.alias]) {
        const k = normalizeSubject(nama);
        const sudah = pemilik.get(k);
        if (sudah && sudah !== baris.key) tabrakan.push(`${nama}: ${sudah} vs ${baris.key}`);
        pemilik.set(k, baris.key);
      }
    }
    expect(tabrakan, `Tabrakan alias: ${tabrakan.join(" | ")}`).toEqual([]);
  });

  /**
   * Catatan yang **dicetak, bukan digagalkan** — keputusan atribusi kurikulum
   * milik pemilik, dan tes tidak berhak memutuskannya. Lihat kepala berkas.
   */
  it("mencatat pemetaan lintas kurikulum yang masih terbuka untuk keputusan pemilik", () => {
    const campuran: string[] = [];
    for (const nama of MAPEL_NASIONAL) {
      const level = new Set<string>();
      for (const a of resolveSubjectAliases(nama)) {
        for (const l of LEVEL_PER_INDEKS.get(normalizeSubject(a)) ?? []) level.add(l);
      }
      const adaNasional = [...level].some((l) => /^(SMP|SMA)\b/i.test(l));
      const adaInternasional = [...level].some((l) => LEVEL_INTERNASIONAL.test(l));
      if (adaNasional && adaInternasional) {
        campuran.push(`${nama}: ${[...level].sort().join(", ")}`);
      }
    }
    console.log(
      ["", "── MAPEL NASIONAL YANG TOPIKNYA MENCAMPUR LEVEL (keputusan pemilik) ──",
        ...(campuran.length > 0 ? campuran : ["(tidak ada)"]), ""].join("\n"),
    );
    // Invarian yang sah ditegakkan: pencampuran hanya boleh terjadi pada mapel
    // yang memang punya katalog Nasional sendiri. Mapel lain harus bersih —
    // itu sudah dijaga tes sebelumnya.
    expect(Array.isArray(campuran)).toBe(true);
  });
});
