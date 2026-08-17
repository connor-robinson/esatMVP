"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import {
  getActiveAttempt,
  getCompletedAttempts,
} from "@/lib/calibration/attempt";
import { trackCalibrationEvent } from "@/lib/calibration/analytics";
import {
  CALIBRATION_ROUTES,
  CALIBRATION_TOTAL_QUESTIONS,
  CALIBRATION_TIME_LIMIT_SECONDS,
  calibrationResultsRoute,
} from "@/lib/calibration/constants";
import type { CalibrationAttempt } from "@/lib/calibration/types";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

export function CalibrationLandingClient() {
  const router = useRouter();
  const session = useSupabaseSession();
  const [inProgress, setInProgress] = useState<CalibrationAttempt | null>(null);
  const [resolving, setResolving] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      const active = getActiveAttempt();
      const completed = getCompletedAttempts();
      const localLatest = completed[0] ?? null;

      void trackCalibrationEvent("calibration_landing_viewed", {
        user_state: session?.user ? "free" : "signed_out",
      });

      // Unfinished attempt → stay on landing to resume.
      if (active) {
        if (!cancelled) {
          setInProgress(active);
          setResolving(false);
        }
        return;
      }

      // Completed locally → results are the main view.
      if (localLatest) {
        router.replace(calibrationResultsRoute(localLatest.attemptId));
        return;
      }

      // Completed on account → results are the main view.
      if (session?.user) {
        try {
          const res = await fetch("/api/calibration/attempts");
          const data = await res.json();
          const latest = (data.attempts ?? []).find(
            (a: { status: string; id: string }) => a.status === "completed",
          );
          if (latest?.id && !cancelled) {
            router.replace(calibrationResultsRoute(latest.id));
            return;
          }
        } catch {
          /* fall through to start landing */
        }
      }

      if (!cancelled) setResolving(false);
    }

    void resolve();
    return () => {
      cancelled = true;
    };
  }, [router, session?.user]);

  const timeLimitMinutes = Math.round(CALIBRATION_TIME_LIMIT_SECONDS / 60);

  const start = () => {
    void trackCalibrationEvent("calibration_start_clicked", {
      user_state: session?.user ? "free" : "signed_out",
      cta_placement: "landing_primary",
    });
    router.push(CALIBRATION_ROUTES.test);
  };

  // The header renders in every state, including the initial server render, so
  // the page always ships an H1 and its description in the HTML.
  const header = (
    <header className="mx-auto max-w-3xl text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-maths">
        Exam tools · Calibration
      </p>
      <h1 className="mt-4 text-3xl font-display font-bold leading-[1.15] tracking-tight text-text sm:text-4xl lg:text-5xl">
        This is the <span className="text-maths">Mathematics 1</span>
        <br className="hidden sm:block" /> calibration test
      </h1>
      <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-text-muted sm:text-lg">
        A short diagnostic to show your weak spots, then a clear next step for
        practice.
      </p>
    </header>
  );

  const dotField = (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-[0.35]"
      style={{
        backgroundImage:
          "radial-gradient(rgba(147, 197, 253, 0.18) 1px, transparent 1px)",
        backgroundSize: "22px 22px",
      }}
    />
  );

  if (resolving) {
    return (
      <div className="relative min-h-[calc(100vh-3.5rem)] overflow-hidden bg-background">
        {dotField}
        <div className="relative mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-5xl flex-col justify-center px-5 py-12 sm:px-8 sm:py-16 lg:px-10">
          {header}
          <div className="mt-10 flex justify-center">
            <LoadingSpinner size="md" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] overflow-hidden bg-background">
      {dotField}

      <div className="relative mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-5xl flex-col justify-center px-5 py-12 sm:px-8 sm:py-16 lg:px-10">
        {header}

        {inProgress ? (
          <p className="mx-auto mt-5 max-w-4xl text-center text-sm text-text-muted">
            You have an unfinished attempt. Resume to continue where you left
            off.
          </p>
        ) : null}

        <section className="mx-auto mt-8 w-full max-w-4xl rounded-3xl bg-surface-elevated/70 px-6 py-7 sm:px-10 sm:py-9">
          <div className="grid gap-6 sm:grid-cols-3 sm:gap-8">
            <div className="text-center sm:text-left">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                Questions
              </p>
              <p className="mt-2 text-3xl font-display font-bold tabular-nums text-text">
                {CALIBRATION_TOTAL_QUESTIONS}
              </p>
            </div>
            <div className="text-center sm:text-left">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                Time
              </p>
              <p className="mt-2 text-3xl font-display font-bold tabular-nums text-text">
                {timeLimitMinutes}
                <span className="ml-1 text-base font-semibold text-text-muted">
                  min
                </span>
              </p>
            </div>
            <div className="text-center sm:text-left">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                Calculator
              </p>
              <p className="mt-2 text-3xl font-display font-bold text-text">
                Off
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-5 border-t border-border-subtle/50 pt-8 sm:grid-cols-2 sm:gap-8">
            <p className="text-sm leading-relaxed text-text-muted sm:text-[15px]">
              Choose one answer for each question. If you are mainly eliminating
              options, mark it as a guess.
            </p>
            <p className="text-sm leading-relaxed text-text-muted sm:text-[15px]">
              No penalties for wrong answers. Attempt every question you can.
              Timing and guesses help the diagnosis.
            </p>
          </div>
        </section>

        <div className="mx-auto mt-8 flex w-full max-w-4xl flex-col items-center gap-3 sm:mt-10">
          <button
            type="button"
            onClick={start}
            className={cn(
              "inline-flex min-w-[14rem] items-center justify-center rounded-xl bg-maths px-8 py-3.5 text-base font-bold text-background transition-all hover:brightness-110",
            )}
          >
            {inProgress ? "Resume" : "Start"}
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
              className="text-sm text-text-muted transition-colors hover:text-text"
            >
              Sign in first to save progress
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
