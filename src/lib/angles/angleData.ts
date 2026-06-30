/**
 * Standard unit-circle angle positions (degrees and exact radian forms).
 */

import { polarPoint } from "@/lib/diagrams/geometryPrimitives";
import { formatRadianLabel } from "./simplifyRadian";
import { coordLabelToLatex } from "./coordLatex";
import { gcd } from "@/lib/generators/utils/math";

export const UNIT_CIRCLE_CX = 150;
export const UNIT_CIRCLE_CY = 150;
export const UNIT_CIRCLE_R = 100;
export const UNIT_CIRCLE_LABEL_OFFSET = 28;

export const UNIT_CIRCLE_VIEWBOX = {
  x: 0,
  y: 0,
  width: 300,
  height: 300,
};

export type Quadrant = 1 | 2 | 3 | 4;

export interface StandardAngle {
  degrees: number;
  radianNumerator: number;
  radianDenominator: number;
  quadrant: Quadrant;
  radianCoeff: number;
  degreeLabel: string;
  radianLabel: string;
  /** cos(θ) = x on the unit circle */
  cosLabel: string;
  /** sin(θ) = y on the unit circle */
  sinLabel: string;
  cosLatex: string;
  sinLatex: string;
  x: number;
  y: number;
  point: { x: number; y: number };
  labelPosition: { x: number; y: number };
}

/** Exact (cos θ, sin θ) = (x, y) for standard angles. */
const COORD_TABLE: Record<number, { cos: string; sin: string; x: number; y: number }> = {
  0: { cos: "1", sin: "0", x: 1, y: 0 },
  30: { cos: "sqrt(3)/2", sin: "1/2", x: Math.sqrt(3) / 2, y: 0.5 },
  45: { cos: "sqrt(2)/2", sin: "sqrt(2)/2", x: Math.SQRT2 / 2, y: Math.SQRT2 / 2 },
  60: { cos: "1/2", sin: "sqrt(3)/2", x: 0.5, y: Math.sqrt(3) / 2 },
  90: { cos: "0", sin: "1", x: 0, y: 1 },
  120: { cos: "-1/2", sin: "sqrt(3)/2", x: -0.5, y: Math.sqrt(3) / 2 },
  135: { cos: "-sqrt(2)/2", sin: "sqrt(2)/2", x: -Math.SQRT2 / 2, y: Math.SQRT2 / 2 },
  150: { cos: "-sqrt(3)/2", sin: "1/2", x: -Math.sqrt(3) / 2, y: 0.5 },
  180: { cos: "-1", sin: "0", x: -1, y: 0 },
  210: { cos: "-sqrt(3)/2", sin: "-1/2", x: -Math.sqrt(3) / 2, y: -0.5 },
  225: { cos: "-sqrt(2)/2", sin: "-sqrt(2)/2", x: -Math.SQRT2 / 2, y: -Math.SQRT2 / 2 },
  240: { cos: "-1/2", sin: "-sqrt(3)/2", x: -0.5, y: -Math.sqrt(3) / 2 },
  270: { cos: "0", sin: "-1", x: 0, y: -1 },
  300: { cos: "1/2", sin: "-sqrt(3)/2", x: 0.5, y: -Math.sqrt(3) / 2 },
  315: { cos: "sqrt(2)/2", sin: "-sqrt(2)/2", x: Math.SQRT2 / 2, y: -Math.SQRT2 / 2 },
  330: { cos: "sqrt(3)/2", sin: "-1/2", x: Math.sqrt(3) / 2, y: -0.5 },
};

/** Raw degree → simplified π fraction (numerator, denominator). */
const ANGLE_RADIAN_FRACTIONS: Record<number, [number, number]> = {
  0: [0, 1],
  30: [1, 6],
  45: [1, 4],
  60: [1, 3],
  90: [1, 2],
  120: [2, 3],
  135: [3, 4],
  150: [5, 6],
  180: [1, 1],
  210: [7, 6],
  225: [5, 4],
  240: [4, 3],
  270: [3, 2],
  300: [5, 3],
  315: [7, 4],
  330: [11, 6],
};

