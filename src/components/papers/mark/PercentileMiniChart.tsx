"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { cssVar } from "@/config/colors";
import {
  interpolateDensity,
  interpolatePercentile,
  type EsatRow,
} from "@/lib/esat/percentiles";

type PercentileMiniChartProps = {
  rows: EsatRow[];
  score: number | null | undefined;
  percentile: number | null | undefined;
  xLabel?: string;
  className?: string;
  /** CSS color for curve, fill, and markers (defaults to maths blue). */
  accentColor?: string;
  /** Draw the distribution line / fill when the chart mounts. */
  animate?: boolean;
  /** Enable hover crosshair and tooltips along the curve. */
  interactive?: boolean;
};

type HoverPoint = {
  score: number;
  density: number;
  cumulativePct: number;
  x: number;
  y: number;
  isUserScore: boolean;
};

const SNAP_PX = 22;
const USER_SNAP_PX = 36;

function buildSmoothPath(
  points: { x: number; y: number }[],
  closeBottomY: number,
): { line: string; area: string } {
  if (points.length === 0) return { line: "", area: "" };
  if (points.length === 1) {
    const p = points[0];
    return {
      line: `M ${p.x} ${p.y}`,
      area: `M ${p.x} ${closeBottomY} L ${p.x} ${p.y} Z`,
    };
  }

  const lineParts: string[] = [`M ${points[0].x} ${points[0].y}`];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    lineParts.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`);
  }

  const line = lineParts.join(" ");
  const area = `${line} L ${points[points.length - 1].x} ${closeBottomY} L ${points[0].x} ${closeBottomY} Z`;
  return { line, area };
}

function resolveSnapScore(
  svgX: number,
  chart: {
    sorted: EsatRow[];
    toX: (x: number) => number;
    hasUser: boolean;
    userScore: number;
  },
): number | null {
  const candidates = chart.sorted.map((r) => r.score);
  if (chart.hasUser) candidates.push(chart.userScore);

  let bestScore = candidates[0];
  let bestPx = Infinity;
  for (const s of candidates) {
    const px = Math.abs(chart.toX(s) - svgX);
    if (px < bestPx) {
      bestPx = px;
      bestScore = s;
    }
  }

  const isUser =
    chart.hasUser && Math.abs(bestScore - chart.userScore) < 0.05;
  const threshold = isUser ? USER_SNAP_PX : SNAP_PX;
  if (bestPx > threshold) return null;
  return bestScore;
}

export function PercentileMiniChart({
  rows,
  score,
  percentile,
  xLabel = "Score",
  className,
  accentColor = cssVar.maths,
  animate = false,
  interactive = true,
}: PercentileMiniChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drawn, setDrawn] = useState(!animate);
  const [hover, setHover] = useState<HoverPoint | null>(null);
  const gradId = useId().replace(/:/g, "");
  const areaGradId = `pct-area-${gradId}`;
  const lineGradId = `pct-line-${gradId}`;

  useEffect(() => {
    if (!animate) {
      setDrawn(true);
      return;
    }
    setDrawn(false);
    const frame = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(frame);
  }, [animate, rows, score, percentile]);

  const chart = useMemo(() => {
    if (!rows || rows.length < 2) return null;

    const sorted = [...rows].sort((a, b) => a.score - b.score);
    const minX = sorted[0].score;
    const maxX = sorted[sorted.length - 1].score;

    const sampleScores: number[] = [];
    for (let s = minX; s <= maxX + 0.001; s += 0.1) {
      sampleScores.push(Math.round(s * 10) / 10);
    }

    const densityPoints = sampleScores.map((s) => ({
      score: s,
      density: interpolateDensity(sorted, s),
    }));

    const w = 720;
    const h = 260;
    const padL = 40;
    const padR = 16;
    const padT = 24;
    const padB = 36;
    const maxY = Math.max(...densityPoints.map((p) => p.density), 1) * 1.15;

    const toX = (x: number) =>
      padL + ((x - minX) / Math.max(1e-9, maxX - minX)) * (w - padL - padR);
    const toY = (y: number) =>
      h - padB - (y / Math.max(1e-9, maxY)) * (h - padT - padB);
    const fromX = (px: number) =>
      minX + ((px - padL) / Math.max(1e-9, w - padL - padR)) * (maxX - minX);

    const curvePoints = densityPoints.map((p) => ({
      x: toX(p.score),
      y: toY(p.density),
    }));

    const { line: smoothLine, area: smoothArea } = buildSmoothPath(curvePoints, h - padB);

    const hasUser = Number.isFinite(score) && Number.isFinite(percentile);
    const userScore = score as number;
    const userDensity = hasUser ? interpolateDensity(sorted, userScore) : NaN;
    const userX = toX(hasUser ? userScore : minX);
    const userY = toY(hasUser ? userDensity : 0);

    const xTicks: number[] = [];
    for (let s = Math.ceil(minX); s <= Math.floor(maxX); s += 1) xTicks.push(s);

    return {
      w,
      h,
      padL,
      padR,
      padT,
      padB,
      minX,
      maxX,
      maxY,
      toX,
      toY,
      fromX,
      smoothLine,
      smoothArea,
      sorted,
      xTicks,
      hasUser,
      userScore,
      userDensity,
      userX,
      userY,
      userPercentile: hasUser ? (percentile as number) : null,
    };
  }, [rows, score, percentile]);

  const resolveHover = useCallback(
    (clientX: number) => {
      if (!chart || !svgRef.current || !interactive) return;
      const rect = svgRef.current.getBoundingClientRect();
      const svgX = ((clientX - rect.left) / rect.width) * chart.w;
      if (svgX < chart.padL || svgX > chart.w - chart.padR) {
        setHover(null);
        return;
      }

      const snapped = resolveSnapScore(svgX, chart);
      if (snapped == null) {
        setHover(null);
        return;
      }

      const isUserScore =
        chart.hasUser && Math.abs(snapped - chart.userScore) < 0.05;
      const cumulativePct = isUserScore
        ? (chart.userPercentile as number)
        : interpolatePercentile(chart.sorted, snapped);
      const density = interpolateDensity(chart.sorted, snapped);

      setHover({
        score: snapped,
        density,
        cumulativePct,
        x: chart.toX(snapped),
        y: chart.toY(density),
        isUserScore,
      });
    },
    [chart, interactive],
  );

  if (!chart) return null;

  const {
    w,
    h,
    padL,
    padB,
    toX,
    toY,
    smoothLine,
    smoothArea,
    xTicks,
    hasUser,
    userScore,
    userX,
    userY,
  } = chart;

  const active = hover;
  const showUserMarker = hasUser && (!active || !active.isUserScore);

  return (
    <div className={className}>
      <div className="relative">
        <svg
          ref={svgRef}
          width="100%"
          height={h}
          viewBox={`0 0 ${w} ${h}`}
          preserveAspectRatio="xMidYMid meet"
          className="block"
          role="img"
          aria-label={`${xLabel} score distribution`}
          onMouseMove={(e) => resolveHover(e.clientX)}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id={areaGradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accentColor} stopOpacity="0.28" />
              <stop offset="100%" stopColor={accentColor} stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id={lineGradId} x1="0" y1="0" x2="1" y2="0">
              <stop
                offset="0%"
                stopColor={`color-mix(in srgb, ${accentColor} 70%, ${cssVar.textSubtle})`}
              />
              <stop offset="100%" stopColor={accentColor} />
            </linearGradient>
          </defs>

          {[0.25, 0.5, 0.75].map((frac) => {
            const y = padB + (h - padB - 24) * (1 - frac);
            return (
              <line
                key={frac}
                x1={padL}
                y1={y}
                x2={w - 16}
                y2={y}
                stroke={cssVar.borderSubtle}
                strokeOpacity={0.35}
                strokeDasharray="3 6"
              />
            );
          })}

          <line x1={padL} y1={h - padB} x2={w - 16} y2={h - padB} stroke={cssVar.borderSubtle} />
          <line x1={padL} y1={24} x2={padL} y2={h - padB} stroke={cssVar.borderSubtle} />

          <path
            d={smoothArea}
            fill={`url(#${areaGradId})`}
            stroke="none"
            style={{
              opacity: drawn ? 1 : 0,
              transition: animate ? "opacity 0.55s ease-out 0.35s" : undefined,
            }}
          />

          {xTicks.map((t) => (
            <g key={`xt-${t}`}>
              <line
                x1={toX(t)}
                y1={h - padB}
                x2={toX(t)}
                y2={h - padB + 4}
                stroke={cssVar.borderSubtle}
                strokeOpacity={0.6}
              />
              <text
                x={toX(t)}
                y={h - padB + 14}
                fill={cssVar.textMuted}
                fontSize="10"
                textAnchor="middle"
              >
                {t}
              </text>
            </g>
          ))}

          <path
            d={smoothLine}
            fill="none"
            stroke={`url(#${lineGradId})`}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            style={{
              strokeDasharray: 1,
              strokeDashoffset: drawn ? 0 : 1,
              transition: animate ? "stroke-dashoffset 0.85s ease-out" : undefined,
            }}
          />

          {interactive && active && (
            <g pointerEvents="none">
              <line
                x1={active.x}
                y1={24}
                x2={active.x}
                y2={h - padB}
                stroke={cssVar.textMuted}
                strokeOpacity={0.35}
              />
              <circle
                cx={active.x}
                cy={active.y}
                r="5"
                fill={accentColor}
                stroke={cssVar.background}
                strokeWidth="2"
              />
            </g>
          )}

          {hasUser && showUserMarker && (
            <g
              pointerEvents="none"
              style={{
                opacity: drawn ? 1 : 0,
                transition: animate ? "opacity 0.35s ease-out 0.7s" : undefined,
              }}
            >
              <line
                x1={userX}
                y1={24}
                x2={userX}
                y2={h - padB}
                stroke={accentColor}
                strokeOpacity={0.45}
                strokeDasharray="4 4"
              />
              <circle
                cx={userX}
                cy={userY}
                r="5.5"
                fill={accentColor}
                stroke={cssVar.background}
                strokeWidth="2.5"
              />
            </g>
          )}

          <text x={w / 2} y={h - 4} fill={cssVar.textMuted} fontSize="10" textAnchor="middle">
            {xLabel}
          </text>
          {interactive && (
            <text x={padL} y={16} fill={cssVar.textMuted} fontSize="10">
              Hover to explore scores
            </text>
          )}
        </svg>

        {active && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-organic-md bg-surface-elevated px-3 py-2 text-[11px] text-text shadow-modal-card"
            style={{
              left: `${(active.x / w) * 100}%`,
              top: Math.max(0, (active.y / h) * 100 - 22),
            }}
          >
            <div className="font-semibold tabular-nums">
              {active.isUserScore
                ? `Your score ${active.score.toFixed(1)}`
                : `Score ${active.score.toFixed(1)}`}
            </div>
            <div className="text-text-muted">
              {active.cumulativePct.toFixed(1)}th percentile
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
