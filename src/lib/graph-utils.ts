/** Map math x to SVG x within a plot width (0 = left edge of plot). */
export function toSvgX(
  x: number,
  width: number,
  minX: number,
  maxX: number,
): number {
  return ((x - minX) / (maxX - minX)) * width;
}

/** Map math y to SVG y within a plot height (0 = top edge of plot). */
export function toSvgY(
  y: number,
  height: number,
  minY: number,
  maxY: number,
): number {
  return height - ((y - minY) / (maxY - minY)) * height;
}

/** Alias for spec / shared reciprocal graph code. */
export const mathXToSvg = toSvgX;
export const mathYToSvg = toSvgY;

/** Build an SVG path `d` from math-coordinate points. */
export function buildPath(
  points: [number, number][],
  toX: (x: number) => number,
  toY: (y: number) => number,
): string {
  return pointsToPath(points, toX, toY);
}

export function pointsToPath(
  points: [number, number][],
  toX: (x: number) => number,
  toY: (y: number) => number,
): string {
  if (points.length === 0) return "";
  const [first, ...rest] = points;
  const start = `M ${toX(first[0]).toFixed(2)} ${toY(first[1]).toFixed(2)}`;
  const lines = rest
    .map(([x, y]) => `L ${toX(x).toFixed(2)} ${toY(y).toFixed(2)}`)
    .join(" ");
  return `${start} ${lines}`;
}

export type GraphDomain = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

/** Shared plotting window for the homepage reciprocal demo. */
export const RECIPROCAL_QUESTION_DOMAIN: GraphDomain = {
  minX: -3.2,
  maxX: 3.8,
  minY: -2.6,
  maxY: 2.6,
};

/** Gap around vertical asymptotes when sampling 1/f. */
export const RECIPROCAL_SAMPLE_EPS = 0.035;

/** x-intercepts / asymptotes for f(x) = -(x+1.6)(x-0.5)(x-2.2) (scaled). */
export const RECIPROCAL_ROOTS = [-1.6, 0.5, 2.2] as const;

/** Sample y = fn(x) on [minX, maxX], clipping extreme values. */
export function sampleFunction(
  fn: (x: number) => number,
  minX: number,
  maxX: number,
  steps = 200,
  clipY = 2.55,
): [number, number][] {
  const points: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const x = minX + (i / steps) * (maxX - minX);
    const y = fn(x);
    if (!Number.isFinite(y) || Math.abs(y) > clipY) continue;
    points.push([x, y]);
  }
  return points;
}

/**
 * Sample fn(x) in intervals separated by vertical asymptotes so paths do not
 * connect across discontinuities.
 */
export function sampleFunctionSegments(
  fn: (x: number) => number,
  minX: number,
  maxX: number,
  asymptotes: readonly number[],
  options?: {
    steps?: number;
    gap?: number;
    clipY?: number;
  },
): [number, number][][] {
  const steps = options?.steps ?? 160;
  const gap = options?.gap ?? RECIPROCAL_SAMPLE_EPS;
  const clipY = options?.clipY ?? 2.45;

  const sorted = [...asymptotes].sort((a, b) => a - b);
  const intervals: [number, number][] = [];
  let cursor = minX;

  for (const asymptote of sorted) {
    if (asymptote - gap > cursor) {
      intervals.push([cursor, asymptote - gap]);
    }
    cursor = asymptote + gap;
  }

  if (cursor < maxX) {
    intervals.push([cursor, maxX]);
  }

  return intervals
    .map(([start, end]) => {
      const span = end - start;
      if (span <= 0) return [] as [number, number][];
      const localSteps = Math.max(10, Math.round(steps * (span / (maxX - minX))));
      const points: [number, number][] = [];

      for (let i = 0; i <= localSteps; i++) {
        const x = start + (i / localSteps) * span;
        const y = fn(x);
        if (!Number.isFinite(y) || Math.abs(y) > clipY) continue;
        points.push([x, y]);
      }

      return points;
    })
    .filter((segment) => segment.length >= 2);
}
