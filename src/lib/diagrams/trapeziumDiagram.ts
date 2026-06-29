/**
 * Trapezium diagram with parallel sides a, b and height h
 */

import type { GeometryDiagramData } from "@/types/core";
import { emptyGeometryDiagram, labelOnSegment } from "./geometryPrimitives";

export function buildTrapeziumDiagram(a: number, b: number, h: number): GeometryDiagramData {
  const scale = 14;
  const topW = a * scale;
  const botW = b * scale;
  const heightPx = h * scale;
  const cx = 200;

  const topY = 140;
  const botY = topY + heightPx;
  const topLeft = { x: cx - topW / 2, y: topY };
  const topRight = { x: cx + topW / 2, y: topY };
  const botLeft = { x: cx - botW / 2, y: botY };
  const botRight = { x: cx + botW / 2, y: botY };
  const centroid = {
    x: (topLeft.x + topRight.x + botLeft.x + botRight.x) / 4,
    y: (topY + botY) / 2,
  };

  const diagram = emptyGeometryDiagram({ x: 60, y: 100, width: 280, height: heightPx + 120 });
  diagram.paths = [
    {
      d: `M ${topLeft.x} ${topLeft.y} L ${topRight.x} ${topRight.y} L ${botRight.x} ${botRight.y} L ${botLeft.x} ${botLeft.y} Z`,
      fill: "var(--color-text)",
      fillOpacity: 0.08,
      stroke: true,
    },
  ];

  // Height dashed line inside
  const hx = cx + botW / 2 + 18;
  diagram.lines = [
    { x1: hx, y1: topY, x2: hx, y2: botY, dashed: true },
    { x1: hx - 6, y1: topY, x2: hx + 6, y2: topY, dashed: true },
    { x1: hx - 6, y1: botY, x2: hx + 6, y2: botY, dashed: true },
  ];

  diagram.labels = [
    labelOnSegment(topLeft.x, topLeft.y, topRight.x, topRight.y, `a = ${a}`, centroid, 28),
    labelOnSegment(botLeft.x, botLeft.y, botRight.x, botRight.y, `b = ${b}`, centroid, 28),
    { x: hx + 22, y: (topY + botY) / 2, text: `h = ${h}` },
  ];
  return diagram;
}
