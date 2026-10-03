import { useEffect, useRef, type ReactNode } from "react";
import { Z } from "../../lib/zIndex";

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Tombol aksi; dirender menempel di bawah sheet. */
  footer?: ReactNode;
  ariaLabel: string;
}

/**
 * Panel dari bawah (G2-01 — TASK-04 §3, pola D kontrak K4.6).
 * Aksesibilitas ditiru dari `src/components/Modal.tsx` (jangan tulis ulang):
 * role="dialog" + aria-modal, Escape menutup, fokus masuk & kembali, Tab terjebak.
 * z-index dari `src/lib/zIndex.ts` — JANGAN menulis z-50 langsung.
 */
export default function Sheet({ open, onClose, title, description, children, footer, ariaLabel }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const prevFocus = useRef<HTMLElement | null>(null);

  // Fokus masuk saat dibuka, kembali saat ditutup.
  useEffect(() => {
    if (!open) return;
    prevFocus.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();
    return () => prevFocus.current?.focus?.();
  }, [open]);

  // Escape menutup + jebakan fokus Tab.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); return; }
      if (e.key !== "Tab" || !panelRef.current) return;
      const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
        .filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 bg-scrim ${Z.modal} flex items-end justify-center sm:items-center sm:p-[var(--space-4)]`}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        className="relative w-full max-w-md bg-[var(--surface-strong)] shadow-[var(--e-float)] rounded-t-[var(--radius-card)] sm:rounded-[var(--radius-card)] p-[var(--space-5)] pb-[calc(2rem+var(--safe-bottom))] space-y-[var(--space-4)] max-h-[90vh] overflow-y-auto overflow-x-hidden overscroll-contain outline-none [transition:transform_var(--motion-sheet),opacity_var(--motion-sheet)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gagang seret dekoratif — disalin dari components/Modal.tsx supaya
            panel tetap terlihat sama saat Modal digantikan primitif ini. */}
        <div className="flex items-center" aria-hidden="true">
          <div className="mx-auto h-1.5 w-12 rounded-full bg-[var(--border)]" />
        </div>
        <div className="flex items-start justify-between gap-[var(--space-3)]">
          <div className="min-w-0">
            <h2 className="text-title font-bold text-[var(--text)] m-0">{title}</h2>
            {description && <p className="text-body text-[var(--text-muted)] m-0 mt-[var(--space-1)]">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panel"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--surface-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div>{children}</div>
        {footer && <div className="pt-[var(--space-2)]">{footer}</div>}
      </div>
    </div>
  );
}
