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
          primary ? "h-5 w-5 text-primary" : muted ? "h-3.5 w-3.5 text-text-disabled" : "h-4 w-4 text-text-muted",
        )}
      />
      <div className="min-w-0 flex flex-col justify-center py-0.5">
        <div
          className={cn(
            "mb-0.5 leading-tight text-text-muted",
            muted ? "text-[11px]" : primary ? "text-sm" : "text-xs",
          )}
        >
          {label}
        </div>
        <div
          className={cn(
            "font-bold leading-tight",
            primary ? "text-xl text-text" : muted ? "text-xs text-text-muted" : "text-base text-text",
          )}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

