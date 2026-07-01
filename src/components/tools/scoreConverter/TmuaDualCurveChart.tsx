"use client";

import { useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { cssVar } from "@/config/colors";
import { cn } from "@/lib/utils";
import type { TmuaDualCurveData } from "@/lib/scoreConverter/tmuaDualCurve";

const LOW_BAND_Y_MIN = 4.0;
const LOW_BAND_Y_MAX = 6.5;

type TmuaDualCurveChartProps = {
  data: TmuaDualCurveData;
  className?: string;
};

export function TmuaDualCurveChart({ data, className }: TmuaDualCurveChartProps) {
  const chart = useMemo(() => {
    const w = 720;
    const h = 300;
    const padL = 40;
    const padRight = 16;
    const padT = 28;
    const padB = 36;
    const minX = 0;
    const maxX = data.maxRaw;
    const minY = 1;
    const maxY = 9;

    const toX = (raw: number) =>
      padL + ((raw - minX) / Math.max(1, maxX - minX)) * (w - padL - padRight);
    const toY = (scaled: number) =>
      h - padB - ((scaled - minY) / (maxY - minY)) * (h - padT - padB);

    const curveA = data.points.map((p) => `${toX(p.raw)},${toY(p.actualScaled)}`).join(" ");

    const curveBSegments: string[] = [];
    let segment: string[] = [];
    for (const p of data.points) {
      if (p.estimatedScaled == null) {
        if (segment.length > 0) {
          curveBSegments.push(segment.join(" "));
          segment = [];
        }
        continue;
      }
      segment.push(`${toX(p.raw)},${toY(p.estimatedScaled)}`);
    }
    if (segment.length > 0) curveBSegments.push(segment.join(" "));

    const bandTop = toY(LOW_BAND_Y_MAX);
    const bandBottom = toY(LOW_BAND_Y_MIN);
    const bandHeight = bandBottom - bandTop;

    const studentX = toX(data.student.raw);
    const studentYA = toY(data.student.actualScaled);
    const studentYB =
      data.student.estimatedScaled != null
        ? toY(data.student.estimatedScaled)
        : null;

    const xTicks: number[] = [];
    const step = maxX <= 20 ? 5 : Math.ceil(maxX / 4);
    for (let x = 0; x <= maxX; x += step) xTicks.push(x);
    if (xTicks[xTicks.length - 1] !== maxX) xTicks.push(maxX);

    const yTicks = [1, 3, 5, 7, 9];

    return {
      w,
      h,
      padL,
      padT,
      padB,
      toX,
      toY,
      curveA,
      curveBSegments,
      bandTop,
      bandHeight,
      chartRight: w - padRight,
      studentX,
      studentYA,
      studentYB,
      xTicks,
      yTicks,
    };
  }, [data]);

  const {
    w,
    h,
    padL,
    padT,
    padB,
    chartRight,
    toX,
    toY,
    curveA,
    curveBSegments,
    bandTop,
    bandHeight,
    studentX,
    studentYA,
    studentYB,
    xTicks,
    yTicks,
  } = chart;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-text-muted">
        <span className="inline-flex items-center gap-2">
          <span
            className="inline-block h-0.5 w-5 rounded-full"
            style={{ background: "var(--color-tmua-accent)" }}
          />
          Actual {data.year} grade
        </span>
        <span className="inline-flex items-center gap-2">
          <span
            className="inline-block h-0.5 w-5 rounded-full border-b border-dashed"
            style={{ borderColor: "var(--color-secondary)" }}
          />
          Estimated 2026-equivalent
        </span>
      </div>

      <div className="relative">
        <svg
          width="100%"
          height={h}
          viewBox={`0 0 ${w} ${h}`}
          preserveAspectRatio="xMidYMid meet"
          className="block"
          role="img"
          aria-label={`TMUA ${data.year} raw marks vs scaled score dual curve`}
        >
          <line x1={padL} y1={h - padB} x2={chartRight} y2={h - padB} stroke={cssVar.borderSubtle} />
          <line x1={padL} y1={padT} x2={padL} y2={h - padB} stroke={cssVar.borderSubtle} />

          {/* Lower-confidence band on the new-scale y-axis */}
          <rect
            x={padL}
            y={bandTop}
            width={chartRight - padL}
            height={bandHeight}
            fill="color-mix(in srgb, var(--color-warning) 8%, transparent)"
          />
          <text
            x={padL + 6}
            y={bandTop + 14}
            fill={cssVar.textMuted}
            fontSize="9"
            opacity={0.85}
          >
            Less reliable here (≈4.0–6.5 on 2026 scale)
          </text>

          {yTicks.map((t) => (
            <g key={`y-${t}`}>
              <line
                x1={padL - 4}
                y1={toY(t)}
                x2={padL}
                y2={toY(t)}
                stroke={cssVar.borderSubtle}
              />
              <text
                x={padL - 6}
                y={toY(t) + 3}
                fill={cssVar.textMuted}
                fontSize="9"
                textAnchor="end"
              >
                {t}
              </text>
            </g>
          ))}

          {xTicks.map((t) => (
            <g key={`x-${t}`}>
              <line
                x1={toX(t)}
                y1={h - padB}
                x2={toX(t)}
                y2={h - padB + 4}
                stroke={cssVar.borderSubtle}
              />
              <text
                x={toX(t)}
                y={h - padB + 14}
                fill={cssVar.textMuted}
                fontSize="9"
                textAnchor="middle"
              >
                {t}
              </text>
            </g>
          ))}

          {/* Curve A — official */}
          <polyline
            points={curveA}
            fill="none"
            stroke="var(--color-tmua-accent)"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Curve B — estimated (gaps where out of post-table range) */}
          {curveBSegments.map((seg, i) => (
            <polyline
              key={`b-${i}`}
              points={seg}
              fill="none"
              stroke="var(--color-secondary)"
              strokeWidth="2"
              strokeDasharray="6 4"
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity={0.9}
            />
          ))}

          {/* Student raw guide */}
          <line
            x1={studentX}
            y1={padT}
            x2={studentX}
            y2={h - padB}
            stroke="color-mix(in srgb, var(--color-text) 25%, transparent)"
            strokeDasharray="4 3"
          />

          <circle
            cx={studentX}
            cy={studentYA}
            r="5"
            fill="var(--color-tmua-accent)"
            stroke={cssVar.background}
            strokeWidth="2"
          />
          <text
            x={studentX + 8}
            y={studentYA - 8}
            fill="var(--color-tmua-accent)"
            fontSize="10"
            fontWeight="600"
          >
            {data.student.actualScaled.toFixed(1)}
          </text>

          {studentYB != null && (
            <>
              <circle
                cx={studentX}
                cy={studentYB}
                r="5"
                fill="var(--color-secondary)"
                stroke={cssVar.background}
                strokeWidth="2"
              />
              <text
                x={studentX + 8}
                y={studentYB + 14}
                fill="var(--color-secondary)"
                fontSize="10"
                fontWeight="600"
              >
                {data.student.estimatedScaled!.toFixed(1)}
              </text>
            </>
          )}

          <text
            x={(padL + chartRight) / 2}
            y={h - 4}
            fill={cssVar.textMuted}
            fontSize="10"
            textAnchor="middle"
          >
            Raw marks
          </text>
          <text
            x={12}
            y={padT - 6}
            fill={cssVar.textMuted}
            fontSize="10"
          >
            Scaled score
          </text>
        </svg>
      </div>
    </div>
  );
}

