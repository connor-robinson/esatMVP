"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { cssVar } from "@/config/colors";
import {
  interpolatePercentile,
  interpolateScore,
  type EsatRow,
} from "@/lib/esat/percentiles";
import { SCORE_MAX, SCORE_MIN } from "@/lib/esat/percentileCatalog";
import { roundScore } from "@/lib/esat/percentileWording";
import { cn } from "@/lib/utils";

export type PercentileCumulativeChartProps = {
  rows: EsatRow[];
  compareRows?: EsatRow[];
  score: number;
  onScoreChange: (score: number) => void;
  accentColor?: string;
  compareLabel?: string;
  className?: string;
  /** Show median (50th) and 90th percentile reference lines when supported. */
  showReferenceLines?: boolean;
};

type ChartPoint = { score: number; cumulativePct: number; x: number; y: number };

function buildPolyline(points: ChartPoint[]): string {
  if (points.length === 0) return "";
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

function scoreFromClientX(
  clientX: number,
  svg: SVGSVGElement,
  chart: { padL: number; padR: number; w: number; minX: number; maxX: number },
): number {
  const rect = svg.getBoundingClientRect();
  const svgX = ((clientX - rect.left) / rect.width) * chart.w;
  if (svgX < chart.padL || svgX > chart.w - chart.padR) return NaN;
  const ratio = (svgX - chart.padL) / Math.max(1e-9, chart.w - chart.padL - chart.padR);
  const raw = chart.minX + ratio * (chart.maxX - chart.minX);
  return roundScore(Math.max(SCORE_MIN, Math.min(SCORE_MAX, raw)));
}

export function PercentileCumulativeChart({
  rows,
  compareRows,
  score,
  onScoreChange,
  accentColor = cssVar.maths,
  compareLabel = "Previous cycle",
  className,
  showReferenceLines = true,
}: PercentileCumulativeChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const draggingRef = useRef(false);
  const [focused, setFocused] = useState(false);
  const gradId = useId().replace(/:/g, "");
  const areaGradId = `pct-cum-area-${gradId}`;
  const lineGradId = `pct-cum-line-${gradId}`;

  const chart = useMemo(() => {
    if (!rows || rows.length < 2) return null;

    const sorted = [...rows].sort((a, b) => a.score - b.score);
    const minX = SCORE_MIN;
    const maxX = SCORE_MAX;
    const minY = 0;
    const maxY = 100;

    const w = 720;
    const h = 280;
    const padL = 44;
    const padR = 16;
    const padT = 28;
    const padB = 40;

    const toX = (x: number) =>
      padL + ((x - minX) / Math.max(1e-9, maxX - minX)) * (w - padL - padR);
    const toY = (y: number) =>
      h - padB - ((y - minY) / Math.max(1e-9, maxY - minY)) * (h - padT - padB);

    const primaryPoints: ChartPoint[] = sorted.map((row) => ({
      score: row.score,
      cumulativePct: row.cumulativePct,
      x: toX(row.score),
      y: toY(row.cumulativePct),
    }));

    const compareSorted = compareRows?.length
      ? [...compareRows].sort((a, b) => a.score - b.score)
      : [];
    const comparePoints: ChartPoint[] = compareSorted.map((row) => ({
      score: row.score,
      cumulativePct: row.cumulativePct,
      x: toX(row.score),
      y: toY(row.cumulativePct),
    }));

    const selectedPercentile = interpolatePercentile(sorted, score);
    const selectedX = toX(score);
    const selectedY = toY(selectedPercentile);

    const medianScore = interpolateScore(sorted, 50);
    const p90Score = interpolateScore(sorted, 90);
    const medianY = toY(50);
    const p90Y = toY(90);

    const xTicks: number[] = [];
    for (let s = Math.ceil(minX); s <= Math.floor(maxX); s += 1) xTicks.push(s);

    const yTicks = [0, 25, 50, 75, 100];

    return {
      w,
      h,
      padL,
      padR,
      padT,
      padB,
      minX,
      maxX,
      toX,
      toY,
      sorted,
      primaryLine: buildPolyline(primaryPoints),
      primaryArea: primaryPoints.length
        ? `${buildPolyline(primaryPoints)} L ${primaryPoints[primaryPoints.length - 1].x} ${h - padB} L ${primaryPoints[0].x} ${h - padB} Z`
        : "",
      compareLine: comparePoints.length ? buildPolyline(comparePoints) : "",
      xTicks,
      yTicks,
      selectedPercentile,
      selectedX,
      selectedY,
      medianScore,
      p90Score,
      medianY,
      p90Y,
      hasMedian: Number.isFinite(medianScore),
      hasP90: Number.isFinite(p90Score),
    };
  }, [rows, compareRows, score]);

  const updateScoreFromPointer = useCallback(
    (clientX: number) => {
      if (!chart || !svgRef.current) return;
      const next = scoreFromClientX(clientX, svgRef.current, chart);
      if (Number.isFinite(next)) onScoreChange(next);
    },
    [chart, onScoreChange],
  );

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<SVGRectElement>) => {
      draggingRef.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      updateScoreFromPointer(event.clientX);
    },
    [updateScoreFromPointer],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<SVGRectElement>) => {
      if (!draggingRef.current) return;
      updateScoreFromPointer(event.clientX);
    },
    [updateScoreFromPointer],
  );

  const onPointerUp = useCallback((event: ReactPointerEvent<SVGRectElement>) => {
    draggingRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }, []);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<SVGSVGElement>) => {
      let delta = 0;
      if (event.key === "ArrowRight" || event.key === "ArrowUp") delta = 0.1;
      if (event.key === "ArrowLeft" || event.key === "ArrowDown") delta = -0.1;
      if (event.key === "Home") {
        event.preventDefault();
        onScoreChange(SCORE_MIN);
        return;
      }
      if (event.key === "End") {
        event.preventDefault();
        onScoreChange(SCORE_MAX);
        return;
      }
      if (delta === 0) return;
      event.preventDefault();
      onScoreChange(roundScore(Math.max(SCORE_MIN, Math.min(SCORE_MAX, score + delta))));
    },
    [onScoreChange, score],
  );

  useEffect(() => {
    if (!focused) return;
    const onWindowPointerUp = () => {
      draggingRef.current = false;
    };
    window.addEventListener("pointerup", onWindowPointerUp);
    return () => window.removeEventListener("pointerup", onWindowPointerUp);
  }, [focused]);

  if (!chart) return null;

  const {
    w,
    h,
    padL,
    padR,
    padT,
    padB,
    toX,
    primaryLine,
    primaryArea,
    compareLine,
    xTicks,
    yTicks,
    selectedPercentile,
    selectedX,
    selectedY,
    medianScore,
    p90Score,
    medianY,
    p90Y,
    hasMedian,
    hasP90,
  } = chart;

  return (
    <div className={className}>
      <svg
        ref={svgRef}
        width="100%"
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="xMidYMid meet"
        className="block touch-none outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/60"
        role="application"
        tabIndex={0}
        aria-label="ESAT cumulative percentile chart. Use arrow keys or drag to change the selected score."
        aria-valuemin={SCORE_MIN}
        aria-valuemax={SCORE_MAX}
        aria-valuenow={score}
        aria-valuetext={`${score.toFixed(1)} ESAT score, approximately ${Math.round(selectedPercentile)}th percentile`}
        onKeyDown={onKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      >
        <defs>
          <linearGradient id={areaGradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.22" />
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

        {yTicks.map((tick) => {
          const y = padT + (h - padT - padB) * (1 - tick / 100);
          return (
            <g key={`y-${tick}`}>
              <line
                x1={padL}
                y1={y}
                x2={w - padR}
                y2={y}
                stroke={cssVar.borderSubtle}
                strokeOpacity={tick === 0 || tick === 100 ? 0.55 : 0.3}
                strokeDasharray={tick === 50 || tick === 90 ? "4 6" : "3 6"}
              />
              <text x={padL - 8} y={y + 3} fill={cssVar.textMuted} fontSize="10" textAnchor="end">
                {tick}%
              </text>
            </g>
          );
        })}

        <line x1={padL} y1={h - padB} x2={w - padR} y2={h - padB} stroke={cssVar.borderSubtle} />
        <line x1={padL} y1={padT} x2={padL} y2={h - padB} stroke={cssVar.borderSubtle} />

        {showReferenceLines && hasMedian && (
          <g pointerEvents="none">
            <line
              x1={padL}
              y1={medianY}
              x2={w - padR}
              y2={medianY}
              stroke={cssVar.textMuted}
              strokeOpacity={0.35}
              strokeDasharray="5 5"
            />
            <text x={w - padR} y={medianY - 4} fill={cssVar.textMuted} fontSize="9" textAnchor="end">
              Median ({medianScore.toFixed(1)})
            </text>
          </g>
        )}

        {showReferenceLines && hasP90 && (
          <g pointerEvents="none">
            <line
              x1={padL}
              y1={p90Y}
              x2={w - padR}
              y2={p90Y}
              stroke={accentColor}
              strokeOpacity={0.28}
              strokeDasharray="5 5"
            />
            <text x={w - padR} y={p90Y - 4} fill={cssVar.textMuted} fontSize="9" textAnchor="end">
              90th percentile ({p90Score.toFixed(1)})
            </text>
          </g>
        )}

        {primaryArea ? (
          <path d={primaryArea} fill={`url(#${areaGradId})`} stroke="none" pointerEvents="none" />
        ) : null}

        {compareLine ? (
          <path
            d={compareLine}
            fill="none"
            stroke={cssVar.textMuted}
            strokeWidth="2"
            strokeDasharray="6 5"
            strokeLinecap="round"
            strokeLinejoin="round"
            pointerEvents="none"
            opacity={0.85}
          />
        ) : null}

        {primaryLine ? (
          <path
            d={primaryLine}
            fill="none"
            stroke={`url(#${lineGradId})`}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            pointerEvents="none"
          />
        ) : null}

        {xTicks.map((tick) => (
          <g key={`x-${tick}`}>
            <line
              x1={toX(tick)}
              y1={h - padB}
              x2={toX(tick)}
              y2={h - padB + 4}
              stroke={cssVar.borderSubtle}
              strokeOpacity={0.6}
            />
            <text
              x={toX(tick)}
              y={h - padB + 14}
              fill={cssVar.textMuted}
              fontSize="10"
              textAnchor="middle"
            >
              {tick}
            </text>
          </g>
        ))}

        <g pointerEvents="none">
          <line
            x1={selectedX}
            y1={padT}
            x2={selectedX}
            y2={h - padB}
            stroke={accentColor}
            strokeOpacity={0.45}
            strokeDasharray="4 4"
          />
          <circle
            cx={selectedX}
            cy={selectedY}
            r="6"
            fill={accentColor}
            stroke={cssVar.background}
            strokeWidth="2.5"
          />
        </g>

        <rect
          x={padL}
          y={padT}
          width={w - padL - padR}
          height={h - padT - padB}
          fill="transparent"
          aria-hidden
          className="cursor-crosshair"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />

        <text x={w / 2} y={h - 6} fill={cssVar.textMuted} fontSize="10" textAnchor="middle">
          ESAT score
        </text>
        <text
          x={12}
          y={h / 2}
          fill={cssVar.textMuted}
          fontSize="10"
          textAnchor="middle"
          transform={`rotate(-90 12 ${h / 2})`}
        >
          Cumulative percentile
        </text>
      </svg>

      {compareLine ? (
        <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-[#94A3B8]">
          <span className="inline-flex items-center gap-2">
            <span className="h-0.5 w-5 rounded-full" style={{ backgroundColor: accentColor }} />
            Selected cycle
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-0 w-5 border-t-2 border-dashed border-[#94A3B8]" />
            {compareLabel}
          </span>
        </div>
      ) : null}

      <p className="sr-only" aria-live="polite">
        {score.toFixed(1)} ESAT score, approximately {Math.round(selectedPercentile)}th percentile
      </p>
    </div>
  );
}

export function PercentileChartSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-[280px] items-center justify-center rounded-2xl bg-white/[0.04] text-sm text-[#94A3B8]",
        className,
      )}
    >
      Loading chart…
    </div>
  );
}
