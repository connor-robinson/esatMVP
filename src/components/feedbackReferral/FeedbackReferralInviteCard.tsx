"use client";

import { cn } from "@/lib/utils";

export function FeedbackReferralInviteCard({
  onStart,
  onDontShowAgain,
  onNotNow,
  className,
}: {
  onStart: () => void;
  onDontShowAgain: () => void;
  onNotNow?: () => void;
  className?: string;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-referral-invite-title"
      className={cn(
        "relative w-full max-w-md rounded-[1.5rem] bg-surface-elevated p-6 sm:p-8",
        "shadow-modal-card ring-1 ring-text/[0.06]",
        className,
      )}
    >
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-text-muted">
        About 1 minute
      </p>
      <h2
        id="feedback-referral-invite-title"
        className="mt-2 text-xl font-bold tracking-tight text-text sm:text-2xl"
      >
        Got a minute to help?
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-text-muted">
        A few short questions unlocks <span className="font-medium text-text">50% off for one friend</span>.
      </p>
      <p className="mt-2 text-xs leading-relaxed text-text-subtle">
        They apply the code in Stripe Checkout. One use. Not on your own account.
      </p>

      <div className="mt-7 flex flex-col gap-2.5">
        <button
          type="button"
          onClick={onStart}
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#4C8BF5] px-5 text-sm font-bold text-white transition-colors hover:bg-[#3B7AE0]"
        >
          Start the questions
        </button>
        {onNotNow ? (
          <button
            type="button"
            onClick={onNotNow}
            className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-surface-mid px-5 text-sm font-semibold text-text transition-colors hover:bg-surface-neutral"
          >
            Not now
          </button>
        ) : null}
        <button
          type="button"
          onClick={onDontShowAgain}
          className="inline-flex h-9 w-full items-center justify-center px-5 text-xs font-medium text-text-muted transition-colors hover:text-text"
        >
          Don&apos;t show again
        </button>
      </div>
    </div>
  );
}
