// ── Kesimpulan tentang seorang murid ────────────────────────────────────────
//
// Keputusan pemilik 2026-10-09 (K6): dua kartu yang menampilkan rata-rata fokus
// DIGABUNG menjadi satu, dan yang diutamakan adalah **kesimpulan**: murid ini
// seperti apa. Bukan sekadar angka yang diulang di beberapa tempat.
//
// Modul ini murni (tanpa impor Dexie, tanpa efek samping) supaya kalimatnya bisa
// diuji tanpa DOM. Satu aturan yang mengikat: SETIAP angka yang disebut wajib
// punya penyebut, dan penyebutnya harus penyebut yang benar — bukan "15 sesi
// terakhir" untuk rata-rata yang dihitung dari seluruh riwayat.

import { scoreLabel } from "./engagement";

/** Ringkasan pengamatan kondisi sebuah sesi. */
export interface ConclusionLog {
  score: number;
  /** `false` bila sesi tercatat tanpa pengamatan apa pun. */
  observed: boolean;
  playingPhone?: boolean;
  drowsy?: boolean;
  prepared?: boolean;
  hwMissed?: boolean;
}

export interface StudentConclusionInput {
  /** Nama panggilan (kata pertama nama murid). */
  firstName: string;
  /** Rata-rata fokus seluruh riwayat berdata; `null` bila belum ada. */
  avgScore: number | null;
  /** Jumlah sesi yang skornya benar-benar dihitung. */
  counted: number;
  /** Jumlah sesi yang diperiksa (berdata + tanpa pengamatan). */
  total: number;
  /** Arah tren terbaru: `"up"` | `"down"` | `"stable"` | `null`. */
  trend: string | null;
  /** Jumlah sesi dengan skor (untuk penyebut tren). */
  recentCount: number;
  /** Sesi yang skornya dihitung — sumber untuk pola perilaku. */
  log: readonly ConclusionLog[];
  /** Sebaran kualitas respons akademik; yang pertama = paling sering. */
  topResponse?: { label: string; count: number } | null;
  /** Jumlah sesi yang mencatat respons akademik (penyebut `topResponse`). */
  responseAnswered?: number;
  /** Ada catatan mengajar per sesi? */
  hasTopicNotes?: boolean;
}

export interface StudentConclusion {
  /** Kalimat utama: murid ini seperti apa. Satu kalimat, siap dibaca. */
  headline: string;
  /** Label keadaan: `"baik"` | `"cukup"` | `"perhatian"` | `"belum-ada-data"`. */
  behaviour: "baik" | "cukup" | "perhatian" | "belum-ada-data";
  /** Dua sampai empat titik pendukung, tiap titik menyebut penyebutnya. */
  details: string[];
  /** Satu baris yang menyebut data mana yang belum ada, bila ada. */
  caveat?: string;
}

