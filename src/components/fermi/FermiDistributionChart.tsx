"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

type DistributionPoint = { score: number; density: number };

type FermiDistributionChartProps = {
  curve: DistributionPoint[];
  userScore: number | null;
  percentile: number | null;
  className?: string;
};

export function FermiDistributionChart({
  curve,
  userScore,
  percentile,
  className,
}: FermiDistributionChartProps) {
  const chart = useMemo(() => {
    if (!curve || curve.length < 2) return null;

    const w = 720;
    const h = 220;
    const pad = 32;
    const minX = curve[0].score;
    const maxX = curve[curve.length - 1].score;
    const maxY = Math.max(...curve.map((p) => p.density), 1e-9) * 1.12;

    const toX = (x: number) =>
      pad + ((x - minX) / Math.max(1e-9, maxX - minX)) * (w - 2 * pad);
    const toY = (y: number) =>
      h - pad - (y / Math.max(1e-9, maxY)) * (h - 2 * pad);

    const linePoints = curve.map((p) => `${toX(p.score)},${toY(p.density)}`).join(" ");

    const hasUser = userScore != null && Number.isFinite(userScore);
    const clampedScore = hasUser ? Math.min(100, Math.max(0, userScore as number)) : 0;
    const userDensity = hasUser
      ? curve.reduce((best, p) =>
          Math.abs(p.score - clampedScore) < Math.abs(best.score - clampedScore) ? p : best,
        ).density
      : 0;
    const userX = toX(clampedScore);
    const userY = toY(userDensity);

    const shadedPoints: string[] = [`${pad},${h - pad}`];
    curve.forEach((p) => {
      if (!hasUser || p.score <= clampedScore) {
        shadedPoints.push(`${toX(p.score)},${toY(p.density)}`);
      }
    });
    if (hasUser) {
      shadedPoints.push(`${userX},${userY}`, `${userX},${h - pad}`, `${pad},${h - pad}`);
    }

    const xTicks = [0, 25, 50, 75, 100].filter((t) => t >= minX - 1 && t <= maxX + 1);

    return {
      w,
      h,
      pad,
      toX,
      toY,
      linePoints,
      shadedPoints,
      xTicks,
      hasUser,
      userX,
      userY,
      clampedScore,
    };
  }, [curve, userScore]);

  if (!chart) {
    return (
      <div className={cn("rounded-organic-xl bg-surface p-6 text-center text-sm text-text-muted", className)}>
        Not enough data yet to show the distribution.
      </div>
    );
  }

  const { w, h, pad, toX, toY, linePoints, shadedPoints, xTicks, hasUser, userX, userY, clampedScore } =
    chart;

  return (
    <div className={cn("w-full", className)}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-auto w-full"
        role="img"
        aria-label="Score distribution chart"
      >
        {hasUser && (
          <polygon
            points={shadedPoints.join(" ")}
            className="fill-secondary/25"
          />
        )}
        <polyline
          points={linePoints}
          fill="none"
          className="stroke-text-muted"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {xTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={toX(tick)}
              y1={h - pad}
              x2={toX(tick)}
              y2={h - pad + 4}
              className="stroke-text-disabled"
            />
            <text
              x={toX(tick)}
              y={h - pad + 16}
              textAnchor="middle"
              className="fill-text-muted text-[11px]"
            >
              {tick}
            </text>
          </g>
        ))}
        {hasUser && (
          <>
            <line
              x1={userX}
              y1={pad}
              x2={userX}
              y2={h - pad}
              className="stroke-secondary"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
            <circle cx={userX} cy={userY} r="7" className="fill-secondary" />
          </>
        )}
        <text x={w / 2} y={h - 6} textAnchor="middle" className="fill-text-muted text-[11px]">
          Closeness score
        </text>
      </svg>
      {hasUser && percentile != null && (
        <p className="mt-3 text-center text-sm font-semibold text-text">
          You beat{" "}
          <span className="text-secondary">{percentile}%</span> of players that day
        </p>
      )}
      {hasUser && (
        <p className="mt-1 text-center text-xs font-medium text-text-muted">
          Your score: {clampedScore}/100
        </p>
      )}
    </div>
  );
}
