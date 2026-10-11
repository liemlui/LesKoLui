import { Section } from "./Section";
import Toggle from "../../components/Toggle";
import { RobotIcon } from "../../components/icons";
import {
  DEEPSEEK_COST_NOTE, DEEPSEEK_DOCS_URL, DEEPSEEK_MODEL, DEEPSEEK_MODEL_LABEL, DEEPSEEK_PRICING_URL,
} from "../../lib/aiConfig";
import type { PemakaianAiBulan } from "../../lib/aiUsage";
import type { Settings } from "../../db/types";

/**
 * Bagian "AI — DeepSeek" di layar Pengaturan.
 *
 * Diekstrak dari `screens/Settings.tsx` (G3-09) **tanpa mengubah perilaku**.
 * Yang perlu diketahui sesi berikutnya:
 *
 * - **Kosong berarti tanpa batas** (keputusan pemilik B4). Kolom batas belanja
 *   tidak dipasang secara default, dan AI tidak pernah diblokir karena kolomnya
 *   kosong. Kalau diisi dan terlampaui, tombol AI nonaktif dengan alasan yang
 *   terlihat — teksnya ada di sini.
 * - **Pemakaian bulan berjalan** dibaca dari catatan audit `ai.call`, jadi
 *   angkanya berasal dari panggilan yang benar-benar terjadi, bukan perkiraan.
 *   Nilainya dihitung di induk (hook-nya harus dipanggil sebelum gerbang
 *   `settingsView`), lalu diteruskan sebagai {@link AiSectionProps.pemakaian}.
 */
export interface AiSectionProps {
  /** Bentuk `Settings` yang sedang terbuka. */
  form: Settings;
  /** Perubahan satu kolom AI; `model` ikut disetel saat AI dinyalakan. */
  updateAi: (field: string, value: string | boolean | number | undefined) => void;
  /** Pemakaian bulan berjalan; `undefined` = masih dihitung. */
  pemakaian: PemakaianAiBulan | null;
  /** Badge kepala bagian: hanya "Aktif" kalau AI menyala DAN kuncinya terisi. */
  aiConfigured: boolean;
}

