"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { trackHomepageEvent } from "@/lib/homepage/analytics";
import type { HomepageAnalyticsProperties } from "@/lib/homepage/analytics";

interface RecommendedPracticeProps {
  topicName: string;
  href: string;
  weaknessLabel?: string | null;
  analyticsProps: HomepageAnalyticsProperties;
}

export function RecommendedPractice({
  topicName,
  href,
  weaknessLabel,
  analyticsProps,
}: RecommendedPracticeProps) {
  return (
    <Card variant="subtle" className="p-5">
      <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
        Today&apos;s practice
      </h3>
      <p className="mt-2 text-lg font-semibold text-text">
        {weaknessLabel
          ? `Focus on ${weaknessLabel.toLowerCase()}`
          : `Practice ${topicName}`}
      </p>
      <p className="mt-1 text-sm text-text-muted">
        A recommended 5-minute session based on your profile.
      </p>
      <Link
        href={href}
        onClick={() =>
          void trackHomepageEvent("recommended_practice_clicked", {
            ...analyticsProps,
            destination: href,
          })
        }
        className="mt-4 inline-flex rounded-full bg-text px-5 py-2 text-sm font-bold text-background transition-opacity hover:opacity-90"
      >
        Start {topicName} practice
      </Link>
    </Card>
  );
}
