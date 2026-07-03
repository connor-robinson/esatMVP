"use client";

import { DrillUpgradeBanner } from "@/components/builder/DrillUpgradeBanner";
import { useTesterProgrammeOptional } from "@/contexts/TesterProgrammeContext";
import { testerActionPending } from "@/lib/tester/checkpoint";
import { cn } from "@/lib/utils";

interface UpgradeCTAProps {
  feature?: string;
  className?: string;
}

export function UpgradeCTA({ feature, className }: UpgradeCTAProps) {
  const testerCtx = useTesterProgrammeOptional();
  const showTesterContinue =
    testerCtx?.state?.isMember && testerActionPending(testerCtx.state);

  if (showTesterContinue) {
    return (
      <DrillUpgradeBanner
        variant="panel"
        className={cn(className)}
        headline="Continue the Founding Tester Programme"
        subtext={
          feature
            ? `Complete your next feedback step to unlock ${feature} and more premium access.`
            : "Complete your next feedback step to unlock premium access again."
        }
        ctaLabel="Continue programme"
        href="/founding-tester"
      />
    );
  }

  return (
    <DrillUpgradeBanner
      variant="panel"
      className={cn(className)}
      headline="Upgrade for full access"
      subtext={
        feature
          ? `Unlock ${feature} and everything else with a paid plan.`
          : "Unlock the full roadmap and everything else with a paid plan."
      }
      href="/founding-tester"
      ctaLabel="Upgrade for free"
    />
  );
}
