/**
 * Shared layout constants — diagrams render at fixed visual size, centered.
 * Numeric labels still show actual dimensions; scale is not to scale.
 */

import type { DiagramLabel, GeometryDiagramData } from "@/types/core";
import { isoProject } from "./isometric";
import { labelOnSegment, polarPoint } from "./geometryPrimitives";

export const DIAGRAM_VIEWBOX = { x: 0, y: 0, width: 400, height: 400 };
export const DIAGRAM_CX = 200;
export const DIAGRAM_CY = 200;

/** Fixed pixel radius for circles, sectors, spheres (independent of r value). */
export const FIXED_RADIUS_PX = 102;

/** Fixed isometric extent (max edge length in px). */
export const ISO_MAX_PX = 100;

/** Fixed cylinder / cone footprint and height in px. */
export const FIXED_CYLINDER_R_PX = 72;
export const FIXED_CYLINDER_H_PX = 96;

/** Angle for the standard radius line (degrees, 0 = east). */
export const RADIUS_LINE_DEG = 38;
export const RADIUS_LABEL_OFFSET = 26;

export function standardViewBox(): GeometryDiagramData["viewBox"] {
  return { ...DIAGRAM_VIEWBOX };
}

export function unitScale(...dims: number[]): number {
  const m = Math.max(...dims, 1);
  return ISO_MAX_PX / m;
}

type Point3 = { x: number; y: number; z: number };

/** Offset isometric origin so projected vertices are centered in the viewBox. */
export function centeredIsoOrigin(
  vertices: Point3[],
  viewCx = DIAGRAM_CX,
  viewCy = DIAGRAM_CY,
): { x: number; y: number } {
  const atZero = vertices.map((v) => isoProject(v.x, v.y, v.z, { x: 0, y: 0 }));
  const minX = Math.min(...atZero.map((p) => p.x));
  const maxX = Math.max(...atZero.map((p) => p.x));
  const minY = Math.min(...atZero.map((p) => p.y));
  const maxY = Math.max(...atZero.map((p) => p.y));
  return {
    x: viewCx - (minX + maxX) / 2,
    y: viewCy - (minY + maxY) / 2,
  };
}

/** Consistent radius line + offset label (circle, sphere). */
export function standardRadiusDisplay(
  cx: number,
  cy: number,
  pxR: number,
  rValue: number,
  awayFrom?: { x: number; y: number },
): { line: { x1: number; y1: number; x2: number; y2: number }; label: DiagramLabel } {
  const rim = polarPoint(cx, cy, pxR, RADIUS_LINE_DEG);
  const away = awayFrom ?? { x: cx, y: cy - pxR * 0.55 };
  return {
    line: { x1: cx, y1: cy, x2: rim.x, y2: rim.y },
    label: labelOnSegment(cx, cy, rim.x, rim.y, `r = ${rValue}`, away, RADIUS_LABEL_OFFSET),
  };
}

/** Horizontal radius line (cylinder top, cone base). */
export function horizontalRadiusDisplay(
  x1: number,
  y: number,
  x2: number,
  rValue: number,
  awayY: number,
): { line: { x1: number; y1: number; x2: number; y2: number }; label: DiagramLabel } {
  return {
    line: { x1, y1: y, x2, y2: y },
    label: labelOnSegment(x1, y, x2, y, `r = ${rValue}`, { x: (x1 + x2) / 2, y: awayY }, RADIUS_LABEL_OFFSET),
  };
}
