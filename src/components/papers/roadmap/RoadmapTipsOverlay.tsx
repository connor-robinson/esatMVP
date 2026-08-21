/**
 * ESAT guidance tips - floated over the roadmap cards (no extra column width).
 */

"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { getExamAccentBadgeClass } from "@/config/colors";
import type { RoadmapStage } from "@/lib/papers/roadmapConfig";
import { buildRoadmapTimelineMarkers } from "./roadmapTimelineMarkers";

interface RoadmapTipsOverlayProps {
  stages: RoadmapStage[];
  nodePositions: number[];
  currentStageIndex: number;
}

export function RoadmapTipsOverlay({
  stages,
  nodePositions,
  currentStageIndex,
}: RoadmapTipsOverlayProps) {
  const markers = useMemo(
    () => buildRoadmapTimelineMarkers(stages),
    [stages],
  );

  if (markers.length === 0) return null;

  const getTop = (stageIndex: number): number | null => {
    const y = nodePositions[stageIndex];
    return y !== undefined ? y : null;
  };

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20 hidden lg:block"
      aria-hidden
    >
      {markers.map((marker, idx) => {
        const top = getTop(marker.stageIndex);
        if (top === null) return null;

        const isPast = marker.stageIndex < currentStageIndex;

        return (
          <div
            key={`${marker.stageIndex}-${marker.title}-${idx}`}
            className="absolute left-3 max-w-[13rem] sm:left-4 sm:max-w-[14rem]"
            style={{ top: `${top}px`, transform: "translateY(-50%)" }}
          >
            <div
              className={cn(
                "rounded-organic-md px-2.5 py-2 shadow-md backdrop-blur-sm",
                isPast
                  ? "bg-surface-mid/85"
                  : "bg-surface-elevated/92",
              )}
            >
              <div className="mb-1 flex flex-wrap items-center gap-1.5">
                <span
                  className={cn(
                    "rounded-organic-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    getExamAccentBadgeClass(marker.examName),
                  )}
                >
                  {marker.examName}
                </span>
                <span className="text-[10px] font-medium text-text-subtle">
                  {marker.title}
                </span>
              </div>
              <p className="text-[11px] leading-snug text-text-muted">
                {marker.text}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
