"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import { cssVar } from "@/config/colors";
import type { MistakeTag } from "@/types/papers";
import { aggregateMistakeTagCountsFromTags } from "@/lib/papers/analytics";

const SLICE_OPACITIES = [1, 0.82, 0.68, 0.54, 0.42];

interface MarkSessionMistakeBreakdownProps {
  mistakeTags: MistakeTag[];
}

export function MarkSessionMistakeBreakdown({
  mistakeTags,
}: MarkSessionMistakeBreakdownProps) {
  const { entries, total } = useMemo(
    () => aggregateMistakeTagCountsFromTags(mistakeTags),
    [mistakeTags],
  );

  const donutData = useMemo(
    () =>
      entries.map((e, i) => ({
        name: e.label,
        value: e.count,
        fillOpacity: SLICE_OPACITIES[i % SLICE_OPACITIES.length],
      })),
    [entries],
  );

  const topEntries = entries.slice(0, 5);

  return (
    <div className="h-[168px] overflow-hidden rounded-organic-lg bg-surface-elevated px-4 py-3">
      {total === 0 ? (
        <div className="flex h-full items-center justify-center text-center text-xs text-text-muted">
          Tag mistakes below to see a breakdown here.
        </div>
      ) : (
        <div className="flex h-full gap-4">
          <div className="relative h-full w-[108px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={46}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="var(--color-border-subtle)"
                  strokeWidth={1}
                >
                  {donutData.map((entry, i) => (
                    <Cell
                      key={entry.name}
                      fill={cssVar.maths}
                      fillOpacity={entry.fillOpacity}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v?: number | string) => {
                    const n = typeof v === "number" ? v : Number(v ?? 0);
                    return [`${n} (${((n / total) * 100).toFixed(0)}%)`, "Tagged"];
                  }}
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid var(--color-border)",
                    background: "var(--color-surface-elevated)",
                    color: "var(--color-text)",
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[9px] font-medium uppercase tracking-wide text-text-subtle">
                Tags
              </span>
              <span className="text-lg font-bold tabular-nums text-text">{total}</span>
            </div>
          </div>

          <div className="min-w-0 flex-1 overflow-y-auto pr-1">
            <ul className="space-y-2">
              {topEntries.map((entry, i) => {
                const pct = (entry.count / total) * 100;
                const opacity = SLICE_OPACITIES[i % SLICE_OPACITIES.length];
                return (
                  <li key={entry.label}>
                    <div className="mb-0.5 flex items-center justify-between gap-2 text-[11px]">
                      <span className="min-w-0 truncate font-medium text-text">{entry.label}</span>
                      <span className="shrink-0 tabular-nums text-text-muted">
                        {entry.count}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-mid">
                      <div
                        className="h-full rounded-full bg-maths"
                        style={{ width: `${pct}%`, opacity }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
