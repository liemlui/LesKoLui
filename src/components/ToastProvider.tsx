import { createContext, useContext, type ReactNode } from "react";
import { useToast, type ToastMessage } from "../hooks/useToast";

interface ToastCtx {
  toasts: ToastMessage[];
  success: (text: string) => number;
  error:   (text: string) => number;
  info:    (text: string) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const { toasts, success, error, info, dismiss } = useToast();
  return (
    <ToastContext.Provider value={{ toasts, success, error, info, dismiss }}>
      {children}
    </ToastContext.Provider>
  );
}

/** Use this in any screen to show toast notifications. */
export function useToastCtx(): ToastCtx {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToastCtx must be used within <ToastProvider>");
  return ctx;
}
