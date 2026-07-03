"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Container } from "@/components/layout/Container";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { CALIBRATION_ROUTES } from "@/lib/calibration/constants";
import type { CalibrationSummary } from "@/lib/calibration/types";

export default function CalibrationResultsPage() {
  const session = useSupabaseSession();
  const [summary, setSummary] = useState<CalibrationSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!session?.user) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/calibration/status");
        const data = await res.json();
        setSummary(data.summary ?? null);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [session?.user]);

  if (!session?.user) {
    return (
      <Container className="py-16">
        <Card variant="elevated" className="mx-auto max-w-lg p-8 text-center">
          <h1 className="text-xl font-bold text-text">Calibration results</h1>
          <p className="mt-3 text-sm text-text-muted">
            Sign in to view your saved calibration profile.
          </p>
          <Link
            href="/login?redirectTo=/calibration/results"
            className="mt-6 inline-flex rounded-full bg-text px-6 py-2.5 text-sm font-bold text-background"
          >
            Sign in
          </Link>
        </Card>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container className="flex min-h-[40vh] items-center justify-center py-16">
        <LoadingSpinner size="md" />
      </Container>
    );
  }

  const result = summary?.result;

  return (
    <Container className="py-12">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Calibration results</h1>
          <p className="mt-2 text-sm text-text-muted">
            Your personalised ESAT skill profile.
          </p>
        </div>

        {!result ? (
          <Card variant="elevated" className="p-6">
            <p className="text-text-muted">
              No calibration results yet. Complete the diagnostic to see your profile.
            </p>
            <Link
              href={CALIBRATION_ROUTES.hub}
              className="mt-4 inline-flex rounded-full bg-text px-6 py-2.5 text-sm font-bold text-background"
            >
              Start calibration
            </Link>
          </Card>
        ) : (
          <>
            {result.summaryText ? (
              <Card variant="elevated" className="p-6">
                <p className="text-lg font-medium text-text">{result.summaryText}</p>
              </Card>
            ) : null}

            <Card variant="subtle" className="p-6">
              <dl className="grid gap-4 sm:grid-cols-2">
                {result.strongestSkill ? (
                  <div>
                    <dt className="text-xs uppercase text-text-muted">Strongest</dt>
                    <dd className="mt-1 font-semibold text-text">
                      {result.strongestSkill}
                    </dd>
                  </div>
                ) : null}
                {result.weakestSkill ? (
                  <div>
                    <dt className="text-xs uppercase text-text-muted">Weakest</dt>
                    <dd className="mt-1 font-semibold text-text">
                      {result.weakestSkill}
                    </dd>
                  </div>
                ) : null}
                {result.accuracy != null ? (
                  <div>
                    <dt className="text-xs uppercase text-text-muted">Accuracy</dt>
                    <dd className="mt-1 font-semibold text-text">
                      {Math.round(result.accuracy)}%
                    </dd>
                  </div>
                ) : null}
                {result.speedProfile ? (
                  <div>
                    <dt className="text-xs uppercase text-text-muted">Profile</dt>
                    <dd className="mt-1 font-semibold capitalize text-text">
                      {result.speedProfile.replace("_", " ")}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </Card>

            {result.recommendedTopicId ? (
              <Link
                href={`/mental-maths/drill?topic=${result.recommendedTopicId}`}
                className="inline-flex rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-background"
              >
                Start recommended practice
              </Link>
            ) : null}
          </>
        )}

        <Link href="/" className="block text-sm font-semibold text-primary hover:underline">
          Back to home
        </Link>
      </div>
    </Container>
  );
}
