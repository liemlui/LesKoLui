import { useState, useCallback, useRef, useEffect } from "react";

export type ToastType = "success" | "error" | "info";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastMessage {
  id: number;
  text: string;
  type: ToastType;
  action?: ToastAction;
}

let _nextId = 0;

/** Shared toast hook — single source of truth for transient user feedback. */
export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const mounted = useRef(true);

  // Cleanup all pending timers on unmount
  useEffect(() => {
    mounted.current = true;
    const pending = timers.current;
    return () => {
      mounted.current = false;
      for (const t of pending.values()) clearTimeout(t);
      pending.clear();
    };
  }, []);

  const dismiss = useCallback((id: number) => {
    if (!mounted.current) return;
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const t = timers.current.get(id);
    if (t) { clearTimeout(t); timers.current.delete(id); }
  }, []);

  const show = useCallback((
    text: string,
    type: ToastType = "info",
    durationMs = 3000,
    action?: ToastAction,
  ) => {
    const id = _nextId++;
    setToasts((prev) => [...prev, { id, text, type, action }]);
    const t = setTimeout(() => dismiss(id), durationMs);
    timers.current.set(id, t);
    return id;
  }, [dismiss]);

  const success = useCallback((text: string) => show(text, "success"), [show]);
  const error   = useCallback((text: string) => show(text, "error"), [show]);
  const info    = useCallback((text: string) => show(text, "info"), [show]);

  return { toasts, show, success, error, info, dismiss };
}
