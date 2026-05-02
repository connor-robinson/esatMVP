/**
 * Progress bar component with animation
 */

import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number; // 0-100
  max?: number;
  showLabel?: boolean;
  variant?: "default" | "success" | "warning" | "neutral";
}

export function Progress({
  value,
  max = 100,
  showLabel = false,
  variant = "default",
  className,
  ...props
}: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  const variants = {
    default: "bg-primary shadow-[0_0_8px_0_rgba(74,140,111,0.3)]",
    success: "bg-success shadow-[0_0_8px_0_rgba(82,182,154,0.3)]",
    warning: "bg-warning shadow-[0_0_8px_0_rgba(245,158,11,0.3)]",
    neutral: "bg-text-muted/60 shadow-none",
  };
  
  return (
    <div className={cn("relative", className)} {...props}>
      <div className="h-3 w-full overflow-hidden rounded-organic-sm bg-surface-mid/90 border border-border-subtle">
        <div
          className={cn(
            "h-full transition-all duration-500 ease-signature rounded-organic-sm",
            variants[variant]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="mt-1 text-right text-xs text-text-muted">
          {Math.round(percentage)}%
        </div>
      )}
    </div>
  );
}


