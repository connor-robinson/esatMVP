/**
 * Metric pill component for displaying stats in cards
 */

"use client";

import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricPillProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  primary?: boolean; // Larger, more prominent
  muted?: boolean; // Smaller, less prominent
}

export function MetricPill({ icon: Icon, label, value, primary, muted }: MetricPillProps) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon
        className={cn(
          "flex-shrink-0",
          primary ? "h-5 w-5 text-primary" : muted ? "h-3.5 w-3.5 text-white/30" : "h-4 w-4 text-white/40"
        )}
      />
      <div className="min-w-0 flex flex-col justify-center py-0.5">
        <div
          className={cn(
            "text-white/50 leading-tight mb-0.5",
            muted ? "text-[11px]" : primary ? "text-sm" : "text-xs"
          )}
        >
          {label}
        </div>
        <div
          className={cn(
            "font-bold leading-tight",
            primary
              ? "text-xl text-white/90"
              : muted
              ? "text-xs text-white/50"
              : "text-base text-white/80"
          )}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

