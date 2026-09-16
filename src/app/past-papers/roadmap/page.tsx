/**
 * Past Papers Roadmap (legacy URL / selectable default). Same practice table as Home.
 * Hidden from the main nav; reachable via legacy links and default-layout dropdown.
 */

import { Suspense } from "react";
import { Container } from "@/components/layout/Container";
import PastPapersHomePage from "@/components/papers/PastPapersHomePage";

function RoadmapFallback() {
  return (
    <Container className="flex min-h-[50vh] items-center justify-center py-10">
      <div
        className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"
        aria-label="Loading past papers"
      />
    </Container>
  );
}

export default function PastPapersRoadmapPage() {
  return (
    <Suspense fallback={<RoadmapFallback />}>
      <PastPapersHomePage layoutCurrent="roadmap" />
    </Suspense>
  );
}
