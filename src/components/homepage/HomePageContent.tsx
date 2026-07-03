"use client";

import { useHomepageState } from "@/hooks/useHomepageState";
import { HomepageLoadingState } from "@/components/homepage/LoadingState";
import { LoggedOutHomepage } from "@/components/homepage/LoggedOutHomepage";
import { LoggedInHomepage } from "@/components/homepage/LoggedInHomepage";

export function HomePageContent() {
  const state = useHomepageState();

  if (state.isLoading) {
    return <HomepageLoadingState />;
  }

  if (!state.isLoggedIn) {
    return (
      <LoggedOutHomepage
        primaryAction={state.primaryAction}
        premiumOverview={state.upgradePrompt}
      />
    );
  }

  return <LoggedInHomepage state={state} />;
}
