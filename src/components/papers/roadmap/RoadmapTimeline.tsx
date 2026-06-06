/**
 * RoadmapTimeline — vertical progress spine + ESAT tips (desktop left column)
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  getExamAccentFillClass,
  getExamAccentTextClass,
} from "@/config/colors";
import type { RoadmapStage } from "@/lib/papers/roadmapConfig";
import {
  buildRoadmapTimelineMarkers,
  type TimelineMarker,
} from "./roadmapTimelineMarkers";
import { ROADMAP_TIMELINE_SPINE_WIDTH } from "./roadmapTimelineLayout";

interface RoadmapTimelineProps {
  stages: RoadmapStage[];
  nodePositions: number[];
  currentStageIndex?: number;
}

const SPINE_WIDTH = ROADMAP_TIMELINE_SPINE_WIDTH;
const SPINE_CENTER_X = SPINE_WIDTH / 2;
const WAVE_AMPLITUDE = 12;
const WAVE_FREQUENCY = 0.012;

function getNodeX(y: number): number {
  const offsetCorrection = WAVE_AMPLITUDE * 0.3;
  const sine = Math.sin(y * WAVE_FREQUENCY) * WAVE_AMPLITUDE;
  const cosine = Math.cos(y * WAVE_FREQUENCY * 0.7) * (WAVE_AMPLITUDE * 0.3);
  return SPINE_CENTER_X + sine + cosine - offsetCorrection;
}

function generateSpinePath(startY: number, endY: number): string {
  if (endY <= startY) return "";

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

function TimelineTipTooltip({
  marker,
  anchor,
}: {
  marker: TimelineMarker;
  anchor: DOMRect;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed z-[200] w-[17rem] max-w-[calc(100vw-2rem)]"
      style={{
        top: anchor.top + anchor.height / 2,
        left: anchor.right + 14,
        transform: "translateY(-50%)",
      }}
      role="tooltip"
    >
      <div className="rounded-organic-lg bg-surface-elevated px-4 py-3.5 shadow-[0_12px_40px_rgba(0,0,0,0.18)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
        <p
          className={cn(
            "text-[13px] font-semibold leading-tight",
            getExamAccentTextClass(marker.examName),
          )}
        >
          {marker.title}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          {marker.text}
        </p>
      </div>
    </div>,
    document.body,
  );
}

function TimelineTipMarker({
  marker,
  centerY,
  nodeX,
}: {
  marker: TimelineMarker;
  centerY: number;
  nodeX: number;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);

  const showTip = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) setAnchor(rect);
  }, []);

  const hideTip = useCallback(() => {
    setAnchor(null);
  }, []);

  return (
    <>
      <div
        className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
        style={{ left: nodeX, top: centerY }}
      >
        <button
          ref={buttonRef}
          type="button"
          onMouseEnter={showTip}
          onMouseLeave={hideTip}
          onFocus={showTip}
          onBlur={hideTip}
          className={cn(
            "relative flex h-7 w-7 items-center justify-center rounded-full transition-transform duration-fast ease-signature",
            "hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
            getExamAccentTextClass(marker.examName),
          )}
          aria-label={`${marker.title}: ${marker.text}`}
        >
          <span
            className="absolute inset-0 rounded-full border-[3px] border-current opacity-35 animate-pulse"
            aria-hidden
          />
          <span
            className={cn(
              "absolute inset-[5px] rounded-full ring-[3px] ring-current ring-offset-2 ring-offset-background",
            )}
            aria-hidden
          />
          <span
            className={cn(
              "relative z-10 h-2.5 w-2.5 rounded-full",
              getExamAccentFillClass(marker.examName),
            )}
            aria-hidden
          />
        </button>
      </div>
      {anchor ? <TimelineTipTooltip marker={marker} anchor={anchor} /> : null}
    </>
  );
}

export function RoadmapTimeline({
  stages,
  nodePositions,
  currentStageIndex,
}: RoadmapTimelineProps) {
  const [animateSpine, setAnimateSpine] = useState(false);

  useEffect(() => {
    setAnimateSpine(true);
  }, []);

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
      ? getCenterPosition(allNodePositions.length - 1) + 56
      : 0;

  const endFlagY = connectorEndPos;
  const endFlagX = getNodeX(endFlagY);

  const currentNodeY =
    effectiveCurrentIndex >= 0 && effectiveCurrentIndex < allNodePositions.length
      ? getCenterPosition(effectiveCurrentIndex)
      : 0;

  const fullPath = generateSpinePath(0, connectorEndPos);
  const completedPath =
    effectiveCurrentIndex > 0 ? generateSpinePath(0, currentNodeY) : "";

  const markerStageIndices = new Set(markers.map((m) => m.stageIndex));

  return (
    <div className="relative min-h-screen w-full font-sans">
      <div
        className="absolute left-1/2 top-0 -translate-x-1/2"
        style={{ width: SPINE_WIDTH, bottom: 0 }}
      >
        <svg
          className="pointer-events-none absolute left-0 top-0"
          style={{
            width: SPINE_WIDTH,
            height: connectorEndPos,
            overflow: "visible",
          }}
          viewBox={`0 0 ${SPINE_WIDTH} ${connectorEndPos}`}
          preserveAspectRatio="none"
          aria-hidden
        >
          {fullPath ? (
            <path
              d={fullPath}
              fill="none"
              className="stroke-surface-mid"
              strokeWidth={6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}

          {completedPath ? (
            animateSpine ? (
              <motion.path
                d={completedPath}
                fill="none"
                className="stroke-accent"
                strokeWidth={6}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />
            ) : (
              <path
                d={completedPath}
                fill="none"
                className="stroke-accent"
                strokeWidth={6}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )
          ) : null}
        </svg>

        {allNodePositions.map((_, index) => {
          const stage = stages[index];
          const centerY = getCenterPosition(index);
          const nodeX = getNodeX(centerY);
          const isCompleted = index < effectiveCurrentIndex;
          const isCurrent = index === effectiveCurrentIndex;
          const hasTip = markerStageIndices.has(index);

          if (hasTip) return null;

          return (
            <div
              key={`node-${stage.id}`}
              className={cn(
                "absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-fast ease-signature",
                isCurrent
                  ? cn(
                      "h-4 w-4 ring-2 ring-offset-2 ring-offset-background ring-current",
                      getExamAccentTextClass(stage.examName),
                      getExamAccentFillClass(stage.examName),
                    )
                  : isCompleted
                    ? cn("h-3.5 w-3.5", getExamAccentFillClass(stage.examName))
                    : "h-3 w-3 bg-surface-neutral",
              )}
              style={{ left: nodeX, top: centerY }}
            />
          );
        })}

        {markers.map((marker, idx) => {
          const centerY = getCenterPosition(marker.stageIndex);
          if (nodePositions[marker.stageIndex] === undefined && stages.length > 0) {
            return null;
          }
          return (
            <TimelineTipMarker
              key={`tip-${marker.stageIndex}-${marker.title}-${idx}`}
              marker={marker}
              centerY={centerY}
              nodeX={getNodeX(centerY)}
            />
          );
        })}

        {stages.length > 0 ? (
          <div
            className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5"
            style={{ left: endFlagX, top: endFlagY }}
            title="End of roadmap"
          >
            <Flag
              className="h-5 w-5 text-text-muted"
              strokeWidth={2}
              aria-hidden
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
