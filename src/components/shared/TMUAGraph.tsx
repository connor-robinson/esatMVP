/**
 * TMUA Graph Renderer
 * Renders TMUA-style graphs from GraphSpec JSON
 */

"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

export type TMUAGraphSpec = {
  kind: "function";
  fn: { kind: "poly2"; a: number; b: number; c: number };
  xRange: [number, number];
  yRange: [number, number];
  axes: {
    show: boolean;
    arrowheads: boolean;
    xLabel?: { text: string; italic?: boolean; dx?: number; dy?: number };
    yLabel?: { text: string; italic?: boolean; dx?: number; dy?: number };
  };
  xMarks?: Array<{
    x: number;
    label: { text: string; italic?: boolean; dx?: number; dy?: number };
    tick?: boolean;
  }>;
  annotations?: Array<{
    kind: "text";
    x: number;
    y: number;
    text: string;
    italic?: boolean;
  }>;
};

interface TMUAGraphProps {
  spec: TMUAGraphSpec;
  className?: string;
}

// SVG viewBox dimensions - made bigger and taller
const VIEWBOX_WIDTH = 650;
const VIEWBOX_HEIGHT = 400;

// Padding (inner padding so axes aren't flush to edges)
const PAD_LEFT = 70;
const PAD_RIGHT = 40;
const PAD_TOP = 30;
const PAD_BOTTOM = 60;

// Plot area dimensions
const PLOT_WIDTH = VIEWBOX_WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_HEIGHT = VIEWBOX_HEIGHT - PAD_TOP - PAD_BOTTOM;

// Styling tokens (dark mode, TMUA contrast)
const AXIS_STROKE_OPACITY = 0.6; // ~55-65% opacity
const CURVE_STROKE_OPACITY = 0.95; // ~90-100% opacity
const AXIS_STROKE_WIDTH = 1.2;
const CURVE_STROKE_WIDTH = 1.8;

// Arrowhead dimensions
const ARROWHEAD_SIZE = 6;
const ARROWHEAD_WIDTH = 4;

