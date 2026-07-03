"use client";

import Link from "next/link";
import { AccessStatusCard } from "@/components/tester/AccessStatusCard";
import { DrillUpgradeBanner } from "@/components/builder/DrillUpgradeBanner";
import type { TesterState } from "@/lib/tester/types";
import type { UpgradePromptData } from "@/lib/homepage/types";
import { trackHomepageEvent } from "@/lib/homepage/analytics";
import type { HomepageAnalyticsProperties } from "@/lib/homepage/analytics";

export function TesterAccessStatus({ state }: { state: TesterState }) {
  return <AccessStatusCard state={state} />;
}

interface UpgradePromptProps {
  prompt: UpgradePromptData;
  analyticsProps: HomepageAnalyticsProperties;
  variant?: "tester" | "free";
}

export function UpgradePrompt({
  prompt,
  analyticsProps,
  variant = "free",
}: UpgradePromptProps) {
  const event =
    variant === "tester" ? "tester_reward_cta_clicked" : "upgrade_cta_clicked";

  return (
    <div
      onClickCapture={() =>
        void trackHomepageEvent(event, {
          ...analyticsProps,
          destination: prompt.href,
        })
      }
    >
      <DrillUpgradeBanner
        variant="panel"
        headline={prompt.headline}
        subtext={prompt.subtext}
        ctaLabel={prompt.ctaLabel}
        href={prompt.href}
      />
    </div>
  );
}

export function TesterProgrammeLink() {
  return (
    <Link
      href="/founding-tester"
      className="text-sm font-semibold text-primary hover:underline"
    >
      View full programme details
    </Link>
  );
}
