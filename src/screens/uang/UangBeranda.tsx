/**
 * Layar Uang — satu layar dengan TIGA blok tetap.
 *
 * Sebelumnya `/payments` memecah keuangan menjadi empat tab, sehingga tutor
 * harus tahu lebih dulu ke tab mana ia harus pergi. Blok di sini disusun
 * menurut pertanyaan yang benar-benar muncul saat bekerja:
 *
 *   1. ✦ RINGKASAN AI   — apa yang terjadi bulan ini, dalam satu kalimat.
 *   2. PERLU DITAGIH    — apa yang harus saya kerjakan sekarang.
 *   3. BULAN INI        — berapa uang yang benar-benar bergerak.
 *
 * Blok keempat sengaja tidak ditambahkan: isi yang tidak muat tinggal di
 * sub-layar yang dibuka dari baris pintasan. Seluruh rincian lama (analitik,
 * filter tagihan, pengeluaran, rekap tahunan) tetap ada di balik pintasan itu,
 * jadi tidak ada kemampuan yang hilang.
 *
 * Angka di layar ini datang dari `financeRows`/`financeOverview` (aturan murni),
 * bukan dari AI. AiCostModal dan jalur AI-nya hidup di sub-layar analitik.
 */
import { barisMenungguTindakan, ringkasTindakan, type BarisTagihan } from "../../lib/financeRows";
import type { FinanceOverview } from "../../lib/financeOverview";
import { monthLabel } from "../../lib/format";
import MaskedMoney from "../../components/ui/MaskedMoney";

interface UangBerandaProps {
  month: string;
  rows: readonly BarisTagihan[];
  overview: FinanceOverview;
  onBukaSub: (tab: "ringkasan" | "tagihan" | "pengeluaran" | "rekap") => void;
}

/** Label manusia untuk keadaan baris — status DB mentah tidak pernah tampil. */
const KEADAAN_LABEL: Record<BarisTagihan["keadaan"], string> = {
  lewat: "Terlambat",
  "siap-ditagih": "Siap ditagih",
  terkirim: "Terkirim",
  lunas: "Lunas",
};

function KelasKeadaan(keadaan: BarisTagihan["keadaan"]): string {
  if (keadaan === "lewat") return "bg-[var(--bg-danger)] text-[var(--ink-danger)]";
  if (keadaan === "siap-ditagih") return "bg-[var(--brand-tint)] text-[var(--ink-brand)]";
  if (keadaan === "lunas") return "bg-[var(--bg-success)] text-[var(--ink-success)]";
  return "bg-[var(--bg-warn)] text-[var(--ink-warn)]";
}

/**
 * Satu baris tagihan: nama, mekanisme (`mode` + `cakupan`), nominal, keadaan,
 * dan SATU aksi utama. Aksi diambil dari `baris.aksi` — tidak ada logika
 * keputusan di komponen ini.
 */
function BarisTagihanRingkas({
  baris, onBuka,
}: {
  baris: BarisTagihan;
  onBuka: (tab: "ringkasan" | "tagihan" | "pengeluaran" | "rekap") => void;
}) {
  const aksiUtama = baris.aksi.includes("terbitkan")
    ? "Terbitkan"
    : baris.aksi.includes("kirim-wa")
      ? "Tagih"
      : "Lihat";

  return (
    <li className="flex items-center gap-3 py-2">
      <button
        type="button"
        onClick={() => onBuka("tagihan")}
        className="min-w-0 flex-1 text-left transition-colors hover:opacity-80"
      >
        <span className="flex items-baseline justify-between gap-2">
          <span className="min-w-0 truncate text-sm font-semibold text-[var(--ink-strong)]">{baris.studentName}</span>
          <MaskedMoney amount={baris.amount} className="shrink-0 text-sm font-bold text-[var(--ink-strong)]" />
        </span>
        <span className="mt-0.5 block truncate text-xs text-[var(--ink-muted)]">
          {baris.mode} · {baris.cakupan}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className={`rounded px-1.5 py-0.5 text-[13px] font-bold ${KelasKeadaan(baris.keadaan)}`}>
            {KEADAAN_LABEL[baris.keadaan]}
          </span>
          {baris.keadaan === "lewat" && baris.umurHari !== undefined && (
            <span className="text-xs font-semibold text-[var(--ink-danger)]">Terlambat {baris.umurHari} hari</span>
          )}
        </span>
      </button>
      <button
        type="button"
        onClick={() => onBuka("tagihan")}
        className="inline-flex min-h-[44px] shrink-0 items-center rounded-[var(--radius-card)] bg-[var(--brand-solid)] px-3 text-caption font-semibold text-[var(--on-strong)] transition-colors hover:bg-[var(--brand-solid)]"
      >
        {aksiUtama}
      </button>
    </li>
  );
}

