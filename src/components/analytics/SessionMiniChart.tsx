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

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/95 backdrop-blur-xl border border-white/10 rounded-organic-lg p-3 shadow-2xl">
        <p className="text-white/90 font-semibold text-xs mb-2.5 font-mono">
          Question #{payload[0].payload.questionNumber}
        </p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-white/50 text-xs font-mono">Accuracy:</span>
            <span className="text-primary font-bold text-xs font-mono">
              {payload[0].value.toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-white/50 text-xs font-mono">Speed:</span>
            <span className="text-warning/80 font-bold text-xs font-mono">
              {payload[1].value.toFixed(1)} q/min
            </span>
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
            stroke="#85BC82"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, fill: "#85BC82" }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="speed"
            stroke="rgba(245,158,11,0.7)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, fill: "rgba(245,158,11,0.7)" }}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 rounded-sm bg-primary" />
          <span className="text-xs text-white/60 font-mono">Accuracy</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 rounded-sm bg-warning/70" />
          <span className="text-xs text-white/60 font-mono">Speed</span>
        </div>
      </div>
    </div>
  );
}

