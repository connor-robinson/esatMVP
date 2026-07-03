"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import type { RecentSessionItem } from "@/lib/homepage/types";

interface RecentActivityProps {
  sessions: RecentSessionItem[];
}

export function RecentActivity({ sessions }: RecentActivityProps) {
  if (sessions.length === 0) return null;

  return (
    <Card variant="subtle" className="p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
          Recent activity
        </h3>
        <Link
          href="/mental-maths/analytics"
          className="text-xs font-semibold text-primary hover:underline"
        >
          View all
        </Link>
      </div>
      <ul className="mt-4 space-y-3">
        {sessions.slice(0, 3).map((s) => (
          <li
            key={s.id}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="font-medium text-text">{s.label}</span>
            <span className="shrink-0 text-text-muted">
              {s.accuracy != null ? `${s.accuracy}%` : null}
              {s.questions != null ? ` · ${s.questions} q` : null}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
