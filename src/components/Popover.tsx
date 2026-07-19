import { useState, useRef, useEffect, useCallback } from "react";

interface Props {
  trigger: React.ReactNode;
  children: React.ReactNode;
  /** "hover" shows on mouse enter, "click" toggles on click */
  mode?: "hover" | "click";
  /** Position relative to trigger */
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  /** Max width of the popover */
  maxWidth?: number;
  /** Called when visibility changes */
  onOpenChange?: (open: boolean) => void;
}

/** Lightweight hover/click popover for contextual info (engagement breakdown, financial detail). */
export default function Popover({
  trigger,
  children,
  mode = "hover",
  side = "top",
  align = "center",
  maxWidth = 240,
  onOpenChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const show = useCallback(() => { setOpen(true); onOpenChange?.(true); }, [onOpenChange]);
  const hide = useCallback(() => { setOpen(false); onOpenChange?.(false); }, [onOpenChange]);
  const toggle = useCallback(() => {
    setOpen((prev) => { onOpenChange?.(!prev); return !prev; });
  }, [onOpenChange]);

  // Click outside to close
  useEffect(() => {
    if (!open || mode !== "click") return;
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        hide();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, mode, hide]);

  // Cleanup timeout
  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  const hoverProps = mode === "hover"
    ? {
        onMouseEnter: () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); show(); },
        onMouseLeave: () => { timeoutRef.current = setTimeout(hide, 150); },
      }
    : {};

  const clickProps = mode === "click"
    ? { onClick: toggle }
    : {};

  // Position classes
  const sideClasses: Record<string, string> = {
    top: "bottom-full mb-2",
    bottom: "top-full mt-2",
    left: "right-full mr-2",
    right: "left-full ml-2",
  };
  const alignClasses: Record<string, string> = {
    start: "left-0",
    center: "left-1/2 -translate-x-1/2",
    end: "right-0",
  };

  return (
    <div className="relative inline-block">
      <div ref={triggerRef} {...hoverProps} {...clickProps} className="cursor-pointer inline-flex">
        {trigger}
      </div>
      {open && (
        <div
          ref={popoverRef}
          className={`absolute z-50 ${sideClasses[side]} ${alignClasses[align]}`}
          {...(mode === "hover" ? hoverProps : {})}
          style={{ maxWidth }}>
          <div className="bg-white border border-slate-200 rounded-xl shadow-xl p-3 text-xs text-slate-700">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