const STANDARD_DEGREES = [
  0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330,
] as const;

function getQuadrant(degrees: number): Quadrant {
  if (degrees === 0 || degrees === 90) return 1;
  if (degrees === 180) return 2;
  if (degrees === 270) return 3;
  if (degrees > 0 && degrees < 90) return 1;
  if (degrees > 90 && degrees < 180) return 2;
  if (degrees > 180 && degrees < 270) return 3;
  return 4;
}

function buildAngle(degrees: number): StandardAngle {
  const [num, den] = ANGLE_RADIAN_FRACTIONS[degrees] ?? [0, 1];
  const [rNum, rDen] =
    den === 0 ? [0, 1] : [num / gcd(num, den), den / gcd(num, den)];
  const radianCoeff = rDen === 0 ? 0 : rNum / rDen;

  const cx = UNIT_CIRCLE_CX;
  const cy = UNIT_CIRCLE_CY;
  const r = UNIT_CIRCLE_R;
  const labelR = r + UNIT_CIRCLE_LABEL_OFFSET;
  const coords = COORD_TABLE[degrees] ?? { cos: "0", sin: "0", x: 0, y: 0 };

  return {
    degrees,
    radianNumerator: rNum,
    radianDenominator: rDen,
    quadrant: getQuadrant(degrees),
    radianCoeff,
    degreeLabel: `${degrees}°`,
    radianLabel: radianCoeff === 0 ? "0" : formatRadianLabel(rNum, rDen),
    cosLabel: coords.cos,
    sinLabel: coords.sin,
    cosLatex: coordLabelToLatex(coords.cos),
    sinLatex: coordLabelToLatex(coords.sin),
    x: coords.x,
    y: coords.y,
    point: polarPoint(cx, cy, r, degrees),
    labelPosition: polarPoint(cx, cy, labelR, degrees),
  };
}

export const STANDARD_ANGLES: StandardAngle[] = STANDARD_DEGREES.map(buildAngle);

/** Eight evenly spaced labels for missing-label questions (every 45°). */
export const MISSING_LABEL_ANGLES: StandardAngle[] = [0, 45, 90, 135, 180, 225, 270, 315].map(
  (d) => getAngleByDegrees(d)!,
);

export function getAngleByDegrees(degrees: number): StandardAngle | undefined {
  const normalized = normalizeDegrees(degrees);
  return STANDARD_ANGLES.find((a) => a.degrees === normalized);
}

export function normalizeDegrees(degrees: number): number {
  let d = degrees % 360;
  if (d < 0) d += 360;
  if (Math.abs(d - 360) < 1e-9) d = 0;
  return d;
}

export function circularDistanceDeg(a: number, b: number): number {
  const diff = Math.abs(normalizeDegrees(a) - normalizeDegrees(b));
  return Math.min(diff, 360 - diff);
}

export interface NearestAngleResult {
  angle: StandardAngle;
  distance: number;
}

export function nearestStandardAngle(
  clickDeg: number,
  _toleranceDeg?: number,
): NearestAngleResult {
  const normalized = normalizeDegrees(clickDeg);
  let nearest = STANDARD_ANGLES[0];
  let minDist = circularDistanceDeg(normalized, nearest.degrees);

  for (const angle of STANDARD_ANGLES) {
    const dist = circularDistanceDeg(normalized, angle.degrees);
    if (dist < minDist) {
      minDist = dist;
      nearest = angle;
    }
  }

  return { angle: nearest, distance: minDist };
}

/** Convert SVG click coordinates to degrees (0–360, math convention). */
export function svgClickToDegrees(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
  cx = UNIT_CIRCLE_CX,
  cy = UNIT_CIRCLE_CY,
): number {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return 0;

  const svgPt = pt.matrixTransform(ctm.inverse());
  const dx = svgPt.x - cx;
  const dy = cy - svgPt.y;
  let deg = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
}
