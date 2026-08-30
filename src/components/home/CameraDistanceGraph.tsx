"use client";

import { cn } from "@/lib/utils";
import {
  CAMERA_CURVE_FUNCTIONS,
  CAMERA_CURVE_LABELS,
  CAMERA_CURVE_Y_MAX,
  CAMERA_GRAPH_PADDING,
  CAMERA_GRAPH_VIEWBOX,
  mapCameraX,
  mapCameraY,
  pointsToPath,
  sampleCurve,
  type CurveId,
} from "@/lib/homepage/cameraDistanceCurves";

const CURVE_IDS: CurveId[] = ["A", "B", "C", "D"];

const AXIS_STROKE = "rgba(255,255,255,0.75)";
const GRID_STROKE = "rgba(148,163,184,0.07)";
const CURVE_STROKE = "rgba(226,232,240,0.9)";
const LABEL_FILL = "rgba(248,250,252,0.92)";

function buildGridLines() {
  const { width, height } = CAMERA_GRAPH_VIEWBOX;
  const { left, right, top, bottom } = CAMERA_GRAPH_PADDING;
  const plotRight = width - right;
  const plotBottom = height - bottom;

  const verticals: number[] = [];
  const horizontals: number[] = [];

  for (let i = 1; i <= 4; i++) {
    verticals.push(mapCameraX(i / 4));
  }
  for (let i = 1; i <= 3; i++) {
    horizontals.push(mapCameraY((CAMERA_CURVE_Y_MAX * i) / 4));
  }

  return { verticals, horizontals, left, top, plotRight, plotBottom };
}

export function CameraDistanceGraph({ className }: { className?: string }) {
  const { width, height } = CAMERA_GRAPH_VIEWBOX;
  const { verticals, horizontals, left, top, plotRight, plotBottom } =
    buildGridLines();

  const axisOriginX = mapCameraX(0);
  const axisOriginY = mapCameraY(0);
  const axisEndX = mapCameraX(1);
  const axisEndY = mapCameraY(CAMERA_CURVE_Y_MAX);

  const curves = CURVE_IDS.map((id) => ({
    id,
    path: pointsToPath(sampleCurve(CAMERA_CURVE_FUNCTIONS[id], 200)),
  }));

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      className={cn("block h-full w-full", className)}
      role="img"
      aria-label="Graph of four candidate curves labelled A, B, C and D showing image height against distance"
    >
      <g stroke={GRID_STROKE} strokeWidth={0.75}>
        {verticals.map((x) => (
          <line key={`gv-${x}`} x1={x} y1={top} x2={x} y2={plotBottom} />
        ))}
        {horizontals.map((y) => (
          <line key={`gh-${y}`} x1={left} y1={y} x2={plotRight} y2={y} />
        ))}
      </g>

      <line
        x1={left}
        y1={axisOriginY}
        x2={axisEndX}
        y2={axisOriginY}
        stroke={AXIS_STROKE}
        strokeWidth={1.25}
      />
      <line
        x1={axisOriginX}
        y1={plotBottom}
        x2={axisOriginX}
        y2={axisEndY}
        stroke={AXIS_STROKE}
        strokeWidth={1.25}
      />

      <polygon
        points={`${axisEndX},${axisOriginY} ${axisEndX - 7},${axisOriginY - 3.5} ${axisEndX - 7},${axisOriginY + 3.5}`}
        fill={AXIS_STROKE}
      />
      <polygon
        points={`${axisOriginX},${axisEndY} ${axisOriginX - 3.5},${axisEndY + 7} ${axisOriginX + 3.5},${axisEndY + 7}`}
        fill={AXIS_STROKE}
      />

      <text
        x={axisEndX + 4}
        y={axisOriginY + 5}
        fill="rgba(255,255,255,0.82)"
        fontSize={15}
        fontFamily="Georgia, 'Times New Roman', serif"
        fontStyle="italic"
      >
        d
      </text>
      <text
        x={axisOriginX - 6}
        y={axisEndY - 4}
        fill="rgba(255,255,255,0.82)"
        fontSize={15}
        fontFamily="Georgia, 'Times New Roman', serif"
        fontStyle="italic"
        textAnchor="end"
      >
        H
      </text>

      {curves.map((curve) => (
        <path
          key={curve.id}
          d={curve.path}
          fill="none"
          stroke={CURVE_STROKE}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}

      {CAMERA_CURVE_LABELS.map((label) => {
        const y = CAMERA_CURVE_FUNCTIONS[label.id](label.u);
        const x = mapCameraX(label.u) + (label.dx ?? 0);
        const labelY = mapCameraY(y) + (label.dy ?? 0);
        const text = label.id;

        return (
          <g key={label.id}>
            <rect
              x={x - 4}
              y={labelY - 18}
              width={22}
              height={24}
              rx={4}
              fill="rgba(15,23,40,0.72)"
            />
            <text
              x={x + 7}
              y={labelY}
              fill={LABEL_FILL}
              fontSize={21}
              fontFamily="Georgia, 'Times New Roman', serif"
              fontStyle="italic"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {text}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
