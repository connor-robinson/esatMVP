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
  // Dynamic headers
  const headers = {
    personal: {
      title: "Personal Analytics",
      subtitle: "Track your progress and performance over time"
    },
    global: {
      title: "Global Leaderboards",
      subtitle: "Compete with others and climb the rankings"
    }
  };

  return (
    <div className="flex items-center justify-between mb-8 gap-6">
      {/* Left: Header + Subheader + Selectors */}
      <div className="flex items-center gap-4 flex-1">
        <div className="flex-shrink-0">
          <h1 className="text-xl font-semibold uppercase tracking-wider text-white/70 leading-tight">
            {headers[value].title}
          </h1>
          <p className="text-sm text-white/50 mt-1">
            {headers[value].subtitle}
          </p>
        </div>

        {/* Time Range / Topic Selector right next to header */}
        {(timeRangeSelector || topicSelector) && (
          <div className="ml-4">
            {timeRangeSelector || topicSelector}
          </div>
        )}
      </div>

      {/* Right: Personal/Global Toggle */}
      <div className="flex-shrink-0">
        <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
          <button
            onClick={() => onChange("personal")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm",
              value === "personal"
                ? "bg-primary/20 text-primary shadow-lg shadow-primary/10"
                : "text-white/50 hover:text-white/80"
            )}
          >
            <User className="h-4 w-4" />
            <span>Personal</span>
          </button>
          <button
            onClick={() => onChange("global")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm",
              value === "global"
                ? "bg-cyan/20 text-cyan-light shadow-lg shadow-cyan/10"
                : "text-white/50 hover:text-white/80"
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
