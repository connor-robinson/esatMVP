/**
 * Dispatches diagram data to the appropriate renderer
 */

"use client";

import type { DiagramData } from "@/types/core";
import { TriangleDiagram } from "./TriangleDiagram";
import { GeometryDiagram } from "./GeometryDiagram";
import { UnitCircle } from "@/components/mental-math/unit-circle/UnitCircle";
import type { UnitCircleFeedback } from "@/components/mental-math/unit-circle/UnitCircle";

interface DiagramRendererProps {
  data: DiagramData;
  className?: string;
  feedback?: UnitCircleFeedback;
  interactive?: boolean;
  onAngleSelect?: (degrees: number) => void;
  disabled?: boolean;
}

export function DiagramRenderer({
  data,
  className,
  feedback,
  interactive,
  onAngleSelect,
  disabled,
}: DiagramRendererProps) {
  if (data.type === "triangle") {
    return <TriangleDiagram data={data} className={className} />;
  }
  if (data.type === "unit-circle") {
    return (
      <UnitCircle
        config={data.config}
        className={className}
        feedback={feedback}
        interactive={interactive}
        onAngleSelect={onAngleSelect}
        disabled={disabled}
      />
    );
  }
  return <GeometryDiagram data={data} className={className} />;
}
