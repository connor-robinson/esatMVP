"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { PearsonPleaseWaitScreen } from "@/components/pearson/PearsonPleaseWaitScreen";
import { cn } from "@/lib/utils";

type Props = {
  href: string;
  label?: string;
  ariaLabel: string;
  size?: "compact" | "page";
  className?: string;
};

/**
 * Lightweight Start now control for download hubs.
 * Avoids mounting subscription/session hooks on every table row so the page
 * can hydrate quickly. Session start work runs only after click.
 */
export function PastPaperPracticeLink({
  href,
  label = "Start now",
  ariaLabel,
  size = "compact",
  className,
}: Props) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);

  const warmStart = () => {
    router.prefetch(href);
    router.prefetch("/past-papers/solve");
    void import("@/lib/papers/warmPastPaperPracticeStart").then((mod) =>
      mod.warmPastPaperPracticeStart(href),
    );
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

          event.preventDefault();
          if (starting) return;

          warmStart();
          setStarting(true);

          void (async () => {
            try {
              const [
                { parsePastPaperPracticeSearchParams },
                { startPastPaperSectionSession },
                { isFreePreviewPastPaper, isPastPaperLibraryLocked },
                { createSupabaseBrowserClient },
              ] = await Promise.all([
                import("@/lib/papers/pastPaperPracticeHref"),
                import("@/lib/papers/startPastPaperSectionSession"),
                import("@/lib/papers/freePreviewPapers"),
                import("@/lib/supabase/browser"),
              ]);

              const url = new URL(href, window.location.origin);
              const target = parsePastPaperPracticeSearchParams(url.searchParams);
              if (!target) {
                router.push(href);
                return;
              }

              const supabase = createSupabaseBrowserClient();
              const {
                data: { session },
              } = await supabase.auth.getSession();

              if (!session) {
                router.push(`/login?redirectTo=${encodeURIComponent(href)}`);
                return;
              }

              const paperLockProbe = {
                examName: target.exam,
                examYear: target.year ?? 0,
              };
              const freePreview = isFreePreviewPastPaper(paperLockProbe);

              if (!freePreview) {
                const res = await fetch("/api/subscription/status");
                let hasFullAccess = false;
                if (res.ok) {
                  const data = (await res.json()) as { hasFullAccess?: boolean };
                  hasFullAccess = data.hasFullAccess === true;
                }
                if (isPastPaperLibraryLocked(paperLockProbe, hasFullAccess)) {
                  router.push(href);
                  return;
                }
              }

              await startPastPaperSectionSession(target);
              router.push("/past-papers/solve");
            } catch {
              router.push(href);
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
      {starting && typeof document !== "undefined"
        ? createPortal(<PearsonPleaseWaitScreen />, document.body)
        : null}
    </>
  );
}
