/**
 * Isometric 3D solid diagram builders — fixed visual size, centered
 */

import type { GeometryDiagramData } from "@/types/core";
import { emptyGeometryDiagram, labelOnSegment } from "./geometryPrimitives";
import {
  DIAGRAM_CX,
  DIAGRAM_CY,
  FIXED_CYLINDER_H_PX,
  FIXED_CYLINDER_R_PX,
  FIXED_RADIUS_PX,
  centeredIsoOrigin,
  horizontalRadiusDisplay,
  standardRadiusDisplay,
  standardViewBox,
  unitScale,
} from "./diagramLayout";
import { ellipsePath, isoLine, isoPath, isoProject } from "./isometric";

function baseDiagram(): GeometryDiagramData {
  const diagram = emptyGeometryDiagram(standardViewBox());
  diagram.size = "large";
  return diagram;
}

export function buildCuboidDiagram(l: number, w: number, h: number): GeometryDiagramData {
  const k = unitScale(l, w, h);
  const L = l * k;
  const W = w * k;
  const H = h * k;

  const v: { x: number; y: number; z: number }[] = [
    { x: 0, y: 0, z: 0 },
    { x: L, y: 0, z: 0 },
    { x: L, y: W, z: 0 },
    { x: 0, y: W, z: 0 },
    { x: 0, y: 0, z: H },
    { x: L, y: 0, z: H },
    { x: L, y: W, z: H },
    { x: 0, y: W, z: H },
  ];
  const o = centeredIsoOrigin(v);

  const diagram = baseDiagram();
  // Painter's order: back → sides → top (top drawn last)
  diagram.paths = [
    { d: isoPath([v[3], v[2], v[6], v[7]], o), fill: "var(--color-text)", fillOpacity: 0.03, stroke: true },
    { d: isoPath([v[0], v[3], v[7], v[4]], o), fill: "var(--color-text)", fillOpacity: 0.05, stroke: true },
    { d: isoPath([v[0], v[1], v[5], v[4]], o), fill: "var(--color-text)", fillOpacity: 0.06, stroke: true },
    { d: isoPath([v[1], v[2], v[6], v[5]], o), fill: "var(--color-text)", fillOpacity: 0.07, stroke: true },
    { d: isoPath([v[4], v[5], v[6], v[7]], o), fill: "var(--color-text)", fillOpacity: 0.09, stroke: true },
  ];

  // Dashed hidden edges (back bottom + back verticals)
  const backBottom = isoLine(v[2], v[3], o);
  const backRight = isoLine(v[2], v[6], o);
  diagram.lines = [
    { ...backBottom, dashed: true },
    { ...backRight, dashed: true },
  ];

  const p0 = isoProject(0, 0, 0, o);
  const p1 = isoProject(L, 0, 0, o);
  const p4 = isoProject(0, 0, H, o);
  const p7 = isoProject(0, W, H, o);
  const centroid = isoProject(L / 2, W / 2, H / 2, o);

  diagram.labels = [
    labelOnSegment(p0.x, p0.y, p1.x, p1.y, `l = ${l}`, centroid, 24),
    labelOnSegment(p0.x, p0.y, p4.x, p4.y, `h = ${h}`, centroid, 24),
    labelOnSegment(p4.x, p4.y, p7.x, p7.y, `w = ${w}`, centroid, 24),
  ];
  return diagram;
}

export function buildCylinderDiagram(r: number, h: number): GeometryDiagramData {
  const cx = DIAGRAM_CX;
  const R = FIXED_CYLINDER_R_PX;
  const H = FIXED_CYLINDER_H_PX;
  const topY = DIAGRAM_CY - H / 2;
  const botY = topY + H;
  const ry = R * 0.35;

  const diagram = baseDiagram();
  diagram.paths = [
    { d: ellipsePath(cx, topY, R, ry), fill: "var(--color-text)", fillOpacity: 0.06, stroke: true },
    { d: ellipsePath(cx, botY, R, ry), fill: "none", stroke: true, strokeDasharray: "4 3" },
  ];

  const { line: radiusLine, label: radiusLabel } = horizontalRadiusDisplay(
    cx,
    topY,
    cx + R,
    r,
    topY + H * 0.35,
  );

  diagram.lines = [
    radiusLine,
    { x1: cx - R, y1: topY, x2: cx - R, y2: botY },
    { x1: cx + R, y1: topY, x2: cx + R, y2: botY },
  ];
  diagram.labels = [
    radiusLabel,
    { x: cx + R + 34, y: (topY + botY) / 2, text: `h = ${h}` },
  ];
  return diagram;
}

export function buildConeDiagram(r: number, h: number, showSlant = false): GeometryDiagramData {
  const cx = DIAGRAM_CX;
  const R = FIXED_CYLINDER_R_PX;
  const H = FIXED_CYLINDER_H_PX;
  const baseY = DIAGRAM_CY + H / 2 - 12;
  const apexY = baseY - H;
  const ry = R * 0.35;
  const l = Math.sqrt(r * r + h * h);

  const diagram = baseDiagram();
  diagram.paths = [
    { d: ellipsePath(cx, baseY, R, ry), fill: "var(--color-text)", fillOpacity: 0.06, stroke: true },
  ];
  diagram.lines = [
    { x1: cx, y1: apexY, x2: cx - R, y2: baseY },
    { x1: cx, y1: apexY, x2: cx + R, y2: baseY },
    { x1: cx - R, y1: baseY, x2: cx + R, y2: baseY, dashed: true },
  ];

  const { line: radiusLine, label: radiusLabel } = horizontalRadiusDisplay(
    cx,
    baseY,
    cx + R,
    r,
    baseY + 28,
  );
  diagram.lines.push(radiusLine);
  diagram.labels = [
    radiusLabel,
    { x: cx + R + 34, y: (apexY + baseY) / 2, text: `h = ${h}` },
  ];
  if (showSlant) {
    diagram.labels.push({
      x: cx + R * 0.38,
      y: (apexY + baseY) / 2 - 8,
      text: `l = ${Number.isInteger(l) ? l : l.toFixed(1)}`,
    });
  }
  return diagram;
}

