"use client";

import { ArrowRight } from "lucide-react";
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
        "relative w-full max-w-xl overflow-hidden rounded-organic-lg bg-surface-elevated p-7 shadow-lg backdrop-blur-sm sm:p-9",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(76,139,245,0.14),transparent_55%)]"
      />
      <div className="relative z-10">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#4C8BF5]">
          About 2 minutes
        </p>
        <h2
          id="feedback-referral-invite-title"
          className="mt-2 text-2xl font-bold tracking-tight text-text sm:text-3xl"
        >
          Get 50% off for a friend
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-text-muted sm:text-base">
          Answer a few questions to unlock a discount code for your friend.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-text-subtle">
          Apply the code in Stripe Checkout. One use. Not on your own account.
        </p>

        <div className="mt-7 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onStart}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-organic-md bg-[#4C8BF5] px-5 text-base font-bold text-white transition-colors hover:bg-[#3B7AE0]"
          >
            Start
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
          {onNotNow ? (
            <button
              type="button"
              onClick={onNotNow}
              className="inline-flex h-11 w-full items-center justify-center rounded-organic-md bg-surface-mid px-5 text-sm font-semibold text-text transition-colors hover:bg-surface-neutral"
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
    </div>
  );
}
