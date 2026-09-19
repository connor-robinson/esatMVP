/**
 * ESAT Camp Mocks practice table (same layout as Past Papers Home).
 */

import { Suspense } from "react";
import { Container } from "@/components/layout/Container";
import PastPapersHomePage from "@/components/papers/PastPapersHomePage";

function MocksFallback() {
  return (
    <Container className="flex min-h-[50vh] items-center justify-center py-10">
      <div
        className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"
        aria-label="Loading ESAT Camp Mocks"
      />
    </Container>
  );
}

export default function EsatCampMocksPage() {
  return (
    <Suspense fallback={<MocksFallback />}>
      <PastPapersHomePage mode="esat-mocks" />
    </Suspense>
  );
}
