/**
 * RoadmapTimeline - Vertical timeline on the left side with guidance text
 */

"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { getPaperTypeColor, PAPER_COLORS } from "@/config/colors";
import type { RoadmapStage } from "@/lib/papers/roadmapConfig";

interface TimelineMarker {
  stageIndex: number;
  examName: string;
  text: string; // Now required, max 15 words
}

interface RoadmapTimelineProps {
  stages: RoadmapStage[];
  nodePositions: number[]; // Actual pixel positions of each node from top
  currentStageIndex?: number; // Index of the current (next incomplete) stage
}

export function RoadmapTimeline({ stages, nodePositions, currentStageIndex }: RoadmapTimelineProps) {
  // Use provided currentStageIndex, default to 0 if not provided
  const effectiveCurrentIndex = currentStageIndex ?? 0;
  // Define guidance text at specific transition points - split into multiple small boxes (max 15 words each)
  const markers: TimelineMarker[] = [];

  // Find transition points and exam ranges
  let currentExam = "";
  let nsaaStartIndex = -1;
  let nsaaEndIndex = -1;
  let engaaStartIndex = -1;
  let engaaEndIndex = -1;
  let tmuaStartIndex = -1;
  let tmuaEndIndex = -1;
  let nsaa2023Index = -1;

  stages.forEach((stage, index) => {
    if (stage.examName !== currentExam) {
      currentExam = stage.examName;

      if (stage.examName === "NSAA") {
        if (nsaaStartIndex === -1) {
          nsaaStartIndex = index;
        }
        if (stage.year === 2023) {
          nsaa2023Index = index;
        }
        nsaaEndIndex = index;
      } else if (stage.examName === "ENGAA") {
        if (engaaStartIndex === -1) {
          engaaStartIndex = index;
        }
        engaaEndIndex = index;
      } else if (stage.examName === "TMUA") {
        if (tmuaStartIndex === -1) {
          tmuaStartIndex = index;
        }
        tmuaEndIndex = index;
      }
    }
  });

  // NSAA guidance - spread across multiple positions
  if (nsaaStartIndex >= 0 && nsaaEndIndex >= 0) {
    const nsaaRange = nsaaEndIndex - nsaaStartIndex;
    // Early NSAA guidance
    if (nsaaRange >= 2) {
      markers.push({
        stageIndex: nsaaStartIndex + 1,
        examName: "NSAA",
        text: "Make sure you finish all relevant sections before the exam hall.",
      });
    }
    // Mid NSAA guidance
    if (nsaaRange >= 4) {
      markers.push({
        stageIndex: nsaaStartIndex + Math.floor(nsaaRange / 2),
        examName: "NSAA",
        text: "Cover sections that match your course - don't skip any important topics.",
      });
    }
  }

  // Transition to ENGAA
  if (engaaStartIndex >= 0) {
    markers.push({
      stageIndex: engaaStartIndex,
      examName: "ENGAA",
      text: "Once you finish NSAA papers, move onto these for extra practice.",
    });
  }

  // ENGAA guidance - spread across multiple positions
  if (engaaStartIndex >= 0 && engaaEndIndex >= 0) {
    const engaaRange = engaaEndIndex - engaaStartIndex;
    // Early ENGAA
    markers.push({
      stageIndex: engaaStartIndex + 1,
      examName: "ENGAA",
      text: "Great for math 2 and physics. Some overlap with NSAA questions though.",
    });

    // Mid ENGAA
    if (engaaRange >= 3) {
      markers.push({
        stageIndex: engaaStartIndex + Math.floor(engaaRange / 2),
        examName: "ENGAA",
        text: "The program automatically filters out questions you've already done.",
      });
    }

    // Late ENGAA
    if (engaaRange >= 4) {
      markers.push({
        stageIndex: engaaStartIndex + Math.floor(engaaRange * 0.75),
        examName: "ENGAA",
        text: "Some parts are out of spec - skip them if they don't match your course.",
      });
    }
  }

  // Transition to TMUA
  if (tmuaStartIndex >= 0) {
    markers.push({
      stageIndex: tmuaStartIndex,
      examName: "TMUA",
      text: "Once you finish ENGAA, these are optional but really helpful.",
    });
  }

  // TMUA guidance - spread across multiple positions
  if (tmuaStartIndex >= 0 && tmuaEndIndex >= 0) {
    const tmuaRange = tmuaEndIndex - tmuaStartIndex;

    // Early TMUA
    markers.push({
      stageIndex: tmuaStartIndex + 1,
      examName: "TMUA",
      text: "Longer form questions with similar techniques to ESAT Math 2.",
    });

    // Mid TMUA
    if (tmuaRange >= 3) {
      markers.push({
        stageIndex: tmuaStartIndex + Math.floor(tmuaRange / 2),
        examName: "TMUA",
        text: "More tricks here, so give yourself slightly more time per question.",
      });
    }
  }

  // NSAA 2023 guidance - at the very end
  if (nsaa2023Index >= 0) {
    markers.push({
      stageIndex: nsaa2023Index,
      examName: "NSAA",
      text: "Save this as your final paper - use it as a real exam simulation.",
    });
  }

  const examColor = (examName: string) => getPaperTypeColor(examName);

  // Use actual positions if available - these are now center positions from RoadmapList
  const defaultHeight = 100; // Approximate height for fallback
  const getNodePosition = (index: number): number => {
    if (nodePositions && nodePositions[index] !== undefined) {
      // nodePositions are already center positions from RoadmapList
      return nodePositions[index];
    }
    // Fallback: calculate approximate center position
    return index * defaultHeight + (defaultHeight / 2);
  };

  // Calculate positions for all stages - these are center positions
  const allNodePositions = stages.map((_, index) => getNodePosition(index));

  // Since positions are already centers, use them directly
  const getCenterPosition = (index: number): number => {
    return getNodePosition(index);
  };

  // For markers, use center positions to align with card centers
  const getMarkerPosition = (stageIndex: number): number => {
    return getCenterPosition(stageIndex);
  };

  // Calculate where the connector line should end (after the last node)
  const getConnectorEndPosition = (): number => {
    if (allNodePositions.length === 0) return 0;
    const lastIndex = allNodePositions.length - 1;
    const lastCenter = getCenterPosition(lastIndex);
    // Extend line a bit past the last node center (roughly half a card height)
    return lastCenter + 50;
  };

  const connectorEndPos = getConnectorEndPosition();

  // Generate smooth curved path using sine wave pattern
  const generateCurvedPath = (startY: number = 0, endY?: number): string => {
    if (allNodePositions.length === 0) return "";

    const actualEndY = endY ?? connectorEndPos;

    // Use fixed positioning to ensure stability
    const svgWidth = 200; // Width of the SVG viewport
    const baseX = 100; // Fixed center at 100px
    const waveAmplitude = 18; // Increased amplitude for more obvious curve (px)
    const waveFrequency = 0.015; // Slightly reduced frequency for smoother, more visible curves

    // Calculate initial offset at y=0 to zero it out, so the path starts EXACTLY at baseX (100)
    // At y=0: sin(0) = 0, cos(0) = 1. So offset is waveAmplitude * 0.3
    const offsetCorrection = waveAmplitude * 0.3;

    // Create path points along sine wave
    const pathPoints: { x: number; y: number }[] = [];

    // Start at startY
    const startSineOffset = Math.sin(startY * waveFrequency) * waveAmplitude;
    const startCosineOffset = Math.cos(startY * waveFrequency * 0.7) * (waveAmplitude * 0.3);
    const startX = baseX + startSineOffset + startCosineOffset - offsetCorrection;
    pathPoints.push({ x: startX, y: startY });

    // Generate points along the path with sine wave variation
    const pathLength = actualEndY - startY;
    const numSteps = Math.max(pathLength / 2, 20); // At least 20 steps for smoothness
    for (let i = 1; i <= numSteps; i++) {
      const progress = i / numSteps;
      const y = startY + (progress * pathLength);

      // Calculate X position using sine wave (adds some variation with cosine too)
      const sineOffset = Math.sin(y * waveFrequency) * waveAmplitude;
      const cosineOffset = Math.cos(y * waveFrequency * 0.7) * (waveAmplitude * 0.3);
      const x = baseX + sineOffset + cosineOffset - offsetCorrection;

      pathPoints.push({ x, y });
    }

    // Convert points to SVG path using smooth quadratic curves
    if (pathPoints.length < 2) return "";

    let path = `M ${pathPoints[0].x} ${pathPoints[0].y}`;

    // Use quadratic bezier curves for smooth transitions
    for (let i = 1; i < pathPoints.length; i++) {
      const prev = pathPoints[i - 1];
      const curr = pathPoints[i];
      const next = pathPoints[i + 1];

      if (next) {
        // Use control point between current and next for smooth curve
        const controlX = curr.x;
        const controlY = curr.y;
        path += ` Q ${controlX} ${controlY} ${(curr.x + next.x) / 2} ${(curr.y + next.y) / 2}`;
      } else {
        // Last point
        path += ` L ${curr.x} ${curr.y}`;
      }
    }

    return path;
  };

  // Calculate X position for a node at given Y position along the sine wave
  // Calculate X position for a node at given Y position along the sine wave
  const getNodeXPosition = (y: number): number => {
    const baseX = 100; // Fixed center at 100px, matches generateCurvedPath
    const waveAmplitude = 18; // Match increased amplitude
    const waveFrequency = 0.015; // Match frequency

    // Match the offset correction from generateCurvedPath to ensure alignment
    const offsetCorrection = waveAmplitude * 0.3;

    const sineOffset = Math.sin(y * waveFrequency) * waveAmplitude;
    const cosineOffset = Math.cos(y * waveFrequency * 0.7) * (waveAmplitude * 0.3);

    // Subtract offsetCorrection to center the path at 100px
    return baseX + sineOffset + cosineOffset - offsetCorrection;
  };

  // Generate paths for completed and remaining sections
  const currentNodeY = effectiveCurrentIndex >= 0 && effectiveCurrentIndex < allNodePositions.length
    ? getCenterPosition(effectiveCurrentIndex)
    : 0;

  const completedPath = effectiveCurrentIndex > 0 ? generateCurvedPath(0, currentNodeY) : "";
  const remainingPath = generateCurvedPath(currentNodeY, connectorEndPos);

  // White for completed sections, grey for remaining
  const completedColor = "rgba(255, 255, 255, 0.9)";
  const remainingColor = "rgba(255, 255, 255, 0.2)";

  return (
    <div className="relative w-full h-full min-h-screen">
      {/* Main timeline branch - curved sine wave line - centered container */}
      <div className="absolute left-1/2 top-0 -translate-x-1/2" style={{ bottom: 0, width: "200px" }}>
        {/* Curved connector line using SVG path - split into completed and remaining */}
        <svg
          className="absolute top-0 left-0 pointer-events-none"
          style={{ width: "200px", height: `${connectorEndPos}px`, overflow: "visible" }}
          viewBox={`0 0 200 ${connectorEndPos}`}
          preserveAspectRatio="none"
        >
          <defs>
            <filter id="timeline-glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="timeline-glow-blue">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <defs>
            <filter id="timeline-glow-white">
              <feGaussianBlur stdDeviation="6" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="timeline-glow-subtle">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Completed section - Clean White Line */}
          {completedPath && (
            <>
              {/* Main path - Animates in */}
              <motion.path
                d={completedPath}
                fill="none"
                stroke={completedColor}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2.5, ease: "easeInOut" }}
              />
            </>
          )}

          {/* Remaining section - Clean Grey Line */}
          {remainingPath && (
            <>
              {/* Main path */}
              <motion.path
                d={remainingPath}
                fill="none"
                stroke={remainingColor}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2.5, ease: "easeInOut", delay: 2.5 }} // Starts after completed section
              />
            </>
          )}
        </svg>

        {/* Branch nodes at each stage position - positioned along the curved path */}
        {allNodePositions.map((yPosition, index) => {
          const stage = stages[index];
          const centerPosition = getCenterPosition(index);
          const nodeX = getNodeXPosition(centerPosition);

          // Determine if this node is completed (before current index)
          const isCompleted = index < effectiveCurrentIndex;
          const nodeColor = isCompleted ? completedColor : remainingColor;

          return (
            <div
              key={`node-${index}`}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
              style={{
                left: `${nodeX}px`,
                top: `${centerPosition}px`
              }}
            >
              {/* Clean node dot - white if completed, grey if not */}
              <motion.div
                className="rounded-full"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  delay: index * 0.1 + (isCompleted ? 0 : 2.0), // Slower cascading delay
                  duration: 0.5,
                  type: "spring",
                  stiffness: 260,
                  damping: 20
                }}
                style={{
                  width: "10px",
                  height: "10px",
                  backgroundColor: nodeColor,
                  border: `2px solid ${nodeColor}`,
                }}
              />
            </div>
          );
        })}

        {/* Timeline markers and text - in the same centered container */}
        {markers.map((marker, idx) => {
          const position = getMarkerPosition(marker.stageIndex);
          const color = examColor(marker.examName);
          const markerX = getNodeXPosition(position);

          return (
            <div
              key={`${marker.stageIndex}-${idx}`}
              className="absolute"
              style={{ top: `${position}px`, left: 0, width: "200px" }}
            >
              {/* Clean marker dot - positioned on the line */}
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 z-10 transition-transform duration-500 hover:scale-125"
                style={{
                  left: `${markerX}px`,
                }}
              >
                <motion.div
                  className="relative rounded-full"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5 + idx * 0.2, duration: 0.4, type: "spring" }} // Appear after line starts
                  style={{
                    width: "8px",
                    height: "8px",
                    backgroundColor: marker.stageIndex < effectiveCurrentIndex ? "rgba(255, 255, 255, 0.9)" : "rgba(255, 255, 255, 0.4)",
                  }}
                />
              </div>

              {/* Guidance text - Clean Marginal Note Style */}
              <motion.div
                className={cn(
                  "absolute left-1/2 mt-4 p-3", // Removed -translate-x-1/2 from class as we animate it
                  "flex flex-col gap-1.5",
                  "transition-all duration-300 hover:translate-y-[-2px]"
                )}
                initial={{ opacity: 0, y: 10, x: "-50%" }} // Add x: -50% here
                animate={{ opacity: 1, y: 0, x: "-50%" }} // And here to maintain centering
                transition={{ delay: 0.7 + idx * 0.2, duration: 0.5 }} // Text fades in after dot
                style={{
                  width: "220px",
                }}
              >
                {/* Exam Label */}
                <span
                  className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-80"
                  style={{ color: color }}
                >
                  {marker.examName}
                </span>

                {/* Main Text */}
                <p
                  className="text-sm font-medium text-white/60 leading-relaxed font-sans"
                >
                  {marker.text}
                </p>

                {/* Subtle decorative line */}
                <div
                  className="h-[1px] w-8 mt-1 opacity-30"
                  style={{ backgroundColor: color }}
                />
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

