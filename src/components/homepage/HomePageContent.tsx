"use client";

import { Suspense } from "react";
import { useHomepageState } from "@/hooks/useHomepageState";
import { LoggedInHomepage } from "@/components/homepage/LoggedInHomepage";
import { MarketingHomepage } from "@/components/home/MarketingHomepage";
import { ExampleAnswerRevealModal } from "@/components/home/ExampleAnswerRevealModal";

/**
 * Renders the marketing homepage immediately (best LCP for logged-out visitors).
 * Swaps to the logged-in dashboard once session state resolves.
 */
export function HomePageContent() {
  const state = useHomepageState();

  if (!state.isLoading && state.isLoggedIn) {
    return (
      <>
        <LoggedInHomepage state={state} />
        <Suspense fallback={null}>
          <ExampleAnswerRevealModal />
        </Suspense>
      </>
    );
  }

  return <MarketingHomepage />;
}
