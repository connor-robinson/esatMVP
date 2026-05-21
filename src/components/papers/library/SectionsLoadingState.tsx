"use client";

import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { cn } from "@/lib/utils";

interface SectionsLoadingStateProps {
  className?: string;
  /** Number of placeholder section rows (default 2). */
  rows?: number;
}

export function SectionsLoadingState({
  className,
  rows = 2,
}: SectionsLoadingStateProps) {
  return (
    <div className={cn("space-y-2 py-1", className)} role="status" aria-live="polite">
      <div className="flex items-center gap-2.5 px-1 py-0.5">
        <LoadingSpinner size="sm" />
        <span className="font-heading text-xs text-text-muted">Loading sections…</span>
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="flex h-11 animate-pulse items-center gap-2.5 rounded-lg bg-surface-elevated px-3"
        >
          <div className="h-6 w-6 shrink-0 rounded-md bg-surface-mid" />
          <div className="h-3 max-w-[6.5rem] flex-1 rounded bg-surface-mid" />
          <div className="ml-auto h-7 w-7 shrink-0 rounded-md bg-surface-mid" />
        </div>
      ))}
    </div>
  );
}