export default function AiSection({ form, updateAi, pemakaian, aiConfigured }: AiSectionProps) {
  return (
    <Section
      id="ai"
      title="AI — DeepSeek"
      icon={<RobotIcon size={18} />}
      badge={aiConfigured ? { text: "Aktif" } : undefined}
    >
      <div className="pt-3 space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <Toggle checked={form.ai.enabled} onChange={(v) => updateAi("enabled", v)} />
          <div>
            <p className="text-sm text-[var(--ink-strong)] font-medium">Aktifkan AI</p>
            <p className="text-xs text-[var(--ink-muted)]">Bantu menulis catatan, laporan, pesan WA, dan analisis keuangan</p>
          </div>
        </label>

        {form.ai.enabled && (
          <>
            <div>
              <label htmlFor="set-ai-key" className="label">DeepSeek API Key</label>
              <input
                id="set-ai-key"
                className="input font-mono text-xs"
                type="password"
                placeholder="sk-..."
                autoComplete="off"
                value={form.ai.apiKey ?? ""}
                onChange={(e) => updateAi("apiKey", e.target.value)}
              />
              <p className="text-xs text-[var(--ink-muted)] mt-1">
                Dapatkan di <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener noreferrer" className="font-medium text-[var(--ink-brand)] underline">DeepSeek API Keys</a>.
                {" "}Disimpan di perangkat ini dan dipakai untuk menghubungkan langsung ke DeepSeek.
              </p>
            </div>

            <div>
              <p id="set-model-label" className="label">Model</p>
              <div role="group" aria-labelledby="set-model-label" className="input bg-[var(--surface)] text-[var(--ink-strong)] text-sm flex items-center gap-2 cursor-default">
                <span className="font-semibold">{DEEPSEEK_MODEL_LABEL}</span>
              </div>
              <p className="text-xs text-[var(--ink-muted)] mt-1">
                Model API: <span className="font-mono">{DEEPSEEK_MODEL}</span>. Mode cepat untuk catatan dan laporan.
              </p>
              <p className="text-xs text-[var(--ink-muted)] mt-1">{DEEPSEEK_COST_NOTE}</p>
              <p className="text-xs mt-1">
                <a href={DEEPSEEK_DOCS_URL} target="_blank" rel="noopener noreferrer" className="text-[var(--ink-brand)] underline">Dokumentasi DeepSeek</a>
                {" · "}
                <a href={DEEPSEEK_PRICING_URL} target="_blank" rel="noopener noreferrer" className="text-[var(--ink-brand)] underline">Tarif resmi</a>
              </p>
            </div>

            <div className="rounded-xl border border-[var(--border)] p-3 space-y-2">
              <p className="text-sm font-semibold text-[var(--ink-strong)]">Data yang dikirim ke DeepSeek</p>
              <p className="text-xs text-[var(--ink-muted)]">Data dikirim saat kamu melanjutkan fitur AI. Rinciannya ditampilkan sebelum setiap panggilan.</p>
              <ul className="list-disc pl-4 space-y-1 text-xs text-[var(--ink-muted)]">
                <li>Catatan dan laporan: identitas murid serta data belajar sesuai sesi yang dipilih. Draf catatan juga menyertakan Situasi Hari Ini dan tindak lanjut bila tersedia.</li>
                <li>Poles WA: isi pesan awal sesi beserta nama murid dan tutor.</li>
                <li>Analisis keuangan: ringkasan periode, nama dan data keuangan murid, tagihan belum dibayar, pengeluaran, serta pembanding dan proyeksi.</li>
              </ul>
            </div>

            <div className="rounded-xl border border-[var(--border)] p-3 space-y-2">
              <p className="text-sm font-semibold text-[var(--ink-strong)]">Batas belanja AI per bulan</p>
              <div>
                <label htmlFor="set-ai-budget" className="label">Batas bulanan (Rp)</label>
                <input
                  id="set-ai-budget"
                  className="input"
                  inputMode="numeric"
                  placeholder="Kosongkan untuk tanpa batas"
                  value={form.ai.monthlyBudgetIdr ?? ""}
                  onChange={(event) => {
                    const digit = event.target.value.replace(/\D/g, "");
                    updateAi("monthlyBudgetIdr", digit ? Number(digit) : undefined);
                  }}
                />
                <p className="mt-1 text-xs text-[var(--ink-muted)]">
                  <strong>Kosong berarti tanpa batas</strong> — itu bawaannya, dan AI tidak pernah diblokir karena
                  kolom ini kosong. Kalau diisi, tombol AI akan nonaktif setelah pemakaian bulan ini melewatinya,
                  dengan alasannya tertulis di layar.
                </p>
              </div>
              {/* Pemakaian bulan berjalan dibaca dari catatan audit `ai.call`. */}
              <div className="rounded-lg bg-[var(--surface)] px-3 py-2 text-xs" role="status" aria-live="polite">
                {pemakaian ? (
                  <>
                    <p className="text-[var(--ink-strong)]">
                      Bulan ini: <strong>Rp {pemakaian.terpakaiIdr.toFixed(2)}</strong>
                      {pemakaian.batasIdr !== undefined && <> dari batas Rp {pemakaian.batasIdr.toLocaleString("id-ID")}</>}
                      {" · "}{pemakaian.jumlahPanggilan} panggilan
                    </p>
                    <p className={pemakaian.terlampaui ? "mt-0.5 font-semibold text-[var(--ink-danger)]" : "mt-0.5 text-[var(--ink-muted)]"}>
                      {pemakaian.terlampaui
                        ? "Batas sudah terlampaui — tombol AI nonaktif sampai batas dinaikkan atau bulan berganti."
                        : pemakaian.sisaIdr !== undefined
                          ? `Sisa jatah Rp ${pemakaian.sisaIdr.toFixed(2)}.`
                          : "Tanpa batas."}
                    </p>
                  </>
                ) : (
                  <p className="text-[var(--ink-muted)]">Menghitung pemakaian…</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </Section>
  );
}