export function TMUAGraph({ spec, className }: TMUAGraphProps) {
  const { pathData, xAxisPath, yAxisPath } = useMemo(() => {
    // Calculate coordinate transformations
    const xScale = PLOT_WIDTH / (spec.xRange[1] - spec.xRange[0]);
    const yScale = PLOT_HEIGHT / (spec.yRange[1] - spec.yRange[0]);

    const toSVGX = (x: number) => PAD_LEFT + (x - spec.xRange[0]) * xScale;
    const toSVGY = (y: number) => PAD_TOP + (spec.yRange[1] - y) * yScale; // Flip Y axis

    // Generate function path
    let pathData = "";
    if (spec.fn.kind === "poly2") {
      const { a, b, c } = spec.fn;
      const numPoints = 600; // Dense sampling for smooth curve
      const xStep = (spec.xRange[1] - spec.xRange[0]) / numPoints;

      let firstPoint = true;
      let lastY: number | null = null;

      for (let i = 0; i <= numPoints; i++) {
        const x = spec.xRange[0] + i * xStep;
        const y = a * x * x + b * x + c;

        // Clip to y-range
        if (y < spec.yRange[0] || y > spec.yRange[1]) {
          if (lastY !== null) {
            // Draw to the edge of the viewport
            const clippedY = y < spec.yRange[0] ? spec.yRange[0] : spec.yRange[1];
            pathData += ` L ${toSVGX(x)},${toSVGY(clippedY)}`;
            lastY = null; // Break the path
          }
          continue;
        }

        // Check for discontinuity (large jump)
        if (lastY !== null && Math.abs(y - lastY) > (spec.yRange[1] - spec.yRange[0]) * 0.5) {
          // Break the path
          pathData += ` M ${toSVGX(x)},${toSVGY(y)}`;
        } else if (firstPoint) {
          pathData += `M ${toSVGX(x)},${toSVGY(y)}`;
          firstPoint = false;
        } else {
          pathData += ` L ${toSVGX(x)},${toSVGY(y)}`;
        }

        lastY = y;
      }
    }

    // Draw axes
    const xAxisY = toSVGY(0);
    const yAxisX = toSVGX(0);

    let xAxisPath = "";
    let yAxisPath = "";

    if (spec.axes.show) {
      // X-axis
      if (spec.yRange[0] <= 0 && spec.yRange[1] >= 0) {
        xAxisPath = `M ${PAD_LEFT},${xAxisY} L ${VIEWBOX_WIDTH - PAD_RIGHT},${xAxisY}`;
      }

      // Y-axis - extend to very top for arrow placement
      // Draw from bottom to top so arrow (markerEnd) is at the top
      if (spec.xRange[0] <= 0 && spec.xRange[1] >= 0) {
        // Start from bottom, go to top (slightly beyond top padding for arrow)
        yAxisPath = `M ${yAxisX},${VIEWBOX_HEIGHT - PAD_BOTTOM} L ${yAxisX},${PAD_TOP - 2}`;
      }
    }

    return { pathData, xAxisPath, yAxisPath };
  }, [spec]);

  // Calculate coordinate transformations for labels
  const toSVGX = (x: number) => PAD_LEFT + ((x - spec.xRange[0]) / (spec.xRange[1] - spec.xRange[0])) * PLOT_WIDTH;
  const toSVGY = (y: number) => PAD_TOP + ((spec.yRange[1] - y) / (spec.yRange[1] - spec.yRange[0])) * PLOT_HEIGHT;

  return (
    <div className={cn("tmua-graph", className)}>
      <svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        className="w-full max-w-[550px] h-auto"
        style={{ fontFamily: "'Times New Roman', Times, 'Nimbus Roman No9 L', serif" }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Arrowhead definitions */}
        <defs>
          <marker
            id="arrowhead-x"
            markerWidth={ARROWHEAD_SIZE}
            markerHeight={ARROWHEAD_SIZE}
            refX={ARROWHEAD_SIZE}
            refY={ARROWHEAD_SIZE / 2}
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path
              d={`M 0,0 L ${ARROWHEAD_SIZE},${ARROWHEAD_SIZE / 2} L 0,${ARROWHEAD_SIZE}`}
              fill="white"
              fillOpacity={AXIS_STROKE_OPACITY}
              stroke="none"
            />
          </marker>
          <marker
            id="arrowhead-y"
            markerWidth={ARROWHEAD_SIZE}
            markerHeight={ARROWHEAD_SIZE}
            refX={ARROWHEAD_SIZE / 2}
            refY={0}
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path
              d={`M ${ARROWHEAD_SIZE / 2},${ARROWHEAD_SIZE} L 0,0 L ${ARROWHEAD_SIZE},0 Z`}
              fill="white"
              fillOpacity={AXIS_STROKE_OPACITY}
              stroke="none"
            />
          </marker>
        </defs>

        {/* Axes */}
        {spec.axes.show && (
          <>
            {xAxisPath && (
              <path
                d={xAxisPath}
                stroke="white"
                strokeOpacity={AXIS_STROKE_OPACITY}
                strokeWidth={AXIS_STROKE_WIDTH}
                strokeLinecap="butt"
                fill="none"
                markerEnd={spec.axes.arrowheads ? "url(#arrowhead-x)" : undefined}
              />
            )}
            {yAxisPath && (
              <path
                d={yAxisPath}
                stroke="white"
                strokeOpacity={AXIS_STROKE_OPACITY}
                strokeWidth={AXIS_STROKE_WIDTH}
                strokeLinecap="butt"
                fill="none"
                markerEnd={spec.axes.arrowheads ? "url(#arrowhead-y)" : undefined}
              />
            )}
          </>
        )}

        {/* Function curve - clip to plot area to prevent cutoff */}
        <clipPath id="plotClip">
          <rect
            x={PAD_LEFT}
            y={PAD_TOP}
            width={PLOT_WIDTH}
            height={PLOT_HEIGHT}
          />
        </clipPath>
        <path
          d={pathData}
          stroke="white"
          strokeOpacity={CURVE_STROKE_OPACITY}
          strokeWidth={CURVE_STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          clipPath="url(#plotClip)"
        />

        {/* X-axis label (at positive end of x-axis) */}
        {spec.axes.xLabel && (
          <text
            x={VIEWBOX_WIDTH - PAD_RIGHT + 8 + (spec.axes.xLabel.dx || 0)}
            y={toSVGY(0) + (spec.axes.xLabel.dy || 0)}
            fill="white"
            fillOpacity={CURVE_STROKE_OPACITY}
            fontSize="14"
            fontStyle={spec.axes.xLabel.italic ? "italic" : "normal"}
            dominantBaseline="middle"
          >
            {spec.axes.xLabel.text}
          </text>
        )}

        {/* Y-axis label (centered directly above the arrow at top of y-axis) */}
        {spec.axes.yLabel && (
          <text
            x={toSVGX(0) + (spec.axes.yLabel.dx || 0)}
            y={PAD_TOP - 12 + (spec.axes.yLabel.dy || 0)}
            fill="white"
            fillOpacity={CURVE_STROKE_OPACITY}
            fontSize="14"
            fontStyle={spec.axes.yLabel.italic ? "italic" : "normal"}
            textAnchor="middle"
            dominantBaseline="auto"
          >
            {spec.axes.yLabel.text}
          </text>
        )}

        {/* X-axis marks (ticks and labels) */}
        {spec.xMarks?.map((mark, idx) => {
          const x = toSVGX(mark.x);
          const y = toSVGY(0);
          return (
            <g key={`xmark-${idx}`}>
              {mark.tick && (
                <line
                  x1={x}
                  y1={y - 4}
                  x2={x}
                  y2={y + 4}
                  stroke="white"
                  strokeOpacity={AXIS_STROKE_OPACITY}
                  strokeWidth={AXIS_STROKE_WIDTH}
                />
              )}
              <text
                x={x + (mark.label.dx || 0)}
                y={y + 14 + (mark.label.dy || 0)}
                fill="white"
                fillOpacity={CURVE_STROKE_OPACITY}
                fontSize="13"
                fontStyle={mark.label.italic ? "italic" : "normal"}
                textAnchor="middle"
                dominantBaseline="hanging"
              >
                {mark.label.text}
              </text>
            </g>
          );
        })}

        {/* Annotations */}
        {spec.annotations?.map((annotation, idx) => {
          if (annotation.kind === "text") {
            // Calculate better centering for region annotations
            let x = toSVGX(annotation.x);
            let y = toSVGY(annotation.y);
            
            // Special handling for region annotations (R and S)
            // For region S (below x-axis between x=2 and x=6), center it better
            if (annotation.text === "S" && spec.fn.kind === "poly2") {
              const { a, b, c } = spec.fn;
              // Region S is from x=2 to x=6, below the curve
              const xStart = 2;
              const xEnd = 6;
              const xCenter = (xStart + xEnd) / 2; // 4
              
              // Find the curve value at the center
              const curveY = a * xCenter * xCenter + b * xCenter + c;
              // The region is between the curve (at curveY) and x-axis (at 0)
              // Center vertically in that region
              const yCenter = curveY / 2; // Midpoint between curve and x-axis
              
              x = toSVGX(xCenter);
              y = toSVGY(yCenter);
            }
            // For region R (above x-axis from x=0 to x=2), center it better
            else if (annotation.text === "R" && spec.fn.kind === "poly2") {
              const { a, b, c } = spec.fn;
              // Region R is from x=0 to x=2, above the curve
              const xStart = 0;
              const xEnd = 2;
              const xCenter = (xStart + xEnd) / 2; // 1
              
              // Find the curve value at the center
              const curveY = a * xCenter * xCenter + b * xCenter + c;
              // The region is between the curve (at curveY) and the top of the plot
              // For better centering, use a point that's visually centered
              // Use a point that's about 60% up from the curve toward the top
              const yRange = spec.yRange[1] - curveY;
              const yCenter = curveY + yRange * 0.4;
              
              x = toSVGX(xCenter);
              y = toSVGY(yCenter);
            }
            
            return (
              <text
                key={`annotation-${idx}`}
                x={x}
                y={y}
                fill="white"
                fillOpacity={CURVE_STROKE_OPACITY}
                fontSize="14"
                fontStyle={annotation.italic ? "italic" : "normal"}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {annotation.text}
              </text>
            );
          }
          return null;
        })}
      </svg>
    </div>
  );
}

