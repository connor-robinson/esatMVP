"use client";

import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { cn } from "@/lib/utils";

interface LibrarySectionLoadingProps {
  className?: string;
  label?: string;
  rows?: number;
}

export function LibrarySectionLoading({
  className,
  label = "Loading…",
  rows = 2,
}: LibrarySectionLoadingProps) {
  return (
    <div
      className={cn("space-y-2 py-2", className)}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2.5 px-1 py-0.5">
        <LoadingSpinner size="sm" />
        <span className="font-heading text-xs text-text-muted">{label}</span>
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="flex h-11 animate-pulse items-center gap-2.5 rounded-lg bg-surface-elevated px-3"
        >
          <div className="h-3 max-w-[8rem] flex-1 rounded bg-surface-mid" />
          <div className="ml-auto h-3 w-6 shrink-0 rounded bg-surface-mid" />
        </div>
      ))}
    </div>
  );
}
