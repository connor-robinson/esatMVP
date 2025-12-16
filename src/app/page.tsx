"use client";

import { Suspense, lazy } from "react";
import { Container } from "@/components/layout/Container";

const ActivityHeatmap = lazy(() =>
  import("@/components/home/ActivityHeatmap").then((mod) => ({
    default: mod.ActivityHeatmap,
  }))
);
const QuickNavCarousel = lazy(() =>
  import("@/components/home/QuickNavCarousel").then((mod) => ({
    default: mod.QuickNavCarousel,
  }))
);

const HomePageSkeleton = () => (
  <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center py-8">
    <div className="w-full">
      <Container size="xl">
        <div className="animate-pulse space-y-6">
          <div className="h-96 bg-white/10 rounded-lg" />
        </div>
      </Container>

      <Container size="lg" className="mt-12">
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-white/10 rounded-lg" />
          </div>
        </div>
      </Container>
    </div>
  </div>
);

export default function HomePage() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center py-8">
      <div className="w-full">
        <Container size="xl">
          <Suspense fallback={<div className="h-96 bg-white/10 rounded-lg animate-pulse" />}>
            <ActivityHeatmap />
          </Suspense>
        </Container>

        <Container size="lg" className="mt-12">
          <div className="max-w-5xl mx-auto">
            <Suspense fallback={<HomePageSkeleton />}>
              <QuickNavCarousel />
            </Suspense>
          </div>
        </Container>
      </div>
    </div>
  );
}


