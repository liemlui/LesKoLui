/**
 * Papan pipeline per murid — jalur kartu + daftar tahap yang sedang difokuskan.
 *
 * **Sejarah singkat.** Papan ini dulu satu daftar panjang "perlu tindakan" yang
 * mengurut murid menurut kedaruratan. Masalahnya: tutor tidak bisa melihat
 * *sebaran* pekerjaan (berapa yang siap diterbitkan, berapa yang menunggu
 * dibayar), dan satu daftar panjang menyembunyikan bahwa mayoritas murid
 * sebenarnya sudah beres. Ia juga tidak punya bentuk yang berguna di layar
 * sempit selain menggulir.
 *
 * **Bentuknya sekarang (G3-03).** Jalur kartu yang bisa digeser per tahap, lalu
 * daftar baris untuk tahap yang sedang difokuskan. Kartu berlebar 78% supaya
 * kartu berikutnya tetap mengintip di sisi kanan — itu isyarat bahwa jalurnya
 * bisa digeser, tanpa perlu tombol panah. Lebarnya sengaja **bukan** 100%: pada
 * 412 px ruang efektifnya sekitar 382 px, dan lima kolom sejajar tidak akan
 * terbaca.
 *
 * **Yang tidak dipakai:** pustaka seret-dan-lepas. Tidak ada di repo, dan seret
 * bawaan peramban tidak andal di layar sentuh. Semua perpindahan lewat ketukan.
 *
 * Papan ini **read-only**: aksinya membuka layar tempat pekerjaan itu benar-benar
 * dikerjakan (Laporan atau sub-layar Tagihan), bukan mengerjakannya di sini.
 */
import { useMemo, useState } from "react";
import { billingPolicyOf } from "../../db/types";
import type { ReportDisplayStatus } from "../../db/types";
import { formatRupiah, monthLabel } from "../../lib/format";
import MaskedMoney from "../../components/ui/MaskedMoney";
import type { PipelineNextAction, StudentPipelineRow } from "../../lib/financePipeline";

interface Props {
  rows: StudentPipelineRow[];
  month: string;
  navigate: (to: string) => void;
  /** Ringkasan teks keadaan bulan ini (opsional). */
  summary?: string;
}

const POLICY_LABEL: Record<string, string> = {
  monthly: "Bulanan",
  session_count: "Paket",
  manual: "Manual",
};

/** Tahap papan. Urutannya adalah urutan pekerjaan, bukan urutan abjad. */
type Tahap = "siap-ditagih" | "diterbitkan" | "belum-lunas" | "laporan" | "selesai";

const TAHAP_META: Record<Tahap, { label: string; singkat: string }> = {
  "siap-ditagih": { label: "Siap ditagih", singkat: "Siap ditagih" },
  diterbitkan: { label: "Sudah diterbitkan", singkat: "Diterbitkan" },
  "belum-lunas": { label: "Belum dibayar", singkat: "Belum dibayar" },
  laporan: { label: "Perlu laporan", singkat: "Laporan" },
  selesai: { label: "Sudah selesai", singkat: "Selesai" },
};

/** Urutan tampil jalur: yang paling menuntut tindakan lebih dulu. */
const URUTAN_TAHAP: Tahap[] = ["belum-lunas", "siap-ditagih", "laporan", "diterbitkan", "selesai"];

/**
 * Pemetaan kemampuan papan lama → tahap baru. Enam aksi pipeline lama tetap ada,
 * tidak satu pun hilang: `create-report` dan `confirm-report` jatuh ke tahap
 * "Perlu laporan", `create-invoice` ke "Siap ditagih", `send-wa` dan `mark-paid`
 * ke "Belum dibayar", `share-report` ke "Sudah selesai".
 *
 * Urutan pemeriksaan penting: **draf laporan diperiksa sebelum "beres"**. Kalau
 * tidak, murid yang laporannya masih draf akan tampil sebagai "Sudah diterbitkan"
 * dan papan diam soal pekerjaan yang sebenarnya menunggu.
 */
