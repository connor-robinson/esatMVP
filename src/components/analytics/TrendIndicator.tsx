/**
 * Reusable trend indicator component
 */

"use client";

import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { TrendData } from "@/types/analytics";

interface TrendIndicatorProps {
  trend: TrendData;
  size?: "sm" | "md";
}

export function TrendIndicator({ trend, size = "md" }: TrendIndicatorProps) {
  const iconSize = size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3";
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";

  // Format the display text based on metric type
  const getDisplayText = () => {
    if (trend.direction === "neutral" || trend.absoluteChange === undefined || trend.absoluteChange === 0) {
      return "No change from yesterday";
    }

    const change = Math.abs(trend.absoluteChange);
    const sign = trend.direction === "up" ? "+" : "-";

    switch (trend.metricType) {
      case "questions":
        return `${sign} ${Math.round(change)} questions from yesterday`;
      case "accuracy":
        return `${sign}${change.toFixed(1)}% accuracy from yesterday`;
      case "speed":
        // Convert q/min change back to seconds per question change
        // If direction is "up" (faster), q/min increased, so seconds decreased
        // We need to calculate the actual seconds change
        const todaySpeedQpm = trend.value;
        const yesterdaySpeedQpm = trend.previousValue || 0;
        let secondsChange = 0;
        if (todaySpeedQpm > 0 && yesterdaySpeedQpm > 0) {
          const todaySeconds = 60 / todaySpeedQpm;
          const yesterdaySeconds = 60 / yesterdaySpeedQpm;
          secondsChange = todaySeconds - yesterdaySeconds;
        }
        const secondsAbs = Math.abs(secondsChange);
        // If seconds decreased (negative change), that's faster (good) - show as negative
        // If seconds increased (positive change), that's slower (bad) - show as positive
        const secondsSign = secondsChange < 0 ? "-" : secondsChange > 0 ? "+" : "";
        return `${secondsSign}${secondsAbs.toFixed(1)}s from yesterday`;
      default:
        return `${sign}${change.toFixed(1)} from yesterday`;
    }
  };

  return (
    <div className="flex items-center gap-1 mt-0.5">
      {trend.direction === "up" && (
        <TrendingUp className={cn(iconSize, "text-success/50")} />
      )}
      {trend.direction === "down" && (
        <TrendingUp className={cn(iconSize, "text-error/50 rotate-180")} />
      )}
      <span
        className={cn(
          textSize,
          "font-medium",
          trend.direction === "up" && "text-success/50",
          trend.direction === "down" && "text-error/50",
          trend.direction === "neutral" && "text-white/30"
        )}
      >
        {getDisplayText()}
      </span>
    </div>
  );
}



