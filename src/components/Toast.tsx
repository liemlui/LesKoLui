import type { ToastMessage } from "../hooks/useToast";
import { Z } from "../lib/zIndex";

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
    <div className={`fixed inset-x-0 bottom-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom)+0.75rem)] ${Z.toast} mx-auto max-w-md space-y-2 px-4 pointer-events-none`}>
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          aria-live="polite"
          onClick={() => onDismiss(t.id)}
          className={`pointer-events-auto flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg animate-[fadeIn_0.2s_ease] ${STYLE[t.type]}`}
        >
          <span className="flex-1">{t.text}</span>
          {t.action && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                t.action?.onClick();
                onDismiss(t.id);
              }}
              className="rounded-lg bg-white/15 px-2.5 py-1 text-xs font-bold underline-offset-2 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
