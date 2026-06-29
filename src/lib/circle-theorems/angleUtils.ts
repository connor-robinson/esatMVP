/**
 * Angle and coordinate helpers for circle theorem diagrams.
 */

import type { Point } from "./types";
import { polarPoint } from "@/lib/diagrams/geometryPrimitives";
import { DIAGRAM_CX, DIAGRAM_CY, FIXED_RADIUS_PX } from "@/lib/diagrams/diagramLayout";

export const CT_CX = DIAGRAM_CX;
export const CT_CY = DIAGRAM_CY;
export const CT_R = FIXED_RADIUS_PX;

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
