/**
 * Angle and coordinate helpers for circle theorem diagrams.
 */

import type { Point } from "./types";
import { polarPoint } from "@/lib/diagrams/geometryPrimitives";
import { DIAGRAM_CX, DIAGRAM_CY } from "@/lib/diagrams/diagramLayout";

export const CT_CX = DIAGRAM_CX;
export const CT_CY = DIAGRAM_CY;
/** Larger than area/volume diagrams - circle theorems need readable angle arcs */
export const CT_R = 128;

export function pointOnCircle(deg: number, r = CT_R): Point {
  return polarPoint(CT_CX, CT_CY, r, deg);
}

export function centrePoint(): Point {
  return { x: CT_CX, y: CT_CY };
}

/** Screen-space direction from vertex to point, compass degrees. */
export function directionDeg(from: Point, to: Point): number {
  const dx = to.x - from.x;
  const dy = from.y - to.y;
  const rad = Math.atan2(-dy, dx);
  let deg = (rad * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
}

/** Interior angle at vertex between two other points (smaller arc, degrees). */
export function interiorAngleDeg(vertex: Point, p1: Point, p2: Point): number {
  const d1 = directionDeg(vertex, p1);
  const d2 = directionDeg(vertex, p2);
  let diff = Math.abs(d2 - d1);
  if (diff > 180) diff = 360 - diff;
  return Math.round(diff);
}

export function angleArcLegs(vertex: Point, p1: Point, p2: Point): { leg1Deg: number; leg2Deg: number } {
  const d1 = directionDeg(vertex, p1);
  const d2 = directionDeg(vertex, p2);
  let start = d1;
  let end = d2;
  let sweep = end - start;
  if (sweep < 0) sweep += 360;
  if (sweep > 180) {
    [start, end] = [end, start];
    sweep = 360 - sweep;
  }
  return { leg1Deg: start, leg2Deg: end };
}

/** Cartesian angle arc + interior label position (screen coordinates). */
export function buildAngleArcDisplay(
  vertex: Point,
  leg1: Point,
  leg2: Point,
  arcRadius: number,
  labelOffset: number,
): { pathD: string; labelX: number; labelY: number } {
  const v1x = leg1.x - vertex.x;
  const v1y = leg1.y - vertex.y;
  const v2x = leg2.x - vertex.x;
  const v2y = leg2.y - vertex.y;
  const len1 = Math.hypot(v1x, v1y) || 1;
  const len2 = Math.hypot(v2x, v2y) || 1;
  const n1 = { x: v1x / len1, y: v1y / len1 };
  const n2 = { x: v2x / len2, y: v2y / len2 };

  const arcStartX = vertex.x + n1.x * arcRadius;
  const arcStartY = vertex.y + n1.y * arcRadius;
  const arcEndX = vertex.x + n2.x * arcRadius;
  const arcEndY = vertex.y + n2.y * arcRadius;

  const cross = n1.x * n2.y - n1.y * n2.x;
  const sweepFlag = cross > 0 ? 1 : 0;

  const bx = n1.x + n2.x;
  const by = n1.y + n2.y;
  const bl = Math.hypot(bx, by) || 1;

  return {
    pathD: `M ${arcStartX} ${arcStartY} A ${arcRadius} ${arcRadius} 0 0 ${sweepFlag} ${arcEndX} ${arcEndY}`,
    labelX: vertex.x + (bx / bl) * labelOffset,
    labelY: vertex.y + (by / bl) * labelOffset,
  };
}

export function tangentSegment(at: Point, centre: Point, halfLength: number): LineSegment {
  const dx = at.x - centre.x;
  const dy = at.y - centre.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const tx = -dy / len;
  const ty = dx / len;
  return {
    x1: at.x - tx * halfLength,
    y1: at.y - ty * halfLength,
    x2: at.x + tx * halfLength,
    y2: at.y + ty * halfLength,
  };
}

export interface LineSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export function pickFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function pickInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Point on the ray from `from` through `through`, extended by `extraRatio` × |from→through| past `through`. */
export function extendRay(from: Point, through: Point, extraRatio: number): Point {
  const dx = through.x - from.x;
  const dy = through.y - from.y;
  return {
    x: through.x + dx * extraRatio,
    y: through.y + dy * extraRatio,
  };
}

/** Exterior angle at `vertex` between side toward `alongSide` and side toward `otherSide`. */
export function exteriorAngleDeg(vertex: Point, alongSide: Point, otherSide: Point): number {
  return 180 - interiorAngleDeg(vertex, alongSide, otherSide);
}

/** Tangent ray + angles for alternate segment theorem (chord TP, angle TAP). */
export function alternateSegmentAngles(
  tangency: Point,
  centre: Point,
  chordEnd: Point,
  alternateVertex: Point,
  halfLength: number,
): {
  tan: LineSegment;
  tanFar: Point;
  tangentAngle: number;
  alternateAngle: number;
} {
  const tan = tangentSegment(tangency, centre, halfLength);
  const cand1 = { x: tan.x1, y: tan.y1 };
  const cand2 = { x: tan.x2, y: tan.y2 };
  const alternateAngle = interiorAngleDeg(alternateVertex, tangency, chordEnd);
  const ang1 = interiorAngleDeg(tangency, cand1, chordEnd);
  const ang2 = interiorAngleDeg(tangency, cand2, chordEnd);
  const tanFar = Math.abs(ang1 - alternateAngle) <= Math.abs(ang2 - alternateAngle) ? cand1 : cand2;
  const tangentAngle = interiorAngleDeg(tangency, tanFar, chordEnd);
  return { tan, tanFar, tangentAngle, alternateAngle };
}
