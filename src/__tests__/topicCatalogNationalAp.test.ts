/**
 * Penjaga katalog topik **Nasional** dan **AP** (butir C3, 2026-10-17).
 *
 * **Kenapa tes ini ada, dan kenapa hanya dua kurikulum itu.** Sampai 2026-10-17,
 * delapan mapel `NATIONAL_GROUPS` dan sepuluh mapel `AP_GROUPS` **tidak punya
 * satu pun entri topik**. Akibatnya tombol "Pilih dari daftar bab" kosong untuk
 * mapel-mapel itu, dan tutor harus mengetik topik dari nol — gejalanya tidak
 * terlihat sebagai kerusakan, hanya sebagai "kosong".
 *
 * Dua hal yang dijaga, dan keduanya berbeda:
 * 1. **Entrinya ada** — setiap mapel di dua kelompok itu menghasilkan minimal satu
 *    topik. Tanpa ini, katalog bisa "ditambah" di berkas tetapi tidak terbaca.
 * 2. **Entrinya terjangkau lewat filter kurikulum** — `curriculumLevelFilter`
 *    menolak level yang tidak cocok (`National` hanya menerima `SMP …`/`SMA …`,
 *    `AP` hanya menerima `AP`), dan `browseTopicsForSubjects` menyaring dengan
 *    filter itu. Entri dengan kode level yang salah karena itu **ada tetapi tidak
 *    pernah tampil**, dan itulah kegagalan yang paling mudah terjadi saat
 *    menambah katalog: menulis level `"SMP"` alih-alih `"SMP 7"`.
 *
 * **Batas kejujuran.** Tes ini membuktikan katalognya ada dan terjangkau, **bukan**
 * bahwa isi tiap topik cocok dengan silabus resmi setiap penerbit — unit disusun
 * dari capaian pembelajaran Kurikulum Merdeka (Nasional) dan kerangka kursus
 * College Board (AP), dan pemetaan per mapel ke buku tertentu tetap pekerjaan
 * manusia.
 */
import { describe, expect, it } from "vitest";
import { AP_GROUPS, NATIONAL_GROUPS } from "../lib/ibSubjects";
import { browseTopicsForSubjects, normalizeSubject, resolveSubjectAliases } from "../lib/ibTopics";

/** Semua nama mapel datar dari daftar kelompok. */
function mapel(groups: ReadonlyArray<{ subjects: readonly string[] }>): string[] {
  return groups.flatMap((g) => [...g.subjects]);
}

const KURIKULUM: ReadonlyArray<{
  nama: string;
  mapelList: string[];
  kurikulum: string;
  /** Label jenjang yang dipakai aplikasi untuk kurikulum itu. */
  jenjang: string;
}> = [
  { nama: "National", mapelList: mapel(NATIONAL_GROUPS), kurikulum: "National", jenjang: "Kelas 10 (SMA)" },
  { nama: "AP", mapelList: mapel(AP_GROUPS), kurikulum: "AP", jenjang: "Grade 11" },
];

describe.each(KURIKULUM)("katalog $nama — setiap mapel punya topik yang terjangkau", ({ mapelList, kurikulum, jenjang }) => {
  for (const namaMapel of mapelList) {
    it(`${namaMapel} menghasilkan minimal satu kelompok topik`, () => {
      const grup = browseTopicsForSubjects([namaMapel], jenjang, kurikulum);
      expect(grup.length, `"${namaMapel}" tidak punya topik untuk kurikulum ${kurikulum}`).toBeGreaterThan(0);
      const jumlahTopik = grup.reduce((n, g) => n + g.topics.length, 0);
      expect(jumlahTopik).toBeGreaterThan(0);
      // Setiap topik yang dikembalikan harus benar-benar milik mapel itu —
      // jangan sampai aliasnya menarik mapel lain (jenis kebocoran yang dijaga
      // `topicMultiSubject.test.ts` dari sisi lain).
      const diharapkan = new Set(resolveSubjectAliases(namaMapel).map(normalizeSubject));
      for (const g of grup) {
        for (const t of g.topics) {
          expect(diharapkan.has(normalizeSubject(t.subject))).toBe(true);
        }
      }
    });
  }
});

describe("katalog Nasional & AP — bentuk level yang dipakai filter", () => {
  it("National hanya memakai level SMP/SMA bernomor (bukan 'SMP' polos)", () => {
    const semua = browseTopicsForSubjects(
      mapel(NATIONAL_GROUPS), "Kelas 10 (SMA)", "National", 200,
    ).flatMap((g) => g.topics);
    expect(semua.length).toBeGreaterThan(0);
    for (const t of semua) {
      expect(t.level).toMatch(/^(SMP|SMA) \d{1,2}$/);
    }
  });

  it("AP hanya memakai level 'AP'", () => {
    const semua = browseTopicsForSubjects(
      mapel(AP_GROUPS), "Grade 11", "AP", 200,
    ).flatMap((g) => g.topics);
    expect(semua.length).toBeGreaterThan(0);
    for (const t of semua) expect(t.level).toBe("AP");
  });

  it("katalog Nasional tidak tertukar dengan katalog MYP", () => {
    // Filter `National` secara eksplisit menolak level berawalan "MYP" (audit P0);
    // tes ini memastikan penolakan itu tetap berlaku sesudah katalog ditambah.
    const semua = browseTopicsForSubjects(
      mapel(NATIONAL_GROUPS), "Kelas 10 (SMA)", "National", 200,
    ).flatMap((g) => g.topics);
    expect(semua.some((t) => t.level.toLowerCase().startsWith("myp"))).toBe(false);
  });
});
