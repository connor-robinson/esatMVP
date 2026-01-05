/**
 * TriangleDiagram component for rendering special triangles with accurate labeling
 */

"use client";

import { useMemo } from "react";
import { TriangleDiagramData } from "@/types/core";
import { cn } from "@/lib/utils";

interface TriangleDiagramProps {
  data: TriangleDiagramData;
  className?: string;
}

export function TriangleDiagram({ data, className }: TriangleDiagramProps) {
  const { vertices, sides, angles, rightAngleMarker } = data;
  
  // Calculate bounding box for viewBox
  const bounds = useMemo(() => {
    const xs = vertices.map(v => v.x);
    const ys = vertices.map(v => v.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    
    // Add padding for labels
    const padding = 80;
    return {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + 2 * padding,
      height: maxY - minY + 2 * padding,
    };
  }, [vertices]);
  
  // Calculate side label positions
  const sideLabelPositions = useMemo(() => {
    return sides.map((side, index) => {
      if (!side.showLabel) return null;
      
      const v1 = vertices[index];
      const v2 = vertices[(index + 1) % 3];
      
      // Midpoint of side
      const midX = (v1.x + v2.x) / 2;
      const midY = (v1.y + v2.y) / 2;
      
      // Vector along the side
      const dx = v2.x - v1.x;
      const dy = v2.y - v1.y;
      const sideLength = Math.sqrt(dx * dx + dy * dy);
      
      // Perpendicular vector (pointing outward)
      // For a right-angled triangle with the right angle at vertices[0] (bottom-left):
      // Side 0 (vertices[0] to vertices[1], horizontal base): Normal is (0, -1) (up)
      // Side 1 (vertices[1] to vertices[2], hypotenuse): Normal is towards the "outside"
      // Side 2 (vertices[2] to vertices[0], vertical side): Normal is (-1, 0) (left)

      // Perpendicular vector (pointing outward)
      // Calculate triangle centroid to determine outward direction
      const centroidX = vertices.reduce((sum, v) => sum + v.x, 0) / 3;
      const centroidY = vertices.reduce((sum, v) => sum + v.y, 0) / 3;

      // Try both perpendicular directions
      const perp1 = { x: -dy, y: dx }; // Counter-clockwise normal
      const perp2 = { x: dy, y: -dx }; // Clockwise normal

      // Normalize both perpendicular vectors
      const len1 = Math.sqrt(perp1.x * perp1.x + perp1.y * perp1.y);
      const len2 = Math.sqrt(perp2.x * perp2.x + perp2.y * perp2.y);
      const norm1 = len1 > 0 ? { x: perp1.x / len1, y: perp1.y / len1 } : { x: 0, y: 0 };
      const norm2 = len2 > 0 ? { x: perp2.x / len2, y: perp2.y / len2 } : { x: 0, y: 0 };

      // Check which normal points away from the centroid
      // A vector from the midpoint of the side to a point along norm1
      const test1X = midX + norm1.x * 10;
      const test1Y = midY + norm1.y * 10;
      // Distance from this test point to the centroid
      const dist1ToCentroid = Math.sqrt((test1X - centroidX) ** 2 + (test1Y - centroidY) ** 2);

      // A vector from the midpoint of the side to a point along norm2
      const test2X = midX + norm2.x * 10;
      const test2Y = midY + norm2.y * 10;
      // Distance from this test point to the centroid
      const dist2ToCentroid = Math.sqrt((test2X - centroidX) ** 2 + (test2Y - centroidY) ** 2);

      // The normal that keeps the test point further from the centroid is the outward normal
      const perpNorm = dist1ToCentroid > dist2ToCentroid ? norm1 : norm2;
       
      const sideOffset = 40; // Offset distance for outside label (kept at 40)
      const labelX = midX + perpNorm.x * sideOffset;
      const labelY = midY + perpNorm.y * sideOffset;
      
      return {
        x: labelX,
        y: labelY,
        text: side.label || "",
      };
    });
  }, [sides, vertices]);
  
  // Calculate angle arc and label positions
  const angleData = useMemo(() => {
    return angles.map((angle, index) => {
      if (!angle.showLabel && !angle.showArc) return null;
      
      const vertex = vertices[index];
      // For angle at index 0 (right angle), prevVertex is vertices[2] and nextVertex is vertices[1]
      // For angle at index 1, prevVertex is vertices[0] and nextVertex is vertices[2]
      // For angle at index 2, prevVertex is vertices[1] and nextVertex is vertices[0]
      const prevVertex = vertices[(index + 2) % 3];
      const nextVertex = vertices[(index + 1) % 3];
      
      // Vectors from vertex to adjacent vertices
      const v1 = { x: prevVertex.x - vertex.x, y: prevVertex.y - vertex.y };
      const v2 = { x: nextVertex.x - vertex.x, y: nextVertex.y - vertex.y };
      
      // Normalize vectors
      const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
      const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
      
      const n1 = len1 > 0 ? { x: v1.x / len1, y: v1.y / len1 } : { x: 0, y: 0 };
      const n2 = len2 > 0 ? { x: v2.x / len2, y: v2.y / len2 } : { x: 0, y: 0 };
      
      // Arc radius
      const arcRadius = 25;
      
      // Arc start and end points
      const arcStartX = vertex.x + n1.x * arcRadius;
      const arcStartY = vertex.y + n1.y * arcRadius;
      const arcEndX = vertex.x + n2.x * arcRadius;
      const arcEndY = vertex.y + n2.y * arcRadius;
      
      // Angle bisector for label position
      const bisectorX = (n1.x + n2.x) / 2;
      const bisectorY = (n1.y + n2.y) / 2;
      const bisectorLen = Math.sqrt(bisectorX * bisectorX + bisectorY * bisectorY);
      const bisectorNorm = bisectorLen > 0 
        ? { x: bisectorX / bisectorLen, y: bisectorY / bisectorLen }
        : { x: 0, y: 0 };
      
      // Label position along bisector
      const angleOffset = 30; // Offset for inside placement
      const labelX = vertex.x - bisectorNorm.x * angleOffset; // Negative to point inward
      const labelY = vertex.y - bisectorNorm.y * angleOffset; // Negative to point inward
      
      // Calculate sweep flag for arc (large-arc-flag)
      // Determine if we need to sweep more than 180 degrees
      const crossProduct = n1.x * n2.y - n1.y * n2.x;
      const sweepFlag = crossProduct > 0 ? 1 : 0;
      
      return {
        vertex,
        arcStartX,
        arcStartY,
        arcEndX,
        arcEndY,
        arcRadius,
        sweepFlag,
        labelX,
        labelY,
        text: angle.label || "",
        showArc: angle.showArc,
        showLabel: angle.showLabel,
      };
    });
  }, [angles, vertices]);
  
  // Right angle marker (square)
  const rightAngleMarkerData = useMemo(() => {
    if (!rightAngleMarker) return null;
    
    // Find the 90-degree angle vertex (should always be at index 0 now)
    const vertex = vertices[0]; // Assuming right angle is always at vertices[0]
    const side1 = { x: vertices[1].x - vertex.x, y: vertices[1].y - vertex.y }; // Vector along side 0-1
    const side2 = { x: vertices[2].x - vertex.x, y: vertices[2].y - vertex.y }; // Vector along side 0-2
    
    // Vectors along the two sides forming the right angle
    // Normalize vectors
    const len1 = Math.sqrt(side1.x * side1.x + side1.y * side1.y);
    const len2 = Math.sqrt(side2.x * side2.x + side2.y * side2.y);
    
    const n1 = len1 > 0 ? { x: side1.x / len1, y: side1.y / len1 } : { x: 0, y: 0 };
    const n2 = len2 > 0 ? { x: side2.x / len2, y: side2.y / len2 } : { x: 0, y: 0 };
    
    // Square marker size
    const markerSize = 12;
    
    // Corner points of the square
    const corner1 = { x: vertex.x, y: vertex.y };
    const corner2 = { x: vertex.x + n1.x * markerSize, y: vertex.y + n1.y * markerSize };
    const corner3 = { 
      x: vertex.x + n1.x * markerSize + n2.x * markerSize, 
      y: vertex.y + n1.y * markerSize + n2.y * markerSize 
    };
    const corner4 = { x: vertex.x + n2.x * markerSize, y: vertex.y + n2.y * markerSize };
    
    return {
      points: [corner1, corner2, corner3, corner4].map(p => `${p.x},${p.y}`).join(" "),
    };
  }, [rightAngleMarker, angles, vertices]);
  
  return (
    <div className={cn("flex justify-center items-center w-full", className)}>
      <svg
        viewBox={`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`}
        className="w-full max-w-[240px] h-auto"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Triangle */}
        <polygon
          points={vertices.map(v => `${v.x},${v.y}`).join(" ")}
          fill="rgba(255, 255, 255, 0.05)"
          stroke="rgba(255, 255, 255, 0.4)"
          strokeWidth="2.5"
        />
        
        {/* Right angle marker */}
        {rightAngleMarkerData && (
          <polygon
            points={rightAngleMarkerData.points}
            fill="none"
            stroke="rgba(255, 255, 255, 0.6)"
            strokeWidth="2"
          />
        )}
        
        {/* Angle arcs */}
        {angleData.map((angle, index) => {
          if (!angle || !angle.showArc) return null;
          
          return (
            <path
              key={`arc-${index}`}
              d={`M ${angle.arcStartX} ${angle.arcStartY} A ${angle.arcRadius} ${angle.arcRadius} 0 0 ${angle.sweepFlag} ${angle.arcEndX} ${angle.arcEndY}`}
              fill="none"
              stroke="rgba(255, 255, 255, 0.5)"
              strokeWidth="2"
            />
          );
        })}
        
        {/* Side labels with background for readability */}
        {sideLabelPositions.map((label, index) => {
          if (!label) return null;
          
          return (
            <g key={`side-${index}`}>
              {/* Background circle for label */}
              <circle
                cx={label.x}
                cy={label.y}
                r="14"
                fill="rgba(0, 0, 0, 0.6)"
                stroke="rgba(255, 255, 255, 0.2)"
                strokeWidth="1"
              />
              <text
                x={label.x}
                y={label.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-white font-semibold"
                style={{ fontSize: "16px" }}
              >
                {label.text}
              </text>
            </g>
          );
        })}
        
        {/* Angle labels with background for readability */}
        {angleData.map((angle, index) => {
          if (!angle || !angle.showLabel) return null;
          
          return (
            <g key={`angle-${index}`}>
              {/* Background circle for label */}
              <circle
                cx={angle.labelX}
                cy={angle.labelY}
                r="12"
                fill="rgba(0, 0, 0, 0.6)"
                stroke="rgba(255, 255, 255, 0.2)"
                strokeWidth="1"
              />
              <text
                x={angle.labelX}
                y={angle.labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-white font-semibold"
                style={{ fontSize: "14px" }}
              >
                {angle.text}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