export default function UangBeranda({ month, rows, overview, onBukaSub }: UangBerandaProps) {
  // Layar ini HANYA memuat pekerjaan yang menunggu tindakan. Keputusan pemilik
  // 2026-10-07: invoice yang sudah lunas bukan tagihan melainkan riwayat
  // transaksi, jadi ia tidak boleh ikut dihitung maupun ikut tampil di sini —
  // riwayatnya hidup di halaman murid. `barisMenungguTindakan` sudah disortir
  // paling mendesak lebih dulu dan membuang baris `riwayat`.
  const menunggu = barisMenungguTindakan(rows);
  const prioritas = menunggu.slice(0, 3);
  const sisanya = menunggu.slice(3);
  const totalSisa = sisanya.reduce((sum, row) => sum + row.amount, 0);
  const jumlah = ringkasTindakan(rows);
  // Kalimatnya menyebut jenis pekerjaannya, bukan sekadar "N tagihan" — angka
  // yang tidak menjelaskan pekerjaan apa yang harus dilakukan tidak berguna.
  const rincianJumlah = [
    jumlah.terbitkan > 0 && `${jumlah.terbitkan} siap diterbitkan`,
    jumlah.finalkan > 0 && `${jumlah.finalkan} laporan perlu disahkan`,
    jumlah.tagih > 0 && `${jumlah.tagih} belum dibayar`,
  ].filter(Boolean).join(" · ");

  return (
    <div className="space-y-4">
      {/* ── Blok 1 — Ringkasan AI (padanan lokal selalu tersedia) ── */}
      <section
        aria-labelledby="uang-ringkasan-title"
        className="rounded-2xl border border-[var(--border-accent)] bg-[var(--accent-tint)]/50 p-4 shadow-sm"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--ink-accent)]">✦ Ringkasan AI</p>
            <h2 id="uang-ringkasan-title" className="text-base font-bold text-[var(--ink-accent)]">
              Yang terjadi di {monthLabel(month)}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onBukaSub("ringkasan")}
            className="inline-flex min-h-[44px] shrink-0 items-center rounded-[var(--radius-card)] border border-[var(--border-accent)] bg-[var(--surface-strong)] px-3 text-caption font-semibold text-[var(--ink-accent)] transition-colors hover:bg-[var(--accent-tint)]"
          >
            Analitik lengkap ▸
          </button>
        </div>

        <p className="mt-2 text-sm leading-relaxed text-[var(--ink-strong)]">{overview.ringkasLokal}</p>

        {overview.sorotan.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {overview.sorotan.map((s) => (
              <li
                key={`${s.kode}-${s.teks}`}
                className="rounded-lg bg-[var(--surface-strong)]/90 px-2.5 py-1.5 text-xs leading-relaxed text-[var(--ink-accent)]"
              >
                {s.teks}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-2 text-xs leading-relaxed text-[var(--ink-muted)]">
          Ringkasan lokal dipakai — AI tidak dijalankan. Angka dihitung aturan, bukan AI.
        </p>
      </section>

      {/* ── Blok 2 — Perlu ditindaklanjuti (maks 3 baris teratas) ── */}
      <section
        aria-labelledby="uang-tagih-title"
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-4 shadow-sm"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--ink-muted)]">Perlu ditindaklanjuti</p>
            <h2 id="uang-tagih-title" className="text-base font-bold text-[var(--ink-strong)]">
              {prioritas.length === 0
                ? "Tidak ada yang menunggu"
                : `${menunggu.length} pekerjaan menunggu`}
            </h2>
            {rincianJumlah && (
              <p className="mt-0.5 text-xs text-[var(--ink-muted)]">{rincianJumlah}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onBukaSub("tagihan")}
            className="inline-flex min-h-[44px] shrink-0 items-center rounded-[var(--radius-card)] bg-[var(--brand-solid)] px-3 text-caption font-semibold text-[var(--on-strong)] transition-colors hover:bg-[var(--brand-solid)]"
          >
            Buka daftar tagihan ▸
          </button>
        </div>

        {prioritas.length === 0 ? (
          <p className="mt-2 rounded-lg bg-[var(--bg-success)] px-3 py-2 text-xs text-[var(--ink-success)]">
            Semua tagihan sudah lunas. Tidak ada yang perlu ditindaklanjuti.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-[var(--border)]">
            {prioritas.map((baris) => (
              <BarisTagihanRingkas key={baris.key} baris={baris} onBuka={onBukaSub} />
            ))}
          </ul>
        )}

        {sisanya.length > 0 && (
          <button
            type="button"
            onClick={() => onBukaSub("tagihan")}
            className="mt-2 flex w-full items-center justify-between rounded-lg bg-[var(--surface)] px-3 py-2.5 text-left text-xs font-semibold text-[var(--ink-muted)] transition-colors hover:bg-[var(--bg-subtle)]"
          >
            <span>{sisanya.length} pekerjaan lain</span>
            <span className="flex items-center gap-2">
              <MaskedMoney amount={totalSisa} className="text-[var(--ink-strong)]" hideUnlock />
              <span aria-hidden="true">▸</span>
            </span>
          </button>
        )}
      </section>

      {/* ── Blok 3 — Bulan ini (kas) + tiga pintasan ── */}
      <section
        aria-labelledby="uang-bulan-title"
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-4 shadow-sm"
      >
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--ink-muted)]">Bulan ini</p>
        <h2 id="uang-bulan-title" className="text-base font-bold text-[var(--ink-strong)]">
          Uang yang benar-benar bergerak · {monthLabel(month)}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-[var(--ink-muted)]">
          Dihitung dari tanggal transfer diterima, bukan tanggal les.
        </p>

        <dl className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-[var(--surface)] px-2.5 py-2">
            <dt className="text-[13px] font-semibold uppercase tracking-wide text-[var(--ink-success)]">Masuk</dt>
            <dd className="mt-0.5"><MaskedMoney amount={overview.masuk} variant="block" className="text-sm font-bold text-[var(--ink-success)]" /></dd>
          </div>
          <div className="rounded-xl bg-[var(--surface)] px-2.5 py-2">
            <dt className="text-[13px] font-semibold uppercase tracking-wide text-[var(--ink-danger)]">Keluar</dt>
            <dd className="mt-0.5"><MaskedMoney amount={overview.keluar} variant="block" className="text-sm font-bold text-[var(--ink-danger)]" /></dd>
          </div>
          <div className="rounded-xl bg-[var(--surface)] px-2.5 py-2">
            <dt className="text-[13px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">Sisa</dt>
            <dd className="mt-0.5">
              <MaskedMoney
                amount={overview.sisa}
                variant="block"
                className={`text-sm font-bold ${overview.sisa >= 0 ? "text-[var(--ink-success)]" : "text-[var(--ink-danger)]"}`}
              />
            </dd>
          </div>
        </dl>

        <ul className="mt-3 divide-y divide-[var(--border)] border-t border-[var(--border)]">
          <li>
            <button type="button" onClick={() => onBukaSub("tagihan")} className="flex min-h-[44px] w-full items-center justify-between gap-2 py-2 text-left text-sm text-[var(--ink-strong)] transition-colors hover:bg-[var(--surface)]">
              <span>Rincian tagihan</span>
              <span className="flex items-center gap-2 text-xs text-[var(--ink-muted)]">
                {overview.jumlahBelumDitagih > 0 ? `${overview.jumlahBelumDitagih} siap ditagih` : "tidak ada tunggakan"}
                <span aria-hidden="true">▸</span>
              </span>
            </button>
          </li>
          <li>
            <button type="button" onClick={() => onBukaSub("pengeluaran")} className="flex min-h-[44px] w-full items-center justify-between gap-2 py-2 text-left text-sm text-[var(--ink-strong)] transition-colors hover:bg-[var(--surface)]">
              <span>Pengeluaran</span>
              <span className="flex items-center gap-2 text-xs text-[var(--ink-muted)]">
                <MaskedMoney amount={overview.keluar} hideUnlock />
                <span aria-hidden="true">▸</span>
              </span>
            </button>
          </li>
          <li>
            <button type="button" onClick={() => onBukaSub("rekap")} className="flex min-h-[44px] w-full items-center justify-between gap-2 py-2 text-left text-sm text-[var(--ink-strong)] transition-colors hover:bg-[var(--surface)]">
              <span>Rekap tahunan</span>
              <span className="text-xs text-[var(--ink-muted)]">12 bulan <span aria-hidden="true">▸</span></span>
            </button>
          </li>
        </ul>

        {/* Catatan sisa kas vs laba akrual. Sebelumnya kalimat ini memuat tautan
            `Rekap tahunan` di tengah teks; tautan sebaris terukur 84x16 px dan
            gagal penjaga "kontrol interaktif < 24 px" (2026-10-07). Tautannya
            sudah punya barisnya sendiri di atas, jadi di sini cukup kalimatnya. */}
        <p className="mt-3 border-t border-[var(--border)] pt-2 text-xs leading-relaxed text-[var(--ink-muted)]">
          Sisa kas berbeda dari laba akrual: tagihan yang belum tertagih sudah dihitung sebagai pendapatan, tetapi
          belum masuk rekening.
        </p>
      </section>
    </div>
  );
}
