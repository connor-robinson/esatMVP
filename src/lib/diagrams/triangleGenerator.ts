/**
 * Triangle diagram generator for special triangles (30-60-90, 45-45-90)
 */

import { TriangleDiagramData } from "@/types/core";

interface TriangleConfig {
  type: "30-60-90" | "45-45-90";
  unit: number;
  problemType?: "side" | "angle";
  givenSide?: "short" | "long" | "hyp" | "leg";
  givenAngle?: number;
  unknownSide?: "short" | "long" | "hyp" | "leg";
  unknownAngle?: number;
}

function sideLabel306090(
  role: "short" | "long" | "hyp",
  unit: number,
  mode: "given" | "unknown" | "hidden",
): { text?: string; show: boolean } {
  if (mode === "hidden") return { show: false };
  if (mode === "unknown") return { text: "?", show: true };
  if (role === "short") return { text: String(unit), show: true };
  if (role === "long") return { text: `${unit}√3`, show: true };
  return { text: String(2 * unit), show: true };
}

function sideLabel454590(
  role: "leg" | "hyp",
  unit: number,
  mode: "given" | "unknown" | "hidden",
): { text?: string; show: boolean } {
  if (mode === "hidden") return { show: false };
  if (mode === "unknown") return { text: "?", show: true };
  if (role === "leg") return { text: String(unit), show: true };
  return { text: `${unit}√2`, show: true };
}

/**
 * Generate triangle diagram data for special triangles
 */
export function generateTriangleDiagram(config: TriangleConfig): TriangleDiagramData {
  const { type, unit } = config;
  const scale = 25; // Base scale factor for SVG coordinates
  
  if (type === "30-60-90") {
    return generate30_60_90Triangle(unit, scale, config);
  } else {
    return generate45_45_90Triangle(unit, scale, config);
  }
}

function generate30_60_90Triangle(
  unit: number,
  scale: number,
  config: TriangleConfig
): TriangleDiagramData {
  // 30-60-90 triangle: short side = u, long side = u√3, hypotenuse = 2u
  // Place right angle at bottom-left (vertex A)
  // Short side (opposite 30°) is horizontal (A to B)
  // Long side (opposite 60°) is vertical (A to C)
  // Hypotenuse is diagonal (B to C)
  
  const shortSide = unit * scale;
  const longSide = unit * Math.sqrt(3) * scale;
  const hypSide = 2 * unit * scale;

  const isSideProblem = config.problemType === "side" || Boolean(config.unknownSide);
  const sideMode = (role: "short" | "long" | "hyp") => {
    if (config.givenSide === role) return "given" as const;
    if (config.unknownSide === role) return "unknown" as const;
    if (isSideProblem && role === "hyp") return "hidden" as const;
    return "hidden" as const;
  };

  const shortLbl = sideLabel306090("short", unit, sideMode("short"));
  const longLbl = sideLabel306090("long", unit, sideMode("long"));
  const hypLbl = sideLabel306090("hyp", unit, sideMode("hyp"));
  
  // Vertices: A (bottom-left, right angle), B (bottom-right), C (top-left)
  const vertices = [
    { x: 100, y: 300 }, // A - bottom-left
    { x: 100 + shortSide, y: 300 }, // B - bottom-right
    { x: 100, y: 300 - longSide }, // C - top-left
  ];
  
  // Determine which labels to show
  const showShortLabel = shortLbl.show;
  const showLongLabel = longLbl.show;
  const showHypLabel = hypLbl.show;

  const show30Label = isSideProblem || config.givenAngle === 30 || config.unknownAngle === 30;
  const show60Label = isSideProblem || config.givenAngle === 60 || config.unknownAngle === 60;
  
  // Sides: [A->B (short), B->C (hyp), C->A (long)]
  const sides = [
    {
      label: shortLbl.text,
      length: shortSide,
      showLabel: showShortLabel,
    },
    {
      label: hypLbl.text,
      length: hypSide,
      showLabel: showHypLabel,
    },
    {
      label: longLbl.text,
      length: longSide,
      showLabel: showLongLabel,
    },
  ];
  
  // Angles: [at A (90°), at B (30°), at C (60°)]
  const angles = [
    {
      label: undefined,
      degrees: 90,
      showLabel: false,
      showArc: false,
    },
    {
      label: isSideProblem
        ? "30°"
        : config.unknownAngle === 30
          ? "?"
          : config.givenAngle === 30
            ? "30°"
            : undefined,
      degrees: 30,
      showLabel: show30Label,
      showArc: show30Label && !isSideProblem,
    },
    {
      label: isSideProblem
        ? "60°"
        : config.unknownAngle === 60
          ? "?"
          : config.givenAngle === 60
            ? "60°"
            : undefined,
      degrees: 60,
      showLabel: show60Label,
      showArc: show60Label && !isSideProblem,
    },
  ];
  
  return {
    type: "triangle",
    triangleType: "30-60-90",
    vertices,
    sides,
    angles,
    rightAngleMarker: true, // Always show right angle marker for this triangle type
    scale,
  };
}

