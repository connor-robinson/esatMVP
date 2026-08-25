"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTesterProgrammeOptional } from "@/contexts/TesterProgrammeContext";
import { useSubscription } from "@/hooks/useSubscription";
import { getCheckpointModalContent } from "@/lib/tester/checkpoint";
import { shouldSuppressTesterChrome } from "@/lib/subscription/accessUi";

/**
 * Persistent reminder after the login checkpoint is dismissed.
 * Hidden while partner entitlement (or equivalent) suppresses tester chrome.
 */
export function TesterProgrammeBanner() {
  const pathname = usePathname();
  const ctx = useTesterProgrammeOptional();
  const subscription = useSubscription();

  if (shouldSuppressTesterChrome(subscription)) return null;
  if (!ctx?.actionPending || !ctx.state) return null;
  if (pathname.startsWith("/founding-tester")) return null;

  const { title } = getCheckpointModalContent(ctx.state);

  return (
    <div
      className="border-b border-border-subtle bg-surface-elevated/95 px-4 py-2.5 sm:px-6"
      role="status"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-sm">
        <span className="text-text-muted">{title}</span>
        <Link
          href="/founding-tester"
          className="font-semibold text-text underline-offset-2 hover:underline"
        >
          Continue programme
        </Link>
      </div>
    </div>
  );
}
