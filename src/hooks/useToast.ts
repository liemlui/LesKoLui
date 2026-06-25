import { useState, useCallback, useRef } from "react";

export type ToastType = "success" | "error" | "info";

export interface ToastMessage {
  id: number;
  text: string;
  type: ToastType;
}

let _nextId = 0;

/** Shared toast hook — single source of truth for transient user feedback. */
export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const t = timers.current.get(id);
    if (t) { clearTimeout(t); timers.current.delete(id); }
  }, []);

  const show = useCallback((text: string, type: ToastType = "info", durationMs = 3000) => {
    const id = _nextId++;
    setToasts((prev) => [...prev, { id, text, type }]);
    const t = setTimeout(() => dismiss(id), durationMs);
    timers.current.set(id, t);
    return id; // caller can dismiss early
  }, [dismiss]);

  const success = useCallback((text: string) => show(text, "success"), [show]);
  const error   = useCallback((text: string) => show(text, "error"), [show]);
  const info    = useCallback((text: string) => show(text, "info"), [show]);

  return { toasts, show, success, error, info, dismiss };
}
