"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { PearsonPleaseWaitScreen } from "@/components/pearson/PearsonPleaseWaitScreen";
import { useSubscription } from "@/hooks/useSubscription";
import {
  isFreePreviewPastPaper,
  isPastPaperLibraryLocked,
} from "@/lib/papers/freePreviewPapers";
import { parsePastPaperPracticeSearchParams } from "@/lib/papers/pastPaperPracticeHref";
import { startPastPaperSectionSession } from "@/lib/papers/startPastPaperSectionSession";
import { warmPastPaperPracticeStart } from "@/lib/papers/warmPastPaperPracticeStart";
import { cn } from "@/lib/utils";

type Props = {
  href: string;
  label?: string;
  ariaLabel: string;
  size?: "compact" | "page";
  className?: string;
};

export function PastPaperPracticeLink({
  href,
  label = "Start now",
  ariaLabel,
  size = "compact",
  className,
}: Props) {
  const router = useRouter();
  const session = useSupabaseSession();
  const { hasFullAccess, isLoading: subscriptionLoading } = useSubscription();
  const [starting, setStarting] = useState(false);

  const warmStart = () => {
    router.prefetch(href);
    router.prefetch("/past-papers/solve");
    void warmPastPaperPracticeStart(href);
  };

  return (
    <>
      <Link
        href={href}
        aria-label={ariaLabel}
        onMouseEnter={warmStart}
        onFocus={warmStart}
        onClick={(event) => {
          if (
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey ||
            event.button !== 0
          ) {
            return;
          }

          // Start from this page when auth is ready so we skip /solve/start
          // hydration. Fall back to the start route for login / lock / loading.
          event.preventDefault();
          if (starting) return;

          warmStart();
          setStarting(true);

          void (async () => {
            try {
              const url = new URL(href, window.location.origin);
              const target = parsePastPaperPracticeSearchParams(url.searchParams);
              if (!target || session === undefined) {
                router.push(href);
                return;
              }

              if (session === null) {
                router.push(
                  `/login?redirectTo=${encodeURIComponent(href)}`,
                );
                return;
              }

              const paperLockProbe = {
                examName: target.exam,
                examYear: target.year ?? 0,
              };
              const freePreview = isFreePreviewPastPaper(paperLockProbe);

              if (subscriptionLoading && !freePreview) {
                router.push(href);
                return;
              }

              if (
                !subscriptionLoading &&
                isPastPaperLibraryLocked(paperLockProbe, hasFullAccess)
              ) {
                router.push(href);
                return;
              }

              await startPastPaperSectionSession(target);
              router.push("/past-papers/solve");
            } catch {
              router.push(href);
            }
          })();
        }}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-semibold leading-none text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F1D]",
          size === "page"
            ? "rounded-xl bg-[#3B82F6] px-4 py-2 text-sm hover:bg-[#2563EB]"
            : "h-10 min-h-10 whitespace-nowrap rounded-lg bg-[#3B82F6] px-4 text-base hover:bg-[#2563EB]",
          className,
        )}
      >
        {label}
        <Play
          aria-hidden
          className={
            size === "page"
              ? "h-3.5 w-3.5 fill-current opacity-90"
              : "h-[18px] w-[18px] fill-current opacity-90"
          }
        />
      </Link>
      {starting && typeof document !== "undefined"
        ? createPortal(<PearsonPleaseWaitScreen />, document.body)
        : null}
    </>
  );
}
