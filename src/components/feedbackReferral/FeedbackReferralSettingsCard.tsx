"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = {
  enabled: boolean;
  completed: boolean;
  code: string | null;
  redeemed?: boolean;
};

export function FeedbackReferralSettingsCard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/feedback-referral/status")
      .then(async (res) => {
        if (res.status === 403) return null;
        if (!res.ok) return null;
        return (await res.json()) as Status;
      })
      .then((data) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!status?.enabled) return null;

  const copy = async () => {
    if (!status.code) return;
    try {
      await navigator.clipboard.writeText(status.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="mt-4 rounded-organic-xl bg-surface-mid/60 px-5 py-5">
      <h3 className="text-sm font-semibold text-text">Friend referral code</h3>

      {!status.completed ? (
        <>
          <p className="mt-2 text-sm text-text-muted">
            Answer a quick questionnaire to unlock a one-friend 50% off code.
            Your friend applies it in Stripe Checkout. You can start it here
            anytime if you skipped the popup.
          </p>
          <Link
            href="/feedback"
            className="mt-4 inline-flex text-sm font-medium text-primary"
          >
            Open questionnaire
          </Link>
        </>
      ) : status.redeemed ? (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <p className="rounded-xl bg-surface-elevated/70 px-3 py-2 font-mono text-sm font-semibold tracking-wide text-text-muted line-through decoration-text-subtle">
              {status.code}
            </p>
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-elevated px-2.5 py-1 text-xs font-semibold text-text-muted">
              <Lock className="h-3 w-3" aria-hidden />
              Used / locked
            </span>
          </div>
          <p className="mt-3 text-sm text-text-muted">
            A friend already redeemed this code. It locks automatically after
            one use and cannot be used again.
          </p>
        </>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <p className="rounded-xl bg-surface-elevated px-3 py-2 font-mono text-sm font-semibold tracking-wide text-text">
              {status.code}
            </p>
            <button
              type="button"
              onClick={() => void copy()}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl bg-[#4C8BF5] px-3 py-2 text-xs font-semibold text-white hover:bg-[#3B7AE0]",
              )}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="mt-3 text-sm text-text-muted">
            Share this with one friend. They choose a plan on Pricing, then
            apply the code in Stripe Checkout. It locks here automatically
            after one use. You cannot use it on your own account.
          </p>
          <Link
            href="/feedback"
            className="mt-3 inline-flex text-sm font-medium text-primary"
          >
            View code page
          </Link>
        </>
      )}
    </div>
  );
}
