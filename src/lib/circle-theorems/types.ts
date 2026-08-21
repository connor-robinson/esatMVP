/**
 * Circle theorem question model - math-first, render second.
 */

export type TheoremTag =
  | "centre-circumference"
  | "semicircle"
  | "same-segment"
  | "alternate-segment"
  | "radius-tangent"
  | "cyclic-opposite"
  | "cyclic-exterior"
  | "combined";

export type TemplateId =
  | "CENTRE_TO_CIRCUMFERENCE"
  | "CIRCUMFERENCE_TO_CENTRE"
  | "SEMICIRCLE_TRIANGLE"
  | "SAME_SEGMENT"
  | "ALTERNATE_SEGMENT"
  | "RADIUS_TANGENT"
  | "CYCLIC_OPPOSITE"
  | "CYCLIC_EXTERIOR";

export interface Point {
  x: number;
  y: number;
}

export interface SolutionStep {
  text: string;
  theorem?: TheoremTag;
}

export interface AngleDisplay {
  id: string;
  vertex: Point;
  /** Second point on each ray from the vertex */
  leg1: Point;
  leg2: Point;
  label: string;
  isTarget?: boolean;
}

export interface LineSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  dashed?: boolean;
}

export interface LabelledPoint {
  id: string;
  x: number;
  y: number;
  label: string;
  emphasis?: boolean;
}

export interface RightAngleMarker {
  vertex: Point;
  leg1: Point;
  leg2: Point;
}

export interface CircleTheoremDiagram {
  points: LabelledPoint[];
  lines: LineSegment[];
  angles: AngleDisplay[];
  rightAngles: RightAngleMarker[];
  showCircle?: boolean;
  caption?: string;
}

export interface CircleTheoremResult {
  templateId: TemplateId;
  theorems: TheoremTag[];
  answer: number;
  targetLabel: string;
  question: string;
  steps: SolutionStep[];
  diagram: CircleTheoremDiagram;
}

export interface TemplateWeight {
  id: TemplateId;
  w: number;
}
