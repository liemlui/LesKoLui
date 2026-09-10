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
import { DEEPSEEK_MODEL_LABEL, DEEPSEEK_COST_NOTE, getDeepSeekPricing } from "../lib/aiConfig";

export function AiCostModal({ open, title, estimatedIDR, description, dataSent, extraContent, onConfirm, onCancel }: AiCostModalProps) {
  if (!open) return null;
  return (
    <Modal onClose={onCancel} ariaLabel={title}>
      <h3 className="font-bold text-base">✨ {title}</h3>
      <div className="bg-indigo-50 rounded-xl p-3 space-y-1">
        <p className="text-sm font-semibold text-indigo-700">Estimasi biaya DeepSeek</p>
        <p className="text-xs text-indigo-600">{DEEPSEEK_MODEL_LABEL} · tarif {getDeepSeekPricing().period}</p>
        <p className="text-xl font-bold text-indigo-800">≈ Rp {estimatedIDR.toFixed(2)}</p>
        {description && <p className="text-xs text-indigo-500">{description}</p>}
        <p className="text-xs text-gray-500">{DEEPSEEK_COST_NOTE}</p>
      </div>
      {dataSent && (
        <div className="rounded-xl border border-gray-200 p-3 space-y-1">
          <p className="text-xs font-semibold text-gray-700">Data yang dikirim ke DeepSeek</p>
          <p className="text-xs text-gray-600">{dataSent}</p>
        </div>
      )}
      {extraContent}
      <div className="flex gap-3">
        <button onClick={onCancel}
          className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 font-semibold text-sm">
          Batal
        </button>
        <button onClick={onConfirm}
          className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm">
          OK, Lanjutkan
        </button>
      </div>
    </Modal>
  );
}
