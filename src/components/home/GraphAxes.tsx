"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import {
  buildPath,
  toSvgX,
  toSvgY,
  type GraphDomain,
  RECIPROCAL_QUESTION_DOMAIN,
} from "@/lib/graph-utils";

export type GraphVariant = "main" | "option";

export type GraphAxesProps = {
  width: number;
  height: number;
  showGrid?: boolean;
  showArrows?: boolean;
  showAxisLabels?: boolean;
  xLabel?: string;
  yLabel?: string;
  asymptotes?: number[];
  domain?: GraphDomain;
  padding?: number;
  showOrigin?: boolean;
  intercepts?: number[];
  variant?: GraphVariant;
  className?: string;
  children?: ReactNode;
};

type GraphPlotContextValue = {
  toX: (x: number) => number;
  toY: (y: number) => number;
  domain: GraphDomain;
};

const GraphPlotContext = createContext<GraphPlotContextValue | null>(null);

export function useGraphPlot(): GraphPlotContextValue {
  const ctx = useContext(GraphPlotContext);
  if (!ctx) {
    throw new Error("useGraphPlot must be used within GraphAxes");
  }
  return ctx;
}

type GraphCurveProps = {
  segments: [number, number][][];
  stroke?: string;
  strokeWidth?: number;
  className?: string;
};

export function GraphCurve({
  segments,
  stroke = "white",
  strokeWidth = 2,
  className,
}: GraphCurveProps) {
  const { toX, toY } = useGraphPlot();

  return (
    <g className={className}>
      {segments.map((segment, index) => {
        const d = buildPath(segment, toX, toY);
        if (!d) return null;
        return (
          <path
            key={index}
            d={d}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}
    </g>
  );
}

export function GraphAxes({
  width,
  height,
  showGrid = true,
  showArrows = true,
  showAxisLabels = true,
  xLabel = "x",
  yLabel = "y",
  asymptotes = [],
  domain = RECIPROCAL_QUESTION_DOMAIN,
  padding,
  showOrigin = false,
  intercepts = [],
  variant = "main",
  className,
  children,
}: GraphAxesProps) {
  const isMain = variant === "main";
  const resolvedPadding = padding ?? (isMain ? 20 : 14);

  const plotWidth = width - resolvedPadding * 2;
  const plotHeight = height - resolvedPadding * 2;
  const { minX, maxX, minY, maxY } = domain;

  const plot = useMemo(
    () => ({
      toX: (x: number) => resolvedPadding + toSvgX(x, plotWidth, minX, maxX),
      toY: (y: number) => resolvedPadding + toSvgY(y, plotHeight, minY, maxY),
      domain,
    }),
    [resolvedPadding, plotWidth, plotHeight, minX, maxX, minY, maxY, domain],
  );

  const originX = plot.toX(0);
  const originY = plot.toY(0);
  const xAxisEnd = plot.toX(maxX);
  const yAxisEnd = plot.toY(maxY);

  const axisStroke = isMain ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.35)";
  const gridStroke = isMain ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.04)";
  const asymptoteStroke = isMain
    ? "rgba(148,163,184,0.45)"
    : "rgba(255,255,255,0.25)";

  const gridXValues: number[] = [];
  for (let x = Math.ceil(minX); x <= Math.floor(maxX); x++) {
    if (x !== 0) gridXValues.push(x);
  }

  const gridYValues: number[] = [];
  for (let y = Math.ceil(minY); y <= Math.floor(maxY); y++) {
    if (y !== 0) gridYValues.push(y);
  }

  return (
    <GraphPlotContext.Provider value={plot}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className={cn("block h-full w-full", className)}
        aria-hidden
      >
        {showGrid ? (
          <g stroke={gridStroke} strokeWidth={0.75}>
            {gridXValues.map((x) => (
              <line
                key={`gx-${x}`}
                x1={plot.toX(x)}
                y1={resolvedPadding}
                x2={plot.toX(x)}
                y2={height - resolvedPadding}
              />
            ))}
            {gridYValues.map((y) => (
              <line
                key={`gy-${y}`}
                x1={resolvedPadding}
                y1={plot.toY(y)}
                x2={width - resolvedPadding}
                y2={plot.toY(y)}
              />
            ))}
          </g>
        ) : null}

        {asymptotes.map((x) => (
          <line
            key={`asym-${x}`}
            x1={plot.toX(x)}
            y1={resolvedPadding}
            x2={plot.toX(x)}
            y2={height - resolvedPadding}
            stroke={asymptoteStroke}
            strokeWidth={1}
            strokeDasharray="3 4"
          />
        ))}

        <line
          x1={resolvedPadding}
          y1={originY}
          x2={xAxisEnd}
          y2={originY}
          stroke={axisStroke}
          strokeWidth={isMain ? 1.25 : 1}
        />
        <line
          x1={originX}
          y1={height - resolvedPadding}
          x2={originX}
          y2={yAxisEnd}
          stroke={axisStroke}
          strokeWidth={isMain ? 1.25 : 1}
        />

        {showArrows ? (
          <>
            <polygon
              points={`${xAxisEnd},${originY} ${xAxisEnd - 6},${originY - 3} ${xAxisEnd - 6},${originY + 3}`}
              fill={axisStroke}
            />
            <polygon
              points={`${originX},${yAxisEnd} ${originX - 3},${yAxisEnd + 6} ${originX + 3},${yAxisEnd + 6}`}
              fill={axisStroke}
            />
          </>
        ) : null}

        {intercepts.map((x) => (
          <circle
            key={`intercept-${x}`}
            cx={plot.toX(x)}
            cy={originY}
            r={isMain ? 3.5 : 2.5}
            fill="white"
          />
        ))}

        {children}

        {showOrigin && isMain ? (
          <text
            x={originX - 10}
            y={originY + 13}
            fill="rgba(148,163,184,0.85)"
            fontSize={10}
            fontFamily="var(--font-space-grotesk), system-ui, sans-serif"
          >
            O
          </text>
        ) : null}

        {showAxisLabels ? (
          <>
            <text
              x={xAxisEnd + 3}
              y={originY + 3}
              fill={isMain ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.45)"}
              fontSize={isMain ? 11 : 9}
              fontFamily="var(--font-space-grotesk), system-ui, sans-serif"
            >
              {xLabel}
            </text>
            <text
              x={originX + 5}
              y={yAxisEnd - 1}
              fill={isMain ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.45)"}
              fontSize={isMain ? 11 : 9}
              fontFamily="var(--font-space-grotesk), system-ui, sans-serif"
            >
              {yLabel}
            </text>
          </>
        ) : null}
      </svg>
    </GraphPlotContext.Provider>
  );
}
