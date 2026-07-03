"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { PrimaryAction } from "@/lib/homepage/types";
import { trackHomepageEvent } from "@/lib/homepage/analytics";
import type { HomepageAnalyticsProperties } from "@/lib/homepage/analytics";

interface PrimaryActionCardProps {
  action: PrimaryAction;
  analyticsProps: HomepageAnalyticsProperties;
}

export function PrimaryActionCard({
  action,
  analyticsProps,
}: PrimaryActionCardProps) {
  return (
    <Card variant="elevated" className="relative overflow-hidden p-6 sm:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(var(--color-primary-rgb,34,197,94),0.08),transparent_55%)]"
      />
      <div className="relative z-10">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
          Your next step
        </p>
        <h2 className="mt-2 text-2xl font-bold text-text sm:text-3xl">
          {action.title}
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-text-muted sm:text-base">
          {action.description}
        </p>
        {action.metric ? (
          <p className="mt-3 text-sm font-medium text-text">{action.metric}</p>
        ) : null}
        <div className="mt-6">
          <Link
            href={action.href}
            onClick={() =>
              void trackHomepageEvent("homepage_primary_cta_clicked", {
                ...analyticsProps,
                primary_cta_type: action.type,
                destination: action.href,
              })
            }
          >
            <Button variant="primary" size="lg">
              {action.buttonLabel}
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
