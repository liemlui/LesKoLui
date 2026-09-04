/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, type ReactNode } from "react";
import { useToast, type ToastAction, type ToastMessage } from "../hooks/useToast";

interface ToastCtx {
  toasts: ToastMessage[];
  show: (text: string, type?: ToastMessage["type"], durationMs?: number, action?: ToastAction) => number;
  success: (text: string) => number;
  error:   (text: string) => number;
  info:    (text: string) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const { toasts, show, success, error, info, dismiss } = useToast();
  return (
    <ToastContext.Provider value={{ toasts, show, success, error, info, dismiss }}>
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
