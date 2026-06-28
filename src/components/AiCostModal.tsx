interface AiCostModalProps {
  open: boolean;
  title: string;
  estimatedIDR: number;
  description?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

import Modal from "./Modal";

export function AiCostModal({ open, title, estimatedIDR, description, onConfirm, onCancel }: AiCostModalProps) {
  if (!open) return null;
  return (
    <Modal onClose={onCancel} ariaLabel={title}>
      <h3 className="font-bold text-base">✨ {title}</h3>
      <div className="bg-indigo-50 rounded-xl p-3 space-y-1">
        <p className="text-sm font-semibold text-indigo-700">Estimasi biaya DeepSeek</p>
        <p className="text-xl font-bold text-indigo-800">≈ Rp {estimatedIDR.toFixed(2)}</p>
        {description && <p className="text-xs text-indigo-500">{description}</p>}
        <p className="text-xs text-gray-400">Biaya aktual mungkin sedikit berbeda</p>
      </div>
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