function tahapDari(row: StudentPipelineRow): Tahap {
  switch (row.nextAction) {
    case "create-invoice":
      return "siap-ditagih";
    case "send-wa":
    case "mark-paid":
      return "belum-lunas";
    case "create-report":
    case "confirm-report":
    case "share-report":
      return "laporan";
    default:
      break;
  }
  if (row.unpaidAmount > 0 || row.unpaidCount > 0) return "belum-lunas";
  if (row.draftReportCount > 0) return "laporan";
  if (row.paidAmount > 0 || row.hasConfirmedReport) return "selesai";
  return "diterbitkan";
}

/**
 * Satu tombol utama per baris, dengan kata kerja yang menyebut pekerjaannya.
 * `create-report` dan `confirm-report` tetap ke halaman Laporan karena di sana
 * laporan benar-benar disunting; sisanya ke sub-layar Tagihan.
 */
const ACTION: Record<Exclude<PipelineNextAction, null>, { label: string; route: string }> = {
  "create-report": { label: "Buat laporan", route: "/report?studentId=" },
  "confirm-report": { label: "Periksa & finalkan laporan", route: "/report?studentId=" },
  "create-invoice": { label: "Terbitkan invoice", route: "/payments?tab=tagihan&studentId=" },
  "send-wa": { label: "Kirim pengingat WA", route: "/payments?tab=tagihan&studentId=" },
  "mark-paid": { label: "Tandai lunas", route: "/payments?tab=tagihan&studentId=" },
  "share-report": { label: "Bagikan laporan", route: "/report?studentId=" },
};

const REPORT_LABEL: Record<ReportDisplayStatus, string> = {
  draft: "Draft laporan",
  final: "Laporan final",
  shared: "Laporan dibagikan",
};

/** Umur piutang dalam bulan, dihitung dari bulan anchor invoice terakhir. */
function umurBulanAntara(dari: string, sampai: string): number {
  const [ay, am] = dari.split("-").map(Number);
  const [by, bm] = sampai.split("-").map(Number);
  if (!ay || !by) return 0;
  return Math.max(0, (by - ay) * 12 + (bm - am));
}

/** Umur piutang baris ini dalam bulan; 0 = belum ada piutang lama. */
function umurPiutang(row: StudentPipelineRow, month: string): number {
  if (row.unpaidAmount <= 0) return 0;
  const bulanTertua = row.invoice?.month ?? month;
  return umurBulanAntara(bulanTertua, month);
}

/** Satu kalimat keadaan yang menggantikan empat chip status yang saling mengulang. */
function stateSentence(row: StudentPipelineRow): string {
  const parts: string[] = [];
  parts.push(row.sessionCount > 0 ? `${row.sessionCount} pertemuan` : "Belum ada pertemuan");
  parts.push(row.reportDisplayStatus ? REPORT_LABEL[row.reportDisplayStatus].toLowerCase() : "belum ada laporan");
  if (row.unpaidAmount > 0) parts.push(`${formatRupiah(row.unpaidAmount)} belum dibayar`);
  else if (row.paidAmount > 0) parts.push("sudah lunas");
  return parts.join(" · ");
}

const KELAS_TAHAP: Record<Tahap, string> = {
  "belum-lunas": "bg-[var(--bg-warn)] text-[var(--ink-warn)]",
  "siap-ditagih": "bg-[var(--brand-tint)] text-[var(--ink-brand)]",
  laporan: "bg-[var(--accent-tint)] text-[var(--ink-accent)]",
  diterbitkan: "bg-[var(--surface-soft)] text-[var(--text-muted)]",
  selesai: "bg-[var(--bg-success)] text-[var(--ink-success)]",
};

