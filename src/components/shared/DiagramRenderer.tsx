/**
 * Dispatches diagram data to the appropriate renderer
 */

"use client";

import type { DiagramData } from "@/types/core";
import { TriangleDiagram } from "./TriangleDiagram";
import { GeometryDiagram } from "./GeometryDiagram";
import { cn } from "@/lib/utils";

interface DiagramRendererProps {
  data: DiagramData;
  className?: string;
}

export function DiagramRenderer({ data, className }: DiagramRendererProps) {
  if (data.type === "triangle") {
    return <TriangleDiagram data={data} className={className} />;
  }
  return <GeometryDiagram data={data} className={className} />;
}
