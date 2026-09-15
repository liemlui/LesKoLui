import Modal from "../../components/Modal";
import type { BehaviorTag, ResponseTag } from "../../lib/responseTaxonomy";

interface AiTagTooltipProps {
  tag: BehaviorTag | ResponseTag;
  type: "behavior" | "response";
  onClose: () => void;
}

export default function AiTagTooltip({ tag, type, onClose }: AiTagTooltipProps) {
  return (
    <Modal
      ariaLabel="Info tag"
      onClose={onClose}
      showCloseButton={false}
      panelClassName="relative bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] overflow-y-auto overscroll-contain outline-none"
    >
      <div className={`px-4 py-3 flex items-center gap-3 ${
        type === "response" ? "bg-blue-50"
          : (tag as BehaviorTag).valence === "positive" ? "bg-green-50"
            : (tag as BehaviorTag).valence === "neutral" ? "bg-gray-50"
              : "bg-orange-50"}`}
      >
        <span className="text-2xl">{tag.icon}</span>
        <div className="flex-1">
          <p className="font-bold text-sm text-gray-800">{tag.label}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {type === "behavior" ? "Observasi perilaku" : "Kualitas respons akademik"}
          </p>
        </div>
        <button onClick={onClose} aria-label="Tutup info"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-600 hover:bg-black/5 hover:text-gray-800 transition-colors"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg></button>
      </div>
      <div className="px-4 py-3 space-y-3">
        <p className="text-sm text-gray-700 leading-relaxed">{tag.description}</p>
        <div className={`rounded-xl px-3 py-2.5 text-xs leading-relaxed ${
          type === "response" ? "bg-blue-50 text-blue-800" : "bg-amber-50 text-amber-800"}`}
        >
          <span className="font-semibold">
            {type === "behavior" ? "💡 Yang bisa dikatakan:" : "📌 Implikasi untuk tutor:"}
          </span>
          <br />
          {type === "behavior"
            ? (tag as BehaviorTag).prompt
            : (tag as ResponseTag).teacherNote}
        </div>
      </div>
    </Modal>
  );
}
