"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { getCheckpointModalContent } from "@/lib/tester/checkpoint";
import type { TesterState } from "@/lib/tester/types";

interface TesterCheckpointModalProps {
  open: boolean;
  state: TesterState | null;
  onDismiss: () => void;
}

/**
 * Shown on login / navigation when the user has a pending tester checkpoint.
 * "Not now" closes the modal without blocking free app areas; the nav link
 * "Continue programme" remains available.
 */
export function TesterCheckpointModal({
  open,
  state,
  onDismiss,
}: TesterCheckpointModalProps) {
  if (!open || !state) return null;

  const content = getCheckpointModalContent(state);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        aria-label="Dismiss"
        onClick={onDismiss}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tester-checkpoint-title"
        className={cn(
          "relative w-full max-w-md rounded-organic-xl bg-surface-elevated p-6 sm:p-8",
          "shadow-modal-card ring-1 ring-text/[0.06]",
        )}
      >
        <h2
          id="tester-checkpoint-title"
          className="text-lg font-bold tracking-tight text-text sm:text-xl"
        >
          {content.title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-text-muted">
          {content.body}
        </p>

        {content.bullets.length > 0 ? (
          <ul className="mt-4 flex list-disc flex-col gap-2 pl-5 text-sm text-text-muted">
            {content.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        ) : null}

        <p className="mt-4 text-xs text-text-muted">
          Closing this does not cancel anything — free features stay available.
          Use &ldquo;Continue programme&rdquo; in the navigation anytime.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-3 border-t border-border-subtle pt-6 sm:grid-cols-2">
          <button
            type="button"
            onClick={onDismiss}
            className={cn(
              "inline-flex h-11 w-full items-center justify-center rounded-organic-md bg-surface-mid px-5 text-sm font-semibold text-text",
              "transition-colors hover:bg-surface-neutral",
            )}
          >
            Not now
          </button>
          <Link
            href={content.primaryHref}
            onClick={onDismiss}
            className={cn(
              "inline-flex h-11 w-full items-center justify-center rounded-organic-md bg-primary px-5 text-sm font-semibold text-black",
              "transition-opacity hover:opacity-90",
            )}
          >
            {content.primaryLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
