/**
 * StageNode - Circular node/bubble representing a roadmap stage
 * Similar to VerticalRoadmap lesson bubbles
 */

"use client";

import { motion } from "framer-motion";
import { getPaperTypeColor } from "@/config/colors";
import { cn } from "@/lib/utils";
import type { RoadmapStage } from "@/lib/papers/roadmapConfig";
import { Lock } from "lucide-react";

interface StageNodeProps {
  stage: RoadmapStage;
  completedCount: number;
  totalCount: number;
  isUnlocked: boolean;
  isCurrent?: boolean;
  isCompleted?: boolean;
  onNodeClick: () => void;
  index: number;
}

const NODE_SIZE = 140;

export function StageNode({
  stage,
  completedCount,
  totalCount,
  isUnlocked,
  isCurrent = false,
  isCompleted = false,
  onNodeClick,
  index,
}: StageNodeProps) {
  const examColor = getPaperTypeColor(stage.examName);
  const percentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleClick = () => {
    if (isUnlocked) {
      onNodeClick();
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <motion.button
          onClick={handleClick}
          disabled={!isUnlocked}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileHover={isUnlocked ? { 
            scale: 1.08,
            y: -4,
          } : {}}
          whileTap={isUnlocked ? { scale: 0.95 } : {}}
          transition={{
            opacity: { duration: 0.2 },
            scale: { duration: 0.2, ease: "easeOut" },
            y: { duration: 0.2, ease: "easeOut" },
          }}
          className={cn(
            "relative rounded-2xl transition-all backdrop-blur-sm",
            isCompleted
              ? "bg-white/8 shadow-xl"
              : isUnlocked
              ? "bg-white/8 hover:bg-white/10 hover:shadow-2xl"
              : "bg-white/4 opacity-40 cursor-not-allowed"
          )}
          style={{
            width: NODE_SIZE,
            height: NODE_SIZE,
          }}
        >
          {/* Backdrop blur overlay */}
          <div className="absolute inset-0 bg-white/5 rounded-2xl backdrop-blur-xl" />

          {/* Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-3">
            {!isUnlocked ? (
              <Lock className="h-12 w-12 text-white/20" strokeWidth={2} />
            ) : (
              <>
                <div className="text-lg font-bold text-white/90 text-center leading-tight mb-1">
                  {stage.year}
                </div>
                <div
                  className="text-lg font-bold uppercase tracking-wide text-center"
                  style={{ color: examColor }}
                >
                  {stage.examName}
                </div>
              </>
            )}
          </div>

          {/* Section count badge */}
          {isUnlocked && !isCompleted && totalCount > 0 && (
            <div
              className={cn(
                "absolute -bottom-4 left-1/2 transform -translate-x-1/2 z-10",
                "px-3 py-1 rounded-lg text-xs font-bold",
                "bg-background/90 backdrop-blur-sm border-2 shadow-lg",
                isCurrent ? "" : "border-white/25 text-white/60"
              )}
              style={isCurrent ? { borderColor: examColor + "66", color: examColor } : undefined}
            >
              {completedCount}/{totalCount}
            </div>
          )}

          {/* Completed checkmark badge */}
          {isCompleted && (
            <div
              className={cn(
                "absolute -bottom-4 left-1/2 transform -translate-x-1/2 z-10",
                "px-3 py-1 rounded-lg text-xs font-bold",
                "bg-background/90 backdrop-blur-sm border-2 shadow-lg"
              )}
              style={{ borderColor: examColor, color: examColor }}
            >
              ✓ Done
            </div>
          )}
        </motion.button>
      </div>

    </div>
  );
}

