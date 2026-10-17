import { useCallback, useEffect, useState } from "react";
import Modal from "./Modal";
import { DEEPSEEK_MODEL, DEEPSEEK_PRICING_URL } from "../lib/aiConfig";
import {
  bandingkanTarif,
  perubahanTarifBerikutnya,
  resolvePeriod,
  tarifBasi,
  type ModelPricing,
  type PricingSnapshot,
} from "../lib/aiPricing";
import { fetchDeepSeekPricing, simpanTarif, tarifEfektif } from "../lib/aiPricingSource";
import {
  fetchKursUsdIdr,
  kursBasi,
  kursEfektif,
  simpanKurs,
  type KursSnapshot,
} from "../lib/aiKurs";

/**
 * Modal tarif AI — menampilkan tarif dan kurs yang **sedang berlaku**, menarik
 * keduanya dari sumber resmi masing-masing, dan menampilkan selisihnya sebelum
 * menimpa.
 *
 * **Kenapa tarif dan kurs ditarik bersama.** Keduanya mengalikan angka yang
 * sama: biaya rupiah = token × tarif USD × kurs. Memperbarui salah satu saja
 * menghasilkan angka yang tampak baru tetapi tetap salah, dan itulah yang
 * terjadi sampai 2026-10-18 (tarif dirawat, kurs ditanam Rp16.000 sementara
 * pasar 18.031).
 *
 * **Kenapa satu bisa berhasil sendirian.** Keduanya sumber berbeda dengan
 * kegagalan berbeda. Tarif berhasil + kurs gagal tetap berguna, asalkan
 * dikatakan terus terang bagian mana yang gagal — bukan dibatalkan semua.
 *
 * **Kenapa ada langkah "Terapkan".** Angka-angka ini menggerakkan taksiran
 * biaya dan (lewat `aiUsage`) batas belanja bulanan. `ATURAN-AI.md` §5 menuntut
 * angka yang menyentuh uang tidak berubah diam-diam.
 */

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | {
      kind: "preview";
      pricing?: PricingSnapshot;
      kurs?: KursSnapshot;
      warnings: string[];
      gagal: string[];
    }
  | { kind: "applied" }
  | { kind: "error"; message: string };

const POS: readonly [string, (m: ModelPricing) => { offPeak: number; peak: number }][] = [
  ["Cache hit", (m) => m.inputCacheHit],
  ["Cache miss", (m) => m.inputCacheMiss],
  ["Output", (m) => m.output],
];

const usd = (v: number) => `$${v.toFixed(4)}`;
const tanggal = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "—";

interface AiPricingModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AiPricingModal({ open, onClose }: AiPricingModalProps) {
  const [tarif, setTarif] = useState<PricingSnapshot>(() => tarifEfektif());
  const [kurs, setKurs] = useState<KursSnapshot>(() => kursEfektif());
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  // Segarkan saat dibuka: tarif bisa sudah diperbarui dari tab lain.
  useEffect(() => {
    if (!open) return;
    setTarif(tarifEfektif());
    setKurs(kursEfektif());
    setStatus({ kind: "idle" });
  }, [open]);

  const tarik = useCallback(async () => {
    setStatus({ kind: "loading" });
    const [harga, kursBaru] = await Promise.all([fetchDeepSeekPricing(), fetchKursUsdIdr()]);

    if (!harga.ok && !kursBaru.ok) {
      setStatus({ kind: "error", message: `tarif — ${harga.message}; kurs — ${kursBaru.message}` });
      return;
    }

    setStatus({
      kind: "preview",
      pricing: harga.ok ? harga.snapshot : undefined,
      kurs: kursBaru.ok ? kursBaru.snapshot : undefined,
      warnings: [...(harga.ok ? harga.warnings : []), ...(kursBaru.ok ? kursBaru.warnings : [])],
      gagal: [
        harga.ok ? null : `tarif — ${harga.message}`,
        kursBaru.ok ? null : `kurs — ${kursBaru.message}`,
      ].filter((x): x is string => x !== null),
    });
  }, []);

