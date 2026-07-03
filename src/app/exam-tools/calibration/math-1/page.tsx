"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import {
  getActiveAttempt,
  getCompletedAttempts,
} from "@/lib/calibration/attempt";
import { computeResults } from "@/lib/calibration/scoring";
import { trackCalibrationEvent } from "@/lib/calibration/analytics";
import { CALIBRATION_ROUTES, calibrationResultsRoute } from "@/lib/calibration/constants";
import type { CalibrationAttempt } from "@/lib/calibration/types";

const FACTS = [
  "15 questions",
  "≈ 23 minutes",
  "No calculator",
  "Covers all 7 Math 1 areas",
  "Analyses timing & confidence",
  "Free to complete",
];

const RECEIVE = [
  "Readiness score",
  "Topic breakdown",
  "Speed-versus-accuracy profile",
  "Three strongest and weakest areas",
  "Personalised first practice session",
  "Seven-day recommendation plan",
];

const HOW = [
  "Answer 15 questions.",
  "Rate your confidence.",
  "Receive a personalised diagnosis.",
  "Start targeted practice.",
];

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

  const start = () => {
    void trackCalibrationEvent("calibration_start_clicked", {
      user_state: session?.user ? "free" : "signed_out",
      cta_placement: "landing_primary",
    });
    router.push(CALIBRATION_ROUTES.test);
  };

  return (
    <Container size="md" className="py-10 sm:py-14">
      <div className="mx-auto max-w-3xl space-y-10">
        {/* Hero */}
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            Exam Tools · Calibration
          </p>
          <h1 className="mt-3 text-3xl font-bold text-text sm:text-4xl">
            Find your Math 1 weak spots
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-text-muted">
            15 ESAT-style questions. Around 23 minutes. Get a personalised breakdown of
            your accuracy, speed and reasoning.
          </p>

          <div className="mt-6 flex flex-col items-center gap-3">
            {loaded && inProgress ? (
              <Button variant="primary" size="lg" onClick={start}>
                Resume calibration
              </Button>
            ) : loaded && latest ? (
              <Button
                variant="primary"
                size="lg"
                onClick={() => router.push(calibrationResultsRoute(latest.attemptId))}
              >
                View latest results
              </Button>
            ) : (
              <Button variant="primary" size="lg" onClick={start}>
                Start calibration
              </Button>
            )}

            {!session?.user ? (
              <Link
                href={`/login?redirectTo=${encodeURIComponent(CALIBRATION_ROUTES.math1)}`}
                onClick={() =>
                  void trackCalibrationEvent("calibration_sign_in_clicked", {
                    cta_placement: "landing_secondary",
                    user_state: "signed_out",
                  })
                }
                className="text-sm font-medium text-text-muted hover:text-text"
              >
                Sign in first to save progress
              </Link>
            ) : null}

            {loaded && latest ? (
              <Button variant="ghost" onClick={start}>
                Retake calibration
              </Button>
            ) : null}
          </div>
        </div>

        {/* Returning-user latest result */}
        {loaded && latest && latestResults ? (
          <Card variant="elevated" className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
                  Last score
                </p>
                <p className="mt-1 text-3xl font-bold text-text">
                  {latestResults.overallScore}
                  <span className="text-lg text-text-muted">/100</span>
                </p>
                <p className="mt-1 text-sm text-text-muted">
                  {new Date(latest.submittedAt ?? latest.updatedAt).toLocaleDateString()} ·{" "}
                  {latestResults.readinessBandLabel}
                </p>
              </div>
              {scoreDelta != null ? (
                <div className="text-right">
                  <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
                    Since last attempt
                  </p>
                  <p
                    className={
                      scoreDelta >= 0
                        ? "mt-1 text-2xl font-bold text-success"
                        : "mt-1 text-2xl font-bold text-warning"
                    }
                  >
                    {scoreDelta >= 0 ? "+" : ""}
                    {scoreDelta}
                  </p>
                </div>
              ) : null}
            </div>
          </Card>
        ) : null}

        {/* Facts */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {FACTS.map((fact) => (
            <div
              key={fact}
              className="rounded-organic-md bg-surface-subtle px-4 py-3 text-sm font-medium text-text"
            >
              {fact}
            </div>
          ))}
        </div>

        {/* What you receive */}
        <Card variant="subtle" className="p-6">
          <h2 className="text-lg font-semibold text-text">What you receive</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {RECEIVE.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-text-muted">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </Card>

        {/* How it works */}
        <div>
          <h2 className="text-lg font-semibold text-text">How it works</h2>
          <ol className="mt-4 grid gap-3 sm:grid-cols-2">
            {HOW.map((step, index) => (
              <li key={step} className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                  {index + 1}
                </span>
                <span className="pt-1 text-sm text-text">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <p className="text-center text-xs text-text-muted">
          This is an original diagnostic tool, not an official ESAT paper. It is designed to
          help you decide what to practise next.
        </p>
      </div>
    </Container>
  );
}
