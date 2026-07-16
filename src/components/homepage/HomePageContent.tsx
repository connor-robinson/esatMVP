"use client";

import { Suspense } from "react";
import { useHomepageState } from "@/hooks/useHomepageState";
import { HomepageLoadingState } from "@/components/homepage/LoadingState";
import { LoggedInHomepage } from "@/components/homepage/LoggedInHomepage";
import { MarketingHomepage } from "@/components/home/MarketingHomepage";
import { ExampleAnswerRevealModal } from "@/components/home/ExampleAnswerRevealModal";

export function HomePageContent() {
  const state = useHomepageState();

  if (state.isLoading) {
    return <HomepageLoadingState />;
  }

  if (!state.isLoggedIn) {
    return <MarketingHomepage />;
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
