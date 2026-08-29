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

export type GraphAxesProps = {
  width: number;
  height: number;
  showGrid?: boolean;
  showArrows?: boolean;
  xLabel?: string;
  yLabel?: string;
  asymptotes?: number[];
  domain?: GraphDomain;
  padding?: number;
  showOrigin?: boolean;
  intercepts?: number[];
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
  xLabel = "x",
  yLabel = "y",
  asymptotes = [],
  domain = RECIPROCAL_QUESTION_DOMAIN,
  padding = 22,
  showOrigin = false,
  intercepts = [],
  className,
  children,
}: GraphAxesProps) {
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;
  const { minX, maxX, minY, maxY } = domain;

  const plot = useMemo(
    () => ({
      toX: (x: number) => padding + toSvgX(x, plotWidth, minX, maxX),
      toY: (y: number) => padding + toSvgY(y, plotHeight, minY, maxY),
      domain,
    }),
    [padding, plotWidth, plotHeight, minX, maxX, minY, maxY, domain],
  );

  const originX = plot.toX(0);
  const originY = plot.toY(0);
  const xAxisEnd = plot.toX(maxX);
  const yAxisEnd = plot.toY(maxY);

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
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className={cn("max-w-full", className)}
        aria-hidden
      >
        {showGrid ? (
          <g stroke="rgba(255,255,255,0.06)" strokeWidth={0.75}>
            {gridXValues.map((x) => (
              <line
                key={`gx-${x}`}
                x1={plot.toX(x)}
                y1={padding}
                x2={plot.toX(x)}
                y2={height - padding}
              />
            ))}
            {gridYValues.map((y) => (
              <line
                key={`gy-${y}`}
                x1={padding}
                y1={plot.toY(y)}
                x2={width - padding}
                y2={plot.toY(y)}
              />
            ))}
          </g>
        ) : null}

        {asymptotes.map((x) => (
          <line
            key={`asym-${x}`}
            x1={plot.toX(x)}
            y1={padding}
            x2={plot.toX(x)}
            y2={height - padding}
            stroke="rgba(148,163,184,0.45)"
            strokeWidth={1}
            strokeDasharray="4 4"
          />
        ))}

        <line
          x1={padding}
          y1={originY}
          x2={xAxisEnd}
          y2={originY}
          stroke="rgba(255,255,255,0.85)"
          strokeWidth={1.25}
        />
        <line
          x1={originX}
          y1={height - padding}
          x2={originX}
          y2={yAxisEnd}
          stroke="rgba(255,255,255,0.85)"
          strokeWidth={1.25}
        />

        {showArrows ? (
          <>
            <polygon
              points={`${xAxisEnd},${originY} ${xAxisEnd - 7},${originY - 3.5} ${xAxisEnd - 7},${originY + 3.5}`}
              fill="rgba(255,255,255,0.85)"
            />
            <polygon
              points={`${originX},${yAxisEnd} ${originX - 3.5},${yAxisEnd + 7} ${originX + 3.5},${yAxisEnd + 7}`}
              fill="rgba(255,255,255,0.85)"
            />
          </>
        ) : null}

        {intercepts.map((x) => (
          <circle
            key={`intercept-${x}`}
            cx={plot.toX(x)}
            cy={originY}
            r={3.5}
            fill="white"
          />
        ))}

        {children}

        {showOrigin ? (
          <text
            x={originX - 10}
            y={originY + 14}
            fill="rgba(148,163,184,0.9)"
            fontSize={11}
            fontFamily="var(--font-space-grotesk), system-ui, sans-serif"
          >
            O
          </text>
        ) : null}

        <text
          x={xAxisEnd + 4}
          y={originY + 4}
          fill="rgba(255,255,255,0.85)"
          fontSize={11}
          fontFamily="var(--font-space-grotesk), system-ui, sans-serif"
        >
          {xLabel}
        </text>
        <text
          x={originX + 6}
          y={yAxisEnd - 2}
          fill="rgba(255,255,255,0.85)"
          fontSize={11}
          fontFamily="var(--font-space-grotesk), system-ui, sans-serif"
        >
          {yLabel}
        </text>
      </svg>
    </GraphPlotContext.Provider>
  );
}
