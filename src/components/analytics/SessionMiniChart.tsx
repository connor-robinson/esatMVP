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
      <div className="bg-background/95 backdrop-blur-xl border border-white/10 rounded-xl p-3 shadow-2xl">
        <p className="text-white/90 font-semibold text-xs mb-2">
          Question #{payload[0].payload.questionNumber}
        </p>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span className="text-white/50 text-xs">Accuracy:</span>
            <span className="text-[#7ba3a0] font-bold text-xs">
              {payload[0].value.toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-white/50 text-xs">Speed:</span>
            <span className="text-warning font-bold text-xs">
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
      <ResponsiveContainer width="100%" height={150}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.03)"
            vertical={false}
          />
          <XAxis
            dataKey="questionNumber"
            stroke="rgba(255,255,255,0.1)"
            style={{ fontSize: "10px" }}
            tick={{ fill: "rgba(255,255,255,0.4)" }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
            label={{
              value: "Question #",
              position: "insideBottom",
              offset: -5,
              style: { fontSize: "10px", fill: "rgba(255,255,255,0.3)" },
            }}
          />
          <YAxis
            yAxisId="left"
            stroke="rgba(255,255,255,0.1)"
            style={{ fontSize: "10px" }}
            tick={{ fill: "rgba(255,255,255,0.4)" }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="rgba(255,255,255,0.1)"
            style={{ fontSize: "10px" }}
            tick={{ fill: "rgba(255,255,255,0.4)" }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
              tickFormatter={(value) => `${value.toFixed(1)} q/min`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="accuracy"
            stroke="#7ba3a0"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#7ba3a0" }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="speed"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#f59e0b" }}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-[#7ba3a0]" />
          <span className="text-xs text-white/50">Accuracy</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-warning" />
          <span className="text-xs text-white/50">Speed</span>
        </div>
      </div>
    </div>
  );
}

