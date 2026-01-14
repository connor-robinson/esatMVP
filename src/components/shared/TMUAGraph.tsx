/**
 * TMUA Graph Renderer
 * Renders TMUA-style graphs from GraphSpec JSON v2
 * Supports multiple objects, regions, derived objects, and auto label placement
 */

"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// Type Definitions
// ============================================================================

export type Point = { x: number; y: number };

export type FunctionObject = {
  id: string;
  kind: "function";
  fn: { kind: "poly2"; a: number; b: number; c: number };
  style?: {
    strokeWidth?: number;
    strokeOpacity?: number;
    dashed?: boolean;
  };
};

export type LineObject = {
  id: string;
  kind: "line";
  form:
    | { kind: "slope_intercept"; m: number; b: number }
    | { kind: "two_points"; p1: Point; p2: Point }
    | { kind: "horiz"; y: number }
    | { kind: "vert"; x: number };
  style?: {
    strokeWidth?: number;
    strokeOpacity?: number;
    dashed?: boolean;
  };
};

export type SegmentObject = {
  id: string;
  kind: "segment";
  p1: Point;
  p2: Point;
  style?: {
    strokeWidth?: number;
    strokeOpacity?: number;
    dashed?: boolean;
  };
};

export type CircleObject = {
  id: string;
  kind: "circle";
  center: Point;
  r: number;
  style?: {
    strokeWidth?: number;
    strokeOpacity?: number;
    fill?: boolean;
    fillOpacity?: number;
  };
};

export type TangentObject = {
  id: string;
  kind: "tangent";
  to: string; // ID of function object
  at: { kind: "x"; value: number } | { kind: "point"; ref: string };
};

export type IntersectionObject = {
  id: string;
  kind: "intersection";
  of: [string, string]; // IDs of two objects
  pick?: "leftmost" | "rightmost" | "topmost" | "bottommost";
};

export type GraphObject = FunctionObject | LineObject | SegmentObject | CircleObject | TangentObject | IntersectionObject;

export type RegionConstraint =
  | { kind: "x_between"; a: number; b: number }
  | { kind: "above"; of: string }
  | { kind: "below"; of: string }
  | { kind: "left_of"; of: string }
  | { kind: "right_of"; of: string }
  | { kind: "below_function"; of: string }
  | { kind: "above_function"; of: string }
  | { kind: "inside_circle"; of: string }
  | { kind: "outside_circle"; of: string };

export type RegionDefinition =
  | { kind: "inequalities"; inside: RegionConstraint[] }
  | {
      kind: "between_curves";
      top: string;
      bottom: string;
      xBetween: [number, number];
    };

export type RegionLabelPlacement =
  | { kind: "auto" }
  | { kind: "manual"; x: number; y: number };

export type RegionSpec = {
  id: string;
  label: { text: string; italic?: boolean; placement: RegionLabelPlacement };
  fill?: { enabled: boolean; opacity?: number };
  definition: RegionDefinition;
};

export type MarkPoint = {
  id: string;
  at: Point;
  label?: { text: string; italic?: boolean };
  filled?: boolean;
};

export type AxisMark = {
  x?: number;
  y?: number;
  label: { text: string; italic?: boolean; dx?: number; dy?: number };
  tick?: boolean;
};

export type TMUAGraphSpecV2 = {
  version?: number; // Optional version field, defaults to 2
  xRange: [number, number];
  yRange: [number, number];
  axes: {
    show: boolean;
    arrowheads: boolean;
    xLabel?: { text: string; italic?: boolean; dx?: number; dy?: number };
    yLabel?: { text: string; italic?: boolean; dx?: number; dy?: number };
  };
  objects: GraphObject[];
  regions?: RegionSpec[];
  marks?: {
    xMarks?: AxisMark[];
    yMarks?: AxisMark[];
    points?: MarkPoint[];
  };
  annotations?: Array<{
    kind: "text";
    x: number;
    y: number;
    text: string;
    italic?: boolean;
  }>;
};

// Legacy type for backwards compatibility (deprecated but needed during migration)
export type TMUAGraphSpec = TMUAGraphSpecV2;

// ============================================================================
// Constants
// ============================================================================

const VIEWBOX_WIDTH = 1440;
const VIEWBOX_HEIGHT = 972;
const PAD_LEFT = 175;
const PAD_RIGHT = 105;
const PAD_TOP = 130;
const PAD_BOTTOM = 105;
const PLOT_WIDTH = VIEWBOX_WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_HEIGHT = VIEWBOX_HEIGHT - PAD_TOP - PAD_BOTTOM;

const AXIS_STROKE_OPACITY = 0.6;
const CURVE_STROKE_OPACITY = 0.95;
const AXIS_STROKE_WIDTH = 3;
const CURVE_STROKE_WIDTH = 4.5;

const ARROWHEAD_SIZE = 12;
const ARROWHEAD_WIDTH = 7;

const FONT_SIZE_LABELS = 80;
const FONT_SIZE_MARKS = 75;
const FONT_SIZE_ANNOTATIONS = 80;

const LABEL_ARROW_SPACING = 18;

// Auto label placement constants
const GRID_SAMPLES = 60; // 60x60 grid for region sampling
const REFINEMENT_ITERATIONS = 5; // Number of boundary refinement iterations
const REFINEMENT_STEP = 0.02; // Step size for refinement (fraction of range)

