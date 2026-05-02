import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface FilterChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export function FilterChip({ active = false, className, children, ...props }: FilterChipProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-fast ease-signature",
        active
          ? "border-primary/70 bg-primary/12 text-primary ring-1 ring-primary/25"
          : "border-border-subtle bg-surface-subtle text-text-muted hover:border-border hover:text-text",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
