"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { MathSymbolBar } from "./MathSymbolBar";

interface CollapsibleMathSymbolBarProps {
  onInsert: (insert: string, cursorOffset?: number) => void;
  disabled?: boolean;
  className?: string;
  defaultOpen?: boolean;
}

export function CollapsibleMathSymbolBar({
  onInsert,
  disabled,
  className,
  defaultOpen = true,
}: CollapsibleMathSymbolBarProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn("flex w-full flex-col gap-1.5", className)}>
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          disabled={disabled}
          className={cn(
            "flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-text-muted transition-colors",
            disabled ? "cursor-not-allowed opacity-40" : "hover:bg-surface-elevated hover:text-text",
          )}
          aria-expanded={open}
          aria-label={open ? "Hide math symbols" : "Show math symbols"}
        >
          <span>Symbols</span>
          {open ? (
            <ChevronDown className="h-4 w-4" strokeWidth={2} />
          ) : (
            <ChevronUp className="h-4 w-4" strokeWidth={2} />
          )}
        </button>
      </div>
      {open && <MathSymbolBar onInsert={onInsert} disabled={disabled} />}
    </div>
  );
}
