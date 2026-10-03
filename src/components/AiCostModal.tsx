interface AiCostModalProps {
  open: boolean;
  title: string;
  estimatedIDR: number;
  description?: string;
  /** Ringkasan data yang dikirim untuk fitur ini. */
  dataSent?: string;
  /** Konten opsional (mis. checkbox "regenerasi paksa") di atas tombol aksi. */
  extraContent?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

import Modal from "./Modal";
import { DEEPSEEK_MODEL_LABEL, DEEPSEEK_COST_NOTE, DEEPSEEK_PRICING_URL, getDeepSeekPricing } from "../lib/aiConfig";

export function AiCostModal({ open, title, estimatedIDR, description, dataSent, extraContent, onConfirm, onCancel }: AiCostModalProps) {
  if (!open) return null;
  return (
    <Modal onClose={onCancel} ariaLabel={title}>
      <h3 className="font-bold text-base">✨ {title}</h3>
      <div className="bg-[var(--accent-tint)] rounded-xl p-3 space-y-1">
        <p className="text-sm font-semibold text-[var(--ink-accent)]">Estimasi biaya DeepSeek</p>
        <p className="text-xs text-[var(--ink-accent)]">{DEEPSEEK_MODEL_LABEL} · tarif {getDeepSeekPricing().period}</p>
        <p className="text-xl font-bold text-[var(--ink-accent)]">≈ Rp {estimatedIDR.toFixed(2)}</p>
        {description && <p className="text-xs text-[var(--ink-accent)]">{description}</p>}
        <p className="text-xs text-[var(--ink-muted)]">{DEEPSEEK_COST_NOTE}</p>
        <a href={DEEPSEEK_PRICING_URL} target="_blank" rel="noopener noreferrer"
          className="inline-block text-xs text-[var(--ink-brand)] underline">Sumber tarif resmi DeepSeek</a>
      </div>
      {dataSent && (
        <div className="rounded-xl border border-[var(--border)] p-3 space-y-1">
          <p className="text-xs font-semibold text-[var(--ink-strong)]">Data yang dikirim ke DeepSeek</p>
          <p className="text-xs text-[var(--ink-muted)]">{dataSent}</p>
        </div>
      )}
      {extraContent}
      <div className="flex gap-3">
        <button onClick={onCancel}
          className="flex-1 py-3 rounded-xl border border-[var(--border)] text-[var(--ink-muted)] font-semibold text-sm">
          Batal
        </button>
        <button onClick={onConfirm}
          className="flex-1 py-3 rounded-xl bg-[var(--accent-solid)] text-[var(--on-strong)] font-bold text-sm">
          OK, Lanjutkan
        </button>
      </div>
    </Modal>
  );
}