// ============================================================================
// Helper Functions
// ============================================================================

interface Transform {
  toSVGX: (x: number) => number;
  toSVGY: (y: number) => number;
  xRange: [number, number];
  yRange: [number, number];
}

function createTransform(xRange: [number, number], yRange: [number, number]): Transform {
  const toSVGX = (x: number) =>
    PAD_LEFT + ((x - xRange[0]) / (xRange[1] - xRange[0])) * PLOT_WIDTH;
  const toSVGY = (y: number) =>
    PAD_TOP + ((yRange[1] - y) / (yRange[1] - yRange[0])) * PLOT_HEIGHT;
  return { toSVGX, toSVGY, xRange, yRange };
}

function evaluateFunction(obj: FunctionObject, x: number): number {
  if (obj.fn.kind === "poly2") {
    const { a, b, c } = obj.fn;
    return a * x * x + b * x + c;
  }
  return 0;
}

function evaluateLine(obj: LineObject, x: number): number | null {
  if (obj.form.kind === "slope_intercept") {
    return obj.form.m * x + obj.form.b;
  } else if (obj.form.kind === "horiz") {
    return obj.form.y;
  } else if (obj.form.kind === "vert") {
    return null; // Vertical line
  } else if (obj.form.kind === "two_points") {
    const { p1, p2 } = obj.form;
    if (Math.abs(p2.x - p1.x) < 1e-10) {
      return null; // Vertical line
    }
    const m = (p2.y - p1.y) / (p2.x - p1.x);
    const b = p1.y - m * p1.x;
    return m * x + b;
  }
  return null;
}

function evaluateConstraint(
  point: Point,
  constraint: RegionConstraint,
  objects: Map<string, GraphObject>,
  xRange: [number, number],
  yRange: [number, number]
): boolean {
  const { x, y } = point;

  switch (constraint.kind) {
    case "x_between":
      return x >= constraint.a && x <= constraint.b;

    case "above":
      if (constraint.of === "xaxis") {
        return y >= 0;
      }
      // For other objects, check if point is above
      const objAbove = objects.get(constraint.of);
      if (!objAbove) return false;
      if (objAbove.kind === "function") {
        const fy = evaluateFunction(objAbove, x);
        return y >= fy;
      } else if (objAbove.kind === "line") {
        const ly = evaluateLine(objAbove, x);
        if (ly === null) return false;
        return y >= ly;
      }
      return false;

    case "below":
      if (constraint.of === "xaxis") {
        return y <= 0;
      }
      const objBelow = objects.get(constraint.of);
      if (!objBelow) return false;
      if (objBelow.kind === "function") {
        const fy = evaluateFunction(objBelow, x);
        return y <= fy;
      } else if (objBelow.kind === "line") {
        const ly = evaluateLine(objBelow, x);
        if (ly === null) return false;
        return y <= ly;
      }
      return false;

    case "left_of":
      if (constraint.of === "yaxis") {
        return x <= 0;
      }
      const objLeft = objects.get(constraint.of);
      if (!objLeft) return false;
      if (objLeft.kind === "line" && objLeft.form.kind === "vert") {
        return x <= objLeft.form.x;
      }
      return false;

    case "right_of":
      if (constraint.of === "yaxis") {
        return x >= 0;
      }
      const objRight = objects.get(constraint.of);
      if (!objRight) return false;
      if (objRight.kind === "line" && objRight.form.kind === "vert") {
        return x >= objRight.form.x;
      }
      return false;

    case "below_function":
      const objFuncBelow = objects.get(constraint.of);
      if (!objFuncBelow || objFuncBelow.kind !== "function") return false;
      const fyBelow = evaluateFunction(objFuncBelow, x);
      return y <= fyBelow;

    case "above_function":
      const objFuncAbove = objects.get(constraint.of);
      if (!objFuncAbove || objFuncAbove.kind !== "function") return false;
      const fyAbove = evaluateFunction(objFuncAbove, x);
      return y >= fyAbove;

    case "inside_circle":
      const objCircle = objects.get(constraint.of);
      if (!objCircle || objCircle.kind !== "circle") return false;
      const dx = x - objCircle.center.x;
      const dy = y - objCircle.center.y;
      return dx * dx + dy * dy <= objCircle.r * objCircle.r;

    case "outside_circle":
      const objCircleOut = objects.get(constraint.of);
      if (!objCircleOut || objCircleOut.kind !== "circle") return false;
      const dxOut = x - objCircleOut.center.x;
      const dyOut = y - objCircleOut.center.y;
      return dxOut * dxOut + dyOut * dyOut > objCircleOut.r * objCircleOut.r;

    default:
      return false;
  }
}

