/**
 * Grouped performance charts with header
 */

"use client";

import { PerformanceDataPoint } from "@/types/analytics";
import { AccuracyChart } from "./AccuracyChart";
import { SpeedChart } from "./SpeedChart";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const sectionShell =
  "relative overflow-hidden rounded-organic-xl border border-border bg-surface-elevated p-6 ring-1 ring-white/[0.06] sm:p-8";

interface PerformanceChartsSectionProps {
  performanceData: PerformanceDataPoint[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function PerformanceChartsSection({
  performanceData,
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
            Accuracy and speed over time
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
            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AccuracyChart data={performanceData} />
              <SpeedChart data={performanceData} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

