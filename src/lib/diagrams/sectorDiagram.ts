/**
 * Sector diagram with radius and angle labels
 */

import type { GeometryDiagramData } from "@/types/core";
import {
  emptyGeometryDiagram,
  labelOnSegment,
  polarPoint,
  sectorPath,
} from "./geometryPrimitives";

export function buildSectorDiagram(r: number, angleDeg: number): GeometryDiagramData {
  const cx = 200;
  const cy = 220;
  const pxR = 65 + r * 3;
  const startDeg = 0;
  const endDeg = angleDeg;

  const diagram = emptyGeometryDiagram({ x: 70, y: 70, width: 260, height: 260 });
  diagram.paths = [
    {
      d: sectorPath(cx, cy, pxR, startDeg, endDeg),
      fill: "var(--color-text)",
      fillOpacity: 0.1,
      stroke: true,
    },
  ];

  const rimStart = polarPoint(cx, cy, pxR, startDeg);
  const rimEnd = polarPoint(cx, cy, pxR, endDeg);
  diagram.lines = [
    { x1: cx, y1: cy, x2: rimStart.x, y2: rimStart.y },
    { x1: cx, y1: cy, x2: rimEnd.x, y2: rimEnd.y },
  ];

  const midAngle = angleDeg / 2;
  const bisector = polarPoint(cx, cy, pxR * 0.55, midAngle);
  diagram.angleArcs = [
    {
      cx,
      cy,
      r: 28,
      startDeg,
      endDeg,
      labelX: bisector.x,
      labelY: bisector.y,
      label: `${angleDeg}°`,
    },
  ];

  const radiusLabel = labelOnSegment(cx, cy, rimStart.x, rimStart.y, `r = ${r}`, { x: cx, y: cy - pxR * 0.4 }, 32);
  diagram.labels = [radiusLabel];
  return diagram;
}
