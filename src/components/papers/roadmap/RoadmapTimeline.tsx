/**
 * RoadmapTimeline — vertical progress spine + ESAT tips (desktop left column)
 */

"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  getExamAccentFillClass,
  getExamAccentBadgeClass,
  getExamAccentTextClass,
} from "@/config/colors";
import type { RoadmapStage } from "@/lib/papers/roadmapConfig";
import {
  buildRoadmapTimelineMarkers,
  type TimelineMarker,
} from "./roadmapTimelineMarkers";

interface RoadmapTimelineProps {
  stages: RoadmapStage[];
  nodePositions: number[];
  currentStageIndex?: number;
}

const SPINE_WIDTH = 56;
const SPINE_CENTER_X = SPINE_WIDTH / 2;
const WAVE_AMPLITUDE = 10;
const WAVE_FREQUENCY = 0.012;

function getNodeX(y: number): number {
  const offsetCorrection = WAVE_AMPLITUDE * 0.3;
  const sine = Math.sin(y * WAVE_FREQUENCY) * WAVE_AMPLITUDE;
  const cosine = Math.cos(y * WAVE_FREQUENCY * 0.7) * (WAVE_AMPLITUDE * 0.3);
  return SPINE_CENTER_X + sine + cosine - offsetCorrection;
}

function generateSpinePath(startY: number, endY: number): string {
  if (allNodePositions.length === 0 || endY <= startY) return "";

  const points: { x: number; y: number }[] = [];
  const pathLength = endY - startY;
  const steps = Math.max(Math.floor(pathLength / 2), 16);

  for (let i = 0; i <= steps; i++) {
    const y = startY + (i / steps) * pathLength;
    points.push({ x: getNodeX(y), y });
  }

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const curr = points[i];
    const next = points[i + 1];
    if (next) {
      path += ` Q ${curr.x} ${curr.y} ${(curr.x + next.x) / 2} ${(curr.y + next.y) / 2}`;
    } else {
      path += ` L ${curr.x} ${curr.y}`;
    }
  }
  return path;
}

function TimelineTip({
  marker,
  top,
  nodeX,
  isPast,
}: {
  marker: TimelineMarker;
  top: number;
  nodeX: number;
  isPast: boolean;
}) {
  return (
    <div
      className="pointer-events-none absolute z-20 w-[10.5rem]"
      style={{
        top: `${top}px`,
        left: `${nodeX}px`,
        transform: "translate(12px, -50%)",
      }}
    >
      <div
        className={cn(
          "rounded-organic-md px-3 py-2.5",
          isPast ? "bg-surface-mid/80" : "bg-surface-elevated",
        )}
      >
        <div className="mb-1.5 flex items-center gap-2">
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
        <p className="text-xs leading-relaxed text-text-muted">{marker.text}</p>
      </div>
    </div>
  );
}

export function RoadmapTimeline({
  stages,
  nodePositions,
  currentStageIndex,
}: RoadmapTimelineProps) {
  const effectiveCurrentIndex = currentStageIndex ?? 0;

  const markers = useMemo(
    () => buildRoadmapTimelineMarkers(stages),
    [stages],
  );

  const defaultHeight = 100;
  const getCenterPosition = (index: number): number => {
    if (nodePositions[index] !== undefined) return nodePositions[index];
    return index * defaultHeight + defaultHeight / 2;
  };

  const allNodePositions = stages.map((_, index) => getCenterPosition(index));

  const connectorEndPos =
    allNodePositions.length > 0
      ? getCenterPosition(allNodePositions.length - 1) + 48
      : 0;

  const currentNodeY =
    effectiveCurrentIndex >= 0 && effectiveCurrentIndex < allNodePositions.length
      ? getCenterPosition(effectiveCurrentIndex)
      : 0;

  const fullPath = generateSpinePath(0, connectorEndPos);
  const completedPath =
    effectiveCurrentIndex > 0
      ? generateSpinePath(0, currentNodeY)
      : "";

  return (
    <div className="relative min-h-screen w-full font-sans">
      <div
        className="absolute left-1/2 top-0 -translate-x-1/2"
        style={{ width: SPINE_WIDTH, bottom: 0 }}
      >
        <svg
          className="pointer-events-none absolute left-0 top-0"
          style={{ width: SPINE_WIDTH, height: connectorEndPos, overflow: "visible" }}
          viewBox={`0 0 ${SPINE_WIDTH} ${connectorEndPos}`}
          preserveAspectRatio="none"
          aria-hidden
        >
          {fullPath ? (
            <path
              d={fullPath}
              fill="none"
              className="stroke-surface-mid"
              strokeWidth={5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}

          {completedPath ? (
            <motion.path
              d={completedPath}
              fill="none"
              className="stroke-accent"
              strokeWidth={5}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
          ) : null}
        </svg>

        {allNodePositions.map((_, index) => {
          const stage = stages[index];
          const centerY = getCenterPosition(index);
          const nodeX = getNodeX(centerY);
          const isCompleted = index < effectiveCurrentIndex;
          const isCurrent = index === effectiveCurrentIndex;

          return (
            <div
              key={`node-${stage.id}`}
              className={cn(
                "absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-fast ease-signature",
                isCurrent
                  ? cn(
                      "h-3.5 w-3.5 ring-2 ring-offset-2 ring-offset-background ring-current",
                      getExamAccentTextClass(stage.examName),
                      getExamAccentFillClass(stage.examName),
                    )
                  : isCompleted
                    ? cn("h-3 w-3", getExamAccentFillClass(stage.examName))
                    : "h-2.5 w-2.5 bg-surface-neutral",
              )}
              style={{ left: nodeX, top: centerY }}
            />
          );
        })}

        {markers.map((marker, idx) => {
          const top = getCenterPosition(marker.stageIndex);
          const nodeX = getNodeX(top);
          const isPast = marker.stageIndex < effectiveCurrentIndex;

          return (
            <TimelineTip
              key={`${marker.stageIndex}-${marker.title}-${idx}`}
              marker={marker}
              top={top}
              nodeX={nodeX}
              isPast={isPast}
            />
          );
        })}
      </div>
    </div>
  );
}
