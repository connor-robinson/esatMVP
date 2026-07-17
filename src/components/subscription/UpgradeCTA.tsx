"use client";

import { DrillUpgradeBanner } from "@/components/builder/DrillUpgradeBanner";
import { cn } from "@/lib/utils";

interface UpgradeCTAProps {
  feature?: string;
  className?: string;
}

export function UpgradeCTA({ feature, className }: UpgradeCTAProps) {
  return (
    <DrillUpgradeBanner
      variant="panel"
      className={cn(className)}
      headline="Upgrade for full access"
      subtext={
        feature
          ? `Unlock ${feature} with a 7-day free trial on Monthly or Exam Season Pass.`
          : "Try Monthly or Exam Season Pass free for 7 days — cancel anytime during the trial."
      }
      href="/pricing"
      ctaLabel="Upgrade for free"
    />
  );
}