/** Kartu hidup: tahap, nominal yang bisa disamarkan, umur piutang, satu aksi. */
function KartuMurid({
  row, month, navigate, aktif,
}: {
  row: StudentPipelineRow;
  month: string;
  navigate: (to: string) => void;
  aktif: boolean;
}) {
  const tahap = tahapDari(row);
  const umur = umurPiutang(row, month);
  const nominal = row.unpaidAmount > 0 ? row.unpaidAmount : row.potential;
  const aksi = row.nextAction ? ACTION[row.nextAction] : null;

  return (
    <article
      aria-label={`${row.student.name} — ${TAHAP_META[tahap].label}`}
      aria-current={aktif ? "true" : undefined}
      className={`snap-start shrink-0 w-[78%] rounded-2xl border p-3 shadow-sm ${
        aktif
          ? "border-[var(--border-brand)] bg-[var(--surface-strong)]"
          : "border-[var(--border)] bg-[var(--surface-strong)]/70"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-bold text-[var(--ink-strong)]">{row.student.name}</p>
        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[13px] font-bold ${KELAS_TAHAP[tahap]}`}>
          {TAHAP_META[tahap].singkat}
        </span>
      </div>

      <p className="mt-1.5 text-lg font-bold text-[var(--ink-strong)]">
        {nominal > 0 ? <MaskedMoney amount={nominal} /> : <span className="text-[var(--ink-muted)]">Tanpa nominal</span>}
      </p>

      <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
        {POLICY_LABEL[billingPolicyOf(row.student)] ?? "—"}
        {umur > 0 && (
          <>
            {" · "}
            <span className="font-semibold text-[var(--ink-danger)]">
              belum dibayar {umur} bulan
            </span>
          </>
        )}
      </p>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {/* Aksi utama. Kalau baris ini tidak punya langkah pipeline, tombolnya
            tetap ada dan mengarah ke tempat pekerjaannya diperiksa — kartu tanpa
            tombol membuat papan tampak buntu padahal ada yang bisa dibuka. */}
        <button
          type="button"
          onClick={() => navigate(aksi ? aksi.route + row.student.id : `/students/${row.student.id}`)}
          className={`inline-flex min-h-[44px] flex-1 items-center justify-center rounded-[var(--radius-card)] px-3 text-caption font-semibold transition-colors ${
            aksi
              ? "bg-[var(--brand-solid)] text-[var(--on-strong)]"
              : "border border-[var(--border)] text-[var(--ink-muted)] hover:bg-[var(--surface)]"
          }`}
        >
          {aksi ? aksi.label : "Periksa murid"}
        </button>
        {/* Menu tambahan: jalan masuk yang sama supaya papan tetap satu ketukan
            dari tempat pekerjaannya tanpa menduplikasi tombol aksi. */}
        <button
          type="button"
          onClick={() => navigate(`/students/${row.student.id}`)}
          aria-label={`Buka halaman murid ${row.student.name}`}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[var(--radius-card)] border border-[var(--border)] text-sm font-semibold text-[var(--ink-muted)] transition-colors hover:bg-[var(--surface)]"
        >
          ⋯
        </button>
      </div>
    </article>
  );
}

/** Daftar baris untuk tahap yang sedang difokuskan. */
function BarisTahap({
  row, month, navigate,
}: {
  row: StudentPipelineRow;
  month: string;
  navigate: (to: string) => void;
}) {
  const tahap = tahapDari(row);
  const umur = umurPiutang(row, month);
  const aksi = row.nextAction ? ACTION[row.nextAction] : null;

  return (
    <li className="flex items-center gap-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline justify-between gap-2">
          <span className="min-w-0 truncate text-sm font-semibold text-[var(--ink-strong)]">{row.student.name}</span>
          {row.unpaidAmount > 0 && <MaskedMoney amount={row.unpaidAmount} className="shrink-0 text-sm font-bold text-[var(--ink-warn)]" />}
        </p>
        <p className="mt-0.5 truncate text-xs text-[var(--ink-muted)]">
          <span className={`mr-1 rounded px-1 py-0.5 text-[12px] font-bold ${KELAS_TAHAP[tahap]}`}>{TAHAP_META[tahap].singkat}</span>
          {stateSentence(row)}
          {umur > 0 && <> · <span className="font-semibold text-[var(--ink-danger)]">{umur} bulan</span></>}
        </p>
      </div>
      {aksi && (
        <button
          type="button"
          onClick={() => navigate(aksi.route + row.student.id)}
          className="inline-flex min-h-[44px] shrink-0 items-center rounded-[var(--radius-card)] border border-[var(--border-accent)] px-3 text-caption font-semibold text-[var(--ink-accent)] transition-colors hover:bg-[var(--accent-tint)]"
        >
          {aksi.label}
        </button>
      )}
    </li>
  );
}

