/**
 * Renders structured geometry diagram data as SVG
 */

"use client";

import type { GeometryDiagramData } from "@/types/core";
import { arcPath } from "@/lib/diagrams/geometryPrimitives";
import { cn } from "@/lib/utils";

interface GeometryDiagramProps {
  data: GeometryDiagramData;
  className?: string;
}

export function GeometryDiagram({ data, className }: GeometryDiagramProps) {
  const { viewBox, paths = [], lines = [], arcs = [], angleArcs = [], labels, circles = [], points = [], caption } = data;
  const vb = `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`;

  return (
    <div className={cn("flex flex-col items-center w-full gap-1.5", className)}>
      <svg
        viewBox={vb}
        className="w-full max-w-[340px] h-auto"
        preserveAspectRatio="xMidYMid meet"
      >
        {circles.map((c, i) => (
          <circle
            key={`circle-${i}`}
            cx={c.cx}
            cy={c.cy}
            r={c.r}
            fill="none"
            stroke="var(--color-text)"
            strokeOpacity={0.45}
            strokeWidth={2}
          />
        ))}

        {paths.map((p, i) => (
          <path
            key={`path-${i}`}
            d={p.d}
            fill={p.fill ?? "none"}
            fillOpacity={p.fillOpacity ?? (p.fill ? 0.08 : 0)}
            stroke={p.stroke !== false ? "var(--color-text)" : "none"}
            strokeOpacity={0.45}
            strokeWidth={2}
            strokeDasharray={p.strokeDasharray}
          />
        ))}

        {lines.map((l, i) => (
          <line
            key={`line-${i}`}
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            stroke="var(--color-text)"
            strokeOpacity={l.dashed ? 0.35 : 0.5}
            strokeWidth={l.dashed ? 1.5 : 2}
            strokeDasharray={l.dashed ? "5 4" : undefined}
          />
        ))}

        {arcs.map((a, i) => (
          <path
            key={`arc-${i}`}
            d={arcPath(a.cx, a.cy, a.r, a.startDeg, a.endDeg)}
            fill="none"
            stroke="var(--color-text)"
            strokeOpacity={0.45}
            strokeWidth={2}
          />
        ))}

        {angleArcs?.map((a, i) => (
          <g key={`angle-${i}`}>
            <path
              d={arcPath(a.cx, a.cy, a.r, a.startDeg, a.endDeg)}
              fill="none"
              stroke="var(--color-text)"
              strokeOpacity={0.5}
              strokeWidth={1.5}
            />
            <DiagramLabel x={a.labelX} y={a.labelY} text={a.label} fontSize={13} emphasis={a.label === "x"} />
          </g>
        ))}

        {points.map((p, i) => (
          <g key={`point-${i}`}>
            <circle cx={p.x} cy={p.y} r={p.emphasis ? 3.5 : 3} fill="var(--color-text)" fillOpacity={0.85} />
            {p.label && (
              <DiagramLabel
                x={p.x}
                y={p.y - 14}
                text={p.label}
                fontSize={13}
                emphasis
              />
            )}
          </g>
        ))}

        {labels.map((l, i) => (
          <DiagramLabel key={`label-${i}`} x={l.x} y={l.y} text={l.text} fontSize={l.fontSize ?? 14} />
        ))}
      </svg>
      {caption && (
        <p className="text-xs text-[var(--color-text)] opacity-50 font-medium tracking-wide">{caption}</p>
      )}
    </div>
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
        fontWeight: emphasis ? 600 : 500,
      }}
    >
      {text}
    </text>
  );
}
