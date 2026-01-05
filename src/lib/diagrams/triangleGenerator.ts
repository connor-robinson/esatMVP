/**
 * Triangle diagram generator for special triangles (30-60-90, 45-45-90)
 */

import { TriangleDiagramData } from "@/types/core";

interface TriangleConfig {
  type: "30-60-90" | "45-45-90";
  unit: number; // Base unit for scaling
  givenSide?: "short" | "long" | "hyp" | "leg";
  givenAngle?: number; // Angle in degrees that is given
  unknownSide?: "short" | "long" | "hyp" | "leg";
  unknownAngle?: number; // Angle in degrees that is unknown
}

/**
 * Generate triangle diagram data for special triangles
 */
export function generateTriangleDiagram(config: TriangleConfig): TriangleDiagramData {
  const { type, unit } = config;
  const scale = 30; // Base scale factor for SVG coordinates
  
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
  
  // Vertices: A (bottom-left, right angle), B (bottom-right), C (top-left)
  const vertices = [
    { x: 100, y: 300 }, // A - bottom-left
    { x: 100 + shortSide, y: 300 }, // B - bottom-right
    { x: 100, y: 300 - longSide }, // C - top-left
  ];
  
  // Determine which labels to show
  const showShortLabel = config.givenSide === "short" || config.unknownSide === "short";
  const showLongLabel = config.givenSide === "long" || config.unknownSide === "long";
  const showHypLabel = config.givenSide === "hyp" || config.unknownSide === "hyp";
  
  // Determine which angles to show
  const show30Label = config.givenAngle === 30 || config.unknownAngle === 30;
  const show60Label = config.givenAngle === 60 || config.unknownAngle === 60;
  const show90Label = config.givenAngle === 90 || config.unknownAngle === 90;
  
  // Sides: [A->B (short), B->C (hyp), C->A (long)]
  const sides = [
    {
      label: config.givenSide === "short" ? `${unit}` : config.unknownSide === "short" ? "?" : undefined,
      length: shortSide,
      showLabel: showShortLabel,
    },
    {
      label: config.givenSide === "hyp" ? `${2 * unit}` : config.unknownSide === "hyp" ? "?" : undefined,
      length: hypSide,
      showLabel: showHypLabel,
    },
    {
      label: config.givenSide === "long" ? `${unit}√3` : config.unknownSide === "long" ? "?" : undefined,
      length: longSide,
      showLabel: showLongLabel,
    },
  ];
  
  // Angles: [at A (90°), at B (30°), at C (60°)]
  const angles = [
    {
      label: undefined, // Always use the marker for 90 degrees, not a text label
      degrees: 90,
      showLabel: show90Label, // This controls the marker
      showArc: false, // Right angle uses square marker instead
    },
    {
      label: config.unknownAngle === 30 ? "?" : (config.givenAngle === 30 ? "30°" : undefined),
      degrees: 30,
      showLabel: show30Label,
      showArc: show30Label,
    },
    {
      label: config.unknownAngle === 60 ? "?" : (config.givenAngle === 60 ? "60°" : undefined),
      degrees: 60,
      showLabel: show60Label,
      showArc: show60Label,
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
  
  // Vertices: A (bottom-left, right angle), B (bottom-right), C (top-left)
  const vertices = [
    { x: 100, y: 300 }, // A - bottom-left
    { x: 100 + leg, y: 300 }, // B - bottom-right
    { x: 100, y: 300 - leg }, // C - top-left
  ];
  
  // Determine which labels to show
  const showLeg1Label = config.givenSide === "leg" || config.unknownSide === "leg";
  const showLeg2Label = config.givenSide === "leg" || config.unknownSide === "leg";
  const showHypLabel = config.givenSide === "hyp" || config.unknownSide === "hyp";
  
  // Determine which angles to show
  const show45Label1 = config.givenAngle === 45 || config.unknownAngle === 45;
  const show45Label2 = config.givenAngle === 45 || config.unknownAngle === 45;
  const show90Label = config.givenAngle === 90 || config.unknownAngle === 90;
  
  // Sides: [A->B (leg), B->C (hyp), C->A (leg)]
  const sides = [
    {
      label: config.givenSide === "leg" ? `${unit}` : config.unknownSide === "leg" ? "?" : undefined,
      length: leg,
      showLabel: showLeg1Label,
    },
    {
      label: config.givenSide === "hyp" ? `${unit}√2` : config.unknownSide === "hyp" ? "?" : undefined,
      length: hypSide,
      showLabel: showHypLabel,
    },
    {
      label: config.givenSide === "leg" ? `${unit}` : config.unknownSide === "leg" ? "?" : undefined,
      length: leg,
      showLabel: showLeg2Label,
    },
  ];
  
  // Angles: [at A (90°), at B (45°), at C (45°)]
  const angles = [
    {
      label: undefined, // Always use the marker for 90 degrees, not a text label
      degrees: 90,
      showLabel: show90Label, // This controls the marker
      showArc: false, // Right angle uses square marker instead
    },
    {
      label: config.unknownAngle === 45 ? "?" : (config.givenAngle === 45 ? "45°" : undefined),
      degrees: 45,
      showLabel: show45Label1,
      showArc: show45Label1,
    },
    {
      label: undefined, // Only one 45 degree can be unknown with '?'
      degrees: 45,
      showLabel: show45Label2,
      showArc: show45Label2,
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

