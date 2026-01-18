/**
 * View toggle with dynamic header and selectors
 */

"use client";

import { User, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

export type AnalyticsView = "personal" | "global";

interface ViewToggleProps {
  value: AnalyticsView;
  onChange: (view: AnalyticsView) => void;
  timeRangeSelector?: React.ReactNode;
  topicSelector?: React.ReactNode;
}

export function ViewToggle({ value, onChange, timeRangeSelector, topicSelector }: ViewToggleProps) {
  return (
    <div className="flex items-center justify-end mb-8">
      {/* Personal/Global Toggle */}
      <div className="flex-shrink-0">
        <div className="flex gap-2 p-1 bg-white/5 rounded-organic-lg">
          <button
            onClick={() => onChange("personal")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-organic-md font-medium transition-all duration-200 text-sm",
              value === "personal"
                ? "bg-primary/20 text-primary"
                : "text-white/60 hover:text-white/80"
            )}
          >
            <User className="h-4 w-4" />
            <span>Personal</span>
          </button>
          <button
            onClick={() => onChange("global")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-organic-md font-medium transition-all duration-200 text-sm",
              value === "global"
                ? "bg-interview/20 text-interview"
                : "text-white/60 hover:text-white/80"
            )}
          >
            <Globe className="h-4 w-4" />
            <span>Global</span>
          </button>
        </div>
      </div>
    </div>
  );
}
