"use client";

import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface SignOutConfirmModalProps {
  open: boolean;
  isLoading?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

export function SignOutConfirmModal({
  open,
  isLoading = false,
  onClose,
  onConfirm,
}: SignOutConfirmModalProps) {
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
        aria-labelledby="sign-out-title"
        className={cn(
          "relative w-full max-w-sm rounded-organic-xl border border-border bg-surface-elevated p-6 sm:p-8",
          "shadow-modal-card ring-1 ring-text/[0.06]",
        )}
      >
        <div className="text-center">
          <h2
            id="sign-out-title"
            className="text-lg font-semibold tracking-tight text-text sm:text-xl"
          >
            Sign out?
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-text-muted">
            Are you sure you want to log out?
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3 border-t border-border-subtle pt-6 sm:grid-cols-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className={cn(
              "inline-flex h-11 w-full items-center justify-center rounded-organic-md bg-surface-mid px-5 text-sm font-semibold text-text",
              "transition-colors hover:bg-surface-neutral disabled:opacity-50",
            )}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={isLoading}
            className={cn(
              "inline-flex h-11 w-full items-center justify-center gap-2 rounded-organic-md bg-primary px-5 text-sm font-semibold text-black",
              "transition-opacity hover:opacity-90 disabled:opacity-50",
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
            {isLoading ? "Signing out…" : "Log out"}
          </button>
        </div>
      </div>
    </div>
  );
}
