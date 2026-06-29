/**
 * Circle diagram with radius label
 */

import type { GeometryDiagramData } from "@/types/core";
import { emptyGeometryDiagram, polarPoint } from "./geometryPrimitives";

export function buildCircleDiagram(r: number): GeometryDiagramData {
  const cx = 200;
  const cy = 200;
  const pxR = 70 + r * 4;
  const d = `M ${cx - pxR} ${cy} A ${pxR} ${pxR} 0 1 1 ${cx + pxR} ${cy} A ${pxR} ${pxR} 0 1 1 ${cx - pxR} ${cy}`;
  const rim = polarPoint(cx, cy, pxR, 45);

  const diagram = emptyGeometryDiagram({ x: 80, y: 80, width: 240, height: 240 });
  diagram.paths = [{ d, fill: "var(--color-text)", fillOpacity: 0.06, stroke: true }];
  diagram.lines = [{ x1: cx, y1: cy, x2: rim.x, y2: rim.y }];
  diagram.labels = [
    { x: (cx + rim.x) / 2 + 12, y: (cy + rim.y) / 2 - 8, text: `r = ${r}` },
  ];
  return diagram;
}
