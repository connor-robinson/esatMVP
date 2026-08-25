import React from "react";
import DiagramA7 from "./DiagramA7";
import DiagramA8 from "./DiagramA8";
import DiagramA9 from "./DiagramA9";
import DiagramA11 from "./DiagramA11";
import DiagramA13 from "./DiagramA13";
import DiagramA17 from "./DiagramA17";
import DiagramA20 from "./DiagramA20";
import DiagramA23 from "./DiagramA23";
import DiagramA25 from "./DiagramA25";
import DiagramA26 from "./DiagramA26";
import DiagramB3 from "./DiagramB3";
import DiagramB4 from "./DiagramB4";
import DiagramB5 from "./DiagramB5";
import DiagramB11 from "./DiagramB11";
import DiagramB14 from "./DiagramB14";
import DiagramB15 from "./DiagramB15";
import DiagramB16 from "./DiagramB16";
import DiagramB18 from "./DiagramB18";
import DiagramB21 from "./DiagramB21";
import DiagramB22 from "./DiagramB22";
import DiagramB23 from "./DiagramB23";
import DiagramB25 from "./DiagramB25";
import DiagramB26 from "./DiagramB26";
import DiagramM22 from "./DiagramM22";

const DIAGRAM_MAP: Record<string, React.ComponentType> = {
  A7: DiagramA7,
  A8: DiagramA8,
  A9: DiagramA9,
  A11: DiagramA11,
  A13: DiagramA13,
  A17: DiagramA17,
  A20: DiagramA20,
  A23: DiagramA23,
  A25: DiagramA25,
  A26: DiagramA26,
  B3: DiagramB3,
  B4: DiagramB4,
  B5: DiagramB5,
  B11: DiagramB11,
  B14: DiagramB14,
  B15: DiagramB15,
  B16: DiagramB16,
  B18: DiagramB18,
  B21: DiagramB21,
  B22: DiagramB22,
  B23: DiagramB23,
  B25: DiagramB25,
  B26: DiagramB26,
  M22: DiagramM22,
};

export function EsatCampMockDiagram({ diagramKey }: { diagramKey: string }) {
  const Component = DIAGRAM_MAP[diagramKey];
  if (!Component) return null;
  return <Component />;
}