export function buildSquarePyramidDiagram(base: number, h: number): GeometryDiagramData {
  const k = unitScale(base, base, h);
  const B = base * k;
  const H = h * k;

  const basePts = [
    { x: 0, y: 0, z: 0 },
    { x: B, y: 0, z: 0 },
    { x: B, y: B, z: 0 },
    { x: 0, y: B, z: 0 },
  ];
  const apex = { x: B / 2, y: B / 2, z: H };
  const o = centeredIsoOrigin([...basePts, apex]);

  const diagram = baseDiagram();
  diagram.paths = [{ d: isoPath(basePts, o), fill: "var(--color-text)", fillOpacity: 0.08, stroke: true }];
  const ap = isoProject(apex.x, apex.y, apex.z, o);
  const corners = basePts.map((p) => isoProject(p.x, p.y, p.z, o));
  diagram.lines = corners.map((c) => ({ x1: ap.x, y1: ap.y, x2: c.x, y2: c.y }));

  const front = isoLine({ x: 0, y: 0, z: 0 }, { x: B, y: 0, z: 0 }, o);
  diagram.labels = [
    labelOnSegment(front.x1, front.y1, front.x2, front.y2, `a = ${base}`, ap, 26),
    { x: ap.x + 32, y: ap.y - 8, text: `h = ${h}` },
  ];
  return diagram;
}

export function buildTriangularPrismDiagram(base: number, height: number, depth: number): GeometryDiagramData {
  const k = unitScale(base, height, depth);
  const B = base * k;
  const H = height * k;
  const D = depth * k;

  const tri = [
    { x: 0, y: 0, z: 0 },
    { x: B, y: 0, z: 0 },
    { x: B / 2, y: 0, z: H },
  ];
  const triBack = tri.map((p) => ({ x: p.x, y: p.y + D, z: p.z }));
  const o = centeredIsoOrigin([...tri, ...triBack]);

  const diagram = baseDiagram();
  diagram.paths = [
    { d: isoPath(tri, o), fill: "var(--color-text)", fillOpacity: 0.08, stroke: true },
    { d: isoPath(triBack, o), fill: "var(--color-text)", fillOpacity: 0.04, stroke: true },
  ];
  for (let i = 0; i < 3; i++) {
    const a = isoProject(tri[i].x, tri[i].y, tri[i].z, o);
    const b = isoProject(triBack[i].x, triBack[i].y, triBack[i].z, o);
    diagram.lines!.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
  }

  const centroid = isoProject(B / 2, D / 2, H / 2, o);
  const baseLine = isoLine({ x: 0, y: 0, z: 0 }, { x: B, y: 0, z: 0 }, o);
  diagram.labels = [
    labelOnSegment(baseLine.x1, baseLine.y1, baseLine.x2, baseLine.y2, `b = ${base}`, centroid, 24),
    { x: centroid.x + 36, y: centroid.y, text: `h = ${height}` },
    { x: centroid.x - 42, y: centroid.y + 28, text: `d = ${depth}` },
  ];
  return diagram;
}

export function buildSphereDiagram(r: number): GeometryDiagramData {
  const cx = DIAGRAM_CX;
  const cy = DIAGRAM_CY;
  const R = FIXED_RADIUS_PX;

  const diagram = baseDiagram();
  diagram.paths = [
    {
      d: `M ${cx - R} ${cy} A ${R} ${R} 0 1 1 ${cx + R} ${cy} A ${R} ${R} 0 1 1 ${cx - R} ${cy}`,
      fill: "var(--color-text)",
      fillOpacity: 0.06,
      stroke: true,
    },
    { d: ellipsePath(cx, cy, R, R * 0.28), fill: "none", stroke: true, strokeDasharray: "5 4" },
  ];

  const { line, label } = standardRadiusDisplay(cx, cy, R, r);
  diagram.lines = [line];
  diagram.labels = [label];
  return diagram;
}

export function buildHemisphereDiagram(r: number): GeometryDiagramData {
  const cx = DIAGRAM_CX;
  const R = FIXED_RADIUS_PX;
  const baseY = DIAGRAM_CY + R * 0.35;

  const diagram = baseDiagram();
  diagram.paths = [
    {
      d: `M ${cx - R} ${baseY} A ${R} ${R} 0 0 0 ${cx + R} ${baseY}`,
      fill: "var(--color-text)",
      fillOpacity: 0.08,
      stroke: true,
    },
  ];
  diagram.lines = [
    { x1: cx - R, y1: baseY, x2: cx + R, y2: baseY },
    { x1: cx, y1: baseY, x2: cx, y2: baseY - R },
  ];
  diagram.labels = [
    labelOnSegment(cx, baseY, cx, baseY - R, `r = ${r}`, { x: cx + R * 0.5, y: baseY }, 28),
  ];
  return diagram;
}
