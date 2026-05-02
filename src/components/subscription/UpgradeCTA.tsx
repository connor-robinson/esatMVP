"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface UpgradeCTAProps {
  feature?: string;
  className?: string;
}

export function UpgradeCTA({ feature, className }: UpgradeCTAProps) {
  return (
    <div
      className={cn(
        "rounded-organic-xl border border-border bg-surface-elevated p-6 ring-1 ring-white/[0.06] sm:p-8",
        className,
      )}
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <h3 className="text-lg font-semibold tracking-tight text-text">
            Upgrade for full access
          </h3>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-text-muted sm:mx-0 sm:mr-auto">
            {feature
              ? `Unlock ${feature} and everything else with a paid plan.`
              : "Unlock the full roadmap and everything else with a paid plan."}
          </p>
          <div className="mt-5 flex justify-center sm:justify-start">
            <Link href="/pricing">
              <Button variant="wide" size="md" className="rounded-organic-lg">
                View plans
              </Button>
            </Link>
          </div>
        </div>
        <div className="flex justify-center sm:justify-end">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-primary">
            <Crown className="h-8 w-8" strokeWidth={1.75} aria-hidden />
          </div>
        </div>
      </div>
    </div>
  );
}
