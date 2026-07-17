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

export default function CalibrationResultsPage() {
  const params = useParams<{ attemptId: string }>();
  const attemptId = params.attemptId;
  const supabase = useSupabaseClient();
  const session = useSupabaseSession();
  const [attempt, setAttempt] = useState<CalibrationAttempt | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [status, setStatus] = useState<
    "analyzing" | "sign_in_required" | "ready" | "not_found"
  >("analyzing");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const startedAt = Date.now();
      const finishAfterMinimumLoading = async () => {
        const elapsed = Date.now() - startedAt;
        if (elapsed < 1400) {
          await new Promise((resolve) => setTimeout(resolve, 1400 - elapsed));
        }
      };

      // 1. Prefer the local copy (works for anonymous users immediately, and
      //    survives sign-in so results are never lost).
      const local = loadAttempt(attemptId);
      if (local) {
        await finishAfterMinimumLoading();
        if (cancelled) return;

        if (!session?.user) {
          setAttempt(local);
          setStatus("sign_in_required");
          return;
        }

        if (!cancelled) {
          setAttempt(local);
          setStatus("ready");
        }
        // 2. If signed in, merge the local attempt into the account (idempotent upsert).
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
        return;
      }

      // 3. No local copy: if signed in, fetch from the account (e.g. another device).
      if (session?.user) {
        try {
          const res = await fetch(`/api/calibration/attempts/${attemptId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.attempt && !cancelled) {
              await finishAfterMinimumLoading();
              if (cancelled) return;
              setAttempt(data.attempt as CalibrationAttempt);
              setStatus("ready");
              return;
            }
          }
        } catch {
          /* fall through */
        }
      }

      await finishAfterMinimumLoading();
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
            Analysing your calibration
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-text-muted">
            We are checking your accuracy, timing and guessed answers to build a
            concise Math 1 result.
          </p>
        </div>
      </Container>
    );
  }

  if (status === "sign_in_required" && attempt) {
    const redirectTo = `${CALIBRATION_ROUTES.math1}/results/${attemptId}`;

    const handleGoogleSignUp = async () => {
      try {
        setAuthLoading(true);
        setAuthError(null);
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
      <Container className="flex min-h-[70vh] items-center justify-center py-16">
        <div className="mx-auto w-full max-w-[420px] rounded-organic-xl bg-surface-elevated px-6 py-9 text-center sm:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-maths">
            Results ready
          </p>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-text">
            Sign up for free
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-text-muted">
            Unlock your calibration score, save it to your account, and come back
            anytime.
          </p>

          {authError ? (
            <p
              role="alert"
              className="mt-5 rounded-organic-md bg-error/10 px-4 py-3 text-sm text-error"
            >
              {authError}
            </p>
          ) : null}

          <div className="mt-7">
            <GoogleAuthButton
              mode="signup"
              loading={authLoading}
              onClick={handleGoogleSignUp}
            />
          </div>

          <p className="mt-6 text-sm text-text-muted">
            <Link
              href={`/login?redirectTo=${encodeURIComponent(redirectTo)}`}
              className="font-medium text-text-muted underline-offset-2 transition-colors hover:text-text hover:underline"
            >
              I already have an account
            </Link>
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
            We could not find this calibration attempt on this device. If you completed it while
            signed in, sign in to view your saved results.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href={CALIBRATION_ROUTES.math1}>
              <Button variant="primary">Start a calibration</Button>
            </Link>
            {!session?.user ? (
              <Link href={`/login?redirectTo=${encodeURIComponent(CALIBRATION_ROUTES.math1)}`}>
                <Button variant="secondary">Sign in</Button>
              </Link>
            ) : null}
          </div>
        </Card>
      </Container>
    );
  }

  return (
    <Container size="xl">
      <CalibrationResultsView
        results={results}
        isSignedIn={!!session?.user}
        attemptId={attemptId}
      />
    </Container>
  );
}
