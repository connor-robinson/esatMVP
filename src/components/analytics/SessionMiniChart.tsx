/**
 * Mini line chart showing session progress (accuracy and speed)
 */

"use client";

import { SessionProgressPoint } from "@/types/analytics";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface SessionMiniChartProps {
  data: SessionProgressPoint[];
}

/** Figma Session Progress — accuracy line (accent teal), speed line (warning). */
const ACCURACY_LINE = "#91b4a4";
const SPEED_LINE = "#eaaf40";

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-organic-lg border border-border bg-surface-elevated p-3 shadow-bar-floating backdrop-blur-md">
        <p className="mb-2.5 text-xs font-semibold text-text">
          Question #{payload[0].payload.questionNumber}
        </p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-text-muted">Accuracy:</span>
            <span className="text-xs font-bold text-accent">{payload[0].value.toFixed(1)}%</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-text-muted">Speed:</span>
            <span className="text-xs font-bold text-warning">{payload[1].value.toFixed(1)} q/min</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function SessionMiniChart({ data }: SessionMiniChartProps) {
  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 12, right: 16, left: 8, bottom: 12 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.04)"
            vertical={false}
          />
          <XAxis
            dataKey="questionNumber"
            stroke="rgba(255,255,255,0.08)"
            style={{ fontSize: "11px" }}
            tick={{ fill: "rgba(255,255,255,0.5)" }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
            label={{
              value: "Question #",
              position: "insideBottom",
              offset: -8,
              style: { fontSize: "11px", fill: "rgba(255,255,255,0.4)" },
            }}
          />
          <YAxis
            yAxisId="left"
            stroke="rgba(255,255,255,0.08)"
            style={{ fontSize: "11px" }}
            tick={{ fill: "rgba(255,255,255,0.5)" }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="rgba(255,255,255,0.08)"
            style={{ fontSize: "11px" }}
            tick={{ fill: "rgba(255,255,255,0.5)" }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
            tickFormatter={(value) => `${value.toFixed(1)} q/min`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="accuracy"
            stroke={ACCURACY_LINE}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, fill: ACCURACY_LINE }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="speed"
            stroke={SPEED_LINE}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, fill: SPEED_LINE }}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-4 flex items-center justify-center gap-6">
        <div className="flex items-center gap-2">
          <div
            className="h-1 w-4 rounded-sm"
            style={{ backgroundColor: ACCURACY_LINE }}
          />
          <span className="text-xs text-text-muted">Accuracy</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="h-1 w-4 rounded-sm"
            style={{ backgroundColor: SPEED_LINE }}
          />
          <span className="text-xs text-text-muted">Speed</span>
        </div>
      </div>
    </div>
  );
}

