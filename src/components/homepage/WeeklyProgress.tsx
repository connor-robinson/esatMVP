"use client";

import { Card } from "@/components/ui/Card";
import type { WeeklyProgressSummary } from "@/lib/homepage/types";

interface WeeklyProgressProps {
  weekly: WeeklyProgressSummary;
}

export function WeeklyProgress({ weekly }: WeeklyProgressProps) {
  return (
    <Card variant="subtle" className="p-5">
      <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
        This week
      </h3>
      <div className="mt-4 flex flex-wrap gap-6">
        <div>
          <p className="text-2xl font-bold text-text">{weekly.sessionsThisWeek}</p>
          <p className="text-xs text-text-muted">Sessions</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-text">{weekly.questionsThisWeek}</p>
          <p className="text-xs text-text-muted">Questions</p>
        </div>
        {weekly.trendLabel ? (
          <div className="self-end">
            <p className="text-sm text-text-muted">{weekly.trendLabel}</p>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
