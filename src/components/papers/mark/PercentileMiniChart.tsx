"use client";

import { cssVar } from "@/config/colors";

type PercentileRow = { score: number; cumulativePct: number };

type PercentileMiniChartProps = {
  rows: PercentileRow[];
  score: number | null | undefined;
  percentile: number | null | undefined;
  xLabel?: string;
  className?: string;
};

export function PercentileMiniChart({
  rows,
  score,
  percentile,
  xLabel = "Score",
  className,
}: PercentileMiniChartProps) {
  if (!rows || rows.length < 2) return null;

  const w = 400;
  const h = 175;
  const pad = 24;
  const xs = rows.map((r) => r.score);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = 0;
  const maxY = 100;
  const toX = (x: number) =>
    pad + ((x - minX) / Math.max(1e-9, maxX - minX)) * (w - 2 * pad);
  const toY = (y: number) =>
    h - pad - ((y - minY) / Math.max(1e-9, maxY - minY)) * (h - 2 * pad);
  const points = rows.map((r) => `${toX(r.score)},${toY(r.cumulativePct)}`).join(" ");
  const userX = toX(score ?? minX);
  const userY = toY(percentile ?? 0);

  const shadedPoints: string[] = [`${pad},${h - pad}`];
  rows.forEach((r) => {
    if (r.score <= (score ?? minX)) {
      shadedPoints.push(`${toX(r.score)},${toY(r.cumulativePct)}`);
    }
  });
  shadedPoints.push(`${userX},${userY}`, `${userX},${h - pad}`, `${pad},${h - pad}`);

  const xTicks: number[] = [];
  for (let s = Math.ceil(minX); s <= Math.floor(maxX); s += 1) xTicks.push(s);
  const yTicks = [0, 25, 50, 75, 100];

  return (
    <div className={className}>
      <svg
        width="100%"
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="xMidYMid meet"
        className="block"
        role="img"
        aria-label={`${xLabel} percentile distribution`}
      >
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke={cssVar.borderSubtle} />
        <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke={cssVar.borderSubtle} />
        {Number.isFinite(score) && Number.isFinite(percentile) && (
          <polygon
            points={shadedPoints.join(" ")}
            fill="color-mix(in srgb, var(--color-primary) 18%, transparent)"
            stroke="none"
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
              {t}
            </text>
          </g>
        ))}
        <polyline points={points} fill="none" stroke={cssVar.textSubtle} strokeWidth="2" />
        <line
          x1={userX}
          y1={pad}
          x2={userX}
          y2={h - pad}
          stroke="color-mix(in srgb, var(--color-text) 22%, transparent)"
          strokeDasharray="4 4"
        />
        <circle cx={userX} cy={userY} r="3" fill={cssVar.text} />
        <text x={w / 2} y={h - 4} fill={cssVar.textMuted} fontSize="10" textAnchor="middle">
          {xLabel}
        </text>
        <text x={8} y={pad - 8} fill={cssVar.textMuted} fontSize="10">
          Cumulative %
        </text>
      </svg>
    </div>
  );
}
