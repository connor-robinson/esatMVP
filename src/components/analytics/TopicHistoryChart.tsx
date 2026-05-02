/**
 * Topic historical performance chart showing accuracy and speed trends
 */

"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface TopicHistoryChartProps {
  topicId: string;
  sessions: Array<{
    sessionNumber: number;
    accuracy: number;
    speed: number;
  }>;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/95 backdrop-blur-xl border border-white/10 rounded-xl p-3 shadow-2xl">
        <p className="text-white/90 font-semibold text-xs mb-2">
          Session #{payload[0].payload.sessionNumber}
        </p>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span className="text-white/50 text-xs">Accuracy:</span>
            <span className="text-accent font-bold text-xs">
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

export function TopicHistoryChart({ topicId, sessions }: TopicHistoryChartProps) {
  const CHART_GRID = "var(--color-border-subtle)";
  const CHART_AXIS = "var(--color-border)";
  const CHART_TICK = "var(--color-text-muted)";
  const CHART_LABEL = "var(--color-text-subtle)";
  const ACCURACY_LINE = "var(--color-accent)";
  const SPEED_LINE = "var(--color-warning)";
  // Calculate trends
  const trends = useMemo(() => {
    if (sessions.length < 3) {
      return { accuracy: "neutral", speed: "neutral", accuracyChange: 0, speedChange: 0 };
    }

    const recentCount = Math.min(3, Math.floor(sessions.length / 2));
    const recent = sessions.slice(-recentCount);
    const early = sessions.slice(0, recentCount);

    const recentAccuracy = recent.reduce((sum, s) => sum + s.accuracy, 0) / recent.length;
    const earlyAccuracy = early.reduce((sum, s) => sum + s.accuracy, 0) / early.length;
    const accuracyChange = recentAccuracy - earlyAccuracy;

    const recentSpeed = recent.reduce((sum, s) => sum + s.speed, 0) / recent.length;
    const earlySpeed = early.reduce((sum, s) => sum + s.speed, 0) / early.length;
    const speedChange = recentSpeed - earlySpeed; // Positive is good (more q/s = faster)

    return {
      accuracy: accuracyChange > 3 ? "up" : accuracyChange < -3 ? "down" : "neutral",
      speed: speedChange > 0.3 ? "up" : speedChange < -0.3 ? "down" : "neutral",
      accuracyChange,
      speedChange,
    };
  }, [sessions]);

  const getTrendIcon = (direction: string) => {
    if (direction === "up") return <TrendingUp className="h-4 w-4" />;
    if (direction === "down") return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const getTrendColor = (direction: string) => {
    if (direction === "up") return "text-success";
    if (direction === "down") return "text-error";
    return "text-white/40";
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl">
      <div className="p-6">
        {/* Header */}
        <div className="mb-4">
          <h4 className="text-base font-heading font-bold text-white/90 mb-3">
            Performance History
          </h4>
          <div className="flex items-center gap-4 text-xs">
            <div className={`flex items-center gap-1.5 ${getTrendColor(trends.accuracy)}`}>
              {getTrendIcon(trends.accuracy)}
              <span>
                Accuracy {trends.accuracy === "up" ? "↑" : trends.accuracy === "down" ? "↓" : "→"}{" "}
                {Math.abs(trends.accuracyChange).toFixed(1)}%
              </span>
            </div>
            <div className={`flex items-center gap-1.5 ${getTrendColor(trends.speed)}`}>
              {getTrendIcon(trends.speed)}
              <span>
                Speed {trends.speed === "up" ? "improving" : trends.speed === "down" ? "slower" : "steady"}{" "}
                {Math.abs(trends.speedChange).toFixed(1)} q/min
              </span>
            </div>
          </div>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={sessions} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={CHART_GRID}
              vertical={false}
            />
            <XAxis
              dataKey="sessionNumber"
              stroke={CHART_AXIS}
              style={{ fontSize: "10px" }}
              tick={{ fill: CHART_TICK }}
              tickLine={false}
              axisLine={{ stroke: CHART_GRID }}
              label={{
                value: "Session #",
                position: "insideBottom",
                offset: -5,
                style: { fontSize: "10px", fill: CHART_LABEL },
              }}
            />
            <YAxis
              yAxisId="left"
              stroke={CHART_AXIS}
              style={{ fontSize: "10px" }}
              tick={{ fill: CHART_TICK }}
              tickLine={false}
              axisLine={{ stroke: CHART_GRID }}
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke={CHART_AXIS}
              style={{ fontSize: "10px" }}
              tick={{ fill: CHART_TICK }}
              tickLine={false}
              axisLine={{ stroke: CHART_GRID }}
              tickFormatter={(value) => `${value.toFixed(1)} q/min`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="accuracy"
              stroke={ACCURACY_LINE}
              strokeWidth={2.5}
              dot={{ fill: ACCURACY_LINE, r: 3 }}
              activeDot={{ r: 5, fill: ACCURACY_LINE }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="speed"
              stroke={SPEED_LINE}
              strokeWidth={2.5}
              dot={{ fill: SPEED_LINE, r: 3 }}
              activeDot={{ r: 5, fill: SPEED_LINE }}
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-accent" />
            <span className="text-xs text-white/50">Accuracy</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-warning" />
            <span className="text-xs text-white/50">Speed</span>
          </div>
        </div>
      </div>
    </div>
  );
}

