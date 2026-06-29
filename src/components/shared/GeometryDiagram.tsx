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
  const { viewBox, paths = [], lines = [], arcs = [], angleArcs = [], labels } = data;
  const vb = `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`;

  return (
    <div className={cn("flex justify-center items-center w-full", className)}>
      <svg
        viewBox={vb}
        className="w-full max-w-[280px] h-auto"
        preserveAspectRatio="xMidYMid meet"
      >
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
            <LabelBubble x={a.labelX} y={a.labelY} text={a.label} fontSize={13} />
          </g>
        ))}

        {labels.map((l, i) => (
          <LabelBubble key={`label-${i}`} x={l.x} y={l.y} text={l.text} fontSize={l.fontSize ?? 15} />
        ))}
      </svg>
    </div>
  );
}

function LabelBubble({ x, y, text, fontSize }: { x: number; y: number; text: string; fontSize: number }) {
  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={Math.max(12, text.length * 4)}
        fill="var(--color-background)"
        fillOpacity={0.65}
        stroke="var(--color-text)"
        strokeOpacity={0.2}
        strokeWidth={1}
      />
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-white font-semibold italic"
        style={{ fontSize: `${fontSize}px` }}
      >
        {text}
      </text>
    </g>
  );
}
