"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Copy, Share2 } from "lucide-react";
import {
  clearFeedbackReferralReturnTo,
  getFeedbackReferralReturnTo,
} from "@/lib/feedbackReferral/promptStorage";
import { cn } from "@/lib/utils";

type CopiedField = "code" | "link" | null;

function toAbsoluteShareUrl(shareUrl: string): string {
  if (typeof window === "undefined") return shareUrl;
  try {
    return new URL(shareUrl, window.location.origin).toString();
  } catch {
    return shareUrl;
  }
}

export function FeedbackReferralCodeScreen({
  code,
  shareUrl,
  redeemed = false,
}: {
  code: string;
  shareUrl: string;
  redeemed?: boolean;
}) {
  const [copied, setCopied] = useState<CopiedField>(null);
  const returnTo = useMemo(() => getFeedbackReferralReturnTo(), []);
  const absoluteLink = useMemo(
    () => toAbsoluteShareUrl(shareUrl),
    [shareUrl],
  );

  const markCopied = (field: CopiedField) => {
    setCopied(field);
    window.setTimeout(() => setCopied(null), 1600);
  };

  const copy = async (field: "code" | "link", value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      markCopied(field);
    } catch {
      setCopied(null);
    }
  };

  const shareLink = async () => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "50% off ESATCamp",
          text: `Use my ESATCamp code ${code} for 50% off.`,
          url: absoluteLink,
        });
        return;
      } catch {
        // Fall through to copy if the user cancels or share fails.
      }
    }
    await copy("link", absoluteLink);
  };

  return (
    <div className="relative min-h-[calc(100vh-58px)] bg-background">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div
          className="absolute inset-0 opacity-[0.3]"
          style={{
            backgroundImage:
              "radial-gradient(rgba(76, 139, 245, 0.35) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      <div className="relative flex min-h-[calc(100vh-58px)] w-full items-center justify-center px-5 py-8 sm:px-10 lg:px-14">
        <div
          className={cn(
            "relative w-full max-w-2xl overflow-hidden rounded-organic-lg bg-surface-elevated p-7 shadow-lg backdrop-blur-sm sm:p-10",
          )}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(76,139,245,0.16),transparent_55%)]"
          />

          <div className="relative z-10">
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#4C8BF5]">
              {redeemed ? "Already used" : "Thanks for the feedback"}
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-text sm:text-3xl">
              {redeemed ? "Friend code used" : "Your friend code is ready 🎉"}
            </h1>
            <p className="mt-3 text-base text-text-muted">
              {redeemed
                ? "A friend already redeemed this code. It only works once."
                : "One friend gets 50% off their first payment. Share the link below. The code applies automatically on the pricing page."}
            </p>

            <div className="mt-8 rounded-2xl bg-surface-mid/80 px-5 py-6 sm:px-6">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                Redemption code
              </p>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p
                  className={cn(
                    "font-mono text-2xl font-bold tracking-[0.12em] text-text sm:text-3xl",
                    redeemed && "text-text-muted line-through decoration-text-subtle",
                  )}
                >
                  {code}
                </p>
                {!redeemed ? (
                  <button
                    type="button"
                    onClick={() => void copy("code", code)}
                    className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-organic-md bg-[#4C8BF5] px-5 text-sm font-bold text-white transition-colors hover:bg-[#3B7AE0]"
                  >
                    {copied === "code" ? (
                      <Check className="h-4 w-4" aria-hidden />
                    ) : (
                      <Copy className="h-4 w-4" aria-hidden />
                    )}
                    {copied === "code" ? "Copied" : "Copy code"}
                  </button>
                ) : null}
              </div>
            </div>

            {!redeemed ? (
              <div className="mt-5 rounded-2xl bg-surface-mid/80 px-5 py-5 sm:px-6">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                  Share with a friend
                </p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-stretch">
                  <button
                    type="button"
                    onClick={() => void copy("link", absoluteLink)}
                    className="min-w-0 flex-1 truncate rounded-xl bg-surface-elevated px-4 py-3 text-left font-mono text-sm text-text ring-1 ring-text/[0.04] transition-colors hover:bg-surface-neutral"
                    title={absoluteLink}
                  >
                    {absoluteLink}
                  </button>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => void copy("link", absoluteLink)}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-organic-md bg-surface-elevated px-4 text-sm font-semibold text-text transition-colors hover:bg-surface-neutral"
                    >
                      {copied === "link" ? (
                        <Check className="h-4 w-4" aria-hidden />
                      ) : (
                        <Copy className="h-4 w-4" aria-hidden />
                      )}
                      {copied === "link" ? "Copied" : "Copy link"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void shareLink()}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-organic-md bg-[#4C8BF5] px-4 text-sm font-bold text-white transition-colors hover:bg-[#3B7AE0]"
                    >
                      <Share2 className="h-4 w-4" aria-hidden />
                      Share
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            <p className="mt-6 text-sm font-medium text-text">
              This redemption code is not valid on your own account.
            </p>
            <p className="mt-2 text-sm text-text-muted">
              Find it anytime in{" "}
              <Link
                href="/profile?section=account"
                className="font-medium text-[#4C8BF5] hover:underline"
              >
                Settings → Account
              </Link>
              .
            </p>

            <Link
              href={returnTo}
              onClick={() => clearFeedbackReferralReturnTo()}
              className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-organic-md bg-[#4C8BF5] px-5 text-base font-bold text-white transition-colors hover:bg-[#3B7AE0]"
            >
              Continue
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