function percent(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

/** "3 dari 12 sesi berdata (25%)" — pola yang sama dipakai ringkasan keterlibatan. */
function ratio(part: number, whole: number): string {
  return `${part} dari ${whole} sesi berdata (${percent(part, whole)}%)`;
}

/**
 * Kesimpulan tentang murid. Urutan prioritasnya sengaja:
 *
 * 1. kalau **tidak ada** data pengamatan, katakan apa adanya — jangan mengarang;
 * 2. kalau datanya terlalu tipis (kurang dari tiga sesi), tetap beri gambaran
 *    tetapi sebutkan bahwa dasarnya masih tipis;
 * 3. kalau cukup, baru simpulkan keadaan dan polanya.
 */
export function studentConclusion(input: StudentConclusionInput): StudentConclusion {
  const { firstName, avgScore, counted, total, trend, recentCount, log } = input;

  const noObservation = total - counted;
  const caveatParts: string[] = [];

  if (counted === 0) {
    const caveat = total === 0
      ? "Belum ada sesi yang tercatat, jadi belum ada yang bisa disimpulkan."
      : `Ada ${total} sesi, tetapi tidak satu pun mencatat pengamatan kondisi — catat indikator saat mengisi Catat Sesi supaya kesimpulan ini punya dasar.`;
    return {
      behaviour: "belum-ada-data",
      headline: `Belum ada data pengamatan kondisi untuk ${firstName}.`,
      details: [],
      caveat,
    };
  }

  const label = scoreLabel(avgScore ?? 0);
  const behaviour: StudentConclusion["behaviour"] =
    (avgScore ?? 0) >= 7 ? "baik" : (avgScore ?? 0) >= 5 ? "cukup" : "perhatian";

  const behaviourPhrase =
    behaviour === "baik" ? "murid yang fokus saat les" :
    behaviour === "cukup" ? "murid yang fokusnya naik-turun" :
    "murid yang perlu perhatian ekstra untuk fokus";

  const trendPhrase =
    trend === "up" ? ", dan akhir-akhir ini sedang membaik" :
    trend === "down" ? ", tetapi akhir-akhir ini cenderung menurun" :
    trend === "stable" ? "" :
    "";

  // Dua penyebut di kalimat ini sengaja dipisah dan disebut keduanya: rata-rata
  // dihitung dari SELURUH sesi berdata, sedangkan tren hanya dari sesi terbaru.
  // Versi lama menempelkan keduanya pada satu penyebut dan itu menyesatkan.
  let headline = `${firstName} termasuk ${behaviourPhrase}`;
  if (trend === "stable") {
    headline += ` — rata-rata ${avgScore}/10 (${label.text.toLowerCase()}) dari ${counted} sesi berdata yang mencatat kondisi, dan trennya stabil`;
  } else if (trendPhrase) {
    headline += ` — rata-rata ${avgScore}/10 (${label.text.toLowerCase()}) dari ${counted} sesi berdata${trendPhrase} dalam ${recentCount} sesi terakhir`;
  } else {
    headline += ` — rata-rata ${avgScore}/10 (${label.text.toLowerCase()}) dari ${counted} sesi berdata yang mencatat kondisi`;
  }
  headline += ".";

  const details: string[] = [];

  // ── Pola perilaku: sebut yang paling menonjol, jangan daftar semua ──
  const signals: { text: string; count: number }[] = [
    { count: log.filter((s) => s.playingPhone).length, text: "main HP" },
    { count: log.filter((s) => s.drowsy).length, text: "mengantuk" },
    { count: log.filter((s) => s.hwMissed).length, text: "PR tidak dikerjakan" },
    { count: log.filter((s) => s.prepared).length, text: "datang sudah siap" },
  ];
  const strongest = signals.reduce((a, b) => (b.count > a.count ? b : a));
  if (strongest.count > 0) {
    details.push(`Yang paling sering muncul: **${strongest.text}** — ${ratio(strongest.count, counted)}.`);
  }

  if (input.topResponse && (input.responseAnswered ?? 0) > 0) {
    details.push(
      `Kualitas respons akademik yang paling sering: **${input.topResponse.label}** ` +
      `(${input.topResponse.count}× dari ${input.responseAnswered} sesi yang mencatat respons).`
    );
  }

  if (input.hasTopicNotes) {
    details.push("Tiap sesi punya catatan topik, jadi bahan untuk menutup celah belajar sebelumnya sudah ada.");
  }

  // ── Batas kejujuran ──
  if (counted < 3) {
    caveatParts.push(
      `Baru ${counted} sesi yang mencatat kondisi, jadi gambaran ini masih tipis — bukan penilaian atas seluruh riwayat.`
    );
  }
  if (noObservation > 0) {
    caveatParts.push(
      `${noObservation} dari ${total} sesi tercatat tanpa pengamatan kondisi, sehingga tidak ikut dihitung.`
    );
  }
  if (!input.hasTopicNotes && counted > 0) {
    caveatParts.push("Belum ada catatan topik per sesi, jadi bahan belajar spesifik belum bisa dirangkum.");
  }

  return {
    behaviour,
    headline,
    details,
    caveat: caveatParts.length > 0 ? caveatParts.join(" ") : undefined,
  };
}
