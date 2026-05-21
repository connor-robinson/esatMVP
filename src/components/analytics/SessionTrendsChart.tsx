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
import { buildSmoothedTrendSeries } from "@/lib/analytics/sessionTrendSmoothing";
import { cn } from "@/lib/utils";

export type SessionTrendXAxisMode = "time" | "session";

interface SessionTrendsChartProps {
  sessions: SessionSummary[];
}

/** Chart panel uses `bg-surface-mid`; selects sit one step darker (light) / lighter (dark). */
const analyticsSelectClass =
  "appearance-none cursor-pointer rounded-organic-md border-0 bg-surface-dark py-2.5 pl-3 pr-9 text-xs font-medium text-text outline-none transition-colors hover:opacity-90 focus:outline-none focus-visible:outline-none dark:bg-surface-neutral sm:text-sm";

function msPerQuestionToQpm(ms: number): number | null {
  if (!ms || ms <= 0) return null;
  return Math.round((60000 / ms) * 10) / 10;
}

function formatSessionAxisLabel(date: Date): string {
  return date.toLocaleString("en-GB", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSessionTooltipLabel(date: Date): string {
  return date.toLocaleString("en-GB", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type ChartRow = {
  sessionNumber: number;
  dateTs: number;
  axisLabel: string;
  tooltipLabel: string;
  accuracy: number | null;
  speed: number | null;
  accuracyTrend: number | null;
  speedTrend: number | null;
  showSmoothedTrend: boolean;
};

function SessionTrendTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: ChartRow }>;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  return (
    <div className="rounded-organic-md border border-border bg-surface-elevated px-3 py-2.5 text-xs shadow-lg">
      <p className="mb-2 font-medium text-text-muted">{row.tooltipLabel}</p>
      <div className="space-y-1 text-text">
        {row.accuracy != null && (
          <p>
            <span className="text-text-muted">Accuracy: </span>
            <span className="font-semibold text-[var(--color-maths)]">
              {row.accuracy.toFixed(1)}%
            </span>
            {row.showSmoothedTrend && row.accuracyTrend != null && (
              <span className="text-text-muted">
                {" "}
                (trend {row.accuracyTrend.toFixed(1)}%)
              </span>
            )}
          </p>
        )}
        {row.speed != null && (
          <p>
            <span className="text-text-muted">Speed: </span>
            <span className="font-semibold text-[var(--color-warning)]">
              {row.speed.toFixed(1)} q/min
            </span>
            {row.showSmoothedTrend && row.speedTrend != null && (
              <span className="text-text-muted">
                {" "}
                (trend {row.speedTrend.toFixed(1)} q/min)
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

export function SessionTrendsChart({ sessions }: SessionTrendsChartProps) {
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [xAxisMode, setXAxisMode] = useState<SessionTrendXAxisMode>("time");

  const topicIds = useMemo(() => {
    const ids = new Set<string>();
    sessions.forEach((s) => s.topicIds.forEach((id) => ids.add(id)));
    return Array.from(ids).sort();
  }, [sessions]);

  const chartData = useMemo((): ChartRow[] => {
    let list = [...sessions];
    if (topicFilter !== "all") {
      list = list.filter((s) => s.topicIds.includes(topicFilter));
    }
    list.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const accuracy = list.map((s) =>
      s.totalQuestions > 0 ? Math.round(s.accuracy * 10) / 10 : null,
    );
    const speed = list.map((s) => msPerQuestionToQpm(s.avgSpeed));
    const { accuracyTrend, speedTrend } = buildSmoothedTrendSeries(
      accuracy,
      speed,
    );

    const showSmoothedTrend = xAxisMode === "time" && list.length >= 3;

    return list.map((s, index) => {
      const sessionNumber = index + 1;
      const ts = s.timestamp.getTime();
      return {
        sessionNumber,
        dateTs: ts,
        axisLabel:
          xAxisMode === "session"
            ? `#${sessionNumber}`
            : formatSessionAxisLabel(s.timestamp),
        tooltipLabel:
          xAxisMode === "session"
            ? `Session #${sessionNumber} · ${formatSessionTooltipLabel(s.timestamp)}`
            : formatSessionTooltipLabel(s.timestamp),
        accuracy: accuracy[index],
        speed: speed[index],
        accuracyTrend: accuracyTrend[index],
        speedTrend: speedTrend[index],
        showSmoothedTrend,
      };
    });
  }, [sessions, topicFilter, xAxisMode]);

  const speedDomain = useMemo((): [number, number] => {
    const keys =
      xAxisMode === "time"
        ? (["speedTrend", "speed"] as const)
        : (["speed"] as const);
    const values = chartData.flatMap((d) =>
      keys.map((k) => d[k]).filter((v): v is number => v != null && v > 0),
    );
    if (values.length === 0) return [0, 12];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = Math.max((max - min) * 0.2, 1);
    return [
      Math.max(0, Math.floor((min - padding) * 10) / 10),
      Math.ceil((max + padding) * 10) / 10,
    ];
  }, [chartData, xAxisMode]);

  const useSmoothedTrend = xAxisMode === "time" && chartData.length >= 3;

  if (chartData.length === 0) {
    return (
      <p className="rounded-organic-lg bg-surface-mid px-4 py-12 text-center text-sm text-text-muted">
        Complete sessions to see performance trends.
      </p>
    );
  }

  return (
    <div className="rounded-organic-lg bg-surface-mid p-4 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
        <div className="relative shrink-0">
          <select
            value={xAxisMode}
            onChange={(e) =>
              setXAxisMode(e.target.value as SessionTrendXAxisMode)
            }
            className={cn(analyticsSelectClass, "min-w-[130px]")}
            aria-label="X-axis mode"
          >
            <option value="time">X-axis: Time</option>
            <option value="session">X-axis: Session #</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        </div>
        <div className="relative shrink-0">
          <select
            value={topicFilter}
            onChange={(e) => setTopicFilter(e.target.value)}
            className={cn(analyticsSelectClass, "min-w-[140px]")}
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
        {useSmoothedTrend && (
          <p className="text-xs text-text-muted sm:ml-auto">
            Smoothed trend; unusual sessions are de-emphasised.
          </p>
        )}
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <LineChart
          data={chartData}
          margin={{ top: 8, right: 12, left: -4, bottom: 4 }}
        >
          <CartesianGrid
            strokeDasharray="4 6"
            stroke="var(--color-border-subtle)"
            vertical={false}
          />
          {xAxisMode === "time" ? (
            <XAxis
              dataKey="dateTs"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              tick={{ fill: "var(--color-text-muted)", fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: "var(--color-border-subtle)" }}
              tickFormatter={(ts) => formatSessionAxisLabel(new Date(ts))}
              minTickGap={48}
              angle={chartData.length > 6 ? -32 : 0}
              textAnchor={chartData.length > 6 ? "end" : "middle"}
              height={chartData.length > 6 ? 56 : 32}
            />
          ) : (
            <XAxis
              dataKey="sessionNumber"
              type="number"
              domain={["dataMin", "dataMax"]}
              allowDecimals={false}
              tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "var(--color-border-subtle)" }}
              tickFormatter={(n) => `#${n}`}
              label={{
                value: "Session",
                position: "insideBottom",
                offset: -2,
                fill: "var(--color-text-subtle)",
                fontSize: 10,
              }}
            />
          )}
          <YAxis
            yAxisId="accuracy"
            domain={[0, 100]}
            tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "var(--color-border-subtle)" }}
            tickFormatter={(v) => `${v}%`}
            width={44}
          />
          <YAxis
            yAxisId="speed"
            orientation="right"
            domain={speedDomain}
            tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "var(--color-border-subtle)" }}
            tickFormatter={(v) => `${v}`}
            width={40}
            label={{
              value: "q/min",
              angle: -90,
              position: "insideRight",
              fill: "var(--color-text-subtle)",
              fontSize: 10,
              dx: 12,
            }}
          />
          <Tooltip content={<SessionTrendTooltip />} />
          <Legend wrapperStyle={{ color: "var(--color-text-muted)", fontSize: 12 }} />
          {useSmoothedTrend ? (
            <>
              <Line
                yAxisId="accuracy"
                type="basis"
                dataKey="accuracyTrend"
                stroke="var(--color-maths)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls
                name="Accuracy trend"
              />
              <Line
                yAxisId="speed"
                type="basis"
                dataKey="speedTrend"
                stroke="var(--color-warning)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls
                name="Speed trend"
              />
            </>
          ) : (
            <>
              <Line
                yAxisId="accuracy"
                type="monotone"
                dataKey="accuracy"
                stroke="var(--color-maths)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--color-maths)" }}
                activeDot={{ r: 5 }}
                connectNulls
                name="Accuracy"
              />
              <Line
                yAxisId="speed"
                type="monotone"
                dataKey="speed"
                stroke="var(--color-warning)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--color-warning)" }}
                activeDot={{ r: 5 }}
                connectNulls
                name="Speed"
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
