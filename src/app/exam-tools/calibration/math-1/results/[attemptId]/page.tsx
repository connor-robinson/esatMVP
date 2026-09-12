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
import {
  loadAttempt,
  queueAttemptForMerge,
  saveAttempt,
  clearPendingMergeIfMatches,
} from "@/lib/calibration/attempt";
import { computeResults } from "@/lib/calibration/scoring";
import { CALIBRATION_ROUTES } from "@/lib/calibration/constants";
import type { CalibrationAttempt } from "@/lib/calibration/types";
import { trackCalibrationEvent } from "@/lib/calibration/analytics";
import { trackEvent } from "@/lib/ga";

type PageStatus = "loading" | "need_auth" | "syncing" | "ready" | "not_found";

/**
 * Results are gated behind sign-in. The raw attempt stays in localStorage and is
 * never deleted; sign-in only uploads a copy to the account.
 */
export default function CalibrationResultsPage() {
  const params = useParams<{ attemptId: string }>();
  const attemptId = params.attemptId;
  const supabase = useSupabaseClient();
  const session = useSupabaseSession();
  const [attempt, setAttempt] = useState<CalibrationAttempt | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [status, setStatus] = useState<PageStatus>("loading");

  const redirectTo = `${CALIBRATION_ROUTES.math1}/results/${attemptId}`;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setSyncError(null);

      // Prefer local attempt (never deleted). Fall back to account copy when signed in.
      let local = loadAttempt(attemptId);

      if (!local && session?.user) {
        try {
          const res = await fetch(`/api/calibration/attempts/${attemptId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.attempt) {
              local = data.attempt as CalibrationAttempt;
              // Mirror to localStorage so future visits still work offline on this device.
              saveAttempt(local);
            }
          }
        } catch {
          /* fall through */
        }
      }

      if (!local) {
        if (!cancelled) setStatus("not_found");
        return;
      }

      if (cancelled) return;
      setAttempt(local);

      if (!session?.user) {
        queueAttemptForMerge(attemptId);
        setStatus("need_auth");
        return;
      }

      // Signed in: sync a copy to the account. Local attempt stays intact.
      setStatus("syncing");
      const results = computeResults(local);
      try {
        const res = await fetch("/api/calibration/attempts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attempt: local, result: results }),
        });
        if (!res.ok) {
          // Still show results from local copy; sync can retry on next visit.
          if (!cancelled) {
            setSyncError("Could not sync to your account yet. Your result is safe on this device.");
          }
        } else {
          clearPendingMergeIfMatches(attemptId);
        }
      } catch {
        if (!cancelled) {
          setSyncError("Could not sync to your account yet. Your result is safe on this device.");
        }
      }

      // Always re-save local so nothing is lost.
      saveAttempt(local);
      if (!cancelled) setStatus("ready");
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

  const handleGoogleSignIn = async () => {
    try {
      setAuthLoading(true);
      setAuthError(null);
      queueAttemptForMerge(attemptId);
      trackEvent("sign_up_started", {
        source: "calibration_results_gate",
        method: "google",
      });
      void trackCalibrationEvent("calibration_sign_in_clicked", {
        user_state: "signed_out",
        attempt_id: attemptId,
        cta_placement: "results_gate_google",
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

  if (status === "loading" || status === "syncing") {
    return (
      <Container className="flex min-h-[70vh] items-center justify-center py-16">
        <div className="max-w-md text-center">
          <LoadingSpinner size="lg" />
          <h1 className="mt-6 font-heading text-2xl font-bold text-text">
            {status === "syncing" ? "Saving your results" : "Preparing your results"}
          </h1>
        </div>
      </Container>
    );
  }

  if (status === "need_auth" && attempt) {
    return (
      <Container className="flex min-h-[70vh] items-center justify-center py-16">
        <Card variant="elevated" className="mx-auto w-full max-w-lg p-8 text-center">
          <h1 className="font-heading text-2xl font-bold text-text">
            Sign in or sign up to view your results
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-text-muted">
            Your calibration answers are saved on this device and will not be
            deleted. Sign in or create a free account to unlock your score and
            review.
          </p>
          {authError ? (
            <p role="alert" className="mt-3 text-sm text-error">
              {authError}
            </p>
          ) : null}
          <div className="mt-6 flex flex-col items-center gap-3">
            <GoogleAuthButton
              mode="signin"
              loading={authLoading}
              onClick={handleGoogleSignIn}
            />
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm">
              <Link
                href={`/login?mode=signin&redirectTo=${encodeURIComponent(redirectTo)}`}
                onClick={() => queueAttemptForMerge(attemptId)}
                className="font-medium text-text-muted underline-offset-2 hover:text-text hover:underline"
              >
                Sign in with email
              </Link>
              <span className="text-text-muted" aria-hidden>
                |
              </span>
              <Link
                href={`/login?mode=signup&redirectTo=${encodeURIComponent(redirectTo)}`}
                onClick={() => queueAttemptForMerge(attemptId)}
                className="font-medium text-text-muted underline-offset-2 hover:text-text hover:underline"
              >
                Sign up with email
              </Link>
            </div>
          </div>
        </Card>
      </Container>
    );
  }

  if (status === "not_found" || !attempt || !results) {
    return (
      <Container className="py-16">
        <Card variant="elevated" className="mx-auto max-w-lg p-8 text-center">
          <h1 className="text-xl font-bold text-text">Results not found</h1>
          <p className="mt-3 text-sm text-text-muted">
            We could not find this calibration attempt on this device
            {session?.user ? " or your account" : ""}. If you completed it on
            another browser, sign in there or start a new calibration.
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

  return (
    <Container size="xl" className="pb-28 sm:pb-12">
      {syncError ? (
        <p className="mx-auto mt-6 max-w-3xl text-sm text-text-muted">{syncError}</p>
      ) : null}
      <CalibrationResultsView
        results={results}
        isSignedIn
        attemptId={attemptId}
      />
    </Container>
  );
}
