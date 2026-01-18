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
        {trend.percentage.toFixed(1)}%
      </span>
    </div>
  );
}