function generate45_45_90Triangle(
  unit: number,
  scale: number,
  config: TriangleConfig
): TriangleDiagramData {
  // 45-45-90 triangle: leg = u, hypotenuse = u√2
  // Place right angle at bottom-left (vertex A)
  // Legs are horizontal (A to B) and vertical (A to C)
  // Hypotenuse is diagonal at 45° (B to C)
  
  const leg = unit * scale;
  const hypSide = unit * Math.sqrt(2) * scale;

  const isSideProblem = config.problemType === "side" || Boolean(config.unknownSide);
  const sideMode = (role: "leg" | "hyp") => {
    if (config.givenSide === role) return "given" as const;
    if (config.unknownSide === role) return "unknown" as const;
    return "hidden" as const;
  };

  const legLbl = sideLabel454590("leg", unit, sideMode("leg"));
  const hypLbl = sideLabel454590("hyp", unit, sideMode("hyp"));
  
  // Vertices: A (bottom-left, right angle), B (bottom-right), C (top-left)
  const vertices = [
    { x: 100, y: 300 }, // A - bottom-left
    { x: 100 + leg, y: 300 }, // B - bottom-right
    { x: 100, y: 300 - leg }, // C - top-left
  ];
  
  const showBottomLeg = legLbl.show;
  const showVerticalLeg = false;
  const showHypLabel = hypLbl.show;

  const show45Label1 = isSideProblem || config.givenAngle === 45 || config.unknownAngle === 45;
  const show45Label2 = isSideProblem || config.givenAngle === 45 || config.unknownAngle === 45;
  
  // Sides: [A->B (leg), B->C (hyp), C->A (leg)]
  const sides = [
    {
      label: legLbl.text,
      length: leg,
      showLabel: showBottomLeg,
    },
    {
      label: hypLbl.text,
      length: hypSide,
      showLabel: showHypLabel,
    },
    {
      label: legLbl.text,
      length: leg,
      showLabel: showVerticalLeg,
    },
  ];
  
  // Angles: [at A (90°), at B (45°), at C (45°)]
  const angles = [
    {
      label: undefined,
      degrees: 90,
      showLabel: false,
      showArc: false,
    },
    {
      label: isSideProblem
        ? "45°"
        : config.unknownAngle === 45
          ? "?"
          : config.givenAngle === 45
            ? "45°"
            : undefined,
      degrees: 45,
      showLabel: show45Label1,
      showArc: show45Label1 && !isSideProblem,
    },
    {
      label: isSideProblem ? "45°" : undefined,
      degrees: 45,
      showLabel: show45Label2,
      showArc: show45Label2 && !isSideProblem,
    },
  ];
  
  return {
    type: "triangle",
    triangleType: "45-45-90",
    vertices,
    sides,
    angles,
    rightAngleMarker: true, // Always show right angle marker for this triangle type
    scale,
  };
}

