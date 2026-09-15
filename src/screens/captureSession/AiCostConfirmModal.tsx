import Modal from "../../components/Modal";
import { estimateDraftNoteCost } from "../../lib/aiClient";
import { DEEPSEEK_MODEL_LABEL, DEEPSEEK_COST_NOTE, DEEPSEEK_PRICING_URL, getDeepSeekPricing } from "../../lib/aiConfig";

interface AiCostConfirmModalProps {
  open: boolean;
  subjects: string[];                 // ← dari activeSubjects di induk
  topic?: string;                     // ← dari topic
  draftNote: string;                  // ← dari currentDraft di induk
  style: "rapikan" | "perluas" | "ringkas";
  onStyleChange: (s: "rapikan" | "perluas" | "ringkas") => void;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Modal konfirmasi biaya AI langkah 5 (draft catatan), termasuk blok pratinjau
 * data yang dikirim. Diekstrak dari `screens/CaptureSession.tsx`: komponen
 * tampilan murni — pemanggilan AI tetap di induk lewat `onConfirm`.
 */
export default function AiCostConfirmModal({
  open, subjects, topic, draftNote,
  style: aiNoteStyle, onStyleChange, onConfirm, onCancel,
}: AiCostConfirmModalProps) {
  if (!open) return null;
  const currentDraft = draftNote.trim() || undefined;
  const est = estimateDraftNoteCost(subjects, topic || undefined, currentDraft);
  return (
    <Modal
      ariaLabel="Draft Catatan dengan AI"
      onClose={onCancel}
      panelClassName="relative bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 pb-8 space-y-4 max-h-[92vh] overflow-y-auto overscroll-contain outline-none"
    >
      <h3 className="font-bold text-base">✨ Draft Catatan dengan AI</h3>
      <div className="bg-indigo-50 rounded-xl p-3 space-y-1">
        <p className="text-sm font-semibold text-indigo-700">Estimasi biaya DeepSeek</p>
        <p className="text-xs text-indigo-600">
          {DEEPSEEK_MODEL_LABEL} · tarif {getDeepSeekPricing().period} · ~{est.inputTokens} token masukan + {est.outputTokens} token keluaran
        </p>
        <p className="text-sm font-bold text-indigo-800">
          ≈ ${est.usdCost.toFixed(6)} (Rp {est.idrCost.toFixed(4)})
        </p>
        <p className="text-xs text-gray-500">{DEEPSEEK_COST_NOTE}</p>
        <a href={DEEPSEEK_PRICING_URL} target="_blank" rel="noopener noreferrer"
          className="inline-block text-xs text-blue-600 underline">Sumber tarif resmi DeepSeek</a>
      </div>
      <p className="text-xs text-gray-500">
        {currentDraft
          ? `Tulisan di textbox (${currentDraft.length} karakter) dikirim sebagai bahan utama, lalu dipoles AI.`
          : "Textbox kosong — AI akan membuat catatan baru."}
      </p>
      <div className="rounded-xl border border-gray-200 p-3 space-y-1">
        <p className="text-xs font-semibold text-gray-700">Data yang dikirim ke DeepSeek</p>
        <p className="text-xs text-gray-600">
          Nama, level dan kelas murid; mapel, topik, jenis dan durasi sesi, mood, area perhatian, prediksi nilai, Situasi Hari Ini,
          skor dan indikator engagement, label perilaku dan respons, catatan sesi lalu, tindak lanjut,
          isi textbox, dan gaya penulisan yang dipilih. Data opsional disertakan bila tersedia.
        </p>
      </div>
      <div>
        <label className="label">Gaya penulisan</label>
        <div className="grid grid-cols-3 gap-2">
          {(["rapikan", "perluas", "ringkas"] as const).map((style) => (
            <button key={style} type="button"
              onClick={() => onStyleChange(style)}
              className={`py-2 rounded-xl text-xs font-bold border transition-colors ${aiNoteStyle === style ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"}`}>
              {style === "rapikan" ? "✍️ Rapikan" : style === "perluas" ? "📖 Perluas" : "✂️ Ringkas"}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={onCancel}
          className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 font-semibold text-sm">
          Batal
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm">
          OK, Generate
        </button>
      </div>
    </Modal>
  );
}