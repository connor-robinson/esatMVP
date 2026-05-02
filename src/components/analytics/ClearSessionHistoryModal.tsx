"use client";

import { AlertTriangle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClearSessionHistoryModalProps {
  open: boolean;
  sessionCount: number;
  isLoading?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

export function ClearSessionHistoryModal({
  open,
  sessionCount,
  isLoading = false,
  onClose,
  onConfirm,
}: ClearSessionHistoryModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        aria-label="Dismiss"
        onClick={onClose}
        disabled={isLoading}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="clear-history-title"
        className={cn(
          "relative w-full max-w-md rounded-organic-xl border border-border bg-surface-elevated p-6 sm:p-8",
          "shadow-modal-card ring-1 ring-text/[0.06]",
        )}
      >
        <div className="flex flex-col items-center text-center">
          <div
            className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-error/40 bg-error/10 text-error"
            aria-hidden
          >
            <AlertTriangle className="h-7 w-7" strokeWidth={2} />
          </div>
          <h2
            id="clear-history-title"
            className="text-lg font-semibold tracking-tight text-text sm:text-xl"
          >
            Clear All Session History
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-text-muted">
            This will permanently delete all {sessionCount} session
            {sessionCount === 1 ? "" : "s"} from your history. This action cannot be undone.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3 border-t border-border-subtle pt-6 sm:grid-cols-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className={cn(
              "inline-flex h-12 w-full items-center justify-center rounded-organic-md border border-border bg-surface-mid px-5 text-base font-semibold text-text",
              "transition-colors hover:bg-surface-neutral disabled:opacity-50",
            )}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={isLoading || sessionCount === 0}
            className={cn(
              "inline-flex h-12 w-full items-center justify-center gap-2 rounded-organic-md border border-error/50 bg-error/15 px-5 text-base font-semibold text-error",
              "transition-colors hover:bg-error/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            <Trash2 className="h-5 w-5 shrink-0" strokeWidth={2} />
            {isLoading ? "Clearing…" : "Clear All"}
          </button>
        </div>
      </div>
    </div>
  );
}
