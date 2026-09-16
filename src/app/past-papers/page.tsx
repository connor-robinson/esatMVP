/**
 * Past Papers Home (default new practice-table UI).
 */

import { Suspense } from "react";
import { Container } from "@/components/layout/Container";
import PastPapersHomePage from "@/components/papers/PastPapersHomePage";

function HomeFallback() {
  return (
    <Container className="flex min-h-[50vh] items-center justify-center py-10">
      <div
        className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"
        aria-label="Loading past papers"
      />
    </Container>
  );
}

export default function PastPapersPage() {
  return (
    <Suspense fallback={<HomeFallback />}>
      <PastPapersHomePage />
    </Suspense>
  );
}
