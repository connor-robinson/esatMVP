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
    <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl p-6">
      {/* Section Header */}
      <button
        onClick={onToggleCollapse}
        className="w-full flex items-center justify-between mb-4 group"
      >
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70 text-left group-hover:text-white/90 transition-colors">
            Performance Trends
          </h2>
          <p className="text-sm font-semibold uppercase tracking-wider text-white/70 mt-1 text-left">
            Track your accuracy and speed progression over time
          </p>
        </div>
        <ChevronDown 
          className={cn(
            "h-6 w-6 text-white/40 group-hover:text-white/60 transition-all duration-200",
            isCollapsed && "rotate-180"
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

