"use client";

import { Card } from "@/components/ui/Card";
import type { ProgressMetric } from "@/lib/homepage/types";

interface ProgressSummaryProps {
  metrics: ProgressMetric[];
  title?: string;
}

export function ProgressSummary({
  metrics,
  title = "Your progress",
}: ProgressSummaryProps) {
  if (metrics.length === 0) return null;

  return (
    <Card variant="subtle" className="p-5">
      <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
        {title}
      </h3>
      <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {metrics.map((m) => (
          <div key={m.label}>
            <dt className="text-[10px] uppercase tracking-wide text-text-muted">
              {m.label}
            </dt>
            <dd className="mt-1 text-base font-semibold text-text">{m.value}</dd>
            {m.hint ? (
              <p className="mt-0.5 text-xs text-text-muted">{m.hint}</p>
            ) : null}
          </div>
        ))}
      </dl>
    </Card>
  );
}
