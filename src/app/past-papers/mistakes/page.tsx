"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SubscriptionGate } from "@/components/subscription/SubscriptionGate";
import { Container } from "@/components/layout/Container";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import {
  MistakesSessionSettings,
  type MistakesLaunchConfig,
} from "@/components/papers/mistakes/MistakesSessionSettings";
import { MistakesPracticeRunner } from "@/components/papers/mistakes/MistakesPracticeRunner";
import type {
  MistakeQuestionPayload,
  MistakesSummary,
} from "@/lib/papers/mistakes";
import {
  getMistakesDemoSummary,
  isMistakesDemoPreviewAllowed,
  markMistakesDemoReviewed,
  resetMistakesDemoReviews,
  startMistakesDemoSession,
} from "@/lib/papers/mistakesDemo";
import type { Letter } from "@/types/papers";

function MistakesContent({ demoMode }: { demoMode: boolean }) {
  const session = useSupabaseSession();
  const [summary, setSummary] = useState<MistakesSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<{
    sessionId: string;
    mode: MistakesLaunchConfig["mode"];
    exam: MistakesLaunchConfig["exam"];
    timeLimitMinutes: number;
    questions: MistakeQuestionPayload[];
    startedAt: number;
  } | null>(null);

  const loadSummary = useCallback(async () => {
    setLoadingSummary(true);
    setError(null);
    if (demoMode) {
      setSummary(getMistakesDemoSummary());
      setLoadingSummary(false);
      return;
    }
    try {
      const res = await fetch("/api/past-papers/mistakes", {
        method: "GET",
        credentials: "include",
      });
      if (res.status === 401) {
        setError("Sign in to use Mistakes.");
        setSummary(null);
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || "Failed to load mistakes pool");
        setSummary(null);
        return;
      }
      const data = await res.json();
      setSummary(data.summary ?? null);
    } catch {
      setError("Failed to load mistakes pool");
      setSummary(null);
    } finally {
      setLoadingSummary(false);
    }
  }, [demoMode]);

  useEffect(() => {
    if (demoMode) {
      void loadSummary();
      return;
    }
    if (session === undefined) return;
    if (!session?.user) {
      setLoadingSummary(false);
      setSummary(null);
      return;
    }
    void loadSummary();
  }, [session, loadSummary, demoMode]);

  const handleStart = async (config: MistakesLaunchConfig) => {
    setStarting(true);
    setError(null);
    try {
      if (demoMode) {
        const questions = startMistakesDemoSession({
          mode: config.mode,
          exam: config.exam,
          questionCount: config.questionCount,
        });
        if (questions.length === 0) {
          setError("No demo questions available for this pool.");
          return;
        }
        setActive({
          sessionId: `demo-mistakes-${Date.now()}`,
          mode: config.mode,
          exam: config.exam,
          timeLimitMinutes: config.timeLimitMinutes,
          questions,
          startedAt: Date.now(),
        });
        return;
      }

      const res = await fetch("/api/past-papers/mistakes", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not start session");
        return;
      }
      const questions = (data.questions || []) as MistakeQuestionPayload[];
      if (questions.length === 0) {
        setError("No questions available for this pool.");
        return;
      }
      setActive({
        sessionId:
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `mistakes-${Date.now()}`,
        mode: config.mode,
        exam: config.exam,
        timeLimitMinutes: data.timeLimitMinutes ?? config.timeLimitMinutes,
        questions,
        startedAt: Date.now(),
      });
    } catch {
      setError("Could not start session");
    } finally {
      setStarting(false);
    }
  };

  const handleComplete = async (
    answers: Array<{
      choice: Letter | null;
      timeSec: number;
      isCorrect: boolean;
    }>,
  ) => {
    if (!active) return;
    if (demoMode) {
      markMistakesDemoReviewed(active.questions.map((q) => q.key));
      return;
    }
    await fetch("/api/past-papers/mistakes/complete", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: active.sessionId,
        mode: active.mode,
        exam: active.exam,
        timeLimitMinutes: active.timeLimitMinutes,
        startedAt: active.startedAt,
        endedAt: Date.now(),
        questions: active.questions,
        answers,
      }),
    });
  };

  const handleExitToSettings = () => {
    setActive(null);
    void loadSummary();
  };

  if (!demoMode && session === undefined) {
    return (
      <div className="animate-pulse rounded-lg bg-surface-subtle h-24" />
    );
  }

  if (!demoMode && !session?.user) {
    const demoHref = "/past-papers/mistakes?demo=1";
    return (
      <div className="mx-auto max-w-lg rounded-[4px] bg-surface p-8 text-center">
        <h1 className="text-lg font-semibold text-text">Mistakes</h1>
        <p className="mt-2 text-sm text-text-muted">
          Sign in to drill past-paper questions you got wrong.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href={`/login?redirectTo=${encodeURIComponent("/past-papers/mistakes")}`}
            className="inline-flex rounded-organic-lg bg-secondary px-5 py-3 text-sm font-semibold text-background hover:opacity-90"
          >
            Sign in
          </Link>
          {isMistakesDemoPreviewAllowed() ? (
            <Link
              href={demoHref}
              className="inline-flex rounded-organic-lg bg-surface-elevated px-5 py-3 text-sm font-semibold text-text hover:bg-surface-mid"
            >
              Try demo preview
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 sm:py-10">
      {demoMode ? (
        <div className="mx-auto mb-4 flex max-w-[960px] flex-wrap items-center justify-between gap-2 rounded-[4px] bg-surface-elevated px-4 py-3 text-sm text-text-muted">
          <span>
            Demo preview — sample ESAT CAMP questions, no login required.
            Reviews stay in this browser tab only.
          </span>
          <button
            type="button"
            onClick={() => {
              resetMistakesDemoReviews();
              void loadSummary();
            }}
            className="rounded-organic-md px-3 py-1.5 text-xs font-semibold text-text hover:bg-surface-mid"
          >
            Reset demo reviews
          </button>
        </div>
      ) : null}
      {active ? (
        <MistakesPracticeRunner
          questions={active.questions}
          timeLimitMinutes={active.timeLimitMinutes}
          onExit={handleExitToSettings}
          onComplete={handleComplete}
        />
      ) : (
        <MistakesSessionSettings
          summary={summary}
          loadingSummary={loadingSummary}
          starting={starting}
          error={error}
          onStart={handleStart}
        />
      )}
    </div>
  );
}

function MistakesPageInner() {
  const searchParams = useSearchParams();
  const wantsDemo = searchParams.get("demo") === "1";
  const demoAllowed = isMistakesDemoPreviewAllowed();
  const demoMode = wantsDemo && demoAllowed;

  const body = useMemo(
    () => (
      <Container size="xl">
        <MistakesContent demoMode={demoMode} />
      </Container>
    ),
    [demoMode],
  );

  if (demoMode) return body;

  return <SubscriptionGate feature="drill">{body}</SubscriptionGate>;
}

export default function PastPapersMistakesPage() {
  return (
    <Suspense
      fallback={
        <Container size="xl">
          <div className="animate-pulse rounded-lg bg-surface-subtle h-24 my-8" />
        </Container>
      }
    >
      <MistakesPageInner />
    </Suspense>
  );
}
