/**
 * Sector diagram — symmetric wedge centered in the view, fixed size
 */

import type { GeometryDiagramData } from "@/types/core";
import {
  emptyGeometryDiagram,
  labelOnSegment,
  polarPoint,
  sectorPath,
} from "./geometryPrimitives";
import {
  DIAGRAM_CX,
  DIAGRAM_CY,
  FIXED_RADIUS_PX,
  standardViewBox,
} from "./diagramLayout";

export function buildSectorDiagram(r: number, angleDeg: number): GeometryDiagramData {
  const cx = DIAGRAM_CX;
  const cy = DIAGRAM_CY;
  const pxR = FIXED_RADIUS_PX;

  // Symmetric wedge with bisector pointing up
  const half = angleDeg / 2;
  const startDeg = 90 - half;
  const endDeg = 90 + half;

  const diagram = emptyGeometryDiagram(standardViewBox());
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

  const bisector = polarPoint(cx, cy, pxR * 0.42, 90);
  diagram.angleArcs = [
    {
      cx,
      cy,
      r: 30,
      startDeg,
      endDeg,
      labelX: bisector.x,
      labelY: bisector.y,
      label: `${angleDeg}°`,
    },
  ];

  diagram.labels = [
    labelOnSegment(cx, cy, rimEnd.x, rimEnd.y, `r = ${r}`, { x: cx, y: cy + pxR * 0.25 }, 28),
  ];
  return diagram;
}
