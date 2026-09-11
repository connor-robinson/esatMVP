"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import {
  useSupabaseClient,
  useSupabaseSession,
} from "@/components/auth/SupabaseSessionProvider";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { signInWithGoogle } from "@/lib/auth/googleOAuth";
import { CalibrationResultsView } from "@/components/calibration/CalibrationResultsView";
import { loadAttempt, saveAttempt } from "@/lib/calibration/attempt";
import { computeResults } from "@/lib/calibration/scoring";
import { CALIBRATION_ROUTES } from "@/lib/calibration/constants";
import type { CalibrationAttempt } from "@/lib/calibration/types";
import { trackEvent } from "@/lib/ga";

export default function CalibrationResultsPage() {
  const params = useParams<{ attemptId: string }>();
  const attemptId = params.attemptId;
  const supabase = useSupabaseClient();
  const session = useSupabaseSession();
  const [attempt, setAttempt] = useState<CalibrationAttempt | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [status, setStatus] = useState<"analyzing" | "ready" | "not_found">(
    "analyzing",
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const local = loadAttempt(attemptId);
      if (local) {
        if (cancelled) return;
        setAttempt(local);
        setStatus("ready");
        setShowSavePrompt(!session?.user);

        if (session?.user) {
          const owned: CalibrationAttempt = { ...local };
          const results = computeResults(owned);
          try {
            await fetch("/api/calibration/attempts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ attempt: owned, result: results }),
            });
            saveAttempt(owned);
          } catch {
            /* best-effort merge */
          }
        }
        return;
      }

      if (session?.user) {
        try {
          const res = await fetch(`/api/calibration/attempts/${attemptId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.attempt && !cancelled) {
              setAttempt(data.attempt as CalibrationAttempt);
              setStatus("ready");
              setShowSavePrompt(false);
              return;
            }
          }
        } catch {
          /* fall through */
        }
      }

      if (!cancelled) setStatus("not_found");
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [attemptId, session?.user]);

  const results = useMemo(
    () => (attempt ? computeResults(attempt) : null),
    [attempt],
  );

  if (status === "analyzing") {
    return (
      <Container className="flex min-h-[70vh] items-center justify-center py-16">
        <div className="max-w-md text-center">
          <LoadingSpinner size="lg" />
          <h1 className="mt-6 font-heading text-2xl font-bold text-text">
            Preparing your results
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-text-muted">
            Building a concise diagnosis from your answers and active timing.
          </p>
        </div>
      </Container>
    );
  }

  if (status === "not_found" || !attempt || !results) {
    return (
      <Container className="py-16">
        <Card variant="elevated" className="mx-auto max-w-lg p-8 text-center">
          <h1 className="text-xl font-bold text-text">Results not found</h1>
          <p className="mt-3 text-sm text-text-muted">
            We could not find this calibration attempt on this device. If you
            completed it while signed in, sign in to view your saved results.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href={CALIBRATION_ROUTES.math1}>
              <Button variant="primary">Start a calibration</Button>
            </Link>
            {!session?.user ? (
              <Link
                href={`/login?redirectTo=${encodeURIComponent(CALIBRATION_ROUTES.math1)}`}
              >
                <Button variant="secondary">Sign in</Button>
              </Link>
            ) : null}
          </div>
        </Card>
      </Container>
    );
  }

  const redirectTo = `${CALIBRATION_ROUTES.math1}/results/${attemptId}`;

  const handleGoogleSignUp = async () => {
    try {
      setAuthLoading(true);
      setAuthError(null);
      trackEvent("sign_up_started", {
        source: "calibration_results",
        method: "google",
      });
      const { error } = await signInWithGoogle(supabase, redirectTo);
      if (error) {
        setAuthError(error.message);
        setAuthLoading(false);
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Something went wrong");
      setAuthLoading(false);
    }
  };

  return (
    <Container size="xl" className="pb-28 sm:pb-12">
      {showSavePrompt ? (
        <div className="mx-auto mt-6 max-w-3xl rounded-2xl border border-border-subtle bg-surface-elevated px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-text">
                Save this result to your free account
              </p>
              <p className="mt-1 text-sm text-text-muted">
                You can keep reviewing without signing up. An account only saves
                the result across devices.
              </p>
              {authError ? (
                <p role="alert" className="mt-2 text-sm text-error">
                  {authError}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:items-end">
              <GoogleAuthButton
                mode="signup"
                loading={authLoading}
                onClick={handleGoogleSignUp}
              />
              <button
                type="button"
                className="min-h-11 text-sm font-medium text-text-muted underline-offset-2 hover:text-text hover:underline"
                onClick={() => setShowSavePrompt(false)}
              >
                Continue without saving
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <CalibrationResultsView
        results={results}
        isSignedIn={!!session?.user}
        attemptId={attemptId}
      />
    </Container>
  );
}
