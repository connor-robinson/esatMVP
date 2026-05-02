"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { ChevronDown } from "lucide-react";
import { SessionSummary } from "@/types/analytics";
import { TOPICS } from "@/config/topics";
import { cn } from "@/lib/utils";

interface SessionTrendsChartProps {
  sessions: SessionSummary[];
}

function percentileValue(s: SessionSummary, pool: SessionSummary[]): number {
  if (pool.length <= 1) return 50;
  const sorted = [...pool].sort((a, b) => a.score - b.score);
  const idx = sorted.findIndex((x) => x.id === s.id);
  if (idx < 0) return 50;
  return Math.round(((idx / (sorted.length - 1)) * 1000)) / 10;
}

function scoreAsPercent(score: number): number {
  return Math.min(100, Math.round((score / 1000) * 1000) / 10);
}

export function SessionTrendsChart({ sessions }: SessionTrendsChartProps) {
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [seriesMode, setSeriesMode] = useState<
    "percentileVsScore" | "percentileVsAccuracy"
  >("percentileVsScore");

  const topicIds = useMemo(() => {
    const ids = new Set<string>();
    sessions.forEach((s) => s.topicIds.forEach((id) => ids.add(id)));
    return Array.from(ids).sort();
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    let list = [...sessions];
    if (topicFilter !== "all") {
      list = list.filter((s) => s.topicIds.includes(topicFilter));
    }
    list.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    return list;
  }, [sessions, topicFilter]);

  const chartData = useMemo(() => {
    return filteredSessions.map((s, i) => ({
      session: i + 1,
      percentile: percentileValue(s, filteredSessions),
      scorePct: scoreAsPercent(s.score),
      accuracyPct: s.totalQuestions > 0 ? Math.round(s.accuracy * 10) / 10 : 0,
    }));
  }, [filteredSessions]);

  const selectShell =
    "appearance-none cursor-pointer rounded-organic-md border border-border bg-surface-mid py-2.5 pl-3 pr-9 text-xs font-medium text-text transition-colors hover:bg-surface-neutral focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 sm:text-sm";

  if (chartData.length === 0) {
    return (
      <p className="rounded-organic-lg border border-border-subtle bg-surface-mid px-4 py-12 text-center text-sm text-text-muted">
        Complete sessions to see performance trends.
      </p>
    );
  }

  return (
    <div className="rounded-organic-lg border border-border-subtle bg-surface-mid p-4 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
        <div className="relative shrink-0">
          <select
            value={topicFilter}
            onChange={(e) => setTopicFilter(e.target.value)}
            className={cn(selectShell, "min-w-[140px]")}
            aria-label="Filter by topic"
          >
            <option value="all">All topics</option>
            {topicIds.map((id) => (
              <option key={id} value={id}>
                {TOPICS[id]?.name ?? id}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        </div>
        <div className="relative shrink-0">
          <select
            value={seriesMode}
            onChange={(e) =>
              setSeriesMode(
                e.target.value as "percentileVsScore" | "percentileVsAccuracy",
              )
            }
            className={cn(selectShell, "min-w-[180px]")}
            aria-label="Series comparison"
          >
            <option value="percentileVsScore">Percentile & score %</option>
            <option value="percentileVsAccuracy">Percentile & accuracy %</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        </div>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="4 6"
            stroke="var(--color-border-subtle)"
            vertical={false}
          />
          <XAxis
            dataKey="session"
            tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "var(--color-border-subtle)" }}
            label={{
              value: "Session number",
              position: "insideBottomRight",
              offset: -4,
              fill: "var(--color-text-subtle)",
              fontSize: 11,
            }}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "var(--color-border-subtle)" }}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-surface-elevated)",
              border: "1px solid var(--color-border)",
              borderRadius: "10px",
            }}
            labelStyle={{ color: "var(--color-text-muted)" }}
            formatter={(value?: number | string, name?: string) => {
              const v = typeof value === "number" ? value : Number(value ?? 0);
              return [`${v.toFixed(1)}%`, name ?? ""];
            }}
            labelFormatter={(l) => `Session ${l}`}
          />
          <Legend wrapperStyle={{ color: "var(--color-text-muted)", fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="percentile"
            stroke="var(--color-maths)"
            strokeWidth={2}
            dot={false}
            name="Percentile"
          />
          <Line
            type="monotone"
            dataKey={seriesMode === "percentileVsScore" ? "scorePct" : "accuracyPct"}
            stroke="var(--color-warning)"
            strokeWidth={2}
            dot={false}
            name={seriesMode === "percentileVsScore" ? "Score (%)" : "Accuracy (%)"}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
