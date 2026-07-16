"use client";

import { useEffect, useMemo, useState } from "react";
import { cssVar } from "@/config/colors";
import {
  getRowDensity,
  interpolateDensity,
  type EsatRow,
} from "@/lib/esat/percentiles";

type PercentileMiniChartProps = {
  rows: EsatRow[];
  score: number | null | undefined;
  percentile: number | null | undefined;
  xLabel?: string;
  className?: string;
  /** Draw the distribution line / fill in when the chart mounts. */
  animate?: boolean;
};

export function PercentileMiniChart({
  rows,
  score,
  percentile,
  xLabel = "Score",
  className,
  animate = false,
}: PercentileMiniChartProps) {
  const [dotHovered, setDotHovered] = useState(false);
  const [drawn, setDrawn] = useState(!animate);

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
    const densityPoints = sorted.map((r, i) => ({
      score: r.score,
      density: getRowDensity(r, i > 0 ? sorted[i - 1].cumulativePct : undefined),
    }));

    const w = 720;
    const h = 220;
    const pad = 32;
    const minX = densityPoints[0].score;
    const maxX = densityPoints[densityPoints.length - 1].score;
    const maxY = Math.max(...densityPoints.map((p) => p.density), 1) * 1.12;

    const toX = (x: number) =>
      pad + ((x - minX) / Math.max(1e-9, maxX - minX)) * (w - 2 * pad);
    const toY = (y: number) =>
      h - pad - (y / Math.max(1e-9, maxY)) * (h - 2 * pad);

    const linePoints = densityPoints
      .map((p) => `${toX(p.score)},${toY(p.density)}`)
      .join(" ");

    const areaPoints = [
      `${toX(densityPoints[0].score)},${h - pad}`,
      ...densityPoints.map((p) => `${toX(p.score)},${toY(p.density)}`),
      `${toX(densityPoints[densityPoints.length - 1].score)},${h - pad}`,
    ].join(" ");

    const hasUser = Number.isFinite(score) && Number.isFinite(percentile);
    const userScore = score as number;
    const userDensity = hasUser ? interpolateDensity(sorted, userScore) : NaN;
    const userX = toX(hasUser ? userScore : minX);
    const userY = toY(hasUser ? userDensity : 0);

    const shadedPoints: string[] = [`${pad},${h - pad}`];
    densityPoints.forEach((p) => {
      if (!hasUser || p.score <= userScore) {
        shadedPoints.push(`${toX(p.score)},${toY(p.density)}`);
      }
    });
    if (hasUser) {
      shadedPoints.push(`${userX},${userY}`, `${userX},${h - pad}`, `${pad},${h - pad}`);
    }

    const xTicks: number[] = [];
    for (let s = Math.ceil(minX); s <= Math.floor(maxX); s += 1) xTicks.push(s);

    const yTicks = [0, maxY * 0.25, maxY * 0.5, maxY * 0.75, maxY].map((v) =>
      Math.round(v * 10) / 10,
    );
    const uniqueYTicks = [...new Set(yTicks)];

    return {
      w,
      h,
      pad,
      minX,
      maxX,
      maxY,
      toX,
      toY,
      linePoints,
      areaPoints,
      shadedPoints,
      xTicks,
      yTicks: uniqueYTicks,
      hasUser,
      userScore,
      userDensity,
      userX,
      userY,
      topPct: hasUser ? Math.max(0, 100 - (percentile as number)) : null,
    };
  }, [rows, score, percentile]);

  if (!chart) return null;

  const {
    w,
    h,
    pad,
    toX,
    toY,
    linePoints,
    areaPoints,
    shadedPoints,
    xTicks,
    yTicks,
    hasUser,
    userScore,
    userDensity,
    userX,
    userY,
    topPct,
  } = chart;

  return (
    <div className={className}>
      <div className="relative">
        <svg
          width="100%"
          height={h}
          viewBox={`0 0 ${w} ${h}`}
          preserveAspectRatio="xMidYMid meet"
          className="block"
          role="img"
          aria-label={`${xLabel} score distribution`}
        >
          <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke={cssVar.borderSubtle} />
          <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke={cssVar.borderSubtle} />

          <polygon
            points={areaPoints}
            fill="color-mix(in srgb, var(--color-maths) 10%, transparent)"
            stroke="none"
            style={{
              opacity: drawn ? 1 : 0,
              transition: animate ? "opacity 0.55s ease-out 0.35s" : undefined,
            }}
          />
          {hasUser && (
            <polygon
              points={shadedPoints.join(" ")}
              fill="color-mix(in srgb, var(--color-maths) 22%, transparent)"
              stroke="none"
              style={{
                opacity: drawn ? 1 : 0,
                transition: animate ? "opacity 0.55s ease-out 0.5s" : undefined,
              }}
            />
          )}

          {xTicks.map((t, i) => (
            <g key={`xt-${i}`}>
              <line x1={toX(t)} y1={h - pad} x2={toX(t)} y2={h - pad + 4} stroke={cssVar.borderSubtle} />
              <text x={toX(t)} y={h - pad + 12} fill={cssVar.textMuted} fontSize="9" textAnchor="middle">
                {t}
              </text>
            </g>
          ))}
          {yTicks.map((t, i) => (
            <g key={`yt-${i}`}>
              <line x1={pad - 4} y1={toY(t)} x2={pad} y2={toY(t)} stroke={cssVar.borderSubtle} />
              <text x={pad - 6} y={toY(t) + 3} fill={cssVar.textMuted} fontSize="9" textAnchor="end">
                {t}%
              </text>
            </g>
          ))}

          <polyline
            points={linePoints}
            fill="none"
            stroke={cssVar.textSubtle}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            pathLength={1}
            style={{
              strokeDasharray: 1,
              strokeDashoffset: drawn ? 0 : 1,
              transition: animate
                ? "stroke-dashoffset 0.85s ease-out"
                : undefined,
            }}
          />

          {hasUser && (
            <g
              style={{
                opacity: drawn ? 1 : 0,
                transition: animate ? "opacity 0.35s ease-out 0.7s" : undefined,
              }}
            >
              <line
                x1={userX}
                y1={pad}
                x2={userX}
                y2={h - pad}
                stroke="color-mix(in srgb, var(--color-maths) 35%, transparent)"
                strokeDasharray="4 4"
              />
              <circle
                cx={userX}
                cy={userY}
                r="14"
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setDotHovered(true)}
                onMouseLeave={() => setDotHovered(false)}
                onFocus={() => setDotHovered(true)}
                onBlur={() => setDotHovered(false)}
                tabIndex={0}
                role="button"
                aria-label={`Your score ${userScore.toFixed(1)}, top ${topPct?.toFixed(1)}%`}
              />
              <circle
                cx={userX}
                cy={userY}
                r={dotHovered ? 5.5 : 4}
                fill={cssVar.maths}
                stroke={cssVar.background}
                strokeWidth="2"
                className="pointer-events-none transition-all duration-150"
              />
            </g>
          )}

          <text x={w / 2} y={h - 4} fill={cssVar.textMuted} fontSize="10" textAnchor="middle">
            {xLabel}
          </text>
          <text x={10} y={pad - 8} fill={cssVar.textMuted} fontSize="10">
            % candidates
          </text>
        </svg>

        {hasUser && dotHovered && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-organic-md border border-border bg-surface-elevated px-2.5 py-1.5 text-[11px] text-text shadow-bar-floating"
            style={{
              left: `${(userX / w) * 100}%`,
              top: Math.max(0, (userY / h) * 100 - 18),
            }}
          >
            <div className="font-medium text-neutral-100">
              Score {userScore.toFixed(1)}
            </div>
            <div className="text-text-muted">
              Top {topPct?.toFixed(1)}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
