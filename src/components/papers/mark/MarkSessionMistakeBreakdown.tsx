"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { PAPER_COLORS } from "@/config/colors";
import type { MistakeTag } from "@/types/papers";
import { aggregateMistakeTagCountsFromTags } from "@/lib/papers/analytics";

const SLICE_COLORS = [
  PAPER_COLORS.mathematics,
  PAPER_COLORS.physics,
  PAPER_COLORS.chemistry,
  PAPER_COLORS.biology,
  PAPER_COLORS.advanced,
];

interface MarkSessionMistakeBreakdownProps {
  mistakeTags: MistakeTag[];
  emptyHint?: string;
}

function MistakeDonutChart({
  entries,
  total,
}: {
  entries: { label: string; count: number }[];
  total: number;
}) {
  const radius = 82;
  const innerHole = 58;
  const strokeWidth = radius - innerHole;
  const ringRadius = innerHole + strokeWidth / 2;
  const circumference = 2 * Math.PI * ringRadius;
  const center = 110;
  const size = 220;

  let currentOffset = 0;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto block"
      role="img"
      aria-label="Mistake tag breakdown"
    >
      <circle
        cx={center}
        cy={center}
        r={ringRadius}
        fill="none"
        stroke="var(--color-border-subtle)"
        strokeWidth={strokeWidth}
      />
      {entries.map((entry, index) => {
        const pct = entry.count / total;
        const dash = pct * circumference;
        const strokeDasharray = `${dash} ${circumference - dash}`;
        const strokeDashoffset = -currentOffset;
        currentOffset += dash;
        const color = SLICE_COLORS[index % SLICE_COLORS.length];

        return (
          <circle
            key={entry.label}
            cx={center}
            cy={center}
            r={ringRadius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            transform={`rotate(-90 ${center} ${center})`}
            className="transition-all duration-300"
          />
        );
      })}
    </svg>
  );
}

export function MarkSessionMistakeBreakdown({
  mistakeTags,
  emptyHint = "Tag mistakes below to see a breakdown here.",
}: MarkSessionMistakeBreakdownProps) {
  const { entries, total } = useMemo(
    () => aggregateMistakeTagCountsFromTags(mistakeTags),
    [mistakeTags],
  );

  const topEntries = entries.slice(0, 6);

  if (total === 0) {
    return (
      <p className="rounded-organic-lg bg-surface-mid/50 px-4 py-8 text-center text-sm text-text-muted">
        {emptyHint}
      </p>
    );
  }

  return (
    <div className="grid gap-6 rounded-organic-lg bg-surface-elevated p-4 sm:gap-8 lg:grid-cols-12 lg:gap-10 lg:p-5">
      <div className="lg:col-span-5">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
          Mistake breakdown
        </h3>
        <div className="relative mx-auto h-[220px] w-[220px]">
          <MistakeDonutChart entries={entries} total={total} />
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-text-subtle">
              Total tags
            </span>
            <span className="text-3xl font-bold tabular-nums text-text">{total}</span>
          </div>
        </div>
      </div>

      <div className="lg:col-span-7">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
          Most common mistakes
        </h3>
        <ul className="space-y-3">
          {topEntries.map((entry, i) => {
            const pct = (entry.count / total) * 100;
            const color = SLICE_COLORS[i % SLICE_COLORS.length];
            return (
              <li key={entry.label}>
                <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2 font-medium text-text">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="truncate">{entry.label}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-text-muted">
                    {entry.count} ({pct.toFixed(0)}%)
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-mid">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{
                      duration: 0.35,
                      ease: [0.32, 0.72, 0, 1],
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
        {entries.length > 6 && (
          <p className="mt-4 text-xs text-text-subtle">
            +{entries.length - 6} more mistake type
            {entries.length - 6 === 1 ? "" : "s"} tagged
          </p>
        )}
      </div>
    </div>
  );
}
