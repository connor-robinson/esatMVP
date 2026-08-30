export type CurveId = "A" | "B" | "C" | "D";

export type Point = { x: number; y: number };

export const CAMERA_GRAPH_VIEWBOX = { width: 620, height: 360 } as const;

export const CAMERA_GRAPH_PADDING = {
  left: 50,
  right: 26,
  top: 22,
  bottom: 46,
} as const;

/** Normalized image height at distance parameter u in [0, 1]. */
export const CAMERA_CURVE_FUNCTIONS: Record<CurveId, (u: number) => number> = {
  /** Correct: H proportional to 1/d. */
  A: (u) => 1 / (1 + 4 * u),
  /** Linear distractor. */
  B: (u) => 1 - 0.8 * u,
  /** Too-rapid exponential decay. */
  C: (u) => Math.exp(-4 * u),
  /** Increasing concave-up distractor. */
  D: (u) => 0.08 + 0.85 * u * u,
};

export const CAMERA_CURVE_Y_MAX = 1.05;

export function sampleCurve(
  fn: (u: number) => number,
  samples = 200,
): Point[] {
  const points: Point[] = [];
  for (let i = 0; i <= samples; i++) {
    const u = i / samples;
    points.push({ x: u, y: fn(u) });
  }
  return points;
}

export function mapCameraX(u: number): number {
  const plotWidth =
    CAMERA_GRAPH_VIEWBOX.width -
    CAMERA_GRAPH_PADDING.left -
    CAMERA_GRAPH_PADDING.right;
  return CAMERA_GRAPH_PADDING.left + u * plotWidth;
}

export function mapCameraY(y: number): number {
  const plotHeight =
    CAMERA_GRAPH_VIEWBOX.height -
    CAMERA_GRAPH_PADDING.top -
    CAMERA_GRAPH_PADDING.bottom;
  const normalized = Math.min(Math.max(y / CAMERA_CURVE_Y_MAX, 0), 1.02);
  return (
    CAMERA_GRAPH_PADDING.top + plotHeight - normalized * plotHeight
  );
}

export function pointsToPath(points: Point[]): string {
  if (points.length === 0) return "";
  return points
    .map((point, index) => {
      const cmd = index === 0 ? "M" : "L";
      return `${cmd} ${mapCameraX(point.x).toFixed(2)} ${mapCameraY(point.y).toFixed(2)}`;
    })
    .join(" ");
}

export type CurveLabel = {
  id: CurveId;
  u: number;
  dx?: number;
  dy?: number;
};

/** Label anchors on the right-hand portion of each curve, away from crossings. */
export const CAMERA_CURVE_LABELS: CurveLabel[] = [
  { id: "A", u: 0.78, dx: 8, dy: -10 },
  { id: "B", u: 0.58, dx: 8, dy: -8 },
  { id: "C", u: 0.62, dx: 8, dy: 12 },
  { id: "D", u: 0.84, dx: 8, dy: -8 },
];

export const CORRECT_CAMERA_CURVE: CurveId = "A";

export const CAMERA_DISTANCE_EXPLANATION =
  "Image height is inversely proportional to distance, so it decreases rapidly at first and then more slowly.";
