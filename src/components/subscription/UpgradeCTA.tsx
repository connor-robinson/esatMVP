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
          ? `Unlock ${feature} and everything else with a paid plan.`
          : "Unlock the full roadmap and everything else with a paid plan."
      }
    />
  );
}
