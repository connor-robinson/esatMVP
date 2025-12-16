/**
 * Visualization type definitions
 */

export type StaticDiagram = {
  type: "static";
  component: string; // Path or identifier for the static component
  props?: Record<string, any>;
};

export type Interactive2D = {
  type: "interactive-2d";
  component: string; // Path or identifier for the Mafs component
  props?: Record<string, any>;
};

export type Interactive3D = {
  type: "interactive-3d";
  component: string; // Path or identifier for the R3F component
  props?: Record<string, any>;
};

export type Visualization = StaticDiagram | Interactive2D | Interactive3D;
