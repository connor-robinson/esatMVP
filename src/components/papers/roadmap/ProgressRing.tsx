/**
 * Circular progress indicator for roadmap stages
 */

"use client";

import { motion } from "framer-motion";
import { memo } from "react";

interface ProgressRingProps {
  percentage: number; // 0-100
  size?: number;
  strokeWidth?: number;
  isComplete?: boolean;
  accentColor?: string;
}

function ProgressRingComponent({
  percentage,
  size = 80,
  strokeWidth = 6,
  isComplete = false,
  accentColor,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;
  
  // Color based on completion - use accent color when complete
  const getColor = () => {
    if (isComplete && accentColor) return accentColor;
    if (percentage >= 80) return "#34D399"; // primary color for 80-100%
    if (percentage >= 60) return "#d4a574"; // muted amber for 60-79%
    if (percentage >= 40) return "#d49a74"; // muted orange for 40-59%
    return "#d47474"; // muted red for below 40%
  };
  
  const textSize = size >= 80 ? "text-base" : size >= 60 ? "text-sm" : "text-xs";
  
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90 relative">
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getColor()}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
        />
      </svg>
      
      {/* Percentage text or check icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        {isComplete ? (
          <motion.svg
            width={size * 0.45}
            height={size * 0.45}
            viewBox="0 0 24 24"
            fill="none"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.5, type: "spring", damping: 15 }}
          >
            <path
              d="M5 13l4 4L19 7"
              stroke={accentColor || "#34D399"}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </motion.svg>
        ) : (
          <motion.span
            className={`${textSize} font-semibold`}
            style={{ color: getColor() }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            {Math.round(percentage)}%
          </motion.span>
        )}
      </div>
    </div>
  );
}

// Memoize to prevent unnecessary re-renders
export const ProgressRing = memo(ProgressRingComponent);

