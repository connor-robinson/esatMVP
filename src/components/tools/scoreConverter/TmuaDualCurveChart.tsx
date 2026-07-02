"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Info, X } from "lucide-react";
import { cssVar } from "@/config/colors";
import { cn } from "@/lib/utils";
import {
  TMUA_POST_2024_EXPLAINER,
  type TmuaDualCurveData,
} from "@/lib/scoreConverter/tmuaDualCurve";

const LOW_BAND_Y_MIN = 4.0;
const LOW_BAND_Y_MAX = 6.5;

type TmuaDualCurveChartProps = {
  data: TmuaDualCurveData;
  className?: string;
};

export function TmuaDualCurveChart({ data, className }: TmuaDualCurveChartProps) {
  const [infoOpen, setInfoOpen] = useState(false);
  const [animateKey, setAnimateKey] = useState(0);
  const infoRef = useRef<HTMLDivElement>(null);
  const infoButtonId = useId();
  const infoPanelId = useId();

  useEffect(() => {
    setAnimateKey((k) => k + 1);
  }, [data]);

  useEffect(() => {
    if (!infoOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (infoRef.current && !infoRef.current.contains(e.target as Node)) {
        setInfoOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setInfoOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [infoOpen]);

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
    let bFirstRaw: number | null = null;
    let bLastRaw: number | null = null;
    for (const p of data.points) {
      if (p.estimatedScaled == null) {
        if (segment.length > 0) {
          curveBSegments.push(segment.join(" "));
          segment = [];
        }
        continue;
      }
      if (bFirstRaw == null) bFirstRaw = p.raw;
      bLastRaw = p.raw;
      segment.push(`${toX(p.raw)},${toY(p.estimatedScaled)}`);
    }
    if (segment.length > 0) curveBSegments.push(segment.join(" "));

    const chartRight = w - padRight;

    const bUnavailableLeft =
      bFirstRaw != null && bFirstRaw > minX
        ? { x: padL, width: toX(bFirstRaw) - padL, boundaryX: toX(bFirstRaw) }
        : null;
    const bUnavailableRight =
      bLastRaw != null && bLastRaw < maxX
        ? { x: toX(bLastRaw), width: chartRight - toX(bLastRaw), boundaryX: toX(bLastRaw) }
        : null;

    let curveBLeftExtension: string | null = null;
    if (bFirstRaw != null && bFirstRaw > minX) {
      const first = data.points.find(
        (p) => p.raw === bFirstRaw && p.estimatedScaled != null,
      );
      if (first?.estimatedScaled != null) {
        curveBLeftExtension = `${toX(minX)},${toY(first.estimatedScaled)} ${toX(bFirstRaw)},${toY(first.estimatedScaled)}`;
      }
    }

    const chartTop = padT - 6;
    const chartBottom = h - padB + 4;

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
      bUnavailableLeft,
      bUnavailableRight,
      curveBLeftExtension,
      chartTop,
      chartBottom,
      bandTop,
      bandHeight,
      chartRight,
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
    bUnavailableLeft,
    bUnavailableRight,
    curveBLeftExtension,
    chartTop,
    chartBottom,
    bandTop,
    bandHeight,
    studentX,
    studentYA,
    studentYB,
    xTicks,
    yTicks,
  } = chart;

  const hasPostCurve = curveBSegments.length > 0;
  const hasPostStudent = studentYB != null && data.student.estimatedScaled != null;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-text-muted">
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-block h-0.5 w-5 rounded-full"
              style={{ background: "var(--color-tmua-accent)" }}
            />
            Actual {data.year} grade
          </span>
          {hasPostCurve && (
            <span className="inline-flex items-center gap-2">
              <span
                className="inline-block h-0 w-5 border-t-2 border-dashed"
                style={{ borderColor: cssVar.textMuted }}
              />
              Post-2024 TMUA score (est.)
            </span>
          )}
        </div>

        <div ref={infoRef} className="relative shrink-0">
          <button
            type="button"
            id={infoButtonId}
            aria-expanded={infoOpen}
            aria-controls={infoPanelId}
            onClick={() => setInfoOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-organic-md px-2.5 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-surface-subtle hover:text-text"
          >
            <Info className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Why two scores?
          </button>

          {infoOpen && (
            <div
              id={infoPanelId}
              role="dialog"
              aria-labelledby={infoButtonId}
              className="absolute right-0 top-full z-20 mt-2 w-[min(100vw-2rem,22rem)] rounded-organic-lg bg-surface-elevated p-4 shadow-modal-card"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-text">
                  {TMUA_POST_2024_EXPLAINER.title}
                </p>
                <button
                  type="button"
                  onClick={() => setInfoOpen(false)}
                  className="rounded-organic-sm p-1 text-text-muted transition-colors hover:bg-surface-subtle hover:text-text"
                  aria-label="Close"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="space-y-2.5 text-xs leading-relaxed text-text-muted">
                {TMUA_POST_2024_EXPLAINER.paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="relative">
        <svg
          key={animateKey}
          width="100%"
          height={h}
          viewBox={`0 0 ${w} ${h}`}
          preserveAspectRatio="xMidYMid meet"
          className="block"
          role="img"
          aria-label={`TMUA ${data.year} raw marks vs scaled score, with post-2024 equivalent curve`}
        >
          <line x1={padL} y1={h - padB} x2={chartRight} y2={h - padB} stroke={cssVar.borderSubtle} />
          <line x1={padL} y1={padT} x2={padL} y2={h - padB} stroke={cssVar.borderSubtle} />

          {/* Shaded regions where post-2024 estimate is unavailable */}
          {bUnavailableLeft && (
            <g>
              <rect
                x={bUnavailableLeft.x}
                y={padT}
                width={bUnavailableLeft.width}
                height={h - padB - padT}
                fill="color-mix(in srgb, var(--color-text-muted) 7%, transparent)"
              />
              <line
                x1={bUnavailableLeft.boundaryX}
                y1={chartTop}
                x2={bUnavailableLeft.boundaryX}
                y2={chartBottom}
                stroke="color-mix(in srgb, var(--color-text-muted) 22%, transparent)"
                strokeDasharray="3 4"
              />
              <text
                x={bUnavailableLeft.x + bUnavailableLeft.width / 2}
                y={(padT + h - padB) / 2 + 3}
                fill={cssVar.textMuted}
                fontSize="8.5"
                textAnchor="middle"
                opacity={0.75}
              >
                No post-2024 estimate
              </text>
            </g>
          )}
          {bUnavailableRight && (
            <g>
              <rect
                x={bUnavailableRight.x}
                y={padT}
                width={bUnavailableRight.width}
                height={h - padB - padT}
                fill="color-mix(in srgb, var(--color-text-muted) 7%, transparent)"
              />
              <line
                x1={bUnavailableRight.boundaryX}
                y1={chartTop}
                x2={bUnavailableRight.boundaryX}
                y2={chartBottom}
                stroke="color-mix(in srgb, var(--color-text-muted) 22%, transparent)"
                strokeDasharray="3 4"
              />
            </g>
          )}

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
            Less reliable here (≈4.0–6.5 on post-2024 scale)
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

          {/* Curve A — official pre-2024 */}
          <polyline
            points={curveA}
            fill="none"
            stroke="var(--color-tmua-accent)"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            pathLength={1}
            className="tmua-curve-draw"
          />

          {/* Curve B — post-2024 equivalent (dashed neutral) */}
          {curveBLeftExtension && (
            <polyline
              points={curveBLeftExtension}
              fill="none"
              stroke={cssVar.textMuted}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray="4 6"
              opacity={0.4}
            />
          )}
          {curveBSegments.map((seg, i) => (
            <polyline
              key={`b-${i}`}
              points={seg}
              fill="none"
              stroke={cssVar.textMuted}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray="7 5"
              opacity={0.9}
              className="tmua-fade-up-delayed"
              style={{ animationDelay: `${0.35 + i * 0.1}s` }}
            />
          ))}

          <line
            x1={studentX}
            y1={chartTop}
            x2={studentX}
            y2={chartBottom}
            stroke="color-mix(in srgb, var(--color-text) 25%, transparent)"
            strokeDasharray="4 3"
          />

          {/* Vertical link at student's raw score between the two scales */}
          {hasPostStudent && (
            <line
              x1={studentX}
              y1={studentYA}
              x2={studentX}
              y2={studentYB!}
              stroke={cssVar.textMuted}
              strokeWidth="1.5"
              strokeDasharray="4 4"
              opacity={0.65}
              className="tmua-fade-up-delayed"
            />
          )}

          <circle
            cx={studentX}
            cy={studentYA}
            r="5"
            fill="var(--color-tmua-accent)"
            stroke={cssVar.background}
            strokeWidth="2"
            className="tmua-fade-up"
            style={{ animationDelay: "0.2s" }}
          />

          {hasPostStudent && (
            <circle
              cx={studentX}
              cy={studentYB!}
              r="5"
              fill={cssVar.textMuted}
              stroke={cssVar.background}
              strokeWidth="2"
              className="tmua-fade-up-delayed"
            />
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
          <text x={12} y={padT - 6} fill={cssVar.textMuted} fontSize="10">
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
    <p className={cn("text-sm leading-relaxed text-text-muted", className)}>
      {summary}
    </p>
  );
}