export default function FinancePipelineBoard({
  rows,
  month,
  navigate,
  summary,
}: Props) {
  const [tahapFokus, setTahapFokus] = useState<Tahap | null>(null);
  const [ringkas, setRingkas] = useState(false);
  const [hanyaPerluTindakan, setHanyaPerluTindakan] = useState(true);

  const perTahap = useMemo(() => {
    const peta = new Map<Tahap, StudentPipelineRow[]>();
    for (const tahap of URUTAN_TAHAP) peta.set(tahap, []);
    for (const row of rows) peta.get(tahapDari(row))!.push(row);
    return peta;
  }, [rows]);

  const tahapBerisi = URUTAN_TAHAP.filter((tahap) => (perTahap.get(tahap) ?? []).length > 0);
  const perluTindakan = rows.filter((row) => row.nextAction !== null);

  // Tahap yang sedang difokuskan: pilihan tutor, atau tahap pertama yang berisi.
  const fokusEfektif: Tahap | null = tahapFokus && (perTahap.get(tahapFokus) ?? []).length > 0
    ? tahapFokus
    : (tahapBerisi[0] ?? null);
  const barisFokus = fokusEfektif ? (perTahap.get(fokusEfektif) ?? []) : [];

  // Mode ringkas: tiga prioritas teratas saja, untuk dipakai saat tidak sedang menagih.
  const prioritasRingkas = useMemo(() => {
    const urutanPrioritas: PipelineNextAction[] = ["send-wa", "mark-paid", "create-invoice", "confirm-report", "create-report", "share-report"];
    return [...rows]
      .filter((row) => row.nextAction !== null)
      .sort((a, b) => {
        const ia = urutanPrioritas.indexOf(a.nextAction);
        const ib = urutanPrioritas.indexOf(b.nextAction);
        if (ia !== ib) return ia - ib;
        return b.unpaidAmount - a.unpaidAmount;
      })
      .slice(0, 3);
  }, [rows]);

  return (
    <section aria-labelledby="pipeline-title" className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--ink-muted)]">Status per murid</p>
          <h2 id="pipeline-title" className="text-base font-bold text-[var(--ink-strong)]">
            Sesi → Laporan → Tagihan → Lunas → Dibagikan
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-[var(--ink-muted)]">
            {summary ?? (perluTindakan.length === 0
              ? "Semua alur penagihan sinkron — tidak ada yang perlu ditindaklanjuti."
              : `${perluTindakan.length} murid perlu tindakan. Geser jalur untuk melihat tahap lain.`)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRingkas((v) => !v)}
          aria-pressed={ringkas}
          className="inline-flex min-h-[44px] shrink-0 items-center rounded-[var(--radius-card)] border border-[var(--border)] px-3 text-caption font-semibold text-[var(--ink-muted)] transition-colors hover:bg-[var(--surface)]"
        >
          {ringkas ? "Tampilkan papan" : "Mode ringkas"}
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg bg-[var(--surface)] px-3 py-2.5 text-xs text-[var(--ink-muted)]">
          Belum ada murid pada {monthLabel(month)}.
        </p>
      ) : ringkas ? (
        // ── Mode ringkas: tiga baris prioritas ──
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">Tiga prioritas</p>
          {prioritasRingkas.length === 0 ? (
            <p className="mt-2 rounded-lg bg-[var(--bg-success)] px-3 py-2.5 text-xs text-[var(--ink-success)]">
              Tidak ada yang perlu ditindaklanjuti pada {monthLabel(month)}.
            </p>
          ) : (
            <ul className="mt-1 divide-y divide-[var(--border)]">
              {prioritasRingkas.map((row) => (
                <BarisTahap key={row.student.id} row={row} month={month} navigate={navigate} />
              ))}
            </ul>
          )}
        </div>
      ) : (
        <>
          {/* ── Filter cerdas: chip tahap + tombol "perlu tindakan" ── */}
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Saring tahap pipeline">
            <button
              type="button"
              onClick={() => setHanyaPerluTindakan((v) => !v)}
              aria-pressed={hanyaPerluTindakan}
              className={`min-h-[36px] rounded-full px-2.5 text-caption font-semibold transition-colors ${
                hanyaPerluTindakan
                  ? "bg-[var(--brand-solid)] text-[var(--on-strong)]"
                  : "bg-[var(--surface)] text-[var(--ink-muted)] hover:bg-[var(--bg-subtle)]"
              }`}
            >
              Perlu tindakan
            </button>
            {tahapBerisi.map((tahap) => {
              const jumlah = (perTahap.get(tahap) ?? []).length;
              const aktif = fokusEfektif === tahap;
              return (
                <button
                  key={tahap}
                  type="button"
                  onClick={() => setTahapFokus(tahap)}
                  aria-pressed={aktif}
                  className={`min-h-[36px] rounded-full px-2.5 text-caption font-semibold transition-colors ${
                    aktif
                      ? "bg-[var(--brand-solid)] text-[var(--on-strong)]"
                      : `${KELAS_TAHAP[tahap]} hover:opacity-80`
                  }`}
                >
                  {TAHAP_META[tahap].singkat} · {jumlah}
                </button>
              );
            })}
          </div>

          {/* ── Jalur kartu: digeser per tahap, kartu 78% supaya sisanya mengintip ── */}
          <div
            className="mt-3 -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="group"
            aria-label="Jalur kartu per tahap"
          >
            {tahapBerisi.map((tahap) => {
              const barisTahap = perTahap.get(tahap) ?? [];
              return barisTahap.map((row) => (
                <KartuMurid
                  key={`${tahap}-${row.student.id}`}
                  row={row}
                  month={month}
                  navigate={navigate}
                  aktif={fokusEfektif === tahap}
                />
              ));
            })}
          </div>

          {/* ── Daftar baris untuk tahap yang sedang difokuskan ── */}
          {fokusEfektif && (
            <div className="mt-3 border-t border-[var(--border)] pt-2">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--ink-muted)]">
                  {TAHAP_META[fokusEfektif].label}
                </p>
                <p className="text-xs text-[var(--ink-muted)]">{barisFokus.length} murid</p>
              </div>

              {barisFokus.length === 0 ? (
                <p className="mt-2 rounded-lg bg-[var(--surface)] px-3 py-2 text-xs text-[var(--ink-muted)]">
                  Tidak ada murid pada tahap ini.
                </p>
              ) : fokusEfektif === "selesai" && hanyaPerluTindakan ? (
                <p className="mt-2 rounded-lg bg-[var(--bg-success)] px-3 py-2 text-xs text-[var(--ink-success)]">
                  {barisFokus.length} murid sudah selesai — tidak ada yang perlu ditindaklanjuti.
                </p>
              ) : (
                <ul className="mt-1 divide-y divide-[var(--border)]">
                  {barisFokus.map((row) => (
                    <BarisTahap key={row.student.id} row={row} month={month} navigate={navigate} />
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
