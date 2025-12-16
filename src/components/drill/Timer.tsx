/**
 * Timer component with visual indicator
 */

"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import { formatTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface TimerProps {
  startTime: number;
  isPaused?: boolean;
  className?: string;
}

export function Timer({ startTime, isPaused = false, className }: TimerProps) {
  const [elapsed, setElapsed] = useState(0);
  
  useEffect(() => {
    if (isPaused) return;
    
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 100); // Update every 100ms for smooth display
    
    return () => clearInterval(interval);
  }, [startTime, isPaused]);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-center gap-2 px-4 py-2 bg-white/5 rounded-2xl border border-white/10",
        className
      )}
    >
      <Clock className="h-4 w-4 text-primary" />
      <span className="font-mono text-lg font-semibold text-white/90 tabular-nums">
        {formatTime(elapsed)}
      </span>
    </motion.div>
  );
}

