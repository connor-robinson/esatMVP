/**
 * Circle diagram with radius label
 */

import type { GeometryDiagramData } from "@/types/core";
import { emptyGeometryDiagram } from "./geometryPrimitives";
import {
  DIAGRAM_CX,
  DIAGRAM_CY,
  FIXED_RADIUS_PX,
  boundingViewBox,
  standardRadiusDisplay,
} from "./diagramLayout";

export function buildCircleDiagram(r: number): GeometryDiagramData {
  const cx = DIAGRAM_CX;
  const cy = DIAGRAM_CY;
  const pxR = FIXED_RADIUS_PX;
  const d = `M ${cx - pxR} ${cy} A ${pxR} ${pxR} 0 1 1 ${cx + pxR} ${cy} A ${pxR} ${pxR} 0 1 1 ${cx - pxR} ${cy}`;

  const { line, label } = standardRadiusDisplay(cx, cy, pxR, r);

  const viewBox = boundingViewBox(
    [
      { x: cx - pxR, y: cy },
      { x: cx + pxR, y: cy },
      { x: cx, y: cy - pxR },
      { x: cx, y: cy + pxR },
      { x: label.x, y: label.y },
    ],
    32,
  );

  const diagram = emptyGeometryDiagram(viewBox);
  diagram.size = "large";
  diagram.paths = [{ d, fill: "var(--color-text)", fillOpacity: 0.06, stroke: true }];
  diagram.lines = [line];
  diagram.labels = [label];
  return diagram;
}
