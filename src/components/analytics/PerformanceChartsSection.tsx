/**
 * Performance trends — session-based lines for Mental Maths drill analytics
 */

"use client";

import { PerformanceDataPoint, SessionSummary } from "@/types/analytics";
import { AccuracyChart } from "./AccuracyChart";
import { SpeedChart } from "./SpeedChart";
import { SessionTrendsChart } from "./SessionTrendsChart";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const sectionShell =
  "relative overflow-hidden rounded-organic-xl bg-surface-elevated p-6 sm:p-8";

interface PerformanceChartsSectionProps {
  /** Daily aggregate chart data (fallback when session mode unavailable) */
  performanceData?: PerformanceDataPoint[];
  /** When provided, shows per-session accuracy & speed vs date/time */
  sessions?: SessionSummary[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function PerformanceChartsSection({
  performanceData,
  sessions,
  isCollapsed = false,
  onToggleCollapse,
}: PerformanceChartsSectionProps) {
  return (
    <div className={sectionShell}>
      <button
        type="button"
        onClick={onToggleCollapse}
        className="group mb-4 flex w-full items-center justify-between text-left"
      >
        <div>
          <h2 className="font-heading text-xl font-bold tracking-tight text-text transition-colors sm:text-2xl">
            Performance Trends
          </h2>
          <p className="mt-1 text-left text-sm text-text-muted">
            {sessions?.length
              ? "Accuracy and speed across sessions by date"
              : "Daily accuracy and speed aggregates"}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "h-6 w-6 text-text-muted transition-all duration-200 group-hover:text-text",
            isCollapsed && "rotate-180",
          )}
        />
      </button>

      {/* Collapsible Content */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {sessions?.length ? (
              <SessionTrendsChart sessions={sessions} />
            ) : (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <AccuracyChart data={performanceData ?? []} />
                <SpeedChart data={performanceData ?? []} />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

