"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { cssVar } from "@/config/colors";
import { cn } from "@/lib/utils";
import { resolveBeatPercentile } from "@/lib/fermi/percentile";

type DistributionPoint = { score: number; density: number };

type FermiDistributionChartProps = {
  curve: DistributionPoint[];
  userScore: number | null;
  percentile: number | null;
  percentileIsEstimate?: boolean;
  playerCount?: number;
  populationMean?: number;
  populationStd?: number;
  populationScores?: number[];
  className?: string;
};

function densityAtScore(curve: DistributionPoint[], score: number): number {
  return curve.reduce((best, p) =>
    Math.abs(p.score - score) < Math.abs(best.score - score) ? p : best,
  ).density;
}

export function FermiDistributionChart({
  curve,
  userScore,
  percentile,
  percentileIsEstimate = false,
  playerCount = 0,
  populationMean = 50,
  populationStd = 20,
  populationScores = [],
  className,
}: FermiDistributionChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [userDotHovered, setUserDotHovered] = useState(false);
  const [probeScore, setProbeScore] = useState<number | null>(null);

  const chart = useMemo(() => {
    if (!curve || curve.length < 2) return null;

    const w = 720;
    const h = 240;
    const pad = 36;
    const minX = curve[0].score;
    const maxX = curve[curve.length - 1].score;
    const maxY = Math.max(...curve.map((p) => p.density), 1e-9) * 1.12;

    const toX = (x: number) =>
      pad + ((x - minX) / Math.max(1e-9, maxX - minX)) * (w - 2 * pad);
    const toY = (y: number) =>
      h - pad - (y / Math.max(1e-9, maxY)) * (h - 2 * pad);
    const fromX = (px: number) =>
      minX + ((px - pad) / Math.max(1e-9, w - 2 * pad)) * (maxX - minX);

    const linePoints = curve.map((p) => `${toX(p.score)},${toY(p.density)}`).join(" ");

    const areaPoints = [
      `${toX(curve[0].score)},${h - pad}`,
      ...curve.map((p) => `${toX(p.score)},${toY(p.density)}`),
      `${toX(curve[curve.length - 1].score)},${h - pad}`,
    ].join(" ");

    const hasUser = userScore != null && Number.isFinite(userScore);
    const clampedUser = hasUser ? Math.min(100, Math.max(0, userScore as number)) : 0;
    const userDensity = hasUser ? densityAtScore(curve, clampedUser) : 0;
    const userX = toX(clampedUser);
    const userY = toY(userDensity);

    const shadedPoints: string[] = [`${pad},${h - pad}`];
    curve.forEach((p) => {
      if (!hasUser || p.score <= clampedUser) {
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
      minX,
      maxX,
      toX,
      toY,
      fromX,
      linePoints,
      areaPoints,
      shadedPoints,
      xTicks,
      hasUser,
      userX,
      userY,
      clampedUser,
    };
  }, [curve, userScore]);

  const beatAtScore = useCallback(
    (score: number) =>
      resolveBeatPercentile(score, populationScores, populationMean, populationStd),
    [populationScores, populationMean, populationStd],
  );

  const handleChartPointer = useCallback(
    (clientX: number) => {
      if (!chart || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const svgX = ((clientX - rect.left) / rect.width) * chart.w;
      const raw = chart.fromX(svgX);
      setProbeScore(Math.round(Math.min(100, Math.max(0, raw))));
    },
    [chart],
  );

  if (!chart) {
    return (
      <div
        className={cn(
          "rounded-organic-xl bg-surface-mid/50 p-6 text-center text-sm text-text-muted",
          className,
        )}
      >
        Play today&apos;s {playerCount === 0 ? "puzzle" : "round"} to see where you rank.
      </div>
    );
  }

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
    hasUser,
    userX,
    userY,
    clampedUser,
  } = chart;

  const activeScore = userDotHovered ? clampedUser : probeScore;
  const activeBeat =
    activeScore != null ? beatAtScore(activeScore) : null;
  const activeX = activeScore != null ? toX(activeScore) : null;
  const activeY =
    activeScore != null ? toY(densityAtScore(curve, activeScore)) : null;

  const topPct =
    percentile != null ? Math.max(0, 100 - percentile) : null;

  return (
    <div className={cn("w-full", className)}>
      {hasUser && percentile != null && (
        <div className="mb-4 text-center">
          <p className="text-3xl font-bold tracking-tight text-text sm:text-4xl">
            Top {topPct}%
            {percentileIsEstimate && (
              <span className="ml-2 align-middle text-xs font-semibold uppercase tracking-wide text-text-muted">
                est.
              </span>
            )}
          </p>
          <p className="mt-1 text-sm font-medium text-text-muted">
            You beat ~{percentile}% of players
            {percentileIsEstimate ? " (est.)" : ""}
          </p>
        </div>
      )}

      <div className="relative rounded-organic-lg bg-surface-mid/30 p-2 sm:p-3">
        <svg
          ref={svgRef}
          width="100%"
          height={h}
          viewBox={`0 0 ${w} ${h}`}
          preserveAspectRatio="xMidYMid meet"
          className="block touch-none"
          role="img"
          aria-label="Closeness score distribution for today's FermiGuessr puzzle"
          onMouseMove={(e) => handleChartPointer(e.clientX)}
          onMouseLeave={() => setProbeScore(null)}
          onTouchMove={(e) => {
            if (e.touches[0]) handleChartPointer(e.touches[0].clientX);
          }}
          onTouchEnd={() => setProbeScore(null)}
        >
          <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke={cssVar.borderSubtle} />
          <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke={cssVar.borderSubtle} />

          <polygon
            points={areaPoints}
            fill="color-mix(in srgb, var(--color-secondary) 8%, transparent)"
            stroke="none"
          />
          {hasUser && (
            <polygon
              points={shadedPoints.join(" ")}
              fill="color-mix(in srgb, var(--color-secondary) 22%, transparent)"
              stroke="none"
            />
          )}

          {xTicks.map((tick) => (
            <g key={tick}>
              <line
                x1={toX(tick)}
                y1={h - pad}
                x2={toX(tick)}
                y2={h - pad + 4}
                stroke={cssVar.borderSubtle}
              />
              <text
                x={toX(tick)}
                y={h - pad + 14}
                fill={cssVar.textMuted}
                fontSize="10"
                textAnchor="middle"
              >
                {tick}
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
          />

          {probeScore != null && !userDotHovered && activeX != null && activeY != null && (
            <g>
              <line
                x1={activeX}
                y1={pad}
                x2={activeX}
                y2={h - pad}
                stroke="color-mix(in srgb, var(--color-text-muted) 35%, transparent)"
                strokeDasharray="3 3"
              />
              <circle cx={activeX} cy={activeY} r="3.5" fill={cssVar.textMuted} opacity={0.7} />
            </g>
          )}

          {hasUser && (
            <g>
              <line
                x1={userX}
                y1={pad}
                x2={userX}
                y2={h - pad}
                stroke="color-mix(in srgb, var(--color-secondary) 40%, transparent)"
                strokeDasharray="4 4"
              />
              <circle
                cx={userX}
                cy={userY}
                r="16"
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => {
                  setUserDotHovered(true);
                  setProbeScore(null);
                }}
                onMouseLeave={() => setUserDotHovered(false)}
                onFocus={() => {
                  setUserDotHovered(true);
                  setProbeScore(null);
                }}
                onBlur={() => setUserDotHovered(false)}
                tabIndex={0}
                role="button"
                aria-label={`Your closeness score ${clampedUser}, beat ${percentile}% of players`}
              />
              <circle
                cx={userX}
                cy={userY}
                r={userDotHovered ? 6 : 4.5}
                fill="var(--color-secondary)"
                stroke={cssVar.background}
                strokeWidth="2"
                className="pointer-events-none transition-all duration-150"
              />
              <text
                x={userX}
                y={userY - 12}
                fill="var(--color-secondary)"
                fontSize="10"
                fontWeight="600"
                textAnchor="middle"
              >
                You
              </text>
            </g>
          )}

          <text x={w / 2} y={h - 4} fill={cssVar.textMuted} fontSize="10" textAnchor="middle">
            Closeness score (0–100)
          </text>
          <text x={12} y={pad - 10} fill={cssVar.textMuted} fontSize="10">
            Likelihood of scores
          </text>
        </svg>

        {(userDotHovered || probeScore != null) && activeScore != null && activeBeat && (
          <div
            className="pointer-events-none absolute z-10 rounded-organic-md bg-surface-elevated px-3 py-2 text-[11px] text-text shadow-bar-floating"
            style={{
              left: activeX != null ? `${(activeX / w) * 100}%` : "50%",
              top: activeY != null ? `${Math.max(8, (activeY / h) * 100 - 14)}%` : "20%",
              transform: "translateX(-50%)",
            }}
          >
            <div className="font-semibold">
              Score {activeScore}/100
              {userDotHovered && " · your result"}
            </div>
            <div className="text-text-muted">
              Beat ~{activeBeat.percentile}% of players
              {activeBeat.isEstimate ? " (est.)" : ""}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
