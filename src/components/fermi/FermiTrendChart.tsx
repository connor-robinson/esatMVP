"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { FERMI_GUESSR_NAME } from "@/config/fermiGuessr";

export type FermiTrendPoint = {
  playedDate: string;
  puzzleNumber: number;
  averageScore: number;
  percentile: number | null;
};

type FermiTrendChartProps = {
  sessions: FermiTrendPoint[];
  className?: string;
};

function formatDateLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  return d.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
}

export function FermiTrendChart({ sessions, className }: FermiTrendChartProps) {
  const data = useMemo(
    () =>
      sessions.map((s, i) => ({
        index: i + 1,
        playedDate: s.playedDate,
        label: formatDateLabel(s.playedDate),
        score: s.averageScore,
        puzzleNumber: s.puzzleNumber,
      })),
    [sessions],
  );

  if (data.length === 0) {
    return (
      <div className={cn("rounded-organic-xl bg-surface p-6 text-center text-sm text-text-muted", className)}>
        Complete a {FERMI_GUESSR_NAME} round while logged in to start tracking your trend.
      </div>
    );
  }

  return (
    <div className={cn("h-64 w-full rounded-organic-xl bg-surface p-4", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-surface-mid" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-surface-elevated)",
              border: "none",
              borderRadius: "10px",
              color: "var(--color-text)",
              fontSize: "12px",
            }}
            formatter={(value) => [`${value ?? 0}/100`, "Closeness"]}
            labelFormatter={(_, payload) => {
              const row = payload?.[0]?.payload;
              if (!row) return "";
              return `Daily #${row.puzzleNumber} · ${row.playedDate}`;
            }}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="var(--color-secondary)"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "var(--color-secondary)" }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
