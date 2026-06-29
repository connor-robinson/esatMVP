"use client";

import { cn } from "@/lib/utils";

export interface MathSymbolDef {
  label: string;
  insert: string;
  /** Position cursor this many chars from end of insertion (e.g. -1 for inside parens) */
  cursorOffset?: number;
  title: string;
}

export const MATH_SYMBOLS: MathSymbolDef[] = [
  { label: "√", insert: "sqrt()", cursorOffset: -1, title: "Square root" },
  { label: "π", insert: "pi", title: "Pi" },
  { label: "⁄", insert: "/", title: "Fraction" },
  { label: "x²", insert: "^2", title: "Squared" },
  { label: "x³", insert: "^3", title: "Cubed" },
  { label: "^", insert: "^", title: "Power" },
  { label: "×", insert: "*", title: "Multiply" },
  { label: "( )", insert: "()", cursorOffset: -1, title: "Brackets" },
  { label: "θ", insert: "theta", title: "Theta" },
  { label: "±", insert: "±", title: "Plus or minus" },
];

interface MathSymbolBarProps {
  onInsert: (insert: string, cursorOffset?: number) => void;
  disabled?: boolean;
  className?: string;
}

export function MathSymbolBar({ onInsert, disabled, className }: MathSymbolBarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-1.5",
        className,
      )}
      role="toolbar"
      aria-label="Math symbols"
    >
      {MATH_SYMBOLS.map((sym) => (
        <button
          key={sym.label + sym.insert}
          type="button"
          title={sym.title}
          disabled={disabled}
          onClick={() => onInsert(sym.insert, sym.cursorOffset ?? 0)}
          className={cn(
            "min-w-[2.25rem] rounded-xl bg-surface-elevated px-2.5 py-1.5 text-sm font-medium text-text-muted transition-colors",
            disabled
              ? "cursor-not-allowed opacity-40"
              : "hover:bg-surface-mid hover:text-text active:scale-[0.97]",
          )}
        >
          {sym.label}
        </button>
      ))}
    </div>
  );
}