export function TmuaDualCurveExplainer({
  summary,
  className,
}: {
  summary: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-sm leading-relaxed text-text">{summary}</p>

      <details className="group rounded-organic-md bg-surface-subtle/80">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-text">
          Why two scores?
          <ChevronDown className="h-4 w-4 shrink-0 text-text-muted transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-3 px-4 pb-4 text-xs leading-relaxed text-text-muted">
          <p>
            The TMUA changed hands in 2024 — Cambridge Assessment handed administration
            to UAT-UK and Pearson VUE. The test content stayed similar, but candidates
            now sit different versions on different dates, and scores are calculated
            per-candidate using a statistical model (Rasch) rather than one fixed table.
            That&apos;s why nobody — including UAT-UK — publishes a raw-marks-to-score
            table for 2024 onward.
          </p>
          <p>
            This also moved where the 1.0–9.0 scale sits: a typical candidate&apos;s score
            dropped from around 5.1 to around 3.8. University requirements were lowered
            by a similar amount, so this isn&apos;t the test getting harder — it&apos;s the ruler
            being recalibrated.
          </p>
          <p>
            The score on the left is what this paper would actually have earned under
            the old system. The score on the right is an estimate of the equivalent on
            today&apos;s scale, based on matching percentile rank between the two systems.
            It&apos;s an estimate, not an official conversion. Treat scores of 7.0+ as fairly
            reliable across this comparison; treat the middle of the range with more
            caution, since that&apos;s where the two systems diverge most.
          </p>
        </div>
      </details>
    </div>
  );
}
