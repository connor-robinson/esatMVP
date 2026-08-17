"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface RoadmapInfoPopoverProps {
  label?: string;
  title: string;
  children: React.ReactNode;
  className?: string;
  align?: "left" | "right";
}

export function RoadmapInfoPopover({
  label = "Info",
  title,
  children,
  className,
  align = "right",
}: RoadmapInfoPopoverProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonId = useId();
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative shrink-0", className)}>
      <button
        type="button"
        id={buttonId}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="inline-flex items-center rounded-organic-md p-1 text-text-muted transition-colors hover:bg-surface-subtle hover:text-text"
      >
        <Info className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="sr-only">{label}</span>
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-labelledby={buttonId}
          className={cn(
            "absolute top-full z-40 mt-2 w-[min(100vw-2rem,22rem)] rounded-organic-lg bg-surface-elevated p-4 shadow-modal-card",
            align === "right" ? "right-0" : "left-0",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-3 flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-text">{title}</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-organic-sm p-1 text-text-muted transition-colors hover:bg-surface-subtle hover:text-text"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-2.5 text-xs leading-relaxed text-text-muted">
            {children}
          </div>
        </div>
      ) : null}
    </div>
  );
}