function sampleRegion(
  definition: RegionDefinition,
  objects: Map<string, GraphObject>,
  xRange: [number, number],
  yRange: [number, number]
): Point[] {
  const validPoints: Point[] = [];

  const xStep = (xRange[1] - xRange[0]) / GRID_SAMPLES;
  const yStep = (yRange[1] - yRange[0]) / GRID_SAMPLES;

  if (definition.kind === "inequalities") {
    for (let i = 0; i <= GRID_SAMPLES; i++) {
      for (let j = 0; j <= GRID_SAMPLES; j++) {
        const x = xRange[0] + i * xStep;
        const y = yRange[0] + j * yStep;
        const point = { x, y };

        // Check all constraints
        const satisfiesAll = definition.inside.every((constraint) =>
          evaluateConstraint(point, constraint, objects, xRange, yRange)
        );

        if (satisfiesAll) {
          validPoints.push(point);
        }
      }
    }
  } else if (definition.kind === "between_curves") {
    // For between_curves, sample points between top and bottom curves
    for (let i = 0; i <= GRID_SAMPLES; i++) {
      const x = xRange[0] + i * xStep;
      if (x < definition.xBetween[0] || x > definition.xBetween[1]) continue;

      const topObj = objects.get(definition.top);
      const bottomObj = objects.get(definition.bottom);
      if (!topObj || !bottomObj) continue;

      let topY: number | null = null;
      let bottomY: number | null = null;

      if (topObj.kind === "function") {
        topY = evaluateFunction(topObj, x);
      } else if (topObj.kind === "line") {
        topY = evaluateLine(topObj, x);
      }

      if (bottomObj.kind === "function") {
        bottomY = evaluateFunction(bottomObj, x);
      } else if (bottomObj.kind === "line") {
        bottomY = evaluateLine(bottomObj, x);
      }

      if (topY !== null && bottomY !== null && topY > bottomY) {
        // Sample vertically between the curves
        const numSamples = 20;
        for (let k = 0; k <= numSamples; k++) {
          const y = bottomY + (k / numSamples) * (topY - bottomY);
          validPoints.push({ x, y });
        }
      }
    }
  }

  return validPoints;

  return validPoints;
}

function computeCentroid(points: Point[]): Point {
  if (points.length === 0) {
    return { x: 0, y: 0 };
  }
  const sumX = points.reduce((sum, p) => sum + p.x, 0);
  const sumY = points.reduce((sum, p) => sum + p.y, 0);
  return { x: sumX / points.length, y: sumY / points.length };
}

function distanceToLine(point: Point, obj: GraphObject): number {
  // Simplified distance calculation - returns approximate distance
  if (obj.kind === "line" && obj.form.kind === "horiz") {
    return Math.abs(point.y - obj.form.y);
  }
  if (obj.kind === "line" && obj.form.kind === "vert") {
    return Math.abs(point.x - obj.form.x);
  }
  if (obj.kind === "function") {
    const fy = evaluateFunction(obj, point.x);
    return Math.abs(point.y - fy);
  }
  if (obj.kind === "circle") {
    const dx = point.x - obj.center.x;
    const dy = point.y - obj.center.y;
    return Math.abs(Math.sqrt(dx * dx + dy * dy) - obj.r);
  }
  return Infinity;
}

function refineLabelPosition(
  centroid: Point,
  definition: RegionDefinition,
  objects: Map<string, GraphObject>,
  xRange: [number, number],
  yRange: [number, number]
): Point {
  let position = { ...centroid };
  const xRangeSize = xRange[1] - xRange[0];
  const yRangeSize = yRange[1] - yRange[0];

  for (let iter = 0; iter < REFINEMENT_ITERATIONS; iter++) {
    let minDistance = Infinity;
    let closestObj: GraphObject | null = null;

    // Find closest boundary object
    if (definition.kind === "inequalities") {
      for (const constraint of definition.inside) {
        if (constraint.kind === "above" || constraint.kind === "below") {
          const obj = objects.get(constraint.of);
          if (obj) {
            const dist = distanceToLine(position, obj);
            if (dist < minDistance) {
              minDistance = dist;
              closestObj = obj;
            }
          }
        } else if (constraint.kind === "below_function" || constraint.kind === "above_function") {
          const obj = objects.get(constraint.of);
          if (obj) {
            const dist = distanceToLine(position, obj);
            if (dist < minDistance) {
              minDistance = dist;
              closestObj = obj;
            }
          }
        }
      }
    }

    if (closestObj) {
      // Move away from closest boundary
      if (closestObj.kind === "function") {
        const fy = evaluateFunction(closestObj, position.x);
        const direction = position.y > fy ? 1 : -1;
        position.y += direction * yRangeSize * REFINEMENT_STEP;
      } else if (closestObj.kind === "line" && closestObj.form.kind === "horiz") {
        const direction = position.y > closestObj.form.y ? 1 : -1;
        position.y += direction * yRangeSize * REFINEMENT_STEP;
      } else if (closestObj.kind === "line" && closestObj.form.kind === "vert") {
        const direction = position.x > closestObj.form.x ? 1 : -1;
        position.x += direction * xRangeSize * REFINEMENT_STEP;
      }
    }

    // Clamp to valid region
    position.x = Math.max(xRange[0], Math.min(xRange[1], position.x));
    position.y = Math.max(yRange[0], Math.min(yRange[1], position.y));
  }

  return position;
}

function computeRegionLabelPosition(
  region: RegionSpec,
  objects: Map<string, GraphObject>,
  xRange: [number, number],
  yRange: [number, number]
): Point {
  if (region.label.placement.kind === "manual") {
    return { x: region.label.placement.x, y: region.label.placement.y };
  }

  // Auto placement: grid sampling + refinement
  const validPoints = sampleRegion(region.definition, objects, xRange, yRange);

  if (validPoints.length === 0) {
    // Fallback: use centroid of bounding box
    return {
      x: (xRange[0] + xRange[1]) / 2,
      y: (yRange[0] + yRange[1]) / 2,
    };
  }

  const centroid = computeCentroid(validPoints);
  const refined = refineLabelPosition(centroid, region.definition, objects, xRange, yRange);

  return refined;
}

