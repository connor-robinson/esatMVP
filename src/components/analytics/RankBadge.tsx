/**
 * Rank badge component with improved colors and animations
 */

"use client";

import { cn } from "@/lib/utils";

interface RankBadgeProps {
  rank: number;
  sortMode: "recent" | "performance";
  size?: "default" | "compact";
}

export function RankBadge({ rank, sortMode, size = "default" }: RankBadgeProps) {
  const isPerformanceMode = sortMode === "performance";

  const getBadgeStyle = () => {
    if (isPerformanceMode) {
      if (rank === 1) {
        return {
          bg: "bg-amber-400/20",
          border: "border-amber-400/40",
          text: "text-amber-300",
          shadow: "shadow-lg shadow-amber-400/30",
          animate: true,
        };
      }
      if (rank === 2) {
        return {
          bg: "bg-slate-300/20",
          border: "border-slate-300/40",
          text: "text-slate-200",
          shadow: "shadow-lg shadow-slate-300/20",
          animate: false,
        };
      }
      if (rank === 3) {
        return {
          bg: "bg-orange-400/20",
          border: "border-orange-400/40",
          text: "text-orange-300",
          shadow: "shadow-lg shadow-orange-400/20",
          animate: false,
        };
      }
    }

    return {
      bg: "bg-white/10",
      border: "border-white/20",
      text: "text-white/70",
      shadow: "",
      animate: false,
    };
  };

  const style = getBadgeStyle();
  const sizeClasses = size === "compact" 
    ? "w-11 h-11 text-base" 
    : "w-14 h-14 text-lg";

  return (
    <div
      className={cn(
        "flex-shrink-0 rounded-xl border-2 flex items-center justify-center font-bold",
        sizeClasses,
        style.bg,
        style.border,
        style.text,
        style.shadow,
        style.animate && "animate-pulse-soft"
      )}
    >
      {rank}
    </div>
  );
}

