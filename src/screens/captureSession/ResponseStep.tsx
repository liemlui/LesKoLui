import { RESPONSE_TAGS } from "../../lib/responseTaxonomy";
import { scoreBasisLabel } from "../../lib/engagement";
import type { EngagementScoreBasis } from "../../db/types";
import { RefreshIcon } from "../../components/icons";
import ProgressBar from "../../components/charts/ProgressBar";

/**
 * Ambang warna bar skor (C-10).
 *
 * Disamakan dengan kata band di `scoreLabel()` supaya bar dan katanya tidak
 * pernah berbeda: 9+ hijau · 7–8 biru · 5–6 kuning · <5 merah. `tone` dasar
 * merah penting — skor < 3 tidak cocok dengan ambang mana pun, dan tanpa itu
 * bar-nya jatuh ke warna bawaan ProgressBar (biru) yang salah arti.
 *
 * Warnanya **token** (`--bg-*-strong`), bukan palet hex: diukur 2026-10-05,
 * teks bertoken di atas keempat rona kartu skor bernilai 5,38–6,41:1 — di atas
 * ambang 4,5:1, sedangkan pasangan palet lama yang paling ketat 4,51:1.
 */
const SCORE_TONE_THRESHOLDS = [
  { pct: 90, tone: "green" as const },
  { pct: 70, tone: "blue" as const },
  { pct: 50, tone: "amber" as const },
  { pct: 30, tone: "red" as const },
];

interface ResponseStepProps {
  /** Tag respons akademik terpilih (kunci `RESPONSE_TAGS`). */
  responseTag?: string;
  setResponseTag: (tag: string | undefined) => void;
  /** Kolom "Fokus Perbaikan Berikutnya" — jadi bahan follow-up laporan. */
  needsWork: string;
  setNeedsWork: (value: string) => void;
  /** Skor sesi (0 = belum ada pengamatan). */
  engScore: number;
  /** Label rona skor; `null` bila skor belum dihitung. */
  engScoreInfo: { text: string; color: string; bg: string } | null;
  /** Dasar perhitungan skor (diisi indikator/tag mana). */
  engBasis: EngagementScoreBasis;
}

/** Langkah 4 wizard Catat Sesi: respons akademik, fokus perbaikan, dan skor sesi.
 *
 *  Dipindah apa adanya dari `CaptureSession.tsx` (refactor terbatas G3-01, Q9):
 *  tidak ada teks, rumus, atau urutan yang berubah; seluruh state tetap milik
 *  induk (`useEngagement` + draf), komponen ini hanya menerimanya sebagai prop. */