  const terapkan = useCallback(() => {
    if (status.kind !== "preview") return;
    if (status.pricing) {
      simpanTarif(status.pricing);
      setTarif(status.pricing);
    }
    if (status.kurs) {
      simpanKurs(status.kurs);
      setKurs(status.kurs);
    }
    setStatus({ kind: "applied" });
  }, [status]);

  if (!open) return null;

  const sekarang = new Date();
  const period = resolvePeriod(sekarang, tarif.peak);
  const ganti = perubahanTarifBerikutnya(sekarang, tarif.peak);

  const selisihTarif = status.kind === "preview" && status.pricing ? bandingkanTarif(tarif, status.pricing) : [];
  const kursBerubah = status.kind === "preview" && status.kurs ? status.kurs.usdIdr !== kurs.usdIdr : false;
  const jumlahPerubahan = selisihTarif.length + (kursBerubah ? 1 : 0);

  return (
    <Modal onClose={onClose} ariaLabel="Tarif AI DeepSeek">
      <h3 className="font-bold text-base">Tarif AI — DeepSeek</h3>

      {/* Tarif yang berlaku sekarang. */}
      <div className="rounded-xl border border-[var(--border)] p-3 space-y-1">
        <p className="text-xs font-semibold text-[var(--ink-strong)]">
          Berlaku sekarang:{" "}
          <span className="text-[var(--ink-brand)]">{period === "peak" ? "peak" : "off-peak"}</span>
          {" · "}berganti {tanggal(ganti.toISOString())}
        </p>
        <p className="text-xs text-[var(--ink-muted)]">
          {tarif.provenance === "default-embedded"
            ? `Tarif bawaan, dicocokkan dengan dokumentasi ${tarif.verifiedAt}`
            : `Ditarik dari dokumentasi ${tanggal(tarif.fetchedAt)}`}
        </p>
        {tarifBasi(tarif, sekarang) && (
          <p className="text-xs text-[var(--ink-danger)]">
            Tarif tersimpan sudah lebih dari 90 hari. Sebaiknya perbarui.
          </p>
        )}

        <table className="w-full text-xs mt-1">
          <thead>
            <tr className="text-[var(--ink-muted)]">
              <th className="text-left font-medium">Pos</th>
              <th className="text-right font-medium">Off-peak</th>
              <th className="text-right font-medium">Peak</th>
            </tr>
          </thead>
          {Object.values(tarif.models).map((m) => (
            <tbody key={m.model}>
              <tr>
                <th scope="colgroup" colSpan={3} className="pt-2 text-left font-mono text-[var(--ink-strong)]">
                  {m.model}
                  {m.model === DEEPSEEK_MODEL && (
                    <span className="ml-1 font-sans text-[var(--ink-brand)]">(dipakai)</span>
                  )}
                </th>
              </tr>
              {POS.map(([label, ambil]) => {
                const r = ambil(m);
                return (
                  <tr key={label} className="text-[var(--ink-strong)]">
                    <td className="text-[var(--ink-muted)]">{label}</td>
                    <td className="text-right">{usd(r.offPeak)}</td>
                    <td className="text-right">{usd(r.peak)}</td>
                  </tr>
                );
              })}
            </tbody>
          ))}
        </table>
        <p className="text-[10px] text-[var(--ink-muted)]">
          USD per 1 juta token.{" "}
          <a
            href={DEEPSEEK_PRICING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-[var(--ink-brand)]"
          >
            Sumber resmi DeepSeek
          </a>
        </p>
      </div>

      {/* Kurs yang berlaku sekarang — pengali seluruh biaya rupiah. */}
      <div className="rounded-xl border border-[var(--border)] p-3 space-y-1">
        <p className="text-xs font-semibold text-[var(--ink-strong)]">Kurs USD → IDR</p>
        <p className="text-base font-bold text-[var(--ink-strong)]">
          Rp {kurs.usdIdr.toLocaleString("id-ID")}
          <span className="ml-1 text-xs font-normal text-[var(--ink-muted)]">per USD</span>
        </p>
        <p className="text-xs text-[var(--ink-muted)]">
          {kurs.provenance === "default-embedded"
            ? `Kurs cadangan, dicocokkan ${kurs.verifiedAt}`
            : `Ditarik ${tanggal(kurs.fetchedAt)} · ${kurs.source}${kurs.rateDate ? ` · tanggal kurs ${kurs.rateDate}` : ""}`}
        </p>
        {kursBasi(kurs, sekarang) && (
          <p className="text-xs text-[var(--ink-danger)]">
            Kurs sudah lama tidak diperbarui. Ini kurs pasar — kartu bank biasanya 1–3% di atasnya.
          </p>
        )}
      </div>

      {/* Status async — diumumkan ke pembaca layar. */}
      <div role="status" aria-live="polite" className="text-xs">
        {status.kind === "loading" && (
          <p className="text-[var(--ink-muted)]">Mengambil tarif dan kurs terbaru…</p>
        )}
        {status.kind === "error" && (
          <p className="text-[var(--ink-danger)]">
            Gagal memperbarui: {status.message}. Tarif dan kurs yang berlaku tidak diubah.
          </p>
        )}
        {status.kind === "applied" && (
          <p className="font-semibold text-[var(--ink-brand)]">Tarif dan kurs diperbarui untuk perangkat ini ✓</p>
        )}
      </div>

      {/* Pratinjau: yang berubah, sebelum menimpa. */}
      {status.kind === "preview" && (
        <div className="rounded-xl border border-[var(--border)] p-3 space-y-1">
          <p className="text-xs font-semibold text-[var(--ink-strong)]">
            {jumlahPerubahan === 0 ? "Tidak ada perubahan angka." : `${jumlahPerubahan} angka berubah:`}
          </p>
          {kursBerubah && status.kurs && (
            <p className="text-xs text-[var(--ink-muted)]">
              Kurs: Rp {kurs.usdIdr.toLocaleString("id-ID")} →{" "}
              <strong className="text-[var(--ink-strong)]">Rp {status.kurs.usdIdr.toLocaleString("id-ID")}</strong>
            </p>
          )}
          {selisihTarif.slice(0, 12).map((d) => (
            <p key={`${d.model}-${d.label}`} className="text-xs text-[var(--ink-muted)]">
              <span className="font-mono">{d.model}</span> · {d.label}: {usd(d.dari)} →{" "}
              <strong className="text-[var(--ink-strong)]">{usd(d.ke)}</strong>
            </p>
          ))}
          {status.gagal.map((g) => (
            <p key={g} className="text-xs text-[var(--ink-danger)]">
              Sebagian gagal: {g}
            </p>
          ))}
          {status.warnings.map((w) => (
            <p key={w} className="text-xs text-[var(--ink-muted)]">
              ⚠ {w}
            </p>
          ))}
        </div>
      )}

      {status.kind === "applied" ? (
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-[var(--accent-solid)] text-[var(--on-strong)] font-bold text-sm"
        >
          Tutup
        </button>
      ) : (
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-[var(--border)] text-[var(--ink-muted)] font-semibold text-sm"
          >
            Batal
          </button>
          {status.kind === "preview" ? (
            <button
              onClick={terapkan}
              className="flex-1 py-3 rounded-xl bg-[var(--accent-solid)] text-[var(--on-strong)] font-bold text-sm"
            >
              Terapkan angka baru
            </button>
          ) : (
            <button
              onClick={tarik}
              disabled={status.kind === "loading"}
              className="flex-1 py-3 rounded-xl bg-[var(--accent-solid)] text-[var(--on-strong)] font-bold text-sm disabled:opacity-50"
            >
              {status.kind === "loading" ? "Mengambil…" : "Perbarui Tarif & Kurs"}
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}
