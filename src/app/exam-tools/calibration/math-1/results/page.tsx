"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { getLatestCompletedAttempt } from "@/lib/calibration/attempt";
import { CALIBRATION_ROUTES, calibrationResultsRoute } from "@/lib/calibration/constants";

/** Redirects to the newest attempt's results (local first, then account). */
export default function LatestResultsPage() {
  const router = useRouter();
  const session = useSupabaseSession();

  useEffect(() => {
    async function go() {
      const local = getLatestCompletedAttempt();
      if (local) {
        router.replace(calibrationResultsRoute(local.attemptId));
        return;
      }
      if (session?.user) {
        try {
          const res = await fetch("/api/calibration/attempts");
          const data = await res.json();
          const latest = (data.attempts ?? []).find(
            (a: { status: string; id: string }) => a.status === "completed",
          );
          if (latest) {
            router.replace(calibrationResultsRoute(latest.id));
            return;
          }
        } catch {
          /* fall through */
        }
      }
      router.replace(CALIBRATION_ROUTES.math1);
    }
    void go();
  }, [router, session?.user]);

  return (
    <Container className="flex min-h-[40vh] items-center justify-center py-16">
      <LoadingSpinner size="md" />
    </Container>
  );
}
