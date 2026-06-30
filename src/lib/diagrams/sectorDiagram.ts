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
  SECTOR_RADIUS_PX,
  boundingViewBox,
} from "./diagramLayout";

export function buildSectorDiagram(r: number, angleDeg: number): GeometryDiagramData {
  const cx = DIAGRAM_CX;
  const cy = DIAGRAM_CY;
  const pxR = SECTOR_RADIUS_PX;

  // Symmetric wedge with bisector pointing up
  const half = angleDeg / 2;
  const startDeg = 90 - half;
  const endDeg = 90 + half;

  const rimStart = polarPoint(cx, cy, pxR, startDeg);
  const rimEnd = polarPoint(cx, cy, pxR, endDeg);
  const bisector = polarPoint(cx, cy, pxR * 0.42, 90);
  const arcR = pxR * 0.2;
  const radiusLabel = labelOnSegment(
    cx,
    cy,
    rimEnd.x,
    rimEnd.y,
    `r = ${r}`,
    { x: cx, y: cy + pxR * 0.25 },
    28,
  );

  const viewBox = boundingViewBox(
    [
      { x: cx, y: cy },
      rimStart,
      rimEnd,
      bisector,
      { x: radiusLabel.x, y: radiusLabel.y },
      polarPoint(cx, cy, arcR, startDeg),
      polarPoint(cx, cy, arcR, endDeg),
    ],
    40,
  );

  const diagram = emptyGeometryDiagram(viewBox);
  diagram.paths = [
    {
      d: sectorPath(cx, cy, pxR, startDeg, endDeg),
      fill: "var(--color-text)",
      fillOpacity: 0.1,
      stroke: true,
    },
  ];

  diagram.lines = [
    { x1: cx, y1: cy, x2: rimStart.x, y2: rimStart.y },
    { x1: cx, y1: cy, x2: rimEnd.x, y2: rimEnd.y },
  ];

  diagram.angleArcs = [
    {
      cx,
      cy,
      r: arcR,
      startDeg,
      endDeg,
      labelX: bisector.x,
      labelY: bisector.y,
      label: `${angleDeg}°`,
    },
  ];

  diagram.labels = [radiusLabel];
  return diagram;
}