export default function ResponseStep({
  responseTag, setResponseTag, needsWork, setNeedsWork,
  engScore, engScoreInfo, engBasis,
}: ResponseStepProps) {
  /**
   * **Satu-satunya penulis `responseTag` di langkah ini (C-03).**
   *
   * Sebelumnya tombol "Isi cepat" menulis tag langsung, sedangkan daftar panjang
   * di bawah menyalakan/mematikan pilihannya sendiri — dua jalan yang bisa
   * berbeda arti tanpa terlihat. Sekarang keduanya memakai fungsi ini, jadi
   * menyorot pilihan di satu grup selalu menyorot pilihan yang sama di grup lain.
   * Ketuk pilihan yang sama = membatalkan pilihan (perilaku daftar panjang yang
   * sudah berlaku sejak awal).
   */
  const chooseResponse = (id: string) => setResponseTag(responseTag === id ? undefined : id);

  return (
    <div className="px-4 space-y-4">

      {/* Quick Presets — isi cepat kualitas respons (tidak menyentuh kolom
          "Fokus perbaikan"; hapus otomatis isian pengguna dihapus di sini
          karena itu kehilangan data tanpa peringatan — audit C-04) */}
      <div>
        <label className="label" id="cs-isi-cepat">⚡ Isi cepat (respons) <span className="text-[var(--ink-muted)] font-normal text-xs">(pilih satu)</span></label>
        <div className="flex flex-wrap gap-2">
          {/* C-03: tiga tombol ini satu grup pilihan (radio), bukan tiga aksi
              lepas — dan "Kosongkan" sengaja di LUAR grup karena ia bukan
              pilihan respons. */}
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="cs-isi-cepat">
          <button type="button" role="radio" aria-checked={responseTag === "correct-independent"}
            onClick={() => chooseResponse("correct-independent")}
            className={`px-3 py-2 rounded-full text-sm font-semibold border transition-colors ${
              responseTag === "correct-independent"
                ? "bg-[var(--bg-success-strong)] text-[var(--on-strong)] border-[var(--border-success)]"
                : "bg-[var(--bg-success)] text-[var(--ink-success)] border-[var(--border-success)] hover:bg-[var(--bg-success)]"}`}>
             Lancar
          </button>
          <button type="button" role="radio" aria-checked={responseTag === "partial-correct"}
            onClick={() => chooseResponse("partial-correct")}
            className={`px-3 py-2 rounded-full text-sm font-semibold border transition-colors ${
              responseTag === "partial-correct"
                ? "bg-[var(--bg-warn-strong)] text-[var(--on-strong)] border-[var(--border-warn)]"
                : "bg-[var(--bg-warn)] text-[var(--ink-warn)] border-[var(--border-warn)] hover:bg-[var(--bg-warn)]"}`}>
             Butuh Latihan
          </button>
          <button type="button" role="radio" aria-checked={responseTag === "misconception"}
            onClick={() => chooseResponse("misconception")}
            className={`px-3 py-2 rounded-full text-sm font-semibold border transition-colors ${
              responseTag === "misconception"
                ? "bg-[var(--bg-danger-strong)] text-[var(--on-strong)] border-[var(--ink-danger)]"
                : "bg-[var(--bg-danger)] text-[var(--ink-danger)] border-[var(--border-danger)] hover:bg-[var(--bg-danger)]"}`}>
             Miskonsepsi
          </button>
          </div>
          <button type="button"
            onClick={() => { setResponseTag(undefined); setNeedsWork(""); }}
            className="px-3 py-2 rounded-full text-sm font-semibold bg-[var(--surface-strong)] text-[var(--ink-muted)] border border-[var(--border)] hover:bg-[var(--surface)] transition-colors">
            <RefreshIcon size={13} className="mr-1 inline align-[-2px]" /> Kosongkan
          </button>
        </div>
        <p className="text-xs text-[var(--ink-muted)] mt-2">
          “Kosongkan” menghapus pilihan respons sekaligus isi kolom Fokus perbaikan.
        </p>
      </div>

      {/* Kualitas Respons Akademik — satu grup pilihan (C-03). Tiga blok di
          dalamnya hanya pengelompokan visual; pilihannya tetap satu grup, jadi
          `role="radiogroup"` dipasang di wadah ini (bukan di tiap blok). */}
      <div>
        <label className="label" id="cs-kualitas-respons">🎓 Kualitas Respons Akademik <span className="text-[var(--ink-muted)] font-normal text-xs">(pilih satu)</span></label>
        <div className="space-y-3 mt-2" role="radiogroup" aria-labelledby="cs-kualitas-respons">
          {/* ── Pemahaman Baik ── */}
          <div>
            <p className="text-xs font-semibold text-[var(--ink-success)] uppercase tracking-wide mb-1.5">✨ Pemahaman Baik</p>
            <div className="flex flex-wrap gap-1.5">
              {RESPONSE_TAGS.filter(t => ["correct-independent","correct-with-prompt","can-explain-orally","transfer-attempt","metacognitive"].includes(t.id)).map((tag) => {
                const score = tag.id === "correct-independent" ? "+2" : "+1";
                return (
                  <button data-emoji-vocab="affect" key={tag.id} type="button" role="radio" aria-checked={responseTag === tag.id}
                    onClick={() => chooseResponse(tag.id)}
                    className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      responseTag === tag.id
                        ? "bg-[var(--bg-success-strong)] text-[var(--on-strong)] border-[var(--border-success)] shadow-sm"
                        : "bg-[var(--surface-strong)] text-[var(--ink-strong)] border-[var(--border)] hover:border-[var(--border-success)] hover:bg-[var(--bg-success)]"}`}>
                    <span>{tag.icon}</span> {tag.label}
                    <span className={`ml-0.5 text-xs font-bold rounded px-1 ${responseTag === tag.id ? "bg-[var(--bg-success-strong)] text-[var(--ink-success)]" : "bg-[var(--bg-success)] text-[var(--ink-success)]"}`}>{score}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Perlu Pendalaman ── */}
          <div>
            <p className="text-xs font-semibold text-[var(--ink-warn)] uppercase tracking-wide mb-1.5">📊 Perlu Pendalaman</p>
            <div className="flex flex-wrap gap-1.5">
              {RESPONSE_TAGS.filter(t => ["partial-correct","can-do-procedurally","guessing"].includes(t.id)).map((tag) => {
                const score = tag.id === "guessing" ? "−1" : "0";
                return (
                  <button data-emoji-vocab="affect" key={tag.id} type="button" role="radio" aria-checked={responseTag === tag.id}
                    onClick={() => chooseResponse(tag.id)}
                    className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      responseTag === tag.id
                        ? "bg-[var(--bg-warn-strong)] text-[var(--on-strong)] border-[var(--border-warn)] shadow-sm"
                        : "bg-[var(--surface-strong)] text-[var(--ink-strong)] border-[var(--border)] hover:border-[var(--border-warn)] hover:bg-[var(--bg-warn)]"}`}>
                    <span>{tag.icon}</span> {tag.label}
                    <span className={`ml-0.5 text-xs font-bold rounded px-1 ${responseTag === tag.id ? "bg-[var(--bg-warn-strong)] text-[var(--ink-warn)]" : "bg-[var(--bg-warn)] text-[var(--ink-warn)]"}`}>{score}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Perlu Perhatian ── */}
          <div>
            <p className="text-xs font-semibold text-[var(--ink-danger)] uppercase tracking-wide mb-1.5">⚠️ Respons Perlu Perhatian</p>
            <div className="flex flex-wrap gap-1.5">
              {RESPONSE_TAGS.filter(t => ["misconception","prerequisite-gap"].includes(t.id)).map((tag) => {
                return (
                  <button data-emoji-vocab="affect" key={tag.id} type="button" role="radio" aria-checked={responseTag === tag.id}
                    onClick={() => chooseResponse(tag.id)}
                    className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      responseTag === tag.id
                        ? "bg-[var(--bg-danger-strong)] text-[var(--on-strong)] border-[var(--ink-danger)] shadow-sm"
                        : "bg-[var(--surface-strong)] text-[var(--ink-strong)] border-[var(--border)] hover:border-[var(--border-danger)] hover:bg-[var(--bg-danger)]"}`}>
                    <span>{tag.icon}</span> {tag.label}
                    <span className={`ml-0.5 text-xs font-bold rounded px-1 ${responseTag === tag.id ? "bg-[var(--bg-danger-strong)] text-[var(--ink-danger)]" : "bg-[var(--bg-danger)] text-[var(--ink-danger)]"}`}>−2</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected tag description */}
          {responseTag && (() => {
            const tag = RESPONSE_TAGS.find(t => t.id === responseTag);
            if (!tag) return null;
            return (
              <div className="bg-[var(--brand-tint)] border border-[var(--brand-tint-strong)] rounded-xl px-3.5 py-2.5">
                <p className="text-xs text-[var(--ink-strong)] leading-relaxed">
                  <span className="font-semibold">{tag.icon} {tag.label}:</span> {tag.description}
                </p>
                <p className="text-xs text-[var(--ink-brand)] mt-1">
                  💡 {tag.teacherNote}
                </p>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Fokus perbaikan — jadi bahan follow-up saat nilai akhir keluar */}
      <div>
        <label htmlFor="cs-perhatian" className="label">🎯 Fokus Perbaikan Berikutnya</label>
        <input id="cs-perhatian" className="input" maxLength={150} placeholder="mis. ketelitian angka, time management" value={needsWork}
          onChange={(e) => setNeedsWork(e.target.value)} />
      </div>

      {/* ══ Skor akhir (audit P2 #14) ══
          Pindah ke sini dari langkah 3 supaya angka yang dilihat tutor adalah
          angka yang benar-benar disimpan — kualitas respons akademik (di atas)
          ikut menentukan skor. */}
      <div className="rounded-2xl border border-[var(--border)] p-4">
        <p className="text-xs font-bold text-[var(--ink-muted)] uppercase tracking-wide mb-2">Skor sesi</p>
        {engScoreInfo ? (
          /* C-10 (2026-10-05): donat SVG buatan sendiri diganti `ProgressBar`
             bersama. Alasannya bukan selera: angka donat lama dihitung dengan
             `(skor/10) * 100 * 0,879` — campuran persen dan keliling lingkaran
             yang tidak bisa dibaca siapa pun tanpa menghitung 2πr, dan gambarnya
             tidak punya nama untuk pembaca layar. Rona kartu + warna kata band
             tetap dari `scoreLabel()` (satu sumber, dijaga
             `engagementContrast.test.ts`), sedangkan bar-nya memakai token. */
          <div className="rounded-xl p-3" style={{ background: engScoreInfo.bg }}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-bold text-base" style={{ color: engScoreInfo.color }}>{engScoreInfo.text}</p>
              <p className="text-sm font-black" style={{ color: engScoreInfo.color }}>
                {engScore}<span className="text-xs font-bold">/10</span>
              </p>
            </div>
            <div className="mt-2">
              <ProgressBar
                value={engScore}
                max={10}
                size="sm"
                label="Keterlibatan"
                showPercent={false}
                tone="red"
                thresholds={SCORE_TONE_THRESHOLDS}
              />
            </div>
            <p className="text-xs mt-1.5" style={{ color: engScoreInfo.color }}>
              Dasar 5/10 · kelengkapan data: {scoreBasisLabel(engBasis)}.
            </p>
          </div>
        ) : (
          <p className="text-xs text-[var(--ink-muted)]">
            Belum ada pengamatan pada sesi ini, jadi <span className="font-semibold">skor tidak dihitung</span> —
            sesi ini tidak akan masuk rata-rata keseriusan belajar. Kondisi yang tercatat (mis. “Seperti biasa”)
            tetap tersimpan sebagai fakta.
          </p>
        )}
      </div>

    </div>
  );
}
