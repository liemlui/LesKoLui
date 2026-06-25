import type { ToastMessage } from "../hooks/useToast";

const STYLE: Record<ToastMessage["type"], string> = {
  success: "bg-green-600 text-white",
  error:   "bg-red-500 text-white",
  info:    "bg-gray-800 text-white",
};

interface Props {
  toasts: ToastMessage[];
  onDismiss: (id: number) => void;
}

export default function ToastContainer({ toasts, onDismiss }: Props) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-4 left-4 right-4 z-[200] max-w-md mx-auto space-y-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          aria-live="polite"
          onClick={() => onDismiss(t.id)}
          className={`px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-auto cursor-pointer animate-[fadeIn_0.2s_ease] ${STYLE[t.type]}`}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
