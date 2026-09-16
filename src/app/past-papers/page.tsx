/**
 * Past Papers hub: ask Library vs Roadmap preference, then route.
 * Direct legacy URLs (`/library`, `/roadmap`) stay available.
 */

import { Suspense } from "react";
import { Container } from "@/components/layout/Container";
import { PastPapersHubClient } from "@/components/papers/PastPapersHubClient";

function HubFallback() {
  return (
    <Container className="flex min-h-[50vh] items-center justify-center py-10">
      <div
        className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"
        aria-label="Loading past papers"
      />
    </Container>
  );
}

export default function PastPapersHubPage() {
  return (
    <Suspense fallback={<HubFallback />}>
      <PastPapersHubClient />
    </Suspense>
  );
}
