"use client";

import { useRef, useCallback, useMemo } from "react";
import type { UnitCircleDiagramConfig } from "@/types/core";
import {
  getAngleByDegrees,
  UNIT_CIRCLE_CX,
  UNIT_CIRCLE_CY,
  svgClickToDegrees,
} from "@/lib/angles/angleData";
import { coordPairToLatex } from "@/lib/angles/coordLatex";
import { renderMath } from "@/hooks/useKaTeX";
import { cn } from "@/lib/utils";

export interface UnitCircleFeedback {
  showCorrect: boolean;
  correctDegrees: number;
  selectedDegrees?: number;
}

interface UnitCircleProps {
  config: UnitCircleDiagramConfig;
  className?: string;
  interactive?: boolean;
  onAngleSelect?: (degrees: number) => void;
  feedback?: UnitCircleFeedback;
  disabled?: boolean;
}

export function UnitCircle({
  config,
  className,
  interactive = false,
  onAngleSelect,
  feedback,
  disabled = false,
}: UnitCircleProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const {
    cx = UNIT_CIRCLE_CX,
    cy = UNIT_CIRCLE_CY,
    r,
    viewBox,
    highlightDegrees,
    showHighlightPoint = true,
    labels = [],
    showAxes = true,
    showCoordinateLabels = false,
    showCoordinateProjections = false,
  } = config;

  const vb = `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`;

  const highlightAngle =
    feedback?.showCorrect && feedback.correctDegrees != null
      ? getAngleByDegrees(feedback.correctDegrees)
      : highlightDegrees != null
        ? getAngleByDegrees(highlightDegrees)
        : undefined;

  const selectedAngle =
    feedback?.selectedDegrees != null
      ? getAngleByDegrees(feedback.selectedDegrees)
      : undefined;

  const handleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!interactive || disabled || !onAngleSelect || !svgRef.current) return;
      const deg = svgClickToDegrees(svgRef.current, e.clientX, e.clientY, cx, cy);
      onAngleSelect(deg);
    },
    [interactive, disabled, onAngleSelect, cx, cy],
  );

  const axisLen = r + 18;

  return (
    <div className={cn("flex justify-center items-center w-full", className)}>
      <svg
        ref={svgRef}
        viewBox={vb}
        className={cn(
          "w-full max-w-[340px] h-auto",
          interactive && !disabled && "cursor-crosshair",
        )}
        preserveAspectRatio="xMidYMid meet"
        onClick={handleClick}
        role={interactive ? "button" : "img"}
        aria-label="Unit circle diagram"
      >
        {showAxes && (
          <>
            <line
              x1={cx - axisLen}
              y1={cy}
              x2={cx + axisLen}
              y2={cy}
              stroke="var(--color-text)"
              strokeOpacity={0.35}
              strokeWidth={1.5}
            />
            <line
              x1={cx}
              y1={cy - axisLen}
              x2={cx}
              y2={cy + axisLen}
              stroke="var(--color-text)"
              strokeOpacity={0.35}
              strokeWidth={1.5}
            />
          </>
        )}

        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="var(--color-text)"
          strokeOpacity={0.45}
          strokeWidth={2}
        />

        <circle cx={cx} cy={cy} r={3} fill="var(--color-text)" fillOpacity={0.7} />

        {showAxes && showCoordinateLabels && (
          <>
            <DiagramLabel x={cx + axisLen + 8} y={cy + 4} text="x" fontSize={12} />
            <DiagramLabel x={cx - 6} y={cy - axisLen - 6} text="y" fontSize={12} />
          </>
        )}

        {labels.map((labelCfg) => {
          if (labelCfg.hidden) return null;
          const angle = getAngleByDegrees(labelCfg.degrees);
          if (!angle) return null;
          const text = labelCfg.text ?? angle.degreeLabel;
          return (
            <DiagramLabel
              key={labelCfg.degrees}
              x={angle.labelPosition.x}
              y={angle.labelPosition.y}
              text={text}
              fontSize={labelCfg.text === "?" ? 16 : 13}
              emphasis={labelCfg.text === "?"}
            />
          );
        })}

        {selectedAngle && feedback?.showCorrect && (
          <>
            <line
              x1={cx}
              y1={cy}
              x2={selectedAngle.point.x}
              y2={selectedAngle.point.y}
              stroke="var(--color-error, #ef4444)"
              strokeOpacity={0.55}
              strokeWidth={2}
              strokeDasharray="4 3"
            />
            {showHighlightPoint && (
              <circle
                cx={selectedAngle.point.x}
                cy={selectedAngle.point.y}
                r={5}
                fill="var(--color-error, #ef4444)"
                fillOpacity={0.5}
              />
            )}
          </>
        )}

        {highlightAngle && showCoordinateProjections && (
          <>
            <line
              x1={highlightAngle.point.x}
              y1={highlightAngle.point.y}
              x2={highlightAngle.point.x}
              y2={cy}
              stroke="var(--color-text)"
              strokeOpacity={0.25}
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
            <line
              x1={highlightAngle.point.x}
              y1={highlightAngle.point.y}
              x2={cx}
              y2={highlightAngle.point.y}
              stroke="var(--color-text)"
              strokeOpacity={0.25}
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
          </>
        )}

        {highlightAngle && (
          <>
            <line
              x1={cx}
              y1={cy}
              x2={highlightAngle.point.x}
              y2={highlightAngle.point.y}
              stroke={
                feedback?.showCorrect
                  ? "var(--color-primary, #22c55e)"
                  : "var(--color-text)"
              }
              strokeOpacity={feedback?.showCorrect ? 0.75 : 0.6}
              strokeWidth={2.5}
            />
            {showHighlightPoint && (
              <circle
                cx={highlightAngle.point.x}
                cy={highlightAngle.point.y}
                r={6}
                fill={
                  feedback?.showCorrect
                    ? "var(--color-primary, #22c55e)"
                    : "var(--color-text)"
                }
                fillOpacity={0.85}
              />
            )}
            {showCoordinateLabels && (
              <MathDiagramLabel
                x={highlightAngle.point.x + (highlightAngle.x >= 0 ? 22 : -22)}
                y={highlightAngle.point.y + (highlightAngle.y >= 0 ? -14 : 14)}
                latex={coordPairToLatex(highlightAngle.cosLabel, highlightAngle.sinLabel)}
                width={highlightAngle.x >= 0 ? 92 : 98}
              />
            )}
          </>
        )}
      </svg>
    </div>
  );
}

function MathDiagramLabel({
  x,
  y,
  latex,
  width = 88,
}: {
  x: number;
  y: number;
  latex: string;
  width?: number;
}) {
  const html = useMemo(() => renderMath(latex, false) ?? "", [latex]);
  const height = 28;

  return (
    <foreignObject
      x={x - width / 2}
      y={y - height / 2}
      width={width}
      height={height}
      className="overflow-visible"
    >
      <div
        xmlns="http://www.w3.org/1999/xhtml"
        className="flex h-full w-full items-center justify-center text-text [&_.katex]:text-[11px]"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </foreignObject>
  );
}

function DiagramLabel({
  x,
  y,
  text,
  fontSize,
  emphasis,
}: {
  x: number;
  y: number;
  text: string;
  fontSize: number;
  emphasis?: boolean;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="middle"
      fill="var(--color-text)"
      fillOpacity={emphasis ? 1 : 0.9}
      style={{
        fontSize: `${fontSize}px`,
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        fontWeight: emphasis ? 700 : 500,
      }}
    >
      {text}
    </text>
  );
}
