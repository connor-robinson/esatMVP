/**
 * Compact time range selector dropdown
 */

"use client";

import { useState } from "react";
import { TimeRange } from "@/types/analytics";
import { ChevronDown, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}

const ranges: { value: TimeRange; label: string }[] = [
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 90 Days" },
  { value: "all", label: "All Time" },
];

export function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const currentRange = ranges.find((r) => r.value === value);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-organic-md text-sm font-medium transition-all duration-200 bg-primary/20 text-primary hover:bg-primary/30"
      >
        <Calendar className="h-4 w-4" />
        <span>{currentRange?.label}</span>
        <ChevronDown className={cn(
          "h-4 w-4 transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop to close dropdown */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown menu */}
          <div className="absolute right-0 top-full mt-2 w-48 bg-background/95 backdrop-blur-xl rounded-organic-lg shadow-2xl overflow-hidden z-20">
            {ranges.map((range) => (
              <button
                key={range.value}
                onClick={() => {
                  onChange(range.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full text-left px-4 py-2.5 text-sm transition-colors",
                  value === range.value
                    ? "bg-primary/20 text-primary font-medium"
                    : "text-white/70 hover:bg-white/5"
                )}
              >
                {range.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