// ============================================================================
// Derived Object Computation
// ============================================================================

function computeTangent(
  obj: FunctionObject,
  at: number,
  xRange: [number, number],
  yRange: [number, number]
): LineObject | null {
  if (obj.fn.kind === "poly2") {
    const { a, b, c } = obj.fn;
    // f'(x) = 2ax + b
    const slope = 2 * a * at + b;
    // Point on curve: (at, f(at))
    const yAt = a * at * at + b * at + c;
    // Line: y = slope * (x - at) + yAt = slope * x + (yAt - slope * at)
    const intercept = yAt - slope * at;
    
    return {
      id: `tangent_${obj.id}_at_${at}`,
      kind: "line",
      form: { kind: "slope_intercept", m: slope, b: intercept },
      style: { strokeWidth: AXIS_STROKE_WIDTH, strokeOpacity: AXIS_STROKE_OPACITY, dashed: true },
    };
  }
  return null;
}

function computeIntersection(
  obj1: GraphObject,
  obj2: GraphObject
): Point[] {
  const intersections: Point[] = [];
  
  // Function vs Function
  if (obj1.kind === "function" && obj2.kind === "function") {
    if (obj1.fn.kind === "poly2" && obj2.fn.kind === "poly2") {
      const { a: a1, b: b1, c: c1 } = obj1.fn;
      const { a: a2, b: b2, c: c2 } = obj2.fn;
      // Solve: a1*x^2 + b1*x + c1 = a2*x^2 + b2*x + c2
      // (a1-a2)*x^2 + (b1-b2)*x + (c1-c2) = 0
      const a = a1 - a2;
      const b = b1 - b2;
      const c = c1 - c2;
      
      if (Math.abs(a) < 1e-10) {
        // Linear: b*x + c = 0
        if (Math.abs(b) > 1e-10) {
          const x = -c / b;
          const y = evaluateFunction(obj1, x);
          intersections.push({ x, y });
        }
      } else {
        // Quadratic: discriminant
        const discriminant = b * b - 4 * a * c;
        if (discriminant >= 0) {
          const sqrtD = Math.sqrt(discriminant);
          const x1 = (-b + sqrtD) / (2 * a);
          const x2 = (-b - sqrtD) / (2 * a);
          const y1 = evaluateFunction(obj1, x1);
          const y2 = evaluateFunction(obj1, x2);
          intersections.push({ x: x1, y: y1 }, { x: x2, y: y2 });
        }
      }
    }
  }
  
  // Function vs Line
  if (obj1.kind === "function" && obj2.kind === "line") {
    if (obj1.fn.kind === "poly2") {
      const { a, b, c } = obj1.fn;
      const lineY = evaluateLine(obj2, 0); // Get y at x=0 to find intercept
      if (lineY !== null) {
        // For slope_intercept: y = m*x + b_line
        // For horiz: y = constant
        // For vert: x = constant
        if (obj2.form.kind === "slope_intercept") {
          const { m, b: bLine } = obj2.form;
          // Solve: a*x^2 + b*x + c = m*x + bLine
          // a*x^2 + (b-m)*x + (c-bLine) = 0
          const aQuad = a;
          const bQuad = b - m;
          const cQuad = c - bLine;
          const discriminant = bQuad * bQuad - 4 * aQuad * cQuad;
          if (discriminant >= 0) {
            const sqrtD = Math.sqrt(discriminant);
            const x1 = (-bQuad + sqrtD) / (2 * aQuad);
            const x2 = (-bQuad - sqrtD) / (2 * aQuad);
            const y1 = m * x1 + bLine;
            const y2 = m * x2 + bLine;
            intersections.push({ x: x1, y: y1 }, { x: x2, y: y2 });
          }
        } else if (obj2.form.kind === "horiz") {
          // Solve: a*x^2 + b*x + c = y_const
          const yConst = obj2.form.y;
          const aQuad = a;
          const bQuad = b;
          const cQuad = c - yConst;
          const discriminant = bQuad * bQuad - 4 * aQuad * cQuad;
          if (discriminant >= 0) {
            const sqrtD = Math.sqrt(discriminant);
            const x1 = (-bQuad + sqrtD) / (2 * aQuad);
            const x2 = (-bQuad - sqrtD) / (2 * aQuad);
            intersections.push({ x: x1, y: yConst }, { x: x2, y: yConst });
          }
        } else if (obj2.form.kind === "vert") {
          const xConst = obj2.form.x;
          const y = evaluateFunction(obj1, xConst);
          intersections.push({ x: xConst, y });
        }
      }
    }
  }
  
  // Function vs Axis (x-axis or y-axis)
  if (obj1.kind === "function" && obj2.id === "xaxis") {
    // Solve f(x) = 0
    if (obj1.fn.kind === "poly2") {
      const { a, b, c } = obj1.fn;
      const discriminant = b * b - 4 * a * c;
      if (discriminant >= 0) {
        const sqrtD = Math.sqrt(discriminant);
        const x1 = (-b + sqrtD) / (2 * a);
        const x2 = (-b - sqrtD) / (2 * a);
        intersections.push({ x: x1, y: 0 }, { x: x2, y: 0 });
      }
    }
  }
  
  return intersections;
}

