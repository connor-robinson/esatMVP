"use client";

import { Suspense } from "react";
import { useHomepageState } from "@/hooks/useHomepageState";
import { LoggedInHomepage } from "@/components/homepage/LoggedInHomepage";
import { ExampleAnswerRevealModal } from "@/components/home/ExampleAnswerRevealModal";
import { Container } from "@/components/layout/Container";

/**
 * Authenticated dashboard shell used by `/dashboard`.
 * Waits for client session + summary hydration so logged-out UI never flashes.
 */
export function DashboardPageContent() {
  const state = useHomepageState();

  if (!state.isLoggedIn || state.isLoading) {
    return (
      <Container className="py-10 sm:py-14">
        <div className="flex min-h-[50vh] items-center justify-center">
          <div
            className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"
            aria-label="Loading dashboard"
          />
        </div>
      </Container>
    );
  }

  return (
    <>
      <LoggedInHomepage state={state} />
      <Suspense fallback={null}>
        <ExampleAnswerRevealModal />
      </Suspense>
    </>
  );
}
