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
          ? `Unlock ${feature} with a 7-day free trial on Monthly, or buy the Exam Season Pass once.`
          : "Start a 7-day free trial on Monthly, or get the Exam Season Pass as a one-time purchase."
      }
      href="/pricing"
      ctaLabel="Upgrade for free"
    />
  );
}
