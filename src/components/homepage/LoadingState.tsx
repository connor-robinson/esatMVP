"use client";

import { Container } from "@/components/layout/Container";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

export function HomepageLoadingState() {
  return (
    <Container className="flex min-h-[50vh] items-center justify-center py-16">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-sm text-text-muted">Loading your dashboard…</p>
      </div>
    </Container>
  );
}
