"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { parsePastPaperPracticeSearchParams } from "@/lib/papers/pastPaperPracticeHref";
import {
  clearPendingHubStart,
  setPendingHubStart,
} from "@/lib/papers/hubPendingStart";
import { cn } from "@/lib/utils";
import { usePaperSessionStore } from "@/store/paperSessionStore";

type Props = {
  href: string;
  label?: string;
  ariaLabel: string;
  size?: "compact" | "page";
  className?: string;
};

/**
 * Start now: jump straight to /past-papers/solve and backload session setup
 * there. Avoids the long hub "Loading, please wait..." overlay.
 */
export function PastPaperPracticeLink({
  href,
  label = "Start now",
  ariaLabel,
  size = "compact",
  className,
}: Props) {
  const router = useRouter();

  const warmStart = () => {
    router.prefetch(href);
    router.prefetch("/past-papers/solve");
    void import("@/lib/papers/warmPastPaperPracticeStart").then((mod) =>
      mod.warmPastPaperPracticeStart(href),
    );
  };

  return (
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

        event.preventDefault();
        warmStart();

        const url = new URL(href, window.location.origin);
        const target = parsePastPaperPracticeSearchParams(url.searchParams);
        if (!target) {
          router.push(href);
          return;
        }

        setPendingHubStart(target);
        usePaperSessionStore.getState().beginSessionBootstrap();
        router.push("/past-papers/solve");

        void (async () => {
          try {
            const [
              { startPastPaperSectionSession },
              { isFreePreviewPastPaper, isPastPaperLibraryLocked },
              { createSupabaseBrowserClient },
            ] = await Promise.all([
              import("@/lib/papers/startPastPaperSectionSession"),
              import("@/lib/papers/freePreviewPapers"),
              import("@/lib/supabase/browser"),
            ]);

            const supabase = createSupabaseBrowserClient();
            const {
              data: { session },
            } = await supabase.auth.getSession();

            if (!session) {
              usePaperSessionStore.getState().finishSessionBootstrap();
              clearPendingHubStart();
              router.replace(`/login?redirectTo=${encodeURIComponent(href)}`);
              return;
            }

            const paperLockProbe = {
              examName: target.exam,
              examYear: target.year ?? 0,
            };
            if (!isFreePreviewPastPaper(paperLockProbe)) {
              const res = await fetch("/api/subscription/status");
              let hasFullAccess = false;
              if (res.ok) {
                const data = (await res.json()) as { hasFullAccess?: boolean };
                hasFullAccess = data.hasFullAccess === true;
              }
              if (isPastPaperLibraryLocked(paperLockProbe, hasFullAccess)) {
                usePaperSessionStore.getState().finishSessionBootstrap();
                clearPendingHubStart();
                router.replace(href);
                return;
              }
            }

            await startPastPaperSectionSession(target);
            clearPendingHubStart();
            usePaperSessionStore.getState().finishSessionBootstrap();
          } catch (err) {
            clearPendingHubStart();
            usePaperSessionStore
              .getState()
              .finishSessionBootstrap(
                err instanceof Error
                  ? err.message
                  : "Failed to start this paper.",
              );
          }
        })();
      }}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 font-semibold leading-none text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F1D]",
        size === "page"
          ? "rounded-xl bg-[#3B82F6] px-4 py-2 text-sm hover:bg-[#2563EB]"
          : "whitespace-nowrap rounded-lg bg-[#3B82F6] px-3 py-1.5 text-sm hover:bg-[#2563EB]",
        className,
      )}
    >
      {label}
      <Play aria-hidden className="h-4 w-4 fill-current opacity-90" />
    </Link>
  );
}
