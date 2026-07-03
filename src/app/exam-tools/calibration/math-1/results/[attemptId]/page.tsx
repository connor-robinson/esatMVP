"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { CalibrationResultsView } from "@/components/calibration/CalibrationResultsView";
import { loadAttempt, saveAttempt } from "@/lib/calibration/attempt";
import { computeResults } from "@/lib/calibration/scoring";
import { CALIBRATION_ROUTES } from "@/lib/calibration/constants";
import type { CalibrationAttempt } from "@/lib/calibration/types";

export default function CalibrationResultsPage() {
  const params = useParams<{ attemptId: string }>();
  const attemptId = params.attemptId;
  const session = useSupabaseSession();
  const [attempt, setAttempt] = useState<CalibrationAttempt | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "not_found">("loading");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // 1. Prefer the local copy (works for anonymous users immediately, and
      //    survives sign-in so results are never lost).
      const local = loadAttempt(attemptId);
      if (local) {
        if (!cancelled) {
          setAttempt(local);
          setStatus("ready");
        }
        // 2. If signed in, merge the local attempt into the account (idempotent upsert).
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

      // 3. No local copy: if signed in, fetch from the account (e.g. another device).
      if (session?.user) {
        try {
          const res = await fetch(`/api/calibration/attempts/${attemptId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.attempt && !cancelled) {
              setAttempt(data.attempt as CalibrationAttempt);
              setStatus("ready");
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

  if (status === "loading") {
    return (
      <Container className="flex min-h-[50vh] items-center justify-center py-16">
        <LoadingSpinner size="md" />
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
    <Container size="md">
      <CalibrationResultsView
        results={results}
        isSignedIn={!!session?.user}
        attemptId={attemptId}
      />
    </Container>
  );
}
