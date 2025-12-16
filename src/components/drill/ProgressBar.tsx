/**
 * Progress bar showing question progress
 */

"use client";

import { motion } from "framer-motion";
import { Progress } from "@/components/ui/Progress";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  current: number;
  total: number;
  correct?: number;
  className?: string;
}

export function ProgressBar({
  current,
  total,
  correct,
  className,
}: ProgressBarProps) {
  const percentage = (current / total) * 100;
  const accuracy = correct !== undefined && current > 0
    ? (correct / current) * 100
    : null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("space-y-2", className)}
    >
      {/* Progress bar */}
      <Progress value={current} max={total} />
      
      {/* Stats */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400">
          {current} / {total}
        </span>
        
        {accuracy !== null && (
          <span className="font-medium text-primary">
            {Math.round(accuracy)}% accurate
          </span>
        )}
      </div>
    </motion.div>
  );
}




