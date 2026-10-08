/**
 * Kartu Kesimpulan (G3-06, keputusan pemilik K6).
 *
 * Yang diperiksa di sini adalah hal yang bisa dibuktikan dari markup statis:
 * kesimpulan muncul sebagai blok utama, rata-rata TIDAK diulang, dan frasa lama
 * yang menempelkan rata-rata seluruh riwayat pada penyebut "15 sesi terakhir"
 * sudah tidak ada. Perilaku yang butuh DOM (grafik, gulir) tidak diklaim di sini.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import EngagementSummary from "../screens/studentDetail/EngagementSummary";
import EvidenceCard from "../screens/studentDetail/EvidenceCard";
import type { Session, Student } from "../db/types";

const noop = () => {};

const STUDENT: Student = {
  id: "s1",
  name: "Bella Sari",
  level: "IBDP",
  subjects: ["Mathematics"],
  parentContact: { name: "Ibu Sari", phone: "0812" },
  hourlyRate: 300_000,
  active: true,
  enrolledAt: "2025-01-01",
};

/** Sesi dengan pengamatan kondisi yang menghasilkan skor terhitung. */
function session(over: {
  id: string;
  score: number;
  basis?: "full" | "partial" | "none";
  playingPhone?: boolean;
  prepared?: boolean;
  topic?: string;
  responseTag?: string;
}): Session {
  return {
    id: over.id,
    studentId: "s1",
    date: "2026-06-01",
    durationHours: 2,
    status: "DONE",
    subjects: ["Mathematics"],
    topic: over.topic,
    responseTag: over.responseTag,
    cost: 600_000,
    rateSnapshot: 300_000,
    engagement: {
      score: over.score,
      scoreBasis: over.basis ?? "full",
      playingPhone: over.playingPhone,
      prepared: over.prepared,
    },
    createdAt: "2026-06-01T00:00:00.000Z",
  } as unknown as Session;
}

function markup(sessions: Session[], over: Partial<Parameters<typeof EngagementSummary>[0]> = {}) {
  const counted = sessions.filter((s) => s.engagement?.scoreBasis !== "none");
  return renderToStaticMarkup(
    <EngagementSummary
      engSessions={sessions}
      avgEngScore={Math.round(
        counted.reduce((sum, s) => sum + (s.engagement?.score ?? 0), 0) / Math.max(1, counted.length),
      )}
      engTrend="up"
      recentEng={[]}
      subjectEngStats={[]}
      subjectPage={1}
      setSubjectPage={noop}
      student={STUDENT}
      {...over}
    />,
  );
}

const DUA_SESI = [
  session({ id: "a", score: 8, prepared: true, topic: "Vektor" }),
  session({ id: "b", score: 8, playingPhone: true, topic: "Trigonometri" }),
];

describe("Kartu Kesimpulan — kesimpulan diutamakan (K6)", () => {
  it("menampilkan kesimpulan tentang muridnya, bukan hanya angka", () => {
    const html = markup(DUA_SESI);
    expect(html).toContain("Kesimpulan");
    expect(html).toContain("Bella");
    expect(html).toMatch(/murid yang fokus saat les|fokusnya naik-turun|perlu perhatian ekstra/);
  });

  it("menyebut penyebut rata-rata dan penyebut tren secara terpisah", () => {
    const html = markup(DUA_SESI);
    // Rata-rata dari 2 sesi berdata; tren disebut sebagai sesi terakhir.
    expect(html).toContain("dari 2 sesi berdata");
    expect(html).toContain("sesi terakhir");
  });

  it("menyebut sinyal perilaku yang paling menonjol beserta penyebutnya", () => {
    const html = markup(DUA_SESI);
    expect(html).toContain("main HP");
    expect(html).toContain("1 dari 2 sesi berdata (50%)");
  });
});

describe("Kartu Kesimpulan — pengulangan dihapus (K6)", () => {
  it("rata-rata hanya muncul SEKALI sebagai angka pendukung", () => {
    const html = markup(DUA_SESI);
    // "8/10" dulu muncul di ringkasan, di tafsiran tren, dan di kalimat insight.
    const occurrences = html.split("8/10").length - 1;
    expect(occurrences).toBe(1);
  });

  it("tidak lagi memuat frasa lama yang salah penyebut", () => {
    const html = markup(DUA_SESI);
    expect(html).not.toContain("Rata-rata fokus:");
    expect(html).not.toContain("lihat grafik di atas");
    expect(html).not.toContain("📊 Insight:");
  });

  it("tidak menampilkan kalimat yang menyebut penyebut 'dari N sesi' tanpa kata berdata", () => {
    const html = markup(DUA_SESI);
    // Pola lama: "rata-rata dari 12 sesi" — sekarang selalu "sesi berdata".
    expect(html).not.toMatch(/rata-rata dari \d+ sesi</);
  });

  it("tetap menyebut cakupan data ketika tidak semua sesi berdata", () => {
    const html = markup([
      ...DUA_SESI,
      session({ id: "c", score: 5, basis: "none", topic: "Aljabar" }),
    ]);
    expect(html).toContain("Cakupan data");
    expect(html).toContain("2 dari 3 sesi berdata");
  });
});

describe("Kartu Kesimpulan — domain kosong tidak dikarang", () => {
  it("menyatakan belum ada data pengamatan bila semua sesi tanpa pengamatan", () => {
    const html = markup([session({ id: "a", score: 5, basis: "none" })]);
    expect(html).toContain("Belum ada data pengamatan");
    expect(html).not.toContain("murid yang fokus saat les");
  });
});

describe("Bukti Keaktifan — penunjuk, bukan sumber angka kedua", () => {
  it("menyebut tab Progres sebagai tempat rinciannya", () => {
    const html = renderToStaticMarkup(<EvidenceCard engSessions={DUA_SESI} />);
    expect(html).toContain("Progres");
    expect(html).toContain("2 sesi");
  });

  it("tidak menghitung rata-rata sendiri lagi", () => {
    const html = renderToStaticMarkup(<EvidenceCard engSessions={DUA_SESI} />);
    expect(html).not.toContain("Avg Fokus");
    expect(html).not.toContain("/10");
  });

  it("tidak dirender sama sekali bila belum ada sesi berdata", () => {
    expect(renderToStaticMarkup(<EvidenceCard engSessions={[]} />)).toBe("");
  });
});