// ============================================================================
// Component
// ============================================================================

interface TMUAGraphProps {
  spec: TMUAGraphSpecV2;
  className?: string;
}

export function TMUAGraph({ spec, className }: TMUAGraphProps) {
  // Create object map for quick lookup
  const objectsMap = useMemo(() => {
    const map = new Map<string, GraphObject>();
    spec.objects.forEach((obj) => {
      map.set(obj.id, obj);
    });
    return map;
  }, [spec.objects]);

  // Compute derived objects (tangents, intersections)
  const computedLines = useMemo(() => {
    const lines: LineObject[] = [];
    
    spec.derived?.forEach((derivedObj) => {
      if (derivedObj.kind === "tangent") {
        const targetObj = objectsMap.get(derivedObj.to);
        if (targetObj && targetObj.kind === "function") {
          if (derivedObj.at.kind === "x") {
            const tangent = computeTangent(targetObj, derivedObj.at.value, spec.xRange, spec.yRange);
            if (tangent) {
              lines.push({ ...tangent, id: derivedObj.id });
            }
          }
        }
      }
    });
    
    return lines;
  }, [spec.derived, objectsMap, spec.xRange, spec.yRange]);

  // Compute intersection points and merge with marks.points
  const allPoints = useMemo(() => {
    const points: MarkPoint[] = [...(spec.marks?.points || [])];
    
    spec.derived?.forEach((derivedObj) => {
      if (derivedObj.kind === "intersection") {
        const obj1 = objectsMap.get(derivedObj.of[0]);
        const obj2 = objectsMap.get(derivedObj.of[1]);
        if (obj1 && obj2) {
          const intersections = computeIntersection(obj1, obj2);
          if (intersections.length > 0) {
            // Pick the appropriate intersection based on pick strategy
            let selected: Point;
            if (derivedObj.pick === "leftmost") {
              selected = intersections.reduce((min, p) => (p.x < min.x ? p : min));
            } else if (derivedObj.pick === "rightmost") {
              selected = intersections.reduce((max, p) => (p.x > max.x ? p : max));
            } else if (derivedObj.pick === "topmost") {
              selected = intersections.reduce((max, p) => (p.y > max.y ? p : max));
            } else if (derivedObj.pick === "bottommost") {
              selected = intersections.reduce((min, p) => (p.y < min.y ? p : min));
            } else {
              selected = intersections[0]; // Default to first
            }
            points.push({
              id: derivedObj.id,
              at: selected,
              filled: true,
            });
          }
        }
      }
    });
    
    return points;
  }, [spec.derived, spec.marks?.points, objectsMap]);

  // Compute region label positions
  const regionLabelPositions = useMemo(() => {
    const positions = new Map<string, Point>();
    spec.regions?.forEach((region) => {
      const pos = computeRegionLabelPosition(region, objectsMap, spec.xRange, spec.yRange);
      positions.set(region.id, pos);
    });
    return positions;
  }, [spec.regions, objectsMap, spec.xRange, spec.yRange]);

  const transform = useMemo(
    () => createTransform(spec.xRange, spec.yRange),
    [spec.xRange, spec.yRange]
  );

  // Generate function paths
  const functionPaths = useMemo(() => {
    const paths: Array<{ id: string; pathData: string }> = [];
    const numPoints = 600;

    spec.objects.forEach((obj) => {
      if (obj.kind === "function") {
        let pathData = "";
        const xStep = (spec.xRange[1] - spec.xRange[0]) / numPoints;
        let firstPoint = true;
        let lastY: number | null = null;

        for (let i = 0; i <= numPoints; i++) {
          const x = spec.xRange[0] + i * xStep;
          const y = evaluateFunction(obj, x);

          // Clip to y-range
          if (y < spec.yRange[0] || y > spec.yRange[1]) {
            if (lastY !== null) {
              const clippedY = y < spec.yRange[0] ? spec.yRange[0] : spec.yRange[1];
              pathData += ` L ${transform.toSVGX(x)},${transform.toSVGY(clippedY)}`;
              lastY = null;
            }
            continue;
          }

          // Check for discontinuity
          if (
            lastY !== null &&
            Math.abs(y - lastY) > (spec.yRange[1] - spec.yRange[0]) * 0.5
          ) {
            pathData += ` M ${transform.toSVGX(x)},${transform.toSVGY(y)}`;
          } else if (firstPoint) {
            pathData += `M ${transform.toSVGX(x)},${transform.toSVGY(y)}`;
            firstPoint = false;
          } else {
            pathData += ` L ${transform.toSVGX(x)},${transform.toSVGY(y)}`;
          }

          lastY = y;
        }

        paths.push({ id: obj.id, pathData });
      }
    });

    return paths;
  }, [spec.objects, spec.xRange, spec.yRange, transform]);

  // Generate axes paths
  const { xAxisPath, yAxisPath } = useMemo(() => {
    let xAxisPath = "";
    let yAxisPath = "";

    if (spec.axes.show) {
      const xAxisY = transform.toSVGY(0);
      const yAxisX = transform.toSVGX(0);

      if (spec.yRange[0] <= 0 && spec.yRange[1] >= 0) {
        xAxisPath = `M ${PAD_LEFT},${xAxisY} L ${VIEWBOX_WIDTH - PAD_RIGHT},${xAxisY}`;
      }

      if (spec.xRange[0] <= 0 && spec.xRange[1] >= 0) {
        yAxisPath = `M ${yAxisX},${VIEWBOX_HEIGHT - PAD_BOTTOM} L ${yAxisX},${PAD_TOP}`;
      }
    }

    return { xAxisPath, yAxisPath };
  }, [spec.axes.show, spec.xRange, spec.yRange, transform]);

  // Generate region fill polygons from constraints
  const regionFills = useMemo(() => {
    if (!spec.regions) return [];
    
    return spec.regions
      .filter((region) => region.fill?.enabled)
      .map((region) => {
        // Sample region to get boundary points
        const validPoints = sampleRegion(region.definition, objectsMap, spec.xRange, spec.yRange);
        
        if (validPoints.length === 0) return null;
        
        // Create convex hull or bounding polygon from sampled points
        // Simplified: use bounding box for now, can be improved with proper polygon generation
        const xs = validPoints.map((p) => p.x);
        const ys = validPoints.map((p) => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        
        // For between_curves, generate polygon by sampling along x
        if (region.definition.kind === "between_curves") {
          const { top, bottom, xBetween } = region.definition;
          const topObj = objectsMap.get(top);
          const bottomObj = objectsMap.get(bottom);
          if (!topObj || !bottomObj) return null;
          
          const numSamples = 100;
          const xStep = (xBetween[1] - xBetween[0]) / numSamples;
          const points: Point[] = [];
          
          // Top curve (left to right)
          for (let i = 0; i <= numSamples; i++) {
            const x = xBetween[0] + i * xStep;
            let topY: number | null = null;
            if (topObj.kind === "function") {
              topY = evaluateFunction(topObj, x);
            } else if (topObj.kind === "line") {
              topY = evaluateLine(topObj, x);
            }
            if (topY !== null) points.push({ x, y: topY });
          }
          
          // Bottom curve (right to left)
          for (let i = numSamples; i >= 0; i--) {
            const x = xBetween[0] + i * xStep;
            let bottomY: number | null = null;
            if (bottomObj.kind === "function") {
              bottomY = evaluateFunction(bottomObj, x);
            } else if (bottomObj.kind === "line") {
              bottomY = evaluateLine(bottomObj, x);
            }
            if (bottomY !== null) points.push({ x, y: bottomY });
          }
          
          if (points.length > 0) {
            const pathData =
              "M " +
              points
                .map((p) => `${transform.toSVGX(p.x)},${transform.toSVGY(p.y)}`)
                .join(" L ") +
              " Z";
            return { id: region.id, pathData, opacity: region.fill?.opacity ?? 0.2 };
          }
        } else {
          // For inequalities, use bounding box approximation
          const pathData = `M ${transform.toSVGX(minX)},${transform.toSVGY(maxY)} L ${transform.toSVGX(maxX)},${transform.toSVGY(maxY)} L ${transform.toSVGX(maxX)},${transform.toSVGY(minY)} L ${transform.toSVGX(minX)},${transform.toSVGY(minY)} Z`;
          return { id: region.id, pathData, opacity: region.fill?.opacity ?? 0.2 };
        }
        
        return null;
      })
      .filter((fill): fill is { id: string; pathData: string; opacity: number } => fill !== null);
  }, [spec.regions, objectsMap, spec.xRange, spec.yRange, transform]);

  return (
    <div className={cn("tmua-graph", className)}>
      <svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        className="w-full max-w-[1320px] h-auto"
        style={{
          fontFamily: "'Times New Roman', Times, 'Nimbus Roman No9 L', serif",
        }}
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Arrowhead definitions */}
        <defs>
          <marker
            id="arrowhead-x"
            markerWidth={ARROWHEAD_SIZE}
            markerHeight={ARROWHEAD_SIZE}
            refX={ARROWHEAD_SIZE}
            refY={ARROWHEAD_SIZE / 2}
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path
              d={`M 0,0 L ${ARROWHEAD_SIZE},${ARROWHEAD_SIZE / 2} L 0,${ARROWHEAD_SIZE} Z`}
              fill="white"
              fillOpacity="1"
              stroke="none"
            />
          </marker>
          <marker
            id="arrowhead-y"
            markerWidth={ARROWHEAD_SIZE}
            markerHeight={ARROWHEAD_SIZE}
            refX={ARROWHEAD_SIZE / 2}
            refY={ARROWHEAD_SIZE}
            orient="0"
            markerUnits="userSpaceOnUse"
          >
            <path
              d={`M ${ARROWHEAD_SIZE / 2},0 L 0,${ARROWHEAD_SIZE} L ${ARROWHEAD_SIZE},${ARROWHEAD_SIZE} Z`}
              fill="white"
              fillOpacity="1"
              stroke="none"
            />
          </marker>
          <clipPath id="plotClip">
            <rect x={PAD_LEFT} y={PAD_TOP} width={PLOT_WIDTH} height={PLOT_HEIGHT} />
          </clipPath>
        </defs>

        {/* Region fills (background layer) */}
        {regionFills.map((fill) => (
          <path
            key={fill.id}
            d={fill.pathData}
            fill="white"
            fillOpacity={fill.opacity}
            clipPath="url(#plotClip)"
          />
        ))}

        {/* Axes */}
        {spec.axes.show && (
          <>
            {xAxisPath && (
              <path
                d={xAxisPath}
                stroke="white"
                strokeOpacity={AXIS_STROKE_OPACITY}
                strokeWidth={AXIS_STROKE_WIDTH}
                strokeLinecap="butt"
                fill="none"
                markerEnd={spec.axes.arrowheads ? "url(#arrowhead-x)" : undefined}
              />
            )}
            {yAxisPath && (
              <path
                d={yAxisPath}
                stroke="white"
                strokeOpacity={AXIS_STROKE_OPACITY}
                strokeWidth={AXIS_STROKE_WIDTH}
                strokeLinecap="butt"
                fill="none"
                markerEnd={spec.axes.arrowheads ? "url(#arrowhead-y)" : undefined}
              />
            )}
          </>
        )}

        {/* Function curves */}
        {functionPaths.map(({ id, pathData }) => (
          <path
            key={id}
            d={pathData}
            stroke="white"
            strokeOpacity={CURVE_STROKE_OPACITY}
            strokeWidth={CURVE_STROKE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            clipPath="url(#plotClip)"
          />
        ))}

        {/* Lines (including computed tangents) */}
        {[...spec.objects.filter((obj) => obj.kind === "line"), ...computedLines].map((obj) => {
          if (obj.kind !== "line") return null;
          const line = obj;
            let pathData = "";

            if (line.form.kind === "horiz") {
              const y = transform.toSVGY(line.form.y);
              pathData = `M ${PAD_LEFT},${y} L ${VIEWBOX_WIDTH - PAD_RIGHT},${y}`;
            } else if (line.form.kind === "vert") {
              const x = transform.toSVGX(line.form.x);
              pathData = `M ${x},${PAD_TOP} L ${x},${VIEWBOX_HEIGHT - PAD_BOTTOM}`;
            } else if (line.form.kind === "slope_intercept") {
              const { m, b } = line.form;
              // Find intersection with plot boundaries
              const x1 = spec.xRange[0];
              const x2 = spec.xRange[1];
              const y1 = m * x1 + b;
              const y2 = m * x2 + b;
              // Clip to plot area
              const p1 = { x: x1, y: y1 };
              const p2 = { x: x2, y: y2 };
              pathData = `M ${transform.toSVGX(p1.x)},${transform.toSVGY(p1.y)} L ${transform.toSVGX(p2.x)},${transform.toSVGY(p2.y)}`;
            } else if (line.form.kind === "two_points") {
              const { p1, p2 } = line.form;
              pathData = `M ${transform.toSVGX(p1.x)},${transform.toSVGY(p1.y)} L ${transform.toSVGX(p2.x)},${transform.toSVGY(p2.y)}`;
            }

            return (
              <path
                key={line.id}
                d={pathData}
                stroke="white"
                strokeOpacity={line.style?.strokeOpacity ?? AXIS_STROKE_OPACITY}
                strokeWidth={line.style?.strokeWidth ?? AXIS_STROKE_WIDTH}
                strokeDasharray={line.style?.dashed ? "5,5" : undefined}
                strokeLinecap="butt"
                fill="none"
                clipPath="url(#plotClip)"
              />
            );
          })}

        {/* Segments */}
        {spec.objects
          .filter((obj) => obj.kind === "segment")
          .map((obj) => {
            if (obj.kind !== "segment") return null;
            const segment = obj;
            const pathData = `M ${transform.toSVGX(segment.p1.x)},${transform.toSVGY(segment.p1.y)} L ${transform.toSVGX(segment.p2.x)},${transform.toSVGY(segment.p2.y)}`;

            return (
              <path
                key={segment.id}
                d={pathData}
                stroke="white"
                strokeOpacity={segment.style?.strokeOpacity ?? CURVE_STROKE_OPACITY}
                strokeWidth={segment.style?.strokeWidth ?? CURVE_STROKE_WIDTH}
                strokeDasharray={segment.style?.dashed ? "5,5" : undefined}
                strokeLinecap="round"
                fill="none"
                clipPath="url(#plotClip)"
              />
            );
          })}

        {/* Circles */}
        {spec.objects
          .filter((obj) => obj.kind === "circle")
          .map((obj) => {
            if (obj.kind !== "circle") return null;
            const circle = obj;
            const cx = transform.toSVGX(circle.center.x);
            const cy = transform.toSVGY(circle.center.y);
            // Approximate radius in SVG units (simplified - assumes uniform scaling)
            const xScale = PLOT_WIDTH / (spec.xRange[1] - spec.xRange[0]);
            const yScale = PLOT_HEIGHT / (spec.yRange[1] - spec.yRange[0]);
            const r = Math.min(circle.r * xScale, circle.r * yScale);

            return (
              <circle
                key={circle.id}
                cx={cx}
                cy={cy}
                r={r}
                stroke="white"
                strokeOpacity={circle.style?.strokeOpacity ?? CURVE_STROKE_OPACITY}
                strokeWidth={circle.style?.strokeWidth ?? CURVE_STROKE_WIDTH}
                fill={circle.style?.fill ? "white" : "none"}
                fillOpacity={circle.style?.fillOpacity ?? 0.1}
                clipPath="url(#plotClip)"
              />
            );
          })}

        {/* X-axis label */}
        {spec.axes.xLabel && (
          <text
            x={VIEWBOX_WIDTH - PAD_RIGHT + LABEL_ARROW_SPACING + (spec.axes.xLabel.dx || 0)}
            y={transform.toSVGY(0) + (spec.axes.xLabel.dy || 0)}
            fill="white"
            fillOpacity={CURVE_STROKE_OPACITY}
            fontSize={FONT_SIZE_LABELS}
            fontStyle={spec.axes.xLabel.italic ? "italic" : "normal"}
            dominantBaseline="middle"
          >
            {spec.axes.xLabel.text}
          </text>
        )}

        {/* Y-axis label */}
        {spec.axes.yLabel && (
          <text
            x={transform.toSVGX(0) + (spec.axes.yLabel.dx || 0)}
            y={PAD_TOP - ARROWHEAD_SIZE - LABEL_ARROW_SPACING + (spec.axes.yLabel.dy || 0)}
            fill="white"
            fillOpacity={CURVE_STROKE_OPACITY}
            fontSize={FONT_SIZE_LABELS}
            fontStyle={spec.axes.yLabel.italic ? "italic" : "normal"}
            textAnchor="middle"
            dominantBaseline="hanging"
          >
            {spec.axes.yLabel.text}
          </text>
        )}

        {/* X-axis marks */}
        {spec.marks?.xMarks?.map((mark, idx) => {
          if (mark.x === undefined) return null;
          const x = transform.toSVGX(mark.x);
          const y = transform.toSVGY(0);
          return (
            <g key={`xmark-${idx}`}>
              {mark.tick && (
                <line
                  x1={x}
                  y1={y - 4}
                  x2={x}
                  y2={y + 4}
                  stroke="white"
                  strokeOpacity={AXIS_STROKE_OPACITY}
                  strokeWidth={AXIS_STROKE_WIDTH}
                />
              )}
              <text
                x={x + (mark.label.dx || 0)}
                y={y + 18 + (mark.label.dy || 0)}
                fill="white"
                fillOpacity={CURVE_STROKE_OPACITY}
                fontSize={FONT_SIZE_MARKS}
                fontStyle={mark.label.italic ? "italic" : "normal"}
                textAnchor="middle"
                dominantBaseline="hanging"
              >
                {mark.label.text}
              </text>
            </g>
          );
        })}

        {/* Y-axis marks */}
        {spec.marks?.yMarks?.map((mark, idx) => {
          if (mark.y === undefined) return null;
          const x = transform.toSVGX(0);
          const y = transform.toSVGY(mark.y);
          return (
            <g key={`ymark-${idx}`}>
              {mark.tick && (
                <line
                  x1={x - 4}
                  y1={y}
                  x2={x + 4}
                  y2={y}
                  stroke="white"
                  strokeOpacity={AXIS_STROKE_OPACITY}
                  strokeWidth={AXIS_STROKE_WIDTH}
                />
              )}
              <text
                x={x - 18 + (mark.label.dx || 0)}
                y={y + (mark.label.dy || 0)}
                fill="white"
                fillOpacity={CURVE_STROKE_OPACITY}
                fontSize={FONT_SIZE_MARKS}
                fontStyle={mark.label.italic ? "italic" : "normal"}
                textAnchor="end"
                dominantBaseline="middle"
              >
                {mark.label.text}
              </text>
            </g>
          );
        })}

        {/* Point markers (including computed intersections) */}
        {allPoints.map((point) => {
          const x = transform.toSVGX(point.at.x);
          const y = transform.toSVGY(point.at.y);
          return (
            <g key={point.id}>
              <circle
                cx={x}
                cy={y}
                r={point.filled ? 4 : 3}
                fill={point.filled ? "white" : "none"}
                stroke="white"
                strokeWidth={2}
                strokeOpacity={CURVE_STROKE_OPACITY}
              />
              {point.label && (
                <text
                  x={x + 8}
                  y={y - 8}
                  fill="white"
                  fillOpacity={CURVE_STROKE_OPACITY}
                  fontSize={FONT_SIZE_MARKS}
                  fontStyle={point.label.italic ? "italic" : "normal"}
                  dominantBaseline="auto"
                >
                  {point.label.text}
                </text>
              )}
            </g>
          );
        })}

        {/* Region labels */}
        {spec.regions?.map((region) => {
          const pos = regionLabelPositions.get(region.id);
          if (!pos) return null;
          const x = transform.toSVGX(pos.x);
          const y = transform.toSVGY(pos.y);
          return (
            <text
              key={region.id}
              x={x}
              y={y}
              fill="white"
              fillOpacity={CURVE_STROKE_OPACITY}
              fontSize={FONT_SIZE_ANNOTATIONS}
              fontStyle={region.label.italic ? "italic" : "normal"}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {region.label.text}
            </text>
          );
        })}

        {/* Annotations */}
        {spec.annotations?.map((annotation, idx) => {
          if (annotation.kind === "text") {
            return (
              <text
                key={`annotation-${idx}`}
                x={transform.toSVGX(annotation.x)}
                y={transform.toSVGY(annotation.y)}
                fill="white"
                fillOpacity={CURVE_STROKE_OPACITY}
                fontSize={FONT_SIZE_ANNOTATIONS}
                fontStyle={annotation.italic ? "italic" : "normal"}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {annotation.text}
              </text>
            );
          }
          return null;
        })}
      </svg>
    </div>
  );
}
