"use client";

import { useHomepageState } from "@/hooks/useHomepageState";
import { HomepageLoadingState } from "@/components/homepage/LoadingState";
import { LoggedInHomepage } from "@/components/homepage/LoggedInHomepage";
import { MarketingHomepage } from "@/components/home/MarketingHomepage";

export function HomePageContent() {
  const state = useHomepageState();

  if (state.isLoading) {
    return <HomepageLoadingState />;
  }

  if (!state.isLoggedIn) {
    return <MarketingHomepage />;
  }

  return <LoggedInHomepage state={state} />;
}
