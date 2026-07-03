"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

/**
 * Calibration session entry — routes into the mixed mental-maths drill flow.
 * Full calibration scoring is applied when the session completes.
 */
export default function CalibrationSessionPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/mental-maths/drill?calibration=1");
  }, [router]);

  return (
    <Container className="flex min-h-[40vh] items-center justify-center py-16">
      <div className="text-center">
        <LoadingSpinner size="md" />
        <p className="mt-4 text-sm text-text-muted">Preparing your calibration…</p>
      </div>
    </Container>
  );
}
