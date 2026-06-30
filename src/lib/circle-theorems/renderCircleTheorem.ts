/**
 * Render circle theorem diagram spec → GeometryDiagramData
 */

import type { GeometryDiagramData } from "@/types/core";
import type { CircleTheoremDiagram } from "./types";
import { buildAngleArcDisplay, CT_CX, CT_CY, CT_R } from "./angleUtils";
import { standardViewBox } from "@/lib/diagrams/diagramLayout";

function rightAngleSquarePath(
  vertex: { x: number; y: number },
  leg1: { x: number; y: number },
  leg2: { x: number; y: number },
  size = 13,
): string {
  const d1x = leg1.x - vertex.x;
  const d1y = leg1.y - vertex.y;
  const d2x = leg2.x - vertex.x;
  const d2y = leg2.y - vertex.y;
  const l1 = Math.sqrt(d1x * d1x + d1y * d1y) || 1;
  const l2 = Math.sqrt(d2x * d2x + d2y * d2y) || 1;
  const u1 = { x: (d1x / l1) * size, y: (d1y / l1) * size };
  const u2 = { x: (d2x / l2) * size, y: (d2y / l2) * size };
  const p1 = { x: vertex.x + u1.x, y: vertex.y + u1.y };
  const p2 = { x: p1.x + u2.x, y: p1.y + u2.y };
  const p3 = { x: vertex.x + u2.x, y: vertex.y + u2.y };
  return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y}`;
}

export function renderCircleTheorem(diagram: CircleTheoremDiagram): GeometryDiagramData {
  const data: GeometryDiagramData = {
    type: "geometry",
    viewBox: standardViewBox(),
    lines: diagram.lines.map((l) => ({
      x1: l.x1,
      y1: l.y1,
      x2: l.x2,
      y2: l.y2,
      dashed: l.dashed,
    })),
    angleArcs: [],
    labels: [],
    caption: diagram.caption ?? "Diagram not to scale",
    size: "large",
    points: [],
  };

  if (diagram.showCircle !== false) {
    data.circles = [{ cx: CT_CX, cy: CT_CY, r: CT_R }];
  }

  for (const a of diagram.angles) {
    const arcR = a.isTarget ? 30 : 24;
    const labelOffset = arcR + 18;
    const arc = buildAngleArcDisplay(a.vertex, a.leg1, a.leg2, arcR, labelOffset);
    data.angleArcs!.push({
      cx: a.vertex.x,
      cy: a.vertex.y,
      r: arcR,
      startDeg: 0,
      endDeg: 0,
      pathD: arc.pathD,
      labelX: arc.labelX,
      labelY: arc.labelY,
      label: a.label,
    });
  }

  for (const ra of diagram.rightAngles) {
    data.paths = data.paths ?? [];
    data.paths.push({
      d: rightAngleSquarePath(ra.vertex, ra.leg1, ra.leg2),
      stroke: true,
      fill: "none",
    });
  }

  for (const p of diagram.points) {
    if (p.emphasis) {
      data.points!.push({ x: p.x, y: p.y, label: p.label, emphasis: true });
    } else if (p.label) {
      const dx = p.x - CT_CX;
      const dy = p.y - CT_CY;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const offset = p.id === "T" ? 20 : p.id === "E" ? 16 : 18;
      const nx = len > CT_R - 4 ? dx / len : dx / (Math.abs(dx) || 1);
      const ny = len > CT_R - 4 ? dy / len : dy / (Math.abs(dy) || 1);
      data.labels.push({
        x: p.x + nx * offset,
        y: p.y + ny * offset,
        text: p.label,
        fontSize: 15,
      });
    }
  }

  return data;
}
