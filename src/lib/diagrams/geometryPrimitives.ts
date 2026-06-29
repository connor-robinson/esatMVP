/**
 * Shared helpers for geometry diagram label placement and SVG paths
 */

import type { DiagramLabel, GeometryDiagramData } from "@/types/core";

export const DIAGRAM_STROKE = "var(--color-text)";
export const DIAGRAM_FILL = "var(--color-text)";

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function polarPoint(cx: number, cy: number, r: number, deg: number): { x: number; y: number } {
  const rad = degToRad(deg);
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
}

export function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const start = polarPoint(cx, cy, r, startDeg);
  const end = polarPoint(cx, cy, r, endDeg);
  let sweep = endDeg - startDeg;
  if (sweep < 0) sweep += 360;
  const largeArc = sweep > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

export function sectorPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const start = polarPoint(cx, cy, r, startDeg);
  const end = polarPoint(cx, cy, r, endDeg);
  let sweep = endDeg - startDeg;
  if (sweep < 0) sweep += 360;
  const largeArc = sweep > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

/** Place label at midpoint of segment, offset outward from reference point */
export function labelOnSegment(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  text: string,
  awayFrom: { x: number; y: number },
  offset = 22,
): DiagramLabel {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const n1 = { x: -dy / len, y: dx / len };
  const n2 = { x: dy / len, y: -dx / len };
  const test1 = { x: midX + n1.x * 10, y: midY + n1.y * 10 };
  const test2 = { x: midX + n2.x * 10, y: midY + n2.y * 10 };
  const d1 = (test1.x - awayFrom.x) ** 2 + (test1.y - awayFrom.y) ** 2;
  const d2 = (test2.x - awayFrom.x) ** 2 + (test2.y - awayFrom.y) ** 2;
  const n = d1 > d2 ? n1 : n2;
  return { x: midX + n.x * offset, y: midY + n.y * offset, text };
}

export function emptyGeometryDiagram(
  viewBox: GeometryDiagramData["viewBox"],
): GeometryDiagramData {
  return { type: "geometry", viewBox, paths: [], lines: [], labels: [] };
}
