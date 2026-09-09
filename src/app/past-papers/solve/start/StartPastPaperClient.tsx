"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { PearsonPleaseWaitScreen } from "@/components/pearson/PearsonPleaseWaitScreen";
import { useSubscription } from "@/hooks/useSubscription";
import {
  isFreePreviewPastPaper,
  isPastPaperLibraryLocked,
  freePreviewPastPapersLabel,
} from "@/lib/papers/freePreviewPapers";
import {
  parsePastPaperPracticeSearchParams,
  practiceSectionLabel,
  type PastPaperPracticeTarget,
} from "@/lib/papers/pastPaperPracticeHref";
import {
  clearPendingHubStart,
  setPendingHubStart,
} from "@/lib/papers/hubPendingStart";
import { startPastPaperSectionSession } from "@/lib/papers/startPastPaperSectionSession";
import { APP_ROUTES, SEO_ROUTES } from "@/lib/seo/config";
import { usePaperSessionStore } from "@/store/paperSessionStore";

const launchingTargets = new Set<string>();

function practiceTargetKey(target: PastPaperPracticeTarget): string {
  return [
    target.exam,
    target.year ?? "",
    target.sectionSlug,
    target.examType ?? "official",
  ].join(":");
}

export function StartPastPaperClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = useSupabaseSession();
  const { hasFullAccess, isLoading: subscriptionLoading } = useSubscription();

  const target = useMemo(
    () => parsePastPaperPracticeSearchParams(searchParams),
    [searchParams],
  );

  const returnTo = useMemo(() => {
    const query = searchParams.toString();
    return query
      ? `/past-papers/solve/start?${query}`
      : "/past-papers/solve/start";
  }, [searchParams]);

  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!target) return;
    if (session === undefined) return;
    if (session === null) {
      router.replace(`/login?redirectTo=${encodeURIComponent(returnTo)}`);
    }
  }, [router, returnTo, session, target]);

  useEffect(() => {
    if (!target || session === undefined || session === null) return;
    if (locked) return;
    if (startedRef.current) return;

    const paperLockProbe = {
      examName: target.exam,
      examYear: target.year ?? 0,
    };
    const freePreview = isFreePreviewPastPaper(paperLockProbe);

    if (subscriptionLoading && !freePreview) return;

    if (
      !subscriptionLoading &&
      isPastPaperLibraryLocked(paperLockProbe, hasFullAccess)
    ) {
      setLocked(true);
      return;
    }

    const key = practiceTargetKey(target);
    if (launchingTargets.has(key)) return;
    launchingTargets.add(key);
    startedRef.current = true;

    setPendingHubStart(target);
    usePaperSessionStore.getState().beginSessionBootstrap();
    // Land on solve immediately; continue session setup in the background.
    router.replace("/past-papers/solve");

    void (async () => {
      setError(null);
      try {
        await startPastPaperSectionSession(target);
        clearPendingHubStart();
        usePaperSessionStore.getState().finishSessionBootstrap();
      } catch (err) {
        launchingTargets.delete(key);
        startedRef.current = false;
        clearPendingHubStart();
        const message =
          err instanceof Error
            ? err.message
            : "Failed to start this paper. Try again from the library.";
        usePaperSessionStore.getState().finishSessionBootstrap(message);
        setError(message);
      }
    })();
  }, [
    hasFullAccess,
    locked,
    router,
    session,
    subscriptionLoading,
    target,
  ]);

  if (!target) {
    return (
      <StartMessage
        title="Paper not found"
        body="This start link is missing a paper year or section."
      />
    );
  }

  if (locked) {
    return (
      <StartMessage
        title="Unlock this paper"
        body={`Free accounts can sit ${freePreviewPastPapersLabel()}. Upgrade to start ${target.exam}${target.year ? ` ${target.year}` : ""} ${practiceSectionLabel(target.sectionSlug)} in ESAT Camp.`}
        primary={{ href: "/pricing", label: "See plans" }}
      />
    );
  }

  if (error) {
    return (
      <StartMessage
        title="Could not start this paper"
        body={error}
        primary={{ href: APP_ROUTES.pastPaperLibrary, label: "Open the library" }}
      />
    );
  }

  // Brief handoff while we replace to /past-papers/solve.
  return <PearsonPleaseWaitScreen />;
}

function StartMessage({
  title,
  body,
  primary,
}: {
  title: string;
  body: string;
  primary?: { href: string; label: string };
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="text-xl font-semibold text-white">{title}</h1>
        <p className="text-sm leading-relaxed text-white/70">{body}</p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          {primary ? (
            <Link
              href={primary.href}
              className="inline-flex items-center rounded-xl bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2563EB]"
            >
              {primary.label}
            </Link>
          ) : null}
          <Link
            href={SEO_ROUTES.pastPapers}
            className="inline-flex items-center rounded-xl bg-[#334155] px-4 py-2 text-sm font-semibold text-[#F8FAFC] transition-colors hover:bg-[#475569]"
          >
            Back to past papers
          </Link>
        </div>
      </div>
    </div>
  );
}
