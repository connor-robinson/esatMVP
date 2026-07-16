"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import {
  getActiveAttempt,
  getCompletedAttempts,
} from "@/lib/calibration/attempt";
import { computeResults } from "@/lib/calibration/scoring";
import { trackCalibrationEvent } from "@/lib/calibration/analytics";
import {
  CALIBRATION_ROUTES,
  CALIBRATION_TOTAL_QUESTIONS,
  CALIBRATION_TIME_LIMIT_SECONDS,
  calibrationResultsRoute,
} from "@/lib/calibration/constants";
import type { CalibrationAttempt } from "@/lib/calibration/types";
import { cn } from "@/lib/utils";
import { solveSessionActionBtn } from "@/lib/papers/solveSessionStyles";

export default function Math1CalibrationLanding() {
  const router = useRouter();
  const session = useSupabaseSession();
  const [inProgress, setInProgress] = useState<CalibrationAttempt | null>(null);
  const [completed, setCompleted] = useState<CalibrationAttempt[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setInProgress(getActiveAttempt());
    setCompleted(getCompletedAttempts());
    setLoaded(true);
    void trackCalibrationEvent("calibration_landing_viewed", {
      user_state: session?.user ? "free" : "signed_out",
    });
  }, [session?.user]);

  const latest = completed[0] ?? null;
  const latestResults = useMemo(
    () => (latest ? computeResults(latest) : null),
    [latest],
  );
  const previousResults = useMemo(
    () => (completed[1] ? computeResults(completed[1]) : null),
    [completed],
  );
  const scoreDelta =
    latestResults && previousResults
      ? latestResults.overallScore - previousResults.overallScore
      : null;

  const timeLimitMinutes = Math.round(CALIBRATION_TIME_LIMIT_SECONDS / 60);

  const start = () => {
    void trackCalibrationEvent("calibration_start_clicked", {
      user_state: session?.user ? "free" : "signed_out",
      cta_placement: "landing_primary",
    });
    router.push(CALIBRATION_ROUTES.test);
  };

  const primaryLabel = !loaded
    ? "Start"
    : inProgress
      ? "Resume"
      : latest
        ? "Retake"
        : "Start";

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center bg-background p-6 sm:p-8">
      <div className="w-full max-w-2xl space-y-6">
        <div className="w-full">
          <p className="text-center text-xs font-mono uppercase tracking-wide text-text-muted">
            Exam Tools · Calibration
          </p>
          <h1 className="mt-3 py-2 text-center text-xl font-mono font-semibold text-text sm:text-2xl">
            This is the{" "}
            <span className="font-semibold text-maths">Mathematics 1</span>{" "}
            calibration test
          </h1>
        </div>

        {loaded && latest && latestResults ? (
          <div className="rounded-organic-lg border border-border-subtle bg-surface-subtle/60 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-mono uppercase tracking-wide text-text-muted">
                  Last score
                </p>
                <p className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-text">
                  {latestResults.overallScore}
                  <span className="text-sm text-text-muted">/100</span>
                  <span className="ml-2 text-xs font-normal text-text-muted">
                    {latestResults.readinessBandLabel}
                  </span>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {scoreDelta != null ? (
                  <span
                    className={cn(
                      "font-mono text-sm font-semibold tabular-nums",
                      scoreDelta >= 0 ? "text-success" : "text-warning",
                    )}
                  >
                    {scoreDelta >= 0 ? "+" : ""}
                    {scoreDelta} since last
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() =>
                    router.push(calibrationResultsRoute(latest.attemptId))
                  }
                  className="rounded-organic-md bg-surface-mid px-3 py-1.5 text-xs font-mono font-medium text-text hover:bg-surface-neutral"
                >
                  View results
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {loaded && inProgress ? (
          <div className="flex items-center justify-center gap-3 py-1">
            <svg
              className="h-4 w-4 text-text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              aria-hidden
            >
              <circle cx="12" cy="12" r="10" strokeWidth="2" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 6v6l4 2"
              />
            </svg>
            <span className="text-sm font-mono text-text-muted">
              You have an unfinished attempt — resume to continue
            </span>
          </div>
        ) : null}

        <div className="space-y-4 rounded-organic-lg border border-border bg-surface-mid/40 p-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-border-subtle py-2">
              <span className="text-sm font-mono uppercase tracking-wide text-text-muted">
                Number of questions
              </span>
              <span className="text-base font-mono font-semibold text-text">
                {CALIBRATION_TOTAL_QUESTIONS}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-border-subtle py-2">
              <span className="text-sm font-mono uppercase tracking-wide text-text-muted">
                Time
              </span>
              <span className="text-base font-mono font-semibold text-text">
                {timeLimitMinutes} minutes
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-mono uppercase tracking-wide text-text-muted">
                Calculator
              </span>
              <span className="text-base font-mono font-semibold text-text">
                Not allowed
              </span>
            </div>
          </div>

          <div className="space-y-3 border-t border-border-subtle pt-4">
            <p className="text-sm font-mono leading-relaxed text-text-muted">
              For each question, choose the one answer you consider correct. After
              selecting, rate your confidence.
            </p>
            <p className="text-sm font-mono leading-relaxed text-text-muted">
              There are no penalties for incorrect responses. Attempt every question
              if you can — your timing and confidence help build a more accurate
              diagnosis.
            </p>
            <p className="text-sm font-mono leading-relaxed text-text-muted">
              You will receive a readiness score, topic breakdown, speed-versus-accuracy
              profile, and a personalised first practice session.
            </p>
            <p className="text-sm font-mono font-semibold leading-relaxed text-text">
              Please click {primaryLabel} to proceed.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            className={cn(
              solveSessionActionBtn,
              "min-w-[200px] px-6 py-3.5 text-lg font-mono",
            )}
            onClick={start}
            disabled={!loaded}
          >
            {primaryLabel}
          </button>

          {!session?.user ? (
            <Link
              href={`/login?redirectTo=${encodeURIComponent(CALIBRATION_ROUTES.math1)}`}
              onClick={() =>
                void trackCalibrationEvent("calibration_sign_in_clicked", {
                  cta_placement: "landing_secondary",
                  user_state: "signed_out",
                })
              }
              className="text-xs font-mono text-text-muted hover:text-text"
            >
              Sign in first to save progress
            </Link>
          ) : null}
        </div>

        <p className="text-center text-[11px] font-mono leading-relaxed text-text-muted">
          This is an original diagnostic tool, not an official ESAT paper.
        </p>
      </div>
    </div>
  );
}
